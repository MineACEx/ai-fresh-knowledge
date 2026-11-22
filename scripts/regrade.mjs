#!/usr/bin/env node
// 按 CONFIDENCE.md 重判：sourceType / evidence / verifiedBy
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const KB = join(ROOT, 'kb');

const OFFICIAL = ['openai.com','apple.com','nvidia.com','qualcomm.com','jedec.org','sec.gov',
  'oppo.com','honor.com','vivo.com','mi.com','xiaomi.com','cxmt.com','bytedance.com',
  'seed.bytedance.com','antutu.com','gov.cn','xinhuanet.com','news.cn','github.com'];
const MEDIA = ['ithome.com','36kr.com','sina.com.cn','qq.com','163.com','toutiao.com',
  'notebookcheck','ascii.jp','gigazine.net','mydrivers.com','cnmo.com','eprice.com',
  'tmtpost.com','stdaily.com','cnstock.com','thepaper.cn','jiemian.com','youth.cn','gmw.cn',
  'cnr.cn','people.com.cn','stcn.com','cls.cn'];
const COMMUNITY = ['zhihu.com','ngabbs.com','pttweb.cc','bilibili.com','xiaohongshu.com',
  'douyin.com','coolapk.com','weibo.com','juejin.cn'];

function classify(host) {
  const h = host.replace(/^www\.|^m\./, '');
  if (OFFICIAL.some(o => h === o || h.endsWith('.' + o))) return 'official';
  if (COMMUNITY.some(c => h === c || h.endsWith('.' + c))) return 'community';
  if (MEDIA.some(m => h === m || h.endsWith('.' + m))) return 'media';
  return 'community';
}

// 发起人亲眼确认过的条目（给过具体数值 / 逐一纠正过）
const HUMAN_VERIFIED = new Set([
  'S-001','S-002','S-005','S-006','PH-001','PH-003','PH-004','PH-005','PH-006',
  'PH-007','PH-008','PH-009','PH-010','OS-001','OS-002','OS-003','OS-004',
  'MEM-001','MEM-002','MEM-003','GPU-001','GPU-002','GPU-003',
  'M-001','M-002','M-003','M-004','M-007','M-008',
  'IND-001','IND-002','IND-003','IND-004','IND-005','SEC-001','SEC-002','GM-001',
]);
// agent 本次会话真的打开原文核对过数字的条目
const AGENT_READ = new Set([
  'MEM-003','S-006','S-002','S-001','M-001','M-007','S-005','PH-006','PH-010',
  'M-004','IND-001','IND-003','GPU-003','SEC-001','SEC-002','PH-009','M-008',
]);
// 仅平台可见（抖音/酷安），搜索引擎抓不到
const PLATFORM_ONLY = new Set([]);

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
const t = { sourceType: {}, evidence: {}, verifiedBy: {} };

for (const f of files) {
  const txt = await readFile(f, 'utf8');
  const m = txt.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) continue;
  const [, open, fm, close, body] = m;
  const seq = (fm.match(/^seq:\s*(\S+)/m) || [,''])[1];

  const hosts = [...fm.matchAll(/https?:\/\/([^\s/"']+)/g)].map(x => x[1]);
  const kinds = new Set(hosts.map(classify));
  let sourceType;
  if (kinds.size > 1) sourceType = 'mixed';
  else if (kinds.has('official')) sourceType = 'primary';
  else if (kinds.has('media')) sourceType = 'media';
  else sourceType = 'community';

  let evidence;
  if (PLATFORM_ONLY.has(seq)) evidence = 'platform-only';
  else if (hosts.length >= 2) evidence = 'multi-source';
  else evidence = 'single-source';

  const human = HUMAN_VERIFIED.has(seq);
  const agent = AGENT_READ.has(seq);
  const verifiedBy = human && agent ? 'both' : human ? 'editor' : 'agent';

  t.sourceType[sourceType] = (t.sourceType[sourceType]||0)+1;
  t.evidence[evidence] = (t.evidence[evidence]||0)+1;
  t.verifiedBy[verifiedBy] = (t.verifiedBy[verifiedBy]||0)+1;

  const lines = fm.split(/\r?\n/).filter(l =>
    !/^confidence:/.test(l) && !/^sourceType:/.test(l) &&
    !/^evidence:/.test(l) && !/^verifiedBy:/.test(l));
  const si = lines.findIndex(l => /^status:/.test(l));
  const at = si >= 0 ? si + 1 : lines.length;
  lines.splice(at, 0,
    'sourceType: ' + sourceType,
    'evidence: ' + evidence,
    'verifiedBy: ' + verifiedBy);

  await writeFile(f, open + lines.join('\n') + close + body, 'utf8');
}

console.log('✓ 已重判 ' + files.length + ' 条');
console.log('  sourceType: ' + JSON.stringify(t.sourceType));
console.log('  evidence:   ' + JSON.stringify(t.evidence));
console.log('  verifiedBy: ' + JSON.stringify(t.verifiedBy));
