// PokeWorld Admin Panel - NPC Editor Module

import { NPCFormBuilder } from './npc-form-builder.js'
import { NPCValidator } from './npc-validator.js'
import { NPC_TYPES } from './npc-types.js'

export class NPCEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'npcEditor'
        this.currentZone = null
        this.zoneNPCs = []
        this.npcSchema = null // Chargé depuis npcexample.json
        this.selectedNPC = null
        this.isEditing = false
        this.formBuilder = new NPCFormBuilder(this)
        this.validator = new NPCValidator()
        
        console.log('👥 [NPCEditor] Module initialized')
        this.init()
    }

    async init() {
        // Charger le schéma de référence complet
        await this.loadNPCSchema()
        console.log('👥 [NPCEditor] Initialization complete - NPC schema loaded')
    }

    // ==============================
    // CHARGEMENT DES DONNÉES
    // ==============================

    async loadNPCSchema() {
        try {
            console.log('📖 [NPCEditor] Loading NPC schema from example file...')
            
            // Charger le fichier exemple complet
            const response = await this.adminPanel.apiCall('/npcs/example')
            this.npcSchema = response.data || response
            
            console.log('✅ [NPCEditor] NPC schema loaded successfully')
            console.log(`📊 [NPCEditor] Schema contains ${this.npcSchema.npcs.length} example NPCs`)
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error loading NPC schema:', error)
            this.adminPanel.showNotification('Erreur chargement schéma NPCs: ' + error.message, 'error')
            
            // Fallback basique
            this.npcSchema = {
                npcs: [],
                meta: { title: 'Fallback Schema' }
            }
        }
    }

    async loadZoneNPCs(zoneId) {
        if (!zoneId) return

        console.log(`👥 [NPCEditor] Loading NPCs for zone: ${zoneId}`)
        
        try {
            // Charger les NPCs de la zone
            const response = await this.adminPanel.apiCall(`/npcs/${zoneId}`)
            const zoneData = response.data || response
            
            this.currentZone = zoneId
            this.zoneNPCs = zoneData.npcs || []
            
            console.log(`✅ [NPCEditor] Loaded ${this.zoneNPCs.length} NPCs from ${zoneId}`)
            this.adminPanel.showNotification(`Zone ${zoneId}: ${this.zoneNPCs.length} NPCs chargés`, 'success')
            
            // Mettre à jour l'interface
            this.renderNPCsList()
            this.showZoneInterface()
            
        } catch (error) {
            console.error(`❌ [NPCEditor] Error loading NPCs for ${zoneId}:`, error)
            
            // Créer une zone vide si elle n'existe pas
            if (error.message.includes('404') || error.message.includes('non trouvé')) {
                console.log(`📝 [NPCEditor] Creating new zone file for ${zoneId}`)
                this.currentZone = zoneId
                this.zoneNPCs = []
                this.renderNPCsList()
                this.showZoneInterface()
                this.adminPanel.showNotification(`Nouvelle zone ${zoneId} créée`, 'info')
            } else {
                this.adminPanel.showNotification('Erreur chargement zone: ' + error.message, 'error')
            }
        }
    }

    // ==============================
    // INTERFACE UTILISATEUR
    // ==============================

    renderZoneSelector() {
        const zoneContainer = document.getElementById('npcZoneContainer')
        if (!zoneContainer) return

        // Liste des zones disponibles (à sync avec MapEditor)
        const availableZones = [
            { id: 'beach', name: '🏖️ Beach' },
            { id: 'village', name: '🏘️ Village' },
            { id: 'lavandia', name: '🏙️ Lavandia' },
            { id: 'road1', name: '🛤️ Route 1' },
            { id: 'road2', name: '🛤️ Route 2' },
            { id: 'road3', name: '🛤️ Route 3' },
        ]

        zoneContainer.innerHTML = `
            <div class="zone-selector">
                <div class="zone-header">
                    <h3>👥 Éditeur NPCs</h3>
                    <div class="zone-stats" id="zoneStats">
                        Aucune zone sélectionnée
                    </div>
                </div>
                <div class="zone-controls">
                    <select id="npcZoneSelect" class="form-select" onchange="adminPanel.npcEditor.onZoneChanged(this.value)">
                        <option value="">Sélectionner une zone...</option>
                        ${availableZones.map(zone => `
                            <option value="${zone.id}">${zone.name}</option>
                        `).join('')}
                    </select>
                    <button class="btn btn-primary" onclick="adminPanel.npcEditor.createNewNPC()" 
                            id="createNPCBtn" disabled>
                        ➕ Nouveau NPC
                    </button>
                </div>
            </div>
        `
    }

    showZoneInterface() {
        const createBtn = document.getElementById('createNPCBtn')
        const npcListPanel = document.getElementById('npcListPanel')
        const npcEditPanel = document.getElementById('npcEditPanel')
        
        if (createBtn) createBtn.disabled = false
        if (npcListPanel) npcListPanel.style.display = 'block'
        if (npcEditPanel) npcEditPanel.style.display = 'none'
        
        this.updateZoneStats()
    }

    updateZoneStats() {
        const zoneStats = document.getElementById('zoneStats')
        if (!zoneStats || !this.currentZone) return

        const npcsByType = {}
        this.zoneNPCs.forEach(npc => {
            const type = npc.type || 'unknown'
            npcsByType[type] = (npcsByType[type] || 0) + 1
        })

        const statsHtml = Object.entries(npcsByType).map(([type, count]) => {
            const typeInfo = NPC_TYPES[type] || { icon: '❓', name: type }
            return `<span class="stat-badge">${typeInfo.icon} ${count}</span>`
        }).join(' ')

        zoneStats.innerHTML = `
            <strong>Zone: ${this.currentZone}</strong> 
            <span class="total-npcs">${this.zoneNPCs.length} NPCs</span>
            ${statsHtml}
        `
    }

    renderNPCsList() {
        const npcList = document.getElementById('npcsList')
        if (!npcList) return

        if (this.zoneNPCs.length === 0) {
            npcList.innerHTML = `
                <div class="no-npcs-message">
                    <div class="empty-state">
                        <div class="empty-icon">👥</div>
                        <h4>Aucun NPC dans cette zone</h4>
                        <p>Commencez par créer votre premier NPC !</p>
                        <button class="btn btn-primary" onclick="adminPanel.npcEditor.createNewNPC()">
                            ➕ Créer un NPC
                        </button>
                    </div>
                </div>
            `
            return
        }

        // Grouper par type pour un meilleur affichage
        const npcsByType = {}
        this.zoneNPCs.forEach(npc => {
            const type = npc.type || 'unknown'
            if (!npcsByType[type]) npcsByType[type] = []
            npcsByType[type].push(npc)
        })

        const groupsHtml = Object.entries(npcsByType).map(([type, npcs]) => {
            const typeInfo = NPC_TYPES[type] || { icon: '❓', name: type, color: '#666' }
            
            return `
                <div class="npc-group">
                    <div class="group-header">
                        <h4>${typeInfo.icon} ${typeInfo.name} (${npcs.length})</h4>
                    </div>
                    <div class="npcs-grid">
                        ${npcs.map(npc => this.renderNPCCard(npc, typeInfo)).join('')}
                    </div>
                </div>
            `
        }).join('')

        npcList.innerHTML = groupsHtml
    }

    renderNPCCard(npc, typeInfo) {
        return `
            <div class="npc-card ${this.selectedNPC?.id === npc.id ? 'selected' : ''}" 
                 onclick="adminPanel.npcEditor.selectNPC(${npc.id})">
                <div class="npc-card-header">
                    <div class="npc-icon" style="background-color: ${typeInfo.color}20; color: ${typeInfo.color};">
                        ${typeInfo.icon}
                    </div>
                    <div class="npc-info">
                        <div class="npc-name">${npc.name}</div>
                        <div class="npc-id">ID: ${npc.id}</div>
                    </div>
                    <div class="npc-actions">
                        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); adminPanel.npcEditor.duplicateNPC(${npc.id})" title="Dupliquer">
                            📋
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); adminPanel.npcEditor.deleteNPC(${npc.id})" title="Supprimer">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="npc-details">
                    <div class="detail-item">
                        <span class="detail-label">Position:</span>
                        <span class="detail-value">(${npc.position?.x || 0}, ${npc.position?.y || 0})</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Sprite:</span>
                        <span class="detail-value">${npc.sprite || 'default.png'}</span>
                    </div>
                    ${this.renderNPCSpecificDetails(npc)}
                </div>
            </div>
        `
    }

    renderNPCSpecificDetails(npc) {
        // Détails spécifiques selon le type
        switch (npc.type) {
            case 'merchant':
                return `<div class="detail-item">
                    <span class="detail-label">Boutique:</span>
                    <span class="detail-value">${npc.shopId || 'Non définie'}</span>
                </div>`
            
            case 'trainer':
                return `<div class="detail-item">
                    <span class="detail-label">Classe:</span>
                    <span class="detail-value">${npc.trainerClass || 'trainer'}</span>
                </div>`
            
            case 'gym_leader':
                return `<div class="detail-item">
                    <span class="detail-label">Badge:</span>
                    <span class="detail-value">${npc.gymConfig?.badgeId || 'Non défini'}</span>
                </div>`
            
            case 'transport':
                return `<div class="detail-item">
                    <span class="detail-label">Destinations:</span>
                    <span class="detail-value">${npc.destinations?.length || 0} lieux</span>
                </div>`
            
            default:
                return ''
        }
    }

    // ==============================
    // GESTION DES NPCS
    // ==============================

    onZoneChanged(zoneId) {
        if (!zoneId) return
        this.loadZoneNPCs(zoneId)
    }

    selectNPC(npcId) {
        this.selectedNPC = this.zoneNPCs.find(npc => npc.id === npcId)
        if (this.selectedNPC) {
            console.log(`👤 [NPCEditor] Selected NPC: ${this.selectedNPC.name} (${this.selectedNPC.type})`)
            this.renderNPCsList() // Rafraîchir l'affichage
            this.editNPC(this.selectedNPC)
        }
    }

    createNewNPC() {
        if (!this.currentZone) {
            this.adminPanel.showNotification('Veuillez sélectionner une zone d\'abord', 'warning')
            return
        }

        // Générer un nouvel ID
        const maxId = this.zoneNPCs.length > 0 ? Math.max(...this.zoneNPCs.map(n => n.id)) : 9000
        
        const newNPC = {
            id: maxId + 1,
            name: `Nouveau NPC ${maxId + 1}`,
            type: 'dialogue', // Type par défaut
            position: { x: 100, y: 100 },
            sprite: 'default.png',
            direction: 'south',
            interactionRadius: 32
        }

        this.selectedNPC = newNPC
        this.isEditing = false // Mode création
        
        console.log(`➕ [NPCEditor] Creating new NPC with ID ${newNPC.id}`)
        this.editNPC(newNPC)
    }

    duplicateNPC(npcId) {
        const originalNPC = this.zoneNPCs.find(npc => npc.id === npcId)
        if (!originalNPC) return

        const maxId = Math.max(...this.zoneNPCs.map(n => n.id))
        const duplicatedNPC = {
            ...JSON.parse(JSON.stringify(originalNPC)), // Deep clone
            id: maxId + 1,
            name: `${originalNPC.name} (Copie)`,
            position: {
                x: (originalNPC.position?.x || 0) + 50,
                y: (originalNPC.position?.y || 0) + 50
            }
        }

        this.selectedNPC = duplicatedNPC
        this.isEditing = false // Mode création
        
        console.log(`📋 [NPCEditor] Duplicating NPC ${originalNPC.name} -> ${duplicatedNPC.name}`)
        this.adminPanel.showNotification(`NPC "${originalNPC.name}" dupliqué`, 'success')
        this.editNPC(duplicatedNPC)
    }

    async deleteNPC(npcId) {
        const npc = this.zoneNPCs.find(npc => npc.id === npcId)
        if (!npc) return

        const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer "${npc.name}" ?`)
        if (!confirmed) return

        // Supprimer de la liste locale
        this.zoneNPCs = this.zoneNPCs.filter(n => n.id !== npcId)
        
        console.log(`🗑️ [NPCEditor] Deleted NPC: ${npc.name}`)
        this.adminPanel.showNotification(`NPC "${npc.name}" supprimé`, 'info')
        
        // Rafraîchir l'affichage
        this.renderNPCsList()
        this.updateZoneStats()
        
        // Fermer l'éditeur si c'était le NPC sélectionné
        if (this.selectedNPC?.id === npcId) {
            this.selectedNPC = null
            this.hideEditor()
        }

        // Auto-sauvegarde
        await this.saveZoneNPCs()
    }

    editNPC(npc) {
        console.log(`✏️ [NPCEditor] Editing NPC: ${npc.name} (${npc.type})`)
        
        this.isEditing = this.zoneNPCs.some(existingNPC => existingNPC.id === npc.id)
        
        // Générer le formulaire avec le FormBuilder
        this.formBuilder.buildForm(npc, this.npcSchema)
        
        // Montrer le panel d'édition
        this.showEditor()
    }

    showEditor() {
        const listPanel = document.getElementById('npcListPanel')
        const editPanel = document.getElementById('npcEditPanel')
        
        if (listPanel) listPanel.style.display = 'none'
        if (editPanel) editPanel.style.display = 'block'
    }

    hideEditor() {
        const listPanel = document.getElementById('npcListPanel')
        const editPanel = document.getElementById('npcEditPanel')
        
        if (listPanel) listPanel.style.display = 'block'
        if (editPanel) editPanel.style.display = 'none'
        
        this.selectedNPC = null
    }

    // ==============================
    // SAUVEGARDE
    // ==============================

    async saveNPC(npcData) {
        if (!this.currentZone) {
            this.adminPanel.showNotification('Aucune zone sélectionnée', 'error')
            return false
        }

        // Valider les données
        const validation = this.validator.validateNPC(npcData)
        if (!validation.isValid) {
            this.adminPanel.showNotification(`Erreurs de validation: ${validation.errors.join(', ')}`, 'error')
            return false
        }

        // Nettoyer les données (supprimer les propriétés vides/par défaut)
        const cleanedNPC = this.cleanNPCData(npcData)

        try {
            if (this.isEditing) {
                // Mise à jour d'un NPC existant
                const index = this.zoneNPCs.findIndex(n => n.id === cleanedNPC.id)
                if (index !== -1) {
                    this.zoneNPCs[index] = cleanedNPC
                    console.log(`💾 [NPCEditor] Updated NPC: ${cleanedNPC.name}`)
                    this.adminPanel.showNotification(`NPC "${cleanedNPC.name}" mis à jour`, 'success')
                }
            } else {
                // Création d'un nouveau NPC
                this.zoneNPCs.push(cleanedNPC)
                this.isEditing = true
                console.log(`💾 [NPCEditor] Created new NPC: ${cleanedNPC.name}`)
                this.adminPanel.showNotification(`NPC "${cleanedNPC.name}" créé`, 'success')
            }

            // Sauvegarder la zone complète
            await this.saveZoneNPCs()
            
            // Rafraîchir l'affichage
            this.renderNPCsList()
            this.updateZoneStats()
            
            return true
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error saving NPC:', error)
            this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error')
            return false
        }
    }

    cleanNPCData(npcData) {
        // Supprimer les propriétés vides ou par défaut
        const cleaned = { ...npcData }
        
        // Fonction récursive pour nettoyer les objets
        const cleanObject = (obj) => {
            Object.keys(obj).forEach(key => {
                const value = obj[key]
                
                if (value === null || value === undefined || value === '') {
                    delete obj[key]
                } else if (Array.isArray(value)) {
                    if (value.length === 0) {
                        delete obj[key]
                    } else {
                        obj[key] = value.filter(item => item != null && item !== '')
                    }
                } else if (typeof value === 'object') {
                    cleanObject(value)
                    if (Object.keys(value).length === 0) {
                        delete obj[key]
                    }
                }
            })
        }
        
        cleanObject(cleaned)
        return cleaned
    }

    async saveZoneNPCs() {
        if (!this.currentZone) return

        const zoneData = {
            zone: this.currentZone,
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            description: `NPCs pour ${this.currentZone} - Édités via Admin Panel`,
            npcs: this.zoneNPCs
        }

        try {
            const response = await this.adminPanel.apiCall(`/npcs/${this.currentZone}`, {
                method: 'POST',
                body: JSON.stringify(zoneData)
            })
            
            console.log(`✅ [NPCEditor] Zone ${this.currentZone} saved with ${this.zoneNPCs.length} NPCs`)
            
        } catch (error) {
            console.error('❌ [NPCEditor] Error saving zone:', error)
            
            // Fallback: télécharger le fichier JSON
            this.downloadZoneJSON(zoneData)
            this.adminPanel.showNotification('Fichier JSON téléchargé (sauvegarde API échouée)', 'warning')
        }
    }

    downloadZoneJSON(zoneData) {
        const blob = new Blob([JSON.stringify(zoneData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${this.currentZone}.json`
        a.click()
        
        URL.revokeObjectURL(url)
    }

    // ==============================
    // LIFECYCLE
    // ==============================

    onTabActivated() {
        console.log('👥 [NPCEditor] Tab activated')
        
        // Initialiser l'interface si pas encore fait
        this.renderZoneSelector()
        
        // Recharger le schéma si nécessaire
        if (!this.npcSchema || Object.keys(this.npcSchema).length === 0) {
            this.loadNPCSchema()
        }
    }

    cleanup() {
        this.currentZone = null
        this.zoneNPCs = []
        this.selectedNPC = null
        this.isEditing = false
        
        console.log('🧹 [NPCEditor] Module cleanup completed')
    }
}

export default NPCEditorModule
