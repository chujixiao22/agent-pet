// Pet states
const STATES = {
  IDLE: 'idle',
  IDLE_LONG: 'idle_long',
  WORKING: 'working',
  THINKING: 'thinking',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Default animation configuration (fallback)
const DEFAULT_ANIMATION_CONFIG = {
  [STATES.IDLE]: { fps: 8, frames: 12, loop: true },
  [STATES.IDLE_LONG]: { fps: 4, frames: 8, loop: true },
  [STATES.WORKING]: { fps: 10, frames: 10, loop: true },
  [STATES.THINKING]: { fps: 6, frames: 9, loop: true },
  [STATES.SUCCESS]: { fps: 8, frames: 8, loop: false },
  [STATES.ERROR]: { fps: 8, frames: 10, loop: false }
};

// Default sprite path (for 'default' skin)
const DEFAULT_SPRITE_PATH = '../assets/sprites';

// Skin config (received from main process)
let skinConfig = null;

// State transitions after certain events
const STATE_TRANSITIONS = {
  [STATES.SUCCESS]: STATES.IDLE,
  [STATES.ERROR]: STATES.IDLE,
  [STATES.WORKING]: STATES.IDLE
};

// Auto-switch interval (4 seconds)
const AUTO_SWITCH_INTERVAL = 4000;

class Pet {
  constructor() {
    this.currentState = STATES.IDLE;
    this.currentFrame = 0;
    this.isAnimating = false;
    this.animationTimer = null;
    this.autoSwitchTimer = null;
    this.sprite = document.getElementById('pet-sprite');
    this.container = document.getElementById('pet-container');
    this.taskDriven = false;
    this.spritePath = DEFAULT_SPRITE_PATH;
    this.animationConfig = { ...DEFAULT_ANIMATION_CONFIG };

    this.init();
  }

  init() {
    // Load sprites for all states
    this.loadAllSprites().then(() => {
      this.startAnimation();
      this.startAutoSwitch();
      this.bindEvents();
    });
  }

  // Apply skin configuration from main process
  applySkinConfig(config) {
    if (!config) return;

    skinConfig = config;
    this.skinName = config.name;
    this.spritePath = config.spritePath || DEFAULT_SPRITE_PATH;

    // Merge skin config with defaults for missing states
    for (const [state, stateConfig] of Object.entries(config.states || {})) {
      const upperState = state.toUpperCase();
      if (STATES[upperState]) {
        this.animationConfig[STATES[upperState]] = {
          ...DEFAULT_ANIMATION_CONFIG[STATES[upperState]],
          ...stateConfig
        };
      }
    }

    // Reload sprites if already loaded
    if (this.sprites && Object.keys(this.sprites).length > 0) {
      this.loadAllSprites().then(() => {
        // Restart animation with new sprites
        this.currentFrame = 0;
        if (this.isAnimating) {
          clearTimeout(this.animationTimer);
          this.animate();
        }
      });
    }

    // Apply theme
    document.documentElement.setAttribute('data-theme', config.theme || 'light');
  }

  async loadAllSprites() {
    this.sprites = {};

    for (const state of Object.values(STATES)) {
      this.sprites[state] = [];
      const config = this.animationConfig[state];
      if (!config) continue;

      for (let i = 1; i <= config.frames; i++) {
        const frameNum = String(i).padStart(3, '0');
        const img = new Image();
        const src = `${this.spritePath}/${state}/frame_${frameNum}.svg`;

        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
          });
          this.sprites[state].push(src);
        } catch (e) {
          console.warn(`Failed to load sprite: ${src}`);
        }
      }
    }
  }

  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  animate() {
    if (!this.isAnimating) return;

    const config = this.animationConfig[this.currentState];
    const frames = this.sprites[this.currentState];

    if (!frames || frames.length === 0) return;

    // Update sprite
    this.sprite.src = frames[this.currentFrame];

    // Next frame
    this.currentFrame++;

    // Check if animation ended
    if (this.currentFrame >= config.frames) {
      if (config.loop) {
        this.currentFrame = 0;
      } else {
        this.currentFrame = config.frames - 1;
        // Transition to next state
        const nextState = STATE_TRANSITIONS[this.currentState];
        if (nextState) {
          setTimeout(() => this.setState(nextState), 100);
        }
        return;
      }
    }

    // Schedule next frame
    const delay = 1000 / config.fps;
    this.animationTimer = setTimeout(() => this.animate(), delay);
  }

  setState(newState) {
    if (this.currentState === newState) return;

    this.currentState = newState;
    this.currentFrame = 0;

    // Restart animation with new state
    clearTimeout(this.animationTimer);
    this.animate();
  }

  startAutoSwitch() {
    // Idle 状态累计计时器，用于触发 idle_long（问号/阶段性唤醒）
    this.idleDuration = 0;

    this.autoSwitchTimer = setInterval(() => {
      // 有任务时由 updateTasks 驱动，不走这里
      if (this.taskDriven) {
        this.idleDuration = 0;
        return;
      }

      // success/error 动画不打断
      if (this.currentState === STATES.SUCCESS || this.currentState === STATES.ERROR) {
        return;
      }

      this.idleDuration += AUTO_SWITCH_INTERVAL;

      // 每 20 秒左右出现一次 idle_long（问号/阶段性唤醒），其余 idle
      let newState;
      if (this.idleDuration >= 20000 && this.currentState !== STATES.IDLE_LONG) {
        newState = STATES.IDLE_LONG;
        this.idleDuration = 0;
      } else if (this.currentState === STATES.IDLE_LONG) {
        // idle_long 持续约 4 秒后切回 idle
        if (this.idleDuration >= 4000) {
          newState = STATES.IDLE;
          this.idleDuration = 0;
        }
      } else {
        newState = STATES.IDLE;
      }

      if (newState && newState !== this.currentState) {
        this.setState(newState);
      }
    }, AUTO_SWITCH_INTERVAL);
  }

  handleClick() {
    // Play click animation
    this.sprite.classList.remove('floating');
    this.sprite.classList.add('click-effect');

    // Show success state briefly
    this.setState(STATES.SUCCESS);

    // Remove click effect class
    setTimeout(() => {
      this.sprite.classList.remove('click-effect');
      this.sprite.classList.add('floating');
    }, 300);
  }

  bindEvents() {
    // Click interaction
    this.container.addEventListener('click', () => {
      this.handleClick();
    });

    // Double click
    this.container.addEventListener('dblclick', () => {
      this.setState(STATES.WORKING);
    });

    // Drag handling — simplified: renderer only sends start/end,
    // main process tracks mouse via electron.screen API
    let mouseDownPos = { x: 0, y: 0 };

    this.container.addEventListener('mousedown', (e) => {
      // Prevent default to stop any native drag behavior / ghost image
      e.preventDefault();
      mouseDownPos = { x: e.screenX, y: e.screenY };
      window.electronAPI.dragStart(e.screenX, e.screenY);
    });

    this.container.addEventListener('mouseup', () => {
      window.electronAPI.dragEnd();
    });

    // Safety net: if mouse leaves the window during drag, end it
    this.container.addEventListener('mouseleave', () => {
      window.electronAPI.dragEnd();
    });

    // Prevent native drag behavior on the image element
    this.sprite.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });

    // Add floating class initially
    this.sprite.classList.add('floating');
  }

  updateTasks(tasks) {
    const activeTasks = tasks.filter(t => t.status === 'working' || t.status === 'waiting');
    const hasInterrupted = tasks.some(t => t.status === 'interrupted');
    const allDone = tasks.length > 0 && tasks.every(t => t.status === 'completed' || t.status === 'interrupted');

    if (hasInterrupted && activeTasks.length === 0) {
      // 有中断任务 → 红色 error 动画
      this.taskDriven = true;
      if (this.currentState !== STATES.ERROR) {
        this.setState(STATES.ERROR);
      }
    } else if (activeTasks.length >= 4) {
      // 4+ 活跃任务 → 高负荷 thinking 动画
      this.taskDriven = true;
      if (this.currentState !== STATES.THINKING) {
        this.setState(STATES.THINKING);
      }
    } else if (activeTasks.length > 0) {
      // 1-3 个活跃任务 → working 动画
      this.taskDriven = true;
      if (this.currentState !== STATES.WORKING) {
        this.setState(STATES.WORKING);
      }
    } else if (allDone) {
      // 全部完成 → success 动画
      this.taskDriven = true;
      if (this.currentState !== STATES.SUCCESS) {
        this.setState(STATES.SUCCESS);
      }
    } else if (tasks.length === 0) {
      // 无任务 → 交回给 auto-switch，重置 idle 计时器
      this.taskDriven = false;
      this.idleDuration = 0;
    }
  }

  requestSkin(skinName) {
    window.electronAPI.setSkin(skinName);
  }
}

// Task list renderer - unified view for tasks AND sessions
class TaskList {
  constructor() {
    this.panel = document.getElementById('task-panel');
    this.tasks = [];
    this.sessions = [];
  }

  setTasks(tasks) {
    this.tasks = tasks || [];
    this.render();
  }

  setSessions(sessions) {
    this.sessions = sessions || [];
    this.render();
  }

  render() {
    // Combine tasks and sessions
    const allItems = [
      ...this.tasks.map(t => ({ ...t, itemType: 'task' })),
      ...this.sessions.map(s => ({ ...s, itemType: 'session' }))
    ];

    this.panel.classList.add('visible');
    this.panel.innerHTML = '';

    for (const item of allItems) {
      const div = document.createElement('div');
      // Use status for display, state is only for pet animation
      const itemStatus = item.status || 'running';
      div.className = `task-item ${itemStatus}`;
      div.dataset.type = item.itemType;  // 'task' or 'session'
      div.dataset.id = item.id;
      div.dataset.cwd = item.cwd || '';

      const indicator = document.createElement('div');
      indicator.className = 'task-indicator';

      const content = document.createElement('div');
      content.className = 'task-content';

      const header = document.createElement('div');
      header.className = 'task-header';

      const project = document.createElement('span');
      project.className = 'task-project';
      project.textContent = this.extractProjectName(item.cwd);

      header.appendChild(project);

      // Badge for type (A/M) or status
      if (item.itemType === 'session') {
        // Sessions show type badge (Auto/Manual)
        const typeBadge = document.createElement('span');
        typeBadge.className = 'task-badge';
        typeBadge.textContent = item.type === 'auto' ? 'A' : 'M';
        typeBadge.title = item.type === 'auto' ? 'Auto Task' : 'Manual Session';
        header.appendChild(typeBadge);
      }

      content.appendChild(header);

      // Summary line
      if (item.lastToolSummary) {
        const summary = document.createElement('div');
        summary.className = 'task-summary';
        if (item.status === 'completed') {
          summary.textContent = '✓ ' + item.lastToolSummary;
        } else {
          summary.textContent = item.lastToolSummary;
        }
        content.appendChild(summary);
      }

      div.appendChild(content);

      // Single click handler - distinguish by type
      div.addEventListener('click', () => {
        console.log('[Renderer] Click on item:', item.itemType, item.id);
        if (item.itemType === 'task') {
          window.electronAPI.openProject(item.cwd);
        } else {
          // session - open terminal window
          window.electronAPI.openTerminalClient(item.id);
        }
      });

      // Close button for all items
      const closeBtn = document.createElement('button');
      closeBtn.className = 'kill-btn';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.itemType === 'session') {
          window.electronAPI.claudeKill(item.id);
        } else {
          window.electronAPI.dismissTask(item.id);
        }
      });
      div.appendChild(closeBtn);

      this.panel.appendChild(div);
    }

    // Add button at bottom
    const addRow = document.createElement('div');
    addRow.className = 'add-row';

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+';

    addBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cwd = await window.electronAPI.selectWorkingDirectory();
      if (cwd) {
        await window.electronAPI.claudeSpawn(cwd);
      }
    });

    addRow.appendChild(addBtn);
    this.panel.appendChild(addRow);
  }

  extractProjectName(cwd) {
    if (!cwd) return 'unknown';
    // Extract last folder name from path, handle both / and \
    const parts = cwd.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'unknown';
  }
}

// Initialize pet when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const pet = new Pet();
  const taskList = new TaskList();

  // Listen for task updates from main process
  window.electronAPI.onTasksUpdate((tasks) => {
    taskList.setTasks(tasks);
    pet.updateTasks(tasks);
  });

  // Listen for sessions updates from main process
  window.electronAPI.onSessionsUpdate((sessions) => {
    taskList.setSessions(sessions);
  });

  // Listen for skin config from main process
  window.electronAPI.onSkinConfig((config) => {
    console.log('[Pet] Received skin config:', config.name, config.displayName);
    pet.applySkinConfig(config);
  });
});
