/**
 * Deoch TTRPG - Main Entry Point (ES Module Version)
 * Global Script Architecture v2.0 - Authority Modules
 */
window.SUSPEND_SAVING = false;

import { DiceTray } from './dice-tray.js';
import { CreationTour } from './tour.js';
import { DeochUtils } from './DeochUtils.js';
import { DataManager } from './DataManager.js';
import { ProgressionManager } from './ProgressionManager.js';
import { VitalsManager, HealthOrbShader } from './orbs.js';
import { GMManager } from './GMManager.js';
import { InterfaceManager } from './InterfaceManager.js';
import { DeochDB } from './DeochDB.js';
import { AvatarManager } from './AvatarManager.js';
import { ModalManager } from './ModalManager.js';
import { EquipmentManager } from './EquipmentManager.js';

// Centralized Namespace
window.Deoch = {
    DiceTray,
    VitalsManager,
    ProgressionManager,

    CreationTour,
    DeochUtils,
    DataManager,
    HealthOrbShader,
    GMManager,
    InterfaceManager,
    DeochDB,
    AvatarManager,
    ModalManager,
    EquipmentManager,
    SUSPEND_SAVING: false
};

// Legacy Bridge for Inline Event Handlers & Testing Suite
window.DeochDB = window.Deoch.DeochDB;

class App {
    /**
     * Creates an instance of App.
     */
    constructor() {
        this.initialized = false;
        this.testPageInitialized = false;
        this.lifecycle = new AbortController();
        this.signal = this.lifecycle.signal;
        this.idleHandle = null;
        this.visualsTimeout = null;
    }

    /**
     * Initializes core services, managers, and views.
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initialized) return;

        console.log('Deoch App: Initializing...');

        window.ensureTestPageInitialized = () => this.initTestPage();

        // 1. Core Services (DataManager MUST be first)
        ModalManager.init(this.signal);
        await DataManager.init(null, this.signal);
        InterfaceManager.init(null, this.signal); // Navigation & HUD
        AvatarManager.init(this.signal);
        
        // 2. UI Components
        DiceTray.init(this.signal);

        // 3. Initial Data Load
        DataManager.renderGallery();
        DeochUtils.queueIconRefresh();

        this.initialized = true;
    }

    /**
     * Initializes orchestrations and page-specific handlers for the sheet/play page.
     */
    initTestPage() {
        if (this.testPageInitialized) return;

        // 4. Page-Specific Orchestration
        ProgressionManager.init(null, this.signal);
        GMManager.init(null, this.signal);
        CreationTour.init(this.signal);

        document.addEventListener('deoch-tour-complete', (e) => {
            const { isGMMode } = e.detail;
            if (isGMMode && GMManager?.activateGMMode) {
                GMManager.activateGMMode();
            } else if (GMManager?.setGMMode) {
                GMManager.setGMMode(false);
            }
            if (ProgressionManager && !ProgressionManager.initialized) {
                ProgressionManager.init(null, this.signal);
            }
        }, { signal: this.signal });

        if (VitalsManager) VitalsManager.init(this.signal);
        EquipmentManager.init(this.signal);

        // Load the last character
        DataManager.loadLastCharacter();

        DeochUtils.queueIconRefresh();

        this.testPageInitialized = true;
    }

    /**
     * Aborts active lifecycles, cancels active WebGL rendering, and cleans up managers.
     */
    cleanup() {
        if (this.lifecycle) this.lifecycle.abort();

        // Explicitly cancel all visual shaders to stop animation loops
        [
            window.hudHealthOrbShader,
            window.hudManaOrbShader,
            window.hudStaminaOrbShader
        ].forEach(s => {
            if (s && typeof s.cancel === 'function') s.cancel();
        });

        [
            DataManager, DiceTray, VitalsManager, ProgressionManager, 
            CreationTour, InterfaceManager, AvatarManager, ModalManager, EquipmentManager
        ].forEach(m => {
            if (m && typeof m.cleanup === 'function') m.cleanup();
        });

        this.initialized = false;
        this.testPageInitialized = false;
    }
}

// Start the app
const deochApp = new App();
window.DeochApp = deochApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => deochApp.init(), { signal: deochApp.signal });
} else {
    deochApp.init();
}
