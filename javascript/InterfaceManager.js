import { DeochUtils } from './DeochUtils.js';
import { DataManager } from './DataManager.js';
import { UpkeepData } from './UpkeepData.js';
import { ProgressionManager } from './ProgressionManager.js';
import { GMManager } from './GMManager.js';
import { AvatarManager } from './AvatarManager.js';
import { VitalsManager } from './orbs.js';

/**
 * @module InterfaceManager
 * @description Central authority for UI state: Navigation, HUD, Themes, and Custom Selects.
 */
export const InterfaceManager = {
    splashTimeout: null,
    initialized: false,

    init(sheet, signal) {
        if (this.initialized) return;
        this.signal = signal;

        // 1. Render dynamic components first so they exist in the DOM
        this.renderConditions();
        this.renderLanguages();
        this.renderAttributes();
        this.renderRestoration();

        // 2. Initialize UI modules
        this.initNavigation();
        this.initHUD();
        this.initBulkModal();
        this.initManagementEvents();
        this.initGlobalListeners();
        this.initialized = true;
    },

    // --- UI Data Syncing ---

    updateFieldUI(key, value) {
        const inputMap = {
            'name': 'char-name',
            'renown': 'char-renown',
            'race': 'char-race',
            'age': 'char-age',
            'speed': 'char-speed',
            'size': 'char-size',
            'elfrot': 'char-elfrot',
            'level': 'char-level',
            'exp': 'char-exp'
        };

        const hudMap = {
            'name': 'test-hud-name',
            'renown': 'test-hud-detail-renown',
            'race': 'test-hud-detail-race',
            'age': 'test-hud-detail-age',
            'speed': 'test-hud-detail-speed',
            'size': 'test-hud-detail-size',
            'elfrot': 'test-hud-detail-elfrot',
            'level': 'test-hud-level-text',
            'exp': 'test-exp-value-display'
        };

        const inputId = inputMap[key];
        const hudId = hudMap[key];

        if (inputId) {
            const el = document.getElementById(inputId);
            if (el) el.value = value;
        }

        if (hudId) {
            const el = document.getElementById(hudId);
            if (el) {
                if (key === 'level') {
                    el.textContent = `Level ${value}`;
                    const hiddenLevel = document.getElementById('test-hud-level');
                    if (hiddenLevel) hiddenLevel.textContent = value;
                } else if (key === 'exp') {
                    el.textContent = value;
                    const expInput = document.getElementById('test-exp-input');
                    if (expInput) {
                        if (expInput.tagName === 'INPUT') expInput.value = value;
                        else expInput.textContent = value;
                    }
                } else {
                    el.textContent = value;
                }
            }
        }
    },

    applyVitalsUI(char) {
        const activeChar = DataManager.activeCharacter;
        activeChar.maxHp = char.maxHp || 28;
        activeChar.maxMp = char.maxMp || 12;
        activeChar.maxSp = char.maxSp || 10;

        activeChar.currentHp = char.currentHp !== undefined ? char.currentHp : activeChar.maxHp;
        activeChar.tempHp = char.tempHp || 0;
        activeChar.currentMp = char.currentMp !== undefined ? char.currentMp : activeChar.maxMp;
        activeChar.currentSp = char.currentSp !== undefined ? char.currentSp : activeChar.maxSp;

        const hpInput = document.getElementById('hud-max-hp-input');
        if (hpInput) hpInput.value = activeChar.maxHp;
        const mpInput = document.getElementById('hud-max-mp-input');
        if (mpInput) mpInput.value = activeChar.maxMp;
        const spInput = document.getElementById('mobile-max-sp-input');
        if (spInput) spInput.value = activeChar.maxSp;
    },

    applyClassInfoUI(char) {
        const classText = document.getElementById('test-hud-class-text');
        if (classText) {
            const pClass = char.primaryClass || 'Human';
            classText.textContent = pClass;
            classText.dataset.primaryClass = pClass;
            const classInput = document.getElementById('char-class');
            if (classInput) classInput.value = pClass;
        }
        if (char.secondaryClass) {
            const secClass = document.getElementById('test-hud-secondary-class-visible');
            if (secClass) {
                secClass.textContent = char.secondaryClass;
                secClass.dataset.secondaryClass = char.secondaryClass;
            }
            const secInput = document.getElementById('char-class-2');
            if (secInput) secInput.value = char.secondaryClass;
        }
    },

    // --- UI Data Extraction ---

    gatherCurrentData() {
        const getFlag = (id) => document.getElementById(id)?.value === 'true';
        const getInputVal = (id, fallback) => document.getElementById(id)?.value || fallback;

        return {
            name: getInputVal('char-name', 'Unknown Hero'),
            renown: getInputVal('char-renown', 'Renown 1'),
            race: getInputVal('char-race', 'Human'),
            age: getInputVal('char-age', '20'),
            speed: getInputVal('char-speed', '30ft'),
            size: getInputVal('char-size', 'Medium'),
            level: getInputVal('char-level', '1'),
            exp: parseInt(document.getElementById('char-exp')?.value || '20', 10) || 20,
            theme: document.documentElement.getAttribute('data-theme') || 'sandstorm',
            avatar: (() => {
                const img = document.getElementById('test-hud-avatar-img');
                return (img && !img.classList.contains('hidden') && img.src) ? img.src : null;
            })(),
            stats: ProgressionManager ? ProgressionManager.getStats() : {},
            maxHp: DataManager.activeCharacter.maxHp,
            currentHp: DataManager.activeCharacter.currentHp,
            tempHp: DataManager.activeCharacter.tempHp,
            maxMp: DataManager.activeCharacter.maxMp,
            currentMp: DataManager.activeCharacter.currentMp,
            maxSp: DataManager.activeCharacter.maxSp,
            currentSp: DataManager.activeCharacter.currentSp,
            primaryClass: document.getElementById('char-class')?.value || 'Human',
            secondaryClass: document.getElementById('char-class-2')?.value || '',
            classChoiceMade: getFlag('test-class-choice-made'),
            isMulticlass: getFlag('test-is-multiclass'),
            multiclassChoiceMade: getFlag('test-multiclass-choice-made'),
            multiclassOptOut: getFlag('test-multiclass-opt-out'),
            masteryCelebrated: getFlag('test-mastery-celebrated'),
            elfrot: parseInt(document.getElementById('char-elfrot')?.value) || 0,
            availableStatPoints: ProgressionManager?.availableStatPoints || 0,
            inspiration: document.getElementById('test-hud-inspiration')?.checked || false,
            languages: (() => {
                const langData = {};
                if (ProgressionManager) {
                    ProgressionManager.LANGUAGES.forEach(l => {
                        langData[l.key] = {
                            v: document.getElementById(`${l.id}-v`)?.checked || false,
                            l: document.getElementById(`${l.id}-l`)?.checked || false
                        };
                    });
                }
                return langData;
            })(),
            customActions: (() => {
                const list = [];
                const actionItems = document.querySelectorAll('#test-actions-list .action-item[data-action-type="custom"]');
                actionItems.forEach(item => {
                    list.push({
                        name: item.getAttribute('data-action-name'),
                        bonus: parseInt(item.getAttribute('data-action-bonus')) || 0,
                        icon: item.getAttribute('data-action-icon') || 'sword',
                        stat: item.getAttribute('data-action-stat') || ''
                    });
                });
                return list;
            })(),
            unarmedPreferredStat: document.querySelector('#test-actions-list .action-item[data-action-type="unarmed"]')?.getAttribute('data-preferred-stat') || '',
            unarmedPreferredBonus: parseInt(document.querySelector('#test-actions-list .action-item[data-action-type="unarmed"]')?.getAttribute('data-preferred-bonus')) || 0
        };
    },

    resetSheetToDefaults() {
        DeochUtils.setText('test-hud-name', 'Unknown Hero');
        DeochUtils.setText('test-hud-detail-renown', 'Renown 1');
        DeochUtils.setText('test-hud-detail-race', 'Human');
        DeochUtils.setText('test-hud-detail-age', '20');
        DeochUtils.setText('test-hud-detail-speed', '30ft');
        DeochUtils.setText('test-hud-detail-size', 'Medium');

        const actionsList = document.getElementById('test-actions-list');
        if (actionsList) {
            const existingCustoms = actionsList.querySelectorAll('.action-item[data-action-type="custom"]');
            existingCustoms.forEach(el => el.remove());
        }

        const unarmedItem = document.querySelector('#test-actions-list .action-item[data-action-type="unarmed"]');
        if (unarmedItem) {
            unarmedItem.removeAttribute('data-preferred-stat');
            const subtextEl = unarmedItem.querySelector('.u-opacity-0-5');
            if (subtextEl) {
                subtextEl.textContent = 'Melee • 1 + Mod Damage';
            }
        }

        if (ProgressionManager) {
            ProgressionManager.applyStats({
                str: 9, dex: 9, con: 9, int: 9, wis: 9, cha: 9
            });
            ProgressionManager.LANGUAGES.forEach(l => {
                const vEl = document.getElementById(`${l.id}-v`);
                const lEl = document.getElementById(`${l.id}-l`);
                if (vEl) vEl.checked = false;
                if (lEl) lEl.checked = false;
            });
        }

        this.updateAvatarDisplay(null);

        DataManager.activeCharacter.maxHp = 28;
        DataManager.activeCharacter.maxMp = 12;
        DataManager.activeCharacter.maxSp = 10;
        DataManager.activeCharacter.currentHp = 28;
        DataManager.activeCharacter.tempHp = 0;
        DataManager.activeCharacter.currentMp = 12;
        DataManager.activeCharacter.currentSp = 10;

        const hpInput = document.getElementById('hud-max-hp-input');
        if (hpInput) hpInput.value = 28;
        const mpInput = document.getElementById('hud-max-mp-input');
        if (mpInput) mpInput.value = 12;
        const spInput = document.getElementById('mobile-max-sp-input');
        if (spInput) spInput.value = 10;

        ['test-class-choice-made', 'test-is-multiclass', 'test-multiclass-choice-made', 'test-multiclass-opt-out', 'test-mastery-celebrated'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'false';
        });

        const classText = document.getElementById('test-hud-class-text');
        if (classText) {
            classText.textContent = 'Human';
            classText.dataset.primaryClass = 'Human';
        }
        const secClass = document.getElementById('test-hud-secondary-class-visible');
        if (secClass) {
            secClass.textContent = '';
            secClass.dataset.secondaryClass = '';
        }
        const classInput = document.getElementById('char-class');
        if (classInput) classInput.value = 'Human';
        const classInput2 = document.getElementById('char-class-2');
        if (classInput2) classInput2.value = '';

        DeochUtils.smartSet('test-exp-input', 20);
        this.applyTheme('sandstorm');

        document.body.classList.remove('stat-tooltip-dismissed');
        DeochUtils.Storage.remove('deoch_has_interacted_with_stat_popup');

        if (ProgressionManager) {
            ProgressionManager.updateLevelFromExp();
            ProgressionManager.updateAttributes();
            ProgressionManager.updateAvailablePointsUI();
            ProgressionManager.updateStatIndicators();
        }

        if (GMManager) {
            GMManager.setGMMode(false);
        }
    },

    // --- Dynamic Rendering ---

    renderConditions() {
        const container = document.getElementById('test-conditions-grid');
        if (!container || !ProgressionManager) return;
        container.innerHTML = DeochUtils.generateConditionsHTML(ProgressionManager.CONDITIONS);
    },

    renderLanguages() {
        const container = document.getElementById('test-languages-grid');
        if (!container || !ProgressionManager) return;
        container.innerHTML = DeochUtils.generateLanguagesHTML(ProgressionManager.LANGUAGES);
    },

    renderAttributes() {
        const container = document.getElementById('test-attributes-grid');
        if (!container || !ProgressionManager) return;
        container.innerHTML = DeochUtils.generateAttributesHTML(ProgressionManager.ATTRIBUTES);
    },

    renderRestoration() {
        const container = document.getElementById('test-restoration-grid');
        if (!container || !ProgressionManager) return;
        container.innerHTML = DeochUtils.generateRestorationHTML(ProgressionManager.RESTORATION_DICE);
    },


    // --- Navigation & Routing ---

    initNavigation() {
        DeochUtils.addEvent(window, 'hashchange', () => this.handleHashChange(), { signal: this.signal });
        DeochUtils.addEvent('char-sheet-splash', 'click', () => this.transitionSplash(), { signal: this.signal });

        if (window.location.hash) {
            this.handleHashChange();
        } else {
            this.navigateTo('home');
        }
    },

    handleHashChange() {
        let target = window.location.hash.substring(1) || 'home';
        this.navigateTo(target);
    },

    navigateTo(targetId) {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.page-section');
        const btn = Array.from(navButtons).find(b => b.getAttribute('data-target') === targetId);

        navButtons.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        if (btn) btn.classList.add('active');
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');

        document.body.classList.toggle('on-test-page', targetId === 'test-page');

        if (targetId === 'test-page') {
            if (typeof window.ensureTestPageInitialized === 'function') window.ensureTestPageInitialized();
            this.handleTestPageEntry();
        } else {
            document.body.classList.remove('tour-active');
            const splash = document.getElementById('char-sheet-splash');
            if (splash) splash.style.display = 'none';
            this.clearSplashTransparency();
        }

        const tour = document.getElementById('creation-tour');
        if (targetId !== 'test-page' && tour) tour.style.display = 'none';

        window.scrollTo({ top: 0, behavior: 'smooth' });
        DeochUtils.queueIconRefresh();
    },

    handleTestPageEntry() {
        const hasChar = DataManager.getCharacters().length > 0;
        if (!hasChar) {
            document.body.classList.add('tour-active');
        }

        const splash = document.getElementById('char-sheet-splash');
        if (splash) {
            splash.style.display = 'flex';
            splash.classList.remove('splash-fade-out');
            this.updateSplashWelcome();

            const sheetView = document.getElementById('mobile-sheet-view');
            if (sheetView) {
                sheetView.style.display = 'none';
                sheetView.style.opacity = '0';
            }

            this.applySplashTransparency();
            if (this.splashTimeout) clearTimeout(this.splashTimeout);
            this.splashTimeout = setTimeout(() => this.transitionSplash(), 3000);
        }
    },

    updateSplashWelcome() {
        const welcomeMsg = document.getElementById('splash-welcome-msg');
        if (!welcomeMsg) return;

        const testGallery = DataManager.getCharacters();
        let name = null;
        if (testGallery.length > 0) {
            const lastId = DataManager.get(DataManager.KEYS.LAST_CHAR_ID);
            const char = testGallery.find(c => c.id === lastId) || testGallery[0];
            if (char?.name && !['Unknown Hero', 'Unknown Legend'].includes(char.name)) {
                name = char.name;
            }
        }

        if (name) {
            welcomeMsg.textContent = `Welcome back, ${name}`;
            welcomeMsg.style.display = 'block';
        } else {
            welcomeMsg.style.display = 'none';
        }
    },

    transitionSplash() {
        const splashEl = document.getElementById('char-sheet-splash');
        const mainContentEl = document.getElementById('mobile-sheet-view');

        if (!splashEl || splashEl.style.display === 'none' || splashEl.classList.contains('splash-fade-out')) return;

        if (this.splashTimeout) clearTimeout(this.splashTimeout);
        splashEl.classList.add('splash-fade-out');

        setTimeout(() => {
            splashEl.style.display = 'none';
            const hasChar = DataManager.getCharacters().length > 0;

            if (!hasChar) {
                DeochUtils.newHero();
            } else if (mainContentEl) {
                document.body.classList.remove('tour-active');
                document.body.classList.add('char-sheet-active', 'on-test-page');
                this.clearSplashTransparency();
                DeochUtils.safeTransition(mainContentEl, 'flex', '1');
                if (ProgressionManager) ProgressionManager.updateLevelFromExp();
            }
        }, 600);
    },

    toggleSplashTransparency(isActive) {
        const selectors = [
            '.global-header', '.site-footer', '#toggle-dice-btn',
            '.floating-vitality-orbs', '#top-mobile-hud', '.combat-utilities-wrapper',
            '.tooltip--stat-points', '#stat-points-tooltip', '#stat-points-indicator'
        ];

        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.classList.toggle('splash-transparent', isActive);
            });
        });
    },

    applySplashTransparency() { this.toggleSplashTransparency(true); },
    clearSplashTransparency() { this.toggleSplashTransparency(false); },

    // --- HUD ---

    initHUD() {
        const hud = document.getElementById('top-mobile-hud');
        if (!hud) return;

        DeochUtils.addEvent('top-mobile-hud', 'click', (e) => {
            const forbidden = [
                'button', 'input', 'select', 'svg', 'summary', 'details',
                '.inspiration-toggle', '.hud-avatar', '.summary-item', 
                '.stat-box', '.clickable-input', '.stat-confirm-bar'
            ];
            if (forbidden.some(sel => e.target.closest(sel))) return;
            this.toggleHUD();
        }, { signal: this.signal });

        DeochUtils.addEvent(DeochUtils.qs('.hud-menu-btn', hud), 'click', (e) => {
            e.stopPropagation();
            this.toggleHUD();
        }, { signal: this.signal });

        this.initHUDEXP();
        this.initHUDAvatar();
        this.initHUDLongPress();
        this.initThemeSwitcher();
    },

    initThemeSwitcher() {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            }, { signal: this.signal });
        }
    },

    toggleHUD(force) {
        const hud = document.getElementById('top-mobile-hud');
        if (!hud) return;

        const isExpanded = force !== undefined ? !!force : !hud.classList.contains('expanded');
        hud.classList.toggle('expanded', isExpanded);
        document.body.classList.toggle('hud-expanded', isExpanded);

        const icon = document.getElementById('hud-expand-icon');
        if (icon) icon.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';

        if (!isExpanded) hud.querySelectorAll('details').forEach(d => d.open = false);

        if (ProgressionManager) ProgressionManager.updateStatIndicators();
        DeochUtils.queueIconRefresh();
    },

    initHUDEXP() {
        const expBox = document.getElementById('test-hud-exp-trigger');
        if (expBox) {
            expBox.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('experience-modal');
                if (modal?.showModal) {
                    this.updateExperienceModalContent();
                    modal.showModal();
                    setTimeout(() => document.getElementById('test-add-exp-input')?.focus(), 150);
                }
            }, { signal: this.signal });
        }

        const expInput = document.getElementById('test-exp-input');
        if (expInput) {
            const sync = () => {
                if (ProgressionManager) ProgressionManager.updateLevelFromExp();
                this.updateExperienceModalContent();
            };
            DeochUtils.addEvent(expInput, 'input', sync, { signal: this.signal });
            DeochUtils.addEvent(expInput, 'change', sync, { signal: this.signal });
        }

        const plus = document.getElementById('test-exp-plus');
        const minus = document.getElementById('test-exp-minus');
        if (plus) plus.addEventListener('click', (e) => this.handleExpStep(e, 1), { signal: this.signal });
        if (minus) minus.addEventListener('click', (e) => this.handleExpStep(e, -1), { signal: this.signal });
    },

    updateExperienceModalContent() {
        const exp = DeochUtils.getInt('test-exp-input', 0);
        const modalExpDisplay = document.getElementById('modal-exp-display');
        if (modalExpDisplay) modalExpDisplay.textContent = exp;

        const nextText = document.getElementById('modal-next-level-text');
        if (nextText && ProgressionManager) {
            const info = ProgressionManager.getLevelDisplayInfo(exp);
            if (info.isMaxLevel) {
                nextText.textContent = 'Maximum Level Reached';
            } else {
                nextText.textContent = `${info.expNeeded} Experience Needed for Next Level`;
            }

            const modalSpendBtn = document.getElementById('modal-spend-btn');
            if (modalSpendBtn) {
                modalSpendBtn.style.display = info.isMastered ? 'flex' : 'none';
            }
        }
    },

    handleExpStep(e, delta) {
        e.stopPropagation();
        const current = DeochUtils.getInt('test-exp-input', 0);
        DeochUtils.smartSet('test-exp-input', Math.max(0, current + delta));
        if (ProgressionManager) ProgressionManager.updateLevelFromExp();
    },

    initHUDAvatar() {
        const container = document.getElementById('test-hud-avatar');
        const upload = document.getElementById('test-avatar-upload');
        if (container && upload) {
            container.addEventListener('click', (e) => { e.stopPropagation(); upload.click(); }, { signal: this.signal });
            upload.addEventListener('change', (e) => this.handleAvatarUpload(e), { signal: this.signal });
        }
    },

    handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        if (AvatarManager) {
            AvatarManager.open(file, (croppedDataUrl) => {
                this.updateAvatarDisplay(croppedDataUrl);
                if (DataManager) DataManager.saveCharacter();
            });
        }
        e.target.value = '';
    },

    updateAvatarDisplay(dataUrl) {
        const img = document.getElementById('test-hud-avatar-img');
        const icon = document.getElementById('test-hud-avatar-icon');
        if (img && icon) {
            img.style.display = '';
            icon.style.display = '';

            if (dataUrl) {
                img.src = dataUrl;
                img.classList.remove('hidden');
                icon.classList.add('hidden');
            } else {
                img.src = '';
                img.classList.add('hidden');
                icon.classList.remove('hidden');
            }
        }
    },

    updateHUDLevelDisplay(exp) {
        if (!ProgressionManager) return;
        const info = ProgressionManager.getLevelDisplayInfo(exp);

        DeochUtils.setText('test-hud-exp-display', `EXP: ${exp}`);
        DeochUtils.setText('test-exp-value-display', exp);
        DeochUtils.smartSet('test-exp-input', exp);
        DeochUtils.smartSet('char-exp', exp);
        DeochUtils.setText('test-hud-level', info.isMulticlass ? info.totalLevel : info.displayLevel);
        DeochUtils.setText('test-hud-level-text', `Level ${info.primaryLevel}`);
        DeochUtils.setText('test-mobile-level', info.levelText);

        const secLine = document.getElementById('test-hud-secondary-line');
        if (secLine) {
            secLine.style.display = info.isMulticlass ? 'flex' : 'none';
            if (info.isMulticlass) DeochUtils.setText('test-hud-secondary-level-text', `Level ${info.secondaryLevel}`);
        }

        const nextText = document.getElementById('test-hud-next-level-text');
        if (nextText) {
            if (info.isMaxLevel) {
                nextText.style.display = 'none';
            } else {
                nextText.style.display = 'block';
                nextText.textContent = `${info.expNeeded} Experience Needed`;
            }
        }

        const spendBtn = document.getElementById('spend-btn');
        if (spendBtn) {
            spendBtn.style.display = info.isMastered ? 'flex' : 'none';
        }

        this.updateExperienceModalContent();
    },

    updateEXPRing(exp) {
        const fill = document.getElementById('test-hud-exp-ring-fill');
        const dot = document.getElementById('test-hud-exp-dot');
        if (!fill || !ProgressionManager) return;

        const info = ProgressionManager.getLevelDisplayInfo(exp);
        const progress = info.progress;
        const isMaster = info.isMaxLevel;

        const gradient = isMaster ? 'url(#exp-mastery-gradient)' : 'url(#exp-fill-gradient)';
        fill.setAttribute('stroke', gradient);
        fill.style.stroke = gradient;

        const circ = 2 * Math.PI * 17.2;
        fill.setAttribute('stroke-dasharray', `${progress * circ}, ${circ}`);

        if (dot) {
            const angle = (progress * 2 * Math.PI) - (Math.PI / 2);
            dot.setAttribute('cx', 18 + 17.2 * Math.cos(angle));
            dot.setAttribute('cy', 18 + 17.2 * Math.sin(angle));
            dot.style.opacity = (progress > 0 && !isMaster) ? 1 : 0;
        }
    },

    // --- Interaction Router ---

    initGlobalListeners() {
        document.addEventListener('click', (e) => this.handleGlobalClick(e), { signal: this.signal });
    },

    handleGlobalClick(e) {
        const target = e.target;

        const nav = target.closest('[data-nav]');
        if (nav) {
            e.preventDefault();
            this.navigateTo(nav.getAttribute('data-nav'));
            return;
        }

        const action = target.closest('[data-action]');
        if (action) {
            this.handleDataAction(action.getAttribute('data-action'), e, action);
            return;
        }

        const tab = target.closest('.test-tab-btn');
        if (tab) {
            this.handleTabSwitch(tab);
            return;
        }

        const expandableCard = target.closest('.expandable-card');
        if (expandableCard && !target.closest('a, button, input, select')) {
            e.preventDefault();
            this.toggleExpandableCard(expandableCard);
            return;
        }

        const idBtn = target.closest('button[id], summary[id]');
        if (idBtn) this.handleIdAction(idBtn.id, e, idBtn);
    },

    handleDataAction(action, e, target) {
        switch (action) {
            case 'scroll-top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
            case 'close-celebration': if (ProgressionManager) ProgressionManager.closeCelebration(); break;
            case 'update-max-stat': if (VitalsManager) VitalsManager.updateMaxStat(target.getAttribute('data-stat')); break;
        }
    },

    handleIdAction(id, e, btn) {
        const handleSpend = () => {
            e.stopPropagation();
            document.getElementById('experience-modal')?.close();
            if (ProgressionManager) ProgressionManager.triggerMasteryCelebration();
        };

        const actions = {
            'test-save-btn': () => DeochUtils.saveCharacter(),
            'test-new-btn': () => DeochUtils.newHero(),
            'test-export-btn': () => { if (DataManager) DataManager.exportCharacter(); },
            'test-theme-btn': () => this.cycleTheme(),
            'spend-btn': handleSpend,
            'modal-spend-btn': handleSpend,
            'test-confirm-stats': () => { e.stopPropagation(); if (ProgressionManager) ProgressionManager.confirmStatAllocation(); },
            'test-deny-stats': () => { e.stopPropagation(); if (ProgressionManager) ProgressionManager.denyStatAllocation(); },
            'test-gallery-btn': () => document.getElementById('character-gallery-dialog')?.showModal(),
            'test-import-btn-popup': () => {
                const modal = document.getElementById('test-import-export-modal');
                if (modal?.showModal) {
                    modal.showModal();
                    const menu = document.querySelector('.management-menu');
                    if (menu) menu.open = false;
                }
            },
            'test-import-btn': () => { if (DataManager) DataManager.importFromTextarea(); },
            'test-copy-btn': () => { if (DataManager) DataManager.copyCharacterCode(); },
            'test-file-import-btn': () => document.getElementById('test-import-input')?.click()
        };
        if (actions[id]) {
            if (btn.tagName === 'BUTTON') e.preventDefault();
            actions[id]();
        }
    },

    handleTabSwitch(btn) {
        const target = btn.dataset.tab;
        const container = btn.closest('#test-tabs-card') || document.body;
        container.querySelectorAll('.test-tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.test-tab-pane').forEach(p => p.style.display = 'none');
        btn.classList.add('active');
        const pane = document.getElementById(target);
        if (pane) pane.style.display = 'block';
        DeochUtils.queueIconRefresh();
    },

    cycleTheme() {
        const themes = UpkeepData.THEMES || ['sandstorm'];
        const current = document.documentElement.getAttribute('data-theme') || 'sandstorm';
        let idx = (themes.indexOf(current) + 1) % themes.length;
        this.applyTheme(themes[idx]);
    },

    initManagementEvents() {
        const settingsBtn = document.getElementById('test-settings-btn');
        const managementMenu = settingsBtn?.closest('.management-menu');
        const importExportModal = document.getElementById('test-import-export-modal');
        const importExportCloseBtn = document.getElementById('test-import-export-close');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsBtn.classList.remove('btn-clicked-spin');
                settingsBtn.getBoundingClientRect();
                settingsBtn.classList.add('btn-clicked-spin');
            }, { signal: this.signal });

            document.addEventListener('click', (e) => {
                if (managementMenu?.open && !managementMenu.contains(e.target) && document.body.contains(e.target)) {
                    managementMenu.open = false;
                }
            }, { signal: this.signal });
        }

        if (importExportCloseBtn && importExportModal) {
            importExportCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                importExportModal.close();
            }, { signal: this.signal });
        }

        this.initDeleteHold();
    },

    initDeleteHold() {
        const deleteBtn = document.getElementById('test-delete-btn');
        if (!deleteBtn) return;

        let deleteTimer = null;
        const startHold = (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (e.cancelable) e.preventDefault();
            deleteBtn.classList.add('holding');
            deleteTimer = setTimeout(() => {
                deleteBtn.classList.remove('holding');
                if (DataManager) {
                    DataManager.deleteCharacter(true);
                    const settingsBtn = document.getElementById('test-settings-btn');
                    const managementMenu = settingsBtn?.closest('.management-menu');
                    if (managementMenu) managementMenu.open = false;
                }
            }, 1750);
        };

        const cancelHold = () => {
            deleteBtn.classList.remove('holding');
            if (deleteTimer) { clearTimeout(deleteTimer); deleteTimer = null; }
        };

        deleteBtn.addEventListener('mousedown', startHold, { signal: this.signal });
        deleteBtn.addEventListener('touchstart', startHold, { passive: false, signal: this.signal });
        window.addEventListener('mouseup', cancelHold, { signal: this.signal });
        window.addEventListener('touchend', cancelHold, { signal: this.signal });
        deleteBtn.addEventListener('mouseleave', cancelHold, { signal: this.signal });
        deleteBtn.addEventListener('contextmenu', (e) => e.preventDefault(), { signal: this.signal });
    },

    applyTheme(theme) {
        if (window.applyThemeVisuals) window.applyThemeVisuals(theme);
        else document.documentElement.setAttribute('data-theme', theme);

        if (DataManager) DataManager.set(DataManager.KEYS.THEME, theme);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = theme;
    },

    closeImportExportModal() {
        const dialog = document.getElementById('test-import-export-modal');
        if (dialog && typeof dialog.close === 'function') dialog.close();
    },

    initHUDLongPress() {
        const selectors = ['.hp-group .orb-touch-zone', '.mp-group .orb-touch-zone', '.sp-group .orb-touch-zone'];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            let timer;
            const start = (_e) => {
                let stat = 'stamina';
                if (el.closest('.hp-group')) stat = 'hp';
                else if (el.closest('.mp-group')) stat = 'mana';
                timer = setTimeout(() => {
                    if (stat === 'stamina') {
                        DataManager.activeCharacter.currentSp = DataManager.activeCharacter.maxSp;
                        if (VitalsManager) VitalsManager.adjust('stamina', 0);
                    } else {
                        this.showBulkModal(stat);
                    }
                    if (navigator.vibrate) navigator.vibrate(50);
                }, 600);
            };
            const end = () => clearTimeout(timer);
            el.addEventListener('pointerdown', start, { signal: this.signal });
            el.addEventListener('pointerup', end, { signal: this.signal });
            el.addEventListener('pointerleave', end, { signal: this.signal });
        });
    },

    initBulkModal() {
        const modal = document.getElementById('bulk-adjustment-modal');
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideBulkModal();
        }, { signal: this.signal });

        const addBtn = modal.querySelector('#bulk-add-btn');
        const subBtn = modal.querySelector('#bulk-sub-btn');
        const tempBtn = modal.querySelector('#bulk-temp-btn');
        const input = modal.querySelector('#bulk-custom-val');

        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyBulkAdjustment(1);
            }, { signal: this.signal });
        }
        if (subBtn) {
            subBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyBulkAdjustment(-1);
            }, { signal: this.signal });
        }
        if (tempBtn) {
            tempBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = Math.abs(parseInt(input.value)) || 0;
                if (val !== 0 && VitalsManager) VitalsManager.adjust('temp-hp', val);
                this.hideBulkModal();
            }, { signal: this.signal });
        }
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyBulkAdjustment(null);
            }, { signal: this.signal });
        }
    },

    showBulkModal(stat) {
        this.currentBulkStat = stat;
        const modal = document.getElementById('bulk-adjustment-modal');
        if (!modal) return;

        const title = modal.querySelector('#bulk-title');
        const content = modal.querySelector('.bulk-adjustment-content');
        const tempBtn = modal.querySelector('#bulk-temp-btn');
        const input = modal.querySelector('#bulk-custom-val');

        if (title) {
            let label = 'ADJUST HEALTH';
            let color = '#ef4444';
            if (stat === 'mana') { label = 'ADJUST MANA'; color = '#3b82f6'; }
            if (stat === 'stamina') { label = 'ADJUST STAMINA'; color = '#fbbf24'; }
            title.textContent = label;
            title.style.color = color;
        }

        if (content) {
            let borderColor = '#ef4444';
            if (stat === 'mana') borderColor = '#3b82f6';
            if (stat === 'stamina') borderColor = '#fbbf24';
            content.style.borderColor = borderColor;
        }

        if (tempBtn) tempBtn.style.display = (stat === 'hp') ? 'flex' : 'none';
        if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }

        modal.classList.add('active');
    },

    hideBulkModal() {
        const modal = document.getElementById('bulk-adjustment-modal');
        if (modal) modal.classList.remove('active');
    },

    applyBulkAdjustment(multiplier) {
        const input = document.getElementById('bulk-custom-val');
        if (!input) return;

        let val = parseInt(input.value) || 0;
        const rawValue = input.value.trim();

        if (multiplier === null) {
            const hasSign = rawValue.startsWith('+') || rawValue.startsWith('-');
            if (!hasSign) val = -Math.abs(val);
        } else {
            val = Math.abs(val) * multiplier;
        }

        if (val !== 0 && VitalsManager) VitalsManager.adjust(this.currentBulkStat, val);
        this.hideBulkModal();
    },



    cleanup() {
        if (this.splashTimeout) clearTimeout(this.splashTimeout);
        this.initialized = false;
        console.log('InterfaceManager: Cleanup called');
    },

    toggleExpandableCard(card) { card.classList.toggle('expanded'); },

    // --- Gallery Rendering ---

    renderGallery(dataManager) {
        const characters = dataManager.getCharacters();

        const galleryContainer = document.getElementById('test-gallery-grid');
        if (galleryContainer) {
            galleryContainer.innerHTML = '';
            characters.forEach(char => {
                const card = DeochUtils.renderGalleryCard(char, { activeId: dataManager.activeCharId });
                card.addEventListener('click', () => {
                    dataManager.loadCharacter(char.id);
                    document.getElementById('character-gallery-dialog')?.close();
                }, { signal: this.signal });
                galleryContainer.appendChild(card);
            });

            const newCard = DeochUtils.renderGalleryCard(null, { isNew: true });
            newCard.addEventListener('click', () => {
                dataManager.newCharacter();
                document.getElementById('character-gallery-dialog')?.close();
            }, { signal: this.signal });
            galleryContainer.appendChild(newCard);
        }

        const galleryList = document.getElementById('test-gallery-list');
        if (galleryList) {
            galleryList.innerHTML = '';
            if (characters.length === 0) {
                galleryList.innerHTML = '<p class="gallery-empty-msg">No test characters saved.</p>';
            } else {
                characters.forEach(char => {
                    const btn = DeochUtils.renderGalleryCard(char, { activeId: dataManager.activeCharId, variant: 'glass' });
                    btn.className = 'glass-btn gallery-list-btn';
                    if (char.id === dataManager.activeCharId) btn.classList.add('gallery-list-btn--active');
                    btn.addEventListener('click', () => dataManager.loadCharacter(char.id), { signal: this.signal });
                    galleryList.appendChild(btn);
                });
            }
        }
        DeochUtils.queueIconRefresh();
    }
};
