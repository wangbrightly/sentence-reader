// 手机界面（@media (pointer: coarse)）的行为测试 + 电脑版不变的像素比对（顶栏新增的搜索按钮除外）。
// 运行：node --test --test-concurrency=1 tests/*.test.mjs（逐个文件跑；4 个文件同时开浏览器时电脑版像素比对会偶发抖动）
// 依赖本机 ~/.claude-tools/webshot 里装好的 Puppeteer（不进仓库）；可用 PUPPETEER_DIR 指定别处。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(process.env.PUPPETEER_DIR || join(homedir(), '.claude-tools/webshot'), 'x.js'));
const puppeteer = require('puppeteer');

// 电脑版的基准：手机界面开工前的最后一版 index.html
const BASELINE_COMMIT = '0b58bd7';
const BOOK = ['# 第一章', '', '这是第一章的第一句话。这是第一章的第二句话。这是第一章的第三句话。', '',
  '## 第二章', '', '这是第二章的第一句话。这是第二章的第二句话。这是第二章的第三句话。', ''].join('\n');

let browser, baselineUrl;
const pageUrl = pathToFileURL(join(ROOT, 'index.html')).href;

before(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reader-baseline-'));
  writeFileSync(join(dir, 'index.html'), execFileSync('git', ['show', `${BASELINE_COMMIT}:index.html`], { cwd: ROOT }));
  copyFileSync(join(ROOT, 'zanshang.png'), join(dir, 'zanshang.png'));
  baselineUrl = pathToFileURL(join(dir, 'index.html')).href;
  browser = await puppeteer.launch({ headless: 'shell' });
});
after(() => browser?.close());

// 每个页面独立的浏览器上下文：互不共享 IndexedDB 里"上次那本书"
async function open(url, { phone = false, dark = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(phone
    ? { width: 411, height: 866, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
    : { width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]);
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}
const loadBook = page => page.evaluate(async b => { await openFile(new File([b], '测试书.md')); }, BOOK);
const idx = page => page.evaluate(() => i);
const box = (page, sel) => page.$eval(sel, el => { const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, shown: r.width > 0 && getComputedStyle(el).visibility !== 'hidden' }; });
async function tapCenter(page, sel) { const b = await box(page, sel); await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2); await sleep(60); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 电脑版：和基准逐像素一致 ----------
for (const [name, setup] of [
  ['空白页', async () => {}],
  ['读到第 3 句', async p => { await loadBook(p); await p.evaluate(() => go(2)); }],
  ['赞赏弹窗', async p => { await loadBook(p); await p.click('#tipBtn'); }],
]) {
  // 偶发抖动：差 11 个像素，都在「打开文件」按钮上边框的抗锯齿。2026-10-10 查明与负载有关——4 个测试文件同时跑
  // （各开一个浏览器）时 5 遍失败 1 遍，逐个文件跑（--test-concurrency=1）8 遍全过。保留"不一致就重截、最多 3 次"
  // 作为兜底：真改坏了布局会 3 次都不一致，照样报错。
  test(`电脑版不变：${name}`, async () => {
    let shots;
    for (let attempt = 0; attempt < 3; attempt++) {
      shots = [];
      for (const url of [baselineUrl, pageUrl]) {
        const p = await open(url);
        await p.addStyleTag({ content: '#qBtn { display:none !important }' });   // 顶栏的搜索按钮是有意新增的（2026-10-10），比对其余部分
        await setup(p); await sleep(100);
        shots.push(Buffer.from(await p.screenshot())); await p.browserContext().close();
      }
      if (shots[0].equals(shots[1])) break;
    }
    if (!shots[0].equals(shots[1])) {   // 3 次都不一致：留下两张图，方便看差在哪
      const dir = mkdtempSync(join(tmpdir(), 'reader-diff-'));
      writeFileSync(join(dir, 'baseline.png'), shots[0]); writeFileSync(join(dir, 'current.png'), shots[1]);
      assert.fail(`电脑版截图和基准不一致，截图在 ${dir}`);
    }
  });
}

test('电脑版：手机专用元素都不显示', async () => {
  const p = await open(pageUrl); await loadBook(p);
  for (const sel of ['#mBar', '#mEmpty', '#mMenu']) assert.equal((await box(p, sel)).shown, false, sel);
  await p.browserContext().close();
});

// ---------- 手机版 ----------
test('手机：确实命中了触屏样式（测试环境自检）', async () => {
  const p = await open(pageUrl, { phone: true });
  assert.equal(await p.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
  await p.browserContext().close();
});

test('手机空白页：显示手机欢迎页，隐藏顶栏和快捷键提示', async () => {
  const p = await open(pageUrl, { phone: true });
  assert.equal((await box(p, '#mEmpty')).shown, true);
  for (const sel of ['header', 'footer', '#progress', '#mBar']) assert.equal((await box(p, sel)).shown, false, sel);
  const open_ = await box(p, '#mEmptyOpen'), tip = await box(p, '#mEmptyTip');
  assert.ok(open_.h >= 56 && tip.h >= 48);
  await p.browserContext().close();
});

test('手机空白页：点「赞赏」只弹赞赏码，不弹文件选择', async () => {
  const p = await open(pageUrl, { phone: true });
  await p.evaluate(() => { window.__picked = 0; document.getElementById('file').click = () => window.__picked++; });
  await tapCenter(p, '#mEmptyTip');
  assert.equal(await p.evaluate(() => window.__picked), 0);
  assert.equal((await box(p, '#tip')).shown, true);
  await p.browserContext().close();
});

test('手机阅读：底栏 126 高，四个按钮 56×56，相邻间距 12', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  const bar = await box(p, '#mBar');
  assert.equal(bar.h, 126); assert.equal(Math.round(bar.y + bar.h), 866);
  const btns = [];
  for (const sel of ['#mMenuBtn', '#mPrev', '#mPlay', '#mNext']) {
    const b = await box(p, sel); assert.equal(b.w, 56, sel); assert.equal(b.h, 56, sel); btns.push(b);
  }
  assert.equal(btns[2].x - (btns[1].x + 56), 12); assert.equal(btns[3].x - (btns[2].x + 56), 12);
  await p.browserContext().close();
});

test('手机阅读：点翻句区右半/左半翻句，点底栏空隙不翻句', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  await p.evaluate(() => go(3));
  await p.touchscreen.tap(330, 400); await sleep(60); assert.equal(await idx(p), 4);
  await p.touchscreen.tap(80, 400); await sleep(60); assert.equal(await idx(p), 3);
  const sp = await box(p, '#mPrev');
  await p.touchscreen.tap(sp.x - 60, sp.y + 28); await sleep(60);   // 菜单键和上一句之间的空白
  await p.touchscreen.tap(200, 866 - 126 + 20); await sleep(60);     // 进度文字那一行
  assert.equal(await idx(p), 3);
  await p.browserContext().close();
});

test('手机阅读：上一句/下一句按钮', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p); await p.evaluate(() => go(3));
  await tapCenter(p, '#mNext'); assert.equal(await idx(p), 4);
  await tapCenter(p, '#mPrev'); await tapCenter(p, '#mPrev'); assert.equal(await idx(p), 2);
  await p.browserContext().close();
});

test('手机阅读：进度文字和进度线跟着翻句', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p); await p.evaluate(() => go(1));
  const n = await p.evaluate(() => SEGS.length);
  assert.equal(await p.$eval('#mCount', el => el.textContent), `第 2 / ${n} 句`);
  assert.equal(await p.$eval('#mFill', el => el.style.width), `${2 / n * 100}%`);
  await p.browserContext().close();
});

test('手机阅读：播放键切换自动播放，状态行显示速度，点屏幕停止', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  await tapCenter(p, '#mPlay');
  assert.equal(await p.evaluate(() => document.body.classList.contains('playing')), true);
  assert.equal((await box(p, '#mAutoState')).shown, true);
  assert.match(await p.$eval('#mAutoState', el => el.textContent), /自动播放 · 300 字\/分/);
  await p.touchscreen.tap(330, 400); await sleep(60);
  assert.equal(await p.evaluate(() => document.body.classList.contains('playing')), false);
  assert.equal((await box(p, '#mAutoState')).shown, false);
  await p.browserContext().close();
});

test('手机菜单：打开/关闭不翻句，控件都不小于 48', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p); await p.evaluate(() => go(2));
  await tapCenter(p, '#mMenuBtn'); await sleep(250);
  assert.equal((await box(p, '#mMenu')).shown, true);
  for (const sel of ['#mClose', '#mSlower', '#mFaster', '#mJump', '#mJumpGo', '#mTocRow', '#mOpen', '#mTip', '#mScrub']) {
    const b = await box(p, sel); assert.ok(b.h >= 48 && b.w >= 48, `${sel} ${b.w}×${b.h}`);
  }
  assert.equal(await p.$eval('#mTitle', el => el.textContent), '测试书');
  await p.touchscreen.tap(200, 60); await sleep(250);   // 点遮罩
  assert.equal((await box(p, '#mMenu')).shown, false);
  assert.equal(await idx(p), 2);
  await p.browserContext().close();
});

test('手机菜单：速度 −/+ 每次 20，限制在 60–2000', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  await tapCenter(p, '#mMenuBtn'); await sleep(250);
  await tapCenter(p, '#mFaster'); assert.equal(await p.$eval('#speed', el => el.value), '320');
  await tapCenter(p, '#mSlower'); await tapCenter(p, '#mSlower'); assert.equal(await p.$eval('#speed', el => el.value), '280');
  assert.match(await p.$eval('#mSpeedVal', el => el.textContent), /^280/);
  await p.$eval('#speed', el => el.value = 60); await tapCenter(p, '#mSlower');
  assert.equal(await p.$eval('#speed', el => el.value), '60');
  await p.browserContext().close();
});

test('手机菜单：跳到第 N 句、进度滑轨、章节', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  const n = await p.evaluate(() => SEGS.length);
  await tapCenter(p, '#mMenuBtn'); await sleep(250);
  await p.type('#mJump', '3'); await tapCenter(p, '#mJumpGo');
  assert.equal(await idx(p), 2); assert.equal(await p.$eval('#mJump', el => el.value), '');
  const s = await box(p, '#mScrub');
  const target = n - 2;   // 点在这一句对应那一段的正中间，避开分界线上的坐标取整
  await p.touchscreen.tap(s.x + s.w * (target + 0.5) / n, s.y + s.h / 2); await sleep(60);
  assert.equal(await idx(p), target);
  const chap2 = await p.evaluate(() => TOC[1]);
  await p.$eval('#mToc', (el, v) => { el.value = String(v); el.dispatchEvent(new Event('change')); }, chap2);
  assert.equal(await idx(p), chap2);
  assert.equal(await p.$eval('#mChapName', el => el.textContent), '第二章');
  await p.browserContext().close();
});

test('手机：closeOverlay() 依次收起赞赏码、菜单，没有弹层时返回 false（App 返回键用）', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  await tapCenter(p, '#mMenuBtn'); await sleep(250); await tapCenter(p, '#mTip');
  assert.equal(await p.evaluate(() => closeOverlay()), true);
  assert.equal((await box(p, '#tip')).shown, false); assert.equal((await box(p, '#mMenu')).shown, true);
  assert.equal(await p.evaluate(() => closeOverlay()), true); await sleep(250);
  assert.equal((await box(p, '#mMenu')).shown, false);
  assert.equal(await p.evaluate(() => closeOverlay()), false);
  await p.browserContext().close();
});

test('手机：自动播放时通知 App 保持常亮，停止时取消', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  await p.evaluate(() => { window.__awake = []; window.ReaderApp = { keepScreenOn: on => window.__awake.push(on) }; });
  await tapCenter(p, '#mPlay'); await tapCenter(p, '#mPlay');
  assert.deepEqual(await p.evaluate(() => window.__awake), [true, false]);
  await p.browserContext().close();
});

for (const [dark, bg, accent] of [[false, 'rgb(243, 242, 242)', 'rgb(0, 136, 176)'], [true, 'rgb(32, 30, 29)', 'rgb(98, 197, 238)']]) {
  test(`手机配色跟随系统：${dark ? '深色' : '浅色'}`, async () => {
    const p = await open(pageUrl, { phone: true, dark }); await loadBook(p);
    assert.equal(await p.$eval('body', el => getComputedStyle(el).backgroundColor), bg);
    assert.equal(await p.$eval('#mPlay', el => getComputedStyle(el).backgroundColor), accent);
    await p.browserContext().close();
  });
}

test('手机：正文用 Source Serif 4 字体（随页面打包，离线可用）', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  await p.evaluate(() => document.fonts.load('600 24px "Source Serif 4"', 'A'));
  assert.equal(await p.evaluate(() => document.fonts.check('600 24px "Source Serif 4"', 'A')), true);
  assert.match(await p.$eval('#cur', el => getComputedStyle(el).fontFamily), /^"Source Serif 4"/);
  await p.browserContext().close();
});

// 安卓大多只自带思源宋体常规体，600 字重加不粗（Redmi K60 实测）：用约 0.025em 描边模拟粗体
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 15; 23013RK75C Build/AQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/149.0.0.0 Mobile Safari/537.36';
test('安卓：加粗的中文用描边模拟，常规字和代码块不描边', async () => {
  const p = await open(pageUrl, { phone: true });
  await p.setUserAgent(ANDROID_UA); await p.reload(); await loadBook(p);
  assert.equal(await p.$eval('#cur', el => getComputedStyle(el).webkitTextStrokeWidth), '0.8px');   // 章节标题 32px
  await p.evaluate(() => go(1));
  const stroke = sel => p.$eval(sel, el => getComputedStyle(el).webkitTextStrokeWidth);
  assert.equal(await stroke('#cur'), '0.6px');          // 24px × 0.025
  assert.equal(await stroke('#mTitle'), '0.5px');       // 20px × 0.025
  assert.equal(await stroke('#mOpen'), '0.375px');      // 15px 按钮文字
  assert.equal(await stroke('.side'), '0px');
  await p.evaluate(() => { SEGS[0] = { t: 'let a = 1', c: '', k: 'code' }; go(0); });
  assert.equal(await stroke('#cur'), '0px');
  await p.browserContext().close();
});

test('非安卓触屏设备不描边', async () => {
  const p = await open(pageUrl, { phone: true }); await loadBook(p);
  assert.equal(await p.$eval('#cur', el => getComputedStyle(el).webkitTextStrokeWidth), '0px');
  await p.browserContext().close();
});
