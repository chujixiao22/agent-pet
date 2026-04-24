const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      font-family: Arial, sans-serif;
    }
    #pet-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 180px;
      height: 180px;
      cursor: pointer;
      z-index: 1000;
    }
    #pet-image {
      width: 100%;
      height: 100%;
      animation: float 3s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    @keyframes bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes working {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(3px); }
    }
    .bounce { animation: bounce 0.5s ease-in-out; }
    .working { animation: working 0.3s ease-in-out; }
    .message {
      position: absolute;
      top: -45px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 13px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .message.show { opacity: 1; }
  </style>
</head>
<body>
  <div id="pet-container">
    <img id="pet-image" src="/sprites/idle/frame_001.svg" alt="Pet"/>
    <div class="message" id="message">🦊 Hello!</div>
  </div>

  <script>
    const petImage = document.getElementById('pet-image');
    const message = document.getElementById('message');

    // 状态配置
    const states = {
      'idle': {
        frames: 4,
        duration: 250,
        path: '/sprites/idle/frame_00'
      },
      'idle_long': {
        frames: 4,
        duration: 250,
        path: '/sprites/idle_long/frame_00'
      },
      'working': {
        frames: 4,
        duration: 200,
        path: '/sprites/working/frame_00',
        animClass: 'working'
      },
      'thinking': {
        frames: 4,
        duration: 300,
        path: '/sprites/thinking/frame_00'
      },
      'success': {
        frames: 4,
        duration: 150,
        path: '/sprites/success/frame_00',
        animClass: 'bounce'
      },
      'error': {
        frames: 4,
        duration: 300,
        path: '/sprites/error/frame_00'
      }
    };

    const stateNames = Object.keys(states);
    const statusMessages = {
      'idle': '...',
      'working': 'Working hard! 💪',
      'thinking': 'Hmm... 🤔',
      'success': 'Yay! 🎉',
      'idle_long': 'Zzz... 💤',
      'error': 'Oops! 😢'
    };

    let currentStatus = 0;
    let currentFrame = 1;
    let frameInterval = null;
    let statusInterval = null;

    // 切换状态函数
    function changeStatus(newState) {
      // 清除当前动画
      if (frameInterval) clearInterval(frameInterval);

      // 更新状态
      const stateConfig = states[newState];
      petImage.src = stateConfig.path + '1.svg';

      // 移除所有动画类
      petImage.classList.remove('bounce', 'working');

      // 添加新的动画类
      if (stateConfig.animClass) {
        petImage.classList.add(stateConfig.animClass);
      }

      // 开始帧动画
      let frameIndex = 1;
      frameInterval = setInterval(() => {
        frameIndex = (frameIndex % stateConfig.frames) + 1;
        petImage.src = stateConfig.path + frameIndex + '.svg';
      }, stateConfig.duration);

      // 显示状态消息
      message.textContent = statusMessages[newState];
      message.classList.add('show');

      setTimeout(() => message.classList.remove('show'), 2000);

      console.log('状态切换:', newState, '帧:', frameIndex);
    }

    // 初始化
    changeStatus('idle');

    // 定时切换状态
    statusInterval = setInterval(() => {
      currentStatus = (currentStatus + 1) % stateNames.length;
      changeStatus(stateNames[currentStatus]);
    }, 5000); // 每5秒切换状态

    // 点击宠物
    document.getElementById('pet-container').addEventListener('click', () => {
      message.textContent = '❤️ Love you!';
      message.classList.add('show');

      setTimeout(() => {
        message.textContent = statusMessages[stateNames[currentStatus]];
        message.classList.remove('show');
      }, 1500);
    });

    // 右键菜单
    document.getElementById('pet-container').addEventListener('contextmenu', (e) => {
      e.preventDefault();

      const menu = document.createElement('div');
      menu.style.cssText = \`
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 1001;
        font-size: 14px;
      \`;

      const items = ['隐藏宠物', '显示宠物', '退出'];
      items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.textContent = item;
        menuItem.style.cssText = \`
          padding: 6px 12px;
          cursor: pointer;
          border-radius: 4px;
        \`;
        menuItem.addEventListener('mouseover', () => {
          menuItem.style.background = '#f0f0f0';
        });
        menuItem.addEventListener('mouseout', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', () => {
          if (item === '退出') {
            message.textContent = 'Bye! 👋';
            menu.remove();
          } else {
            message.textContent = item + '...';
            message.classList.add('show');
            setTimeout(() => {
              message.textContent = statusMessages[stateNames[currentStatus]];
              message.classList.remove('show');
            }, 1000);
          }
          menu.remove();
        });
        menu.appendChild(menuItem);
      });

      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      document.body.appendChild(menu);

      setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
          menu.remove();
          document.removeEventListener('click', removeMenu);
        });
      }, 0);
    });

    console.log('🦊 宠物准备就绪！');
  </script>
</body>
</html>
    `);
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log('🎉 电子宠物 MVP 已启动！');
  console.log(\`📁 真实图片已生成在: \${__dirname}/sprites/\`);
  console.log(\`🦊 访问地址: http://localhost:\${PORT}\`);
  console.log('🎨 使用了 SVG 格式的小狐狸猫宠物');
  console.log('');
  console.log('📋 状态切换: 每 5 秒自动切换');
  console.log('🖱️  点击宠物: 显示爱心');
  console.log('📱  右键菜单: 显示/隐藏/退出');
});