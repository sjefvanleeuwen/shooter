import buttonBlueUrl from '../sprites/ui/button-blue.png';
import buttonRedUrl from '../sprites/ui/button-red.png';

export default class MobileControls {
    constructor() {
        // Simple touch detection
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!this.isMobile) return;

        console.log("Mobile device detected. Initializing touch controls.");

        this.createStyles();
        this.createOverlay();
        this.bindEvents();
    }

    createStyles() {
        // Remove existing style if present
        const existingStyle = document.getElementById('mobile-controls-style');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'mobile-controls-style';
        style.textContent = `
            #mobile-controls {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 180px;
                pointer-events: none;
                z-index: 2147483647; /* Max Z-index */
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 20px;
                box-sizing: border-box;
                touch-action: none;
                background: #000000 !important;
            }

            .control-group {
                pointer-events: auto;
                display: flex;
                gap: 15px;
            }

            .d-pad {
                display: flex;
                gap: 10px;
            }

            .btn {
                width: 80px;
                height: 80px;
                /* Fallback color so buttons are visible even if image fails */
                background-color: transparent;
                /* background-image set via JS style */
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                border: none;
                border-radius: 50%; /* Ensure round touch area matching sprite */
                display: flex;
                justify-content: center;
                align-items: center;
                color: transparent; /* Hide any accidental text */
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
                transition: transform 0.1s, opacity 0.2s;
            }

            .btn:active, .btn.active {
                transform: scale(0.9);
                filter: brightness(0.8);
            }

            .fire-btn {
                width: 100px;
                height: 100px;
                background-color: transparent;
            }

            .fire-btn:active, .fire-btn.active {
                 background-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }

    createOverlay() {
        // Cleanup existing overlay
        const existing = document.getElementById('mobile-controls');
        if (existing) {
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'mobile-controls';
        
        // Left controls (D-Pad)
        const leftGroup = document.createElement('div');
        leftGroup.className = 'control-group d-pad';
        
        this.leftBtn = document.createElement('div');
        this.leftBtn.className = 'btn';
        this.leftBtn.style.backgroundImage = `url(${buttonBlueUrl})`;
        this.leftBtn.dataset.key = 'ArrowLeft';

        this.rightBtn = document.createElement('div');
        this.rightBtn.className = 'btn';
        this.rightBtn.style.backgroundImage = `url(${buttonBlueUrl})`;
        this.rightBtn.dataset.key = 'ArrowRight';

        leftGroup.appendChild(this.leftBtn);
        leftGroup.appendChild(this.rightBtn);

        // Right controls (Fire)
        const rightGroup = document.createElement('div');
        rightGroup.className = 'control-group';

        this.fireBtn = document.createElement('div');
        this.fireBtn.className = 'btn fire-btn';
        this.fireBtn.style.backgroundImage = `url(${buttonRedUrl})`;
        this.fireBtn.dataset.key = ' '; // Space

        rightGroup.appendChild(this.fireBtn);

        this.container.appendChild(leftGroup);
        this.container.appendChild(rightGroup);
        document.body.appendChild(this.container);
    }

    bindEvents() {
        const dispatchKey = (key, type) => {
            const event = new KeyboardEvent(type, {
                key: key,
                code: key === ' ' ? 'Space' : key,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        };

        const bindButton = (element, key) => {
            element.addEventListener('touchstart', (e) => {
                e.preventDefault();
                element.classList.add('active');
                dispatchKey(key, 'keydown');
            });

            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                element.classList.remove('active');
                dispatchKey(key, 'keyup');
            });
            
            // Mouse fallbacks for testing on desktop
            element.addEventListener('mousedown', (e) => {
                e.preventDefault();
                element.classList.add('active');
                dispatchKey(key, 'keydown');
            });

            element.addEventListener('mouseup', (e) => {
                e.preventDefault();
                element.classList.remove('active');
                dispatchKey(key, 'keyup');
            });

            element.addEventListener('mouseleave', (e) => {
                if(element.classList.contains('active')) {
                     element.classList.remove('active');
                     dispatchKey(key, 'keyup');
                }
            });
        };

        bindButton(this.leftBtn, 'ArrowLeft');
        bindButton(this.rightBtn, 'ArrowRight');
        bindButton(this.fireBtn, ' ');
    }
}
