#!/usr/bin/env node
// git push 被墙时的绕法：用 GitHub API 逐文件提交
// 关键点：base64 内容必须走 stdin，不能塞进 argv（会 ENAMETOOLONG）
// 用法: node scripts/push-api.mjs "commit message"
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REPO = 'MineACEx/ai-fresh-knowledge';
const BRANCH = 'main';
const MSG = process.argv[2] || 'chore: sync via API';
const ENV = { ...process.env, HTTPS_PROXY: '', HTTP_PROXY: '', https_proxy: '', http_proxy: '' };

/** gh api 调用；stdin 传入 JSON body */
function api(args, jsonBody) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    input: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
    env: ENV,
  }).trim();
}

const headSha = api(['api', 'repos/' + REPO + '/git/ref/heads/' + BRANCH, '--jq', '.object.sha']);
const headTree = api(['api', 'repos/' + REPO + '/git/commits/' + headSha, '--jq', '.tree.sha']);
console.log('远端 HEAD ' + headSha.slice(0, 8) + '  tree ' + headTree.slice(0, 8));

const changed = execFileSync('git', ['diff', '--name-only', 'origin/' + BRANCH + '..HEAD'],
  { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
if (!changed.length) { console.log('没有待推送文件'); process.exit(0); }
console.log('待推送 ' + changed.length + ' 个文件');

const entries = [];
for (const p of changed) {
  const b64 = (await readFile(join(ROOT, p))).toString('base64');
  // content 走 stdin 的 JSON，避免 argv 超长
  const sha = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/blobs', '--input', '-', '--jq', '.sha'],
    { content: b64, encoding: 'base64' });
  entries.push({ path: p, mode: '100644', type: 'blob', sha });
  console.log('  ✓ ' + p + '  blob ' + sha.slice(0, 8));
}

const newTree = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/trees', '--input', '-', '--jq', '.sha'],
  { base_tree: headTree, tree: entries });
console.log('新 tree ' + newTree.slice(0, 8));

const newCommit = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/commits', '--input', '-', '--jq', '.sha'],
  { message: MSG, tree: newTree, parents: [headSha] });
console.log('新 commit ' + newCommit.slice(0, 8));

api(['api', '-X', 'PATCH', 'repos/' + REPO + '/git/refs/heads/' + BRANCH, '--input', '-', '--jq', '.object.sha'],
  { sha: newCommit, force: false });
console.log('✓ 已通过 API 提交到 ' + BRANCH + ' → ' + newCommit.slice(0, 8));
