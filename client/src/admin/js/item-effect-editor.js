// client/src/admin/js/item-effect-editor.js - ÉDITEUR D'EFFETS SÉPARÉ

export class ItemEffectEditor {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.currentEffect = null;
        this.currentIndex = null;
        this.onSaveCallback = null;
        
        console.log('✅ [ItemEffectEditor] Module initialisé');
    }

    // ===== MÉTHODE PRINCIPALE =====

    /**
     * Ouvre l'éditeur d'effet
     * @param {Object} effect - L'effet à éditer (ou {} pour un nouveau)
     * @param {number|null} index - Index de l'effet (null pour nouveau)
     * @param {Function} onSave - Callback appelé lors de la sauvegarde
     */
    openEditor(effect = {}, index = null, onSave = null) {
        console.log('📝 [ItemEffectEditor] Ouverture éditeur:', { effect, index });
        
        this.currentEffect = effect;
        this.currentIndex = index;
        this.onSaveCallback = onSave;
        
        const isNewEffect = index === null;
        const title = isNewEffect ? 'Nouvel Effet' : `Éditer: ${effect.name || effect.id}`;
        
        const modal = this.createModal(title, effect);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Focus sur le premier champ
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // ===== CRÉATION DU MODAL =====

    createModal(title, effect) {
        const modalHtml = `
            <div class="effect-editor-modal" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.5); display: none; align-items: center; 
                justify-content: center; z-index: 10000;
            ">
                <div class="effect-editor-content" style="
                    background: white; border-radius: 12px; width: 90%; max-width: 900px; 
                    max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                ">
                    ${this.generateHeader(title)}
                    ${this.generateForm(effect)}
                    ${this.generateFooter()}
                </div>
            </div>
        `;
        
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHtml;
        const modal = modalElement.firstElementChild;
        
        this.setupEventListeners(modal);
        return modal;
    }

    generateHeader(title) {
        return `
            <div class="effect-editor-header" style="
                padding: 1.5rem; border-bottom: 1px solid #e0e0e0; 
                display: flex; justify-content: space-between; align-items: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; border-radius: 12px 12px 0 0;
            ">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-magic"></i> ${title}
                </h3>
                <button type="button" class="close-btn" style="
                    background: rgba(255,255,255,0.2); border: none; font-size: 1.5rem; 
                    color: white; cursor: pointer; padding: 0.5rem; border-radius: 50%;
                    transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
            </div>
        `;
    }

    generateForm(effect) {
        return `
            <form class="effect-editor-form" style="padding: 1.5rem;">
                
                <!-- Informations de base -->
                <div class="form-section" style="margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: #34495e; border-left: 4px solid #3498db; padding-left: 1rem;">
                        <i class="fas fa-info-circle"></i> Informations générales
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">
                                ID de l'effet <span style="color: #e74c3c;">*</span>
                            </label>
                            <input type="text" name="effectId" value="${effect.id || ''}" 
                                   placeholder="ex: heal_hp_50" required
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                          transition: border-color 0.2s; font-family: monospace;"
                                   onfocus="this.style.borderColor='#3498db'"
                                   onblur="this.style.borderColor='#ddd'">
                            <small style="color: #7f8c8d;">Identifiant unique pour cet effet</small>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">
                                Nom affiché <span style="color: #e74c3c;">*</span>
                            </label>
                            <input type="text" name="effectName" value="${effect.name || ''}" 
                                   placeholder="ex: Soigne 50 HP" required
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                          transition: border-color 0.2s;"
                                   onfocus="this.style.borderColor='#3498db'"
                                   onblur="this.style.borderColor='#ddd'">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">Description</label>
                        <textarea name="effectDescription" placeholder="Description détaillée de l'effet..." rows="3"
                                 style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                        transition: border-color 0.2s; resize: vertical;"
                                 onfocus="this.style.borderColor='#3498db'"
                                 onblur="this.style.borderColor='#ddd'">${effect.description || ''}</textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">
                                Déclencheur <span style="color: #e74c3c;">*</span>
                            </label>
                            <select name="effectTrigger" required
                                    style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                           background: white; transition: border-color 0.2s;"
                                    onfocus="this.style.borderColor='#3498db'"
                                    onblur="this.style.borderColor='#ddd'">
                                ${this.generateTriggerOptions(effect.trigger)}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">Priorité</label>
                            <input type="number" name="effectPriority" value="${effect.priority || 0}" 
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                          transition: border-color 0.2s;"
                                   onfocus="this.style.borderColor='#3498db'"
                                   onblur="this.style.borderColor='#ddd'">
                            <small style="color: #7f8c8d;">Plus élevé = prioritaire</small>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">Durée (tours)</label>
                            <input type="number" name="effectDuration" value="${effect.duration || ''}" 
                                   placeholder="∞" min="1"
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                          transition: border-color 0.2s;"
                                   onfocus="this.style.borderColor='#3498db'"
                                   onblur="this.style.borderColor='#ddd'">
                            <small style="color: #7f8c8d;">Vide = permanent</small>
                        </div>
                    </div>
                </div>
                
                <!-- Conditions -->
                <div class="form-section" style="margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: #34495e; border-left: 4px solid #f39c12; padding-left: 1rem;">
                        <i class="fas fa-filter"></i> Conditions d'activation
                    </h4>
                    <div style="background: #fef9e7; border: 1px solid #f1c40f; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <p style="margin: 0; color: #8e6a00;">
                            <i class="fas fa-info-circle"></i>
                            Les conditions déterminent quand l'effet peut se déclencher. Toutes les conditions doivent être remplies.
                        </p>
                    </div>
                    <div id="conditionsContainer" style="margin-bottom: 1rem;">
                        ${this.generateConditionsHTML(effect.conditions || [])}
                    </div>
                    <button type="button" class="add-condition-btn" style="
                        padding: 0.75rem 1.5rem; background: #f39c12; color: white; 
                        border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
                    " onmouseover="this.style.background='#e67e22'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.background='#f39c12'; this.style.transform='translateY(0)'">
                        <i class="fas fa-plus"></i> Ajouter une condition
                    </button>
                </div>
                
                <!-- Actions -->
                <div class="form-section" style="margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: #34495e; border-left: 4px solid #27ae60; padding-left: 1rem;">
                        <i class="fas fa-cogs"></i> Actions à exécuter
                    </h4>
                    <div style="background: #eafaf1; border: 1px solid #27ae60; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <p style="margin: 0; color: #196f3d;">
                            <i class="fas fa-info-circle"></i>
                            Les actions définissent ce qui se passe quand l'effet se déclenche. Au moins une action est requise.
                        </p>
                    </div>
                    <div id="actionsContainer" style="margin-bottom: 1rem;">
                        ${this.generateActionsHTML(effect.actions || [])}
                    </div>
                    <button type="button" class="add-action-btn" style="
                        padding: 0.75rem 1.5rem; background: #27ae60; color: white; 
                        border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
                    " onmouseover="this.style.background='#229954'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.background='#27ae60'; this.style.transform='translateY(0)'">
                        <i class="fas fa-plus"></i> Ajouter une action
                    </button>
                </div>
                
                <!-- Restrictions -->
                <div class="form-section" style="margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: #34495e; border-left: 4px solid #e74c3c; padding-left: 1rem;">
                        <i class="fas fa-ban"></i> Restrictions d'utilisation
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; 
                                      background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: background 0.2s;"
                               onmouseover="this.style.background='#e9ecef'"
                               onmouseout="this.style.background='#f8f9fa'">
                            <input type="checkbox" name="oncePerBattle" ${effect.once_per_battle ? 'checked' : ''}
                                   style="transform: scale(1.2);">
                            <span style="font-weight: 500;">Une fois par combat</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; 
                                      background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: background 0.2s;"
                               onmouseover="this.style.background='#e9ecef'"
                               onmouseout="this.style.background='#f8f9fa'">
                            <input type="checkbox" name="oncePerTurn" ${effect.once_per_turn ? 'checked' : ''}
                                   style="transform: scale(1.2);">
                            <span style="font-weight: 500;">Une fois par tour</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; 
                                      background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: background 0.2s;"
                               onmouseover="this.style.background='#e9ecef'"
                               onmouseout="this.style.background='#f8f9fa'">
                            <input type="checkbox" name="stackable" ${effect.stackable ? 'checked' : ''}
                                   style="transform: scale(1.2);">
                            <span style="font-weight: 500;">Cumulable</span>
                        </label>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">
                                Max utilisations/combat
                            </label>
                            <input type="number" name="maxUsesPerBattle" value="${effect.max_uses_per_battle || ''}" 
                                   placeholder="Illimité" min="1"
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                          transition: border-color 0.2s;"
                                   onfocus="this.style.borderColor='#3498db'"
                                   onblur="this.style.borderColor='#ddd'">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">
                                Cooldown (tours)
                            </label>
                            <input type="number" name="cooldownTurns" value="${effect.cooldown_turns || ''}" 
                                   placeholder="Aucun" min="1"
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; 
                                          transition: border-color 0.2s;"
                                   onfocus="this.style.borderColor='#3498db'"
                                   onblur="this.style.borderColor='#ddd'">
                        </div>
                    </div>
                </div>
                
            </form>
        `;
    }

    generateFooter() {
        return `
            <div class="effect-editor-footer" style="
                padding: 1.5rem; border-top: 1px solid #e0e0e0; 
                display: flex; justify-content: space-between; align-items: center;
                background: #f8f9fa;
            ">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #6c757d;">
                    <i class="fas fa-info-circle"></i>
                    <small>Les champs marqués d'un * sont obligatoires</small>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button type="button" class="cancel-btn" style="
                        padding: 0.75rem 1.5rem; background: #6c757d; color: white; 
                        border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
                    " onmouseover="this.style.background='#5a6268'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.background='#6c757d'; this.style.transform='translateY(0)'">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button type="button" class="save-effect-btn" style="
                        padding: 0.75rem 1.5rem; background: #007bff; color: white; 
                        border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
                    " onmouseover="this.style.background='#0056b3'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.background='#007bff'; this.style.transform='translateY(0)'">
                        <i class="fas fa-save"></i> Sauvegarder l'effet
                    </button>
                </div>
            </div>
        `;
    }

    // ===== GÉNÉRATION DES OPTIONS =====

    generateTriggerOptions(selectedTrigger) {
        const triggers = [
            { value: 'on_use', label: 'À l\'utilisation', group: 'Usage' },
            { value: 'on_use_in_battle', label: 'Utilisation en combat', group: 'Usage' },
            { value: 'on_use_on_pokemon', label: 'Utilisation sur Pokémon', group: 'Usage' },
            { value: 'on_use_in_field', label: 'Utilisation hors combat', group: 'Usage' },
            { value: 'turn_start', label: 'Début de tour', group: 'Combat' },
            { value: 'turn_end', label: 'Fin de tour', group: 'Combat' },
            { value: 'on_switch_in', label: 'Entrée au combat', group: 'Combat' },
            { value: 'on_switch_out', label: 'Sortie du combat', group: 'Combat' },
            { value: 'when_hit', label: 'Quand touché', group: 'Combat' },
            { value: 'when_damaged', label: 'Quand endommagé', group: 'Combat' },
            { value: 'on_hp_low', label: 'HP faibles', group: 'État' },
            { value: 'on_status_inflict', label: 'Statut infligé', group: 'État' },
            { value: 'continuous', label: 'Continu', group: 'Spécial' },
            { value: 'passive', label: 'Passif', group: 'Spécial' }
        ];
        
        const groups = [...new Set(triggers.map(t => t.group))];
        
        return groups.map(group => {
            const groupTriggers = triggers.filter(t => t.group === group);
            return `
                <optgroup label="${group}">
                    ${groupTriggers.map(trigger => 
                        `<option value="${trigger.value}" ${selectedTrigger === trigger.value ? 'selected' : ''}>
                            ${trigger.label}
                        </option>`
                    ).join('')}
                </optgroup>
            `;
        }).join('');
    }

    // ===== GÉNÉRATION DES SECTIONS DYNAMIQUES =====

    generateConditionsHTML(conditions) {
        if (conditions.length === 0) {
            return `
                <div class="empty-conditions" style="
                    text-align: center; padding: 2rem; color: #999; 
                    border: 2px dashed #ddd; border-radius: 8px; background: #fafafa;
                ">
                    <i class="fas fa-filter" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="margin: 0; font-style: italic;">Aucune condition définie</p>
                    <small>L'effet se déclenchera sans condition</small>
                </div>
            `;
        }
        
        return conditions.map((condition, index) => 
            this.generateConditionHTML(condition, index)
        ).join('');
    }

    generateConditionHTML(condition, index) {
        return `
            <div class="condition-item" data-index="${index}" style="
                border: 2px solid #f39c12; border-radius: 12px; padding: 1.5rem; 
                margin: 1rem 0; background: linear-gradient(135deg, #fef9e7 0%, #fcf3cf 100%);
                position: relative; transition: all 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(243,156,18,0.2)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h5 style="margin: 0; color: #8e6a00; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-filter"></i> Condition ${index + 1}
                    </h5>
                    <button type="button" class="remove-condition-btn" data-index="${index}" style="
                        background: #e74c3c; color: white; border: none; 
                        border-radius: 50%; width: 32px; height: 32px; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#c0392b'; this.style.transform='scale(1.1)'"
                       onmouseout="this.style.background='#e74c3c'; this.style.transform='scale(1)'">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #8e6a00;">
                            Type de condition
                        </label>
                        <select name="conditionType_${index}" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #f1c40f; 
                            border-radius: 6px; background: white;
                        ">
                            ${this.generateConditionTypeOptions(condition.type)}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #8e6a00;">
                            Opérateur
                        </label>
                        <select name="conditionOperator_${index}" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #f1c40f; 
                            border-radius: 6px; background: white;
                        ">
                            ${this.generateOperatorOptions(condition.operator)}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #8e6a00;">
                            Valeur
                        </label>
                        <input type="text" name="conditionValue_${index}" value="${condition.value || ''}" 
                               placeholder="Valeur à comparer" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #f1c40f; 
                            border-radius: 6px; background: white;
                        ">
                    </div>
                </div>
            </div>
        `;
    }

    generateActionsHTML(actions) {
        if (actions.length === 0) {
            return `
                <div class="empty-actions" style="
                    text-align: center; padding: 2rem; color: #999; 
                    border: 2px dashed #ddd; border-radius: 8px; background: #fafafa;
                ">
                    <i class="fas fa-cogs" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="margin: 0; font-style: italic;">Aucune action définie</p>
                    <small style="color: #e74c3c;">⚠️ Au moins une action est requise</small>
                </div>
            `;
        }
        
        return actions.map((action, index) => 
            this.generateActionHTML(action, index)
        ).join('');
    }

    generateActionHTML(action, index) {
        return `
            <div class="action-item" data-index="${index}" style="
                border: 2px solid #27ae60; border-radius: 12px; padding: 1.5rem; 
                margin: 1rem 0; background: linear-gradient(135deg, #eafaf1 0%, #d5f4e6 100%);
                position: relative; transition: all 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(39,174,96,0.2)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h5 style="margin: 0; color: #196f3d; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-cogs"></i> Action ${index + 1}
                    </h5>
                    <button type="button" class="remove-action-btn" data-index="${index}" style="
                        background: #e74c3c; color: white; border: none; 
                        border-radius: 50%; width: 32px; height: 32px; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#c0392b'; this.style.transform='scale(1.1)'"
                       onmouseout="this.style.background='#e74c3c'; this.style.transform='scale(1)'">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #196f3d;">
                            Type d'action
                        </label>
                        <select name="actionType_${index}" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #27ae60; 
                            border-radius: 6px; background: white;
                        ">
                            ${this.generateActionTypeOptions(action.type)}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #196f3d;">
                            Cible
                        </label>
                        <select name="actionTarget_${index}" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #27ae60; 
                            border-radius: 6px; background: white;
                        ">
                            ${this.generateTargetOptions(action.target)}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #196f3d;">
                            Valeur
                        </label>
                        <input type="text" name="actionValue_${index}" value="${action.value || ''}" 
                               placeholder="Valeur de l'action" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #27ae60; 
                            border-radius: 6px; background: white;
                        ">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #196f3d;">
                            Chance (0-1)
                        </label>
                        <input type="number" name="actionChance_${index}" value="${action.chance || ''}" 
                               placeholder="1.0" step="0.01" min="0" max="1" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #27ae60; 
                            border-radius: 6px; background: white;
                        ">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #196f3d;">
                            Message de succès
                        </label>
                        <input type="text" name="actionMessage_${index}" value="${action.success_message || ''}" 
                               placeholder="Message affiché en cas de succès" style="
                            width: 100%; padding: 0.5rem; border: 1px solid #27ae60; 
                            border-radius: 6px; background: white;
                        ">
                    </div>
                </div>
            </div>
        `;
    }

    // ===== GÉNÉRATION DES OPTIONS =====

    generateConditionTypeOptions(selectedType) {
        const conditionTypes = [
            { value: 'pokemon_species', label: 'Espèce Pokémon', group: 'Pokémon' },
            { value: 'pokemon_type', label: 'Type Pokémon', group: 'Pokémon' },
            { value: 'pokemon_level', label: 'Niveau Pokémon', group: 'Pokémon' },
            { value: 'pokemon_ability', label: 'Talent Pokémon', group: 'Pokémon' },
            { value: 'pokemon_gender', label: 'Genre Pokémon', group: 'Pokémon' },
            { value: 'pokemon_nature', label: 'Nature Pokémon', group: 'Pokémon' },
            { value: 'hp_percentage', label: 'Pourcentage HP', group: 'Stats' },
            { value: 'hp_value', label: 'Valeur HP', group: 'Stats' },
            { value: 'stat_value', label: 'Valeur de stat', group: 'Stats' },
            { value: 'has_status', label: 'A un statut', group: 'État' },
            { value: 'has_no_status', label: 'Aucun statut', group: 'État' },
            { value: 'battle_type', label: 'Type de combat', group: 'Combat' },
            { value: 'move_type', label: 'Type d\'attaque', group: 'Combat' },
            { value: 'super_effective', label: 'Super efficace', group: 'Combat' },
            { value: 'weather_active', label: 'Météo active', group: 'Environnement' },
            { value: 'terrain_active', label: 'Terrain actif', group: 'Environnement' },
            { value: 'time_of_day', label: 'Moment de la journée', group: 'Environnement' },
            { value: 'location', label: 'Lieu', group: 'Environnement' },
            { value: 'random_chance', label: 'Chance aléatoire', group: 'Spécial' },
            { value: 'first_use', label: 'Première utilisation', group: 'Spécial' },
            { value: 'held_item', label: 'Objet tenu', group: 'Spécial' }
        ];
        
        const groups = [...new Set(conditionTypes.map(t => t.group))];
        
        return groups.map(group => {
            const groupTypes = conditionTypes.filter(t => t.group === group);
            return `
                <optgroup label="${group}">
                    ${groupTypes.map(type => 
                        `<option value="${type.value}" ${selectedType === type.value ? 'selected' : ''}>
                            ${type.label}
                        </option>`
                    ).join('')}
                </optgroup>
            `;
        }).join('');
    }

    generateOperatorOptions(selectedOperator) {
        const operators = [
            { value: 'equals', label: '= (égal à)' },
            { value: 'not_equals', label: '≠ (différent de)' },
            { value: 'greater', label: '> (supérieur à)' },
            { value: 'less', label: '< (inférieur à)' },
            { value: 'greater_equal', label: '≥ (supérieur ou égal)' },
            { value: 'less_equal', label: '≤ (inférieur ou égal)' }
        ];
        
        return operators.map(op => 
            `<option value="${op.value}" ${selectedOperator === op.value ? 'selected' : ''}>
                ${op.label}
            </option>`
        ).join('');
    }

    generateActionTypeOptions(selectedType) {
        const actionTypes = [
            { value: 'heal_hp_fixed', label: 'Soigner HP (fixe)', group: 'Soins' },
            { value: 'heal_hp_percentage', label: 'Soigner HP (%)', group: 'Soins' },
            { value: 'heal_hp_max', label: 'Soigner HP (max)', group: 'Soins' },
            { value: 'restore_pp', label: 'Restaurer PP', group: 'Soins' },
            { value: 'cure_status', label: 'Guérir statut', group: 'Soins' },
            { value: 'cure_all_status', label: 'Guérir tous statuts', group: 'Soins' },
            { value: 'revive_pokemon', label: 'Ranimer Pokémon', group: 'Soins' },
            
            { value: 'boost_stat', label: 'Booster stat', group: 'Stats' },
            { value: 'lower_stat', label: 'Baisser stat', group: 'Stats' },
            { value: 'reset_stats', label: 'Reset stats', group: 'Stats' },
            { value: 'set_stat_stage', label: 'Définir niveau stat', group: 'Stats' },
            
            { value: 'inflict_status', label: 'Infliger statut', group: 'Statuts' },
            { value: 'prevent_status', label: 'Empêcher statut', group: 'Statuts' },
            { value: 'remove_volatile_status', label: 'Retirer statut volatil', group: 'Statuts' },
            
            { value: 'evolve_pokemon', label: 'Faire évoluer', group: 'Transformation' },
            { value: 'change_type', label: 'Changer type', group: 'Transformation' },
            { value: 'change_ability', label: 'Changer talent', group: 'Transformation' },
            { value: 'change_form', label: 'Changer forme', group: 'Transformation' },
            
            { value: 'teach_move', label: 'Apprendre attaque', group: 'Attaques' },
            { value: 'delete_move', label: 'Oublier attaque', group: 'Attaques' },
            { value: 'increase_pp_max', label: 'Augmenter PP max', group: 'Attaques' },
            
            { value: 'modify_catch_rate', label: 'Modifier taux capture', group: 'Capture' },
            { value: 'guaranteed_catch', label: 'Capture garantie', group: 'Capture' },
            { value: 'prevent_escape', label: 'Empêcher fuite', group: 'Capture' },
            
            { value: 'change_weather', label: 'Changer météo', group: 'Terrain' },
            { value: 'change_terrain', label: 'Changer terrain', group: 'Terrain' },
            { value: 'remove_weather', label: 'Retirer météo', group: 'Terrain' },
            
            { value: 'prevent_wild_encounters', label: 'Empêcher rencontres', group: 'Exploration' },
            { value: 'double_prize_money', label: 'Doubler gains', group: 'Exploration' },
            { value: 'add_money', label: 'Ajouter argent', group: 'Exploration' },
            
            { value: 'show_message', label: 'Afficher message', group: 'Interface' },
            { value: 'play_sound', label: 'Jouer son', group: 'Interface' },
            { value: 'consume_item', label: 'Consommer objet', group: 'Interface' }
        ];
        
        const groups = [...new Set(actionTypes.map(t => t.group))];
        
        return groups.map(group => {
            const groupTypes = actionTypes.filter(t => t.group === group);
            return `
                <optgroup label="${group}">
                    ${groupTypes.map(type => 
                        `<option value="${type.value}" ${selectedType === type.value ? 'selected' : ''}>
                            ${type.label}
                        </option>`
                    ).join('')}
                </optgroup>
            `;
        }).join('');
    }

    generateTargetOptions(selectedTarget) {
        const targets = [
            { value: 'self', label: 'Soi-même' },
            { value: 'user', label: 'Utilisateur' },
            { value: 'opponent', label: 'Adversaire' },
            { value: 'ally', label: 'Allié' },
            { value: 'party', label: 'Équipe complète' },
            { value: 'field', label: 'Terrain' },
            { value: 'all', label: 'Tous les Pokémon' }
        ];
        
        return targets.map(target => 
            `<option value="${target.value}" ${selectedTarget === target.value ? 'selected' : ''}>
                ${target.label}
            </option>`
        ).join('');
    }

    // ===== EVENT LISTENERS =====

    setupEventListeners(modal) {
        // Fermer le modal
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.closeModal(modal);
                });
            }
        });

        // Fermer en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
        
        // Sauvegarder l'effet
        const saveBtn = modal.querySelector('.save-effect-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveEffect(modal);
            });
        }
        
        // Ajouter condition
        const addConditionBtn = modal.querySelector('.add-condition-btn');
        if (addConditionBtn) {
            addConditionBtn.addEventListener('click', () => {
                this.addCondition(modal);
            });
        }
        
        // Ajouter action
        const addActionBtn = modal.querySelector('.add-action-btn');
        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => {
                this.addAction(modal);
            });
        }
        
        // Supprimer conditions/actions
        modal.addEventListener('click', (e) => {
            if (e.target.closest('.remove-condition-btn')) {
                const conditionItem = e.target.closest('.condition-item');
                conditionItem.remove();
                this.updateConditionsNumbers(modal);
            }
            if (e.target.closest('.remove-action-btn')) {
                const actionItem = e.target.closest('.action-item');
                actionItem.remove();
                this.updateActionsNumbers(modal);
            }
        });

        // Validation en temps réel
        const form = modal.querySelector('.effect-editor-form');
        form.addEventListener('input', () => {
            this.validateForm(modal);
        });
    }

    // ===== ACTIONS DU MODAL =====

    closeModal(modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 200);
    }

    addCondition(modal) {
        const container = modal.querySelector('#conditionsContainer');
        const index = container.querySelectorAll('.condition-item').length;
        
        // Supprimer le message vide s'il existe
        const emptyMsg = container.querySelector('.empty-conditions');
        if (emptyMsg) emptyMsg.remove();
        
        const conditionHTML = this.generateConditionHTML({}, index);
        container.insertAdjacentHTML('beforeend', conditionHTML);
    }

    addAction(modal) {
        const container = modal.querySelector('#actionsContainer');
        const index = container.querySelectorAll('.action-item').length;
        
        // Supprimer le message vide s'il existe
        const emptyMsg = container.querySelector('.empty-actions');
        if (emptyMsg) emptyMsg.remove();
        
        const actionHTML = this.generateActionHTML({}, index);
        container.insertAdjacentHTML('beforeend', actionHTML);
    }

    updateConditionsNumbers(modal) {
        const conditions = modal.querySelectorAll('.condition-item');
        conditions.forEach((item, index) => {
            const header = item.querySelector('h5');
            if (header) {
                header.innerHTML = `<i class="fas fa-filter"></i> Condition ${index + 1}`;
            }
            
            // Mettre à jour les noms des champs
            const inputs = item.querySelectorAll('select, input');
            inputs.forEach(input => {
                const name = input.name;
                if (name) {
                    const newName = name.replace(/_\d+$/, `_${index}`);
                    input.name = newName;
                }
            });
            
            item.setAttribute('data-index', index);
        });
    }

    updateActionsNumbers(modal) {
        const actions = modal.querySelectorAll('.action-item');
        actions.forEach((item, index) => {
            const header = item.querySelector('h5');
            if (header) {
                header.innerHTML = `<i class="fas fa-cogs"></i> Action ${index + 1}`;
            }
            
            // Mettre à jour les noms des champs
            const inputs = item.querySelectorAll('select, input');
            inputs.forEach(input => {
                const name = input.name;
                if (name) {
                    const newName = name.replace(/_\d+$/, `_${index}`);
                    input.name = newName;
                }
            });
            
            item.setAttribute('data-index', index);
        });
    }

    validateForm(modal) {
        const form = modal.querySelector('.effect-editor-form');
        const saveBtn = modal.querySelector('.save-effect-btn');
        
        const effectId = form.querySelector('[name="effectId"]').value.trim();
        const effectName = form.querySelector('[name="effectName"]').value.trim();
        const actions = modal.querySelectorAll('.action-item');
        
        const isValid = effectId && effectName && actions.length > 0;
        
        if (saveBtn) {
            saveBtn.disabled = !isValid;
            saveBtn.style.opacity = isValid ? '1' : '0.5';
        }
    }

    saveEffect(modal) {
        try {
            const form = modal.querySelector('.effect-editor-form');
            const formData = new FormData(form);
            
            // Construire l'effet
            const effect = {
                id: formData.get('effectId').trim(),
                name: formData.get('effectName').trim(),
                description: formData.get('effectDescription').trim(),
                trigger: formData.get('effectTrigger'),
                priority: parseInt(formData.get('effectPriority')) || 0,
                duration: parseInt(formData.get('effectDuration')) || undefined,
                conditions: this.extractConditions(modal),
                actions: this.extractActions(modal),
                once_per_battle: formData.has('oncePerBattle'),
                once_per_turn: formData.has('oncePerTurn'),
                stackable: formData.has('stackable'),
                max_uses_per_battle: parseInt(formData.get('maxUsesPerBattle')) || undefined,
                cooldown_turns: parseInt(formData.get('cooldownTurns')) || undefined
            };
            
            // Validation finale
            if (!effect.id || !effect.name || effect.actions.length === 0) {
                this.adminPanel.showNotification('Veuillez remplir tous les champs obligatoires', 'error');
                return;
            }
            
            // Callback de sauvegarde
            if (this.onSaveCallback) {
                this.onSaveCallback(effect, this.currentIndex);
            }
            
            this.closeModal(modal);
            this.adminPanel.showNotification('Effet sauvegardé avec succès', 'success');
            
            console.log('✅ [ItemEffectEditor] Effet sauvegardé:', effect);
            
        } catch (error) {
            console.error('❌ [ItemEffectEditor] Erreur sauvegarde:', error);
            this.adminPanel.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    extractConditions(modal) {
        const conditions = [];
        const conditionItems = modal.querySelectorAll('.condition-item');
        
        conditionItems.forEach((item, index) => {
            const type = item.querySelector(`[name="conditionType_${index}"]`)?.value;
            const operator = item.querySelector(`[name="conditionOperator_${index}"]`)?.value;
            const value = item.querySelector(`[name="conditionValue_${index}"]`)?.value;
            
            if (type && value) {
                conditions.push({
                    type,
                    operator: operator || 'equals',
                    value: this.parseValue(value, type)
                });
            }
        });
        
        return conditions;
    }

    extractActions(modal) {
        const actions = [];
        const actionItems = modal.querySelectorAll('.action-item');
        
        actionItems.forEach((item, index) => {
            const type = item.querySelector(`[name="actionType_${index}"]`)?.value;
            const target = item.querySelector(`[name="actionTarget_${index}"]`)?.value;
            const value = item.querySelector(`[name="actionValue_${index}"]`)?.value;
            const chance = item.querySelector(`[name="actionChance_${index}"]`)?.value;
            const message = item.querySelector(`[name="actionMessage_${index}"]`)?.value;
            
            if (type) {
                const action = {
                    type,
                    target: target || 'self',
                    value: this.parseValue(value, type)
                };
                
                if (chance) action.chance = parseFloat(chance);
                if (message) action.success_message = message;
                
                actions.push(action);
            }
        });
        
        return actions;
    }

    parseValue(value, type) {
        // Types numériques
        const numericTypes = [
            'pokemon_level', 'hp_percentage', 'hp_value', 'stat_value', 'random_chance',
            'heal_hp_fixed', 'heal_hp_percentage', 'boost_stat', 'lower_stat', 'modify_catch_rate'
        ];
        
        if (numericTypes.includes(type)) {
            return parseFloat(value) || 0;
        }
        
        return value;
    }
}
