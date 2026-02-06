export default class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: false, preserveDrawingBuffer: true });
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);

        this.initShaders();
        this.initBuffers();
        this.textures = new Map();
        this.textCanvas = document.createElement('canvas');
        this.textCtx = this.textCanvas.getContext('2d');
        
        this.matrixStack = [[1,0,0, 0,1,0, 0,0,1]];
        this.stateStack = [{ alpha: 1.0, fillStyle: [1,1,1,1], font: '20px Arial', textAlign: 'left', brightness: 1.0, flash: 0.0 }];
    }

    get currentMatrix() { return this.matrixStack[this.matrixStack.length - 1]; }
    get currentState() { return this.stateStack[this.stateStack.length - 1]; }

    initShaders() {
        const vs = `#version 300 es
            in vec2 a_position; in vec2 a_texCoord;
            uniform vec2 u_resolution; uniform mat3 u_matrix;
            out vec2 v_texCoord;
            void main() {
                vec3 pos = u_matrix * vec3(a_position, 1.0);
                vec2 clipSpace = (pos.xy / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texCoord = a_texCoord;
            }`;
        const fs = `#version 300 es
            precision highp float;
            uniform sampler2D u_image; uniform vec4 u_color; uniform bool u_useTexture;
            uniform float u_brightness; uniform float u_flash;
            in vec2 v_texCoord; out vec4 outColor;
            void main() {
                if (u_useTexture) {
                    vec4 texColor = texture(u_image, v_texCoord);
                    vec4 premulColor = vec4(u_color.rgb * u_color.a, u_color.a);
                    vec4 tex = vec4(texColor.rgb * texColor.a, texColor.a);
                    outColor = tex * premulColor;
                    outColor.rgb = mix(outColor.rgb, vec4(1.0, 1.0, 1.0, 1.0).rgb * outColor.a, u_flash);
                    outColor.rgb *= u_brightness;
                } else {
                    outColor = vec4(u_color.rgb * u_color.a, u_color.a);
                }
            }`;
        const program = this.gl.createProgram();
        const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vShader, vs); this.gl.compileShader(vShader);
        const fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fShader, fs); this.gl.compileShader(fShader);
        this.gl.attachShader(program, vShader); this.gl.attachShader(program, fShader);
        this.gl.linkProgram(program);
        this.program = program;
        this.locs = {
            pos: this.gl.getAttribLocation(program, 'a_position'),
            uv: this.gl.getAttribLocation(program, 'a_texCoord'),
            res: this.gl.getUniformLocation(program, 'u_resolution'),
            mat: this.gl.getUniformLocation(program, 'u_matrix'),
            img: this.gl.getUniformLocation(program, 'u_image'),
            color: this.gl.getUniformLocation(program, 'u_color'),
            useTex: this.gl.getUniformLocation(program, 'u_useTexture'),
            brightness: this.gl.getUniformLocation(program, 'u_brightness'),
            flash: this.gl.getUniformLocation(program, 'u_flash')
        };
    }

    initBuffers() {
        this.posBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]), this.gl.STATIC_DRAW);
        this.uvBuf = this.gl.createBuffer();
    }

    multiply(a, b) {
        const a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8];
        const b00 = b[0], b01 = b[1], b02 = b[2], b10 = b[3], b11 = b[4], b12 = b[5], b20 = b[6], b21 = b[7], b22 = b[8];
        return [
            b00*a00+b01*a10+b02*a20, b00*a01+b01*a11+b02*a21, b00*a02+b01*a12+b02*a22,
            b10*a00+b11*a10+b12*a20, b10*a01+b11*a11+b12*a21, b10*a02+b11*a12+b12*a22,
            b20*a00+b21*a10+b22*a20, b20*a01+b21*a11+b22*a21, b20*a02+b21*a12+b22*a22
        ];
    }

    save() { this.matrixStack.push([...this.currentMatrix]); this.stateStack.push({...this.currentState}); }
    restore() { if (this.matrixStack.length > 1) this.matrixStack.pop(); if (this.stateStack.length > 1) this.stateStack.pop(); }
    scale(x, y) { 
        this.matrixStack[this.matrixStack.length-1] = this.multiply(this.currentMatrix, [x,0,0, 0,y,0, 0,0,1]); 
    }
    translate(x, y) { 
        this.matrixStack[this.matrixStack.length-1] = this.multiply(this.currentMatrix, [1,0,0, 0,1,0, x,y,1]); 
    }
    rotate(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        this.matrixStack[this.matrixStack.length-1] = this.multiply(this.currentMatrix, [c,s,0, -s,c,0, 0,0,1]);
    }

    set fillStyle(v) {
        if (typeof v === 'string') {
            if (v.startsWith('#')) {
                const r=parseInt(v.slice(1,3),16)/255, g=parseInt(v.slice(3,5),16)/255, b=parseInt(v.slice(5,7),16)/255;
                this.currentState.fillStyle = [r,g,b,1];
            } else if (v.startsWith('rgb')) {
                const m = v.match(/[\d.]+/g);
                if (m) {
                    const r = parseFloat(m[0])/255, g = parseFloat(m[1])/255, b = parseFloat(m[2])/255;
                    const a = m[3]!==undefined ? parseFloat(m[3]) : 1;
                    this.currentState.fillStyle = [r, g, b, a];
                }
            } else if (v.startsWith('hsla') || v.startsWith('hsl')) {
                const m = v.match(/[\d.]+/g);
                if (m) {
                    const h = parseFloat(m[0])/360, s = parseFloat(m[1])/100, l = parseFloat(m[2])/100, a = m[3]!==undefined ? parseFloat(m[3]) : 1;
                    const q = l < 0.5 ? l * (1+s) : l+s - l*s, p = 2*l - q;
                    const f = (t) => {
                        if (t<0) t+=1; if (t>1) t-=1;
                        if (t<1/6) return p + (q-p)*6*t;
                        if (t<1/2) return q;
                        if (t<2/3) return p + (q-p)*(2/3-t)*6;
                        return p;
                    };
                    this.currentState.fillStyle = [f(h+1/3), f(h), f(h-1/3), a];
                }
            } else {
                const colors = {
                    'white': [1,1,1,1], 'black': [0,0,0,1], 'red': [1,0,0,1], 'green': [0,1,0,1],
                    'blue': [0,0,1,1], 'yellow': [1,1,0,1], 'cyan': [0,1,1,1], 'magenta': [1,0,1,1],
                    'orange': [1,0.5,0,1]
                };
                this.currentState.fillStyle = colors[v.toLowerCase()] || [1,1,1,1];
            }
        } else this.currentState.fillStyle = v;
    }
    get fillStyle() { return this.currentState.fillStyle; }
    set globalAlpha(v) { this.currentState.alpha = v; }
    get globalAlpha() { return this.currentState.alpha; }
    set font(v) { this.currentState.font = v; }
    get font() { return this.currentState.font; }
    set textAlign(v) { this.currentState.textAlign = v; }
    get textAlign() { return this.currentState.textAlign; }
    set filter(v) { this.currentState.filter = v; }
    get filter() { return this.currentState.filter; }

    setTransform(a, b, c, d, e, f) {
        // a 0 e
        // b d f
        // 0 0 1
        this.matrixStack[this.matrixStack.length-1] = [a, b, 0, c, d, 0, e, f, 1];
    }

    clear() { 
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT); 
    }

    getTexture(img) {
        if (!img.complete && !(img instanceof HTMLCanvasElement) && !(typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas)) return null;
        const k = img.src || img;
        if (this.textures.has(k)) return this.textures.get(k);
        const t = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, t);
        
        // Ensure proper alpha handling for text and transparent sprites
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); // Standard alpha for regular sprites
        
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        
        // Use Bilinear filtering and generate Mipmaps for smooth downscaling
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        this.textures.set(k, t);
        return t;
    }

    drawImage(img, ...args) {
        const t = this.getTexture(img); if (!t) return;
        let sx=0, sy=0, sw=img.width, sh=img.height, dx, dy, dw, dh;
        if (args.length >= 8) [sx,sy,sw,sh,dx,dy,dw,dh] = args;
        else if (args.length >= 4) [dx,dy,dw,dh] = args;
        else { [dx,dy] = args; dw=img.width; dh=img.height; }

        this.gl.useProgram(this.program);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuf);
        this.gl.enableVertexAttribArray(this.locs.pos);
        this.gl.vertexAttribPointer(this.locs.pos, 2, this.gl.FLOAT, false, 0, 0);

        const u=sx/img.width, v=sy/img.height, w=sw/img.width, h=sh/img.height;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([u,v, u+w,v, u,v+h, u,v+h, u+w,v, u+w,v+h]), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.locs.uv);
        this.gl.vertexAttribPointer(this.locs.uv, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.uniform2f(this.locs.res, this.canvas.width, this.canvas.height);
        let m = this.multiply(this.currentMatrix, [1,0,0, 0,1,0, dx,dy,1]);
        m = this.multiply(m, [dw,0,0, 0,dh,0, 0,0,1]);
        this.gl.uniformMatrix3fv(this.locs.mat, false, m);
        
        let bright = 1.0;
        if (this.filter && this.filter.includes('brightness')) {
            const match = this.filter.match(/brightness\((.+?)\)/);
            if (match) bright = parseFloat(match[1]);
        }
        this.gl.uniform1f(this.locs.brightness, bright);
        this.gl.uniform1f(this.locs.flash, this.currentState.flash || 0.0);

        // For drawImage, we use the globalAlpha but default the fillStyle to white
        this.gl.uniform4fv(this.locs.color, [1, 1, 1, this.globalAlpha]);
        this.gl.uniform1i(this.locs.useTex, 1);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, t);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    fillRect(x, y, w, h) {
        this.gl.useProgram(this.program);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuf);
        this.gl.enableVertexAttribArray(this.locs.pos);
        this.gl.vertexAttribPointer(this.locs.pos, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.disableVertexAttribArray(this.locs.uv);
        this.gl.uniform2f(this.locs.res, this.canvas.width, this.canvas.height);
        let m = this.multiply(this.currentMatrix, [1,0,0, 0,1,0, x,y,1]);
        m = this.multiply(m, [w,0,0, 0,h,0, 0,0,1]);
        this.gl.uniformMatrix3fv(this.locs.mat, false, m);
        this.gl.uniform1f(this.locs.brightness, 1.0);
        
        // Handle fillStyle that might be a stubbed gradient object
        let c = [1, 1, 1, 1];
        if (Array.isArray(this.fillStyle)) {
            c = [...this.fillStyle];
        } else if (typeof this.fillStyle === 'object') {
            // Default to white if it's a gradient object we haven't implemented
            c = [1, 1, 1, 1];
        }
        
        c[3] *= this.globalAlpha;
        this.gl.uniform4fv(this.locs.color, c);
        this.gl.uniform1i(this.locs.useTex, 0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    fillText(txt, x, y) {
        let fontSize = 20;
        const fontSizeMatch = this.font.match(/(\d+)px/);
        if (fontSizeMatch) fontSize = parseInt(fontSizeMatch[1]);
        
        // Always set the text context font before measuring
        this.textCtx.font = this.font;
        const m = this.textCtx.measureText(txt);
        const w = Math.ceil(m.width) || 10;
        const h = Math.ceil(fontSize * 1.6); // Tight buffer around the font size
        
        // Force resize the canvas to exactly the dimensions needed for THIS text
        // This prevents the texture from being stretched or squashed by previous call's sizes.
        if (this.textCanvas.width !== w || this.textCanvas.height !== h) {
            this.textCanvas.width = w;
            this.textCanvas.height = h;
        }
        
        // Context state (font, textAlign) is reset when canvas is resized
        this.textCtx.clearRect(0, 0, w, h);
        this.textCtx.font = this.font;
        this.textCtx.textAlign = 'left';
        this.textCtx.textBaseline = 'middle';
        
        let c = [1, 1, 1, 1];
        if (Array.isArray(this.fillStyle)) c = this.fillStyle;
        this.textCtx.fillStyle = `rgba(${Math.floor(c[0]*255)},${Math.floor(c[1]*255)},${Math.floor(c[2]*255)},${c[3]})`;
        
        this.textCtx.fillText(txt, 0, h / 2);
        
        const t = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, t);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.textCanvas);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        let rx = x; 
        if (this.textAlign === 'center') rx = x - w/2; 
        else if (this.textAlign === 'right') rx = x - w;
        
        // Baseline alignment fix:
        // A middle baseline in a height of 1.6*fs puts the baseline at h/2 + ~0.35*fs.
        const drawY = y - (h/2 + fontSize * 0.25);
        this.drawTexture(t, rx, drawY, w, h);
        this.gl.deleteTexture(t);
    }

    drawTexture(t, x, y, w, h) {
        this.gl.useProgram(this.program);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuf);
        this.gl.enableVertexAttribArray(this.locs.pos);
        this.gl.vertexAttribPointer(this.locs.pos, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.locs.uv);
        this.gl.vertexAttribPointer(this.locs.uv, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.uniform2f(this.locs.res, this.canvas.width, this.canvas.height);
        let m = this.multiply(this.currentMatrix, [1,0,0, 0,1,0, x,y,1]);
        m = this.multiply(m, [w,0,0, 0,h,0, 0,0,1]);
        this.gl.uniformMatrix3fv(this.locs.mat, false, m);
        this.gl.uniform1f(this.locs.brightness, 1.0);
        this.gl.uniform4fv(this.locs.color, [1,1,1,this.globalAlpha]);
        this.gl.uniform1i(this.locs.useTex, 1);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, t);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.gl.deleteTexture(t);
    }

    beginPath() {} rect() {} clip() {} setTransform(a, b, c, d, e, f) { this.matrixStack[this.matrixStack.length-1] = [a, b, 0, c, d, 0, e, f, 1]; }
    arc(x, y, r) {
        this._lastArc = {x, y, r};
    } 
    stroke() {} fill() {
        if (this._lastArc) {
            const {x, y, r} = this._lastArc;
            this.fillRect(x - r, y - r, r * 2, r * 2);
            this._lastArc = null;
        }
    }
    moveTo() {} lineTo() {} closePath() {}
    createLinearGradient() { return { addColorStop: () => {} }; }
    createRadialGradient() { return { addColorStop: () => {} }; }
    set shadowBlur(v) {} set shadowColor(v) {} set globalCompositeOperation(v) {}
}

