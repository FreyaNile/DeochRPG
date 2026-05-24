import { DeochUtils } from './DeochUtils.js';
import { DeochDB } from './DeochDB.js';
import { ModalManager } from './ModalManager.js';
import { InterfaceManager } from './InterfaceManager.js';
import { CreationTour } from './tour.js';
import { ProgressionManager } from './ProgressionManager.js';
import { GMManager } from './GMManager.js';

/**
 * @module DataManager
 * @description Handles character persistence, saving, loading, and import/export.
 * Centralized manager for all storage interactions and gallery UI within the DEOCH system.
 */
export const DataManager = {
    activeCharId: null,
    isInitializing: false,
    characters: [], // Local cache for sync UI rendering
    activeCharacter: {
        maxHp: 28,
        currentHp: 28,
        tempHp: 0,
        maxMp: 12,
        currentMp: 12,
        maxSp: 10,
        currentSp: 10
    },

    /**
     * Centralized storage keys to avoid fracturing and hardcoding.
     */
    KEYS: {
        CHARACTERS: 'deoch-test-sheet-v2',
        LAST_CHAR_ID: 'test-sheet-last-id',
        THEME: 'deoch-theme-preference',
        LEGACY_DATA: 'deoch_character_data'
    },

    async init(sheet, signal) {
        this.signal = signal;
        await DeochDB.init();
        await this.migrateLocalStorageToDB();

        // Refresh local cache
        this.characters = await DeochDB.getAll(DeochDB.STORES.CHARACTERS);

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
    async saveCharacter(providedData = null) {
        if (window.SUSPEND_SAVING) return;

        const charData = providedData || (InterfaceManager ? InterfaceManager.gatherCurrentData() : null);
        if (!charData) {
            console.error('DataManager: Save failed - No data provided or InterfaceManager unavailable.');
            return;
        }

        if (!this.activeCharId) {
            this.activeCharId = this.generateId();
        }
        charData.id = this.activeCharId;
        charData.lastSaved = new Date().toISOString();

        // Update local cache
        const index = this.characters.findIndex(c => c.id === charData.id);
        if (index !== -1) {
            this.characters[index] = charData;
        } else {
            this.characters.push(charData);
        }

        // Persist to IndexedDB
        await DeochDB.put(DeochDB.STORES.CHARACTERS, charData);

        // Store last active ID in localStorage
        this.set(this.KEYS.LAST_CHAR_ID, charData.id);

        DeochUtils.showFeedback('test-save-btn', 'Saved!');
        this.renderGallery();
    },

    async loadCharacter(id) {
        const char = this.characters.find(c => c.id === id);
        if (!char) return;

        this.isInitializing = true;
        this.activeCharId = char.id;

        // Sync local activeCharacter state object
        this.activeCharacter = {
            maxHp: char.maxHp || 28,
            currentHp: char.currentHp !== undefined ? char.currentHp : (char.maxHp || 28),
            tempHp: char.tempHp || 0,
            maxMp: char.maxMp || 12,
            currentMp: char.currentMp !== undefined ? char.currentMp : (char.maxMp || 12),
            maxSp: char.maxSp || 10,
            currentSp: char.currentSp !== undefined ? char.currentSp : (char.maxSp || 10)
        };

        // Apply basic info via centralized sync
        if (InterfaceManager) {
            InterfaceManager.updateFieldUI('name', char.name || 'Unknown Hero');
            InterfaceManager.updateFieldUI('renown', char.renown || 'Renown 1');
            InterfaceManager.updateFieldUI('race', char.race || 'Human');
            InterfaceManager.updateFieldUI('age', char.age || '20');
            InterfaceManager.updateFieldUI('speed', char.speed || '30ft');
            InterfaceManager.updateFieldUI('size', char.size || 'Medium');
            InterfaceManager.updateFieldUI('elfrot', char.elfrot || 0);
            InterfaceManager.updateFieldUI('exp', char.exp || 20);
            InterfaceManager.updateAvatarDisplay(char.avatar);
            InterfaceManager.applyVitalsUI(char);
            InterfaceManager.applyClassInfoUI(char);
            if (char.theme) InterfaceManager.applyTheme(char.theme);

            // Apply inspiration (if exists in data)
            if (char.inspiration !== undefined) {
                DeochUtils.smartSet('test-hud-inspiration', char.inspiration);
            }

            // Apply languages (if exists in data)
            if (char.languages && ProgressionManager) {
                ProgressionManager.LANGUAGES.forEach(l => {
                    const saved = char.languages[l.key] || { v: false, l: false };
                    const vEl = document.getElementById(`${l.id}-v`);
                    const lEl = document.getElementById(`${l.id}-l`);
                    if (vEl) vEl.checked = !!saved.v;
                    if (lEl) lEl.checked = !!saved.l;
                });
            } else if (ProgressionManager) {
                ProgressionManager.LANGUAGES.forEach(l => {
                    const vEl = document.getElementById(`${l.id}-v`);
                    const lEl = document.getElementById(`${l.id}-l`);
                    if (vEl) vEl.checked = false;
                    if (lEl) lEl.checked = false;
                });
            }
        }

        // GM Mode Toggle
        if (GMManager) {
            GMManager.setGMMode(char.name === '1');
        }

        // Apply stats
        if (char.stats && ProgressionManager) {
            ProgressionManager.applyStats(char.stats);
        }

        // Apply custom actions
        const actionsList = document.getElementById('test-actions-list');
        if (actionsList) {
            // Remove existing custom actions first
            const existingCustoms = actionsList.querySelectorAll('.action-item[data-action-type="custom"]');
            existingCustoms.forEach(el => el.remove());

            if (char.customActions && Array.isArray(char.customActions)) {
                char.customActions.forEach(act => {
                    const newItem = DeochUtils.createCustomActionItem(act.name, act.bonus, act.icon, act.stat);
                    actionsList.appendChild(newItem);
                });
            }
            DeochUtils.queueIconRefresh();
        }

        // Apply unarmed preference
        const unarmedItem = document.querySelector('#test-actions-list .action-item[data-action-type="unarmed"]');
        if (unarmedItem) {
            const preferred = char.unarmedPreferredStat || '';
            if (preferred) {
                unarmedItem.setAttribute('data-preferred-stat', preferred);
                const subtextEl = unarmedItem.querySelector('.u-opacity-0-5');
                if (subtextEl) {
                    subtextEl.textContent = `Melee • 1 + Mod Damage (${preferred.toUpperCase()})`;
                }
            } else {
                unarmedItem.removeAttribute('data-preferred-stat');
                const subtextEl = unarmedItem.querySelector('.u-opacity-0-5');
                if (subtextEl) {
                    subtextEl.textContent = 'Melee • 1 + Mod Damage';
                }
            }
        }

        // Apply flags using unified utility
        ['test-class-choice-made', 'test-is-multiclass', 'test-multiclass-choice-made', 'test-multiclass-opt-out', 'test-mastery-celebrated'].forEach(id => {
            const key = id.replace('test-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            DeochUtils.smartSet(id, char[key]);
        });

        // Sync ProgressionManager tracking
        if (ProgressionManager) {
            const currentExp = parseInt(char.exp) || 20;
            ProgressionManager.lastProcessedLevel = ProgressionManager.calculateCurrentLevel(currentExp);
            ProgressionManager.availableStatPoints = char.availableStatPoints || 0;

            ProgressionManager.updateLevelFromExp();
            ProgressionManager.updateAttributes();
            ProgressionManager.updateAvailablePointsUI();
            ProgressionManager.updateStatIndicators();
        }

        console.log('Character loaded:', char.name);
        this.renderGallery();
        this.isInitializing = false;
    },

    newCharacter() {
        const id = this.generateId();
        this.activeCharId = id;
        this.isInitializing = true;

        this.activeCharacter = {
            maxHp: 28,
            currentHp: 28,
            tempHp: 0,
            maxMp: 12,
            currentMp: 12,
            maxSp: 10,
            currentSp: 10
        };

        if (InterfaceManager) {
            InterfaceManager.resetSheetToDefaults();
        }

        if (ProgressionManager) {
            ProgressionManager.availableStatPoints = ProgressionManager.getStartingStatPoints();
            ProgressionManager.lastProcessedLevel = 0;
            ProgressionManager.updateAvailablePointsUI();
        }

        if (CreationTour) CreationTour.resetTour();

        this.renderGallery();
        this.isInitializing = false;
    },
    async deleteCharacter(skipPrompt = false) {
        if (!this.activeCharId) return;

        if (!skipPrompt) {
            const confirmed = await ModalManager.confirm('DELETE CHARACTER', 'Are you sure you want to delete this character?');
            if (!confirmed) return;
        }

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
        const charData = InterfaceManager ? InterfaceManager.gatherCurrentData() : {};
        charData.id = this.activeCharId;
        const code = JSON.stringify(charData);
        DeochUtils.smartSet('test-transfer-textarea', code);
        DeochUtils.showFeedback('test-export-btn', 'READY TO COPY', 'check');
    },

    async loadCharacterFromData(charData) {
        if (!charData || typeof charData !== 'object') {
            console.error('Invalid character data format');
            return;
        }

        charData.id = this.generateId();

        // Persist and update cache
        await DeochDB.put(DeochDB.STORES.CHARACTERS, charData);
        this.characters.push(charData);

        await this.loadCharacter(charData.id);

        if (InterfaceManager) {
            InterfaceManager.closeImportExportModal();
        }
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

                DeochDB.put(DeochDB.STORES.CHARACTERS, migrated);
                this.characters.push(migrated);
                console.log('DataManager: Legacy data migrated.');
            } catch (e) {
                console.error('DataManager: Migration failed:', e);
            }
        }
    },

    // --- Gallery Logic ---
    renderGallery() {
        if (InterfaceManager) InterfaceManager.renderGallery(this);
    },

    async importFromTextarea() {
        const text = DeochUtils.smartGet('test-transfer-textarea');
        if (!text) {
            alert('Please paste character data first.');
            return;
        }
        try {
            const data = JSON.parse(text);
            await this.loadCharacterFromData(data);
        } catch (_e) {
            console.error('DataManager: Invalid character data', _e);
            alert('Invalid character data.');
        }
    },

    copyCharacterCode() {
        const charData = InterfaceManager ? InterfaceManager.gatherCurrentData() : {};
        charData.id = this.activeCharId;
        const code = JSON.stringify(charData);
        DeochUtils.smartSet('test-transfer-textarea', code);

        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                DeochUtils.showFeedback('test-copy-btn', 'COPIED!');
            });
        }
    }
};
