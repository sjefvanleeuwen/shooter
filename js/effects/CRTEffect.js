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

        this.createShaders();
        this.createBuffers();
        this.createTexture();

        // Add video recorder with audio manager
        this.videoRecorder = new VideoRecorder(this.glCanvas, audioManager);
        this.setupRecordingControls();
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
            
            in vec2 v_texCoord;
            out vec4 outColor;

            #define SCANLINE_INTENSITY 0.1
            #define VIGNETTE_STRENGTH 0.2
            
            void main() {
                vec2 uv = v_texCoord;
                
                // Screen curve
                vec2 curve_uv = uv * 2.0 - 1.0;
                vec2 offset = curve_uv.yx * curve_uv.yx * vec2(0.075, 0.075);
                curve_uv += curve_uv * offset;
                uv = curve_uv * 0.5 + 0.5;

                // Check bounds
                if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                    outColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }

                // Sample with subtle RGB shift
                float r = texture(u_image, uv + vec2(0.001, 0.0)).r;
                float g = texture(u_image, uv).g;
                float b = texture(u_image, uv - vec2(0.001, 0.0)).b;
                vec4 color = vec4(r, g, b, 1.0);
                
                // Scanlines
                float scanline = sin(uv.y * u_resolution.y * 1.5) * 0.5 + 0.5;
                color *= 1.0 - scanline * SCANLINE_INTENSITY;
                
                // Vignette
                float vignette = 1.0 - length(curve_uv) * VIGNETTE_STRENGTH;
                color *= vignette;
                
                // Subtle noise
                float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
                color *= 0.98 + noise * 0.02;

                outColor = color;
            }`;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
        
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // Get locations
        this.positionLoc = this.gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLoc = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.resolutionLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.timeLoc = this.gl.getUniformLocation(this.program, 'u_time');
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
