#!/usr/bin/env node
// 校验所有 kb 条目的 front matter 是否为合法 YAML
// 关键：GitHub 渲染 Markdown 时会把 --- 之间的内容当 YAML 解析，
// 所以 source 字段里绝不能用 [文字](url) 这种 Markdown 链接语法
import { readdir, readFile } from 'node:fs/promises';
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

/** 检查单行是否为「冒号后跟 Markdown 链接」这种非法 YAML */
function checkLine(line) {
  const problems = [];
  // 形如  key: 任意内容[文字](url)
  const mdLink = line.match(/^([A-Za-z_][\w-]*):\s*(.*?)\[[^\]]*\]\([^)]*\)/);
  if (mdLink) {
    problems.push({ type: 'markdown-link-in-yaml', key: mdLink[1] });
  }
  // 行内未加引号的冒号+空格（YAML 会误判为嵌套）
  if (/^[A-Za-z_][\w-]*:\s/.test(line)) {
    const val = line.slice(line.indexOf(':') + 1).trim();
    if (!/^[\[\{'"|>]/.test(val) && /:\s/.test(val)) {
      problems.push({ type: 'nested-colon', key: line.split(':')[0] });
    }
  }
  return problems;
}

const files = await walk(KB);
const bad = [];
for (const f of files) {
  const txt = await readFile(f, 'utf8');
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { bad.push({ f, why: '缺少 front matter' }); continue; }
  for (const line of m[1].split(/\r?\n/)) {
    const probs = checkLine(line);
    if (probs.length) {
      bad.push({ f, why: probs.map(p => p.type + '(' + p.key + ')').join(', '), line });
    }
  }
}

console.log('检查 ' + files.length + ' 个条目');
if (!bad.length) { console.log('✓ front matter 全部合法'); process.exit(0); }
console.log('\n✗ 发现 ' + bad.length + ' 处问题：');
for (const b of bad) {
  console.log('  ' + b.f.replace(ROOT, '').replace(/\\/g, '/') + '  ← ' + b.why);
  if (b.line) console.log('     ' + b.line.slice(0, 110));
}
process.exitCode = 1;
