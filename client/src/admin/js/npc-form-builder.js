// PokeWorld Admin Panel - NPC Form Builder - VERSION CORRIGÉE
// Générateur dynamique de formulaires selon le type de NPC sélectionné

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
        
        // CORRECTION: Bind this context pour les méthodes appelées depuis HTML
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
        
        // CORRECTION: Exposer l'instance dans le contexte global pour les handlers HTML
        window.npcFormBuilder = this
    }

    // Structure principale du formulaire
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
        this.currentNPC = this.createEmptyNPCFromType(type)
        
        // Mettre à jour l'interface
        this.updateTypeSelection(type)
        this.buildForm(type)
        this.showFormContent()
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

    // Construire le formulaire pour un type spécifique
    buildForm(type) {
        const typeConfig = NPC_TYPES[type]
        const formSections = document.getElementById('formSections')
        
        if (!formSections) return

        let html = ''
        
        // Créer chaque section
        typeConfig.sections.forEach(sectionName => {
            html += this.createSection(sectionName, type, typeConfig)
        })
        
        formSections.innerHTML = html
        this.setupFieldEventListeners()
        this.validateForm()
    }

    // Créer une section de formulaire
    createSection(sectionName, type, typeConfig) {
        const sectionFields = typeConfig.fieldGroups[sectionName] || []
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

    // Créer un champ de formulaire
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

    // Créer champ texte
    createStringField(fieldName, fieldConfig, currentValue, isRequired) {
        const placeholder = fieldConfig.placeholder || `Entrez ${this.getFieldDisplayName(fieldName)}`
        
        // Cas spéciaux
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

    // Créer champ sprite avec suggestions
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

    // Créer champ numérique
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

    // Créer champ booléen
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

    // Créer champ select
    createSelectField(fieldName, fieldConfig, currentValue, isRequired, type) {
        let options = fieldConfig.options || []
        
        // Options spéciales selon le champ
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

    // Créer champ position (objet spécial)
    createPositionField(fieldName, currentValue) {
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
                    >
                    <input 
                        type="number" 
                        class="form-input position-y" 
                        name="${fieldName}.y" 
                        value="${position.y || 0}" 
                        placeholder="Y" 
                        min="0"
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
            </div>
        `
    }

    // Créer champ array
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

    // Créer champ object (JSON éditable)
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
        // Global change handler
        this.container.addEventListener('input', (e) => {
            this.handleFieldChange(e)
        })
        
        this.container.addEventListener('change', (e) => {
            this.handleFieldChange(e)
        })
    }

    setupFieldEventListeners() {
        // Position presets
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

    // Méthodes utilitaires pour les champs
    getFieldConfig(fieldName, typeConfig) {
        // Champ commun
        if (COMMON_FIELDS[fieldName]) {
            return COMMON_FIELDS[fieldName]
        }
        
        // Champ spécifique au type
        const fieldType = typeConfig.fieldTypes?.[fieldName]
        return {
            type: fieldType || 'string',
            options: typeConfig.selectOptions?.[fieldName]
        }
    }

    getFieldValue(fieldName) {
        if (!this.currentNPC) return null
        
        // Gérer les champs imbriqués (ex: position.x)
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

    setFieldValue(fieldName, value) {
        if (!this.currentNPC) return
        
        // Gérer les champs imbriqués
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
            dialogueIds: 'IDs de Dialogue',
            questsToGive: 'Quêtes à Donner',
            questsToEnd: 'Quêtes à Terminer',
            interactionRadius: 'Rayon d\'Interaction',
            cooldownSeconds: 'Délai (secondes)'
        }
        
        return displayNames[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').trim()
    }

    getSectionTitle(sectionName) {
        const sectionTitles = {
            basic: '📋 Informations de Base',
            dialogues: '💬 Dialogues',
            shop: '🏪 Configuration Boutique',
            trainer: '⚔️ Configuration Dresseur',
            battle: '⚔️ Configuration Combat',
            gym: '🏆 Configuration Arène',
            transport: '🚢 Configuration Transport',
            service: '🔧 Configuration Service',
            minigame: '🎮 Configuration Mini-jeu',
            research: '🔬 Configuration Recherche',
            guild: '🏛️ Configuration Guilde',
            event: '🎉 Configuration Événement',
            quests: '📜 Système de Quêtes',
            conditions: '⚙️ Conditions',
            interaction: '🤝 Interaction',
            rewards: '🎁 Récompenses',
            schedule: '🕐 Horaires',
            access: '🔒 Restrictions d\'Accès'
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
            department_store: 'Grand Magasin',
            youngster: 'Gamin',
            lass: 'Fillette',
            bug_catcher: 'Attrape-Insectes'
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
        this.setFieldValue('position.x', x)
        this.setFieldValue('position.y', y)
        
        // Mettre à jour les inputs
        const xInput = document.querySelector('input[name="position.x"]')
        const yInput = document.querySelector('input[name="position.y"]')
        
        if (xInput) xInput.value = x
        if (yInput) yInput.value = y
        
        this.updateJsonPreview()
    }

    formatJSON(fieldName) {
        const textarea = document.querySelector(`textarea[name="${fieldName}"]`)
        if (!textarea) return
        
        try {
            const obj = JSON.parse(textarea.value)
            textarea.value = JSON.stringify(obj, null, 2)
            this.handleFieldChange({ target: textarea })
        } catch (error) {
            alert('JSON invalide : ' + error.message)
        }
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
        
        // Validation rapide du champ
        const result = this.validator.validateNPC(this.currentNPC)
        
        // Mettre à jour les erreurs
        this.validationErrors = {}
        result.errors.forEach(error => {
            this.validationErrors[error.field] = error.message
        })
        
        // Mettre à jour l'affichage
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
        return {
            id: null,
            name: `Nouveau ${NPC_TYPES[type].name}`,
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
    }

    // API publique
    loadNPC(npc) {
        this.currentNPC = { ...npc }
        this.currentType = npc.type
        
        if (this.currentType) {
            this.selectType(this.currentType)
        }
    }

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
    
    // CORRECTION: Méthode de nettoyage pour éviter les fuites mémoire
    destroy() {
        // Nettoyer la référence globale
        if (window.npcFormBuilder === this) {
            delete window.npcFormBuilder
        }
        
        // Nettoyer les event listeners
        this.changeHandlers = []
        this.validationErrors = {}
        this.currentNPC = null
        this.currentType = null
    }
}

export default NPCFormBuilder
