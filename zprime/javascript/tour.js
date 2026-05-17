import { DataManager } from './DataManager.js';

export const CreationTour = {
    currentStep: 0,
    totalSteps: 5,
    data: {
        race: '',
        trinket: '',
        traits: [],
        feat: ''
    },

    init(signal) {
        this.signal = signal;
        const tourContainer = document.getElementById('creation-tour');
        if (!tourContainer) return;

        tourContainer.style.display = 'none';

        // --- Event Delegation ---
        tourContainer.addEventListener('click', (e) => {
            const actionTarget = e.target.closest('[data-tour-action]');
            if (!actionTarget) return;

            const action = actionTarget.getAttribute('data-tour-action');
            this.handleTourAction(action, e, actionTarget);
        }, { signal: this.signal });

        tourContainer.addEventListener('change', (e) => {
            const actionTarget = e.target.closest('[data-tour-action]');
            if (!actionTarget) return;

            const action = actionTarget.getAttribute('data-tour-action');
            this.handleTourAction(action, e, actionTarget);
        }, { signal: this.signal });

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


    hideAllSteps() {
        document.querySelectorAll('.tour-step').forEach(step => {
            step.classList.add('hidden');
            step.classList.remove('active');
            step.style.display = ''; // Clear inline styles to rely on class
        });
    },

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

    showStep(n) {
        this.hideAllSteps();
        this.activateStep(n);
        this.updateTourControls(n);
        this.currentStep = n;
    },

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

    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    },

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

    syncName() {
        const nameInput = document.getElementById('tour-name-input');
        const trimmedName = nameInput?.value?.trim();
        const finalName = trimmedName || 'Unknown Hero';
        this.data.name = finalName;
        DataManager.updateField('name', finalName);
    },

    selectRace(race) {
        this.selectHeritage(null, race);
    },

    selectHeritage(id, name) {
        this.data.race = name;
        DataManager.updateField('race', name);
        this.nextStep();
    },

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

    selectTrinket(trinket) {
        this.data.trinket = trinket;
        this.nextStep();
    },

    toggleTrait(el, trait) {
        if (el.checked) {
            this.data.traits.push(trait);
        } else {
            this.data.traits = this.data.traits.filter(t => t !== trait);
        }
    },

    selectFeat(feat) {
        this.data.feat = feat;
    },

    finishTour(isGMMode = false) {
        this.syncName();

        // GAME MECHANIC: A character's starting Experience Points are equal to their rolled age.
        if (this.data.age) {
            DataManager.updateField('age', this.data.age);
            DataManager.updateField('exp', this.data.age);

            if (window.ProgressionManager) {
                window.ProgressionManager.updateLevelFromExp();
            }
        }

        const tour = document.getElementById('creation-tour');
        if (!tour) return;

        // Immediately clear transparency to allow test interaction
        if (window.InterfaceManager?.clearSplashTransparency) window.InterfaceManager.clearSplashTransparency();

        tour.style.opacity = '0';
        setTimeout(() => this._completeTourCleanup(isGMMode), 500);
    },

    _completeTourCleanup(isGMMode) {
        const tour = document.getElementById('creation-tour');
        const mainContent = document.getElementById('mobile-sheet-view');
        if (!tour) return;

        tour.style.display = 'none';
        document.body.classList.remove('tour-active');
        if (!mainContent) return;

        document.body.classList.add('char-sheet-active', 'on-test-page');
        if (window.InterfaceManager?.toggleHUD) window.InterfaceManager.toggleHUD(false);
        document.body.classList.remove('hud-expanded');
        
        mainContent.style.display = 'flex';
        setTimeout(() => this._finalizeSheetDisplay(isGMMode, mainContent), 50);
    },

    _finalizeSheetDisplay(isGMMode, mainContent) {
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
        
        if (isGMMode && window.GMManager?.activateGMMode) {
            window.GMManager.activateGMMode();
        } else if (window.GMManager?.setGMMode) {
            window.GMManager.setGMMode(false);
        }
        
        // Re-init listeners once sheet is visible
        if (window.ProgressionManager) window.ProgressionManager.init(null, this.signal);
    },

    cleanup() {
        console.log('CreationTour: Cleanup called');
    }
};
