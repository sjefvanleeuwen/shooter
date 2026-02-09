import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log('--- GLBSpriteRenderer.js Module Loaded ---');

/**
 * Renders a GLB model from the side into an offscreen canvas.
 * Uses a "Pre-render" approach: Samples the 3D animation into 2D sprite frames on startup.
 */
export default class GLBSpriteRenderer {
    constructor(options = {}) {
        const instanceId = Math.random().toString(36).substring(7);
        console.log(`[GLBSpriteRenderer-${instanceId}] INIT START`);
        
        this.ready = false;
        this.width = options.width || 128;
        this.height = options.height || 128;
        this.modelPath = options.modelPath;
        this.showDebug = options.showDebug || false;

        // Hidden WebGL canvas for Three.js
        this.webglCanvas = document.createElement('canvas');
        this.webglCanvas.width = this.width;
        this.webglCanvas.height = this.height;

        this.canvas = document.createElement('canvas'); // Keep for legacy/debug if needed
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx2d = this.canvas.getContext('2d');

        // Three.js Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.webglCanvas,
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Three.js Scene Setup (Black background for debug visual)
        this.scene = new THREE.Scene();

        // Standard perspective camera for capturing sprites can sometimes be better 
        // to avoid "floating" issues if the model has a weird offset.
        this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);

        // Basic Lighting
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.0)); // Brighter ambient
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 5, 10);
        this.scene.add(dirLight);

        // Animation state
        this.animations = new Map(); // name -> Array of canvases
        this.animState = 'idle';
        this.facing = 1;
        this.frameTime = 0;
        this.fps = 24; 

        console.log(`[GLBSpriteRenderer-${instanceId}] Starting Load...`);
        this._load(instanceId);
    }

    async _load(instanceId) {
        try {
            console.log(`[GLBSpriteRenderer-${instanceId}] Loading GLB:`, this.modelPath);
            const loader = new GLTFLoader();
            
            const url = this.modelPath + '?v=' + Date.now();
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });

            console.log(`[GLBSpriteRenderer-${instanceId}] GLB LOADED. Processing...`);
            this.model = gltf.scene;
            this.scene.add(this.model);

            // Let's ensure the model is at least visible before measuring
            this.renderer.render(this.scene, this.camera);

            const box = new THREE.Box3().setFromObject(this.model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            console.log(`[GLBSpriteRenderer-${instanceId}] Model Size:`, size.x, size.y, size.z);
            console.log(`[GLBSpriteRenderer-${instanceId}] Model Center:`, center.x, center.y, center.z);

            // Move model so it's centered at 0,0,0
            this.model.position.set(-center.x, -center.y, -center.z);

            // Fit camera: Perspective version
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraDist *= 1.1; // "Full size" - much closer than before
            
            // Side view: look from the other side (-X) so the model faces RIGHT by default
            this.camera.position.set(-cameraDist, 0, 0);
            this.camera.lookAt(0, 0, 0);
            this.camera.updateProjectionMatrix();

            // Generate sprite frames
            if (gltf.animations && gltf.animations.length > 0) {
                console.warn(`[GLBSpriteRenderer-${instanceId}] FOUND ${gltf.animations.length} ANIMATIONS!`);
                const mixer = new THREE.AnimationMixer(this.model);
                
                for (const clip of gltf.animations) {
                    const duration = clip.duration;
                    const frameCount = Math.max(1, Math.ceil(duration * this.fps));
                    const frames = [];
                    const action = mixer.clipAction(clip);
                    
                    console.group(`[GLBSpriteRenderer] Sampling: ${clip.name}`);
                    console.warn(`Duration: ${duration}s, Frames: ${frameCount}`);
                    
                    action.play();
                    // We use mixer.setTime() for absolute sampling to ensure we get exactly the right frames.

                    for (let i = 0; i < frameCount; i++) {
                        const time = i / this.fps;
                        mixer.setTime(time); 
                        this.model.updateMatrixWorld(true); // Force skeleton to update positions
                        
                        this.renderer.render(this.scene, this.camera);
                        
                        const frameCanvas = document.createElement('canvas');
                        frameCanvas.width = this.width;
                        frameCanvas.height = this.height;
                        const fctx = frameCanvas.getContext('2d');
                        fctx.drawImage(this.webglCanvas, 0, 0);
                        frames.push(frameCanvas);

                        if (i % 20 === 0) console.log(`  Progress: ${i}/${frameCount} at time ${time.toFixed(3)}s`);
                    }
                    
                    action.stop();
                    this.animations.set(clip.name.toLowerCase(), frames);
                    console.groupEnd();
                }
            } else {
                console.error(`[GLBSpriteRenderer-${instanceId}] NO ANIMATIONS FOUND IN GLB.`);
                // Capture one static frame
                this.renderer.render(this.scene, this.camera);
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = this.width;
                frameCanvas.height = this.height;
                frameCanvas.getContext('2d').drawImage(this.webglCanvas, 0, 0);
                this.animations.set('idle', [frameCanvas]);
            }

            this.ready = true;
            console.log(`[GLBSpriteRenderer-${instanceId}] READY! Frames generated.`);

            // Automatically show debug preview if specified
            if (this.showDebug) {
                this.createDebugUI();
            }
        } catch (err) {
            console.error(`[GLBSpriteRenderer-${instanceId}] FATAL LOAD ERROR:`, err);
        }
    }

    setState(state) {
        if (this.animState !== state) {
            this.animState = state;
            this.frameTime = 0; // Restart animation on state change
        }
    }

    setFacing(dir) {
        this.facing = dir > 0 ? 1 : -1;
    }

    /**
     * Updates the sprite canvas with the current animation frame.
     * @param {number} dt Delta time to advance (0 if manually setting frameTime)
     * @param {string} state Animation state (optional)
     * @param {number} facing Facing direction (optional, 1 or -1)
     */
    /**
     * Finds and returns a specific pre-rendered frame.
     * Use this instead of the shared .canvas to avoid flicker between different entities.
     */
    getFrame(state, time, facing = 1) {
        if (!this.ready) return null;

        const target = state ? state.toLowerCase() : 'idle';
        let frames = this.animations.get(target);

        if (!frames) {
            // Fuzzy search
            for (const [name, storedFrames] of this.animations) {
                if (name.includes(target)) {
                    frames = storedFrames;
                    break;
                }
            }
        }

        if (!frames) {
            // Absolute fallbacks (ordered by general preference for character games)
            const fallbacks = ['idle', 'rest', 'pose', 'walk', 'run', 'action'];
            for (const fb of fallbacks) {
                for (const [name, storedFrames] of this.animations) {
                    if (name.includes(fb)) {
                        frames = storedFrames;
                        break;
                    }
                }
                if (frames) break;
            }
        }

        if (!frames && this.animations.size > 0) {
            frames = Array.from(this.animations.values())[0];
        }

        if (frames && frames.length > 0) {
            const index = Math.floor(time * this.fps) % frames.length;
            return frames[index];
        }

        return null;
    }

    render(dt, state, facing) {
        if (!this.ready) return;

        // Update state if passed
        if (state !== undefined) this.setState(state);
        if (facing !== undefined) this.setFacing(facing);

        this.frameTime += dt;
        
        const target = this.animState.toLowerCase();
        let frames = this.animations.get(target);

        if (!frames) {
            // First pass: Direct match or keyword match
            for (const [name, storedFrames] of this.animations) {
                if (name.includes(target)) {
                    frames = storedFrames;
                    break;
                }
            }
        }

        if (!frames) {
            // Second pass: Priority fallbacks with keyword matching
            const fallbacks = ['run', 'walk', 'idle', 'action'];
            for (const fb of fallbacks) {
                for (const [name, storedFrames] of this.animations) {
                    if (name.includes(fb)) {
                        frames = storedFrames;
                        break;
                    }
                }
                if (frames) break;
            }
        }

        if (!frames && this.animations.size > 0) {
            // Last resort: Just pick the first thing we have if nothing else matched
            console.warn(`[GLBSpriteRenderer] No match for animation "${target}", falling back to first available.`);
            frames = Array.from(this.animations.values())[0];
        }

        if (frames && frames.length > 1) {
            const index = Math.floor(this.frameTime * this.fps) % frames.length;
            const frame = frames[index];

            this.ctx2d.clearRect(0, 0, this.width, this.height);
            this.ctx2d.save();
            if (this.facing < 0) {
                this.ctx2d.translate(this.width, 0);
                this.ctx2d.scale(-1, 1);
            }
            this.ctx2d.drawImage(frame, 0, 0);
            this.ctx2d.restore();
        } else if (frames && frames.length === 1) {
            // Static frame
            const frame = frames[0];
            this.ctx2d.clearRect(0, 0, this.width, this.height);
            this.ctx2d.save();
            if (this.facing < 0) {
                this.ctx2d.translate(this.width, 0);
                this.ctx2d.scale(-1, 1);
            }
            this.ctx2d.drawImage(frame, 0, 0);
            this.ctx2d.restore();
        }
    }

    dispose() {
        if (this.renderer) this.renderer.dispose();
    }

    /**
     * Creates a debug window in the top right to verify all captured frames.
     */
    createDebugUI() {
        const container = document.createElement('div');
        container.id = `debug-renderer-${Math.random().toString(36).substring(7)}`;
        Object.assign(container.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            width: '300px',
            maxHeight: '80vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#0f0',
            border: '2px solid #0f0',
            padding: '10px',
            zIndex: '10000',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
        });

        const title = document.createElement('div');
        title.innerText = `GLB SPRITES: ${this.modelPath.split('/').pop()}`;
        title.style.borderBottom = '1px solid #0f0';
        title.style.marginBottom = '10px';
        title.style.fontWeight = 'bold';
        container.appendChild(title);

        for (const [name, frames] of this.animations) {
            const section = document.createElement('div');
            section.style.marginBottom = '15px';

            const label = document.createElement('div');
            label.innerText = `${name} (${frames.length} frames)`;
            section.appendChild(label);

            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = this.width;
            previewCanvas.height = this.height;
            previewCanvas.style.border = '1px solid #444';
            previewCanvas.style.marginTop = '5px';
            previewCanvas.style.backgroundColor = '#111';
            section.appendChild(previewCanvas);

            const pctx = previewCanvas.getContext('2d');
            let frameIdx = 0;

            // Simple internal loop for the debug preview
            setInterval(() => {
                if (frames.length > 0) {
                    pctx.clearRect(0, 0, this.width, this.height);
                    pctx.drawImage(frames[frameIdx], 0, 0);
                    frameIdx = (frameIdx + 1) % frames.length;
                }
            }, 1000 / this.fps);

            container.appendChild(section);
        }

        document.body.appendChild(container);
    }
}
