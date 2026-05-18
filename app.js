document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navigation Logic ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.page-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and sections
            navButtons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked button and corresponding section
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            // Toggle page-specific body classes
            document.body.classList.toggle('on-character-sheet-page', targetId === 'character-sheet');
            
            // Handle Splash Transparency
            const header = document.querySelector('.global-header');
            const footer = document.querySelector('.site-footer');
            const splash = document.getElementById('char-sheet-splash');
            const diceBtn = document.getElementById('toggle-dice-btn');
            
            if (targetId === 'character-sheet' && splash && splash.style.display !== 'none') {
                header?.classList.add('splash-transparent');
                footer?.classList.add('splash-transparent');
                diceBtn?.classList.add('splash-transparent');
                
                // Automate the transition
                if (typeof window.transitionSplash === 'function') {
                    if (window.splashTimeout) clearTimeout(window.splashTimeout);
                    window.splashTimeout = setTimeout(window.transitionSplash, 5000);
                }
            } else {
                header?.classList.remove('splash-transparent');
                footer?.classList.remove('splash-transparent');
                diceBtn?.classList.remove('splash-transparent');
            }
            
            // Handle Scroll Positioning
            if (targetId === 'character-sheet' && splash && splash.style.display !== 'none' && window.innerWidth <= 480) {
                // Lock scroll to bottom for splash screen on mobile
                setTimeout(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                }, 100);
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // --- Character Sheet Logic ---
    const charForm = document.getElementById('char-form');
    const saveStatus = document.getElementById('save-status');
    const LOCAL_STORAGE_KEY = 'deoch_character_data';
    const LOCAL_STORAGE_GALLERY_KEY = 'deoch_character_gallery';

    // --- Theme Switching Logic ---
    const themeSelect = document.getElementById('theme-select');
    const THEME_STORAGE_KEY = 'deoch-theme-preference';

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    };

    if (themeSelect) {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'sandstorm';
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);

        themeSelect.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }

    // UI Elements for Gallery
    const galleryContainer = document.getElementById('character-gallery');
    const galleryList = document.getElementById('gallery-list');
    const addToGalleryBtn = document.getElementById('add-to-gallery-btn');

    // --- Auto-Save Logic (Issue 2) ---
    let autoSaveTimeout;
    const triggerAutoSave = () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            if (typeof saveCharacterData === 'function') {
                saveCharacterData(false); // Silent save without toast
            }
        }, 1000); // 1 second debounce
    };

    if (charForm) {
        charForm.addEventListener('input', triggerAutoSave);
        charForm.addEventListener('change', triggerAutoSave);
    }

    // --- HUD Auto-save Listeners ---
    const attachHUDListeners = () => {
        const hudInputs = document.querySelectorAll('#combat-utilities-container input, .sticky-vitality-hud input');
        hudInputs.forEach(el => {
            // Remove existing to avoid duplicates if re-called
            el.removeEventListener('input', triggerAutoSave);
            el.removeEventListener('change', triggerAutoSave);
            el.addEventListener('input', triggerAutoSave);
            el.addEventListener('change', triggerAutoSave);
        });
    };
    attachHUDListeners();

    // --- Exhaustion Track Cumulative Logic ---
    const initExhaustionTrack = () => {
        const exhaustionInputs = document.querySelectorAll('.exhaustion-dots input');
        exhaustionInputs.forEach((input, index) => {
            input.addEventListener('change', function() {
                const targetLevel = index + 1;
                const isChecking = this.checked;
                
                // If we check level 4, check 1, 2, 3 as well
                if (isChecking) {
                    for (let i = 0; i < targetLevel; i++) {
                        if (exhaustionInputs[i]) exhaustionInputs[i].checked = true;
                    }
                } else {
                    // If we uncheck level 4, uncheck 5, 6, 7 as well
                    for (let i = targetLevel; i < exhaustionInputs.length; i++) {
                        if (exhaustionInputs[i]) exhaustionInputs[i].checked = false;
                    }
                }
                
                // Trigger updates
                if (typeof updateConditionsBadge === 'function') updateConditionsBadge();
                if (typeof triggerAutoSave === 'function') triggerAutoSave();
            });
        });
    };
    initExhaustionTrack();

    // --- Death / Mercy Logic Elements ---
    let lastKnownHP = null;
    const deathModal = document.getElementById('death-mercy-modal');
    const deathContent = document.getElementById('death-mercy-content');
    const deathTitle = document.getElementById('death-mercy-title');
    const deathText = document.getElementById('death-mercy-text');
    const deathIconContainer = document.getElementById('death-mercy-icon-container');
    const deathClose = document.getElementById('death-mercy-close');

    const showDeathPrompt = (isMercy) => {
        if (!deathModal) return;
        
        if (isMercy) {
            deathTitle.textContent = "MERCY";
            deathTitle.style.color = "var(--accent-primary)";
            deathTitle.style.textShadow = "0 0 20px var(--accent-glow)";
            deathText.textContent = "Inspiration has saved you from the brink. You cling to life with 1 HP remaining.";
            const currentIcon = deathIconContainer?.querySelector('i, svg');
            if (currentIcon) {
                currentIcon.setAttribute('data-lucide', 'sparkles');
            }
            if (deathIconContainer) deathIconContainer.style.color = "var(--accent-primary)";
            deathContent.style.borderColor = "var(--accent-primary)";
            deathContent.style.boxShadow = "0 0 50px var(--accent-glow)";
            deathClose.textContent = "I LIVE ON";
            deathClose.style.background = "var(--accent-primary)";
            
            const hpInput = document.getElementById('char-hp');
            const inspCheckbox = document.getElementById('char-insp-1');
            if (hpInput) {
                hpInput.value = 1;
                hpInput.dispatchEvent(new Event('change'));
                hpInput.dispatchEvent(new Event('input'));
            }
            if (inspCheckbox) {
                inspCheckbox.checked = false;
                inspCheckbox.dispatchEvent(new Event('change'));
            }
            
            lastKnownHP = 1;
            if (typeof saveCharacterData === 'function') saveCharacterData();
        } else {
            deathTitle.textContent = "YOU ARE DEAD";
            deathTitle.style.color = "#ef4444";
            deathTitle.style.textShadow = "0 0 20px rgba(239, 68, 68, 0.5)";
            deathText.textContent = "The darkness claims your soul. This character has met their end.";
            const currentIcon = deathIconContainer?.querySelector('i, svg');
            if (currentIcon) {
                currentIcon.setAttribute('data-lucide', 'skull');
            }
            if (deathIconContainer) deathIconContainer.style.color = "#ef4444";
            deathContent.style.borderColor = "#ef4444";
            deathContent.style.boxShadow = "0 0 50px rgba(239, 68, 68, 0.3)";
            deathClose.textContent = "ACCEPT FATE";
            deathClose.style.background = "#ef4444";
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        deathModal.style.display = 'flex';
    };

    const checkDeathStatus = window.checkDeathStatus = () => {
        const hpInput = document.getElementById('char-hp');
        if (!hpInput) return;
        const currentHP = parseInt(hpInput.value) || 0;
        if (lastKnownHP === null) { lastKnownHP = currentHP; return; }
        if (currentHP === 0 && lastKnownHP > 0) {
            const isInspired = document.getElementById('char-insp-1')?.checked;
            showDeathPrompt(isInspired);
        }
        lastKnownHP = currentHP;
    };

    if (deathClose) {
        deathClose.addEventListener('click', () => {
            deathModal.style.display = 'none';
        });
    }

    const updateInfoTitle = () => {
        const nameInput = document.getElementById('char-name');
        const infoTitle = document.getElementById('info-section-title');
        if (nameInput && infoTitle) {
            const currentName = nameInput.value || '';
            const newTitle = currentName ? `<span style="color: white;">${currentName}</span>'s Info` : 'Info';
            
            // Only update if changed to avoid unnecessary DOM churn
            if (infoTitle.innerHTML !== newTitle) {
                infoTitle.innerHTML = newTitle;
            }
        }
    };


    const updateVitalitySummary = () => {
        const summaryHP = document.getElementById('summary-hp');
        const summaryMana = document.getElementById('summary-mana');
        const summaryTemp = document.getElementById('summary-temp-hp');
        const tempWrapper = document.getElementById('summary-temp-wrapper');
        
        const hpInput = document.getElementById('char-hp');
        const manaInput = document.getElementById('char-mana');
        const tempInput = document.getElementById('char-temp-hp');
        
        if (summaryHP && hpInput) summaryHP.textContent = hpInput.value || '0';
        if (summaryMana && manaInput) summaryMana.textContent = manaInput.value || '0';
        
        if (tempInput && summaryTemp && tempWrapper) {
            const val = parseInt(tempInput.value) || 0;
            summaryTemp.textContent = val;
            tempWrapper.style.display = val > 0 ? 'flex' : 'none';
        }
    };

    // --- Helper Functions (Moved to top for visibility) ---
    const updateGalleryUI = (forcedActiveId = null) => {
        let gallery = JSON.parse(localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY) || '[]');
        const currentIdInput = document.getElementById('char-id');
        const currentId = forcedActiveId || (currentIdInput ? currentIdInput.value : "");
        
        if (!galleryList || !galleryContainer) return;

        // Migration & Cleanup: Ensure all characters have IDs and filter out empty ghosts
        let updated = false;
        gallery = gallery.filter(char => {
            // Keep if it has a name, OR if it has an ID (which means it's a valid tracked character)
            const hasName = char.name && char.name.trim() !== "";
            const hasId = !!char.id;
            return hasName || hasId;
        }).map(char => {
            if (!char.id) {
                char.id = 'migrated-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                updated = true;
            }
            return char;
        });

        if (updated) {
            localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(gallery));
        }

        galleryContainer.style.display = 'block';
        galleryList.innerHTML = '';

        if (gallery.length === 0) {
            galleryList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0; opacity: 0.6; padding: 0.5rem 0;">No saved characters in this gallery yet.</p>';
            return;
        }

        gallery.forEach(char => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'secondary-btn';
            
            if (char.id === currentId) {
                btn.classList.add('active-gallery-btn');
            }
            
            btn.style.padding = '0.6rem 1rem';
            btn.style.fontSize = '0.85rem';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '0.5rem';
            btn.innerHTML = `<i data-lucide="user" style="width: 14px; height: 14px;"></i> ${char.name || 'New Character'}`;
            
            btn.addEventListener('click', () => {
                switchCharacter(char.id);
            });

            galleryList.appendChild(btn);
        });

        // Re-initialize icons
        if (window.lucide) window.lucide.createIcons();
    };

    const clearCharacterUI = () => {
        // 1. Reset standard form fields
        charForm.reset();
        const idInput = document.getElementById('char-id');
        if (idInput) idInput.value = '';
        
        // Clear stat purchased metadata so new characters start with fresh points
        const STAT_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        STAT_NAMES.forEach(stat => {
            const input = document.getElementById(`stat-${stat}`);
            if (input) input.removeAttribute('data-purchased');
        });
        
        // Reset active session tracking
        if (typeof sessionStatPointsSpent !== 'undefined') {
            sessionStatPointsSpent = {};
        }

        // 2. Reset Custom Selects
        const resetTrigger = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        resetTrigger('heritage-selected-text', 'Select Heritage');
        resetTrigger('size-selected-text', 'Select Size');
        resetTrigger('class-selected-text', 'Select Class');
        resetTrigger('class-2-selected-text', 'Select Secondary Class');

        // 3. Clear dynamic sections
        const bagsContainer = document.getElementById('bags-container');
        if (bagsContainer) bagsContainer.innerHTML = '';
        
        // 4. Reset class and spellbook
        const classInput = document.getElementById('char-class');
        if (classInput) classInput.value = '';
        if (typeof renderSpellbook === 'function') renderSpellbook();
        if (typeof updateClassDisplay === 'function') updateClassDisplay();

        // 5. Reset multiclassing state
        const choiceMadeInput = document.getElementById('multiclass-choice-made');
        if (choiceMadeInput) choiceMadeInput.value = 'false';
        const optOutInput = document.getElementById('multiclass-opt-out');
        if (optOutInput) optOutInput.value = 'false';
        
        const spentExpInput = document.getElementById('char-spent-exp');
        if (spentExpInput) spentExpInput.value = '0';
        const primaryCapInput = document.getElementById('primary-class-exp-cap');
        if (primaryCapInput) primaryCapInput.value = '0';
        
        const secondaryClassGroup = document.getElementById('secondary-class-group');
        if (secondaryClassGroup) secondaryClassGroup.style.display = 'none';

        // 6. Reset vitality summary badge
        if (typeof updateVitalitySummary === 'function') updateVitalitySummary();
        
        // 7. Reset Info title
        if (typeof updateInfoTitle === 'function') updateInfoTitle();

        // 8. Reset Age Roll button
        const rollAgeBtn = document.getElementById('roll-age-btn');
        if (rollAgeBtn) {
            rollAgeBtn.disabled = false;
            rollAgeBtn.style.opacity = '1';
            rollAgeBtn.style.cursor = 'pointer';
            rollAgeBtn.textContent = 'Roll for Age';
        }

        // 7. Re-calculate everything
        if (typeof updateStatPointsDisplay === 'function') {
            updateStatPointsDisplay();
        }
    };

    const switchCharacter = (id) => {
        const gallery = JSON.parse(localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY) || '[]');
        
        // Save current character before switching, but ONLY if they still exist in the gallery
        // (Prevents re-saving a character that was just deleted)
        const currentIdInput = document.getElementById('char-id');
        const currentId = currentIdInput ? currentIdInput.value : "";
        if (currentId && gallery.some(c => c.id === currentId)) {
            saveCharacterData(false);
        }

        const charData = gallery.find(c => c.id === id);
        if (charData) {
            clearCharacterUI();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(charData));
            loadCharacterData();
            updateGalleryUI(id);
            // No automatic scroll to keep focus on gallery
        }
    };

    const addToGallery = () => {
        const gallery = JSON.parse(localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY) || '[]');
        
        // LIMIT: Max 10 characters
        if (gallery.length >= 10) {
            if (saveStatus) {
                saveStatus.textContent = "Gallery full (Max 10). Delete a hero first!";
                saveStatus.style.color = "#ef4444"; // Red for error
                saveStatus.classList.add('show');
                setTimeout(() => {
                    saveStatus.classList.remove('show');
                    saveStatus.style.color = ""; // Reset color
                }, 4000);
            }
            return;
        }

        // 1. Reset UI to blank state
        clearCharacterUI();
        
        // 2. Clear Name field
        const nameInput = document.getElementById('char-name');
        if (nameInput) nameInput.value = ''; // Leave empty so placeholder shows
        
        // 3. Generate a fresh Unique ID
        const idInput = document.getElementById('char-id');
        if (idInput) idInput.value = 'char-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // 4. Save immediately to establish this new character in the gallery
        saveCharacterData(false);
        
        // 5. Update the UI to show the new button
        updateGalleryUI();
    };

    // --- Clear Character Logic (Moved up for early binding) ---
    const clearBtn = document.getElementById('clear-char-btn');
    const clearModal = document.getElementById('clear-modal');
    const clearConfirmYes = document.getElementById('clear-confirm-yes');
    const clearConfirmNo = document.getElementById('clear-confirm-no');

    if (clearBtn && clearModal) {
        clearBtn.onclick = () => {
            clearModal.style.display = 'flex';
        };

        if (clearConfirmYes) {
            clearConfirmYes.onclick = () => {
                const idInput = document.getElementById('char-id');
                const charIdToDelete = idInput ? idInput.value : "";
                const nameInput = document.getElementById('char-name');
                const charName = nameInput ? nameInput.value.trim() : "";

                // 1. Handle Gallery Deletion by ID
                if (charIdToDelete) {
                    const rawGallery = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
                    if (rawGallery) {
                        try {
                            const gallery = JSON.parse(rawGallery);
                            const updatedGallery = gallery.filter(c => c.id !== charIdToDelete);
                            localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(updatedGallery));
                        } catch (e) {
                            console.error("Gallery parse error:", e);
                        }
                    }
                }

                // 2. Erase from Active Storage
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                
                // 3. Update the User Interface
                updateGalleryUI();
                
                const remainingGallery = JSON.parse(localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY) || '[]');
                if (remainingGallery.length > 0) {
                    switchCharacter(remainingGallery[0].id);
                } else {
                    clearCharacterUI();
                }
                
                // 4. Provide Feedback
                if (saveStatus) {
                    saveStatus.textContent = charName ? `Character "${charName}" erased.` : "Sheet cleared.";
                    saveStatus.classList.add('show');
                    setTimeout(() => saveStatus.classList.remove('show'), 3000);
                }

                // 5. Close Modal
                clearModal.style.display = 'none';
            };
        }

        if (clearConfirmNo) {
            clearConfirmNo.onclick = () => {
                clearModal.style.display = 'none';
            };
        }

        clearModal.onclick = (e) => {
            if (e.target === clearModal) clearModal.style.display = 'none';
        };
    }

    if (addToGalleryBtn) {
        addToGalleryBtn.addEventListener('click', addToGallery);
    }

    const nameInput = document.getElementById('char-name');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            updateGalleryUI();
            updateInfoTitle();
        });
    }

    // Initial Gallery Render
    updateGalleryUI();

    // Load saved data on startup
    const loadCharacterData = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                
                // We must set the class value and render the spellbook BEFORE populating the rest of the form
                const savedClass = parsedData['class'];
                if (savedClass) {
                    const classInput = document.getElementById('char-class');
                    if (classInput) {
                        classInput.value = savedClass;
                        
                        // Update Custom UI
                        const classSelectedText = document.getElementById('class-selected-text');
                        const customOption = document.querySelector(`#class-options .custom-option[data-value="${savedClass}"]`);
                        if (classSelectedText && customOption) {
                            classSelectedText.innerHTML = customOption.innerHTML;
                            document.querySelectorAll('#class-options .custom-option').forEach(opt => opt.classList.remove('selected'));
                            customOption.classList.add('selected');
                        }

                        // Trigger render so checkboxes exist before loop
                        if (typeof renderSpellbook === 'function') {
                            renderSpellbook();
                        }
                        // Update class display
                        if (typeof updateClassDisplay === 'function') {
                            updateClassDisplay();
                        }
                    }
                }
                // Pre-render dynamic bags if they exist so their inputs are in the DOM before assignment
                const bagIds = new Set();
                const pouchIds = new Set();
                
                for (const key of Object.keys(parsedData)) {
                    const bagMatch = key.match(/^bag-(\d+)-/);
                    if (bagMatch) bagIds.add(parseInt(bagMatch[1]));
                    
                    const pouchMatch = key.match(/^pouch-(\d+)-/);
                    if (pouchMatch) pouchIds.add(parseInt(pouchMatch[1]));
                }
                
                const sortedBags = Array.from(bagIds).sort((a, b) => a - b);
                sortedBags.forEach(id => {
                    if (typeof renderBag === 'function') renderBag(id);
                });
                if (sortedBags.length > 0 && bagCountInput) {
                    bagCountInput.value = Math.max(...sortedBags);
                }
                
                const sortedPouches = Array.from(pouchIds).sort((a, b) => a - b);
                sortedPouches.forEach(id => {
                    if (typeof renderPouch === 'function') renderPouch(id);
                });
                if (sortedPouches.length > 0 && pouchCountInput) {
                    pouchCountInput.value = Math.max(...sortedPouches);
                }

                // Populate form fields
                for (const [key, value] of Object.entries(parsedData)) {
                    // Skip 'class' as we already set it
                    if (key === 'class') continue;
                    
                    const input = charForm.elements[key];
                    if (input) {
                        if (input instanceof RadioNodeList) {
                            input.value = value;
                        } else {
                            if (input.type === 'checkbox') {
                                input.checked = (value === 'on');
                            } else {
                                input.value = value;
                            }
                        }
                    }
                }
                
                // --- HUD Field Restoration (Dynamic discovery) ---
                const hudInputs = document.querySelectorAll('#combat-utilities-container input, .sticky-vitality-hud input');
                hudInputs.forEach(el => {
                    const name = el.getAttribute('name') || el.id;
                    if (name && parsedData[name] !== undefined) {
                        if (el.type === 'checkbox') {
                            el.checked = (parsedData[name] === 'on');
                        } else {
                            el.value = parsedData[name];
                        }
                        // Trigger events to update UI
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
                
                // Re-attach listeners to any dynamic HUD elements
                if (typeof attachHUDListeners === 'function') attachHUDListeners();
                
                // Disable roll button if already rolled
                if (parsedData.ageRolled === 'true') {
                    const rollAgeBtn = document.getElementById('roll-age-btn');
                    if (rollAgeBtn) {
                        rollAgeBtn.disabled = true;
                        rollAgeBtn.style.opacity = '0.5';
                        rollAgeBtn.style.cursor = 'not-allowed';
                        rollAgeBtn.textContent = 'Rolled';
                    }
                }
                // Handle secondary class if it exists
                const savedSecondaryClass = parsedData['class_secondary'];
                const primaryExpCap = parsedData['primary_exp_cap'];
                const multiclassChoiceMade = parsedData['multiclass_choice_made'];
                const multiclassOptOut = parsedData['multiclass_opt_out'];
                
                if (primaryExpCap) {
                    const primaryCapInput = document.getElementById('primary-class-exp-cap');
                    if (primaryCapInput) primaryCapInput.value = primaryExpCap;
                }
                
                if (multiclassChoiceMade) {
                    const choiceMadeInput = document.getElementById('multiclass-choice-made');
                    if (choiceMadeInput) choiceMadeInput.value = multiclassChoiceMade;
                }
                
                if (multiclassOptOut) {
                    const optOutInput = document.getElementById('multiclass-opt-out');
                    if (optOutInput) optOutInput.value = multiclassOptOut;
                }

                const savedSecondaryRank = parsedData['rank_secondary'];
                const savedHeritage = parsedData['heritage'];
                if (savedHeritage) {
                    const heritageInput = document.getElementById('char-heritage');
                    if (heritageInput) {
                        heritageInput.value = savedHeritage;
                        
                        // Update Custom UI if it exists
                        const heritageSelectedText = document.getElementById('heritage-selected-text');
                        const customOption = document.querySelector(`#heritage-options .custom-option[data-value="${savedHeritage}"]`);
                        if (heritageSelectedText && customOption) {
                            heritageSelectedText.innerHTML = customOption.innerHTML;
                            document.querySelectorAll('#heritage-options .custom-option').forEach(opt => opt.classList.remove('selected'));
                            customOption.classList.add('selected');
                        }
                    }
                }

                const savedSize = parsedData['size'];
                if (savedSize) {
                    const sizeInput = document.getElementById('char-size');
                    if (sizeInput) {
                        sizeInput.value = savedSize;
                        
                        const sizeSelectedText = document.getElementById('size-selected-text');
                        const customOption = document.querySelector(`#size-options .custom-option[data-value="${savedSize}"]`);
                        if (sizeSelectedText && customOption) {
                            sizeSelectedText.innerHTML = customOption.innerHTML;
                            document.querySelectorAll('#size-options .custom-option').forEach(opt => opt.classList.remove('selected'));
                            customOption.classList.add('selected');
                        }
                    }
                }

                if (savedSecondaryRank) {
                    const secondaryRankInput = document.getElementById('char-rank-2');
                    if (secondaryRankInput) secondaryRankInput.value = savedSecondaryRank;
                }

                if (savedSecondaryClass) {
                    const secondaryClassSelect = document.getElementById('char-class-2');
                    if (secondaryClassSelect) {
                        document.querySelectorAll('.secondary-class-toggle').forEach(el => el.style.display = 'block');
                        secondaryClassSelect.value = savedSecondaryClass;
                        
                        // Update Custom UI
                        const class2SelectedText = document.getElementById('class-2-selected-text');
                        const customOption = document.querySelector(`#class-2-options .custom-option[data-value="${savedSecondaryClass}"]`);
                        if (class2SelectedText && customOption) {
                            class2SelectedText.innerHTML = customOption.innerHTML;
                            document.querySelectorAll('#class-2-options .custom-option').forEach(opt => opt.classList.remove('selected'));
                            customOption.classList.add('selected');
                        }

                        // Update class display
                        if (typeof updateClassDisplay === 'function') {
                            updateClassDisplay();
                        }
                    }
                }

            } catch (e) {
                console.error("Error parsing saved character data", e);
            }
        }
        
        // Age Bonuses
        const heritage = document.getElementById('char-heritage')?.value || 'h1';
        const age = parseInt(document.getElementById('char-age')?.value) || 0;
        const maxAge = { 'h1': 100, 'h2': 80, 'h3': 90, 'h4': 60 }[heritage] || 100;
        const third = maxAge / 3;
        
        let ageCategory = 'young';
        if (age >= Math.floor(third * 2) + 1) ageCategory = 'elderly';
        else if (age >= Math.floor(third) + 1) ageCategory = 'middle';
        
        const ageStatBonus = (ageCategory === 'middle' || ageCategory === 'elderly') ? 1 : 0;
        const ageConBonus = (ageCategory === 'young' || ageCategory === 'middle') ? 1 : 0;
        
        let totalSpent = 0;
        const STAT_NAMES_INIT = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        STAT_NAMES_INIT.forEach(stat => {
            const input = document.getElementById(`stat-${stat}`);
            if (input) {
                const baseValue = (stat === 'con') ? 9 + ageConBonus : 9;
                let purchased = Math.max(0, (parseInt(input.value) || 0) - baseValue);
                input.setAttribute('data-purchased', purchased);
                totalSpent += purchased;
            }
        });
        
        const spentExpValue = parseInt(document.getElementById('char-spent-exp')?.value) || 0;
        const primaryCapValue = parseInt(document.getElementById('primary-class-exp-cap')?.value) || 0;
        
        let calculatedLevel = 0;
        let secondaryLevel = 0;
        
        if (primaryCapValue === 0) {
            calculatedLevel = Math.min(10, Math.floor(spentExpValue / 500));
        } else {
            calculatedLevel = Math.min(10, Math.floor(primaryCapValue / 500));
            secondaryLevel = Math.min(10, Math.floor((spentExpValue - primaryCapValue) / 500));
        }

        const totalAllowedPoints = MAX_STARTING_POINTS + ((calculatedLevel + secondaryLevel) * 2) + ageStatBonus;
        
        if (totalSpent > totalAllowedPoints) {
            console.warn("Legacy data detected or invalid points. Resetting stats to base 9.");
            STAT_NAMES_INIT.forEach(stat => {
                const input = document.getElementById(`stat-${stat}`);
                if (input) input.value = 9;
            });
        }

        // Update the points UI after loading
        if (typeof updateStatPointsDisplay === 'function') {
            updateStatPointsDisplay();
        }

        // Update vitality summary badge
        if (typeof updateVitalitySummary === 'function') {
            updateVitalitySummary();
        }

        // Update conditions badge
        if (typeof updateConditionsBadge === 'function') {
            updateConditionsBadge();
        }
        
        // Update Info title
        if (typeof updateInfoTitle === 'function') {
            updateInfoTitle();
        }
    };

    const saveCharacterData = (showStatus = true) => {
        // 1. Ensure ID exists for gallery tracking
        const idInput = document.getElementById('char-id');
        if (idInput && !idInput.value) {
            idInput.value = 'char-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }

        const formData = new FormData(charForm);
        const charData = {};
        for (const [key, value] of formData.entries()) {
            charData[key] = value;
        }

        // --- HUD Field Collection (Dynamic discovery) ---
        const hudInputs = document.querySelectorAll('#combat-utilities-container input, .sticky-vitality-hud input');
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

        // 2. Save Active Character Data
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(charData));
        
        // 3. Sync with Gallery
        let gallery = JSON.parse(localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY) || '[]');
        const charId = charData['id'];
        
        if (charId) {
            const idx = gallery.findIndex(c => c.id === charId);
            if (idx >= 0) {
                gallery[idx] = charData;
            } else {
                // Check limit for new characters
                if (gallery.length >= 10) {
                    if (showStatus && saveStatus) {
                        saveStatus.textContent = "Gallery full (Max 10). Delete a hero first!";
                        saveStatus.style.color = "#ef4444";
                        saveStatus.classList.add('show');
                        setTimeout(() => {
                            saveStatus.classList.remove('show');
                            saveStatus.style.color = "";
                        }, 4000);
                    }
                    return;
                }
                gallery.push(charData);
            }
            localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(gallery));
        }

        // 4. Update UI Displays
        updateGalleryUI();
        
        // Show Autosave Indicator (Silent Feedback)
        const autoIndicator = document.getElementById('autosave-indicator');
        if (autoIndicator) {
            autoIndicator.classList.add('visible');
            setTimeout(() => {
                autoIndicator.classList.remove('visible');
            }, 1500);
        }

        // 5. Show Status Message (Explicit Save Feedback)
        if (showStatus && saveStatus) {
            saveStatus.textContent = 'Character Saved to Gallery!';
            saveStatus.style.color = "";
            saveStatus.classList.add('show');
            setTimeout(() => {
                saveStatus.classList.remove('show');
            }, 3000);
        }
    };

    // --- End Character Gallery Logic ---

    charForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCharacterData();
    });

    // --- Damage Calculator Logic ---
    const applyDamageBtn = document.getElementById('apply-damage-btn');
    const incomingInput = document.getElementById('incoming-damage');

    if (applyDamageBtn && incomingInput) {
        const processDamage = () => {
            const hpInput = document.getElementById('char-hp');
            const drInput = document.getElementById('char-dr');
            const tempHpInput = document.getElementById('char-temp-hp');
            
            if (!incomingInput || !hpInput || !drInput || !tempHpInput) return;

            let damage = parseInt(incomingInput.value) || 0;
            const dr = parseInt(drInput.value) || 0;
            let tempHp = parseInt(tempHpInput.value) || 0;
            let hp = parseInt(hpInput.value) || 0;
            
            if (damage <= 0) return;

            // 1. Reduce damage by DR
            damage = Math.max(0, damage - dr);
            
            if (damage > 0) {
                // 2. Take from Temp HP first
                if (tempHp > 0) {
                    const absorbed = Math.min(tempHp, damage);
                    tempHp -= absorbed;
                    damage -= absorbed;
                    tempHpInput.value = tempHp;
                }
                
                // 3. Take from Max HP (Wounds)
                if (damage > 0) {
                    hp = Math.max(0, hp - damage);
                    hpInput.value = hp;
                }
            }
            
            incomingInput.value = '';
            saveCharacterData(); // Persist changes
            
            // Trigger HUD and Summary updates (use window.updateHUD since it's in a separate DOMContentLoaded scope)
            if (typeof window.updateVitalitySummary === 'function') window.updateVitalitySummary();
            if (typeof window.updateHUD === 'function') window.updateHUD();
        };

        applyDamageBtn.addEventListener('click', processDamage);

        // Allow Enter key to apply damage - stop propagation so form submit doesn't intercept it
        incomingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                e.stopPropagation();
                processDamage();
            }
        });
    }

    // --- Restoration Logic ---
    const rollHealingBtns = document.querySelectorAll('.roll-h-die');
    const healingResultSpan = document.getElementById('healing-roll-result');
    const applyHealingHpBtn = document.getElementById('apply-healing-hp');
    const applyHealingManaBtn = document.getElementById('apply-healing-mana');
    const healingDiceInput = document.getElementById('char-healing-dice');
    const diceBadge = document.getElementById('dice-count-badge');

    const coreTab = document.getElementById('tab-core');
    let currentHealingRoll = 0;
    let healingDiceUsedInSession = false;
    
    const showRestToast = (message, element) => {
        // Remove existing toasts first to prevent stacking
        document.querySelectorAll('.rest-toast').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = 'rest-toast';
        toast.textContent = message;
        
        const rect = element.getBoundingClientRect();
        toast.style.position = 'fixed';
        toast.style.top = `${rect.top - 40}px`;
        toast.style.left = `${rect.left + rect.width / 2}px`;
        toast.style.zIndex = '100000'; // Higher than HUD
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    };

    const updateDiceBadge = () => {
        if (diceBadge && healingDiceInput) {
            diceBadge.textContent = healingDiceInput.value;
        }
    };

    if (healingDiceInput) {
        healingDiceInput.addEventListener('input', updateDiceBadge);
        // We also need to update it when data is loaded
        const observer = new MutationObserver(updateDiceBadge);
        observer.observe(healingDiceInput, { attributes: true });
        updateDiceBadge(); 
    }

    rollHealingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Only allow rolling while the combat tab is shaded for sleep/rest
            if (coreTab && !coreTab.classList.contains('shade-active')) {
                showRestToast("You must SLEEP first to use dice", btn);
                return;
            }

            // Check if we have any dice left before rolling
            const diceCount = parseInt(healingDiceInput?.value) || 0;
            if (diceCount <= 0) {
                showRestToast("No healing dice remaining", btn);
                return;
            }

            // Prevent rerolling before spending current result
            if (currentHealingRoll !== 0) {
                showRestToast("Spend current result first", btn);
                return;
            }

            // Check hunger/thirst
            const hungerCheck = document.getElementById('char-hungry');
            const thirstCheck = document.getElementById('char-thirst');
            if ((hungerCheck && hungerCheck.checked) || (thirstCheck && thirstCheck.checked)) {
                showRestToast("You cannot use healing dice due to hunger or thirst", btn);
                return;
            }

            const sides = parseInt(btn.getAttribute('data-sides')) || 6;
            const roll = Math.floor(Math.random() * sides) + 1;
            
            // Get Constitution Modifier
            const conInput = document.getElementById('stat-con');
            const conValue = parseInt(conInput?.value) || 10;
            const conMod = Math.floor((conValue - 10) / 2);
            
            // Final result = Roll + CON Mod (Minimum 1)
            const finalResult = Math.max(1, roll + conMod);
            
            currentHealingRoll = finalResult;
            if (healingResultSpan) {
                healingResultSpan.textContent = finalResult;
                healingResultSpan.style.transform = 'scale(1.2)';
                setTimeout(() => healingResultSpan.style.transform = 'scale(1)', 150);
            }
        });
    });

    const applyRestoration = (type) => {
        const btn = type === 'hp' ? applyHealingHpBtn : applyHealingManaBtn;

        // Only allow applying while the combat tab is shaded
        if (coreTab && !coreTab.classList.contains('shade-active')) {
            showRestToast("You must SLEEP first to apply healing", btn);
            return;
        }

        // Check hunger/thirst
        const hungerCheck = document.getElementById('char-hungry');
        const thirstCheck = document.getElementById('char-thirst');
        if ((hungerCheck && hungerCheck.checked) || (thirstCheck && thirstCheck.checked)) {
            showRestToast("You cannot use healing dice due to hunger or thirst", btn);
            return;
        }

        const diceCount = parseInt(healingDiceInput?.value) || 0;
        if (diceCount <= 0) {
            showRestToast("No healing dice remaining", btn);
            return;
        }

        if (currentHealingRoll === 0) {
            showRestToast("Roll a die first", btn);
            return;
        }

        if (type === 'hp') {
            const hpInput = document.getElementById('char-hp');
            if (hpInput) {
                hpInput.value = (parseInt(hpInput.value) || 0) + currentHealingRoll;
                hpInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else if (type === 'mana') {
            const manaInput = document.getElementById('char-mana');
            if (manaInput) {
                manaInput.value = (parseInt(manaInput.value) || 0) + currentHealingRoll;
                manaInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Spend dice
        if (healingDiceInput) {
            healingDiceInput.value = diceCount - 1;
            updateDiceBadge();
            healingDiceUsedInSession = true;
        }
        
        // Reset
        currentHealingRoll = 0;
        if (healingResultSpan) healingResultSpan.textContent = '--';
        
        saveCharacterData();
    };

    if (applyHealingHpBtn) {
        applyHealingHpBtn.addEventListener('click', () => applyRestoration('hp'));
    }
    if (applyHealingManaBtn) {
        applyHealingManaBtn.addEventListener('click', () => applyRestoration('mana'));
    }

    const restBtn = document.getElementById('rest-btn');
    if (restBtn) {
        restBtn.addEventListener('click', () => {
            const level1 = parseInt(document.getElementById('char-level')?.value) || 0;
            const level2 = parseInt(document.getElementById('char-level-2')?.value) || 0;
            const totalLevel = level1 + level2;

            if (healingDiceInput) {
                // Healing dice scale as Level + 1
                healingDiceInput.value = totalLevel + 1;
                updateDiceBadge();
            }

            saveCharacterData();
        });
    }

    const shortRestBtn = document.getElementById('short-rest-btn');

    if (shortRestBtn && coreTab) {
        shortRestBtn.addEventListener('click', () => {
            const isShaded = coreTab.classList.contains('shade-active');
            
            if (!isShaded) {
                // --- PHASE 1: ENTER SLEEP MODE ---
                coreTab.classList.add('shade-active');
                shortRestBtn.innerHTML = '<i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> PROCEED';
                shortRestBtn.style.background = '#475569'; // Slate-gray confirmation color
                shortRestBtn.style.borderColor = '#475569';
                healingDiceUsedInSession = false; // Reset for this rest session
                
                if (window.lucide) window.lucide.createIcons();
            } else {
                // --- PHASE 2: FINALIZE SLEEP ---
                
                // 1. Apply passive recovery bonus if NO healing dice were used
                if (!healingDiceUsedInSession) {
                    const conInput = document.getElementById('stat-con');
                    const conValue = parseInt(conInput?.value) || 10;
                    const conMod = Math.floor((conValue - 10) / 2);
                    const recoveryBonus = Math.max(1, 1 + conMod);

                    const hpInput = document.getElementById('char-hp');
                    if (hpInput) {
                        hpInput.value = (parseInt(hpInput.value) || 0) + recoveryBonus;
                        hpInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }

                // 2. Remove one level of exhaustion (unless ILL)
                const illCheck = document.getElementById('char-ill');
                const isIll = illCheck && illCheck.checked;
                
                if (!isIll) {
                    for (let i = 7; i >= 1; i--) {
                        const exCheck = document.getElementById(`char-ex-${i}`);
                        if (exCheck && exCheck.checked) {
                            exCheck.checked = false;
                            // Trigger change to update dice roller if active
                            exCheck.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                }

                // 3. Toggle Hungry and Thirsty ON
                const hungerCheck = document.getElementById('char-hungry') || document.querySelector('input[name="cond_hungry"]');
                const thirstCheck = document.getElementById('char-thirst') || document.querySelector('input[name="cond_thirsty"]');
                
                if (hungerCheck) {
                    hungerCheck.checked = true;
                    hungerCheck.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (thirstCheck) {
                    thirstCheck.checked = true;
                    thirstCheck.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // 4. Cleanup UI
                coreTab.classList.remove('shade-active');
                shortRestBtn.innerHTML = '<i data-lucide="moon" style="width: 14px; height: 14px;"></i> SLEEP';
                shortRestBtn.style.background = ''; // Reset to default CSS
                shortRestBtn.style.borderColor = '';
                
                if (window.lucide) window.lucide.createIcons();
                saveCharacterData();
            }
        });

        // Optional: Cancel sleep if clicking the overlay
        const overlay = document.querySelector('.combat-shade-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                coreTab.classList.remove('shade-active');
                proceedSleepBtn.style.display = 'none';
            });
        }
    }

    // --- Stat Points Logic ---
    const STAT_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const MAX_STARTING_POINTS = 3;
    let availablePoints = MAX_STARTING_POINTS;
    let sessionStatPointsSpent = {};
    
    const pointsDisplay = document.getElementById('available-points');
    const plusBtns = document.querySelectorAll('.stat-btn.plus');
    const minusBtns = document.querySelectorAll('.stat-btn.minus');
    
    const levelInput = document.getElementById('char-level');
    const expInput = document.getElementById('char-exp');
    const addExpInput = document.getElementById('add-exp');
    const heritageSelect = document.getElementById('char-heritage');
    const ageInput = document.getElementById('char-age');
    const ageStageDisplay = document.getElementById('current-age-stage');
    const ageBonusDesc = document.getElementById('age-bonus-desc');

    const HERITAGE_MAX_AGES = {
        'h1': 100,
        'h2': 80,
        'h3': 90,
        'h4': 60
    };

    const updateStatPointsDisplay = () => {
        const spentExpInput = document.getElementById('char-spent-exp');
        const spentExpValue = parseInt(spentExpInput?.value) || 0;
        const multiclassChoiceMade = document.getElementById('multiclass-choice-made');
        const multiclassModal = document.getElementById('multiclass-modal');
        const multiclassOptOut = document.getElementById('multiclass-opt-out');

        // Multiclass Trigger: Must happen at 3000 Spent EXP
        if (spentExpValue >= 3000 && multiclassChoiceMade && multiclassChoiceMade.value === 'false' && multiclassModal) {
            multiclassModal.style.display = 'flex';
        }

        // Show/Hide Secondary Class Fields and Reposition Damage Card
        const damageCard = document.querySelector('.damage-calc-form-group');
        if (multiclassChoiceMade && multiclassChoiceMade.value === 'true' && multiclassOptOut && multiclassOptOut.value === 'false') {
            document.querySelectorAll('.secondary-class-toggle').forEach(el => el.style.display = 'block');
            if (damageCard) damageCard.classList.remove('no-secondary');
        } else {
            document.querySelectorAll('.secondary-class-toggle').forEach(el => el.style.display = 'none');
            if (damageCard) damageCard.classList.add('no-secondary');
        }

        if (!pointsDisplay) return;
        
        // Calculate Level from SPENT EXP: Level up every 500 EXP spent, max Level 10
        const primaryCapInput = document.getElementById('primary-class-exp-cap');
        const levelInput2 = document.getElementById('char-level-2');
        
        const currentHeritage = document.getElementById('char-heritage')?.value || 'h1';
        const heritageIndicator = document.getElementById('char-heritage-indicator');
        if (heritageIndicator) {
            const maxAge = HERITAGE_MAX_AGES[currentHeritage] || 100;
            heritageIndicator.textContent = `(Max ${maxAge})`;
        }

        const primaryCapValue = parseInt(primaryCapInput?.value) || 0;
        
        let calculatedLevel = 0;
        let secondaryLevel = 0;
        
        if (primaryCapValue === 0) {
            // Still on primary class only
            calculatedLevel = Math.min(10, Math.floor(spentExpValue / 500));
            secondaryLevel = 0;
        } else {
            // Multiclassing active: Each class capped at Level 5 (Total Level 10)
            calculatedLevel = Math.min(5, Math.floor(primaryCapValue / 500));
            secondaryLevel = Math.min(5, Math.floor((spentExpValue - primaryCapValue) / 500));
        }

        if (levelInput) levelInput.value = calculatedLevel;
        if (levelInput2) levelInput2.value = secondaryLevel;

        // Update Next Level EXP Display
        const nextLevelExpSpan = document.getElementById('next-level-exp');
        if (nextLevelExpSpan) {
            const totalLevel = calculatedLevel + secondaryLevel;
            
            if (totalLevel >= 10) {
                nextLevelExpSpan.textContent = 'MAX LEVEL';
            } else {
                const nextLevelTarget = (totalLevel + 1) * 500;
                const needed = nextLevelTarget - spentExpValue;
                nextLevelExpSpan.textContent = `Next Level: ${needed}`;
            }
        }

        // Class Evolution Upgrade at Level 4
        const classSelect = document.getElementById('char-class');
        const classSelect2 = document.getElementById('char-class-2');
        
        const CLASS_UPGRADES = {
            'Barbarian': 'Berserker',
            'Druid': 'Ovate',
            'Fighter': 'Warrior',
            'Monk': 'Disciple',
            'Paladin': 'Templar',
            'Ranger': 'Strider',
            'Rogue': 'Artist',
            'Sorcerer': 'Savant',
            'Wizard': 'Scholar'
        };

        const updateClassOptionNames = (selectId, wrapperId, level) => {
            const select = document.getElementById(selectId);
            const wrapper = document.getElementById(wrapperId);
            if (!select) return;
            
            if (select.tagName === 'SELECT') {
                Array.from(select.options).forEach(opt => {
                    const baseName = opt.value;
                    const upgradeName = CLASS_UPGRADES[baseName];
                    if (upgradeName) {
                        opt.textContent = (level >= 4) ? upgradeName : baseName;
                    }
                });
            }

            // Sync with Custom Select UI
            if (wrapper) {
                const customOptions = wrapper.querySelectorAll('.custom-option');
                customOptions.forEach(opt => {
                    const baseName = opt.getAttribute('data-value');
                    if (baseName) {
                        const upgradeName = CLASS_UPGRADES[baseName];
                        if (upgradeName) {
                            opt.textContent = (level >= 4) ? upgradeName : baseName;
                        }
                    }
                });

                // Update the displayed trigger text
                const triggerText = wrapper.querySelector('.custom-select-trigger span');
                const selectedValue = select.value;
                if (triggerText && selectedValue) {
                    const upgradeName = CLASS_UPGRADES[selectedValue];
                    if (upgradeName) {
                        triggerText.textContent = (level >= 4) ? upgradeName : selectedValue;
                    }
                }
            }
        };
        
        updateClassOptionNames('char-class', 'class-select-wrapper', calculatedLevel);
        updateClassOptionNames('char-class-2', 'class-2-select-wrapper', secondaryLevel);
        
        // Age & Heritage Logic
        const heritage = heritageSelect?.value || 'h1';
        const age = parseInt(ageInput?.value) || 0;
        const maxAge = HERITAGE_MAX_AGES[heritage] || 100;
        const third = maxAge / 3;
        
        let ageCategory = 'young';
        let stageName = 'Young Adult';
        let bonusText = '+1 Constitution';
        
        if (age >= Math.floor(third * 2) + 1) {
            ageCategory = 'elderly';
            stageName = 'Elderly';
            bonusText = '+1 Stat Point';
        } else if (age >= Math.floor(third) + 1) {
            ageCategory = 'middle';
            stageName = 'Middle Aged';
            bonusText = '+1 CON, +1 Stat Point';
        }
        
        const lifeStageIndicator = document.getElementById('char-life-stage-indicator');
        if (lifeStageIndicator) {
            lifeStageIndicator.textContent = `${stageName} (${bonusText})`;
        }
        
        // Age Bonuses
        const ageStatBonus = (ageCategory === 'middle' || ageCategory === 'elderly') ? 1 : 0;
        const ageConBonus = (ageCategory === 'young' || ageCategory === 'middle') ? 1 : 0;
        
        const totalAllowedPoints = MAX_STARTING_POINTS + ((calculatedLevel + secondaryLevel) * 2) + ageStatBonus;
        
        let totalSpent = 0;
        STAT_NAMES.forEach(stat => {
            const input = document.getElementById(`stat-${stat}`);
            if (input) {
                const baseValue = (stat === 'con') ? 9 + ageConBonus : 9;
                
                let purchased = input.getAttribute('data-purchased');
                if (purchased === null) {
                    purchased = Math.max(0, (parseInt(input.value) || 9) - baseValue);
                    input.setAttribute('data-purchased', purchased);
                } else {
                    purchased = parseInt(purchased) || 0;
                }
                
                const value = baseValue + purchased;
                input.value = value;
                totalSpent += purchased;
                
                // Calculate and update modifier based directly on the visible value
                const modValue = Math.floor((value - 10) / 2);
                
                const modDisplay = document.getElementById(`mod-${stat}`);
                const modText = (modValue >= 0 ? '+' : '') + modValue;
                if (modDisplay) {
                    modDisplay.textContent = modText;
                    if (stat === 'con' && ageConBonus > 0) {
                        modDisplay.style.color = 'var(--accent-secondary)';
                    } else {
                        modDisplay.style.color = '#ffffff';
                    }
                }

                // Update header summary
                const summaryItem = document.querySelector(`.summary-item[data-stat="${stat}"]`);
                if (summaryItem) {
                    const valEl = summaryItem.querySelector('.val');
                    const modEl = summaryItem.querySelector('.mod');
                    if (valEl) valEl.textContent = value;
                    if (modEl) modEl.textContent = `(${modText})`;
                }
            }
        });
        
        availablePoints = totalAllowedPoints - totalSpent;
        if (pointsDisplay) {
            pointsDisplay.textContent = availablePoints;
        }
        
        const tooltipPointsVal = document.getElementById('tooltip-points-val');
        if (tooltipPointsVal) {
            tooltipPointsVal.textContent = availablePoints;
        }
        
        // Toggle body class for conditional HUD elements
        if (availablePoints > 0) {
            document.body.classList.add('has-available-points');
        } else {
            document.body.classList.remove('has-available-points');
            // Also reset dismissal when points are gone so it can reappear next level
            document.body.classList.remove('stat-tooltip-dismissed');
        }
        
        const statPointsContainer = document.querySelector('.stat-points-display');
        if (statPointsContainer) {
            if (availablePoints <= 0) {
                statPointsContainer.classList.add('hidden');
            } else {
                statPointsContainer.classList.remove('hidden');
            }
        }
        
        // Update the HUD status if it exists
        if (typeof updateHUD === 'function') updateHUD();
        
        // Update button visibility
        plusBtns.forEach(btn => {
            if (availablePoints > 0) {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.style.opacity = '0';
                btn.style.pointerEvents = 'none';
            }
        });
        
        minusBtns.forEach(btn => {
            const stat = btn.getAttribute('data-stat');
            const input = document.getElementById(`stat-${stat}`);
            if (input) {
                const baseValue = (stat === 'con') ? 9 + ageConBonus : 9;
                const isAtBase = parseInt(input.value) <= baseValue;
                
                // Only show minus if we have points in the pool AND we have something to refund
                if (availablePoints > 0 && !isAtBase) {
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                } else {
                    btn.style.opacity = '0';
                    btn.style.pointerEvents = 'none';
                }
            }
        });
        
        // Update Armour Class (Base 8 + DEX Mod)
        const dexInput = document.getElementById('stat-dex');
        const acInput = document.getElementById('char-ac');
        if (dexInput && acInput) {
            const dexValue = parseInt(dexInput.value) || 9;
            const dexMod = Math.floor((dexValue - 10) / 2);
            acInput.value = 8 + dexMod;
        }
    };

    if (expInput) {
        expInput.addEventListener('input', updateStatPointsDisplay);
        expInput.addEventListener('click', () => {
            const expActions = document.getElementById('exp-actions-container');
            if (expActions) {
                const isHidden = expActions.style.display === 'none';
                expActions.style.display = isHidden ? 'block' : 'none';
            }
        });
    }
    if (heritageSelect) heritageSelect.addEventListener('change', updateStatPointsDisplay);
    if (ageInput) ageInput.addEventListener('input', updateStatPointsDisplay);

    if (addExpInput) {
        addExpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                const amountToAdd = parseInt(addExpInput.value) || 0;
                if (amountToAdd !== 0) {
                    const currentExp = parseInt(expInput.value) || 0;
                    expInput.value = currentExp + amountToAdd;
                    addExpInput.value = ''; // Clear the input
                    
                    // Hide the inputs again after adding
                    const expActions = document.getElementById('exp-actions-container');
                    if (expActions) expActions.style.display = 'none';
                    
                    updateStatPointsDisplay();
                    
                    // Optional: Visual feedback
                    addExpInput.style.borderColor = 'var(--accent-primary)';
                    setTimeout(() => addExpInput.style.borderColor = 'var(--accent-secondary)', 300);
                }
            }
        });
    }

    const spendExpInput = document.getElementById('spend-exp');
    if (spendExpInput) {
        spendExpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const amountToSpend = parseInt(spendExpInput.value) || 0;
                if (amountToSpend !== 0) {
                    const currentExp = parseInt(expInput.value) || 0;
                    
                    // Only spend if they have enough
                    if (currentExp >= amountToSpend) {
                        expInput.value = currentExp - amountToSpend;
                        
                        // Increment total spent EXP
                        const spentExpInput = document.getElementById('char-spent-exp');
                        if (spentExpInput) {
                            const prevSpent = parseInt(spentExpInput.value) || 0;
                            spentExpInput.value = prevSpent + amountToSpend;
                        }
                        
                        spendExpInput.value = '';
                        
                        const expActions = document.getElementById('exp-actions-container');
                        if (expActions) expActions.style.display = 'none';
                        
                        updateStatPointsDisplay();
                        
                        spendExpInput.style.borderColor = 'var(--accent-primary)';
                        setTimeout(() => spendExpInput.style.borderColor = 'var(--accent-secondary)', 300);
                    } else {
                        // Not enough EXP feedback
                        spendExpInput.style.borderColor = '#ff4444';
                        setTimeout(() => spendExpInput.style.borderColor = 'var(--accent-secondary)', 300);
                    }
                }
            }
        });
    }

    // Age Roller Logic
    const rollAgeBtn = document.getElementById('roll-age-btn');
    if (rollAgeBtn) {
        rollAgeBtn.addEventListener('click', () => {
            if (ageInput && !rollAgeBtn.disabled) {
                // 1d100 + 17
                const roll = Math.floor(Math.random() * 100) + 1 + 17;
                ageInput.value = roll;
                
                // Update UI elements dependent on Age
                updateStatPointsDisplay();
                
                // Disable the button so it only works once
                rollAgeBtn.disabled = true;
                rollAgeBtn.style.opacity = '0.5';
                rollAgeBtn.style.cursor = 'not-allowed';
                rollAgeBtn.textContent = 'Rolled';
                
                const ageRolledFlag = document.getElementById('age-rolled-flag');
                if (ageRolledFlag) {
                    ageRolledFlag.value = 'true';
                }
            }
        });
    }

    // Bind event listeners to +/- buttons
    plusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (availablePoints > 0) {
                const stat = btn.getAttribute('data-stat');
                const input = document.getElementById(`stat-${stat}`);
                if (input) {
                    let purchased = parseInt(input.getAttribute('data-purchased')) || 0;
                    input.setAttribute('data-purchased', purchased + 1);
                    
                    // Track session spent points
                    sessionStatPointsSpent[stat] = (sessionStatPointsSpent[stat] || 0) + 1;
                    
                    updateStatPointsDisplay();
                    
                    // Show confirmation modal if points are exhausted
                    if (availablePoints <= 0 && Object.keys(sessionStatPointsSpent).length > 0) {
                        const confirmModal = document.getElementById('stat-confirm-modal');
                        if (confirmModal) confirmModal.style.display = 'flex';
                    }
                }
            }
        });
    });

    minusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const stat = btn.getAttribute('data-stat');
            const input = document.getElementById(`stat-${stat}`);
            if (input) {
                let purchased = parseInt(input.getAttribute('data-purchased')) || 0;
                if (purchased > 0) {
                    input.setAttribute('data-purchased', purchased - 1);
                    
                    // Adjust session tracking if applicable
                    if (sessionStatPointsSpent[stat]) {
                        sessionStatPointsSpent[stat]--;
                        if (sessionStatPointsSpent[stat] <= 0) {
                            delete sessionStatPointsSpent[stat];
                        }
                    }
                    
                    updateStatPointsDisplay();
                }
            }
        });
    });

    // Stat Confirmation Modal Handlers
    const statConfirmModal = document.getElementById('stat-confirm-modal');
    const statConfirmYes = document.getElementById('stat-confirm-yes');
    const statConfirmNo = document.getElementById('stat-confirm-no');

    if (statConfirmModal && statConfirmYes && statConfirmNo) {
        statConfirmYes.addEventListener('click', () => {
            statConfirmModal.style.display = 'none';
            sessionStatPointsSpent = {}; // Clear session tracking
            saveCharacterData();
        });

        statConfirmNo.addEventListener('click', () => {
            statConfirmModal.style.display = 'none';
            
            // Revert spent points
            Object.keys(sessionStatPointsSpent).forEach(stat => {
                const input = document.getElementById(`stat-${stat}`);
                if (input) {
                    let purchased = parseInt(input.getAttribute('data-purchased')) || 0;
                    input.setAttribute('data-purchased', Math.max(0, purchased - sessionStatPointsSpent[stat]));
                }
            });
            
            sessionStatPointsSpent = {}; // Clear tracking
            updateStatPointsDisplay(); // Re-calculate HUD and available points
        });
    }

    // --- Newsletter Logic ---
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterStatus = document.getElementById('newsletter-status');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            
            const emailInput = document.getElementById('newsletter-email');
            const emailValue = emailInput?.value;

            if (emailValue) {
                // --- FormSubmit.co AJAX Integration ---
                fetch("https://formsubmit.co/ajax/freyanile1@gmail.com", {
                    method: "POST",
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        email: emailValue,
                        _subject: "New Deoch Character Sheet Subscriber!",
                        _template: "table"
                    })
                })
                .then(response => response.json())
                .then(data => {
                    newsletterForm.style.display = 'none';
                    if (newsletterStatus) {
                        newsletterStatus.style.display = 'block';
                        newsletterStatus.textContent = "Success! Check your inbox for confirmation.";
                    }
                })
                .catch(error => {
                    console.error('Newsletter Error:', error);
                    // Fallback UI
                    newsletterForm.style.display = 'none';
                    if (newsletterStatus) newsletterStatus.style.display = 'block';
                });
            }
        });
    }

    // --- Updates Card Click Handler ---
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.update-card');
        if (card) {
            const details = card.querySelector('details');
            if (details) {
                // Toggle open attribute
                // Since we set pointer-events: none on the summary in CSS,
                // this handler will catch all clicks on the card.
                details.open = !details.open;
            }
        }
    });

    // --- Import / Export Data Logic ---
    const toggleDataBtn = document.getElementById('toggle-data-btn');
    const dataSection = document.getElementById('data-transfer-section');
    const dataTransferArea = document.getElementById('char-data-transfer');
    const copyDataBtn = document.getElementById('copy-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const transferStatus = document.getElementById('transfer-status');

    if (toggleDataBtn && dataSection && dataTransferArea) {
        toggleDataBtn.addEventListener('click', () => {
            if (dataSection.style.display === 'none') {
                dataSection.style.display = 'block';
                // Populate the text area with current localStorage data
                const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (savedData) {
                    try {
                        const parsed = JSON.parse(savedData);
                        dataTransferArea.value = JSON.stringify(parsed, null, 2);
                    } catch (e) {
                        dataTransferArea.value = savedData;
                    }
                } else {
                    dataTransferArea.value = "";
                }
                transferStatus.textContent = "";
            } else {
                dataSection.style.display = 'none';
            }
        });

        copyDataBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(dataTransferArea.value);
                transferStatus.textContent = "Copied to clipboard!";
                transferStatus.style.color = "var(--accent-primary)";
            } catch (err) {
                console.error('Failed to copy via Clipboard API, falling back to execCommand: ', err);
                dataTransferArea.select();
                document.execCommand('copy');
                transferStatus.textContent = "Copied to clipboard!";
                transferStatus.style.color = "var(--accent-primary)";
            }
            setTimeout(() => { transferStatus.textContent = ""; }, 3000);
        });

        importDataBtn.addEventListener('click', () => {
            const importData = dataTransferArea.value.trim();
            if (!importData) {
                transferStatus.textContent = "Please paste data to import.";
                transferStatus.style.color = "#f87171";
                return;
            }

            try {
                // Validate that it's JSON
                JSON.parse(importData);
                localStorage.setItem(LOCAL_STORAGE_KEY, importData);
                transferStatus.textContent = "Import successful!";
                transferStatus.style.color = "var(--accent-primary)";
                setTimeout(() => {
                    if (typeof clearCharacterUI === 'function') clearCharacterUI();
                    if (typeof loadCharacterData === 'function') loadCharacterData();
                    // Close data section after success
                    if (dataSection) dataSection.style.display = 'none';
                }, 500);
            } catch (e) {
                transferStatus.textContent = "Invalid JSON data format.";
                transferStatus.style.color = "#f87171";
            }
        });
    }

    // --- Equipment Toggle Logic (delegated to catch dynamic bags/pouches) ---
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.equip-toggle-btn');
        if (toggleBtn) {
            const slot = toggleBtn.closest('.equipment-slot');
            if (!slot) return;
            const descWrapper = slot.querySelector('.equipment-desc-wrapper');
            if (descWrapper) {
                descWrapper.classList.toggle('hidden');
                toggleBtn.classList.toggle('open');
            }
        }
    });



    // --- Language Section Toggle ---
    const langHeader = document.getElementById('lang-header');
    const langContent = document.getElementById('lang-content');
    const langToggleBtn = document.getElementById('lang-toggle');
    
    if (langHeader && langContent) {
        langHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = langContent.classList.contains('expanded');
            const icon = langToggleBtn.querySelector('i, svg');
            
            if (!isExpanded) {
                langContent.classList.add('expanded');
                if (icon) icon.style.transform = 'rotate(180deg)';
            } else {
                langContent.classList.remove('expanded');
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
        });
    }

    // --- Restoration Section Toggle ---
    const restHeader = document.getElementById('restoration-header');
    const restContent = document.getElementById('restoration-content');
    const restToggleBtn = document.getElementById('restoration-toggle');
    
    if (restHeader && restContent) {
        restHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = restContent.classList.contains('expanded');
            const icon = restToggleBtn.querySelector('i, svg');
            
            if (!isExpanded) {
                restContent.classList.add('expanded');
                if (icon) icon.style.transform = 'rotate(180deg)';
            } else {
                restContent.classList.remove('expanded');
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
        });
    }

    // --- Damage Calculator Section Toggle ---
    const damageHeader = document.getElementById('damage-calc-header');
    const damageContent = document.getElementById('damage-calc-content');
    const damageToggleBtn = document.getElementById('damage-calc-toggle');
    const summaryDisplay = document.getElementById('damage-summary-display');
    
    if (damageHeader && damageContent) {
        // Update when values change
        const hpInput = document.getElementById('char-hp');
        const manaInput = document.getElementById('char-mana');
        const tempInput = document.getElementById('char-temp-hp');
        
        if (hpInput) hpInput.addEventListener('change', updateVitalitySummary);
        if (manaInput) manaInput.addEventListener('change', updateVitalitySummary);
        if (tempInput) tempInput.addEventListener('change', updateVitalitySummary);
        
        // Initial update
        updateVitalitySummary();

        damageHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = damageContent.classList.contains('expanded');
            const icon = damageToggleBtn.querySelector('i, svg');
            
            if (!isExpanded) {
                damageContent.classList.add('expanded');
                if (icon) icon.style.transform = 'rotate(180deg)';
                if (summaryDisplay) summaryDisplay.style.opacity = '0';
            } else {
                damageContent.classList.remove('expanded');
                if (icon) icon.style.transform = 'rotate(0deg)';
                if (summaryDisplay) summaryDisplay.style.opacity = '1';
                updateVitalitySummary();
            }
        });
    }

    // --- Conditions Section Toggle ---
    const condHeader = document.getElementById('conditions-header');
    const condContent = document.getElementById('conditions-content');
    const condToggleBtn = document.getElementById('conditions-toggle');
    const condBadgeContainer = document.getElementById('conditions-count-badge-container');
    
    const updateConditionsBadge = () => {
        const condBadge = document.getElementById('conditions-count-badge');
        const hudCondList = document.getElementById('hud-conditions-list');
        if (!condBadge || !condBadgeContainer || !condContent) return;

        let count = 0;
        let activeNames = [];

        // Count basic conditions
        document.querySelectorAll('.conditions-grid input[type="checkbox"]').forEach(cb => {
            if (cb.checked) {
                count++;
                const label = cb.closest('label')?.getAttribute('title');
                if (label) activeNames.push(label);
            }
        });

        // Count Hungry/Thirsty
        const hungry = document.getElementById('char-hungry');
        const thirsty = document.getElementById('char-thirst');
        if (hungry && hungry.checked) { count++; activeNames.push("Hungry"); }
        if (thirsty && thirsty.checked) { count++; activeNames.push("Thirsty"); }

        // Count Exhaustion
        let maxEx = 0;
        for (let i = 1; i <= 7; i++) {
            const ex = document.getElementById(`char-ex-${i}`);
            if (ex && ex.checked) maxEx = i;
        }
        if (maxEx > 0) { count++; activeNames.push(`Exhaustion ${maxEx}`); }

        condBadge.textContent = count;

        // Update exhaustion-specific badge (always visible when > 0, not just when collapsed)
        const exBadgeContainer = document.getElementById('exhaustion-badge-container');
        const exLevelBadge = document.getElementById('exhaustion-level-badge');
        if (exBadgeContainer && exLevelBadge) {
            if (maxEx > 0) {
                exLevelBadge.textContent = maxEx;
                exBadgeContainer.style.display = 'block';
            } else {
                exBadgeContainer.style.display = 'none';
            }
        }

        // Update HUD list
        if (hudCondList) {
            if (activeNames.length > 0) {
                hudCondList.innerHTML = activeNames.map(name => 
                    `<span style="font-size: 0.65rem; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 8px; border-radius: 4px; color: #f59e0b;">${name}</span>`
                ).join('');
            } else {
                hudCondList.innerHTML = '<span style="font-size: 0.65rem; opacity: 0.4; font-style: italic;">No active conditions</span>';
            }
        }

        // Show badge only when collapsed AND count > 0
        const isExpanded = condContent.classList.contains('expanded');
        if (!isExpanded && count > 0) {
            condBadgeContainer.style.display = 'block';
        } else {
            condBadgeContainer.style.display = 'none';
        }
    };



    if (condHeader && condContent) {
        condHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = condContent.classList.contains('expanded');
            const icon = condToggleBtn.querySelector('i, svg');
            
            if (!isExpanded) {
                condContent.classList.add('expanded');
                if (icon) icon.style.transform = 'rotate(180deg)';
            } else {
                condContent.classList.remove('expanded');
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
            updateConditionsBadge();
        });
    }

    // Update badge on any condition change
    document.querySelector('.conditions-panel')?.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            updateConditionsBadge();
        }
    });

    // --- Tab Navigation Logic ---
    // --- Section Toggles (Major/Minor Items) ---
    document.querySelectorAll('.section-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const target = document.getElementById(targetId);
            
            if (target) {
                target.classList.toggle('collapsed');
                btn.classList.toggle('collapsed');
            }
        });
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and hide all panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.style.display = 'none');
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show corresponding pane
            const targetPaneId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) {
                targetPane.style.display = 'block';
            }
        });
    });

    const inventoryBtns = document.querySelectorAll('.go-to-equipment-btn');
    inventoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const equipTabBtn = document.querySelector('.tab-btn[data-tab="tab-equipment"]');
            if (equipTabBtn) {
                equipTabBtn.click();
            }
        });
    });

    const returnToMainBtn = document.getElementById('return-to-main-btn');
    if (returnToMainBtn) {
        returnToMainBtn.addEventListener('click', () => {
            const mainTabBtn = document.querySelector('.tab-btn[data-tab="tab-core"]');
            if (mainTabBtn) {
                mainTabBtn.click();
            }
        });
    }

    // Initialize
    // loadCharacterData() moved to end of file to ensure all dynamic rendering functions are defined first

    // --- Spellbook Logic ---
    const CLASS_SPELLS = {
        'Barbarian': ['Primal Surge', 'Unstoppable Force', 'Bloodlust'], // Placeholders
        'Druid': ['Druidwill', 'Nadur', 'Meteor Swarm', 'Ironwood Form', 'Call Lightning'],
        'Fighter': ['Second Wind', 'Action Surge', 'Tactical Strike'], // Placeholders
        'Monk': ['Flurry of Blows', 'Stunning Strike', 'Ki Deflection'], // Placeholders
        'Paladin': ['Holy Weapon', 'Grant Experience', 'Divine Smite', 'Aura of Protection'],
        'Psychic': ['Mind Sliver', 'Telekinesis', 'Psychic Scream', 'Thought Shield'],
        'Ranger': ['Hunter\'s Mark', 'Pass without Trace', 'Zephyr Strike'], // Placeholders
        'Rogue': ['Sneak Attack', 'Cunning Action', 'Uncanny Dodge'], // Placeholders
        'Sorcerer': ['Invisibility', 'Prescience', 'Dust', 'Reverse Gravity', 'Time Stasis'],
        'Wizard': ['Magic Missile', 'Acid Splash', 'Detect Magic', 'Cradh', 'Weaken', 'Cadal', 'Slad']
    };

    window.renderSpellbook = () => {
        const classSelect1 = document.getElementById('char-class');
        const classSelect2 = document.getElementById('char-class-2');
        const spellbookContainer = document.getElementById('spellbook-container');
        const dynamicSpellGrid = document.getElementById('dynamic-spell-grid');
        const placeholder = document.getElementById('spellbook-placeholder');
        
        if (!classSelect1 || !dynamicSpellGrid || !spellbookContainer) return;
        
        const class1 = classSelect1.value;
        const class2 = classSelect2 ? classSelect2.value : '';
        
        const hasSpells1 = class1 && CLASS_SPELLS[class1] && CLASS_SPELLS[class1].length > 0;
        const hasSpells2 = class2 && CLASS_SPELLS[class2] && CLASS_SPELLS[class2].length > 0;

        if (hasSpells1 || hasSpells2) {
            spellbookContainer.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            dynamicSpellGrid.innerHTML = '';
            
            const renderClassSpells = (className, label) => {
                if (!className || !CLASS_SPELLS[className]) return;
                
                const column = document.createElement('div');
                column.className = 'spell-column';
                
                // Add Class Header
                const headerHtml = `
                    <div class="spell-column-header">
                        <span>${label}: ${className}</span>
                    </div>
                `;
                column.insertAdjacentHTML('beforeend', headerHtml);

                CLASS_SPELLS[className].forEach(spell => {
                    const spellId = `spell-${className.toLowerCase()}-${spell.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
                    const spellHtml = `
                        <div class="spell-slot glass-panel-dark">
                            <input type="checkbox" id="${spellId}" name="${spellId}" class="spell-checkbox">
                            <label for="${spellId}">${spell}</label>
                        </div>
                    `;
                    column.insertAdjacentHTML('beforeend', spellHtml);
                });
                
                dynamicSpellGrid.appendChild(column);
            };

            if (hasSpells1) renderClassSpells(class1, "Primary");
            if (hasSpells2) renderClassSpells(class2, "Secondary");
            
            // Add hover effect via JS
            const slots = dynamicSpellGrid.querySelectorAll('.spell-slot');
            slots.forEach(slot => {
                slot.addEventListener('mouseenter', () => slot.style.borderColor = 'var(--accent-primary)');
                slot.addEventListener('mouseleave', () => slot.style.borderColor = 'rgba(255, 255, 255, 0.05)');
            });
        } else {
            spellbookContainer.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
            dynamicSpellGrid.innerHTML = '';
        }

        // Refresh collapsible height if the test container is expanded
        const testContainer = document.getElementById('test-container-section');
        const testContent = document.getElementById('test-collapsible-area');
        if (testContainer && testContent && !testContainer.classList.contains('collapsed')) {
            testContent.style.maxHeight = testContent.scrollHeight + 'px';
        }
    };

    const classSelectNode1 = document.getElementById('char-class');
    const classSelectNode2 = document.getElementById('char-class-2');
    if (classSelectNode1) classSelectNode1.addEventListener('change', window.renderSpellbook);
    if (classSelectNode2) classSelectNode2.addEventListener('change', window.renderSpellbook);

    // --- Dynamic Bag Logic ---
    const addBagBtn = document.getElementById('add-bag-btn');
    const bagsContainer = document.getElementById('bags-container');
    const bagCountInput = document.getElementById('char-bag-count');

    window.renderBag = function(bagId) {
        // Prevent duplicate rendering
        if (document.querySelector(`.bag-container[data-bag-id="${bagId}"]`)) return;

        const bagDiv = document.createElement('div');
        bagDiv.className = 'bag-container glass-panel-dark';
        bagDiv.setAttribute('data-bag-id', bagId);
        bagDiv.style.padding = '1.5rem';
        bagDiv.style.position = 'relative';
        bagDiv.style.border = '1px solid var(--glass-border)';
        bagDiv.style.marginTop = '1rem';
        
        bagDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                <h4 style="margin: 0; color: var(--accent-primary); font-family: var(--font-secondary); font-size: 1.1rem;">Bag ${bagId}</h4>
                <button type="button" class="remove-bag-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.3s;">Remove Bag</button>
            </div>
            <div class="equipment-grid">
                ${[1, 2, 3, 4].map(slot => `
                    <div class="equipment-slot">
                        <div class="equipment-slot-header">
                            <input type="text" name="bag-${bagId}-slot-${slot}" placeholder="Bag Slot ${slot}">
                            <button type="button" class="equip-toggle-btn" title="Toggle Description"><i data-lucide="chevron-down"></i></button>
                        </div>
                        <div class="equipment-desc-wrapper hidden">
                            <textarea name="bag-${bagId}-desc-${slot}" rows="2" placeholder="Item description or notes..." class="equipment-desc"></textarea>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        if (bagsContainer) {
            bagsContainer.appendChild(bagDiv);
        }
        
        // Re-initialize icons for the new HTML
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

        // Add remove listener
        const removeBtn = bagDiv.querySelector('.remove-bag-btn');
        removeBtn.addEventListener('click', () => {
            bagDiv.remove();
        });
    }

    if (addBagBtn && bagCountInput) {
        addBagBtn.addEventListener('click', () => {
            let currentCount = parseInt(bagCountInput.value) || 0;
            currentCount++;
            bagCountInput.value = currentCount; // Update hidden input so it saves
            renderBag(currentCount);
        });
    }

    const addPouchBtn = document.getElementById('add-pouch-btn');
    const pouchCountInput = document.getElementById('char-pouch-count');

    window.renderPouch = function(pouchId) {
        // Prevent duplicate rendering
        if (document.querySelector(`.pouch-container[data-pouch-id="${pouchId}"]`)) return;

        const pouchDiv = document.createElement('div');
        pouchDiv.className = 'pouch-container glass-panel-dark';
        pouchDiv.setAttribute('data-pouch-id', pouchId);
        pouchDiv.style.padding = '1.5rem';
        pouchDiv.style.position = 'relative';
        pouchDiv.style.border = '1px solid var(--glass-border)';
        pouchDiv.style.marginTop = '1rem';
        
        pouchDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                <h4 style="margin: 0; color: var(--accent-secondary); font-family: var(--font-secondary); font-size: 1.1rem;">Pouch ${pouchId}</h4>
                <button type="button" class="remove-pouch-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.3s;">Remove Pouch</button>
            </div>
            <div class="equipment-grid">
                ${[1, 2].map(slot => `
                    <div class="equipment-slot">
                        <div class="equipment-slot-header">
                            <input type="text" name="pouch-${pouchId}-slot-${slot}" placeholder="Pouch Slot ${slot}">
                            <button type="button" class="equip-toggle-btn" title="Toggle Description"><i data-lucide="chevron-down"></i></button>
                        </div>
                        <div class="equipment-desc-wrapper hidden">
                            <textarea name="pouch-${pouchId}-desc-${slot}" rows="2" placeholder="Item description or notes..." class="equipment-desc"></textarea>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        if (bagsContainer) {
            bagsContainer.appendChild(pouchDiv);
        }
        
        // Re-initialize icons for the new HTML
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

        // Add remove listener
        const removeBtn = pouchDiv.querySelector('.remove-pouch-btn');
        removeBtn.addEventListener('click', () => {
            pouchDiv.remove();
        });
    }

    if (addPouchBtn && pouchCountInput) {
        addPouchBtn.addEventListener('click', () => {
            let currentCount = parseInt(pouchCountInput.value) || 0;
            currentCount++;
            pouchCountInput.value = currentCount; // Update hidden input so it saves
            renderPouch(currentCount);
        });
    }

    // --- Dice Roller Logic ---
    const diceBtns = document.querySelectorAll('.dice-btn:not(#adv-toggle)');
    const advToggle = document.getElementById('adv-toggle');
    const disToggle = document.getElementById('dis-toggle');
    const diceResultValue = document.getElementById('dice-result-value');
    const diceResultLabel = document.getElementById('dice-result-label');

    let lastDieType = null;
    let currentRolls = [];
    let lastAdvInfo = null;

    diceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sides = parseInt(btn.getAttribute('data-dice'));
            if (!sides) return;

            const isAdv = advToggle && advToggle.classList.contains('active');
            const isDis = disToggle && disToggle.classList.contains('active');

            // Generate random roll
            const r1 = Math.floor(Math.random() * sides) + 1;
            let roll = r1;
            
            if (isAdv || isDis) {
                const r2 = Math.floor(Math.random() * sides) + 1;
                roll = isAdv ? Math.max(r1, r2) : Math.min(r1, r2);
                lastAdvInfo = { type: isAdv ? 'Adv' : 'Dis', rolls: [r1, r2] };
                
                // Untoggle after use
                if (advToggle) advToggle.classList.remove('active');
                if (disToggle) disToggle.classList.remove('active');
            } else {
                lastAdvInfo = null;
            }
            
            // Handle multiple rolls of the same dice
            if (sides === lastDieType) {
                currentRolls.push(roll);
            } else {
                lastDieType = sides;
                currentRolls = [roll];
            }

            // Highlight the clicked dice
            diceBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            updateDiceDisplay();
            
            // Add pop animation
            diceResultValue.style.transform = 'scale(1.3)';
            setTimeout(() => {
                diceResultValue.style.transform = 'scale(1)';
            }, 150);
        });
    });

    if (advToggle) {
        advToggle.addEventListener('click', () => {
            advToggle.classList.toggle('active');
            if (disToggle) disToggle.classList.remove('active');
        });
    }
    if (disToggle) {
        disToggle.addEventListener('click', () => {
            disToggle.classList.toggle('active');
            if (advToggle) advToggle.classList.remove('active');
        });
    }

    const updateDiceDisplay = () => {
        const sides = lastDieType;
        const activeModBtn = document.querySelector('.mod-btn.active');
        
        if (!sides) {
            if (activeModBtn) {
                const stat = activeModBtn.getAttribute('data-stat');
                const modDisplay = document.getElementById(`mod-${stat}`);
                const val = modDisplay ? modDisplay.textContent : '0';
                diceResultLabel.textContent = `Pre-selected ${stat.toUpperCase()}`;
                diceResultValue.textContent = (val >= 0 ? '+' : '') + val;
            }
            return;
        }

        const baseSum = currentRolls.reduce((a, b) => a + b, 0);
        
        // Count active exhaustion levels
        let exhaustionPenalty = 0;
        for (let i = 1; i <= 7; i++) {
            const exCheck = document.getElementById(`char-ex-${i}`);
            if (exCheck && exCheck.checked) {
                exhaustionPenalty--;
            }
        }
        
        // Check for active modifier
        let modValue = 0;
        let modText = '';
        
        if (activeModBtn) {
            const stat = activeModBtn.getAttribute('data-stat');
            const modDisplay = document.getElementById(`mod-${stat}`);
            if (modDisplay) {
                modValue = parseInt(modDisplay.textContent) || 0;
                modText = ` ${modValue >= 0 ? '+' : ''}${modValue}`;
            }
        }
        
        const finalTotal = baseSum + modValue + exhaustionPenalty;
        const exText = exhaustionPenalty !== 0 ? ` [Ex: ${exhaustionPenalty}]` : '';
        
        if (currentRolls.length === 1) {
            if (lastAdvInfo) {
                diceResultLabel.textContent = `d${sides} (${lastAdvInfo.rolls.join(', ')}) w/ ${lastAdvInfo.type}${modText}${exText}`;
            } else {
                diceResultLabel.textContent = `Rolled d${sides}${modText}${exText}`;
            }
            diceResultValue.textContent = finalTotal;
        } else {
            diceResultLabel.textContent = `${currentRolls.length}d${sides} (${currentRolls.join(' + ')})${modText}${exText}`;
            diceResultValue.textContent = finalTotal;
        }

        // Add to Combat Log
        const logList = document.getElementById('combat-log-list');
        if (logList) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.style.padding = '0.4rem 0';
            entry.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            entry.innerHTML = `<span style="opacity: 0.6; font-size: 0.65rem; display: block; text-transform: uppercase;">${diceResultLabel.textContent}</span> <strong style="color: var(--accent-primary); font-size: 1rem;">Total: ${finalTotal}</strong>`;
            logList.prepend(entry);
            if (logList.children.length > 30) logList.removeChild(logList.lastChild);
        }
    };

    const modBtns = document.querySelectorAll('.mod-btn:not(#dis-toggle):not(#adv-toggle)');
    modBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            
            const isActive = btn.classList.contains('active');
            
            // Remove active from all
            modBtns.forEach(b => b.classList.remove('active'));
            
            // If it wasn't active, make it active
            if (!isActive) {
                btn.classList.add('active');
            }
            
            updateDiceDisplay();
        });
    });

    const resetDiceBtn = document.getElementById('reset-dice-btn');
    if (resetDiceBtn) {
        resetDiceBtn.addEventListener('click', () => {
            lastDieType = null;
            currentRolls = [];
            document.querySelectorAll('.mod-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.dice-btn').forEach(b => b.classList.remove('active'));
            diceResultLabel.textContent = 'Quick Roll';
            diceResultValue.textContent = '--';
        });
    }

    const toggleDiceBtn = document.getElementById('toggle-dice-btn');
    const diceWidget = document.getElementById('dice-roller-widget');
    const logWidget = document.getElementById('combat-log-widget');
    
    toggleDiceBtn?.addEventListener('click', () => {
        const isMin = diceWidget?.classList.toggle('minimized');
        logWidget?.classList.toggle('minimized');
        toggleDiceBtn.classList.toggle('active', !isMin);
    });

    const diceResultContainer = document.querySelector('.dice-result-container');
    if (diceResultContainer && diceWidget) {
        diceResultContainer.style.cursor = 'pointer';
        diceResultContainer.title = 'Click to minimize';
        diceResultContainer.addEventListener('click', () => {
            diceWidget.classList.add('minimized');
            logWidget?.classList.add('minimized');
            toggleDiceBtn?.classList.remove('active');
        });
    }


    // Update dice display when exhaustion changes
    for (let i = 1; i <= 7; i++) {
        const exCheck = document.getElementById(`char-ex-${i}`);
        if (exCheck) {
            exCheck.addEventListener('change', () => {
                if (currentRolls.length > 0) {
                    updateDiceDisplay();
                }
            });
        }
    }

    // --- Footer Accordions (Privacy & Contact) ---
    const privacyToggleBtn = document.getElementById('privacy-toggle-btn');
    const privacyContent = document.getElementById('privacy-content');
    const contactToggleBtn = document.getElementById('contact-toggle-btn');
    const contactContent = document.getElementById('contact-content');

    if (privacyToggleBtn && privacyContent) {
        privacyToggleBtn.addEventListener('click', () => {
            const isOpen = privacyContent.classList.toggle('open');
            if (contactContent) contactContent.classList.remove('open');
            if (isOpen) {
                setTimeout(() => {
                    privacyContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 400);
            }
        });
    }

    if (contactToggleBtn && contactContent) {
        contactToggleBtn.addEventListener('click', () => {
            const isOpen = contactContent.classList.toggle('open');
            if (privacyContent) privacyContent.classList.remove('open');
            if (isOpen) {
                setTimeout(() => {
                    contactContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 400);
            }
        });
    }

    // --- Class Display Update Logic ---
    const classIconDisplay = document.getElementById('class-icon-display');
    const classSelect = document.getElementById('char-class');
    const classIconDisplay2 = document.getElementById('class-icon-display-2');
    const classSelect2 = document.getElementById('char-class-2');
    const addClassBtn = document.getElementById('add-class-btn');
    const secondaryClassGroup = document.getElementById('secondary-class-group');
    
    const classIcons = {
        'Barbarian': 'axe',
        'Druid': 'leaf',
        'Fighter': 'swords',
        'Monk': 'hand',
        'Paladin': 'shield',
        'Psychic': 'brain',
        'Ranger': 'target',
        'Rogue': 'dagger',
        'Sorcerer': 'flame',
        'Wizard': 'wand-2'
    };

    const updateClassDisplay = () => {
        const setDisplay = (display, select) => {
            if (display && select) {
                const val = select.value;
                if (!val) {
                    display.innerHTML = '';
                    return;
                }
                const iconName = classIcons[val] || 'star';
                display.innerHTML = `<i data-lucide="${iconName}" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: middle;"></i><span>${val}</span>`;
                
                // Re-initialize Lucide icons to render the new one
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        };
        setDisplay(classIconDisplay, classSelect);
        setDisplay(classIconDisplay2, classSelect2);
    };

    if (classSelect) {
        classSelect.addEventListener('change', updateClassDisplay);
    }
    if (classSelect2) {
        classSelect2.addEventListener('change', updateClassDisplay);
    }

    const multiclassModal = document.getElementById('multiclass-modal');
    const multiclassYes = document.getElementById('multiclass-yes');
    const multiclassNo = document.getElementById('multiclass-no');
    const multiclassChoiceMadeInput = document.getElementById('multiclass-choice-made');
    const multiclassOptOutInput = document.getElementById('multiclass-opt-out');

    if (multiclassYes) {
        multiclassYes.addEventListener('click', () => {
            if (multiclassChoiceMadeInput) multiclassChoiceMadeInput.value = 'true';
            if (multiclassOptOutInput) multiclassOptOutInput.value = 'false';
            
            // Lock in Primary Class EXP at 2500 (Level 5)
            // This makes them 5 / 1 at 3000 EXP
            const primaryCapInput = document.getElementById('primary-class-exp-cap');
            if (primaryCapInput) primaryCapInput.value = '2500';
            
            if (multiclassModal) multiclassModal.style.display = 'none';
            
            saveCharacterData();
            updateStatPointsDisplay(); // Refresh levels and show secondary fields
        });
    }

    if (multiclassNo) {
        multiclassNo.addEventListener('click', () => {
            if (multiclassChoiceMadeInput) multiclassChoiceMadeInput.value = 'true';
            if (multiclassOptOutInput) multiclassOptOutInput.value = 'true';
            
            if (multiclassModal) multiclassModal.style.display = 'none';
            
            saveCharacterData();
            updateStatPointsDisplay(); // Refresh levels
        });
    }

    // --- Collapsible Cards Logic ---
    const setupCollapsibleCard = (cardId, contentId) => {
        const card = document.getElementById(cardId);
        const content = document.getElementById(contentId);
        if (!card || !content) return;

        card.addEventListener('click', (e) => {
            // If the click is inside the collapsible content area, don't toggle the card
            if (content.contains(e.target)) {
                return;
            }

            // Ignore other interactive elements
            if (e.target.closest('input, button, select, label, .custom-select-wrapper, textarea, .stat-btn, .icon-toggle')) {
                return;
            }
            
            e.stopPropagation();
            
            const isExpanding = card.classList.contains('collapsed');
            
            if (isExpanding) {
                card.classList.remove('collapsed');
                content.style.maxHeight = content.scrollHeight + 'px';
                content.style.opacity = '1';
                
                setTimeout(() => {
                    if (!card.classList.contains('collapsed')) {
                        content.style.maxHeight = 'none';
                    }
                }, 300);
            } else {
                if (content.style.maxHeight === 'none') {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
                content.offsetHeight; // force reflow
                card.classList.add('collapsed');
                content.style.maxHeight = '0px';
                content.style.opacity = '0';
            }
            

        });
    };


    setupCollapsibleCard('info-card-section', 'info-collapsible-area');
    setupCollapsibleCard('test-container-section', 'test-collapsible-area');

    // --- Custom Select Logic Helper ---
    const initCustomSelect = (wrapperId, triggerId, optionsId, selectedTextId, hiddenInputId, onSelect) => {
        const wrapper = document.getElementById(wrapperId);
        const trigger = document.getElementById(triggerId);
        const optionsContainer = document.getElementById(optionsId);
        const selectedText = document.getElementById(selectedTextId);
        const hiddenInput = document.getElementById(hiddenInputId);

        if (trigger && wrapper) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other custom selects and reset their cards
                document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                    if (w !== wrapper) {
                        w.classList.remove('open');
                        const pc = w.closest('.stats-card, .tabs-card');
                        if (pc) pc.classList.remove('has-open-select');
                    }
                });
                
                const charSheet = document.getElementById('character-sheet');
                
                const isOpen = wrapper.classList.toggle('open');
                const parentCard = wrapper.closest('.stats-card, .tabs-card');
                if (parentCard) {
                    if (isOpen) parentCard.classList.add('has-open-select');
                    else parentCard.classList.remove('has-open-select');
                }

                if (charSheet) {
                    const anyOpen = document.querySelectorAll('.custom-select-wrapper.open').length > 0;
                    if (anyOpen) charSheet.classList.add('has-open-select');
                    else charSheet.classList.remove('has-open-select');
                }
            });

            if (optionsContainer) {
                optionsContainer.querySelectorAll('.custom-option').forEach(option => {
                    option.addEventListener('click', function() {
                        const value = this.getAttribute('data-value');
                        selectedText.textContent = this.textContent;
                        optionsContainer.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');

                        if (hiddenInput) {
                            hiddenInput.value = value;
                            if (onSelect) onSelect(value);
                            saveCharacterData();
                        }
                        wrapper.classList.remove('open');
                        const parentCard = wrapper.closest('.stats-card, .tabs-card');
                        if (parentCard) parentCard.classList.remove('has-open-select');
                        
                        const charSheet = document.getElementById('character-sheet');
                        if (charSheet) {
                            const anyOpen = document.querySelectorAll('.custom-select-wrapper.open').length > 0;
                            if (anyOpen) charSheet.classList.add('has-open-select');
                            else charSheet.classList.remove('has-open-select');
                        }
                    });
                });
            }
        }
    };

    initCustomSelect('heritage-select-wrapper', 'heritage-trigger', 'heritage-options', 'heritage-selected-text', 'char-heritage', () => {
        updateStatPointsDisplay();
    });

    initCustomSelect('size-select-wrapper', 'size-trigger', 'size-options', 'size-selected-text', 'char-size');

    initCustomSelect('class-select-wrapper', 'class-trigger', 'class-options', 'class-selected-text', 'char-class', () => {
        if (typeof renderSpellbook === 'function') renderSpellbook();
        if (typeof updateClassDisplay === 'function') updateClassDisplay();
    });

    initCustomSelect('class-2-select-wrapper', 'class-2-trigger', 'class-2-options', 'class-2-selected-text', 'char-class-2', () => {
        if (typeof renderSpellbook === 'function') renderSpellbook();
        if (typeof updateClassDisplay === 'function') updateClassDisplay();
    });

    // Close on click outside
    window.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.stats-card, .tabs-card').forEach(card => card.classList.remove('has-open-select'));
    });

    // Initialize
    loadCharacterData();
    updateGalleryUI();

    // Auto-select first character if none is active
    const activeIdInput = document.getElementById('char-id');
    if (activeIdInput && !activeIdInput.value) {
        const galleryData = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
        if (galleryData) {
            const gallery = JSON.parse(galleryData);
            // Filter for valid characters with IDs
            const validChars = gallery.filter(c => c && c.id);
            if (validChars.length > 0) {
                switchCharacter(validChars[0].id);
            }
        }
    }

});

/* --- Splash Screen Logic --- */
document.addEventListener("DOMContentLoaded", () => {
    const splash = document.getElementById("char-sheet-splash");
    const mainContent = document.getElementById("char-sheet-main-content");
    const startBtn = document.getElementById("start-char-btn");
    const welcomeMsg = document.getElementById("splash-welcome-msg");

    // Data Management Toggle Logic
    const toggleDataActionsBtn = document.getElementById('toggle-data-actions-btn');
    const dataActionsContainer = document.getElementById('data-actions-container');
    
    if (toggleDataActionsBtn && dataActionsContainer) {
        toggleDataActionsBtn.addEventListener('click', () => {
            const isHidden = dataActionsContainer.style.display === 'none' || dataActionsContainer.style.display === '';
            if (isHidden) {
                dataActionsContainer.style.display = 'block';
                setTimeout(() => {
                    dataActionsContainer.style.opacity = '1';
                    dataActionsContainer.style.transform = 'translateY(0)';
                }, 10);
                toggleDataActionsBtn.style.transform = 'rotate(90deg)';
                toggleDataActionsBtn.style.background = 'var(--accent-glow)';
                toggleDataActionsBtn.style.borderColor = 'var(--accent-primary)';
            } else {
                dataActionsContainer.style.opacity = '0';
                dataActionsContainer.style.transform = 'translateY(-10px)';
                toggleDataActionsBtn.style.transform = 'rotate(0deg)';
                toggleDataActionsBtn.style.background = 'var(--glass-bg)';
                toggleDataActionsBtn.style.borderColor = 'var(--glass-border)';
                setTimeout(() => {
                    dataActionsContainer.style.display = 'none';
                }, 400);
            }
        });
    }

    // Check for existing character in the first slot
    const LOCAL_STORAGE_GALLERY_KEY = 'deoch_character_gallery';
    try {
        const gallery = JSON.parse(localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY) || '[]');
        if (gallery.length > 0 && welcomeMsg) {
            const firstChar = gallery[0];
            if (firstChar.name && firstChar.name.trim() !== "") {
                welcomeMsg.textContent = `Welcome back, ${firstChar.name}`;
                welcomeMsg.style.display = "block";
            }
        }
    } catch (e) {
        console.error("Error reading gallery for welcome message", e);
    }

    window.splashTimeout = null;

    window.transitionSplash = () => {
        const splashEl = document.getElementById("char-sheet-splash");
        const mainContentEl = document.getElementById("char-sheet-main-content");
        
        if (!splashEl || splashEl.style.display === "none" || splashEl.classList.contains('splash-fade-out')) return;

        // Clear any pending auto-transition
        if (window.splashTimeout) clearTimeout(window.splashTimeout);

        // Restore Header/Footer/Dice visibility
        document.querySelector('.global-header')?.classList.remove('splash-transparent');
        document.querySelector('.site-footer')?.classList.remove('splash-transparent');
        document.getElementById('toggle-dice-btn')?.classList.remove('splash-transparent');

        // Scroll back to top for the dashboard
        window.scrollTo({ top: 0, behavior: 'smooth' });

        splashEl.classList.add("splash-fade-out");
        document.body.classList.add('char-sheet-active');
        document.body.classList.add('on-character-sheet-page');
        
        setTimeout(() => {
            splashEl.style.display = "none";
            if (mainContentEl) {
                mainContentEl.style.display = "block";
                setTimeout(() => {
                    mainContentEl.style.opacity = "1";
                }, 50);
            }
        }, 600);
    };

    // Click to skip
    if (splash) {
        splash.addEventListener('click', window.transitionSplash);
        splash.style.cursor = 'pointer';
    }

    // Auto-transition if navigating to character sheet on load
    if (window.location.hash === '#character-sheet') {
        window.splashTimeout = setTimeout(window.transitionSplash, 5000); // Slightly longer default to allow click skip
    }
    /* --- HUD Logic (Floating Sticky) --- */
    const hud = document.getElementById('sticky-vitality-hud');
    const vitalityCard = document.getElementById('vitality-card-main');

    const updateHUD = window.updateHUD = () => {
        const hp = parseInt(document.getElementById('char-hp')?.value) || 0;
        const mp = parseInt(document.getElementById('char-mana')?.value) || 0;
        const temp = parseInt(document.getElementById('char-temp-hp')?.value) || 0;

        const hpBar = document.getElementById('hud-hp-bar');
        const mpBar = document.getElementById('hud-mp-bar');
        const tempBar = document.getElementById('hud-temp-bar');
        const hpText = document.getElementById('hud-hp-text');
        const mpText = document.getElementById('hud-mp-text');
        
        const hpMax = parseInt(document.getElementById('char-hp-max')?.value) || (parseInt(document.getElementById('char-hp')?.value) || 100); 
        const mpMax = parseInt(document.getElementById('char-mana-max')?.value) || (parseInt(document.getElementById('char-mana')?.value) || 100);

        if (hpBar) hpBar.style.width = `${Math.min(100, (hp / hpMax) * 100)}%`;
        if (tempBar) tempBar.style.width = `${Math.min(100, (temp / hpMax) * 100)}%`;
        if (mpBar) mpBar.style.width = `${Math.min(100, (mp / mpMax) * 100)}%`;
        
        if (hpText) hpText.innerHTML = `${hp}${temp > 0 ? `<span style="color: #fbbf24; font-size: 0.6rem;">+${temp}</span>` : ''}`;
        if (mpText) mpText.textContent = mp;

        const acDisplay = document.getElementById('hud-ac-display');
        if (acDisplay) acDisplay.textContent = parseInt(document.getElementById('char-ac')?.value) || 8;

        // Death Check integration
        if (typeof checkDeathStatus === 'function') checkDeathStatus();
    };

    const statTooltip = document.getElementById('stat-points-tooltip');
    if (statTooltip && hud) {
        statTooltip.addEventListener('click', () => {
            if (!hud.classList.contains('expanded')) {
                hud.click();
            }
            // Permanently dismiss tooltip for this session/until points change again
            document.body.classList.add('stat-tooltip-dismissed');
        });
    }

    if (hud) {
        hud.addEventListener('click', (e) => {
            if (!document.body.contains(e.target)) return;
            if (e.target.closest('.hud-expandable-content') || e.target.closest('.hud-header-toggles')) return;
            
            // If we just finished a drag, don't trigger a click toggle
            if (hud.dataset.isDragging === 'true') return;

            hud.classList.toggle('expanded');
            updateHUDStates();
        });

        // --- Drag down to Close Logic ---
        let startY = 0;
        let startHeight = 0;
        let isDragging = false;
        const utilities = document.getElementById('combat-utilities-container');
        const toggleBtn = document.getElementById('toggle-dice-btn');

        const updateHUDStates = () => {
            const isExpanded = hud.classList.contains('expanded');
            document.body.classList.toggle('combat-mode', isExpanded);
            document.documentElement.classList.toggle('combat-mode', isExpanded);
            const hudChevron = document.getElementById('hud-chevron');
            if (hudChevron) {
                hudChevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
            }
            if (isExpanded && window.lucide) {
                window.lucide.createIcons();
            }
            hud.style.height = '';
            if (utilities) utilities.style.bottom = '';
            if (toggleBtn) toggleBtn.style.bottom = '';
        };

        const onDragStart = (e) => {
            // ONLY allow dragging if HUD is already expanded
            if (!hud.classList.contains('expanded')) return;
            
            // Allow dragging from anywhere in the HUD EXCEPT interactive elements
            const isInteractive = e.target.closest('button, input, select, textarea, label, a, .circle-checkbox');
            if (isInteractive) return;

            isDragging = true;
            hud.dataset.isDragging = 'false';
            startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            startHeight = hud.offsetHeight;
            
            hud.style.transition = 'none';
            if (utilities) utilities.style.transition = 'none';
            if (toggleBtn) toggleBtn.style.transition = 'none';
            
            hud.classList.add('is-dragging');
        };

        const onDragMove = (e) => {
            if (!isDragging) return;
            
            const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            const deltaY = startY - currentY;
            
            // Only allow dragging DOWN (deltaY < 0 means moving finger down)
            if (deltaY >= 0) return;

            if (Math.abs(deltaY) > 5) {
                hud.dataset.isDragging = 'true';
            }

            if (e.cancelable) e.preventDefault();

            let newHeight = startHeight + deltaY;
            const minHeight = window.innerWidth <= 600 ? 80 : 85;
            const maxHeight = window.innerHeight * 0.9;
            newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
            
            hud.style.height = newHeight + 'px';
            
            // Note: Since widgets "hug bottom" when open, they don't need to follow the top as strictly
            // but for a smooth transition we can move the toggle button
            if (toggleBtn) {
                // If we are dragging down, the toggle button should follow the top of the HUD
                toggleBtn.style.bottom = newHeight + 'px';
            }
        };

        const onDragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            
            hud.style.transition = '';
            if (utilities) utilities.style.transition = '';
            if (toggleBtn) toggleBtn.style.transition = '';
            
            hud.classList.remove('is-dragging');

            const currentHeight = hud.offsetHeight;
            const expandedHeight = window.innerHeight * 0.9;
            const dragDistance = startHeight - currentHeight;
            
            // Threshold: 100px OR 30% height reduction
            if (dragDistance > 100 || (dragDistance > expandedHeight * 0.3)) {
                hud.classList.remove('expanded');
            }
            
            updateHUDStates();
            
            setTimeout(() => {
                hud.dataset.isDragging = 'false';
            }, 50);
        };

        hud.addEventListener('mousedown', onDragStart);
        hud.addEventListener('touchstart', onDragStart, { passive: true });
        
        // Intercept all events to prevent pass-through to background
        hud.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        hud.addEventListener('mousedown', (e) => e.stopPropagation());

        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('touchmove', onDragMove, { passive: false });
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchend', onDragEnd);
    }

    if (hud) {
        // Update HUD data immediately and on changes
        updateHUD();
        hud.addEventListener('change', updateHUD);
        document.getElementById('char-form')?.addEventListener('change', updateHUD);
    }

    document.getElementById('char-form')?.addEventListener('change', updateHUD);

    // Combat Log Integration
    const originalRollDice = window.rollDice;
    window.rollDice = (sides) => {
        const result = Math.floor(Math.random() * sides) + 1;
        const logList = document.getElementById('combat-log-list');
        if (logList) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.style.padding = '0.4rem 0';
            entry.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            entry.innerHTML = `<span style="opacity: 0.6; font-size: 0.65rem; display: block; text-transform: uppercase;">Quick d${sides}</span> <strong style="color: var(--accent-primary); font-size: 1rem;">Result: ${result}</strong>`;
            logList.prepend(entry);
            if (logList.children.length > 30) logList.removeChild(logList.lastChild);
        }
        return result; 
    };

    // Re-initialize Lucide for dynamic elements
    if (window.lucide) window.lucide.createIcons();
});

// Global Navigation Helper
// Global Card Toggle Helper
window.toggleCard = function(card) {
    const content = card.querySelector('.stats-collapsible-content');
    if (!content) return;
    
    const isExpanding = card.classList.contains('collapsed');
    
    // Performance mode: Disable backdrop-filter during animation
    card.classList.add('is-animating');
    
    if (isExpanding) {
        card.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
        
        setTimeout(() => {
            if (!card.classList.contains('collapsed')) {
                content.style.maxHeight = 'none';
                card.classList.remove('is-animating');
            }
        }, 300);
    } else {
        if (content.style.maxHeight === 'none') {
            content.style.maxHeight = content.scrollHeight + 'px';
        }
        content.offsetHeight; // force reflow
        card.classList.add('collapsed');
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
        
        setTimeout(() => {
            card.classList.remove('is-animating');
        }, 300);
    }
};

window.navigateTo = function(targetId) {
    const targetBtn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
    if (targetBtn) {
        targetBtn.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (targetId === 'character-sheet') {
            if (window.splashTimeout) clearTimeout(window.splashTimeout);
            window.splashTimeout = setTimeout(window.transitionSplash, 5000);
        }

        // Auto-expand latest update if navigating to updates section
        if (targetId === 'updates') {
            const latestUpdate = document.querySelector('#updates .update-card details');
            if (latestUpdate) {
                latestUpdate.open = true;
            }
        }
    }
};

// Interactive Card Details
function toggleCardDetail(card) {
    const detail = card.querySelector('.card-detail-content');
    const hint = card.querySelector('.expand-hint i');
    const isActive = card.classList.toggle('expanded');
    
    if (isActive) {
        detail.style.display = 'block';
        hint.className = 'fa-solid fa-minus';
        card.style.borderColor = 'var(--accent-primary)';
        card.style.boxShadow = '0 0 20px rgba(187, 134, 252, 0.2)';
    } else {
        detail.style.display = 'none';
        hint.className = 'fa-solid fa-plus';
        card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        card.style.boxShadow = 'none';
    }
}