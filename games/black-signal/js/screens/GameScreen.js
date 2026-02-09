import Enemy from '../entities/Enemy.js';
import GLBSpriteRenderer from '../rendering/GLBSpriteRenderer.js';

export default class GameScreen {
    constructor(ctx, options) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth;
        this.virtualHeight = options.virtualHeight;

        // Player properties
        this.player = {
            x: 200,
            y: 850,
            width: 64,
            height: 128,
            vx: 0,
            vy: 0,
            speed: 400,
            jumpForce: -1200,
            onGround: false,
            color: '#00ffcc',
            health: 10,
            maxHealth: 10,
            invuln: 0,
            attackCooldown: 0,
            animTime: 0,
            facing: 1
        };

        // 3D player renderer (GLB model rendered from side view)
        console.log('--- GameScreen: Creating GLBSpriteRenderers ---');
        this.playerRenderer = new GLBSpriteRenderer({
            width: 256,
            height: 256,
            modelPath: 'games/black-signal/3d/player.glb',
            showDebug: false
        });

        // 3D enemy renderer (using player model as placeholder if no enemy.glb exists)
        this.enemyRenderer = new GLBSpriteRenderer({
            width: 128,
            height: 128,
            modelPath: 'games/black-signal/3d/player.glb' 
        });

        this.pulses = []; // Player projectiles
        this.enemies = [
            new Enemy(ctx, { x: 800, y: 908, patrolRange: 300, renderer: this.enemyRenderer }),
            new Enemy(ctx, { x: 1500, y: 908, patrolRange: 400, renderer: this.enemyRenderer }),
            new Enemy(ctx, { x: 2000, y: 708, patrolRange: 100, renderer: this.enemyRenderer }), // On a platform area
            new Enemy(ctx, { x: 2800, y: 908, patrolRange: 500, renderer: this.enemyRenderer })
        ];

        this.gravity = 2500;
        this.groundY = 956;
        this.cameraX = 0;

        // Load assets
        this.buildingImages = [];
        for (let i = 1; i <= 6; i++) {
            const img = new Image();
            img.src = `games/black-signal/sprites/building-${i}.png`;
            this.buildingImages.push(img);
        }

        this.treeImg = new Image();
        this.treeImg.src = 'games/black-signal/sprites/tree-1.png';

        this.mountainImg = new Image();
        this.mountainImg.src = 'games/black-signal/sprites/mountain-1.png';

        this.groundImg = new Image();
        this.groundImg.src = 'games/black-signal/sprites/ground-1.png';

        this.grassImg = new Image();
        this.grassImg.src = 'games/black-signal/sprites/grass-2.png';

        this.shipImg = new Image();
        this.shipImg.src = 'games/black-signal/sprites/space-ship-1.png';

        // Background Ships (Between stars and clouds)
        this.spaceships = [
            { x: 1200, y: 100, speed: 120, scale: 0.15, dir: -1 }, // Now Right to Left
            { x: 200, y: 250, speed: 80, scale: 0.1, dir: 1 },    // Now Left to Right
            { x: 1500, y: 150, speed: 150, scale: 0.18, dir: -1 } // Now Right to Left
        ];

        // Moving Platforms
        this.platforms = [
            { x: 400, y: 756, w: 200, h: 32, vx: 150, vy: 0, range: 400, startX: 400, startY: 756 },
            { x: 1000, y: 606, w: 200, h: 32, vx: 0, vy: 100, range: 200, startX: 1000, startY: 606 },
            { x: 1600, y: 756, w: 200, h: 32, vx: -200, vy: 0, range: 500, startX: 1600, startY: 756 },
            { x: 2200, y: 556, w: 250, h: 32, vx: 120, vy: 50, range: 300, startX: 2200, startY: 556 }
        ];

        this.onPlatform = null; // Track if player is on a specific platform

        // Massive Atmospheric Drifters
        this.atmosphereLayers = [
            { speedX: 10, scrollFactor: 0.03, color: '#1a2b45', opacity: 0.25, scale: 2.5, count: 3 }, // Huge deep blue drift
            { speedX: 22, scrollFactor: 0.08, color: '#252f3d', opacity: 0.3, scale: 2.0, count: 4 }   // Large charcoal drift
        ];
        this.atmosphereCanvases = this.atmosphereLayers.map(l => this.createCloudTexture(l));
        this.atmosphereOffsets = this.atmosphereLayers.map(() => Math.random() * 2000);

        // Pre-render sky gradient to a canvas because WebGLRenderer stub doesn't support them
        this.skyCanvas = this.createSkyCanvas();

        // Starfield (Absolute Background)
        this.stars = this.generateStars(200);
        this.starOffset = 0;

        // Pre-render seamless mountain strip once image loads
        this.mountainCanvas = null;
        this.mountainScrollFactor = 0.1;
        this.mountainImg.onload = () => {
            this.mountainCanvas = this.createMountainCanvas();
        };

        // Pre-render seamless ground strip once image loads
        this.groundCanvas = null;
        this.groundImg.onload = () => {
            this.groundCanvas = this.createGroundCanvas();
        };

        // Pre-render seamless grass strip once image loads
        this.grassCanvas = null;
        this.grassImg.onload = () => {
            this.grassCanvas = this.createGrassCanvas();
        };

        // Parallax Layers (from back to front)
        this.layers = [
            { 
                name: 'buildings', 
                scrollFactor: 0.2, 
                color: '#1a1f26', 
                elements: this.generateRocks(12, 600, 1200, 1200, 6) 
            },
            { 
                name: 'trees', 
                scrollFactor: 0.5, 
                color: '#242a33', 
                elements: this.generateRocks(20, 150, 300, 600) 
            },
            { 
                name: 'world', 
                scrollFactor: 1.0, 
                color: '#444', 
                elements: [] // Main objects go here if we had them
            },
            { 
                name: 'grass', 
                scrollFactor: 0.9, 
                color: '#2d3640', 
                elements: this.generateRocks(30, 10, 30, 50) 
            }
        ];
    }

    generateRocks(count, minW, maxW, maxH, typesCount = 1) {
        const elements = [];
        const spacing = 6000 / count;
        for (let i = 0; i < count; i++) {
            // Randomize spacing more: allow up to 40% position jitter
            const jitter = (Math.random() - 0.5) * spacing * 0.8;
            elements.push({
                x: i * spacing + jitter,
                w: minW + Math.random() * (maxW - minW),
                h: 50 + Math.random() * maxH,
                type: Math.floor(Math.random() * typesCount),
                mirrored: Math.random() > 0.5 // Randomly mirror
            });
        }
        return elements;
    }

    generateStars(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.virtualWidth,
                y: Math.random() * this.virtualHeight,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.5,
                pulse: Math.random() * Math.PI * 2 // Random starting phase for pulsing
            });
        }
        return stars;
    }

    update(dt) {
        this._lastDt = dt;

        // Update Timers
        if (this.player.invuln > 0) this.player.invuln -= dt;
        if (this.player.attackCooldown > 0) this.player.attackCooldown -= dt;

        // Update Atmosphere drift
        this.atmosphereLayers.forEach((layer, i) => {
            this.atmosphereOffsets[i] = (this.atmosphereOffsets[i] + layer.speedX * dt) % 2000;
        });

        // Update Background Ships
        this.spaceships.forEach(ship => {
            ship.x += ship.speed * ship.dir * dt;
            
            const sx = ship.x - (this.cameraX * 0.02);

            // If moving Right (dir 1), reset when far off the RIGHT of the screen
            if (ship.dir === 1 && sx > this.virtualWidth + 600) {
                ship.x = (this.cameraX * 0.02) - 600 - Math.random() * 1000;
                ship.y = 50 + Math.random() * 300;
            } 
            // If moving Left (dir -1), reset when far off the LEFT of the screen
            else if (ship.dir === -1 && sx < -600) {
                ship.x = (this.cameraX * 0.02) + this.virtualWidth + 600 + Math.random() * 1000;
                ship.y = 50 + Math.random() * 300;
            }
        });

        // Update Platforms
        this.platforms.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Simple oscillation
            if (p.vx !== 0 && Math.abs(p.x - p.startX) > p.range) {
                p.vx *= -1;
                p.x = p.startX + Math.sign(p.x - p.startX) * p.range;
            }
            if (p.vy !== 0 && Math.abs(p.y - p.startY) > p.range) {
                p.vy *= -1;
                p.y = p.startY + Math.sign(p.y - p.startY) * p.range;
            }
        });

        // Horizontal Movement
        const input = window.game?.inputManager;
        if (!input || !input.keys) return;
        
        this.player.vx = 0;
        if (input.keys.has('ArrowLeft') || input.keys.has('a')) this.player.vx = -this.player.speed;
        if (input.keys.has('ArrowRight') || input.keys.has('d')) this.player.vx = this.player.speed;

        // Attack (Pulse)
        if ((input.keys.has('f') || input.keys.has('j') || input.keys.has('Shift')) && this.player.attackCooldown <= 0) {
            this.shootPulse();
        }

        // Jump
        if ((input.keys.has('ArrowUp') || input.keys.has('w') || input.keys.has(' ')) && this.player.onGround) {
            this.player.vy = this.player.jumpForce;
            this.player.onGround = false;
            this.onPlatform = null;
        }

        // Physics
        this.player.vy += this.gravity * dt;
        
        // Apply platform velocity if riding
        if (this.onPlatform) {
            this.player.x += (this.player.vx + this.onPlatform.vx) * dt;
            this.player.y += this.onPlatform.vy * dt;
        } else {
            this.player.x += this.player.vx * dt;
        }
        
        // Base vertical movement (gravity/velocity)
        if (!this.onPlatform) {
            this.player.y += this.player.vy * dt;
        }

        // Collision Checks
        let wasOnGround = this.player.onGround;
        this.player.onGround = false;
        let currentPlatform = null;

        // Platform Collisions (One-way: fall through from bottom)
        if (this.player.vy >= 0) { // Only collide when falling or stationary vertically
            for (const p of this.platforms) {
                const px = this.player.x + this.player.width * 0.2; // Narrower collision box for player
                const pw = this.player.width * 0.6;
                
                if (px < p.x + p.w &&
                    px + pw > p.x &&
                    this.player.y + this.player.height >= p.y &&
                    this.player.y + this.player.height <= p.y + p.h + this.player.vy * dt + 10) {
                    
                    this.player.y = p.y - this.player.height;
                    this.player.vy = 0;
                    this.player.onGround = true;
                    currentPlatform = p;
                    break;
                }
            }
        }
        this.onPlatform = currentPlatform;

        // World Bounds / Floor
        if (this.player.y + this.player.height > this.groundY) {
            this.player.y = this.groundY - this.player.height;
            this.player.vy = 0;
            this.player.onGround = true;
            this.onPlatform = null;
        }

        // Update Projectiles
        this.pulses.forEach((pulse, index) => {
            pulse.x += pulse.vx * dt;
            pulse.life -= dt;
            if (pulse.life <= 0) this.pulses.splice(index, 1);
            
            // Check hit enemies
            this.enemies.forEach(enemy => {
                if (!enemy.isDead && 
                    pulse.x < enemy.x + enemy.width &&
                    pulse.x + 20 > enemy.x &&
                    pulse.y < enemy.y + enemy.height &&
                    pulse.y + 20 > enemy.y) {
                    
                    enemy.takeDamage();
                    pulse.life = 0; // Destroy pulse on hit
                }
            });
        });

        // Update Enemies
        this.enemies.forEach(enemy => {
            if (enemy.isDead) return;
            enemy.update(dt, this.player);

            // Check hit player
            if (this.player.invuln <= 0 &&
                this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y) {
                
                this.player.health--;
                this.player.invuln = 1.0; // 1 second invuln
                this.player.vy = -600; // Knockback jump
                this.player.vx = (this.player.x < enemy.x ? -1 : 1) * 400;
            }
        });

        // Camera follow
        const targetCamX = this.player.x - this.virtualWidth / 2;
        this.cameraX += (targetCamX - this.cameraX) * 0.1;
    }

    shootPulse() {
        const dir = (this.player.vx >= 0) ? 1 : -1;
        this.pulses.push({
            x: this.player.x + (dir > 0 ? this.player.width : -20),
            y: this.player.y + this.player.height / 2 - 10,
            vx: dir * 800,
            life: 1.5
        });
        this.player.attackCooldown = 0.3;
    }

    draw() {
        // Clear background (Deep space)
        this.ctx.fillStyle = '#020408';
        this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

        // Draw Starfield (rendered first)
        this.drawStars();

        // Draw Spaceships (Behind clouds, in front of stars)
        this.drawSpaceships();

        // Draw Sky Gradient from pre-rendered canvas
        if (this.skyCanvas) {
            this.ctx.drawImage(this.skyCanvas, 0, 0, this.virtualWidth, this.groundY);
        }

        // Draw Atmospheric Clouds
        this.drawAtmosphere();

        // Draw Mountains (behind buildings)
        this.drawMountains();

        // Draw Layers (Buildings and Trees are behind)
        this.drawParallaxLayer(this.layers.find(l => l.name === 'buildings'));
        this.drawParallaxLayer(this.layers.find(l => l.name === 'trees'));

        // Main World
        this.drawGround();
        this.drawGrass();
        this.drawPlatforms();
        this.drawEnemies();
        this.drawPulses();
        this.drawPlayer();

        // Foreground Grass (in front of player, smaller scale)
        this.drawForegroundGrass();
        
        // UI Overlay (Optional)
        this.drawUI();
    }

    drawEnemies() {
        this.enemies.forEach(enemy => enemy.draw(this.ctx, this.cameraX));
    }

    drawPulses() {
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffcc';
        this.pulses.forEach(pulse => {
            this.ctx.fillRect(pulse.x, pulse.y, 20, 20);
        });
        this.ctx.restore();
    }

    drawUI() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Ensure Screen Space
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '32px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('SIGNAL: STABLE', 50, 70);
        
        // Under Construction text
        this.ctx.textAlign = 'center';
        this.ctx.fillText('UNDER CONSTRUCTION', this.virtualWidth / 2, 120);
        
        // Health Bar UI
        this.ctx.textAlign = 'left';
        const hbWidth = 400;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(50, 95, hbWidth, 25);
        this.ctx.fillStyle = 'white'; 
        this.ctx.fillRect(50, 95, hbWidth * (Math.max(0, this.player.health) / this.player.maxHealth), 25);
        
        this.ctx.restore();
    }

    drawParallaxLayer(layer) {
        if (!layer) return;
        this.ctx.fillStyle = layer.color;
        const worldWidth = 6000;
        
        layer.elements.forEach(el => {
            // Calculate screen position with wrapping
            let x = (el.x - this.cameraX * layer.scrollFactor) % worldWidth;
            if (x < -el.w) x += worldWidth;
            if (x > this.virtualWidth) x -= worldWidth;

            if (layer.name === 'buildings') {
                const img = this.buildingImages[el.type];
                if (img && img.complete) {
                    this.ctx.save();
                    if (el.mirrored) {
                        this.ctx.translate(x + el.w, 0);
                        this.ctx.scale(-1, 1);
                        this.ctx.drawImage(img, 0, this.groundY - el.h, el.w, el.h);
                    } else {
                        this.ctx.drawImage(img, x, this.groundY - el.h, el.w, el.h);
                    }
                    this.ctx.restore();
                } else {
                    this.ctx.fillRect(x, this.groundY - el.h, el.w, el.h);
                }
            } else if (layer.name === 'trees' && this.treeImg.complete) {
                this.ctx.save();
                if (el.mirrored) {
                    this.ctx.translate(x + el.w, 0);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(this.treeImg, 0, this.groundY - el.h, el.w, el.h);
                } else {
                    this.ctx.drawImage(this.treeImg, x, this.groundY - el.h, el.w, el.h);
                }
                this.ctx.restore();
            } else {
                this.ctx.fillRect(x, this.groundY - el.h, el.w, el.h);
            }
        });
    }

    drawGround() {
        if (this.groundCanvas) {
            const img = this.groundImg;
            const tileW = img.width;
            const groundH = this.virtualHeight - this.groundY;
            const drawH = groundH;

            // Scroll with the world (1:1 with camera)
            let offset = (-this.cameraX) % tileW;
            if (offset > 0) offset -= tileW;

            this.ctx.save();
            for (let x = offset; x < this.virtualWidth; x += tileW) {
                this.ctx.drawImage(this.groundCanvas, 0, 0, tileW, img.height, x, this.groundY, tileW, drawH);
            }
            this.ctx.restore();
        } else {
            // Fallback checkerboard
            this.ctx.save();
            this.ctx.translate(-this.cameraX, 0);
            const segmentSize = 256;
            const startVisible = Math.floor(this.cameraX / segmentSize);
            const endVisible = Math.ceil((this.cameraX + this.virtualWidth) / segmentSize);
            for (let i = startVisible; i <= endVisible; i++) {
                this.ctx.fillStyle = i % 2 === 0 ? '#111' : '#151515';
                this.ctx.fillRect(i * segmentSize, this.groundY, segmentSize, this.virtualHeight - this.groundY);
                this.ctx.strokeStyle = '#222';
                this.ctx.strokeRect(i * segmentSize, this.groundY, segmentSize, this.virtualHeight - this.groundY);
            }
            this.ctx.restore();
        }
    }

    drawPlatforms() {
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        this.platforms.forEach(p => {
            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(p.x + 5, p.y + 5, p.w, p.h);

            // Platform Body
            this.ctx.fillStyle = '#444';
            this.ctx.fillRect(p.x, p.y, p.w, p.h);

            // Tech highlight
            this.ctx.strokeStyle = '#00ffcc';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(p.x, p.y, p.w, p.h);
            
            // "Signal" pattern on platform
            this.ctx.fillStyle = '#00ffcc22';
            const blocks = 4;
            const blockW = p.w / blocks;
            for(let i = 0; i < blocks; i++) {
                if ((Math.floor(p.x / 50) + i) % 2 === 0) {
                    this.ctx.fillRect(p.x + i * blockW, p.y, blockW, p.h);
                }
            }
        });
        
        this.ctx.restore();
    }

    drawPlayer() {
        // Determine animation state
        let state = 'idle';
        if (!this.player.onGround) {
            state = this.player.vy < 0 ? 'jump' : 'fall';
        } else if (Math.abs(this.player.vx) > 0.1) {
            state = 'walk';
        }

        // Update facing only when moving
        if (this.player.vx > 0.1) this.player.facing = 1;
        else if (this.player.vx < -0.1) this.player.facing = -1;
        
        const facing = this.player.facing;
        this.player.animTime += (this._lastDt || 1/60);
        const frame = this.playerRenderer.getFrame(state, this.player.animTime);

        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        // Blink if invuln
        if (this.player.invuln > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
            this.ctx.globalAlpha = 0.5;
        }

        // Draw the 3D-rendered player sprite
        const drawW = 220; // Slightly larger
        const drawH = 220;
        if (frame) {
            this.ctx.save();
            if (facing < 0) {
                this.ctx.translate(this.player.x + this.player.width / 2 + drawW / 2, 0);
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(frame, 0, this.player.y + this.player.height - drawH + 10, drawW, drawH);
            } else {
                this.ctx.drawImage(
                    frame,
                    this.player.x + this.player.width / 2 - drawW / 2,  // Center on player
                    this.player.y + this.player.height - drawH + 10,    // Adjusted offset
                    drawW,
                    drawH
                );
            }
            this.ctx.restore();
        } else {
            // Fallback: old colored block
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.player.color;
            this.ctx.fillStyle = this.player.color;
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }
        
        this.ctx.restore();
    }

    createMountainCanvas() {
        const img = this.mountainImg;
        const tileW = img.width;
        const tileH = img.height;
        // Canvas wide enough to tile seamlessly across the screen
        const tilesNeeded = Math.ceil(this.virtualWidth / tileW) + 2;
        const canvasW = tilesNeeded * tileW;
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = tileH;
        const ctx = canvas.getContext('2d');

        // Blend width in pixels for seamless left/right edge feathering
        const blendW = Math.min(64, Math.floor(tileW * 0.15));

        for (let i = 0; i < tilesNeeded; i++) {
            const dx = i * tileW;
            ctx.drawImage(img, dx, 0, tileW, tileH);

            // Cross-fade the seam: draw the end of the previous tile over the start of this one
            if (i > 0) {
                // Gradually blend left edge of current tile with right edge of previous tile
                for (let s = 0; s < blendW; s++) {
                    const alpha = s / blendW; // 0 at seam, 1 at full tile
                    // Erase a thin strip and redraw with blended alpha
                    ctx.save();
                    ctx.globalAlpha = 1 - alpha;
                    ctx.drawImage(img, tileW - blendW + s, 0, 1, tileH, dx + s, 0, 1, tileH);
                    ctx.restore();
                }
            }
        }
        return canvas;
    }

    drawMountains() {
        if (!this.mountainCanvas) return;
        const canvas = this.mountainCanvas;
        const img = this.mountainImg;
        const tileW = img.width;
        const stripW = canvas.width;
        // Scale mountains to sit on the ground
        const drawH = this.groundY * 0.6;
        const drawY = this.groundY - drawH;

        // Parallax offset, wrapping around tileW for seamless loop
        let offset = (-this.cameraX * this.mountainScrollFactor) % tileW;
        if (offset > 0) offset -= tileW;

        this.ctx.save();
        // Draw enough copies to fill the screen
        for (let x = offset; x < this.virtualWidth; x += stripW) {
            this.ctx.drawImage(canvas, x, drawY, stripW, drawH);
        }
        this.ctx.restore();
    }

    createGroundCanvas() {
        const img = this.groundImg;
        const tileW = img.width;
        const tileH = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = tileW;
        canvas.height = tileH;
        const ctx = canvas.getContext('2d');

        // Draw the base tile
        ctx.drawImage(img, 0, 0);

        // Blend width for seamless left/right edge feathering
        const blendW = Math.min(64, Math.floor(tileW * 0.15));

        // Cross-fade: overlay the right edge of the tile onto the left edge
        // so when tiles sit next to each other the seam is invisible
        for (let s = 0; s < blendW; s++) {
            const alpha = 1 - (s / blendW); // Fades from 1 (at left edge) to 0
            ctx.save();
            ctx.globalAlpha = alpha;
            // Draw a 1px strip from the right edge of the image at the left side
            ctx.drawImage(img, tileW - blendW + s, 0, 1, tileH, s, 0, 1, tileH);
            ctx.restore();
        }

        // Also blend the right edge with the left of the next tile
        for (let s = 0; s < blendW; s++) {
            const alpha = s / blendW; // Fades from 0 to 1
            ctx.save();
            ctx.globalAlpha = 1 - alpha;
            // Draw a 1px strip from the left edge of the image at the right side
            ctx.drawImage(img, s, 0, 1, tileH, tileW - blendW + s, 0, 1, tileH);
            ctx.restore();
        }

        return canvas;
    }

    createGrassCanvas() {
        const img = this.grassImg;
        const tileW = img.width;
        const tileH = img.height;
        const blendW = Math.min(64, Math.floor(tileW * 0.15));

        // Build a strip from 4 segments: some mirrored, some slightly scaled
        const segments = 4;
        const stripW = tileW * segments;
        const canvas = document.createElement('canvas');
        canvas.width = stripW;
        canvas.height = tileH;
        const ctx = canvas.getContext('2d');

        // Predefined variation per segment: [mirrored, scaleX]
        const variations = [
            { mirror: false, scaleX: 1.0 },
            { mirror: true,  scaleX: 0.95 },
            { mirror: false, scaleX: 1.05 },
            { mirror: true,  scaleX: 1.0 }
        ];

        for (let i = 0; i < segments; i++) {
            const dx = i * tileW;
            const v = variations[i];

            ctx.save();
            ctx.translate(dx + tileW / 2, tileH / 2);
            if (v.mirror) ctx.scale(-1, 1);
            ctx.scale(v.scaleX, 1);
            ctx.drawImage(img, -tileW / 2, -tileH / 2, tileW, tileH);
            ctx.restore();

            // Blend seam with previous segment
            if (i > 0) {
                for (let s = 0; s < blendW; s++) {
                    const alpha = 1 - (s / blendW);
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.drawImage(canvas, dx - blendW + s, 0, 1, tileH, dx + s, 0, 1, tileH);
                    ctx.restore();
                }
            }
        }

        // Blend last edge with first for seamless looping
        for (let s = 0; s < blendW; s++) {
            const alpha = 1 - (s / blendW);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.drawImage(canvas, stripW - blendW + s, 0, 1, tileH, s, 0, 1, tileH);
            ctx.restore();
        }
        for (let s = 0; s < blendW; s++) {
            const alpha = s / blendW;
            ctx.save();
            ctx.globalAlpha = 1 - alpha;
            ctx.drawImage(canvas, s, 0, 1, tileH, stripW - blendW + s, 0, 1, tileH);
            ctx.restore();
        }

        return canvas;
    }

    drawGrass() {
        if (!this.grassCanvas) return;
        const img = this.grassImg;
        const scale = 0.5;
        const stripW = this.grassCanvas.width * scale;
        const tileH = img.height * scale;
        // Position grass so its bottom sits at groundY
        const drawY = this.groundY - tileH;

        // Scroll slower than ground (0.75)
        let offset = (-this.cameraX * 0.75) % stripW;
        if (offset > 0) offset -= stripW;

        this.ctx.save();
        for (let x = offset; x < this.virtualWidth; x += stripW) {
            this.ctx.drawImage(this.grassCanvas, x, drawY, stripW, tileH);
        }
        this.ctx.restore();
    }

    drawForegroundGrass() {
        if (!this.grassCanvas) return;
        const img = this.grassImg;
        const scale = 0.3;
        const stripW = this.grassCanvas.width * scale;
        const tileH = img.height * scale;
        // Bottom aligned to groundY + 8px down
        const drawY = this.groundY - tileH + 8;

        // Same scroll factor as background grass (0.9)
        let offset = (-this.cameraX * 0.9) % stripW;
        if (offset > 0) offset -= stripW;

        this.ctx.save();
        for (let x = offset; x < this.virtualWidth; x += stripW) {
            this.ctx.drawImage(this.grassCanvas, x, drawY, stripW, tileH);
        }
        this.ctx.restore();
    }

    createCloudTexture(layer) {
        const width = 2000;
        const height = this.virtualHeight;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const drawPuff = (cx, cy, r, color, opacityMult = 1) => {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, color);
            grad.addColorStop(0.2, color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.save();
            ctx.globalAlpha = layer.opacity * opacityMult;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        const drawCloudCluster = (centerX, centerY, baseRadius) => {
            const puffs = 3 + Math.floor(Math.random() * 3);
            for(let i=0; i<puffs; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * baseRadius * 0.5;
                const px = centerX + Math.cos(angle) * dist;
                const py = centerY + Math.sin(angle) * dist;
                const pr = (baseRadius * 0.3) + (Math.random() * baseRadius * 0.3);
                
                // Draw wrapped
                for (let ox of [0, width, -width]) {
                    for (let oy of [0, height, -height]) {
                        // Single pass with layer color (no white highlight)
                        drawPuff(px + ox, py + oy, pr, layer.color);
                    }
                }
            }
        };

        for (let i = 0; i < layer.count; i++) {
            const x = Math.random() * width;
            // Lower towards horizon but massive enough to peak up
            const y = height * 0.45 + (Math.random() * height * 0.3); 
            const clusterRadius = (200 + Math.random() * 150) * layer.scale;
            drawCloudCluster(x, y, clusterRadius);
        }

        return canvas;
    }

    createSkyCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = this.virtualWidth;
        canvas.height = this.groundY;
        const ctx = canvas.getContext('2d');

        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
        skyGrad.addColorStop(0, 'rgba(2, 4, 8, 0)');
        skyGrad.addColorStop(0.6, 'rgba(10, 20, 35, 0.3)');
        skyGrad.addColorStop(1, '#0c1523');
        
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return canvas;
    }

    drawAtmosphere() {
        this.atmosphereLayers.forEach((layer, i) => {
            const canvas = this.atmosphereCanvases[i];
            const width = canvas.width;
            
            // X position considering camera parallax AND constant drift (updated in update())
            let x = (-this.cameraX * layer.scrollFactor - this.atmosphereOffsets[i]) % width;
            
            // Draw copies for seamless loop
            this.ctx.drawImage(canvas, x, 0);
            this.ctx.drawImage(canvas, x + width, 0);
            this.ctx.drawImage(canvas, x - width, 0);
        });
    }

    drawStars() {
        this.ctx.save();
        this.stars.forEach(star => {
            // Stars move very slowly relative to camera (0.01 scroll factor)
            // Removed constant drift (starOffset) so they don't move with clouds
            let sx = (star.x - (this.cameraX * 0.01)) % this.virtualWidth;
            if (sx < 0) sx += this.virtualWidth;
            
            // Twinkle effect
            const alpha = star.brightness * (0.7 + 0.3 * Math.sin(Date.now() / 1000 + star.pulse));
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fillRect(sx, star.y, star.size, star.size);
        });
        this.ctx.restore();
    }

    drawSpaceships() {
        this.ctx.save();
        this.spaceships.forEach(ship => {
            let sx = ship.x - (this.cameraX * 0.02);
            
            if (this.shipImg.complete && this.shipImg.width > 0) {
                const w = this.shipImg.width * ship.scale;
                const h = this.shipImg.height * ship.scale;
                
                this.ctx.save();
                this.ctx.translate(sx, ship.y);
                
                // Base image faces Left. Mirror for dir 1 (Right)
                if (ship.dir === 1) {
                    this.ctx.scale(-1, 1); 
                    this.ctx.drawImage(this.shipImg, -w, 0, w, h);
                } else {
                    this.ctx.drawImage(this.shipImg, 0, 0, w, h);
                }
                this.ctx.restore();
            } else {
                // Better placeholder ship
                const w = 400 * ship.scale;
                const h = 250 * ship.scale;
                this.ctx.fillStyle = '#1a334d';
                this.ctx.save();
                this.ctx.translate(sx, ship.y);
                if (ship.dir === 1) {
                    this.ctx.scale(-1, 1);
                    this.ctx.translate(-w, 0);
                }
                this.ctx.beginPath();
                this.ctx.moveTo(w, h/2); // Nose (facing right)
                this.ctx.lineTo(0, 0);   
                this.ctx.lineTo(w * 0.2, h/2); 
                this.ctx.lineTo(0, h);   
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        });
        this.ctx.restore();
    }

    handleInput() {}

    dispose() {
        if (this.playerRenderer) this.playerRenderer.dispose();
        if (this.enemyRenderer) this.enemyRenderer.dispose();
        const controls = document.getElementById('shader-controls');
        if (controls) controls.remove();
    }

    initShaderControls() {
        const engine = window.engine;
        if (!engine || !engine.crtEffect) return;

        // The config might still be loading (async)
        if (!engine.crtEffect.config) {
            setTimeout(() => this.initShaderControls(), 100);
            return;
        }

        const container = document.createElement('div');
        container.id = 'shader-controls';
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#00ffcc',
            border: '2px solid #00ffcc',
            padding: '15px',
            zIndex: '10001',
            fontFamily: 'monospace',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'auto'
        });

        const title = document.createElement('div');
        title.innerText = '--- SHADER CALIBRATION ---';
        title.style.marginBottom = '5px';
        title.style.textAlign = 'center';
        title.style.fontWeight = 'bold';
        container.appendChild(title);

        const createSlider = (label, min, max, step, initial, onChange) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.flexDirection = 'column';
            row.style.gap = '5px';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            
            const labelEl = document.createElement('span');
            labelEl.innerText = label;
            
            const valEl = document.createElement('span');
            valEl.innerText = initial.toFixed(3);
            
            header.appendChild(labelEl);
            header.appendChild(valEl);
            row.appendChild(header);

            const input = document.createElement('input');
            input.type = 'range';
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = initial;
            input.style.cursor = 'pointer';
            input.style.accentColor = '#00ffcc';
            input.style.width = '200px';
            
            input.oninput = (e) => {
                const val = parseFloat(e.target.value);
                valEl.innerText = val.toFixed(3);
                onChange(val);
            };

            row.appendChild(input);
            return row;
        };

        const config = engine.crtEffect.config;

        // Saturation
        container.appendChild(createSlider('SATURATION', 0, 2, 0.05, config.saturation ?? 0.8, (v) => {
            config.saturation = v;
        }));

        // Scanline intensity
        container.appendChild(createSlider('SCANLINES', 0, 1, 0.01, config.scanline?.intensity ?? 0.18, (v) => {
            if (!config.scanline) config.scanline = {};
            config.scanline.intensity = v;
        }));

        // Curvature
        container.appendChild(createSlider('CURVATURE', 0, 0.5, 0.01, config.screenEffects?.curvature ?? 0.1, (v) => {
            if (!config.screenEffects) config.screenEffects = {};
            config.screenEffects.curvature = v;
        }));

        // RGB Shift
        container.appendChild(createSlider('RGB SHIFT', 0, 0.01, 0.0001, config.colorEffects?.rgbShift ?? 0.0015, (v) => {
            if (!config.colorEffects) config.colorEffects = {};
            config.colorEffects.rgbShift = v;
        }));

        // Brightness
        container.appendChild(createSlider('BRIGHTNESS', 0.5, 2.0, 0.05, config.screenEffects?.brightness ?? 1.1, (v) => {
            if (!config.screenEffects) config.screenEffects = {};
            config.screenEffects.brightness = v;
        }));

        // Noise
        container.appendChild(createSlider('NOISE', 0, 0.2, 0.01, config.distortion?.noiseAmount ?? 0.02, (v) => {
            if (!config.distortion) config.distortion = {};
            config.distortion.noiseAmount = v;
        }));

        document.body.appendChild(container);
    }
}
