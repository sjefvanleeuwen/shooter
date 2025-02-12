// Renamed Particle to EngineParticle.
class EngineParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // More focused horizontal spread and faster upward velocity.
        this.vx = (Math.random() - 0.5) * 25;    // Reduced from 50 to 25 for narrower spread.
        this.vy = Math.random() * 25 + 150;        // Increased base speed for faster particles.
        // Shorter lifetime for a snappier effect.
        this.life = Math.random() * 0.3 + 0.1;     // Range: 0.1 to 0.4 seconds.
        this.maxLife = this.life;
    }
    
    update(delta) {
        this.x += this.vx * delta;
        this.y += this.vy * delta;
        this.life -= delta;
    }
    
    draw(ctx) {
        ctx.save();
        const alpha = Math.max(this.life / this.maxLife, 0);
        const radius = 5;  // Reduced from 10 to 5.
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 140, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class LaserParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.initialX = x;
        this.width = 4;     // Reduced from 8 to 4.
        this.height = 16;   // Reduced from 32 to 16.
        this.vy = -1200;     // Fast upward velocity
        this.life = 2.0;     // Longer life to reach top
        this.maxLife = this.life;
    }
    
    update(delta) {
        this.x = this.initialX;
        this.y += this.vy * delta;  // Move upward
        this.life -= delta;
        
        // Kill particle if it goes above the game area
        if (this.y + this.height < 0) {
            this.life = 0;
        }
    }
    
    draw(ctx) {
        ctx.save();
        const alpha = Math.max(this.life / this.maxLife, 0);
        
        // Create gradient for bullet
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x, this.y + this.height
        );
        
        gradient.addColorStop(0, `rgba(0, 247, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(1, `rgba(0, 247, 255, ${alpha})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        
        // Add glow effect
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
        ctx.shadowBlur = 8;  // Reduced from 15 to 8.
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        ctx.restore();
    }
}

class ParticleEngine {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
        // Increased emission rate for higher density.
        this.emissionRate = 100; // increased from 50 to 100 particles per second
        this.emissionAccumulator = 0;
        // Default emitter position.
        this.emitterX = 0;
        this.emitterY = 0;
    }
    
    setEmitter(x, y) {
        this.emitterX = x;
        this.emitterY = y;
    }
    
    update(delta) {
        const toEmit = this.emissionRate * delta + this.emissionAccumulator;
        const count = Math.floor(toEmit);
        this.emissionAccumulator = toEmit - count;
        for (let i = 0; i < count; i++) {
            // Use EngineParticle instead of Particle.
            this.particles.push(new EngineParticle(this.emitterX, this.emitterY));
        }
        
        this.particles.forEach(p => p.update(delta));
        this.particles = this.particles.filter(p => p.life > 0);
    }
    
    draw() {
        this.particles.forEach(p => p.draw(this.ctx));
    }
}

class LaserEngine {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = []; // Make particles accessible
        this.emissionRate = 4;    // Reduced from 20 to 4 shots per second
        this.emissionAccumulator = 0;
        this.emitterX = 0;
        this.emitterY = 0;
        this.firing = false;
        this.virtualWidth = ctx.canvas.width;
        this.setupAudio();
    }
    
    setupAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.loadShootSound();
    }

    async loadShootSound() {
        try {
            const response = await fetch('./audio/player-shoot.wav');
            const arrayBuffer = await response.arrayBuffer();
            this.shootBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading shoot sound:', error);
        }
    }

    playShootSound(x) {
        if (!this.shootBuffer) return;

        // Create audio nodes
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const pannerNode = this.audioContext.createStereoPanner();
        
        // Connect nodes
        source.buffer = this.shootBuffer;
        source.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Calculate pan based on x position (-1 to 1)
        const normalizedX = (x / this.virtualWidth) * 2 - 1;
        pannerNode.pan.value = normalizedX;

        // Random pitch variation (smaller range than explosion)
        const pitchVariation = 1 + (Math.random() * 0.09); // Half semitone variation
        source.playbackRate.value = pitchVariation;

        // Quick fade out
        const fadeDuration = (Math.random() * 0.5); // 100ms fade
        
        // Start playing
        source.start();
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime); // Lower volume for rapid fire
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeDuration);
        source.stop(this.audioContext.currentTime + fadeDuration);
    }

    setEmitter(x, y) {
        this.emitterX = x;
        this.emitterY = y;
    }

    setFiring(isFiring) {
        this.firing = isFiring;
    }
    
    update(delta) {
        // Only emit new particles if firing
        if (this.firing) {
            const toEmit = this.emissionRate * delta + this.emissionAccumulator;
            const count = Math.floor(toEmit);
            this.emissionAccumulator = toEmit - count;
            for (let i = 0; i < count; i++) {
                this.particles.push(new LaserParticle(this.emitterX, this.emitterY));
            }
            
            if (count > 0) {
                this.playShootSound(this.emitterX);
            }
        }
        
        // Always update existing particles
        this.particles.forEach(p => p.update(delta));
        this.particles = this.particles.filter(p => p.life > 0);
    }
    
    draw() {
        this.particles.forEach(p => p.draw(this.ctx));
    }
}

export { ParticleEngine, LaserEngine };
