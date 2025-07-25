// PokeWorld Admin Panel - NPC Editor Module - VERSION MONGODB
// Module principal pour l'édition complète des NPCs avec MongoDB

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
        this.availableZones = []
        
        console.log('👤 [NPCEditor] Module initialized with MongoDB support')
        this.init()
    }

    async init() {
        try {
            console.log('👤 [NPCEditor] Starting initialization...')
            
            // Initialiser les zones par défaut immédiatement
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
            
            console.log('✅ [NPCEditor] Initialization completed - NPC editor ready with MongoDB')
        } catch (error) {
            console.error('❌ [NPCEditor] Initialization failed:', error)
        }
    }

    // ==============================
    // GESTION DES ZONES ET CHARGEMENT MONGODB
    // ==============================

    async loadNPCsForZone(zoneId) {
    if (!zoneId) return

    console.log(`👤 [NPCEditor] Loading NPCs for zone from MongoDB: ${zoneId}`)
    
    try {
        const response = await this.adminPanel.apiCall(`/zones/${zoneId}/npcs`)
        
        if (response.success && response.data) {
            const rawNPCs = response.data.npcs || []
            
            console.log(`📥 [NPCEditor] Raw NPCs from MongoDB:`, rawNPCs.map(npc => ({
                id: npc.npcId || npc.id,
                name: npc.name,
                position: npc.position
            })))
            
            // CONVERSION : Transformer chaque NPC au format éditeur
            this.npcs = rawNPCs.map(npc => this.convertMongoNPCToEditorFormat(npc))
            
            console.log(`✅ [NPCEditor] Loaded and converted ${this.npcs.length} NPCs from MongoDB`)
            console.log('📋 [NPCEditor] Converted NPCs positions:', this.npcs.map(npc => ({
                id: npc.id,
                name: npc.name,
                position: npc.position
            })))
            
            this.currentZoneSource = 'mongodb'
        } else {
            this.npcs = []
            console.log(`📝 [NPCEditor] No NPCs found in MongoDB for ${zoneId}`)
            this.currentZoneSource = 'mongodb'
        }
        
        this.currentZone = zoneId
        this.renderNPCsList()
        this.renderZoneStats()
        
        this.adminPanel.showNotification(`${this.npcs.length} NPCs chargés depuis MongoDB pour ${zoneId}`, 'success')
        
    } catch (error) {
        console.error('❌ [NPCEditor] Error loading NPCs from MongoDB:', error)
        
        this.npcs = []
        this.currentZone = zoneId
        this.currentZoneSource = 'mongodb'
        this.renderNPCsList()
        
        this.adminPanel.showNotification('Erreur chargement MongoDB - Zone vide initialisée', 'error')
    }
}


    // Ajoutez cette méthode dans votre classe NPCEditorModule
// Placez-la après la méthode loadNPCsForZone ou dans la section des méthodes utilitaires

// ==============================
// NOUVELLE MÉTHODE À AJOUTER
// ==============================

convertMongoNPCToEditorFormat(mongoNPC) {
    console.log('🔄 [NPCEditor] Converting MongoDB NPC to editor format:', mongoNPC)
    
    // S'assurer que tous les champs requis sont présents
    const editorNPC = {
        // Champs de base obligatoires
        id: mongoNPC.npcId || mongoNPC.id,
        name: mongoNPC.name || 'NPC Sans Nom',
        type: mongoNPC.type || 'dialogue',
        sprite: mongoNPC.sprite || 'default.png',
        direction: mongoNPC.direction || 'south',
        
        // Position avec validation STRICTE
        position: {
            x: Number(mongoNPC.position?.x) || 0,
            y: Number(mongoNPC.position?.y) || 0
        },
        
        // Champs comportementaux avec valeurs par défaut
        interactionRadius: mongoNPC.interactionRadius || 32,
        canWalkAway: mongoNPC.canWalkAway !== false,
        autoFacePlayer: mongoNPC.autoFacePlayer !== false,
        repeatable: mongoNPC.repeatable !== false,
        cooldownSeconds: mongoNPC.cooldownSeconds || 0,
        
        // Système de quêtes
        questsToGive: mongoNPC.questsToGive || [],
        questsToEnd: mongoNPC.questsToEnd || [],
        questRequirements: mongoNPC.questRequirements || {},
        questDialogueIds: mongoNPC.questDialogueIds || {},
        
        // Conditions de spawn
        spawnConditions: mongoNPC.spawnConditions || {}
    }
    
    // Ajouter les données spécifiques selon le type depuis npcData
    if (mongoNPC.npcData && typeof mongoNPC.npcData === 'object') {
        // Copier tous les champs de npcData
        Object.assign(editorNPC, mongoNPC.npcData)
    }
    
    // Champs spécifiques selon le type avec fallbacks
    switch (mongoNPC.type) {
        case 'dialogue':
            editorNPC.dialogueIds = editorNPC.dialogueIds || mongoNPC.npcData?.dialogueIds || []
            editorNPC.dialogueId = editorNPC.dialogueId || mongoNPC.npcData?.dialogueId
            editorNPC.conditionalDialogueIds = editorNPC.conditionalDialogueIds || mongoNPC.npcData?.conditionalDialogueIds || {}
            editorNPC.zoneInfo = editorNPC.zoneInfo || mongoNPC.npcData?.zoneInfo || {}
            break
            
        case 'merchant':
            editorNPC.shopId = editorNPC.shopId || mongoNPC.npcData?.shopId || ''
            editorNPC.shopType = editorNPC.shopType || mongoNPC.npcData?.shopType || 'pokemart'
            editorNPC.shopConfig = editorNPC.shopConfig || mongoNPC.npcData?.shopConfig || {}
            editorNPC.shopDialogueIds = editorNPC.shopDialogueIds || mongoNPC.npcData?.shopDialogueIds || {}
            editorNPC.businessHours = editorNPC.businessHours || mongoNPC.npcData?.businessHours || {}
            editorNPC.accessRestrictions = editorNPC.accessRestrictions || mongoNPC.npcData?.accessRestrictions || {}
            break
            
        case 'trainer':
            editorNPC.trainerId = editorNPC.trainerId || mongoNPC.npcData?.trainerId || ''
            editorNPC.trainerClass = editorNPC.trainerClass || mongoNPC.npcData?.trainerClass || 'youngster'
            editorNPC.trainerRank = editorNPC.trainerRank || mongoNPC.npcData?.trainerRank || 1
            editorNPC.trainerTitle = editorNPC.trainerTitle || mongoNPC.npcData?.trainerTitle || ''
            editorNPC.battleConfig = editorNPC.battleConfig || mongoNPC.npcData?.battleConfig || {}
            editorNPC.battleDialogueIds = editorNPC.battleDialogueIds || mongoNPC.npcData?.battleDialogueIds || {}
            editorNPC.rewards = editorNPC.rewards || mongoNPC.npcData?.rewards || {}
            editorNPC.rebattle = editorNPC.rebattle || mongoNPC.npcData?.rebattle || {}
            editorNPC.visionConfig = editorNPC.visionConfig || mongoNPC.npcData?.visionConfig || {}
            editorNPC.battleConditions = editorNPC.battleConditions || mongoNPC.npcData?.battleConditions || {}
            editorNPC.progressionFlags = editorNPC.progressionFlags || mongoNPC.npcData?.progressionFlags || {}
            break
            
        case 'healer':
            editorNPC.healerConfig = editorNPC.healerConfig || mongoNPC.npcData?.healerConfig || {}
            editorNPC.healerDialogueIds = editorNPC.healerDialogueIds || mongoNPC.npcData?.healerDialogueIds || {}
            editorNPC.additionalServices = editorNPC.additionalServices || mongoNPC.npcData?.additionalServices || {}
            editorNPC.serviceRestrictions = editorNPC.serviceRestrictions || mongoNPC.npcData?.serviceRestrictions || {}
            break
            
        case 'gym_leader':
            editorNPC.trainerId = editorNPC.trainerId || mongoNPC.npcData?.trainerId || ''
            editorNPC.trainerClass = editorNPC.trainerClass || mongoNPC.npcData?.trainerClass || 'gym_leader'
            editorNPC.gymConfig = editorNPC.gymConfig || mongoNPC.npcData?.gymConfig || {}
            editorNPC.battleConfig = editorNPC.battleConfig || mongoNPC.npcData?.battleConfig || {}
            editorNPC.challengeConditions = editorNPC.challengeConditions || mongoNPC.npcData?.challengeConditions || {}
            editorNPC.gymDialogueIds = editorNPC.gymDialogueIds || mongoNPC.npcData?.gymDialogueIds || {}
            editorNPC.gymRewards = editorNPC.gymRewards || mongoNPC.npcData?.gymRewards || {}
            editorNPC.rematchConfig = editorNPC.rematchConfig || mongoNPC.npcData?.rematchConfig || {}
            break
            
        case 'transport':
            editorNPC.transportConfig = editorNPC.transportConfig || mongoNPC.npcData?.transportConfig || {}
            editorNPC.destinations = editorNPC.destinations || mongoNPC.npcData?.destinations || []
            editorNPC.schedules = editorNPC.schedules || mongoNPC.npcData?.schedules || []
            editorNPC.transportDialogueIds = editorNPC.transportDialogueIds || mongoNPC.npcData?.transportDialogueIds || {}
            editorNPC.weatherRestrictions = editorNPC.weatherRestrictions || mongoNPC.npcData?.weatherRestrictions || {}
            break
            
        case 'service':
            editorNPC.serviceConfig = editorNPC.serviceConfig || mongoNPC.npcData?.serviceConfig || {}
            editorNPC.availableServices = editorNPC.availableServices || mongoNPC.npcData?.availableServices || []
            editorNPC.serviceDialogueIds = editorNPC.serviceDialogueIds || mongoNPC.npcData?.serviceDialogueIds || {}
            editorNPC.serviceRestrictions = editorNPC.serviceRestrictions || mongoNPC.npcData?.serviceRestrictions || {}
            break
            
        // Ajouter les autres types selon vos besoins...
    }
    
    console.log('✅ [NPCEditor] Converted NPC with position:', editorNPC.position)
    return editorNPC
}
    // ==============================
    // SAUVEGARDE MONGODB
    // ==============================

    async saveAllNPCs() {
        if (!this.currentZone || this.npcs.length === 0) {
            this.adminPanel.showNotification('Aucun NPC à sauvegarder', 'warning')
            return
        }

        console.log(`💾 [NPCEditor] Saving ${this.npcs.length} NPCs to MongoDB for zone: ${this.currentZone}`)
        
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
                description: `NPCs for zone ${this.currentZone} - Generated by NPC Editor MongoDB`,
                npcs: this.npcs
            }

            // Sauvegarder via l'API MongoDB
            const response = await this.adminPanel.apiCall(`/zones/${this.currentZone}/npcs`, {
                method: 'POST',
                body: JSON.stringify(npcData)
            })
            
            if (response.success) {
                console.log('✅ [NPCEditor] NPCs saved to MongoDB:', response)
                this.adminPanel.showNotification(
                    `${this.npcs.length} NPCs sauvegardés dans MongoDB pour ${this.currentZone}`, 
                    'success'
                )
                
                this.unsavedChanges = false
                this.renderZoneStats()
            } else {
                throw new Error(response.error || 'Erreur sauvegarde MongoDB')
            }
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error saving NPCs to MongoDB:', error)
            
            // Fallback: télécharger le fichier JSON
            this.downloadNPCsJSON({
                zone: this.currentZone,
                version: "2.0.0",
                lastUpdated: new Date().toISOString(),
                description: `NPCs for zone ${this.currentZone} - Fallback export`,
                npcs: this.npcs
            })
            this.adminPanel.showNotification('Erreur MongoDB - Fichier JSON téléchargé', 'error')
        }
    }

    // ==============================
    // GESTION DES NPCS MONGODB
    // ==============================

    createNewNPC() {
        if (!this.currentZone) {
            this.adminPanel.showNotification('Sélectionnez d\'abord une zone', 'warning')
            return
        }

        // Générer un ID unique basé sur les NPCs existants
        const existingIds = this.npcs.map(npc => npc.id).filter(id => typeof id === 'number')
        const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1

        // Créer un NPC vide avec ID auto-généré
        const newNPC = {
            id: nextId,
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
        
        console.log('👤 [NPCEditor] Created new NPC with ID:', nextId)
    }

    async saveCurrentNPC() {
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
        
        console.log('💾 [NPCEditor] NPC saved locally (MongoDB save required):', npc.name)
    }

    async deleteCurrentNPC() {
        if (!this.selectedNPC) return
        
        if (!confirm(`Supprimer définitivement le NPC "${this.selectedNPC.name}" ?`)) return

        const index = this.npcs.findIndex(n => n.id === this.selectedNPC.id)
        if (index !== -1) {
            this.npcs.splice(index, 1)
            this.adminPanel.showNotification(`NPC "${this.selectedNPC.name}" supprimé localement`, 'info')
        }
        
        this.selectedNPC = null
        this.unsavedChanges = true
        
        this.updateEditorState()
        this.renderNPCsList()
        this.renderZoneStats()
        
        console.log('🗑️ [NPCEditor] NPC deleted locally (MongoDB save required)')
    }

    // ==============================
    // IMPORT/EXPORT MONGODB
    // ==============================

    async importNPCs() {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        
        input.onchange = async (e) => {
            const file = e.target.files[0]
            if (!file) return
            
            const reader = new FileReader()
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result)
                    
                    if (data.npcs && Array.isArray(data.npcs)) {
                        // Renuméroter les IDs pour éviter les conflits
                        const maxExistingId = this.npcs.length > 0 ? 
                            Math.max(...this.npcs.map(npc => npc.id)) : 0
                        
                        data.npcs.forEach((npc, index) => {
                            npc.id = maxExistingId + index + 1
                        })
                        
                        this.npcs = [...this.npcs, ...data.npcs]
                        this.unsavedChanges = true
                        this.renderNPCsList()
                        this.renderZoneStats()
                        
                        this.adminPanel.showNotification(
                            `${data.npcs.length} NPCs importés (sauvegarde MongoDB requise)`, 
                            'success'
                        )
                    } else {
                        throw new Error('Format de fichier invalide - npcs array requis')
                    }
                } catch (error) {
                    this.adminPanel.showNotification('Erreur import: ' + error.message, 'error')
                }
            }
            reader.readAsText(file)
        }
        
        input.click()
    }

    async exportNPCs() {
        if (!this.currentZone || this.npcs.length === 0) {
            this.adminPanel.showNotification('Aucun NPC à exporter', 'warning')
            return
        }

        try {
            // Essayer d'exporter depuis MongoDB d'abord
            const response = await this.adminPanel.apiCall('/npcs/export/all')
            
            if (response.success && response.data) {
                // Export complet depuis MongoDB
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                
                const a = document.createElement('a')
                a.href = url
                a.download = `all_npcs_mongodb_export.json`
                a.click()
                
                URL.revokeObjectURL(url)
                
                this.adminPanel.showNotification('Export MongoDB complet téléchargé', 'success')
            } else {
                throw new Error('Erreur export MongoDB')
            }
        } catch (error) {
            console.error('❌ [NPCEditor] MongoDB export failed:', error)
            
            // Fallback: export local de la zone courante
            const data = {
                zone: this.currentZone,
                version: "2.0.0",
                exportedAt: new Date().toISOString(),
                description: `NPCs export for zone ${this.currentZone} (local fallback)`,
                npcs: this.npcs
            }
            
            this.downloadNPCsJSON(data)
            this.adminPanel.showNotification('Export local téléchargé (MongoDB indisponible)', 'warning')
        }
    }

    // ==============================
    // FONCTIONS UTILITAIRES MONGODB
    // ==============================

    async duplicateNPC(npcIndex) {
        if (npcIndex < 0 || npcIndex >= this.npcs.length) return
        
        const originalNPC = this.npcs[npcIndex]
        
        // Générer un nouvel ID
        const existingIds = this.npcs.map(npc => npc.id).filter(id => typeof id === 'number')
        const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1
        
        const duplicatedNPC = {
            ...originalNPC,
            id: newId,
            name: `${originalNPC.name} (Copie)`,
            position: {
                x: originalNPC.position.x + 50,
                y: originalNPC.position.y + 50
            }
        }
        
        this.npcs.push(duplicatedNPC)
        this.unsavedChanges = true
        
        this.renderNPCsList()
        this.renderZoneStats()
        
        this.adminPanel.showNotification(`NPC "${originalNPC.name}" dupliqué`, 'success')
        
        console.log('📋 [NPCEditor] NPC duplicated locally (MongoDB save required)')
    }

    async validateZoneNPCs() {
        if (!this.currentZone) {
            this.adminPanel.showNotification('Aucune zone sélectionnée', 'warning')
            return
        }
        
        try {
            const response = await this.adminPanel.apiCall(`/zones/${this.currentZone}/npcs/validate`)
            
            if (response.success) {
                const validation = response.validation
                
                let message = `Validation: ${validation.valid}/${validation.totalNPCs} NPCs valides`
                let type = validation.invalid === 0 ? 'success' : 'warning'
                
                if (validation.issues.length > 0) {
                    message += `\n\nProblèmes détectés:\n${validation.issues.slice(0, 5).join('\n')}`
                    if (validation.issues.length > 5) {
                        message += `\n... et ${validation.issues.length - 5} autres`
                    }
                }
                
                this.adminPanel.showNotification(message, type)
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            console.error('❌ [NPCEditor] Validation error:', error)
            this.adminPanel.showNotification('Erreur validation: ' + error.message, 'error')
        }
    }

    async searchNPCs(query) {
        if (!query || query.length < 2) {
            this.clearSearch()
            return
        }
        
        try {
            const response = await this.adminPanel.apiCall('/npcs/search', {
                method: 'POST',
                body: JSON.stringify({ query, limit: 50 })
            })
            
            if (response.success) {
                this.displaySearchResults(response.results, query)
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            console.error('❌ [NPCEditor] Search error:', error)
            this.adminPanel.showNotification('Erreur recherche: ' + error.message, 'error')
        }
    }

    displaySearchResults(results, query) {
        // Afficher les résultats de recherche dans une modal ou un panneau dédié
        const searchPanel = document.getElementById('searchResults')
        if (!searchPanel) return
        
        if (results.length === 0) {
            searchPanel.innerHTML = `<p>Aucun résultat pour "${query}"</p>`
            return
        }
        
        searchPanel.innerHTML = `
            <h4>Résultats pour "${query}" (${results.length})</h4>
            <div class="search-results-list">
                ${results.map(npc => `
                    <div class="search-result-item" onclick="adminPanel.npcEditor.goToNPC('${npc.zone}', ${npc.id})">
                        <div class="result-name">${npc.name}</div>
                        <div class="result-details">
                            <span class="result-type">${NPC_TYPES[npc.type]?.name || npc.type}</span>
                            <span class="result-zone">Zone: ${npc.zone}</span>
                            <span class="result-position">(${npc.position.x}, ${npc.position.y})</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `
    }

    async goToNPC(zone, npcId) {
        // Naviguer vers un NPC spécifique
        if (this.currentZone !== zone) {
            if (this.unsavedChanges) {
                if (!confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
                    return
                }
            }
            
            // Changer de zone
            const zoneSelect = document.getElementById('npcZoneSelect')
            if (zoneSelect) {
                zoneSelect.value = zone
                await this.selectZone(zone)
            }
        }
        
        // Sélectionner le NPC
        const npcIndex = this.npcs.findIndex(npc => npc.id === npcId)
        if (npcIndex !== -1) {
            this.selectNPC(npcIndex)
            this.adminPanel.showNotification(`NPC "${this.npcs[npcIndex].name}" sélectionné`, 'info')
        } else {
            this.adminPanel.showNotification('NPC non trouvé dans la zone courante', 'warning')
        }
    }

    clearSearch() {
        const searchPanel = document.getElementById('searchResults')
        if (searchPanel) {
            searchPanel.innerHTML = ''
        }
    }

    // ==============================
    // INTERFACE UTILISATEUR MONGODB
    // ==============================

    renderMainInterface() {
        const container = document.querySelector('#npcs')
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
<button class="btn btn-primary" onclick="saveAllNPCs()" ${!this.currentZone ? 'disabled' : ''}>
                                <i class="fas fa-save"></i> Sauvegarder MongoDB
                            </button>
                            <button class="btn btn-secondary" onclick="adminPanel.npcEditor.validateZoneNPCs()" ${!this.currentZone ? 'disabled' : ''}>
                                <i class="fas fa-check-circle"></i> Valider
                            </button>
                        </div>
                    </div>
                    
                    <div class="zone-stats" id="zoneStats">
                        <!-- Stats de la zone -->
                    </div>
                </div>

                <!-- Barre de recherche globale -->
                <div class="search-section">
                    <div class="search-input-group">
                        <input type="text" class="search-input" id="globalNPCSearch" 
                               placeholder="🔍 Rechercher NPCs dans toutes les zones..." 
                               onkeyup="adminPanel.npcEditor.searchNPCs(this.value)">
                        <button class="btn btn-outline-secondary" onclick="adminPanel.npcEditor.clearSearch()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="searchResults" class="search-results"></div>
                </div>

                <!-- Zone principale -->
                <div class="npc-main-area">
                    <!-- Liste des NPCs -->
                    <div class="npcs-list-panel">
                        <div class="list-header">
                            <h3>👥 NPCs de la Zone 
                                ${this.currentZoneSource === 'mongodb' ? '<span class="badge badge-success">MongoDB</span>' : ''}
                            </h3>
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
                                <button class="btn btn-success btn-sm" onclick="adminPanel.npcEditor.saveCurrentNPCToMongoDB()">
    <i class="fas fa-save"></i> Valider & Sauvegarder
</button>
                                <button class="btn btn-secondary btn-sm" onclick="adminPanel.npcEditor.cancelEdit()">
                                    <i class="fas fa-times"></i> Annuler
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="adminPanel.npcEditor.deleteCurrentNPC()">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                                <button class="btn btn-info btn-sm" onclick="adminPanel.npcEditor.duplicateNPC(adminPanel.npcEditor.npcs.findIndex(n => n.id === adminPanel.npcEditor.selectedNPC?.id))">
                                    <i class="fas fa-copy"></i> Dupliquer
                                </button>
                            </div>
                        </div>
                        
                        <div class="editor-content" id="editorContent">
                            <div class="no-selection">
                                <div style="text-align: center; padding: 60px; color: #6c757d;">
                                    <i class="fas fa-database" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                                    <p>NPCs stockés dans MongoDB</p>
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
this.formBuilder = new NPCFormBuilder(editorContent, this.adminPanel)
            this.formBuilder.onFormChange((npc, field, value) => {
                this.onNPCDataChange(npc, field, value)
            })
        }
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
                <div class="stat-item">
                    <span class="stat-icon">💾</span>
                    <span class="stat-label">MongoDB</span>
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

    // Conserver toutes les autres méthodes existantes (renderNPCsList, selectZone, etc.)
    // mais mise à jour pour signaler MongoDB

    selectZone(zoneId) {
        if (this.unsavedChanges) {
            if (!confirm('Vous avez des modifications non sauvegardées dans MongoDB. Continuer ?')) {
                // Restaurer la sélection précédente
                const select = document.getElementById('npcZoneSelect')
                if (select) select.value = this.currentZone || ''
                return
            }
        }

        this.currentZone = zoneId
        this.selectedNPC = null
        this.unsavedChanges = false
        this.currentZoneSource = null
        
        if (zoneId) {
            this.loadNPCsForZone(zoneId)
        } else {
            this.npcs = []
            this.renderNPCsList()
            this.renderZoneStats()
        }
        
        this.updateEditorState()
    }

    // ==============================
    // API PUBLIQUE MONGODB
    // ==============================

    onTabActivated() {
        console.log('👤 [NPCEditor] Tab activated with MongoDB support')
        
        try {
            // Forcer le rendu immédiatement
            console.log('👤 [NPCEditor] Rendering interface...')
            this.renderMainInterface()
            console.log('👤 [NPCEditor] Interface rendered successfully')
            
            // Charger les zones en arrière-plan si nécessaire
            if (!this.availableZones || this.availableZones.length === 0) {
                console.log('👤 [NPCEditor] Loading zones...')
                this.loadAvailableZones().then(() => {
                    console.log('👤 [NPCEditor] Zones loaded, re-rendering...')
                    this.renderMainInterface()
                }).catch(error => {
                    console.error('❌ [NPCEditor] Error loading zones:', error)
                    // Continuer quand même avec zones par défaut
                    this.renderMainInterface()
                })
            }
            
            // Recharger la zone courante si nécessaire
            if (this.currentZone) {
                this.renderNPCsList()
                this.renderZoneStats()
            }
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error in onTabActivated:', error)
            
            // Fallback - afficher au moins quelque chose
            const container = document.querySelector('#npcs .panel')
            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #e74c3c;">
                        <h3>❌ Erreur de chargement NPC Editor MongoDB</h3>
                        <p>Erreur: ${error.message}</p>
                        <button onclick="window.adminPanel.npcEditor.onTabActivated()" class="btn btn-primary">
                            🔄 Réessayer
                        </button>
                    </div>
                `
            }
        }
    }

    // Méthodes publiques pour integration MongoDB
    getCurrentZone() {
        return this.currentZone
    }

    getCurrentNPCs() {
        return [...this.npcs]
    }

    hasUnsavedChanges() {
        return this.unsavedChanges
    }

    isUsingMongoDB() {
        return this.currentZoneSource === 'mongodb'
    }

    // ==============================
    // MÉTHODES EXISTANTES CONSERVÉES
    // ==============================

    renderNPCsList() {
        const container = document.getElementById('npcsList')
        if (!container || !this.currentZone) return

        if (this.npcs.length === 0) {
            container.innerHTML = `
                <div class="empty-list">
                    <p>Aucun NPC dans cette zone ${this.currentZoneSource === 'mongodb' ? '(MongoDB)' : ''}</p>
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
                        <span class="npc-id">• ID: ${npc.id}</span>
                    </div>
                </div>
                <div class="npc-status">
                    ${this.getNPCStatusIcon(npc)}
                </div>
            </div>
        `).join('')
    }

    
selectNPC(index) {
    if (index < 0 || index >= this.npcs.length) return
    
    if (this.unsavedChanges) {
        if (!confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
            return
        }
    }

    // Sélection avec vérification des données
    const originalNPC = this.npcs[index]
    console.log('🔍 [NPCEditor] Original NPC data:', originalNPC)
    
    // Validation de la position
    if (!originalNPC.position || typeof originalNPC.position.x !== 'number' || typeof originalNPC.position.y !== 'number') {
        console.warn('⚠️ [NPCEditor] Invalid position detected, fixing...', originalNPC.position)
        originalNPC.position = { 
            x: Number(originalNPC.position?.x) || 0, 
            y: Number(originalNPC.position?.y) || 0 
        }
    }
    
    this.selectedNPC = JSON.parse(JSON.stringify(originalNPC)) // Deep clone
    this.unsavedChanges = false
    
    console.log('✅ [NPCEditor] Selected NPC with position:', this.selectedNPC.position)
    
    this.updateEditorState()
    this.renderNPCsList()
    
    if (this.formBuilder) {
        console.log('📋 [NPCEditor] Loading NPC into form builder...')
        
        // Délai pour s'assurer que l'UI est prête
        setTimeout(() => {
            this.formBuilder.loadNPC(this.selectedNPC)
            
            // Diagnostic supplémentaire après un délai
            setTimeout(() => {
                console.log('🔍 [NPCEditor] Final check - Form should show position:', this.selectedNPC.position)
            }, 500)
        }, 100)
    }
    
    console.log('👤 [NPCEditor] Selected NPC from MongoDB:', this.selectedNPC.name, 'at position', this.selectedNPC.position)
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
        
        console.log('🚫 [NPCEditor] Edit cancelled')
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
            if (title) title.textContent = `Éditer: ${this.selectedNPC.name} (${NPC_TYPES[this.selectedNPC.type]?.name || this.selectedNPC.type}) - MongoDB`
            if (actions) actions.style.display = 'flex'
            
            // Masquer le message "no selection" s'il existe
            const noSelection = content?.querySelector('.no-selection')
            if (noSelection) noSelection.style.display = 'none'
        } else {
            if (title) title.textContent = 'Sélectionnez un NPC ou créez-en un nouveau - MongoDB'
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
        
        console.log(`📝 [NPCEditor] NPC field changed (MongoDB): ${field} = ${value}`)
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

    downloadNPCsJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${this.currentZone}_npcs_mongodb_backup.json`
        a.click()
        
        URL.revokeObjectURL(url)
    }

    cleanup() {
        this.currentZone = null
        this.npcs = []
        this.selectedNPC = null
        this.formBuilder = null
        this.unsavedChanges = false
        this.currentZoneSource = null
        
        console.log('🧹 [NPCEditor] Module cleanup completed (MongoDB)')
    }
}

export default NPCEditorModule
