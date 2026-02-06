class ExplosionParticle {
    constructor(x, y, config) {
        this.reset(x, y, config);
    }

    reset(x, y, config) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * config.speedVariation + config.baseSpeed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = Math.random() * config.lifeVariation + config.baseLife;
        this.maxLife = this.life;
        this.radius = Math.random() * config.radiusVariation + config.baseRadius;
        this.hue = Math.random() * config.hueVariation + config.hueBase;
        this.saturation = 100;
        this.brightness = Math.random() * config.brightnessVariation + config.brightness;
        this.pulseSpeed = Math.random() * 10 + 8;
        this.glowSize = Math.random() * config.glowVariation + config.glowSize;
        this.config = config;
        this.drawSize = 32; // Default size, will be overridden by createExplosion if needed
        return this;
    }

    update(delta) {
        this.x += this.vx * delta;
        this.y += this.vy * delta;
        this.life -= delta;
        this.vy += this.config.gravity * delta;
        this.radius *= this.config.shrinkRate;
    }

    draw(ctx) {
        const alpha = (this.life / this.maxLife) * 2.0; // Even brighter
        const pulse = 1 + Math.sin(this.life * this.pulseSpeed) * 0.3;
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Outer glow
        ctx.globalAlpha = alpha * 0.5;
        ctx.filter = 'blur(8px)';
        ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.glowSize * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Middle glow
        ctx.globalAlpha = alpha * 0.7;
        ctx.filter = 'blur(4px)';
        ctx.fillStyle = `hsla(${this.hue}, 100%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.globalAlpha = alpha;
        ctx.filter = 'none';
        ctx.fillStyle = `hsla(${this.hue}, 100%, 100%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class ExplosionEffect {
    constructor(ctx, audioManager) {
        if (!audioManager) {
            console.error('ExplosionEffect: AudioManager not provided!');
        }
        this.ctx = ctx;
        this.explosions = [];
        
        // Directly set config values instead of using GUI
        this.config = {
            particleCount: 15,
            highlightCount: 3,
            baseSpeed: 150,
            speedVariation: 50,
            baseLife: 0.3,
            lifeVariation: 0.4,
            baseRadius: 4,
            radiusVariation: 8,
            gravity: 100,
            shrinkRate: 0.95,
            glowSize: 1.5,
            glowVariation: 1.5,
            hueBase: 90,
            hueVariation: 15,
            brightness: 90,
            brightnessVariation: 10
        };

        // Add virtual width for position calculations
        this.virtualWidth = ctx.canvas.width;
        this.audioManager = audioManager;

        // Add performance optimizations
        this.maxExplosions = 5; // Limit concurrent explosions
        this.maxParticlesPerExplosion = 12; // Reduced from 15
        this.useOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
        
        // Create particle pool
        this.particlePool = [];
        this.poolSize = 100;
        for (let i = 0; i < this.poolSize; i++) {
            this.particlePool.push(new ExplosionParticle(0, 0, this.config));
        }

        // Setup cached canvas for particle drawing
        if (this.useOffscreenCanvas) {
            this.particleCanvas = new OffscreenCanvas(32, 32);
        } else {
            this.particleCanvas = document.createElement('canvas');
            this.particleCanvas.width = 32;
            this.particleCanvas.height = 32;
        }
        this.particleCtx = this.particleCanvas.getContext('2d');
        this.preRenderParticle();
    }

    preRenderParticle() {
        // Pre-render particle gradient
        const ctx = this.particleCtx;
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.clearRect(0, 0, 32, 32);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();
    }

    getParticle(x, y, config) {
        // Reuse particle from pool or create new one
        let particle = this.particlePool.pop();
        if (!particle) {
            particle = new ExplosionParticle(x, y, config);
        } else {
            particle.reset(x, y, config);
        }
        return particle;
    }

    playExplosionSound(x, options = {}) {
        if (!this.audioManager) return;

        try {
            const normalizedX = (x / this.virtualWidth) * 2 - 1;
            
            // Heavier sounds = lower pitch
            const basePitch = options.pitch || 1.0;
            const baseVolume = options.volume || 0.6;

            const soundConfig = {
                pitch: (basePitch * 0.9) + (Math.random() * 0.2 * basePitch),
                pan: normalizedX,
                volume: baseVolume + (Math.random() * 0.15),
                decay: (options.decay || 0.8) + (Math.random() * 0.4)
            };

            this.audioManager.playSound('explosion', soundConfig);
        } catch (error) {
            console.error('ExplosionEffect: Error playing sound:', error);
        }
    }

    createExplosion(x, y, options = {}) {
        // Play sound before creating particles unless it's just a spark
        if (!options.isSpark) {
            this.playExplosionSound(x, options);
        }
        
        // Limit concurrent explosions
        if (this.explosions.length >= this.maxExplosions) {
            return;
        }

        const count = options.count || this.maxParticlesPerExplosion;
        let config = options.isSpark ? {
            ...this.config,
            baseSpeed: options.speed || 350,
            baseLife: 0.25,
            lifeVariation: 0.15,
            baseRadius: 1.5,
            radiusVariation: 12,
            hueBase: options.hue || 60, // Default to yellowish sparks
            hueVariation: 20
        } : { ...this.config };

        // For "heavy" explosions, bump the speed and variation
        if (options.isHeavy) {
            config.baseSpeed *= 1.8;
            config.speedVariation *= 2.5;
            config.baseLife *= 3.0; // Triple the life for heavy explosions to match sound
            config.lifeVariation *= 2.0;
        }

        const particles = [];
        for (let i = 0; i < count; i++) {
            const p = this.getParticle(x, y, config);
            p.drawSize = (options.particleSize || 32) * (0.8 + Math.random() * 0.4);
            particles.push(p);
        }
        this.explosions.push(particles);
    }

    update(delta) {
        this.explosions.forEach(particles => {
            particles.forEach(p => p.update(delta));
        });

        // Recycle finished particles and explosions
        this.explosions = this.explosions.filter(particles => {
            const activeParticles = particles.filter(p => p.life > 0);
            // Return inactive particles to pool
            particles.forEach(p => {
                if (p.life <= 0) {
                    this.particlePool.push(p);
                }
            });
            return activeParticles.length > 0;
        });
    }

    draw() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        
        this.explosions.forEach(particles => {
            particles.forEach(p => {
                if (p.life <= 0) return;
                
                const alpha = p.life / p.maxLife;
                this.ctx.globalAlpha = alpha;
                
                // Use pre-rendered particle with custom size
                const sz = p.drawSize || 32;
                this.ctx.drawImage(
                    this.particleCanvas,
                    p.x - sz/2, p.y - sz/2,
                    sz, sz
                );
            });
        });
        
        this.ctx.restore();
    }
}

export default ExplosionEffect;
