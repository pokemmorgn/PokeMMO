// PokeWorld Admin Panel - NPC Form Builder - CORRECTIONS COMPLÈTES
// Fixes : 1) Pré-remplissage des champs lors de l'édition, 2) Tous les champs manquants

import { NPC_TYPES, COMMON_FIELDS, FIELD_HELP } from './npc-types-config.js'
import { SUGGESTED_SPRITES, POSITION_PRESETS } from './npc-templates.js'
import { NPCValidator } from './npc-validator.js'

export class NPCFormBuilder {
    constructor(container) {
        this.container = container
        this.currentNPC = null
        this.currentType = null
        this.validator = new NPCValidator()
        this.changeHandlers = []
        this.validationErrors = {}
        
        // Bind des méthodes pour les handlers HTML
        this.boundSelectType = this.selectType.bind(this)
        this.boundToggleSection = this.toggleSection.bind(this)
        this.boundAddArrayItem = this.addArrayItem.bind(this)
        this.boundRemoveArrayItem = this.removeArrayItem.bind(this)
        this.boundSetPosition = this.setPosition.bind(this)
        this.boundFormatJSON = this.formatJSON.bind(this)
        this.boundValidateJSON = this.validateJSON.bind(this)
        this.boundOpenSpriteBrowser = this.openSpriteBrowser.bind(this)
        
        this.init()
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
    console.log('📝 [FormBuilder] Populating all fields for NPC:', this.currentNPC)
    
    if (!this.currentNPC) return
    
    // CORRECTION 1: Pré-remplir les champs de base
    this.populateField('name', this.currentNPC.name)
    this.populateField('sprite', this.currentNPC.sprite)
    this.populateField('direction', this.currentNPC.direction)
    
    // CORRECTION 2: Position - gestion spéciale
    if (this.currentNPC.position) {
        console.log('📍 [FormBuilder] Setting position:', this.currentNPC.position)
        
        // Méthode directe pour les champs de position
        const xInput = document.querySelector('input[name="position.x"]')
        const yInput = document.querySelector('input[name="position.y"]')
        
        if (xInput && this.currentNPC.position.x !== undefined) {
            xInput.value = this.currentNPC.position.x
            console.log('✅ [FormBuilder] X position set to:', this.currentNPC.position.x)
        }
        
        if (yInput && this.currentNPC.position.y !== undefined) {
            yInput.value = this.currentNPC.position.y
            console.log('✅ [FormBuilder] Y position set to:', this.currentNPC.position.y)
        }
        
        // Aussi mettre à jour dans l'objet NPC courant
        this.setFieldValue('position.x', this.currentNPC.position.x)
        this.setFieldValue('position.y', this.currentNPC.position.y)
    }
    
    // Champs numériques communs
    this.populateField('interactionRadius', this.currentNPC.interactionRadius)
    this.populateField('cooldownSeconds', this.currentNPC.cooldownSeconds)
    
    // Champs booléens communs
    this.populateField('canWalkAway', this.currentNPC.canWalkAway)
    this.populateField('autoFacePlayer', this.currentNPC.autoFacePlayer)
    this.populateField('repeatable', this.currentNPC.repeatable)
    
    // Champs spécifiques au type
    this.populateTypeSpecificFields()
    
    // Arrays
    this.populateArrayFields()
    
    // Objects JSON
    this.populateObjectFields()
    
    console.log('✅ [FormBuilder] All fields populated successfully')
}

// MÉTHODE CORRIGÉE : populateField pour mieux gérer les types
populateField(fieldName, value) {
    if (value === undefined || value === null) {
        console.log(`⚠️ [FormBuilder] Skipping field ${fieldName} - value is ${value}`)
        return
    }
    
    // Gestion spéciale pour les champs de position
    if (fieldName === 'position.x' || fieldName === 'position.y') {
        const field = document.querySelector(`[name="${fieldName}"]`)
        if (field) {
            field.value = Number(value)
            console.log(`📍 [FormBuilder] ${fieldName} set to:`, Number(value))
        }
        return
    }
    
    const field = document.querySelector(`[name="${fieldName}"]`)
    if (!field) {
        console.log(`⚠️ [FormBuilder] Field not found: ${fieldName}`)
        return
    }
    
    if (field.type === 'checkbox') {
        field.checked = Boolean(value)
        console.log(`☑️ [FormBuilder] ${fieldName} checked:`, Boolean(value))
    } else if (field.type === 'number') {
        field.value = Number(value)
        console.log(`🔢 [FormBuilder] ${fieldName} set to:`, Number(value))
    } else {
        field.value = String(value)
        console.log(`📝 [FormBuilder] ${fieldName} set to:`, String(value))
    }
    
    // Déclencher l'événement change pour mettre à jour l'état
    field.dispatchEvent(new Event('change', { bubbles: true }))
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
                
            case 'dialogues':
                if (type === 'dialogue') {
                    fields = [...fields, 'dialogueIds', 'dialogueId', 'conditionalDialogueIds']
                } else if (type === 'merchant') {
                    fields = [...fields, 'dialogueIds', 'shopDialogueIds']
                } else if (type === 'trainer' || type === 'gym_leader') {
                    fields = [...fields, 'battleDialogueIds']
                } else if (type === 'healer') {
                    fields = [...fields, 'healerDialogueIds']
                } else if (type === 'transport') {
                    fields = [...fields, 'transportDialogueIds']
                } else if (type === 'service') {
                    fields = [...fields, 'serviceDialogueIds']
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
        
        if (fieldName.includes('dialogue') || fieldName.includes('Description')) {
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
                >
                <datalist id="spriteList">
                    ${suggestions.map(sprite => `<option value="${sprite}">`).join('')}
                </datalist>
                <button type="button" class="btn btn-sm sprite-browser" onclick="window.npcFormBuilder.openSpriteBrowser()">
                    🖼️ Parcourir
                </button>
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
   // MÉTHODE CORRIGÉE : handleFieldChange avec gestion position
handleFieldChange(e) {
    const field = e.target
    const fieldName = field.name
    
    if (!fieldName || !this.currentNPC) return
    
    let value = this.getFieldInputValue(field)
    
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
