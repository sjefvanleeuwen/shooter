class IntroScreen {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth;
        this.virtualHeight = options.virtualHeight;
        this.bgScroller = options.bgScroller;
        
        // Load logo
        this.logo = new Image();
        this.logo.src = './sprites/xenowar.png';
        
        // Add some animation properties
        this.alpha = 0;
        this.fadeIn = true;
        this.fadeSpeed = 0.5;
        
        // Add press space to start text properties
        this.pressSpaceAlpha = 0;
        this.pressSpaceVisible = false;

        this.isGameOver = options.isGameOver || false;
        this.finalScore = options.finalScore;
        this.highScore = options.highScore;

        // Audio controlled by Game's MusicPlayer
        // this.titleMusic = new Audio('./audio/xeno-war.mp3');
        // this.titleMusic.volume = 0.5; // 50% volume
        this.musicStarted = false;
    }

    update(delta) {
        // Update background
        this.bgScroller.update(delta);
        
        // Fade in/out effect for logo
        if (this.fadeIn) {
            this.alpha = Math.min(1, this.alpha + delta * this.fadeSpeed);
            if (this.alpha >= 1) {
                this.fadeIn = false;
                this.pressSpaceVisible = true;
                
                // Play music when fade completes
                /*
                if (!this.musicStarted) {
                    this.titleMusic.play().catch(e => console.log('Audio playback failed:', e));
                    this.musicStarted = true;
                }
                */
            }
        }
        
        // Pulsing effect for "Press Space" text
        if (this.pressSpaceVisible) {
            this.pressSpaceAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
        }
    }

    draw() {
        // Draw background
        this.bgScroller.draw();
        
        // Draw logo centered
        if (this.logo.complete) {
            this.ctx.save();
            this.ctx.globalAlpha = this.alpha;
            const scale = 0.8; // Scale the logo to 80% of its size
            const logoWidth = this.logo.width * scale;
            const logoHeight = this.logo.height * scale;
            const x = (this.virtualWidth - logoWidth) / 2;
            const y = (this.virtualHeight - logoHeight) / 2;
            
            this.ctx.drawImage(this.logo, x, y, logoWidth, logoHeight);
            this.ctx.restore();
        }

        // Draw game over text if applicable
        if (this.isGameOver && this.pressSpaceVisible) {
            this.ctx.save();
            
            // Draw scores first at top of screen
            this.ctx.globalAlpha = this.alpha;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`FINAL SCORE: ${this.finalScore}`, 
                this.virtualWidth / 2, 
                this.virtualHeight * 0.15);  // Moved to top
            this.ctx.fillText(`HIGH SCORE: ${this.highScore}`, 
                this.virtualWidth / 2, 
                this.virtualHeight * 0.2);   // Just below final score

            // Draw GAME OVER below scores
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '48px "Press Start 2P"';
            this.ctx.fillText('GAME OVER', 
                this.virtualWidth / 2, 
                this.virtualHeight * 0.3);
            
            this.ctx.restore();
        }
        
        // Draw "Press Space to Start"
        if (this.pressSpaceVisible) {
            this.ctx.save();
            this.ctx.globalAlpha = this.pressSpaceAlpha;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.textAlign = 'center';

            const isMobile = window.game?.mobileControls?.isMobile;
            const text = isMobile ? 'PRESS FIRE TO START' : 'PRESS SPACE TO START';

            this.ctx.fillText(text, 
                this.virtualWidth / 2, 
                this.virtualHeight * 0.7);
            this.ctx.restore();
        }
    }

    handleInput(key) {
        if (key === ' ' && this.pressSpaceVisible) {
            // Always reset game state when starting a new game
            window.game.gameState.reset();
            this.cleanup();
            return 'game';
        }
        return null;
    }

    // Stop music when transitioning away
    cleanup() {
        if (this.titleMusic) {
            this.titleMusic.pause();
            this.titleMusic.currentTime = 0;
        }
    }
}

export default IntroScreen;
