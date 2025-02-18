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

        // Add particle pooling
        this.particlePool = [];
        this.poolSize = 200;
        for (let i = 0; i < this.poolSize; i++) {
            this.particlePool.push(new EngineParticle(0, 0));
        }

        // Setup cached particle image
        this.particleCanvas = document.createElement('canvas');
        this.particleCanvas.width = 10;
        this.particleCanvas.height = 10;
        const pCtx = this.particleCanvas.getContext('2d');
        
        // Pre-render particle
        const gradient = pCtx.createRadialGradient(5, 5, 0, 5, 5, 5);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        pCtx.fillStyle = gradient;
        pCtx.beginPath();
        pCtx.arc(5, 5, 5, 0, Math.PI * 2);
        pCtx.fill();
    }
    
    setEmitter(x, y) {
        this.emitterX = x;
        this.emitterY = y;
    }
    
    getParticle() {
        return this.particlePool.pop() || new EngineParticle(0, 0);
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

        // Return dead particles to pool
        const activeParticles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            if (p.life <= 0) {
                this.particlePool.push(p);
            }
        });
        this.particles = activeParticles;
    }
    
    draw() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(
                this.particleCanvas,
                p.x - 5, p.y - 5
            );
        });
        
        this.ctx.restore();
    }
}

class LaserEngine {
    constructor(ctx, audioManager) {
        this.ctx = ctx;
        this.particles = []; // Make particles accessible
        this.emissionRate = 4;    // Reduced from 20 to 4 shots per second
        this.emissionAccumulator = 0;
        this.emitterX = 0;
        this.emitterY = 0;
        this.firing = false;
        this.audioManager = audioManager;
        this.virtualWidth = ctx.canvas.width;
    }

    playShootSound(x) {
        console.log('Attempting to play shoot sound at position:', x); // Debug line

        if (!this.audioManager) {
            console.error('No audio manager available!');
            return;
        }

        // Debug logging for audio manager state
        console.debug('LaserEngine Audio State:', {
            hasAudioManager: !!this.audioManager,
            isInitialized: this.audioManager?.isInitialized,
            availableSounds: this.audioManager ? Array.from(this.audioManager.sounds?.keys() || []) : [],
            isFiring: this.firing,
            position: {
                x: x,
                normalized: (x / this.virtualWidth) * 2 - 1
            }
        });

        try {
            const normalizedX = (x / this.virtualWidth) * 2 - 1;
            
            const soundConfig = {
                pitch: 0.4 + Math.random() * 0.4,    // Base pitch lowered from 0.6 to 0.4 (another 4 semitones lower)
                pan: normalizedX,
                volume: 0.15 + Math.random() * 0.1,  // Volume reduced from 0.25 to 0.15 base
                decay: 0.3 + Math.random() * 0.2
            };

            console.log('Playing sound with config:', soundConfig); // Debug line
            const result = this.audioManager.playSound('laser', soundConfig);
            console.log('Sound play result:', result); // Debug line
        } catch (error) {
            console.error('Error playing shoot sound:', error);
        }
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
            console.log('LaserEngine is firing, delta:', delta); // Debug line
            const toEmit = this.emissionRate * delta + this.emissionAccumulator;
            const count = Math.floor(toEmit);
            this.emissionAccumulator = toEmit - count;
            
            if (count > 0) {
                console.log(`Creating ${count} laser particles`); // Debug line
            }

            for (let i = 0; i < count; i++) {
                this.particles.push(new LaserParticle(this.emitterX, this.emitterY));
                // Ensure sound plays for each particle
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
