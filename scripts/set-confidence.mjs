#!/usr/bin/env node
// 按核实动作的实际情况给每条标 confidence
// 依据：本次会话中本喵是否真的打开了原文正文并核对了数字
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const KB = join(ROOT, 'kb');

// verified：本次会话中真的抓了原文正文、核对了具体数字
// reported：有明确来源但未逐条比对原文
// unverified：来源存疑或仅单一社区来源
const VERDICT = {
  // ── 打开原文并核对过数字 ──
  'MEM-003': 'verified',  // 三星产能，抓了 ithome 原文，核对了 10家/60-70%/20-25%
  'S-006':   'verified',  // 麒麟9050Pro，抓了新浪财经全文，核对 1.55→2.38亿/mm²、66/58/41%
  'S-002':   'verified',  // 8EE6，抓了新浪/硅域原文，核对 IPC-11%、A720
  'S-001':   'verified',  // 玄戒O3，抓了快科技+notebookcheck，核对 4700分/85FPS
  'M-001':   'verified',  // GPT-6 Astra，官方口径，核对 105万/128k/$50/272K
  'M-007':   'verified',  // Seedance 2.5，抓了科技日报全文，核对30秒/50参考
  'S-005':   'verified',  // A20 Pro，抓了钛媒体全文，核对 66FPS/11.8倍/N2
  'PH-006':  'verified',  // 荣耀WIN2，抓了荣耀社区实测原文，30%电7小时
  'PH-010':  'verified',  // 旗舰总览，抓了新华网一加16+IT之家iQOO16原文
  'S-004':   'reported',  // M5Ultra/M6：只有官方新闻稿标题，没读正文
  'M-004':   'verified',  // AGI宣称，抓了36氪+新浪，核对99.9→62.7
  'IND-001': 'verified',  // 深圳GDP，抓了经济日报+广东省政府原文
  'IND-003': 'verified',  // 黄仁勋，新华网+腾讯原文，核对即刻生效/CFO临时
  'GPU-003': 'verified',  // DLSS5，抓了17173+360原文，核对 HIP内核/89%
  'MEM-001': 'reported',  // LPDDR6 标准：JEDEC 官方页打不开，靠二手
  'SEC-001': 'verified',  // GhostLock，读了 raw README_ZH 原文
  'SEC-002': 'verified',  // HackiOS，读了 raw README 原文，核对全部实测表
  'PH-009':  'verified',  // K90音质，读了 52audio 全文，核对2.1三扬/1115X
  'PH-003':  'reported',  // iPhone Duo：只有标题级证据
  'GM-001':  'reported',  // MC 26.1：paperweight 已归档但未读正文
  'IND-004': 'reported',  // 库克卸任：多篇标题一致，未读正文
  'M-008':   'verified',  // 夜神月VS富江：读了腾讯原文正文
  'M-002':   'reported',  // Fable 5.2：标题级
  'M-003':   'reported',  // 排行榜口径：benchlm 本体未抓
  'M-005':   'unverified',// VibeCoding 生态：本喵自己的归纳，无逐项来源
  'M-006':   'reported',  // DeepSeek 开源：仓库地址可靠，细节未核
  'OS-001':  'reported',  // iOS 液态玻璃
  'OS-002':  'reported',  // ColorOS 17
  'OS-003':  'reported',  // HyperOS 4
  'OS-004':  'reported',  // MagicOS/OriginOS
  'PH-001':  'reported',  // 小米18妙享背屏
  'PH-004':  'reported',  // 红魔水冷
  'PH-005':  'reported',  // 主动散热
  'PH-007':  'unverified',// 荣耀13500mAh：仅曝光值
  'PH-008':  'reported',  // Ultra 横评
  'MEM-002': 'reported',  // 小米18Fold LPDDR6
  'GPU-001': 'reported',  // RTX Spark
  'GPU-002': 'reported',  // 高通PC转译
  'IND-002': 'reported',  // 深圳APEC
  'IND-005': 'reported',  // 存储涨价
};

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
let n = 0;
for (const f of files) {
  const txt = await readFile(f, 'utf8');
  const m = txt.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) continue;
  const [, open, fm, close, body] = m;
  const seq = (fm.match(/^seq:\s*(\S+)/m) || [,''])[1];
  const v = VERDICT[seq];
  if (!v) { console.log('  ! 未判定: ' + seq); continue; }
  const lines = fm.split(/\r?\n/).map(l => /^confidence:/.test(l) ? 'confidence: ' + v : l);
  await writeFile(f, open + lines.join('\n') + close + body, 'utf8');
  n++;
}
console.log('✓ 已按核实动作标注 ' + n + ' 条');
