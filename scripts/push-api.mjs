#!/usr/bin/env node
// git push 被墙时的绕法：用 GitHub API 一次性提交
// 用法: node scripts/push-api.mjs "commit message"
//
// 关键设计（踩过两次坑后加的）：
// 1. 先 fetch 并与 origin/main 对齐，避免 BadObjectState
//    根因：本地 HEAD 与远程分叉时，API 提交的 parent 不在远程历史上
// 2. 删除必须显式带 sha:null，否则 git diff --name-only 会漏掉
// 3. 大文件（>1.5MB base64）单独走 blobs，避免单请求超限
import { execFileSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REPO = 'MineACEx/ai-fresh-knowledge';
const BRANCH = 'main';
const MSG = process.argv[2] || 'chore: sync via API';
const NO_REBASE = process.argv.includes('--no-rebase');
const ENV = { ...process.env, HTTPS_PROXY: '', HTTP_PROXY: '', https_proxy: '', http_proxy: '' };

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', env: ENV, ...opts }).trim();
}
function api(args, jsonBody) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    input: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
    env: ENV,
  }).trim();
}

// ── 步骤 1：对齐 —— 用 reset --soft 而不是 rebase ──
// rebase 会给提交换新哈希，导致本地与远程再次分叉（踩过两次）。
// reset --soft origin/main 把 HEAD 移到远程位置，但**保留工作区与索引**，
// 于是所有差异都变成"未提交的变更"，接着统一由 API 提交，哈希不会再错位。
if (!NO_REBASE) {
  try {
    sh('git', ['fetch', 'origin', BRANCH]);
    const behind = sh('git', ['rev-list', '--count', 'HEAD..origin/' + BRANCH]);
    console.log('远程领先本地 ' + behind + ' 个提交');
    sh('git', ['reset', '--soft', 'origin/' + BRANCH]);
    console.log('  ✓ HEAD 已对齐 origin/' + BRANCH + '，差异保留在工作区');
  } catch (e) {
    console.error('对齐失败（继续尝试）: ' + String(e.message).split('\n')[0]);
  }
}

const headSha = api(['api', 'repos/' + REPO + '/git/ref/heads/' + BRANCH, '--jq', '.object.sha']);
const headTree = api(['api', 'repos/' + REPO + '/git/commits/' + headSha, '--jq', '.tree.sha']);
console.log('远端 HEAD ' + headSha.slice(0, 8));

// ── 步骤 2：用 --name-status 拿到 A/M/D，删除要显式处理 ──
// HEAD 已 reset 到 origin/main，所以差异 = 工作区 + 索引 vs origin/main
const raw = sh('git', ['diff', '--name-status', 'origin/' + BRANCH])
  .split(/\r?\n/).filter(Boolean);

if (!raw.length) { console.log('没有待推送文件'); process.exit(0); }

const tree = [];
let add = 0, del = 0, mod = 0;

for (const line of raw) {
  const m = line.match(/^([AMDRT])\d*\t(.+)$/);
  if (!m) continue;
  const status = m[1];
  const p = m[2].replace(/^"|"$/g, '').replace(/\\"/g, '"');

  if (status === 'D') {
    tree.push({ path: p, mode: '100644', type: 'blob', sha: null });
    del++;
    continue;
  }

  const abs = join(ROOT, p);
  try { await access(abs); } catch { continue; }
  const buf = await readFile(abs);
  const b64 = buf.toString('base64');

  if (b64.length > 1500000) {
    const sha = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/blobs', '--input', '-', '--jq', '.sha'],
      { content: b64, encoding: 'base64' });
    tree.push({ path: p, mode: '100644', type: 'blob', sha });
  } else {
    tree.push({ path: p, mode: '100644', type: 'blob', content: buf.toString('utf8') });
  }
  status === 'A' ? add++ : mod++;
}

console.log('变更: 新增 ' + add + ' / 修改 ' + mod + ' / 删除 ' + del);
if (!tree.length) { console.log('无有效变更'); process.exit(0); }

const newTree = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/trees', '--input', '-', '--jq', '.sha'],
  { base_tree: headTree, tree });
const newCommit = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/commits', '--input', '-', '--jq', '.sha'],
  { message: MSG, tree: newTree, parents: [headSha] });
api(['api', '-X', 'PATCH', 'repos/' + REPO + '/git/refs/heads/' + BRANCH, '--input', '-', '--jq', '.object.sha'],
  { sha: newCommit, force: false });
console.log('✓ 已提交到 ' + BRANCH + ' → ' + newCommit.slice(0, 8));

// 本地追上远程，避免下次又分叉
try {
  sh('git', ['fetch', 'origin', BRANCH]);
  console.log('  本地已同步到 ' + sh('git', ['rev-parse', '--short', 'origin/' + BRANCH]));
} catch { /* 忽略 */ }
