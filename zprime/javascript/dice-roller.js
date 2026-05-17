import { DeochUtils } from './DeochUtils.js';

/**
 * @namespace DiceRoller
 * @description Manages dice rolling logic, modifiers, and history logging.
 */
export const DiceRoller = {
    /** @type {string|null} The current active stat for modifiers */
    activeStat: null,
    /** @type {boolean} Whether advantage is active */
    isAdvantage: false,
    /** @type {boolean} Whether disadvantage is active */
    isDisadvantage: false,
    /** @type {Array<Object>} History of recent rolls */
    history: [],

    /**
     * @memberof DiceRoller
     * @description Initializes the dice roller and binds events.
     */
    init(signal) {
        this.signal = signal;
        this.bindEvents();
    },

    /**
     * @memberof DiceRoller
     * @description Binds click events to dice buttons, modifiers, and toggles.
     */
    bindEvents() {
        // Main Toggle Button
        const toggleBtn = document.getElementById('toggle-dice-btn');
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
     * @memberof DiceRoller
     * @description Toggles the visibility of the dice roller widget.
     */
    toggleWidget() {
        const widget = document.getElementById('dice-roller-widget');
        const log = document.getElementById('combat-log-widget');
        const btn = document.getElementById('toggle-dice-btn');

        if (widget) {
            const isMinimized = widget.classList.toggle('minimized');
            if (log) log.classList.toggle('minimized', isMinimized);
            if (btn) btn.classList.toggle('active', !isMinimized);
        }
    },

    /**
     * @memberof DiceRoller
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
     * @memberof DiceRoller
     * @description Updates the visual state of advantage/disadvantage toggles.
     */
    updateToggles() {
        const advBtn = document.getElementById('adv-toggle');
        const disBtn = document.getElementById('dis-toggle');
        
        if (advBtn) advBtn.classList.toggle('active', this.isAdvantage);
        if (disBtn) disBtn.classList.toggle('active', this.isDisadvantage);
    },

    /**
     * @memberof DiceRoller
     * @description Resets all modifiers, toggles, and display values.
     */
    reset() {
        this.activeStat = null;
        this.isAdvantage = false;
        this.isDisadvantage = false;
        
        document.querySelectorAll('.mod-btn').forEach(b => b.classList.remove('active'));
        this.updateToggles();
        
        const resultValue = document.getElementById('dice-result-value');
        if (resultValue) resultValue.textContent = '--';
        
        const resultLabel = document.getElementById('dice-result-label');
        if (resultLabel) resultLabel.textContent = 'Dice Tray';
    },

    /**
     * @memberof DiceRoller
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
        if (this.activeStat) {
            const mod = this.getStatMod(this.activeStat);
            total += mod;
            info += ` + ${this.activeStat.toUpperCase()}(${mod >= 0 ? '+' : ''}${mod})`;
        }

        this.displayResult(total, info);
    },

    /**
     * @memberof DiceRoller
     * @description Calculates the modifier value for a given stat.
     * @param {string} stat - The stat code.
     * @returns {number} The calculated modifier.
     */
    getStatMod(stat) {
        if (window.StatsManager && typeof window.StatsManager.getStatMod === 'function') {
            return window.StatsManager.getStatMod(stat);
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
     * @memberof DiceRoller
     * @description Updates the UI with the roll result.
     * @param {number} total - The final roll total.
     * @param {string} info - Description of the roll (e.g., "d20 + STR(+2)").
     */
    displayResult(total, info) {
        const resultValue = document.getElementById('dice-result-value');
        const resultLabel = document.getElementById('dice-result-label');

        if (resultValue) {
            resultValue.textContent = total;
            // Use a CSS class animation instead of a setTimeout/style race
            resultValue.classList.remove('stat-roll-result');
            resultValue.getBoundingClientRect(); // force reflow to restart animation
            resultValue.classList.add('stat-roll-result');
        }

        if (resultLabel) {
            resultLabel.textContent = info;
        }

        this.addToHistory(total, info);
    },

    /**
     * @memberof DiceRoller
     * @description Performs a generic check roll (d20 + mod).
     */
    rollCheck(mod, label) {
        const roll = Math.floor(DeochUtils.random() * 20) + 1;
        const total = roll + mod;
        const info = `${label}: d20(${roll}) + ${mod >= 0 ? '+' : ''}${mod}`;
        
        this.displayResult(total, info);
        return total;
    },

    /**
     * @memberof DiceRoller
     * @description Adds a roll result to the history log.
     */
    addToHistory(total, info) {
        const logList = document.getElementById('combat-log-list');
        if (!logList) return;

        // Use a data attribute flag instead of fragile style substring matching
        const placeholder = logList.querySelector('.log-entry[data-placeholder]');
        if (placeholder) placeholder.remove();

        const entry = document.createElement('div');
        entry.className = 'log-entry premium-glass';
        
        const infoEl = document.createElement('div');
        infoEl.className = 'log-info';
        infoEl.textContent = info;
        
        const totalEl = document.createElement('div');
        totalEl.className = 'log-total';
        totalEl.textContent = total;

        entry.appendChild(infoEl);
        entry.appendChild(totalEl);
        logList.prepend(entry);
        
        if (logList.children.length > 20) logList.lastElementChild.remove();
    },

    cleanup() {
        this.activeStat = null;
        this.isAdvantage = false;
        this.isDisadvantage = false;
        this.history = [];
    }
};
