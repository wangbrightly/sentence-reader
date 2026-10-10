// EPUB 插图：书里打包的图片单独占一屏显示（2026-10-10 加）。
// 运行：node --test --test-concurrency=1 tests/*.test.mjs（逐个文件跑；4 个文件同时开浏览器时电脑版像素比对会偶发抖动）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { crc32, deflateRawSync } from 'node:zlib';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(process.env.PUPPETEER_DIR || join(homedir(), '.claude-tools/webshot'), 'x.js'));
const puppeteer = require('puppeteer');
const pageUrl = pathToFileURL(join(ROOT, 'index.html')).href;

// 400×200 的纯色 PNG（正文插图的尺寸），解码后能量出真实宽高
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAIAAABJdyC1AAACqklEQVR4nO3UMQ0AIADAMEAvetGDBT6ypFWwa/OMPQAK1u8AgFeGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQcQFPUQLSsPK6eQAAAABJRU5ErkJggg==', 'base64');

// 最小的 zip 打包（mimetype 不压缩，其余 deflate），够 readZip 读
function zip(files) {
  const locals = [], centrals = []; let off = 0;
  for (const [name, content] of Object.entries(files)) {
    const raw = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const store = name === 'mimetype', data = store ? raw : deflateRawSync(raw), n = Buffer.from(name);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(store ? 0 : 8, 8);
    h.writeUInt32LE(crc32(raw), 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(store ? 0 : 8, 10);
    c.writeUInt32LE(crc32(raw), 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    locals.push(h, n, data); centrals.push(c, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(centrals.length / 2, 8); e.writeUInt16LE(centrals.length / 2, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, e]);
}
const GLYPH = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAAEklEQVR4nGNgGAWjYBSMgqELAATEAAE0eCSYAAAAAElFTkSuQmCC', 'base64');   // 20×20：生僻字/小图标
const CHART = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAASwAAADICAIAAADdvUsCAAACRElEQVR4nO3TMQEAIAzAsIF65CARGT1IFPTpmnMH6Ow6AH5nQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYiaEmAkhZkKImRBiJoSYCSFmQoiZEGImhJgJIWZCiJkQYg/fZgLIQwJAoAAAAABJRU5ErkJggg==', 'base64');   // 300×200：和说明挤在同一段的图表
const xhtml = body => `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink"><head><title>x</title></head><body>${body}</body></html>`;
const EPUB = zip({
  'mimetype': 'application/epub+zip',
  'META-INF/container.xml': '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  'OEBPS/content.opf': '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>插图测试书</dc:title></metadata><manifest>'
    + '<item id="cover" href="Text/cover.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="Text/c1.xhtml" media-type="application/xhtml+xml"/></manifest>'
    + '<spine><itemref idref="cover"/><itemref idref="c1"/></spine></package>',
  // 封面常见写法：SVG 里套 <image xlink:href>
  'OEBPS/Text/cover.xhtml': xhtml('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><image width="400" height="200" xlink:href="../Images/cover.png"/></svg>'),
  'OEBPS/Text/c1.xhtml': xhtml('<h1>第一章</h1><p>插图前面的一句话。</p><p><img src="../Images/map.png" alt="鲁镇地图"/></p><p>插图后面的一句话。</p>'
    + '<p><img src="../Images/missing.png" alt="丢失的图"/></p><p><img src="../Images/missing2.png"/></p><p>最后一句话。</p>'
    + '<p>这里有个生僻字<img src="../Images/glyph.png"/>在句子中间。下一句也有<img src="../Images/glyph.png" alt="字"/>字。</p>'
    + '<p><img src="../Images/chart.png"/>图1-1 增长曲线</p>'),
  'OEBPS/Images/cover.png': PNG,
  'OEBPS/Images/map.png': PNG,
  'OEBPS/Images/glyph.png': GLYPH,
  'OEBPS/Images/chart.png': CHART,
});

let browser;
before(async () => { browser = await puppeteer.launch({ headless: 'shell' }); });
after(() => browser?.close());

async function open({ phone = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(phone ? { width: 411, height: 866, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.evaluate(async b64 => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    await openFile(new File([bytes], '插图测试书.epub')); }, EPUB.toString('base64'));
  return page;
}
const segs = p => p.evaluate(() => SEGS.map(s => ({ t: s.t, k: s.k || '', img: s.img ? { type: s.img.type, size: s.img.size } : null })));
const goTo = (p, t) => p.evaluate(t => go(SEGS.findIndex(s => s.t === t)), t);
const shownImg = p => p.$eval('#cur', el => { const im = el.querySelector('img'); return im && im.complete ? { w: im.naturalWidth, h: im.naturalHeight } : null; });

test('EPUB 里的 <img> 和 SVG <image> 变成插图，带图片数据', async () => {
  const p = await open();
  const s = await segs(p);
  const imgs = s.filter(x => x.k === 'img');
  assert.deepEqual(imgs.map(x => x.t), ['［图］', '［图：鲁镇地图］', '［图］']);
  for (const x of imgs.slice(0, 2)) assert.deepEqual(x.img, { type: 'image/png', size: PNG.length });
  const order = s.map(x => x.t);
  assert.ok(order.indexOf('插图前面的一句话。') < order.indexOf('［图：鲁镇地图］') && order.indexOf('［图：鲁镇地图］') < order.indexOf('插图后面的一句话。'));
  await p.browserContext().close();
});

test('书里找不到的图片：有说明就留一句"［图：说明］"文字，没说明就跳过', async () => {
  const p = await open();
  const s = await segs(p);
  assert.deepEqual(s.filter(x => x.t.startsWith('［图')).map(x => [x.t, x.k]), [['［图］', 'img'], ['［图：鲁镇地图］', 'img'], ['［图：丢失的图］', ''], ['［图］', 'img']]);
  await p.browserContext().close();
});

test('翻到插图时显示图片和说明，上下句提示显示"［图：说明］"', async () => {
  const p = await open();
  await goTo(p, '［图：鲁镇地图］'); await p.waitForFunction(() => document.querySelector('#cur img')?.complete);
  assert.deepEqual(await shownImg(p), { w: 400, h: 200 });
  assert.equal(await p.$eval('#cur', el => el.textContent), '鲁镇地图');
  await goTo(p, '插图后面的一句话。');
  assert.equal(await p.$eval('#prev', el => el.textContent), '［图：鲁镇地图］');
  assert.equal(await p.$eval('#cur img', el => el).catch(() => null), null);
  await p.browserContext().close();
});

test('自动播放：插图停留 3 秒，文字照旧按字数算', async () => {
  const p = await open();
  assert.equal(await p.evaluate(() => segWait({ t: '［图］', k: 'img' })), 3000);
  assert.equal(await p.evaluate(() => segWait({ t: '一二三四五六七八九十' })), Math.max(1200, 10 / 300 * 60000 + 400));
  await p.browserContext().close();
});

test('关掉再打开：上次那本书的插图还在', async () => {
  const p = await open();
  await goTo(p, '［图：鲁镇地图］'); await new Promise(r => setTimeout(r, 300));   // 等"上次那本书"写进本地数据库
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => SEGS.length && document.querySelector('#cur img')?.complete);
  assert.deepEqual(await shownImg(p), { w: 400, h: 200 });
  await p.browserContext().close();
});

test('手机：插图放大但不超出阅读区，不压到底栏', async () => {
  const p = await open({ phone: true });
  await goTo(p, '［图：鲁镇地图］'); await p.waitForFunction(() => document.querySelector('#cur img')?.complete);
  const r = await p.evaluate(() => { const im = document.querySelector('#cur img').getBoundingClientRect(), bar = document.getElementById('mBar').getBoundingClientRect();
    return { w: im.width, bottom: im.bottom, barTop: bar.top }; });
  assert.ok(r.w >= 300, `图片宽 ${r.w}，应放大到接近正文宽度`);
  assert.ok(r.bottom <= r.barTop, `图片底边 ${r.bottom} 压到了底栏 ${r.barTop}`);
  await p.browserContext().close();
});

// 升级前存的进度用"书名:不含插图的句数"当钥匙、按不含插图的序号记位置；升级后插图多出几屏，要能接上
test('升级前读到的位置：换算到含插图后的新位置', async () => {
  const p = await open();
  const r = await p.evaluate(async () => {
    const textOnly = SEGS.filter(s => s.k !== 'img');
    const target = textOnly.findIndex(s => s.t === '插图后面的一句话。');
    localStorage.clear();
    localStorage.setItem('pos:' + BOOK + ':' + textOnly.length, target);
    load(BOOK, SEGS, false);
    return { t: SEGS[i].t };
  });
  assert.equal(r.t, '插图后面的一句话。');
  await p.browserContext().close();
});

// 2026-10-10 用真书实测：《诸子百家》3610 张、《国家是怎样破产的》161 张小图是嵌在句子里的生僻字/小图标，不能各占一屏
test('小图（长边 ≤160 像素）留在句子里，不单独占一屏', async () => {
  const p = await open();
  const r = await p.evaluate(() => SEGS.filter(s => s.inl).map(s => ({ n: s.inl.length, text: s.t.replace(/\uE000/g, '□') })));
  assert.deepEqual(r, [{ n: 1, text: '这里有个生僻字□在句子中间。' }, { n: 1, text: '下一句也有□字。' }]);
  await p.browserContext().close();
});

test('句子里的小图按字的大小显示在文字中间', async () => {
  const p = await open();
  await goTo(p, (await p.evaluate(() => SEGS.find(s => s.inl).t)));
  await p.waitForFunction(() => [...document.querySelectorAll('#cur img')].every(im => im.complete));
  const r = await p.$eval('#cur', el => { const im = el.querySelector('img'), fs = parseFloat(getComputedStyle(el).fontSize);
    return { text: el.textContent, imgs: el.querySelectorAll('img').length, h: im.getBoundingClientRect().height, fs }; });
  assert.equal(r.text, '这里有个生僻字在句子中间。');
  assert.equal(r.imgs, 1);
  assert.ok(Math.abs(r.h - r.fs) <= 2, `小图高 ${r.h}，应和字号 ${r.fs} 差不多`);
  assert.equal(await p.$eval('#next', el => el.querySelectorAll('img').length), 1);   // 下一句提示里的小图也显示
  await p.browserContext().close();
});

test('大图和说明挤在同一段：图单独一屏，说明文字照常成句', async () => {
  const p = await open();
  const t = await p.evaluate(() => SEGS.map(s => s.k === 'img' ? '[IMG]' : s.t));
  const k = t.indexOf('图1-1 增长曲线');
  assert.ok(k > 0 && t[k - 1] === '[IMG]', JSON.stringify(t.slice(-4)));
  await p.browserContext().close();
});

// 2026-10-10 真书实测：《诸子百家》《国家是怎样破产的》升级后不含插图的句数和旧版也对不上（句内小图改变了切句），按比例估算，不回到开头
test('升级前的进度句数对不上：按比例估算位置，不回到开头', async () => {
  const p = await open();
  const r = await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('pos:' + BOOK + ':' + (SEGS.length * 2 + 7), SEGS.length);   // 旧版共 2n+7 句、读到第 n 句（约一半）
    load(BOOK, SEGS, false);
    return { i, n: SEGS.length };
  });
  assert.equal(r.i, Math.round(r.n / (r.n * 2 + 7) * r.n));
  await p.browserContext().close();
});

test('记下了当前那句话：切句方式变了也按这句话找回原位', async () => {
  const p = await open();
  const r = await p.evaluate(() => {
    const target = SEGS.findIndex(s => s.t === '插图后面的一句话。');
    go(target);                                    // 正常翻页会同时记下位置和这句话
    const savedText = localStorage.getItem('post:' + BOOK);
    localStorage.removeItem('pos:' + BOOK + ':' + SEGS.length);
    localStorage.setItem('pos:' + BOOK + ':' + (SEGS.length + 3), 0);   // 模拟句数变了、旧位置不准
    load(BOOK, SEGS, false);
    return { savedText, t: SEGS[i].t };
  });
  assert.equal(r.savedText, '插图后面的一句话。');
  assert.equal(r.t, '插图后面的一句话。');
  await p.browserContext().close();
});
