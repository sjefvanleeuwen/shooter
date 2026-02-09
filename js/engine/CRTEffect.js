import VideoRecorder from './VideoRecorder.js';

class CRTEffect {
    constructor(targetCanvas, container, audioManager = null, configPath = null) {
        this.gameCanvas = targetCanvas;
        this.configPath = configPath;

        // Create WebGL canvas matching the target canvas resolution
        this.glCanvas = document.createElement('canvas');
        this.glCanvas.width = this.gameCanvas.width;
        this.glCanvas.height = this.gameCanvas.height;
        
        // Initial style (will be updated by resize)
        this.glCanvas.style.display = 'block';
        
        // Center in container
        container.appendChild(this.glCanvas);

        // Bind resize
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
        requestAnimationFrame(() => this.resize());

        // Init WebGL with correct size
        this.gl = this.glCanvas.getContext('webgl2', {
            premultipliedAlpha: false,
            alpha: false,
            preserveDrawingBuffer: true
        });

        // Initialize setup immediately but mark as not ready until config loads
        this.isReady = false;
        
        // Immediate setup
        this.createShaders();
        this.createBuffers();
        this.createTexture();

        // Load CRT configuration asynchronously
        this.loadConfig().then(() => {
            this.isReady = true;
            console.log('CRT effect initialized and ready');
        });

        // Add video recorder with audio manager
        this.videoRecorder = new VideoRecorder(this.glCanvas, audioManager);
        
        this.padding = { top: 0, bottom: 0, left: 0, right: 0 };
    }

    setPadding(padding) {
        this.padding = { ...this.padding, ...padding };
        this.resize();
    }

    resize() {
        // Use the native aspect ratio of the internal buffer
        const aspect = this.glCanvas.width / this.glCanvas.height; 
        const availableWidth = window.innerWidth - (this.padding.left + this.padding.right);
        const availableHeight = window.innerHeight - (this.padding.top + this.padding.bottom);
        
        let width, height;
        
        if (availableWidth / availableHeight < aspect) {
            width = availableWidth;
            height = availableWidth / aspect;
        } else {
            height = availableHeight;
            width = availableHeight * aspect;
        }
        
        this.glCanvas.style.width = `${Math.floor(width)}px`;
        this.glCanvas.style.height = `${Math.floor(height)}px`;
        
        if (this.padding.top > 0) {
             this.glCanvas.style.marginTop = `${this.padding.top}px`;
        }
    }

    async loadConfig() {
        try {
            let response;
            if (this.configPath) {
                response = await fetch(this.configPath);
            }
            
            if (!response || !response.ok) {
                // Try local fallback if specific path failed or wasn't provided
                response = await fetch('/config/crt-effect.json');
            }
            if (!response.ok) {
                // Try relative path as secondary fallback
                response = await fetch('./config/crt-effect.json');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.config = await response.json();
            console.log('CRT config loaded:', this.config);
        } catch (err) {
            console.error('Failed to load CRT config:', err);
            // Fallback to default values
            this.config = {
                scanline: { intensity: 0.23, count: 1024.0, rollingSpeed: 0.3 },
                screenEffects: { vignetteStrength: 0.22, brightness: 1.4, curvature: 0.05 },
                colorEffects: { rgbShift: 0.001, saturation: 1.45 },
                blur: { horizontal: 0.4 },
                distortion: { flickerSpeed: 8.0, flickerIntensity: 0.03, noiseAmount: 0.07 },
                saturation: 1.45
            };
        }
    }

    createShaders() {
        const vsSource = `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;
            out vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
                v_texCoord = a_texCoord;
            }`;

        const fsSource = `#version 300 es
            precision highp float;
            
            uniform sampler2D u_image;
            uniform vec2 u_resolution;
            uniform float u_time;
            
            uniform float u_scanlineIntensity;
            uniform float u_scanlineCount;
            uniform float u_rollingSpeed;
            uniform float u_vignetteStrength;
            uniform float u_brightness;
            uniform float u_curvature;
            uniform float u_rgbShift;
            uniform float u_horizontalBlur;
            uniform float u_flickerSpeed;
            uniform float u_flickerIntensity;
            uniform float u_noiseAmount;
            uniform float u_saturation;
            
            in vec2 v_texCoord;
            out vec4 outColor;
            
            float rand(vec2 co) {
                return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }

            vec3 applySaturation(vec3 color, float saturation) {
                float intensity = dot(color, vec3(0.299, 0.587, 0.114));
                return mix(vec3(intensity), color, saturation);
            }

            vec3 sampleWithBlur(sampler2D tex, vec2 uv, float blur) {
                // Optimization: fast path for no blur
                if (blur < 0.01) return texture(tex, uv).rgb;

                vec3 color = vec3(0.0);
                float total = 0.0;
                // Optimized: Reduced from 5 taps to 3 taps per channel
                for(float i = -1.0; i <= 1.0; i++) {
                    float weight = 1.0 - abs(i) * 0.4;
                    // Slightly wider spread to compensate for fewer samples
                    float spread = 1.3; 
                    color += texture(tex, uv + vec2(i * spread * blur / u_resolution.x, 0.0)).rgb * weight;
                    total += weight;
                }
                return color / total;
            }
            
            void main() {
                vec2 uv = v_texCoord;
                
                // Screen curvature
                vec2 curve_uv = uv * 2.0 - 1.0;
                vec2 offset = curve_uv.yx * curve_uv.yx * vec2(u_curvature);
                curve_uv += curve_uv * offset;
                uv = curve_uv * 0.5 + 0.5;

                // Early exit if outside bounds
                if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                    outColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }

                // Rolling scanline
                float scanline = sin(uv.y * u_scanlineCount + u_time * u_rollingSpeed);
                scanline = scanline * 0.5 + 0.5;
                scanline = pow(scanline, 0.5);

                // RGB shift
                vec2 rUV = uv - vec2(u_rgbShift * sin(u_time), 0.0);
                vec2 gUV = uv;
                vec2 bUV = uv + vec2(u_rgbShift * sin(u_time), 0.0);

                // Sample with blur
                vec3 color;
                color.r = sampleWithBlur(u_image, rUV, u_horizontalBlur).r;
                color.g = sampleWithBlur(u_image, gUV, u_horizontalBlur).g;
                color.b = sampleWithBlur(u_image, bUV, u_horizontalBlur).b;

                // Apply effects
                color = applySaturation(color, u_saturation);
                color *= u_brightness;
                color *= 1.0 - (scanline * u_scanlineIntensity);
                color *= 1.0 - length(curve_uv) * u_vignetteStrength;
                color *= 1.0 - (sin(u_time * u_flickerSpeed) * u_flickerIntensity);
                
                // Add noise
                float noise = rand(uv + vec2(u_time * 0.001));
                color += (noise - 0.5) * u_noiseAmount;

                outColor = vec4(color, 1.0);
            }`;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
        
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // Get locations
        this.positionLoc = this.gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLoc = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.resolutionLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.timeLoc = this.gl.getUniformLocation(this.program, 'u_time');

        // Get additional uniform locations
        this.uniformLocations = {
            scanlineIntensity: this.gl.getUniformLocation(this.program, 'u_scanlineIntensity'),
            scanlineCount: this.gl.getUniformLocation(this.program, 'u_scanlineCount'),
            rollingSpeed: this.gl.getUniformLocation(this.program, 'u_rollingSpeed'),
            vignetteStrength: this.gl.getUniformLocation(this.program, 'u_vignetteStrength'),
            brightness: this.gl.getUniformLocation(this.program, 'u_brightness'),
            curvature: this.gl.getUniformLocation(this.program, 'u_curvature'),
            rgbShift: this.gl.getUniformLocation(this.program, 'u_rgbShift'),
            horizontalBlur: this.gl.getUniformLocation(this.program, 'u_horizontalBlur'),
            flickerSpeed: this.gl.getUniformLocation(this.program, 'u_flickerSpeed'),
            flickerIntensity: this.gl.getUniformLocation(this.program, 'u_flickerIntensity'),
            noiseAmount: this.gl.getUniformLocation(this.program, 'u_noiseAmount'),
            saturation: this.gl.getUniformLocation(this.program, 'u_saturation')
        };
    }

    createBuffers() {
        // Vertex positions
        const positions = new Float32Array([
            -1, -1,  // bottom left
             1, -1,  // bottom right
            -1,  1,  // top left
             1,  1,  // top right
        ]);
        
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        // Texture coordinates
        const texCoords = new Float32Array([
            0, 1,  // bottom left
            1, 1,  // bottom right
            0, 0,  // top left
            1, 0,  // top right
        ]);
        
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    }

    createTexture() {
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error(this.gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error(this.gl.getProgramInfoLog(program));
        }
        return program;
    }

    setScale(scale) {
        // No longer using CSS transform scaling as it conflicts with the new resize logic
        // This is now handled by setting glCanvas style width/height directly in resize()
    }

    render(time) {
        const gl = this.gl;
        if (!this.program) return; // Wait for shader compilation
        if (!this.config) return;  // Wait for config (even default)

        // Ensure viewport matches canvas size
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        // Upload game canvas as texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.gameCanvas);
        
        // Set uniforms
        gl.uniform2f(this.resolutionLoc, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(this.timeLoc, time * 0.001);

        // Set CRT effect uniforms from config
        if (this.config) {
            const s = this.config.scanline || { intensity: 0, count: 0, rollingSpeed: 0 };
            const e = this.config.screenEffects || { vignetteStrength: 0, brightness: 1, curvature: 0 };
            const c = this.config.colorEffects || { rgbShift: 0, saturation: 1.0 };
            const b = this.config.blur || { horizontal: 0 };
            const d = this.config.distortion || { flickerSpeed: 0, flickerIntensity: 0, noiseAmount: 0 };
            
            // Allow saturation from either top level or colorEffects
            const sat = this.config.saturation !== undefined ? this.config.saturation : (c.saturation !== undefined ? c.saturation : 1.0);

            gl.uniform1f(this.uniformLocations.scanlineIntensity, s.intensity);
            gl.uniform1f(this.uniformLocations.scanlineCount, s.count);
            gl.uniform1f(this.uniformLocations.rollingSpeed, s.rollingSpeed);
            gl.uniform1f(this.uniformLocations.vignetteStrength, e.vignetteStrength);
            gl.uniform1f(this.uniformLocations.brightness, e.brightness);
            gl.uniform1f(this.uniformLocations.curvature, e.curvature);
            gl.uniform1f(this.uniformLocations.rgbShift, c.rgbShift);
            gl.uniform1f(this.uniformLocations.horizontalBlur, b.horizontal);
            gl.uniform1f(this.uniformLocations.flickerSpeed, d.flickerSpeed);
            gl.uniform1f(this.uniformLocations.flickerIntensity, d.flickerIntensity);
            gl.uniform1f(this.uniformLocations.noiseAmount, d.noiseAmount);
            gl.uniform1f(this.uniformLocations.saturation, sat);
        }

        // Set attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLoc);
        gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

export default CRTEffect;
