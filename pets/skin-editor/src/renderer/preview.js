/**
 * AnimationPreview - Handles animation preview rendering on canvas
 */
export class AnimationPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.frames = [];
    this.currentFrameIndex = 0;
    this.fps = 10;
    this.isPlaying = false;
    this.isLooping = true;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.onFrameChange = null;
  }

  /**
   * Load frames from frame data
   * @param {Array} frames - Array of frame objects with content (SVG string)
   */
  loadFrames(frames) {
    this.frames = frames;
    this.currentFrameIndex = 0;
    this.updateFrameDisplay();

    if (frames.length > 0) {
      this.renderFrame(0);
    } else {
      this.clear();
    }
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render a specific frame
   * @param {number} index - Frame index
   */
  renderFrame(index) {
    if (index < 0 || index >= this.frames.length) return;

    const frame = this.frames[index];
    this.clear();

    // Create image from SVG content
    const img = new Image();
    const svgBlob = new Blob([frame.content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, 200, 200);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /**
   * Play the animation
   */
  play() {
    if (this.frames.length <= 1) return;
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  /**
   * Pause the animation
   */
  pause() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Stop the animation and reset to first frame
   */
  stop() {
    this.pause();
    this.currentFrameIndex = 0;
    this.renderFrame(0);
    this.updateFrameDisplay();
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    const frameInterval = 1000 / this.fps;

    if (elapsed >= frameInterval) {
      this.lastFrameTime = now - (elapsed % frameInterval);

      this.currentFrameIndex++;
      if (this.currentFrameIndex >= this.frames.length) {
        if (this.isLooping) {
          this.currentFrameIndex = 0;
        } else {
          this.stop();
          return;
        }
      }

      this.renderFrame(this.currentFrameIndex);
      this.updateFrameDisplay();
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Go to next frame
   */
  nextFrame() {
    if (this.frames.length === 0) return;

    this.pause();
    this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
    this.renderFrame(this.currentFrameIndex);
    this.updateFrameDisplay();
  }

  /**
   * Go to previous frame
   */
  prevFrame() {
    if (this.frames.length === 0) return;

    this.pause();
    this.currentFrameIndex = (this.currentFrameIndex - 1 + this.frames.length) % this.frames.length;
    this.renderFrame(this.currentFrameIndex);
    this.updateFrameDisplay();
  }

  /**
   * Go to specific frame
   * @param {number} index - Frame index
   */
  goToFrame(index) {
    if (index < 0 || index >= this.frames.length) return;

    this.pause();
    this.currentFrameIndex = index;
    this.renderFrame(index);
    this.updateFrameDisplay();
  }

  /**
   * Set FPS
   * @param {number} fps - Frames per second
   */
  setFPS(fps) {
    this.fps = Math.max(1, Math.min(60, fps));
  }

  /**
   * Set loop
   * @param {boolean} loop - Whether to loop
   */
  setLoop(loop) {
    this.isLooping = loop;
  }

  /**
   * Update frame display
   */
  updateFrameDisplay() {
    if (this.onFrameChange) {
      this.onFrameChange(this.currentFrameIndex, this.frames.length);
    }
  }

  /**
   * Set frame change callback
   * @param {Function} callback - (currentIndex, totalFrames) => void
   */
  setOnFrameChange(callback) {
    this.onFrameChange = callback;
  }
}