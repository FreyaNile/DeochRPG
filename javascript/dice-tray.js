import { DeochUtils } from './DeochUtils.js';
import { ProgressionManager } from './ProgressionManager.js';

/**
 * @namespace DiceTray
 * @description Manages dice rolling logic, modifiers, and history logging.
 */
export const DiceTray = {
    /** @type {string|null} The current active stat for modifiers */
    activeStat: null,
    /** @type {boolean} Whether advantage is active */
    isAdvantage: false,
    /** @type {boolean} Whether disadvantage is active */
    isDisadvantage: false,

    /**
     * @memberof DiceTray
     * @description Initializes the dice tray and binds events.
     */
    init(signal) {
        this.signal = signal;
        this.bindEvents();
    },

    /**
     * @memberof DiceTray
     * @description Binds click events to dice buttons, modifiers, and toggles.
     */
    bindEvents() {
        // Main Toggle Button
        const toggleBtn = document.getElementById('toggle-dice-tray-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleWidget(), { signal: this.signal });
        }

        // Dice Buttons (d4, d6, etc.)
        const diceBtns = document.querySelectorAll('.dice-btn');
        diceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const sides = parseInt(btn.getAttribute('data-dice'));
                this.roll(sides);
            }, { signal: this.signal });
        });

        // Modifier Buttons (STR, DEX, etc.)
        const modBtns = document.querySelectorAll('.mod-btn[data-stat]');
        modBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const stat = btn.getAttribute('data-stat');
                this.setModifier(stat, btn);
            }, { signal: this.signal });
        });

        // Reset Button
        const resetBtn = document.getElementById('reset-dice-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset(), { signal: this.signal });
        }

        // Adv/Dis Toggles
        const advBtn = document.getElementById('adv-toggle');
        const disBtn = document.getElementById('dis-toggle');

        if (advBtn) {
            advBtn.addEventListener('click', () => {
                this.isAdvantage = !this.isAdvantage;
                if (this.isAdvantage) this.isDisadvantage = false;
                this.updateToggles();
            }, { signal: this.signal });
        }

        if (disBtn) {
            disBtn.addEventListener('click', () => {
                this.isDisadvantage = !this.isDisadvantage;
                if (this.isDisadvantage) this.isAdvantage = false;
                this.updateToggles();
            }, { signal: this.signal });
        }
    },

    /**
     * @memberof DiceTray
     * @description Toggles the visibility of the dice tray widget.
     */
    toggleWidget() {
        const widget = document.getElementById('dice-tray-widget');
        const log = document.getElementById('combat-log-widget');
        const btn = document.getElementById('toggle-dice-tray-btn');

        if (widget) {
            const isMinimized = widget.classList.toggle('minimized');
            if (log) log.classList.toggle('minimized', isMinimized);
            if (btn) btn.classList.toggle('active', !isMinimized);
        }
    },

    /**
     * @memberof DiceTray
     * @description Sets the active modifier stat for subsequent rolls.
     * @param {string} stat - The stat code (e.g., 'str', 'dex').
     * @param {HTMLElement} btn - The button element that was clicked.
     */
    setModifier(stat, btn) {
        // Toggle if already active
        if (this.activeStat === stat) {
            this.activeStat = null;
            btn.classList.remove('active');
        } else {
            // Remove active from others
            document.querySelectorAll('.mod-btn[data-stat]').forEach(b => b.classList.remove('active'));
            this.activeStat = stat;
            btn.classList.add('active');
        }
    },

    /**
     * @memberof DiceTray
     * @description Updates the visual state of advantage/disadvantage toggles.
     */
    updateToggles() {
        const advBtn = document.getElementById('adv-toggle');
        const disBtn = document.getElementById('dis-toggle');
        
        if (advBtn) advBtn.classList.toggle('active', this.isAdvantage);
        if (disBtn) disBtn.classList.toggle('active', this.isDisadvantage);
    },

    /**
     * @memberof DiceTray
     * @description Resets all modifiers, toggles, and display values.
     */
    reset() {
        this.activeStat = null;
        this.isAdvantage = false;
        this.isDisadvantage = false;
        this.lastRollIsNat1 = false;
        this.lastRollIsNat20 = false;
        
        document.querySelectorAll('.mod-btn').forEach(b => b.classList.remove('active'));
        this.updateToggles();
        
        const resultValue = document.getElementById('dice-result-value');
        if (resultValue) {
            resultValue.textContent = '--';
            resultValue.style.color = '';
        }
        
        const resultLabel = document.getElementById('dice-result-label');
        if (resultLabel) resultLabel.textContent = 'Dice Tray';
    },

    /**
     * @memberof DiceTray
     * @description Performs a dice roll with the current modifiers and toggles.
     * @param {number} sides - Number of sides on the die.
     */
    roll(sides) {
        let r1 = Math.floor(DeochUtils.random() * sides) + 1;
        let r2 = Math.floor(DeochUtils.random() * sides) + 1;
        
        let result = r1;
        let info = `d${sides}`;
        
        if (this.isAdvantage) {
            result = Math.max(r1, r2);
            info = `Adv d${sides} (${r1}, ${r2})`;
        } else if (this.isDisadvantage) {
            result = Math.min(r1, r2);
            info = `Dis d${sides} (${r1}, ${r2})`;
        }

        // Add modifier if active
        let total = result;
        const isNat1 = (sides === 20 && result === 1);
        const isNat20 = (sides === 20 && result === 20);

        if (isNat1) {
            total = 1;
        } else if (isNat20) {
            total = 20;
        } else {
            if (this.activeStat) {
                const mod = this.getStatMod(this.activeStat);
                total += mod;
                info += ` + ${this.activeStat.toUpperCase()}(${mod >= 0 ? '+' : ''}${mod})`;
            }
            if (total < 1) total = 1;
        }

        this.lastRollIsNat1 = isNat1;
        this.lastRollIsNat20 = isNat20;

        this.displayResult(total, info, isNat1, isNat20);
    },

    /**
     * @memberof DiceTray
     * @description Calculates the modifier value for a given stat.
     * @param {string} stat - The stat code.
     * @returns {number} The calculated modifier.
     */
    getStatMod(stat) {
        if (ProgressionManager && typeof ProgressionManager.getStatMod === 'function') {
            return ProgressionManager.getStatMod(stat);
        }
        
        // Final fallback to DOM
        const attrBox = document.querySelector(`.dice-widget-mobile-stats .stat-box[data-stat="${stat}"]`);
        if (attrBox) {
            const modText = attrBox.querySelector('div:last-child')?.textContent;
            if (modText) return parseInt(modText.replace(/[()]/g, '').replace('+', '')) || 0;
        }
        
        return 0;
    },

    /**
     * @memberof DiceTray
     * @description Updates the UI with the roll result.
     * @param {number} total - The final roll total.
     * @param {string} info - Description of the roll (e.g., "d20 + STR(+2)").
     * @param {boolean} isNat1 - Whether the roll was a natural 1.
     * @param {boolean} isNat20 - Whether the roll was a natural 20.
     */
    displayResult(total, info, isNat1 = false, isNat20 = false) {
        const resultValue = document.getElementById('dice-result-value');
        const resultLabel = document.getElementById('dice-result-label');

        if (resultValue) {
            resultValue.textContent = total;
            let color = '';
            if (isNat1) {
                color = 'var(--color-danger)';
            } else if (isNat20) {
                color = 'var(--color-success)';
            }
            resultValue.style.color = color;
            DeochUtils.restartAnimation(resultValue, 'stat-roll-result');
        }

        if (resultLabel) {
            resultLabel.textContent = info;
        }

        this.addToHistory(total, info, isNat1, isNat20);
    },

    /**
     * @memberof DiceTray
     * @description Performs a generic check roll (d20 + mod).
     * @param {number} mod - The modifier to add.
     * @param {string} label - The label for the check (e.g., 'STR').
     * @returns {number} The final roll total.
     */
    rollCheck(mod, label) {
        const roll = Math.floor(DeochUtils.random() * 20) + 1;
        const isNat1 = (roll === 1);
        const isNat20 = (roll === 20);
        let total;
        if (isNat1) {
            total = 1;
        } else if (isNat20) {
            total = 20;
        } else {
            total = Math.max(1, roll + mod);
        }
        const info = `${label}: d20(${roll}) + ${mod >= 0 ? '+' : ''}${mod}`;
        
        this.lastRollIsNat1 = isNat1;
        this.lastRollIsNat20 = isNat20;

        this.displayResult(total, info, isNat1, isNat20);
        return total;
    },

    /**
     * @memberof DiceTray
     * @description Adds a roll result to the history log.
     * @param {number} total - The final roll total.
     * @param {string} info - Description of the roll.
     * @param {boolean} isNat1 - Whether the roll was a natural 1.
     * @param {boolean} isNat20 - Whether the roll was a natural 20.
     */
    addToHistory(total, info, isNat1 = false, isNat20 = false) {
        const logList = document.getElementById('combat-log-list');
        if (!logList) return;

        // Use a data attribute flag instead of fragile style substring matching
        const placeholder = logList.querySelector('.log-entry[data-placeholder]');
        if (placeholder) placeholder.remove();

        const entry = DeochUtils.createLogEntry(total, info);
        const totalEl = entry.querySelector('.log-total');
        if (totalEl) {
            if (isNat1) totalEl.style.color = 'var(--color-danger)';
            if (isNat20) totalEl.style.color = 'var(--color-success)';
        }
        
        logList.prepend(entry);
        
        if (logList.children.length > 20) logList.lastElementChild.remove();
    },

    /**
     * @memberof DiceTray
     * @description Cleans up the dice tray state.
     */
    cleanup() {
        this.activeStat = null;
        this.isAdvantage = false;
        this.isDisadvantage = false;
        this.lastRollIsNat1 = false;
        this.lastRollIsNat20 = false;
    }
};
