// PokeWorld Admin Panel - NPC Editor Module
// Module principal pour l'édition complète des NPCs avec interface graphique

import { NPC_TYPES } from './npc-types-config.js'
import { NPC_TEMPLATES, createNPCFromTemplate, POSITION_PRESETS } from './npc-templates.js'
import { NPCValidator, BatchNPCValidator } from './npc-validator.js'
import NPCFormBuilder from './npc-form-builder.js'

export class NPCEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'npcEditor'
        this.currentZone = null
        this.npcs = []
        this.selectedNPC = null
        this.formBuilder = null
        this.validator = new NPCValidator()
        this.batchValidator = new BatchNPCValidator()
        this.unsavedChanges = false
        
        console.log('👤 [NPCEditor] Module initialized')
        this.init()
    }

    async init() {
        // Charger les zones disponibles
        await this.loadAvailableZones()
        console.log('👤 [NPCEditor] Initialisation terminée - éditeur NPCs prêt')
    }

    // ==============================
    // GESTION DES ZONES ET CHARGEMENT
    // ==============================

    async loadAvailableZones() {
        try {
            console.log('🗺️ [NPCEditor] Loading available zones...')
            
            // Zones prédéfinies (peut être étendu avec API)
            this.availableZones = [
                { id: 'beach', name: '🏖️ Beach', description: 'Zone de plage avec touristes' },
                { id: 'village', name: '🏘️ Village', description: 'Village principal avec habitants' },
                { id: 'lavandia', name: '🏙️ Lavandia', description: 'Grande ville avec services' },
                { id: 'road1', name: '🛤️ Route 1', description: 'Route avec dresseurs débutants' },
                { id: 'road2', name: '🛤️ Route 2', description: 'Route intermédiaire' },
                { id: 'road3', name: '🛤️ Route 3', description: 'Route avancée' },
                { id: 'forest', name: '🌲 Forêt', description: 'Forêt mystérieuse' },
                { id: 'cave', name: '🕳️ Grotte', description: 'Système de grottes' }
            ]

            console.log(`✅ [NPCEditor] ${this.availableZones.length} zones chargées`)
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error loading zones:', error)
            this.adminPanel.showNotification('Erreur chargement zones: ' + error.message, 'error')
        }
    }

    async loadNPCsForZone(zoneId) {
        if (!zoneId) return

        console.log(`👤 [NPCEditor] Loading NPCs for zone: ${zoneId}`)
        
        try {
            // Essayer de charger depuis l'API
            const response = await this.adminPanel.apiCall(`/zones/${zoneId}/npcs`)
            
            if (response.success && response.data) {
                this.npcs = response.data.npcs || []
                console.log(`✅ [NPCEditor] Loaded ${this.npcs.length} NPCs from API`)
            } else {
                // Fallback : NPCs par défaut selon la zone
                this.npcs = this.getDefaultNPCsForZone(zoneId)
                console.log(`📝 [NPCEditor] Using default NPCs for ${zoneId}`)
            }
            
            this.currentZone = zoneId
            this.renderNPCsList()
            this.renderZoneStats()
            
            this.adminPanel.showNotification(`${this.npcs.length} NPCs chargés pour ${zoneId}`, 'success')
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error loading NPCs:', error)
            
            // Fallback en cas d'erreur
            this.npcs = this.getDefaultNPCsForZone(zoneId)
            this.currentZone = zoneId
            this.renderNPCsList()
            
            this.adminPanel.showNotification('NPCs par défaut chargés (API indisponible)', 'warning')
        }
    }

    getDefaultNPCsForZone(zoneId) {
        // NPCs par défaut selon la zone
        const defaultNPCs = {
            beach: [
                { ...createNPCFromTemplate('dialogue', { name: 'Guide Touristique', position: { x: 200, y: 150 } }) },
                { ...createNPCFromTemplate('healer', { name: 'Infirmière Joy', position: { x: 400, y: 100 } }) }
            ],
            village: [
                { ...createNPCFromTemplate('merchant', { name: 'Marchand Paul', position: { x: 300, y: 200 } }) },
                { ...createNPCFromTemplate('dialogue', { name: 'Maire du Village', position: { x: 500, y: 150 } }) },
                { ...createNPCFromTemplate('service', { name: 'Name Rater', position: { x: 100, y: 300 } }) }
            ],
            lavandia: [
                { ...createNPCFromTemplate('gym_leader', { name: 'Champion Électrique', position: { x: 400, y: 250 } }) },
                { ...createNPCFromTemplate('merchant', { name: 'Grand Magasin', position: { x: 200, y: 100 } }) },
                { ...createNPCFromTemplate('researcher', { name: 'Prof. Chen', position: { x: 600, y: 200 } }) }
            ],
            road1: [
                { ...createNPCFromTemplate('trainer', { name: 'Gamin Pierre', position: { x: 150, y: 200 } }) },
                { ...createNPCFromTemplate('trainer', { name: 'Fillette Marie', position: { x: 450, y: 180 } }) }
            ],
            forest: [
                { ...createNPCFromTemplate('trainer', { name: 'Attrape-Insectes', position: { x: 250, y: 300 } }) },
                { ...createNPCFromTemplate('dialogue', { name: 'Ranger Forestier', position: { x: 100, y: 100 } }) }
            ]
        }
        
        return defaultNPCs[zoneId] || []
    }

    // ==============================
    // INTERFACE UTILISATEUR
    // ==============================

    renderMainInterface() {
        const container = document.querySelector('#npcs .panel')
        if (!container) return

        container.innerHTML = `
            <div class="npc-editor-container">
                <!-- Header avec sélection de zone -->
                <div class="npc-header">
                    <div class="header-controls">
                        <div class="zone-selector">
                            <label for="npcZoneSelect" class="form-label">🗺️ Zone:</label>
                            <select id="npcZoneSelect" class="form-select" onchange="adminPanel.npcEditor.selectZone(this.value)">
                                <option value="">Sélectionner une zone...</option>
                                ${this.availableZones.map(zone => `
                                    <option value="${zone.id}" ${zone.id === this.currentZone ? 'selected' : ''}>
                                        ${zone.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="header-actions">
                            <button class="btn btn-success" onclick="adminPanel.npcEditor.createNewNPC()" ${!this.currentZone ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i> Nouveau NPC
                            </button>
                            <button class="btn btn-info" onclick="adminPanel.npcEditor.importNPCs()" ${!this.currentZone ? 'disabled' : ''}>
                                <i class="fas fa-file-import"></i> Importer
                            </button>
                            <button class="btn btn-warning" onclick="adminPanel.npcEditor.exportNPCs()" ${!this.currentZone ? 'disabled' : ''}>
                                <i class="fas fa-file-export"></i> Exporter
                            </button>
                            <button class="btn btn-primary" onclick="adminPanel.npcEditor.saveAllNPCs()" ${!this.currentZone ? 'disabled' : ''}>
                                <i class="fas fa-save"></i> Sauvegarder Tout
                            </button>
                        </div>
                    </div>
                    
                    <div class="zone-stats" id="zoneStats">
                        <!-- Stats de la zone -->
                    </div>
                </div>

                <!-- Zone principale -->
                <div class="npc-main-area">
                    <!-- Liste des NPCs -->
                    <div class="npcs-list-panel">
                        <div class="list-header">
                            <h3>👥 NPCs de la Zone</h3>
                            <div class="list-filters">
                                <input type="text" class="search-input" id="npcSearch" 
                                       placeholder="🔍 Rechercher..." onkeyup="adminPanel.npcEditor.filterNPCs(this.value)">
                                <select class="form-select" id="typeFilter" onchange="adminPanel.npcEditor.filterByType(this.value)">
                                    <option value="">Tous les types</option>
                                    ${Object.entries(NPC_TYPES).map(([type, config]) => `
                                        <option value="${type}">${config.icon} ${config.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="npcs-list" id="npcsList">
                            <!-- Liste générée dynamiquement -->
                        </div>
                    </div>

                    <!-- Éditeur de NPC -->
                    <div class="npc-editor-panel">
                        <div class="editor-header">
                            <h3 id="editorTitle">Sélectionnez un NPC ou créez-en un nouveau</h3>
                            <div class="editor-actions" id="editorActions" style="display: none;">
                                <button class="btn btn-success btn-sm" onclick="adminPanel.npcEditor.saveCurrentNPC()">
                                    <i class="fas fa-check"></i> Valider
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="adminPanel.npcEditor.cancelEdit()">
                                    <i class="fas fa-times"></i> Annuler
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="adminPanel.npcEditor.deleteCurrentNPC()">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                            </div>
                        </div>
                        
                        <div class="editor-content" id="editorContent">
                            <div class="no-selection">
                                <div style="text-align: center; padding: 60px; color: #6c757d;">
                                    <i class="fas fa-user-plus" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                                    <p>Créez un nouveau NPC ou sélectionnez-en un dans la liste pour commencer l'édition</p>
                                    ${this.currentZone ? `
                                        <button class="btn btn-primary" onclick="adminPanel.npcEditor.createNewNPC()">
                                            <i class="fas fa-plus"></i> Créer un NPC
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `

        // Initialiser le FormBuilder dans le conteneur éditeur
        const editorContent = document.getElementById('editorContent')
        if (editorContent) {
            this.formBuilder = new NPCFormBuilder(editorContent)
            this.formBuilder.onFormChange((npc, field, value) => {
                this.onNPCDataChange(npc, field, value)
            })
        }
    }

    renderNPCsList() {
        const container = document.getElementById('npcsList')
        if (!container || !this.currentZone) return

        if (this.npcs.length === 0) {
            container.innerHTML = `
                <div class="empty-list">
                    <p>Aucun NPC dans cette zone</p>
                    <button class="btn btn-primary btn-sm" onclick="adminPanel.npcEditor.createNewNPC()">
                        <i class="fas fa-plus"></i> Créer le premier NPC
                    </button>
                </div>
            `
            return
        }

        container.innerHTML = this.npcs.map((npc, index) => `
            <div class="npc-item ${this.selectedNPC?.id === npc.id ? 'selected' : ''}" 
                 onclick="adminPanel.npcEditor.selectNPC(${index})">
                <div class="npc-icon">
                    ${NPC_TYPES[npc.type]?.icon || '👤'}
                </div>
                <div class="npc-info">
                    <div class="npc-name">${npc.name}</div>
                    <div class="npc-details">
                        <span class="npc-type">${NPC_TYPES[npc.type]?.name || npc.type}</span>
                        <span class="npc-position">• (${npc.position.x}, ${npc.position.y})</span>
                    </div>
                </div>
                <div class="npc-status">
                    ${this.getNPCStatusIcon(npc)}
                </div>
            </div>
        `).join('')
    }

    renderZoneStats() {
        const container = document.getElementById('zoneStats')
        if (!container || !this.currentZone) return

        const stats = this.calculateZoneStats()
        
        container.innerHTML = `
            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-value">${stats.total}</span>
                    <span class="stat-label">NPCs Total</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.valid}</span>
                    <span class="stat-label">Valides</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.errors}</span>
                    <span class="stat-label">Erreurs</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.types}</span>
                    <span class="stat-label">Types Différents</span>
                </div>
                ${this.unsavedChanges ? `
                    <div class="stat-item warning">
                        <span class="stat-icon">⚠️</span>
                        <span class="stat-label">Modifications non sauvegardées</span>
                    </div>
                ` : ''}
            </div>
        `
    }

    // ==============================
    // GESTION DES NPCS
    // ==============================

    selectZone(zoneId) {
        if (this.unsavedChanges) {
            if (!confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
                // Restaurer la sélection précédente
                const select = document.getElementById('npcZoneSelect')
                if (select) select.value = this.currentZone || ''
                return
            }
        }

        this.currentZone = zoneId
        this.selectedNPC = null
        this.unsavedChanges = false
        
        if (zoneId) {
            this.loadNPCsForZone(zoneId)
        } else {
            this.npcs = []
            this.renderNPCsList()
            this.renderZoneStats()
        }
        
        this.updateEditorState()
    }

    createNewNPC() {
        if (!this.currentZone) {
            this.adminPanel.showNotification('Sélectionnez d\'abord une zone', 'warning')
            return
        }

        // Créer un NPC vide
        const newNPC = {
            id: Date.now(),
            name: 'Nouveau NPC',
            type: 'dialogue', // Type par défaut
            position: { x: 100, y: 100 },
            sprite: 'default.png',
            direction: 'south',
            interactionRadius: 32,
            canWalkAway: true,
            autoFacePlayer: true,
            repeatable: true,
            cooldownSeconds: 0
        }

        this.selectedNPC = newNPC
        this.updateEditorState()
        this.formBuilder.loadNPC(newNPC)
        
        console.log('👤 [NPCEditor] Created new NPC')
    }

    selectNPC(index) {
        if (index < 0 || index >= this.npcs.length) return
        
        if (this.unsavedChanges) {
            if (!confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
                return
            }
        }

        this.selectedNPC = { ...this.npcs[index] } // Clone pour éviter la mutation directe
        this.unsavedChanges = false
        
        this.updateEditorState()
        this.renderNPCsList()
        
        if (this.formBuilder) {
            this.formBuilder.loadNPC(this.selectedNPC)
        }
        
        console.log('👤 [NPCEditor] Selected NPC:', this.selectedNPC.name)
    }

    saveCurrentNPC() {
        if (!this.selectedNPC || !this.formBuilder) return

        const npc = this.formBuilder.getNPC()
        if (!npc) return

        // Valider le NPC
        const validation = this.validator.validateNPC(npc)
        if (!validation.valid) {
            this.adminPanel.showNotification(`Erreurs de validation : ${validation.errors.length}`, 'error')
            return
        }

        // Trouver l'index du NPC dans la liste (pour mise à jour)
        const existingIndex = this.npcs.findIndex(n => n.id === npc.id)
        
        if (existingIndex !== -1) {
            // Mise à jour
            this.npcs[existingIndex] = { ...npc }
            this.adminPanel.showNotification(`NPC "${npc.name}" mis à jour`, 'success')
        } else {
            // Nouveau NPC
            this.npcs.push({ ...npc })
            this.adminPanel.showNotification(`NPC "${npc.name}" créé`, 'success')
        }
        
        this.selectedNPC = { ...npc }
        this.unsavedChanges = true
        
        this.renderNPCsList()
        this.renderZoneStats()
        
        console.log('💾 [NPCEditor] NPC saved:', npc.name)
    }

    cancelEdit() {
        if (this.unsavedChanges) {
            if (!confirm('Annuler les modifications ?')) return
        }

        this.selectedNPC = null
        this.unsavedChanges = false
        
        this.updateEditorState()
        this.renderNPCsList()
        
        if (this.formBuilder) {
            this.formBuilder.clearForm()
        }
    }

    deleteCurrentNPC() {
        if (!this.selectedNPC) return
        
        if (!confirm(`Supprimer définitivement le NPC "${this.selectedNPC.name}" ?`)) return

        const index = this.npcs.findIndex(n => n.id === this.selectedNPC.id)
        if (index !== -1) {
            this.npcs.splice(index, 1)
            this.adminPanel.showNotification(`NPC "${this.selectedNPC.name}" supprimé`, 'info')
        }
        
        this.selectedNPC = null
        this.unsavedChanges = true
        
        this.updateEditorState()
        this.renderNPCsList()
        this.renderZoneStats()
    }

    // ==============================
    // SAUVEGARDE ET PERSISTANCE
    // ==============================

    async saveAllNPCs() {
        if (!this.currentZone || this.npcs.length === 0) {
            this.adminPanel.showNotification('Aucun NPC à sauvegarder', 'warning')
            return
        }

        console.log(`💾 [NPCEditor] Saving ${this.npcs.length} NPCs for zone: ${this.currentZone}`)
        
        // Validation par lot
        const batchValidation = this.batchValidator.validateBatch(this.npcs)
        if (batchValidation.invalid > 0) {
            if (!confirm(`${batchValidation.invalid} NPCs ont des erreurs. Sauvegarder quand même ?`)) {
                return
            }
        }

        try {
            const npcData = {
                zone: this.currentZone,
                version: "2.0.0",
                lastUpdated: new Date().toISOString(),
                description: `NPCs for zone ${this.currentZone} - Generated by NPC Editor`,
                npcs: this.npcs
            }

            // Sauvegarder via l'API
            const response = await this.adminPanel.apiCall(`/zones/${this.currentZone}/npcs`, {
                method: 'POST',
                body: JSON.stringify(npcData)
            })
            
            console.log('✅ [NPCEditor] NPCs saved:', response)
            this.adminPanel.showNotification(
                `${this.npcs.length} NPCs sauvegardés pour ${this.currentZone}`, 
                'success'
            )
            
            this.unsavedChanges = false
            this.renderZoneStats()
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error saving NPCs:', error)
            
            // Fallback : télécharger le fichier JSON
            this.downloadNPCsJSON(npcData)
            this.adminPanel.showNotification('Fichier JSON téléchargé (sauvegarde API échouée)', 'warning')
        }
    }

    downloadNPCsJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${this.currentZone}_npcs.json`
        a.click()
        
        URL.revokeObjectURL(url)
    }

    // ==============================
    // IMPORT/EXPORT
    // ==============================

    importNPCs() {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        
        input.onchange = (e) => {
            const file = e.target.files[0]
            if (!file) return
            
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result)
                    
                    if (data.npcs && Array.isArray(data.npcs)) {
                        this.npcs = data.npcs
                        this.unsavedChanges = true
                        this.renderNPCsList()
                        this.renderZoneStats()
                        
                        this.adminPanel.showNotification(`${data.npcs.length} NPCs importés`, 'success')
                    } else {
                        throw new Error('Format de fichier invalide')
                    }
                } catch (error) {
                    this.adminPanel.showNotification('Erreur import: ' + error.message, 'error')
                }
            }
            reader.readAsText(file)
        }
        
        input.click()
    }

    exportNPCs() {
        if (!this.currentZone || this.npcs.length === 0) {
            this.adminPanel.showNotification('Aucun NPC à exporter', 'warning')
            return
        }

        const data = {
            zone: this.currentZone,
            version: "2.0.0",
            exportedAt: new Date().toISOString(),
            description: `NPCs export for zone ${this.currentZone}`,
            npcs: this.npcs
        }
        
        this.downloadNPCsJSON(data)
        this.adminPanel.showNotification(`${this.npcs.length} NPCs exportés`, 'success')
    }

    // ==============================
    // FILTRES ET RECHERCHE
    // ==============================

    filterNPCs(searchTerm) {
        const items = document.querySelectorAll('.npc-item')
        const term = searchTerm.toLowerCase()
        
        items.forEach(item => {
            const name = item.querySelector('.npc-name').textContent.toLowerCase()
            const type = item.querySelector('.npc-type').textContent.toLowerCase()
            
            const matches = name.includes(term) || type.includes(term)
            item.style.display = matches ? 'flex' : 'none'
        })
    }

    filterByType(type) {
        const items = document.querySelectorAll('.npc-item')
        
        items.forEach((item, index) => {
            const npc = this.npcs[index]
            const matches = !type || npc.type === type
            item.style.display = matches ? 'flex' : 'none'
        })
    }

    // ==============================
    // UTILITAIRES
    // ==============================

    updateEditorState() {
        const title = document.getElementById('editorTitle')
        const actions = document.getElementById('editorActions')
        const content = document.getElementById('editorContent')
        
        if (this.selectedNPC) {
            if (title) title.textContent = `Éditer: ${this.selectedNPC.name} (${NPC_TYPES[this.selectedNPC.type]?.name || this.selectedNPC.type})`
            if (actions) actions.style.display = 'flex'
            
            // Masquer le message "no selection" s'il existe
            const noSelection = content?.querySelector('.no-selection')
            if (noSelection) noSelection.style.display = 'none'
        } else {
            if (title) title.textContent = 'Sélectionnez un NPC ou créez-en un nouveau'
            if (actions) actions.style.display = 'none'
            
            // Afficher le message "no selection"
            const noSelection = content?.querySelector('.no-selection')
            if (noSelection) noSelection.style.display = 'block'
        }
    }

    onNPCDataChange(npc, field, value) {
        this.unsavedChanges = true
        this.renderZoneStats()
        
        // Mettre à jour le nom dans la liste en temps réel
        if (field === 'name') {
            this.renderNPCsList()
        }
        
        console.log(`📝 [NPCEditor] NPC field changed: ${field} = ${value}`)
    }

    getNPCStatusIcon(npc) {
        const validation = this.validator.quickValidate(npc)
        
        if (!validation) {
            return '<span class="status-icon error" title="Erreurs de validation">❌</span>'
        } else if (validation.warnings?.length > 0) {
            return '<span class="status-icon warning" title="Avertissements">⚠️</span>'
        } else {
            return '<span class="status-icon success" title="Valide">✅</span>'
        }
    }

    calculateZoneStats() {
        const total = this.npcs.length
        const validation = this.batchValidator.validateBatch(this.npcs)
        const types = new Set(this.npcs.map(npc => npc.type)).size
        
        return {
            total,
            valid: validation.valid,
            errors: validation.invalid,
            types
        }
    }

    // ==============================
    // API PUBLIQUE
    // ==============================

    onTabActivated() {
        console.log('👤 [NPCEditor] Tab activated')
        
        // Charger les zones si nécessaire
        if (!this.availableZones || this.availableZones.length === 0) {
            this.loadAvailableZones()
        }
        
        // Rendre l'interface principale
        this.renderMainInterface()
        
        // Recharger la zone courante si nécessaire
        if (this.currentZone) {
            this.renderNPCsList()
            this.renderZoneStats()
        }
    }

    cleanup() {
        this.currentZone = null
        this.npcs = []
        this.selectedNPC = null
        this.formBuilder = null
        this.unsavedChanges = false
        
        console.log('🧹 [NPCEditor] Module cleanup completed')
    }

    // Méthodes publiques pour integration
    getCurrentZone() {
        return this.currentZone
    }

    getCurrentNPCs() {
        return [...this.npcs]
    }

    hasUnsavedChanges() {
        return this.unsavedChanges
    }
}

export default NPCEditorModule
