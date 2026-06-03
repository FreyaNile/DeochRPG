import { DeochUtils } from './DeochUtils.js';
import { UpkeepData } from './UpkeepData.js';
import { InterfaceManager } from './InterfaceManager.js';

/**
 * @module GMManager
 * @description Handles Game Master mode tools, monster catalog, and encounter management.
 */
export const GMManager = {
    /**
     * Initializes the Game Master manager and catalog.
     * @param {HTMLElement} sheet - Reference to the main character sheet.
     * @param {AbortSignal} signal - AbortSignal for event listener cleanup.
     */
    init(sheet, signal) {
        this.signal = signal;
        this.renderMonsterCatalog();
        this.bindGMModeActions();
    },

    /**
     * Toggles the visibility of GM Mode controls and layout adjustments.
     * @param {boolean} isActive - True to activate GM mode, false to deactivate.
     */
    setGMMode(isActive) {
        const tabsCard = document.getElementById('test-tabs-card');
        const tabNav = tabsCard?.querySelector('.tab-nav');
        const tabPanes = tabsCard?.querySelectorAll('.test-tab-pane') || [];
        const gmCatalog = document.getElementById('gm-monster-catalog');
        const gmDetail = document.getElementById('gm-monster-detail');
        const gmList = document.getElementById('gm-monster-list');
        const mainContent = document.getElementById('mobile-sheet-view');

        document.body.classList.toggle('gm-mode-active', isActive);
        if (tabsCard) tabsCard.classList.toggle('gm-mode-active', isActive);
        // Use class toggle so original CSS display value is restored correctly
        if (tabNav) tabNav.classList.toggle('hidden', isActive);
        tabPanes.forEach(pane => pane.classList.toggle('hidden', isActive));
        if (gmCatalog) gmCatalog.classList.toggle('hidden', !isActive);
        if (gmList) gmList.classList.remove('hidden');
        if (gmDetail) gmDetail.classList.add('hidden');
        if (mainContent) mainContent.classList.toggle('gm-content-visible', isActive);
    },

    /**
     * Activates GM mode, updates HUD display names and levels, and hides standard sheet tabs.
     */
    activateGMMode() {
        this.setGMMode(true);
        if (InterfaceManager && InterfaceManager.toggleHUD) {
            InterfaceManager.toggleHUD(false);
        }
        DeochUtils.smartSet('test-hud-name', 'GM MODE');
        DeochUtils.smartSet('test-hud-level-text', 'Encounter Tools');
        DeochUtils.smartSet('test-hud-secondary-level-text', 'Monster Catalog');
    },

    /**
     * Renders the monster list in the catalog container using static database info.
     */
    renderMonsterCatalog() {
        const container = document.getElementById('dynamic-monster-grid');
        if (!container) return;
        container.innerHTML = DeochUtils.generateMonsterCatalogHTML(UpkeepData.BESTIARY);
    },

    /**
     * Binds click handlers to catalog items and details panel.
     */
    bindGMModeActions() {
        // Use event delegation on the container — survives re-renders
        const listContainer = document.getElementById('dynamic-monster-grid');
        if (listContainer) {
            listContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.monster-card-item');
                if (!card) return;
                const monster = UpkeepData.BESTIARY.find(m => m.id === card.dataset.monster);
                const list = document.getElementById('gm-monster-list');
                const detail = document.getElementById('gm-monster-detail');
                const display = document.getElementById('monster-info-display');
                if (!monster || !list || !detail || !display) return;

                this._renderMonsterDetail(display, monster);
                list.classList.add('hidden');
                detail.classList.remove('hidden');
                DeochUtils.queueIconRefresh(detail);
            }, { signal: this.signal });
        }

        const backBtn = document.getElementById('gm-back-to-catalog');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                document.getElementById('gm-monster-list')?.classList.remove('hidden');
                document.getElementById('gm-monster-detail')?.classList.add('hidden');
            }, { signal: this.signal });
        }
    },

    /**
     * Renders the monster detail panel. All data fields are escaped before
     * insertion to prevent XSS from bestiary data.
     * @param {HTMLElement} display - The detail display container.
     * @param {Object} monster - The monster data object.
     */
    _renderMonsterDetail(display, monster) {
        display.innerHTML = DeochUtils.generateMonsterDetailHTML(monster);
    },

    /**
     * Cleans up the GM manager, deactivating GM mode.
     */
    cleanup() {
        this.setGMMode(false);
        console.log('GMManager: Cleanup called');
    }
};
