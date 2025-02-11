import Alien from './alien.js';
import { patterns } from './patterns/formationPatterns.js';
import SplineCurve from './math/SplineCurve.js';
import BezierPath from './math/BezierPath.js';
import AlienLaser from './LaserParticle.js';

class PatternFormation {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth || 1080;
        this.virtualHeight = options.virtualHeight || 1080;
        
        // Initialize config first
        this.config = {
            speed: 0.3,
            radius: 80,
            patternType: 'infinity',
            loopDuration: 10,
            alienCount: 5,
            showPath: true,
            pathPoints: 100, // number of points to draw on path
            formationRadius: 150,  // New separate radius for formation
            pulseIntensity: 0,  // Add pulse intensity control
            pulseSpeed: 1,       // Add pulse speed control
            shootingEnabled: true // Add shooting enabled control
        };

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
        this.createFormation();

        this.patternNames = Object.keys(patterns);
        this.currentPatternIndex = 0;
        this.patternDuration = 15; // seconds per pattern
        this.patternTimer = 0;

        this.respawnDelay = 2; // seconds to wait before respawning
        this.respawnTimer = 0;
        this.isRespawning = false;

        // Create path instead of spline
        this.path = new BezierPath(
            this.virtualWidth * 0.5,    // centerX
            this.virtualHeight * 0.3,    // centerY
            this.virtualWidth * 0.3      // radius
        );

        this.lasers = [];
        this.shootTimer = 0;
        this.shootInterval = 1.0; // Time between shots

        // Delay GUI setup to ensure dat.GUI is loaded
        setTimeout(() => this.setupGUI(), 100);
    }

    setupGUI() {
        if (!window.dat || !window.dat.GUI) {
            console.error('dat.GUI not loaded, retrying...');
            setTimeout(() => this.setupGUI(), 100);
            return;
        }

        try {
            this.gui = new dat.GUI({
                width: 300,
                autoPlace: true,
                closed: false
            });
            
            // Add controls to the GUI
            const folder = this.gui.addFolder('Formation Controls');
            
            // Update speed control to affect loopDuration
            folder.add(this.config, 'speed', 0.1, 2.0)
                .name('Speed')
                .onChange(value => {
                    this.loopDuration = 10 / value; // Adjust base duration by speed
                });

            // Formation radius control
            folder.add(this.config, 'formationRadius', 50, 300)
                .name('Formation Radius')
                .onChange(value => {
                    this.calculateFormationParameters();
                });

            folder.add(this.config, 'alienCount', 3, 10)
                .step(1)
                .name('Alien Count')
                .onChange(value => {
                    // Recreate formation with new count
                    this.createFormation();
                });
            folder.add(this.config, 'loopDuration', 5, 20).name('Loop Duration');
            folder.add(this.config, 'showPath').name('Show Path').onChange((value) => {
                this.config.showPath = value;
            });
            
            folder.add(this.path, 'smoothingFactor', 0.8, 0.99)
                .name('Path Smoothing')
                .onChange(value => {
                    this.path.smoothingFactor = value;
                });
            
            // Add pulse controls
            folder.add(this.config, 'pulseIntensity', 0, 10)
                .name('Pulse Intensity')
                .onChange(() => this.calculateFormationParameters());
                
            folder.add(this.config, 'pulseSpeed', 0.1, 2)
                .name('Pulse Speed');
            
            folder.add(this.config, 'shootingEnabled')
                .name('Alien Shooting');
            
            // Force the folder to be open
            folder.open();
            
            // Ensure GUI is visible
            this.gui.domElement.style.zIndex = '10000';
            document.body.appendChild(this.gui.domElement);
            
            console.log('GUI setup complete');
        } catch (error) {
            console.error('Error setting up GUI:', error);
        }
    }

    calculateFormationParameters() {
        // Use actual alien count for calculations
        const alienCount = this.aliens.length;
        const minSpacing = Math.PI * 2 * this.config.formationRadius / alienCount;
        
        // Ensure aliens don't overlap
        this.formationSpacing = Math.max(minSpacing, this.config.formationRadius * 0.8);
    }

    createFormation() {
        this.aliens = []; // Clear existing aliens
        const count = Math.floor(this.config.alienCount);
        
        for (let i = 0; i < count; i++) {
            const alien = new Alien(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                width: 100,  // Explicit size
                height: 100
            });
            // Start aliens off-screen at the top
            alien.x = this.virtualWidth / 2;
            alien.y = -100;
            this.aliens.push(alien);
        }

        // Recalculate formation parameters for new count
        this.calculateFormationParameters();
    }

    switchPattern(patternName) {
        if (patterns[patternName]) {
            this.pattern = patterns[patternName];
            this.calculateFormationParameters();
            this.time = 0; // Reset time to start pattern from beginning
            
            // Store current positions for smooth transition
            this.aliens.forEach(alien => {
                alien.lastX = alien.x;
                alien.lastY = alien.y;
            });

            // Update spline curve
            this.spline = new SplineCurve(
                this.pattern.points.map(p => ({
                    x: p.x * this.virtualWidth,
                    y: p.y * this.virtualHeight
                })),
                true  // Force closed curve
            );
        }
    }

    update(delta) {
        // Check if all aliens are destroyed
        if (this.aliens.length === 0 && !this.isRespawning) {
            this.isRespawning = true;
            this.respawnTimer = this.respawnDelay;
        }

        // Handle respawn timer
        if (this.isRespawning) {
            this.respawnTimer -= delta;
            if (this.respawnTimer <= 0) {
                // Switch to a new random pattern
                const availablePatterns = this.patternNames.filter(p => p !== this.pattern.type);
                const newPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
                this.switchPattern(newPattern);
                
                // Recreate alien formation
                this.createFormation();
                this.isRespawning = false;
            }
            return; // Skip regular update while respawning
        }

        // Update pattern timer and check for pattern switch
        this.patternTimer += delta;
        if (this.patternTimer >= this.patternDuration) {
            this.patternTimer = 0;
            this.currentPatternIndex = (this.currentPatternIndex + 1) % this.patternNames.length;
            this.switchPattern(this.patternNames[this.currentPatternIndex]);
        }

        // Update continuous time
        this.time = (this.time + delta) % this.loopDuration;
        const progress = this.time / this.loopDuration;

        // Get current position and direction from path
        const pos = this.path.getPoint(progress);
        const tangent = this.path.getTangent(progress);

        // Calculate pulse effect
        const pulseAmount = Math.sin(this.time * this.config.pulseSpeed * Math.PI * 2) * 
                          (this.config.pulseIntensity * 5);
        const currentRadius = this.config.formationRadius + pulseAmount;

        // Position aliens in formation with pulsing radius
        const angleStep = (Math.PI * 2) / this.aliens.length;
        this.aliens.forEach((alien, index) => {
            const formationAngle = index * angleStep;
            const rotationOffset = Math.atan2(this.velocity.y, this.velocity.x);
            
            // Use pulsing radius
            const targetX = pos.x + Math.cos(formationAngle + rotationOffset) * currentRadius;
            const targetY = pos.y + Math.sin(formationAngle + rotationOffset) * currentRadius;
            
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
    }

    shoot() {
        // Random alien shoots
        const shooter = this.aliens[Math.floor(Math.random() * this.aliens.length)];
        const laser = new AlienLaser(
            shooter.x + shooter.width/2,
            shooter.y + shooter.height
        );
        this.lasers.push(laser);
    }

    getPatternPosition(angle, centerX, centerY, radiusX, radiusY) {
        switch(this.pattern.type || 'circle') {
            case 'figure8':
                return {
                    x: centerX + Math.sin(angle * 2) * radiusX,
                    y: centerY + Math.sin(angle) * radiusY
                };
            case 'wave':
                return {
                    x: centerX + Math.cos(angle) * radiusX,
                    y: centerY + Math.sin(angle * 2) * radiusY * 0.5
                };
            case 'circle':
            default:
                return {
                    x: centerX + Math.cos(angle) * radiusX,
                    y: centerY + Math.sin(angle) * radiusY
                };
        }
    }

    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
    }

    drawPath() {
        if (this.path) {
            this.path.drawDebug(this.ctx);
        }
    }

    checkCollision(x, y) {
        for (let alien of this.aliens) {
            if (alien.collidesWith(x, y)) {
                this.aliens = this.aliens.filter(a => a !== alien);
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
