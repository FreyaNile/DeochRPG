import { DeochUtils } from './DeochUtils.js';

/**
 * @class HealthOrbShader
 * @description Ultra-Premium Health/Mana Orb Shader. Spherical UV Projection, Domain Warping FBM, and Dual-Layer Colors.
 */
export class HealthOrbShader {
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
        const rect = this.canvas.getBoundingClientRect();
        const baseWidth = rect.width || parseInt(this.canvas.getAttribute('width')) || 110;
        const baseHeight = rect.height || parseInt(this.canvas.getAttribute('height')) || 110;

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
        this.startLoop();
    }

    startLoop() {
        const loop = () => {
            if (this.isCancelled) return;
            this.animate();
            this._raf = requestAnimationFrame(loop);
        };
        this._raf = requestAnimationFrame(loop);
    }

    cancel() {
        this.isCancelled = true;
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this.canvas && this.canvas._shaderInstance === this) {
            this.canvas._shaderInstance = null;
        }
    }

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
    }

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

    setHealth(val, temp = 0.0) {
        this.targetHealth = val;
        this.targetTempHealth = temp;
    }

    animate() {
        if (this.isCancelled) return;
        this.time += 0.016;
        this.health += (this.targetHealth - this.health) * 0.1;
        this.tempHealth += (this.targetTempHealth - this.tempHealth) * 0.1;

        const gl = this.gl;
        if (!gl || !this.program) return;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        const posLoc = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), this.time);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_health'), this.health);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_tempHealth'), this.tempHealth);

        gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colBase'), this.colors.base);
        gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colDeep'), this.colors.deep);
        gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colGlow'), this.colors.glow);
        gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colTemp'), this.colors.temp);
        gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colTempGlow'), this.colors.tempGlow);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

/**
 * @module VitalsManager
 * @description Orchestrates health, mana, and stamina state and synchronization with orbs.
 */
export const VitalsManager = {
    lastKnownHP: null,
    initialized: false,

    init(signal) {
        // If already initialized with the same signal, skip
        if (this.initialized && this.signal === signal) return;

        this.signal = signal;
        this.initListeners();
        this.bindEvents();

        // Only start sync loop once
        if (!this.initialized) {
            this.startOrbSync();
            this.refreshOrbVisibility();
            this.initialized = true;
            console.log('VitalsManager: Initialized');
        }
    },

    cleanup() {
        this.initialized = false;
        this.lastKnownHP = null;
        console.log('VitalsManager: Cleanup called');
    },

    initListeners() {
        // Direct event binding on touch zones for maximum responsiveness
        document.querySelectorAll('.orb-touch-zone').forEach(el => {
            el.addEventListener('click', (e) => {
                // Prevent interference with long-press logic in InterfaceManager
                if (window.InterfaceManager && window.InterfaceManager.wasLongPress) return;

                const stat = el.getAttribute('data-stat');
                const delta = parseInt(el.getAttribute('data-delta')) || 0;
                if (stat && delta !== 0) {
                    this.adjust(stat, delta);
                }
            }, { signal: this.signal });
        });
    },

    bindEvents() {
        const hpInput = document.getElementById('hud-max-hp-input');
        const mpInput = document.getElementById('hud-max-mp-input');
        const spInput = document.getElementById('mobile-max-sp-input');

        if (hpInput) hpInput.addEventListener('change', () => this.updateMaxStat('hp'), { signal: this.signal });
        if (mpInput) mpInput.addEventListener('change', () => this.updateMaxStat('mana'), { signal: this.signal });
        if (spInput) spInput.addEventListener('change', () => this.updateMaxStat('stamina'), { signal: this.signal });
    },

    updateMaxStat(type) {
        if (type === 'hp') {
            window.mobileMaxHp = DeochUtils.getInt('hud-max-hp-input', 28);
            if (window.mobileTargetHp > window.mobileMaxHp) window.mobileTargetHp = window.mobileMaxHp;
        } else if (type === 'mana') {
            window.mobileMaxMp = DeochUtils.getInt('hud-max-mp-input', 12);
            if (window.mobileTargetMp > window.mobileMaxMp) window.mobileTargetMp = window.mobileMaxMp;
        } else if (type === 'stamina') {
            window.mobileMaxSp = DeochUtils.getInt('mobile-max-sp-input', 10);
            if (window.mobileTargetSp > window.mobileMaxSp) window.mobileTargetSp = window.mobileMaxSp;
        }
        this.refreshOrbVisibility();
    },

    adjust(type, delta) {
        if (type === 'hp' || type === 'health') {
            const max = window.mobileMaxHp || 28;
            const currentHp = window.mobileTargetHp || 0;
            const currentTemp = window.mobileTargetTempHp || 0;

            if (window.ProgressionManager) {
                const res = window.ProgressionManager.calculateHPChange(currentHp, currentTemp, delta, max);
                window.mobileTargetHp = res.hp;
                window.mobileTargetTempHp = res.temp;
            }
            this.triggerSlosh('.health-orb');
            this.checkDeathStatus();
        } else if (type === 'mana' || type === 'mp') {
            const max = window.mobileMaxMp || 12;
            window.mobileTargetMp = Math.max(0, Math.min(max, (window.mobileTargetMp || 0) + delta));
            this.triggerSlosh('.mana-orb');
        } else if (type === 'stamina' || type === 'sp') {
            const max = window.mobileMaxSp || 10;
            window.mobileTargetSp = Math.max(0, Math.min(max, (window.mobileTargetSp || 0) + delta));
            this.triggerSlosh('.stamina-orb');
        } else if (type === 'temp-hp') {
            window.mobileTargetTempHp = delta;
        }

        if (navigator.vibrate) navigator.vibrate(10);
        this.syncToMainSheet();
    },

    startOrbSync() {
        const sync = () => {
            if (!this.initialized || (this.signal && this.signal.aborted)) return;
            this.animateOrbs();
            this.syncToHUDText();
            requestAnimationFrame(sync);
        };
        requestAnimationFrame(sync);
    },

    animateOrbs() {
        const maxHp = window.mobileMaxHp || 28;
        const maxMp = window.mobileMaxMp || 12;
        const maxSp = window.mobileMaxSp || 10;

        const hpPct = (window.mobileTargetHp || 0) / maxHp;
        const tempPct = (window.mobileTargetTempHp || 0) / maxHp;
        const mpPct = (window.mobileTargetMp || 0) / maxMp;
        const spPct = (window.mobileTargetSp || 0) / maxSp;

        if (window.healthOrbShader) window.healthOrbShader.setHealth(hpPct, tempPct);
        if (window.hudHealthOrbShader) window.hudHealthOrbShader.setHealth(hpPct, tempPct);

        if (window.manaOrbShader) window.manaOrbShader.setHealth(mpPct);
        if (window.hudManaOrbShader) window.hudManaOrbShader.setHealth(mpPct);

        if (window.hudStaminaOrbShader) window.hudStaminaOrbShader.setHealth(spPct);
    },

    syncToHUDText() {
        const hpText = document.getElementById('hud-hp-text');
        if (hpText) {
            const total = Math.round((window.mobileTargetHp || 0) + (window.mobileTargetTempHp || 0));
            hpText.textContent = total;
            hpText.style.color = (window.mobileTargetTempHp > 0.5) ? '#16a34a' : '#ffffff';
        }
        DeochUtils.setText('hud-mp-text', Math.round(window.mobileTargetMp || 0));
        DeochUtils.setText('hud-sp-text', Math.round(window.mobileTargetSp || 0));
    },

    syncToMainSheet() {
        const hpInput = document.getElementById('char-hp');
        const mpInput = document.getElementById('char-mp');
        if (hpInput) hpInput.value = Math.round(window.mobileTargetHp || 0);
        if (mpInput) mpInput.value = Math.round(window.mobileTargetMp || 0);
    },

    showDeathPrompt(isMercy) {
        const dialog = document.getElementById('death-mercy-dialog');
        if (!dialog) return;

        const deathTitle = document.getElementById('death-mercy-title');
        const deathText = document.getElementById('death-mercy-text');
        const deathIconContainer = document.getElementById('death-mercy-icon-container');
        const deathClose = document.getElementById('death-mercy-close');

        const config = isMercy ? {
            title: 'MERCY', color: 'var(--accent-primary)', glow: 'var(--accent-glow)',
            msg: 'Inspiration has saved you from the brink. You cling to life with 1 HP remaining.',
            icon: 'sparkles'
        } : {
            title: 'YOU ARE DEAD', color: 'var(--color-danger)', glow: 'rgba(239, 68, 68, 0.4)',
            msg: 'The darkness claims your soul. This character has met their end.',
            icon: 'skull'
        };

        if (deathTitle) {
            deathTitle.textContent = config.title;
            deathTitle.style.color = config.color;
            deathTitle.style.textShadow = `0 0 20px ${config.glow}`;
        }
        if (deathText) deathText.textContent = config.msg;
        if (deathClose) deathClose.style.background = config.color;

        dialog.style.borderColor = config.color;
        dialog.style.boxShadow = `0 0 50px ${config.glow}`;

        const icon = deathIconContainer?.querySelector('i, svg');
        if (icon) icon.setAttribute('data-lucide', config.icon);

        if (isMercy) {
            window.mobileTargetHp = 1;
            this.syncToMainSheet();
            const insp = document.getElementById('test-hud-inspiration');
            if (insp) {
                insp.checked = false;
                insp.dispatchEvent(new Event('change', { bubbles: true }));
            }
            this.lastKnownHP = 1;
        }

        DeochUtils.queueIconRefresh();
        dialog.showModal();
    },

    checkDeathStatus() {
        const currentHP = window.mobileTargetHp || 0;
        if (this.lastKnownHP === null) { this.lastKnownHP = currentHP; return; }

        if (currentHP === 0 && this.lastKnownHP > 0) {
            const inspEl = document.getElementById('test-hud-inspiration');
            const isInspired = inspEl?.checked ?? false;
            this.showDeathPrompt(isInspired);
        }
        this.lastKnownHP = currentHP;
    },

    triggerSlosh(sel) {
        const el = document.querySelector(sel);
        if (el) {
            el.classList.remove('sloshing');
            el.getBoundingClientRect();
            el.classList.add('sloshing');
        }
    },

    refreshOrbVisibility() {
        const maxMp = window.mobileMaxMp ?? DeochUtils.getInt('hud-max-mp-input', 12);
        const maxSp = window.mobileMaxSp ?? DeochUtils.getInt('mobile-max-sp-input', 10);
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
