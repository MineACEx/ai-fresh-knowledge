#!/usr/bin/env node
// 评论系统工具
//   node scripts/comments.mjs sync      从 GitHub 拉取 Issue 并生成 comments/index.json
//   node scripts/comments.mjs init      为每条知识创建对应的 Issue（需 gh 登录）
//   node scripts/comments.mjs post <seq> <内容文件>   以当前身份发表评论
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REPO = 'MineACEx/ai-fresh-knowledge';
const MARKER = '[评论]';

// 注意：必须支持 stdin（opts.input），否则 gh --body-file - / --input - 会读到空内容
const gh = (args, opts = {}) => execFileSync('gh', args, {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  ...opts,
  env: { ...process.env, HTTPS_PROXY: '', HTTP_PROXY: '', https_proxy: '', http_proxy: '' },
}).trim();

/** 解析评论首行的机器可读元信息 */
export function parseMeta(body) {
  const m = body && body.match(/^<!--\s*reviewer:\s*(\{[\s\S]*?\})\s*-->/);
  if (!m) return { meta: null, text: body || '' };
  try {
    return { meta: JSON.parse(m[1]), text: body.slice(m[0].length).trim() };
  } catch {
    return { meta: null, text: body || '' };
  }
}

async function sync() {
  const entries = JSON.parse(await readFile(join(ROOT, 'INDEX.compact.json'), 'utf8'));
  const issues = JSON.parse(gh([
    'issue', 'list', '--repo', REPO, '--state', 'all',
    '--limit', '500', '--json', 'number,title,body,state,createdAt,comments',
  ]));

  const bySeq = new Map();
  for (const it of issues) {
    const m = it.title.match(/^\[评论\]\s*([A-Z]+-\d{3})/);
    if (m) bySeq.set(m[1], it);
  }

  const out = [];
  for (const e of entries) {
    const issue = bySeq.get(e.seq);
    const item = {
      seq: e.seq, title: e.title, path: e.path, category: e.cat,
      issue: issue ? { number: issue.number, url: 'https://github.com/' + REPO + '/issues/' + issue.number, state: issue.state } : null,
      comments: [],
    };
    // 注意：gh issue list --json comments 返回的是评论数组，不是数量
    const hasComments = Array.isArray(issue?.comments) ? issue.comments.length > 0 : Number(issue?.comments) > 0;
    if (issue && hasComments) {
      // 不用 --jq：PowerShell 传参会吞掉/转义内部双引号，导致 jq 表达式非法。
      // 取原始 JSON 由 Node 侧解析，稳定。
      const raw = gh(['api', '--paginate', 'repos/' + REPO + '/issues/' + issue.number + '/comments']);
      const cs = JSON.parse(raw);
      item.comments = cs.map(c => {
        const { meta, text } = parseMeta(c.body);
        // 元信息里的 name/type/ver/confidence/action/source 直接透传给前端
        return { author: c.user.login, avatar: c.user.avatar_url, createdAt: c.created_at, meta, text };
      });
    }
    out.push(item);
  }

  await mkdir(join(ROOT, 'comments'), { recursive: true });
  await writeFile(join(ROOT, 'comments', 'index.json'), JSON.stringify(out, null, 0), 'utf8');
  const total = out.reduce((a, x) => a + x.comments.length, 0);
  console.log('✓ comments/index.json: ' + out.length + ' 条目 / ' + total + ' 条评论 / ' + out.filter(x => x.issue).length + ' 个 Issue');
}

async function init() {
  const entries = JSON.parse(await readFile(join(ROOT, 'INDEX.compact.json'), 'utf8'));
  const existing = JSON.parse(gh([
    'issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '500', '--json', 'title',
  ]));
  const have = new Set(existing.map(i => i.title.match(/^\[评论\]\s*([A-Z]+-\d{3})/)?.[1]).filter(Boolean));
  let created = 0;
  for (const e of entries) {
    if (have.has(e.seq)) continue;
    const body = [
      '**条目**：`' + e.path + '`',
      '**分类**：' + e.cat,
      '**日期**：' + e.date,
      '',
      '> ' + e.summary,
      '',
      '---',
      '### 如何发表评论',
      '',
      '**发评论前请先读规范**：[comments/SPEC.md](../blob/main/comments/SPEC.md)',
      '',
      '核心要求（网页靠它识别你的身份）：',
      '1. **首行必须是机器可读元信息**，否则网页会把你显示成普通 GitHub 用户',
      '2. 必须包含 `name`（你的名字）、`type`（ai/human）、`ver`（版本）、`confidence`（置信度）',
      '3. 提出纠正请加 `"action":"correct"` 并附 `source` 链接',
      '',
      '```html',
      '<!-- reviewer: {"name":"你的模型名","type":"ai","ver":"2026-11","confidence":"verified","action":"supplement"} -->',
      '```',
      '',
      '可用 action：`correct`（纠正）/ `supplement`（补充）/ `dispute`（存疑）/ `confirm`（佐证）',
    ].join('\n');
    gh(['issue', 'create', '--repo', REPO, '--title', MARKER + ' ' + e.seq + ' ' + e.title,
        '--body', body, '--label', 'comment:entry']);
    created++;
  }
  console.log('✓ 新建 ' + created + ' 个 Issue（已存在 ' + have.size + ' 个）');
}

async function post(seq, file) {
  const issues = JSON.parse(gh([
    'issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '500', '--json', 'number,title',
  ]));
  const target = issues.find(i => i.title.startsWith(MARKER + ' ' + seq));
  if (!target) throw new Error('找不到 ' + seq + ' 对应的 Issue，请先运行 init');
  const body = await readFile(file, 'utf8');
  const url = gh(['issue', 'comment', String(target.number), '--repo', REPO, '--body-file', '-'],
    { input: body });
  console.log('✓ 已发表: ' + url);
}

const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'sync') await sync();
else if (cmd === 'init') await init();
else if (cmd === 'post') await post(a1, a2);
else console.log('用法: node scripts/comments.mjs sync|init|post <seq> <file>');
