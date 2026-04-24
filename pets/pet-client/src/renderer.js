// Pet Renderer - Canvas-based animation for desktop pet
// Supports both Canvas drawing and sprite sheet animation

(function() {
  'use strict';

  // ============================================
  // PET CLASS - Draws and animates the fox-cat
  // ============================================
  class Pet {
    constructor(ctx) {
      this.ctx = ctx;
      this.x = 90;  // Center X (canvas coordinates)
      this.y = 90;  // Center Y
      this.scale = 0.85;  // Scale factor

      // Animation parameters
      this.frameCount = 0;
      this.lastTime = 0;
      this.currentAnimation = 'idle';

      // Sprite animation parameters
      this.useSprites = false;
      this.spriteImages = {};
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.animationManifest = null;

      // State-specific animation variables
      this.blinkTimer = 0;
      this.isBlinking = false;
      this.breathOffset = 0;
      this.bounceY = 0;
      this.particleEffects = [];
      this.questionMarks = [];
      this.tearDrops = [];
      this.snoreBubble = null;

      // Sleep state
      this.sleepTimer = 0;
      this.isSnoring = false;

      // Working state
      this.keyboardTimer = 0;

      // Colors for the fox-cat
      this.colors = {
        body: '#FF8C42',      // Orange fur
        bodyDark: '#E67E22',  // Dark orange
        belly: '#FFE4B5',     // Cream belly
        ear: '#FF8C42',       // Orange ears
        earInner: '#FF69B4',  // Pink inner ears
        eye: '#2C3E50',      // Dark eyes
        eyeHighlight: '#FFFFFF',
        nose: '#FF6B6B',      // Pink nose
        cheek: '#FFB6C1',     // Pink cheeks
        mouth: '#C0392B',     // Dark mouth
        whisker: '#34495E',   // Dark whiskers
        claw: '#8B6F47',      // Brown claws
      };

      // Load animation manifest and sprites
      this.loadAnimationAssets();
    }

    loadAnimationAssets() {
      // Try to load animation manifest
      fetch('../sprites/animation_manifest.json')
        .then(response => response.json())
        .then(manifest => {
          this.animationManifest = manifest;
          this.useSprites = true;
          console.log('Loaded sprite animation manifest');
          this.loadSpriteImages(manifest);
        })
        .catch(error => {
          console.log('No sprite manifest found, using canvas drawing:', error);
          this.useSprites = false;
        });
    }

    loadSpriteImages(manifest) {
      const states = Object.keys(manifest.states);

      states.forEach(state => {
        this.spriteImages[state] = [];
        const frames = manifest.states[state].frames;

        frames.forEach((frameInfo, index) => {
          const img = new Image();
          img.src = `../sprites/${state}/${frameInfo.path}`;
          this.spriteImages[state].push(img);
        });
      });
    }

    // Draw the complete pet
    draw(state, deltaTime) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, 180, 180);

      // Update animations based on state
      this.updateAnimation(state, deltaTime);

      // Draw based on animation mode
      if (this.useSprites && this.spriteImages[state] && this.spriteImages[state].length > 0) {
        this.drawSpriteAnimation(state);
      } else {
        // Fallback to canvas drawing
        this.drawCanvasAnimation(state);
      }

      // Draw effects on top
      this.drawEffects(state);
    }

    drawSpriteAnimation(state) {
      const ctx = this.ctx;
      const frames = this.spriteImages[state];

      if (!frames || frames.length === 0) return;

      // Get frame duration from manifest or use default
      const frameDuration = this.animationManifest?.states[state]?.duration || 200; // 200ms per frame
      const frameIndex = Math.floor(this.frameTimer / frameDuration) % frames.length;
      const currentFrame = frames[frameIndex];

      // Draw the sprite frame
      if (currentFrame && currentFrame.complete) {
        ctx.drawImage(currentFrame, 0, 0, 180, 180);
      }
    }

    drawCanvasAnimation(state) {
      const ctx = this.ctx;

      // Draw based on state
      switch(state) {
        case 'idle':
          this.drawIdle();
          break;
        case 'idle_long':
          this.drawIdleLong();
          break;
        case 'working':
          this.drawWorking();
          break;
        case 'thinking':
          this.drawThinking();
          break;
        case 'success':
          this.drawSuccess();
          break;
        case 'error':
          this.drawError();
          break;
        default:
          this.drawIdle();
      }
    }

    updateAnimation(state, deltaTime) {
      this.frameCount += deltaTime;
      this.frameTimer += deltaTime;

      if (this.useSprites && this.animationManifest?.states[state]) {
        // Sprite animation timing
        const frameDuration = this.animationManifest.states[state].duration;
        if (this.frameTimer >= frameDuration) {
          this.frameTimer = 0;
          // Frame update will be handled in drawSpriteAnimation
        }
      } else {
        // Canvas animation timing
        if (state === 'idle_long') {
          this.sleepTimer += deltaTime;
          if (this.sleepTimer > 3000) {
            this.isSnoring = !this.isSnoring;
            this.sleepTimer = 0;
            if (this.isSnoring) {
              this.snoreBubble = { x: 25, y: -35, opacity: 1 };
            }
          }
          this.breathOffset = Math.sin(Date.now() * 0.001) * 1.5;
        } else if (state === 'idle') {
          this.breathOffset = Math.sin(Date.now() * 0.003) * 1;
          this.blinkTimer += deltaTime;
          if (this.blinkTimer > 3000 + Math.random() * 2000) {
            this.isBlinking = true;
            setTimeout(() => { this.isBlinking = false; }, 120);
            this.blinkTimer = 0;
          }
        } else if (state === 'success') {
          this.bounceY = Math.abs(Math.sin(Date.now() * 0.008)) * 10;
        } else if (state === 'working') {
          this.keyboardTimer += deltaTime;
        }
      }
    }

    drawIdle() {
      const ctx = this.ctx;
      const breath = this.breathOffset;
      const earWiggle = Math.sin(Date.now() * 0.002) * 2;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, 42 - breath/2, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(0, breath, 52, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body shadow
      ctx.fillStyle = this.colors.bodyDark;
      ctx.beginPath();
      ctx.ellipse(0, 8 + breath, 44, 32, 0, 0, Math.PI);
      ctx.fill();

      // Belly
      ctx.fillStyle = this.colors.belly;
      ctx.beginPath();
      ctx.ellipse(0, 12 + breath, 34, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      this.drawEar(-34, -34 + earWiggle, -1);
      this.drawEar(34, -34 - earWiggle, 1);

      // Face
      this.drawFace(false);
    }

    drawIdleLong() {
      const ctx = this.ctx;
      const breath = this.breathOffset;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(0, 42, 40, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curled body
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(0, 5 + breath, 48, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      // Belly
      ctx.fillStyle = this.colors.belly;
      ctx.beginPath();
      ctx.ellipse(8, 15 + breath, 26, 22, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Droopy ears
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(-30, -25, 12, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(30, -25, 12, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Inner ears
      ctx.fillStyle = this.colors.earInner;
      ctx.beginPath();
      ctx.ellipse(-30, -24, 7, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(30, -24, 7, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Closed eyes
      ctx.strokeStyle = this.colors.eye;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-16, -3, 8, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(16, -3, 8, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Nose
      ctx.fillStyle = this.colors.nose;
      ctx.beginPath();
      ctx.ellipse(0, 10, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Little smile
      ctx.strokeStyle = this.colors.mouth;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 14, 6, 0.1, Math.PI - 0.1);
      ctx.stroke();

      // Whiskers
      this.drawWhiskers(0, 12);

      // ZZZ animation
      if (this.snoreBubble) {
        ctx.fillStyle = `rgba(100, 150, 255, ${this.snoreBubble.opacity})`;
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Z', this.snoreBubble.x + Math.sin(Date.now() * 0.003) * 2, this.snoreBubble.y);
        ctx.font = 'bold 10px Arial';
        ctx.fillText('z', this.snoreBubble.x - 10 + Math.sin(Date.now() * 0.004) * 1, this.snoreBubble.y - 8);
        ctx.font = 'bold 8px Arial';
        ctx.fillText('z', this.snoreBubble.x - 5 + Math.sin(Date.now() * 0.005) * 0.5, this.snoreBubble.y - 4);

        this.snoreBubble.opacity -= 0.002;
        if (this.snoreBubble.opacity <= 0) {
          this.snoreBubble = null;
        }
      }
    }

    drawWorking() {
      const ctx = this.ctx;
      const breath = this.breathOffset;
      const typeOffset = Math.sin(this.keyboardTimer * 0.015) * 2;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, 42 - breath/2, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(0, breath, 52, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body shadow
      ctx.fillStyle = this.colors.bodyDark;
      ctx.beginPath();
      ctx.ellipse(0, 8 + breath, 44, 32, 0, 0, Math.PI);
      ctx.fill();

      // Belly
      ctx.fillStyle = this.colors.belly;
      ctx.beginPath();
      ctx.ellipse(0, 12 + breath, 34, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      this.drawEar(-34, -34, -1);
      this.drawEar(34, -34, 1);

      // Focused face
      this.drawFaceWorking(typeOffset);

      // Paws
      this.drawPaws(typeOffset);
    }

    drawThinking() {
      const ctx = this.ctx;
      const breath = this.breathOffset;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, 42 - breath/2, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(0, breath, 52, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body shadow
      ctx.fillStyle = this.colors.bodyDark;
      ctx.beginPath();
      ctx.ellipse(0, 8 + breath, 44, 32, 0, 0, Math.PI);
      ctx.fill();

      // Belly
      ctx.fillStyle = this.colors.belly;
      ctx.beginPath();
      ctx.ellipse(0, 12 + breath, 34, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      // One ear up, one down
      this.drawEar(-34, -38, -1, 0.85);
      this.drawEar(34, -30, 1, 1.05);

      // Curious face
      this.drawFaceThinking();

      // Paw near chin
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(22, 22, 11, 9, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawSuccess() {
      const ctx = this.ctx;
      const bounceY = this.bounceY;
      const rotation = Math.sin(Date.now() * 0.01) * 0.08;

      ctx.save();
      ctx.translate(0, -bounceY);
      ctx.rotate(rotation);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, 42 + bounceY, 38 - bounceY/4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body shadow
      ctx.fillStyle = this.colors.bodyDark;
      ctx.beginPath();
      ctx.ellipse(0, 8, 44, 32, 0, 0, Math.PI);
      ctx.fill();

      // Belly
      ctx.fillStyle = this.colors.belly;
      ctx.beginPath();
      ctx.ellipse(0, 12, 34, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Happy ears
      this.drawEar(-34, -38, -1, 0.8);
      this.drawEar(34, -38, 1, 0.8);

      // Happy face
      this.drawFaceHappy();

      // Raised paws
      this.drawPawsHappy();

      ctx.restore();

      // Star particles
      if (Math.random() < 0.08) {
        this.particleEffects.push({
          type: 'star',
          x: (Math.random() - 0.5) * 70,
          y: -35 - Math.random() * 20,
          size: 4 + Math.random() * 4,
          rotation: Math.random() * Math.PI * 2,
          life: 1,
          decay: 0.025
        });
      }
    }

    drawError() {
      const ctx = this.ctx;
      const breath = this.breathOffset;

      // Sad shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, 42 - breath/2, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (slightly droopy)
      ctx.fillStyle = this.colors.body;
      ctx.beginPath();
      ctx.ellipse(0, 5 + breath, 52, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body shadow
      ctx.fillStyle = this.colors.bodyDark;
      ctx.beginPath();
      ctx.ellipse(0, 12 + breath, 44, 30, 0, 0, Math.PI);
      ctx.fill();

      // Belly
      ctx.fillStyle = this.colors.belly;
      ctx.beginPath();
      ctx.ellipse(0, 15 + breath, 34, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Droopy ears
      this.drawEar(-34, -26, -1.1, 1.05);
      this.drawEar(34, -26, 1.1, 1.05);

      // Sad face
      this.drawFaceSad();

      // Tear drops
      if (Math.random() < 0.04) {
        this.tearDrops.push({
          x: -18 - Math.random() * 8,
          y: -3,
          size: 2.5 + Math.random() * 1.5,
          speed: 0.8 + Math.random() * 0.6,
          life: 1
        });
      }
    }

    drawEffects(state) {
      const ctx = this.ctx;

      // Stars for success
      if (state === 'success') {
        this.particleEffects = this.particleEffects.filter(p => {
          if (p.type === 'star') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = `rgba(255, 215, 0, ${p.life})`;
            this.drawStar(0, 0, p.size);
            ctx.restore();

            p.y -= 0.4;
            p.rotation += 0.1;
            p.life -= p.decay;
            return p.life > 0;
          }
          return false;
        });
      }

      // Question marks for thinking
      if (state === 'thinking') {
        if (Math.random() < 0.025) {
          this.questionMarks.push({
            x: (Math.random() - 0.5) * 45,
            y: -45 - Math.random() * 15,
            size: 12 + Math.random() * 5,
            opacity: 1,
            floatSpeed: 0.4 + Math.random() * 0.4
          });
        }

        this.questionMarks = this.questionMarks.filter(q => {
          ctx.fillStyle = `rgba(100, 150, 255, ${q.opacity})`;
          ctx.font = `bold ${q.size}px Arial`;
          ctx.fillText('?', q.x, q.y);

          q.y -= q.floatSpeed;
          q.opacity -= 0.012;
          return q.opacity > 0;
        });
      }

      // Tear drops for error
      if (state === 'error') {
        this.tearDrops = this.tearDrops.filter(t => {
          ctx.fillStyle = `rgba(100, 150, 255, ${t.life * 0.6})`;
          ctx.beginPath();
          ctx.ellipse(t.x, t.y, t.size * 0.5, t.size, 0, 0, Math.PI * 2);
          ctx.fill();

          t.y += t.speed;
          t.life -= 0.025;
          return t.life > 0 && t.y < 70;
        });
      }
    }

    drawStar(cx, cy, size) {
      const ctx = this.ctx;
      const spikes = 4;
      const outerRadius = size;
      const innerRadius = size / 2;

      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    drawEar(x, y, direction, scale = 1) {
      const ctx = this.ctx;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(direction * scale, scale);

      // Outer ear
      ctx.fillStyle = this.colors.ear;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner ear
      ctx.fillStyle = this.colors.earInner;
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawFace(blinking) {
      const ctx = this.ctx;

      // Cheek blush
      ctx.fillStyle = this.colors.cheek;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(-26, 8, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(26, 8, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Eyes
      if (blinking) {
        ctx.strokeStyle = this.colors.eye;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(-16, -5, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(16, -5, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        // Big cute eyes
        ctx.fillStyle = this.colors.eye;
        ctx.beginPath();
        ctx.ellipse(-16, -5, 9, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(16, -5, 9, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = this.colors.eyeHighlight;
        ctx.beginPath();
        ctx.ellipse(-13, -8, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(19, -8, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Small highlight
        ctx.beginPath();
        ctx.ellipse(-18, -2, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(14, -2, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nose
      ctx.fillStyle = this.colors.nose;
      ctx.beginPath();
      ctx.ellipse(0, 7, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      ctx.strokeStyle = this.colors.mouth;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 14);
      ctx.quadraticCurveTo(0, 18, 6, 14);
      ctx.stroke();

      // Whiskers
      this.drawWhiskers(0, 12);
    }

    drawFaceWorking(typeOffset) {
      const ctx = this.ctx;

      // Focused eyes
      ctx.fillStyle = this.colors.eye;
      ctx.beginPath();
      ctx.ellipse(-16, -2 + typeOffset, 9, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(16, -2 + typeOffset, 9, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = this.colors.eyeHighlight;
      ctx.beginPath();
      ctx.ellipse(-13, 1 + typeOffset, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(19, 1 + typeOffset, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrows
      ctx.strokeStyle = this.colors.bodyDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-26, -18);
      ctx.lineTo(-9, -16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(26, -18);
      ctx.lineTo(9, -16);
      ctx.stroke();

      // Nose
      ctx.fillStyle = this.colors.nose;
      ctx.beginPath();
      ctx.ellipse(0, 7, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      ctx.strokeStyle = this.colors.mouth;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, 16);
      ctx.lineTo(4, 16);
      ctx.stroke();

      // Whiskers
      this.drawWhiskers(0, 12);
    }

    drawFaceThinking() {
      const ctx = this.ctx;

      // Curious wide eyes
      ctx.fillStyle = this.colors.eye;
      ctx.beginPath();
      ctx.ellipse(-16, -7, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(16, -7, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = this.colors.eyeHighlight;
      ctx.beginPath();
      ctx.ellipse(-12, -10, 4.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(20, -10, 4.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Small highlight
      ctx.beginPath();
      ctx.ellipse(-17, -4, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(15, -4, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = this.colors.nose;
      ctx.beginPath();
      ctx.ellipse(0, 7, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // O shaped mouth
      ctx.fillStyle = this.colors.mouth;
      ctx.beginPath();
      ctx.ellipse(0, 17, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.ellipse(0, 17, 3, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Whiskers
      this.drawWhiskers(0, 12);
    }

    drawFaceHappy() {
      const ctx = this.ctx;

      // Sparkly happy eyes (closed)
      ctx.strokeStyle = this.colors.eye;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-16, -5, 7, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(16, -5, 7, 0.3, Math.PI - 0.3);
      ctx.stroke();

      // Blush
      ctx.fillStyle = this.colors.cheek;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(-26, 4, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(26, 4, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Nose
      ctx.fillStyle = this.colors.nose;
      ctx.beginPath();
      ctx.ellipse(0, 7, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Big happy mouth
      ctx.fillStyle = this.colors.mouth;
      ctx.beginPath();
      ctx.moveTo(-9, 12);
      ctx.quadraticCurveTo(0, 22, 9, 12);
      ctx.quadraticCurveTo(0, 17, -9, 12);
      ctx.fill();

      // Tongue
      ctx.fillStyle = '#FF9999';
      ctx.beginPath();
      ctx.ellipse(0, 18, 4.5, 4, 0, 0, Math.PI);
      ctx.fill();

      // Whiskers
      this.drawWhiskers(0, 12);
    }

    drawFaceSad() {
      const ctx = this.ctx;

      // Sad droopy eyes
      ctx.fillStyle = this.colors.eye;
      ctx.beginPath();
      ctx.ellipse(-16, -2, 9, 8, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(16, -2, 9, 8, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = this.colors.eyeHighlight;
      ctx.beginPath();
      ctx.ellipse(-13, 0, 3.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(19, 0, 3.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sad eyebrows
      ctx.strokeStyle = this.colors.bodyDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-26, -15);
      ctx.lineTo(-9, -11);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(26, -15);
      ctx.lineTo(9, -11);
      ctx.stroke();

      // Nose
      ctx.fillStyle = this.colors.nose;
      ctx.beginPath();
      ctx.ellipse(0, 7, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sad mouth
      ctx.strokeStyle = this.colors.mouth;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, 18);
      ctx.quadraticCurveTo(0, 13, 6, 18);
      ctx.stroke();

      // Whiskers (droopy)
      ctx.strokeStyle = this.colors.whisker;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-12, 10);
      ctx.lineTo(-34, 7);
      ctx.moveTo(-12, 13);
      ctx.lineTo(-34, 13);
      ctx.moveTo(-12, 16);
      ctx.lineTo(-34, 19);
      ctx.moveTo(12, 10);
      ctx.lineTo(34, 7);
      ctx.moveTo(12, 13);
      ctx.lineTo(34, 13);
      ctx.moveTo(12, 16);
      ctx.lineTo(34, 19);
      ctx.stroke();
    }

    drawWhiskers(x, y) {
      const ctx = this.ctx;
      ctx.strokeStyle = this.colors.whisker;
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x - 34, y - 4);
      ctx.moveTo(x - 12, y + 3);
      ctx.lineTo(x - 34, y + 3);
      ctx.moveTo(x - 12, y + 6);
      ctx.lineTo(x - 34, y + 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x + 34, y - 4);
      ctx.moveTo(x + 12, y + 3);
      ctx.lineTo(x + 34, y + 3);
      ctx.moveTo(x + 12, y + 6);
      ctx.lineTo(x + 34, y + 10);
      ctx.stroke();
    }

    drawPaws(offset) {
      const ctx = this.ctx;

      ctx.fillStyle = this.colors.body;

      // Left paw
      ctx.beginPath();
      ctx.ellipse(-30, 30 + offset, 10, 7, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Right paw
      ctx.beginPath();
      ctx.ellipse(30, 30 - offset, 10, 7, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Claws
      ctx.fillStyle = this.colors.claw;
      ctx.beginPath();
      ctx.ellipse(-32, 34 + offset, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-28, 35 + offset, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(32, 34 - offset, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(28, 35 - offset, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPawsHappy() {
      const ctx = this.ctx;
      const bounce = Math.sin(Date.now() * 0.01) * 3;

      ctx.fillStyle = this.colors.body;

      // Left paw up
      ctx.beginPath();
      ctx.ellipse(-36, -15 + bounce, 10, 7, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Right paw up
      ctx.beginPath();
      ctx.ellipse(36, -15 - bounce, 10, 7, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Claws
      ctx.fillStyle = this.colors.claw;
      ctx.beginPath();
      ctx.ellipse(-38, -20 + bounce, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(38, -20 - bounce, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============================================
  // STATUS DISPLAY MESSAGES
  // ============================================
  const STATUS_MESSAGES = {
    idle: 'Idle - Ready to help!',
    idle_long: 'Zzz... Sleeping...',
    working: 'Working on it...',
    thinking: 'Hmm, let me think...',
    success: 'Task completed!',
    error: 'Oops! Something went wrong...'
  };

  // ============================================
  // MAIN INITIALIZATION
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pet-canvas');
    const ctx = canvas.getContext('2d');
    const messageBubble = document.getElementById('message-bubble');
    const container = document.getElementById('pet-container');

    // Create pet instance
    const pet = new Pet(ctx);

    // Current state
    let currentState = 'idle';
    let lastTime = Date.now();
    let messageTimeout = null;

    // Show message bubble
    function showMessage(text) {
      messageBubble.textContent = text;
      messageBubble.classList.add('visible');

      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }

      messageTimeout = setTimeout(() => {
        messageBubble.classList.remove('visible');
      }, 2500);
    }

    // Animation loop
    function animate() {
      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      // Draw pet based on current state
      pet.draw(currentState, deltaTime);

      requestAnimationFrame(animate);
    }

    // Start animation
    animate();

    // Handle status changes from main process
    if (window.electronAPI) {
      // Get initial status
      window.electronAPI.getStatus().then(status => {
        if (status) {
          currentState = status;
          showMessage(STATUS_MESSAGES[status] || STATUS_MESSAGES.idle);
        }
      });

      // Listen for status changes
      window.electronAPI.onStatusChange((status) => {
        if (status && status !== currentState) {
          currentState = status;
          showMessage(STATUS_MESSAGES[status] || STATUS_MESSAGES.idle);
        }
      });

      // Listen for initial status
      window.electronAPI.onInitialStatus((status) => {
        if (status && status !== currentState) {
          currentState = status;
          showMessage(STATUS_MESSAGES[status] || STATUS_MESSAGES.idle);
        }
      });

      // Listen for show command
      window.electronAPI.onShowPet(() => {
        showMessage(STATUS_MESSAGES[currentState] || 'Hi!');
      });

      // Listen for display message
      window.electronAPI.onDisplayMessage((message) => {
        showMessage(message);
      });
    }

    // Click handler - show status message
    container.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showMessage(STATUS_MESSAGES[currentState] || 'Hi!');
    });

    // Right-click handler - show context menu
    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.electronAPI) {
        window.electronAPI.showContextMenu();
      }
    });
  });
})();
