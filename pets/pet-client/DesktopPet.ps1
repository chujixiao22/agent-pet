# 桌面悬浮宠物 - PowerShell + HTML 混合方案
# 使用 WebBrowser 控件创建透明悬浮窗口

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 创建表单（窗口）
$form = New-Object System.Windows.Forms.Form
$form.Width = 220
$form.Height = 220
$form.StartPosition = "Manual"
$form.BackColor = [System.Drawing.Color]::FromArgb(1, 1, 1)
$form.TransparencyKey = [System.Drawing.Color]::FromArgb(1, 1, 1)
$form.FormBorderStyle = 'None'
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.AllowTransparency = $true

# 设置窗口位置（右下角）
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$form.Left = $screen.WorkingArea.Right - 230
$form.Top = $screen.WorkingArea.Bottom - 230

# 创建 WebBrowser 控件
$web = New-Object System.Windows.Forms.WebBrowser
$web.Width = 200
$web.Height = 200
$web.Top = 0
$web.Left = 0
$web.ScriptErrorsSuppressed = $true

# HTML 内容
$html = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
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
    <img id="img" src="sprites/idle/frame_001.svg"/>
    <div id="msg">🦊 Hello!</div>
  </div>
  <script>
    const states = {
      'idle': {f:12,d:100,p:'sprites/idle/frame_00'},
      'idle_long': {f:8,d:250,p:'sprites/idle_long/frame_00'},
      'working': {f:10,d:100,p:'sprites/working/frame_00',c:'work'},
      'thinking': {f:9,d:130,p:'sprites/thinking/frame_00'},
      'success': {f:8,d:80,p:'sprites/success/frame_00',c:'bounce'},
      'error': {f:10,d:150,p:'sprites/error/frame_00'}
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

    pet.oncontextmenu = (e) => {
      e.preventDefault();
      // 通知PowerShell显示菜单
      window.external.ShowMenu(e.screenX, e.screenY);
    };

    function setPosition(x, y) {
      window.external.SetPosition(x, y);
    }
  </script>
</body>
</html>
"@

# 设置 WebBrowser HTML
$web.DocumentText = $html

# 添加控件到表单
$form.Controls.Add($web)

# 让窗口可拖拽
$form.Add_MouseDown({
    $form.Draggable = $true
})

# 菜单回调处理
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$menu.Items.Add("隐藏宠物", { $form.Hide() })
$menu.Items.Add("-")
$menu.Items.Add("退出", { $script:exit = $true; $form.Close() })

# 公开方法给 WebBrowser 调用
$form.Add_Shown({
    # 添加菜单到窗体
    $form.ContextMenuStrip = $menu
})

# 窗口拖拽支持
$isDragging = $false
$mousePos = [System.Drawing.Point]::Empty

$form.Add_MouseDown({
    $isDragging = $true
    $mousePos = [System.Windows.Forms.Control]::MousePosition
})

$form.Add_MouseMove({
    if ($isDragging) {
        $currentPos = [System.Windows.Forms.Control]::MousePosition
        $deltaX = $currentPos.X - $mousePos.X
        $deltaY = $currentPos.Y - $mousePos.Y
        $form.Left = $form.Left + $deltaX
        $form.Top = $form.Top + $deltaY
        $mousePos = $currentPos
    }
})

$form.Add_MouseUp({
    $isDragging = $false
})

# 定时器保持运行
$exit = $false
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 100
$timer.Add_Tick({
    if ($exit) {
        $timer.Stop()
    }
})

# 显示窗口
$form.Show()
$timer.Start()

# 运行消息循环
[System.Windows.Forms.Application]::Run($form)