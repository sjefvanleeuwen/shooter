class ExplosionParticle {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * config.speedVariation + config.baseSpeed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = Math.random() * config.lifeVariation + config.baseLife;
        this.maxLife = this.life;
        this.radius = Math.random() * config.radiusVariation + config.baseRadius;

        // Color settings from config
        this.hue = Math.random() * config.hueVariation + config.hueBase;
        this.saturation = 100;
        this.brightness = Math.random() * config.brightnessVariation + config.brightness;
        
        this.pulseSpeed = Math.random() * 10 + 8;
        this.glowSize = Math.random() * config.glowVariation + config.glowSize;
        
        // Store config for update
        this.config = config;
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
        // Play sound with position
        this.playExplosionSound(x);
        
        const particles = [];
        // Use config values for main particles
        for (let i = 0; i < this.config.particleCount; i++) {
            const p = new ExplosionParticle(x, y, this.config);
            particles.push(p);
        }
        // Highlight particles
        for (let i = 0; i < this.config.highlightCount; i++) {
            const p = new ExplosionParticle(x, y, this.config);
            p.radius *= 1.5;
            p.life *= 1.2;
            particles.push(p);
        }
        this.explosions.push(particles);
    }

    update(delta) {
        this.explosions.forEach(particles => {
            particles.forEach(p => p.update(delta));
        });
        // Remove finished explosions
        this.explosions = this.explosions.filter(particles => 
            particles.some(p => p.life > 0)
        );
    }

    draw() {
        this.explosions.forEach(particles => {
            particles.forEach(p => p.draw(this.ctx));
        });
    }
}

export default ExplosionEffect;
