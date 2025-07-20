// PokeWorld Admin Panel - Map Editor Module (Version avec correction DPI)

export class MapEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'mapEditor'
        this.currentMapData = null
        this.availableMaps = []
        this.placedObjects = []
        this.selectedTool = 'npc'
        this.zoom = 1
        this.tileSize = 16
        this.dpi = window.devicePixelRatio || 1
        
        console.log('🗺️ [MapEditor] Module initialized with DPI:', this.dpi)
        this.init()
    }

    init() {
        console.log('🗺️ [MapEditor] Initialisation terminée - onglet déjà présent dans le HTML')
    }

    // Fonction pour corriger le DPI du canvas
    fixCanvasDPI(canvas) {
        const ctx = canvas.getContext('2d')
        
        // Obtenir les dimensions CSS
        const rect = canvas.getBoundingClientRect()
        const cssWidth = rect.width
        const cssHeight = rect.height
        
        // Ajuster les dimensions du canvas pour le DPI
        canvas.width = cssWidth * this.dpi
        canvas.height = cssHeight * this.dpi
        
        // Réajuster les dimensions CSS pour maintenir la taille d'affichage
        canvas.style.width = cssWidth + 'px'
        canvas.style.height = cssHeight + 'px'
        
        // Appliquer le scaling au contexte
        ctx.scale(this.dpi, this.dpi)
        
        // Désactiver le lissage pour les pixels art
        ctx.imageSmoothingEnabled = false
        ctx.imageSmoothingQuality = 'high'
        
        console.log(`🗺️ [MapEditor] Canvas DPI corrected - CSS: ${cssWidth}x${cssHeight}, Canvas: ${canvas.width}x${canvas.height}, DPI: ${this.dpi}`)
        
        return ctx
    }

    async loadAvailableMaps() {
        console.log('🗺️ [MapEditor] Loading available maps...')
        
        try {
            // Essayer de charger depuis l'API
            const response = await this.adminPanel.apiCall('/maps/list')
            this.availableMaps = response.maps || []
        } catch (error) {
            console.log('🗺️ [MapEditor] API not available, using default maps')
            // Liste par défaut basée sur vos fichiers
            this.availableMaps = [
                { id: 'wraithmoormanor1', name: 'Wraithmoor Manor 1', file: 'wraithmoormanor1.tmj' },
                { id: 'beach', name: 'Beach', file: 'beach.tmj' },
                { id: 'village', name: 'Village', file: 'village.tmj' },
                { id: 'lavandia', name: 'Lavandia', file: 'lavandia.tmj' }
            ]
        }

        // Remplir le select
        const mapSelect = document.getElementById('mapSelect')
        if (mapSelect) {
            mapSelect.innerHTML = '<option value="">Sélectionner une carte...</option>' +
                this.availableMaps.map(map => 
                    `<option value="${map.id}">${map.name}</option>`
                ).join('')
        }

        console.log(`✅ [MapEditor] ${this.availableMaps.length} cartes disponibles`)
    }

    async loadMap(mapId) {
        if (!mapId) return
        
        console.log(`🗺️ [MapEditor] Loading map: ${mapId}`)
        
        try {
            // Charger le fichier TMJ
            const mapFile = this.availableMaps.find(m => m.id === mapId)?.file || `${mapId}.tmj`
            
            let mapData
            try {
                // Essayer de lire depuis le système de fichiers
                const fileContent = await window.fs.readFile(`client/public/assets/maps/${mapFile}`, { encoding: 'utf8' })
                mapData = JSON.parse(fileContent)
            } catch (fsError) {
                // Fallback: essayer de charger depuis l'API ou URL publique
                const response = await fetch(`/assets/maps/${mapFile}`)
                if (!response.ok) throw new Error('Carte non trouvée')
                mapData = await response.json()
            }

            this.currentMapData = mapData
            
            // Charger les objets existants
            await this.loadExistingObjects(mapId)
            
            // Afficher la carte
            this.renderMap()
            
            // Afficher les outils
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

    async loadExistingObjects(mapId) {
        try {
            // Essayer de charger les objets existants depuis l'API
            const response = await this.adminPanel.apiCall(`/maps/${mapId}/objects`)
            this.placedObjects = response.objects || []
        } catch (error) {
            console.log('🗺️ [MapEditor] No existing objects found, starting fresh')
            this.placedObjects = []
        }
    }

    renderMap() {
        if (!this.currentMapData) return

        const canvas = document.getElementById('mapCanvas')
        if (!canvas) {
            console.error('Canvas mapCanvas not found')
            return
        }
        
        // Calculer les dimensions logiques (avant DPI)
        const mapWidth = this.currentMapData.width
        const mapHeight = this.currentMapData.height
        const tileWidth = this.currentMapData.tilewidth * this.zoom
        const tileHeight = this.currentMapData.tileheight * this.zoom
        
        // Définir les dimensions CSS du canvas
        const canvasWidth = mapWidth * tileWidth
        const canvasHeight = mapHeight * tileHeight
        
        canvas.style.width = canvasWidth + 'px'
        canvas.style.height = canvasHeight + 'px'
        canvas.style.display = 'block'
        
        // Corriger le DPI
        const ctx = this.fixCanvasDPI(canvas)
        
        // Effacer le canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        
        // Dessiner le fond (grille)
        this.drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight)
        
        // Dessiner les layers de la carte
        this.drawMapLayers(ctx, tileWidth, tileHeight)
        
        // Dessiner les objets placés
        this.drawPlacedObjects(ctx, tileWidth, tileHeight)
        
        // Mettre à jour l'affichage des objets
        this.updateObjectsList()
        
        console.log(`🗺️ [MapEditor] Map rendered - ${mapWidth}x${mapHeight} tiles, ${tileWidth}x${tileHeight}px per tile`)
    }

    drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight) {
        ctx.strokeStyle = '#e0e0e0'
        ctx.lineWidth = 1 / this.dpi // Ajuster pour le DPI
        
        // Lignes verticales
        for (let x = 0; x <= mapWidth; x++) {
            ctx.beginPath()
            ctx.moveTo(x * tileWidth, 0)
            ctx.lineTo(x * tileWidth, mapHeight * tileHeight)
            ctx.stroke()
        }
        
        // Lignes horizontales
        for (let y = 0; y <= mapHeight; y++) {
            ctx.beginPath()
            ctx.moveTo(0, y * tileHeight)
            ctx.lineTo(mapWidth * tileWidth, y * tileHeight)
            ctx.stroke()
        }
    }

    drawMapLayers(ctx, tileWidth, tileHeight) {
        // Version simplifiée : dessiner un fond coloré basé sur les tile IDs
        this.currentMapData.layers.forEach(layer => {
            if (layer.type === 'tilelayer' && layer.data) {
                for (let i = 0; i < layer.data.length; i++) {
                    const tileId = layer.data[i]
                    if (tileId > 0) {
                        const x = (i % this.currentMapData.width) * tileWidth
                        const y = Math.floor(i / this.currentMapData.width) * tileHeight
                        
                        // Colorer selon l'ID de tile (version simplifiée)
                        const hue = (tileId * 137) % 360
                        ctx.fillStyle = `hsla(${hue}, 30%, 80%, 0.8)`
                        ctx.fillRect(x, y, tileWidth, tileHeight)
                        
                        // Ajouter le numéro de tile pour debug
                        ctx.fillStyle = '#333'
                        ctx.font = `${Math.max(8, tileWidth * 0.3)}px Arial`
                        ctx.textAlign = 'center'
                        ctx.textBaseline = 'middle'
                        ctx.fillText(tileId.toString(), x + tileWidth/2, y + tileHeight/2)
                    }
                }
            }
        })
    }

    drawPlacedObjects(ctx, tileWidth, tileHeight) {
        this.placedObjects.forEach(obj => {
            const x = obj.x * tileWidth
            const y = obj.y * tileHeight
            
            // Couleur selon le type
            const colors = {
                npc: '#ff6b6b',
                object: '#4ecdc4', 
                spawn: '#45b7d1',
                teleport: '#9b59b6'
            }
            
            ctx.fillStyle = colors[obj.type] || '#95a5a6'
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
            
            const icons = {
                npc: '👤',
                object: '📦',
                spawn: '🎯',
                teleport: '🌀'
            }
            
            ctx.fillText(
                icons[obj.type] || '?',
                x + tileWidth / 2,
                y + tileHeight / 2
            )
        })
    }

    selectTool(tool) {
        this.selectedTool = tool
        
        // Mettre à jour l'UI
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

    handleCanvasClick(event) {
        if (!this.currentMapData) return

        const canvas = document.getElementById('mapCanvas')
        const rect = canvas.getBoundingClientRect()
        
        const tileWidth = this.currentMapData.tilewidth * this.zoom
        const tileHeight = this.currentMapData.tileheight * this.zoom
        
        // Ajuster pour le DPI
        const x = (event.clientX - rect.left)
        const y = (event.clientY - rect.top)
        
        const tileX = Math.floor(x / tileWidth)
        const tileY = Math.floor(y / tileHeight)
        
        console.log(`🗺️ [MapEditor] Click at (${x}, ${y}) -> tile (${tileX}, ${tileY})`)
        
        // Vérifier si on clique sur un objet existant
        const existingIndex = this.placedObjects.findIndex(obj => obj.x === tileX && obj.y === tileY)
        
        if (existingIndex !== -1) {
            // Supprimer l'objet existant
            this.placedObjects.splice(existingIndex, 1)
            this.adminPanel.showNotification('Objet supprimé', 'info')
        } else {
            // Ajouter un nouvel objet
            const newObject = {
                id: `${this.selectedTool}_${Date.now()}`,
                type: this.selectedTool,
                x: tileX,
                y: tileY,
                name: `${this.selectedTool}_${tileX}_${tileY}`,
                properties: this.getDefaultProperties(this.selectedTool)
            }
            
            this.placedObjects.push(newObject)
            this.adminPanel.showNotification(`${this.selectedTool.toUpperCase()} placé en (${tileX}, ${tileY})`, 'success')
        }
        
        this.renderMap()
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
        
        const icons = {
            npc: '👤',
            object: '📦',
            spawn: '🎯',
            teleport: '🌀'
        }
        
        objectsList.innerHTML = this.placedObjects.map((obj, index) => `
            <div class="object-item" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: #2c3e50;">
                        ${icons[obj.type]} ${obj.name}
                    </span>
                    <button class="btn btn-danger btn-sm" onclick="adminPanel.mapEditor.removeObject(${index})" style="padding: 2px 6px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div style="font-size: 0.85rem; color: #6c757d;">
                    Position: (${obj.x}, ${obj.y})<br>
                    Type: ${obj.type}
                </div>
            </div>
        `).join('')
    }

    removeObject(index) {
        if (index >= 0 && index < this.placedObjects.length) {
            this.placedObjects.splice(index, 1)
            this.renderMap()
            this.adminPanel.showNotification('Objet supprimé', 'info')
        }
    }

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

        console.log('💾 [MapEditor] Saving map objects...')
        
        const saveData = {
            mapId: mapId,
            mapName: this.availableMaps.find(m => m.id === mapId)?.name || mapId,
            objects: this.placedObjects,
            timestamp: new Date().toISOString(),
            totalObjects: this.placedObjects.length
        }

        try {
            // Essayer de sauvegarder via l'API
            await this.adminPanel.apiCall(`/maps/${mapId}/objects`, {
                method: 'POST',
                body: JSON.stringify(saveData)
            })
            
            this.adminPanel.showNotification('Objets sauvegardés sur le serveur', 'success')
        } catch (error) {
            console.log('🗺️ [MapEditor] API save failed, downloading JSON file instead')
            
            // Fallback: télécharger en tant que fichier JSON
            this.downloadObjectsJSON(saveData)
            this.adminPanel.showNotification('Fichier JSON téléchargé', 'success')
        }
    }

    downloadObjectsJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `map_objects_${data.mapId}_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        
        URL.revokeObjectURL(url)
    }

    // Méthode appelée quand l'onglet maps devient actif
    onTabActivated() {
        console.log('🗺️ [MapEditor] Tab activated')
        
        if (this.availableMaps.length === 0) {
            this.loadAvailableMaps()
        }
        
        // Configurer les event listeners pour le canvas
        const canvas = document.getElementById('mapCanvas')
        if (canvas && !canvas.hasClickListener) {
            canvas.addEventListener('click', (e) => this.handleCanvasClick(e))
            canvas.hasClickListener = true
        }
    }

    // Cleanup
    cleanup() {
        this.currentMapData = null
        this.availableMaps = []
        this.placedObjects = []
        
        console.log('🧹 [MapEditor] Module cleanup completed')
    }
}

// Export for global access
export default MapEditorModule
