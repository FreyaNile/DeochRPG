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
        this.renderRestoration();

        // 2. Initialize UI modules
        this.initNavigation();
        this.initHUD();
        this.initBulkModal();
        this.initManagementEvents();
        this.initGlobalListeners();
        this.initLoreEvents();
        this.initNewsletterForm();
        this.initShowcaseTabs();

        const activeTabBtn = document.getElementById('test-tab-nav')?.querySelector('.test-tab-btn.active');
        if (activeTabBtn && activeTabBtn.getAttribute('data-tab') === 'test-tab-lore') {
            document.body.classList.add('lore-tab-active');
        }

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
        if (inputId) {
            const el = document.getElementById(inputId);
            if (el) el.value = value;
        }

        const hudId = hudMap[key];
        if (!hudId) return;

        const el = document.getElementById(hudId);
        if (!el) return;

        if (key === 'level') {
            el.innerHTML = `Level <span class="hud-level-val">${value}</span>`;
            const hiddenLevel = document.getElementById('test-hud-level');
            if (hiddenLevel) hiddenLevel.textContent = value;
            return;
        }

        if (key === 'exp') {
            el.textContent = value;
            const expInput = document.getElementById('test-exp-input');
            if (!expInput) return;
            if (expInput.tagName === 'INPUT') {
                expInput.value = value;
            } else {
                expInput.textContent = value;
            }
            return;
        }

        el.textContent = value;
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
            theme: document.documentElement.getAttribute('data-theme') || 'hybrasyl',
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
            healingDice: parseInt(document.getElementById('char-healing-dice')?.value, 10) || 0,
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
                        stat: item.getAttribute('data-action-stat') || '',
                        dice: item.getAttribute('data-action-dice') || ''
                    });
                });
                return list;
            })(),
            lore: (() => {
                const list = [];
                const items = document.querySelectorAll('#test-lore-list .lore-item');
                items.forEach(item => {
                    list.push(item.getAttribute('data-lore-text'));
                });
                return list;
            })(),
            equipment: window.Deoch.EquipmentManager ? window.Deoch.EquipmentManager.gatherData() : null
        };
    },

    resetSheetToDefaults() {
        DeochUtils.setText('test-hud-name', 'Unknown Hero');
        DeochUtils.setText('test-hud-detail-renown', 'Renown 1');
        DeochUtils.setText('test-hud-detail-race', 'Human');
        DeochUtils.setText('test-hud-detail-age', '20');
        DeochUtils.setText('test-hud-detail-speed', '30ft');
        DeochUtils.setText('test-hud-detail-size', 'Medium');

        this.resetCustomActions();

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

        if (window.Deoch && window.Deoch.EquipmentManager) {
            window.Deoch.EquipmentManager.resetToDefaults();
        }

        this.updateAvatarDisplay(null);
        this.resetVitals();
        this.resetClasses();
        this.resetLore();

        DeochUtils.smartSet('test-exp-input', 20);
        const savedTheme = DeochUtils.Storage.get('deoch-theme-preference') || 'hybrasyl';
        this.applyTheme(savedTheme);

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

    resetVitals() {
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

        const healingDiceInput = document.getElementById('char-healing-dice');
        const diceBadge = document.getElementById('healing-dice-badge');
        if (healingDiceInput) healingDiceInput.value = 1;
        if (diceBadge) diceBadge.textContent = 1;
    },

    resetClasses() {
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
    },

    resetCustomActions() {
        const actionsList = document.getElementById('test-actions-list');
        if (actionsList) {
            actionsList.innerHTML = '';
            const defaultUnarmed = DeochUtils.createCustomActionItem('Unarmed Attack', 0, 'hand', 'str', '');
            actionsList.appendChild(defaultUnarmed);
            DeochUtils.queueIconRefresh(actionsList);
        }
    },

    resetLore() {
        const loreList = document.getElementById('test-lore-list');
        if (loreList) loreList.innerHTML = '';
        this.updateLoreEmptyState();
        const newLoreInput = document.getElementById('new-lore-input');
        if (newLoreInput) newLoreInput.value = '';
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
            const target = window.location.hash.substring(1) || 'home';
            this.navigateTo(target, true);
        } else {
            this.navigateTo('home', true);
        }
    },

    initShowcaseTabs() {
        const containers = document.querySelectorAll('.class-showcase-container');
        containers.forEach(container => {
            container.addEventListener('click', (e) => {
                const tab = e.target.closest('.class-showcase-tab');
                if (!tab) return;

                const targetTab = tab.getAttribute('data-showcase-tab');
                const tabs = container.querySelectorAll('.class-showcase-tab');
                const panels = container.querySelectorAll('.class-showcase-panel');

                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const targetPanel = container.querySelector(`#showcase-${targetTab}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            }, { signal: this.signal });
        });
    },

    handleHashChange() {
        let target = window.location.hash.substring(1) || 'home';
        this.navigateTo(target);
    },

    navigateTo(targetId, isInit = false) {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.page-section');
        const btn = Array.from(navButtons).find(b => b.getAttribute('data-target') === targetId);

        navButtons.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        if (btn) btn.classList.add('active');
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');

        document.body.classList.toggle('on-test-page', targetId === 'play');

        if (targetId === 'play') {
            if (typeof window.ensureTestPageInitialized === 'function') window.ensureTestPageInitialized();
            this.handleTestPageEntry();
            if (VitalsManager && typeof VitalsManager.startOrbSync === 'function') {
                VitalsManager.startOrbSync();
            }
        } else {
            document.body.classList.remove('tour-active');
            const splash = document.getElementById('char-sheet-splash');
            if (splash) splash.style.display = 'none';
            this.clearSplashTransparency();
        }

        const tour = document.getElementById('creation-tour');
        if (targetId !== 'play' && tour) tour.style.display = 'none';

        if (!isInit) {
            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
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
            const forceNew = DataManager && DataManager.pendingNewCharacter;
            if (DataManager) DataManager.pendingNewCharacter = false;

            if (forceNew || !hasChar) {
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
            '.global-header', '.site-footer', '#toggle-dice-tray-btn',
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

        let startedInForbidden = false;

        DeochUtils.addEvent('top-mobile-hud', 'pointerdown', (e) => {
            const forbidden = [
                'button', 'input', 'select', 'svg', 'summary', 'details',
                '.inspiration-toggle', '.hud-avatar', '.summary-item',
                '.stat-box', '.clickable-input', '.stat-confirm-bar',
                '.hud-combat-pill'
            ];
            startedInForbidden = forbidden.some(sel => e.target.closest(sel));
        }, { signal: this.signal });

        DeochUtils.addEvent('top-mobile-hud', 'click', (e) => {
            if (startedInForbidden) {
                startedInForbidden = false;
                return;
            }
            const forbidden = [
                'button', 'input', 'select', 'svg', 'summary', 'details',
                '.inspiration-toggle', '.hud-avatar', '.summary-item',
                '.stat-box', '.clickable-input', '.stat-confirm-bar',
                '.hud-combat-pill'
            ];
            if (forbidden.some(sel => e.target.closest(sel))) return;
            this.toggleHUD();
        }, { signal: this.signal });

        DeochUtils.addEvent(DeochUtils.qs('.hud-menu-btn', hud), 'click', (e) => {
            e.stopPropagation();
            this.toggleHUD();
        }, { signal: this.signal });

        DeochUtils.addEvent(document, 'pointerdown', (e) => {
            if (hud.classList.contains('expanded') && !hud.contains(e.target)) {
                if (e.target.closest('#dice-tray-widget, #combat-log-widget, #toggle-dice-tray-btn, .combat-utilities-wrapper')) {
                    return;
                }
                this.toggleHUD(false);
            }
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
    },

    initHUDEXP() {
        const expBox = document.getElementById('test-exp-modal-trigger');
        if (expBox) {
            expBox.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('experience-modal');
                if (modal?.showModal) {
                    modal.showModal();
                    requestAnimationFrame(() => {
                        this.updateExperienceModalContent();
                    });
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

    initHUDAvatar() {
        const changePicBtn = document.getElementById('test-change-picture-btn');
        const upload = document.getElementById('test-avatar-upload');
        if (changePicBtn && upload) {
            changePicBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                upload.click();
                const menu = changePicBtn.closest('.management-menu');
                if (menu) menu.open = false;
            }, { signal: this.signal });
            upload.addEventListener('change', (e) => this.handleAvatarUpload(e), { signal: this.signal });
        }

        const avatar = document.getElementById('test-hud-avatar');
        const inspiration = document.getElementById('test-hud-inspiration');
        if (avatar && inspiration) {
            avatar.addEventListener('click', (e) => {
                e.stopPropagation();
                inspiration.checked = !inspiration.checked;
                inspiration.dispatchEvent(new Event('change', { bubbles: true }));
            }, { signal: this.signal });
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
        const primaryLevelEl = document.getElementById('test-hud-level-text');
        if (primaryLevelEl) {
            primaryLevelEl.innerHTML = `<span class="hud-level-val">${info.primaryLevel}</span>`;
        }
        DeochUtils.setText('test-mobile-level', info.levelText);

        const primaryLine = document.getElementById('test-hud-primary-line');
        const secLine = document.getElementById('test-hud-secondary-line');
        const multiLine = document.getElementById('test-hud-multiclass-line');

        this.setHUDLinesVisibility(info, primaryLine, secLine, multiLine);

        const nextText = document.getElementById('test-hud-next-level-text');
        this.setHUDNextLevelText(info, nextText);

        this.updateExperienceModalContent();
    },

    getHUDClass(inputId, displayId, fallback) {
        const input = document.getElementById(inputId);
        if (input && input.value) return input.value;
        const display = document.getElementById(displayId);
        if (display && display.textContent) return display.textContent;
        return fallback;
    },

    setHUDLinesVisibility(info, primaryLine, secLine, multiLine) {
        if (info.isMulticlass) {
            if (primaryLine) primaryLine.style.display = 'none';
            if (secLine) secLine.style.display = 'none';
            
            const primaryClass = this.getHUDClass('char-class', 'test-hud-class-text', 'Human');
            const secondaryClass = this.getHUDClass('char-class-2', 'test-hud-secondary-class-visible', '');
            
            if (multiLine) {
                multiLine.style.display = 'flex';
                multiLine.innerHTML = `${primaryClass} <span class="hud-level-val">${info.primaryLevel}</span> <span class="hud-multiclass-sep">❖</span> ${secondaryClass} <span class="hud-level-val">${info.secondaryLevel}</span>`;
            }
        } else {
            if (primaryLine) primaryLine.style.display = 'flex';
            if (secLine) secLine.style.display = 'none';
            if (multiLine) multiLine.style.display = 'none';
        }
    },

    setHUDNextLevelText(info, nextText) {
        if (!nextText) return;
        if (info.isMaxLevel) {
            nextText.style.display = 'none';
        } else {
            nextText.style.display = 'block';
            nextText.textContent = `${info.expNeeded} Experience Needed`;
        }
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
        document.addEventListener('contextmenu', (e) => {
            const isMobileTablet = window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            if (isMobileTablet || e.target.closest('.action-item, .orb-touch-zone')) {
                e.preventDefault();
            }
        }, { signal: this.signal });
    },

    handleGlobalClick(e) {
        const target = e.target;

        const nav = target.closest('[data-nav]');
        if (nav) {
            e.preventDefault();
            this.navigateTo(nav.getAttribute('data-nav'));
            const action = nav.getAttribute('data-action');
            if (action) {
                this.handleDataAction(action, e, nav);
            }
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
            case 'reset-tour':
                if (DataManager) {
                    DataManager.pendingNewCharacter = true;
                }
                break;
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
            'test-export-btn': () => { if (DataManager) DataManager.exportCharacter(); },
            'test-theme-btn': () => {
                this.cycleTheme();
            },
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
            'privacy-toggle-btn': () => {
                document.getElementById('privacy-content')?.classList.toggle('open');
            },
            'contact-toggle-btn': () => {
                document.getElementById('contact-content')?.classList.toggle('open');
            }
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
        container.querySelectorAll('.test-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById(target);
        if (pane) pane.classList.add('active');

        if (target === 'test-tab-lore') {
            document.body.classList.add('lore-tab-active');
        } else {
            document.body.classList.remove('lore-tab-active');
        }

        if (pane) {
            DeochUtils.queueIconRefresh(pane);
        }
    },

    cycleTheme() {
        const themes = UpkeepData.THEMES || ['hybrasyl'];
        const current = document.documentElement.getAttribute('data-theme') || 'hybrasyl';
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
                DeochUtils.restartAnimation(settingsBtn, 'btn-clicked-spin');
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

        if (window.hudStaminaOrbShader && typeof window.hudStaminaOrbShader.updateThemeColors === 'function') {
            window.hudStaminaOrbShader.updateThemeColors();
        }
    },

    closeImportExportModal() {
        const dialog = document.getElementById('test-import-export-modal');
        if (dialog && typeof dialog.close === 'function') dialog.close();
    },

    initHUDLongPress() {
        const selectors = ['.hp-group .orb-touch-zone', '.mp-group .orb-touch-zone', '.sp-group .orb-touch-zone'];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            let timer;
            let stat = 'stamina';
            if (el.closest('.hp-group')) stat = 'hp';
            else if (el.closest('.mp-group')) stat = 'mana';

            const triggerAction = () => {
                if (stat === 'stamina') {
                    DataManager.activeCharacter.currentSp = DataManager.activeCharacter.maxSp;
                    if (VitalsManager) VitalsManager.adjust('stamina', 0);
                } else {
                    this.showBulkModal(stat);
                }
                if (navigator.vibrate) navigator.vibrate(50);
            };

            let lastTouchTriggerTime = 0;

            const startTouch = () => {
                timer = setTimeout(() => {
                    lastTouchTriggerTime = Date.now();
                    triggerAction();
                }, 600);
            };

            const endTouch = () => {
                clearTimeout(timer);
            };

            el.addEventListener('touchstart', startTouch, { signal: this.signal, passive: true });
            el.addEventListener('touchend', endTouch, { signal: this.signal, passive: true });
            el.addEventListener('touchcancel', endTouch, { signal: this.signal, passive: true });
            el.addEventListener('touchmove', endTouch, { signal: this.signal, passive: true });

            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const timeSinceTouchTrigger = Date.now() - lastTouchTriggerTime;
                if (timeSinceTouchTrigger > 800) {
                    triggerAction();
                }
            }, { signal: this.signal });
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
            let color = 'var(--color-danger)';
            if (stat === 'mana') { label = 'ADJUST MANA'; color = 'var(--color-mental)'; }
            if (stat === 'stamina') { label = 'ADJUST STAMINA'; color = 'var(--color-stamina)'; }
            title.textContent = label;
            title.style.color = color;
        }

        if (content) {
            let borderColor = 'var(--color-danger)';
            if (stat === 'mana') borderColor = 'var(--color-mental)';
            if (stat === 'stamina') borderColor = 'var(--color-stamina)';
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

        if (val !== 0 && VitalsManager) VitalsManager.adjust(this.currentBulkStat, val, 'bulk');
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
        if (galleryContainer) DeochUtils.queueIconRefresh(galleryContainer);
        if (galleryList) DeochUtils.queueIconRefresh(galleryList);
    },

    initLoreEvents() {
        const addLoreBtn = document.getElementById('add-lore-btn');
        const newLoreInput = document.getElementById('new-lore-input');
        if (addLoreBtn && newLoreInput) {
            addLoreBtn.addEventListener('click', () => {
                const text = newLoreInput.value.trim();
                if (text) {
                    const loreList = document.getElementById('test-lore-list');
                    if (loreList) {
                        const item = this.createLoreItem(text);
                        loreList.appendChild(item);
                        newLoreInput.value = '';
                        this.updateLoreEmptyState();
                        DeochUtils.queueIconRefresh(item);
                        if (DataManager) DataManager.saveCharacter();
                    }
                }
            }, { signal: this.signal });
        }

        const loreList = document.getElementById('test-lore-list');
        if (loreList) {
            loreList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-lore-btn');
                if (deleteBtn) {
                    const item = deleteBtn.closest('.lore-item');
                    if (item) {
                        item.remove();
                        this.updateLoreEmptyState();
                        if (DataManager) DataManager.saveCharacter();
                    }
                }
            }, { signal: this.signal });
        }
    },

    createLoreItem(text) {
        const item = document.createElement('div');
        item.className = 'lore-item glass-panel-premium u-p-md u-flex-between u-align-start u-gap-1 u-border-radius-md u-mb-0-5';
        item.setAttribute('data-lore-text', text);
        item.innerHTML = `
            <div class="u-font-size-xl u-text-white u-line-height-1-4" style="text-align: left; flex: 1; overflow-wrap: anywhere;">
                ${DeochUtils.escapeHtml(text)}
            </div>
            <button type="button" class="delete-lore-btn u-btn-reset u-text-danger u-opacity-0-6 u-transition-smooth" style="cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        return item;
    },

    initNewsletterForm() {
        const form = document.getElementById('newsletter-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('newsletter-email');
            const statusMessage = document.getElementById('newsletter-status');
            if (!emailInput) return;

            const email = emailInput.value;
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : 'Subscribe';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Subscribing...';
            }

            try {
                const response = await fetch('https://formsubmit.co/ajax/freyanile1@gmail.com', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        _subject: 'Deoch Vanguard Newsletter Subscription'
                    })
                });

                if (response.ok) {
                    if (statusMessage) {
                        statusMessage.style.display = 'block';
                        statusMessage.textContent = 'Success! You\'ve joined the mailing list.';
                        statusMessage.style.color = '#34d399';
                    }
                    emailInput.value = '';
                } else {
                    throw new Error('Newsletter submission failed');
                }
            } catch (error) {
                console.error('Newsletter submission error:', error);
                if (statusMessage) {
                    statusMessage.style.display = 'block';
                    statusMessage.textContent = 'Submission failed. Please try again.';
                    statusMessage.style.color = '#f87171';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    },

    updateLoreEmptyState() {
        const loreList = document.getElementById('test-lore-list');
        if (!loreList) return;

        const items = loreList.querySelectorAll('.lore-item');
        const existingPlaceholder = loreList.querySelector('.lore-empty-placeholder');

        if (items.length === 0) {
            if (!existingPlaceholder) {
                const placeholder = document.createElement('div');
                placeholder.className = 'lore-empty-placeholder u-p-1 u-text-center u-opacity-0-4 u-font-size-sm u-text-secondary';
                placeholder.innerHTML = `
                    <i data-lucide="scroll" class="u-mb-0-5" style="width: 24px; height: 24px; margin: 0 auto; display: block;"></i>
                    <div>Chronicle is empty. Add lore entries below.</div>
                `;
                loreList.appendChild(placeholder);
            }
        } else {
            if (existingPlaceholder) {
                existingPlaceholder.remove();
            }
        }
    }
};
