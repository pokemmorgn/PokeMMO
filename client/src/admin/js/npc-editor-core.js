// PokeWorld Admin Panel - NPC Editor Core Module
// Orchestrateur principal pour l'édition des NPCs

export class NPCEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'npcEditor'
        
        // Modules liés (seront chargés)
        this.typeSelector = null
        this.basicForm = null
        this.dialogueManager = null
        this.questIntegration = null
        this.advancedConfigs = null
        this.previewValidator = null
        this.dataManager = null
        
        // État de l'éditeur
        this.currentStep = 1
        this.maxSteps = 4
        this.currentZone = null
        this.currentNPC = null
        this.isEditing = false
        this.npcsList = []
        
        // Cache des données
        this.availableZones = []
        this.npcTypes = []
        this.presets = {}
        
        console.log('🎭 [NPCEditor] Core module initialized')
        this.init()
    }

    async init() {
        try {
            await this.loadInitialData()
            this.setupEventListeners()
            console.log('✅ [NPCEditor] Core module ready')
        } catch (error) {
            console.error('❌ [NPCEditor] Initialization failed:', error)
            this.adminPanel.showNotification('Erreur initialisation NPCEditor: ' + error.message, 'error')
        }
    }

    async loadInitialData() {
        console.log('📦 [NPCEditor] Loading initial data...')
        
        try {
            // Charger les types NPCs disponibles (basé sur npcexample.json)
            this.npcTypes = [
                { id: 'dialogue', name: 'Guide/Information', icon: '💬', color: '#3498db' },
                { id: 'merchant', name: 'Marchand', icon: '🛒', color: '#e74c3c' },
                { id: 'trainer', name: 'Dresseur', icon: '⚔️', color: '#f39c12' },
                { id: 'healer', name: 'Soigneur', icon: '💊', color: '#27ae60' },
                { id: 'gym_leader', name: 'Champion Arène', icon: '🏆', color: '#9b59b6' },
                { id: 'transport', name: 'Transport', icon: '🚢', color: '#1abc9c' },
                { id: 'service', name: 'Service', icon: '🔧', color: '#34495e' },
                { id: 'minigame', name: 'Mini-jeu', icon: '🎮', color: '#e67e22' },
                { id: 'researcher', name: 'Chercheur', icon: '🔬', color: '#2ecc71' },
                { id: 'guild', name: 'Guilde/Faction', icon: '⚡', color: '#8e44ad' },
                { id: 'event', name: 'Événement', icon: '🎉', color: '#f1c40f' },
                { id: 'quest_master', name: 'Maître Quêtes', icon: '📜', color: '#c0392b' }
            ]

            // Charger les zones disponibles
            this.availableZones = [
                { id: 'road1', name: '🛤️ Route 1' },
                { id: 'road2', name: '🛤️ Route 2' },
                { id: 'road3', name: '🛤️ Route 3' },
                { id: 'village', name: '🏘️ Village' },
                { id: 'beach', name: '🏖️ Plage' },
                { id: 'lavandia', name: '🏙️ Lavandia' }
            ]

            // Charger les presets via API (ou fallback)
            await this.loadPresets()
            
            console.log(`✅ [NPCEditor] Loaded ${this.npcTypes.length} NPC types and ${this.availableZones.length} zones`)
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error loading initial data:', error)
            throw error
        }
    }

    async loadPresets() {
        try {
            // Essayer de charger les presets via API
            const response = await this.adminPanel.apiCall('/npc-presets')
            this.presets = response.presets || {}
        } catch (error) {
            console.log('📦 [NPCEditor] Using fallback presets')
            // Fallback presets minimaux
            this.presets = this.getFallbackPresets()
        }
    }

    getFallbackPresets() {
        return {
            dialogue: [
                { id: 'guide', name: 'Guide Touristique', icon: '🗺️' },
                { id: 'villager', name: 'Habitant', icon: '🏠' },
                { id: 'sage', name: 'Sage', icon: '🧙' }
            ],
            merchant: [
                { id: 'pokemart', name: 'PokéMart Standard', icon: '🏪' },
                { id: 'rare_items', name: 'Objets Rares', icon: '💎' },
                { id: 'black_market', name: 'Marché Noir', icon: '🥷' }
            ],
            trainer: [
                { id: 'youngster', name: 'Gamin', icon: '👦' },
                { id: 'route_trainer', name: 'Dresseur Route', icon: '🚶' },
                { id: 'expert', name: 'Expert', icon: '🥋' }
            ],
            healer: [
                { id: 'pokemon_center', name: 'Centre Pokémon', icon: '🏥' },
                { id: 'field_medic', name: 'Secouriste', icon: '⛑️' }
            ]
            // Autres types auront des presets basiques...
        }
    }

    setupEventListeners() {
        // Zone selector change
        const zoneSelect = document.getElementById('npcZoneSelect')
        if (zoneSelect) {
            zoneSelect.addEventListener('change', () => {
                this.loadZoneNPCs(zoneSelect.value)
            })
        }

        // Navigation steps
        document.addEventListener('click', (e) => {
            if (e.target.matches('.npc-step-btn[data-step]')) {
                const step = parseInt(e.target.dataset.step)
                this.goToStep(step)
            }
        })

        // Modal close
        document.addEventListener('click', (e) => {
            if (e.target.matches('#npcEditorModal, .npc-modal-close')) {
                this.closeEditor()
            }
        })

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isEditing) {
                if (e.key === 'Escape') {
                    this.closeEditor()
                } else if (e.key === 'Enter' && e.ctrlKey) {
                    this.saveCurrentNPC()
                }
            }
        })
    }

    // ================================
    // GESTION DES ZONES ET NPCS
    // ================================

    async loadZoneNPCs(zoneId) {
        if (!zoneId) return

        console.log(`🗺️ [NPCEditor] Loading NPCs for zone: ${zoneId}`)
        
        try {
            this.currentZone = zoneId
            
            // Charger les NPCs via le data manager
            if (this.dataManager) {
                this.npcsList = await this.dataManager.loadZoneNPCs(zoneId)
            } else {
                // Fallback API call direct
                const response = await this.adminPanel.apiCall(`/maps/${zoneId}/npcs`)
                this.npcsList = response.npcs || []
            }
            
            this.updateNPCsList()
            this.adminPanel.showNotification(`${this.npcsList.length} NPCs chargés pour ${zoneId}`, 'info')
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error loading zone NPCs:', error)
            this.adminPanel.showNotification('Erreur chargement NPCs: ' + error.message, 'error')
            this.npcsList = []
            this.updateNPCsList()
        }
    }

    updateNPCsList() {
        const npcsList = document.getElementById('npcsList')
        if (!npcsList) return

        if (this.npcsList.length === 0) {
            npcsList.innerHTML = `
                <div class="no-npcs-message">
                    <div style="font-size: 3rem; margin-bottom: 15px;">🎭</div>
                    <div style="font-weight: 600; margin-bottom: 8px;">Aucun NPC dans cette zone</div>
                    <div style="color: #7f8c8d;">Commencez par placer des NPCs sur la carte</div>
                </div>
            `
            return
        }

        // Séparer NPCs configurés vs non-configurés
        const configuredNPCs = this.npcsList.filter(npc => npc.type && npc.name)
        const unConfiguredNPCs = this.npcsList.filter(npc => !npc.type || !npc.name)

        npcsList.innerHTML = `
            ${configuredNPCs.length > 0 ? `
                <div class="npcs-section">
                    <h4 class="npcs-section-title">
                        ✅ NPCs Configurés <span class="badge badge-success">${configuredNPCs.length}</span>
                    </h4>
                    <div class="npcs-grid">
                        ${configuredNPCs.map(npc => this.renderNPCCard(npc, true)).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${unConfiguredNPCs.length > 0 ? `
                <div class="npcs-section">
                    <h4 class="npcs-section-title">
                        ⚠️ NPCs À Configurer <span class="badge badge-warning">${unConfiguredNPCs.length}</span>
                    </h4>
                    <div class="npcs-grid">
                        ${unConfiguredNPCs.map(npc => this.renderNPCCard(npc, false)).join('')}
                    </div>
                </div>
            ` : ''}
        `
    }

    renderNPCCard(npc, isConfigured) {
        const npcType = this.npcTypes.find(t => t.id === npc.type)
        const position = `(${npc.position?.x || npc.x || '?'}, ${npc.position?.y || npc.y || '?'})`
        
        return `
            <div class="npc-card ${isConfigured ? 'configured' : 'unconfigured'}" 
                 onclick="adminPanel.npcEditor.editNPC(${npc.id})">
                <div class="npc-card-header">
                    <div class="npc-icon" style="background-color: ${npcType?.color || '#95a5a6'}">
                        ${npcType?.icon || '🎭'}
                    </div>
                    <div class="npc-info">
                        <div class="npc-name">${npc.name || `NPC #${npc.id}`}</div>
                        <div class="npc-type">${npcType?.name || 'Non configuré'}</div>
                    </div>
                </div>
                <div class="npc-card-details">
                    <div class="npc-detail">📍 Position: ${position}</div>
                    ${npc.sprite ? `<div class="npc-detail">🖼️ Sprite: ${npc.sprite}</div>` : ''}
                    ${npc.direction ? `<div class="npc-detail">➡️ Direction: ${npc.direction}</div>` : ''}
                </div>
                <div class="npc-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); adminPanel.npcEditor.editNPC(${npc.id})">
                        ${isConfigured ? '✏️ Modifier' : '⚙️ Configurer'}
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); adminPanel.npcEditor.duplicateNPC(${npc.id})">
                        📋 Dupliquer
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); adminPanel.npcEditor.deleteNPC(${npc.id})">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `
    }

    // ================================
    // GESTION DE L'ÉDITEUR MODAL
    // ================================

    editNPC(npcId) {
        console.log(`✏️ [NPCEditor] Editing NPC: ${npcId}`)
        
        // Trouver le NPC
        this.currentNPC = this.npcsList.find(npc => npc.id === npcId)
        if (!this.currentNPC) {
            this.adminPanel.showNotification('NPC non trouvé', 'error')
            return
        }

        // Copie de travail
        this.currentNPC = { ...this.currentNPC }
        this.isEditing = true
        
        // Ouvrir l'éditeur modal
        this.openEditor()
    }

    openEditor() {
        const modal = document.getElementById('npcEditorModal')
        if (modal) {
            modal.classList.add('active')
            
            // Réinitialiser à l'étape 1
            this.currentStep = 1
            this.updateStepDisplay()
            this.renderCurrentStep()
        }
    }

    closeEditor() {
        const modal = document.getElementById('npcEditorModal')
        if (modal) {
            modal.classList.remove('active')
        }
        
        // Réinitialiser l'état
        this.currentNPC = null
        this.isEditing = false
        this.currentStep = 1
        
        console.log('✅ [NPCEditor] Editor closed')
    }

    // ================================
    // NAVIGATION PROGRESSIVE
    // ================================

    goToStep(step) {
        if (step < 1 || step > this.maxSteps) return
        if (step > this.currentStep + 1) {
            // Validation requise avant d'avancer
            if (!this.validateCurrentStep()) {
                this.adminPanel.showNotification('Veuillez compléter les champs requis', 'warning')
                return
            }
        }
        
        this.currentStep = step
        this.updateStepDisplay()
        this.renderCurrentStep()
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.goToStep(this.currentStep + 1)
        }
    }

    prevStep() {
        this.goToStep(this.currentStep - 1)
    }

    updateStepDisplay() {
        // Mettre à jour les indicateurs d'étapes
        document.querySelectorAll('.npc-step').forEach((step, index) => {
            const stepNumber = index + 1
            step.classList.toggle('active', stepNumber === this.currentStep)
            step.classList.toggle('completed', stepNumber < this.currentStep)
        })

        // Mettre à jour les boutons de navigation
        const prevBtn = document.getElementById('npcPrevStep')
        const nextBtn = document.getElementById('npcNextStep')
        const saveBtn = document.getElementById('npcSaveBtn')

        if (prevBtn) prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none'
        if (nextBtn) nextBtn.style.display = this.currentStep < this.maxSteps ? 'inline-flex' : 'none'
        if (saveBtn) saveBtn.style.display = this.currentStep === this.maxSteps ? 'inline-flex' : 'none'
    }

    renderCurrentStep() {
        const stepContent = document.getElementById('npcStepContent')
        if (!stepContent) return

        console.log(`🎯 [NPCEditor] Rendering step ${this.currentStep}`)

        switch (this.currentStep) {
            case 1:
                this.renderStepTypeSelection()
                break
            case 2:
                this.renderStepBasicInfo()
                break
            case 3:
                this.renderStepAdvancedConfig()
                break
            case 4:
                this.renderStepPreview()
                break
            default:
                stepContent.innerHTML = '<div class="error">Étape inconnue</div>'
        }
    }

    renderStepTypeSelection() {
        // Cette méthode sera implémentée par le module TypeSelector
        const stepContent = document.getElementById('npcStepContent')
        if (this.typeSelector && this.typeSelector.render) {
            this.typeSelector.render(stepContent, this.currentNPC)
        } else {
            // Fallback basique
            stepContent.innerHTML = `
                <div class="step-fallback">
                    <h3>🎭 Sélection du Type de NPC</h3>
                    <p>Module TypeSelector en cours de chargement...</p>
                    <div class="npc-types-grid">
                        ${this.npcTypes.map(type => `
                            <div class="npc-type-card" onclick="adminPanel.npcEditor.selectNPCType('${type.id}')"
                                 style="border-color: ${type.color}">
                                <div class="npc-type-icon" style="background-color: ${type.color}">${type.icon}</div>
                                <div class="npc-type-name">${type.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        }
    }

    renderStepBasicInfo() {
        // Cette méthode sera implémentée par le module BasicForm
        const stepContent = document.getElementById('npcStepContent')
        if (this.basicForm && this.basicForm.render) {
            this.basicForm.render(stepContent, this.currentNPC)
        } else {
            // Fallback basique
            stepContent.innerHTML = `
                <div class="step-fallback">
                    <h3>📝 Informations de Base</h3>
                    <p>Module BasicForm en cours de chargement...</p>
                </div>
            `
        }
    }

    renderStepAdvancedConfig() {
        // Cette méthode sera implémentée par le module AdvancedConfigs
        const stepContent = document.getElementById('npcStepContent')
        if (this.advancedConfigs && this.advancedConfigs.render) {
            this.advancedConfigs.render(stepContent, this.currentNPC)
        } else {
            // Fallback basique
            stepContent.innerHTML = `
                <div class="step-fallback">
                    <h3>⚙️ Configuration Avancée</h3>
                    <p>Module AdvancedConfigs en cours de chargement...</p>
                </div>
            `
        }
    }

    renderStepPreview() {
        // Cette méthode sera implémentée par le module PreviewValidator
        const stepContent = document.getElementById('npcStepContent')
        if (this.previewValidator && this.previewValidator.render) {
            this.previewValidator.render(stepContent, this.currentNPC)
        } else {
            // Fallback basique
            stepContent.innerHTML = `
                <div class="step-fallback">
                    <h3>👁️ Aperçu et Validation</h3>
                    <p>Module PreviewValidator en cours de chargement...</p>
                    <div class="npc-preview-basic">
                        <h4>NPC: ${this.currentNPC?.name || 'Sans nom'}</h4>
                        <p>Type: ${this.currentNPC?.type || 'Non défini'}</p>
                        <p>Position: (${this.currentNPC?.position?.x || '?'}, ${this.currentNPC?.position?.y || '?'})</p>
                    </div>
                </div>
            `
        }
    }

    // ================================
    // VALIDATION ET SAUVEGARDE
    // ================================

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.currentNPC?.type !== undefined
            case 2:
                return this.currentNPC?.name && this.currentNPC?.sprite
            case 3:
                return this.validateAdvancedConfig()
            case 4:
                return this.validateCompleteNPC()
            default:
                return true
        }
    }

    validateAdvancedConfig() {
        if (!this.currentNPC?.type) return false
        
        // Validation spécifique selon le type
        switch (this.currentNPC.type) {
            case 'merchant':
                return this.currentNPC.shopId && this.currentNPC.shopType
            case 'trainer':
            case 'gym_leader':
                return this.currentNPC.trainerId && this.currentNPC.trainerClass
            case 'healer':
                return this.currentNPC.healerConfig?.healingType
            case 'transport':
                return this.currentNPC.destinations?.length > 0
            default:
                return true // Types simples
        }
    }

    validateCompleteNPC() {
        const required = ['type', 'name', 'position', 'sprite', 'direction']
        return required.every(field => {
            if (field === 'position') {
                return this.currentNPC.position?.x !== undefined && this.currentNPC.position?.y !== undefined
            }
            return this.currentNPC[field] !== undefined
        })
    }

    async saveCurrentNPC() {
        if (!this.validateCompleteNPC()) {
            this.adminPanel.showNotification('NPC incomplet, impossible de sauvegarder', 'error')
            return
        }

        console.log('💾 [NPCEditor] Saving NPC:', this.currentNPC)

        try {
            // Sauvegarder via le data manager
            if (this.dataManager) {
                await this.dataManager.saveNPC(this.currentZone, this.currentNPC)
            } else {
                // Fallback API call direct
                await this.adminPanel.apiCall(`/maps/${this.currentZone}/npcs`, {
                    method: 'POST',
                    body: JSON.stringify({ npc: this.currentNPC })
                })
            }

            // Mettre à jour la liste locale
            const existingIndex = this.npcsList.findIndex(npc => npc.id === this.currentNPC.id)
            if (existingIndex !== -1) {
                this.npcsList[existingIndex] = { ...this.currentNPC }
            } else {
                this.npcsList.push({ ...this.currentNPC })
            }

            this.updateNPCsList()
            this.closeEditor()
            this.adminPanel.showNotification('NPC sauvegardé avec succès', 'success')

        } catch (error) {
            console.error('❌ [NPCEditor] Error saving NPC:', error)
            this.adminPanel.showNotification('Erreur sauvegarde NPC: ' + error.message, 'error')
        }
    }

    // ================================
    // ACTIONS NPCs
    // ================================

    selectNPCType(typeId) {
        if (this.currentNPC) {
            this.currentNPC.type = typeId
            
            // Appliquer les presets par défaut si disponibles
            const typePresets = this.presets[typeId]
            if (typePresets && typePresets.length > 0) {
                this.applyPreset(typeId, typePresets[0].id)
            }
            
            console.log(`🎭 [NPCEditor] Selected type: ${typeId}`)
            this.nextStep()
        }
    }

    applyPreset(typeId, presetId) {
        // Cette méthode sera enrichie par les modules spécialisés
        console.log(`🎨 [NPCEditor] Applying preset: ${typeId}/${presetId}`)
        
        // Presets de base selon le type
        const basePresets = {
            dialogue: {
                interactionRadius: 48,
                canWalkAway: true,
                autoFacePlayer: true,
                repeatable: true
            },
            merchant: {
                interactionRadius: 32,
                canWalkAway: false,
                autoFacePlayer: true,
                shopType: 'pokemart'
            },
            trainer: {
                interactionRadius: 32,
                canWalkAway: false,
                autoFacePlayer: true,
                battleType: 'single',
                allowItems: true
            }
        }

        const preset = basePresets[typeId]
        if (preset) {
            Object.assign(this.currentNPC, preset)
        }
    }

    duplicateNPC(npcId) {
        const originalNPC = this.npcsList.find(npc => npc.id === npcId)
        if (!originalNPC) return

        const duplicateNPC = {
            ...originalNPC,
            id: Date.now(), // Nouvel ID
            name: originalNPC.name + ' (copie)',
            position: {
                x: (originalNPC.position?.x || originalNPC.x || 0) + 32,
                y: (originalNPC.position?.y || originalNPC.y || 0) + 32
            }
        }

        this.npcsList.push(duplicateNPC)
        this.updateNPCsList()
        this.adminPanel.showNotification('NPC dupliqué avec succès', 'success')
    }

    deleteNPC(npcId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce NPC ?')) return

        const npcIndex = this.npcsList.findIndex(npc => npc.id === npcId)
        if (npcIndex !== -1) {
            this.npcsList.splice(npcIndex, 1)
            this.updateNPCsList()
            this.adminPanel.showNotification('NPC supprimé avec succès', 'success')
        }
    }

    // ================================
    // API PUBLIQUE
    // ================================

    onTabActivated() {
        console.log('🎭 [NPCEditor] Tab activated')
        
        // Charger les données si pas déjà fait
        if (this.availableZones.length === 0) {
            this.loadInitialData()
        }

        // Populer le sélecteur de zones
        this.populateZoneSelector()
    }

    populateZoneSelector() {
        const zoneSelect = document.getElementById('npcZoneSelect')
        if (zoneSelect) {
            zoneSelect.innerHTML = `
                <option value="">Sélectionner une zone...</option>
                ${this.availableZones.map(zone => 
                    `<option value="${zone.id}">${zone.name}</option>`
                ).join('')}
            `
        }
    }

    // Méthodes pour l'intégration avec MapEditor
    addNPCFromMap(position) {
        const newNPC = {
            id: Date.now(),
            position: { x: position.x, y: position.y },
            direction: 'south',
            interactionRadius: 32
        }
        
        if (this.currentZone) {
            this.npcsList.push(newNPC)
            this.updateNPCsList()
            this.editNPC(newNPC.id) // Ouvrir directement l'éditeur
        }
    }

    // Méthodes pour le chargement des modules
    loadSubModules(modules) {
        modules.forEach(module => {
            const instance = new module(this)
            this[instance.name] = instance
            console.log(`✅ [NPCEditor] Sub-module ${instance.name} loaded`)
        })
    }

    // Cleanup
    cleanup() {
        this.currentNPC = null
        this.npcsList = []
        this.isEditing = false
        
        // Cleanup des sous-modules
        Object.values(this).forEach(module => {
            if (module && typeof module.cleanup === 'function') {
                module.cleanup()
            }
        })
        
        console.log('🧹 [NPCEditor] Core module cleanup completed')
    }
}

// Export for global access
export default NPCEditorModule
