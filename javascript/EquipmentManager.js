import { DeochUtils } from './DeochUtils.js';
import { DataManager } from './DataManager.js';

/**
 * @module EquipmentManager
 * @description Manages Major Gear slots (10), attunement limits, usage dice, and encumbrance.
 */
export const EquipmentManager = {
    initialized: false,
    signal: null,
    selectedId: null,
    
    // Slots structure containing only Major Gear
    slots: {
        "maj-1": { type: "", label: "Maj1", name: "Iron Broadsword", attuned: false, usageActive: false, usageDie: "d8", weight: 3, desc: "Standard iron slashing weapon.", icon: "box" },
        "maj-2": { type: "", label: "Maj2", name: "Wooden Buckler", attuned: false, usageActive: false, usageDie: "d6", weight: 2, desc: "Defensive shield.", icon: "box" },
        "maj-3": { type: "", label: "Maj3", name: "Steel Visor", attuned: false, usageActive: false, usageDie: "d6", weight: 1.5, desc: "Steel visor protecting facial area.", icon: "box" },
        "maj-4": { type: "", label: "Maj4", name: "Leather Vest", attuned: false, usageActive: false, usageDie: "d6", weight: 2.5, desc: "Reinforced hide chestpiece.", icon: "box" },
        "maj-5": { type: "", label: "Maj5", name: "", attuned: false, usageActive: false, usageDie: "d6", weight: 0, desc: "", icon: "box" },
        "maj-6": { type: "", label: "Maj6", name: "Swift Boots", attuned: true, usageActive: false, usageDie: "d6", weight: 0.5, desc: "+5ft movement speed.", icon: "box" },
        "maj-7": { type: "", label: "Maj7", name: "Elven Cloak", attuned: true, usageActive: false, usageDie: "d6", desc: "Allows blends with terrain.", weight: 0.5, icon: "box" },
        "maj-8": { type: "", label: "Maj8", name: "", attuned: false, usageActive: false, usageDie: "d6", weight: 0, desc: "", icon: "box" },
        "maj-9": { type: "", label: "Maj9", name: "", attuned: false, usageActive: false, usageDie: "d6", weight: 0, desc: "", icon: "box" },
        "maj-10": { type: "", label: "Maj10", name: "", attuned: false, usageActive: false, usageDie: "d6", weight: 0, desc: "", icon: "box" }
    },

    init(signal) {
        this.signal = signal;
        this.initialized = true;

        // Build the grid
        this.buildGrid();

        // Setup inspector inputs
        this.setupInspectorSync();

        // Calculate initial stats
        this.recalculateWeight();
        this.updateAttunementHeader();
    },

    buildGrid() {
        const grid = document.getElementById("grid-majors");
        if (!grid) return;
        grid.innerHTML = "";

        for (let i = 1; i <= 10; i++) {
            const id = `maj-${i}`;
            const item = this.slots[id];

            const slot = document.createElement("div");
            slot.id = `tile-${id}`;
            this.updateTileElementMarkup(slot, item, id);

            slot.addEventListener("click", () => this.selectTile(id), { signal: this.signal });
            grid.appendChild(slot);
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    updateTileElementMarkup(el, item, id) {
        const isEmpty = !item.name;
        el.className = `v5-tile-slot ${isEmpty ? 'empty' : ''} ${item.attuned ? 'attuned' : ''} ${this.selectedId === id ? 'selected' : ''}`;
        
        if (id.startsWith("maj-")) {
            el.innerHTML = `
                <div class="v5-tile-name ${isEmpty ? 'empty' : ''}" style="margin-top: 0; padding-left: 0.25rem;">
                    ${item.name || 'Empty'}
                </div>
                ${item.usageActive ? '<div class="v5-tile-usage-indicator"></div>' : ''}
                <button type="button" class="v5-tile-info-btn" title="Inspect Item">
                    <i data-lucide="info"></i>
                </button>
            `;
        } else {
            el.innerHTML = `
                <div class="v5-tile-icon">
                    <i data-lucide="${item.icon || 'box'}"></i>
                </div>
                <span class="v5-tile-label">${item.type}</span>
                <div class="v5-tile-name ${isEmpty ? 'empty' : ''}">
                    ${item.name || 'Empty'}
                </div>
                ${item.usageActive ? '<div class="v5-tile-usage-indicator"></div>' : ''}
                <button type="button" class="v5-tile-info-btn" title="Inspect Item">
                    <i data-lucide="info"></i>
                </button>
            `;
        }
    },

    updateTileVisuals(id) {
        const el = document.getElementById(`tile-${id}`);
        if (!el) return;
        const item = this.slots[id];
        this.updateTileElementMarkup(el, item, id);
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    selectTile(id) {
        if (this.selectedId === id) {
            this.selectedId = null;
            document.querySelectorAll(".v5-tile-slot").forEach(tile => tile.classList.remove("selected"));
            this.resetInspectorPosition();
            return;
        }

        this.selectedId = id;
        const item = this.slots[id];

        // Highlight active tile
        document.querySelectorAll(".v5-tile-slot").forEach(tile => tile.classList.remove("selected"));
        const currentTile = document.getElementById(`tile-${id}`);
        if (currentTile) currentTile.classList.add("selected");

        // Move inspector under the clicked tile and show it
        const inspector = document.getElementById("v5-inspector");
        if (currentTile && inspector) {
            inspector.style.display = "flex";
            currentTile.parentNode.insertBefore(inspector, currentTile.nextSibling);
        }

        // Sync inputs
        const nameField = document.getElementById("insp-name");
        const descField = document.getElementById("insp-desc");
        const weightField = document.getElementById("insp-weight");

        const attuneBtn = document.getElementById("insp-attune-btn");
        const usageBtn = document.getElementById("insp-usage-btn");
        const usageDrawer = document.getElementById("insp-usage-drawer");
        const usageSelect = document.getElementById("insp-die-size");

        if (nameField) nameField.value = item.name;
        if (descField) descField.value = item.desc;
        if (weightField) weightField.value = item.weight;


        if (attuneBtn) {
            if (item.attuned) {
                attuneBtn.classList.add("active-attuned");
            } else {
                attuneBtn.classList.remove("active-attuned");
            }
        }

        if (usageBtn && usageDrawer && usageSelect) {
            if (item.usageActive) {
                usageBtn.classList.add("active-usage");
                usageDrawer.classList.add("active");
                usageSelect.value = item.usageDie;
            } else {
                usageBtn.classList.remove("active-usage");
                usageDrawer.classList.remove("active");
            }
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    setupInspectorSync() {
        const nameField = document.getElementById("insp-name");
        const descField = document.getElementById("insp-desc");
        const weightField = document.getElementById("insp-weight");
        const attuneBtn = document.getElementById("insp-attune-btn");
        const usageBtn = document.getElementById("insp-usage-btn");
        const usageSelect = document.getElementById("insp-die-size");
        const rollBtn = document.getElementById("insp-roll-btn");
        const dismissBtn = document.getElementById("v5-popup-dismiss-btn");

        if (nameField) {
            nameField.addEventListener("input", (e) => {
                if (!this.selectedId) return;
                const item = this.slots[this.selectedId];
                item.name = e.target.value;

                // Sync icon based on keyword
                if (this.selectedId.startsWith("maj-")) {
                    item.icon = "box";
                } else {
                    const nameLower = item.name.toLowerCase();
                    if (nameLower.includes("potion") || nameLower.includes("elixir") || nameLower.includes("vial")) item.icon = "flask-conical";
                    else if (nameLower.includes("rations") || nameLower.includes("food")) item.icon = "apple";
                    else if (nameLower.includes("knives") || nameLower.includes("sword") || nameLower.includes("blade") || nameLower.includes("dagger") || nameLower.includes("axe") || nameLower.includes("mace")) item.icon = "swords";
                    else if (nameLower.includes("tinder") || nameLower.includes("torch") || nameLower.includes("candle") || nameLower.includes("fire")) item.icon = "flame";
                    else if (nameLower.includes("shield") || nameLower.includes("buckler") || nameLower.includes("bulwark")) item.icon = "shield";
                    else if (nameLower.includes("boots") || nameLower.includes("shoes") || nameLower.includes("greaves")) item.icon = "footprints";
                    else if (nameLower.includes("rope") || nameLower.includes("backpack") || nameLower.includes("sack")) item.icon = "box";
                    else if (nameLower.includes("crown") || nameLower.includes("helm") || nameLower.includes("visor") || nameLower.includes("coif")) item.icon = "crown";
                    else if (nameLower.includes("shirt") || nameLower.includes("armor") || nameLower.includes("vest") || nameLower.includes("plate") || nameLower.includes("mail")) item.icon = "shirt";
                    else if (nameLower.includes("gloves") || nameLower.includes("gauntlets") || nameLower.includes("bracers")) item.icon = "hand";
                    else if (nameLower.includes("cloak") || nameLower.includes("cape") || nameLower.includes("mantle")) item.icon = "sparkles";
                    else if (nameLower.includes("necklace") || nameLower.includes("amulet") || nameLower.includes("pendant")) item.icon = "gem";
                    else if (nameLower.includes("ring") || nameLower.includes("band")) item.icon = "sparkles";
                    else item.icon = "box";
                }

                this.updateTileVisuals(this.selectedId);
                DataManager.saveCharacter();
            }, { signal: this.signal });
        }

        if (descField) {
            descField.addEventListener("input", (e) => {
                if (!this.selectedId) return;
                this.slots[this.selectedId].desc = e.target.value;
                DataManager.saveCharacter();
            }, { signal: this.signal });
        }

        if (weightField) {
            weightField.addEventListener("input", (e) => {
                if (!this.selectedId) return;
                this.slots[this.selectedId].weight = parseFloat(e.target.value) || 0;
                this.recalculateWeight();
                DataManager.saveCharacter();
            }, { signal: this.signal });
        }

        if (attuneBtn) {
            attuneBtn.addEventListener("click", () => {
                if (!this.selectedId) return;
                const item = this.slots[this.selectedId];

                // Calculate current attunements
                let attuneCount = 0;
                for (let key in this.slots) {
                    if (this.slots[key].attuned) attuneCount++;
                }

                if (item.attuned) {
                    item.attuned = false;
                    attuneBtn.classList.remove("active-attuned");
                } else {
                    if (attuneCount >= 3) {
                        return; // Attunement limit reached
                    }
                    item.attuned = true;
                    attuneBtn.classList.add("active-attuned");
                }
                
                this.updateAttunementHeader();
                this.updateTileVisuals(this.selectedId);
                DataManager.saveCharacter();
            }, { signal: this.signal });
        }

        if (usageBtn) {
            usageBtn.addEventListener("click", () => {
                if (!this.selectedId) return;
                const item = this.slots[this.selectedId];
                const drawer = document.getElementById("insp-usage-drawer");

                if (item.usageActive) {
                    item.usageActive = false;
                    usageBtn.classList.remove("active-usage");
                    if (drawer) drawer.classList.remove("active");
                } else {
                    item.usageActive = true;
                    usageBtn.classList.add("active-usage");
                    if (drawer) drawer.classList.add("active");
                }
                
                this.updateTileVisuals(this.selectedId);
                DataManager.saveCharacter();
            }, { signal: this.signal });
        }

        if (usageSelect) {
            usageSelect.addEventListener("change", (e) => {
                if (!this.selectedId) return;
                this.slots[this.selectedId].usageDie = e.target.value;
                DataManager.saveCharacter();
            }, { signal: this.signal });
        }

        if (rollBtn) {
            rollBtn.addEventListener("click", () => {
                if (!this.selectedId) return;
                const item = this.slots[this.selectedId];
                const dieVal = parseInt(item.usageDie.replace('d', ''), 10);
                const roll = Math.floor(Math.random() * dieVal) + 1;
                const originalDie = item.usageDie;

                if (roll <= 2) {
                    let nextDie = "";
                    if (item.usageDie === "d10") nextDie = "d8";
                    else if (item.usageDie === "d8") nextDie = "d6";
                    else if (item.usageDie === "d6") nextDie = "d4";

                    if (nextDie) {
                        item.usageDie = nextDie;
                        if (usageSelect) usageSelect.value = nextDie;
                        this.showRollPopup(roll, originalDie, item.name, nextDie, true, false);
                    } else {
                        this.showRollPopup(roll, "d4", item.name, "", false, true);
                        
                        // Item depleted completely, clear its fields
                        item.name = "";
                        item.desc = "";
                        item.weight = 0;
                        item.attuned = false;
                        item.usageActive = false;
                        item.usageDie = "d6";

                        this.selectedId = null;
                        this.resetInspectorPosition();
                    }
                } else {
                    this.showRollPopup(roll, originalDie, item.name, "", false, false);
                }

                if (this.selectedId) this.updateTileVisuals(this.selectedId);
                this.recalculateWeight();
                this.updateAttunementHeader();
                DataManager.saveCharacter();
            }, { signal: this.signal });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener("click", () => {
                const overlay = document.getElementById("v5-roll-popup-overlay");
                if (overlay) overlay.classList.remove("active");
            }, { signal: this.signal });
        }
    },

    recalculateWeight() {
        let total = 0;
        for (let key in this.slots) {
            if (this.slots[key].weight) {
                total += this.slots[key].weight;
            }
        }

        const weightVal = document.getElementById("v5-weight-val");
        if (weightVal) weightVal.textContent = total.toFixed(1);

        const fill = document.getElementById("v5-weight-bar");
        if (fill) {
            const pct = Math.min((total / 15) * 100, 100);
            fill.style.width = `${pct}%`;
            if (total > 15) {
                fill.classList.add("overload");
            } else {
                fill.classList.remove("overload");
            }
        }
    },

    updateAttunementHeader() {
        let attuneCount = 0;
        for (let key in this.slots) {
            if (this.slots[key].attuned) attuneCount++;
        }

        const countEl = document.getElementById("attuned-count-v5");
        if (countEl) countEl.textContent = attuneCount;

        const indicatorEl = document.getElementById("attunement-indicator-v5");
        if (indicatorEl) {
            if (attuneCount >= 3) {
                indicatorEl.classList.add("limit-reached");
            } else {
                indicatorEl.classList.remove("limit-reached");
            }
        }
    },

    showRollPopup(roll, dieSize, itemName, statusText, isDepleted, isConsumed) {
        const numberEl = document.getElementById("v5-popup-number");
        const titleEl = document.getElementById("v5-popup-title");
        const descEl = document.getElementById("v5-popup-desc");
        const overlay = document.getElementById("v5-roll-popup-overlay");

        if (!numberEl || !titleEl || !descEl || !overlay) return;

        numberEl.textContent = roll;

        let desc = "";
        let title = "WEAR TEST ROLL";
        if (isConsumed) {
            title = "ITEM DESTROYED!";
            desc = `Rolled <strong>${roll}</strong> on <strong>d4</strong> for <strong>${itemName}</strong>.<br><span style="color: var(--color-danger); font-weight: bold;">CONSUMED!</span> The item has depleted completely.`;
            numberEl.style.color = "var(--color-danger)";
            numberEl.style.textShadow = "0 0 20px rgba(239, 68, 68, 0.5)";
        } else if (isDepleted) {
            title = "ITEM DEGRADED!";
            desc = `Rolled <strong>${roll}</strong> on <strong>${dieSize}</strong> for <strong>${itemName}</strong>.<br><span style="color: var(--color-warning); font-weight: bold;">DEPLETED!</span> Dice reduced to <strong>${statusText}</strong>.`;
            numberEl.style.color = "var(--color-warning)";
            numberEl.style.textShadow = "0 0 20px rgba(245, 158, 11, 0.5)";
        } else {
            desc = `Rolled <strong>${roll}</strong> on <strong>${dieSize}</strong> for <strong>${itemName}</strong>.<br><span style="color: var(--color-success); font-weight: bold;">STABLE!</span> The item integrity holds.`;
            numberEl.style.color = "var(--accent-primary)";
            numberEl.style.textShadow = "0 0 20px rgba(253, 230, 138, 0.5)";
        }

        titleEl.textContent = title;
        descEl.innerHTML = desc;
        overlay.classList.add("active");

        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    gatherData() {
        // Return a copy of the major gear slots state
        return JSON.parse(JSON.stringify(this.slots));
    },

    loadData(data) {
        if (!data) return;
        // Merge saved data into existing slot types to preserve labels/types
        for (let key in this.slots) {
            if (data[key]) {
                Object.assign(this.slots[key], data[key]);
                if (this.slots[key].icon === "pocket" || this.slots[key].icon === "sparkle") {
                    this.slots[key].icon = "sparkles";
                }
            }
        }

        // Re-render grid
        this.buildGrid();
        
        // Reset inspector view
        this.selectedId = null;
        this.resetInspectorPosition();

        // Update headers
        this.recalculateWeight();
        this.updateAttunementHeader();
    },

    resetToDefaults() {
        for (let key in this.slots) {
            this.slots[key].name = "";
            this.slots[key].desc = "";
            this.slots[key].weight = 0;
            this.slots[key].attuned = false;
            this.slots[key].usageActive = false;
            this.slots[key].usageDie = "d6";
        }

        this.buildGrid();
        this.selectedId = null;
        this.resetInspectorPosition();

        this.recalculateWeight();
        this.updateAttunementHeader();
    },

    resetInspectorPosition() {
        const inspector = document.getElementById("v5-inspector");
        if (inspector) inspector.style.display = "none";
        const container = document.querySelector(".v5-showcase-container");
        if (inspector && container) {
            container.appendChild(inspector);
        }
    },

    cleanup() {
        this.initialized = false;
    }
};
