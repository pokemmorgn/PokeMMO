// PokeWorld Admin Panel - Map Editor Module

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
        
        console.log('🗺️ [MapEditor] Module initialized')
        this.init()
    }

    init() {
        // Ajouter l'onglet dans le menu admin après initialisation
        setTimeout(() => this.addMapEditorTab(), 2000)
    }

    addMapEditorTab() {
        console.log('🗺️ [MapEditor] Adding map editor tab...')
        
        // Vérifier si l'onglet existe déjà
        if (document.querySelector('[data-tab="maps"]')) {
            console.log('Map editor tab already exists')
            return
        }

        // Ajouter l'onglet dans la navigation
        const navTabs = document.querySelector('.nav-tabs')
        if (navTabs) {
            const mapTab = document.createElement('button')
            mapTab.className = 'tab-btn'
            mapTab.setAttribute('data-tab', 'maps')
            mapTab.innerHTML = '<i class="fas fa-map"></i> Cartes'
            navTabs.appendChild(mapTab)
        }

        // Créer le panel des cartes
        const mainContent = document.querySelector('.main-content')
        if (mainContent) {
            const mapPanel = document.createElement('div')
            mapPanel.className = 'panel'
            mapPanel.id = 'maps'
            mapPanel.innerHTML = this.createMapEditorHTML()
            mainContent.appendChild(mapPanel)
        }

        console.log('✅ Map editor tab added successfully')
    }

    createMapEditorHTML() {
        return `
            <div class="map-editor-container" style="height: 100%; display: flex; flex-direction: column;">
                <!-- Toolbar -->
                <div class="map-toolbar" style="background: white; padding: 15px; border-bottom: 2px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <h3 style="margin: 0; color: #2c3e50;">
                                <i class="fas fa-map"></i> Éditeur de Cartes
                            </h3>
                            
                            <select id="mapSelect" class="form-select" style="min-width: 200px;" onchange="adminPanel.mapEditor.loadMap(this.value)">
                                <option value="">Sélectionner une carte...</option>
                            </select>
                        </div>

                        <div id="mapTools" style="display: none; flex: 1; justify-content: center; gap: 10px;">
                            <button class="btn btn-tool ${this.selectedTool === 'npc' ? 'active' : ''}" data-tool="npc" onclick="adminPanel.mapEditor.selectTool('npc')">
                                <i class="fas fa-users"></i> NPC
                            </button>
                            <button class="btn btn-tool ${this.selectedTool === 'object' ? 'active' : ''}" data-tool="object" onclick="adminPanel.mapEditor.selectTool('object')">
                                <i class="fas fa-cube"></i> Objet
                            </button>
                            <button class="btn btn-tool ${this.selectedTool === 'spawn' ? 'active' : ''}" data-tool="spawn" onclick="adminPanel.mapEditor.selectTool('spawn')">
                                <i class="fas fa-map-marker-alt"></i> Spawn
                            </button>
                            <button class="btn btn-tool ${this.selectedTool === 'teleport' ? 'active' : ''}" data-tool="teleport" onclick="adminPanel.mapEditor.selectTool('teleport')">
                                <i class="fas fa-portal-exit"></i> Téléport
                            </button>
                        </div>

                        <div id="mapActions" style="display: none; align-items: center; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <label style="font-weight: 500;">Zoom:</label>
                                <input type="range" id="zoomSlider" min="0.5" max="3" step="0.1" value="1" 
                                       onchange="adminPanel.mapEditor.setZoom(this.value)" style="width: 80px;">
                                <span id="zoomValue">100%</span>
                            </div>
                            
                            <button class="btn btn-success" onclick="adminPanel.mapEditor.saveMapObjects()">
                                <i class="fas fa-save"></i> Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Zone principale -->
                <div style="flex: 1; display: flex; min-height: 0;">
                    <!-- Canvas de la carte -->
                    <div id="mapCanvasContainer" style="flex: 1; background: #f8f9fa; position: relative; overflow: auto;">
                        <div id="mapLoadingMessage" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6c757d;">
                            <div style="text-align: center;">
                                <i class="fas fa-map-marked-alt" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                                <h4>Sélectionnez une carte pour commencer</h4>
                                <p>Choisissez une carte TMJ dans la liste ci-dessus</p>
                            </div>
                        </div>
                        
                        <canvas id="mapCanvas" style="display: none; cursor: crosshair; border: 2px solid #007bff; border-radius: 8px; margin: 20px;"></canvas>
                    </div>

                    <!-- Panel des objets -->
                    <div id="objectsPanel" style="width: 350px; background: white; border-left: 2px solid #e9ecef; padding: 20px; overflow-y: auto; display: none;">
                        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
                            <h4 style="margin: 0; color: #2c3e50;">
                                <i class="fas fa-layer-group"></i> Objets Placés
                            </h4>
                            <span id="objectsCount" class="badge badge-primary">0</span>
                        </div>
                        
                        <div id="objectsList" style="space-y: 10px;">
                            <!-- Les objets seront ajoutés ici dynamiquement -->
                        </div>
                        
                        <div id="noObjectsMessage" style="text-align: center; padding: 40px; color: #6c757d;">
                            <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 15px; opacity: 0.3;"></i>
                            <p>Aucun objet placé</p>
                            <small>Cliquez sur la carte pour placer des objets</small>
                        </div>
                    </div>
                </div>

                <!-- Instructions -->
                <div style="background: #e8f4fd; border-top: 2px solid #007bff; padding: 12px;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 30px; font-size: 0.9rem; color: #0066cc;">
                        <span><strong>Instructions:</strong></span>
                        <span><i class="fas fa-mouse-pointer"></i> Clic = Placer objet</span>
                        <span><i class="fas fa-times"></i> Clic sur objet = Supprimer</span>
                        <span><i class="fas fa-save"></i> Sauvegarde = Fichier JSON</span>
                    </div>
                </div>
            </div>
        `
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
            document.getElementById('mapTools').style.display = 'flex'
            document.getElementById('mapActions').style.display = 'flex'
            document.getElementById('objectsPanel').style.display = 'block'
            document.getElementById('mapLoadingMessage').style.display = 'none'
            
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
        const ctx = canvas.getContext('2d')
        
        // Calculer les dimensions
        const mapWidth = this.currentMapData.width
        const mapHeight = this.currentMapData.height
        const tileWidth = this.currentMapData.tilewidth * this.zoom
        const tileHeight = this.currentMapData.tileheight * this.zoom
        
        canvas.width = mapWidth * tileWidth
        canvas.height = mapHeight * tileHeight
        canvas.style.display = 'block'
        
        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Dessiner le fond (grille)
        this.drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight)
        
        // Dessiner les layers de la carte
        this.drawMapLayers(ctx, tileWidth, tileHeight)
        
        // Dessiner les objets placés
        this.drawPlacedObjects(ctx, tileWidth, tileHeight)
        
        // Mettre à jour l'affichage des objets
        this.updateObjectsList()
    }

    drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight) {
        ctx.strokeStyle = '#e0e0e0'
        ctx.lineWidth = 1
        
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
                        ctx.fillStyle = `hsla(${hue}, 20%, 85%, 0.6)`
                        ctx.fillRect(x, y, tileWidth, tileHeight)
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
            
            // Icône
            ctx.fillStyle = 'white'
            ctx.font = `${Math.max(10, tileWidth * 0.4)}px Arial`
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
        document.getElementById('zoomValue').textContent = Math.round(this.zoom * 100) + '%'
        
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
        
        const tileX = Math.floor((event.clientX - rect.left) / tileWidth)
        const tileY = Math.floor((event.clientY - rect.top) / tileHeight)
        
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
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
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
        const mapId = mapSelect.value
        
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
