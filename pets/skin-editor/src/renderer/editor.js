/**
 * FrameEditor - Handles frame list management, drag-drop reordering, and frame operations
 */
export class FrameEditor {
  constructor(container) {
    this.container = container;
    this.frames = [];
    this.selectedIndex = -1;
    this.onChange = null;
    this.draggedIndex = -1;

    this.init();
  }

  /**
   * Initialize the editor
   */
  init() {
    this.container.innerHTML = '';
    this.render();
  }

  /**
   * Load frames into the editor
   * @param {Array} frames - Array of frame objects
   */
  loadFrames(frames) {
    this.frames = frames.map((f, i) => ({
      ...f,
      index: i
    }));
    this.selectedIndex = frames.length > 0 ? 0 : -1;
    this.render();
    this.notifyChange();
  }

  /**
   * Get current frames
   * @returns {Array} Current frames
   */
  getFrames() {
    return this.frames;
  }

  /**
   * Add a new frame
   * @param {Object} frameData - Frame data { name, content }
   */
  addFrame(frameData) {
    const frameName = `frame_${String(this.frames.length + 1).padStart(3, '0')}.svg`;
    const newFrame = {
      name: frameName,
      content: frameData.content,
      index: this.frames.length
    };
    this.frames.push(newFrame);
    this.selectedIndex = this.frames.length - 1;
    this.render();
    this.notifyChange();
  }

  /**
   * Remove a frame at index
   * @param {number} index - Frame index
   */
  removeFrame(index) {
    if (index < 0 || index >= this.frames.length) return;

    this.frames.splice(index, 1);
    this.reindexFrames();

    if (this.selectedIndex >= this.frames.length) {
      this.selectedIndex = this.frames.length - 1;
    }
    if (this.selectedIndex < 0 && this.frames.length > 0) {
      this.selectedIndex = 0;
    }

    this.render();
    this.notifyChange();
  }

  /**
   * Replace frame at index
   * @param {number} index - Frame index
   * @param {Object} frameData - New frame data { name, content }
   */
  replaceFrame(index, frameData) {
    if (index < 0 || index >= this.frames.length) return;

    this.frames[index].content = frameData.content;
    this.render();
    this.notifyChange();
  }

  /**
   * Reorder frames from one index to another
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   */
  reorderFrames(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= this.frames.length) return;
    if (toIndex < 0 || toIndex >= this.frames.length) return;

    const [frame] = this.frames.splice(fromIndex, 1);
    this.frames.splice(toIndex, 0, frame);
    this.reindexFrames();

    if (this.selectedIndex === fromIndex) {
      this.selectedIndex = toIndex;
    } else if (fromIndex < this.selectedIndex && toIndex >= this.selectedIndex) {
      this.selectedIndex--;
    } else if (fromIndex > this.selectedIndex && toIndex <= this.selectedIndex) {
      this.selectedIndex++;
    }

    this.render();
    this.notifyChange();
  }

  /**
   * Reindex frames with sequential numbering
   */
  reindexFrames() {
    this.frames.forEach((frame, i) => {
      frame.index = i;
      frame.name = `frame_${String(i + 1).padStart(3, '0')}.svg`;
    });
  }

  /**
   * Select a frame
   * @param {number} index - Frame index
   */
  selectFrame(index) {
    if (index < 0 || index >= this.frames.length) return;
    this.selectedIndex = index;
    this.render();
  }

  /**
   * Get selected frame index
   * @returns {number} Selected index
   */
  getSelectedIndex() {
    return this.selectedIndex;
  }

  /**
   * Render the frame strip
   */
  render() {
    if (this.frames.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
          </svg>
          <span>No frames</span>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.frames.map((frame, i) => `
      <div class="frame-thumbnail ${i === this.selectedIndex ? 'active' : ''}"
           data-index="${i}"
           draggable="true">
        <span class="frame-number">${i + 1}</span>
      </div>
    `).join('');

    this.attachEventListeners();
  }

  /**
   * Attach event listeners to frame thumbnails
   */
  attachEventListeners() {
    const thumbnails = this.container.querySelectorAll('.frame-thumbnail');

    thumbnails.forEach(thumb => {
      // Click to select
      thumb.addEventListener('click', (e) => {
        const index = parseInt(thumb.dataset.index, 10);
        this.selectFrame(index);
      });

      // Drag start
      thumb.addEventListener('dragstart', (e) => {
        this.draggedIndex = parseInt(thumb.dataset.index, 10);
        thumb.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      // Drag end
      thumb.addEventListener('dragend', (e) => {
        thumb.classList.remove('dragging');
        this.draggedIndex = -1;
      });

      // Drag over
      thumb.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      // Drop
      thumb.addEventListener('drop', (e) => {
        e.preventDefault();
        const toIndex = parseInt(thumb.dataset.index, 10);
        if (this.draggedIndex !== -1 && this.draggedIndex !== toIndex) {
          this.reorderFrames(this.draggedIndex, toIndex);
        }
      });
    });
  }

  /**
   * Set change callback
   * @param {Function} callback - () => void
   */
  setOnChange(callback) {
    this.onChange = callback;
  }

  /**
   * Notify about changes
   */
  notifyChange() {
    if (this.onChange) {
      this.onChange();
    }
  }
}