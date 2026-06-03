import { DeochUtils } from './DeochUtils.js';

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
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        const okBtn = document.getElementById('confirm-ok-btn');
        
        return new Promise((resolve) => {
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
        const cancelBtn = document.getElementById('prompt-cancel-btn');
        const okBtn = document.getElementById('prompt-ok-btn');
        
        return new Promise((resolve) => {
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
     * Helper to populate custom action fields and return initial values.
     * @private
     */
    _populateCustomActionFields(initialData, symbolBtns, statBtns) {
        const nameInput = document.getElementById('custom-action-name');
        const hitBonusInput = document.getElementById('custom-action-hit-bonus');
        const dmgBonusInput = document.getElementById('custom-action-dmg-bonus');
        const deleteBtn = document.getElementById('custom-action-delete');
        const okBtn = document.getElementById('custom-action-submit');

        const data = initialData || {};
        nameInput.value = data.name || '';

        if (hitBonusInput) {
            const val = data.bonus;
            hitBonusInput.value = (val === 0 || val === '0' || val === undefined) ? '' : val;
        }
        if (dmgBonusInput) {
            const val = data.dmgBonus;
            dmgBonusInput.value = (val === 0 || val === '0' || val === undefined) ? '' : val;
        }

        const diceCounts = DeochUtils.parseDiceString(data.dice || '');
        [4, 6, 8, 10, 12, 20].forEach(sides => {
            const qtySpan = document.getElementById(`custom-dice-qty-${sides}`);
            if (qtySpan) {
                qtySpan.textContent = diceCounts[sides] || 0;
            }
        });

        if (deleteBtn) {
            deleteBtn.style.display = initialData ? '' : 'none';
        }
        if (okBtn) {
            okBtn.textContent = initialData ? 'Save' : 'Create';
        }

        const selectedIcon = data.icon || 'sword';
        symbolBtns.forEach(b => {
            b.el.classList.toggle('active', b.icon === selectedIcon);
        });

        const selectedStat = data.stat || 'str';
        statBtns.forEach(btn => {
            const btnStat = btn.getAttribute('data-stat');
            btn.classList.toggle('active', btnStat === selectedStat);
        });

        return { selectedIcon, selectedStat };
    },

    /**
     * Shows the Custom Action Creation Modal and returns the created action details.
     * @param {{name: string, bonus: number, icon: string, stat: string, dice: string}|null} initialData - The initial action data to pre-populate.
     * @returns {Promise<{name: string, bonus: number, icon: string, stat: string, dice: string}|null>}
     */
    showCustomActionDialog(initialData = null) {
        const dialog = document.getElementById('custom-action-dialog');
        if (!dialog) return Promise.resolve(null);

        const nameInput = document.getElementById('custom-action-name');
        const hitBonusInput = document.getElementById('custom-action-hit-bonus');
        const dmgBonusInput = document.getElementById('custom-action-dmg-bonus');
        const deleteBtn = document.getElementById('custom-action-delete');
        const okBtn = document.getElementById('custom-action-submit');
        const cancelBtn = document.getElementById('custom-action-cancel');

        const symbolBtns = [
            { el: document.getElementById('custom-action-symbol-sword'), icon: 'sword' },
            { el: document.getElementById('custom-action-symbol-spell'), icon: 'sparkles' },
            { el: document.getElementById('custom-action-symbol-hand'), icon: 'hand' },
            { el: document.getElementById('custom-action-symbol-ranged'), icon: 'crosshair' }
        ].filter(b => b.el);
        const statBtns = dialog.querySelectorAll('[data-stat]');

        const config = this._populateCustomActionFields(initialData, symbolBtns, statBtns);
        let selectedIcon = config.selectedIcon;
        let selectedStat = config.selectedStat;

        return new Promise((resolve) => {
            const diceQtyBtns = dialog.querySelectorAll('[data-dice-qty-dec], [data-dice-qty-inc]');
            const diceHandlers = [];

            const cleanup = (value) => {
                cancelBtn.removeEventListener('click', onCancel);
                okBtn.removeEventListener('click', onOk);
                if (deleteBtn) deleteBtn.removeEventListener('click', onDelete);
                symbolBtns.forEach(b => b.el.removeEventListener('click', b._handler));
                statBtns.forEach(btn => btn.removeEventListener('click', selectStatFn));
                diceHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
                dialog.removeEventListener('cancel', onCancel);
                dialog.close();
                resolve(value);
            };

            const onCancel = () => cleanup(null);

            const onOk = () => {
                const name = nameInput.value.trim() || 'Attack';
                const bonus = hitBonusInput ? (parseInt(hitBonusInput.value) || 0) : 0;
                const dmgBonus = dmgBonusInput ? (parseInt(dmgBonusInput.value) || 0) : 0;

                const finalDiceCounts = {};
                [4, 6, 8, 10, 12, 20].forEach(sides => {
                    const qtySpan = document.getElementById(`custom-dice-qty-${sides}`);
                    finalDiceCounts[sides] = qtySpan ? (parseInt(qtySpan.textContent, 10) || 0) : 0;
                });
                const dice = DeochUtils.serializeDiceCounts(finalDiceCounts);

                cleanup({ name, bonus, dmgBonus, icon: selectedIcon, stat: selectedStat, dice });
            };

            const onDelete = () => cleanup({ deleted: true });

            symbolBtns.forEach(b => {
                b._handler = () => {
                    selectedIcon = b.icon;
                    for (const s of symbolBtns) {
                        s.el.classList.toggle('active', s === b);
                    }
                };
                b.el.addEventListener('click', b._handler);
            });

            const selectStatFn = (e) => {
                statBtns.forEach(btn => btn.classList.remove('active'));
                const btn = e.currentTarget;
                btn.classList.add('active');
                selectedStat = btn.getAttribute('data-stat');
            };

            diceQtyBtns.forEach(btn => {
                const decVal = btn.getAttribute('data-dice-qty-dec');
                const incVal = btn.getAttribute('data-dice-qty-inc');
                const sides = parseInt(decVal || incVal, 10);
                const isDec = !!decVal;

                const handler = () => {
                    const qtySpan = document.getElementById(`custom-dice-qty-${sides}`);
                    if (qtySpan) {
                        const currentQty = parseInt(qtySpan.textContent, 10) || 0;
                        qtySpan.textContent = isDec ? Math.max(0, currentQty - 1) : currentQty + 1;
                    }
                };

                btn.addEventListener('click', handler);
                diceHandlers.push({ btn, handler });
            });

            cancelBtn.addEventListener('click', onCancel);
            okBtn.addEventListener('click', onOk);
            if (deleteBtn) deleteBtn.addEventListener('click', onDelete);
            statBtns.forEach(btn => btn.addEventListener('click', selectStatFn));
            dialog.addEventListener('cancel', onCancel);

            dialog.showModal();
            setTimeout(() => {
                nameInput.focus();
            }, 50);
        });
    },



    /**
     * Cleans up the ModalManager state.
     */
    cleanup() {
        this.initialized = false;
    }
};
