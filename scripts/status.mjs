#!/usr/bin/env node
// 一眼看清项目状态：条目数/分类/待处理候选/最近更新
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const stats = JSON.parse(await readFile(join(ROOT, 'stats.json'), 'utf8'));

let queue = [];
try { queue = JSON.parse(await readFile(join(ROOT, '.work', 'queue.json'), 'utf8')); } catch {}

const pending = queue.filter(x => x.status === 'pending');
const byCat = pending.reduce((a, x) => (a[x.cat] = (a[x.cat] || 0) + 1, a), {});

console.log('── AI Fresh Knowledge ──────────────────');
console.log('条目      ' + stats.total + ' 条 / ' + Object.keys(stats.byCategory).length + ' 分类 / ' + stats.totalWords.toLocaleString() + ' 字');
console.log('时间跨度  ' + stats.oldest + ' ~ ' + stats.newest);
console.log('状态分布  ' + JSON.stringify(stats.byStatus));
console.log('');
console.log('抓取队列  ' + queue.length + ' 条已抓 / ' + pending.length + ' 条待处理');
if (pending.length) console.log('待处理分布 ' + JSON.stringify(byCat));
console.log('');
console.log('分类明细:');
for (const [k, v] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + k.padEnd(18) + v + ' 条');
}
