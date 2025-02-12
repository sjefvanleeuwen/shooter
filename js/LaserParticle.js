class AlienLaser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 16;
        this.vy = 420;  // Reduced from 600 by 30%
        this.life = 2.0;
        this.maxLife = this.life;

        // Set up audio if it hasn't been initialized yet
        if (!AlienLaser.audioContext) {
            AlienLaser.setupAudio();
        }
    }

    static async setupAudio() {
        AlienLaser.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        try {
            const response = await fetch('./audio/alien-shoot.mp3');
            const arrayBuffer = await response.arrayBuffer();
            AlienLaser.shootBuffer = await AlienLaser.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading alien shoot sound:', error);
        }
    }

    static playShootSound(x, virtualWidth) {
        if (!AlienLaser.shootBuffer || !AlienLaser.audioContext) return;

        const source = AlienLaser.audioContext.createBufferSource();
        const gainNode = AlienLaser.audioContext.createGain();
        const pannerNode = AlienLaser.audioContext.createStereoPanner();

        source.buffer = AlienLaser.shootBuffer;
        source.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(AlienLaser.audioContext.destination);

        // Pan based on position
        const normalizedX = (x / virtualWidth) * 2 - 1;
        pannerNode.pan.value = normalizedX;

        // Slightly randomize pitch
        const pitchVariation = 1 + (Math.random() * 0.1 - 0.05); // ±5% variation
        source.playbackRate.value = pitchVariation;

        // Quick fade out
        const fadeDuration = 0.2;
        gainNode.gain.setValueAtTime(0.3, AlienLaser.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, AlienLaser.audioContext.currentTime + fadeDuration);

        source.start();
        source.stop(AlienLaser.audioContext.currentTime + fadeDuration);
    }

    update(delta) {
        this.y += this.vy * delta;
        this.life -= delta;
    }

    draw(ctx) {
        ctx.save();
        const alpha = Math.max(this.life / this.maxLife, 0);
        
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x, this.y + this.height
        );
        
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        ctx.restore();
    }
}

export default AlienLaser;
