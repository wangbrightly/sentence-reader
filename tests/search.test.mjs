// 搜索：在当前这本书里找关键词，列出结果，点一下跳过去；跳过去后高亮、上一个/下一个、最近搜过的词（2026-10-10 加）。
// 运行：node --test --test-concurrency=1 tests/*.test.mjs（逐个文件跑；4 个文件同时开浏览器时电脑版像素比对会偶发抖动）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(process.env.PUPPETEER_DIR || join(homedir(), '.claude-tools/webshot'), 'x.js'));
const puppeteer = require('puppeteer');
const pageUrl = pathToFileURL(join(ROOT, 'index.html')).href;

const BOOK = ['# 第一章 故乡', '', '我冒了严寒，回到相隔二千余里的故乡去。时候既然是深冬，天气又阴晦了。',
  '我的故乡好得多了。Hello World 也在这里出现一次。', '', '## 第二章 社戏', '',
  '我在倒数上去的二十年中，只看过两回中国戏。那一回是民国元年我初到北京的时候。', '这正如地上的路，其实地上本没有路，走的人多了，也便成了路。', ''].join('\n');

let browser;
before(async () => { browser = await puppeteer.launch({ headless: 'shell' }); });
after(() => browser?.close());

async function open({ phone = false, book = BOOK } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(phone ? { width: 411, height: 866, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.evaluate(async b => { await openFile(new File([b], '呐喊.md')); }, book);
  return page;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const box = (p, sel) => p.$eval(sel, el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, shown: r.width > 0 }; });
async function tapCenter(p, sel) { const b = await box(p, sel); await p.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2); await sleep(80); }
async function typeQuery(p, q) { await p.$eval('#qInput', el => el.value = ''); await p.type('#qInput', q); await sleep(350); }
const rows = p => p.$$eval('#qList .q-row', els => els.map(el => el.textContent));

test('searchHits：不分大小写，正文、章节标题都能搜到', async () => {
  const p = await open();
  const r = await p.evaluate(() => ({ a: searchHits('故乡').map(k => SEGS[k].t), b: searchHits('hello world').length, c: searchHits('不存在的词').length }));
  assert.deepEqual(r.a, ['第一章 故乡', '我冒了严寒，回到相隔二千余里的故乡去。', '我的故乡好得多了。']);
  assert.equal(r.b, 1); assert.equal(r.c, 0);
  await p.browserContext().close();
});

test('手机：菜单里的「搜索」打开搜索页，边输入边出结果，关键词标色', async () => {
  const p = await open({ phone: true });
  await tapCenter(p, '#mMenuBtn'); await sleep(250);
  const row = await box(p, '#mSearchRow'); assert.ok(row.h >= 48);
  await tapCenter(p, '#mSearchRow'); await sleep(150);
  assert.equal((await box(p, '#qPanel')).shown, true);
  assert.equal((await box(p, '#mMenu')).shown, false);
  assert.equal(await p.evaluate(() => document.activeElement.id), 'qInput');
  await typeQuery(p, '路');
  assert.equal(await p.$eval('#qStatus', el => el.textContent), '共 1 句');
  const r = await rows(p); assert.equal(r.length, 1); assert.match(r[0], /第二章 社戏 · 第 9 句/);
  assert.equal(await p.$$eval('#qList mark', els => els.map(e => e.textContent).join('|')), '路|路|路');
  for (const h of await p.$$eval('#qList .q-row', els => els.map(e => e.getBoundingClientRect().height))) assert.ok(h >= 48);
  await p.browserContext().close();
});

test('没有结果时提示', async () => {
  const p = await open({ phone: true });
  await p.evaluate(() => openSearch()); await typeQuery(p, '不存在的词');
  assert.equal(await p.$eval('#qStatus', el => el.textContent), '没有找到「不存在的词」');
  assert.equal((await rows(p)).length, 0);
  await p.browserContext().close();
});

test('点一条结果：跳过去，当前句关键词标色，顶部显示 1/3 和上一个/下一个', async () => {
  const p = await open({ phone: true });
  await p.evaluate(() => openSearch()); await typeQuery(p, '故乡');
  await tapCenter(p, '#qList .q-row:nth-child(2)');
  assert.equal((await box(p, '#qPanel')).shown, false);
  assert.equal(await p.evaluate(() => SEGS[i].t), '我冒了严寒，回到相隔二千余里的故乡去。');
  assert.equal(await p.$eval('#cur mark', el => el.textContent), '故乡');
  assert.equal((await box(p, '#qNav')).shown, true);
  assert.equal((await box(p, '#chap')).shown, false);
  assert.equal(await p.$eval('#qNavLabel', el => el.textContent), '“故乡” 2/3');
  for (const sel of ['#qPrev', '#qNext', '#qClose']) { const b = await box(p, sel); assert.ok(b.w >= 48 && b.h >= 48, sel); }
  await tapCenter(p, '#qNext');
  assert.equal(await p.evaluate(() => SEGS[i].t), '我的故乡好得多了。');
  assert.equal(await p.$eval('#qNavLabel', el => el.textContent), '“故乡” 3/3');
  await tapCenter(p, '#qPrev'); await tapCenter(p, '#qPrev');
  assert.equal(await p.evaluate(() => SEGS[i].t), '第一章 故乡');
  await tapCenter(p, '#qClose');
  assert.equal((await box(p, '#qNav')).shown, false);
  assert.equal(await p.$('#cur mark'), null);
  await p.browserContext().close();
});

test('搜索状态下手动翻到别处：上一个/下一个从当前位置算起', async () => {
  const p = await open({ phone: true });
  await p.evaluate(() => openSearch()); await typeQuery(p, '故乡');
  await tapCenter(p, '#qList .q-row:nth-child(1)');
  await p.evaluate(() => go(SEGS.length - 1));
  assert.equal(await p.$eval('#qNavLabel', el => el.textContent), '“故乡” 共 3 句');
  await tapCenter(p, '#qPrev');
  assert.equal(await p.evaluate(() => SEGS[i].t), '我的故乡好得多了。');
  await p.browserContext().close();
});

test('结果太多只列前 500 句，并说明总数', async () => {
  const many = Array.from({ length: 620 }, (_, k) => `这是第${k}个重复的句子。`).join('\n\n');
  const p = await open({ phone: true, book: many });
  await p.evaluate(() => openSearch()); await typeQuery(p, '重复');
  assert.equal(await p.$eval('#qStatus', el => el.textContent), '共 620 句，只列出前 500 句');
  assert.equal((await rows(p)).length, 500);
  await p.browserContext().close();
});

test('最近搜过的词：输入框为空时列出，点一下再搜，可以清除', async () => {
  const p = await open({ phone: true });
  await p.evaluate(() => localStorage.removeItem('recentQ'));
  for (const q of ['故乡', '路', '故乡']) { await p.evaluate(() => openSearch()); await typeQuery(p, q); await p.keyboard.press('Enter'); await p.evaluate(() => closeSearch()); }
  await p.evaluate(() => openSearch()); await p.$eval('#qInput', el => { el.value = ''; el.dispatchEvent(new Event('input')); }); await sleep(300);
  assert.deepEqual(await p.$$eval('#qRecent .q-recent', els => els.map(e => e.textContent)), ['故乡', '路']);
  await tapCenter(p, '#qRecent .q-recent:nth-child(2)'); await sleep(300);
  assert.equal(await p.$eval('#qInput', el => el.value), '路');
  assert.equal(await p.$eval('#qStatus', el => el.textContent), '共 1 句');
  await p.$eval('#qInput', el => { el.value = ''; el.dispatchEvent(new Event('input')); }); await sleep(300);
  await tapCenter(p, '#qClearRecent');
  assert.equal(await p.$$eval('#qRecent .q-recent', els => els.length), 0);
  assert.equal(await p.evaluate(() => localStorage.getItem('recentQ')), '[]');
  await p.browserContext().close();
});

test('安卓返回键：先关搜索页，再退出搜索状态，最后才交给 App', async () => {
  const p = await open({ phone: true });
  await p.evaluate(() => openSearch()); await typeQuery(p, '故乡');
  await tapCenter(p, '#qList .q-row:nth-child(1)');
  await p.evaluate(() => openSearch());
  assert.equal(await p.evaluate(() => closeOverlay()), true); assert.equal((await box(p, '#qPanel')).shown, false);
  assert.equal(await p.evaluate(() => closeOverlay()), true); assert.equal((await box(p, '#qNav')).shown, false);
  assert.equal(await p.evaluate(() => closeOverlay()), false);
  await p.browserContext().close();
});

test('点搜索导航条不会误翻句', async () => {
  const p = await open({ phone: true });
  await p.evaluate(() => openSearch()); await typeQuery(p, '故乡');
  await tapCenter(p, '#qList .q-row:nth-child(2)');
  const before = await p.evaluate(() => i);
  await tapCenter(p, '#qNavLabel');
  assert.equal(await p.evaluate(() => i), before);
  await p.browserContext().close();
});

test('换一本书时退出搜索状态', async () => {
  const p = await open({ phone: true });
  await p.evaluate(() => openSearch()); await typeQuery(p, '故乡');
  await tapCenter(p, '#qList .q-row:nth-child(1)');
  await p.evaluate(async () => { await openFile(new File(['另一本书的第一句话。'], '另一本.md')); });
  assert.equal((await box(p, '#qNav')).shown, false);
  await p.browserContext().close();
});

test('电脑：顶栏「搜索」按钮和 / 键都能打开，Esc 关闭', async () => {
  const p = await open();
  await p.click('#qBtn'); assert.equal((await box(p, '#qPanel')).shown, true);
  await p.keyboard.press('Escape'); assert.equal((await box(p, '#qPanel')).shown, false);
  await p.keyboard.press('/'); assert.equal((await box(p, '#qPanel')).shown, true);
  assert.equal(await p.evaluate(() => document.activeElement.id), 'qInput');
  assert.equal(await p.$eval('#qInput', el => el.value), '');   // "/" 本身不该被输进框里
  await typeQuery(p, '故乡'); await p.click('#qList .q-row:nth-child(3)');
  assert.equal(await p.evaluate(() => SEGS[i].t), '我的故乡好得多了。');
  assert.equal(await p.$eval('#cur mark', el => el.textContent), '故乡');
  await p.browserContext().close();
});
