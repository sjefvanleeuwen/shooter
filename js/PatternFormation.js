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
        this.audioManager = options.audioManager; 
        this.shieldEffect = options.shieldEffect;
        
        // Initialize config with new starting values
        this.config = {
            speed: 0.3,
            radius: 80,
            patternType: 'infinity',
            loopDuration: 10,
            alienCount: 6, // Start with lower count
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
        
        // Properly load pattern first so we can check its preferred radius
        this.pattern = patterns[options.pattern || 'circle'];
        
        // Use pattern radius if available, otherwise default to 120
        this.baseFormationRadius = this.pattern.spacing?.radius || 120;
        
        this.config.formationRadius = this.baseFormationRadius;
        this.radiusIncrease = 15; // Reduced from 20 to maintain proportion
        this.basePulseIntensity = 0.75; // Increased from 0.5
        this.pulseIntensityIncrease = 0.75; // Increased from 0.5
        this.basePulseSpeed = 0.5; // Reduced from 1.0
        this.pulseSpeedIncrease = 0.1; // Reduced from 0.2 to maintain ratio

        // Apply difficulty modifiers
        this.applyDifficultyModifiers();

        this.aliens = [];
        // this.pattern already set above
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
        
        // Balanced shooting interval: More engaging from the start
        this.baseShootInterval = 2.8; 
        this.minShootInterval = 0.8; 
        
        // Slightly faster ramp for better early-game pacing
        this.shootInterval = Math.max(
            this.minShootInterval, 
            this.baseShootInterval - (this.difficulty - 1) * 0.4
        );

        this.config.speed = Math.min(1.9, 0.35 + (this.difficulty * 0.09)); 
        this.initialAlienCount = this.config.alienCount; 
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
            this.minShootInterval,
            this.baseShootInterval - (cycleDifficulty - 1) * 0.25 
        );
        
        // Adjust movement speed
        // Starts slower (0.3) and ramps up to ~1.0x speed max
        this.config.speed = 0.3 + (cycleDifficulty * 0.07);

        console.log(`Level ${this.difficulty} (Cycle ${cycleCount + 1}, Difficulty ${cycleDifficulty})`);
        console.log(`Formation Radius: ${this.config.formationRadius}`);
        console.log(`Pulse Intensity: ${this.config.pulseIntensity}`);
        console.log(`Pulse Speed: ${this.config.pulseSpeed}`);
        console.log(`Movement Speed: ${this.config.speed}`);

        // Enhanced rotation speed calculation with direction changes
        // Reduced base rotation speed to match slower movement
        const baseIncrease = (cycleDifficulty - 1) * (this.rotationSpeedIncrease * 0.5);
        const cycleBonus = cycleCount * this.rotationCycleBonus;
        
        // Calculate new rotation speed
        this.rotationSpeed = Math.min(
            this.maxRotationSpeed,
            (this.baseRotationSpeed * 0.6) + baseIncrease + cycleBonus
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

    createFormations() {
        // ... unused ...
    }

    spawnMinion() {
        const x = Math.random() * (this.virtualWidth - 100) + 50;
        const alien = new Alien(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            x: x,
            y: -150,
            type: 'kamikaze',
            width: 60,
            height: 60,
            health: 1 // One shot kill
        });
        
        alien.isMinion = true;
        alien.diveVelocityY = 700 + (this.difficulty * 30); // Fast swoosh
        alien.diveVelocityX = (Math.random() - 0.5) * 400; // Random angle
        
        this.aliens.push(alien);
    }

    // Modify createFormation to adjust alien count without full reset
    createFormation() {
        // Apply new difficulty modifiers before checking count
        this.applyDifficultyModifiers();

        // Base count from pattern, slightly more ships to start
        const baseCount = this.pattern.spacing?.count || 8;
        
        // Increase wave size significantly to make rounds longer
        // Previously: +1 ship every 2 levels
        // Now: +1 ship every level + base increase of 2
        // If difficulty is 1: 8 + 2 + 0 = 10 ships (Old: 8)
        // If difficulty is 5: 8 + 2 + 4 = 14 ships (Old: 10)
        // If difficulty is 10: 8 + 2 + 9 = 19 ships (Old: 12)
        const difficultyBonus = Math.floor(this.difficulty - 1) + 2; 
        const targetCount = baseCount + difficultyBonus;

        this.alienSlots = [];  // Reset slots structure
        const spacingConfig = this.pattern.spacing || {};
        const type = spacingConfig.type || 'circular';
        const spacing = spacingConfig.spacing || 100;
        
        this.maxFormationOffset = 0; // Track max offset for screen clamping

        for (let i = 0; i < targetCount; i++) {
            let slot = { index: i, occupied: true, offsetX: 0, offsetY: 0, angle: 0, radiusMultiplier: 1.0 };
            
            if (type === 'circular') {
                if (this.pattern.isBoss) {
                    if (i === 0) {
                        slot.angle = 0;
                        slot.radiusMultiplier = 0; // Boss stays at the center of the path
                    } else {
                        slot.angle = (i - 1) * (Math.PI * 2 / (targetCount - 1));
                        slot.radiusMultiplier = 1.0; // Escorts orbit the boss
                    }
                } else {
                    slot.angle = i * (Math.PI * 2 / targetCount);
                    slot.radiusMultiplier = 1.0;
                }
                this.maxFormationOffset = this.config.formationRadius;
            } else if (type === 'grid') {
                const cols = spacingConfig.cols || 4;
                const row = Math.floor(i / cols);
                const col = i % cols;
                slot.offsetX = (col - (cols - 1) / 2) * spacing;
                slot.offsetY = (row - (Math.ceil(targetCount / cols) - 1) / 2) * spacing;
            } else if (type === 'v_shape') {
                const half = Math.floor(targetCount / 2);
                const dist = i - half;
                
                // Cap spacing to prevent wide V from going offscreen
                let dynamicSpacing = spacing;
                if (half * spacing > 350) {
                    dynamicSpacing = 350 / half;
                }
                
                slot.offsetX = dist * dynamicSpacing;
                slot.offsetY = Math.abs(dist) * dynamicSpacing * 0.8;
            } else if (type === 'cross') {
                const mid = Math.floor(targetCount / 2);
                const horizArmLen = Math.floor(mid/2);
                
                // Dynamic spacing to ensure cross fits in screen regardless of ship count
                // Max radius approx 300px
                let dynamicSpacing = spacing;
                if (horizArmLen * spacing > 300) {
                    dynamicSpacing = 300 / max(1, horizArmLen);
                }

                if (i <= mid) { // Horizontal
                    slot.offsetX = (i - horizArmLen) * dynamicSpacing;
                    slot.offsetY = 0;
                } else { // Vertical
                    const vertArmLen = Math.floor((targetCount-mid)/2);
                    slot.offsetX = 0;
                    slot.offsetY = (i - mid - vertArmLen) * dynamicSpacing;
                }
            }
            
            this.maxFormationOffset = Math.max(this.maxFormationOffset, Math.abs(slot.offsetX), Math.abs(slot.offsetY));
            this.alienSlots.push(slot);
        }

        // Adjust alien array to match target count
        if (this.aliens.length < targetCount) {
            // Add more aliens
            const originalCount = this.aliens.length;
            const toAdd = targetCount - originalCount;
            for (let i = 0; i < toAdd; i++) {
                const globalIndex = originalCount + i;
                let alienType = 'normal';
                
                if (this.pattern.isBoss) {
                    alienType = (globalIndex === 0) ? 'boss' : 'normal';
                } else {
                    // Gradual introduction of Elites (Medium Bosses)
                    // Level 1-9: Normal only (Extended "Tutorial" phase)
                    // Level 10-14: Lead into boss
                    if (this.difficulty >= 10 && globalIndex % 5 === 0) {
                        alienType = 'elite';
                    } else if (this.difficulty >= 12 && (globalIndex + 2) % 5 === 0) {
                        alienType = 'kamikaze';
                    }
                }

                const alienOptions = {
                    virtualWidth: this.virtualWidth,
                    virtualHeight: this.virtualHeight,
                    width: 100,
                    height: 100,
                    type: alienType
                };

                if (alienType === 'boss') {
                    // Significant health boost for boss
                    // Reduced to ~1/3 of previous formula per user request
                    // Oldest: 1500+500d. Previous: 200+100d. New: 70 + 35d
                    alienOptions.health = 70 + (this.difficulty * 35);
                }

                const alien = new Alien(this.ctx, alienOptions);
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
        // Update continuous time with difficulty-based speed
        // Use defaults if speed is not set
        const speed = this.config.speed || 1.0;
        this.time = (this.time + (delta * speed)) % this.loopDuration;
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
        
        // Clamp position to stay on screen
        const shipHalfWidth = this.pattern.isBoss ? 200 : 50;
        
        // Calculate max possible pulse expansion
        // pulseAmount = 1.0 + (pulseIntensity * 7.5) * 0.5 (used in radius calc)
        // Correct formula: (formationRadius + maxPulse) * maxRadiusMultiplier
        const maxPulseAmount = (this.config.pulseIntensity * 7.5) * 0.5;
        const formationBase = (this.maxFormationOffset || this.config.formationRadius);
        
        // Use a more generous effective radius for safety calculation
        // This ensures even the furthest possible excursion is accounted for
        const effectiveRadius = formationBase + maxPulseAmount + 40; 
        
        // Dynamic horizontal margin
        const totalMargin = shipHalfWidth + effectiveRadius + 20; 
        
        // Horizontal Clamping
        pos.x = Math.max(totalMargin, Math.min(this.virtualWidth - totalMargin, pos.x));

        // Vertical Clamping
        // Ensure formation never dips below safe zone (player area)
        // Player is at bottom, safe zone around 85% height
        const maxSafeY = (this.virtualHeight * 0.85) - effectiveRadius - shipHalfWidth;
        const clampedMaxY = Math.min(this.maxVerticalPosition, maxSafeY);
        
        pos.y = Math.max(this.verticalOffset, Math.min(clampedMaxY, pos.y));
        
        // Update rotation
        this.currentRotation += this.rotationSpeed * delta * this.rotationDirection;
        this.currentRotation = this.currentRotation % (Math.PI * 2);

        // Increase pulse amplitude
        const pulseAmount = Math.sin(this.time * this.config.pulseSpeed * Math.PI * 2) * 
                          (this.config.pulseIntensity * 7.5);

        // Boss Minion Spawning
        if (this.pattern.isBoss) {
            const boss = this.aliens.find(a => a.type === 'boss');
            if (boss) {
                this.minionTimer = (this.minionTimer || 0) + delta;
                const spawnRate = Math.max(0.15, 0.6 - (this.difficulty * 0.04));
                
                if (this.minionTimer > spawnRate) {
                    this.minionTimer = 0;
                    this.spawnMinion();
                }
            }
        }

        // Position aliens
        this.aliens.forEach(alien => {
            alien.update(delta); 

            // Handle Minions
            if (alien.isMinion) {
                alien.y += alien.diveVelocityY * delta;
                alien.x += alien.diveVelocityX * delta;
                
                if (alien.y > this.virtualHeight + 100 || alien.x < -100 || alien.x > this.virtualWidth + 100) {
                    alien.shouldRemove = true;
                }
                return;
            }

            if (!alien.isDiving) {
                // Normal formation movement
                const slot = this.alienSlots[alien.slotIndex];
                
                if (!slot) return;
                
                let targetX, targetY;
                const spacingType = this.pattern.spacing?.type || 'circular';
                
                if (spacingType === 'circular') {
                    const orbitAngle = slot.angle + (this.time * 2);
                    const radius = (this.config.formationRadius + (pulseAmount * 0.5)) * (slot.radiusMultiplier ?? 1.0);
                    targetX = pos.x + Math.cos(orbitAngle) * radius;
                    targetY = pos.y + Math.sin(orbitAngle) * radius;
                } else {
                    targetX = pos.x + slot.offsetX;
                    targetY = pos.y + slot.offsetY;
                }
                
                // Rotation transform
                if (this.currentRotation !== 0) {
                    const rx = targetX - pos.x;
                    const ry = targetY - pos.y;
                    const rot = this.currentRotation;
                    targetX = pos.x + rx * Math.cos(rot) - ry * Math.sin(rot);
                    targetY = pos.y + rx * Math.sin(rot) + ry * Math.cos(rot);
                }
                
                // Dive check
                let diveChance = this.currentDiveChance;
                if (alien.type === 'kamikaze') diveChance *= 8;
                if (alien.type === 'boss') diveChance = 0;

                if (Math.random() < diveChance * delta && 
                    !this.aliens.some(a => a.isDiving && Math.abs(a.x - targetX) < 100)) {
                    alien.isDiving = true;
                    alien.diveVelocityY = alien.type === 'kamikaze' ? this.currentDiveSpeed * 1.5 : this.currentDiveSpeed;
                    alien.diveVelocityX = 0;
                    alien.diveStartX = targetX;
                    alien.diveStartY = targetY;
                    alien.lastFormationX = targetX;
                    alien.lastFormationY = targetY;
                    
                    if (this.player) {
                        const dx = this.player.x - targetX;
                        const dy = this.player.y - targetY;
                        const angle = Math.atan2(dy, dx);
                        const intensity = alien.type === 'kamikaze' ? 1.5 : this.diveCurveIntensity;
                        alien.diveVelocityX = Math.cos(angle) * alien.diveVelocityY * intensity;
                    }
                } else {
                    // Normal position update
                    if (alien.lastX !== undefined) {
                        const t = Math.min(1, this.time * 2);
                        alien.x = this.lerp(alien.lastX, targetX - alien.width / 2, t);
                        alien.y = this.lerp(alien.lastY, targetY - alien.height / 2, t);
                        if (t === 1) {
                            delete alien.lastX;
                            delete alien.lastY;
                        }
                    } else {
                        alien.x = targetX - alien.width / 2;
                        alien.y = targetY - alien.height / 2;
                    }
                }
            } else {
                // Diving movement
                alien.diveVelocityY += this.diveAcceleration * delta;
                alien.y += alien.diveVelocityY * delta;

                if (alien.diveVelocityX) {
                    if (this.player) {
                        const dx = this.player.x - alien.x;
                        const angle = Math.atan2(0, dx); 
                        alien.diveVelocityX += Math.cos(angle) * this.diveAcceleration * delta * 0.5;
                    }
                    alien.x += alien.diveVelocityX * delta;
                }

                if (alien.y > this.virtualHeight + 50 || 
                    alien.x < -50 || 
                    alien.x > this.virtualWidth + 50) {
                    alien.isDiving = false;
                    alien.x = alien.lastFormationX;
                    alien.y = -50;
                }
            }
        });

        // Remove off-screen minions
        this.aliens = this.aliens.filter(a => !a.shouldRemove);

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
        // Random alien shoots, but prioritize special types
        const candidates = this.aliens.filter(a => !a.isDiving);
        if (candidates.length === 0) return;
        
        const boss = candidates.find(a => a.type === 'boss');
        if (boss) {
            // Reduced to a 3-way spread to prevent "too many bullets"
            for (let i = -1; i <= 1; i++) {
                const laser = new AlienLaser(
                    boss.x + boss.width/2 + i * 60,
                    boss.y + boss.height,
                    this.audioManager
                );
                laser.vx = i * 150; // Wider spread, fewer total projectiles
                this.lasers.push(laser);
            }
            return;
        }

        const shooter = candidates[Math.floor(Math.random() * candidates.length)];
        const laser = new AlienLaser(
            shooter.x + shooter.width/2,
            shooter.y + shooter.height,
            this.audioManager  // Pass the audioManager instance
        );
        
        if (shooter.type === 'elite') {
            // Elites fire faster or multiple lasers? Let's give them a slight spread
            const laser2 = new AlienLaser(shooter.x+shooter.width/2, shooter.y+shooter.height, this.audioManager);
            laser.vx = -50;
            laser2.vx = 50;
            this.lasers.push(laser, laser2);
        } else {
            this.lasers.push(laser);
        }
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
                // Flash the alien white on hit
                alien.hitFlash = 0.1; 

                alien.health--;
                
                if (alien.health > 0) {
                    // Create energy shield ring surrounding the ship
                    if (this.shieldEffect) {
                        this.shieldEffect.createRipple(
                            alien.x + alien.width/2, 
                            alien.y + alien.height/2,
                            alien.type === 'elite' ? '#00eaff' : (alien.type === 'boss' ? '#00ffff' : '#00aaff'),
                            alien.width * 0.7 // Pass ship size for ring scaling
                        );
                    }
                } else {
                    // Configuration based on size/type
                    const isBoss = alien.type === 'boss';
                    const isElite = alien.type === 'elite';
                    const explosionCount = isBoss ? 5 : (isElite ? 2 : 1);
                    
                    if (isBoss && this.shieldEffect) {
                        // Make sure the death flare is explicitly white/blue and large enough
                        this.shieldEffect.createRipple(
                            alien.x + alien.width/2, 
                            alien.y + alien.height/2, 
                            '#ffffff',
                            alien.width * 1.25 // Explicitly larger flare
                        );
                    }

                    // Configuration based on size/type
                    const explosionConfig = {
                        pitch: isBoss ? 0.35 : (isElite ? 0.6 : 1.1),
                        volume: isBoss ? 1.0 : (isElite ? 0.8 : 0.6),
                        decay: isBoss ? 4.5 : (isElite ? 1.8 : 0.8), // Massive decay for bosses
                        particleSize: isBoss ? 120 : (isElite ? 60 : 32),
                        isHeavy: isBoss || isElite,
                        count: isBoss ? 24 : (isElite ? 16 : 12)
                    };

                    for (let i = 0; i < explosionCount; i++) {
                        this.explosionEffect.createExplosion(
                            alien.x + alien.width/2 + (Math.random() - 0.5) * alien.width * 0.5,
                            alien.y + alien.height/2 + (Math.random() - 0.5) * alien.height * 0.5,
                            explosionConfig
                        );
                    }
                    
                    // Mark the slot as unoccupied
                    if (this.alienSlots[alien.slotIndex]) {
                        this.alienSlots[alien.slotIndex].occupied = false;
                    }
                    
                    // Calculate points with multipliers
                    let basePoints = this.pointsBase;
                    if (alien.type === 'elite') basePoints *= 5;
                    if (alien.type === 'kamikaze') basePoints *= 2;
                    if (alien.type === 'boss') basePoints *= 50;

                    const pointsMultiplier = this.difficulty * (1 + (this.initialAlienCount - this.aliens.length) * 0.1);
                    const points = Math.floor(basePoints * pointsMultiplier);
                    
                    // Remove the alien
                    this.aliens = this.aliens.filter(a => a !== alien);
                    this.onPointsScored(points);
                    return { hit: true, killed: true, type: alien.type };
                }
                
                return { hit: true, killed: false, type: alien.type };
            }
        }
        return { hit: false };
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
