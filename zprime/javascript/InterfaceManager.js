import { DeochUtils } from './DeochUtils.js';
import { DataManager } from './DataManager.js';
import { UpkeepData } from './UpkeepData.js';

/**
 * @module InterfaceManager
 * @description Central authority for UI state: Navigation, HUD, Themes, and Custom Selects.
 */
export const InterfaceManager = {
    splashTimeout: null,
    initialized: false,
    wasLongPress: false,

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

    renderConditions() {
        const container = document.getElementById('test-conditions-grid');
        if (!container || !window.ProgressionManager) return;

        const conditions = window.ProgressionManager.CONDITIONS;
        container.innerHTML = conditions.map(c => `
            <label class="condition-item" for="${c.id}" title="${c.name}">
                <input type="checkbox" id="${c.id}" name="${c.key}">
                <span class="circle-toggle"></span> ${c.name}
            </label>
        `).join('');
    },

    renderLanguages() {
        const container = document.getElementById('test-languages-grid');
        if (!container || !window.ProgressionManager) return;

        const languages = window.ProgressionManager.LANGUAGES;
        container.innerHTML = languages.map(l => `
            <div class="language-item">
                <span class="lang-label">${l.name}</span>
                <div class="lang-indicators u-flex-center u-gap-0-75">
                    <label class="icon-toggle lang-indicator-btn" title="Verbal">
                        <input type="checkbox" id="${l.id}-v" name="${l.key}_v" class="lang-checkbox u-hidden">
                        <i data-lucide="speech"></i>
                    </label>
                    <label class="icon-toggle lang-indicator-btn" title="Literacy">
                        <input type="checkbox" id="${l.id}-l" name="${l.key}_l" class="lang-checkbox u-hidden">
                        <i data-lucide="book-open"></i>
                    </label>
                </div>
            </div>
        `).join('');
    },

    renderAttributes() {
        const container = document.getElementById('test-attributes-grid');
        if (!container || !window.ProgressionManager) return;

        const stats = window.ProgressionManager.ATTRIBUTES;
        container.innerHTML = stats.map(s => `
            <div class="attribute-card">
                <div class="attribute-label">
                    <i data-lucide="${s.icon}"></i>
                    <span>${s.name}</span>
                </div>
                <div id="${s.id}-display" class="attribute-value">--</div>
                <div class="attribute-formula">${s.formula}</div>
            </div>
        `).join('');
    },

    renderRestoration() {
        const container = document.getElementById('test-restoration-grid');
        if (!container || !window.ProgressionManager) return;

        const dice = window.ProgressionManager.RESTORATION_DICE;

        // Template logic: We use a class for the result display to avoid duplicate IDs
        const midIndex = Math.floor(dice.length / 2);

        let diceHTML = '';
        dice.forEach((d, i) => {
            diceHTML += `
                <button type="button" class="roll-h-die glass-btn" data-sides="${d.sides}"
                    style="width: 100%; padding: 0.2rem 0; font-size: 0.6rem; border-radius: 4px; color: var(--color-success);">${d.label}</button>
            `;
            if (i === midIndex - 1 || (dice.length === 1 && i === 0)) {
                diceHTML += '<span id="healing-roll-result" class="healing-roll-display" style="display: block; font-size: 1.4rem; font-weight: 800; color: var(--color-success); margin: 0;">--</span>';
            }
        });

        // Fallback if result display wasn't added
        if (!diceHTML.includes('healing-roll-result')) {
            diceHTML = '<span id="healing-roll-result" style="display: block; font-size: 1.4rem; font-weight: 800; color: var(--color-success); margin: 0;">--</span>' + diceHTML;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.4rem; padding: 0.5rem 1rem 1rem 1rem;">
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; opacity: 0.8;">Sleep to use healing dice.</p>
                <div style="display: flex; gap: 0.75rem; align-items: center; margin: 0.5rem 0;">
                    <div style="text-align: center; min-width: 60px; display: flex; flex-direction: column; gap: 0.25rem; align-items: center;">
                        ${diceHTML}
                    </div>
                    <div style="display: flex; flex: 1; gap: 0.4rem;">
                        <button type="button" id="apply-healing-hp" class="secondary-btn"
                            style="background: var(--color-success); border-color: var(--color-success); color: white; padding: 0.5rem; font-size: 0.75rem; flex: 1; height: 38px;">+ HP</button>
                        <button type="button" id="apply-healing-mana" class="secondary-btn"
                            style="background: var(--color-mental); border-color: var(--color-mental); color: white; padding: 0.5rem; font-size: 0.75rem; flex: 1; height: 38px;">+ Mana</button>
                    </div>
                </div>
                <div class="u-flex u-gap-0-5 u-mt-0-5">
                    <button type="button" id="rest-btn"
                        class="primary-btn u-flex-1 u-p-0-6 u-font-size-sm u-bold u-flex-center u-gap-0-5 u-border-radius-md">
                        <i data-lucide="bed" class="u-icon-xs"></i> FULL REST
                    </button>
                </div>
            </div>
        `;
    },


    // --- Navigation & Routing ---

    initNavigation() {
        DeochUtils.addEvent(window, 'hashchange', () => this.handleHashChange(), { signal: this.signal });
        DeochUtils.addEvent('char-sheet-splash', 'click', () => this.transitionSplash(), { signal: this.signal });

        if (window.location.hash) {
            this.handleHashChange();
        } else {
            this.updateSplashWelcome();
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
                if (window.ProgressionManager) window.ProgressionManager.updateLevelFromExp();
            }
        }, 600);
    },

    toggleSplashTransparency(isActive) {
        const selectors = [
            '.global-header',
            '.site-footer',
            '#toggle-dice-btn',
            '.floating-vitality-orbs',
            '#top-mobile-hud',
            '.combat-utilities-wrapper',
            '.tooltip--stat-points',
            '#stat-points-tooltip',
            '#stat-points-indicator'
        ];

        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.classList.toggle('splash-transparent', isActive);
            });
        });
    },

    applySplashTransparency() { this.toggleSplashTransparency(true); },
    clearSplashTransparency() { this.toggleSplashTransparency(false); },

    // --- HUD & Mobile Interaction ---

    initHUD() {
        const hud = document.getElementById('top-mobile-hud');
        if (!hud) return;

        DeochUtils.addEvent('top-mobile-hud', 'click', (e) => {
            const forbidden = [
                'button', 'input', 'select', 'svg', 'summary', 'details',
                '.inspiration-toggle', '.hud-avatar', 
                '.summary-item', '.stat-box', '.clickable-input', 
                '.stat-confirm-bar'
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

        if (window.ProgressionManager) window.ProgressionManager.updateStatIndicators();
        DeochUtils.queueIconRefresh();
    },

    initHUDEXP() {
        const expBox = document.getElementById('test-hud-exp-box-wrapper');
        if (expBox) {
            expBox.addEventListener('click', (e) => {
                const isInputClick = e.target.closest('.clickable-input');

                // Only toggle if the actual box was clicked
                if (!isInputClick) {
                    e.preventDefault();
                    return;
                }

                e.stopPropagation();
                const details = expBox.closest('details');
                if (details && !details.open) {
                    setTimeout(() => document.getElementById('test-add-exp-input')?.focus(), 100);
                }
            }, { signal: this.signal });
        }

        const expInput = document.getElementById('test-exp-input');
        if (expInput) {
            const sync = () => { if (window.ProgressionManager) window.ProgressionManager.updateLevelFromExp(); };
            DeochUtils.addEvent(expInput, 'input', sync, { signal: this.signal });
            DeochUtils.addEvent(expInput, 'change', sync, { signal: this.signal });
        }

        const plus = document.getElementById('test-exp-plus');
        const minus = document.getElementById('test-exp-minus');
        if (plus) plus.addEventListener('click', (e) => this.handleExpStep(e, 1), { signal: this.signal });
        if (minus) minus.addEventListener('click', (e) => this.handleExpStep(e, -1), { signal: this.signal });
    },

    handleExpStep(e, delta) {
        e.stopPropagation();
        const current = DeochUtils.getInt('test-exp-input', 0);
        DeochUtils.smartSet('test-exp-input', Math.max(0, current + delta));
        if (window.ProgressionManager) window.ProgressionManager.updateLevelFromExp();
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
        
        if (window.AvatarManager) {
            window.AvatarManager.open(file, (croppedDataUrl) => {
                this.updateAvatarDisplay(croppedDataUrl);
                // Persistence handled by DataManager via standard save flow
                if (window.DataManager) {
                    window.DataManager.saveCharacter();
                }
            });
        }
        // Reset input to allow re-uploading same file
        e.target.value = '';
    },

    updateAvatarDisplay(dataUrl) {
        const img = document.getElementById('test-hud-avatar-img');
        const icon = document.getElementById('test-hud-avatar-icon');
        if (img && icon) {
            // Clear any inline display styles to ensure classes take priority
            img.style.display = '';
            icon.style.display = '';

            if (dataUrl) {
                img.src = dataUrl;
                img.classList.remove('u-hidden', 'hidden');
                icon.classList.add('u-hidden', 'hidden');
            } else {
                img.src = '';
                img.classList.add('u-hidden', 'hidden');
                icon.classList.remove('u-hidden', 'hidden');
            }
        }
    },

    updateHUDLevelDisplay(exp) {
        if (!window.ProgressionManager) return;

        const info = window.ProgressionManager.getLevelDisplayInfo(exp);

        DeochUtils.setText('test-hud-exp-display', `EXP: ${exp}`);
        DeochUtils.setText('test-exp-value-display', exp);
        DeochUtils.smartSet('test-exp-input', exp);
        DeochUtils.setText('test-hud-level', info.isMulticlass ? info.totalLevel : info.displayLevel);
        DeochUtils.setText('test-hud-level-text', `Level ${info.primaryLevel}`);
        DeochUtils.setText('test-mobile-level', info.levelText);

        const secLine = document.getElementById('test-hud-secondary-line');
        if (secLine) {
            secLine.style.display = info.isMulticlass ? 'flex' : 'none';
            if (info.isMulticlass) {
                DeochUtils.setText('test-hud-secondary-level-text', `Level ${info.secondaryLevel}`);
            }
        }

        const masteryActions = document.getElementById('test-hud-mastery-actions');
        if (masteryActions) masteryActions.style.display = info.isMastered ? 'flex' : 'none';

        const nextText = document.getElementById('test-hud-next-level-text');
        if (nextText) {
            if (info.isMaxLevel) {
                nextText.style.display = 'none';
            } else {
                nextText.style.display = 'block';
                nextText.textContent = `${info.expNeeded} Experience Needed`;
            }
        }
    },

    updateEXPRing(exp) {
        const fill = document.getElementById('test-hud-exp-ring-fill');
        const dot = document.getElementById('test-hud-exp-dot');
        if (!fill || !window.ProgressionManager) return;

        const info = window.ProgressionManager.getLevelDisplayInfo(exp);
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

    // --- Global Interaction Router ---

    initGlobalListeners() {
        document.addEventListener('click', (e) => this.handleGlobalClick(e), { signal: this.signal });
    },

    handleGlobalClick(e) {
        const target = e.target;

        // 1. Navigation Targets
        const nav = target.closest('[data-nav]');
        if (nav) {
            e.preventDefault();
            this.navigateTo(nav.getAttribute('data-nav'));
            return;
        }

        // 2. Action Targets
        const action = target.closest('[data-action]');
        if (action) {
            this.handleDataAction(action.getAttribute('data-action'), e, action);
            return;
        }

        // 3. Tab Buttons
        const tab = target.closest('.test-tab-btn');
        if (tab) {
            this.handleTabSwitch(tab);
            return;
        }

        // 5. Expandable Cards (Classes)
        const expandableCard = target.closest('.expandable-card');
        if (expandableCard && !target.closest('a, button, input, select')) {
            e.preventDefault();
            this.toggleExpandableCard(expandableCard);
            return;
        }

        // 6. ID-based Actions (Buttons/Summaries)
        const idBtn = target.closest('button[id], summary[id]');
        if (idBtn) {
            this.handleIdAction(idBtn.id, e, idBtn);
        }
    },

    handleDataAction(action, e, target) {
        switch (action) {
            case 'scroll-top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
            case 'close-celebration': if (window.ProgressionManager) window.ProgressionManager.closeCelebration(); break;
            case 'update-max-stat': if (window.VitalsManager) window.VitalsManager.updateMaxStat(target.getAttribute('data-stat')); break;
        }
    },

    handleIdAction(id, e, btn) {
        const actions = {
            'test-save-btn': () => { DeochUtils.saveCharacter(); },
            'test-new-btn': () => DeochUtils.newHero(),
            'test-export-btn': () => { if (window.DataManager) window.DataManager.exportCharacter(); },
            // Deletion handled by initDeleteHold (hold for 3s)
            'test-theme-btn': () => this.cycleTheme(),
            'test-hud-spend-exp-btn': () => { e.stopPropagation(); if (window.ProgressionManager) window.ProgressionManager.triggerMasteryCelebration(); },
            'test-confirm-stats': () => { e.stopPropagation(); if (window.ProgressionManager) window.ProgressionManager.confirmStatAllocation(); },
            'test-deny-stats': () => { e.stopPropagation(); if (window.ProgressionManager) window.ProgressionManager.denyStatAllocation(); },
            'test-gallery-btn': () => document.getElementById('character-gallery-dialog')?.showModal(),
            'test-import-btn-popup': () => {
                const modal = document.getElementById('test-import-export-modal');
                if (modal && typeof modal.showModal === 'function') {
                    modal.showModal();
                    const menu = document.querySelector('.management-menu');
                    if (menu) menu.open = false;
                }
            },
            'test-import-btn': () => { if (window.DataManager) window.DataManager.importFromTextarea(); },
            'test-copy-btn': () => { if (window.DataManager) window.DataManager.copyCharacterCode(); },
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
                if (window.navigator?.vibrate) window.navigator.vibrate(5);
            }, { signal: this.signal });

            document.addEventListener('click', (e) => {
                if (managementMenu && managementMenu.open) {
                    // Only close if click is outside AND the target is still in the document
                    // (prevents closing when buttons are removed/re-rendered during selection)
                    if (!managementMenu.contains(e.target) && document.body.contains(e.target)) {
                        managementMenu.open = false;
                    }
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
            // Only left click or touch
            if (e.button !== undefined && e.button !== 0) return;
            
            if (e.cancelable) e.preventDefault();
            deleteBtn.classList.add('holding');
            deleteTimer = setTimeout(() => {
                deleteBtn.classList.remove('holding');
                if (window.DataManager) {
                    window.DataManager.deleteCharacter(true);
                    // Close the menu after deletion
                    const settingsBtn = document.getElementById('test-settings-btn');
                    const managementMenu = settingsBtn?.closest('.management-menu');
                    if (managementMenu) managementMenu.open = false;
                }
            }, 1750);
        };

        const cancelHold = () => {
            deleteBtn.classList.remove('holding');
            if (deleteTimer) {
                clearTimeout(deleteTimer);
                deleteTimer = null;
            }
        };

        deleteBtn.addEventListener('mousedown', startHold, { signal: this.signal });
        deleteBtn.addEventListener('touchstart', startHold, { passive: false, signal: this.signal });
        
        window.addEventListener('mouseup', cancelHold, { signal: this.signal });
        window.addEventListener('touchend', cancelHold, { signal: this.signal });
        deleteBtn.addEventListener('mouseleave', cancelHold, { signal: this.signal });
        
        // Prevent default context menu on long press for mobile
        deleteBtn.addEventListener('contextmenu', (e) => e.preventDefault(), { signal: this.signal });
    },

    applyTheme(theme) {
        if (window.applyThemeVisuals) {
            window.applyThemeVisuals(theme);
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        if (window.DataManager) {
            window.DataManager.set(window.DataManager.KEYS.THEME, theme);
        }

        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = theme;
    },

    // --- Custom Select Utility (from custom-select.js) ---

    initCustomSelect(wrapperId, triggerId, optionsId, selectedTextId, hiddenInputId, onSelect) {
        const wrapper = document.getElementById(wrapperId);
        const trigger = document.getElementById(triggerId);
        const options = document.getElementById(optionsId);
        if (!trigger || !wrapper) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.toggle('open');
            this.updateSelectParentState(wrapper, isOpen);
        }, { signal: this.signal });

        options?.querySelectorAll('.custom-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const val = opt.getAttribute('data-value');
                const txt = document.getElementById(selectedTextId);
                if (txt) txt.textContent = opt.textContent;
                const input = document.getElementById(hiddenInputId);
                if (input) {
                    input.value = val;
                    if (onSelect) onSelect(val);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                wrapper.classList.remove('open');
                this.updateSelectParentState(wrapper, false);
            }, { signal: this.signal });
        });
    },

    updateSelectParentState(wrapper, isOpen) {
        const card = wrapper.closest('.stats-card, .tabs-card');
        if (card) card.classList.toggle('has-open-select', isOpen);
    },

    // --- Long Press Utility ---

    initHUDLongPress() {
        const selectors = ['.hp-group .orb-touch-zone', '.mp-group .orb-touch-zone', '.sp-group .orb-touch-zone'];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            let timer;
            const start = (_e) => {
                let stat = 'stamina';
                if (el.closest('.hp-group')) stat = 'hp';
                else if (el.closest('.mp-group')) stat = 'mana';
                this.wasLongPress = false;
                timer = setTimeout(() => {
                    this.wasLongPress = true;
                    if (stat === 'stamina') {
                        window.mobileTargetSp = window.mobileMaxSp;
                        if (window.VitalsManager) window.VitalsManager.adjust('stamina', 0);
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

        if (addBtn) addBtn.onclick = (e) => { e.stopPropagation(); this.applyBulkAdjustment(1); };
        if (subBtn) subBtn.onclick = (e) => { e.stopPropagation(); this.applyBulkAdjustment(-1); };
        if (tempBtn) {
            tempBtn.onclick = (e) => {
                e.stopPropagation();
                const val = Math.abs(parseInt(input.value)) || 0;
                if (val !== 0 && window.VitalsManager) {
                    window.VitalsManager.adjust('temp-hp', val);
                }
                this.hideBulkModal();
            };
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
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }

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
            // Enter key path: if no sign provided, default to damage (-)
            const hasSign = rawValue.startsWith('+') || rawValue.startsWith('-');
            if (!hasSign) val = -Math.abs(val);
        } else {
            // Button path (+/-): force absolute value multiplied by button's direction
            val = Math.abs(val) * multiplier;
        }

        if (val !== 0 && window.VitalsManager) {
            window.VitalsManager.adjust(this.currentBulkStat, val);
        }
        this.hideBulkModal();
    },

    /**
     * Stub for class selection UI. Currently unimplemented but called by ProgressionManager.
     */
    showClassSelection(_isSecondary = false) {
        // Implementation needed
    },

    cleanup() {
        if (this.splashTimeout) clearTimeout(this.splashTimeout);
        this.initialized = false;
        console.log('InterfaceManager: Cleanup called');
    },

    toggleExpandableCard(card) {
        card.classList.toggle('expanded');
    }
};
