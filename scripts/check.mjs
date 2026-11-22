#!/usr/bin/env node
// 校验知识库：seq 格式、重复 seq、链接目标存在、字段完整
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const arr = JSON.parse(await readFile(join(ROOT, 'INDEX.compact.json'), 'utf8'));
const errs = [];
const seen = new Map();
for (const e of arr) {
  if (!/^[A-Z]+-\d{3}$/.test(e.seq)) errs.push('seq 格式错: ' + e.seq + ' (' + e.id + ')');
  if (seen.has(e.seq)) errs.push('seq 重复: ' + e.seq + ' -> ' + seen.get(e.seq) + ' / ' + e.id);
  seen.set(e.seq, e.id);
  for (const k of ['title', 'date', 'summary', 'path']) if (!e[k]) errs.push('缺 ' + k + ': ' + e.id);
  // date 必须是完整日期，且不许出现 00 占位（详见 CONFIDENCE.md 第四节）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date))
    errs.push('date 必须 YYYY-MM-DD: ' + e.id + ' = ' + JSON.stringify(e.date));
  else if (/\b00\b/.test(e.date.slice(5)))
    errs.push('date 不许占位（月/日为 00）: ' + e.id + ' = ' + e.date + '  → 跑 node scripts/fix-dates.mjs');
  try { await access(join(ROOT, e.path)); }
  catch { errs.push('路径不存在: ' + e.path); }
}

// 置信度体系必须真实分级：全是一个值等于没有分级（CONFIDENCE.md 开篇即说明）
const { readdir } = await import('node:fs/promises');
async function walk(dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) out.push(...await walk(p));
    else if (d.name.endsWith('.md')) out.push(p);
  }
  return out;
}
const kbFiles = await walk(join(ROOT, 'kb'));
const stTally = {}, evTally = {}, byTally = {};
const VALID_ST = ['primary', 'media', 'community', 'mixed'];
const VALID_EV = ['multi-source', 'single-source', 'platform-only', 'user-provided'];
const VALID_BY = ['editor', 'agent', 'both'];
for (const p of kbFiles) {
  const fm = ((await readFile(p, 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/) || [,''])[1];
  const st = (fm.match(/^sourceType:\s*(\S+)/m) || [,'(missing)'])[1];
  const ev = (fm.match(/^evidence:\s*(\S+)/m) || [,'(missing)'])[1];
  const by = (fm.match(/^verifiedBy:\s*(\S+)/m) || [,'(missing)'])[1];
  const rel = p.replace(ROOT, '').replace(/\\/g, '/');
  stTally[st] = (stTally[st] || 0) + 1;
  evTally[ev] = (evTally[ev] || 0) + 1;
  byTally[by] = (byTally[by] || 0) + 1;
  if (!VALID_ST.includes(st)) errs.push('sourceType 缺失或非法: ' + st + ' (' + rel + ')');
  if (!VALID_EV.includes(ev)) errs.push('evidence 缺失或非法: ' + ev + ' (' + rel + ')');
  if (!VALID_BY.includes(by)) errs.push('verifiedBy 缺失或非法: ' + by + ' (' + rel + ')');
}
// 三个字段都必须有真实分布，单一取值说明判定没落地
for (const [name, tl] of [['sourceType', stTally], ['evidence', evTally], ['verifiedBy', byTally]]) {
  if (Object.keys(tl).length < 2)
    errs.push(name + ' 只有单一取值 ' + JSON.stringify(tl) + '，标注体系未落地（见 CONFIDENCE.md）');
}
// 顺带校验 front matter 是否为合法 YAML（GitHub 会把 --- 之间当 YAML 解析，
// source 里用 [名称](url) 会导致每个条目页报 Error in user YAML）
try {
  const { execFileSync } = await import('node:child_process');
  execFileSync('node', [join(ROOT, 'scripts', 'lint-yaml.mjs')], { stdio: 'pipe', encoding: 'utf8' });
} catch (e) {
  const out = (e.stdout || '') + (e.stderr || '');
  errs.push('front matter YAML 非法（跑 node scripts/fix-frontmatter.mjs 修复）\n' + out.trim());
}

// 校验页面脚本能否被 JS 引擎解析。
// 站点是纯静态的：JS 错一个字整页白屏，而部署阶段完全静默通过。
try {
  const { execFileSync } = await import('node:child_process');
  execFileSync('node', [join(ROOT, 'scripts', 'lint-page.mjs')], { stdio: 'pipe', encoding: 'utf8' });
} catch (e) {
  const out = (e.stdout || '') + (e.stderr || '');
  errs.push('页面脚本解析失败（site/*.html 内嵌 JS）\n' + out.trim());
}

console.log('条目数: ' + arr.length);
if (errs.length) { console.log('\n发现问题 ' + errs.length + ' 项:'); errs.forEach(x => console.log('  ✗ ' + x)); process.exitCode = 1; }
else console.log('✓ 全部校验通过（seq/字段/文件存在性/front matter YAML）');
