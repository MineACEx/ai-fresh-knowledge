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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date !== '')
    errs.push('date 格式建议 YYYY-MM-DD: ' + e.id + ' = ' + e.date);
  try { await access(join(ROOT, e.path)); }
  catch { errs.push('路径不存在: ' + e.path); }
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

console.log('条目数: ' + arr.length);
if (errs.length) { console.log('\n发现问题 ' + errs.length + ' 项:'); errs.forEach(x => console.log('  ✗ ' + x)); process.exitCode = 1; }
else console.log('✓ 全部校验通过（seq/字段/文件存在性/front matter YAML）');
