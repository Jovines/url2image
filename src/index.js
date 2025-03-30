const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// 创建存储截图的目录
const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// 设置静态文件服务
app.use('/screenshots', express.static(screenshotsDir));
app.use(express.static(path.join(__dirname, 'public')));

// 截图API接口
app.post('/screenshot', async (req, res) => {
  try {
    const { url, selector } = req.body;
    
    if (!url || !selector) {
      return res.status(400).json({ error: '请提供URL和元素选择器' });
    }

    // 创建puppeteer数据目录
    const puppeteerDataDir = path.join(__dirname, '../.puppeteer-data');
    if (!fs.existsSync(puppeteerDataDir)) {
      fs.mkdirSync(puppeteerDataDir, { recursive: true });
    }

    // 启动浏览器
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      userDataDir: puppeteerDataDir
    });

    const page = await browser.newPage();
    
    // 设置视口大小
    await page.setViewport({ width: 1920, height: 1080 });
    
    // 导航到目标页面
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // 等待元素加载
    await page.waitForSelector(selector);
    
    // 获取元素
    const element = await page.$(selector);
    
    if (!element) {
      await browser.close();
      return res.status(404).json({ error: '未找到指定元素' });
    }

    // 生成文件名
    const timestamp = Date.now();
    const filename = `screenshot_${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename);

    // 截取元素截图
    await element.screenshot({
      path: filepath
    });

    await browser.close();

    // 返回图片访问链接
    const imageUrl = `/screenshots/${filename}`;
    res.json({ imageUrl });

  } catch (error) {
    console.error('截图出错:', error);
    res.status(500).json({ error: '截图服务出错' });
  }
});

const PORT = process.env.PORT || 8848;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});