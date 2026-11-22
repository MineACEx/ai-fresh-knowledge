#!/usr/bin/env node
// 从候选队列生成待填写的条目骨架（放到 .work/drafts，不直接进 kb）
// 用法:
//   node scripts/scaffold.mjs            把队列里前 N 条 pending 生成骨架
//   node scripts/scaffold.mjs --n 5      指定条数（默认 3）
//   node scripts/scaffold.mjs --seq PH   指定分类前缀（默认自动取队首的分类）
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CATEGORIES } from './categories.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const WORK = join(ROOT, '.work');
const QUEUE = join(WORK, 'queue.json');
const DRAFTS = join(WORK, 'drafts');

const argN = (() => {
  const i = process.argv.indexOf('--n');
  return i > -1 ? Math.max(1, parseInt(process.argv[i + 1], 10) || 3) : 3;
})();

const queue = JSON.parse(await readFile(QUEUE, 'utf8'));
const pending = queue.filter(x => x.status === 'pending').slice(0, argN);
if (!pending.length) { console.log('队列里没有待处理项。先跑 node scripts/fetch.mjs'); process.exit(0); }

// 算每个分类下一个可用序号
const { execFileSync } = await import('node:child_process');
const compact = JSON.parse(await readFile(join(ROOT, 'INDEX.compact.json'), 'utf8'));
const maxSeq = {};
for (const e of compact) {
  const m = e.seq.match(/^([A-Z]+)-(\d+)$/);
  if (m) maxSeq[m[1]] = Math.max(maxSeq[m[1]] || 0, parseInt(m[2], 10));
}

await mkdir(DRAFTS, { recursive: true });
const lines = [];

for (const item of pending) {
  const cat = CATEGORIES.find(c => c.slug === item.cat);
  if (!cat) { console.warn('! 未知分类: ' + item.cat); continue; }
  const next = (maxSeq[cat.code] || 0) + 1;
  maxSeq[cat.code] = next;
  const seq = cat.code + '-' + String(next).padStart(3, '0');
  const slug = item.title.replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'entry';

  const body = [
    '---',
    'seq: ' + seq,
    'title: ' + item.title.replace(/[:：]/g, ' '),   // 冒号会破坏 YAML
    'date: ' + item.date,
    'category: ' + cat.slug,
    'tags: [' + item.cat + ', 待补充]',
    'status: current',
    'summary: 待填写——60 字以内说清这条是什么',
    'source: [' + item.source + '](' + item.link + ')',
    'confidence: ' + (item.trust === 'verified' ? 'unverified' : 'unverified'),
    '---',
    '',
    '# ' + item.title,
    '',
    '> **一句话结论**：待填写（这条最核心的事实，用一句能拿去用的话说完）',
    '',
    '## 时间线',
    '',
    '| 日期 | 事件 |',
    '|---|---|',
    '| ' + item.date + ' | ' + item.title.slice(0, 40) + '（报道） |',
    '',
    '## 关键事实',
    '',
    '- 待从原文提取，**必须带具体数字**',
    '',
    '## 为什么重要',
    '',
    '待填写。',
    '',
    '## 评价',
    '',
    '**优点**：待填写',
    '',
    '**问题**：待填写',
    '',
    '**本喵的看法**：待填写（标明是观点）',
    '',
    '## 容易搞错的地方',
    '',
    '- ❌ 常见误解 → ✅ 实际情况',
    '',
    '## 相关条目',
    '',
    '- 待补充',
    '',
    '<!--',
    '原文摘要（供填写参考，填入后可删）:',
    item.desc || '(无摘要)',
    '',
    '原文链接: ' + item.link,
    '-->',
    ''
  ].join('\n');

  const file = join(DRAFTS, seq + '-' + slug + '.md');
  await writeFile(file, body, 'utf8');
  lines.push(seq + '  ' + item.cat + '  ' + item.title.slice(0, 50));
}

console.log('✓ 生成 ' + lines.length + ' 个骨架到 .work/drafts/');
lines.forEach(l => console.log('  ' + l));
console.log('\n下一步：逐个填写 → 移到 kb/<分类>/ → node scripts/sync.ps1 或 build-index+check');
