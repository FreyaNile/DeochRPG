/**
 * @module ModalManager
 * @description Encapsulates custom modal dialogs (confirm, prompt) to keep general utilities stateless.
 */
export const ModalManager = {
    /** @type {boolean} If the manager has been initialized */
    initialized: false,
    /** @type {AbortSignal|null} Cleanup event listener handler */
    signal: null,

    /**
     * Initializes the ModalManager with an AbortSignal.
     * @param {AbortSignal} signal - Signal for cleaning up event listeners.
     */
    init(signal) {
        this.signal = signal;
        this.initialized = true;
    },

    /**
     * Shows a custom confirm modal.
     * @param {string} title
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    confirm(title, text) {
        const dialog = document.getElementById('custom-confirm-dialog');
        if (!dialog) return Promise.resolve(window.confirm(text));
        
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-text').textContent = text;
        
        return new Promise((resolve) => {
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            const okBtn = document.getElementById('confirm-ok-btn');
            
            const cleanup = (value) => {
                cancelBtn.removeEventListener('click', onCancel);
                okBtn.removeEventListener('click', onOk);
                dialog.removeEventListener('cancel', onCancel);
                dialog.close();
                resolve(value);
            };
            
            const onCancel = () => cleanup(false);
            const onOk = () => cleanup(true);
            
            cancelBtn.addEventListener('click', onCancel);
            okBtn.addEventListener('click', onOk);
            dialog.addEventListener('cancel', onCancel);
            
            dialog.showModal();
        });
    },

    /**
     * Shows a custom prompt modal.
     * @param {string} title
     * @param {string} text
     * @param {string} defaultValue
     * @returns {Promise<string|null>}
     */
    prompt(title, text, defaultValue = '') {
        const dialog = document.getElementById('custom-prompt-dialog');
        if (!dialog) return Promise.resolve(window.prompt(text, defaultValue));
        
        document.getElementById('prompt-title').textContent = title;
        document.getElementById('prompt-text').textContent = text;
        const input = document.getElementById('prompt-input');
        input.value = defaultValue;
        
        return new Promise((resolve) => {
            const cancelBtn = document.getElementById('prompt-cancel-btn');
            const okBtn = document.getElementById('prompt-ok-btn');
            
            const cleanup = (value) => {
                cancelBtn.removeEventListener('click', onCancel);
                okBtn.removeEventListener('click', onOk);
                input.removeEventListener('keydown', onKeyDown);
                dialog.removeEventListener('cancel', onCancel);
                dialog.close();
                resolve(value);
            };
            
            const onCancel = () => cleanup(null);
            const onOk = () => cleanup(input.value);
            
            const onKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onOk();
                }
            };
            
            cancelBtn.addEventListener('click', onCancel);
            okBtn.addEventListener('click', onOk);
            input.addEventListener('keydown', onKeyDown);
            dialog.addEventListener('cancel', onCancel);
            
            dialog.showModal();
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        });
    },

    /**
     * Shows the Custom Action Creation Modal and returns the created action details.
     * @param {{name: string, bonus: number, icon: string, stat: string}|null} initialData - The initial action data to pre-populate.
     * @returns {Promise<{name: string, bonus: number, icon: string, stat: string}|null>}
     */
    showCustomActionDialog(initialData = null) {
        const dialog = document.getElementById('custom-action-dialog');
        if (!dialog) return Promise.resolve(null);
        
        const nameInput = document.getElementById('custom-action-name');
        const bonusInput = document.getElementById('custom-action-bonus');
        const btnSword = document.getElementById('custom-action-symbol-sword');
        const btnSpell = document.getElementById('custom-action-symbol-spell');
        const statBtns = dialog.querySelectorAll('[data-stat]');
        
        // Populate defaults or initialData
        nameInput.value = initialData ? initialData.name : '';
        bonusInput.value = initialData ? initialData.bonus : '0';
        
        let selectedIcon = initialData ? initialData.icon : 'sword';
        if (selectedIcon === 'sparkles') {
            btnSpell.classList.add('active');
            btnSword.classList.remove('active');
        } else {
            btnSword.classList.add('active');
            btnSpell.classList.remove('active');
        }
        
        let selectedStat = initialData ? initialData.stat : 'str';
        statBtns.forEach(btn => {
            if (btn.getAttribute('data-stat') === selectedStat) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        return new Promise((resolve) => {
            const cancelBtn = document.getElementById('custom-action-cancel');
            const okBtn = document.getElementById('custom-action-submit');
            
            const cleanup = (value) => {
                cancelBtn.removeEventListener('click', onCancel);
                okBtn.removeEventListener('click', onOk);
                btnSword.removeEventListener('click', selectSword);
                btnSpell.removeEventListener('click', selectSpell);
                statBtns.forEach(btn => btn.removeEventListener('click', selectStatFn));
                dialog.removeEventListener('cancel', onCancel);
                dialog.close();
                resolve(value);
            };
            
            const onCancel = () => cleanup(null);
            
            const onOk = () => {
                const name = nameInput.value.trim() || 'Attack';
                const bonus = parseInt(bonusInput.value) || 0;
                cleanup({ name, bonus, icon: selectedIcon, stat: selectedStat });
            };
            
            const selectSword = () => {
                selectedIcon = 'sword';
                btnSword.classList.add('active');
                btnSpell.classList.remove('active');
            };
            
            const selectSpell = () => {
                selectedIcon = 'sparkles';
                btnSpell.classList.add('active');
                btnSword.classList.remove('active');
            };
            
            const selectStatFn = (e) => {
                statBtns.forEach(btn => btn.classList.remove('active'));
                const btn = e.currentTarget;
                btn.classList.add('active');
                selectedStat = btn.getAttribute('data-stat');
            };
            
            cancelBtn.addEventListener('click', onCancel);
            okBtn.addEventListener('click', onOk);
            btnSword.addEventListener('click', selectSword);
            btnSpell.addEventListener('click', selectSpell);
            statBtns.forEach(btn => btn.addEventListener('click', selectStatFn));
            dialog.addEventListener('cancel', onCancel);
            
            dialog.showModal();
            setTimeout(() => {
                nameInput.focus();
            }, 50);
        });
    },

    /**
     * Shows the Unarmed Stat selection dialog.
     * @param {string} currentPref - Current preferred stat.
     * @param {number} currentBonus - Current flat bonus.
     * @returns {Promise<{stat: string, bonus: number}|null>}
     */
    showUnarmedStatDialog(currentPref = 'str', currentBonus = 0) {
        const dialog = document.getElementById('unarmed-stat-dialog');
        if (!dialog) return Promise.resolve(null);
        
        const statBtns = dialog.querySelectorAll('[data-unarmed-stat]');
        const bonusInput = document.getElementById('unarmed-stat-bonus');
        
        let selectedStat = currentPref.toLowerCase();
        if (bonusInput) {
            bonusInput.value = currentBonus || '0';
        }
        
        statBtns.forEach(btn => {
            if (btn.getAttribute('data-unarmed-stat') === selectedStat) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        return new Promise((resolve) => {
            const cancelBtn = document.getElementById('unarmed-stat-cancel');
            const okBtn = document.getElementById('unarmed-stat-submit');
            
            const cleanup = (value) => {
                cancelBtn.removeEventListener('click', onCancel);
                okBtn.removeEventListener('click', onOk);
                statBtns.forEach(btn => btn.removeEventListener('click', selectStatFn));
                dialog.removeEventListener('cancel', onCancel);
                dialog.close();
                resolve(value);
            };
            
            const onCancel = () => cleanup(null);
            const onOk = () => {
                const bonus = parseInt(bonusInput?.value) || 0;
                cleanup({ stat: selectedStat, bonus });
            };
            
            const selectStatFn = (e) => {
                statBtns.forEach(btn => btn.classList.remove('active'));
                const btn = e.currentTarget;
                btn.classList.add('active');
                selectedStat = btn.getAttribute('data-unarmed-stat');
            };
            
            cancelBtn.addEventListener('click', onCancel);
            okBtn.addEventListener('click', onOk);
            statBtns.forEach(btn => btn.addEventListener('click', selectStatFn));
            dialog.addEventListener('cancel', onCancel);
            
            dialog.showModal();
        });
    },

    /**
     * Cleans up the ModalManager state.
     */
    cleanup() {
        this.initialized = false;
    }
};
