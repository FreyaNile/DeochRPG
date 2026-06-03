import { DeochUtils } from './DeochUtils.js';
import { ModalManager } from './ModalManager.js';
import { DataManager } from './DataManager.js';
import { InterfaceManager } from './InterfaceManager.js';
import { DiceTray } from './dice-tray.js';
import { VitalsManager } from './orbs.js';

/**
 * @module ProgressionManager
 * @description Central authority for character growth: Attributes, Leveling, EXP, and Game Rules.
 */
export const ProgressionManager = {
    initialized: false,
    signal: null,

    // --- State ---
    availableStatPoints: 0,
    allocatedThisLevel: [],
    preAllocationStats: {},
    lastProcessedLevel: -1,
    isSleeping: false,

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

        // Update summaries
        document.querySelectorAll(`.summary-item[data-stat="${stat}"] .val, .stat-box[data-stat="${stat}"] .val`).forEach(el => {
            el.textContent = value;
        });

        const mod = DeochUtils.calculateMod(value);
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
        Object.entries(stats).forEach(([stat, value]) => this.setStatValue(stat, value));
    },

    pulseStatIncrease(stat) {
        const selectors = [
            `.summary-item[data-stat="${stat}"]`,
            `.stat-box[data-stat="${stat}"]`,
            `.test-stat-val[data-stat="${stat}"]`
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                DeochUtils.restartAnimation(el, 'stat-allocated-flash');
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
            Object.entries(this.preAllocationStats).forEach(([stat, value]) => this.setStatValue(stat, value));
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
            indicator.classList.toggle('visible', hasPoints);
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
            str: DeochUtils.calculateMod(stats.str),
            dex: DeochUtils.calculateMod(stats.dex),
            con: DeochUtils.calculateMod(stats.con),
            int: DeochUtils.calculateMod(stats.int),
            wis: DeochUtils.calculateMod(stats.wis),
            cha: DeochUtils.calculateMod(stats.cha)
        };

        this.ATTRIBUTES.forEach(s => {
            const val = s.calculate(stats, mods);
            DeochUtils.setText(`${s.id}-display`, val);
            const input = document.getElementById(`${s.id}-value`);
            if (input) input.value = val;
        });

        this.updateActionBonuses();
    },

    updateActionBonuses() {
        // Custom Actions
        const actionItems = document.querySelectorAll('#test-actions-list .action-item[data-action-type="custom"]');
        actionItems.forEach(item => {
            const stat = item.getAttribute('data-action-stat');
            const bonus = parseInt(item.getAttribute('data-action-bonus')) || 0;
            let displayBonus = bonus;
            if (stat) {
                displayBonus = this.getStatMod(stat) + bonus;
            }
            const displayEl = item.querySelector('.action-bonus');
            if (displayEl) {
                displayEl.textContent = `${displayBonus >= 0 ? '+' : ''}${displayBonus}`;
            }
        });

    },

    updateLevelFromExp(isMasteryAction = false) {
        const exp = DeochUtils.getInt('test-exp-input', 0);
        const totalLevel = this.calculateCurrentLevel(exp);

        // Use internally tracked level instead of DOM read to prevent false triggers during population
        const oldLevel = this.lastProcessedLevel;
        const isInitializing = DataManager ? DataManager.isInitializing : false;

        if (!isInitializing && this.lastProcessedLevel >= 0 && totalLevel > this.lastProcessedLevel) {
            const levelDiff = totalLevel - this.lastProcessedLevel;
            this.availableStatPoints += levelDiff * 2;
        }

        this.lastProcessedLevel = totalLevel;
        this.syncLevelToMainForm(totalLevel);

        if (!isMasteryAction) {
            this.checkLevelUpEvents(totalLevel, oldLevel, exp);
        }

        if (InterfaceManager) {
            InterfaceManager.updateHUDLevelDisplay(exp);
            InterfaceManager.updateEXPRing(exp, totalLevel);
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
        const isInitializing = DataManager ? DataManager.isInitializing : false;
        if (isInitializing) return;

        const celebratedEl = document.getElementById('test-mastery-celebrated');
        if (exp >= 27500 && celebratedEl && celebratedEl.value === 'false') {
            this.triggerMasteryCelebration();
        }

        const classChoiceMade = document.getElementById('test-class-choice-made');
        if (exp >= 500 && classChoiceMade && classChoiceMade.value === 'false') {
            document.getElementById('experience-modal')?.close();
            this.showClassSelection();
            return;
        }

        const multiclassChoiceMade = document.getElementById('test-multiclass-choice-made');
        const multiclassModal = document.getElementById('test-multiclass-modal');
        if (exp >= 10500 && multiclassChoiceMade && multiclassChoiceMade.value === 'false') {
            if (multiclassModal) {
                document.getElementById('experience-modal')?.close();
                multiclassModal.showModal();
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
                if (multiclassModal) multiclassModal.close();
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
                if (multiclassModal) multiclassModal.close();
                this.updateLevelFromExp();
            }, { signal: this.signal });
        }
    },

    showClassSelection(isSecondary = false) {
        const dialog = document.getElementById('class-selection-dialog');
        const optionsContainer = document.getElementById('test-class-options');
        if (!dialog || !optionsContainer) return;

        const classes = [
            {
                name: 'Barbarian',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><g transform="rotate(45 12 12)"><line x1="12" y1="6" x2="12" y2="22" /><path d="M 12 6 c -3 0 -5 -1 -7 -2 a 6 6 0 0 0 0 10 c 2 -1 4 -2 7 -2 Z" fill="currentColor" /><path d="M 12 6 c 3 0 5 -1 7 -2 a 6 6 0 0 1 0 10 c -2 -1 -4 -2 -7 -2 Z" fill="currentColor" /></g></svg>',
                iconType: 'svg',
                desc: 'Instinctive'
            },
            { name: 'Fighter', icon: 'shield', iconType: 'lucide', desc: 'Combat Tactician' },
            { name: 'Rogue', icon: 'venetian-mask', iconType: 'lucide', desc: 'Expert' },
            { name: 'Wizard', icon: 'fa-solid fa-hat-wizard', iconType: 'fontawesome', desc: 'Academic' },
            { name: 'Sorcerer', icon: 'sparkles', iconType: 'lucide', desc: 'Avatar' },
            { name: 'Druid', icon: 'paw-print', iconType: 'lucide', desc: 'Naturalist' },
            { name: 'Paladin', icon: 'fa-solid fa-sun', iconType: 'fontawesome', desc: 'Faithful' },
            { name: 'Ranger', icon: 'fa-solid fa-leaf', iconType: 'fontawesome', desc: 'Tracker' },
            { name: 'Monk', icon: 'fa-solid fa-hand-fist', iconType: 'fontawesome', desc: 'Disciplined' },
            { name: 'Psychic', icon: 'fa-solid fa-eye', iconType: 'fontawesome', desc: 'Cognitive' }
        ];

        optionsContainer.innerHTML = '';
        classes.forEach(c => {
            const btn = DeochUtils.createClassOptionButton(c, () => this.handleClassSelection(c.name, isSecondary, dialog));
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
        const dialog = document.getElementById('mastery-celebration-dialog');
        if (!dialog) return;

        document.body.classList.add('mastery-celebration-active');
        dialog.showModal();
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        }

        requestAnimationFrame(() => {
            DeochUtils.initSparkles();
            this.refreshMasteryModal();
        });
    },

    refreshMasteryModal() {
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
            btn.onclick = (e) => this.handleMasteryPurchase(e, stat, cost, expInput, () => this.refreshMasteryModal());
        });
    },

    calculateMasteryCost(stat) {
        if (stat === 'hp') return (DataManager.activeCharacter.maxHp || 28) * 50;
        if (stat === 'mp') return (DataManager.activeCharacter.maxMp || 12) * 100;
        const base = this.getStatValue(stat);
        const mod = DeochUtils.calculateMod(base);
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
            if (VitalsManager) {
                VitalsManager.updateMaxStat(stat);
                VitalsManager.adjust(stat, 1);
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
            overlay.classList.add('hidden');
        }
        const celebrated = document.getElementById('test-mastery-celebrated');
        if (celebrated) celebrated.value = 'true';
        document.body.classList.remove('mastery-celebration-active');
    },

    // --- Rest & Healing ---

    initRestListeners() {
        const container = document.getElementById('test-restoration-grid');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const rollBtn = e.target.closest('.roll-h-die');
            if (rollBtn) {
                const sides = parseInt(rollBtn.getAttribute('data-sides'));
                this.rollHealing(sides);
                return;
            }

            const applyHp = e.target.closest('#apply-healing-hp');
            if (applyHp) {
                this.applyRestoration('hp');
                return;
            }

            const applyMana = e.target.closest('#apply-healing-mana');
            if (applyMana) {
                this.applyRestoration('mana');
                return;
            }

            const restBtn = e.target.closest('#rest-btn');
            if (restBtn) {
                this.fullRest();
                return;
            }

            const sleepBtn = e.target.closest('#short-rest-btn');
            if (sleepBtn) {
                this.sleep();
            }
        }, { signal: this.signal });
    },

    rollHealing(sides) {
        const isHungry = document.getElementById('char-hungry')?.checked;
        const isThirsty = document.getElementById('char-thirst')?.checked;
        if (isHungry || isThirsty) {
            const targetEl = document.getElementById('healing-dice-section');
            DeochUtils.showRestToast('Cannot spend healing dice when hungry or thirsty!', targetEl || document.body);
            return;
        }

        const healingDiceInput = document.getElementById('char-healing-dice');
        const healingResultSpan = document.getElementById('healing-roll-result');
        const diceBadge = document.getElementById('healing-dice-badge');

        let count = parseInt(healingDiceInput?.value) || 0;
        if (count <= 0) {
            DeochUtils.showRestToast('No Healing Dice available!', healingDiceInput || document.body);
            return;
        }

        const roll = Math.floor(DeochUtils.random() * sides) + 1;
        if (healingResultSpan) healingResultSpan.textContent = roll;

        count--;
        if (healingDiceInput) {
            healingDiceInput.value = count;
            healingDiceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (diceBadge) diceBadge.textContent = count;
    },

    applyRestoration(type) {
        const healingResultSpan = document.getElementById('healing-roll-result');
        const rollValue = parseInt(healingResultSpan?.textContent) || 0;
        if (rollValue <= 0 || isNaN(rollValue)) return;

        if (VitalsManager) {
            VitalsManager.adjust(type === 'hp' ? 'hp' : 'mana', rollValue, 'healing-dice');
        } else {
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
        }

        if (DataManager) DataManager.saveCharacter();

        if (healingResultSpan) healingResultSpan.textContent = '--';
    },

    fullRest() {
        const healingDiceInput = document.getElementById('char-healing-dice');
        const levelInput = document.getElementById('char-level');
        const diceBadge = document.getElementById('healing-dice-badge');
        const healingResultSpan = document.getElementById('healing-roll-result');
        const restBtn = document.getElementById('rest-btn');

        const level = parseInt(levelInput?.value) || 1;

        if (healingDiceInput) {
            healingDiceInput.value = level;
            healingDiceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (diceBadge) diceBadge.textContent = level;
        if (healingResultSpan) healingResultSpan.textContent = '--';

        if (DataManager) DataManager.saveCharacter();

        DeochUtils.showRestToast('Healing Dice Replenished!', restBtn || document.body);
    },

    applyWakeUpEffects() {
        // Toggle hungry and thirsty conditions on wakeup if they are not already checked
        const hungryInput = document.getElementById('char-hungry');
        const thirstyInput = document.getElementById('char-thirst');
        if (hungryInput && !hungryInput.checked) {
            hungryInput.checked = true;
            hungryInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (thirstyInput && !thirstyInput.checked) {
            thirstyInput.checked = true;
            thirstyInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Remove 1 level of exhaustion if present
        const exhaustionInputs = document.querySelectorAll('.exhaustion-dots input');
        const checkedExhaustion = document.querySelectorAll('.exhaustion-dots input:checked');
        if (checkedExhaustion.length > 0) {
            const targetIndex = checkedExhaustion.length - 1;
            if (exhaustionInputs[targetIndex]) {
                exhaustionInputs[targetIndex].checked = false;
                exhaustionInputs[targetIndex].dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    },

    sleep() {
        this.isSleeping = !this.isSleeping;
        const sleepBtn = document.getElementById('short-rest-btn');
        const healingDiceSection = document.getElementById('healing-dice-section');
        const condPanel = document.querySelector('.conditions-panel');

        if (this.isSleeping) {
            document.body.classList.add('sleep-shade-active');
            if (healingDiceSection) healingDiceSection.style.display = 'flex';
            if (condPanel && !condPanel.hasAttribute('open')) {
                condPanel.setAttribute('open', '');
            }
        } else {
            document.body.classList.remove('sleep-shade-active');
            if (healingDiceSection) healingDiceSection.style.display = 'none';
            if (condPanel && condPanel.hasAttribute('open')) {
                condPanel.removeAttribute('open');
            }
            this.applyWakeUpEffects();
        }
        DeochUtils.toggleSleepButtonState(sleepBtn, this.isSleeping);
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
                    <div class="u-font-size-xs u-bold u-border-radius-full u-text-danger u-bg-danger-alpha u-p-0-2-0-8 u-border-danger u-flex-center u-gap-0-4" style="display: inline-flex; align-items: center;">
                        <i data-lucide="activity" class="u-icon-xs"></i><span>${exhaustionLevel}</span>
                    </div>
                `;
            }
            summary.innerHTML = tagsHTML;
            summary.classList.toggle('hidden', tagsHTML === '');
            if (exhaustionLevel > 0) {
                DeochUtils.queueIconRefresh(summary);
            }
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
            const el = e.target.closest('.stat-box, .summary-item, .hud-combat-pill--rollable');
            if (el) this.handleStatClick(e, el);
        }, { signal: this.signal });
    },

    handleStatClick(e, el) {
        if (el.closest('#floating-vitality-orbs')) return;

        const combatStat = el.getAttribute('data-combat-stat');
        if (combatStat === 'init') {
            this.handleInitiativeClick(el);
            return;
        }

        const stat = el.getAttribute('data-stat') || 'str';
        if (el.classList.contains('can-increase')) {
            this.handleStatAllocation(stat);
            return;
        }

        this.handleCoreStatClick(el, stat);
    },

    handleInitiativeClick(el) {
        if (el.classList.contains('stat-rolling') || !DiceTray) return;
        const mod = this.getStatMod('wis');
        const total = DiceTray.rollCheck(mod, 'INITIATIVE');
        const isNat1 = DiceTray.lastRollIsNat1;
        const isNat20 = DiceTray.lastRollIsNat20;

        el.classList.add('stat-rolling');
        if (window.navigator?.vibrate) window.navigator.vibrate(10);

        const resultDiv = document.createElement('div');
        resultDiv.className = 'stat-roll-result';
        resultDiv.textContent = total;
        if (isNat1) resultDiv.style.color = 'var(--color-danger)';
        if (isNat20) resultDiv.style.color = 'var(--color-success)';
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
            DeochUtils.queueIconRefresh(el);
        }, 2000);
    },

    handleCoreStatClick(el, stat) {
        if (el.classList.contains('stat-rolling') || !DiceTray) return;

        const mod = this.getStatMod(stat);
        const total = DiceTray.rollCheck(mod, stat.toUpperCase());
        const isNat1 = DiceTray.lastRollIsNat1;
        const isNat20 = DiceTray.lastRollIsNat20;

        el.classList.add('stat-rolling');
        if (window.navigator?.vibrate) window.navigator.vibrate(10);

        const resultDiv = document.createElement('div');
        resultDiv.className = 'stat-roll-result';
        resultDiv.textContent = total;
        if (isNat1) resultDiv.style.color = 'var(--color-danger)';
        if (isNat20) resultDiv.style.color = 'var(--color-success)';
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
            DeochUtils.queueIconRefresh(el);
        }, 2000);
    },

    initMobileActions() {
        const actionsList = document.getElementById('test-actions-list');
        const addActionBtn = document.getElementById('add-action-btn');

        if (!actionsList || !addActionBtn) return;

        let longPressTimeout = null;
        let lastTouchTriggerTime = 0;
        const LONG_PRESS_DURATION = 600; // ms

        const cancelLongPress = () => {
            if (longPressTimeout) {
                clearTimeout(longPressTimeout);
                longPressTimeout = null;
            }
        };

        actionsList.addEventListener('touchstart', (e) => {
            const actionItem = e.target.closest('.action-item');
            if (!actionItem) return;
            cancelLongPress();
            longPressTimeout = setTimeout(() => {
                lastTouchTriggerTime = Date.now();
                this.handleActionLongPress(actionItem);
            }, LONG_PRESS_DURATION);
        }, { signal: this.signal, passive: true });

        const cancelEvents = ['touchend', 'touchcancel', 'touchmove'];
        cancelEvents.forEach(evt => {
            actionsList.addEventListener(evt, () => {
                cancelLongPress();
            }, { signal: this.signal, passive: true });
        });

        actionsList.addEventListener('contextmenu', (e) => {
            const actionItem = e.target.closest('.action-item');
            if (actionItem) {
                e.preventDefault();
                e.stopPropagation();
                const timeSinceTouchTrigger = Date.now() - lastTouchTriggerTime;
                if (timeSinceTouchTrigger > 800) {
                    this.handleActionLongPress(actionItem);
                }
            }
        }, { signal: this.signal });

        actionsList.addEventListener('click', async (e) => {
            const timeSinceTouchTrigger = Date.now() - lastTouchTriggerTime;
            if (timeSinceTouchTrigger <= 800) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const actionItem = e.target.closest('.action-item');
            if (!actionItem) return;
            const type = actionItem.getAttribute('data-action-type');

            if (type === 'custom') {
                const name = actionItem.getAttribute('data-action-name');
                const stat = actionItem.getAttribute('data-action-stat');
                const bonus = parseInt(actionItem.getAttribute('data-action-bonus')) || 0;
                const dmgBonus = parseInt(actionItem.getAttribute('data-action-dmg-bonus')) || 0;
                const mod = stat ? this.getStatMod(stat) : 0;
                const diceAttr = actionItem.getAttribute('data-action-dice') || '';
                
                const damageFormula = () => {
                    let totalDmg = 0;
                    if (diceAttr) {
                        const counts = DeochUtils.parseDiceString(diceAttr);
                        for (const [sidesStr, count] of Object.entries(counts)) {
                            const sides = parseInt(sidesStr, 10);
                            for (let i = 0; i < count; i++) {
                                totalDmg += Math.floor(DeochUtils.random() * sides) + 1;
                            }
                        }
                    } else {
                        totalDmg = 1;
                    }
                    return {
                        total: Math.max(1, totalDmg + mod + dmgBonus),
                        rolls: totalDmg,
                        mod: mod,
                        dmgBonus: dmgBonus
                    };
                };
                this.rollAction(actionItem, name, mod + bonus, damageFormula);
            }
        }, { signal: this.signal });
 
        addActionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddActionPrompt();
        }, { signal: this.signal });
    },
 
    async handleActionLongPress(actionItem) {
        const type = actionItem.getAttribute('data-action-type');
        if (type === 'custom') {
            await this.handleCustomLongPress(actionItem);
        }
    },

    async handleCustomLongPress(actionItem) {
        const initialData = {
            name: actionItem.getAttribute('data-action-name') || '',
            bonus: parseInt(actionItem.getAttribute('data-action-bonus')) || 0,
            dmgBonus: parseInt(actionItem.getAttribute('data-action-dmg-bonus')) || 0,
            icon: actionItem.getAttribute('data-action-icon') || 'sword',
            stat: actionItem.getAttribute('data-action-stat') || '',
            dice: actionItem.getAttribute('data-action-dice') || ''
        };
        const result = await ModalManager.showCustomActionDialog(initialData);
        if (!result) return;

        if (result.deleted) {
            actionItem.remove();
            DeochUtils.saveCharacter();
            return;
        }

        actionItem.setAttribute('data-action-name', result.name);
        actionItem.setAttribute('data-action-bonus', result.bonus);
        actionItem.setAttribute('data-action-dmg-bonus', result.dmgBonus);
        actionItem.setAttribute('data-action-icon', result.icon);
        actionItem.setAttribute('data-action-stat', result.stat);
        actionItem.setAttribute('data-action-dice', result.dice);

        const nameEl = actionItem.querySelector('.u-bold');
        const subEl = actionItem.querySelector('.u-opacity-0-5');
        const iconContainer = actionItem.querySelector('.action-icon-circle');

        if (nameEl) nameEl.textContent = result.name;
        
        const statText = result.stat ? result.stat.toUpperCase() : '';
        let subtext = '1';
        let dmgBonusPart = '';
        if (result.dmgBonus > 0) {
            dmgBonusPart = ` + ${result.dmgBonus}`;
        } else if (result.dmgBonus < 0) {
            dmgBonusPart = ` - ${Math.abs(result.dmgBonus)}`;
        }
        if (result.dice) {
            subtext = statText ? `${statText} • ${result.dice}${dmgBonusPart} DMG` : `${result.dice}${dmgBonusPart} DMG`;
        } else if (statText) {
            subtext = `${statText} + 1${dmgBonusPart}`;
        } else if (result.dmgBonus) {
            subtext = `1${dmgBonusPart}`;
        }
        
        if (subEl) subEl.textContent = subtext;
        if (iconContainer) {
            iconContainer.innerHTML = `<i data-lucide="${result.icon}" class="u-icon-sm u-text-accent"></i>`;
        }
        DeochUtils.queueIconRefresh(actionItem);
        this.updateActionBonuses();
        DeochUtils.saveCharacter();
    },

    getStatMod(stat) {
        const val = this.getStatValue(stat);
        return DeochUtils.calculateMod(val);
    },

    _getHitLogStr(el, roll, mod) {
        const stat = el.getAttribute('data-action-stat');
        const hitBonus = parseInt(el.getAttribute('data-action-bonus')) || 0;
        
        let hitStr = 'HIT: ';
        if (stat) {
            const modSign = mod >= 0 ? '+' : '';
            hitStr += `${stat.toUpperCase()}(${modSign}${mod}) + `;
        }
        hitStr += `d20(${roll})`;
        if (hitBonus > 0) {
            hitStr += ` + ${hitBonus}`;
        } else if (hitBonus < 0) {
            hitStr += ` - ${Math.abs(hitBonus)}`;
        }
        return hitStr;
    },

    _getDmgLogStr(el, dmg, mod, dmgInfo) {
        if (dmg === null) return '';
        const stat = el.getAttribute('data-action-stat');
        const diceAttr = el.getAttribute('data-action-dice');
        const dmgBonus = parseInt(el.getAttribute('data-action-dmg-bonus')) || 0;
        
        let dmgStr = 'DMG: ';
        if (stat) {
            const modSign = mod >= 0 ? '+' : '';
            dmgStr += `${stat.toUpperCase()}(${modSign}${mod}) + `;
        }
        if (diceAttr) {
            const baseDmg = (dmgInfo && dmgInfo.rolls !== undefined) ? dmgInfo.rolls : dmg;
            dmgStr += `${diceAttr}(${baseDmg})`;
        } else {
            dmgStr += '1';
        }
        if (dmgBonus > 0) {
            dmgStr += ` + ${dmgBonus}`;
        } else if (dmgBonus < 0) {
            dmgStr += ` - ${Math.abs(dmgBonus)}`;
        }
        return dmgStr;
    },

    logActionRoll(el, name, roll, bonus, dmg, dmgInfo = null) {
        if (!DiceTray || typeof DiceTray.addToHistory !== 'function') return;

        const stat = el.getAttribute('data-action-stat');
        const mod = stat ? this.getStatMod(stat) : 0;
        
        const hitStr = this._getHitLogStr(el, roll, mod);
        const dmgStr = this._getDmgLogStr(el, dmg, mod, dmgInfo);

        const escapedName = DeochUtils.escapeHtml(name);
        let info = `<div class="u-bold" style="font-size: 0.75rem; color: var(--text-primary); margin-bottom: 2px;">${escapedName}</div><div>${hitStr}</div>`;
        if (dmgStr) {
            info += `<div class="log-divider"></div><div>${dmgStr}</div>`;
        }
        
        const isNat1 = (roll === 1);
        const isNat20 = (roll === 20);
        
        let hitTotal = Math.max(1, roll + bonus);
        if (isNat1) {
            hitTotal = 1;
        } else if (isNat20) {
            hitTotal = 20;
        }

        let finalTotal = hitTotal;
        if (dmg !== null) {
            finalTotal = `<div style="visibility: hidden; font-size: 0.75rem; line-height: 1.2; margin-bottom: 2px;">&nbsp;</div><div>${hitTotal}</div><div style="height: 1px; margin: 0.25rem 0; opacity: 0;"></div><div>${dmg}</div>`;
        }
        
        DiceTray.addToHistory(finalTotal, info, isNat1, isNat20);
    },

    rollAction(el, name, bonus, damageFormula = null) {
        if (el.classList.contains('action-rolling')) return;

        const roll = Math.floor(DeochUtils.random() * 20) + 1;
        const isNat1 = (roll === 1);
        const isNat20 = (roll === 20);
        let total;
        if (isNat1) {
            total = 1;
        } else if (isNat20) {
            total = 20;
        } else {
            total = Math.max(1, roll + bonus);
        }
        
        const bonusDisplay = el.querySelector('.action-bonus');
        if (!bonusDisplay) return;

        el.classList.add('action-rolling');

        let resultColor = '';
        if (isNat1) resultColor = 'var(--color-danger)';
        if (isNat20) resultColor = 'var(--color-success)';

        let resultHTML = `
            <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; font-family: var(--font-secondary); font-size: 0.65rem; font-weight: 800;">
                <span class="action-roll-result" style="font-size: inherit; color: inherit; font-weight: inherit;${resultColor ? ` color: ${resultColor};` : ''}">HIT: ${total}</span>
            </div>
        `;
        let dmg = null;
        let dmgInfo = null;
        if (damageFormula) {
            const dmgResult = damageFormula();
            if (dmgResult && typeof dmgResult === 'object') {
                dmg = dmgResult.total;
                dmgInfo = dmgResult;
            } else {
                dmg = dmgResult;
            }
            resultHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; font-family: var(--font-secondary); font-size: 0.65rem; font-weight: 800;">
                    <span class="action-roll-result" style="font-size: inherit; color: inherit; font-weight: inherit;${resultColor ? ` color: ${resultColor};` : ''}">HIT: ${total}</span>
                    <span style="opacity: 0.9; margin-top: 1px;">DMG: ${dmg}</span>
                </div>
            `;
        }

        bonusDisplay.innerHTML = resultHTML;

        this.logActionRoll(el, name, roll, bonus, dmg, dmgInfo);

        setTimeout(() => {
            el.classList.remove('action-rolling');
        }, 600);
    },

    async showAddActionPrompt() {
        const result = await ModalManager.showCustomActionDialog();
        if (!result) return;

        const actionsList = document.getElementById('test-actions-list');
        if (!actionsList) return;
        const newItem = DeochUtils.createCustomActionItem(result.name, result.bonus, result.icon, result.stat, result.dice, result.dmgBonus);
        actionsList.appendChild(newItem);
        DeochUtils.queueIconRefresh(newItem);
        if (window.DataManager && typeof window.DataManager.saveCharacter === 'function') {
            window.DataManager.saveCharacter();
        }
    },

    initStatTooltip() {
        const tooltip = document.getElementById('stat-points-tooltip');
        if (tooltip) {
            tooltip.addEventListener('click', (e) => {
                e.stopPropagation();
                DeochUtils.Storage.set('deoch_has_interacted_with_stat_popup', 'true');
                document.body.classList.add('stat-tooltip-dismissed');
                this.updateAvailablePointsUI();
                if (InterfaceManager) InterfaceManager.toggleHUD(true);
            }, { signal: this.signal });
        }
    },

    // --- Math & Rule Helpers ---

    calculateHPChange(currentHp, currentTemp, delta, maxHp, _source = null) {
        let newHp = currentHp;
        let newTemp = currentTemp;

        if (delta > 0) {
            newHp = Math.min(maxHp, currentHp + delta);
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
