
import { InterfaceManager } from './InterfaceManager.js';
import { ProgressionManager } from './ProgressionManager.js';
export const CreationTour = {
    currentStep: 0,
    totalSteps: 5,
    data: {
        race: '',
        trinket: '',
        traits: [],
        feat: ''
    },

    /**
     * @memberof CreationTour
     * @description Initializes the creation tour, setting up event handlers for user choices.
     * @param {AbortSignal} signal - Signal for cleaning up event listeners.
     */
    init(signal) {
        this.signal = signal;
        const tourContainer = document.getElementById('creation-tour');
        if (!tourContainer) return;

        tourContainer.style.display = 'none';

        // --- Event Delegation ---
        const handleEvent = (e) => {
            const actionTarget = e.target.closest('[data-tour-action]');
            if (!actionTarget) return;

            const action = actionTarget.getAttribute('data-tour-action');
            this.handleTourAction(action, e, actionTarget);
        };

        tourContainer.addEventListener('click', handleEvent, { signal: this.signal });
        tourContainer.addEventListener('change', handleEvent, { signal: this.signal });

        const nameInput = document.getElementById('tour-name-input');
        if (nameInput) {
            nameInput.addEventListener('input', () => this.syncName(), { signal: this.signal });
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.nextStep();
                }
            }, { signal: this.signal });
        }
    },

    /**
     * @memberof CreationTour
     * @description Centralized handler for tour actions.
     */
    handleTourAction(action, event, target) {
        switch (action) {
            case 'select-heritage': {
                const id = target.getAttribute('data-heritage-id');
                const name = target.getAttribute('data-heritage-name');
                this.selectHeritage(id, name);
                break;
            }
            case 'roll-age':
                this.rollAge();
                break;
            case 'select-trinket':
                this.selectTrinket(target.getAttribute('data-trinket'));
                break;
            case 'toggle-trait':
                this.toggleTrait(target, target.getAttribute('data-trait'));
                break;
            case 'select-feat':
                this.selectFeat(target.getAttribute('data-feat'));
                break;
            case 'prev-step':
                this.prevStep();
                break;
            case 'next-step':
                this.nextStep();
                break;
            case 'finish-tour':
                this.finishTour();
                break;
        }
    },


    /**
     * @memberof CreationTour
     * @description Hides all step elements from view.
     */
    hideAllSteps() {
        document.querySelectorAll('.tour-step').forEach(step => {
            step.classList.add('hidden');
            step.classList.remove('active');
            step.style.display = ''; // Clear inline styles to rely on class
        });
    },

    /**
     * @memberof CreationTour
     * @description Activates and displays a specific tour step.
     * @param {number} n - The step index to activate.
     */
    activateStep(n) {
        const el = document.querySelector(`.tour-step[data-step="${n}"]`);
        if (!el) return;
        el.style.display = 'block';
        setTimeout(() => el.classList.add('active'), 10);
        if (n === 0) {
            const nameInput = document.getElementById('tour-name-input');
            if (nameInput) setTimeout(() => nameInput.focus(), 150);
        }
    },

    /**
     * @memberof CreationTour
     * @description Updates navigation buttons and progress bar indicator.
     * @param {number} n - The current step index.
     */
    updateTourControls(n) {
        const toggle = (id, cond) => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = cond ? 'block' : 'none';
        };
        toggle('tour-prev', n > 0);
        toggle('tour-next', n < this.totalSteps);
        toggle('tour-finish', n === this.totalSteps);

        const progress = document.getElementById('tour-progress');
        if (progress) progress.style.width = `${((n + 1) / (this.totalSteps + 1)) * 100}%`;
    },

    /**
     * @memberof CreationTour
     * @description Transitions the tour to show the specified step index.
     * @param {number} n - The step index to show.
     */
    showStep(n) {
        this.hideAllSteps();
        this.activateStep(n);
        this.updateTourControls(n);
        this.currentStep = n;
    },

    /**
     * @memberof CreationTour
     * @description Advances to the next step, handling GM mode shortcuts.
     */
    nextStep() {
        if (this.currentStep === 0) {
            this.syncName();
            if (this.data.name === '1') {
                this.finishTour(true);
                return;
            }
            if (this.data.name === '2') {
                this.finishTour(false);
                return;
            }
        }
        if (this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        }
    },

    /**
     * @memberof CreationTour
     * @description Returns to the previous step in the tour.
     */
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    },

    /**
     * @memberof CreationTour
     * @description Resets the tour state and redirects UI to the initial step.
     */
    resetTour() {
        this.currentStep = 0;
        this.data = {
            name: '',
            race: '',
            trinket: '',
            traits: [],
            feat: ''
        };

        // Reset UI inputs
        const selects = document.querySelectorAll('#creation-tour select');
        selects.forEach(s => s.selectedIndex = 0);

        const checks = document.querySelectorAll('#creation-tour input[type="checkbox"], #creation-tour input[type="radio"]');
        checks.forEach(c => c.checked = false);

        const nameInput = document.getElementById('tour-name-input');
        if (nameInput) nameInput.value = ''; // SPE: Rely on placeholder "Name your legend..." instead of hardcoded text

        const tourContainer = document.getElementById('creation-tour');
        const mainContent = document.getElementById('mobile-sheet-view');
        if (tourContainer) {
            tourContainer.classList.remove('hidden');
            tourContainer.style.display = 'flex';
            tourContainer.style.opacity = '1';
            document.body.classList.remove('char-sheet-active');
            document.body.classList.add('tour-active');
        }
        if (mainContent) {
            mainContent.style.display = 'none';
            mainContent.style.opacity = '0';
            mainContent.style.transform = 'translateY(16px)';
        }

        this.syncName();
        this.showStep(0);
    },

    /**
     * @memberof CreationTour
     * @description Synchronizes the name input value with the local data structure and UI.
     */
    syncName() {
        const nameInput = document.getElementById('tour-name-input');
        const trimmedName = nameInput?.value?.trim();
        const finalName = trimmedName || 'Unknown Hero';
        this.data.name = finalName;
        InterfaceManager.updateFieldUI('name', finalName);
    },

    /**
     * @memberof CreationTour
     * @description Selects a heritage and advances the tour step.
     * @param {string|null} id - The heritage element ID.
     * @param {string} name - The heritage name.
     */
    selectHeritage(id, name) {
        this.data.race = name;
        InterfaceManager.updateFieldUI('race', name);
        this.nextStep();
    },

    /**
     * @memberof CreationTour
     * @description Rolls a random age using cryptographically secure random values and updates UI.
     */
    rollAge() {
        const age = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * 40) + 16;
        this.data.age = age;
        const display = document.getElementById('tour-age-display');
        if (display) {
            display.textContent = age;
            display.classList.add('stat-roll-result');
            setTimeout(() => display.classList.remove('stat-roll-result'), 1000);
        }

        const rollBtn = document.getElementById('tour-roll-age');
        if (rollBtn) {
            rollBtn.textContent = 'CONTINUE';
            rollBtn.dataset.tourAction = 'next-step';
        }
    },

    /**
     * @memberof CreationTour
     * @description Selects a starting trinket.
     * @param {string} trinket - The selected trinket description/name.
     */
    selectTrinket(trinket) {
        this.data.trinket = trinket;
        this.nextStep();
    },

    /**
     * @memberof CreationTour
     * @description Toggles selection state of a character trait.
     * @param {HTMLInputElement} el - Checkbox element.
     * @param {string} trait - The trait name.
     */
    toggleTrait(el, trait) {
        if (el.checked) {
            this.data.traits.push(trait);
        } else {
            this.data.traits = this.data.traits.filter(t => t !== trait);
        }
    },

    /**
     * @memberof CreationTour
     * @description Selects a starting feat.
     * @param {string} feat - The feat name.
     */
    selectFeat(feat) {
        this.data.feat = feat;
    },

    /**
     * @memberof CreationTour
     * @description Finalizes the tour choices and unlocks sheet controls.
     * @param {boolean} [isGMMode=false] - Whether to activate GM Mode directly.
     */
    finishTour(isGMMode = false) {
        this.syncName();

        // GAME MECHANIC: A character's starting Experience Points are equal to their rolled age.
        if (this.data.age) {
            InterfaceManager.updateFieldUI('age', this.data.age);
            InterfaceManager.updateFieldUI('exp', this.data.age);

            if (ProgressionManager) {
                ProgressionManager.updateLevelFromExp();
            }
        }

        const tour = document.getElementById('creation-tour');
        if (!tour) return;

        // Immediately clear transparency to allow test interaction
        if (InterfaceManager?.clearSplashTransparency) InterfaceManager.clearSplashTransparency();

        tour.style.opacity = '0';
        setTimeout(() => this._completeTourCleanup(isGMMode), 500);
    },

    /**
     * @memberof CreationTour
     * @description Internal method that handles final fade outs and displays.
     * @param {boolean} isGMMode - Whether GM Mode should be active.
     * @private
     */
    _completeTourCleanup(isGMMode) {
        const tour = document.getElementById('creation-tour');
        const mainContent = document.getElementById('mobile-sheet-view');
        if (!tour) return;

        tour.style.display = 'none';
        document.body.classList.remove('tour-active');
        if (!mainContent) return;

        document.body.classList.add('char-sheet-active', 'on-test-page');
        if (InterfaceManager?.toggleHUD) InterfaceManager.toggleHUD(false);
        document.body.classList.remove('hud-expanded');

        mainContent.style.display = 'flex';
        setTimeout(() => this._finalizeSheetDisplay(isGMMode, mainContent), 50);
    },

    /**
     * @memberof CreationTour
     * @description Transition completion callback detailing sheet animations and custom events.
     * @param {boolean} isGMMode - Whether GM Mode should be active.
     * @param {HTMLElement} mainContent - Main content container.
     * @private
     */
    _finalizeSheetDisplay(isGMMode, mainContent) {
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';

        document.dispatchEvent(new CustomEvent('deoch-tour-complete', {
            detail: { isGMMode }
        }));
    },

    /**
     * @memberof CreationTour
     * @description Cleans up creation tour handlers and telemetry.
     */
    cleanup() {
        console.log('CreationTour: Cleanup called');
    }
};
