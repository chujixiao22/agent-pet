/**
 * SkinEditor App - Main application logic
 */
import { AnimationPreview } from './preview.js';
import { FrameEditor } from './editor.js';
import { SkinExporter } from './exporter.js';

class SkinEditorApp {
  constructor() {
    // Core components
    this.preview = null;
    this.frameEditor = null;
    this.exporter = new SkinExporter();

    // App state
    this.skinData = {
      info: {
        name: 'untitled',
        displayName: '',
        author: '',
        version: '1.0.0'
      },
      states: {
        idle: { frames: [], fps: 10, loop: true },
        idle_long: { frames: [], fps: 4, loop: true },
        working: { frames: [], fps: 10, loop: true },
        thinking: { frames: [], fps: 8, loop: true },
        success: { frames: [], fps: 12, loop: false },
        error: { frames: [], fps: 8, loop: false }
      }
    };

    this.currentState = 'idle';
    this.isDirty = false;

    // DOM elements
    this.elements = {};

    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    this.cacheElements();
    this.initComponents();
    this.bindEvents();
    this.updateUI();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      // Buttons
      btnLoadSkin: document.getElementById('btn-load-skin'),
      btnNewSkin: document.getElementById('btn-new-skin'),
      btnExport: document.getElementById('btn-export'),
      btnPlay: document.getElementById('btn-play'),
      btnPause: document.getElementById('btn-pause'),
      btnStop: document.getElementById('btn-stop'),
      btnPrevFrame: document.getElementById('btn-prev-frame'),
      btnNextFrame: document.getElementById('btn-next-frame'),
      btnAddFrame: document.getElementById('btn-add-frame'),
      btnDeleteFrame: document.getElementById('btn-delete-frame'),
      btnReplaceFrame: document.getElementById('btn-replace-frame'),

      // Inputs
      skinName: document.getElementById('skin-name'),
      skinDisplayName: document.getElementById('skin-display-name'),
      skinAuthor: document.getElementById('skin-author'),
      skinVersion: document.getElementById('skin-version'),
      fpsInput: document.getElementById('fps-input'),
      loopCheckbox: document.getElementById('loop-checkbox'),

      // Canvas
      previewCanvas: document.getElementById('preview-canvas'),
      previewEmpty: document.getElementById('preview-empty'),

      // Frame strip
      frameStrip: document.getElementById('frame-strip'),

      // State list
      stateList: document.getElementById('state-list'),

      // Frame indicators
      currentFrame: document.getElementById('current-frame'),
      totalFrames: document.getElementById('total-frames'),

      // Status
      statusMessage: document.getElementById('status-message'),
      statusSkinName: document.getElementById('status-skin-name'),

      // File inputs
      fileInputSvg: document.getElementById('file-input-svg'),
      fileInputZip: document.getElementById('file-input-zip')
    };
  }

  /**
   * Initialize components
   */
  initComponents() {
    this.preview = new AnimationPreview(this.elements.previewCanvas);
    this.frameEditor = new FrameEditor(this.elements.frameStrip);

    // Set up callbacks
    this.frameEditor.setOnChange(() => this.onFramesChange());
    this.preview.setOnFrameChange((current, total) => this.onFrameChange(current, total));
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Header buttons
    this.elements.btnLoadSkin.addEventListener('click', () => this.loadSkin());
    this.elements.btnNewSkin.addEventListener('click', () => this.newSkin());
    this.elements.btnExport.addEventListener('click', () => this.exportSkin());

    // Playback controls
    this.elements.btnPlay.addEventListener('click', () => this.play());
    this.elements.btnPause.addEventListener('click', () => this.pause());
    this.elements.btnStop.addEventListener('click', () => this.stop());
    this.elements.btnPrevFrame.addEventListener('click', () => this.prevFrame());
    this.elements.btnNextFrame.addEventListener('click', () => this.nextFrame());

    // Frame operations
    this.elements.btnAddFrame.addEventListener('click', () => this.addFrame());
    this.elements.btnDeleteFrame.addEventListener('click', () => this.deleteFrame());
    this.elements.btnReplaceFrame.addEventListener('click', () => this.replaceFrame());

    // FPS and loop controls
    this.elements.fpsInput.addEventListener('change', () => this.onFpsChange());
    this.elements.loopCheckbox.addEventListener('change', () => this.onLoopChange());

    // Skin info inputs
    this.elements.skinName.addEventListener('change', () => this.onSkinInfoChange());
    this.elements.skinDisplayName.addEventListener('change', () => this.onSkinInfoChange());
    this.elements.skinAuthor.addEventListener('change', () => this.onSkinInfoChange());
    this.elements.skinVersion.addEventListener('change', () => this.onSkinInfoChange());

    // State list
    this.elements.stateList.addEventListener('click', (e) => {
      const stateItem = e.target.closest('.state-item');
      if (stateItem) {
        const state = stateItem.dataset.state;
        this.selectState(state);
      }
    });

    // File inputs
    this.elements.fileInputSvg.addEventListener('change', (e) => this.onSvgFileSelect(e));

    // Export button state
    this.updateExportButton();
  }

  /**
   * Load skin from zip file
   */
  async loadSkin() {
    try {
      const result = await window.electronAPI.openFileDialog({
        filters: [{ name: 'Skin Packages', extensions: ['zip'] }]
      });

      if (result.canceled || !result.filePaths[0]) return;

      this.setStatus('Loading skin...');
      const loadResult = await window.electronAPI.loadSkin(result.filePaths[0]);

      if (loadResult.success) {
        this.skinData = this.convertLoadedData(loadResult.data);
        this.updateUI();
        this.selectState('idle');
        this.setStatus('Skin loaded successfully');
        this.setStatusSkinName(this.skinData.info.name);
        this.isDirty = false;
      } else {
        this.setStatus('Failed to load skin: ' + loadResult.error);
      }
    } catch (error) {
      this.setStatus('Error loading skin: ' + error.message);
    }
  }

  /**
   * Convert loaded data to app format
   */
  convertLoadedData(data) {
    const skinData = {
      info: {
        name: data.name || 'untitled',
        displayName: data.manifest?.displayName || data.name || '',
        author: data.manifest?.author || '',
        version: data.manifest?.version || '1.0.0'
      },
      states: {}
    };

    const stateNames = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];

    for (const stateName of stateNames) {
      const stateManifest = data.manifest?.states?.[stateName] || {};
      const frames = data.states?.[stateName] || [];

      skinData.states[stateName] = {
        frames: frames,
        fps: stateManifest.fps || 10,
        loop: stateManifest.loop !== undefined ? stateManifest.loop : true
      };
    }

    return skinData;
  }

  /**
   * Create new skin
   */
  newSkin() {
    this.skinData = {
      info: {
        name: 'untitled',
        displayName: '',
        author: '',
        version: '1.0.0'
      },
      states: {
        idle: { frames: [], fps: 10, loop: true },
        idle_long: { frames: [], fps: 4, loop: true },
        working: { frames: [], fps: 10, loop: true },
        thinking: { frames: [], fps: 8, loop: true },
        success: { frames: [], fps: 12, loop: false },
        error: { frames: [], fps: 8, loop: false }
      }
    };

    this.updateUI();
    this.selectState('idle');
    this.setStatus('New skin created');
    this.setStatusSkinName('untitled');
    this.isDirty = false;
  }

  /**
   * Export skin as zip
   */
  async exportSkin() {
    try {
      const validation = this.exporter.setSkinData(this.skinData).validate();

      if (!validation.valid) {
        this.setStatus('Validation failed: ' + validation.errors.join(', '));
        return;
      }

      const result = await window.electronAPI.saveFileDialog({
        filters: [{ name: 'Skin Package', extensions: ['zip'] }],
        defaultPath: `${this.skinData.info.name}.zip`
      });

      if (result.canceled || !result.filePath) return;

      this.setStatus('Exporting...');
      this.exporter.setSkinData(this.skinData);
      const exportResult = await this.exporter.exportZip(result.filePath);

      if (exportResult.success) {
        this.setStatus('Skin exported successfully');
        this.isDirty = false;
      } else {
        this.setStatus('Export failed: ' + exportResult.error);
      }
    } catch (error) {
      this.setStatus('Error exporting: ' + error.message);
    }
  }

  /**
   * Select a state
   */
  selectState(state) {
    this.currentState = state;

    // Update state list UI
    const stateItems = this.elements.stateList.querySelectorAll('.state-item');
    stateItems.forEach(item => {
      item.classList.toggle('active', item.dataset.state === state);
    });

    // Load frames for this state
    const stateData = this.skinData.states[state];
    this.frameEditor.loadFrames(stateData.frames);
    this.preview.loadFrames(stateData.frames);
    this.preview.setFPS(stateData.fps);
    this.preview.setLoop(stateData.loop);

    // Update controls
    this.elements.fpsInput.value = stateData.fps;
    this.elements.loopCheckbox.checked = stateData.loop;

    // Update state frame counts
    this.updateStateFrameCounts();

    // Update button states
    this.updatePlaybackButtons();
  }

  /**
   * Play animation
   */
  play() {
    this.preview.play();
    this.elements.btnPlay.style.display = 'none';
    this.elements.btnPause.style.display = 'flex';
  }

  /**
   * Pause animation
   */
  pause() {
    this.preview.pause();
    this.elements.btnPlay.style.display = 'flex';
    this.elements.btnPause.style.display = 'none';
  }

  /**
   * Stop animation
   */
  stop() {
    this.preview.stop();
    this.elements.btnPlay.style.display = 'flex';
    this.elements.btnPause.style.display = 'none';
  }

  /**
   * Previous frame
   */
  prevFrame() {
    this.preview.prevFrame();
  }

  /**
   * Next frame
   */
  nextFrame() {
    this.preview.nextFrame();
  }

  /**
   * Add new frame
   */
  addFrame() {
    this.elements.fileInputSvg.accept = '.svg';
    this.elements.fileInputSvg.dataset.mode = 'add';
    this.elements.fileInputSvg.click();
  }

  /**
   * Delete current frame
   */
  deleteFrame() {
    const selectedIndex = this.frameEditor.getSelectedIndex();
    if (selectedIndex < 0) return;

    this.skinData.states[this.currentState].frames.splice(selectedIndex, 1);
    this.frameEditor.loadFrames(this.skinData.states[this.currentState].frames);
    this.preview.loadFrames(this.skinData.states[this.currentState].frames);
    this.isDirty = true;
    this.updateExportButton();
    this.updateStateFrameCounts();
  }

  /**
   * Replace current frame
   */
  replaceFrame() {
    const selectedIndex = this.frameEditor.getSelectedIndex();
    if (selectedIndex < 0) return;

    this.elements.fileInputSvg.accept = '.svg';
    this.elements.fileInputSvg.dataset.mode = 'replace';
    this.elements.fileInputSvg.dataset.index = selectedIndex;
    this.elements.fileInputSvg.click();
  }

  /**
   * Handle SVG file selection
   */
  async onSvgFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const mode = event.target.dataset.mode;
    const index = parseInt(event.target.dataset.index || '-1', 10);

    try {
      const content = await file.text();
      const frameData = { name: file.name, content };

      if (mode === 'add') {
        this.skinData.states[this.currentState].frames.push(frameData);
      } else if (mode === 'replace' && index >= 0) {
        this.skinData.states[this.currentState].frames[index] = frameData;
      }

      this.frameEditor.loadFrames(this.skinData.states[this.currentState].frames);
      this.preview.loadFrames(this.skinData.states[this.currentState].frames);
      this.isDirty = true;
      this.updateExportButton();
      this.updateStateFrameCounts();
    } catch (error) {
      this.setStatus('Error reading file: ' + error.message);
    }

    // Reset file input
    event.target.value = '';
  }

  /**
   * Handle FPS change
   */
  onFpsChange() {
    const fps = parseInt(this.elements.fpsInput.value, 10) || 10;
    this.skinData.states[this.currentState].fps = fps;
    this.preview.setFPS(fps);
    this.isDirty = true;
  }

  /**
   * Handle loop change
   */
  onLoopChange() {
    const loop = this.elements.loopCheckbox.checked;
    this.skinData.states[this.currentState].loop = loop;
    this.preview.setLoop(loop);
    this.isDirty = true;
  }

  /**
   * Handle skin info change
   */
  onSkinInfoChange() {
    this.skinData.info.name = this.elements.skinName.value || 'untitled';
    this.skinData.info.displayName = this.elements.skinDisplayName.value;
    this.skinData.info.author = this.elements.skinAuthor.value;
    this.skinData.info.version = this.elements.skinVersion.value || '1.0.0';
    this.setStatusSkinName(this.skinData.info.name);
    this.isDirty = true;
    this.updateExportButton();
  }

  /**
   * Handle frames change
   */
  onFramesChange() {
    const frames = this.frameEditor.getFrames();
    this.skinData.states[this.currentState].frames = frames;
    this.preview.loadFrames(frames);
    this.isDirty = true;
    this.updateExportButton();
    this.updateStateFrameCounts();
  }

  /**
   * Handle frame change from preview
   */
  onFrameChange(current, total) {
    this.elements.currentFrame.textContent = current + 1;
    this.elements.totalFrames.textContent = total;
  }

  /**
   * Update UI from skin data
   */
  updateUI() {
    // Update skin info
    this.elements.skinName.value = this.skinData.info.name;
    this.elements.skinDisplayName.value = this.skinData.info.displayName;
    this.elements.skinAuthor.value = this.skinData.info.author;
    this.elements.skinVersion.value = this.skinData.info.version;

    // Update state frame counts
    this.updateStateFrameCounts();

    // Update export button
    this.updateExportButton();
  }

  /**
   * Update state frame counts in state list
   */
  updateStateFrameCounts() {
    const stateItems = this.elements.stateList.querySelectorAll('.state-item');
    stateItems.forEach(item => {
      const state = item.dataset.state;
      const count = this.skinData.states[state]?.frames?.length || 0;
      const countSpan = item.querySelector('.state-frame-count');
      if (countSpan) {
        countSpan.textContent = `${count} frame${count !== 1 ? 's' : ''}`;
      }
    });
  }

  /**
   * Update playback button states
   */
  updatePlaybackButtons() {
    const hasFrames = this.skinData.states[this.currentState]?.frames?.length > 0;
    const hasMultipleFrames = (this.skinData.states[this.currentState]?.frames?.length || 0) > 1;

    this.elements.btnPlay.disabled = !hasMultipleFrames;
    this.elements.btnPause.disabled = !hasMultipleFrames;
    this.elements.btnStop.disabled = !hasFrames;
    this.elements.btnPrevFrame.disabled = !hasFrames;
    this.elements.btnNextFrame.disabled = !hasFrames;
    this.elements.btnAddFrame.disabled = false;
    this.elements.btnDeleteFrame.disabled = !hasFrames;
    this.elements.btnReplaceFrame.disabled = !hasFrames;
  }

  /**
   * Update export button state
   */
  updateExportButton() {
    const hasContent = Object.values(this.skinData.states).some(
      state => state.frames && state.frames.length > 0
    );
    this.elements.btnExport.disabled = !hasContent;
  }

  /**
   * Set status message
   */
  setStatus(message) {
    this.elements.statusMessage.textContent = message;
  }

  /**
   * Set skin name in status bar
   */
  setStatusSkinName(name) {
    this.elements.statusSkinName.textContent = name || 'No skin loaded';
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.skinEditorApp = new SkinEditorApp();
});