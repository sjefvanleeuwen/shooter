const RADIOSITY_ENABLED = false;

class AlienLaser {
    constructor(x, y, audioManager) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 16;
        this.vx = 0;
        this.vy = 420;  // Reduced from 600 by 30%
        this.life = 2.0;
        this.maxLife = this.life;
        this.audioManager = audioManager;

        // Play sound when laser is created
        AlienLaser.playShootSound(x, window.innerWidth, audioManager);
    }

    static playShootSound(x, virtualWidth, audioManager) {
        if (!audioManager) {
            console.warn('AlienLaser: No audioManager provided');
            return;
        }
        
        try {
            if (!audioManager.sounds.has('alien-laser')) {
                console.error('alien-laser sound not loaded!');
                return;
            }

            const normalizedX = (x / virtualWidth) * 2 - 1;
            
            const soundConfig = {
                pitch: 0.5 + Math.random(),          // Random pitch between 0.5 and 1.5
                pan: normalizedX,                    // Pan based on position (-1 to 1)
                volume: 0.5 + Math.random() * 0.25,  // Random volume between 0.5 and 0.75
                decay: 0.5 + Math.random() * 0.5     // Random decay between 0.5 and 1.0 seconds
            };

            audioManager.playSound('alien-laser', soundConfig); 

        } catch (error) {
            console.error('AlienLaser: Error playing sound:', error);
        }
    }

    update(delta) {
        this.x += (this.vx || 0) * delta;
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
        
        if (RADIOSITY_ENABLED) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
            ctx.shadowBlur = 8;
            ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        }
        ctx.restore();
    }
}

export default AlienLaser;
