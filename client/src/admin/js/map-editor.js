// PokeWorld Admin Panel - Map Editor Module avec Items Dynamiques

export class MapEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'mapEditor'
        this.currentMapData = null
        this.availableMaps = []
        this.placedObjects = []
        this.selectedTool = 'object' // Changer pour mode item par défaut
        this.selectedItem = null // Nouvel état pour l'item sélectionné
        this.availableItems = {} // Cache des items chargés
        this.zoom = 1
        this.tileSize = 16
        this.dpi = window.devicePixelRatio || 1
        this.tilesets = new Map()
        this.tilesetImages = new Map()
        
        console.log('🗺️ [MapEditor] Module initialized with items support')
        this.init()
    }

    async init() {
        // Charger les items au démarrage
        await this.loadAvailableItems()
        console.log('🗺️ [MapEditor] Initialisation terminée - support des items dynamiques activé')
    }

    // ==============================
    // GESTION DES ITEMS
    // ==============================

    async loadAvailableItems() {
    try {
        console.log('📦 [MapEditor] Loading items from API...')
        
        // Utiliser uniquement l'API
        const response = await this.adminPanel.apiCall('/items')
        this.availableItems = response
        
        // Mettre à jour l'interface utilisateur
        this.renderItemsPanel()
        
        console.log(`✅ [MapEditor] ${Object.keys(response).length} items chargés depuis l'API`)
        
    } catch (error) {
        console.error('❌ [MapEditor] Error loading items:', error)
        this.adminPanel.showNotification('Erreur chargement items: ' + error.message, 'warning')
        
        // Items par défaut en cas d'erreur
        this.availableItems = {
            'poke_ball': { 
                id: 'poke_ball', 
                type: 'ball', 
                pocket: 'balls',
                price: 200,
                stackable: true 
            },
            'potion': { 
                id: 'potion', 
                type: 'medicine', 
                pocket: 'medicine',
                price: 300,
                heal_amount: 20,
                stackable: true
            },
            'super_potion': { 
                id: 'super_potion', 
                type: 'medicine', 
                pocket: 'medicine',
                price: 700,
                heal_amount: 50,
                stackable: true
            },
            'great_ball': { 
                id: 'great_ball', 
                type: 'ball', 
                pocket: 'balls',
                price: 600,
                stackable: true
            },
            'antidote': { 
                id: 'antidote', 
                type: 'medicine', 
                pocket: 'medicine',
                price: 100,
                status_cure: ['poison'],
                stackable: true
            },
            'escape_rope': { 
                id: 'escape_rope', 
                type: 'item', 
                pocket: 'items',
                price: 550,
                stackable: true
            }
        }
        this.renderItemsPanel()
        console.log('📦 [MapEditor] Items par défaut utilisés')
    }
}

    renderItemsPanel() {
        const itemsContainer = document.getElementById('itemsContainer')
        if (!itemsContainer) return

        // Grouper les items par type
        const itemsByType = {}
        Object.values(this.availableItems).forEach(item => {
            const type = item.type || 'other'
            if (!itemsByType[type]) itemsByType[type] = []
            itemsByType[type].push(item)
        })

        // Générer le HTML pour chaque catégorie
        const categoriesHTML = Object.entries(itemsByType).map(([type, items]) => `
            <div class="items-category">
                <h4 class="category-title">${this.getTypeDisplayName(type)} (${items.length})</h4>
                <div class="items-grid">
                    ${items.map(item => `
                        <div class="item-card ${this.selectedItem?.id === item.id ? 'selected' : ''}" 
                             onclick="adminPanel.mapEditor.selectItem('${item.id}')"
                             title="${item.id}">
                            <div class="item-icon">${this.getItemIcon(item)}</div>
                            <div class="item-name">${this.getItemDisplayName(item.id)}</div>
                            <div class="item-type">${item.type}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')

        itemsContainer.innerHTML = `
            <div class="items-header">
                <h3>📦 Items Disponibles</h3>
                <div class="items-stats">
                    <span class="badge badge-primary">${Object.keys(this.availableItems).length} items</span>
                    ${this.selectedItem ? `<span class="badge badge-success">Sélectionné: ${this.selectedItem.id}</span>` : ''}
                </div>
            </div>
            <div class="items-search">
                <input type="text" id="itemSearch" placeholder="🔍 Rechercher un item..." 
                       onkeyup="adminPanel.mapEditor.filterItems(this.value)" class="form-input">
            </div>
            <div class="items-list">
                ${categoriesHTML}
            </div>
        `
    }

    selectItem(itemId) {
        this.selectedItem = this.availableItems[itemId]
        this.selectedTool = 'object' // Forcer le mode objet
        
        // Mettre à jour l'affichage des outils
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === 'object')
        })
        
        // Mettre à jour l'affichage des items
        this.renderItemsPanel()
        
        console.log(`📦 [MapEditor] Item selected: ${itemId}`)
        this.adminPanel.showNotification(`Item sélectionné: ${this.getItemDisplayName(itemId)}`, 'info')
    }

    filterItems(searchTerm) {
        const itemCards = document.querySelectorAll('.item-card')
        const categories = document.querySelectorAll('.items-category')
        
        searchTerm = searchTerm.toLowerCase()
        
        itemCards.forEach(card => {
            const itemName = card.querySelector('.item-name').textContent.toLowerCase()
            const itemId = card.title.toLowerCase()
            const matches = itemName.includes(searchTerm) || itemId.includes(searchTerm)
            
            card.style.display = matches ? 'block' : 'none'
        })
        
        // Masquer les catégories vides
        categories.forEach(category => {
            const visibleItems = category.querySelectorAll('.item-card:not([style*="display: none"])')
            category.style.display = visibleItems.length > 0 ? 'block' : 'none'
        })
    }

    getTypeDisplayName(type) {
        const typeNames = {
            'ball': '⚾ Pokéballs',
            'medicine': '💊 Médicaments', 
            'item': '📦 Objets',
            'key_item': '🗝️ Objets Clés',
            'other': '❓ Autres'
        }
        return typeNames[type] || type
    }

    getItemIcon(item) {
        const icons = {
            'ball': '⚾',
            'medicine': '💊',
            'key_item': '🗝️',
            'item': '📦'
        }
        return icons[item.type] || '❓'
    }

    getItemDisplayName(itemId) {
        return itemId.replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
    }

    // ==============================
    // PLACEMENT D'OBJETS AMÉLIORÉ
    // ==============================

    handleCanvasClick(event) {
        if (!this.currentMapData) return

        const canvas = document.getElementById('mapCanvas')
        const rect = canvas.getBoundingClientRect()
        
        const tileWidth = this.currentMapData.tilewidth * this.zoom
        const tileHeight = this.currentMapData.tileheight * this.zoom
        
        const x = (event.clientX - rect.left)
        const y = (event.clientY - rect.top)
        
        const tileX = Math.floor(x / tileWidth)
        const tileY = Math.floor(y / tileHeight)
        
        console.log(`🗺️ [MapEditor] Click at (${x}, ${y}) -> tile (${tileX}, ${tileY})`)
        
        // Vérifier si on clique sur un objet existant
        const existingIndex = this.placedObjects.findIndex(obj => obj.x === tileX && obj.y === tileY)
        
        if (existingIndex !== -1) {
            const existingObj = this.placedObjects[existingIndex]
            
            if (existingObj.isFromMap) {
                this.adminPanel.showNotification('Objet de la carte (lecture seule)', 'warning')
                return
            }
            
            // Supprimer l'objet ajouté manuellement
            this.placedObjects.splice(existingIndex, 1)
            this.adminPanel.showNotification('Objet supprimé', 'info')
        } else {
            // Ajouter un nouvel objet selon le mode
            if (this.selectedTool === 'object' && this.selectedItem) {
                this.placeItemObject(tileX, tileY)
            } else {
                this.placeGenericObject(tileX, tileY)
            }
        }
        
        this.renderMap()
    }

    placeItemObject(tileX, tileY) {
        if (!this.selectedItem) {
            this.adminPanel.showNotification('Aucun item sélectionné !', 'warning')
            return
        }

        const newObject = {
            id: Date.now(),
            position: { x: tileX * this.currentMapData.tilewidth, y: tileY * this.currentMapData.tileheight },
            type: this.determineObjectType(this.selectedItem),
            itemId: this.selectedItem.id,
            sprite: this.getItemSprite(this.selectedItem),
            quantity: this.getDefaultQuantity(this.selectedItem),
            cooldown: this.getDefaultCooldown(this.selectedItem),
            rarity: this.getItemRarity(this.selectedItem),
            name: this.selectedItem.id,
            isFromMap: false,
            // Coordonnées tiles pour l'affichage
            x: tileX,
            y: tileY,
            // Propriétés spécifiques selon le type
            ...this.getItemSpecificProperties(this.selectedItem)
        }
        
        this.placedObjects.push(newObject)
        this.adminPanel.showNotification(
            `${this.getItemDisplayName(this.selectedItem.id)} placé en (${tileX}, ${tileY})`, 
            'success'
        )
    }

placeGenericObject(tileX, tileY) {
    let newObject
    
    if (this.selectedTool === 'npc') {
        // ✅ NOUVEAU : Placement spécifique pour NPCs
        newObject = {
            id: `npc_${Date.now()}`,
            type: 'npc',
            x: tileX,
            y: tileY,
            name: `NPC_${tileX}_${tileY}`,
            sprite: 'npc_default',
            direction: 'south',
            npcType: 'dialogue',
            isFromMap: false,
            dialogues: ['Bonjour !'],
            interactionRadius: 32,
            customProperties: {}
        }
    } else {
        // Placement générique pour autres objets
        newObject = {
            id: `${this.selectedTool}_${Date.now()}`,
            type: this.selectedTool,
            x: tileX,
            y: tileY,
            name: `${this.selectedTool}_${tileX}_${tileY}`,
            isFromMap: false,
            properties: this.getDefaultProperties(this.selectedTool)
        }
    }
    
    this.placedObjects.push(newObject)
    this.adminPanel.showNotification(
        `${this.selectedTool.toUpperCase()} placé en (${tileX}, ${tileY})`, 
        'success'
    )
}

    // ==============================
    // PROPRIÉTÉS DES ITEMS
    // ==============================

    determineObjectType(item) {
        // Déterminer si c'est un objet visible ou caché
        if (item.type === 'key_item' || item.type === 'ball') {
            return 'ground' // Objets visibles
        }
        return 'hidden' // Objets cachés par défaut
    }

    getItemSprite(item) {
        const spriteMap = {
            'ball': 'pokeball_ground.png',
            'medicine': 'potion_ground.png',
            'key_item': 'keyitem_ground.png',
            'item': 'item_ground.png'
        }
        return spriteMap[item.type] || 'hidden_shimmer.png'
    }

    getDefaultQuantity(item) {
        if (item.stackable === false) return 1
        if (item.type === 'medicine') return Math.floor(Math.random() * 3) + 1 // 1-3
        if (item.type === 'ball') return Math.floor(Math.random() * 5) + 1 // 1-5
        return 1
    }

    getDefaultCooldown(item) {
        const cooldowns = {
            'ball': 6,
            'medicine': 12,
            'key_item': 48,
            'item': 24
        }
        return cooldowns[item.type] || 24
    }

    getItemRarity(item) {
        if (item.type === 'key_item') return 'rare'
        if (item.type === 'ball' && item.id !== 'poke_ball') return 'uncommon'
        if (item.type === 'medicine' && item.heal_amount === 'full') return 'rare'
        return 'common'
    }

    getItemSpecificProperties(item) {
        const properties = {}
        
        // Propriétés pour objets cachés
        if (this.determineObjectType(item) === 'hidden') {
            properties.searchRadius = 16
            properties.itemfinderRadius = 64
        }
        
        return properties
    }

    // ==============================
    // SAUVEGARDE AU FORMAT GAMEOBJECTS
    // ==============================

    async saveMapObjects() {
    if (!this.currentMapData) {
        this.adminPanel.showNotification('Aucune carte chargée', 'error')
        return
    }

    const mapSelect = document.getElementById('mapSelect')
    const mapId = mapSelect?.value
    
    if (!mapId) {
        this.adminPanel.showNotification('Aucune carte sélectionnée', 'error')
        return
    }

    console.log(`💾 [MapEditor] Saving objects for zone: ${mapId}`)
    
    // Filtrer seulement les objets ajoutés manuellement (pas ceux de la carte TMJ)
    const addedObjects = this.placedObjects.filter(obj => !obj.isFromMap)
    
    // ✅ NOUVEAU : Séparer gameobjects et NPCs
    const gameObjects = addedObjects.filter(obj => obj.type !== 'npc')
    const npcs = addedObjects.filter(obj => obj.type === 'npc')
    
    console.log(`💾 [MapEditor] Saving ${gameObjects.length} gameobjects and ${npcs.length} NPCs`)
    
    // Convertir au format unifié pour l'API
    const allObjectsForAPI = [
        // Convertir gameobjects
        ...gameObjects.map((obj, index) => ({
            id: index + 1,
            position: obj.position || { 
                x: obj.x * this.currentMapData.tilewidth, 
                y: obj.y * this.currentMapData.tileheight 
            },
            type: obj.type || 'ground',
            itemId: obj.itemId || obj.name,
            sprite: obj.sprite || this.getItemSprite({ type: this.availableItems[obj.itemId]?.type }),
            quantity: obj.quantity || 1,
            cooldown: obj.cooldown || 24,
            rarity: obj.rarity || 'common',
            ...(obj.searchRadius && { searchRadius: obj.searchRadius }),
            ...(obj.itemfinderRadius && { itemfinderRadius: obj.itemfinderRadius })
        })),
        
        // ✅ NOUVEAU : Convertir NPCs
        ...npcs.map((npc, index) => ({
            id: gameObjects.length + index + 1,
            type: 'npc',
            name: npc.name,
            x: npc.x,
            y: npc.y,
            position: npc.position || {
                x: npc.x * this.currentMapData.tilewidth,
                y: npc.y * this.currentMapData.tileheight
            },
            sprite: npc.sprite,
            direction: npc.direction,
            npcType: npc.npcType,
            dialogues: npc.dialogues,
            questsToGive: npc.questsToGive,
            questsToEnd: npc.questsToEnd,
            interactionRadius: npc.interactionRadius,
            customProperties: {
                ...npc.customProperties,
                originalNPCType: npc.npcType,
                isNPC: true
            }
        }))
    ]
    
    const saveData = {
        zone: mapId,
        version: "2.0.0",
        lastUpdated: new Date().toISOString(),
        description: `${mapId} - Objects and NPCs generated by map editor`,
        objects: allObjectsForAPI
    }

    try {
        const response = await this.adminPanel.apiCall(`/maps/${mapId}/gameobjects`, {
            method: 'POST',
            body: JSON.stringify(saveData)
        })
        
        console.log('✅ [MapEditor] Objects and NPCs saved:', response)
        this.adminPanel.showNotification(
            `${gameObjects.length} gameobjects et ${npcs.length} NPCs sauvegardés dans ${mapId}`, 
            'success'
        )
        
    } catch (error) {
        console.error('❌ [MapEditor] Error saving objects:', error)
        this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error')
    }
}
    downloadGameObjectsJSON(data, mapId) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${mapId}.json`
        a.click()
        
        URL.revokeObjectURL(url)
    }

    // ==============================
    // AFFICHAGE AMÉLIORÉ
    // ==============================

    updateObjectsList() {
        const objectsList = document.getElementById('objectsList')
        const objectsCount = document.getElementById('objectsCount')
        const noObjectsMessage = document.getElementById('noObjectsMessage')
        
        if (!objectsList || !objectsCount || !noObjectsMessage) return
        
        objectsCount.textContent = this.placedObjects.length
        
        if (this.placedObjects.length === 0) {
            objectsList.innerHTML = ''
            noObjectsMessage.style.display = 'block'
            return
        }
        
        noObjectsMessage.style.display = 'none'
        
        objectsList.innerHTML = this.placedObjects.map((obj, index) => `
            <div class="object-item ${obj.isFromMap ? 'from-map' : 'added'}" style="
                background: ${obj.isFromMap ? '#fff3cd' : '#f8f9fa'}; 
                border: 1px solid ${obj.isFromMap ? '#ffeaa7' : '#dee2e6'}; 
                border-radius: 8px; padding: 12px; margin-bottom: 8px;
            ">
                <div class="object-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="object-name" style="font-weight: 600; color: #2c3e50;">
                        ${this.getObjectIcon(obj)} ${obj.name || obj.itemId}
                        ${obj.isFromMap ? '<span class="badge" style="background: #ffc107; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-left: 8px;">MAP</span>' : ''}
                    </span>
                    ${!obj.isFromMap ? `
                        <button class="btn btn-danger btn-sm" onclick="adminPanel.mapEditor.removeObject(${index})" 
                                style="padding: 2px 6px; font-size: 0.7rem;">
                            🗑️
                        </button>
                    ` : '<span style="color: #6c757d; font-size: 0.8rem;">Lecture seule</span>'}
                </div>
                <div class="object-details" style="font-size: 0.85rem; color: #6c757d;">
                    Position: (${obj.x}, ${obj.y})<br>
                    ${obj.itemId ? `Item: ${this.getItemDisplayName(obj.itemId)}<br>` : ''}
                    ${obj.quantity ? `Quantité: ${obj.quantity}<br>` : ''}
                    ${obj.type ? `Type: ${obj.type}` : ''}${obj.rarity ? ` | Rareté: ${obj.rarity}` : ''}
                    ${obj.isFromMap ? ' (depuis la carte)' : ' (ajouté)'}
                </div>
            </div>
        `).join('')
    }

   getObjectIcon(obj) {
    if (obj.itemId && this.availableItems[obj.itemId]) {
        return this.getItemIcon(this.availableItems[obj.itemId])
    }
    
    const icons = {
        npc: '👤',        // ✅ Icône pour NPCs
        object: '📦',
        ground: '📦',
        hidden: '🔍',
        spawn: '🎯',
        teleport: '🌀'
    }
    
    return icons[obj.type] || '❓'
}

    drawPlacedObjects(ctx, tileWidth, tileHeight) {
        this.placedObjects.forEach(obj => {
            const x = obj.x * tileWidth
            const y = obj.y * tileHeight
            
            // Couleurs selon le type et origine
            const colors = {
                ground: obj.isFromMap ? 'rgba(78, 205, 196, 0.6)' : 'rgba(78, 205, 196, 0.9)',
                hidden: obj.isFromMap ? 'rgba(255, 193, 7, 0.6)' : 'rgba(255, 193, 7, 0.9)',
                npc: obj.isFromMap ? 'rgba(255, 107, 107, 0.6)' : 'rgba(255, 107, 107, 0.9)',
                spawn: obj.isFromMap ? 'rgba(69, 183, 209, 0.6)' : 'rgba(69, 183, 209, 0.9)',
                teleport: obj.isFromMap ? 'rgba(155, 89, 182, 0.6)' : 'rgba(155, 89, 182, 0.9)'
            }
            
            // Fond avec ombre pour objets existants
            if (obj.isFromMap) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
                ctx.fillRect(x + 4, y + 4, tileWidth - 4, tileHeight - 4)
            }
            
            // Fond coloré
            ctx.fillStyle = colors[obj.type] || 'rgba(149, 165, 166, 0.8)'
            ctx.fillRect(x + 2, y + 2, tileWidth - 4, tileHeight - 4)
            
            // Bordure différente pour les objets existants vs nouveaux
            ctx.strokeStyle = obj.isFromMap ? '#ffff00' : '#fff'
            ctx.lineWidth = obj.isFromMap ? 3 / this.dpi : 2 / this.dpi
            ctx.strokeRect(x + 2, y + 2, tileWidth - 4, tileHeight - 4)
            
            // Icône
            ctx.fillStyle = 'white'
            ctx.font = `bold ${Math.max(10, tileWidth * 0.4)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            
            const icon = this.getObjectIcon(obj)
            
            // Ombre du texte
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.fillText(icon, x + tileWidth / 2 + 1, y + tileHeight / 2 + 1)
            
            // Texte principal
            ctx.fillStyle = 'white'
            ctx.fillText(icon, x + tileWidth / 2, y + tileHeight / 2)
            
            // Petit indicateur pour objets existants
            if (obj.isFromMap) {
                ctx.fillStyle = '#ffff00'
                ctx.fillRect(x + tileWidth - 6, y + 2, 4, 4)
            }
        })
    }

    // ==============================
    // MÉTHODES HÉRITÉES INCHANGÉES
    // ==============================

    fixCanvasDPI(canvas) {
        const ctx = canvas.getContext('2d')
        
        const rect = canvas.getBoundingClientRect()
        const cssWidth = rect.width
        const cssHeight = rect.height
        
        canvas.width = cssWidth * this.dpi
        canvas.height = cssHeight * this.dpi
        
        canvas.style.width = cssWidth + 'px'
        canvas.style.height = cssHeight + 'px'
        
        ctx.scale(this.dpi, this.dpi)
        
        ctx.imageSmoothingEnabled = false
        ctx.imageSmoothingQuality = 'high'
        
        return ctx
    }

    async loadAvailableMaps() {
        console.log('🗺️ [MapEditor] Loading all available maps...')
        
        this.availableMaps = [
            { id: 'beach', name: '🏖️ Beach', file: 'beach.tmj' },
            { id: 'village', name: '🏘️ Village', file: 'village.tmj' },
            { id: 'lavandia', name: '🏙️ Lavandia', file: 'lavandia.tmj' },
            { id: 'road1', name: '🛤️ Route 1', file: 'road1.tmj' },
            { id: 'road2', name: '🛤️ Route 2', file: 'road2.tmj' },
            { id: 'road3', name: '🛤️ Route 3', file: 'road3.tmj' },
        ]

        const mapSelect = document.getElementById('mapSelect')
        if (mapSelect) {
            mapSelect.innerHTML = `
                <option value="">Sélectionner une carte...</option>
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

        console.log(`✅ [MapEditor] ${this.availableMaps.length} cartes chargées`)
    }

    async loadMap(mapId) {
        if (!mapId) return

        console.log('🗺️ [MapEditor] Clearing caches...')
        this.tilesets.clear()
        this.tilesetImages.clear()
        this.currentMapData = null
        this.placedObjects = []

        console.log(`🗺️ [MapEditor] Loading map: ${mapId}`)
        
        try {
            const mapFile = this.availableMaps.find(m => m.id === mapId)?.file || `${mapId}.tmj`
            
            let mapData
            try {
                const fileContent = await window.fs.readFile(`client/public/assets/maps/${mapFile}`, { encoding: 'utf8' })
                mapData = JSON.parse(fileContent)
            } catch (fsError) {
                const response = await fetch(`/assets/maps/${mapFile}`)
                if (!response.ok) throw new Error('Carte non trouvée')
                mapData = await response.json()
            }

            this.currentMapData = mapData
            
            await this.loadTilesets(mapData)
            this.loadExistingMapObjects()
            await this.loadExistingObjects(mapId)
            
            this.renderMap()
            
            const mapTools = document.getElementById('mapTools')
            const mapActions = document.getElementById('mapActions')
            const objectsPanel = document.getElementById('objectsPanel')
            const mapLoadingMessage = document.getElementById('mapLoadingMessage')
            
            if (mapTools) mapTools.style.display = 'flex'
            if (mapActions) mapActions.style.display = 'flex'
            if (objectsPanel) objectsPanel.style.display = 'block'
            if (mapLoadingMessage) mapLoadingMessage.style.display = 'none'
            
            this.adminPanel.showNotification(`Carte "${mapFile}" chargée avec succès`, 'success')
            
        } catch (error) {
            console.error('❌ [MapEditor] Error loading map:', error)
            this.adminPanel.showNotification('Erreur chargement carte: ' + error.message, 'error')
        }
    }

    selectTool(tool) {
        this.selectedTool = tool
        
        // Si on sélectionne autre chose que "object", désélectionner l'item
        if (tool !== 'object') {
            this.selectedItem = null
            this.renderItemsPanel()
        }
        
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool)
        })
        
        console.log(`🛠️ [MapEditor] Tool selected: ${tool}`)
    }

    setZoom(value) {
        this.zoom = parseFloat(value)
        const zoomValue = document.getElementById('zoomValue')
        if (zoomValue) {
            zoomValue.textContent = Math.round(this.zoom * 100) + '%'
        }
        
        if (this.currentMapData) {
            this.renderMap()
        }
    }

    getDefaultProperties(type) {
        switch (type) {
            case 'npc':
                return { dialogue: 'Hello!', sprite: 'npc_default' }
            case 'object':
                return { itemId: 'potion', quantity: 1 }
            case 'spawn':
                return { playerSpawn: true }
            case 'teleport':
                return { targetMap: '', targetX: 0, targetY: 0 }
            default:
                return {}
        }
    }

    removeObject(index) {
        if (index >= 0 && index < this.placedObjects.length) {
            const obj = this.placedObjects[index]
            
            if (obj.isFromMap) {
                this.adminPanel.showNotification('Impossible de supprimer un objet de la carte', 'warning')
                return
            }
            
            this.placedObjects.splice(index, 1)
            this.renderMap()
            this.adminPanel.showNotification('Objet supprimé', 'info')
        }
    }

    onTabActivated() {
        console.log('🗺️ [MapEditor] Tab activated')
        
        if (this.availableMaps.length === 0) {
            this.loadAvailableMaps()
        }
        
        // Recharger les items si nécessaire
        if (Object.keys(this.availableItems).length === 0) {
            this.loadAvailableItems()
        }
        
        // Configurer les event listeners pour le canvas
        const canvas = document.getElementById('mapCanvas')
        if (canvas && !canvas.hasClickListener) {
            canvas.addEventListener('click', (e) => this.handleCanvasClick(e))
            canvas.hasClickListener = true
        }
    }

    // ==============================
    // MÉTHODES HÉRITÉES (SUITE)
    // ==============================

    loadExistingMapObjects() {
    if (!this.currentMapData || !this.currentMapData.layers) {
        return
    }
    
    console.log('🔍 [MapEditor] Loading existing map objects from TMJ...')
    
    // Chercher les object layers dans la carte TMJ
    const objectLayers = this.currentMapData.layers.filter(layer => 
        layer.type === 'objectgroup' && layer.objects && layer.objects.length > 0
    )
    
    let totalObjects = 0
    
    objectLayers.forEach(layer => {
        console.log(`📋 [MapEditor] Found object layer: "${layer.name}" with ${layer.objects.length} objects`)
        
        layer.objects.forEach(obj => {
            // Convertir les coordonnées pixels en coordonnées tiles
            const tileX = Math.floor(obj.x / this.currentMapData.tilewidth)
            const tileY = Math.floor(obj.y / this.currentMapData.tileheight)
            
            // Déterminer le type d'objet selon le nom
            let objectType = 'object' // par défaut
            
            if (obj.name) {
                const name = obj.name.toLowerCase()
                if (name.includes('spawn') || name.includes('player')) {
                    objectType = 'spawn'
                } else if (name.includes('npc') || name.includes('character')) {
                    objectType = 'npc'
                } else if (name.includes('teleport') || name.includes('portal') || name.includes('door')) {
                    objectType = 'teleport'
                }
            }
            
            // Vérifier les propriétés pour plus de précision
            if (obj.properties) {
                obj.properties.forEach(prop => {
                    if (prop.name === 'type') {
                        objectType = prop.value
                    }
                })
            }
            
            // Ajouter l'objet existant à la liste (lecture seule)
            const existingObject = {
                id: `existing_${obj.id || Date.now()}_${totalObjects}`,
                type: objectType,
                x: tileX,
                y: tileY,
                name: obj.name || `${objectType}_${tileX}_${tileY}`,
                isFromMap: true, // Marquer comme objet de la carte TMJ (lecture seule)
                originalData: obj,
                properties: {
                    width: obj.width,
                    height: obj.height,
                    ...this.extractProperties(obj.properties)
                }
            }
            
            // Vérifier qu'il n'existe pas déjà
            const exists = this.placedObjects.find(existing => 
                existing.x === tileX && existing.y === tileY && existing.isFromMap
            )
            
            if (!exists) {
                this.placedObjects.push(existingObject)
                totalObjects++
            }
        })
    })
    
    console.log(`✅ [MapEditor] Loaded ${totalObjects} existing objects from TMJ`)
    
    if (totalObjects > 0) {
        this.adminPanel.showNotification(`${totalObjects} objets existants chargés depuis la carte TMJ`, 'info')
    }
}

extractProperties(properties) {
    if (!properties || !Array.isArray(properties)) {
        return {}
    }
    
    const props = {}
    properties.forEach(prop => {
        props[prop.name] = prop.value
    })
    return props
}
    
async loadExistingObjects(mapId) {
    try {
        console.log(`🗺️ [MapEditor] Loading gameobjects and NPCs for zone: ${mapId}`)
        
        // Charger les gameobjects ET NPCs sauvegardés
        const response = await this.adminPanel.apiCall(`/maps/${mapId}/gameobjects`)
        
        // ✅ LOGS DE DEBUG - Réponse API brute
        console.log('🔍 [DEBUG] Raw API response:', response)
        console.log('🔍 [DEBUG] Response success:', response.success)
        console.log('🔍 [DEBUG] Response data exists:', !!response.data)
        console.log('🔍 [DEBUG] Objects in response:', response.data?.objects?.length || 0)
        
        if (response.success && response.data && response.data.objects) {
            const allObjects = response.data.objects
            
            // ✅ LOG - Tous les objets reçus
            console.log('🔍 [DEBUG] All objects received from API:', allObjects.map(obj => ({
                id: obj.id,
                type: obj.type,
                name: obj.name,
                x: obj.x,
                y: obj.y,
                hasPosition: !!obj.position,
                sprite: obj.sprite
            })))
            
            console.log(`📦 [MapEditor] Found ${allObjects.length} saved objects (gameobjects + NPCs)`)
            
            // Séparer les NPCs des gameobjects
            const gameObjects = allObjects.filter(obj => obj.type !== 'npc')
            const npcs = allObjects.filter(obj => obj.type === 'npc')
            
            // ✅ LOGS - Après filtrage
            console.log(`🔍 [DEBUG] After filtering:`)
            console.log(`🔍 [DEBUG] - GameObjects: ${gameObjects.length}`)
            console.log(`🔍 [DEBUG] - NPCs: ${npcs.length}`)
            console.log('🔍 [DEBUG] NPCs details:', npcs.map(npc => ({
                id: npc.id,
                name: npc.name,
                x: npc.x,
                y: npc.y,
                type: npc.type,
                npcType: npc.npcType,
                sprite: npc.sprite
            })))
            
            // Compteur pour tracking
            let processedGameObjects = 0
            let processedNPCs = 0
            
            // Traiter les gameobjects
            gameObjects.forEach(obj => {
                const editorObject = {
                    id: `gameobject_${obj.id}`,
                    type: obj.type || 'ground',
                    x: Math.floor((obj.position?.x || obj.x) / this.currentMapData.tilewidth),
                    y: Math.floor((obj.position?.y || obj.y) / this.currentMapData.tileheight),
                    name: obj.itemId || `object_${obj.id}`,
                    itemId: obj.itemId,
                    quantity: obj.quantity || 1,
                    cooldown: obj.cooldown || 24,
                    rarity: obj.rarity || 'common',
                    sprite: obj.sprite,
                    isFromMap: false,
                    searchRadius: obj.searchRadius,
                    itemfinderRadius: obj.itemfinderRadius,
                    position: obj.position || { x: obj.x, y: obj.y }
                }
                
                this.addOrReplaceObject(editorObject)
                processedGameObjects++
            })
            
            // ✅ NOUVEAU : Traiter les NPCs avec logs détaillés
            npcs.forEach(npc => {
                console.log(`👤 [DEBUG] Processing NPC:`, {
                    id: npc.id,
                    name: npc.name,
                    originalX: npc.x,
                    originalY: npc.y,
                    tileX: Math.floor((npc.position?.x || npc.x) / this.currentMapData.tilewidth),
                    tileY: Math.floor((npc.position?.y || npc.y) / this.currentMapData.tileheight),
                    tilewidth: this.currentMapData.tilewidth
                })
                
                const editorNPC = {
                    id: `npc_${npc.id}`,
                    type: 'npc',
                    x: Math.floor((npc.position?.x || npc.x) / this.currentMapData.tilewidth),
                    y: Math.floor((npc.position?.y || npc.y) / this.currentMapData.tileheight),
                    name: npc.name || `NPC_${npc.id}`,
                    sprite: npc.sprite || 'npc_default',
                    direction: npc.direction || 'south',
                    npcType: npc.npcType || npc.customProperties?.originalNPCType || 'dialogue',
                    isFromMap: false, // NPCs sont éditables
                    
                    // Données spécifiques NPC
                    dialogues: npc.dialogues,
                    questsToGive: npc.questsToGive,
                    questsToEnd: npc.questsToEnd,
                    interactionRadius: npc.interactionRadius,
                    customProperties: npc.customProperties || {},
                    position: npc.position || { x: npc.x, y: npc.y }
                }
                
                console.log(`👤 [DEBUG] Created editor NPC:`, {
                    id: editorNPC.id,
                    name: editorNPC.name,
                    tileX: editorNPC.x,
                    tileY: editorNPC.y,
                    sprite: editorNPC.sprite
                })
                
                this.addOrReplaceObject(editorNPC)
                processedNPCs++
            })
            
            const totalProcessed = processedGameObjects + processedNPCs
            
            // ✅ LOGS FINAUX
            console.log(`✅ [MapEditor] Processing complete:`)
            console.log(`✅ [MapEditor] - Processed ${processedGameObjects} gameobjects`)
            console.log(`✅ [MapEditor] - Processed ${processedNPCs} NPCs`)
            console.log(`✅ [MapEditor] - Total objects in editor: ${this.placedObjects.length}`)
            console.log(`✅ [MapEditor] - Objects by type:`, this.placedObjects.reduce((acc, obj) => {
                acc[obj.type] = (acc[obj.type] || 0) + 1
                return acc
            }, {}))
            
            this.adminPanel.showNotification(`${totalProcessed} objets chargés: ${processedGameObjects} gameobjects, ${processedNPCs} NPCs`, 'success')
            
        } else if (response.success && response.created) {
            console.log(`📝 [MapEditor] No existing objects for ${mapId}, starting fresh`)
            this.adminPanel.showNotification(`Nouveau fichier ${mapId} créé`, 'info')
        } else {
            console.log(`⚠️ [MapEditor] Unexpected response format:`, response)
        }
        
    } catch (error) {
        console.error(`❌ [MapEditor] Error in loadExistingObjects:`, error)
        console.log(`📝 [MapEditor] No objects found for ${mapId}:`, error.message)
        
        if (!error.message.includes('404') && !error.message.includes('non trouvé')) {
            this.adminPanel.showNotification(`Erreur chargement objets: ${error.message}`, 'warning')
        }
    }
}

// ✅ MÉTHODE HELPER avec logs
addOrReplaceObject(editorObject) {
    const existsIndex = this.placedObjects.findIndex(existing => 
        existing.x === editorObject.x && 
        existing.y === editorObject.y && 
        !existing.isFromMap
    )
    
    if (existsIndex !== -1) {
        console.log(`🔄 [MapEditor] Replaced existing object at (${editorObject.x}, ${editorObject.y}) - was: ${this.placedObjects[existsIndex].type}, now: ${editorObject.type}`)
        this.placedObjects[existsIndex] = editorObject
    } else {
        console.log(`➕ [MapEditor] Added new ${editorObject.type} object: ${editorObject.name} at (${editorObject.x}, ${editorObject.y})`)
        this.placedObjects.push(editorObject)
    }
}
    
    extractProperties(properties) {
        if (!properties || !Array.isArray(properties)) {
            return {}
        }
        
        const props = {}
        properties.forEach(prop => {
            props[prop.name] = prop.value
        })
        return props
    }

    async loadTilesets(mapData) {
        console.log('🖼️ [MapEditor] Loading tilesets...')
        
        if (!mapData.tilesets || mapData.tilesets.length === 0) {
            console.warn('🖼️ [MapEditor] No tilesets found in map')
            return
        }

        const promises = mapData.tilesets.map(async (tileset) => {
            try {
                if (tileset.tiles || tileset.image) {
                    return this.processTileset(tileset)
                }
                
                if (tileset.source) {
                    const tilesetPath = `/assets/maps/${tileset.source}`
                    console.log(`🖼️ [MapEditor] Loading external tileset: ${tilesetPath}`)
                    
                    try {
                        const response = await fetch(tilesetPath)
                        if (!response.ok) throw new Error(`Tileset not found: ${tilesetPath}`)
                        const externalTileset = await response.json()
                        
                        const fullTileset = {
                            ...externalTileset,
                            firstgid: tileset.firstgid
                        }
                        
                        return this.processTileset(fullTileset)
                    } catch (error) {
                        console.error(`❌ [MapEditor] Error loading external tileset ${tilesetPath}:`, error)
                        return null
                    }
                }
                
            } catch (error) {
                console.error('❌ [MapEditor] Error processing tileset:', error)
                return null
            }
        })

        await Promise.all(promises)
        console.log(`✅ [MapEditor] ${this.tilesets.size} tilesets loaded`)
    }

    async processTileset(tileset) {
        if (!tileset.image) {
            console.warn('🖼️ [MapEditor] Tileset without image:', tileset)
            return null
        }

        const tilesetKey = tileset.firstgid || 1
        
        this.tilesets.set(tilesetKey, {
            firstgid: tileset.firstgid || 1,
            tilewidth: tileset.tilewidth || 16,
            tileheight: tileset.tileheight || 16,
            tilecount: tileset.tilecount || 0,
            columns: tileset.columns || 1,
            image: tileset.image,
            imagewidth: tileset.imagewidth || 256,
            imageheight: tileset.imageheight || 256,
            name: tileset.name || 'unnamed'
        })

        const cleanImageName = tileset.image
            .replace(/\.\.\//g, '')
            .replace(/\/_Sprites\//g, '/')
            .replace(/^_Sprites\//, '')
            .split('/').pop()

        const imagePath = `/assets/sprites/${cleanImageName}`
        console.log(`🖼️ [MapEditor] Loading tileset image: ${imagePath}`)
        
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = () => {
                this.tilesetImages.set(tilesetKey, img)
                console.log(`✅ [MapEditor] Tileset image loaded: ${tileset.name} (${img.width}x${img.height})`)
                resolve(img)
            }
            
            img.onerror = (error) => {
                console.error(`❌ [MapEditor] Failed to load tileset image: ${imagePath}`, error)
                resolve(null)
            }
            
            img.src = imagePath
        })
    }

async loadExistingObjects(mapId) {
    try {
        console.log(`🗺️ [MapEditor] Loading gameobjects for zone: ${mapId}`)
        
        // Charger les gameobjects sauvegardés
        const response = await this.adminPanel.apiCall(`/maps/${mapId}/gameobjects`)
        
        if (response.success && response.data && response.data.objects) {
            const gameObjectsData = response.data
            
            console.log(`📦 [MapEditor] Found ${gameObjectsData.objects.length} saved gameobjects`)
            
            // Convertir chaque objet du format gameobjects vers le format éditeur
            gameObjectsData.objects.forEach(obj => {
                const editorObject = {
                    id: `gameobject_${obj.id}`,
                    type: obj.type || 'ground',
                    // Convertir position pixels vers tiles
                    x: Math.floor(obj.position.x / this.currentMapData.tilewidth),
                    y: Math.floor(obj.position.y / this.currentMapData.tileheight),
                    name: obj.itemId || `object_${obj.id}`,
                    itemId: obj.itemId,
                    quantity: obj.quantity || 1,
                    cooldown: obj.cooldown || 24,
                    rarity: obj.rarity || 'common',
                    sprite: obj.sprite,
                    isFromMap: false, // Ces objets sont éditables
                    searchRadius: obj.searchRadius,
                    itemfinderRadius: obj.itemfinderRadius,
                    // Garder les données originales pour la sauvegarde
                    position: obj.position
                }
                
                console.log(`📍 [MapEditor] Loading object: ${editorObject.name} at (${editorObject.x}, ${editorObject.y})`)
                
                // Vérifier qu'il n'existe pas déjà à cette position
                const existsIndex = this.placedObjects.findIndex(existing => 
                    existing.x === editorObject.x && 
                    existing.y === editorObject.y && 
                    !existing.isFromMap
                )
                
                if (existsIndex !== -1) {
                    // Remplacer l'objet existant
                    this.placedObjects[existsIndex] = editorObject
                    console.log(`🔄 [MapEditor] Replaced existing object at (${editorObject.x}, ${editorObject.y})`)
                } else {
                    // Ajouter le nouvel objet
                    this.placedObjects.push(editorObject)
                    console.log(`➕ [MapEditor] Added new object at (${editorObject.x}, ${editorObject.y})`)
                }
            })
            
            console.log(`✅ [MapEditor] Loaded ${gameObjectsData.objects.length} gameobjects from ${mapId}.json`)
            this.adminPanel.showNotification(`${gameObjectsData.objects.length} objets chargés depuis ${mapId}.json`, 'success')
            
        } else if (response.success && response.created) {
            console.log(`📝 [MapEditor] No existing gameobjects for ${mapId}, starting fresh`)
            this.adminPanel.showNotification(`Nouveau fichier ${mapId}.json créé`, 'info')
        } else {
            console.log(`⚠️ [MapEditor] Unexpected response format:`, response)
        }
        
    } catch (error) {
        console.log(`📝 [MapEditor] No gameobjects found for ${mapId}:`, error.message)
        
        // Ne pas montrer d'erreur si c'est juste qu'il n'y a pas de fichier
        if (!error.message.includes('404') && !error.message.includes('non trouvé')) {
            this.adminPanel.showNotification(`Erreur chargement objets: ${error.message}`, 'warning')
        }
    }
}

    renderMap() {
        if (!this.currentMapData) return

        const canvas = document.getElementById('mapCanvas')
        if (!canvas) {
            console.error('Canvas mapCanvas not found')
            return
        }
        
        const mapWidth = this.currentMapData.width
        const mapHeight = this.currentMapData.height
        const tileWidth = this.currentMapData.tilewidth * this.zoom
        const tileHeight = this.currentMapData.tileheight * this.zoom
        
        const canvasWidth = mapWidth * tileWidth
        const canvasHeight = mapHeight * tileHeight
        
        canvas.style.width = canvasWidth + 'px'
        canvas.style.height = canvasHeight + 'px'
        canvas.style.display = 'block'
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = false
        
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        
        this.drawMapLayers(ctx, tileWidth, tileHeight)
        
        if (this.zoom >= 0.5) {
            this.drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight)
        }
        
        this.drawPlacedObjects(ctx, tileWidth, tileHeight)
        
        this.updateObjectsList()
        
        console.log(`🗺️ [MapEditor] Map rendered - ${mapWidth}x${mapHeight} tiles, ${tileWidth}x${tileHeight}px per tile`)
    }

    drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.lineWidth = 1
        
        for (let x = 0; x <= mapWidth; x++) {
            ctx.beginPath()
            ctx.moveTo(x * tileWidth, 0)
            ctx.lineTo(x * tileWidth, mapHeight * tileHeight)
            ctx.stroke()
        }
        
        for (let y = 0; y <= mapHeight; y++) {
            ctx.beginPath()
            ctx.moveTo(0, y * tileHeight)
            ctx.lineTo(mapWidth * tileWidth, y * tileHeight)
            ctx.stroke()
        }
    }

    drawMapLayers(ctx, tileWidth, tileHeight) {
        if (!this.currentMapData.layers) {
            console.warn('🗺️ [MapEditor] No layers found in map')
            return
        }

        const sortedLayers = this.currentMapData.layers
            .filter(layer => layer.type === 'tilelayer' && layer.data && layer.visible !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))

        sortedLayers.forEach(layer => {
            this.drawTileLayer(ctx, layer, tileWidth, tileHeight)
        })
    }

    drawTileLayer(ctx, layer, tileWidth, tileHeight) {
        if (!layer.data || layer.data.length === 0) {
            return
        }

        const mapWidth = this.currentMapData.width
        const opacity = layer.opacity || 1

        ctx.save()
        ctx.globalAlpha = opacity

        for (let i = 0; i < layer.data.length; i++) {
            const tileId = layer.data[i]
            if (tileId === 0) continue

            const tileX = i % mapWidth
            const tileY = Math.floor(i / mapWidth)
            const x = tileX * tileWidth
            const y = tileY * tileHeight

            const tilesetInfo = this.findTilesetForTile(tileId)
            if (tilesetInfo) {
                this.drawTile(ctx, tileId, tilesetInfo, x, y, tileWidth, tileHeight)
            } else {
                ctx.fillStyle = `hsl(${(tileId * 137) % 360}, 50%, 70%)`
                ctx.fillRect(x, y, tileWidth, tileHeight)
                
                ctx.fillStyle = '#000'
                ctx.font = `${Math.max(8, tileWidth * 0.2)}px Arial`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(tileId.toString(), x + tileWidth/2, y + tileHeight/2)
            }
        }

        ctx.restore()
    }

    findTilesetForTile(tileId) {
        let bestTileset = null
        let bestFirstgid = 0

        for (const [key, tileset] of this.tilesets) {
            if (tileset.firstgid <= tileId && tileset.firstgid > bestFirstgid) {
                bestTileset = tileset
                bestFirstgid = tileset.firstgid
            }
        }

        if (bestTileset && this.tilesetImages.has(bestFirstgid)) {
            return {
                tileset: bestTileset,
                image: this.tilesetImages.get(bestFirstgid),
                localTileId: tileId - bestTileset.firstgid
            }
        }

        return null
    }

    drawTile(ctx, tileId, tilesetInfo, x, y, tileWidth, tileHeight) {
        const { tileset, image, localTileId } = tilesetInfo

        if (!image || !image.complete) {
            ctx.fillStyle = '#ddd'
            ctx.fillRect(x, y, tileWidth, tileHeight)
            ctx.fillStyle = '#999'
            ctx.font = `${Math.max(8, tileWidth * 0.2)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('...', x + tileWidth/2, y + tileHeight/2)
            return
        }

        const tilesPerRow = tileset.columns || Math.floor(tileset.imagewidth / tileset.tilewidth)
        const sourceX = (localTileId % tilesPerRow) * tileset.tilewidth
        const sourceY = Math.floor(localTileId / tilesPerRow) * tileset.tileheight

        try {
            ctx.drawImage(
                image,
                sourceX, sourceY, tileset.tilewidth, tileset.tileheight,
                x, y, tileWidth, tileHeight
            )
        } catch (error) {
            console.warn(`🖼️ [MapEditor] Error drawing tile ${tileId}:`, error)
            ctx.fillStyle = '#f00'
            ctx.fillRect(x, y, tileWidth, tileHeight)
        }
    }

    // ==============================
    // CLEANUP
    // ==============================

    cleanup() {
        this.currentMapData = null
        this.availableMaps = []
        this.placedObjects = []
        this.availableItems = {}
        this.selectedItem = null
        this.tilesets.clear()
        this.tilesetImages.clear()
        
        console.log('🧹 [MapEditor] Module cleanup completed')
    }
}

// Export for global access
export default MapEditorModule
