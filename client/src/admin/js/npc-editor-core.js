// PokeWorld Admin Panel - NPC Editor Core Module
// Interface progressive et navigation principale

export class NPCEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'npcEditor'
        
        // État de l'éditeur
        this.currentStep = 1
        this.maxSteps = 4
        this.currentNPC = null
        this.isEditMode = false
        this.currentZone = null
        this.zoneNPCs = []
        
        // Modules externes (seront injectés)
        this.typesModule = null
        this.dataModule = null
        
        console.log('🎭 [NPCEditor] Core module initialized')
        this.init()
    }

    async init() {
        this.setupEventListeners()
        await this.loadAvailableZones()
        console.log('✅ [NPCEditor] Core initialization completed')
    }

    // ==============================
    // INJECTION DES MODULES EXTERNES
    // ==============================

    injectModules(typesModule, dataModule) {
        this.typesModule = typesModule
        this.dataModule = dataModule
        console.log('🔗 [NPCEditor] External modules injected')
    }

    // ==============================
    // ACTIVATION DE L'ONGLET
    // ==============================

    async onTabActivated() {
        console.log('🎭 [NPCEditor] Tab activated')
        
        // Initialiser l'interface si première activation
        const npcPanel = document.getElementById('npcs')
        if (npcPanel && !npcPanel.dataset.initialized) {
            this.initializeInterface()
            npcPanel.dataset.initialized = 'true'
        }
        
        // Recharger les zones disponibles
        await this.loadAvailableZones()
    }

    // ==============================
    // INTERFACE PRINCIPALE
    // ==============================

    initializeInterface() {
        const npcPanel = document.getElementById('npcs')
        if (!npcPanel) {
            console.error('❌ [NPCEditor] NPC panel not found in HTML')
            return
        }

        npcPanel.innerHTML = `
            <!-- En-tête avec sélection de zone -->
            <div class="npc-header">
                <h2 style="margin-bottom: 25px; color: #2c3e50;">
                    <i class="fas fa-users"></i> Éditeur de NPCs
                </h2>
                
                <div class="zone-selector">
                    <label for="npcZoneSelect" class="form-label">🗺️ Zone:</label>
                    <select id="npcZoneSelect" class="form-select" onchange="adminPanel.npcEditor.selectZone(this.value)" style="min-width: 200px;">
                        <option value="">Sélectionner une zone...</option>
                    </select>
                    
                    <div class="zone-actions" style="display: none;">
                        <button class="btn btn-success" onclick="adminPanel.npcEditor.createNewNPC()">
                            <i class="fas fa-plus"></i> Nouveau NPC
                        </button>
                        <button class="btn btn-info" onclick="adminPanel.npcEditor.refreshZone()">
                            <i class="fas fa-sync-alt"></i> Actualiser
                        </button>
                        <button class="btn btn-warning" onclick="adminPanel.npcEditor.importNPCs()">
                            <i class="fas fa-file-import"></i> Importer
                        </button>
                        <button class="btn btn-secondary" onclick="adminPanel.npcEditor.exportNPCs()">
                            <i class="fas fa-file-export"></i> Exporter
                        </button>
                    </div>
                </div>
            </div>

            <!-- Liste des NPCs de la zone -->
            <div class="npcs-zone-content" id="npcsZoneContent" style="display: none;">
                
                <!-- Statistiques rapides -->
                <div class="npcs-stats">
                    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
                        <div class="stat-card">
                            <div class="stat-value" id="totalNPCs">0</div>
                            <div class="stat-label">NPCs Total</div>
                        </div>
                        <div class="stat-card success">
                            <div class="stat-value" id="configuredNPCs">0</div>
                            <div class="stat-label">Configurés</div>
                        </div>
                        <div class="stat-card warning">
                            <div class="stat-value" id="pendingNPCs">0</div>
                            <div class="stat-label">En Attente</div>
                        </div>
                        <div class="stat-card info">
                            <div class="stat-value" id="npcTypes">0</div>
                            <div class="stat-label">Types Différents</div>
                        </div>
                    </div>
                </div>

                <!-- Filtres NPCs -->
                <div class="npcs-filters" style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                        <div>
                            <label class="form-label">🔍 Recherche:</label>
                            <input type="text" id="npcSearchFilter" class="form-input" placeholder="Nom ou ID..." 
                                   onkeyup="adminPanel.npcEditor.filterNPCs()" style="width: 200px;">
                        </div>
                        <div>
                            <label class="form-label">🎭 Type:</label>
                            <select id="npcTypeFilter" class="form-select" onchange="adminPanel.npcEditor.filterNPCs()" style="width: 150px;">
                                <option value="">Tous types</option>
                                <option value="dialogue">Dialogue</option>
                                <option value="merchant">Marchand</option>
                                <option value="trainer">Dresseur</option>
                                <option value="healer">Soigneur</option>
                                <option value="gym_leader">Chef Arène</option>
                                <option value="transport">Transport</option>
                                <option value="service">Service</option>
                                <option value="minigame">Mini-jeu</option>
                                <option value="researcher">Chercheur</option>
                                <option value="guild">Guilde</option>
                                <option value="event">Événement</option>
                                <option value="quest_master">Maître Quête</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">📊 État:</label>
                            <select id="npcStatusFilter" class="form-select" onchange="adminPanel.npcEditor.filterNPCs()" style="width: 150px;">
                                <option value="">Tous états</option>
                                <option value="configured">Configurés</option>
                                <option value="pending">En attente</option>
                                <option value="incomplete">Incomplets</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Liste des NPCs -->
                <div class="npcs-list-container">
                    <div id="npcsListEmpty" class="empty-state" style="text-align: center; padding: 40px; color: #6c757d;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">🎭</div>
                        <div style="font-size: 1.2rem; margin-bottom: 10px;">Aucun NPC dans cette zone</div>
                        <div style="margin-bottom: 20px;">Créez votre premier NPC ou importez depuis le Map Editor</div>
                        <button class="btn btn-primary" onclick="adminPanel.npcEditor.createNewNPC()">
                            <i class="fas fa-plus"></i> Créer un NPC
                        </button>
                    </div>
                    
                    <div id="npcsList" class="npcs-grid" style="display: none;">
                        <!-- NPCs seront affichés ici par renderNPCsList() -->
                    </div>
                </div>

                <div class="loading" id="npcsLoading" style="display: none;">
                    <div class="spinner"></div>
                    Chargement des NPCs...
                </div>
            </div>

            <!-- Message si aucune zone sélectionnée -->
            <div id="noZoneSelected" class="empty-state" style="text-align: center; padding: 60px; color: #7f8c8d;">
                <i class="fas fa-map" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>Sélectionnez une zone pour commencer à éditer les NPCs</p>
            </div>
        `

        console.log('✅ [NPCEditor] Interface initialized')
    }

    // ==============================
    // GESTION DES ZONES
    // ==============================

    async loadAvailableZones() {
        try {
            console.log('🗺️ [NPCEditor] Loading available zones...')
            
            // Zones disponibles (même liste que MapEditor)
            const availableZones = [
                { id: 'beach', name: '🏖️ Beach' },
                { id: 'village', name: '🏘️ Village' },
                { id: 'lavandia', name: '🏙️ Lavandia' },
                { id: 'road1', name: '🛤️ Route 1' },
                { id: 'road2', name: '🛤️ Route 2' },
                { id: 'road3', name: '🛤️ Route 3' }
            ]

            const zoneSelect = document.getElementById('npcZoneSelect')
            if (zoneSelect) {
                zoneSelect.innerHTML = `
                    <option value="">Sélectionner une zone...</option>
                    <optgroup label="🌍 Zones principales">
                        <option value="beach">🏖️ Beach</option>
                        <option value="village">🏘️ Village</option>
                        <option value="lavandia">🏙️ Lavandia</option>
                    </optgroup>
                    <optgroup label="🛤️ Routes">
                        <option value="road1">🛤️ Route 1</option>
                        <option value="road2">🛤️ Route 2</option>
                        <option value="road3">🛤️ Route 3</option>
                    </optgroup>
                `
            }

            console.log(`✅ [NPCEditor] ${availableZones.length} zones loaded`)
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error loading zones:', error)
            this.adminPanel.showNotification('Erreur chargement zones: ' + error.message, 'error')
        }
    }

    async selectZone(zoneId) {
        if (!zoneId) {
            this.currentZone = null
            this.showNoZoneSelected()
            return
        }

        console.log(`🗺️ [NPCEditor] Selecting zone: ${zoneId}`)
        this.currentZone = zoneId
        
        try {
            // Charger les NPCs de la zone via le module Data
            if (this.dataModule) {
                await this.dataModule.loadZoneNPCs(zoneId)
            }
            
            this.showZoneContent()
            this.updateNPCsStats()
            this.renderNPCsList()
            
            this.adminPanel.showNotification(`Zone "${zoneId}" sélectionnée`, 'success')
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error selecting zone:', error)
            this.adminPanel.showNotification('Erreur sélection zone: ' + error.message, 'error')
        }
    }

    refreshZone() {
        if (this.currentZone) {
            console.log(`🔄 [NPCEditor] Refreshing zone: ${this.currentZone}`)
            this.selectZone(this.currentZone)
        }
    }

    showZoneContent() {
        const zoneContent = document.getElementById('npcsZoneContent')
        const zoneActions = document.querySelector('.zone-actions')
        const noZoneSelected = document.getElementById('noZoneSelected')
        
        if (zoneContent) zoneContent.style.display = 'block'
        if (zoneActions) zoneActions.style.display = 'flex'
        if (noZoneSelected) noZoneSelected.style.display = 'none'
    }

    showNoZoneSelected() {
        const zoneContent = document.getElementById('npcsZoneContent')
        const zoneActions = document.querySelector('.zone-actions')
        const noZoneSelected = document.getElementById('noZoneSelected')
        
        if (zoneContent) zoneContent.style.display = 'none'
        if (zoneActions) zoneActions.style.display = 'none'
        if (noZoneSelected) noZoneSelected.style.display = 'block'
    }

    // ==============================
    // AFFICHAGE DES NPCS
    // ==============================

    renderNPCsList() {
        if (!this.dataModule || !this.dataModule.zoneNPCs) {
            console.warn('⚠️ [NPCEditor] Data module or NPCs not available')
            return
        }

        const npcsList = document.getElementById('npcsList')
        const npcsListEmpty = document.getElementById('npcsListEmpty')
        const npcs = this.dataModule.zoneNPCs

        if (npcs.length === 0) {
            if (npcsList) npcsList.style.display = 'none'
            if (npcsListEmpty) npcsListEmpty.style.display = 'block'
            return
        }

        if (npcsListEmpty) npcsListEmpty.style.display = 'none'
        if (npcsList) {
            npcsList.style.display = 'grid'
            npcsList.innerHTML = npcs.map(npc => this.renderNPCCard(npc)).join('')
        }
    }

    renderNPCCard(npc) {
        const isConfigured = npc.type && npc.name
        const statusClass = isConfigured ? 'configured' : 'pending'
        const statusText = isConfigured ? 'Configuré' : 'En attente'
        const statusIcon = isConfigured ? 'fas fa-check-circle' : 'fas fa-clock'
        
        const typeIcon = this.getNPCTypeIcon(npc.type)
        const typeText = this.getNPCTypeDisplayName(npc.type)

        return `
            <div class="npc-card ${statusClass}" onclick="adminPanel.npcEditor.editNPC(${npc.id})"
                 style="background: white; border: 2px solid ${isConfigured ? '#28a745' : '#ffc107'}; 
                        border-radius: 12px; padding: 20px; cursor: pointer; 
                        transition: all 0.3s ease; position: relative;">
                
                <!-- Badge de statut -->
                <div class="npc-status-badge" style="position: absolute; top: 10px; right: 10px; 
                     background: ${isConfigured ? '#28a745' : '#ffc107'}; 
                     color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem;">
                    <i class="${statusIcon}"></i> ${statusText}
                </div>

                <!-- En-tête du NPC -->
                <div class="npc-header" style="margin-bottom: 15px;">
                    <div class="npc-icon" style="font-size: 2.5rem; margin-bottom: 8px;">
                        ${typeIcon}
                    </div>
                    <h4 style="margin: 0; color: #2c3e50; font-size: 1.1rem;">
                        ${npc.name || `NPC #${npc.id}`}
                    </h4>
                    <div style="color: #6c757d; font-size: 0.9rem;">
                        ${typeText} ${npc.type ? '' : '(Non défini)'}
                    </div>
                </div>

                <!-- Informations NPC -->
                <div class="npc-info" style="font-size: 0.85rem; color: #495057; line-height: 1.4;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span><strong>ID:</strong> ${npc.id}</span>
                        <span><strong>Position:</strong> (${npc.position?.x || 0}, ${npc.position?.y || 0})</span>
                    </div>
                    
                    ${npc.sprite ? `
                        <div style="margin-bottom: 5px;">
                            <strong>Sprite:</strong> ${npc.sprite}
                        </div>
                    ` : ''}
                    
                    ${npc.direction ? `
                        <div style="margin-bottom: 5px;">
                            <strong>Direction:</strong> ${npc.direction}
                        </div>
                    ` : ''}

                    ${npc.questsToGive?.length ? `
                        <div style="margin-bottom: 5px;">
                            <strong>Quêtes:</strong> ${npc.questsToGive.length} à donner
                        </div>
                    ` : ''}
                </div>

                <!-- Actions rapides -->
                <div class="npc-quick-actions" style="display: flex; gap: 8px; margin-top: 15px;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); adminPanel.npcEditor.editNPC(${npc.id})" 
                            style="padding: 6px 12px; font-size: 0.8rem;">
                        <i class="fas fa-edit"></i> Éditer
                    </button>
                    <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); adminPanel.npcEditor.duplicateNPC(${npc.id})" 
                            style="padding: 6px 12px; font-size: 0.8rem;">
                        <i class="fas fa-copy"></i> Dupliquer
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); adminPanel.npcEditor.deleteNPC(${npc.id})" 
                            style="padding: 6px 12px; font-size: 0.8rem;">
                        <i class="fas fa-trash"></i> Suppr.
                    </button>
                </div>
            </div>
        `
    }

    updateNPCsStats() {
        if (!this.dataModule || !this.dataModule.zoneNPCs) return

        const npcs = this.dataModule.zoneNPCs
        const totalNPCs = npcs.length
        const configuredNPCs = npcs.filter(npc => npc.type && npc.name).length
        const pendingNPCs = totalNPCs - configuredNPCs
        const uniqueTypes = new Set(npcs.map(npc => npc.type).filter(Boolean)).size

        // Mettre à jour les statistiques
        const totalElement = document.getElementById('totalNPCs')
        const configuredElement = document.getElementById('configuredNPCs')
        const pendingElement = document.getElementById('pendingNPCs')
        const typesElement = document.getElementById('npcTypes')

        if (totalElement) totalElement.textContent = totalNPCs
        if (configuredElement) configuredElement.textContent = configuredNPCs
        if (pendingElement) pendingElement.textContent = pendingNPCs
        if (typesElement) typesElement.textContent = uniqueTypes
    }

    // ==============================
    // FILTRAGE DES NPCS
    // ==============================

    filterNPCs() {
        const searchTerm = document.getElementById('npcSearchFilter')?.value.toLowerCase() || ''
        const typeFilter = document.getElementById('npcTypeFilter')?.value || ''
        const statusFilter = document.getElementById('npcStatusFilter')?.value || ''

        const npcCards = document.querySelectorAll('.npc-card')
        
        npcCards.forEach(card => {
            const npcId = card.onclick.toString().match(/editNPC\((\d+)\)/)?.[1]
            if (!npcId) return

            const npc = this.dataModule?.zoneNPCs.find(n => n.id == npcId)
            if (!npc) return

            const matchesSearch = !searchTerm || 
                (npc.name && npc.name.toLowerCase().includes(searchTerm)) ||
                npc.id.toString().includes(searchTerm)

            const matchesType = !typeFilter || npc.type === typeFilter

            const isConfigured = npc.type && npc.name
            const matchesStatus = !statusFilter || 
                (statusFilter === 'configured' && isConfigured) ||
                (statusFilter === 'pending' && !isConfigured) ||
                (statusFilter === 'incomplete' && (!npc.type || !npc.name))

            card.style.display = matchesSearch && matchesType && matchesStatus ? 'block' : 'none'
        })
    }

    // ==============================
    // ACTIONS NPCS
    // ==============================

    createNewNPC() {
        if (!this.currentZone) {
            this.adminPanel.showNotification('Aucune zone sélectionnée', 'warning')
            return
        }

        console.log('🎭 [NPCEditor] Creating new NPC')
        
        // Initialiser un nouveau NPC
        this.currentNPC = {
            id: Date.now(), // ID temporaire
            position: { x: 100, y: 100 },
            direction: 'south',
            zone: this.currentZone
        }
        
        this.isEditMode = false
        this.currentStep = 1
        this.showProgressiveEditor()
    }

    editNPC(npcId) {
        console.log(`🎭 [NPCEditor] Editing NPC: ${npcId}`)
        
        if (!this.dataModule) {
            console.error('❌ [NPCEditor] Data module not available')
            return
        }

        const npc = this.dataModule.zoneNPCs.find(n => n.id == npcId)
        if (!npc) {
            console.error(`❌ [NPCEditor] NPC ${npcId} not found`)
            this.adminPanel.showNotification(`NPC #${npcId} introuvable`, 'error')
            return
        }

        this.currentNPC = JSON.parse(JSON.stringify(npc)) // Deep copy
        this.isEditMode = true
        this.currentStep = 1
        this.showProgressiveEditor()
    }

    duplicateNPC(npcId) {
        console.log(`🎭 [NPCEditor] Duplicating NPC: ${npcId}`)
        
        if (!this.dataModule) return

        const originalNPC = this.dataModule.zoneNPCs.find(n => n.id == npcId)
        if (!originalNPC) {
            this.adminPanel.showNotification(`NPC #${npcId} introuvable`, 'error')
            return
        }

        // Créer une copie avec un nouvel ID
        const duplicatedNPC = JSON.parse(JSON.stringify(originalNPC))
        duplicatedNPC.id = Date.now()
        duplicatedNPC.name = `${duplicatedNPC.name || 'NPC'} (Copie)`
        duplicatedNPC.position = {
            x: (duplicatedNPC.position?.x || 0) + 50,
            y: (duplicatedNPC.position?.y || 0) + 50
        }

        this.currentNPC = duplicatedNPC
        this.isEditMode = false
        this.currentStep = 1
        this.showProgressiveEditor()
    }

    async deleteNPC(npcId) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le NPC #${npcId} ?`)) {
            return
        }

        console.log(`🎭 [NPCEditor] Deleting NPC: ${npcId}`)
        
        try {
            if (this.dataModule) {
                await this.dataModule.deleteNPC(npcId)
            }
            
            this.renderNPCsList()
            this.updateNPCsStats()
            this.adminPanel.showNotification(`NPC #${npcId} supprimé`, 'success')
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error deleting NPC:', error)
            this.adminPanel.showNotification('Erreur suppression NPC: ' + error.message, 'error')
        }
    }

    // ==============================
    // ÉDITEUR PROGRESSIF
    // ==============================

    showProgressiveEditor() {
        console.log(`📝 [NPCEditor] Showing progressive editor - Step ${this.currentStep}`)
        
        const modal = document.getElementById('npcEditorModal') || this.createEditorModal()
        this.updateProgressiveInterface()
        this.adminPanel.showModal('npcEditorModal')
    }

    createEditorModal() {
        const modalHTML = `
            <div class="modal" id="npcEditorModal">
                <div class="modal-content" style="max-width: 1000px; max-height: 90vh;">
                    
                    <!-- En-tête avec progression -->
                    <div class="npc-editor-header" style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
                        <h3 style="margin: 0; color: #2c3e50; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-user-edit"></i> 
                            <span id="npcEditorTitle">Éditeur de NPC</span>
                        </h3>
                        
                        <!-- Barre de progression -->
                        <div class="progress-bar" style="margin-top: 15px;">
                            <div class="progress-steps" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <div class="progress-step active" data-step="1">
                                    <div class="step-circle">1</div>
                                    <div class="step-label">Type</div>
                                </div>
                                <div class="progress-step" data-step="2">
                                    <div class="step-circle">2</div>
                                    <div class="step-label">Infos</div>
                                </div>
                                <div class="progress-step" data-step="3">
                                    <div class="step-circle">3</div>
                                    <div class="step-label">Config</div>
                                </div>
                                <div class="progress-step" data-step="4">
                                    <div class="step-circle">4</div>
                                    <div class="step-label">Preview</div>
                                </div>
                            </div>
                            <div class="progress-line">
                                <div class="progress-fill" style="width: 25%;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Contenu de l'étape courante -->
                    <div id="npcEditorContent">
                        <!-- Le contenu sera généré dynamiquement -->
                    </div>

                    <!-- Navigation -->
                    <div class="npc-editor-navigation" style="display: flex; justify-content: space-between; align-items: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                        <button class="btn btn-secondary" id="npcPrevBtn" onclick="adminPanel.npcEditor.previousStep()" disabled>
                            <i class="fas fa-chevron-left"></i> Précédent
                        </button>
                        
                        <div class="step-info" style="color: #6c757d; font-size: 0.9rem;">
                            Étape <span id="currentStepNum">1</span> sur <span id="totalStepsNum">4</span>
                        </div>
                        
                        <div class="nav-right">
                            <button class="btn btn-warning" onclick="adminPanel.npcEditor.closeEditor()">
                                <i class="fas fa-times"></i> Annuler
                            </button>
                            <button class="btn btn-primary" id="npcNextBtn" onclick="adminPanel.npcEditor.nextStep()">
                                Suivant <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `

        document.body.insertAdjacentHTML('beforeend', modalHTML)
        return document.getElementById('npcEditorModal')
    }

    updateProgressiveInterface() {
        // Mettre à jour le titre
        const title = this.isEditMode ? 
            `Éditer NPC #${this.currentNPC.id}` : 
            'Créer un Nouveau NPC'
        
        const titleElement = document.getElementById('npcEditorTitle')
        if (titleElement) titleElement.textContent = title

        // Mettre à jour la progression
        this.updateProgressBar()
        
        // Mettre à jour le contenu selon l'étape
        this.updateStepContent()
        
        // Mettre à jour les boutons de navigation
        this.updateNavigationButtons()
    }

    updateProgressBar() {
        const progressFill = document.querySelector('.progress-fill')
        const progressSteps = document.querySelectorAll('.progress-step')
        const currentStepNum = document.getElementById('currentStepNum')
        
        if (progressFill) {
            progressFill.style.width = `${(this.currentStep / this.maxSteps) * 100}%`
        }
        
        progressSteps.forEach((step, index) => {
            const stepNum = index + 1
            if (stepNum === this.currentStep) {
                step.classList.add('active')
                step.classList.remove('completed')
            } else if (stepNum < this.currentStep) {
                step.classList.add('completed')
                step.classList.remove('active')
            } else {
                step.classList.remove('active', 'completed')
            }
        })
        
        if (currentStepNum) {
            currentStepNum.textContent = this.currentStep
        }
    }

    updateStepContent() {
        const content = document.getElementById('npcEditorContent')
        if (!content) return

        switch (this.currentStep) {
            case 1:
                this.renderStep1TypeSelection()
                break
            case 2:
                this.renderStep2BasicInfo()
                break
            case 3:
                this.renderStep3SpecificConfig()
                break
            case 4:
                this.renderStep4Preview()
                break
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('npcPrevBtn')
        const nextBtn = document.getElementById('npcNextBtn')
        
        if (prevBtn) {
            prevBtn.disabled = (this.currentStep === 1)
        }
        
        if (nextBtn) {
            if (this.currentStep === this.maxSteps) {
                nextBtn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder'
                nextBtn.className = 'btn btn-success'
            } else {
                nextBtn.innerHTML = 'Suivant <i class="fas fa-chevron-right"></i>'
                nextBtn.className = 'btn btn-primary'
            }
        }
    }

    // ==============================
    // RENDU DES ÉTAPES
    // ==============================

    renderStep1TypeSelection() {
        const content = document.getElementById('npcEditorContent')
        if (!content) return

        content.innerHTML = `
            <div class="step-content step-1">
                <h4 style="color: #2c3e50; margin-bottom: 20px;">
                    🎭 Étape 1: Choisir le Type de NPC
                </h4>
                
                <p style="color: #6c757d; margin-bottom: 25px;">
                    Sélectionnez le type de NPC que vous souhaitez créer. Chaque type a ses propres propriétés et comportements spécifiques.
                </p>

                <div class="npc-type-selector">
                    <div class="types-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                        
                        <div class="type-card ${this.currentNPC.type === 'dialogue' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('dialogue')">
                            <div class="type-icon">💬</div>
                            <div class="type-name">Dialogue</div>
                            <div class="type-desc">Guide, information, PNJ parlant</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'merchant' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('merchant')">
                            <div class="type-icon">🛍️</div>
                            <div class="type-name">Marchand</div>
                            <div class="type-desc">Boutique, vente d'objets</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'trainer' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('trainer')">
                            <div class="type-icon">⚔️</div>
                            <div class="type-name">Dresseur</div>
                            <div class="type-desc">Combat Pokémon, rival</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'healer' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('healer')">
                            <div class="type-icon">💊</div>
                            <div class="type-name">Soigneur</div>
                            <div class="type-desc">Centre Pokémon, guérison</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'gym_leader' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('gym_leader')">
                            <div class="type-icon">🏆</div>
                            <div class="type-name">Chef d'Arène</div>
                            <div class="type-desc">Boss, badge, défi</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'transport' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('transport')">
                            <div class="type-icon">🚢</div>
                            <div class="type-name">Transport</div>
                            <div class="type-desc">Voyage, bateau, pilote</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'service' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('service')">
                            <div class="type-icon">🔧</div>
                            <div class="type-name">Service</div>
                            <div class="type-desc">Utilitaire, name rater</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'minigame' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('minigame')">
                            <div class="type-icon">🎮</div>
                            <div class="type-name">Mini-jeu</div>
                            <div class="type-desc">Concours, casino, jeu</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'researcher' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('researcher')">
                            <div class="type-icon">🔬</div>
                            <div class="type-name">Chercheur</div>
                            <div class="type-desc">Pokédex, science, analyse</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'guild' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('guild')">
                            <div class="type-icon">⚡</div>
                            <div class="type-name">Guilde</div>
                            <div class="type-desc">Faction, recrutement</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'event' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('event')">
                            <div class="type-icon">🎉</div>
                            <div class="type-name">Événement</div>
                            <div class="type-desc">Festival, concours spécial</div>
                        </div>

                        <div class="type-card ${this.currentNPC.type === 'quest_master' ? 'selected' : ''}" 
                             onclick="adminPanel.npcEditor.selectNPCType('quest_master')">
                            <div class="type-icon">📜</div>
                            <div class="type-name">Maître Quête</div>
                            <div class="type-desc">Quêtes épiques, défis</div>
                        </div>
                    </div>
                </div>

                ${this.currentNPC.type ? `
                    <div class="selected-type-info" style="background: #e8f5e8; border: 2px solid #28a745; border-radius: 10px; padding: 20px; margin-top: 20px;">
                        <h5 style="color: #155724; margin-bottom: 10px;">
                            ${this.getNPCTypeIcon(this.currentNPC.type)} Type sélectionné: ${this.getNPCTypeDisplayName(this.currentNPC.type)}
                        </h5>
                        <p style="color: #155724; margin: 0;">
                            ${this.getNPCTypeDescription(this.currentNPC.type)}
                        </p>
                    </div>
                ` : `
                    <div class="no-type-selected" style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; padding: 20px; margin-top: 20px; text-align: center;">
                        <p style="color: #856404; margin: 0;">
                            <i class="fas fa-info-circle"></i> Veuillez sélectionner un type de NPC pour continuer
                        </p>
                    </div>
                `}
            </div>
        `
    }

    renderStep2BasicInfo() {
        const content = document.getElementById('npcEditorContent')
        if (!content) return

        content.innerHTML = `
            <div class="step-content step-2">
                <h4 style="color: #2c3e50; margin-bottom: 20px;">
                    ℹ️ Étape 2: Informations de Base
                </h4>
                
                <p style="color: #6c757d; margin-bottom: 25px;">
                    Configurez les informations essentielles de votre NPC ${this.getNPCTypeDisplayName(this.currentNPC.type)}.
                </p>

                <form id="npcBasicInfoForm" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    
                    <!-- Nom du NPC -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-user"></i> Nom du NPC *
                        </label>
                        <input type="text" class="form-input" id="npcName" 
                               value="${this.currentNPC.name || ''}" 
                               placeholder="Nom d'affichage du NPC" 
                               required>
                        <div class="input-help">Nom visible par les joueurs</div>
                    </div>

                    <!-- ID du NPC -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-hashtag"></i> ID du NPC
                        </label>
                        <input type="number" class="form-input" id="npcId" 
                               value="${this.currentNPC.id || ''}" 
                               placeholder="ID unique du NPC">
                        <div class="input-help">ID unique (auto si vide)</div>
                    </div>

                    <!-- Sprite -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-image"></i> Sprite *
                        </label>
                        <input type="text" class="form-input" id="npcSprite" 
                               value="${this.currentNPC.sprite || ''}" 
                               placeholder="nom_sprite.png" 
                               required>
                        <div class="input-help">Fichier image du NPC</div>
                    </div>

                    <!-- Direction -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-compass"></i> Direction
                        </label>
                        <select class="form-select" id="npcDirection">
                            <option value="north" ${this.currentNPC.direction === 'north' ? 'selected' : ''}>⬆️ Nord</option>
                            <option value="south" ${this.currentNPC.direction === 'south' ? 'selected' : ''}>⬇️ Sud</option>
                            <option value="east" ${this.currentNPC.direction === 'east' ? 'selected' : ''}>➡️ Est</option>
                            <option value="west" ${this.currentNPC.direction === 'west' ? 'selected' : ''}>⬅️ Ouest</option>
                        </select>
                        <div class="input-help">Direction de regard par défaut</div>
                    </div>

                    <!-- Position X -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-map-marker-alt"></i> Position X
                        </label>
                        <input type="number" class="form-input" id="npcPositionX" 
                               value="${this.currentNPC.position?.x || 100}" 
                               placeholder="0">
                        <div class="input-help">Coordonnée X en pixels</div>
                    </div>

                    <!-- Position Y -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-map-marker-alt"></i> Position Y
                        </label>
                        <input type="number" class="form-input" id="npcPositionY" 
                               value="${this.currentNPC.position?.y || 100}" 
                               placeholder="0">
                        <div class="input-help">Coordonnée Y en pixels</div>
                    </div>

                    <!-- Rayon d'interaction -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-circle"></i> Rayon d'Interaction
                        </label>
                        <input type="number" class="form-input" id="npcInteractionRadius" 
                               value="${this.currentNPC.interactionRadius || 32}" 
                               min="16" max="128" step="8">
                        <div class="input-help">Distance en pixels (16-128)</div>
                    </div>

                    <!-- Options comportement -->
                    <div class="form-group behavior-options" style="grid-column: 1/-1;">
                        <label class="form-label">
                            <i class="fas fa-cogs"></i> Options de Comportement
                        </label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">
                            
                            <label class="checkbox-label">
                                <input type="checkbox" id="npcCanWalkAway" 
                                       ${this.currentNPC.canWalkAway !== false ? 'checked' : ''}>
                                <span>🚶 Peut s'éloigner</span>
                            </label>

                            <label class="checkbox-label">
                                <input type="checkbox" id="npcAutoFacePlayer" 
                                       ${this.currentNPC.autoFacePlayer !== false ? 'checked' : ''}>
                                <span>👁️ Regarde le joueur</span>
                            </label>

                            <label class="checkbox-label">
                                <input type="checkbox" id="npcRepeatable" 
                                       ${this.currentNPC.repeatable !== false ? 'checked' : ''}>
                                <span>🔄 Interaction répétable</span>
                            </label>
                        </div>
                    </div>

                    <!-- Délai entre interactions -->
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-clock"></i> Délai (secondes)
                        </label>
                        <input type="number" class="form-input" id="npcCooldownSeconds" 
                               value="${this.currentNPC.cooldownSeconds || 0}" 
                               min="0" max="3600">
                        <div class="input-help">Temps entre interactions (0 = aucun)</div>
                    </div>
                </form>
            </div>
        `

        // Ajouter les event listeners pour la sauvegarde en temps réel
        this.setupBasicInfoListeners()
    }

    renderStep3SpecificConfig() {
        const content = document.getElementById('npcEditorContent')
        if (!content) return

        // Cette partie sera implémentée par le module NPCEditorTypes
        if (this.typesModule) {
            this.typesModule.renderTypeSpecificConfig(content, this.currentNPC)
        } else {
            content.innerHTML = `
                <div class="step-content step-3">
                    <h4 style="color: #2c3e50; margin-bottom: 20px;">
                        ⚙️ Étape 3: Configuration Spécifique - ${this.getNPCTypeDisplayName(this.currentNPC.type)}
                    </h4>
                    
                    <div class="warning-box" style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; padding: 20px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 2rem; margin-bottom: 10px;"></i>
                        <p style="color: #856404; margin: 0;">
                            Module NPCEditorTypes non chargé. Configuration spécifique indisponible.
                        </p>
                    </div>
                </div>
            `
        }
    }

    renderStep4Preview() {
        const content = document.getElementById('npcEditorContent')
        if (!content) return

        const npc = this.getCurrentNPCData()
        
        content.innerHTML = `
            <div class="step-content step-4">
                <h4 style="color: #2c3e50; margin-bottom: 20px;">
                    👁️ Étape 4: Aperçu et Validation
                </h4>
                
                <p style="color: #6c757d; margin-bottom: 25px;">
                    Vérifiez la configuration de votre NPC avant de la sauvegarder.
                </p>

                <div class="npc-preview-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                    
                    <!-- Informations générales -->
                    <div class="preview-section">
                        <h5 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">
                            📋 Informations Générales
                        </h5>
                        <div class="preview-details">
                            <div class="detail-row">
                                <strong>Nom:</strong> ${npc.name || 'Non défini'}
                            </div>
                            <div class="detail-row">
                                <strong>Type:</strong> ${this.getNPCTypeIcon(npc.type)} ${this.getNPCTypeDisplayName(npc.type)}
                            </div>
                            <div class="detail-row">
                                <strong>ID:</strong> ${npc.id}
                            </div>
                            <div class="detail-row">
                                <strong>Sprite:</strong> ${npc.sprite || 'Non défini'}
                            </div>
                            <div class="detail-row">
                                <strong>Direction:</strong> ${this.getDirectionDisplay(npc.direction)}
                            </div>
                            <div class="detail-row">
                                <strong>Position:</strong> (${npc.position?.x || 0}, ${npc.position?.y || 0})
                            </div>
                            <div class="detail-row">
                                <strong>Rayon interaction:</strong> ${npc.interactionRadius || 32}px
                            </div>
                        </div>
                    </div>

                    <!-- Configuration spécifique -->
                    <div class="preview-section">
                        <h5 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">
                            ⚙️ Configuration ${this.getNPCTypeDisplayName(npc.type)}
                        </h5>
                        <div class="preview-details" id="specificConfigPreview">
                            ${this.renderSpecificConfigPreview(npc)}
                        </div>
                    </div>
                </div>

                <!-- Comportement -->
                <div class="preview-section" style="margin-top: 25px;">
                    <h5 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">
                        🎭 Comportement
                    </h5>
                    <div class="behavior-tags" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${npc.canWalkAway !== false ? '<span class="behavior-tag active">🚶 Peut s\'éloigner</span>' : '<span class="behavior-tag inactive">🚶 Ne s\'éloigne pas</span>'}
                        ${npc.autoFacePlayer !== false ? '<span class="behavior-tag active">👁️ Regarde le joueur</span>' : '<span class="behavior-tag inactive">👁️ Ne regarde pas</span>'}
                        ${npc.repeatable !== false ? '<span class="behavior-tag active">🔄 Répétable</span>' : '<span class="behavior-tag inactive">🔄 Non répétable</span>'}
                        ${npc.cooldownSeconds > 0 ? `<span class="behavior-tag active">⏱️ Délai ${npc.cooldownSeconds}s</span>` : '<span class="behavior-tag active">⏱️ Aucun délai</span>'}
                    </div>
                </div>

                <!-- Validation -->
                <div class="validation-section" style="margin-top: 25px;">
                    <h5 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">
                        ✅ Validation
                    </h5>
                    <div id="validationResults">
                        ${this.renderValidationResults(npc)}
                    </div>
                </div>

                <!-- Actions finales -->
                <div class="final-actions" style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <strong style="color: #2c3e50;">Prêt à sauvegarder ?</strong>
                            <div style="color: #6c757d; font-size: 0.9rem; margin-top: 5px;">
                                Le NPC sera ${this.isEditMode ? 'mis à jour' : 'ajouté'} dans la zone "${this.currentZone}"
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-info" onclick="adminPanel.npcEditor.exportNPCConfig()">
                                <i class="fas fa-download"></i> Exporter Config
                            </button>
                            <button class="btn btn-success" onclick="adminPanel.npcEditor.validateAndSave()">
                                <i class="fas fa-save"></i> ${this.isEditMode ? 'Mettre à Jour' : 'Créer le NPC'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    // ==============================
    // NAVIGATION ENTRE ÉTAPES
    // ==============================

    nextStep() {
        // Valider l'étape courante
        if (!this.validateCurrentStep()) {
            return
        }

        // Sauvegarder les données de l'étape courante
        this.saveCurrentStepData()

        if (this.currentStep < this.maxSteps) {
            this.currentStep++
            this.updateProgressiveInterface()
        } else {
            // Dernière étape = sauvegarder
            this.validateAndSave()
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--
            this.updateProgressiveInterface()
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.currentNPC.type) {
                    this.adminPanel.showNotification('Veuillez sélectionner un type de NPC', 'warning')
                    return false
                }
                break
            
            case 2:
                const name = document.getElementById('npcName')?.value.trim()
                const sprite = document.getElementById('npcSprite')?.value.trim()
                
                if (!name) {
                    this.adminPanel.showNotification('Le nom du NPC est obligatoire', 'warning')
                    document.getElementById('npcName')?.focus()
                    return false
                }
                
                if (!sprite) {
                    this.adminPanel.showNotification('Le sprite du NPC est obligatoire', 'warning')
                    document.getElementById('npcSprite')?.focus()
                    return false
                }
                break
                
            case 3:
                // Validation spécifique selon le type (via module Types)
                if (this.typesModule && !this.typesModule.validateSpecificConfig(this.currentNPC)) {
                    return false
                }
                break
                
            case 4:
                // Validation finale
                return this.validateFinalNPC()
        }
        
        return true
    }

    saveCurrentStepData() {
        switch (this.currentStep) {
            case 1:
                // Type déjà sauvé via selectNPCType()
                break
                
            case 2:
                this.saveBasicInfo()
                break
                
            case 3:
                // Sauvegardé via le module Types
                if (this.typesModule) {
                    this.typesModule.saveSpecificConfig(this.currentNPC)
                }
                break
        }
    }

    // ==============================
    // SAUVEGARDE DES DONNÉES
    // ==============================

    saveBasicInfo() {
        this.currentNPC.name = document.getElementById('npcName')?.value.trim() || ''
        this.currentNPC.id = parseInt(document.getElementById('npcId')?.value) || this.currentNPC.id || Date.now()
        this.currentNPC.sprite = document.getElementById('npcSprite')?.value.trim() || ''
        this.currentNPC.direction = document.getElementById('npcDirection')?.value || 'south'
        
        this.currentNPC.position = {
            x: parseInt(document.getElementById('npcPositionX')?.value) || 100,
            y: parseInt(document.getElementById('npcPositionY')?.value) || 100
        }
        
        this.currentNPC.interactionRadius = parseInt(document.getElementById('npcInteractionRadius')?.value) || 32
        this.currentNPC.canWalkAway = document.getElementById('npcCanWalkAway')?.checked !== false
        this.currentNPC.autoFacePlayer = document.getElementById('npcAutoFacePlayer')?.checked !== false  
        this.currentNPC.repeatable = document.getElementById('npcRepeatable')?.checked !== false
        this.currentNPC.cooldownSeconds = parseInt(document.getElementById('npcCooldownSeconds')?.value) || 0
    }

    getCurrentNPCData() {
        // S'assurer que les données courantes sont à jour
        this.saveCurrentStepData()
        return this.currentNPC
    }

    setupBasicInfoListeners() {
        // Sauvegarder automatiquement les changements
        const inputs = ['npcName', 'npcId', 'npcSprite', 'npcDirection', 'npcPositionX', 'npcPositionY', 'npcInteractionRadius', 'npcCooldownSeconds']
        const checkboxes = ['npcCanWalkAway', 'npcAutoFacePlayer', 'npcRepeatable']
        
        inputs.forEach(inputId => {
            const element = document.getElementById(inputId)
            if (element) {
                element.addEventListener('input', () => this.saveBasicInfo())
            }
        })
        
        checkboxes.forEach(checkboxId => {
            const element = document.getElementById(checkboxId)
            if (element) {
                element.addEventListener('change', () => this.saveBasicInfo())
            }
        })
    }

    // ==============================
    // SÉLECTION DE TYPE
    // ==============================

    selectNPCType(type) {
        console.log(`🎭 [NPCEditor] Selected type: ${type}`)
        
        // Désélectionner tous les types
        document.querySelectorAll('.type-card').forEach(card => {
            card.classList.remove('selected')
        })
        
        // Sélectionner le nouveau type
        const selectedCard = document.querySelector(`.type-card[onclick*="${type}"]`)
        if (selectedCard) {
            selectedCard.classList.add('selected')
        }
        
        // Sauvegarder le type
        this.currentNPC.type = type
        
        // Mettre à jour l'affichage
        setTimeout(() => {
            this.renderStep1TypeSelection()
        }, 100)
    }

    // ==============================
    // VALIDATION ET SAUVEGARDE FINALE
    // ==============================

    validateFinalNPC() {
        const npc = this.getCurrentNPCData()
        
        const errors = []
        const warnings = []
        
        // Validations obligatoires
        if (!npc.name?.trim()) {
            errors.push('Le nom du NPC est obligatoire')
        }
        
        if (!npc.type) {
            errors.push('Le type du NPC est obligatoire')
        }
        
        if (!npc.sprite?.trim()) {
            errors.push('Le sprite du NPC est obligatoire')
        }
        
        if (!npc.position || typeof npc.position.x !== 'number' || typeof npc.position.y !== 'number') {
            errors.push('La position du NPC est invalide')
        }
        
        // Validations d'avertissement
        if (npc.interactionRadius && (npc.interactionRadius < 16 || npc.interactionRadius > 128)) {
            warnings.push('Rayon d\'interaction recommandé : 16-128 pixels')
        }
        
        if (npc.cooldownSeconds && npc.cooldownSeconds > 3600) {
            warnings.push('Délai très long (>1h) pour les interactions')
        }
        
        // Validation spécifique au type via module Types
        if (this.typesModule) {
            const typeValidation = this.typesModule.validateFinalNPC(npc)
            errors.push(...(typeValidation.errors || []))
            warnings.push(...(typeValidation.warnings || []))
        }
        
        // Afficher les erreurs si présentes
        if (errors.length > 0) {
            this.adminPanel.showNotification(`Erreurs de validation: ${errors.join(', ')}`, 'error')
            return false
        }
        
        // Afficher les avertissements (n'empêchent pas la sauvegarde)
        if (warnings.length > 0) {
            console.warn('⚠️ [NPCEditor] Warnings:', warnings)
        }
        
        return true
    }

    async validateAndSave() {
        if (!this.validateFinalNPC()) {
            return
        }
        
        try {
            console.log('💾 [NPCEditor] Saving NPC...')
            
            const npcData = this.getCurrentNPCData()
            
            // Sauvegarder via le module Data
            if (this.dataModule) {
                await this.dataModule.saveNPC(npcData, this.isEditMode)
            } else {
                throw new Error('Module Data non disponible')
            }
            
            // Succès
            const action = this.isEditMode ? 'mis à jour' : 'créé'
            this.adminPanel.showNotification(`NPC "${npcData.name}" ${action} avec succès !`, 'success')
            
            // Fermer l'éditeur et rafraîchir la liste
            this.closeEditor()
            this.refreshZone()
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error saving NPC:', error)
            this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error')
        }
    }

    closeEditor() {
        console.log('🚪 [NPCEditor] Closing editor')
        
        this.adminPanel.closeModal()
        
        // Réinitialiser l'état
        this.currentNPC = null
        this.isEditMode = false
        this.currentStep = 1
    }

    // ==============================
    // IMPORT/EXPORT
    // ==============================

    importNPCs() {
        console.log('📥 [NPCEditor] Import NPCs')
        
        if (!this.currentZone) {
            this.adminPanel.showNotification('Aucune zone sélectionnée', 'warning')
            return
        }
        
        // Créer un input file caché
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = '.json'
        fileInput.style.display = 'none'
        
        fileInput.onchange = (event) => {
            const file = event.target.files[0]
            if (!file) return
            
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result)
                    this.processImportedNPCs(jsonData)
                } catch (error) {
                    console.error('❌ [NPCEditor] Error parsing JSON:', error)
                    this.adminPanel.showNotification('Erreur lecture fichier JSON: ' + error.message, 'error')
                }
            }
            reader.readAsText(file)
            
            // Nettoyer
            document.body.removeChild(fileInput)
        }
        
        document.body.appendChild(fileInput)
        fileInput.click()
    }

    async processImportedNPCs(jsonData) {
        try {
            console.log('📥 [NPCEditor] Processing imported NPCs:', jsonData)
            
            if (this.dataModule) {
                await this.dataModule.importNPCs(jsonData, this.currentZone)
            }
            
            this.refreshZone()
            this.adminPanel.showNotification('NPCs importés avec succès', 'success')
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error importing NPCs:', error)
            this.adminPanel.showNotification('Erreur import: ' + error.message, 'error')
        }
    }

    exportNPCs() {
        console.log('📤 [NPCEditor] Export NPCs')
        
        if (!this.currentZone || !this.dataModule || !this.dataModule.zoneNPCs) {
            this.adminPanel.showNotification('Aucune donnée à exporter', 'warning')
            return
        }
        
        try {
            const exportData = this.dataModule.getExportData(this.currentZone)
            this.downloadJSON(exportData, `npcs_${this.currentZone}.json`)
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error exporting NPCs:', error)
            this.adminPanel.showNotification('Erreur export: ' + error.message, 'error')
        }
    }

    exportNPCConfig() {
        if (!this.currentNPC) {
            this.adminPanel.showNotification('Aucun NPC à exporter', 'warning')
            return
        }
        
        const npcData = this.getCurrentNPCData()
        this.downloadJSON(npcData, `npc_${npcData.name || npcData.id}_config.json`)
    }

    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        
        URL.revokeObjectURL(url)
        
        this.adminPanel.showNotification(`Fichier "${filename}" téléchargé`, 'success')
    }

    // ==============================
    // FONCTIONS D'AFFICHAGE
    // ==============================

    getNPCTypeIcon(type) {
        const icons = {
            'dialogue': '💬',
            'merchant': '🛍️', 
            'trainer': '⚔️',
            'healer': '💊',
            'gym_leader': '🏆',
            'transport': '🚢',
            'service': '🔧',
            'minigame': '🎮',
            'researcher': '🔬',
            'guild': '⚡',
            'event': '🎉',
            'quest_master': '📜'
        }
        return icons[type] || '❓'
    }

    getNPCTypeDisplayName(type) {
        const names = {
            'dialogue': 'Dialogue',
            'merchant': 'Marchand',
            'trainer': 'Dresseur', 
            'healer': 'Soigneur',
            'gym_leader': 'Chef d\'Arène',
            'transport': 'Transport',
            'service': 'Service',
            'minigame': 'Mini-jeu',
            'researcher': 'Chercheur',
            'guild': 'Guilde',
            'event': 'Événement', 
            'quest_master': 'Maître Quête'
        }
        return names[type] || 'Inconnu'
    }

    getNPCTypeDescription(type) {
        const descriptions = {
            'dialogue': 'NPC pour discussions, guides et informations. Idéal pour les personnages qui donnent des conseils ou racontent des histoires.',
            'merchant': 'NPC marchand avec boutique intégrée. Peut vendre des objets, gérer un inventaire et proposer des services commerciaux.',
            'trainer': 'Dresseur Pokémon pour les combats. Configure l\'équipe, les récompenses et les conditions de bataille.',
            'healer': 'Soigneur de Pokémon (Centre Pokémon). Restaure la santé, les PP et guérit les statuts négatifs.',
            'gym_leader': 'Chef d\'Arène avec badge à gagner. Boss spécialisé dans un type, avec récompenses uniques.',
            'transport': 'Capitaine ou pilote pour voyager. Permet le transport entre différentes zones de la carte.',
            'service': 'Services utilitaires (Name Rater, etc.). Offre des fonctionnalités spéciales comme renommer les Pokémon.',
            'minigame': 'Organisateur de concours et jeux. Gère les événements ludiques avec récompenses.',
            'researcher': 'Chercheur Pokémon et scientifique. Analyse le Pokédex, étudie les Pokémon et donne des conseils.',
            'guild': 'Recruteur de guilde ou faction. Permet l\'adhésion à des organisations avec avantages spéciaux.',
            'event': 'Coordinateur d\'événements spéciaux. Gère les festivals, événements saisonniers et activités temporaires.',
            'quest_master': 'Maître des quêtes épiques. Donne des missions importantes et suit la progression du joueur.'
        }
        return descriptions[type] || 'Type de NPC non documenté.'
    }

    getDirectionDisplay(direction) {
        const displays = {
            'north': '⬆️ Nord',
            'south': '⬇️ Sud', 
            'east': '➡️ Est',
            'west': '⬅️ Ouest'
        }
        return displays[direction] || direction
    }

    renderSpecificConfigPreview(npc) {
        // Cette partie sera implémentée par le module Types
        if (this.typesModule) {
            return this.typesModule.renderConfigPreview(npc)
        }
        
        return `
            <div style="color: #6c757d; font-style: italic;">
                Configuration spécifique non disponible<br>
                (Module Types non chargé)
            </div>
        `
    }

    renderValidationResults(npc) {
        const errors = []
        const warnings = []
        const success = []
        
        // Validations de base
        if (npc.name?.trim()) {
            success.push('✅ Nom défini')
        } else {
            errors.push('❌ Nom manquant')
        }
        
        if (npc.type) {
            success.push('✅ Type sélectionné')
        } else {
            errors.push('❌ Type non défini')
        }
        
        if (npc.sprite?.trim()) {
            success.push('✅ Sprite défini')
        } else {
            errors.push('❌ Sprite manquant')
        }
        
        if (npc.position && typeof npc.position.x === 'number') {
            success.push('✅ Position valide')
        } else {
            errors.push('❌ Position invalide')
        }
        
        // Vérifications optionnelles
        if (npc.interactionRadius >= 16 && npc.interactionRadius <= 128) {
            success.push('✅ Rayon d\'interaction optimal')
        } else {
            warnings.push('⚠️ Rayon d\'interaction non optimal')
        }
        
        // Validation spécifique via module Types
        if (this.typesModule) {
            const typeValidation = this.typesModule.getValidationPreview(npc)
            errors.push(...(typeValidation.errors || []))
            warnings.push(...(typeValidation.warnings || []))
            success.push(...(typeValidation.success || []))
        }
        
        const resultHTML = `
            ${success.length > 0 ? `
                <div class="validation-group success" style="margin-bottom: 15px;">
                    ${success.map(item => `<div class="validation-item">${item}</div>`).join('')}
                </div>
            ` : ''}
            
            ${warnings.length > 0 ? `
                <div class="validation-group warning" style="margin-bottom: 15px;">
                    ${warnings.map(item => `<div class="validation-item" style="color: #856404;">${item}</div>`).join('')}
                </div>
            ` : ''}
            
            ${errors.length > 0 ? `
                <div class="validation-group error" style="margin-bottom: 15px;">
                    ${errors.map(item => `<div class="validation-item" style="color: #721c24;">${item}</div>`).join('')}
                </div>
            ` : ''}
            
            <div class="validation-summary" style="padding: 15px; background: ${errors.length > 0 ? '#f8d7da' : '#d4edda'}; border-radius: 8px; margin-top: 15px;">
                <strong style="color: ${errors.length > 0 ? '#721c24' : '#155724'};">
                    ${errors.length > 0 ? 
                        `❌ ${errors.length} erreur(s) à corriger avant sauvegarde` : 
                        '✅ NPC valide et prêt à être sauvegardé'
                    }
                </strong>
                ${warnings.length > 0 ? `<div style="color: #856404; margin-top: 5px;">⚠️ ${warnings.length} avertissement(s)</div>` : ''}
            </div>
        `
        
        return resultHTML
    }

    // ==============================
    // CLEANUP
    // ==============================

    cleanup() {
        this.currentNPC = null
        this.isEditMode = false
        this.currentStep = 1
        this.currentZone = null
        this.zoneNPCs = []
        this.typesModule = null
        this.dataModule = null
        
        console.log('🧹 [NPCEditor] Core module cleanup completed')
    }
}

// Export pour utilisation globale
export default NPCEditorModule
