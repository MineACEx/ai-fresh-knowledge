#!/usr/bin/env node
// 把 2026-00-00 / 2026-10-00 这类占位日期改成明确的月末日，并加 datePrecision 标注精度
// 规则：知道月份 → 该月最后一天 + datePrecision: month
//       只知道年份 → 该年 12-31 + datePrecision: year
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const KB = join(ROOT, 'kb');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
const lastDay = (y, m) => new Date(y, m, 0).getDate();

const files = await walk(KB);
let fixed = 0;
const changed = [];

for (const f of files) {
  const txt = await readFile(f, 'utf8');
  const m = txt.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) continue;
  const [, open, fm, close, body] = m;

  const dm = fm.match(/^date:\s*(\d{4})-(\d{2})-(\d{2})\s*$/m);
  if (!dm) continue;
  const [, y, mo, d] = dm;
  if (!/\b00\b/.test(mo) && !/\b00\b/.test(d) && mo !== '00' && d !== '00') continue;

  const year = +y;
  let newDate, precision;
  if (mo === '00') {
    newDate = year + '-12-31';
    precision = 'year';
  } else {
    newDate = y + '-' + mo + '-' + String(lastDay(year, +mo)).padStart(2, '0');
    precision = 'month';
  }

  let lines = fm.split(/\r?\n/);
  lines = lines.map(l => /^date:/.test(l) ? 'date: ' + newDate : l);
  // 插入 datePrecision（跟在 date 后面）
  if (!lines.some(l => /^datePrecision:/.test(l))) {
    const di = lines.findIndex(l => /^date:/.test(l));
    lines.splice(di + 1, 0, 'datePrecision: ' + precision);
  }

  await writeFile(f, open + lines.join('\n') + close + body, 'utf8');
  fixed++;
  changed.push(y + '-' + mo + '-' + d + ' → ' + newDate + ' (' + precision + ')');
}

console.log('✓ 修复 ' + fixed + ' 条占位日期');
const kinds = changed.reduce((a, c) => {
  const k = c.includes('(year)') ? 'year' : 'month';
  a[k] = (a[k] || 0) + 1; return a;
}, {});
console.log('  精度分布: ' + JSON.stringify(kinds));
