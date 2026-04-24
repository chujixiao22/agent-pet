const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3006;
const BASE_DIR = __dirname;

const server = http.createServer((req, res) => {
  console.log('Request:', req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
    return;
  }

  if (req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
    return;
  }

  if (req.url.startsWith('/sprites/')) {
    const filePath = path.join(BASE_DIR, req.url.replace(/\//g, path.sep));
    console.log('File path:', filePath);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = ext === '.svg' ? 'image/svg+xml' : 'image/png';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

function getHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body {
      width: 200px;
      height: 200px;
      background: transparent;
      overflow: hidden;
      cursor: move;
    }
    #pet {
      width: 100%;
      height: 100%;
      position: relative;
    }
    #img {
      width: 100%;
      height: 100%;
      animation: float 3s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes bounce {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.1) translateY(-18px); }
      50% { transform: scale(1.05) translateY(-12px); }
      75% { transform: scale(1.1) translateY(-18px); }
    }
    @keyframes work {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(4px); }
      75% { transform: translateX(-4px); }
    }
    .bounce { animation: bounce 0.5s ease-in-out infinite; }
    .work { animation: work 0.3s ease-in-out infinite; }
    #msg {
      position: absolute;
      top: -45px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255,255,255,0.95);
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s;
      box-shadow: 0 3px 10px rgba(0,0,0,0.15);
    }
    #msg.show { opacity: 1; }
  </style>
</head>
<body>
  <div id="pet">
    <img id="img" src="/sprites/idle/frame_001.svg"/>
    <div id="msg">🦊 Hello!</div>
  </div>
  <script>
    const states = {
      'idle': {f:12,d:100,p:'/sprites/idle/frame_00'},
      'idle_long': {f:8,d:250,p:'/sprites/idle_long/frame_00'},
      'working': {f:10,d:100,p:'/sprites/working/frame_00',c:'work'},
      'thinking': {f:9,d:130,p:'/sprites/thinking/frame_00'},
      'success': {f:8,d:80,p:'/sprites/success/frame_00',c:'bounce'},
      'error': {f:10,d:150,p:'/sprites/error/frame_00'}
    };
    const msgs = {
      'idle':'...','working':'Working! 💪','thinking':'Hmm... 🤔',
      'success':'Yay! 🎉','idle_long':'Zzz... 💤','error':'Oops! 😢'
    };
    const names = Object.keys(states);
    let ci = 0, fi = 1, ti = null, si = null;

    function setState(s) {
      if(ti) clearInterval(ti);
      const c = states[s];
      img.src = c.p + '1.svg';
      img.className = c.c || '';
      fi = 1;
      ti = setInterval(() => {
        fi = (fi % c.f) + 1;
        img.src = c.p + fi.toString().padStart(3,'0') + '.svg';
      }, c.d);
      msg.textContent = msgs[s];
      msg.classList.add('show');
      setTimeout(() => msg.classList.remove('show'), 2000);
      console.log('State:', s, 'Frame:', fi);
    }

    setState('idle');
    si = setInterval(() => {
      ci = (ci + 1) % names.length;
      setState(names[ci]);
    }, 4000);

    pet.onclick = () => {
      msg.textContent = '❤️ Love!';
      msg.classList.add('show');
      setTimeout(() => {msg.textContent = msgs[names[ci]]; msg.classList.remove('show');}, 1500);
    };

    console.log('🦊 Pet ready!');
  </script>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log('🦊 Desktop Pet Server running on http://localhost:' + PORT);
});