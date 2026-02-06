import Alien from './alien.js';
import { patterns } from './patterns/formationPatterns.js';
import SplineCurve from './math/SplineCurve.js';
import BezierPath from './math/BezierPath.js';
import AlienLaser from './LaserParticle.js';
import ExplosionEffect from './effects/ExplosionEffect.js';

class PatternFormation {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth || 1080;
        this.virtualHeight = options.virtualHeight || 1080;
        this.audioManager = options.audioManager; // Add this
        
        // Initialize config with new starting values
        this.config = {
            speed: 0.3,
            radius: 80,
            patternType: 'infinity',
            loopDuration: 10,
            alienCount: 10, // Increased from 5 to 10
            showPath: false,
            pathPoints: 100, // number of points to draw on path
            formationRadius: 150,  // New separate radius for formation
            pulseIntensity: 0,  // Add pulse intensity control
            pulseSpeed: 1,       // Add pulse speed control
            shootingEnabled: true // Add shooting enabled control
        };

        // Add difficulty progression parameters
        this.difficulty = options.difficulty || 1;
        this.maxDifficulty = 10; // After this, reset and speed up
        this.baseFormationRadius = 120; // Reduced from 150
        this.config.formationRadius = this.baseFormationRadius;
        this.radiusIncrease = 15; // Reduced from 20 to maintain proportion
        this.basePulseIntensity = 0.75; // Increased from 0.5
        this.pulseIntensityIncrease = 0.75; // Increased from 0.5
        this.basePulseSpeed = 0.5; // Reduced from 1.0
        this.pulseSpeedIncrease = 0.1; // Reduced from 0.2 to maintain ratio

        // Apply difficulty modifiers
        this.applyDifficultyModifiers();

        this.aliens = [];
        this.pattern = patterns[options.pattern || 'circle'];
        this.time = 0;
        this.loopDuration = 10;
        
        // Initialize at center position
        this.position = {
            x: this.virtualWidth * 0.5,
            y: this.virtualHeight * 0.3
        };
        this.velocity = { x: 0, y: 0 };
        
        this.calculateFormationParameters();
        
        // Add tracking of original positions
        this.alienSlots = [];  // Keep track of original formation slots
        this.createFormation();

        this.patternNames = Object.keys(patterns);
        this.currentPatternIndex = 0;
        this.patternDuration = 15; // seconds per pattern
        this.patternTimer = 0;

        this.respawnDelay = 2; // seconds to wait before respawning
        this.respawnTimer = 0;
        this.isRespawning = false;

        // Adjust vertical position to be higher and stay higher
        this.verticalOffset = this.virtualHeight * 0.2; // 20% from top
        this.maxVerticalPosition = this.virtualHeight * 0.4; // Don't go below 40% of screen height

        // Create path with new height constraints
        this.path = new BezierPath(
            this.virtualWidth * 0.5,    // centerX
            this.verticalOffset,        // centerY - higher position
            this.virtualWidth * 0.25    // radius
        );

        this.lasers = [];
        this.shootTimer = 0;
        this.baseShootInterval = 3.0; // Increased from 2.6
        this.minShootInterval = 1.2; // Increased from 0.8 (50% slower minimum interval)
        this.shootInterval = this.baseShootInterval;

        this.difficulty = options.difficulty || 1;
        this.shootInterval = Math.max(0.3, 1.0 - (this.difficulty * 0.1)); // Shoot faster with higher difficulty
        this.config.speed = Math.min(2.0, 0.3 + (this.difficulty * 0.1)); // Move faster with higher difficulty
        this.initialAlienCount = this.config.alienCount; // Store initial count
        this.pointsBase = 100; // Base points per alien

        this.explosionEffect = new ExplosionEffect(ctx, this.audioManager);

        // Enhanced rotation parameters
        this.baseRotationSpeed = 1.0;  // Increased from 0.5
        this.rotationSpeedIncrease = 0.4; // Increased from 0.3
        this.maxRotationSpeed = 6.0; // Increased from 5.0
        this.currentRotation = 0;
        this.rotationSpeed = this.baseRotationSpeed;
        this.rotationDirection = 1; // 1 or -1 for direction
        
        // Add rotation boost per cycle
        this.rotationCycleBonus = 0.4; // Additional rotation speed per cycle

        // Enhanced diving parameters
        this.baseDiveChance = 0.005; // Increased from 0.002 - more frequent dives
        this.diveChanceIncrease = 0.002; // Doubled for more aggressive scaling
        this.diveSpeed = 600; // Increased base dive speed
        this.diveSpeedIncrease = 100; // More speed increase per level
        this.maxDiveSpeed = 1200; // Higher maximum dive speed
        this.diveAcceleration = 1000; // Faster acceleration during dive
        this.diveCurveIntensity = 0.8; // How much they curve toward player
        this.currentDiveChance = this.baseDiveChance;
        this.currentDiveSpeed = this.diveSpeed;

        this.onPointsScored = options.onPointsScored || (() => {});
    }

    applyDifficultyModifiers() {
        // Calculate actual difficulty level (cycles through 1-10)
        const cycleDifficulty = ((this.difficulty - 1) % this.maxDifficulty) + 1;
        
        // Increase formation radius with difficulty
        this.config.formationRadius = Math.min(
            this.virtualHeight * 0.25, // Cap at 25% of screen height
            this.baseFormationRadius + (cycleDifficulty - 1) * this.radiusIncrease
        );

        // Increase pulse intensity and speed
        this.config.pulseIntensity = this.basePulseIntensity + 
            (cycleDifficulty - 1) * this.pulseIntensityIncrease;
        this.config.pulseSpeed = this.basePulseSpeed + 
            (cycleDifficulty - 1) * this.pulseSpeedIncrease;

        // Adjust base shooting speed based on cycle count
        const cycleCount = Math.floor((this.difficulty - 1) / this.maxDifficulty);
        this.shootInterval = Math.max(
            this.minShootInterval, // Use new minimum interval
            this.baseShootInterval - (cycleCount * 0.1) - (cycleDifficulty * 0.05) // Reduced scaling rates
        );
        
        // Adjust movement speed
        this.config.speed = Math.min(2.0, 0.3 + (cycleCount * 0.1) + (cycleDifficulty * 0.05));

        console.log(`Level ${this.difficulty} (Cycle ${cycleCount + 1}, Difficulty ${cycleDifficulty})`);
        console.log(`Formation Radius: ${this.config.formationRadius}`);
        console.log(`Pulse Intensity: ${this.config.pulseIntensity}`);
        console.log(`Pulse Speed: ${this.config.pulseSpeed}`);

        // Enhanced rotation speed calculation with direction changes
        const baseIncrease = (cycleDifficulty - 1) * this.rotationSpeedIncrease;
        const cycleBonus = cycleCount * this.rotationCycleBonus;
        
        // Calculate new rotation speed
        this.rotationSpeed = Math.min(
            this.maxRotationSpeed,
            this.baseRotationSpeed + baseIncrease + cycleBonus
        );

        // Change rotation direction every other level
        if (this.difficulty % 2 === 0) {
            this.rotationDirection = -1;
        } else {
            this.rotationDirection = 1;
        }

        console.log(`Rotation Speed: ${this.rotationSpeed.toFixed(2)} rad/s`);
    }

    calculateFormationParameters() {
        // Use actual alien count for calculations
        const alienCount = this.aliens.length;
        const minSpacing = Math.PI * 2 * this.config.formationRadius / alienCount;
        
        // Ensure aliens don't overlap
        this.formationSpacing = Math.max(minSpacing, this.config.formationRadius * 0.8);
    }

    // Modify createFormation to adjust alien count without full reset
    createFormation() {
        // Apply new difficulty modifiers before checking count
        this.applyDifficultyModifiers();

        // Base count from pattern, plus a bonus based on difficulty
        const baseCount = this.pattern.spacing?.count || 10;
        const difficultyBonus = Math.floor((this.difficulty - 1) / 2); // +1 ship every 2 levels
        const targetCount = baseCount + difficultyBonus;

        this.alienSlots = [];  // Reset slots structure
        const angleStep = (Math.PI * 2) / targetCount;
        for (let i = 0; i < targetCount; i++) {
            this.alienSlots.push({
                index: i,
                angle: i * angleStep,
                occupied: true
            });
        }

        // Adjust alien array to match target count
        if (this.aliens.length < targetCount) {
            // Add more aliens
            const toAdd = targetCount - this.aliens.length;
            for (let i = 0; i < toAdd; i++) {
                const alien = new Alien(this.ctx, {
                    virtualWidth: this.virtualWidth,
                    virtualHeight: this.virtualHeight,
                    width: 100,
                    height: 100
                });
                this.aliens.push(alien);
            }
        } else if (this.aliens.length > targetCount) {
            // Remove excess aliens from the end
            this.aliens.splice(targetCount);
        }

        // Re-assign slot indices to all current aliens
        this.aliens.forEach((alien, index) => {
            alien.slotIndex = index;
        });

        this.calculateFormationParameters();
    }

    switchPattern(patternName) {
        if (patterns[patternName]) {
            this.pattern = patterns[patternName];
            
            // Set base radius from pattern and re-apply difficulty scaling
            this.baseFormationRadius = this.pattern.spacing?.radius || 150;
            this.applyDifficultyModifiers();

            this.calculateFormationParameters();
            this.time = 0; // Reset time to start pattern from beginning
            
            // Store current positions for smooth transition
            this.aliens.forEach(alien => {
                alien.lastX = alien.x;
                alien.lastY = alien.y;
            });

            // Update spline or functional path
            if (this.pattern.type === 'spline' && this.pattern.points) {
                this.spline = new SplineCurve(
                    this.pattern.points.map(p => ({
                        x: p.x * this.virtualWidth,
                        y: p.y * this.virtualHeight
                    })),
                    true  // Force closed curve
                );
            }
        }
    }

    update(delta) {
        // Update continuous time
        this.time = (this.time + delta) % this.loopDuration;
        const progress = this.time / this.loopDuration;

        // Get central position from pattern
        let pos = { x: this.virtualWidth * 0.5, y: this.virtualHeight * 0.3 };
        if (this.pattern.type === 'spline' && this.spline) {
            pos = this.spline.getPoint(progress);
        } else if (this.pattern.type === 'functional' && this.pattern.func) {
            const normalizedPos = this.pattern.func(progress);
            pos = {
                x: normalizedPos.x * this.virtualWidth,
                y: normalizedPos.y * this.virtualHeight
            };
        }
        
        // Clamp vertical position
        pos.y = Math.min(pos.y, this.maxVerticalPosition);
        pos.y = Math.max(pos.y, this.verticalOffset);

        // Increase pulse amplitude by 50%
        const pulseAmount = Math.sin(this.time * this.config.pulseSpeed * Math.PI * 2) * 
                          (this.config.pulseIntensity * 7.5); // Increased from 5 to 7.5
        const currentRadius = this.config.formationRadius + pulseAmount;

        // Update rotation
        this.currentRotation += this.rotationSpeed * delta;
        this.currentRotation = this.currentRotation % (Math.PI * 2);

        // Position aliens in formation based on their slots
        this.aliens.forEach(alien => {
            if (!alien.isDiving) {
                // Normal formation movement
                const slot = this.alienSlots[alien.slotIndex];
                
                let targetX, targetY;
                
                if (this.pattern.type === 'functional' && this.pattern.spacing?.type === 'circular') {
                    // Circular spacing around the functional path center
                    const orbitAngle = slot.angle + (this.time * 2); // Rotate slots over time
                    // Use the difficulty-scaled formation radius
                    const radius = this.config.formationRadius + (pulseAmount * 0.5);
                    targetX = pos.x + Math.cos(orbitAngle) * radius;
                    targetY = pos.y + Math.sin(orbitAngle) * radius;
                } else {
                    // Default circular formation behavior
                    const rotatedAngle = slot.angle + this.currentRotation;
                    targetX = pos.x + Math.cos(rotatedAngle) * currentRadius;
                    targetY = pos.y + Math.sin(rotatedAngle) * currentRadius;
                }
                
                // Enhanced dive chance check with spacing
                if (Math.random() < this.currentDiveChance * delta && 
                    !this.aliens.some(a => a.isDiving && Math.abs(a.x - targetX) < 100)) {
                    alien.isDiving = true;
                    alien.diveVelocityY = this.currentDiveSpeed;
                    alien.diveVelocityX = 0;
                    alien.diveStartX = targetX;
                    alien.diveStartY = targetY;
                    alien.lastFormationX = targetX;
                    alien.lastFormationY = targetY;
                    
                    // Target player with prediction if available
                    if (this.player) {
                        const dx = this.player.x - targetX;
                        const dy = this.player.y - targetY;
                        const angle = Math.atan2(dy, dx);
                        alien.diveTargetX = this.player.x + (this.player.velocity?.x || 0) * 0.5;
                        alien.diveVelocityX = Math.cos(angle) * this.currentDiveSpeed * this.diveCurveIntensity;
                    }
                } else {
                    // Normal position update
                    // Smooth transition if we have last positions
                    if (alien.lastX !== undefined) {
                        const t = Math.min(1, this.time * 2); // Transition over 0.5 seconds
                        alien.x = this.lerp(alien.lastX, targetX, t);
                        alien.y = this.lerp(alien.lastY, targetY, t);
                        if (t === 1) {
                            delete alien.lastX;
                            delete alien.lastY;
                        }
                    } else {
                        alien.x = targetX;
                        alien.y = targetY;
                    }
                }
            } else {
                // Enhanced diving movement
                alien.diveVelocityY += this.diveAcceleration * delta;
                alien.y += alien.diveVelocityY * delta;

                // Curved path toward player
                if (alien.diveVelocityX) {
                    if (this.player) {
                        // Update dive direction toward player
                        const dx = this.player.x - alien.x;
                        const angle = Math.atan2(0, dx); // Only track X movement
                        alien.diveVelocityX += Math.cos(angle) * this.diveAcceleration * delta * 0.5;
                    }
                    alien.x += alien.diveVelocityX * delta;
                }

                // Return to formation when out of bounds
                if (alien.y > this.virtualHeight + 50 || 
                    alien.x < -50 || 
                    alien.x > this.virtualWidth + 50) {
                    alien.isDiving = false;
                    alien.x = alien.lastFormationX;
                    alien.y = -50;
                }
            }
        });

        // Update shooting
        if (this.config.shootingEnabled && this.aliens.length > 0) {
            this.shootTimer += delta;
            if (this.shootTimer >= this.shootInterval) {
                this.shootTimer = 0;
                this.shoot();
            }
        }

        // Update lasers
        this.lasers = this.lasers.filter(laser => laser.life > 0);
        this.lasers.forEach(laser => laser.update(delta));

        this.explosionEffect.update(delta);
    }

    shoot() {
        // Random alien shoots
        const shooter = this.aliens[Math.floor(Math.random() * this.aliens.length)];
        const laser = new AlienLaser(
            shooter.x + shooter.width/2,
            shooter.y + shooter.height,
            this.audioManager  // Pass the audioManager instance
        );
        this.lasers.push(laser);
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    draw() {
        // Draw debug path first
        if (this.config.showPath) {
            this.drawPath();
        }

        // Draw aliens
        this.aliens.forEach(alien => alien.draw());

        // Draw lasers
        this.lasers.forEach(laser => laser.draw(this.ctx));

        this.explosionEffect.draw();
    }

    drawPath() {
        if (this.path) {
            this.path.drawDebug(this.ctx);
        }
    }

    checkCollision(x, y) {
        for (let alien of this.aliens) {
            if (alien.collidesWith(x, y)) {
                // Create explosion at alien's center
                this.explosionEffect.createExplosion(
                    alien.x + alien.width/2,
                    alien.y + alien.height/2
                );
                
                // Mark the slot as unoccupied but don't remove it
                this.alienSlots[alien.slotIndex].occupied = false;
                
                // Remove only this alien
                this.aliens = this.aliens.filter(a => a !== alien);
                
                // Calculate points with multiplier
                const pointsMultiplier = this.difficulty * (1 + (this.initialAlienCount - this.aliens.length) * 0.1);
                const points = Math.floor(this.pointsBase * pointsMultiplier);
                
                // Replace direct call with callback
                this.onPointsScored(points);
                return true;
            }
        }
        return false;
    }

    checkPlayerCollision(playerX, playerY, playerWidth, playerHeight) {
        return this.lasers.some(laser => {
            const hit = (laser.x >= playerX && 
                        laser.x <= playerX + playerWidth &&
                        laser.y >= playerY &&
                        laser.y <= playerY + playerHeight);
            if (hit) {
                laser.life = 0; // Remove laser on hit
            }
            return hit;
        });
    }
}

export default PatternFormation;
