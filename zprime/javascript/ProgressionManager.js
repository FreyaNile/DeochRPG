import { DeochUtils } from './DeochUtils.js';

/**
 * @module ProgressionManager
 * @description Central authority for character growth: Attributes, Leveling, EXP, and Game Rules.
 * Consolidates formerly split logic from StatManager and MechanicsManager.
 */
export const ProgressionManager = {
    initialized: false,
    signal: null,

    // --- State ---
    availableStatPoints: 0,
    allocatedThisLevel: [],
    preAllocationStats: {},
    lastProcessedLevel: -1,

    // --- Constants ---
    CONDITIONS: [
        { id: 'cond-blinded', name: 'Blinded', key: 'cond_blinded' },
        { id: 'cond-bloodied', name: 'Bloodied', key: 'cond_bloodied' },
        { id: 'cond-charmed', name: 'Charmed', key: 'cond_charmed' },
        { id: 'cond-deafened', name: 'Deafened', key: 'cond_deafened' },
        { id: 'cond-frightened', name: 'Frightened', key: 'cond_frightened' },
        { id: 'cond-grappled', name: 'Grappled', key: 'cond_grappled' },
        { id: 'cond-grappler', name: 'Grappler', key: 'cond_grappler' },
        { id: 'cond-hidden', name: 'Hidden', key: 'cond_hidden' },
        { id: 'char-ill', name: 'Ill', key: 'cond_ill' },
        { id: 'cond-invisible', name: 'Invisible', key: 'cond_invisible' },
        { id: 'cond-petrified', name: 'Petrified', key: 'cond_petrified' },
        { id: 'cond-prone', name: 'Prone', key: 'cond_prone' },
        { id: 'cond-restrained', name: 'Restrained', key: 'cond_restrained' },
        { id: 'cond-slowed', name: 'Slowed', key: 'cond_slowed' },
        { id: 'cond-stunned', name: 'Stunned', key: 'cond_stunned' },
        { id: 'cond-surprised', name: 'Surprised', key: 'cond_surprised' },
        { id: 'cond-unconscious', name: 'Unconscious', key: 'cond_unconscious' },
        { id: 'cond-wounded', name: 'Wounded', key: 'cond_wounded' },
        { id: 'char-hungry', name: 'Hungry', key: 'cond_hungry' },
        { id: 'char-thirst', name: 'Thirsty', key: 'cond_thirsty' }
    ],

    LANGUAGES: [
        { id: 'lang-common', name: 'Common', key: 'lang_common' },
        { id: 'lang-elvish', name: 'Elvish', key: 'lang_elvish' },
        { id: 'lang-dwarven', name: 'Dwarven', key: 'lang_dwarven' },
        { id: 'lang-orcish', name: 'Orcish', key: 'lang_orcish' },
        { id: 'lang-celestial', name: 'Celestial', key: 'lang_celestial' },
        { id: 'lang-draconic', name: 'Draconic', key: 'lang_draconic' }
    ],

    ATTRIBUTES: [
        {
            id: 'char-ac',
            name: 'Armor Class',
            icon: 'shield',
            formula: '8 + DEX MOD',
            calculate: (stats, mods) => 8 + (parseInt(mods.dex) || 0)
        },
        {
            id: 'char-init',
            name: 'Initiative',
            icon: 'zap',
            formula: 'WIS MOD',
            calculate: (stats, mods) => {
                const val = parseInt(mods.wis) || 0;
                return (val >= 0 ? '+' : '') + val;
            }
        }
    ],

    RESTORATION_DICE: [
        { sides: 4, label: 'd4' },
        { sides: 6, label: 'd6' }
    ],

    /**
     * Initializes the Progression Manager.
     * @param {HTMLElement} sheet - Reference to the main sheet container (optional).
     * @param {AbortSignal} signal - Signal for cleaning up event listeners.
     */
    init(sheet, signal) {
        if (this.initialized) return;
        this.signal = signal;

        // Initialize Stat Logic
        this.initStatTooltip();
        this.initStatRolling();
        this.initMobileActions();

        // Initialize Mechanics Logic
        this.initRestListeners();
        this.initExhaustionListeners();
        this.initConditionListeners();
        this.initMulticlassListeners();
        this.initLevelingListeners();

        // Sync initial state
        const exp = DeochUtils.getInt('test-exp-input', 0);
        this.lastProcessedLevel = this.calculateCurrentLevel(exp);
        this.updateAttributes();

        this.initialized = true;
    },

    // --- Core Formulas ---

    calculateMod: (val) => Math.floor((val - 10) / 2),

    calculateLevelFromExp(exp) {
        /**
         * LEVEL FORMULA: level = (-1 + sqrt(1 + exp/62.5)) / 2
         * 0.0001 is a precision epsilon to ensure that floating point results 
         * like 0.999999999 are correctly floored as 1.
         */
        return Math.floor((-1 + Math.sqrt(1 + exp / 62.5) + 0.0001) / 2);
    },

    calculateExpForLevel(level) {
        return 250 * level * (level + 1);
    },

    // --- Stat Management ---

    getStatValue(stat) {
        const input = document.getElementById(`stat-${stat}`);
        return parseInt(input?.value || input?.textContent) || 9;
    },

    setStatValue(stat, value) {
        DeochUtils.smartSet(`stat-${stat}`, value);
        DeochUtils.smartSet(`char-${stat}`, value);

        // Update summaries
        document.querySelectorAll(`.summary-item[data-stat="${stat}"] .val, .stat-box[data-stat="${stat}"] .val`).forEach(el => {
            el.textContent = value;
        });

        const mod = this.calculateMod(value);
        document.querySelectorAll(`.summary-item[data-stat="${stat}"] .mod, .stat-box[data-stat="${stat}"] .mod`).forEach(el => {
            el.textContent = `(${(mod >= 0 ? '+' : '')}${mod})`;
        });

        this.updateAttributes();
        this.pulseStatIncrease(stat);
    },

    getStats() {
        const stats = {};
        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(stat => {
            stats[stat] = this.getStatValue(stat);
        });
        return stats;
    },

    applyStats(stats) {
        if (!stats) return;
        Object.entries(stats).forEach(([stat, value]) => {
            this.setStatValue(stat, value);
        });
    },

    pulseStatIncrease(stat) {
        const selectors = [
            `.summary-item[data-stat="${stat}"]`,
            `.stat-box[data-stat="${stat}"]`,
            `.test-stat-val[data-stat="${stat}"]`
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.remove('stat-allocated-flash');
                el.getBoundingClientRect();
                el.classList.add('stat-allocated-flash');
                setTimeout(() => el.classList.remove('stat-allocated-flash'), 650);
            });
        });
    },

    handleStatAllocation(stat) {
        if (this.availableStatPoints <= 0) return;

        // Backup original values if this is the first allocation in a batch
        if (this.allocatedThisLevel.length === 0) {
            const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
            stats.forEach(s => {
                this.preAllocationStats[s] = this.getStatValue(s);
            });
        }

        const currentVal = this.getStatValue(stat);
        this.setStatValue(stat, currentVal + 1);
        this.availableStatPoints--;
        this.allocatedThisLevel.push(stat);

        this.updateAvailablePointsUI();
        this.updateStatIndicators();

        if (this.availableStatPoints === 0) {
            this.showStatConfirmation(true);
        }

        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
    },

    confirmStatAllocation() {
        this.allocatedThisLevel = [];
        this.preAllocationStats = {};
        this.showStatConfirmation(false);
        this.updateAvailablePointsUI();
        this.updateStatIndicators();
    },

    denyStatAllocation() {
        if (this.preAllocationStats && Object.keys(this.preAllocationStats).length > 0) {
            Object.entries(this.preAllocationStats).forEach(([stat, value]) => {
                this.setStatValue(stat, value);
            });
            this.availableStatPoints += this.allocatedThisLevel.length;
            this.allocatedThisLevel = [];
            this.preAllocationStats = {};
        }
        this.showStatConfirmation(false);
        this.updateStatIndicators();
        this.updateAvailablePointsUI();
    },

    updateAvailablePointsUI() {
        const pointsEl = document.getElementById('available-points');
        const indicator = document.getElementById('stat-points-indicator');
        const points = this.availableStatPoints;
        const hasPoints = points > 0;

        if (pointsEl) pointsEl.textContent = points;
        if (indicator) {
            indicator.style.display = hasPoints ? 'flex' : 'none';
            if (hasPoints) indicator.classList.add('pulsate-glow');
            else indicator.classList.remove('pulsate-glow');
        }

        // Toggle popup visibility
        const exp = DeochUtils.getInt('test-exp-input', 0);
        const currentLevel = this.calculateCurrentLevel(exp);
        const isLevelZero = currentLevel === 0;

        const hasInteracted = DeochUtils.Storage.get('deoch_has_interacted_with_stat_popup') === 'true';
        const isDismissed = document.body.classList.contains('stat-tooltip-dismissed');
        document.body.classList.toggle('has-available-points', hasPoints && !hasInteracted && !isDismissed && isLevelZero);

        if (!hasPoints) {
            document.body.classList.remove('stat-tooltip-dismissed');
            DeochUtils.Storage.remove('deoch_has_interacted_with_stat_popup');
        }
    },

    updateStatIndicators() {
        const hud = document.getElementById('top-mobile-hud');
        const isExpanded = hud?.classList.contains('expanded');
        const hasPoints = this.availableStatPoints > 0;

        document.querySelectorAll('.summary-item, .stat-box').forEach(el => {
            const stat = el.dataset.stat;
            if (!stat) return;
            if (isExpanded && hasPoints) el.classList.add('can-increase');
            else el.classList.remove('can-increase');
        });
    },

    showStatConfirmation(visible) {
        const bar = document.getElementById('stat-allocation-confirm');
        if (bar) {
            if (visible) bar.classList.add('active');
            else bar.classList.remove('active');
        }
    },

    // --- Mechanics & Rule Enforcement ---

    getStartingStatPoints() {
        return 3;
    },

    updateAttributes() {
        const stats = this.getStats();
        const mods = {
            str: this.calculateMod(stats.str),
            dex: this.calculateMod(stats.dex),
            con: this.calculateMod(stats.con),
            int: this.calculateMod(stats.int),
            wis: this.calculateMod(stats.wis),
            cha: this.calculateMod(stats.cha)
        };

        this.ATTRIBUTES.forEach(s => {
            const val = s.calculate(stats, mods);
            DeochUtils.setText(`${s.id}-display`, val);
            const input = document.getElementById(`${s.id}-value`);
            if (input) input.value = val;
        });
    },

    updateLevelFromExp(isMasteryAction = false) {
        const exp = DeochUtils.getInt('test-exp-input', 0);
        const totalLevel = this.calculateCurrentLevel(exp);

        // Use internally tracked level instead of DOM read to prevent false triggers during population
        const oldLevel = this.lastProcessedLevel;
        const isInitializing = window.DataManager ? window.DataManager.isInitializing : false;

        if (!isInitializing && this.lastProcessedLevel >= 0 && totalLevel > this.lastProcessedLevel) {
            const levelDiff = totalLevel - this.lastProcessedLevel;
            this.availableStatPoints += levelDiff * 2;
        }

        this.lastProcessedLevel = totalLevel;
        this.syncLevelToMainForm(totalLevel);

        if (!isMasteryAction) {
            this.checkLevelUpEvents(totalLevel, oldLevel, exp);
        }

        if (window.InterfaceManager) {
            window.InterfaceManager.updateHUDLevelDisplay(exp);
            window.InterfaceManager.updateEXPRing(exp, totalLevel);
        }

        this.updateAvailablePointsUI();
        this.updateStatIndicators();
    },

    /**
     * Retrieves all display-related level information for the UI.
     * @param {number} exp - Current experience points.
     * @returns {Object} Level display metadata.
     */
    getLevelDisplayInfo(exp) {
        const totalLevel = this.calculateCurrentLevel(exp);
        const isMulticlass = document.getElementById('test-is-multiclass')?.value === 'true';

        let displayLevel = totalLevel;
        let primaryLevel = totalLevel;
        let secondaryLevel = 0;
        let displayClass = document.getElementById('test-hud-class-text')?.textContent || 'Human';
        let secondaryClass = document.getElementById('test-hud-secondary-class-visible')?.textContent || '';

        if (isMulticlass) {
            primaryLevel = 5;
            secondaryLevel = Math.max(1, totalLevel - 5);
            displayLevel = secondaryLevel;
            displayClass = secondaryClass || displayClass;
        }

        const isMaxLevel = isMulticlass ? (secondaryLevel >= 5) : (totalLevel >= 10);
        const isMastered = (exp >= 27500) || (document.getElementById('test-mastery-celebrated')?.value === 'true');
        const currentLvlExp = this.calculateExpForLevel(totalLevel);
        const nextLvlThreshold = isMaxLevel ? null : this.calculateExpForLevel(totalLevel + 1);
        const expNeeded = isMaxLevel ? null : (nextLvlThreshold - exp);
        const progress = isMaxLevel ? 1 : Math.min(1, Math.max(0, (exp - currentLvlExp) / (nextLvlThreshold - currentLvlExp)));

        return {
            totalLevel,
            displayLevel,
            primaryLevel,
            secondaryLevel,
            displayClass,
            isMulticlass,
            isMaxLevel,
            isMastered,
            nextLvlThreshold,
            expNeeded,
            progress,
            levelText: isMulticlass ? `LVL 5/${secondaryLevel}` : `LVL ${totalLevel}`
        };
    },

    calculateCurrentLevel(exp) {
        const celebrated = document.getElementById('test-mastery-celebrated');
        if (exp >= 27500 || (celebrated && celebrated.value === 'true')) return 10;
        return this.calculateLevelFromExp(exp);
    },

    syncLevelToMainForm(totalLevel) {
        const mainLevelInput = document.getElementById('char-level');
        if (mainLevelInput) {
            mainLevelInput.value = totalLevel;
            mainLevelInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },

    checkLevelUpEvents(totalLevel, oldLevel, exp) {
        const isInitializing = window.DataManager ? window.DataManager.isInitializing : false;
        if (isInitializing) return;

        const celebratedEl = document.getElementById('test-mastery-celebrated');
        if (exp >= 27500 && celebratedEl && celebratedEl.value === 'false') {
            this.triggerMasteryCelebration();
        }

        const classChoiceMade = document.getElementById('test-class-choice-made');
        if (exp >= 500 && classChoiceMade && classChoiceMade.value === 'false') {
            this.showClassSelection();
            return;
        }

        const multiclassChoiceMade = document.getElementById('test-multiclass-choice-made');
        const multiclassModal = document.getElementById('test-multiclass-modal');
        if (exp >= 10500 && multiclassChoiceMade && multiclassChoiceMade.value === 'false') {
            if (multiclassModal) {
                multiclassModal.style.display = 'flex';
            }
        }
    },

    // --- Multiclass & Class Selection ---

    initMulticlassListeners() {
        const yes = document.getElementById('test-multiclass-yes');
        const no = document.getElementById('test-multiclass-no');
        if (yes) {
            yes.addEventListener('click', () => {
                document.getElementById('test-multiclass-choice-made').value = 'true';
                document.getElementById('test-is-multiclass').value = 'true';
                const multiclassModal = document.getElementById('test-multiclass-modal');
                if (multiclassModal) multiclassModal.style.display = 'none';
                window.dispatchEvent(new CustomEvent('deoch:request-class-selection', {
                    detail: { isSecondary: true }
                }));
            }, { signal: this.signal });
        }

        window.addEventListener('deoch:request-class-selection', (e) => {
            this.showClassSelection(e.detail.isSecondary);
        }, { signal: this.signal });

        if (no) {
            no.addEventListener('click', () => {
                document.getElementById('test-multiclass-choice-made').value = 'true';
                document.getElementById('test-multiclass-opt-out').value = 'true';
                const multiclassModal = document.getElementById('test-multiclass-modal');
                if (multiclassModal) multiclassModal.style.display = 'none';
                this.updateLevelFromExp();
            }, { signal: this.signal });
        }
    },

    showClassSelection(isSecondary = false) {
        const dialog = document.getElementById('class-selection-dialog');
        const optionsContainer = document.getElementById('test-class-options');
        if (!dialog || !optionsContainer) return;

        const classes = [
            { name: 'Barbarian', icon: 'swords', desc: 'Instinctive' },
            { name: 'Fighter', icon: 'shield', desc: 'Combat Tactician' },
            { name: 'Rogue', icon: 'venetian-mask', desc: 'Expert' },
            { name: 'Wizard', icon: 'wand-2', desc: 'Academic' },
            { name: 'Sorcerer', icon: 'sparkles', desc: 'Avatar' },
            { name: 'Druid', icon: 'paw-print', desc: 'Naturalist' },
            { name: 'Paladin', icon: 'sword', desc: 'Faithful' },
            { name: 'Ranger', icon: 'arrow-up-right', desc: 'Tracker' },
            { name: 'Monk', icon: 'hand', desc: 'Disciplined' },
            { name: 'Psychic', icon: 'brain', desc: 'Cognitive' }
        ];

        optionsContainer.innerHTML = '';
        classes.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'glass-btn';
            btn.style.flexDirection = 'column';
            btn.style.height = 'auto';
            btn.style.padding = '1rem';
            btn.style.gap = '0.5rem';
            btn.innerHTML = `
                <i data-lucide="${c.icon}" style="width: 24px; height: 24px; color: var(--accent-primary);"></i>
                <div style="font-weight: 800; font-family: var(--font-primary); font-size: 0.9rem;">${c.name}</div>
                <div style="font-size: 0.6rem; opacity: 0.5; text-transform: uppercase;">${c.desc}</div>
            `;
            btn.onclick = () => this.handleClassSelection(c.name, isSecondary, dialog);
            optionsContainer.appendChild(btn);
        });

        DeochUtils.queueIconRefresh();
        dialog.showModal();
    },

    handleClassSelection(className, isSecondary, dialog) {
        if (isSecondary) {
            const secClass = document.getElementById('test-hud-secondary-class-visible');
            if (secClass) {
                secClass.textContent = className;
                secClass.dataset.secondaryClass = className;
            }
            document.getElementById('char-class-2').value = className;
        } else {
            const classText = document.getElementById('test-hud-class-text');
            if (classText) {
                classText.textContent = className;
                classText.dataset.primaryClass = className;
            }
            document.getElementById('test-class-choice-made').value = 'true';
            document.getElementById('char-class').value = className;
        }
        dialog.close();
        this.updateLevelFromExp();
    },

    // --- Mastery System ---

    triggerMasteryCelebration() {
        const celebrated = document.getElementById('test-mastery-celebrated');
        if (celebrated) celebrated.value = 'true';

        const overlay = document.getElementById('test-mastery-celebration');
        if (!overlay) return;

        const refreshModal = () => {
            const expInput = document.getElementById('test-exp-input');
            const expDisplay = document.getElementById('mastery-exp-display');
            const currentExp = DeochUtils.getInt('test-exp-input', 0);

            if (expDisplay) expDisplay.textContent = currentExp;
            DeochUtils.setText('test-exp-value-display', currentExp);

            const stats = ['hp', 'mp', 'str', 'dex', 'con', 'int', 'wis', 'cha'];
            stats.forEach(stat => {
                const btn = document.getElementById(`test-cel-mastery-${stat}-btn`);
                const costDisplay = document.getElementById(`test-cel-mastery-${stat}-cost`);
                if (!btn || !costDisplay) return;

                const cost = this.calculateMasteryCost(stat);
                costDisplay.textContent = `Cost: ${cost} EXP`;

                const canAfford = currentExp >= cost;
                btn.disabled = !canAfford;
                btn.style.opacity = canAfford ? '1' : '0.4';
                btn.onclick = (e) => this.handleMasteryPurchase(e, stat, cost, expInput, refreshModal);
            });
        };

        this.initSparkles();
        refreshModal();

        overlay.classList.remove('u-hidden');
        overlay.style.display = 'flex';
        DeochUtils.queueIconRefresh();

        const dialog = document.getElementById('mastery-celebration-dialog');
        if (dialog) setTimeout(() => dialog.showModal(), 50);
    },

    initSparkles() {
        const container = document.getElementById('spark-container');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 25; i++) {
            const spark = document.createElement('div');
            spark.className = 'mastery-spark';
            spark.style.position = 'absolute';
            spark.style.width = '2px';
            spark.style.height = '2px';
            spark.style.background = '#fde68a';
            spark.style.borderRadius = '50%';
            spark.style.left = DeochUtils.random() * 100 + '%';
            spark.style.bottom = '-20px';
            spark.style.animationDelay = DeochUtils.random() * 3 + 's';
            spark.style.opacity = '0';
            spark.style.boxShadow = '0 0 10px #fde68a';
            container.appendChild(spark);
        }
    },

    calculateMasteryCost(stat) {
        if (stat === 'hp') return (window.mobileMaxHp || 28) * 50;
        if (stat === 'mp') return (window.mobileMaxMp || 12) * 100;
        const base = this.getStatValue(stat);
        const mod = this.calculateMod(base);
        return base * Math.max(1, mod) * 125;
    },

    handleMasteryPurchase(e, stat, cost, expInput, refresh) {
        e.stopPropagation();
        const currentExp = DeochUtils.getInt('test-exp-input', 0);
        if (currentExp < cost) return;

        const newExp = currentExp - cost;
        if (expInput.tagName === 'SPAN') expInput.textContent = newExp;
        else expInput.value = newExp;

        this.applyMasteryBonus(stat);
        this.updateLevelFromExp(true);
        refresh();
    },

    applyMasteryBonus(stat) {
        if (stat === 'hp' || stat === 'mp') {
            const id = (stat === 'hp') ? 'hud-max-hp-input' : 'hud-max-mp-input';
            const input = document.getElementById(id);
            if (input) input.value = (parseInt(input.value) || 0) + 1;
            if (window.VitalsManager) {
                window.VitalsManager.updateMaxStat(stat);
                window.VitalsManager.adjust(stat, 1);
            }
        } else {
            const newVal = this.getStatValue(stat) + 1;
            this.setStatValue(stat, newVal);
        }
    },

    closeCelebration() {
        const overlay = document.getElementById('test-mastery-celebration');
        const dialog = document.getElementById('mastery-celebration-dialog');
        if (dialog) dialog.close();
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.add('u-hidden');
        }
        const celebrated = document.getElementById('test-mastery-celebrated');
        if (celebrated) celebrated.value = 'true';
    },

    // --- Rest & Healing ---

    initRestListeners() {
        const rollHealingBtns = document.querySelectorAll('.roll-h-die');
        rollHealingBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const sides = parseInt(btn.getAttribute('data-sides'));
                this.rollHealing(sides);
            }, { signal: this.signal });
        });

        const applyHp = document.getElementById('apply-healing-hp');
        if (applyHp) applyHp.addEventListener('click', () => this.applyRestoration('hp'), { signal: this.signal });

        const applyMana = document.getElementById('apply-healing-mana');
        if (applyMana) applyMana.addEventListener('click', () => this.applyRestoration('mana'), { signal: this.signal });
    },

    rollHealing(sides) {
        const healingDiceInput = document.getElementById('char-healing-dice');
        const healingResultSpan = document.getElementById('healing-roll-result');
        const diceBadge = document.getElementById('healing-dice-badge');

        let count = parseInt(healingDiceInput?.value) || 0;
        if (count <= 0) {
            this.showRestToast('No Healing Dice available!', healingDiceInput);
            return;
        }

        const roll = Math.floor(DeochUtils.random() * sides) + 1;
        if (healingResultSpan) healingResultSpan.textContent = roll;

        count--;
        if (healingDiceInput) healingDiceInput.value = count;
        if (diceBadge) diceBadge.textContent = count;

        this.showRestToast(`Rolled ${roll}!`, healingResultSpan);
    },

    applyRestoration(type) {
        const healingResultSpan = document.getElementById('healing-roll-result');
        const rollValue = parseInt(healingResultSpan?.textContent) || 0;
        if (rollValue <= 0) return;

        if (type === 'hp') {
            const hpInput = document.getElementById('char-hp');
            const maxHp = parseInt(document.getElementById('char-hp-max')?.value) || 0;
            let current = parseInt(hpInput?.value) || 0;
            hpInput.value = Math.min(maxHp, current + rollValue);
            hpInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            const manaInput = document.getElementById('char-mana');
            const maxMana = parseInt(document.getElementById('char-mana-max')?.value) || 0;
            let current = parseInt(manaInput?.value) || 0;
            manaInput.value = Math.min(maxMana, current + rollValue);
            manaInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (healingResultSpan) healingResultSpan.textContent = '0';
    },

    showRestToast(message, element) {
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

    // --- Exhaustion & Conditions ---

    initExhaustionListeners() {
        const inputs = document.querySelectorAll('.exhaustion-dots input');
        inputs.forEach((input, index) => {
            input.addEventListener('change', (e) => {
                this.handleExhaustionChange(e.target.checked, index + 1, inputs);
            }, { signal: this.signal });
        });
    },

    handleExhaustionChange(isChecking, targetLevel, exhaustionInputs) {
        if (isChecking) {
            for (let i = 0; i < targetLevel; i++) {
                if (exhaustionInputs[i]) exhaustionInputs[i].checked = true;
            }
        } else {
            for (let i = targetLevel; i < exhaustionInputs.length; i++) {
                if (exhaustionInputs[i]) exhaustionInputs[i].checked = false;
            }
        }
        this.updateConditionsBadge();
    },

    initConditionListeners() {
        const inputs = document.querySelectorAll('.condition-item input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateConditionsBadge();
            }, { signal: this.signal });
        });
        this.updateConditionsBadge();
    },

    updateConditionsBadge() {
        const standardCount = document.querySelectorAll('.condition-item input:checked').length;
        const exhaustionLevel = document.querySelectorAll('.exhaustion-dots input:checked').length;

        const badge = document.getElementById('condition-count');
        const badgeContainer = document.getElementById('active-conditions-badge');

        if (badge) badge.textContent = standardCount;
        if (badgeContainer) {
            badgeContainer.classList.toggle('hidden', standardCount === 0);
        }

        const summary = document.getElementById('conditions-active-summary');
        if (summary) {
            let tagsHTML = '';
            if (exhaustionLevel > 0) {
                tagsHTML += `
                    <div class="u-font-size-xs u-bold u-border-radius-full u-text-danger u-bg-danger-alpha u-p-0-2-0-8 u-border-danger">
                        Exhaust ${exhaustionLevel}
                    </div>
                `;
            }
            summary.innerHTML = tagsHTML;
            summary.classList.toggle('hidden', tagsHTML === '');
        }
    },

    // --- Leveling Internal Listeners ---

    initLevelingListeners() {
        const testAddExp = document.getElementById('test-add-exp-input');
        if (testAddExp) {
            testAddExp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleManualExpAdd(testAddExp);
                }
            }, { signal: this.signal });

            const testAddExpBtn = document.getElementById('test-add-exp-btn');
            if (testAddExpBtn) {
                testAddExpBtn.addEventListener('click', () => {
                    this.handleManualExpAdd(testAddExp);
                }, { signal: this.signal });
            }
        }
    },

    handleManualExpAdd(input) {
        const val = parseInt(input.value.replace(/,/g, '')) || 0;
        if (val > 0) {
            const currentExp = DeochUtils.getInt('test-exp-input', 0);
            DeochUtils.smartSet('test-exp-input', currentExp + val);
            this.updateLevelFromExp();
            input.value = '';
        }
    },

    // --- Rolling & Mobile Actions ---

    initStatRolling() {
        document.addEventListener('click', (e) => {
            const el = e.target.closest('.stat-box, .summary-item');
            if (el) this.handleStatClick(e, el);
        }, { signal: this.signal });
    },

    handleStatClick(e, el) {
        if (el.closest('#floating-vitality-orbs')) return;
        const stat = el.getAttribute('data-stat') || 'str';
        if (e.target.closest('.hud-header-toggles')) return;

        if (el.classList.contains('can-increase')) {
            this.handleStatAllocation(stat);
            return;
        }

        if (el.classList.contains('stat-rolling') || !window.DiceRoller) return;

        const mod = this.getStatMod(stat);
        const total = window.DiceRoller.rollCheck(mod, stat.toUpperCase());

        el.classList.add('stat-rolling');
        if (window.navigator?.vibrate) window.navigator.vibrate(10);

        const resultDiv = document.createElement('div');
        resultDiv.className = 'stat-roll-result';
        resultDiv.textContent = total;
        resultDiv.style.position = 'absolute';
        resultDiv.style.top = '0';
        resultDiv.style.left = '0';
        resultDiv.style.width = '100%';
        resultDiv.style.height = '100%';
        resultDiv.style.display = 'flex';
        resultDiv.style.alignItems = 'center';
        resultDiv.style.justifyContent = 'center';
        resultDiv.style.background = 'rgba(0,0,0,0.8)';
        resultDiv.style.borderRadius = 'inherit';
        resultDiv.style.zIndex = 'var(--z-surface)';

        const originalPosition = el.style.position;
        if (!originalPosition || originalPosition === 'static') el.style.position = 'relative';
        el.appendChild(resultDiv);

        setTimeout(() => {
            el.classList.remove('stat-rolling');
            resultDiv.remove();
            el.style.position = originalPosition;
            el.classList.add('stat-fade-back');
            setTimeout(() => el.classList.remove('stat-fade-back'), 400);
            DeochUtils.queueIconRefresh();
        }, 2000);
    },

    initMobileActions() {
        const actionsList = document.getElementById('test-actions-list');
        const addActionBtn = document.getElementById('add-action-btn');

        if (!actionsList || !addActionBtn) return;

        actionsList.addEventListener('click', (e) => {
            const actionItem = e.target.closest('.action-item');
            if (!actionItem) return;
            const type = actionItem.getAttribute('data-action-type');

            if (type === 'unarmed') {
                const choice = prompt('Unarmed Attack: Use Strength (S) or Dexterity (D)?', 'S');
                if (!choice) return;
                const stat = choice.toLowerCase().startsWith('d') ? 'dex' : 'str';
                const mod = this.getStatMod(stat);
                this.rollAction(actionItem, 'Unarmed Attack', mod, (m) => Math.max(1, 1 + m));
            } else if (type === 'custom') {
                const name = actionItem.getAttribute('data-action-name');
                const bonus = parseInt(actionItem.getAttribute('data-action-bonus')) || 0;
                this.rollAction(actionItem, name, bonus);
            }
        }, { signal: this.signal });

        addActionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddActionPrompt();
        }, { signal: this.signal });
    },

    getStatMod(stat) {
        const val = this.getStatValue(stat);
        return this.calculateMod(val);
    },

    rollAction(el, name, bonus, damageFormula = null) {
        if (el.classList.contains('action-rolling')) return;
        const roll = Math.floor(DeochUtils.random() * 20) + 1;
        const total = roll + bonus;
        const bonusDisplay = el.querySelector('.action-bonus');
        if (!bonusDisplay) return;

        const originalBonus = bonusDisplay.innerHTML;
        el.classList.add('action-rolling');
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);

        let resultHTML = `<span class="action-roll-result">${total}</span>`;
        if (damageFormula) {
            const dmg = damageFormula(bonus);
            resultHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1;">
                    <span class="action-roll-result">${total}</span>
                    <span style="font-size: 0.5rem; opacity: 0.8; margin-top: 1px;">DMG: ${dmg}</span>
                </div>
            `;
        }

        bonusDisplay.innerHTML = resultHTML;

        setTimeout(() => {
            el.classList.remove('action-rolling');
            bonusDisplay.innerHTML = originalBonus;
            el.classList.add('stat-fade-back');
            setTimeout(() => el.classList.remove('stat-fade-back'), 400);
        }, 2500);
    },

    showAddActionPrompt() {
        const name = prompt('Action Name:', 'Attack');
        if (!name) return;
        const bonusStr = prompt('Bonus to Roll (e.g. 5):', '0');
        const bonus = parseInt(bonusStr) || 0;

        const actionsList = document.getElementById('test-actions-list');
        if (!actionsList) return;
        const newItem = document.createElement('div');
        newItem.className = 'action-item';
        newItem.setAttribute('data-action-type', 'custom');
        newItem.setAttribute('data-action-name', name);
        newItem.setAttribute('data-action-bonus', bonus);

        const safeName = DeochUtils.escapeHtml(name);
        const safeBonus = DeochUtils.escapeHtml(String(bonus >= 0 ? '+' + bonus : bonus));

        newItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="action-icon-circle"><i data-lucide="sword" style="width: 14px; height: 14px; color: var(--accent-primary);"></i></div>
                <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">${safeName}</div>
                    <div style="font-size: 0.65rem; opacity: 0.5;">Custom Action</div>
                </div>
            </div>
            <div class="action-bonus-display"><div class="action-bonus">${safeBonus}</div></div>
        `;

        actionsList.appendChild(newItem);
        DeochUtils.queueIconRefresh();
    },

    initStatTooltip() {
        const tooltip = document.getElementById('stat-points-tooltip');
        if (tooltip) {
            tooltip.addEventListener('click', (e) => {
                e.stopPropagation();
                DeochUtils.Storage.set('deoch_has_interacted_with_stat_popup', 'true');
                document.body.classList.add('stat-tooltip-dismissed');
                this.updateAvailablePointsUI();
                if (window.InterfaceManager) window.InterfaceManager.toggleHUD(true);
            }, { signal: this.signal });
        }
    },

    // --- Math & Rule Helpers ---

    calculateHPChange(currentHp, currentTemp, delta, maxHp) {
        let newHp = currentHp;
        let newTemp = currentTemp;

        if (delta > 0) {
            const potential = currentHp + delta;
            if (potential > maxHp) {
                newHp = maxHp;
                newTemp = Math.min(maxHp * 2, newTemp + (potential - maxHp));
            } else {
                newHp = potential;
            }
        } else if (delta < 0) {
            if (newTemp > 0) {
                const remaining = newTemp + delta;
                if (remaining < 0) {
                    newTemp = 0;
                    newHp = Math.max(0, newHp + remaining);
                } else {
                    newTemp = remaining;
                }
            } else {
                newHp = Math.max(0, newHp + delta);
            }
        }
        return { hp: newHp, temp: newTemp };
    },

    cleanup() {
        this.initialized = false;
        this.allocatedThisLevel = [];
        this.preAllocationStats = {};
        this.lastProcessedLevel = -1;
        console.log('ProgressionManager: Cleanup called');
    }
};
