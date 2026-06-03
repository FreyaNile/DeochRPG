import { DeochUtils } from './DeochUtils.js';
import { DataManager } from './DataManager.js';
import { InterfaceManager } from './InterfaceManager.js';
import { ProgressionManager } from './ProgressionManager.js';

/**
 * @class HealthOrbShader
 * @description Ultra-Premium Health/Mana Orb Shader. Spherical UV Projection, Domain Warping FBM, and Dual-Layer Colors.
 */
export class HealthOrbShader {
    /**
     * Creates an instance of HealthOrbShader.
     * @param {string} canvasId - Element ID of the canvas.
     * @param {string} [type='health'] - The orb type: 'health', 'mana', or 'stamina'.
     */
    constructor(canvasId, type = 'health') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Singleton check: prevent multiple shaders on the same canvas
        if (canvas._shaderInstance) {
            canvas._shaderInstance.cancel();
        }

        this.canvas = canvas;
        this.canvas._shaderInstance = this;

        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        const baseWidth = this.canvas.width || parseInt(this.canvas.getAttribute('width')) || 110;
        const baseHeight = this.canvas.height || parseInt(this.canvas.getAttribute('height')) || 110;

        this.canvas.width = baseWidth * dpr;
        this.canvas.height = baseHeight * dpr;
        this.canvas.style.width = `${baseWidth}px`;
        this.canvas.style.height = `${baseHeight}px`;

        this.gl = this.canvas.getContext('webgl', { alpha: true });
        if (!this.gl) return;

        this.type = type;
        this.health = 1.0;
        this.tempHealth = 0.0;
        this.targetHealth = 1.0;
        this.targetTempHealth = 0.0;
        this.time = 0;
        this.isCancelled = false;
        this._raf = null;
        this.isVisible = true;

        if (typeof window.IntersectionObserver !== 'undefined') {
            this._observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.isVisible = entry.isIntersecting;
                });
            }, { threshold: 0 });
            this._observer.observe(this.canvas);
        }

        this.colors = {
            health: {
                base: [0.2, 0, 0],
                deep: [0.2, 0.0, 0.0],
                glow: [1, 0.3, 0.3],
                temp: [0.0, 0.7, 0.15],
                tempGlow: [0.4, 1.0, 0.6]
            },
            mana: {
                base: [0.0, 0.1, 0.4],
                deep: [0.0, 0.02, 0.1],
                glow: [0.3, 0.8, 1.0],
                temp: [0.0, 0.0, 0.0],
                tempGlow: [0.0, 0.0, 0.0]
            },
            stamina: {
                base: [0.1, 0.1, 0.1],
                deep: [0.1, 0.1, 0.1],
                glow: [1.0, 0.75, 0.2],
                temp: [0.0, 0.0, 0.0],
                tempGlow: [0.0, 0.0, 0.0]
            }
        }[type];

        this.init();
        this.updateThemeColors();
        this.startLoop();
    }

    hexToRgb(hex) {
        const cleanHex = hex.replace('#', '').trim();
        if (cleanHex.length !== 6) return [1.0, 0.75, 0.2];
        const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
        const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
        const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
        return [r, g, b];
    }

    updateThemeColors() {
        if (this.type !== 'stamina') return;
        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent-primary').trim();
        if (accent) {
            const rgb = this.hexToRgb(accent);
            this.colors.glow = rgb;
            this.colors.base = [rgb[0] * 0.15, rgb[1] * 0.15, rgb[2] * 0.15];
            this.colors.deep = [rgb[0] * 0.05, rgb[1] * 0.05, rgb[2] * 0.05];
        }
    }

    /**
     * Starts the requestAnimationFrame render loop.
     */
    startLoop() {
        let lastTime = performance.now();
        const fpsInterval = 1000 / 60; // ~16.67ms
        const loop = (timestamp) => {
            if (this.isCancelled) return;
            this._raf = requestAnimationFrame(loop);

            const elapsed = timestamp - lastTime;
            if (elapsed >= fpsInterval) {
                const dt = Math.min(elapsed / 1000, 0.1);
                lastTime = timestamp - (elapsed % fpsInterval);
                this.animate(dt);
            }
        };
        this._raf = requestAnimationFrame(loop);
    }

    /**
     * Cancels the animation loop and clears references.
     */
    cancel() {
        this.isCancelled = true;
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this.canvas && this.canvas._shaderInstance === this) {
            this.canvas._shaderInstance = null;
        }
    }

    /**
     * Compiles shader programs and configures buffers.
     */
    init() {
        const vs = `
            attribute vec2 position;
            varying vec2 v_uv;
            void main() {
                v_uv = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fs = `
            precision highp float;
            varying vec2 v_uv;
            uniform float u_time;
            uniform float u_health;
            uniform float u_tempHealth;
            uniform vec3 u_colBase;
            uniform vec3 u_colDeep;
            uniform vec3 u_colGlow;
            uniform vec3 u_colTemp;
            uniform vec3 u_colTempGlow;

            #define PI 3.14159265359

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p *= 2.1;
                    a *= 0.5;
                }
                return v;
            }

            float pattern(vec2 p) {
                vec2 q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
                vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
                return fbm(p + 4.0 * r);
            }

            void main() {
                vec2 uv = v_uv;
                vec2 p = (uv - 0.5) * 2.0; 
                float r = length(p);

                if (r > 0.98) discard;

                float z = sqrt(max(0.0, 1.0 - r * r));
                vec2 sphereUv = vec2(atan(p.x, z) / PI + 0.5, asin(p.y) / PI + 0.5);

                vec3 colBackdrop = mix(vec3(0.05, 0.0, 0.02), vec3(0.1, 0.02, 0.05), p.y * 0.5 + 0.5);
                float motion = pattern(sphereUv * 3.0 + vec2(u_time * 0.4, u_time * 0.2));
                float wave = sin(p.x * 4.0 + u_time * 1.2) * 0.015;
                float thresholdTemp = (u_tempHealth * 2.0) - 1.0 + (wave * 1.1) + (motion * 0.08);
                float fillLevel = max(u_health, u_tempHealth);
                float threshold = (fillLevel * 2.0) - 1.0 + wave + motion * 0.05;
                
                float softness = 0.25;
                float isLiquid = smoothstep(softness, -softness, p.y - threshold);
                
                vec3 colVapor = u_colGlow * 0.3 * pattern(sphereUv * 3.0 + u_time * 0.15);
                vec3 colEmpty = mix(colBackdrop, colVapor, 0.4);

                vec3 colLiquid = vec3(0.0);
                if (isLiquid > 0.0) {
                    float depth = smoothstep(threshold, -1.0, p.y);
                    vec3 redCol = mix(u_colBase, u_colDeep, depth);
                    vec3 greenCol = mix(u_colTemp, vec3(0.0, 0.1, 0.02), depth);
                    float isTempZone = smoothstep(softness, -softness, p.y - thresholdTemp);
                    colLiquid = mix(redCol, greenCol, isTempZone);
                    
                    float churn = pattern(sphereUv * 8.0 - u_time * 0.8);
                    float glowWeight = clamp((u_tempHealth - u_health) * 10.0 + 0.5, 0.0, 1.0);
                    vec3 currentGlow = mix(u_colGlow, u_colTempGlow, glowWeight);
                    
                    colLiquid += currentGlow * churn * 0.8 * (1.0 - depth);
                    float surfaceFactor = smoothstep(0.1, 0.0, abs(p.y - threshold));
                    colLiquid += currentGlow * surfaceFactor * (1.2 + churn * 1.2);
                    
                    float bubbleNoise = fbm(sphereUv * 25.0 - vec2(0.0, u_time * 2.0));
                    float bubble = smoothstep(0.6, 1.0, bubbleNoise) * smoothstep(1.0, 0.0, depth);
                    colLiquid += currentGlow * bubble * 1.0;
                }

                vec3 color = mix(colEmpty, colLiquid, isLiquid);
                float nz = sqrt(max(0.0, 1.0 - dot(p, p)));
                vec3 normal = normalize(vec3(p.x, p.y, nz));
                vec3 viewDir = vec3(0.0, 0.0, 1.0);
                vec3 lightDir = normalize(vec3(0.65, 0.7, 0.6));
                vec3 halfVec  = normalize(lightDir + viewDir);
                float NdotL   = max(0.0, dot(normal, lightDir));
                float NdotH   = max(0.0, dot(normal, halfVec));
                float NdotV   = max(0.0, dot(normal, viewDir));

                color *= mix(0.5, 1.0, NdotL);
                float edgeDarken = pow(NdotV, 0.4);
                color *= edgeDarken;

                float specWide = pow(NdotH, 12.0);
                color += vec3(1.0, 0.97, 0.93) * specWide * 0.12;
                float specTight = pow(NdotH, 90.0);
                color += vec3(1.0, 0.99, 0.98) * specTight * 0.55;

                vec3 causticLight = normalize(vec3(0.55, 0.8, 0.6));
                vec3 causticHalf  = normalize(causticLight + viewDir);
                float causticNdotH = max(0.0, dot(normal, causticHalf));
                float causticRing = pow(causticNdotH, 8.0) * (1.0 - pow(causticNdotH, 35.0));
                color += vec3(1.0, 0.96, 0.9) * causticRing * 0.135;

                float fresnel = pow(1.0 - NdotV, 2.5);
                color += u_colGlow * fresnel * 0.25;

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        this.program = this.createProgram(vs, fs);
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);

        this.locations = {
            position: this.gl.getAttribLocation(this.program, 'position'),
            u_time: this.gl.getUniformLocation(this.program, 'u_time'),
            u_health: this.gl.getUniformLocation(this.program, 'u_health'),
            u_tempHealth: this.gl.getUniformLocation(this.program, 'u_tempHealth'),
            u_colBase: this.gl.getUniformLocation(this.program, 'u_colBase'),
            u_colDeep: this.gl.getUniformLocation(this.program, 'u_colDeep'),
            u_colGlow: this.gl.getUniformLocation(this.program, 'u_colGlow'),
            u_colTemp: this.gl.getUniformLocation(this.program, 'u_colTemp'),
            u_colTempGlow: this.gl.getUniformLocation(this.program, 'u_colTempGlow')
        };
    }

    /**
     * Compiles and links vertex and fragment shaders.
     * @param {string} vsSource - Vertex shader source code.
     * @param {string} fsSource - Fragment shader source code.
     * @returns {WebGLProgram|null} The compiled program, or null on error.
     */
    createProgram(vsSource, fsSource) {
        const gl = this.gl;
        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error('Shader error:', gl.getShaderInfoLog(s));
                return null;
            }
            return s;
        };
        const vs = compile(gl.VERTEX_SHADER, vsSource);
        const fs = compile(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return null;

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Link error:', gl.getProgramInfoLog(prog));
            return null;
        }
        return prog;
    }

    /**
     * Updates target values for health and temporary health animation.
     * @param {number} val - Normal health ratio (0.0 to 1.0).
     * @param {number} [temp=0.0] - Temp health ratio (0.0 to 1.0).
     */
    setHealth(val, temp = 0.0) {
        this.targetHealth = val;
        this.targetTempHealth = temp;
    }

    animate(dt) {
        if (this.isCancelled) return;
        this.time += dt;
        const factor = 1 - Math.pow(0.9, dt * 60);
        this.health += (this.targetHealth - this.health) * factor;
        this.tempHealth += (this.targetTempHealth - this.tempHealth) * factor;

        // Skip WebGL drawing if the tab/document is hidden or the canvas is hidden/unrendered
        if (document.hidden || !this.canvas || !this.isVisible) {
            return;
        }

        const gl = this.gl;
        if (!gl || !this.program) return;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        const posLoc = this.locations.position;
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(this.locations.u_time, this.time);
        gl.uniform1f(this.locations.u_health, this.health);
        gl.uniform1f(this.locations.u_tempHealth, this.tempHealth);

        gl.uniform3fv(this.locations.u_colBase, this.locations.u_colBase ? this.colors.base : new Float32Array(3));
        gl.uniform3fv(this.locations.u_colDeep, this.locations.u_colDeep ? this.colors.deep : new Float32Array(3));
        gl.uniform3fv(this.locations.u_colGlow, this.locations.u_colGlow ? this.colors.glow : new Float32Array(3));
        gl.uniform3fv(this.locations.u_colTemp, this.locations.u_colTemp ? this.colors.temp : new Float32Array(3));
        gl.uniform3fv(this.locations.u_colTempGlow, this.locations.u_colTempGlow ? this.colors.tempGlow : new Float32Array(3));

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

/**
 * @module VitalsManager
 * @description Orchestrates health, mana, and stamina state and synchronization with orbs.
 */
export const VitalsManager = {
    lastKnownHP: null,
    lastKnownTempHP: null,
    lastKnownDeathHP: null,
    lastKnownMP: null,
    lastKnownSP: null,
    initialized: false,

    /**
     * Initializes the VitalsManager with an AbortSignal.
     * @param {AbortSignal} signal - Signal for cleaning up event listeners.
     */
    init(signal) {
        // If already initialized with the same signal, skip
        if (this.initialized && this.signal === signal) return;

        this.signal = signal;
        this.initListeners();
        this.bindEvents();

        // Only start sync loop once
        if (!this.initialized) {
            this.visualsTimeout = setTimeout(() => this.initVisuals(), 50);
            this.startOrbSync();
            this.refreshOrbVisibility();
            this.initialized = true;
            console.log('VitalsManager: Initialized');
        }
    },

    /**
     * Instantiates the HealthOrbShader instances for the various canvas elements.
     */
    initVisuals() {
        const tasks = [];
        const hudHealthCanvas = document.getElementById('hud-health-orb-canvas');
        const hudManaCanvas = document.getElementById('hud-mana-orb-canvas');
        const hudStaminaCanvas = document.getElementById('hud-stamina-orb-canvas');

        if (hudHealthCanvas && !window.hudHealthOrbShader) {
            tasks.push(() => { window.hudHealthOrbShader = new HealthOrbShader('hud-health-orb-canvas', 'health'); });
        }
        if (hudManaCanvas && !window.hudManaOrbShader) {
            tasks.push(() => { window.hudManaOrbShader = new HealthOrbShader('hud-mana-orb-canvas', 'mana'); });
        }
        if (hudStaminaCanvas && !window.hudStaminaOrbShader) {
            tasks.push(() => { window.hudStaminaOrbShader = new HealthOrbShader('hud-stamina-orb-canvas', 'stamina'); });
        }

        if (tasks.length === 0) return;

        const runNextTask = () => {
            if (tasks.length === 0) return;
            const task = tasks.shift();
            task();
            if (tasks.length > 0) {
                this.visualsTimeout = setTimeout(runNextTask, 16);
            }
        };

        runNextTask();
    },

    /**
     * Cleans up vitals sync loops, timeouts, and handlers.
     */
    cleanup() {
        if (this.idleHandle) window.cancelIdleCallback(this.idleHandle);
        if (this.visualsTimeout) clearTimeout(this.visualsTimeout);
        if (this._syncRaf) cancelAnimationFrame(this._syncRaf);
        this.initialized = false;
        this.lastKnownHP = null;
        this.lastKnownDeathHP = null;
        console.log('VitalsManager: Cleanup called');
    },

    /**
     * Registers touch zone listeners for vitals adjustment.
     */
    initListeners() {
        // Direct event binding on touch zones for maximum responsiveness
        document.querySelectorAll('.orb-touch-zone').forEach(el => {
            el.addEventListener('click', (_e) => {
                // Prevent interference with long-press logic in InterfaceManager
                if (InterfaceManager && InterfaceManager.wasLongPress) return;

                const stat = el.getAttribute('data-stat');
                const delta = parseInt(el.getAttribute('data-delta')) || 0;
                if (stat && delta !== 0) {
                    this.adjust(stat, delta, 'orb');
                }
            }, { signal: this.signal });
        });
    },

    /**
     * Binds input event listeners to maximum stat inputs.
     */
    bindEvents() {
        const hpInput = document.getElementById('hud-max-hp-input');
        const mpInput = document.getElementById('hud-max-mp-input');
        const spInput = document.getElementById('mobile-max-sp-input');

        if (hpInput) hpInput.addEventListener('change', () => this.updateMaxStat('hp'), { signal: this.signal });
        if (mpInput) mpInput.addEventListener('change', () => this.updateMaxStat('mana'), { signal: this.signal });
        if (spInput) spInput.addEventListener('change', () => this.updateMaxStat('stamina'), { signal: this.signal });
    },

    /**
     * Updates the max value for a given stat type.
     * @param {string} type - The stat type: 'hp', 'mana', or 'stamina'.
     */
    updateMaxStat(type) {
        const activeChar = DataManager.activeCharacter;
        if (type === 'hp' || type === 'health') {
            activeChar.maxHp = DeochUtils.getInt('hud-max-hp-input', 28);
            if (activeChar.currentHp > activeChar.maxHp) activeChar.currentHp = activeChar.maxHp;
            this.triggerSlosh('.health-orb');
        } else if (type === 'mana' || type === 'mp') {
            activeChar.maxMp = DeochUtils.getInt('hud-max-mp-input', 12);
            if (activeChar.currentMp > activeChar.maxMp) activeChar.currentMp = activeChar.maxMp;
            this.triggerSlosh('.mana-orb');
        } else if (type === 'stamina' || type === 'sp') {
            activeChar.maxSp = DeochUtils.getInt('mobile-max-sp-input', 10);
            if (activeChar.currentSp > activeChar.maxSp) activeChar.currentSp = activeChar.maxSp;
            this.triggerSlosh('.stamina-orb');
        }
        this.refreshOrbVisibility();
        this.syncToMainSheet();
    },

    /**
     * Adjusts the current value of a stat type.
     * @param {string} type - The stat type: 'hp', 'mana', or 'stamina'.
     * @param {number} delta - The value to add or subtract.
     */
    adjust(type, delta, source = null) {
        const activeChar = DataManager.activeCharacter;
        if (type === 'hp' || type === 'health') {
            const max = activeChar.maxHp || 28;
            const currentHp = activeChar.currentHp || 0;
            const currentTemp = activeChar.tempHp || 0;

            if (ProgressionManager) {
                const res = ProgressionManager.calculateHPChange(currentHp, currentTemp, delta, max, source);
                activeChar.currentHp = res.hp;
                activeChar.tempHp = res.temp;
            }
            this.checkDeathStatus();
        } else if (type === 'mana' || type === 'mp') {
            const max = activeChar.maxMp || 12;
            activeChar.currentMp = Math.max(0, Math.min(max, (activeChar.currentMp || 0) + delta));
        } else if (type === 'stamina' || type === 'sp') {
            const max = activeChar.maxSp || 10;
            activeChar.currentSp = Math.max(0, Math.min(max, (activeChar.currentSp || 0) + delta));
        } else if (type === 'temp-hp') {
            activeChar.tempHp = delta;
        }

        if (navigator.vibrate) navigator.vibrate(10);
        this.syncToMainSheet();
    },

    /**
     * Starts the requestAnimationFrame synchronization loop.
     */
    startOrbSync() {
        let lastTime = performance.now();
        const fpsInterval = 1000 / 60; // 60fps
        const sync = (timestamp) => {
            if (!this.initialized || (this.signal && this.signal.aborted)) return;
            this._syncRaf = requestAnimationFrame(sync);

            const elapsed = timestamp - lastTime;
            if (elapsed >= fpsInterval) {
                lastTime = timestamp - (elapsed % fpsInterval);
                this.animateOrbs();
                this.syncToHUDText();
            }
        };
        this._syncRaf = requestAnimationFrame(sync);
    },

    /**
     * Animates and sets target values on all active health/mana/stamina shaders.
     */
    animateOrbs() {
        const activeChar = DataManager.activeCharacter;
        const maxHp = activeChar.maxHp || 28;
        const maxMp = activeChar.maxMp || 12;
        const maxSp = activeChar.maxSp || 10;

        const hpPct = (activeChar.currentHp || 0) / maxHp;
        const tempPct = (activeChar.tempHp || 0) / maxHp;
        const mpPct = (activeChar.currentMp || 0) / maxMp;
        const spPct = (activeChar.currentSp || 0) / maxSp;

        if (window.hudHealthOrbShader) window.hudHealthOrbShader.setHealth(hpPct, tempPct);
        if (window.hudManaOrbShader) window.hudManaOrbShader.setHealth(mpPct);
        if (window.hudStaminaOrbShader) window.hudStaminaOrbShader.setHealth(spPct);
    },

    /**
     * Synchronizes current stats with the HUD text displays.
     */
    syncToHUDText() {
        const activeChar = DataManager.activeCharacter;
        if (!activeChar) return;

        const currentHp = activeChar.currentHp || 0;
        const tempHp = activeChar.tempHp || 0;
        const currentMp = activeChar.currentMp || 0;
        const currentSp = activeChar.currentSp || 0;

        const hpChanged = currentHp !== this.lastKnownHP || tempHp !== this.lastKnownTempHP;
        const mpChanged = currentMp !== this.lastKnownMP;
        const spChanged = currentSp !== this.lastKnownSP;

        if (hpChanged) {
            const hpText = document.getElementById('hud-hp-text');
            if (hpText) {
                const total = Math.round(currentHp + tempHp);
                hpText.textContent = total;
                hpText.style.color = (tempHp > 0.5) ? '#16a34a' : '#ffffff';
            }
            this.lastKnownHP = currentHp;
            this.lastKnownTempHP = tempHp;
        }

        if (mpChanged) {
            DeochUtils.setText('hud-mp-text', Math.round(currentMp));
            this.lastKnownMP = currentMp;
        }

        if (spChanged) {
            DeochUtils.setText('hud-sp-text', Math.round(currentSp));
            this.lastKnownSP = currentSp;
        }
    },

    /**
     * Synchronizes current stats to the main character sheet inputs.
     */
    syncToMainSheet() {
        const activeChar = DataManager.activeCharacter;
        const hpInput = document.getElementById('char-hp');
        const mpInput = document.getElementById('char-mana') || document.getElementById('char-mp');
        const spInput = document.getElementById('char-stamina') || document.getElementById('char-sp');
        if (hpInput) hpInput.value = Math.round(activeChar.currentHp || 0);
        if (mpInput) mpInput.value = Math.round(activeChar.currentMp || 0);
        if (spInput) spInput.value = Math.round(activeChar.currentSp || 0);
    },

    /**
     * Shows the death/mercy dialog.
     * @param {boolean} isMercy - Whether mercy was activated by inspiration.
     */
    showDeathPrompt(isMercy) {
        const dialog = document.getElementById('death-mercy-dialog');
        if (!dialog) return;

        const config = isMercy ? {
            title: 'MERCY', color: '#a28352', glow: 'rgba(162, 131, 82, 0.4)',
            msg: 'Inspiration has saved you from the brink. You cling to life with 1 HP remaining.',
            icon: 'sparkles',
            btnText: 'CLING TO LIFE'
        } : {
            title: 'YOU ARE DEAD', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)',
            msg: 'The darkness claims your soul. This character has met their end.',
            icon: 'skull',
            btnText: 'ACCEPT FATE'
        };

        this.applyDeathPromptStyles(dialog, config, isMercy);

        if (isMercy) {
            this.activateMercyState();
        }

        dialog.showModal();
    },

    applyDeathPromptStyles(dialog, config, isMercy) {
        const deathTitle = document.getElementById('death-mercy-title');
        const deathText = document.getElementById('death-mercy-text');
        const deathIconContainer = document.getElementById('death-mercy-icon-container');
        const deathClose = document.getElementById('death-mercy-close');

        dialog.classList.toggle('border-danger', !isMercy);
        dialog.style.borderColor = config.color;
        dialog.style.boxShadow = `0 0 50px ${config.glow}`;

        if (deathTitle) {
            deathTitle.classList.toggle('u-text-danger', !isMercy);
            deathTitle.textContent = config.title;
            deathTitle.style.color = config.color;
            deathTitle.style.textShadow = `0 0 20px ${config.glow}`;
        }
        if (deathText) {
            deathText.textContent = config.msg;
            deathText.style.color = '#EAE6DF';
        }
        if (deathIconContainer) {
            deathIconContainer.classList.toggle('u-text-danger', !isMercy);
            deathIconContainer.style.color = config.color;
            const icon = deathIconContainer.querySelector('i, svg');
            if (icon) icon.setAttribute('data-lucide', config.icon);
            DeochUtils.queueIconRefresh(deathIconContainer);
        }
        if (deathClose) {
            deathClose.classList.toggle('u-bg-danger', !isMercy);
            deathClose.style.background = config.color;
            deathClose.style.setProperty('color', '#EAE6DF', 'important');
            deathClose.textContent = config.btnText;
        }
    },

    activateMercyState() {
        DataManager.activeCharacter.currentHp = 1;
        this.syncToMainSheet();
        const insp = document.getElementById('test-hud-inspiration');
        if (insp) {
            insp.checked = false;
            insp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.lastKnownHP = 1;
        this.lastKnownDeathHP = 1;
    },

    /**
     * Checks if current HP dropped to 0 and triggers the death dialog if appropriate.
     */
    checkDeathStatus() {
        const currentHP = DataManager.activeCharacter.currentHp || 0;
        if (this.lastKnownDeathHP === null) { this.lastKnownDeathHP = currentHP; return; }

        if (currentHP === 0 && this.lastKnownDeathHP > 0) {
            const inspEl = document.getElementById('test-hud-inspiration');
            const isInspired = inspEl?.checked ?? false;
            this.showDeathPrompt(isInspired);
        }
        this.lastKnownDeathHP = DataManager.activeCharacter.currentHp || 0;
    },

    /**
     * Triggers the slosh animation class on a target selector.
     * @param {string} sel - CSS Selector for the target element.
     */
    triggerSlosh(_sel) {
        // Disabled by user request
    },

    /**
     * Refreshes the display style of mana/stamina orb containers based on maximum values.
     */
    refreshOrbVisibility() {
        const activeChar = DataManager.activeCharacter;
        const maxMp = activeChar.maxMp;
        const maxSp = activeChar.maxSp;
        const mpGroup = document.querySelector('.mp-group');
        const spGroup = document.querySelector('.sp-group');

        if (mpGroup) {
            mpGroup.style.display = (maxMp <= 0) ? 'none' : 'flex';
        }

        if (spGroup) {
            spGroup.style.display = (maxSp <= 0) ? 'none' : 'flex';
            // Adjust position if Mana is hidden but Stamina is still visible
            if (maxMp <= 0) {
                spGroup.classList.add('hidden-mp');
            } else {
                spGroup.classList.remove('hidden-mp');
            }
        }
    }
};
