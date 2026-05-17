/**
 * Deoch TTRPG - Main Entry Point (ES Module Version)
 * Global Script Architecture v2.0 - Authority Modules
 */
window.SUSPEND_SAVING = false;

import { DiceRoller } from './dice-roller.js';
import { CreationTour } from './tour.js';
import { DeochUtils } from './DeochUtils.js';
import { DataManager } from './DataManager.js';
import { ProgressionManager } from './ProgressionManager.js';
import { VitalsManager, HealthOrbShader } from './orbs.js';
import { GMManager } from './GMManager.js';
import { InterfaceManager } from './InterfaceManager.js';
import { DeochDB } from './DeochDB.js';
import { AvatarManager } from './AvatarManager.js';

// Global Bridge for Legacy/Inline Event Handlers (IMMEDIATE)
window.DiceRoller = DiceRoller;
window.VitalsManager = VitalsManager;

// Unified Logic Authority Aliases (Legacy/Compatibility)
window.ProgressionManager = ProgressionManager;
window.StatsManager = ProgressionManager;     // Alias for legacy dice roller logic
window.MechanicsManager = ProgressionManager; // Alias for semantic rule references
window.MobileActions = ProgressionManager;

window.CreationTour = CreationTour;
window.DeochUtils = DeochUtils;
window.DataManager = DataManager;
window.HealthOrbShader = HealthOrbShader;
window.GMManager = GMManager;
window.InterfaceManager = InterfaceManager;
window.DeochDB = DeochDB;
window.AvatarManager = AvatarManager;
window.navigateTo = (id) => InterfaceManager.navigateTo(id);
window.nextTourStep = () => CreationTour.nextStep();
window.prevTourStep = () => CreationTour.prevStep();
window.finishTour = () => CreationTour.finishTour();
window.resetTour = () => CreationTour.resetTour();
window.selectTourRace = (race) => CreationTour.selectRace(race);
window.selectTourHeritage = (id, name) => CreationTour.selectHeritage(id, name);
window.rollTourAge = () => CreationTour.rollAge();
window.selectTourTrinket = (trinket) => CreationTour.selectTrinket(trinket);
window.toggleTourTrait = (el, trait) => CreationTour.toggleTrait(el, trait);
window.selectTourFeat = (feat) => CreationTour.selectFeat(feat);

class App {
    constructor() {
        this.initialized = false;
        this.testPageInitialized = false;
        this.lifecycle = null;
        this.signal = null;
        this.idleHandle = null;
        this.visualsTimeout = null;
    }

    async init() {
        if (this.initialized) return;
        
        // Ensure clean state for new lifecycle
        if (this.lifecycle) this.lifecycle.abort();
        this.lifecycle = new AbortController();
        this.signal = this.lifecycle.signal;

        console.log('Deoch App: Initializing...');

        window.ensureTestPageInitialized = () => this.initTestPage();

        // 1. Core Services (DataManager MUST be first)
        await DataManager.init(null, this.signal);
        InterfaceManager.init(null, this.signal); // Navigation & HUD
        AvatarManager.init(this.signal);
        
        // 2. UI Components
        DiceRoller.init(this.signal);

        // 3. Initial Data Load
        DataManager.updateLegacyGallery();
        DeochUtils.queueIconRefresh();

        this.initialized = true;
    }

    initTestPage() {
        if (this.testPageInitialized) return;

        // Visuals can be deferred
        if (window.requestIdleCallback) {
            this.idleHandle = window.requestIdleCallback(() => this.initVisuals());
        } else {
            this.visualsTimeout = setTimeout(() => this.initVisuals(), 100);
        }

        // 4. Page-Specific Orchestration
        ProgressionManager.init(null, this.signal);
        GMManager.init(null, this.signal);
        CreationTour.init(this.signal);

        if (window.VitalsManager) window.VitalsManager.init(this.signal);

        // Load the last character
        DataManager.loadLastCharacter();

        DeochUtils.queueIconRefresh();

        this.testPageInitialized = true;
    }

    initVisuals() {
        const healthCanvas = document.getElementById('health-orb-canvas');
        const hudHealthCanvas = document.getElementById('hud-health-orb-canvas');
        const manaCanvas = document.getElementById('mana-orb-canvas');
        const hudManaCanvas = document.getElementById('hud-mana-orb-canvas');
        const hudStaminaCanvas = document.getElementById('hud-stamina-orb-canvas');

        if (healthCanvas) window.healthOrbShader = new HealthOrbShader('health-orb-canvas', 'health');
        if (hudHealthCanvas) window.hudHealthOrbShader = new HealthOrbShader('hud-health-orb-canvas', 'health');
        if (manaCanvas) window.manaOrbShader = new HealthOrbShader('mana-orb-canvas', 'mana');
        if (hudManaCanvas) window.hudManaOrbShader = new HealthOrbShader('hud-mana-orb-canvas', 'mana');
        if (hudStaminaCanvas) window.hudStaminaOrbShader = new HealthOrbShader('hud-stamina-orb-canvas', 'stamina');
    }
    cleanup() {
        if (this.lifecycle) this.lifecycle.abort();
        if (this.idleHandle) window.cancelIdleCallback(this.idleHandle);
        if (this.visualsTimeout) clearTimeout(this.visualsTimeout);

        // Explicitly cancel all visual shaders to stop animation loops
        [
            window.healthOrbShader, window.hudHealthOrbShader,
            window.manaOrbShader, window.hudManaOrbShader,
            window.staminaOrbShader, window.hudStaminaOrbShader
        ].forEach(s => {
            if (s && typeof s.cancel === 'function') s.cancel();
        });

        [
            DataManager, DiceRoller, VitalsManager, ProgressionManager, 
            CreationTour, InterfaceManager, AvatarManager
        ].forEach(m => {
            if (m && typeof m.cleanup === 'function') m.cleanup();
        });

        this.initialized = false;
        this.testPageInitialized = false;
    }
}

// Start the app
const deochApp = new App();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => deochApp.init(), { signal: deochApp.signal });
} else {
    deochApp.init();
}
