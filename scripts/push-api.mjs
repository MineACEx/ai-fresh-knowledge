#!/usr/bin/env node
// git push 被墙时的绕法：用 GitHub API 一次性提交
// 用法: node scripts/push-api.mjs "commit message"
import { execFileSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
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

// 用 --name-status 拿到 A/M/D 三类变更；删除必须显式带 sha:null
const raw = execFileSync('git', ['diff', '--name-status', 'origin/' + BRANCH + '..HEAD'],
  { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);

if (!raw.length) { console.log('没有待推送文件'); process.exit(0); }

const tree = [];
let add = 0, del = 0, mod = 0;

for (const line of raw) {
  const m = line.match(/^([AMDRT])\d*\t(.+)$/);
  if (!m) continue;
  const status = m[1];
  const p = m[2].replace(/^"|"$/g, '').replace(/\\"/g, '"');

  if (status === 'D') {
    // 删除：必须在 tree 里显式给出 sha: null
    tree.push({ path: p, mode: '100644', type: 'blob', sha: null });
    del++;
    continue;
  }

  const abs = join(ROOT, p);
  try { await access(abs); } catch { continue; }   // 本地已不存在则跳过
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
console.log('新 tree ' + newTree.slice(0, 8));

const newCommit = api(['api', '-X', 'POST', 'repos/' + REPO + '/git/commits', '--input', '-', '--jq', '.sha'],
  { message: MSG, tree: newTree, parents: [headSha] });
api(['api', '-X', 'PATCH', 'repos/' + REPO + '/git/refs/heads/' + BRANCH, '--input', '-', '--jq', '.object.sha'],
  { sha: newCommit, force: false });
console.log('✓ 已提交到 ' + BRANCH + ' → ' + newCommit.slice(0, 8));
