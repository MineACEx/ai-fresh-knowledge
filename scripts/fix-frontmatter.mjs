#!/usr/bin/env node
// 修复 front matter：把 source 字段里的 Markdown 链接语法
//   [名称](url) · [名称2](url2)
// 转成合法 YAML 列表，并给值加引号：
//   source:
//     - "名称 — url"
//     - "名称2 — url2"
// 这是 GitHub 报 "Error in user YAML" 的根因。
import { readdir, readFile, writeFile } from 'node:fs/promises';
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

/** [名称](url) · [名称2](url2) · 纯文本 → 合法 YAML 行数组 */
function toYamlSource(raw) {
  const items = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(raw))) {
    items.push(m[1].trim() + ' — ' + m[2].trim());
  }
  // 去掉已抽取的链接后，剩下的纯文本也算一条（如 "韩媒 Economy Tribune"）
  const rest = raw.replace(re, '').replace(/[·、|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (rest) items.push(rest);
  if (!items.length) return null;
  return items.map(s => '  - "' + s.replace(/"/g, "'") + '"');
}

const files = await walk(KB);
let fixed = 0;

for (const f of files) {
  const txt = await readFile(f, 'utf8');
  const m = txt.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) continue;
  const [, open, fm, close, body] = m;

  const lines = fm.split(/\r?\n/);
  const out = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sm = line.match(/^source:\s*(.+)$/);
    if (sm) {
      const yamlItems = toYamlSource(sm[1]);
      if (yamlItems) {
        out.push('source:');
        out.push(...yamlItems);
        changed = true;
        continue;
      }
    }
    out.push(line);
  }

  if (!changed) continue;
  await writeFile(f, open + out.join('\n') + close + body, 'utf8');
  fixed++;
}

console.log('✓ 修复 ' + fixed + ' 个文件的 front matter');
