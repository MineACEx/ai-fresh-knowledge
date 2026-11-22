#!/usr/bin/env node
// 抓取 RSS → 按关键词分类 → 输出候选队列（不直接写入 kb，避免污染知识库）
// 用法:
//   node scripts/fetch.mjs                抓取并合并到 .work/queue.json
//   node scripts/fetch.mjs --dry          只看结果不落盘
//   node scripts/fetch.mjs --report       打印候选摘要
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { SOURCES, RULES, BLACKLIST } from './sources.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const WORK = join(ROOT, '.work');
const QUEUE = join(WORK, 'queue.json');

/** 极简 RSS 解析（够用即可，不做完整 XML 规范实现） */
function parseRss(xml, sourceName) {
  const out = [];
  const blocks = xml.split(/<item[\s>]/).slice(1);
  for (const b of blocks) {
    const pick = (tag) => {
      const m = b.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
      if (!m) return '';
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
        .trim();
    };
    const title = pick('title');
    const link = pick('link');
    const desc = pick('description');
    const pub = pick('pubDate');
    if (!title) continue;
    out.push({
      title, link, desc: desc.slice(0, 500),
      pubDate: pub ? new Date(pub).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      source: sourceName,
    });
  }
  return out;
}

/** 按 RULES 打分归类 */
function classify(text) {
  const scores = [];
  for (const r of RULES) {
    const m = text.match(new RegExp(r.re.source, 'gi'));
    if (m) scores.push({ cat: r.cat, score: m.length });
  }
  if (!scores.length) return null;
  scores.sort((a, b) => b.score - a.score);
  return scores[0].cat;
}

function isBlacklisted(text) {
  return BLACKLIST.some(re => re.test(text));
}

async function fetchAll() {
  const all = [];
  for (const s of SOURCES) {
    try {
      const res = await fetch(s.url, {
        headers: { 'User-Agent': 'ai-fresh-knowledge-bot/1.0 (+https://github.com/MineACEx/ai-fresh-knowledge)' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) { console.warn('  ! ' + s.name + ' HTTP ' + res.status); continue; }
      const xml = await res.text();
      const items = parseRss(xml, s.name);
      for (const it of items) {
        it.trust = s.trust;
        it.weight = s.weight;
      }
      all.push(...items);
      console.log('  ✓ ' + s.name + ': ' + items.length + ' 条');
    } catch (e) {
      console.warn('  ! ' + s.name + ' 失败: ' + String(e.message).slice(0, 60));
    }
  }
  return all;
}

const dry = process.argv.includes('--dry');
const report = process.argv.includes('--report');

console.log('→ 抓取 ' + SOURCES.length + ' 个源…');
const raw = await fetchAll();

// 分类 + 过滤
const cand = [];
for (const it of raw) {
  const hay = it.title + ' ' + it.desc;
  if (isBlacklisted(hay)) continue;
  const cat = classify(hay);
  if (!cat) continue;                       // 与科技无关的丢弃
  cand.push({
    id: (it.source + '|' + it.link).replace(/[^a-zA-Z0-9]/g, '').slice(-24),
    title: it.title,
    link: it.link,
    cat,
    date: it.pubDate,
    source: it.source,
    trust: it.trust,
    weight: it.weight,
    desc: it.desc,
  });
}

// 合并已有队列（按 id 去重，保留旧的 reviewed 状态）
await mkdir(WORK, { recursive: true });
let queue = [];
try { queue = JSON.parse(await readFile(QUEUE, 'utf8')); } catch {}
const seen = new Map(queue.map(q => [q.id, q]));
let added = 0;
for (const c of cand) {
  if (!seen.has(c.id)) { seen.set(c.id, { ...c, status: 'pending' }); added++; }
}
const merged = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));

if (!dry) await writeFile(QUEUE, JSON.stringify(merged, null, 1), 'utf8');

const byCat = merged.reduce((a, x) => (a[x.cat] = (a[x.cat] || 0) + 1, a), {});
console.log('\n✓ 抓取 ' + raw.length + ' 条 → 有效 ' + cand.length + ' 条 → 新增 ' + added + ' 条');
console.log('  队列总计 ' + merged.length + ' 条，待处理 ' + merged.filter(x => x.status === 'pending').length + ' 条');
console.log('  按分类: ' + JSON.stringify(byCat));

if (report) {
  console.log('\n--- 待处理候选（前 20）---');
  merged.filter(x => x.status === 'pending').slice(0, 20).forEach((x, i) => {
    console.log((i + 1) + '. [' + x.cat + '] ' + x.date + ' ' + x.title.slice(0, 56));
  });
}
