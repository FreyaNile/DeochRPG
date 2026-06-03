/**
 * @module DeochUtils
 * @description Pure, stateless shared utility functions for DOM manipulation, math, and icons.
 */
export const DeochUtils = {
    /**
     * Saves the active character to database.
     */
    saveCharacter() {
        if (window.DataManager && typeof window.DataManager.saveCharacter === 'function') {
            window.DataManager.saveCharacter();
        } else {
            console.warn('DeochUtils: DataManager not ready for save.');
        }
    },
    _iconRefreshRoots: new Set(),
    _iconRefreshScheduled: false,

    /**
     * Schedules a Lucide icon refresh on the next animation frame, optionally scoped.
     * @param {HTMLElement} [root] - Optional root element to restrict the search.
     */
    queueIconRefresh: (root = null) => {
        if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;

        if (root) {
            DeochUtils._iconRefreshRoots.add(root);
        } else {
            DeochUtils._iconRefreshRoots.add(document);
        }

        if (DeochUtils._iconRefreshScheduled) return;

        DeochUtils._iconRefreshScheduled = true;
        requestAnimationFrame(() => {
            DeochUtils._iconRefreshScheduled = false;
            const roots = Array.from(DeochUtils._iconRefreshRoots);
            DeochUtils._iconRefreshRoots.clear();

            if (roots.includes(document)) {
                window.lucide.createIcons();
            } else {
                roots.forEach(r => {
                    if (document.body.contains(r)) {
                        window.lucide.createIcons({ root: r });
                    }
                });
            }
        });
    },

    // --- DOM Helpers ---

    /**
     * Shorthand for document.querySelector.
     * @param {string} sel - CSS selector.
     * @param {ParentNode} [scope=document] - Search scope.
     * @returns {Element|null}
     */
    qs: (sel, scope = document) => scope.querySelector(sel),

    /**
     * Shorthand for document.querySelectorAll.
     * @param {string} sel - CSS selector.
     * @param {ParentNode} [scope=document] - Search scope.
     * @returns {Array<Element>}
     */
    qsa: (sel, scope = document) => Array.from(scope.querySelectorAll(sel)),

    /**
     * Adds an event listener.
     * @param {HTMLElement|string} target - The element or ID of the element to attach the listener to.
     * @param {string} event - Event name.
     * @param {Function} handler - Event handler callback.
     * @param {AddEventListenerOptions} [options={}] - Additional listener options.
     */
    addEvent: (target, event, handler, options = {}) => {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (el) el.addEventListener(event, handler, options);
    },

    /**
     * Shorthand for document.getElementById.
     * @param {string} id - Element ID.
     * @returns {HTMLElement|null}
     */
    getElement: (id) => document.getElementById(id),

    /**
     * Sets the textContent of an element by ID.
     * @param {string} id - Element ID.
     * @param {string|number} value - The text content.
     */
    setText: (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    /**
     * Sets the value of an input element by ID.
     * @param {string} id - Element ID.
     * @param {string|number} value - The value.
     */
    setValue: (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    },

    /**
     * Sets the checked state of a checkbox or radio element by ID.
     * @param {string} id - Element ID.
     * @param {boolean} checked - Whether it is checked.
     */
    setChecked: (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    },

    /**
     * Robustly extracts an integer from an element's text or value.
     * Strips non-numeric characters to handle labels like "EXP: 500".
     * @param {string} id - Element ID.
     * @param {number} [def=0] - Default value if not found.
     * @returns {number}
     */
    getInt: (id, def = 0) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const raw = (el.textContent || el.value || '').toString();
        const numericMatch = raw.match(/-?\d+/);
        return numericMatch ? parseInt(numericMatch[0], 10) : def;
    },

    /**
     * Robustly extracts a float from an element's text or value.
     * @param {string} id - Element ID.
     * @param {number} [def=0] - Default value.
     * @returns {number}
     */
    getFloat: (id, def = 0) => {
        const el = document.getElementById(id);
        if (!el) return def;
        return parseFloat(el.textContent || el.value) || def;
    },

    /**
     * Sets value (for inputs) or textContent (for other elements) and fires input/change events.
     * @param {string} id - Element ID.
     * @param {string|number} value - The value to set.
     */
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

    /**
     * Gets value (from inputs) or textContent (from other elements).
     * @param {string} id - Element ID.
     * @returns {string}
     */
    smartGet: (id) => {
        const el = document.getElementById(id);
        if (!el) return '';
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            return el.value;
        }
        return el.textContent;
    },

    /**
     * Shows temporary action feedback on a button with an icon.
     * @param {string} id - Element ID of the button.
     * @param {string} message - Feedback message.
     * @param {string} [iconName='check'] - Lucide icon name.
     */
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

    /**
     * Toggles CSS display property of an element.
     * @param {string|HTMLElement} id - Element ID or HTMLElement.
     * @param {boolean} isVisible - True to show, false to hide.
     * @param {string} [visibleValue='block'] - CSS display value for visible state.
     */
    toggleDisplay: (id, isVisible, visibleValue = 'block') => {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.style.display = isVisible ? visibleValue : 'none';
    },

    // --- Storage Wrappers ---

    Storage: {
        /**
         * Retrieves a string value from localStorage.
         * @param {string} key - The key.
         * @param {string|null} [defaultValue=null] - The fallback value.
         * @returns {string|null}
         */
        get: (key, defaultValue = null) => {
            try {
                const val = localStorage.getItem(key);
                return val !== null ? val : defaultValue;
            } catch (e) {
                console.error(`DeochUtils: Storage error reading "${key}"`, e);
                return defaultValue;
            }
        },

        /**
         * Stores a string value in localStorage.
         * @param {string} key - The key.
         * @param {string} value - The value to store.
         * @returns {boolean} True if successful.
         */
        set: (key, value) => {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.error(`DeochUtils: Storage error writing "${key}"`, e);
                return false;
            }
        },

        /**
         * Retrieves and parses a JSON value from localStorage.
         * @param {string} key - The key.
         * @param {*} [defaultValue=null] - The fallback value.
         * @returns {*}
         */
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

        /**
         * Serializes and stores a value in localStorage.
         * @param {string} key - The key.
         * @param {*} value - The value to serialize.
         * @returns {boolean} True if successful.
         */
        setJson: (key, value) => DeochUtils.Storage.set(key, JSON.stringify(value)),

        /**
         * Removes a key from localStorage.
         * @param {string} key - The key to remove.
         */
        remove: (key) => localStorage.removeItem(key),

        /**
         * Clears all deoch-related keys from localStorage.
         */
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

    /**
     * Calculates attribute modifier based on raw value.
     * @param {number} val - Raw attribute score.
     * @returns {number} The calculated modifier.
     */
    calculateMod: (val) => Math.floor((val - 10) / 2),

    /**
     * Cryptographically secure random number between 0 (inclusive) and 1 (exclusive).
     * @returns {number}
     */
    random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,

    /**
     * Helper for smooth opacity transitions after display changes.
     * @param {string|HTMLElement} el - Element ID or HTMLElement.
     * @param {string} [display='block'] - CSS display value.
     * @param {string} [opacity='1'] - CSS opacity value.
     * @param {number} [delay=50] - Delay in milliseconds before opacity transition.
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
     * @param {Object} char - Character data object.
     * @param {Object} [options={}] - Options object.
     * @param {string|null} [options.activeId=null] - Active character ID.
     * @param {string} [options.variant='modern'] - Card visual style.
     * @param {boolean} [options.isNew=false] - True to render as creation card.
     * @returns {HTMLElement}
     */
    getCardMeta(char, isNew, totalLevel) {
        if (isNew) return 'Begin a new journey';
        if (char?.isMulticlass && char?.secondaryClass && totalLevel > 5) {
            return `${char.primaryClass} 5 / ${char.secondaryClass} ${totalLevel - 5}`;
        }
        return `${char?.primaryClass || 'Hero'} ${totalLevel}`;
    },

    renderModernCard(isActive, isNew, avatarSrc, icon, name, meta) {
        const card = document.createElement('div');
        card.className = 'test-gallery-card' + (isNew ? ' new-char' : '') + (isActive ? ' active' : '');

        const watermarkHtml = (avatarSrc && !isNew)
            ? `<div class="char-watermark"><img src="${avatarSrc}" alt=""></div>`
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
    },

    renderGalleryCard(char, { activeId = null, variant = 'modern', isNew = false } = {}) {
        const isActive = char?.id === activeId;
        const rawName = isNew ? 'Create New' : (char?.name || 'Unknown Hero');
        const totalLevel = (char?.level !== undefined && char?.level !== null) ? parseInt(char.level) : 1;
        const rawMeta = this.getCardMeta(char, isNew, totalLevel);

        const name = DeochUtils.escapeHtml(rawName);
        const meta = DeochUtils.escapeHtml(rawMeta);
        const icon = isNew ? 'plus' : 'user';

        if (variant !== 'modern') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerHTML = `<i data-lucide="${icon}" style="width: 14px; height: 14px;"></i> ${name}`;
            return btn;
        }

        const avatarSrc = char?.avatar ? DeochUtils.escapeHtml(char.avatar) : '';
        return this.renderModernCard(isActive, isNew, avatarSrc, icon, name, meta);
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
    },

    /**
     * Creates a DOM element for a combat log entry.
     * @param {string|number} total - Roll total.
     * @param {string} info - Roll detail description.
     * @returns {HTMLElement}
     */
    createLogEntry: (total, info) => {
        const entry = document.createElement('div');
        entry.className = 'log-entry premium-glass';

        const infoEl = document.createElement('div');
        infoEl.className = 'log-info';
        infoEl.innerHTML = info;

        const totalEl = document.createElement('div');
        totalEl.className = 'log-total';
        totalEl.innerHTML = total;

        entry.appendChild(infoEl);
        entry.appendChild(totalEl);
        return entry;
    },

    // --- HTML Template Generators ---

    /**
     * Generates HTML checkbox items for character conditions.
     * @param {Array<Object>} conditions - Array of condition metadata.
     * @returns {string} HTML string.
     */
    generateConditionsHTML: (conditions) => {
        return conditions.map(c => `
            <label class="condition-item" for="${c.id}" title="${c.name}">
                <input type="checkbox" id="${c.id}" name="${c.key}">
                <span class="circle-toggle"></span> ${c.name}
            </label>
        `).join('');
    },

    /**
     * Generates HTML indicator controls for language proficiencies.
     * @param {Array<Object>} languages - Array of language metadata.
     * @returns {string} HTML string.
     */
    generateLanguagesHTML: (languages) => {
        return languages.map(l => `
            <div class="language-item">
                <span class="lang-label">${l.name}</span>
                <div class="lang-indicators u-flex-center u-gap-0-75">
                    <label class="icon-toggle lang-indicator-btn" title="Verbal">
                        <input type="checkbox" id="${l.id}-v" name="${l.key}_v" class="lang-checkbox hidden">
                        <i data-lucide="speech"></i>
                    </label>
                    <label class="icon-toggle lang-indicator-btn" title="Literacy">
                        <input type="checkbox" id="${l.id}-l" name="${l.key}_l" class="lang-checkbox hidden">
                        <i data-lucide="book-open"></i>
                    </label>
                </div>
            </div>
        `).join('');
    },



    /**
     * Generates restoration/full rest controls and healing dice HTML.
     * @param {Array<Object>} dice - Restoration dice configurations.
     * @returns {string} HTML string.
     */
    generateRestorationHTML: (dice) => {
        const midIndex = Math.floor(dice.length / 2);
        let diceHTML = '';
        dice.forEach((d, i) => {
            diceHTML += `
                <button type="button" class="roll-h-die glass-btn" data-sides="${d.sides}"
                    style="width: 100%; padding: 0.2rem 0; font-size: 0.75rem; border-radius: 4px; color: var(--color-success);">${d.label}</button>
            `;
            if (i === midIndex - 1 || (dice.length === 1 && i === 0)) {
                diceHTML += '<span id="healing-roll-result" class="healing-roll-display" style="display: block; font-size: 1.4rem; font-weight: 800; color: var(--color-success); margin: 0;">--</span>';
            }
        });

        if (!diceHTML.includes('healing-roll-result')) {
            diceHTML = '<span id="healing-roll-result" style="display: block; font-size: 1.4rem; font-weight: 800; color: var(--color-success); margin: 0;">--</span>' + diceHTML;
        }

        const isSleeping = (typeof window.ProgressionManager !== 'undefined' && window.ProgressionManager.isSleeping);
        const sectionDisplay = isSleeping ? 'flex' : 'none';
        const sleepBtnHTML = isSleeping
            ? `
                <button type="button" id="short-rest-btn"
                    class="secondary-btn u-flex-1 u-bold u-flex-center u-gap-0-5 u-border-radius-md"
                    style="background: rgba(245, 158, 11, 0.1); border-color: var(--color-warning); color: var(--color-warning); padding: 0.35rem 0; font-size: 0.75rem; height: 32px;">
                    <i data-lucide="sun" class="u-icon-xs" style="width: 12px; height: 12px;"></i> Wake Up
                </button>
            `
            : `
                <button type="button" id="short-rest-btn"
                    class="secondary-btn u-flex-1 u-bold u-flex-center u-gap-0-5 u-border-radius-md"
                    style="background: rgba(139, 92, 246, 0.1); border-color: var(--accent-primary); color: var(--accent-primary); padding: 0.35rem 0; font-size: 0.75rem; height: 32px;">
                    <i data-lucide="moon" class="u-icon-xs" style="width: 12px; height: 12px;"></i> Sleep
                </button>
            `;
 
        return `
            <div style="display: flex; flex-direction: column; gap: 0.4rem; padding: 0.5rem 0 0 0;">
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; opacity: 0.8;">Sleep to use healing dice.</p>
                <div id="healing-dice-section" style="display: ${sectionDisplay}; gap: 0.75rem; align-items: center; margin: 0.5rem 0;">
                    <div style="text-align: center; min-width: 60px; display: flex; flex-direction: column; gap: 0.25rem; align-items: center;">
                        ${diceHTML}
                    </div>
                    <div style="display: flex; flex: 1; gap: 0.4rem;">
                        <button type="button" id="apply-healing-hp" class="secondary-btn"
                            style="background: var(--color-success); border-color: var(--color-success); color: #EAE6DF; padding: 0.5rem; font-size: 0.75rem; flex: 1; height: 38px;">+ HP</button>
                        <button type="button" id="apply-healing-mana" class="secondary-btn"
                            style="background: var(--color-mental); border-color: var(--color-mental); color: #EAE6DF; padding: 0.5rem; font-size: 0.75rem; flex: 1; height: 38px;">+ Mana</button>
                    </div>
                </div>
                <div class="u-flex u-gap-0-5 u-mt-0-5">
                    ${sleepBtnHTML}
                    <button type="button" id="rest-btn"
                        class="primary-btn u-flex-1 u-bold u-flex-center u-gap-0-5 u-border-radius-md"
                        style="padding: 0.35rem 0; font-size: 0.75rem; height: 32px;">
                        <i data-lucide="bed" class="u-icon-xs" style="width: 12px; height: 12px;"></i> Full Rest
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Generates monster list cards HTML for bestiary catalog.
     * @param {Array<Object>} bestiary - Bestiary items.
     * @returns {string} HTML string.
     */
    generateMonsterCatalogHTML: (bestiary) => {
        const esc = DeochUtils.escapeHtml;
        return bestiary.map(monster => `
            <div class="monster-card-item glass-panel-frosted" data-monster="${esc(monster.id)}">
                <div class="monster-icon-wrapper">
                    <i data-lucide="${esc(monster.icon)}" class="u-font-size-md"
                        style="color: var(--accent-primary);"></i>
                </div>
                <div>
                    <div class="u-font-primary u-font-size-xl">
                        ${esc(monster.name)}</div>
                    <div class="u-font-size-xs u-opacity-0-6"
                        style="text-transform: uppercase; letter-spacing: 0.05em;">
                        ${esc(monster.type)}</div>
                </div>
                <i data-lucide="chevron-right"
                    class="u-font-size-md u-opacity-0-4 u-mt-0-25 u-ml-auto"></i>
            </div>
        `).join('');
    },

    /**
     * Generates HTML detailed layout for a single monster.
     * @param {Object} monster - Selected monster data.
     * @returns {string} HTML string.
     */
    generateMonsterDetailHTML: (monster) => {
        const esc = DeochUtils.escapeHtml;
        return `
            <div class="glass-panel-frosted" style="padding: 1.25rem; border-radius: 16px;">
                <h3 style="margin: 0 0 0.35rem 0; color: var(--accent-primary); letter-spacing: 0.08em;">${esc(monster.name)}</h3>
                <div style="font-size: 0.72rem; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1rem;">${esc(monster.type)}</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                    <div><strong>AC</strong> ${esc(String(monster.ac))}</div>
                    <div><strong>HP</strong> ${esc(String(monster.hp))}</div>
                    <div><strong>MP</strong> ${esc(String(monster.mp))}</div>
                    <div><strong>Speed</strong> ${esc(String(monster.speed))}</div>
                </div>
                <p style="margin: 0 0 1rem 0; line-height: 1.5; opacity: 0.9;">${esc(monster.summary)}</p>
                <div style="display: grid; gap: 0.5rem;">
                    ${Array.isArray(monster.actions)
                ? monster.actions.map(action => `<div class="glass-panel-frosted" style="padding: 0.7rem 0.9rem; border-radius: 12px;">${esc(action)}</div>`).join('')
                : ''}
                </div>
            </div>
        `;
    },

    // --- Visual Effects ---

    /**
     * Instantiates the background Mastery Sparks.
     */
    initSparkles: () => {
        // Sparks are rendered statically in HTML to prevent runtime DOM generation overhead.
    },

    /**
     * Shows a temporary floating rest toast message above an element.
     * @param {string} message - Toast message.
     * @param {HTMLElement} element - Triggering button element.
     */
    showRestToast: (message, element) => {
        const toast = document.createElement('div');
        toast.className = 'rest-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        const rect = element.getBoundingClientRect();
        // Account for scroll offset since toast is appended to document.body
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        toast.style.top = `${rect.top + scrollTop - 40}px`;
        toast.style.left = `${rect.left + scrollLeft + (rect.width / 2)}px`;

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    createClassOptionButton: (c, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'glass-btn class-option-btn-layout'; // Managed in CSS

        let iconHtml = '';
        if (c.iconType === 'svg') {
            iconHtml = c.icon;
        } else if (c.iconType === 'fontawesome') {
            iconHtml = `<i class="${DeochUtils.escapeHtml(c.icon)}"></i>`;
        } else {
            iconHtml = `<i data-lucide="${DeochUtils.escapeHtml(c.icon)}"></i>`;
        }

        btn.innerHTML = `
            ${iconHtml}
            <div class="class-btn-title">${DeochUtils.escapeHtml(c.name)}</div>
        `;
        btn.onclick = onClick;
        return btn;
    },

    parseDiceString(str) {
        const counts = { 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0 };
        if (!str) return counts;
        const parts = str.split('+');
        for (const part of parts) {
            const trimmed = part.trim();
            const match = trimmed.match(/^(\d+)d(\d+)$/);
            if (match) {
                const count = parseInt(match[1], 10);
                const sides = parseInt(match[2], 10);
                if (counts[sides] !== undefined) {
                    counts[sides] += count;
                }
            }
        }
        return counts;
    },

    serializeDiceCounts(counts) {
        const parts = [];
        const orderedSides = [4, 6, 8, 10, 12, 20];
        for (const sides of orderedSides) {
            const count = counts[sides] || 0;
            if (count > 0) {
                parts.push(`${count}d${sides}`);
            }
        }
        return parts.join(' + ');
    },

    createCustomActionItem: (name, bonus, icon = 'sword', stat = '', dice = '', dmgBonus = 0) => {
        const item = document.createElement('div');
        item.className = 'action-item';
        Object.assign(item.dataset, {
            actionType: 'custom',
            actionName: name,
            actionBonus: bonus,
            actionIcon: icon,
            actionStat: stat,
            actionDice: dice,
            actionDmgBonus: dmgBonus
        });

        let displayBonus = bonus;
        if (stat && window.ProgressionManager && typeof window.ProgressionManager.getStatMod === 'function') {
            displayBonus = window.ProgressionManager.getStatMod(stat) + bonus;
        }

        const statText = stat ? stat.toUpperCase() : '';
        let subtext = '1';
        let dmgBonusPart = '';
        if (dmgBonus > 0) {
            dmgBonusPart = ` + ${dmgBonus}`;
        } else if (dmgBonus < 0) {
            dmgBonusPart = ` - ${Math.abs(dmgBonus)}`;
        }
        if (dice) {
            subtext = statText ? `${statText} • ${dice}${dmgBonusPart} DMG` : `${dice}${dmgBonusPart} DMG`;
        } else if (statText) {
            subtext = `${statText} + 1${dmgBonusPart}`;
        } else if (dmgBonus) {
            subtext = `1${dmgBonusPart}`;
        }

        item.innerHTML = `
            <div class="flex-center-gap">
                <div class="action-icon-circle"><i data-lucide="${icon}" class="u-icon-sm u-text-accent"></i></div>
                <div>
                    <div class="u-font-size-sm u-bold u-text-white">${DeochUtils.escapeHtml(name)}</div>
                    <div class="u-font-size-xs u-opacity-0-5">${subtext}</div>
                </div>
            </div>
            <div class="action-bonus-display"><div class="action-bonus">${displayBonus >= 0 ? '+' : ''}${displayBonus}</div></div>
        `;
        return item;
    },

    toggleSleepButtonState: (sleepBtn, isSleeping) => {
        if (!sleepBtn) return;
        // Let CSS handle the colors/borders based on the 'is-sleeping' class
        sleepBtn.classList.toggle('is-sleeping', isSleeping);
        sleepBtn.innerHTML = isSleeping
            ? '<i data-lucide="sun" class="u-icon-xs"></i> Wake Up'
            : '<i data-lucide="moon" class="u-icon-xs"></i> Sleep';
        DeochUtils.queueIconRefresh(sleepBtn);
    },

    /**
     * Restarts a CSS keyframe animation on an element by toggling a class.
     * Uses double requestAnimationFrame to prevent forced synchronous layouts (reflows).
     * @param {HTMLElement} el - Element to animate.
     * @param {string} className - CSS class that triggers the animation.
     */
    restartAnimation: (el, className) => {
        if (!el) return;
        el.classList.remove(className);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.classList.add(className);
            });
        });
    }
};
