#!/usr/bin/env node
// 校验 site/*.html 内嵌 <script type="module"> 能否被真实解析
//
// 为什么需要：纯静态页 JS 错一个字，整个 module 就中断，页面卡"加载失败"，
// 而构建/部署阶段完全静默。踩过一次：/\*\*([^*\n]+)\*\*/g 经多层转义
// 变成 /*\*(...)/g，整行被当注释，后续代码全乱，页面白屏。
//
// 关键：判断标准必须是"能不能被 JS 引擎解析"，
// 而不是"求值时有没有报错"。缺 DOM 也会报错，但那是求值阶段的事。
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SITE = join(ROOT, 'site');
const TMP = join(ROOT, '.work', '_lint_tmp.mjs');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = await walk(SITE);
const errs = [];

for (const f of files) {
  const html = await readFile(f, 'utf8');
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');

  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let m, idx = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const code = m[2] || '';
    idx++;
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (!code.trim()) continue;

    // 去掉 ESM import（vm.Script 不支持）
    const stripped = code.replace(/^\s*import[^;]+;\s*$/gm, '');

    // 核心：用 vm.Script 只做**解析**，不执行。
    // 解析失败 = 真语法错；解析通过 = 语法没问题（缺 DOM 是另一回事）。
    try {
      new vm.Script(stripped, { filename: rel + '#script' + idx });
    } catch (e) {
      errs.push(rel + ' 第' + idx + '个 script：' + String(e.message).split('\n')[0]);
    }
  }
}

try { await unlink(TMP); } catch {}

if (errs.length) {
  console.log('✗ 页面脚本解析失败 ' + errs.length + ' 处：');
  errs.forEach(e => console.log('  ' + e));
  process.exitCode = 1;
} else {
  console.log('✓ 页面脚本语法通过（' + files.length + ' 个 HTML）');
}
