const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    const indexPath = path.join(__dirname, 'enhanced-pet.html');
    try {
      const htmlContent = fs.readFileSync(indexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlContent);
    } catch (error) {
      res.writeHead(500);
      res.end('Error loading page');
    }
    return;
  }

  if (req.url.startsWith('/sprites/')) {
    // 转换URL路径为本地路径，处理Windows反斜杠问题
    const urlPath = req.url.replace(/\//g, path.sep);
    const filePath = path.join(__dirname, urlPath);
    try {
      const imageContent = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const contentType = ext === '.svg' ? 'image/svg+xml' : 'image/png';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(imageContent);
    } catch (error) {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log('🦊 增强版电子宠物服务器已启动！');
  console.log(`📁 增强图片: ${__dirname}/sprites/ (57帧)`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log('✨ 增强功能: 更多帧数+更多表情+更大幅度');
});