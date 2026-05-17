import { DeochUtils } from './DeochUtils.js';
import { DeochDB } from './DeochDB.js';

/**
 * @module DataManager
 * @description Handles character persistence, saving, loading, and import/export.
 * Centralized manager for all storage interactions and gallery UI within the DEOCH system.
 */
export const DataManager = {
    activeCharId: null,
    isInitializing: false,
    characters: [], // Local cache for sync UI rendering

    /**
     * Centralized storage keys to avoid fracturing and hardcoding.
     */
    KEYS: {
        CHARACTERS: 'deoch-test-sheet-v2',
        CHARACTER_SHEET: 'deoch_character_sheet_data',
        LAST_CHAR_ID: 'test-sheet-last-id',
        THEME: 'deoch-theme-preference',
        STAT_POPUP_DISMISSED: 'deoch_has_interacted_with_stat_popup',
        LEGACY_DATA: 'deoch_character_data',
        LEGACY_GALLERY: 'deoch_character_gallery'
    },

    async init(sheet, signal) {
        this.signal = signal;
        await DeochDB.init();
        await this.migrateLocalStorageToDB();

        // Refresh local cache
        this.characters = await DeochDB.getAll(DeochDB.STORES.CHARACTERS);

        this.initLegacyForm();
        this.migrateLegacyData();
        this.renderGallery();
    },

    getCharacters() {
        return this.characters;
    },

    /**
     * One-time migration from localStorage to IndexedDB.
     */
    async migrateLocalStorageToDB() {
        const legacyGallery = this.getJson(this.KEYS.CHARACTERS, []);
        if (legacyGallery.length > 0) {
            console.log(`DataManager: Migrating ${legacyGallery.length} characters to IndexedDB...`);
            for (const char of legacyGallery) {
                await DeochDB.put(DeochDB.STORES.CHARACTERS, char);
            }
            // Clear localStorage key once successfully migrated
            this.remove(this.KEYS.CHARACTERS);
            console.log('DataManager: Migration complete.');
        }
    },

    generateId() {
        return 'char_' + (crypto.randomUUID?.() ?? (Date.now().toString(36) + DeochUtils.random().toString(36).slice(2)));
    },

    loadLastCharacter() {
        const gallery = this.getCharacters();
        if (gallery.length > 0) {
            const lastId = this.get(this.KEYS.LAST_CHAR_ID);
            const charToLoad = gallery.find(c => c.id === lastId) || gallery[0];
            // loadCharacter is now async, but we don't necessarily need to await it here
            // unless we want to block initialization.
            this.loadCharacter(charToLoad.id);
        }
    },

    // --- Storage Access ---
    get: DeochUtils.Storage.get,
    set: DeochUtils.Storage.set,
    getJson: DeochUtils.Storage.getJson,
    setJson: DeochUtils.Storage.setJson,
    remove: DeochUtils.Storage.remove,
    clear: DeochUtils.Storage.clear,

    // --- High-Level Character Persistence ---
    async saveCharacter() {
        if (window.SUSPEND_SAVING) return;
        if (!this.activeCharId) {
            this.activeCharId = this.generateId();
        }

        const charData = this.gatherCurrentData();

        // Update local cache
        const index = this.characters.findIndex(c => c.id === charData.id);
        if (index !== -1) {
            this.characters[index] = charData;
        } else {
            this.characters.push(charData);
        }

        // Persist to IndexedDB
        await DeochDB.put(DeochDB.STORES.CHARACTERS, charData);

        // Store last active ID in localStorage (small enough to keep there)
        this.set(this.KEYS.LAST_CHAR_ID, charData.id);
        this.activeCharId = charData.id;

        DeochUtils.showFeedback('test-save-btn', 'Saved!');
        this.renderGallery();
    },

    gatherCurrentData() {
        const getFlag = (id) => document.getElementById(id)?.value === 'true';
        const getInputVal = (id, fallback) => document.getElementById(id)?.value || fallback;

        return {
            id: this.activeCharId || this.generateId(),
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
                return (img && !img.classList.contains('u-hidden') && !img.classList.contains('hidden') && img.src) ? img.src : null;
            })(),
            stats: window.ProgressionManager ? window.ProgressionManager.getStats() : {},
            maxHp: parseInt(document.getElementById('char-hp-max')?.value) || 28,
            currentHp: window.mobileTargetHp !== undefined ? window.mobileTargetHp : (parseInt(document.getElementById('char-hp-max')?.value) || 28),
            tempHp: window.mobileTargetTempHp || 0,
            maxMp: parseInt(document.getElementById('char-mana-max')?.value) || 12,
            currentMp: window.mobileTargetMp !== undefined ? window.mobileTargetMp : (parseInt(document.getElementById('char-mana-max')?.value) || 12),
            maxSp: parseInt(document.getElementById('char-stamina-max')?.value) || 10,
            currentSp: window.mobileTargetSp !== undefined ? window.mobileTargetSp : (parseInt(document.getElementById('char-stamina-max')?.value) || 10),
            primaryClass: document.getElementById('char-class')?.value || 'Human',
            secondaryClass: document.getElementById('char-class-2')?.value || '',
            classChoiceMade: getFlag('test-class-choice-made'),
            isMulticlass: getFlag('test-is-multiclass'),
            multiclassChoiceMade: getFlag('test-multiclass-choice-made'),
            multiclassOptOut: getFlag('test-multiclass-opt-out'),
            masteryCelebrated: getFlag('test-mastery-celebrated'),
            elfrot: parseInt(document.getElementById('char-elfrot')?.value) || 0,
            availableStatPoints: window.ProgressionManager?.availableStatPoints || 0,
            lastSaved: new Date().toISOString()
        };
    },

    /**
     * Updates both the hidden data bridge and the visible HUD labels.
     * This ensures that the UI and the persistence layer are always in sync.
     * @param {string} key - The field key (e.g., 'renown', 'race').
     * @param {string|number} value - The new value.
     */
    updateField(key, value) {
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

    _applyVitals(char) {
        window.mobileMaxHp = char.maxHp || 28;
        window.mobileMaxMp = char.maxMp || 12;
        window.mobileMaxSp = char.maxSp || 10;

        window.mobileTargetHp = char.currentHp !== undefined ? char.currentHp : window.mobileMaxHp;
        window.mobileDisplayHp = window.mobileTargetHp;
        window.mobileTargetTempHp = char.tempHp || 0;
        window.mobileDisplayTempHp = window.mobileTargetTempHp;
        window.mobileTargetMp = char.currentMp !== undefined ? char.currentMp : window.mobileMaxMp;
        window.mobileDisplayMp = window.mobileTargetMp;
        window.mobileTargetSp = char.currentSp !== undefined ? char.currentSp : window.mobileMaxSp;
        window.mobileDisplaySp = window.mobileTargetSp;

        const hpInput = DeochUtils.getElement('hud-max-hp-input');
        if (hpInput) hpInput.value = window.mobileMaxHp;
        const mpInput = DeochUtils.getElement('hud-max-mp-input');
        if (mpInput) mpInput.value = window.mobileMaxMp;
        const spInput = DeochUtils.getElement('mobile-max-sp-input');
        if (spInput) spInput.value = window.mobileMaxSp;
    },

    _applyClassInfo(char) {
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

    async loadCharacter(id) {
        const char = this.characters.find(c => c.id === id);
        if (!char) return;

        this.isInitializing = true;
        this.activeCharId = char.id;

        // Apply basic info via centralized sync
        this.updateField('name', char.name || 'Unknown Hero');
        this.updateField('renown', char.renown || 'Renown 1');
        this.updateField('race', char.race || 'Human');
        this.updateField('age', char.age || '20');
        this.updateField('speed', char.speed || '30ft');
        this.updateField('size', char.size || 'Medium');
        this.updateField('elfrot', char.elfrot || 0);
        this.updateField('exp', char.exp || 20);

        // GM Mode Toggle - Triggered by name "1"
        if (window.GMManager) {
            if (char.name === '1') {
                window.GMManager.activateGMMode();
            } else {
                window.GMManager.setGMMode(false);
            }
        }

        // Apply Avatar
        if (window.InterfaceManager) {
            window.InterfaceManager.updateAvatarDisplay(char.avatar);
        }

        // Apply stats
        if (char.stats && window.ProgressionManager) {
            window.ProgressionManager.applyStats(char.stats);
        }

        // Apply vitals
        this._applyVitals(char);

        // Apply toggles
        if (char.inspiration !== undefined) {
            const insp = document.getElementById('test-hud-inspiration');
            if (insp) insp.checked = char.inspiration;
        }
        // Apply flags using unified utility
        ['test-class-choice-made', 'test-is-multiclass', 'test-multiclass-choice-made', 'test-multiclass-opt-out', 'test-mastery-celebrated'].forEach(id => {
            const key = id.replace('test-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            DeochUtils.smartSet(id, char[key]);
        });

        // Apply class info
        this._applyClassInfo(char);

        // Apply EXP
        DeochUtils.smartSet('test-exp-input', char.exp || 20);

        // Sync ProgressionManager tracking level BEFORE triggering UI updates
        // This prevents the "level up" logic from firing during initial load
        if (window.ProgressionManager) {
            const currentExp = parseInt(char.exp) || 20;
            window.ProgressionManager.lastProcessedLevel = window.ProgressionManager.calculateCurrentLevel(currentExp);
            window.ProgressionManager.availableStatPoints = char.availableStatPoints || 0;
        }

        // Apply Theme
        if (char.theme && window.InterfaceManager?.applyTheme) window.InterfaceManager.applyTheme(char.theme);

        this.isInitializing = false;

        // Update UI Authority
        if (window.ProgressionManager) {
            window.ProgressionManager.updateLevelFromExp();
            window.ProgressionManager.updateAttributes();
            window.ProgressionManager.updateAvailablePointsUI();
            window.ProgressionManager.updateStatIndicators();
        }

        console.log('Character loaded:', char.name);
        this.renderGallery();
    },

    newCharacter() {
        const id = this.generateId();
        this.activeCharId = id;
        this.isInitializing = true;

        // Reset DOM and state to defaults BEFORE saving new character
        this.resetSheetToDefaults();

        if (window.ProgressionManager) {
            window.ProgressionManager.availableStatPoints = window.ProgressionManager.getStartingStatPoints();
            window.ProgressionManager.lastProcessedLevel = 0;
        }

        if (window.CreationTour) window.CreationTour.resetTour();



        this.renderGallery();
        this.isInitializing = false;

        if (window.ProgressionManager) {
            window.ProgressionManager.updateAvailablePointsUI();
        }
    },

    resetSheetToDefaults() {
        // Reset basic info
        DeochUtils.setText('test-hud-name', 'Unknown Hero');
        DeochUtils.setText('test-hud-detail-renown', 'Renown 1');
        DeochUtils.setText('test-hud-detail-race', 'Human');
        const startingAge = '20';
        DeochUtils.setText('test-hud-detail-age', startingAge);
        DeochUtils.setText('test-hud-detail-speed', '30ft');
        DeochUtils.setText('test-hud-detail-size', 'Medium');

        // Reset stats to base 9
        if (window.ProgressionManager) {
            window.ProgressionManager.applyStats({
                str: 9, dex: 9, con: 9, int: 9, wis: 9, cha: 9
            });
        }

        // Reset Avatar
        if (window.InterfaceManager) {
            window.InterfaceManager.updateAvatarDisplay(null);
        }

        // Reset vitals
        window.mobileMaxHp = 28;
        window.mobileMaxMp = 12;
        window.mobileMaxSp = 10;
        window.mobileTargetHp = 28;
        window.mobileDisplayHp = 28;
        window.mobileTargetTempHp = 0;
        window.mobileDisplayTempHp = 0;
        window.mobileTargetMp = 12;
        window.mobileDisplayMp = 12;
        window.mobileTargetSp = 10;
        window.mobileDisplaySp = 10;
        const hpInput = document.getElementById('hud-max-hp-input');
        if (hpInput) hpInput.value = 28;
        const mpInput = document.getElementById('hud-max-mp-input');
        if (mpInput) mpInput.value = 12;
        const spInput = document.getElementById('mobile-max-sp-input');
        if (spInput) spInput.value = 10;

        // Reset flags
        ['test-class-choice-made', 'test-is-multiclass', 'test-multiclass-choice-made', 'test-multiclass-opt-out', 'test-mastery-celebrated'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'false';
        });

        // Reset classes
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

        // Reset EXP
        DeochUtils.smartSet('test-exp-input', 20);

        // Reset Theme to default
        if (window.InterfaceManager?.applyTheme) window.InterfaceManager.applyTheme('sandstorm');

        // Reset tooltip dismissal state
        document.body.classList.remove('stat-tooltip-dismissed');
        DeochUtils.Storage.remove('deoch_has_interacted_with_stat_popup');

        // Refresh UI Authority
        if (window.ProgressionManager) {
            window.ProgressionManager.updateLevelFromExp();
            window.ProgressionManager.updateAttributes();
            window.ProgressionManager.updateAvailablePointsUI();
            window.ProgressionManager.updateStatIndicators();
        }

        // Reset GM Mode
        if (window.GMManager) {
            window.GMManager.setGMMode(false);
        }
    },

    async deleteCharacter(skipPrompt = false) {
        if (!this.activeCharId) return;

        if (!skipPrompt) {
            // This is a fallback in case called from somewhere else, 
            // but the primary flow will now be the click-and-hold.
            if (!confirm('Are you sure you want to delete this character?')) return;
        }

        await this._doDelete();
    },

    async _doDelete() {
        await DeochDB.delete(DeochDB.STORES.CHARACTERS, this.activeCharId);
        
        // Update local cache
        this.characters = this.characters.filter(c => c.id !== this.activeCharId);

        if (this.characters.length > 0) {
            await this.loadCharacter(this.characters[0].id);
        } else {
            this.newCharacter();
        }
        this.renderGallery();
    },

    exportCharacter() {
        const charData = this.gatherCurrentData();
        const code = JSON.stringify(charData);
        DeochUtils.smartSet('test-transfer-textarea', code);
        DeochUtils.showFeedback('test-export-btn', 'READY TO COPY', 'check');
    },

    importCharacter(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const charData = JSON.parse(e.target.result);
                this.loadCharacterFromData(charData);
            } catch (_err) {
                console.error('DataManager: Import failed', _err);
                alert('Import failed. Invalid JSON format.');
            }
        };
        reader.readAsText(file);
    },

    async loadCharacterFromData(charData) {
        if (!charData || typeof charData !== 'object') {
            console.error('Invalid character data format');
            return;
        }

        charData.id = 'char_' + Date.now();

        // Persist and update cache
        await DeochDB.put(DeochDB.STORES.CHARACTERS, charData);
        this.characters.push(charData);

        await this.loadCharacter(charData.id);

        const dialog = document.getElementById('test-import-export-modal');
        if (dialog && typeof dialog.close === 'function') dialog.close();
    },

    // --- Migration Logic ---
    migrateLegacyData() {
        const legacyData = this.get(this.KEYS.LEGACY_DATA);
        const newDataCount = this.characters.length;

        if (legacyData && newDataCount === 0) {
            try {
                const parsedLegacy = JSON.parse(legacyData);
                const migrated = {
                    ...parsedLegacy,
                    id: parsedLegacy.id || 'legacy-' + Date.now(),
                    lastSaved: new Date().toISOString()
                };

                // Persist to DB and Cache
                DeochDB.put(DeochDB.STORES.CHARACTERS, migrated);
                this.characters.push(migrated);

                console.log('DataManager: Legacy data migrated to unified storage.');
            } catch (e) {
                console.error('DataManager: Migration failed:', e);
            }
        }
    },

    // --- Legacy Character Persistence ---
    initLegacyForm() {
        const form = document.getElementById('char-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveLegacyCharacter();
            }, { signal: this.signal });
        }
    },

    saveLegacyCharacter(showStatus = true) {
        if (window.SUSPEND_SAVING) return;
        const form = document.getElementById('char-form');
        if (!form) return;

        const idInput = document.getElementById('char-id');
        if (idInput && !idInput.value) {
            idInput.value = 'char-' + Date.now() + '-' + DeochUtils.random().toString(36).substring(2, 9);
        }

        const formData = new FormData(form);
        const charData = {};
        for (const [key, value] of formData.entries()) {
            charData[key] = value;
        }

        const hudInputs = document.querySelectorAll('#combat-utilities-container input, .floating-vitality-orbs input');
        hudInputs.forEach(el => {
            const name = el.getAttribute('name') || el.id;
            if (name) {
                if (el.type === 'checkbox') {
                    charData[name] = el.checked ? 'on' : 'off';
                } else {
                    charData[name] = el.value;
                }
            }
        });

        this.setJson(this.KEYS.CHARACTER_SHEET, charData);

        let gallery = this.getJson(this.KEYS.LEGACY_GALLERY, []);
        const charId = charData['id'];

        if (charId) {
            const idx = gallery.findIndex(c => c.id === charId);
            if (idx >= 0) {
                gallery[idx] = charData;
            } else {
                if (gallery.length >= 10) {
                    this.showLegacyStatus('Gallery full (Max 10). Delete a hero first!', true);
                    return;
                }
                gallery.push(charData);
            }
            this.setJson(this.KEYS.LEGACY_GALLERY, gallery);
        }

        this.updateLegacyGallery();
        if (showStatus) this.showLegacyStatus('Character Saved to Gallery!');
    },

    loadLegacyCharacter() {
        const data = this.getJson(this.KEYS.CHARACTER_SHEET);
        if (!data) return;
        // Fix: Correct form ID is char-form
        const form = document.getElementById('char-form');
        if (!form) return;

        for (const [key, value] of Object.entries(data)) {
            const elements = form.querySelectorAll(`[name="${key}"]`);
            elements.forEach(el => {
                if (el.type === 'checkbox') {
                    el.checked = value === 'on';
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (el.type === 'radio') {
                    if (el.value === value) el.checked = true;
                } else {
                    el.value = value;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            const hudEl = document.getElementById(key);
            if (hudEl) {
                if (hudEl.type === 'checkbox') {
                    hudEl.checked = value === 'on';
                } else {
                    hudEl.value = value;
                }
                hudEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    },

    showLegacyStatus(message, isError = false) {
        const status = document.getElementById('save-status');
        if (!status) return;
        status.textContent = message;
        status.style.color = isError ? 'var(--color-danger)' : '';
        status.classList.add('show');
        setTimeout(() => {
            status.classList.remove('show');
        }, isError ? 4000 : 3000);
    },

    // --- Gallery Logic (Merged from GalleryManager.js) ---
    /**
     * Renders the test sheet character gallery.
     */
    renderGallery() {
        const characters = this.getCharacters();

        // 1. Full Grid (Dialog Gallery)
        const galleryContainer = document.getElementById('test-gallery-grid');
        if (galleryContainer) {
            galleryContainer.innerHTML = '';
            characters.forEach(char => {
                const card = DeochUtils.renderGalleryCard(char, { activeId: this.activeCharId });
                card.addEventListener('click', () => this.loadCharacter(char.id), { signal: this.signal });
                galleryContainer.appendChild(card);
            });

            const newCard = DeochUtils.renderGalleryCard(null, { isNew: true });
            newCard.addEventListener('click', () => {
                this.newCharacter();
                document.getElementById('character-gallery-dialog')?.close();
            }, { signal: this.signal });
            galleryContainer.appendChild(newCard);
        }

        // 2. Integrated List (Management Popup)
        const galleryList = document.getElementById('test-gallery-list');
        if (galleryList) {
            galleryList.innerHTML = '';
            if (characters.length === 0) {
                galleryList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.7rem; opacity: 0.5; padding: 0.5rem; text-align: center;">No test characters saved.</p>';
            } else {
                characters.forEach(char => {
                    const btn = DeochUtils.renderGalleryCard(char, { activeId: this.activeCharId, variant: 'glass' });
                    btn.className = 'glass-btn';
                    btn.style.width = '100%';
                    btn.style.textAlign = 'left';
                    btn.style.padding = '0.5rem 0.75rem';
                    btn.style.display = 'flex';
                    btn.style.alignItems = 'center';
                    btn.style.gap = '0.75rem';
                    btn.style.fontSize = '0.75rem';
                    btn.style.justifyContent = 'flex-start';
                    btn.style.height = 'auto';

                    if (char.id === this.activeCharId) {
                        btn.style.borderColor = 'var(--accent-primary)';
                        btn.style.color = 'var(--accent-primary)';
                        btn.style.background = 'var(--accent-glow)';
                        btn.style.boxShadow = '0 0 10px var(--accent-glow)';
                    }

                    btn.addEventListener('click', () => this.loadCharacter(char.id), { signal: this.signal });
                    galleryList.appendChild(btn);
                });
            }
        }

        DeochUtils.queueIconRefresh();
    },

    // --- Legacy Gallery Logic (Merged from gallery.js) ---
    /**
     * Updates the legacy character gallery UI.
     * @param {string|null} forcedActiveId - Optional ID to highlight as active.
     */
    updateLegacyGallery(forcedActiveId = null) {
        const galleryList = document.getElementById('gallery-list');
        const galleryContainer = document.getElementById('character-gallery');
        if (!galleryList || !galleryContainer) return;

        let gallery = this.getJson(this.KEYS.LEGACY_GALLERY, []);
        const currentIdInput = document.getElementById('char-id');
        const currentId = forcedActiveId || (currentIdInput ? currentIdInput.value : '');

        let updated = false;
        gallery = gallery.filter(char => char.name?.trim() || char.id).map(char => {
            if (!char.id) {
                char.id = 'migrated-' + DeochUtils.random().toString(36).substring(2, 9) + '-' + Date.now();
                updated = true;
            }
            return char;
        });

        if (updated) {
            this.setJson(this.KEYS.LEGACY_GALLERY, gallery);
        }

        galleryContainer.style.display = 'block';
        galleryList.innerHTML = '';

        if (gallery.length === 0) {
            galleryList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0; opacity: 0.6; padding: 0.5rem 0;">No saved characters in this gallery yet.</p>';
            return;
        }

        gallery.forEach(char => {
            const btn = DeochUtils.renderGalleryCard(char, { activeId: currentId, variant: 'secondary' });
            btn.className = 'secondary-btn gallery-character-btn' + (char.id === currentId ? ' active-gallery-btn' : '');

            btn.addEventListener('click', () => {
                // Fixed: bridge to the unified loadCharacter method
                this.loadCharacter(char.id);
            }, { signal: this.signal });
            galleryList.appendChild(btn);
        });

        DeochUtils.queueIconRefresh();
    },

    importFromTextarea() {
        const textarea = document.getElementById('test-transfer-textarea');
        if (!textarea?.value) {
            alert('Please paste character data first.');
            return;
        }
        try {
            const data = JSON.parse(textarea.value);
            this.loadCharacterFromData(data);
            const dialog = document.getElementById('import-export-dialog');
            if (dialog?.open) {
                dialog.close();
            } else {
                // Fallback for non-dialog overlay implementations
                const modal = document.getElementById('test-import-export-modal');
                if (modal) {
                    if (typeof modal.close === 'function') {
                        modal.close();
                    } else {
                        modal.style.display = 'none';
                    }
                }
            }
        } catch (_e) {
            console.error('DataManager: Invalid character data', _e);
            alert('Invalid character data.');
        }
    },

    copyCharacterCode() {
        const charData = this.gatherCurrentData();
        const code = JSON.stringify(charData);
        DeochUtils.smartSet('test-transfer-textarea', code);

        navigator.clipboard.writeText(code).then(() => {
            DeochUtils.showFeedback('test-copy-btn', 'COPIED!');
        });
    }
};
