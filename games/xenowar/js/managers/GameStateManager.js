class GameStateManager {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
        this.playerHit = false;
        this.playerInvulnerable = false;
        this.invulnerabilityTime = 2.0;
        this.invulnerabilityTimer = 0;
    }

    addPoints(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore.toString());
        }
    }

    handlePlayerHit() {
        if (!this.playerInvulnerable) {
            this.lives--;
            this.playerHit = true;
            this.playerInvulnerable = true;
            return this.lives <= 0;
        }
        return false;
    }

    update(delta) {
        if (this.playerInvulnerable) {
            this.invulnerabilityTimer += delta;
            if (this.invulnerabilityTimer >= this.invulnerabilityTime) {
                this.playerInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }

    reset() {
        this.score = 0;
        this.lives = 3;
        this.playerHit = false;
        this.playerInvulnerable = false;
        this.invulnerabilityTimer = 0;
        // Don't reset highScore as it should persist
    }

    getInvulnerabilityAlpha() {
        return this.playerInvulnerable ? 
            0.5 + Math.sin(this.invulnerabilityTimer * 10) * 0.3 : 
            1;
    }
}

export default GameStateManager;
