// 文本解析：Markdown/TXT 里的 HTML 字符引用（&#xA; &amp; &ldquo; …）要像标准 Markdown 一样还原成字符。
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

let browser, page;
before(async () => {
  browser = await puppeteer.launch({ headless: 'shell' });
  page = await browser.newPage();
  await page.goto(pathToFileURL(join(ROOT, 'index.html')).href);
});
after(() => browser?.close());

const segs = md => page.evaluate(s => parseMarkdown(s).map(x => x.t), md);

// 2026-10-09 用户的《Jev作者完整访谈.md》：换行全被存成了 &#xA;，"Diogo Almeida"前面露出乱码
test('&#xA;（换行）还原，不再出现在句子里', async () => {
  assert.deepEqual(await segs('主持人：欢迎来到录音室。&#xA;&#xA;Diogo Almeida：从状态上来说，非常疲惫。'),
    ['主持人：欢迎来到录音室。', 'Diogo Almeida：从状态上来说，非常疲惫。']);
});

test('十进制、十六进制字符引用', async () => {
  assert.deepEqual(await segs('这是&#x4E2D;&#25991;的句子。'), ['这是中文的句子。']);
});

test('常见命名引用', async () => {
  assert.deepEqual(await segs('他说&ldquo;你好&rdquo;&mdash;&mdash;然后走了。'), ['他说“你好”——然后走了。']);
});

test('还原出的尖括号只是文字，不会变成网页标签', async () => {
  assert.deepEqual(await segs('比较 a &lt;b&gt; c 的大小 &amp; 顺序。'), ['比较 a <b> c 的大小 & 顺序。']);
});

test('不认识或不合法的写法原样保留', async () => {
  assert.deepEqual(await segs('保留 &foo; 和 &#xFFFFFFF; 以及 AT&T 原样。'), ['保留 &foo; 和 &#xFFFFFFF; 以及 AT&T 原样。']);
});

test('标题里的字符引用也还原', async () => {
  const r = await page.evaluate(() => parseMarkdown('# 甲&amp;乙\n\n正文的一句话。')[0]);
  assert.equal(r.t, '甲&乙');
});

test('代码块里的内容保持原样', async () => {
  const r = await page.evaluate(() => parseMarkdown('```\nx = "&amp;";\n```').find(s => s.k === 'code'));
  assert.equal(r.t, 'x = "&amp;";');
});
