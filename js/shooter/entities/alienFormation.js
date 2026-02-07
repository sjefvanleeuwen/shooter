import Alien from './alien.js';

class AlienFormation {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth || 1920;
        this.virtualHeight = options.virtualHeight || 1080;
        this.rows = options.rows || 3;
        this.cols = options.cols || 8;
        this.aliens = [];
        this.padding = 20; // Space between aliens
        
        this.createFormation();
    }

    createFormation() {
        const alienWidth = 100;
        const alienHeight = 100;
        const startX = (this.virtualWidth - (this.cols * (alienWidth + this.padding))) / 2;
        const startY = 50;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = startX + col * (alienWidth + this.padding);
                const y = startY + row * (alienHeight + this.padding);
                
                const alien = new Alien(this.ctx, {
                    x,
                    y,
                    virtualWidth: this.virtualWidth,
                    virtualHeight: this.virtualHeight
                });
                
                this.aliens.push(alien);
            }
        }
    }

    update(delta) {
        let needsReverse = false;
        
        // Check if any alien hits the screen bounds
        this.aliens.forEach(alien => {
            if (alien.x <= 0 || alien.x + alien.width >= this.virtualWidth) {
                needsReverse = true;
            }
        });

        // If we need to reverse, reverse all aliens and move them down
        if (needsReverse) {
            this.aliens.forEach(alien => {
                alien.reverseDirection();
                alien.y += 20; // Move down when hitting edges
            });
        }

        // Update all aliens
        this.aliens.forEach(alien => alien.update(delta));
    }

    draw() {
        this.aliens.forEach(alien => alien.draw());
    }

    removeAlien(alien) {
        const index = this.aliens.indexOf(alien);
        if (index > -1) {
            this.aliens.splice(index, 1);
            return true;
        }
        return false;
    }

    checkCollision(x, y) {
        for (let alien of this.aliens) {
            if (alien.collidesWith(x, y)) {
                this.removeAlien(alien);
                return true;
            }
        }
        return false;
    }
}

export default AlienFormation;
