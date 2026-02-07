// Renamed Particle to EngineParticle.
class EngineParticle {
    constructor(x, y) {
        this.reset(x, y);
    }
    
    reset(x, y) {
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
        this.width = 6;     // Thicker: 4 -> 6
        this.height = 24;   // Longer: 16 -> 24
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
        
        ctx.globalCompositeOperation = 'lighter';

        // 1. Draw the broad intense glow (Outer Glow)
        ctx.shadowColor = `rgba(0, 200, 255, ${0.6 * alpha})`; // intense cyan
        ctx.shadowBlur = 15; // Increased blur for "glowy" feel
        ctx.fillStyle = `rgba(0, 200, 255, ${0.4 * alpha})`;
        ctx.fillRect(this.x - this.width, this.y, this.width * 2, this.height); // Wide soft glow
        
        // Reset shadow for core
        ctx.shadowBlur = 0;

        // 2. Draw the core laser (Sharper, clear contrast)
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x, this.y + this.height
        );
        
        // Hot white center with cyan edges
        gradient.addColorStop(0, `rgba(180, 240, 255, ${alpha})`);   // Light Cyan tip
        gradient.addColorStop(0.2, `rgba(255, 255, 255, ${alpha})`); // White core
        gradient.addColorStop(0.8, `rgba(255, 255, 255, ${alpha})`); // White core
        gradient.addColorStop(1, `rgba(0, 200, 255, ${alpha})`);     // Cyan tail
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);

        // 3. Inner bright core for "contrast"
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
        ctx.fillRect(this.x - (this.width * 0.3), this.y + 2, this.width * 0.6, this.height - 4);
        
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
        
        // Use object pool for emission
        for (let i = 0; i < count; i++) {
            let p;
            if (this.particlePool.length > 0) {
                p = this.particlePool.pop();
                p.reset(this.emitterX, this.emitterY);
            } else {
                p = new EngineParticle(this.emitterX, this.emitterY);
            }
            this.particles.push(p);
        }
        
        // In-place update and excessive allocation avoidance
        let liveCount = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.update(delta);
            
            if (p.life > 0) {
                // Keep particle (swap into live position)
                if (i !== liveCount) {
                    this.particles[liveCount] = p;
                }
                liveCount++;
            } else {
                // Recycle particle
                this.particlePool.push(p);
            }
        }
        
        // Truncate the array to remove dead particles from the end
        if (this.particles.length > liveCount) {
            this.particles.length = liveCount;
        }
    }
    
    draw() {
        if (this.ctx.renderParticles) {
            this.ctx.renderParticles(this.particles);
            return;
        }

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

        // Laser pooling
        this.laserPool = [];
        this.poolSize = 50;
        for (let i = 0; i < this.poolSize; i++) {
            this.laserPool.push(new LaserParticle(0, 0));
        }
    }

    playShootSound(x) {
        if (!this.audioManager) return;

        try {
            const normalizedX = (x / this.virtualWidth) * 2 - 1;
            
            const soundConfig = {
                pitch: 0.4 + Math.random() * 0.4,
                pan: normalizedX,
                volume: 0.15 + Math.random() * 0.1,
                decay: 0.3 + Math.random() * 0.2
            };

            this.audioManager.playSound('laser', soundConfig);
        } catch (error) {
            // Silently fail if audio system is not ready
        }
    }

    setEmitter(x, y) {
        this.emitterX = x;
        this.emitterY = y;
    }

    setFiring(isFiring) {
        this.firing = isFiring;
    }
    
    getLaser(x, y) {
        if (this.laserPool.length > 0) {
            const l = this.laserPool.pop();
            l.x = x; l.y = y; l.initialX = x; 
            l.life = l.maxLife; // Reset life
            return l;
        }
        return new LaserParticle(x, y);
    }

    update(delta) {
        // Only emit new particles if firing
        if (this.firing) {
            const toEmit = this.emissionRate * delta + this.emissionAccumulator;
            const count = Math.floor(toEmit);
            this.emissionAccumulator = toEmit - count;
            
            for (let i = 0; i < count; i++) {
                this.particles.push(this.getLaser(this.emitterX, this.emitterY));
                // Ensure sound plays for each particle
                this.playShootSound(this.emitterX);
            }
        }
        
        // Always update existing particles
        // this.particles.forEach(p => p.update(delta));
        // this.particles = this.particles.filter(p => p.life > 0);
        
        // Optimized update and pool recycling
        let writeIdx = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.update(delta);
            if (p.life > 0) {
                this.particles[writeIdx++] = p;
            } else {
                this.laserPool.push(p);
            }
        }
        this.particles.length = writeIdx;
    }
    
    draw() {
        if (this.ctx.renderLasers) {
            this.ctx.renderLasers(this.particles);
        } else {
            this.particles.forEach(p => p.draw(this.ctx));
        }
    }
}

export { ParticleEngine, LaserEngine };
