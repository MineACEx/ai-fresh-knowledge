#!/usr/bin/env node
// 从 kb/**/*.md 的 YAML front matter 生成三层索引
// 用法: node scripts/build-index.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import { CATEGORIES } from './categories.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const KB = join(ROOT, 'kb');

/** 极简 YAML front matter 解析：只支持 key: value 与内联数组 */
function parseFront(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
    }
    meta[k] = v;
  }
  return { meta, body: text.slice(m[0].length) };
}

/** 取正文第一段非空、非标题行作为摘要兜底 */
function firstParagraph(body) {
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('>') || t.startsWith('|')) continue;
    return t.length > 120 ? t.slice(0, 118) + '…' : t;
  }
  return '';
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = await walk(KB);
const entries = [];

for (const f of files) {
  const rel = relative(KB, f).split('\\').join('/');
  const catSlug = rel.split('/')[0];
  const cat = CATEGORIES.find(c => c.slug === catSlug);
  // 未知分类直接失败：静默跳过会导致条目从索引里悄悄消失
  if (!cat) { throw new Error('未知分类 "' + catSlug + '"（文件: ' + rel + '）——请在 scripts/categories.mjs 里登记'); }
  const { meta, body } = parseFront(await readFile(f, 'utf8'));
  const id = basename(f, '.md');
  if (!meta.title || !meta.date || !meta.summary) {
    console.warn('! 缺 title/date/summary:', rel);
  }
  entries.push({
    id,
    seq: meta.seq || id,
    category: cat.slug,
    categoryName: cat.name,
    date: meta.date || '',
    title: meta.title || id,
    summary: meta.summary || firstParagraph(body),
    tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
    status: meta.status || 'current',
    path: 'kb/' + rel,
    words: body.replace(/\s/g, '').length,
  });
}

// 按分类 + 日期倒序
entries.sort((a, b) =>
  a.category.localeCompare(b.category) || b.date.localeCompare(a.date) || a.seq.localeCompare(b.seq)
);

// ---- 第 1 层：INDEX.md（人+AI 的总目录，只放标题行）----
const byCat = new Map();
for (const e of entries) {
  if (!byCat.has(e.category)) byCat.set(e.category, []);
  byCat.get(e.category).push(e);
}
let index = ['# AI Fresh Knowledge — 索引', '',
  `> 生成时间：${new Date().toISOString().slice(0, 10)} ｜ 条目总数：**${entries.length}** ｜ 分类数：**${byCat.size}**`,
  '> 本文件只含标题行，用于快速判断"要不要读"。`summary` 级细节见 `INDEX.compact.json`，全文按 `path` 读取。', ''];
for (const cat of CATEGORIES) {
  const list = byCat.get(cat.slug);
  if (!list) continue;
  index.push(`## ${cat.name}（${cat.code}） · ${list.length} 条`, '');
  index.push('| 序号 | 日期 | 标题 | 状态 |', '|---|---|---|---|');
  for (const e of list) {
    index.push(`| ${e.seq} | ${e.date} | [${e.title}](${e.path}) | ${e.status} |`);
  }
  index.push('');
}
await writeFile(join(ROOT, 'INDEX.md'), index.join('\n'), 'utf8');

// ---- 第 2 层：INDEX.compact.json（一条一行摘要，供 AI 批量扫）----
const compact = entries.map(e => ({
  id: e.id, seq: e.seq, cat: e.category, date: e.date,
  title: e.title, summary: e.summary, status: e.status, path: e.path,
}));
await writeFile(join(ROOT, 'INDEX.compact.json'), JSON.stringify(compact, null, 0), 'utf8');

// ---- 附：stats ----
const stats = {
  generatedAt: new Date().toISOString(),
  total: entries.length,
  byCategory: Object.fromEntries([...byCat].map(([k, v]) => [k, v.length])),
  byStatus: entries.reduce((a, e) => (a[e.status] = (a[e.status] || 0) + 1, a), {}),
  totalWords: entries.reduce((a, e) => a + e.words, 0),
  newest: entries.map(e => e.date).sort().pop(),
  oldest: entries.map(e => e.date).sort()[0],
};
await writeFile(join(ROOT, 'stats.json'), JSON.stringify(stats, null, 2), 'utf8');

console.log(`✓ index: ${entries.length} 条 / ${byCat.size} 分类 / ${stats.totalWords} 字`);
console.log('✓ INDEX.md  INDEX.compact.json  stats.json');
