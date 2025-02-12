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
    constructor(ctx) {
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
        this.setupAudio();

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

    setupAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.loadExplosionSound();
    }

    async loadExplosionSound() {
        try {
            const response = await fetch('./audio/explosion.mp3');
            const arrayBuffer = await response.arrayBuffer();
            this.explosionBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading explosion sound:', error);
        }
    }

    playExplosionSound(x) {
        if (!this.explosionBuffer) return;

        // Create audio nodes
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();;
        const pannerNode = this.audioContext.createStereoPanner();
        
        // Connect nodes: source -> panner -> gain -> destination
        source.buffer = this.explosionBuffer;
        source.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Calculate pan based on x position (-1 to 1)
        const normalizedX = (x / this.virtualWidth) * 2 - 1;
        pannerNode.pan.value = normalizedX;

        // Random pitch variation (1 semitone = 1.059463)
        const pitchVariation = 1 + (Math.random() * 0.1);
        source.playbackRate.value = pitchVariation;

        // Random fade duration
        const fadeDuration = Math.random() * 0.25 + 0.25;
        
        // Start playing
        source.start();
        gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeDuration);
        source.stop(this.audioContext.currentTime + fadeDuration);
    }

    createExplosion(x, y) {
        // Limit concurrent explosions
        if (this.explosions.length >= this.maxExplosions) {
            return;
        }

        const particles = [];
        for (let i = 0; i < this.maxParticlesPerExplosion; i++) {
            particles.push(this.getParticle(x, y, this.config));
        }
        this.explosions.push(particles);
        
        // Play sound with position
        this.playExplosionSound(x);
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
                
                // Use pre-rendered particle
                this.ctx.drawImage(
                    this.particleCanvas,
                    p.x - 16, p.y - 16,
                    32, 32
                );
            });
        });
        
        this.ctx.restore();
    }
}

export default ExplosionEffect;
