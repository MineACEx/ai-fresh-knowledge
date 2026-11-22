#!/usr/bin/env node
// git push 被墙时的绕法：用 GitHub API 一次性提交
// 优化：用 git/trees 的一次性 POST（带内容）替代逐个创建 blob，减少 API 往返
// 用法: node scripts/push-api.mjs "commit message"
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REPO = 'MineACEx/ai-fresh-knowledge';
const BRANCH = 'main';
const MSG = process.argv[2] || 'chore: sync via API';
const ENV = { ...process.env, HTTPS_PROXY: '', HTTP_PROXY: '', https_proxy: '', http_proxy: '' };

function api(args, jsonBody) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    input: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
    env: ENV,
  }).trim();
}

const headSha = api(['api', 'repos/' + REPO + '/git/ref/heads/' + BRANCH, '--jq', '.object.sha']);
const headTree = api(['api', 'repos/' + REPO + '/git/commits/' + headSha, '--jq', '.tree.sha']);
console.log('远端 HEAD ' + headSha.slice(0, 8));

const changed = execFileSync('git', ['diff', '--name-only', 'origin/' + BRANCH + '..HEAD'],
  { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
if (!changed.length) { console.log('没有待推送文件'); process.exit(0); }
console.log('待推送 ' + changed.length + ' 个文件');

// 关键优化：git/trees 的 POST 支持在 tree 项里直接带 content，
// 不用先创建 blob，一次请求搞定多个文件
const tree = [];
for (const p of changed) {
  const buf = await readFile(join(ROOT, p));
  const b64 = buf.toString('base64');
  // 超过 ~1.5MB 的单独走 blob，避免单请求过大
  if (b64.length > 1500000) {
    const sha = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/blobs', '--input', '-', '--jq', '.sha'],
      { content: b64, encoding: 'base64' });
    tree.push({ path: p, mode: '100644', type: 'blob', sha });
  } else {
    tree.push({ path: p, mode: '100644', type: 'blob', content: buf.toString('utf8') });
  }
}

const newTree = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/trees', '--input', '-', '--jq', '.sha'],
  { base_tree: headTree, tree });
console.log('新 tree ' + newTree.slice(0, 8));

const newCommit = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/commits', '--input', '-', '--jq', '.sha'],
  { message: MSG, tree: newTree, parents: [headSha] });
console.log('新 commit ' + newCommit.slice(0, 8));

api(['api', '-X', 'PATCH', 'repos/' + REPO + '/git/refs/heads/' + BRANCH, '--input', '-', '--jq', '.object.sha'],
  { sha: newCommit, force: false });
console.log('✓ 已提交到 ' + BRANCH + ' → ' + newCommit.slice(0, 8));
