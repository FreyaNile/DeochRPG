/**
 * @module DeochUtils
 * @description Pure, stateless shared utility functions for DOM manipulation, math, and icons.
 */
export const DeochUtils = {
    saveCharacter() {
        if (window.DataManager && typeof window.DataManager.saveCharacter === 'function') {
            window.DataManager.saveCharacter();
        } else {
            console.warn('DeochUtils: DataManager not ready for save.');
        }
    },
    _iconRefreshScheduled: false,

    /**
     * Schedules a Lucide icon refresh on the next animation frame.
     */
    queueIconRefresh: () => {
        if (DeochUtils._iconRefreshScheduled) return;
        if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;

        DeochUtils._iconRefreshScheduled = true;
        requestAnimationFrame(() => {
            DeochUtils._iconRefreshScheduled = false;
            window.lucide.createIcons();
        });
    },

    // --- DOM Helpers ---
    qs: (sel, scope = document) => scope.querySelector(sel),
    qsa: (sel, scope = document) => Array.from(scope.querySelectorAll(sel)),

    /**
     * Adds an event listener.
     * @param {HTMLElement|string} target - The element or ID of the element to attach the listener to.
     */
    addEvent: (target, event, handler, options = {}) => {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (el) el.addEventListener(event, handler, options);
    },

    getElement: (id) => document.getElementById(id),

    setText: (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    setValue: (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    },

    setChecked: (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    },

    /**
     * Robustly extracts an integer from an element's text or value.
     * Strips non-numeric characters to handle labels like "EXP: 500".
     */
    getInt: (id, def = 0) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const raw = (el.textContent || el.value || '').toString();
        const numericMatch = raw.match(/-?\d+/);
        return numericMatch ? parseInt(numericMatch[0], 10) : def;
    },

    getFloat: (id, def = 0) => {
        const el = document.getElementById(id);
        if (!el) return def;
        return parseFloat(el.textContent || el.value) || def;
    },

    smartSet: (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            el.textContent = value;
        }
    },

    showFeedback: (id, message, iconName = 'check') => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="${iconName}"></i> ${message}`;
        DeochUtils.queueIconRefresh();
        setTimeout(() => {
            btn.innerHTML = originalText;
            DeochUtils.queueIconRefresh();
        }, 2000);
    },

    toggleDisplay: (id, isVisible, visibleValue = 'block') => {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.style.display = isVisible ? visibleValue : 'none';
    },

    // --- Storage Wrappers ---

    Storage: {
        get: (key, defaultValue = null) => {
            try {
                const val = localStorage.getItem(key);
                return val !== null ? val : defaultValue;
            } catch (e) {
                console.error(`DeochUtils: Storage error reading "${key}"`, e);
                return defaultValue;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.error(`DeochUtils: Storage error writing "${key}"`, e);
                return false;
            }
        },
        getJson: (key, defaultValue = null) => {
            const val = DeochUtils.Storage.get(key);
            if (!val) return defaultValue;
            try {
                return JSON.parse(val);
            } catch (_e) {
                console.warn('DeochUtils: JSON parse error for key ' + key, _e);
                return defaultValue;
            }
        },
        setJson: (key, value) => DeochUtils.Storage.set(key, JSON.stringify(value)),
        remove: (key) => localStorage.removeItem(key),
        clear: () => {
            // Fix: Only clear DEOCH-related keys to avoid nuking other app data
            Object.keys(localStorage).forEach(key => {
                if (key.includes('deoch')) {
                    localStorage.removeItem(key);
                }
            });
        }
    },

    // --- Deoch Rule Formulas (Pure) ---

    calculateMod: (val) => Math.floor((val - 10) / 2),

    /**
     * Cryptographically secure random number between 0 (inclusive) and 1 (exclusive).
     */
    random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,

    /**
     * Helper for smooth opacity transitions after display changes.
     */
    safeTransition: (el, display = 'block', opacity = '1', delay = 50) => {
        const target = typeof el === 'string' ? document.getElementById(el) : el;
        if (!target) return;
        target.style.display = display;
        setTimeout(() => { target.style.opacity = opacity; }, delay);
    },

    /**
     * Escapes HTML special characters to prevent XSS when injecting
     * user-controlled or data-layer strings into innerHTML.
     * @param {string} str - Raw string to sanitize.
     * @returns {string} HTML-safe string.
     */
    escapeHtml: (str) => {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    /**
     * Standardized character card rendering to unify Unified and Legacy galleries.
     */
    renderGalleryCard: (char, { activeId = null, variant = 'modern', isNew = false } = {}) => {
        const isActive = char?.id === activeId;
        const rawName = isNew ? 'Create New' : (char?.name || 'Unknown Hero');
        const totalLevel = (char?.level !== undefined && char?.level !== null) ? parseInt(char.level) : 1;
        let rawMeta = '';

        if (isNew) {
            rawMeta = 'Begin a new journey';
        } else if (char?.isMulticlass && char?.secondaryClass && totalLevel > 5) {
            rawMeta = `${char.primaryClass} 5 / ${char.secondaryClass} ${totalLevel - 5}`;
        } else {
            rawMeta = `${char?.primaryClass || 'Hero'} ${totalLevel}`;
        }

        const name = DeochUtils.escapeHtml(rawName);
        const meta = DeochUtils.escapeHtml(rawMeta);
        const icon = isNew ? 'plus' : 'user';

        if (variant === 'modern') {
            const card = document.createElement('div');
            card.className = 'test-gallery-card' + (isNew ? ' new-char' : '') + (isActive ? ' active' : '');
            
            const watermarkHtml = (char?.avatar && !isNew) 
                ? `<div class="char-watermark"><img src="${char.avatar}" alt=""></div>`
                : '';

            const iconHtml = isNew 
                ? `<div class="char-avatar"><i data-lucide="${icon}"></i></div>`
                : '';

            card.innerHTML = `
                <div class="card-bg"></div>
                ${watermarkHtml}
                <div class="card-content">
                    ${iconHtml}
                    <div class="char-info">
                        <div class="char-name">${name}</div>
                        <div class="char-meta">${meta}</div>
                    </div>
                </div>
            `;
            return card;
        } else {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerHTML = `<i data-lucide="${icon}" style="width: 14px; height: 14px;"></i> ${name}`;
            return btn;
        }
    },

    /**
     * Unified character creation trigger.
     */
    newHero: () => {
        if (window.DataManager) window.DataManager.newCharacter();
    },

    /**
     * Unified character save trigger.
     */
    saveHero: () => {
        if (window.DataManager) window.DataManager.saveCharacter();
    }
};
