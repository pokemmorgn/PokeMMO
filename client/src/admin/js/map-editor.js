// PokeWorld Admin Panel - Map Editor Module avec Items Dynamiques
console.log('🔥 FICHIER MODIFIÉ LE 24 JUILLET 2025 - VERSION TEST');

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
        this.selectedNPC = null
        this.npcContextMenu = null
        this.contextMenuVisible = false
        
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

// ✅ CORRECTION COMPLÈTE de getItemDisplayName() dans map-editor.js

getItemDisplayName(item) {
    // ✅ CORRECTION COMPLÈTE: Robuste contre tous les types
    console.log('🔍 [DEBUG] getItemDisplayName called with:', typeof item, item);
    
    // Vérifications de sécurité
    if (!item) return 'Item Inconnu';
    
    // Si c'est un objet
    if (typeof item === 'object') {
        // Priorité 1: propriété 'name'
        if (item.name && typeof item.name === 'string') {
            return item.name;
        }
        
        // Priorité 2: propriété 'itemId'
        if (item.itemId && typeof item.itemId === 'string') {
            return item.itemId.replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Priorité 3: propriété 'id'
        if (item.id && typeof item.id === 'string') {
            return item.id.replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Si l'objet n'a pas les propriétés attendues
        return 'Item Sans Nom';
    }
    
    // Si c'est une chaîne directement
    if (typeof item === 'string') {
        return item.replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    // Si c'est un nombre ou autre type
    if (typeof item === 'number') {
        return `Item ${item}`;
    }
    
    // Fallback ultime
    return 'Item Inconnu';
}

// ✅ PROBLÈME IDENTIFIÉ: Dans renderItemsPanel(), il y a un appel incorrect
// LIGNE PROBLÉMATIQUE:
// displayName: this.getItemDisplayName(item) // ← 'item' est un objet

// ✅ SOLUTION: Corriger l'appel dans renderItemsPanel()
renderItemsPanel() {
    const container = document.getElementById('itemsContainer')
    if (!container) return
    
    console.log('🎨 [MapEditor] Rendering items panel...')
    
    if (!this.availableItems || Object.keys(this.availableItems).length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📦</div>
                <div>Aucun item disponible</div>
                <button onclick="adminPanel.mapEditor.loadAvailableItems()" style="margin-top: 10px; padding: 5px 10px;">
                    Recharger
                </button>
            </div>
        `
        return
    }
    
    // ✅ AJOUTER CE DEBUG
    console.log('🔍 [DEBUG] availableItems type:', typeof this.availableItems);
    console.log('🔍 [DEBUG] availableItems keys:', Object.keys(this.availableItems));
    console.log('🔍 [DEBUG] First item sample:', this.availableItems[Object.keys(this.availableItems)[0]]);
    
    // ✅ GROUPER PAR CATÉGORIE AVEC PROTECTION
    const itemsByCategory = {}
    
    Object.entries(this.availableItems).forEach(([itemId, item]) => {
        try {
            // ✅ PROTECTION SUPPLÉMENTAIRE
            console.log('🔍 [DEBUG] Processing item:', itemId, typeof item, item);
            
            // Déterminer la catégorie de manière robuste
            let category = 'items' // défaut
            
            if (item && typeof item === 'object') {
                if (item.category) {
                    category = item.category
                } else if (item.pocket) {
                    category = item.pocket
                } else if (item.type) {
                    category = item.type
                }
            }
            
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = []
            }
            
            // ✅ ASSURER QUE L'ITEM A UN ID ET CORRIGER L'APPEL getItemDisplayName
            const itemWithId = {
                ...item,
                id: item.itemId || item.id || itemId,
                // ✅ CORRECTION: Passer l'objet item, pas itemId
                displayName: this.getItemDisplayName(item) // ← CORRIGÉ
            }
            
            itemsByCategory[category].push(itemWithId)
            
        } catch (error) {
            console.error('❌ [DEBUG] Error processing item:', itemId, error);
        }
    })
    
    // ✅ AMÉLIORATION: Mapping des catégories pour de meilleurs noms
    const categoryNames = {
        'medicine': '💊 Médecine',
        'pokeballs': '⚽ Pokéballs', 
        'battle_items': '⚔️ Combat',
        'key_items': '🗝️ Objets Clés',
        'berries': '🍓 Baies',
        'machines': '💽 CT/CS',
        'evolution_items': '✨ Évolution',
        'held_items': '👜 Objets Tenus',
        'treasure': '💰 Trésors',
        'balls': '⚽ Balls', // ancien format
        'items': '📦 Divers'
    }
    
    let html = `
        <div style="margin-bottom: 15px;">
            <h3 style="color: #2c3e50; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                📦 Items Disponibles
                <span class="badge badge-info">${Object.keys(this.availableItems).length}</span>
            </h3>
            <input type="text" 
                   placeholder="Rechercher un item..." 
                   onkeyup="filterItems(this.value)"
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
        </div>
    `
    
    // Rendre chaque catégorie
    Object.entries(itemsByCategory).forEach(([category, items]) => {
        const categoryName = categoryNames[category] || `📦 ${category}`
        
        html += `
            <div class="item-category" style="margin-bottom: 15px;">
                <h4 style="color: #34495e; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between;">
                    ${categoryName}
                    <span class="badge badge-secondary">${items.length}</span>
                </h4>
                <div class="items-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
        `
        
        items.forEach(item => {
            const isSelected = this.selectedItemId === item.id
            const price = item.price ? `${item.price}₽` : 'Gratuit'
            
            html += `
                <div class="item-card ${isSelected ? 'selected' : ''}" 
                     onclick="adminPanel.mapEditor.selectItem('${item.id}')"
                     style="
                        padding: 8px; 
                        border: 2px solid ${isSelected ? '#007bff' : '#dee2e6'}; 
                        border-radius: 6px; 
                        cursor: pointer; 
                        text-align: center;
                        background: ${isSelected ? '#e3f2fd' : '#f8f9fa'};
                        transition: all 0.2s ease;
                     "
                     onmouseover="this.style.borderColor='#007bff'"
                     onmouseout="this.style.borderColor='${isSelected ? '#007bff' : '#dee2e6'}'">
                    <div style="font-size: 1.2rem; margin-bottom: 4px;">📦</div>
                    <div style="font-size: 0.75rem; font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                        ${item.displayName}
                    </div>
                    <div style="font-size: 0.7rem; color: #6c757d;">
                        ${price}
                    </div>
                </div>
            `
        })
        
        html += `
                </div>
            </div>
        `
    })
    
    container.innerHTML = html
    console.log(`✅ [MapEditor] Items panel rendered with ${Object.keys(this.availableItems).length} items`)
}

// ✅ CORRECTION SUPPLÉMENTAIRE: Dans selectItem(), corriger l'appel aussi
selectItem(itemId) {
    this.selectedItem = this.availableItems[itemId]
    this.selectedItemId = itemId // ✅ AJOUTER cette ligne pour tracker l'ID
    this.selectedTool = 'object' // Forcer le mode objet
    
    // Mettre à jour l'affichage des outils
    document.querySelectorAll('.btn-tool').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === 'object')
    })
    
    // Mettre à jour l'affichage des items
    this.renderItemsPanel()
    
    console.log(`📦 [MapEditor] Item selected: ${itemId}`)
    // ✅ CORRECTION: Passer l'objet item, pas l'itemId
    this.adminPanel.showNotification(`Item sélectionné: ${this.getItemDisplayName(this.selectedItem)}`, 'info')
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

    // ==============================
    // PLACEMENT D'OBJETS AMÉLIORÉ
    // ==============================

   // Remplacer la méthode handleCanvasClick dans votre fichier map-editor.js

handleCanvasClick(event) {
    if (!this.currentMapData) return

    const canvas = document.getElementById('mapCanvas')
    const rect = canvas.getBoundingClientRect()
    
    const baseTileWidth = this.currentMapData.tilewidth
    const baseTileHeight = this.currentMapData.tileheight
    
    const relativeX = event.clientX - rect.left
    const relativeY = event.clientY - rect.top
    
    const canvasInternalWidth = this.currentMapData.width * baseTileWidth * this.zoom
    const canvasInternalHeight = this.currentMapData.height * baseTileHeight * this.zoom
    
    const scaleX = canvasInternalWidth / rect.width
    const scaleY = canvasInternalHeight / rect.height
    
    const canvasX = relativeX * scaleX
    const canvasY = relativeY * scaleY
    
    const tileX = Math.floor(canvasX / (baseTileWidth * this.zoom))
    const tileY = Math.floor(canvasY / (baseTileHeight * this.zoom))
    
    console.log(`🗺️ [MapEditor] Click at tile (${tileX}, ${tileY})`)
    
    if (tileX < 0 || tileY < 0 || tileX >= this.currentMapData.width || tileY >= this.currentMapData.height) {
        console.warn(`🗺️ [MapEditor] Click outside map bounds`)
        return
    }
    
    // ✅ VÉRIFIER SEULEMENT DANS placedObjects (pas TMJ)
    const existingIndex = this.placedObjects.findIndex(obj => obj.x === tileX && obj.y === tileY)

    if (existingIndex !== -1) {
        const existingObj = this.placedObjects[existingIndex]
        
        // ✅ NPC INTERACTION avec ID stable
        if (existingObj.type === 'npc') {
            this.openNPCEditMenu(existingObj, event.clientX, event.clientY)
            return
        }
        
        // Supprimer autres objets
        this.placedObjects.splice(existingIndex, 1)
        this.adminPanel.showNotification('Objet supprimé', 'info')
    } else {
        // ✅ VÉRIFIER QU'ON N'EST PAS SUR UN OBJET TMJ (lecture seule)
        const tmjObjectAtPosition = this.tmjObjects?.find(obj => obj.x === tileX && obj.y === tileY)
        
        if (tmjObjectAtPosition) {
            this.adminPanel.showNotification(`Objet TMJ en lecture seule: ${tmjObjectAtPosition.name}`, 'warning')
            return
        }
        
        // Ajouter nouvel objet
        if (this.selectedTool === 'object' && this.selectedItem) {
            this.placeItemObject(tileX, tileY)
        } else {
            this.placeGenericObject(tileX, tileY)
        }
    }
    
    this.renderMap()
}
    // ✅ NOUVELLE MÉTHODE: Ouvrir le menu d'édition NPC
openNPCEditMenu(npc, x, y) {
    this.selectedNPC = npc
    
    // Créer le menu contextuel
    this.createNPCContextMenu(x, y)
    
    console.log('👤 [MapEditor] NPC context menu opened for:', npc.name)
}

// ✅ NOUVELLE MÉTHODE: Créer le menu contextuel
createNPCContextMenu(x, y) {
    // Supprimer le menu existant s'il y en a un
    this.closeNPCContextMenu()
    
    const menu = document.createElement('div')
    menu.className = 'npc-context-menu'
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        min-width: 180px;
    `
    
    menu.innerHTML = `
        <div class="npc-menu-header" style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">
            👤 ${this.selectedNPC.name}
        </div>
        <div class="npc-menu-actions" style="padding: 8px;">
            <button class="npc-menu-btn edit-npc" style="width: 100%; margin-bottom: 8px; padding: 8px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
                ✏️ Éditer le NPC
            </button>
            <button class="npc-menu-btn delete-npc" style="width: 100%; padding: 8px; border: none; background: #dc3545; color: white; border-radius: 4px; cursor: pointer;">
                🗑️ Supprimer le NPC
            </button>
        </div>
    `
    
    // Ajouter les event listeners
    menu.querySelector('.edit-npc').addEventListener('click', () => {
        this.editNPC()
        this.closeNPCContextMenu()
    })
    
    menu.querySelector('.delete-npc').addEventListener('click', () => {
        this.deleteNPC()
        this.closeNPCContextMenu()
    })
    
    document.body.appendChild(menu)
    this.npcContextMenu = menu
    
    // Fermer le menu si on clique ailleurs
    setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside.bind(this), { once: true })
    }, 100)
}

// ✅ NOUVELLE MÉTHODE: Fermer le menu contextuel
closeNPCContextMenu() {
    if (this.npcContextMenu) {
        this.npcContextMenu.remove()
        this.npcContextMenu = null
    }
}

// ✅ NOUVELLE MÉTHODE: Gestion des clics à l'extérieur
handleClickOutside(event) {
    if (this.npcContextMenu && !this.npcContextMenu.contains(event.target)) {
        this.closeNPCContextMenu()
    }
}

// ✅ MÉTHODE MODIFIÉE: Éditer le NPC avec appel API
async editNPC() {
    if (!this.selectedNPC) return
    
    console.log('✏️ [MapEditor] Editing NPC via API with stable ID:', this.selectedNPC.globalId || this.selectedNPC.id)
    
    try {
        const currentZone = this.getCurrentZone()
        if (!currentZone) {
            this.adminPanel.showNotification('Zone non définie', 'error')
            return
        }
        
        // ✅ UTILISER L'ID GLOBAL STABLE
        const globalId = this.selectedNPC.globalId || this.selectedNPC.id
        
        if (!globalId) {
            this.adminPanel.showNotification('NPC sans ID global', 'error')
            return
        }
        
        const response = await this.adminPanel.apiCall(`/zones/${currentZone}/npcs/${globalId}/edit`)
        
        if (response.success) {
            // Naviguer vers l'éditeur NPC
            this.adminPanel.switchTab('npcs')
            
            setTimeout(() => {
                if (this.adminPanel.npcEditor) {
                    this.adminPanel.npcEditor.loadNPCFromMapEditor(response.npc, currentZone)
                }
            }, 500)
            
            this.adminPanel.showNotification(`Édition du NPC "${this.selectedNPC.name}" (ID: ${globalId})`, 'info')
        } else {
            throw new Error(response.error)
        }
        
    } catch (error) {
        console.error('❌ [MapEditor] Error loading NPC for edit:', error)
        this.adminPanel.showNotification('Erreur chargement NPC: ' + error.message, 'error')
    }
}

// 7. ✅ CORRECTION de deleteNPC - Utiliser ID stable
async deleteNPC() {
    if (!this.selectedNPC) return
    
    if (!confirm(`Supprimer le NPC "${this.selectedNPC.name}" ?`)) return
    
    try {
        // ✅ UTILISER L'ID GLOBAL STABLE
        const globalId = this.selectedNPC.globalId || this.selectedNPC.id
        
        if (!globalId) {
            console.error(`❌ [MapEditor] Pas d'ID global pour NPC: ${this.selectedNPC.name}`)
            
            // Fallback: suppression locale seulement
            const index = this.placedObjects.findIndex(obj => 
                obj.id === this.selectedNPC.id && obj.type === 'npc'
            )
            
            if (index !== -1) {
                this.placedObjects.splice(index, 1)
                this.renderMap()
                this.adminPanel.showNotification(`NPC "${this.selectedNPC.name}" supprimé (local seulement)`, 'info')
            }
            
            this.selectedNPC = null
            return
        }
        
        const currentZone = this.getCurrentZone()
        if (!currentZone) {
            this.adminPanel.showNotification('Zone non définie', 'error')
            return
        }
        
        console.log(`🗑️ [MapEditor] Deleting NPC with stable global ID: ${globalId}`)
        
        // ✅ UTILISER LA ROUTE AVEC ID GLOBAL STABLE
        const response = await this.adminPanel.apiCall(`/zones/${currentZone}/npcs/${globalId}/delete-from-map`, {
            method: 'DELETE'
        })
        
        if (response.success) {
            // Supprimer de la carte
            const index = this.placedObjects.findIndex(obj => 
                (obj.globalId === globalId || obj.id === globalId) && obj.type === 'npc'
            )
            
            if (index !== -1) {
                this.placedObjects.splice(index, 1)
                this.renderMap()
            }
            
            this.adminPanel.showNotification(`NPC "${this.selectedNPC.name}" supprimé (ID: ${globalId})`, 'success')
        } else {
            throw new Error(response.error)
        }
        
    } catch (error) {
        console.error('❌ [MapEditor] Error deleting NPC with stable ID:', error)
        
        // Fallback: suppression locale
        if (confirm(`Erreur API: ${error.message}\n\nSupprimer le NPC localement ?`)) {
            const index = this.placedObjects.findIndex(obj => 
                (obj.globalId === this.selectedNPC.globalId || obj.id === this.selectedNPC.id) && obj.type === 'npc'
            )
            
            if (index !== -1) {
                this.placedObjects.splice(index, 1)
                this.renderMap()
                this.adminPanel.showNotification(`NPC "${this.selectedNPC.name}" supprimé (local)`, 'info')
            }
        }
    }
    
    this.selectedNPC = null
}

// ✅ NOUVELLE MÉTHODE: Obtenir la zone actuelle
getCurrentZone() {
    const mapSelect = document.getElementById('mapSelect')
    return mapSelect ? mapSelect.value : null
}

// ✅ NOUVELLE MÉTHODE: Convertir au format éditeur NPC
convertToNPCEditorFormat(mapNPC) {
    return {
        id: mapNPC.id,
        name: mapNPC.name,
        type: mapNPC.npcType || mapNPC.type,
        position: {
            x: mapNPC.x * this.currentMapData.tilewidth,
            y: mapNPC.y * this.currentMapData.tileheight
        },
        sprite: mapNPC.sprite,
        direction: mapNPC.direction || 'south',
        interactionRadius: mapNPC.interactionRadius || 32,
        canWalkAway: mapNPC.canWalkAway !== false,
        autoFacePlayer: mapNPC.autoFacePlayer !== false,
        repeatable: mapNPC.repeatable !== false,
        cooldownSeconds: mapNPC.cooldownSeconds || 0,
        // Copier toutes les autres propriétés
        ...mapNPC.customProperties,
        // Marquer comme venant de l'éditeur de carte
        fromMapEditor: true,
        originalMapPosition: { x: mapNPC.x, y: mapNPC.y }
    }
}

 // ✅ MÉTHODE MODIFIÉE: Charger un NPC depuis l'éditeur de carte
loadNPCFromMapEditor(npcData, zoneId) {
    console.log('🗺️ [NPCEditor] Loading NPC from Map Editor:', npcData)
    
    // S'assurer qu'on est sur la bonne zone
    if (zoneId && zoneId !== this.currentZone) {
        this.selectZone(zoneId)
        
        // Attendre que la zone soit chargée
        setTimeout(() => {
            this.loadNPCFromMapEditor(npcData, zoneId)
        }, 1000)
        return
    }
    
    // Charger le NPC dans l'éditeur
    this.selectedNPC = npcData
    this.updateEditorState()
    
    if (this.formBuilder) {
        this.formBuilder.loadNPC(npcData)
    }
    
    // Marquer comme venant de l'éditeur de carte
    this.selectedNPC.fromMapEditor = true
    this.unsavedChanges = true
    
    this.adminPanel.showNotification(`NPC "${npcData.name}" chargé pour édition depuis la carte`, 'success')
}

// ✅ NOUVELLE MÉTHODE: Obtenir l'ID de carte depuis l'éditeur
getMapIdFromMapEditor() {
    const mapSelect = document.getElementById('mapSelect')
    return mapSelect ? mapSelect.value : null
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
        // ✅ Ouvrir le sélecteur de type avant de créer
        this.openNPCTypeSelector(tileX, tileY)
        return // Sortir ici, la création se fait dans la modal
        
    } else {
        // Autres objets
        newObject = {
            id: `${this.selectedTool}_${Date.now()}`,
            type: this.selectedTool,
            x: tileX,
            y: tileY,
            name: `${this.selectedTool}_${tileX}_${tileY}`,
            isFromMap: false,
            properties: this.getDefaultProperties(this.selectedTool)
        }
        
        this.placedObjects.push(newObject)
        this.adminPanel.showNotification(
            `${this.selectedTool.toUpperCase()} placé en (${tileX}, ${tileY})`, 
            'success'
        )
    }
    
    this.renderMap()
}

    openNPCTypeSelector(tileX, tileY) {
    const npcTypes = [
        { id: 'dialogue', name: '💬 Guide/Info', desc: 'Donne des informations aux joueurs' },
        { id: 'merchant', name: '🏪 Marchand', desc: 'Vend des objets dans sa boutique' },
        { id: 'trainer', name: '⚔️ Dresseur', desc: 'Défie le joueur en combat Pokémon' },
        { id: 'healer', name: '💊 Soigneur', desc: 'Soigne les Pokémon du joueur' },
        { id: 'gym_leader', name: '🏆 Champion', desc: 'Leader d\'arène avec badge' },
        { id: 'transport', name: '🚢 Transport', desc: 'Transporte vers d\'autres zones' },
        { id: 'service', name: '🔧 Service', desc: 'Offre des services spécialisés' }
    ]
    
    const modalHTML = `
        <div class="npc-type-selector-modal" id="npcTypeModal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            align-items: center; justify-content: center;
        ">
            <div class="modal-content" style="
                background: white; border-radius: 8px; max-width: 600px; 
                width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <div class="modal-header" style="
                    padding: 20px; border-bottom: 1px solid #eee; display: flex; 
                    justify-content: space-between; align-items: center;
                ">
                    <h3 style="margin: 0;">🎭 Choisissez le type de NPC</h3>
                    <button type="button" class="btn-close" onclick="adminPanel.mapEditor.closeNPCTypeSelector()" 
                            style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <p style="margin-bottom: 20px; color: #666;">
                        Position: <strong>(${tileX}, ${tileY})</strong>
                    </p>
                    <div class="npc-types-grid" style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                        ${npcTypes.map(type => `
                            <div class="npc-type-option" onclick="adminPanel.mapEditor.createNPCOfType('${type.id}', ${tileX}, ${tileY})" 
                                 style="
                                     padding: 16px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; 
                                     display: flex; align-items: center; transition: all 0.2s;
                                 " 
                                 onmouseover="this.style.borderColor='#007bff'; this.style.backgroundColor='#f8f9ff';"
                                 onmouseout="this.style.borderColor='#ddd'; this.style.backgroundColor='white';">
                                <div class="npc-type-icon" style="font-size: 32px; margin-right: 16px;">
                                    ${type.name.split(' ')[0]}
                                </div>
                                <div class="npc-type-info">
                                    <div class="npc-type-name" style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
                                        ${type.name}
                                    </div>
                                    <div class="npc-type-desc" style="color: #666; font-size: 14px;">
                                        ${type.desc}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer" style="padding: 20px; border-top: 1px solid #eee; text-align: right;">
                    <button type="button" class="btn btn-secondary" onclick="adminPanel.mapEditor.closeNPCTypeSelector()"
                            style="padding: 8px 16px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer;">
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHTML)
}

// ✅ Créer le NPC du type choisi
// ✅ OPTION 1: Auto-save complet - Modifier createNPCOfType() dans map-editor.js

async createNPCOfType(npcType, tileX, tileY) {
    console.log(`🎯 [MapEditor] Creating ${npcType} NPC at (${tileX}, ${tileY}) with AUTO-SAVE`)
    
    try {
        const currentZone = this.getCurrentZone()
        if (!currentZone) {
            this.adminPanel.showNotification('Zone non définie', 'error')
            return
        }
        
        // Créer et sauvegarder IMMÉDIATEMENT
        const npcData = {
            name: `${npcType}_${tileX}_${tileY}`,
            type: npcType,
            position: {
                x: tileX * this.currentMapData.tilewidth,
                y: tileY * this.currentMapData.tileheight
            },
            sprite: 'npc_default',
            direction: 'south',
            interactionRadius: 32,
            canWalkAway: true,
            autoFacePlayer: true,
            repeatable: true,
            cooldownSeconds: 0
        }
        
        console.log(`💾 [MapEditor] Creating AND saving NPC automatically...`)
        
        // ✅ CRÉATION + SAUVEGARDE EN UNE FOIS
        const response = await this.adminPanel.apiCall(`/zones/${currentZone}/npcs/add-single`, {
            method: 'POST',
            body: JSON.stringify(npcData)
        })
        
        if (response.success && response.globalId) {
            const newNPC = {
                id: response.globalId,
                globalId: response.globalId,
                type: 'npc',
                x: tileX,
                y: tileY,
                name: npcData.name,
                sprite: npcData.sprite,
                direction: npcData.direction,
                npcType: npcType,
                isFromMap: false,
                
                // ✅ MARQUER COMME COMPLÈTEMENT SAUVEGARDÉ
                isSavedInDB: true,
                isAutoSaved: true,  // ✅ Flag pour indiquer que c'est auto-sauvé
                
                // Propriétés complètes
                interactionRadius: npcData.interactionRadius,
                canWalkAway: npcData.canWalkAway,
                autoFacePlayer: npcData.autoFacePlayer,
                repeatable: npcData.repeatable,
                cooldownSeconds: npcData.cooldownSeconds,
                questsToGive: [],
                questsToEnd: [],
                customProperties: {}
            }
            
            this.placedObjects.push(newNPC)
            
            // ✅ MESSAGE CLAIR : Auto-sauvegardé
            this.adminPanel.showNotification(
                `✅ NPC ${npcType} créé et sauvegardé automatiquement (ID: ${response.globalId})`, 
                'success'
            )
            
            console.log(`✅ [MapEditor] NPC auto-created and auto-saved with global ID: ${response.globalId}`)
            
        } else {
            throw new Error(response.error || 'Pas de globalId retourné')
        }
        
    } catch (error) {
        console.error('❌ [MapEditor] Error auto-creating NPC:', error)
        this.adminPanel.showNotification(`❌ Erreur création NPC: ${error.message}`, 'error')
        return
    }
    
    this.closeNPCTypeSelector()
    this.renderMap()
}

// ✅ Fermer la modal
closeNPCTypeSelector() {
    const modal = document.getElementById('npcTypeModal')
    if (modal) {
        modal.remove()
    }
}
// ✅ NOUVELLE MÉTHODE : Créer un NPC complet selon son type
createCompleteNPC(tileX, tileY, npcType = 'dialogue') {
    // Base NPC
    const baseNPC = {
        id: `npc_${Date.now()}`,
        type: 'npc',
        x: tileX,
        y: tileY,
        name: `NPC_${tileX}_${tileY}`,
        sprite: 'npc_default.png',
        direction: 'south',
        npcType: npcType,
        isFromMap: false,
        
        // Champs communs à tous les NPCs
        interactionRadius: 32,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 0,
        
        // Position au format attendu par l'éditeur
        position: {
            x: tileX * (this.currentMapData?.tilewidth || 32),
            y: tileY * (this.currentMapData?.tileheight || 32)
        }
    }
    
    // ✅ Ajouter les champs spécifiques selon le type
    switch (npcType) {
        case 'dialogue':
            Object.assign(baseNPC, {
                dialogueId: '',
                dialogueIds: [],
                conditionalDialogueIds: {},
                zoneInfo: {}
            })
            break
            
        case 'merchant':
            Object.assign(baseNPC, {
                shopId: '', // ✅ IMPORTANT : Créer le champ vide
                shopType: 'pokemart',
                shopConfig: {},
                shopDialogueIds: {},
                businessHours: {},
                accessRestrictions: {}
            })
            break
            
        case 'trainer':
            Object.assign(baseNPC, {
                trainerId: '',
                trainerClass: 'youngster',
                trainerRank: 1,
                trainerTitle: '',
                battleConfig: {},
                battleDialogueIds: {},
                rewards: {},
                rebattle: {},
                visionConfig: {},
                battleConditions: {},
                progressionFlags: {}
            })
            break
            
        case 'healer':
            Object.assign(baseNPC, {
                healerConfig: {},
                healerDialogueIds: {},
                additionalServices: {},
                serviceRestrictions: {}
            })
            break
            
        case 'gym_leader':
            Object.assign(baseNPC, {
                trainerId: '',
                trainerClass: 'gym_leader',
                gymConfig: {},
                battleConfig: {},
                challengeConditions: {},
                gymDialogueIds: {},
                gymRewards: {},
                rematchConfig: {}
            })
            break
            
        case 'transport':
            Object.assign(baseNPC, {
                transportConfig: {},
                destinations: [],
                schedules: [],
                transportDialogueIds: {},
                weatherRestrictions: {}
            })
            break
            
        case 'service':
            Object.assign(baseNPC, {
                serviceConfig: {},
                availableServices: [],
                serviceDialogueIds: {},
                serviceRestrictions: {}
            })
            break
            
        case 'minigame':
            Object.assign(baseNPC, {
                minigameConfig: {},
                contestCategories: [],
                contestRewards: {},
                contestDialogueIds: {},
                contestSchedule: {}
            })
            break
            
        case 'researcher':
            Object.assign(baseNPC, {
                researchConfig: {},
                researchServices: [],
                acceptedPokemon: {},
                researchDialogueIds: {},
                researchRewards: {}
            })
            break
            
        case 'guild':
            Object.assign(baseNPC, {
                guildConfig: {},
                recruitmentRequirements: {},
                guildServices: [],
                guildDialogueIds: {},
                rankSystem: {}
            })
            break
            
        case 'event':
            Object.assign(baseNPC, {
                eventConfig: {},
                eventPeriod: {},
                eventActivities: [],
                eventDialogueIds: {},
                globalProgress: {}
            })
            break
            
        case 'quest_master':
            Object.assign(baseNPC, {
                questMasterConfig: {},
                questMasterDialogueIds: {},
                questRankSystem: {},
                epicRewards: {},
                specialConditions: {}
            })
            break
            
        default:
            // Type inconnu, juste les champs de base
            break
    }
    
    // Champs communs de quêtes pour tous
    Object.assign(baseNPC, {
        questsToGive: [],
        questsToEnd: [],
        questRequirements: {},
        questDialogueIds: {},
        spawnConditions: {}
    })
    
    console.log(`🎯 [MapEditor] Created complete ${npcType} NPC with all fields:`, Object.keys(baseNPC))
    
    return baseNPC
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
    
    const objectsToSave = [...this.placedObjects]
    const gameObjects = objectsToSave.filter(obj => obj.type !== 'npc')
    
    // ✅ FILTRER : Seulement les NPCs qui ne sont PAS auto-sauvés
    const npcsToSave = objectsToSave.filter(obj => 
        obj.type === 'npc' && 
        (!obj.isAutoSaved && !obj.isSavedInDB)  // ✅ Ignorer ceux déjà sauvés
    )
    
    console.log(`💾 [MapEditor] Saving ${gameObjects.length} gameobjects and ${npcsToSave.length} NPCs (${objectsToSave.filter(obj => obj.type === 'npc').length - npcsToSave.length} NPCs already auto-saved)`)
    
    // 1. Sauvegarder GameObjects
    if (gameObjects.length > 0) {
        await this.saveGameObjects(mapId, gameObjects)
    }
    
    // 2. Sauvegarder NPCs SEULEMENT si il y en a qui ne sont pas auto-sauvés
    if (npcsToSave.length > 0) {
        await this.saveNPCsSmartly(mapId, npcsToSave)
    } else if (objectsToSave.filter(obj => obj.type === 'npc').length > 0) {
        // Il y a des NPCs mais tous déjà sauvés
        this.adminPanel.showNotification('✅ Tous les NPCs sont déjà sauvegardés automatiquement', 'info')
    }
    
    if (gameObjects.length === 0 && npcsToSave.length === 0) {
        const autoSavedNPCs = objectsToSave.filter(obj => obj.type === 'npc' && obj.isAutoSaved).length
        if (autoSavedNPCs > 0) {
            this.adminPanel.showNotification(`✅ ${autoSavedNPCs} NPC(s) déjà sauvegardé(s) automatiquement`, 'success')
        } else {
            this.adminPanel.showNotification('Aucun objet à sauvegarder', 'warning')
        }
    }
}
    
// 10. ✅ NOUVELLE MÉTHODE - Sauvegarder NPCs avec IDs stables (UPDATE ONLY)
async saveNPCsWithStableIds(mapId, npcs) {
    try {
        console.log(`👤 [MapEditor] Saving ${npcs.length} NPCs with stable IDs (UPDATE ONLY)`)
        
        let savedCount = 0
        let errorCount = 0
        
        for (const npc of npcs) {
            try {
                const globalId = npc.globalId || npc.id
                
                if (!globalId) {
                    console.error(`❌ [MapEditor] NPC "${npc.name}" has no stable global ID - skipping`)
                    errorCount++
                    continue
                }
                
                console.log(`🔄 [MapEditor] Updating existing NPC: ${globalId} ("${npc.name}")`)
                
                // ✅ MISE À JOUR SEULEMENT - ID ne change jamais
                const npcUpdateData = {
                    name: npc.name,
                    type: npc.npcType || 'dialogue',
                    position: {
                        x: npc.x * this.currentMapData.tilewidth,
                        y: npc.y * this.currentMapData.tileheight
                    },
                    sprite: npc.sprite || 'npc_default',
                    direction: npc.direction || 'south',
                    interactionRadius: npc.interactionRadius || 32,
                    canWalkAway: npc.canWalkAway !== false,
                    autoFacePlayer: npc.autoFacePlayer !== false,
                    repeatable: npc.repeatable !== false,
                    cooldownSeconds: npc.cooldownSeconds || 0,
                    questsToGive: npc.questsToGive || [],
                    questsToEnd: npc.questsToEnd || [],
                    questRequirements: npc.questRequirements,
                    questDialogueIds: npc.questDialogueIds,
                    spawnConditions: npc.spawnConditions,
                    shopId: npc.shopId,
                    battleConfig: npc.battleConfig,
                    visionConfig: npc.visionConfig,
                    // Copier toutes les propriétés supplémentaires
                    ...npc.customProperties
                }
                
                const response = await this.adminPanel.apiCall(`/zones/${mapId}/npcs/${globalId}/update-single`, {
                    method: 'PUT',
                    body: JSON.stringify({ npcData: npcUpdateData })
                })
                
                if (response.success) {
                    savedCount++
                    console.log(`✅ [MapEditor] NPC updated (ID unchanged): ${globalId}`)
                } else {
                    throw new Error(response.error || 'Erreur mise à jour NPC')
                }
                
            } catch (error) {
                errorCount++
                console.error(`❌ [MapEditor] Error saving NPC "${npc.name}":`, error)
            }
        }
        
        const message = `${savedCount} NPCs sauvegardés dans ${mapId}` + 
                       (errorCount > 0 ? ` (${errorCount} erreurs)` : '')
        
        this.adminPanel.showNotification(message, savedCount > 0 ? 'success' : 'warning')
        
        console.log(`✅ [MapEditor] NPCs save completed: ${savedCount} updated with stable IDs`)
        
    } catch (error) {
        console.error('❌ [MapEditor] Error saving NPCs with stable IDs:', error)
        this.adminPanel.showNotification('Erreur sauvegarde NPCs: ' + error.message, 'error')
    }
}

    // ==============================
// MÉTHODE MANQUANTE À AJOUTER DANS MapEditorModule
// ==============================

async loadAvailableItems() {
    console.log('📦 [MapEditor] Loading available items from MongoDB...')
    
    try {
        // ✅ UTILISER LA NOUVELLE ROUTE
        const response = await this.adminPanel.apiCall('/items/list?limit=1000')
        
        console.log('🔍 [DEBUG] Response received:', response)
        
        if (response.success && response.items) {
            // ✅ Convertir le format "liste" vers le format "objet indexé"
            this.availableItems = {}
            
            response.items.forEach(item => {
                this.availableItems[item.itemId] = {
                    id: item.itemId,
                    itemId: item.itemId,
                    name: item.name,
                    description: item.description,
                    category: item.category,
                    type: item.category, // Compatibilité
                    price: item.price,
                    stackable: item.stackable,
                    sprite: this.getItemSpriteFromCategory(item.category),
                    rarity: item.rarity || 'common',
                    // Données complètes
                    ...item
                }
            })
            
            console.log(`✅ [MapEditor] ${Object.keys(this.availableItems).length} items loaded from new route`)
            
            // Rendre le panel
            if (document.getElementById('itemsContainer')) {
                this.renderItemsPanel()
            }
            return true
            
        } else {
            throw new Error(response.error || 'Aucun item reçu de la nouvelle route')
        }
        
    } catch (error) {
        console.error('❌ [MapEditor] Error loading items from new route:', error)
        this.availableItems = {}
        this.adminPanel.showNotification('Erreur MongoDB: Aucun item chargé - Vérifiez la connexion base de données', 'error')
        return false
    }
}

// ==============================
// MÉTHODES HELPERS POUR LES ITEMS
// ==============================

getItemSpriteFromCategory(category) {
    const spriteMap = {
        'pokeballs': 'pokeball_ground.png',
        'balls': 'pokeball_ground.png', 
        'medicine': 'potion_ground.png',
        'key_items': 'keyitem_ground.png',
        'berries': 'berry_ground.png',
        'machines': 'tm_ground.png',
        'evolution_items': 'evolutionstone_ground.png',
        'held_items': 'item_ground.png',
        'treasure': 'treasure_ground.png',
        'battle_items': 'battleitem_ground.png'
    }
    
    return spriteMap[category] || 'item_ground.png'
}

determineItemRarity(item) {
    // Déterminer la rareté basée sur le prix et la catégorie
    if (item.category === 'key_items' || item.price === 0) {
        return 'rare'
    }
    
    if (item.price && item.price > 10000) {
        return 'rare'
    } else if (item.price && item.price > 1000) {
        return 'uncommon'
    }
    
    return 'common'
}
// ✅ NOUVELLE MÉTHODE: Sauvegarder GameObjects séparément
async saveGameObjects(mapId, gameObjects) {
    try {
        console.log(`💾 [MapEditor] Saving ${gameObjects.length} gameobjects for ${mapId}`)
        
        // Convertir au format unifié pour l'API GameObjects
        const formattedObjects = gameObjects.map((obj, index) => ({
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
        }))
        
        const saveData = {
            zone: mapId,
            version: "2.0.0",
            lastUpdated: new Date().toISOString(),
            description: `${mapId} - GameObjects from map editor`,
            objects: formattedObjects
        }

        const response = await this.adminPanel.apiCall(`/maps/${mapId}/gameobjects`, {
            method: 'POST',
            body: JSON.stringify(saveData)
        })
        
        console.log('✅ [MapEditor] GameObjects saved:', response)
        this.adminPanel.showNotification(
            `${gameObjects.length} gameobjects sauvegardés dans ${mapId}`, 
            'success'
        )
        
    } catch (error) {
        console.error('❌ [MapEditor] Error saving gameobjects:', error)
        this.adminPanel.showNotification('Erreur sauvegarde gameobjects: ' + error.message, 'error')
    }
}

// ✅ NOUVELLE MÉTHODE: Sauvegarder NPCs en mode ADD (sûr)
async saveNPCs(mapId, npcs) {
    try {
        console.log(`👤 [MapEditor] Saving ${npcs.length} NPCs for ${mapId} in ADD mode`)
        
        // ✅ SOLUTION: Sauvegarder chaque NPC individuellement pour éviter la suppression
        let savedCount = 0
        let errorCount = 0
        
        for (const npc of npcs) {
            try {
                // Convertir au format NPC pour l'API
                const npcData = {
                    name: npc.name,
                    type: npc.npcType || 'dialogue',
                    position: {
                        x: npc.position?.x || npc.x * this.currentMapData.tilewidth,
                        y: npc.position?.y || npc.y * this.currentMapData.tileheight
                    },
                    sprite: npc.sprite || 'npc_default',
                    direction: npc.direction || 'south',
                    
                    // Propriétés comportementales
                    interactionRadius: npc.interactionRadius || 32,
                    canWalkAway: npc.canWalkAway || false,
                    autoFacePlayer: npc.autoFacePlayer !== false,
                    repeatable: npc.repeatable !== false,
                    cooldownSeconds: npc.cooldownSeconds || 0,
                    
                    // Données spécifiques du type
                    npcData: npc.npcData || {},
                    
                    // Système de quêtes
                    questsToGive: npc.questsToGive || [],
                    questsToEnd: npc.questsToEnd || [],
                    questRequirements: npc.questRequirements,
                    questDialogueIds: npc.questDialogueIds,
                    
                    // Conditions de spawn
                    spawnConditions: npc.spawnConditions
                }
                
                // ✅ UTILISER LA ROUTE SÉCURISÉE pour ajouter un seul NPC
                const response = await this.adminPanel.apiCall(`/zones/${mapId}/npcs/add-single`, {
                    method: 'POST',
                    body: JSON.stringify(npcData)
                })
                
                if (response.success) {
                    savedCount++
                    console.log(`✅ [MapEditor] NPC "${npc.name}" saved with global ID: ${response.globalId}`)
                    
                    // ✅ IMPORTANT: Mettre à jour l'ID local avec l'ID global attribué
                    npc.id = response.globalId
                    npc.npcId = response.globalId
                } else {
                    throw new Error(response.error || 'Erreur inconnue')
                }
                
            } catch (error) {
                errorCount++
                console.error(`❌ [MapEditor] Error saving NPC "${npc.name}":`, error)
            }
        }
        
        const message = `${savedCount} NPCs sauvegardés dans ${mapId}` + 
                       (errorCount > 0 ? ` (${errorCount} erreurs)` : '')
        
        this.adminPanel.showNotification(message, savedCount > 0 ? 'success' : 'warning')
        
        console.log(`✅ [MapEditor] NPCs saved: ${savedCount}/${npcs.length} successful`)
        
    } catch (error) {
        console.error('❌ [MapEditor] Error saving NPCs:', error)
        this.adminPanel.showNotification('Erreur sauvegarde NPCs: ' + error.message, 'error')
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
    
    // ✅ COMPTER SEULEMENT LES OBJETS ÉDITABLES (pas TMJ)
    objectsCount.textContent = this.placedObjects.length
    
    if (this.placedObjects.length === 0) {
        objectsList.innerHTML = ''
        noObjectsMessage.style.display = 'block'
        return
    }
    
    noObjectsMessage.style.display = 'none'
    
    objectsList.innerHTML = this.placedObjects.map((obj, index) => `
        <div class="object-item editable" style="
            background: #f8f9fa; 
            border: 1px solid #dee2e6; 
            border-radius: 8px; 
            padding: 12px; 
            margin-bottom: 8px;
        ">
            <div class="object-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="object-name" style="font-weight: 600; color: #2c3e50;">
                    ${this.getObjectIcon(obj)} ${obj.name || obj.itemId}
                    ${obj.type === 'npc' && obj.globalId ? 
                        `<span class="badge" style="background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-left: 8px;">ID:${obj.globalId}</span>` : 
                        ''
                    }
                </span>
                <button class="btn btn-danger btn-sm" onclick="adminPanel.mapEditor.removeObject(${index})" 
                        style="padding: 2px 6px; font-size: 0.7rem;">
                    🗑️
                </button>
            </div>
            <div class="object-details" style="font-size: 0.85rem; color: #6c757d;">
                Position: (${obj.x}, ${obj.y})<br>
                ${obj.itemId ? `Item: ${this.getItemDisplayName(obj.itemId)}<br>` : ''}
                ${obj.quantity ? `Quantité: ${obj.quantity}<br>` : ''}
                ${obj.type ? `Type: ${obj.type}` : ''}${obj.rarity ? ` | Rareté: ${obj.rarity}` : ''}
                ${obj.type === 'npc' && obj.globalId ? ` | ID Global: ${obj.globalId}` : ''}
            </div>
        </div>
    `).join('')
}

    
  getObjectIcon(obj) {
    if (obj.itemId && this.availableItems[obj.itemId]) {
        return this.getItemIcon(this.availableItems[obj.itemId])
    }
    
    const icons = {
        npc: '👤',
        object: '📦',
        ground: '📦',
        hidden: '🔍',
        spawn: '🎯',
        teleport: '🌀'
    }
    
    return icons[obj.type] || '❓'
}

    
   drawPlacedObjects(ctx, tileWidth, tileHeight) {
    // ✅ DESSINER LES OBJETS TMJ (lecture seule) EN PREMIER
    if (this.tmjObjects && this.tmjObjects.length > 0) {
        this.tmjObjects.forEach(obj => {
            const x = obj.x * tileWidth
            const y = obj.y * tileHeight
            
            // Style TMJ (lecture seule) - Plus discret
            ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'
            ctx.fillRect(x + 2, y + 2, tileWidth - 4, tileHeight - 4)
            
            // Bordure TMJ
            ctx.strokeStyle = '#666'
            ctx.lineWidth = 1 / this.dpi
            ctx.strokeRect(x + 2, y + 2, tileWidth - 4, tileHeight - 4)
            
            // Icône TMJ
            ctx.fillStyle = '#666'
            ctx.font = `bold ${Math.max(8, tileWidth * 0.25)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('TMJ', x + tileWidth / 2, y + tileHeight / 2)
        })
    }
    
    // ✅ DESSINER LES OBJETS ÉDITABLES PAR-DESSUS
    this.placedObjects.forEach(obj => {
        const x = obj.x * tileWidth
        const y = obj.y * tileHeight
        
        // Couleurs selon le type
        const colors = {
            ground: 'rgba(78, 205, 196, 0.9)',
            hidden: 'rgba(255, 193, 7, 0.9)',
            npc: 'rgba(255, 107, 107, 0.9)',
            spawn: 'rgba(69, 183, 209, 0.9)',
            teleport: 'rgba(155, 89, 182, 0.9)'
        }
        
        // Fond coloré
        ctx.fillStyle = colors[obj.type] || 'rgba(149, 165, 166, 0.8)'
        ctx.fillRect(x + 2, y + 2, tileWidth - 4, tileHeight - 4)
        
        // Bordure
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2 / this.dpi
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
        
        // ✅ INDICATEUR ID GLOBAL pour NPCs
        if (obj.type === 'npc' && obj.globalId) {
            ctx.fillStyle = '#4CAF50'
            ctx.fillRect(x + tileWidth - 8, y + 2, 6, 4)
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
            // === ZONES PRINCIPALES ===
            { id: 'beach', name: '🏖️ Beach', file: 'beach.tmj', category: 'main' },
            { id: 'village', name: '🏘️ Village', file: 'village.tmj', category: 'main' },
            { id: 'lavandia', name: '🏙️ Lavandia', file: 'lavandia.tmj', category: 'main' },
            
            // === ROUTES ===
            { id: 'road1', name: '🛤️ Route 1', file: 'road1.tmj', category: 'route' },
            { id: 'road2', name: '🛤️ Route 2', file: 'road2.tmj', category: 'route' },
            { id: 'road3', name: '🛤️ Route 3', file: 'road3.tmj', category: 'route' },
            
            // === VILLAGE - INTÉRIEURS ===
            { id: 'villagelab', name: '🧪 Laboratoire du Village', file: 'villagelab.tmj', category: 'village_interior' },
            { id: 'villagehouse1', name: '🏠 Maison Village 1', file: 'villagehouse1.tmj', category: 'village_interior' },
            { id: 'villagehouse2', name: '🏠 Maison Village 2', file: 'villagehouse2.tmj', category: 'village_interior' },
            { id: 'villageflorist', name: '🌸 Fleuriste du Village', file: 'villageflorist.tmj', category: 'village_interior' },
            { id: 'villagewindmill', name: '🌾 Moulin du Village', file: 'villagewindmill.tmj', category: 'village_interior' },
            
            // === ROUTES - INTÉRIEURS ===
            { id: 'road1house', name: '🏠 Maison Route 1', file: 'road1house.tmj', category: 'route_interior' },
            { id: 'road1hidden', name: '🔍 Passage Caché Route 1', file: 'road1hidden.tmj', category: 'route_secret' },
            
            // === LAVANDIA - INTÉRIEURS ===
            { id: 'lavandiaanalysis', name: '🔬 Centre d\'Analyse', file: 'lavandiaanalysis.tmj', category: 'lavandia_interior' },
            { id: 'lavandiabossroom', name: '👑 Salle du Boss', file: 'lavandiabossroom.tmj', category: 'lavandia_interior' },
            { id: 'lavandiacelebitemple', name: '🍃 Temple de Celebi', file: 'lavandiacelebitemple.tmj', category: 'lavandia_interior' },
            { id: 'lavandiaequipment', name: '⚔️ Magasin d\'Équipement', file: 'lavandiaequipment.tmj', category: 'lavandia_interior' },
            { id: 'lavandiafurniture', name: '🪑 Magasin de Meubles', file: 'lavandiafurniture.tmj', category: 'lavandia_interior' },
            { id: 'lavandiahealingcenter', name: '❤️ Centre Pokémon', file: 'lavandiahealingcenter.tmj', category: 'lavandia_interior' },
            { id: 'lavandiaresearchlab', name: '🧬 Laboratoire de Recherche', file: 'lavandiaresearchlab.tmj', category: 'lavandia_interior' },
            { id: 'lavandiashop', name: '🛒 Magasin Lavandia', file: 'lavandiashop.tmj', category: 'lavandia_interior' },
            
            // === MAISONS LAVANDIA (1-9) ===
            { id: 'lavandiahouse1', name: '🏠 Maison Lavandia 1', file: 'lavandiahouse1.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse2', name: '🏠 Maison Lavandia 2', file: 'lavandiahouse2.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse3', name: '🏠 Maison Lavandia 3', file: 'lavandiahouse3.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse4', name: '🏠 Maison Lavandia 4', file: 'lavandiahouse4.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse5', name: '🏠 Maison Lavandia 5', file: 'lavandiahouse5.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse6', name: '🏠 Maison Lavandia 6', file: 'lavandiahouse6.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse7', name: '🏠 Maison Lavandia 7', file: 'lavandiahouse7.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse8', name: '🏠 Maison Lavandia 8', file: 'lavandiahouse8.tmj', category: 'lavandia_house' },
            { id: 'lavandiahouse9', name: '🏠 Maison Lavandia 9', file: 'lavandiahouse9.tmj', category: 'lavandia_house' },
            
            // === GROTTES ===
            { id: 'noctherbcave1', name: '🕳️ Grotte de Noctherb 1', file: 'noctherbcave1.tmj', category: 'cave' },
            { id: 'noctherbcave2', name: '🕳️ Grotte de Noctherb 2', file: 'noctherbcave2.tmj', category: 'cave' },
            { id: 'noctherbcave2bis', name: '🕳️ Grotte de Noctherb 2bis', file: 'noctherbcave2bis.tmj', category: 'cave' },
            
            // === WRAITHMOOR ===
            { id: 'wraithmoor', name: '👻 Lande Spectrale', file: 'wraithmoor.tmj', category: 'wraithmoor' },
            { id: 'wraithmoorcimetery', name: '⚰️ Cimetière de la Lande', file: 'wraithmoorcimetery.tmj', category: 'wraithmoor' },
            { id: 'wraithmoormanor1', name: '🏚️ Manoir de la Lande 1', file: 'wraithmoormanor1.tmj', category: 'wraithmoor' }
        ]

        const mapSelect = document.getElementById('mapSelect')
        if (mapSelect) {
            mapSelect.innerHTML = `
                <option value="">Sélectionner une carte...</option>
                <optgroup label="🌍 Zones Principales">
                    <option value="beach">🏖️ Beach</option>
                    <option value="village">🏘️ Village</option>
                    <option value="lavandia">🏙️ Lavandia</option>
                </optgroup>
                <optgroup label="🛤️ Routes">
                    <option value="road1">🛤️ Route 1</option>
                    <option value="road2">🛤️ Route 2</option>
                    <option value="road3">🛤️ Route 3</option>
                </optgroup>
                <optgroup label="🏠 Village - Intérieurs">
                    <option value="villagelab">🧪 Laboratoire du Village</option>
                    <option value="villagehouse1">🏠 Maison Village 1</option>
                    <option value="villagehouse2">🏠 Maison Village 2</option>
                    <option value="villageflorist">🌸 Fleuriste du Village</option>
                    <option value="villagewindmill">🌾 Moulin du Village</option>
                </optgroup>
                <optgroup label="🛤️ Routes - Intérieurs">
                    <option value="road1house">🏠 Maison Route 1</option>
                    <option value="road1hidden">🔍 Passage Caché Route 1</option>
                </optgroup>
                <optgroup label="🏙️ Lavandia - Commerces">
                    <option value="lavandiaanalysis">🔬 Centre d'Analyse</option>
                    <option value="lavandiabossroom">👑 Salle du Boss</option>
                    <option value="lavandiacelebitemple">🍃 Temple de Celebi</option>
                    <option value="lavandiaequipment">⚔️ Magasin d'Équipement</option>
                    <option value="lavandiafurniture">🪑 Magasin de Meubles</option>
                    <option value="lavandiahealingcenter">❤️ Centre Pokémon</option>
                    <option value="lavandiaresearchlab">🧬 Laboratoire de Recherche</option>
                    <option value="lavandiashop">🛒 Magasin Lavandia</option>
                </optgroup>
                <optgroup label="🏠 Lavandia - Maisons">
                    <option value="lavandiahouse1">🏠 Maison Lavandia 1</option>
                    <option value="lavandiahouse2">🏠 Maison Lavandia 2</option>
                    <option value="lavandiahouse3">🏠 Maison Lavandia 3</option>
                    <option value="lavandiahouse4">🏠 Maison Lavandia 4</option>
                    <option value="lavandiahouse5">🏠 Maison Lavandia 5</option>
                    <option value="lavandiahouse6">🏠 Maison Lavandia 6</option>
                    <option value="lavandiahouse7">🏠 Maison Lavandia 7</option>
                    <option value="lavandiahouse8">🏠 Maison Lavandia 8</option>
                    <option value="lavandiahouse9">🏠 Maison Lavandia 9</option>
                </optgroup>
                <optgroup label="🕳️ Grottes">
                    <option value="noctherbcave1">🕳️ Grotte de Noctherb 1</option>
                    <option value="noctherbcave2">🕳️ Grotte de Noctherb 2</option>
                    <option value="noctherbcave2bis">🕳️ Grotte de Noctherb 2bis</option>
                </optgroup>
                <optgroup label="👻 Wraithmoor">
                    <option value="wraithmoor">👻 Lande Spectrale</option>
                    <option value="wraithmoorcimetery">⚰️ Cimetière de la Lande</option>
                    <option value="wraithmoormanor1">🏚️ Manoir de la Lande 1</option>
                </optgroup>
            `
        }

        console.log(`✅ [MapEditor] ${this.availableMaps.length} cartes chargées`)
    }

    async loadMap(mapId) {
    if (!mapId) return

    console.log(`🗺️ [MapEditor] Loading map: ${mapId}`)
    
    // ✅ NETTOYAGE COMPLET AU DÉBUT
    console.log('🧹 [MapEditor] Cleaning all caches and objects...')
    this.tilesets.clear()
    this.tilesetImages.clear()
    this.currentMapData = null
    this.placedObjects = [] // ✅ VIDER COMPLÈTEMENT
    this.tmjObjects = []    // ✅ Objets TMJ séparés
    this.selectedNPC = null
    this.closeNPCContextMenu()

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
        
        // ✅ CHARGER SEULEMENT DEPUIS MONGODB (pas de TMJ pour objets)
        await this.loadObjectsFromDatabaseOnly(mapId)
        
        // ✅ AFFICHER LES OBJETS TMJ (lecture seule, pas dans placedObjects)
        this.loadTMJObjectsForDisplay()
        
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

// 2. ✅ NOUVELLE MÉTHODE - Charger UNIQUEMENT depuis MongoDB
// ✅ Dans map-editor.js, remplace loadObjectsFromDatabaseOnly() par :

async loadObjectsFromDatabaseOnly(mapId) {
    try {
        console.log(`📦 [MapEditor] Loading objects for zone: ${mapId}`)
        
        // ✅ CHARGER LES NPCs DEPUIS LA BONNE ROUTE
        const npcsResponse = await this.adminPanel.apiCall(`/zones/${mapId}/npcs`)
        
        console.log('🔍 [DEBUG] NPCs response:', npcsResponse)
        
        if (npcsResponse.success && npcsResponse.data && npcsResponse.data.npcs) {
            const npcs = npcsResponse.data.npcs
            
            console.log(`👤 [MapEditor] Found ${npcs.length} NPCs in zone ${mapId}`)
            
            npcs.forEach((npc, index) => {
                console.log(`🔍 [DEBUG] Loading NPC ${index}:`, {
                    id: npc.id,
                    globalId: npc.globalId,
                    name: npc.name,
                    x: npc.x,
                    y: npc.y,
                    position: npc.position
                })
                
                // ✅ CONVERSION COORDONNÉES : De pixels vers tiles
                let tileX, tileY
                
                if (npc.position && typeof npc.position.x === 'number') {
                    // Format: { position: { x: pixels, y: pixels } }
                    tileX = Math.floor(npc.position.x / this.currentMapData.tilewidth)
                    tileY = Math.floor(npc.position.y / this.currentMapData.tileheight)
                } else if (typeof npc.x === 'number') {
                    // Format direct: { x: pixels, y: pixels }
                    tileX = Math.floor(npc.x / this.currentMapData.tilewidth)
                    tileY = Math.floor(npc.y / this.currentMapData.tileheight)
                } else {
                    console.error(`❌ [MapEditor] NPC ${npc.name} has invalid coordinates`)
                    return
                }
                
                console.log(`📍 [DEBUG] Coordinate conversion: pixels(${npc.position?.x || npc.x}, ${npc.position?.y || npc.y}) → tiles(${tileX}, ${tileY})`)
                
                const editorNPC = {
                    id: npc.id || npc.globalId,
                    globalId: npc.id || npc.globalId,
                    type: 'npc',
                    x: tileX,
                    y: tileY,
                    name: npc.name,
                    sprite: npc.sprite || 'npc_default',
                    direction: npc.direction || 'south',
                    npcType: npc.type || 'dialogue',
                    isFromMap: false,
                    
                    // ✅ MARQUER COMME DÉJÀ SAUVEGARDÉ
                    isSavedInDB: true,
                    
                    // Propriétés complètes pour édition
                    interactionRadius: npc.interactionRadius || 32,
                    canWalkAway: npc.canWalkAway !== false,
                    autoFacePlayer: npc.autoFacePlayer !== false,
                    repeatable: npc.repeatable !== false,
                    cooldownSeconds: npc.cooldownSeconds || 0,
                    questsToGive: npc.questsToGive || [],
                    questsToEnd: npc.questsToEnd || [],
                    questRequirements: npc.questRequirements,
                    questDialogueIds: npc.questDialogueIds,
                    spawnConditions: npc.spawnConditions,
                    shopId: npc.shopId,
                    battleConfig: npc.battleConfig,
                    visionConfig: npc.visionConfig,
                    customProperties: npc.customProperties || {}
                }
                
                console.log(`✅ [MapEditor] Loaded NPC: ${editorNPC.name} (ID: ${editorNPC.globalId}) at tiles (${editorNPC.x}, ${editorNPC.y})`)
                this.placedObjects.push(editorNPC)
            })
            
            console.log(`✅ [MapEditor] Total ${this.placedObjects.length} NPCs loaded and ready`)
            
        } else {
            console.log(`📝 [MapEditor] No NPCs found for ${mapId}`)
            console.log('🔍 [DEBUG] Response details:', npcsResponse)
        }
        
        // ✅ CHARGER AUSSI LES GAMEOBJECTS SI TU EN AS (optionnel)
        try {
            const gameObjectsResponse = await this.adminPanel.apiCall(`/maps/${mapId}/gameobjects`)
            if (gameObjectsResponse.success && gameObjectsResponse.data?.objects) {
                const gameObjects = gameObjectsResponse.data.objects.filter(obj => obj.type !== 'npc')
                console.log(`📦 [MapEditor] Also loaded ${gameObjects.length} gameobjects`)
                
                gameObjects.forEach(obj => {
                    const editorObject = {
                        id: `gameobject_${obj.id}`,
                        type: obj.type || 'ground',
                        x: Math.floor((obj.position?.x || obj.x || 0) / this.currentMapData.tilewidth),
                        y: Math.floor((obj.position?.y || obj.y || 0) / this.currentMapData.tileheight),
                        name: obj.itemId || obj.name || `object_${obj.id}`,
                        itemId: obj.itemId,
                        quantity: obj.quantity || 1,
                        isFromMap: false
                    }
                    this.placedObjects.push(editorObject)
                })
            }
        } catch (error) {
            console.log('📦 [MapEditor] No gameobjects to load (normal)')
        }
        
    } catch (error) {
        console.error(`❌ [MapEditor] Error loading NPCs:`, error)
        this.adminPanel.showNotification(`Erreur chargement NPCs: ${error.message}`, 'error')
    }
}
// 3. ✅ NOUVELLE MÉTHODE - Charger objets TMJ pour affichage uniquement
loadTMJObjectsForDisplay() {
    if (!this.currentMapData || !this.currentMapData.layers) {
        this.tmjObjects = []
        return
    }
    
    console.log('🎨 [MapEditor] Loading TMJ objects for display only (read-only)...')
    
    // Chercher les object layers dans la carte TMJ
    const objectLayers = this.currentMapData.layers.filter(layer => 
        layer.type === 'objectgroup' && layer.objects && layer.objects.length > 0
    )
    
    // ✅ STOCKER SÉPARÉMENT pour l'affichage (pas dans placedObjects)
    this.tmjObjects = []
    
    objectLayers.forEach(layer => {
        console.log(`📋 [MapEditor] Found TMJ object layer: "${layer.name}" with ${layer.objects.length} objects`)
        
        layer.objects.forEach(obj => {
            const tileX = Math.floor(obj.x / this.currentMapData.tilewidth)
            const tileY = Math.floor(obj.y / this.currentMapData.tileheight)
            
            let objectType = 'object'
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
            
            // ✅ AJOUTER DANS LISTE SÉPARÉE (lecture seule)
            const tmjObject = {
                id: `tmj_${obj.id || Date.now()}`,
                type: objectType,
                x: tileX,
                y: tileY,
                name: obj.name || `${objectType}_${tileX}_${tileY}`,
                isFromTMJ: true, // ✅ Marquer comme TMJ (lecture seule)
                originalData: obj,
                properties: this.extractProperties(obj.properties)
            }
            
            this.tmjObjects.push(tmjObject)
        })
    })
    
    console.log(`✅ [MapEditor] Loaded ${this.tmjObjects.length} TMJ objects for display`)
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
        
        // ✅ ATTENTION: Si c'est un NPC, on supprime juste localement
        // La suppression en base se fait via le menu contextuel
        if (obj.type === 'npc') {
            if (confirm(`Supprimer le NPC "${obj.name}" de la carte ?\n(Ceci supprimera aussi le NPC de la base de données)`)) {
                // Supprimer localement ET en base
                this.selectedNPC = obj
                this.deleteNPC()
            }
            return
        }
        
        // Pour les autres objets, suppression locale simple
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
        // VERSION_2024_FIX_NPCs_v2 - Ne pas supprimer cette ligne

    try {
        console.log(`🗺️ [MapEditor] Loading gameobjects and NPCs for zone: ${mapId}`)
        
        const response = await this.adminPanel.apiCall(`/maps/${mapId}/gameobjects`)
        console.log('🔍 [DEBUG] API Response received, processing...')
        
        if (response.success && response.data && response.data.objects) {
            const allObjects = response.data.objects
            console.log(`📦 [MapEditor] Found ${allObjects.length} saved objects`)
            
            // Séparer gameobjects et NPCs
            const gameObjects = allObjects.filter(obj => obj.type !== 'npc')
            const npcs = allObjects.filter(obj => obj.type === 'npc')
            
            console.log(`📊 [MapEditor] GameObjects: ${gameObjects.length}, NPCs: ${npcs.length}`)
            
            // Traiter les gameobjects
            gameObjects.forEach(obj => {
                if (obj.position || (obj.x !== undefined && obj.y !== undefined)) {
                    const editorObject = {
                        id: `gameobject_${obj.id}`,
                        type: obj.type || 'ground',
                        x: Math.floor((obj.position?.x || obj.x || 0) / this.currentMapData.tilewidth),
                        y: Math.floor((obj.position?.y || obj.y || 0) / this.currentMapData.tileheight),
                        name: obj.itemId || obj.name || `object_${obj.id}`,
                        itemId: obj.itemId,
                        quantity: obj.quantity || 1,
                        cooldown: obj.cooldown || 24,
                        rarity: obj.rarity || 'common',
                        sprite: obj.sprite,
                        isFromMap: false
                    }
                    this.placedObjects.push(editorObject)
                }
            })
            
            // ✅ Traiter les NPCs avec les coordonnées en pixels
            npcs.forEach(npc => {
                if (npc.x !== undefined && npc.y !== undefined) {
                    const editorNPC = {
                        id: `npc_${npc.id}`,
                        type: 'npc',
                        x: Math.floor(npc.x / this.currentMapData.tilewidth),
                        y: Math.floor(npc.y / this.currentMapData.tileheight),
                        name: npc.name || `NPC_${npc.id}`,
                        sprite: npc.sprite || 'npc_default',
                        direction: npc.direction || 'south',
                        npcType: npc.npcType || 'dialogue',
                        isFromMap: false,
                        customProperties: npc.customProperties || {}
                    }
                    
                    console.log(`👤 [MapEditor] Added NPC: ${editorNPC.name} at tile (${editorNPC.x}, ${editorNPC.y})`)
                    this.placedObjects.push(editorNPC)
                }
            })
            
            console.log(`✅ [MapEditor] Total objects loaded: ${this.placedObjects.filter(obj => !obj.isFromMap).length}`)
            this.adminPanel.showNotification(`${gameObjects.length} gameobjects et ${npcs.length} NPCs chargés`, 'success')
            
        } else {
            console.log(`📝 [MapEditor] No objects found for ${mapId}`)
        }
        
    } catch (error) {
        console.error(`❌ [MapEditor] Error loading objects:`, error)
        this.adminPanel.showNotification(`Erreur chargement objets: ${error.message}`, 'error')
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

    // ✅ REMPLACER AUSSI la méthode renderMap() dans votre fichier

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
    
    // ✅ CORRECTION : Définir explicitement les tailles CSS et internes
    const canvasWidth = mapWidth * tileWidth
    const canvasHeight = mapHeight * tileHeight
    
    // Taille CSS (ce que l'utilisateur voit)
    canvas.style.width = canvasWidth + 'px'
    canvas.style.height = canvasHeight + 'px'
    canvas.style.display = 'block'
    
    // ✅ IMPORTANT : Taille interne du canvas = taille CSS (pas de différence)
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    
    // ✅ NOUVEAU : Pas de scale supplémentaire, le zoom est déjà appliqué dans les dimensions
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    this.drawMapLayers(ctx, tileWidth, tileHeight)
    
    if (this.zoom >= 0.5) {
        this.drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight)
    }
    
    this.drawPlacedObjects(ctx, tileWidth, tileHeight)
    
    this.updateObjectsList()
    
    console.log(`🗺️ [MapEditor] Map rendered - ${mapWidth}x${mapHeight} tiles, ${tileWidth}x${tileHeight}px per tile, canvas: ${canvasWidth}x${canvasHeight}px`)
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

    // 18. ✅ NOUVELLE MÉTHODE - Statistiques des objets chargés
getObjectsStats() {
    const stats = {
        total: this.placedObjects.length,
        tmj: this.tmjObjects ? this.tmjObjects.length : 0,
        byType: {},
        npcsWithGlobalIds: 0
    }
    
    this.placedObjects.forEach(obj => {
        stats.byType[obj.type] = (stats.byType[obj.type] || 0) + 1
        
        if (obj.type === 'npc' && obj.globalId) {
            stats.npcsWithGlobalIds++
        }
    })
    
    return stats
}


    
// 19. ✅ MÉTHODE DEBUG - Vérifier l'état du MapEditor
debugMapEditorState() {
    console.log('🔍 [MapEditor Debug] Current State:')
    console.log('  📍 Current Map:', this.currentMapData?.properties?.name || 'None')
    console.log('  📦 Placed Objects:', this.placedObjects.length)
    console.log('  🎨 TMJ Objects:', this.tmjObjects ? this.tmjObjects.length : 0)
    console.log('  📊 Objects by type:', this.getObjectsStats().byType)
    console.log('  👤 NPCs with stable IDs:', this.getObjectsStats().npcsWithGlobalIds)
    console.log('  ✅ TMJ/DB separation:', this.placedObjects.length > 0 && this.tmjObjects?.length > 0 ? 'Working' : 'Single source')
    
    // Vérifier les doublons potentiels
    const positions = new Map()
    let duplicates = 0
    
    this.placedObjects.forEach(obj => {
        const key = `${obj.x},${obj.y}`
        if (positions.has(key)) {
            duplicates++
            console.warn(`  ⚠️ Duplicate at (${obj.x}, ${obj.y}):`, positions.get(key).name, 'vs', obj.name)
        } else {
            positions.set(key, obj)
        }
    })
    
    console.log('  🔍 Duplicates found:', duplicates)
    
    return this.getObjectsStats()
}

   async forceReloadMap() {
    const currentMapId = this.getCurrentZone()
    if (!currentMapId) {
        this.adminPanel.showNotification('Aucune carte chargée', 'warning')
        return
    }
    
    console.log(`🔄 [MapEditor] Force reloading map: ${currentMapId}`)
    
    // Nettoyage complet et rechargement
    await this.loadMap(currentMapId)
    
    this.adminPanel.showNotification(`Carte ${currentMapId} rechargée complètement`, 'success')
}
    
    // ==============================
    // CLEANUP
    // ==============================

    cleanup() {
        this.currentMapData = null
        this.availableMaps = []
        this.placedObjects = []
            this.tmjObjects = []      // ✅ Nettoyer aussi TMJ=
        this.availableItems = {}
        this.selectedItem = null
        this.tilesets.clear()
        this.tilesetImages.clear()
            this.selectedNPC = null
    this.closeNPCContextMenu() // Fermer le menu s'il est ouvert
    this.contextMenuVisible = false
    console.log('🧹 [MapEditor] Complete cleanup with stable IDs completed')
    }
}

// Export for global access
export default MapEditorModule
