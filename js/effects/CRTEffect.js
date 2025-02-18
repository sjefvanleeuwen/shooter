import VideoRecorder from '../utils/VideoRecorder.js';

class CRTEffect {
    constructor(targetCanvas, container, audioManager = null) {
        this.gameCanvas = targetCanvas;

        // Create WebGL canvas with fixed 1024x1024 dimensions
        this.glCanvas = document.createElement('canvas');
        this.glCanvas.width = 1024;
        this.glCanvas.height = 1024;
        
        // Force exact pixel dimensions in style
        this.glCanvas.style.width = '1024px';
        this.glCanvas.style.height = '1024px';
        this.glCanvas.style.display = 'block';
        
        // Center in container
        container.appendChild(this.glCanvas);

        // Init WebGL with correct size
        this.gl = this.glCanvas.getContext('webgl2', {
            premultipliedAlpha: false,
            alpha: false
        });

        // Load CRT configuration
        this.loadConfig().then(() => {
            this.createShaders();
            this.createBuffers();
            this.createTexture();
        });

        // Add video recorder with audio manager
        this.videoRecorder = new VideoRecorder(this.glCanvas, audioManager);
        this.setupRecordingControls();
    }

    async loadConfig() {
        try {
            // Update path to use the correct location in dist
            const response = await fetch('./config/crt-effect.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.config = await response.json();
            console.log('CRT config loaded:', this.config);
        } catch (err) {
            console.error('Failed to load CRT config:', err);
            // Fallback to default values
            this.config = {
                scanline: { intensity: 0.18, count: 1024.0, rollingSpeed: 0.3 },
                screenEffects: { vignetteStrength: 0.22, brightness: 1.1, curvature: 0.1 },
                colorEffects: { rgbShift: 0.0015 },
                blur: { horizontal: 0.4 },
                distortion: { flickerSpeed: 8.0, flickerIntensity: 0.03 }
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
            
            in vec2 v_texCoord;
            out vec4 outColor;
            
            float rand(vec2 co) {
                return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }

            vec3 sampleWithBlur(sampler2D tex, vec2 uv, float blur) {
                vec3 color = vec3(0.0);
                float total = 0.0;
                for(float i = -2.0; i <= 2.0; i++) {
                    float weight = 1.0 - abs(i) / 3.0;
                    color += texture(tex, uv + vec2(i * blur / u_resolution.x, 0.0)).rgb * weight;
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
            noiseAmount: this.gl.getUniformLocation(this.program, 'u_noiseAmount')
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
        this.glCanvas.style.transform = `scale(${scale})`;
    }

    render(time) {
        const gl = this.gl;
        
        // Ensure viewport matches fixed canvas size
        gl.viewport(0, 0, 1024, 1024);
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
        if (this.config) {  // Add check for config
            gl.uniform1f(this.uniformLocations.scanlineIntensity, this.config.scanline.intensity);
            gl.uniform1f(this.uniformLocations.scanlineCount, this.config.scanline.count);
            gl.uniform1f(this.uniformLocations.rollingSpeed, this.config.scanline.rollingSpeed);
            gl.uniform1f(this.uniformLocations.vignetteStrength, this.config.screenEffects.vignetteStrength);
            gl.uniform1f(this.uniformLocations.brightness, this.config.screenEffects.brightness);
            gl.uniform1f(this.uniformLocations.curvature, this.config.screenEffects.curvature);
            gl.uniform1f(this.uniformLocations.rgbShift, this.config.colorEffects.rgbShift);
            gl.uniform1f(this.uniformLocations.horizontalBlur, this.config.blur.horizontal);
            gl.uniform1f(this.uniformLocations.flickerSpeed, this.config.distortion.flickerSpeed);
            gl.uniform1f(this.uniformLocations.flickerIntensity, this.config.distortion.flickerIntensity);
            gl.uniform1f(this.uniformLocations.noiseAmount, this.config.distortion.noiseAmount);
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

    setupRecordingControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r') {
                if (!this.videoRecorder.isRecording()) {
                    this.videoRecorder.startRecording();
                } else {
                    this.videoRecorder.stopRecording();
                }
            }
        });
    }
}

export default CRTEffect;
