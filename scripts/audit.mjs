#!/usr/bin/env node
// 自审：置信度分布 / 日期占位符 / 来源类型 / 条目抽样
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const KB = join(ROOT, 'kb');

// 来源分级：一手官方 / 权威媒体 / 社区转述
const OFFICIAL = ['openai.com','apple.com','nvidia.com','qualcomm.com','jedec.org','sec.gov',
  'oppo.com','honor.com','vivo.com','mi.com','xiaomi.com','cxmt.com','byte plus','bytedance.com',
  'seed.bytedance.com','antutu.com','gov.cn','sz.gov.cn','gd.gov.cn','xinhuanet.com','news.cn'];
const MEDIA = ['ithome.com','36kr.com','sina.com.cn','qq.com','163.com','toutiao.com',
  'notebookcheck','ascii.jp','gigazine.net','mydrivers.com','cnmo.com','eprice.com',
  'tmtpost.com','stdaily.com','cnstock.com','thepaper.cn','jiemian.com'];

function grade(host) {
  const h = host.replace(/^www\.|^m\./, '');
  if (OFFICIAL.some(o => h === o || h.endsWith('.' + o))) return 'official';
  if (MEDIA.some(m => h === m || h.endsWith('.' + m))) return 'media';
  return 'community';
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = await walk(KB);
const conf = {}, status = {}, grades = { official:0, media:0, community:0 };
let placeholderDate = 0;
const placeholderFiles = [];
const perEntry = [];

for (const f of files) {
  const txt = await readFile(f, 'utf8');
  const fm = (txt.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [,''])[1];
  const seq = (fm.match(/^seq:\s*(\S+)/m) || [,'?'])[1];

  const c = (fm.match(/^confidence:\s*(\S+)/m) || [,'(missing)'])[1];
  conf[c] = (conf[c] || 0) + 1;
  const s = (fm.match(/^status:\s*(\S+)/m) || [,'(missing)'])[1];
  status[s] = (status[s] || 0) + 1;

  const d = (fm.match(/^date:\s*(\S+)/m) || [,'?'])[1];
  const isPlaceholder = /\b00\b/.test(d);
  if (isPlaceholder) { placeholderDate++; placeholderFiles.push(seq + ' ' + d); }

  const hosts = [...fm.matchAll(/https?:\/\/([^\s/"]+)/g)].map(m => m[1]);
  const g = hosts.map(grade);
  const best = g.includes('official') ? 'official' : g.includes('media') ? 'media' : g.length ? 'community' : 'none';
  if (grades[best] !== undefined) grades[best]++;
  hosts.forEach(h => { const gg = grade(h); grades[gg]++; });

  perEntry.push({ seq, conf: c, status: s, date: d, placeholder: isPlaceholder, best, hosts: hosts.length });
}

console.log('=== 条目 ' + files.length + ' 条 ===\n');
console.log('confidence:  ' + JSON.stringify(conf));
console.log('status:      ' + JSON.stringify(status));
console.log('date 占位符: ' + placeholderDate + ' 条  → ' + placeholderFiles.slice(0,8).join(', '));
console.log('\n来源分级（按 URL 计数）:');
console.log('  一手官方 ' + grades.official + ' / 权威媒体 ' + grades.media + ' / 社区转述 ' + grades.community);
const tot = grades.official + grades.media + grades.community;
console.log('  占比: 官方 ' + (grades.official/tot*100).toFixed(0) + '%  媒体 ' + (grades.media/tot*100).toFixed(0) + '%  社区 ' + (grades.community/tot*100).toFixed(0) + '%');
console.log('\n无官方来源的条目: ' + perEntry.filter(e => e.best !== 'official').length + ' / ' + files.length);
