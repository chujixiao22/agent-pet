/**
 * SkinExporter - Handles skin data export to zip file
 */
export class SkinExporter {
  constructor() {
    this.skinData = null;
  }

  /**
   * Set skin data to export
   * @param {Object} skinData - Skin data object
   */
  setSkinData(skinData) {
    this.skinData = skinData;
  }

  /**
   * Generate manifest.json content
   * @returns {Object} Manifest object
   */
  generateManifest() {
    if (!this.skinData) return null;

    const { info, states } = this.skinData;

    const manifest = {
      name: info?.name || 'untitled',
      displayName: info?.displayName || info?.name || 'Untitled',
      author: info?.author || '',
      version: info?.version || '1.0.0',
      states: {}
    };

    const stateNames = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];

    for (const stateName of stateNames) {
      const stateData = states[stateName] || { frames: [], fps: 10, loop: true };
      manifest.states[stateName] = {
        fps: stateData.fps || 10,
        frames: stateData.frames?.length || 0,
        loop: stateData.loop !== undefined ? stateData.loop : true
      };
    }

    return manifest;
  }

  /**
   * Generate animation_manifest.json content
   * @returns {Object} Animation manifest object
   */
  generateAnimationManifest() {
    if (!this.skinData) return null;

    const { states } = this.skinData;
    const stateNames = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];

    let totalFrames = 0;
    const manifestStates = {};

    for (const stateName of stateNames) {
      const stateData = states[stateName] || { frames: [], fps: 10 };
      const frameCount = stateData.frames?.length || 0;
      totalFrames += frameCount;

      const duration = frameCount > 0 ? Math.round(1000 / (stateData.fps || 10)) : 0;

      const frames = stateData.frames.map((frame, i) => ({
        path: `${stateName}/frame_${String(i + 1).padStart(3, '0')}.svg`,
        width: 200,
        height: 200
      }));

      manifestStates[stateName] = {
        frameCount,
        duration,
        frames
      };
    }

    return {
      version: '2.0.0',
      totalFrames,
      states: manifestStates
    };
  }

  /**
   * Get complete export data
   * @returns {Object} Complete skin data with manifests
   */
  getExportData() {
    const manifest = this.generateManifest();
    const animationManifest = this.generateAnimationManifest();

    const states = {};
    const stateNames = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];

    for (const stateName of stateNames) {
      const stateData = this.skinData?.states?.[stateName] || { frames: [] };
      states[stateName] = stateData.frames || [];
    }

    return {
      name: manifest.name,
      manifest,
      animationManifest,
      states
    };
  }

  /**
   * Export skin as zip file
   * @param {string} outputPath - Output file path
   * @returns {Promise} Result
   */
  async exportZip(outputPath) {
    const exportData = this.getExportData();

    const result = await window.electronAPI.exportSkin(exportData, outputPath);
    return result;
  }

  /**
   * Validate skin data
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.skinData) {
      errors.push('No skin data set');
      return { valid: false, errors };
    }

    if (!this.skinData.info?.name) {
      errors.push('Skin name is required');
    }

    const stateNames = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];
    let hasFrames = false;

    for (const stateName of stateNames) {
      const stateData = this.skinData.states?.[stateName];
      if (stateData?.frames?.length > 0) {
        hasFrames = true;
        // Validate each frame has content
        for (const frame of stateData.frames) {
          if (!frame.content) {
            errors.push(`${stateName}: Frame missing content`);
          }
        }
      }
    }

    if (!hasFrames) {
      errors.push('At least one state must have frames');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}