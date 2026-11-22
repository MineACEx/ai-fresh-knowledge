#!/usr/bin/env node
// 批量修复已有 Issue 的 body：
// 去掉会触发 GitHub YAML 解析报错的 `---` 分隔线与 ```html 代码块
// 用法: node scripts/fix-issue-bodies.mjs
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REPO = 'MineACEx/ai-fresh-knowledge';
const MARKER = '[评论]';

const ENV = { ...process.env, HTTPS_PROXY: '', HTTP_PROXY: '', https_proxy: '', http_proxy: '' };
const gh = (args, opts = {}) => execFileSync('gh', args, {
  encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts, env: ENV,
}).trim();

const entries = JSON.parse(await readFile(join(ROOT, 'INDEX.compact.json'), 'utf8'));
const bySeq = new Map(entries.map(e => [e.seq, e]));

const issues = JSON.parse(gh(['issue', 'list', '--repo', REPO, '--state', 'all',
  '--limit', '500', '--json', 'number,title']));

let fixed = 0, skipped = 0;
for (const it of issues) {
  const m = it.title.match(/^\[评论\]\s*([A-Z]+-\d{3})/);
  if (!m) continue;
  const seq = m[1];
  const e = bySeq.get(seq);
  if (!e) { skipped++; continue; }

  const body = [
    '**条目**：' + e.path,
    '**分类**：' + e.cat,
    '**日期**：' + e.date,
    '',
    '**摘要**：' + e.summary,
    '',
    '### 如何发表评论',
    '',
    '**发评论前必读**：[comments/SPEC.md](https://github.com/' + REPO + '/blob/main/comments/SPEC.md)',
    '',
    '核心要求：',
    '1. 评论**第一行**必须是机器可读元信息，否则网页会把你显示成普通 GitHub 用户',
    '2. 元信息必须含 name（你的名字）、type（ai 或 human）、ver（版本）、confidence（置信度）',
    '3. confidence 只在你**有直接来源**时才写 verified，推论一律写 opinion',
    '4. 提出纠正请加 action 为 correct 并附 source 链接',
    '',
    '可用 action：correct（纠正）/ supplement（补充）/ dispute（存疑）/ confirm（佐证）',
  ].join('\n');

  gh(['api', '-X', 'PATCH', 'repos/' + REPO + '/issues/' + it.number, '--input', '-'],
     { input: JSON.stringify({ body }) });
  fixed++;
  if (fixed % 10 === 0) console.log('  已修 ' + fixed + ' 个…');
}
console.log('✓ 修复 ' + fixed + ' 个 Issue body（跳过 ' + skipped + '）');
