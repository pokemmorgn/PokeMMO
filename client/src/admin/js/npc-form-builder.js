// PokeWorld Admin Panel - NPC Form Builder - CORRECTIONS COMPLÈTES
// Fixes : 1) Pré-remplissage des champs lors de l'édition, 2) Tous les champs manquants

import { NPC_TYPES, COMMON_FIELDS, FIELD_HELP } from './npc-types-config.js'
import { SUGGESTED_SPRITES, POSITION_PRESETS } from './npc-templates.js'
import { NPCValidator } from './npc-validator.js'

export class NPCFormBuilder {
constructor(container, adminPanel = null) {
    this.container = container
    this.adminPanel = adminPanel
        this.currentNPC = null
        this.currentType = null
        this.validator = new NPCValidator()
        this.changeHandlers = []
        this.validationErrors = {}
     this.availableSprites = []
    this.currentSpriteIndex = 0
    this.spritesLoaded = false
    this.shopsCache = {}
this.tempShopSelection = null
this.dialoguesCache = {}
this.tempDialogueSelection = null
    
        this.init()
    }

    // Charger les sprites disponibles
async loadAvailableSprites() {
    try {
        const response = await this.adminPanel.apiCall('/sprites/list')
        
        if (response.success) {
            this.availableSprites = response.sprites
            this.spritesLoaded = true
            
            // Afficher le sprite actuel ou le premier
            const currentSprite = document.querySelector('input[name="sprite"]')?.value
            if (currentSprite && this.availableSprites.includes(currentSprite)) {
                this.currentSpriteIndex = this.availableSprites.indexOf(currentSprite)
                this.displaySprite(currentSprite)
            } else if (this.availableSprites.length > 0) {
                this.currentSpriteIndex = 0
                this.displaySprite(this.availableSprites[0])
            }
            
            this.adminPanel.showNotification(`${this.availableSprites.length} sprites chargés`, 'success')
        }
    } catch (error) {
        console.error('❌ [FormBuilder] Error loading sprites:', error)
        this.availableSprites = []
    }
}
// Afficher un sprite
displaySprite(spriteName) {
    const img = document.getElementById('currentSpriteImg')
    const error = document.getElementById('spriteError')
    const nameDiv = document.getElementById('currentSpriteName')
    
    if (!img || !error || !nameDiv) return
    
    const spritePath = `/assets/npc/${spriteName}`
    
    img.src = spritePath
    img.style.display = 'block'
    error.style.display = 'none'
    nameDiv.textContent = spriteName
    
    // Mettre à jour le champ input automatiquement
    const spriteInput = document.querySelector('input[name="sprite"]')
    if (spriteInput) {
        spriteInput.value = spriteName
        spriteInput.dispatchEvent(new Event('change', { bubbles: true }))
    }
}

// Navigation sprites
previousSprite() {
    if (!this.spritesLoaded || this.availableSprites.length === 0) {
        this.loadAvailableSprites()
        return
    }
    
    this.currentSpriteIndex = (this.currentSpriteIndex - 1 + this.availableSprites.length) % this.availableSprites.length
    this.displaySprite(this.availableSprites[this.currentSpriteIndex])
}

nextSprite() {
    if (!this.spritesLoaded || this.availableSprites.length === 0) {
        this.loadAvailableSprites()
        return
    }
    
    this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.availableSprites.length
    this.displaySprite(this.availableSprites[this.currentSpriteIndex])
}

// Quand le nom change manuellement
onSpriteNameChange(spriteName) {
    if (spriteName) {
        this.displaySprite(spriteName)
        
        // Trouver l'index dans la liste
        const index = this.availableSprites.indexOf(spriteName)
        if (index !== -1) {
            this.currentSpriteIndex = index
        }
    }
}
    
    init() {
        this.container.innerHTML = this.createFormStructure()
        this.setupEventListeners()
        
        // Exposer l'instance dans le contexte global pour les handlers HTML
        window.npcFormBuilder = this
    }
    
// MÉTHODE CORRIGÉE : loadNPC avec délai plus long
loadNPC(npc) {
    console.log('🔄 [FormBuilder] Loading existing NPC:', npc)
    
    if (!npc || !npc.type) {
        console.error('❌ [FormBuilder] Invalid NPC data')
        return
    }
    
    // Clone profond pour éviter les mutations
    this.currentNPC = JSON.parse(JSON.stringify(npc))
    this.currentType = npc.type
    
    console.log('📋 [FormBuilder] NPC loaded, type:', this.currentType)
    console.log('📍 [FormBuilder] NPC position:', this.currentNPC.position)
    
    // Sélectionner le type et construire le formulaire
    this.updateTypeSelection(this.currentType)
    this.buildForm(this.currentType)
    this.showFormContent()
    
    // CORRECTION : Délai plus long pour s'assurer que le DOM est prêt
    setTimeout(() => {
        console.log('⏰ [FormBuilder] Starting field population after DOM ready')
        this.populateAllFields()
        this.updateJsonPreview()
        this.validateForm()
    }, 300) // Augmenté de 100ms à 300ms
}
    

// MÉTHODE CORRIGÉE : populateAllFields
populateAllFields() {
    console.log('📝 [FormBuilder] Populating ALL fields for NPC:', this.currentNPC);
    
    if (!this.currentNPC) return;
    
    // ✅ CORRECTION 1: Parcourir TOUS les champs du NPC, pas seulement une liste prédéfinie
    Object.keys(this.currentNPC).forEach(fieldName => {
        const value = this.currentNPC[fieldName];
        
        // Ignorer les champs système
        if (['_id', '__v', 'createdAt', 'updatedAt', 'lastUpdated'].includes(fieldName)) {
            return;
        }
        
        console.log(`🔍 [FormBuilder] Processing field: ${fieldName} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        
        // Gestion spéciale pour les objets complexes
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Si c'est un objet (comme position, config, etc.)
            if (fieldName === 'position') {
                this.populateField('position.x', value.x);
                this.populateField('position.y', value.y);
            } else {
                // Pour les autres objets, essayer de peupler comme JSON
                const textarea = document.querySelector(`textarea[name="${fieldName}"]`);
                if (textarea) {
                    textarea.value = JSON.stringify(value, null, 2);
                    console.log(`📝 [FormBuilder] Object field ${fieldName} populated as JSON`);
                } else {
                    // Essayer de peupler les sous-champs si ils existent
                    Object.keys(value).forEach(subKey => {
                        const subFieldName = `${fieldName}.${subKey}`;
                        this.populateField(subFieldName, value[subKey]);
                    });
                }
            }
        } else if (Array.isArray(value)) {
            // Si c'est un array
            this.rebuildArrayField(fieldName, value);
            console.log(`📝 [FormBuilder] Array field ${fieldName} populated with ${value.length} items`);
        } else {
            // Champ simple
            this.populateField(fieldName, value);
        }
    });
    
    // ✅ CORRECTION 2: Forcer la mise à jour de l'aperçu JSON après population
    setTimeout(() => {
        this.updateJsonPreview();
        this.validateForm();
        console.log('✅ [FormBuilder] All fields populated and JSON preview updated');
    }, 100);
}
// MÉTHODE CORRIGÉE : populateField pour mieux gérer les types
populateField(fieldName, value) {
    if (value === undefined || value === null) {
        console.log(`⚠️ [FormBuilder] Skipping field ${fieldName} - value is ${value}`);
        return;
    }
    
    // Gestion spéciale pour les champs de position
    if (fieldName === 'position.x' || fieldName === 'position.y') {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.value = Number(value);
            console.log(`📍 [FormBuilder] ${fieldName} set to:`, Number(value));
            // Déclencher l'événement change
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
    }
    
    // Chercher le champ dans le DOM
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) {
        console.log(`⚠️ [FormBuilder] Field not found in DOM: ${fieldName}`);
        return;
    }
    
    // ✅ CORRECTION: Meilleure gestion des types de champs
    try {
        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
            console.log(`☑️ [FormBuilder] ${fieldName} checked:`, Boolean(value));
        } else if (field.type === 'number') {
            field.value = Number(value);
            console.log(`🔢 [FormBuilder] ${fieldName} set to:`, Number(value));
        } else if (field.tagName.toLowerCase() === 'textarea') {
            // Pour les textareas, gérer les objets et arrays
            if (typeof value === 'object') {
                field.value = JSON.stringify(value, null, 2);
                console.log(`📝 [FormBuilder] ${fieldName} set as JSON object`);
            } else {
                field.value = String(value);
                console.log(`📝 [FormBuilder] ${fieldName} set as text:`, String(value));
            }
        } else if (field.tagName.toLowerCase() === 'select') {
            field.value = String(value);
            console.log(`📋 [FormBuilder] ${fieldName} selected:`, String(value));
        } else {
            field.value = String(value);
            console.log(`📝 [FormBuilder] ${fieldName} set to:`, String(value));
        }
        
        // ✅ CORRECTION: Toujours déclencher l'événement change
        field.dispatchEvent(new Event('change', { bubbles: true }));
        
    } catch (error) {
        console.error(`❌ [FormBuilder] Error setting field ${fieldName}:`, error);
    }
}
    // Pré-remplir les champs spécifiques au type
    populateTypeSpecificFields() {
        const typeConfig = NPC_TYPES[this.currentType]
        if (!typeConfig) return
        
        // Parcourir tous les champs optionnels du type
        typeConfig.fields.optional.forEach(fieldName => {
            const value = this.getNestedValue(this.currentNPC, fieldName)
            if (value !== undefined) {
                this.populateField(fieldName, value)
            }
        })
        
        // CORRECTION 2: Champs spécifiques selon le type
        switch (this.currentType) {
            case 'dialogue':
                this.populateField('dialogueId', this.currentNPC.dialogueId)
                break
                
            case 'merchant':
    this.populateField('shopId', this.currentNPC.shopId)
    this.populateField('shopType', this.currentNPC.shopType)
    
    // ✅ NOUVEAU: Mettre à jour les détails de la boutique si shopId existe
    if (this.currentNPC.shopId) {
        setTimeout(() => {
            this.updateShopDetails('shopId', this.currentNPC.shopId)
        }, 200)
    }
    break
                
            case 'trainer':
                this.populateField('trainerId', this.currentNPC.trainerId)
                this.populateField('trainerClass', this.currentNPC.trainerClass)
                this.populateField('trainerRank', this.currentNPC.trainerRank)
                this.populateField('trainerTitle', this.currentNPC.trainerTitle)
                break
                
            case 'gym_leader':
                if (this.currentNPC.gymConfig) {
                    this.populateField('gymId', this.currentNPC.gymConfig.gymId)
                    this.populateField('gymType', this.currentNPC.gymConfig.gymType)
                    this.populateField('badgeId', this.currentNPC.gymConfig.badgeId)
                    this.populateField('badgeName', this.currentNPC.gymConfig.badgeName)
                }
                break
                
            case 'transport':
                if (this.currentNPC.transportConfig) {
                    this.populateField('transportType', this.currentNPC.transportConfig.transportType)
                    this.populateField('vehicleId', this.currentNPC.transportConfig.vehicleId)
                }
                break
                
            case 'service':
                if (this.currentNPC.serviceConfig) {
                    this.populateField('serviceType', this.currentNPC.serviceConfig.serviceType)
                    this.populateField('serviceCost', this.currentNPC.serviceConfig.cost)
                }
                break
                
            case 'healer':
                if (this.currentNPC.healerConfig) {
                    this.populateField('healingType', this.currentNPC.healerConfig.healingType)
                    this.populateField('healingCost', this.currentNPC.healerConfig.cost)
                }
                break
        }
    }

    // Pré-remplir les champs de type array
    populateArrayFields() {
        const arrayFields = ['dialogueIds', 'questsToGive', 'questsToEnd']
        
        arrayFields.forEach(fieldName => {
            const value = this.getNestedValue(this.currentNPC, fieldName)
            if (Array.isArray(value)) {
                this.rebuildArrayField(fieldName, value)
            }
        })
    }

    // Pré-remplir les champs de type object/JSON
    populateObjectFields() {
        const objectFields = [
            'conditionalDialogueIds', 'zoneInfo', 'shopConfig', 'battleConfig',
            'healerConfig', 'gymConfig', 'transportConfig', 'serviceConfig',
            'spawnConditions', 'questRequirements', 'questDialogueIds'
        ]
        
        objectFields.forEach(fieldName => {
            const value = this.getNestedValue(this.currentNPC, fieldName)
            if (value && typeof value === 'object') {
                const textarea = document.querySelector(`textarea[name="${fieldName}"]`)
                if (textarea) {
                    textarea.value = JSON.stringify(value, null, 2)
                }
            }
        })
    }

    // Reconstruire un champ array avec ses valeurs
    rebuildArrayField(fieldName, values) {
        const arrayField = document.querySelector(`[data-field-name="${fieldName}"]`)
        if (!arrayField) return
        
        const itemsContainer = arrayField.querySelector('.array-items')
        if (!itemsContainer) return
        
        itemsContainer.innerHTML = values.map((item, index) => 
            this.createArrayItem(fieldName, item, index)
        ).join('')
        
        // Mettre à jour la valeur dans l'objet NPC
        this.setFieldValue(fieldName, values)
    }

    // Obtenir une valeur imbriquée d'un objet
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj)
    }

    // Structure principale du formulaire (inchangée)
    createFormStructure() {
        return `
            <div class="npc-form-builder">
                <!-- Sélection du type -->
                <div class="type-selector-section">
                    <h3>🎭 Type de NPC</h3>
                    <div class="type-grid" id="typeGrid">
                        ${this.createTypeSelector()}
                    </div>
                </div>

                <!-- Zone de formulaire dynamique -->
                <div class="form-content" id="formContent" style="display: none;">
                    <div class="form-sections" id="formSections">
                        <!-- Contenu généré dynamiquement -->
                    </div>
                    
                    <!-- Zone de validation -->
                    <div class="validation-panel" id="validationPanel">
                        <!-- Messages de validation -->
                    </div>
                    
                    <!-- Aperçu JSON -->
                    <div class="json-preview" id="jsonPreview">
                        <h4>📄 Aperçu JSON</h4>
                        <pre><code id="jsonContent">{}</code></pre>
                    </div>
                </div>
            </div>
        `
    }

    // Créer le sélecteur de type
    createTypeSelector() {
        return Object.entries(NPC_TYPES).map(([type, config]) => `
            <div class="type-card" data-type="${type}" onclick="window.npcFormBuilder.selectType('${type}')">
                <div class="type-icon">${config.icon}</div>
                <div class="type-name">${config.name}</div>
                <div class="type-description">${config.description}</div>
            </div>
        `).join('')
    }

    // Sélectionner un type de NPC
    selectType(type) {
        if (!NPC_TYPES[type]) return
        
        this.currentType = type
        
        // Si pas de NPC courant, en créer un nouveau
        if (!this.currentNPC) {
            this.currentNPC = this.createEmptyNPCFromType(type)
        } else {
            // Mettre à jour le type du NPC existant
            this.currentNPC.type = type
        }
        
        // Mettre à jour l'interface
        this.updateTypeSelection(type)
        this.buildForm(type)
        this.showFormContent()
        
        // Si on charge un NPC existant, pré-remplir les champs
        if (this.currentNPC.id) {
            setTimeout(() => {
                this.populateAllFields()
            }, 100)
        }
        
        this.updateJsonPreview()
    }

    updateTypeSelection(selectedType) {
        const typeCards = document.querySelectorAll('.type-card')
        typeCards.forEach(card => {
            card.classList.toggle('selected', card.dataset.type === selectedType)
        })
    }

    showFormContent() {
        const formContent = document.getElementById('formContent')
        if (formContent) {
            formContent.style.display = 'block'
            formContent.scrollIntoView({ behavior: 'smooth' })
        }
    }

    // Construire le formulaire pour un type spécifique (ÉTENDU)
    buildForm(type) {
        const typeConfig = NPC_TYPES[type]
        const formSections = document.getElementById('formSections')
        
        if (!formSections) return

        let html = ''
        
        // Créer chaque section avec TOUS les champs
        typeConfig.sections.forEach(sectionName => {
            html += this.createSection(sectionName, type, typeConfig)
        })
        
        formSections.innerHTML = html
        this.setupFieldEventListeners()
        this.validateForm()
    }

    // Créer une section de formulaire (CORRIGÉE avec tous les champs)
    createSection(sectionName, type, typeConfig) {
        const sectionFields = this.getAllSectionFields(sectionName, type, typeConfig)
        const sectionTitle = this.getSectionTitle(sectionName)
        
        let fieldsHTML = ''
        sectionFields.forEach(fieldName => {
            fieldsHTML += this.createField(fieldName, type, typeConfig)
        })
        
        return `
            <div class="form-section" data-section="${sectionName}">
                <div class="section-header" onclick="window.npcFormBuilder.toggleSection('${sectionName}')">
                    <h4>${sectionTitle}</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content active">
                    <div class="fields-grid">
                        ${fieldsHTML}
                    </div>
                </div>
            </div>
        `
    }

    // NOUVELLE MÉTHODE : Obtenir TOUS les champs d'une section (avec champs manquants)
    getAllSectionFields(sectionName, type, typeConfig) {
        // Champs de base de la section
        let fields = typeConfig.fieldGroups[sectionName] || []
        
        // CORRECTION 2: Ajouter les champs manquants selon la section et le type
        switch (sectionName) {
            case 'basic':
                // Champs de base toujours présents
                fields = ['name', 'position', 'sprite', 'direction', 'interactionRadius']
                break
                
// ✅ VERSION SIMPLIFIÉE ET OPTIMISÉE
case 'dialogues':
    if (type === 'dialogue') {
        // NPC Dialogue simple : Un dialogue principal + conditionnels
        fields = ['dialogueId', 'conditionalDialogueIds']
    } else if (type === 'merchant') {
        // Boutique : Dialogue principal + dialogues spécifiques boutique
        fields = ['dialogueId', 'shopDialogueIds']
    } else if (type === 'trainer' || type === 'gym_leader') {
        // Combat : Dialogue principal + dialogues de combat
        fields = ['dialogueId', 'battleDialogueIds']
    } else if (type === 'healer') {
        // Soigneur : Dialogue principal + dialogues de soin
        fields = ['dialogueId', 'healerDialogueIds']
    } else if (type === 'transport') {
        // Transport : Dialogue principal + dialogues de transport
        fields = ['dialogueId', 'transportDialogueIds']
    } else if (type === 'service') {
        // Service : Dialogue principal + dialogues de service
        fields = ['dialogueId', 'serviceDialogueIds']
    } else {
        // Fallback pour autres types
        fields = ['dialogueId']
    }
    break
                
            case 'shop':
                if (type === 'merchant') {
                    fields = ['shopId', 'shopType', 'shopConfig']
                }
                break
                
            case 'trainer':
                if (type === 'trainer' || type === 'gym_leader') {
                    fields = ['trainerId', 'trainerClass', 'trainerRank', 'trainerTitle']
                }
                break
                
            case 'battle':
                if (type === 'trainer' || type === 'gym_leader') {
                    fields = ['battleConfig', 'battleConditions']
                }
                break
                
            case 'gym':
                if (type === 'gym_leader') {
                    fields = ['gymConfig', 'challengeConditions', 'gymRewards']
                }
                break
                
            case 'healing':
                if (type === 'healer') {
                    fields = ['healerConfig', 'additionalServices']
                }
                break
                
            case 'transport':
                if (type === 'transport') {
                    fields = ['transportConfig', 'destinations', 'schedules']
                }
                break
                
            case 'service':
                if (type === 'service') {
                    fields = ['serviceConfig', 'availableServices']
                }
                break
                
            case 'rewards':
                if (type === 'trainer' || type === 'gym_leader') {
                    fields = ['rewards', 'rebattle']
                }
                break
                
            case 'vision':
                if (type === 'trainer') {
                    fields = ['visionConfig']
                }
                break
                
            case 'quests':
                // Tous les NPCs peuvent avoir des quêtes
                fields = ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds']
                break
                
            case 'conditions':
                // Tous les NPCs peuvent avoir des conditions de spawn
                fields = ['spawnConditions']
                break
                
            case 'interaction':
                // Champs d'interaction communs
                fields = ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
                break
        }
        
        // Retirer les doublons
        return [...new Set(fields)]
    }

    // Créer un champ de formulaire (méthode existante mais améliorée)
    createField(fieldName, type, typeConfig) {
        const fieldConfig = this.getFieldConfig(fieldName, typeConfig)
        const currentValue = this.getFieldValue(fieldName)
        const isRequired = typeConfig.fields.required.includes(fieldName)
        const hasError = this.validationErrors[fieldName]
        
        let fieldHTML = ''
        
        switch (fieldConfig.type) {
            case 'string':
                fieldHTML = this.createStringField(fieldName, fieldConfig, currentValue, isRequired)
                break
            case 'number':
                fieldHTML = this.createNumberField(fieldName, fieldConfig, currentValue, isRequired)
                break
            case 'boolean':
                fieldHTML = this.createBooleanField(fieldName, fieldConfig, currentValue, isRequired)
                break
            case 'select':
                fieldHTML = this.createSelectField(fieldName, fieldConfig, currentValue, isRequired, type)
                break
            case 'array':
                fieldHTML = this.createArrayField(fieldName, fieldConfig, currentValue, isRequired)
                break
            case 'object':
                fieldHTML = this.createObjectField(fieldName, fieldConfig, currentValue, isRequired)
                break
            default:
                fieldHTML = this.createStringField(fieldName, fieldConfig, currentValue, isRequired)
        }
        
        const errorClass = hasError ? 'field-error' : ''
        const requiredMark = isRequired ? '<span class="required">*</span>' : ''
        const helpText = this.getHelpText(fieldName)
        
        return `
            <div class="form-field ${errorClass}" data-field="${fieldName}">
                <label class="field-label">
                    ${this.getFieldDisplayName(fieldName)} ${requiredMark}
                </label>
                ${fieldHTML}
                ${helpText ? `<div class="field-help">${helpText}</div>` : ''}
                ${hasError ? `<div class="field-error-message">${hasError}</div>` : ''}
            </div>
        `
    }

    // ... (Garder toutes les autres méthodes existantes: createStringField, createNumberField, etc.)
    
    // MÉTHODES EXISTANTES (raccourcies pour l'espace, mais à garder intégralement)
    createStringField(fieldName, fieldConfig, currentValue, isRequired) {
        const placeholder = fieldConfig.placeholder || `Entrez ${this.getFieldDisplayName(fieldName)}`
        
        if (fieldName === 'sprite') {
            return this.createSpriteField(fieldName, currentValue, isRequired)
        }
        
        if (fieldName === 'position') {
            return this.createPositionField(fieldName, currentValue)
        }

       if (fieldName === 'shopId') {
    return this.createShopSelectorField(fieldName, currentValue, isRequired)
}

// ✅ NOUVEAU: Gestion spéciale pour les champs de dialogue
if (fieldName === 'dialogueId' || fieldName === 'dialogueIds' || fieldName.includes('DialogueIds') || fieldName.includes('dialogue')) {
    return this.createDialogueSelectorField(fieldName, currentValue, isRequired)
}

if (fieldName.includes('Description')) {
    return `<textarea 
        class="form-textarea" 
        name="${fieldName}" 
        placeholder="${placeholder}"
        rows="3"
        ${isRequired ? 'required' : ''}
    >${currentValue || ''}</textarea>`
}
        
        return `<input 
            type="text" 
            class="form-input" 
            name="${fieldName}" 
            value="${currentValue || ''}" 
            placeholder="${placeholder}"
            ${isRequired ? 'required' : ''}
        >`
    }

    createSpriteField(fieldName, currentValue, isRequired) {
    const suggestions = SUGGESTED_SPRITES[this.currentType] || []
    
    return `
        <div class="sprite-field">
            <input 
                type="text" 
                class="form-input" 
                name="${fieldName}" 
                value="${currentValue || ''}" 
                placeholder="nom_sprite.png"
                list="spriteList"
                ${isRequired ? 'required' : ''}
                onchange="window.npcFormBuilder.onSpriteNameChange(this.value)"
            >
            <datalist id="spriteList">
                ${suggestions.map(sprite => `<option value="${sprite}">`).join('')}
            </datalist>
            
            <!-- Prévisualisation sprite -->
            <div class="sprite-preview" id="spritePreview">
                <div class="sprite-controls">
                    <button type="button" class="btn-sprite-nav" onclick="window.npcFormBuilder.previousSprite()">
                        ◀️
                    </button>
                    <div class="sprite-display">
                        <img id="currentSpriteImg" src="" alt="Sprite" style="display: none;" 
                             onerror="this.style.display='none'; document.getElementById('spriteError').style.display='block'">
                        <div id="spriteError" class="sprite-error" style="display: none;">
                            🚫 Sprite non trouvé
                        </div>
                        <div class="sprite-name" id="currentSpriteName">Aucun sprite</div>
                    </div>
                    <button type="button" class="btn-sprite-nav" onclick="window.npcFormBuilder.nextSprite()">
                        ▶️
                    </button>
                </div>
                <button type="button" class="btn btn-sm sprite-browser" onclick="window.npcFormBuilder.loadAvailableSprites()">
                    🖼️ Charger sprites
                </button>
            </div>
        </div>
    `
}

    createNumberField(fieldName, fieldConfig, currentValue, isRequired) {
        const min = fieldConfig.min !== undefined ? fieldConfig.min : ''
        const max = fieldConfig.max !== undefined ? fieldConfig.max : ''
        const step = fieldConfig.step || (fieldName.includes('Percent') ? '0.1' : '1')
        
        return `<input 
            type="number" 
            class="form-input" 
            name="${fieldName}" 
            value="${currentValue || ''}" 
            min="${min}" 
            max="${max}" 
            step="${step}"
            ${isRequired ? 'required' : ''}
        >`
    }

    createBooleanField(fieldName, fieldConfig, currentValue, isRequired) {
        return `
            <div class="boolean-field">
                <input 
                    type="checkbox" 
                    class="form-checkbox" 
                    name="${fieldName}" 
                    ${currentValue ? 'checked' : ''}
                >
                <span class="checkbox-label">${fieldConfig.help || 'Activer'}</span>
            </div>
        `
    }

    createSelectField(fieldName, fieldConfig, currentValue, isRequired, type) {
        let options = fieldConfig.options || []
        
        if (fieldName === 'direction') {
            options = ['north', 'south', 'east', 'west']
        } else if (fieldName === 'type') {
            options = Object.keys(NPC_TYPES)
        } else if (NPC_TYPES[type].selectOptions && NPC_TYPES[type].selectOptions[fieldName]) {
            options = NPC_TYPES[type].selectOptions[fieldName]
        }
        
        return `
            <select class="form-select" name="${fieldName}" ${isRequired ? 'required' : ''}>
                <option value="">Choisir...</option>
                ${options.map(option => `
                    <option value="${option}" ${currentValue === option ? 'selected' : ''}>
                        ${this.getOptionDisplayName(option)}
                    </option>
                `).join('')}
            </select>
        `
    }

   createPositionField(fieldName, currentValue) {
    console.log('🏗️ [FormBuilder] Creating position field, currentValue:', currentValue)
    
    const position = currentValue || { x: 0, y: 0 }
    
    return `
        <div class="position-field">
            <div class="position-inputs">
                <input 
                    type="number" 
                    class="form-input position-x" 
                    name="${fieldName}.x" 
                    value="${position.x || 0}" 
                    placeholder="X" 
                    min="0"
                    data-field-type="position-x"
                >
                <input 
                    type="number" 
                    class="form-input position-y" 
                    name="${fieldName}.y" 
                    value="${position.y || 0}" 
                    placeholder="Y" 
                    min="0"
                    data-field-type="position-y"
                >
            </div>
            <div class="position-presets">
                ${Object.entries(POSITION_PRESETS).map(([name, pos]) => `
                    <button type="button" class="btn btn-sm preset-btn" 
                            onclick="window.npcFormBuilder.setPosition(${pos.x}, ${pos.y})">
                        ${name}
                    </button>
                `).join('')}
            </div>
            <div class="position-display">
                Position: <span id="currentPosition">${position.x}, ${position.y}</span>
            </div>
        </div>
    `
}

createArrayField(fieldName, fieldConfig, currentValue, isRequired) {
    // Vérifier si c'est un champ de quêtes
    if (fieldName === 'questsToGive' || fieldName === 'questsToEnd' || fieldName.includes('quest')) {
        return this.createQuestSelectorField(fieldName, currentValue, isRequired)
    }
    
    // Sinon, utiliser le champ array standard
    const items = currentValue || []
    
    return `
        <div class="array-field" data-field-name="${fieldName}">
            <div class="array-items" id="${fieldName}_items">
                ${items.map((item, index) => this.createArrayItem(fieldName, item, index)).join('')}
            </div>
            <button type="button" class="btn btn-sm add-array-item" 
                    onclick="window.npcFormBuilder.addArrayItem('${fieldName}')">
                ➕ Ajouter ${this.getFieldDisplayName(fieldName)}
            </button>
        </div>
    `
}

    createArrayItem(fieldName, item, index) {
        return `
            <div class="array-item" data-index="${index}">
                <input type="text" class="form-input" 
                       name="${fieldName}[${index}]" 
                       value="${item}" 
                       placeholder="Élément ${index + 1}">
                <button type="button" class="btn btn-sm btn-danger remove-array-item" 
                        onclick="window.npcFormBuilder.removeArrayItem('${fieldName}', ${index})">
                    🗑️
                </button>
            </div>
        `
    }

    createObjectField(fieldName, fieldConfig, currentValue, isRequired) {
        const jsonValue = currentValue ? JSON.stringify(currentValue, null, 2) : '{}'
        
        return `
            <div class="object-field">
                <textarea 
                    class="form-textarea json-editor" 
                    name="${fieldName}" 
                    rows="6" 
                    placeholder="Configuration JSON..."
                    ${isRequired ? 'required' : ''}
                >${jsonValue}</textarea>
                <div class="json-tools">
                    <button type="button" class="btn btn-sm" onclick="window.npcFormBuilder.formatJSON('${fieldName}')">
                        🎨 Formater
                    </button>
                    <button type="button" class="btn btn-sm" onclick="window.npcFormBuilder.validateJSON('${fieldName}')">
                        ✅ Valider
                    </button>
                </div>
            </div>
        `
    }

    // Event listeners
    setupEventListeners() {
        this.container.addEventListener('input', (e) => {
            this.handleFieldChange(e)
        })
        
        this.container.addEventListener('change', (e) => {
            this.handleFieldChange(e)
        })
    }

    setupFieldEventListeners() {
        const presetButtons = this.container.querySelectorAll('.preset-btn')
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault()
            })
        })
    }

    // Gestion des changements
 handleFieldChange(e) {
    const field = e.target
    const fieldName = field.name
    
    if (!fieldName || !this.currentNPC) return
    
    let value = this.getFieldInputValue(field)
    
    // ✅ CORRECTION: Parser les objets JSON automatiquement
    if (field.classList.contains('json-editor')) {
        try {
            value = JSON.parse(field.value || '{}')
        } catch (error) {
            console.warn('Invalid JSON, using empty object:', fieldName)
            value = {}
        }
    }
    
    console.log(`📝 [FormBuilder] Field change: ${fieldName} = ${value}`)
    
    // Gestion spéciale pour les champs de position
    if (fieldName === 'position.x' || fieldName === 'position.y') {
        value = Number(value) || 0
        console.log(`📍 [FormBuilder] Position field ${fieldName} changed to:`, value)
        
        // Mettre à jour l'affichage en temps réel
        const xInput = document.querySelector('input[name="position.x"]')
        const yInput = document.querySelector('input[name="position.y"]')
        const positionDisplay = document.getElementById('currentPosition')
        
        if (positionDisplay && xInput && yInput) {
            positionDisplay.textContent = `${xInput.value || 0}, ${yInput.value || 0}`
        }
    }
    
    this.setFieldValue(fieldName, value)
    
    // Validation en temps réel
    this.validateField(fieldName)
    this.updateJsonPreview()
    
    // Notify handlers
    this.changeHandlers.forEach(handler => handler(this.currentNPC, fieldName, value))
}

    
    getFieldInputValue(field) {
        switch (field.type) {
            case 'checkbox':
                return field.checked
            case 'number':
                return field.value ? parseFloat(field.value) : undefined
            default:
                return field.value || undefined
        }
    }

    // Méthodes utilitaires
    getFieldConfig(fieldName, typeConfig) {
        if (COMMON_FIELDS[fieldName]) {
            return COMMON_FIELDS[fieldName]
        }
        
        const fieldType = typeConfig.fieldTypes?.[fieldName]
        return {
            type: fieldType || 'string',
            options: typeConfig.selectOptions?.[fieldName]
        }
    }

    getFieldValue(fieldName) {
        if (!this.currentNPC) return null
        
        if (fieldName.includes('.')) {
            const parts = fieldName.split('.')
            let value = this.currentNPC
            for (const part of parts) {
                value = value?.[part]
            }
            return value
        }
        
        return this.currentNPC[fieldName]
    }

    debugNPCPosition() {
    console.log('🔍 [FormBuilder] NPC Position Debug:')
    console.log('📋 Current NPC:', this.currentNPC)
    console.log('📍 Current NPC Position:', this.currentNPC?.position)
    
    const xInput = document.querySelector('input[name="position.x"]')
    const yInput = document.querySelector('input[name="position.y"]')
    
    console.log('🔍 X Input:', xInput ? `value=${xInput.value}` : 'NOT FOUND')
    console.log('🔍 Y Input:', yInput ? `value=${yInput.value}` : 'NOT FOUND')
    
    if (this.currentNPC && this.currentNPC.position) {
        console.log('🔄 Forcing position update...')
        this.setPosition(this.currentNPC.position.x, this.currentNPC.position.y)
    }
}
    
    setFieldValue(fieldName, value) {
        if (!this.currentNPC) return
        
        if (fieldName.includes('.')) {
            const parts = fieldName.split('.')
            let obj = this.currentNPC
            for (let i = 0; i < parts.length - 1; i++) {
                if (!obj[parts[i]]) obj[parts[i]] = {}
                obj = obj[parts[i]]
            }
            obj[parts[parts.length - 1]] = value
        } else {
            this.currentNPC[fieldName] = value
        }
    }

    getFieldDisplayName(fieldName) {
        const displayNames = {
            id: 'ID',
            name: 'Nom',
            type: 'Type',
            position: 'Position',
            sprite: 'Sprite',
            direction: 'Direction',
            shopId: 'ID Boutique',
            shopType: 'Type Boutique',
            shopConfig: 'Configuration Boutique',
            shopDialogueIds: 'Dialogues Boutique',
            businessHours: 'Horaires d\'ouverture',
            accessRestrictions: 'Restrictions d\'accès',
            trainerId: 'ID Dresseur',
            trainerClass: 'Classe Dresseur',
            trainerRank: 'Rang Dresseur',
            trainerTitle: 'Titre Dresseur',
            dialogueIds: 'IDs de Dialogue',
            dialogueId: 'ID Dialogue Principal',
            conditionalDialogueIds: 'Dialogues Conditionnels',
            questsToGive: 'Quêtes à Donner',
            questsToEnd: 'Quêtes à Terminer',
            questRequirements: 'Prérequis Quêtes',
            questDialogueIds: 'Dialogues de Quêtes',
            interactionRadius: 'Rayon d\'Interaction',
            cooldownSeconds: 'Délai (secondes)',
            canWalkAway: 'Peut s\'éloigner',
            autoFacePlayer: 'Se tourne vers le joueur',
            repeatable: 'Répétable',
            spawnConditions: 'Conditions d\'apparition',
            zoneInfo: 'Informations de Zone',
            shopConfig: 'Configuration Boutique',
            shopDialogueIds: 'Dialogues Boutique',
            businessHours: 'Horaires d\'ouverture',
            accessRestrictions: 'Restrictions d\'accès',
            battleConfig: 'Configuration Combat',
            battleDialogueIds: 'Dialogues Combat',
            battleConditions: 'Conditions Combat',
            rewards: 'Récompenses',
            rebattle: 'Recombat',
            visionConfig: 'Configuration Vision',
            progressionFlags: 'Flags de Progression',
            healerConfig: 'Configuration Soins',
            healerDialogueIds: 'Dialogues Soins',
            additionalServices: 'Services Additionnels',
            serviceRestrictions: 'Restrictions Service',
            gymConfig: 'Configuration Arène',
            gymDialogueIds: 'Dialogues Arène',
            challengeConditions: 'Conditions Défi',
            gymRewards: 'Récompenses Arène',
            rematchConfig: 'Configuration Revanche',
            transportConfig: 'Configuration Transport',
            destinations: 'Destinations',
            schedules: 'Horaires',
            transportDialogueIds: 'Dialogues Transport',
            weatherRestrictions: 'Restrictions Météo',
            serviceConfig: 'Configuration Service',
            availableServices: 'Services Disponibles',
            serviceDialogueIds: 'Dialogues Service',
            minigameConfig: 'Configuration Mini-jeu',
            contestCategories: 'Catégories Concours',
            contestRewards: 'Récompenses Concours',
            contestDialogueIds: 'Dialogues Concours',
            contestSchedule: 'Planning Concours',
            researchConfig: 'Configuration Recherche',
            researchServices: 'Services Recherche',
            acceptedPokemon: 'Pokémon Acceptés',
            researchDialogueIds: 'Dialogues Recherche',
            researchRewards: 'Récompenses Recherche',
            guildConfig: 'Configuration Guilde',
            recruitmentRequirements: 'Prérequis Recrutement',
            guildServices: 'Services Guilde',
            guildDialogueIds: 'Dialogues Guilde',
            rankSystem: 'Système de Rangs',
            eventConfig: 'Configuration Événement',
            eventPeriod: 'Période Événement',
            eventActivities: 'Activités Événement',
            eventDialogueIds: 'Dialogues Événement',
            globalProgress: 'Progression Globale',
            questMasterConfig: 'Configuration Maître Quêtes',
            questMasterDialogueIds: 'Dialogues Maître Quêtes',
            questRankSystem: 'Système Rangs Quêtes',
            epicRewards: 'Récompenses Épiques',
            specialConditions: 'Conditions Spéciales'
        }
        
        return displayNames[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').trim()
    }

    getSectionTitle(sectionName) {
        const sectionTitles = {
            basic: '📋 Informations de Base',
            dialogues: '💬 Dialogues',
            shop: '🏪 Configuration Boutique',
            business: '🕐 Gestion Commerciale',
            access: '🔒 Restrictions d\'Accès',
            trainer: '⚔️ Informations Dresseur',
            battle: '⚔️ Configuration Combat',
            rewards: '🎁 Récompenses',
            vision: '👁️ Vision et Détection',
            healing: '💊 Configuration Soins',
            services: '🔧 Services',
            restrictions: '⚙️ Restrictions',
            gym: '🏆 Configuration Arène',
            challenge: '🎯 Conditions de Défi',
            rematch: '🔄 Système de Revanche',
            transport: '🚢 Configuration Transport',
            destinations: '🗺️ Destinations',
            schedule: '📅 Horaires',
            weather: '🌤️ Restrictions Météo',
            service: '🔧 Configuration Service',
            minigame: '🎮 Configuration Mini-jeu',
            activities: '🎪 Activités',
            research: '🔬 Configuration Recherche',
            pokemon: '🐾 Gestion Pokémon',
            guild: '🏛️ Configuration Guilde',
            recruitment: '👥 Recrutement',
            ranks: '⭐ Système de Rangs',
            event: '🎉 Configuration Événement',
            period: '📆 Période',
            progress: '📊 Progression',
            questmaster: '📜 Configuration Maître',
            quests: '📜 Système de Quêtes',
            conditions: '⚙️ Conditions',
            interaction: '🤝 Interaction',
            period: '🕐 Horaires'
        }
        
        return sectionTitles[sectionName] || sectionName
    }

    getOptionDisplayName(option) {
        const optionNames = {
            north: 'Nord',
            south: 'Sud',
            east: 'Est',
            west: 'Ouest',
            pokemart: 'PokéMart',
            items: 'Objets Généraux',
            tms: 'CTs/CSs',
            berries: 'Baies',
            clothes: 'Vêtements',
            black_market: 'Marché Noir',
            department_store: 'Grand Magasin',
            youngster: 'Gamin',
            lass: 'Fillette',
            bug_catcher: 'Attrape-Insectes',
            fisherman: 'Pêcheur',
            hiker: 'Montagnard',
            biker: 'Motard',
            sailor: 'Marin',
            rocket_grunt: 'Sbire Rocket',
            free: 'Gratuit',
            paid: 'Payant',
            pokemon_center: 'Centre Pokémon',
            name_rater: 'Évaluateur de Noms',
            move_deleter: 'Effaceur d\'Attaques',
            move_reminder: 'Rappel d\'Attaques',
            iv_checker: 'Vérificateur IV',
            boat: 'Bateau',
            train: 'Train',
            fly: 'Vol',
            teleport: 'Téléportation',
            pokemon_contest: 'Concours Pokémon',
            fishing_contest: 'Concours Pêche',
            slots: 'Machine à Sous',
            lottery: 'Loterie',
            pokedex: 'Pokédex',
            breeding: 'Reproduction',
            genetics: 'Génétique',
            evolution: 'Évolution',
            neutral: 'Neutre',
            good: 'Bon',
            evil: 'Mauvais',
            criminal: 'Criminel',
            ranger: 'Ranger',
            seasonal: 'Saisonnier',
            raid: 'Raid',
            tournament: 'Tournoi',
            limited_time: 'Temps Limité',
            normal: 'Normal',
            rare: 'Rare',
            epic: 'Épique',
            legendary: 'Légendaire'
        }
        
        return optionNames[option] || option.replace(/_/g, ' ')
    }

    getHelpText(fieldName) {
        return FIELD_HELP[fieldName] || null
    }

    // Actions utilisateur
    toggleSection(sectionName) {
        const section = document.querySelector(`[data-section="${sectionName}"]`)
        if (!section) return
        
        const content = section.querySelector('.section-content')
        const toggle = section.querySelector('.section-toggle')
        
        if (content && toggle) {
            content.classList.toggle('active')
            toggle.textContent = content.classList.contains('active') ? '▼' : '▶'
        }
    }

    addArrayItem(fieldName) {
        const currentValue = this.getFieldValue(fieldName) || []
        currentValue.push('')
        this.setFieldValue(fieldName, currentValue)
        
        // Rebuilder le champ array
        const arrayField = document.querySelector(`[data-field-name="${fieldName}"]`)
        if (arrayField) {
            const itemsContainer = arrayField.querySelector('.array-items')
            itemsContainer.innerHTML = currentValue.map((item, index) => 
                this.createArrayItem(fieldName, item, index)
            ).join('')
        }
        
        this.updateJsonPreview()
    }

    removeArrayItem(fieldName, index) {
        const currentValue = this.getFieldValue(fieldName) || []
        currentValue.splice(index, 1)
        this.setFieldValue(fieldName, currentValue)
        
        // Rebuilder le champ array
        const arrayField = document.querySelector(`[data-field-name="${fieldName}"]`)
        if (arrayField) {
            const itemsContainer = arrayField.querySelector('.array-items')
            itemsContainer.innerHTML = currentValue.map((item, idx) => 
                this.createArrayItem(fieldName, item, idx)
            ).join('')
        }
        
        this.updateJsonPreview()
    }

setPosition(x, y) {
    console.log('📍 [FormBuilder] Setting position to:', x, y)
    
    this.setFieldValue('position.x', x)
    this.setFieldValue('position.y', y)
    
    // Mettre à jour les inputs
    const xInput = document.querySelector('input[name="position.x"]')
    const yInput = document.querySelector('input[name="position.y"]')
    
    if (xInput) {
        xInput.value = x
        console.log('✅ [FormBuilder] X input updated to:', x)
    }
    if (yInput) {
        yInput.value = y
        console.log('✅ [FormBuilder] Y input updated to:', y)
    }
    
    // Mettre à jour l'affichage de position
    const positionDisplay = document.getElementById('currentPosition')
    if (positionDisplay) {
        positionDisplay.textContent = `${x}, ${y}`
    }
    
    this.updateJsonPreview()
    
    // Déclencher les événements change
    if (xInput) xInput.dispatchEvent(new Event('change', { bubbles: true }))
    if (yInput) yInput.dispatchEvent(new Event('change', { bubbles: true }))
}
    

    validateJSON(fieldName) {
        const textarea = document.querySelector(`textarea[name="${fieldName}"]`)
        if (!textarea) return
        
        try {
            JSON.parse(textarea.value)
            alert('JSON valide ✅')
            textarea.classList.remove('json-error')
        } catch (error) {
            alert('JSON invalide : ' + error.message)
            textarea.classList.add('json-error')
        }
    }

    formatJSON(fieldName) {
    const textarea = document.querySelector(`textarea[name="${fieldName}"]`)
    if (!textarea) return
    
    try {
        const parsed = JSON.parse(textarea.value)
        textarea.value = JSON.stringify(parsed, null, 2)
        textarea.classList.remove('json-error')
        this.adminPanel?.showNotification('JSON formaté avec succès', 'success')
    } catch (error) {
        textarea.classList.add('json-error')
        this.adminPanel?.showNotification('JSON invalide : ' + error.message, 'error')
    }
}

    openSpriteBrowser() {
        // TODO: Implémenter un navigateur de sprites
        alert('Navigateur de sprites à implémenter')
    }

    // Validation
    validateField(fieldName) {
        if (!this.currentNPC) return
        
        const result = this.validator.validateNPC(this.currentNPC)
        
        this.validationErrors = {}
        result.errors.forEach(error => {
            this.validationErrors[error.field] = error.message
        })
        
        this.updateFieldError(fieldName)
        this.updateValidationPanel(result)
    }

    validateForm() {
        if (!this.currentNPC) return
        
        const result = this.validator.validateNPC(this.currentNPC)
        this.updateValidationPanel(result)
        return result
    }

    updateFieldError(fieldName) {
        const fieldElement = document.querySelector(`[data-field="${fieldName}"]`)
        if (!fieldElement) return
        
        const hasError = this.validationErrors[fieldName]
        fieldElement.classList.toggle('field-error', !!hasError)
        
        const errorMsg = fieldElement.querySelector('.field-error-message')
        if (errorMsg) {
            errorMsg.textContent = hasError || ''
            errorMsg.style.display = hasError ? 'block' : 'none'
        }
    }

    updateValidationPanel(result) {
        const panel = document.getElementById('validationPanel')
        if (!panel) return
        
        let html = ''
        
        if (result.errors.length > 0) {
            html += `<div class="validation-errors">
                <h5>❌ Erreurs (${result.errors.length})</h5>
                ${result.errors.map(error => `<div class="validation-item error">${error.message}</div>`).join('')}
            </div>`
        }
        
        if (result.warnings.length > 0) {
            html += `<div class="validation-warnings">
                <h5>⚠️ Avertissements (${result.warnings.length})</h5>
                ${result.warnings.map(warning => `<div class="validation-item warning">${warning.message}</div>`).join('')}
            </div>`
        }
        
        if (result.suggestions.length > 0) {
            html += `<div class="validation-suggestions">
                <h5>💡 Suggestions (${result.suggestions.length})</h5>
                ${result.suggestions.map(suggestion => `<div class="validation-item suggestion">${suggestion.message}</div>`).join('')}
            </div>`
        }
        
        if (result.valid) {
            html = `<div class="validation-success">
                <h5>✅ NPC Valide</h5>
                <div class="validation-item success">Toutes les validations sont passées avec succès !</div>
            </div>`
        }
        
        panel.innerHTML = html
    }

    // Aperçu JSON
    updateJsonPreview() {
        const preview = document.getElementById('jsonContent')
        if (!preview || !this.currentNPC) return
        
        preview.textContent = JSON.stringify(this.currentNPC, null, 2)
    }

    // Méthodes utilitaires
    createEmptyNPCFromType(type) {
        const baseNPC = {
            id: null,
            name: `Nouveau ${NPC_TYPES[type]?.name || type}`,
            type: type,
            position: { x: 0, y: 0 },
            sprite: 'default.png',
            direction: 'south',
            interactionRadius: 32,
            canWalkAway: true,
            autoFacePlayer: true,
            repeatable: true,
            cooldownSeconds: 0
        }
        
        // Ajouter des champs spécifiques selon le type
        switch (type) {
            case 'dialogue':
                baseNPC.dialogueIds = []
                break
            case 'merchant':
                baseNPC.shopId = ''
                baseNPC.shopType = 'pokemart'
                break
            case 'trainer':
                baseNPC.trainerId = ''
                baseNPC.trainerClass = 'youngster'
                break
            case 'gym_leader':
                baseNPC.trainerId = ''
                baseNPC.trainerClass = 'gym_leader'
                baseNPC.gymConfig = {
                    gymId: '',
                    gymType: '',
                    badgeId: '',
                    badgeName: ''
                }
                break
            case 'healer':
                baseNPC.healerConfig = {
                    healingType: 'free',
                    cost: 0
                }
                break
            case 'transport':
                baseNPC.transportConfig = {
                    transportType: 'boat',
                    vehicleId: ''
                }
                baseNPC.destinations = []
                break
            case 'service':
                baseNPC.serviceConfig = {
                    serviceType: 'name_rater',
                    cost: 0
                }
                baseNPC.availableServices = []
                break
        }
        
        return baseNPC
    }

    // Ajout des méthodes pour la sélection de quêtes dans NPCFormBuilder

// MÉTHODE À AJOUTER : Créer un champ de sélection de quêtes
createQuestSelectorField(fieldName, currentValue, isRequired) {
    const items = currentValue || []
    
    return `
        <div class="quest-selector-field" data-field-name="${fieldName}">
            <div class="quest-items" id="${fieldName}_items">
                ${items.map((questId, index) => this.createQuestItem(fieldName, questId, index)).join('')}
            </div>
            <div class="quest-controls">
                <button type="button" class="btn btn-sm btn-primary add-quest-manual" 
                        onclick="window.npcFormBuilder.addQuestManual('${fieldName}')">
                    ✏️ Ajouter ID manuel
                </button>
                <button type="button" class="btn btn-sm btn-success add-quest-from-db" 
                        onclick="window.npcFormBuilder.openQuestSelector('${fieldName}')">
                    📋 Choisir de la DB
                </button>
            </div>
        </div>
    `
}

// MÉTHODE À AJOUTER : Créer un élément de quête avec détails
createQuestItem(fieldName, questId, index) {
    // Récupérer les détails de la quête si disponibles
    const questDetails = this.getQuestDetails(questId)
    
    return `
        <div class="quest-item" data-index="${index}">
            <div class="quest-info">
                <input type="text" class="form-input quest-id" 
                       name="${fieldName}[${index}]" 
                       value="${questId}" 
                       placeholder="quest_id">
                ${questDetails ? `
                    <div class="quest-details">
                        <span class="quest-name">${questDetails.name}</span>
                        <span class="quest-category">${questDetails.category}</span>
                    </div>
                ` : `
                    <div class="quest-details unknown">
                        <span class="quest-name">Quête inconnue</span>
                    </div>
                `}
            </div>
            <div class="quest-actions">
                <button type="button" class="btn btn-sm btn-info" 
                        onclick="window.npcFormBuilder.refreshQuestDetails('${fieldName}', ${index})">
                    🔄
                </button>
                <button type="button" class="btn btn-sm btn-danger" 
                        onclick="window.npcFormBuilder.removeQuestItem('${fieldName}', ${index})">
                    🗑️
                </button>
            </div>
        </div>
    `
}

// MÉTHODE À AJOUTER : Obtenir les détails d'une quête
getQuestDetails(questId) {
    // Ici vous pouvez récupérer depuis un cache local ou faire un appel API
    if (this.questsCache && this.questsCache[questId]) {
        return this.questsCache[questId]
    }
    return null
}

// MÉTHODE À AJOUTER : Ajouter une quête manuellement
addQuestManual(fieldName) {
    const questId = prompt('Entrez l\'ID de la quête:')
    if (!questId) return
    
    const currentValue = this.getFieldValue(fieldName) || []
    
    // Vérifier les doublons
    if (currentValue.includes(questId)) {
        alert('Cette quête est déjà dans la liste')
        return
    }
    
    currentValue.push(questId)
    this.setFieldValue(fieldName, currentValue)
    this.rebuildQuestField(fieldName, currentValue)
    this.updateJsonPreview()
}

// MÉTHODE À AJOUTER : Ouvrir le sélecteur de quêtes
async openQuestSelector(fieldName) {
    try {
        // Charger les quêtes depuis la DB
        const quests = await this.loadQuestsFromDB()
        
        if (!quests || quests.length === 0) {
            alert('Aucune quête trouvée dans la base de données')
            return
        }
        
        // Créer et afficher la modal de sélection
        this.showQuestSelectorModal(fieldName, quests)
        
    } catch (error) {
        console.error('Erreur chargement quêtes:', error)
        alert('Erreur lors du chargement des quêtes')
    }
}

// MÉTHODE CORRIGÉE FINALE : loadQuestsFromDB
// À remplacer dans npc-form-builder.js

async loadQuestsFromDB() {
    // Vérification avant utilisation
if (!this.adminPanel) {
    throw new Error('AdminPanel non initialisé')
}
    try {
        console.log('📋 [FormBuilder] Chargement quêtes depuis MongoDB via adminPanel.apiCall...')
        
        // ✅ SOLUTION : Utiliser EXACTEMENT la même méthode que MongoDB
        // Le middleware requireMacAndDev côté serveur gère automatiquement l'authentification
        const response = await this.adminPanel.apiCall('/quests/list')
        
        console.log('📋 [FormBuilder] Response API reçue:', response)
        
        // Vérifier le format de réponse (même structure que les autres modules)
        if (!response || typeof response !== 'object') {
            throw new Error('Réponse API invalide')
        }
        
        if (!response.success) {
            throw new Error(response.error || 'Erreur serveur inconnue')
        }
        
        // Vérifier que les quêtes sont présentes
        if (!response.quests || !Array.isArray(response.quests)) {
            console.warn('⚠️ [FormBuilder] Pas de quêtes dans la réponse, utiliser tableau vide')
            return []
        }
        
        // Mettre en cache pour usage ultérieur
        this.questsCache = {}
        response.quests.forEach(quest => {
            if (quest && quest.id) {
                this.questsCache[quest.id] = quest
            }
        })
        
        console.log(`✅ [FormBuilder] ${response.quests.length} quêtes chargées depuis MongoDB`)
        console.log('📋 [FormBuilder] Première quête exemple:', response.quests[0])
        
        return response.quests
        
    } catch (error) {
        console.error('❌ [FormBuilder] Erreur chargement quêtes depuis MongoDB:', error)
        
        // Diagnostic détaillé pour débugger
        console.log('🔍 [FormBuilder] Diagnostic détaillé:')
        console.log('  - this.adminPanel existe:', !!this.adminPanel)
        console.log('  - this.adminPanel.apiCall existe:', !!this.adminPanel?.apiCall)
        console.log('  - Type de this.adminPanel:', typeof this.adminPanel)
        
        if (this.adminPanel) {
            console.log('  - adminPanel keys:', Object.keys(this.adminPanel))
        }
        
        // Afficher l'erreur à l'utilisateur pour information
        if (this.adminPanel && this.adminPanel.showNotification) {
            this.adminPanel.showNotification('Erreur chargement quêtes: ' + error.message, 'error')
        }
        
        // Retourner tableau vide en cas d'erreur pour éviter les crashes
        return []
    }
}

showQuestSelectorModal(fieldName, quests) {
    const currentQuests = this.getFieldValue(fieldName) || []
    
    // ✅ COPIER EXACTEMENT la structure de showShopSelectorModal
    const modalHTML = `
        <div class="shop-selector-modal" id="questSelectorModal">
            <div class="modal-backdrop" onclick="window.npcFormBuilder.closeQuestSelector()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📋 Sélectionner des Quêtes</h3>
                    <button type="button" class="btn-close" onclick="window.npcFormBuilder.closeQuestSelector()">×</button>
                </div>
                <div class="modal-body">
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="🔍 Rechercher une quête..." 
                               onkeyup="window.npcFormBuilder.filterQuests(this.value)">
                    </div>
                    <div class="shops-filter-tabs">
                        <button class="filter-tab active" onclick="window.npcFormBuilder.filterQuestsByType('all')">
                            Toutes (${quests.length})
                        </button>
                    </div>
                    <div class="shops-list" id="questsList">
                        ${quests.map(quest => this.createQuestOption(quest, currentQuests)).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.npcFormBuilder.closeQuestSelector()">
                        Annuler
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.npcFormBuilder.applyQuestSelection('${fieldName}')">
                        Appliquer (${currentQuests.length} sélectionnées)
                    </button>
                </div>
            </div>
        </div>
    `
    
    // ✅ COPIER EXACTEMENT la méthode d'insertion
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    this.tempQuestSelection = [...currentQuests]
}

// AJOUTEZ cette méthode (copiée de createShopOption) :
createQuestOption(quest, currentQuests) {
    const isSelected = currentQuests.includes(quest.id)
    
    return `
        <div class="shop-option ${isSelected ? 'selected' : ''}" 
             data-quest-id="${quest.id}"
             onclick="window.npcFormBuilder.selectQuest('${quest.id}')">
            <div class="shop-icon">📜</div>
            <div class="shop-info">
                <div class="shop-name">${quest.name}</div>
                <div class="shop-meta">
                    <span class="shop-id">ID: ${quest.id}</span>
                    <span class="shop-type-label">${quest.category}</span>
                </div>
                <div class="shop-details-row">
                    <span class="shop-description">${quest.description}</span>
                </div>
            </div>
            <div class="shop-status">
                ${isSelected ? '✅' : ''}
            </div>
        </div>
    `
}

// AJOUTEZ cette méthode :
selectQuest(questId) {
    document.querySelectorAll('.shop-option').forEach(option => {
        const isThisQuest = option.dataset.questId === questId
        option.classList.toggle('selected', isThisQuest)
    })
    
    // Toggle la sélection
    if (!this.tempQuestSelection) this.tempQuestSelection = []
    const index = this.tempQuestSelection.indexOf(questId)
    
    if (index === -1) {
        this.tempQuestSelection.push(questId)
    } else {
        this.tempQuestSelection.splice(index, 1)
    }
    
    // Mettre à jour le compteur
    const footer = document.querySelector('.modal-footer .btn-primary')
    if (footer) {
        footer.textContent = `Appliquer (${this.tempQuestSelection.length} sélectionnées)`
    }
}

// MÉTHODE À AJOUTER : Filtrer les quêtes dans la modal
filterQuests(searchTerm) {
    const questItems = document.querySelectorAll('.shop-option') // ← UTILISER shop-option
    const term = searchTerm.toLowerCase()
    
    questItems.forEach(item => {
        const questName = item.querySelector('.shop-name').textContent.toLowerCase()
        const questId = item.querySelector('.shop-id').textContent.toLowerCase()
        
        const matches = questName.includes(term) || questId.includes(term)
        item.style.display = matches ? 'block' : 'none'
    })
}
// MÉTHODE À AJOUTER : Gérer la sélection de quêtes
toggleQuestSelection(questId) {
    if (!this.tempQuestSelection) this.tempQuestSelection = []
    
    const index = this.tempQuestSelection.indexOf(questId)
    if (index === -1) {
        this.tempQuestSelection.push(questId)
    } else {
        this.tempQuestSelection.splice(index, 1)
    }
    
    // Mettre à jour le compteur
    const footer = document.querySelector('.modal-footer .btn-primary')
    if (footer) {
        footer.textContent = `Appliquer (${this.tempQuestSelection.length} sélectionnées)`
    }
}

// MÉTHODE À AJOUTER : Appliquer la sélection de quêtes
applyQuestSelection(fieldName) {
    if (this.tempQuestSelection) {
        this.setFieldValue(fieldName, [...this.tempQuestSelection])
        this.rebuildQuestField(fieldName, this.tempQuestSelection)
        this.updateJsonPreview()
    }
    
    this.closeQuestSelector()
}

// MÉTHODE À AJOUTER : Fermer la modal de sélection
closeQuestSelector() {
    const modal = document.getElementById('questSelectorModal')
    if (modal) {
        modal.remove()
    }
    this.tempQuestSelection = null
}

// MÉTHODE À AJOUTER : Reconstruire un champ de quêtes
rebuildQuestField(fieldName, quests) {
    const questField = document.querySelector(`[data-field-name="${fieldName}"]`)
    if (!questField) return
    
    const itemsContainer = questField.querySelector('.quest-items')
    if (itemsContainer) {
        itemsContainer.innerHTML = quests.map((questId, index) => 
            this.createQuestItem(fieldName, questId, index)
        ).join('')
    }
}

// MÉTHODE À AJOUTER : Supprimer un élément de quête
removeQuestItem(fieldName, index) {
    const currentValue = this.getFieldValue(fieldName) || []
    currentValue.splice(index, 1)
    this.setFieldValue(fieldName, currentValue)
    this.rebuildQuestField(fieldName, currentValue)
    this.updateJsonPreview()
}

// MÉTHODE À AJOUTER : Actualiser les détails d'une quête
async refreshQuestDetails(fieldName, index) {
    const input = document.querySelector(`[name="${fieldName}[${index}]"]`)
    if (!input) return
    
    const questId = input.value
    if (!questId) return
    
    try {
        // Recharger les détails depuis la DB
        await this.loadQuestsFromDB()
        
        // Reconstruire le champ
        const currentValue = this.getFieldValue(fieldName)
        this.rebuildQuestField(fieldName, currentValue)
        
    } catch (error) {
        console.error('Erreur actualisation quête:', error)
    }
}

    // MÉTHODE À AJOUTER : Créer un champ de sélection de boutiques
createShopSelectorField(fieldName, currentValue, isRequired) {
    const shopId = currentValue || '';
    
    return `
        <div class="shop-selector-field" data-field-name="${fieldName}">
            <div class="shop-input-group">
                <input type="text" class="form-input shop-id" 
                       name="${fieldName}" 
                       value="${shopId}" 
                       placeholder="shop_id">
                <div class="shop-details" id="${fieldName}_details">
                    ${this.getShopDetails(shopId)}
                </div>
            </div>
            <div class="shop-controls">
                <button type="button" class="btn btn-sm btn-primary set-shop-manual" 
                        onclick="window.npcFormBuilder.setShopManual('${fieldName}')">
                    ✏️ Saisir ID manuel
                </button>
                <button type="button" class="btn btn-sm btn-success choose-shop-from-db" 
                        onclick="window.npcFormBuilder.openShopSelector('${fieldName}')">
                    🏪 Choisir de la DB
                </button>
                <button type="button" class="btn btn-sm btn-info refresh-shop" 
                        onclick="window.npcFormBuilder.refreshShopDetails('${fieldName}')">
                    🔄 Actualiser
                </button>
            </div>
        </div>
    `
}

// MÉTHODE À AJOUTER : Obtenir les détails d'une boutique
getShopDetails(shopId) {
    if (!shopId) {
        return '<div class="shop-details unknown"><span class="shop-name">Aucune boutique sélectionnée</span></div>'
    }
    
    // Récupérer depuis le cache local si disponible
    if (this.shopsCache && this.shopsCache[shopId]) {
        const shop = this.shopsCache[shopId]
        return `
            <div class="shop-details known">
                <span class="shop-name">${shop.nameKey || shop.name || shopId}</span>
                <span class="shop-type">${shop.type}</span>
                <span class="shop-location">${shop.location?.zone || 'Zone inconnue'}</span>
            </div>
        `
    }
    
    return `
        <div class="shop-details unknown">
            <span class="shop-name">Boutique: ${shopId}</span>
            <span class="shop-status">Détails non chargés</span>
        </div>
    `
}

// MÉTHODE À AJOUTER : Saisir un shop ID manuellement
setShopManual(fieldName) {
    const currentValue = this.getFieldValue(fieldName) || ''
    const shopId = prompt('Entrez l\'ID de la boutique:', currentValue)
    
    if (shopId === null) return // Annulé
    
    // Mettre à jour le champ
    const input = document.querySelector(`input[name="${fieldName}"]`)
    if (input) {
        input.value = shopId
        input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    
    this.setFieldValue(fieldName, shopId)
    this.updateShopDetails(fieldName, shopId)
    this.updateJsonPreview()
}

// MÉTHODE À AJOUTER : Ouvrir le sélecteur de boutiques
async openShopSelector(fieldName) {
    try {
        // Charger les boutiques depuis la DB
        const shops = await this.loadShopsFromDB()
        
        if (!shops || shops.length === 0) {
            alert('Aucune boutique trouvée dans la base de données')
            return
        }
        
        // Créer et afficher la modal de sélection
        this.showShopSelectorModal(fieldName, shops)
        
    } catch (error) {
        console.error('Erreur chargement boutiques:', error)
        alert('Erreur lors du chargement des boutiques: ' + error.message)
    }
}

// MÉTHODE À AJOUTER : Charger les boutiques depuis MongoDB
async loadShopsFromDB() {
    // Vérification avant utilisation
    if (!this.adminPanel) {
        throw new Error('AdminPanel non initialisé')
    }
    
    try {
        console.log('🏪 [FormBuilder] Chargement boutiques depuis MongoDB via adminPanel.apiCall...')
        
        // Utiliser la même méthode que pour les quêtes
        const response = await this.adminPanel.apiCall('/shops/list')
        
        console.log('🏪 [FormBuilder] Response API boutiques reçue:', response)
        
        // Vérifier le format de réponse
        if (!response || typeof response !== 'object') {
            throw new Error('Réponse API invalide')
        }
        
        if (!response.success) {
            throw new Error(response.error || 'Erreur serveur inconnue')
        }
        
        // Vérifier que les boutiques sont présentes
        if (!response.shops || !Array.isArray(response.shops)) {
            console.warn('⚠️ [FormBuilder] Pas de boutiques dans la réponse, utiliser tableau vide')
            return []
        }
        
        // Mettre en cache pour usage ultérieur
        this.shopsCache = {}
        response.shops.forEach(shop => {
            if (shop && shop.shopId) {
                this.shopsCache[shop.shopId] = shop
            }
        })
        
        console.log(`✅ [FormBuilder] ${response.shops.length} boutiques chargées depuis MongoDB`)
        console.log('🏪 [FormBuilder] Première boutique exemple:', response.shops[0])
        
        return response.shops
        
    } catch (error) {
        console.error('❌ [FormBuilder] Erreur chargement boutiques depuis MongoDB:', error)
        
        // Diagnostic détaillé pour débugger
        console.log('🔍 [FormBuilder] Diagnostic détaillé boutiques:')
        console.log('  - this.adminPanel existe:', !!this.adminPanel)
        console.log('  - this.adminPanel.apiCall existe:', !!this.adminPanel?.apiCall)
        
        // Afficher l'erreur à l'utilisateur pour information
        if (this.adminPanel && this.adminPanel.showNotification) {
            this.adminPanel.showNotification('Erreur chargement boutiques: ' + error.message, 'error')
        }
        
        // Retourner tableau vide en cas d'erreur pour éviter les crashes
        return []
    }
}

// MÉTHODE À AJOUTER : Afficher la modal de sélection de boutiques
showShopSelectorModal(fieldName, shops) {
    const currentShop = this.getFieldValue(fieldName) || ''
    
    const modalHTML = `
        <div class="shop-selector-modal" id="shopSelectorModal">
            <div class="modal-backdrop" onclick="window.npcFormBuilder.closeShopSelector()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏪 Sélectionner une Boutique</h3>
                    <button type="button" class="btn-close" onclick="window.npcFormBuilder.closeShopSelector()">×</button>
                </div>
                <div class="modal-body">
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="🔍 Rechercher une boutique..." 
                               onkeyup="window.npcFormBuilder.filterShops(this.value)">
                    </div>
                    <div class="shops-filter-tabs">
                        <button class="filter-tab active" onclick="window.npcFormBuilder.filterShopsByType('all')">
                            Toutes (${shops.length})
                        </button>
                        ${this.getShopTypeFilters(shops)}
                    </div>
                    <div class="shops-list" id="shopsList">
                        ${shops.map(shop => this.createShopOption(shop, currentShop)).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.npcFormBuilder.closeShopSelector()">
                        Annuler
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.npcFormBuilder.applyShopSelection('${fieldName}')">
                        Sélectionner
                    </button>
                </div>
            </div>
        </div>
    `
    
    // Ajouter la modal au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    
    // Stocker la sélection temporaire
    this.tempShopSelection = currentShop
}

// MÉTHODE À AJOUTER : Créer les filtres par type de boutique
getShopTypeFilters(shops) {
    const typeCount = {}
    shops.forEach(shop => {
        const type = shop.type || 'unknown'
        typeCount[type] = (typeCount[type] || 0) + 1
    })
    
    const typeNames = {
        'pokemart': 'PokéMart',
        'department': 'Grand Magasin',
        'specialist': 'Spécialisé',
        'gym_shop': 'Arène',
        'contest_shop': 'Concours',
        'game_corner': 'Casino',
        'black_market': 'Marché Noir',
        'trainer_shop': 'Dresseur',
        'temporary': 'Temporaire',
        'vending_machine': 'Distributeur',
        'online_shop': 'En Ligne'
    }
    
    return Object.entries(typeCount).map(([type, count]) => `
        <button class="filter-tab" onclick="window.npcFormBuilder.filterShopsByType('${type}')">
            ${typeNames[type] || type} (${count})
        </button>
    `).join('')
}

// MÉTHODE À AJOUTER : Créer une option de boutique
createShopOption(shop, currentShop) {
    const isSelected = shop.shopId === currentShop
    const shopName = shop.nameKey || shop.name || shop.shopId
    const shopType = shop.type || 'unknown'
    const shopZone = shop.location?.zone || 'Zone inconnue'
    const currency = shop.currency || 'gold'
    const itemCount = shop.items?.length || 0
    
    const typeIcons = {
        'pokemart': '🏪',
        'department': '🏬',
        'specialist': '🎯',
        'gym_shop': '🏆',
        'contest_shop': '🎭',
        'game_corner': '🎰',
        'black_market': '🕵️',
        'trainer_shop': '⚔️',
        'temporary': '⏰',
        'vending_machine': '🤖',
        'online_shop': '💻'
    }
    
    return `
        <div class="shop-option ${isSelected ? 'selected' : ''}" 
             data-shop-id="${shop.shopId}" 
             data-shop-type="${shopType}"
             onclick="window.npcFormBuilder.selectShop('${shop.shopId}')">
            <div class="shop-icon">${typeIcons[shopType] || '🏪'}</div>
            <div class="shop-info">
                <div class="shop-name">${shopName}</div>
                <div class="shop-meta">
                    <span class="shop-id">ID: ${shop.shopId}</span>
                    <span class="shop-type-label">${shopType}</span>
                    <span class="shop-zone">📍 ${shopZone}</span>
                </div>
                <div class="shop-details-row">
                    <span class="shop-currency">💰 ${currency}</span>
                    <span class="shop-items">📦 ${itemCount} objets</span>
                    ${shop.isTemporary ? '<span class="shop-temp">⏰ Temporaire</span>' : ''}
                    ${!shop.isActive ? '<span class="shop-inactive">❌ Inactive</span>' : ''}
                </div>
            </div>
            <div class="shop-status">
                ${isSelected ? '✅' : ''}
            </div>
        </div>
    `
}

// MÉTHODE À AJOUTER : Sélectionner une boutique
selectShop(shopId) {
    // Mettre à jour l'affichage
    document.querySelectorAll('.shop-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.shopId === shopId)
    })
    
    // Stocker la sélection temporaire
    this.tempShopSelection = shopId
}

// MÉTHODE À AJOUTER : Filtrer les boutiques par recherche
filterShops(searchTerm) {
    const shopItems = document.querySelectorAll('.shop-option')
    const term = searchTerm.toLowerCase()
    
    shopItems.forEach(item => {
        const shopName = item.querySelector('.shop-name').textContent.toLowerCase()
        const shopId = item.querySelector('.shop-id').textContent.toLowerCase()
        const shopZone = item.querySelector('.shop-zone').textContent.toLowerCase()
        const shopType = item.querySelector('.shop-type-label').textContent.toLowerCase()
        
        const matches = shopName.includes(term) || 
                       shopId.includes(term) || 
                       shopZone.includes(term) || 
                       shopType.includes(term)
        
        item.style.display = matches ? 'block' : 'none'
    })
}

// MÉTHODE À AJOUTER : Filtrer les boutiques par type
filterShopsByType(type) {
    // Mettre à jour les onglets
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active')
    })
    event.target.classList.add('active')
    
    // Filtrer les boutiques
    const shopItems = document.querySelectorAll('.shop-option')
    
    shopItems.forEach(item => {
        const shopType = item.dataset.shopType
        const matches = type === 'all' || shopType === type
        item.style.display = matches ? 'block' : 'none'
    })
}

// MÉTHODE À AJOUTER : Appliquer la sélection de boutique
applyShopSelection(fieldName) {
    if (this.tempShopSelection) {
        // Mettre à jour le champ
        const input = document.querySelector(`input[name="${fieldName}"]`)
        if (input) {
            input.value = this.tempShopSelection
            input.dispatchEvent(new Event('change', { bubbles: true }))
        }
        
        this.setFieldValue(fieldName, this.tempShopSelection)
        this.updateShopDetails(fieldName, this.tempShopSelection)
        this.updateJsonPreview()
    }
    
    this.closeShopSelector()
}

// MÉTHODE À AJOUTER : Fermer la modal de sélection
closeShopSelector() {
    const modal = document.getElementById('shopSelectorModal')
    if (modal) {
        modal.remove()
    }
    this.tempShopSelection = null
}

// MÉTHODE À AJOUTER : Mettre à jour les détails d'une boutique
updateShopDetails(fieldName, shopId) {
    const detailsDiv = document.getElementById(`${fieldName}_details`)
    if (detailsDiv) {
        detailsDiv.innerHTML = this.getShopDetails(shopId)
    }
}

// MÉTHODE À AJOUTER : Actualiser les détails d'une boutique
async refreshShopDetails(fieldName) {
    const input = document.querySelector(`input[name="${fieldName}"]`)
    if (!input) return
    
    const shopId = input.value
    if (!shopId) return
    
    try {
        // Recharger les détails depuis la DB
        await this.loadShopsFromDB()
        
        // Mettre à jour l'affichage
        this.updateShopDetails(fieldName, shopId)
        
        if (this.adminPanel) {
            this.adminPanel.showNotification('Détails de la boutique actualisés', 'success')
        }
        
    } catch (error) {
        console.error('Erreur actualisation boutique:', error)
        if (this.adminPanel) {
            this.adminPanel.showNotification('Erreur actualisation: ' + error.message, 'error')
        }
    }
}

    // ✅ MÉTHODES DIALOGUES À AJOUTER APRÈS refreshShopDetails (ligne ~1200)

// MÉTHODE À AJOUTER : Créer un champ de sélection de dialogues
createDialogueSelectorField(fieldName, currentValue, isRequired) {
    // Gérer les différents formats de dialogue
    let items = []
    
    if (Array.isArray(currentValue)) {
        // Si c'est déjà un array (dialogueIds)
        items = currentValue
    } else if (typeof currentValue === 'string' && currentValue) {
        // Si c'est un string (dialogueId)
        items = [currentValue]
    } else if (typeof currentValue === 'object' && currentValue) {
        // Si c'est un objet (conditionalDialogueIds, etc.)
        items = Object.values(currentValue).flat().filter(Boolean)
    }
    
    return `
        <div class="dialogue-selector-field" data-field-name="${fieldName}">
            <div class="dialogue-items" id="${fieldName}_items">
                ${items.map((dialogueId, index) => this.createDialogueItem(fieldName, dialogueId, index)).join('')}
            </div>
            <div class="dialogue-controls">
                <button type="button" class="btn btn-sm btn-primary add-dialogue-manual" 
                        onclick="window.npcFormBuilder.addDialogueManual('${fieldName}')">
                    ✏️ Ajouter ID manuel
                </button>
                <button type="button" class="btn btn-sm btn-success add-dialogue-from-db" 
                        onclick="window.npcFormBuilder.openDialogueSelector('${fieldName}')">
                    💬 Choisir de la DB
                </button>
            </div>
        </div>
    `
}

// MÉTHODE À AJOUTER : Créer un élément de dialogue avec détails
createDialogueItem(fieldName, dialogueId, index) {
    // Récupérer les détails du dialogue si disponibles
    const dialogueDetails = this.getDialogueDetails(dialogueId)
    
    return `
        <div class="dialogue-item" data-index="${index}">
            <div class="dialogue-info">
                <input type="text" class="form-input dialogue-id" 
                       name="${fieldName}[${index}]" 
                       value="${dialogueId}" 
                       placeholder="dialogue_id">
                ${dialogueDetails ? `
                    <div class="dialogue-details">
                        <span class="dialogue-text">${dialogueDetails.text}</span>
                        <span class="dialogue-category">${dialogueDetails.category}</span>
                    </div>
                ` : `
                    <div class="dialogue-details unknown">
                        <span class="dialogue-text">Dialogue inconnu</span>
                    </div>
                `}
            </div>
            <div class="dialogue-actions">
                <button type="button" class="btn btn-sm btn-info" 
                        onclick="window.npcFormBuilder.refreshDialogueDetails('${fieldName}', ${index})">
                    🔄
                </button>
                <button type="button" class="btn btn-sm btn-danger" 
                        onclick="window.npcFormBuilder.removeDialogueItem('${fieldName}', ${index})">
                    🗑️
                </button>
            </div>
        </div>
    `
}

// MÉTHODE À AJOUTER : Obtenir les détails d'un dialogue
getDialogueDetails(dialogueId) {
    // Ici vous pouvez récupérer depuis un cache local ou faire un appel API
    if (this.dialoguesCache && this.dialoguesCache[dialogueId]) {
        return this.dialoguesCache[dialogueId]
    }
    return null
}

// MÉTHODE À AJOUTER : Ajouter un dialogue manuellement
addDialogueManual(fieldName) {
    const dialogueId = prompt('Entrez l\'ID du dialogue:')
    if (!dialogueId) return
    
    let currentValue = this.getFieldValue(fieldName)
    
    // Gérer les différents formats
    if (fieldName === 'dialogueId') {
        // Champ simple string
        this.setFieldValue(fieldName, dialogueId)
    } else if (fieldName === 'dialogueIds' || fieldName.includes('DialogueIds')) {
        // Champ array
        if (!Array.isArray(currentValue)) currentValue = []
        
        // Vérifier les doublons
        if (currentValue.includes(dialogueId)) {
            alert('Ce dialogue est déjà dans la liste')
            return
        }
        
        currentValue.push(dialogueId)
        this.setFieldValue(fieldName, currentValue)
    }
    
    this.rebuildDialogueField(fieldName, this.getFieldValue(fieldName))
    this.updateJsonPreview()
}

// MÉTHODE À AJOUTER : Ouvrir le sélecteur de dialogues
async openDialogueSelector(fieldName) {
    try {
        // Charger les dialogues depuis la DB
        const dialogues = await this.loadDialoguesFromDB()
        
        if (!dialogues || dialogues.length === 0) {
            alert('Aucun dialogue trouvé dans la base de données')
            return
        }
        
        // Créer et afficher la modal de sélection
        this.showDialogueSelectorModal(fieldName, dialogues)
        
    } catch (error) {
        console.error('Erreur chargement dialogues:', error)
        alert('Erreur lors du chargement des dialogues')
    }
}

// MÉTHODE À AJOUTER : Charger les dialogues depuis MongoDB
async loadDialoguesFromDB() {
    // Vérification avant utilisation
    if (!this.adminPanel) {
        throw new Error('AdminPanel non initialisé')
    }
    
    try {
        console.log('💬 [FormBuilder] Chargement dialogues depuis MongoDB via adminPanel.apiCall...')
        
        // Utiliser la même méthode que pour les quêtes et boutiques
        const response = await this.adminPanel.apiCall('/dialogues?limit=500')
        
        console.log('💬 [FormBuilder] Response API dialogues reçue:', response)
        
        // Vérifier le format de réponse
        if (!response || typeof response !== 'object') {
            throw new Error('Réponse API invalide')
        }
        
        if (!response.success) {
            throw new Error(response.error || 'Erreur serveur inconnue')
        }
        
        // Vérifier que les dialogues sont présents
        if (!response.dialogues || !Array.isArray(response.dialogues)) {
            console.warn('⚠️ [FormBuilder] Pas de dialogues dans la réponse, utiliser tableau vide')
            return []
        }
        
        // Mettre en cache pour usage ultérieur
        this.dialoguesCache = {}
        response.dialogues.forEach(dialogue => {
            if (dialogue && dialogue.dialogId) {
                this.dialoguesCache[dialogue.dialogId] = dialogue
            }
        })
        
        console.log(`✅ [FormBuilder] ${response.dialogues.length} dialogues chargés depuis MongoDB`)
        console.log('💬 [FormBuilder] Premier dialogue exemple:', response.dialogues[0])
        
        return response.dialogues
        
    } catch (error) {
        console.error('❌ [FormBuilder] Erreur chargement dialogues depuis MongoDB:', error)
        
        // Diagnostic détaillé pour débugger
        console.log('🔍 [FormBuilder] Diagnostic détaillé dialogues:')
        console.log('  - this.adminPanel existe:', !!this.adminPanel)
        console.log('  - this.adminPanel.apiCall existe:', !!this.adminPanel?.apiCall)
        
        // Afficher l'erreur à l'utilisateur pour information
        if (this.adminPanel && this.adminPanel.showNotification) {
            this.adminPanel.showNotification('Erreur chargement dialogues: ' + error.message, 'error')
        }
        
        // Retourner tableau vide en cas d'erreur pour éviter les crashes
        return []
    }
}

// MÉTHODE À AJOUTER : Afficher la modal de sélection de dialogues
showDialogueSelectorModal(fieldName, dialogues) {
    let currentDialogues = this.getFieldValue(fieldName)
    
    // Normaliser en array pour la sélection multiple
    if (!Array.isArray(currentDialogues)) {
        currentDialogues = currentDialogues ? [currentDialogues] : []
    }
    
    const modalHTML = `
        <div class="shop-selector-modal" id="dialogueSelectorModal">
            <div class="modal-backdrop" onclick="window.npcFormBuilder.closeDialogueSelector()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💬 Sélectionner des Dialogues</h3>
                    <button type="button" class="btn-close" onclick="window.npcFormBuilder.closeDialogueSelector()">×</button>
                </div>
                <div class="modal-body">
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="🔍 Rechercher un dialogue..." 
                               onkeyup="window.npcFormBuilder.filterDialogues(this.value)">
                    </div>
                    <div class="shops-filter-tabs">
                        <button class="filter-tab active" onclick="window.npcFormBuilder.filterDialoguesByCategory('all')">
                            Tous (${dialogues.length})
                        </button>
                        ${this.getDialogueCategoryFilters(dialogues)}
                    </div>
                    <div class="shops-list" id="dialoguesList">
                        ${dialogues.map(dialogue => this.createDialogueOption(dialogue, currentDialogues)).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.npcFormBuilder.closeDialogueSelector()">
                        Annuler
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.npcFormBuilder.applyDialogueSelection('${fieldName}')">
                        Appliquer (${currentDialogues.length} sélectionnés)
                    </button>
                </div>
            </div>
        </div>
    `
    
    // Ajouter la modal au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    this.tempDialogueSelection = [...currentDialogues]
}

// MÉTHODE À AJOUTER : Créer les filtres par catégorie de dialogue
getDialogueCategoryFilters(dialogues) {
    const categoryCount = {}
    dialogues.forEach(dialogue => {
        const category = dialogue.category || 'unknown'
        categoryCount[category] = (categoryCount[category] || 0) + 1
    })
    
    const categoryNames = {
        'greeting': 'Salutations',
        'ai': 'IA',
        'shop': 'Boutique',
        'healer': 'Soigneur',
        'quest': 'Quête',
        'battle': 'Combat',
        'help': 'Aide',
        'social': 'Social',
        'system': 'Système',
        'ui': 'Interface',
        'error': 'Erreur'
    }
    
    return Object.entries(categoryCount).map(([category, count]) => `
        <button class="filter-tab" onclick="window.npcFormBuilder.filterDialoguesByCategory('${category}')">
            ${categoryNames[category] || category} (${count})
        </button>
    `).join('')
}

// MÉTHODE À AJOUTER : Créer une option de dialogue
createDialogueOption(dialogue, currentDialogues) {
    const isSelected = currentDialogues.includes(dialogue.dialogId)
    const dialogueText = dialogue.fr || dialogue.eng || dialogue.dialogId
    const truncatedText = dialogueText.length > 100 ? dialogueText.substring(0, 100) + '...' : dialogueText
    
    const categoryIcons = {
        'greeting': '👋',
        'ai': '🤖',
        'shop': '🏪',
        'healer': '💊',
        'quest': '📜',
        'battle': '⚔️',
        'help': '❓',
        'social': '💬',
        'system': '⚙️',
        'ui': '🖥️',
        'error': '❌'
    }
    
    return `
        <div class="shop-option ${isSelected ? 'selected' : ''}" 
             data-dialogue-id="${dialogue.dialogId}" 
             data-dialogue-category="${dialogue.category}"
             onclick="window.npcFormBuilder.selectDialogue('${dialogue.dialogId}')">
            <div class="shop-icon">${categoryIcons[dialogue.category] || '💬'}</div>
            <div class="shop-info">
                <div class="shop-name">${dialogue.dialogId}</div>
                <div class="shop-meta">
                    <span class="shop-id">NPC: ${dialogue.npcId || 'N/A'}</span>
                    <span class="shop-type-label">${dialogue.category || 'unknown'}</span>
                </div>
                <div class="shop-details-row">
                    <span class="shop-description">${truncatedText}</span>
                </div>
            </div>
            <div class="shop-status">
                ${isSelected ? '✅' : ''}
            </div>
        </div>
    `
}

// MÉTHODE À AJOUTER : Sélectionner un dialogue
selectDialogue(dialogueId) {
    // Mettre à jour l'affichage
    document.querySelectorAll('.shop-option').forEach(option => {
        const isThisDialogue = option.dataset.dialogueId === dialogueId
        option.classList.toggle('selected', isThisDialogue)
    })
    
    // Toggle la sélection
    if (!this.tempDialogueSelection) this.tempDialogueSelection = []
    const index = this.tempDialogueSelection.indexOf(dialogueId)
    
    if (index === -1) {
        this.tempDialogueSelection.push(dialogueId)
    } else {
        this.tempDialogueSelection.splice(index, 1)
    }
    
    // Mettre à jour le compteur
    const footer = document.querySelector('.modal-footer .btn-primary')
    if (footer) {
        footer.textContent = `Appliquer (${this.tempDialogueSelection.length} sélectionnés)`
    }
}

// MÉTHODE À AJOUTER : Filtrer les dialogues dans la modal
filterDialogues(searchTerm) {
    const dialogueItems = document.querySelectorAll('.shop-option')
    const term = searchTerm.toLowerCase()
    
    dialogueItems.forEach(item => {
        const dialogueId = item.querySelector('.shop-name').textContent.toLowerCase()
        const dialogueText = item.querySelector('.shop-description').textContent.toLowerCase()
        const npcId = item.querySelector('.shop-id').textContent.toLowerCase()
        
        const matches = dialogueId.includes(term) || dialogueText.includes(term) || npcId.includes(term)
        item.style.display = matches ? 'block' : 'none'
    })
}

// MÉTHODE À AJOUTER : Filtrer les dialogues par catégorie
filterDialoguesByCategory(category) {
    // Mettre à jour les onglets
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active')
    })
    event.target.classList.add('active')
    
    // Filtrer les dialogues
    const dialogueItems = document.querySelectorAll('.shop-option')
    
    dialogueItems.forEach(item => {
        const dialogueCategory = item.dataset.dialogueCategory
        const matches = category === 'all' || dialogueCategory === category
        item.style.display = matches ? 'block' : 'none'
    })
}

// MÉTHODE À AJOUTER : Appliquer la sélection de dialogues
applyDialogueSelection(fieldName) {
    if (this.tempDialogueSelection) {
        let finalValue
        
        if (fieldName === 'dialogueId') {
            // Champ simple - prendre le premier sélectionné
            finalValue = this.tempDialogueSelection[0] || ''
        } else {
            // Champ array - prendre tous
            finalValue = [...this.tempDialogueSelection]
        }
        
        this.setFieldValue(fieldName, finalValue)
        this.rebuildDialogueField(fieldName, finalValue)
        this.updateJsonPreview()
    }
    
    this.closeDialogueSelector()
}

// MÉTHODE À AJOUTER : Fermer la modal de sélection
closeDialogueSelector() {
    const modal = document.getElementById('dialogueSelectorModal')
    if (modal) {
        modal.remove()
    }
    this.tempDialogueSelection = null
}

// MÉTHODE À AJOUTER : Reconstruire un champ de dialogues
rebuildDialogueField(fieldName, dialogues) {
    const dialogueField = document.querySelector(`[data-field-name="${fieldName}"]`)
    if (!dialogueField) return
    
    let items = []
    
    if (Array.isArray(dialogues)) {
        items = dialogues
    } else if (typeof dialogues === 'string' && dialogues) {
        items = [dialogues]
    }
    
    const itemsContainer = dialogueField.querySelector('.dialogue-items')
    if (itemsContainer) {
        itemsContainer.innerHTML = items.map((dialogueId, index) => 
            this.createDialogueItem(fieldName, dialogueId, index)
        ).join('')
    }
}

// MÉTHODE À AJOUTER : Supprimer un élément de dialogue
removeDialogueItem(fieldName, index) {
    let currentValue = this.getFieldValue(fieldName)
    
    if (fieldName === 'dialogueId') {
        // Champ simple - vider
        this.setFieldValue(fieldName, '')
    } else if (Array.isArray(currentValue)) {
        // Champ array - supprimer l'élément
        currentValue.splice(index, 1)
        this.setFieldValue(fieldName, currentValue)
    }
    
    this.rebuildDialogueField(fieldName, this.getFieldValue(fieldName))
    this.updateJsonPreview()
}

// MÉTHODE À AJOUTER : Actualiser les détails d'un dialogue
async refreshDialogueDetails(fieldName, index) {
    const input = document.querySelector(`[name="${fieldName}[${index}]"]`)
    if (!input) return
    
    const dialogueId = input.value
    if (!dialogueId) return
    
    try {
        // Recharger les détails depuis la DB
        await this.loadDialoguesFromDB()
        
        // Reconstruire le champ
        const currentValue = this.getFieldValue(fieldName)
        this.rebuildDialogueField(fieldName, currentValue)
        
    } catch (error) {
        console.error('Erreur actualisation dialogue:', error)
    }
}
    
    // API publique
    getNPC() {
        return this.currentNPC ? { ...this.currentNPC } : null
    }

    clearForm() {
        this.currentNPC = null
        this.currentType = null
        this.validationErrors = {}
        
        const formContent = document.getElementById('formContent')
        if (formContent) formContent.style.display = 'none'
        
        this.updateTypeSelection(null)
    }

    onFormChange(handler) {
        this.changeHandlers.push(handler)
    }

    isValid() {
        return this.validateForm().valid
    }
    
    // Nettoyage pour éviter les fuites mémoire
    destroy() {
        if (window.npcFormBuilder === this) {
            delete window.npcFormBuilder
        }
        
        this.changeHandlers = []
        this.validationErrors = {}
        this.currentNPC = null
        this.currentType = null
    }
}


export default NPCFormBuilder
