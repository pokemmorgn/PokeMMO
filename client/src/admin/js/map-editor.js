// PokeWorld Admin Panel - Map Editor Module (Version avec support tilesets Tiled)

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
        this.tilesets = new Map() // Cache des tilesets chargés
        this.tilesetImages = new Map() // Cache des images de tilesets
        
        console.log('🗺️ [MapEditor] Module initialized with tileset support, DPI:', this.dpi)
        this.init()
    }

    init() {
        console.log('🗺️ [MapEditor] Initialisation terminée - support des tilesets Tiled activé')
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
    console.log('🗺️ [MapEditor] Loading all available maps...')
    
    // Liste complète de vos cartes
    this.availableMaps = [
        { id: 'beach', name: '🏖️ Beach', file: 'beach.tmj' },
        { id: 'village', name: '🏘️ Village', file: 'village.tmj' },
        { id: 'lavandia', name: '🏙️ Lavandia', file: 'lavandia.tmj' },
        { id: 'road1', name: '🛤️ Route 1', file: 'road1.tmj' },
        { id: 'road2', name: '🛤️ Route 2', file: 'road2.tmj' },
        { id: 'road3', name: '🛤️ Route 3', file: 'road3.tmj' },
        
        // Maisons Village
        { id: 'villagehouse1', name: '🏠 Maison Village 1', file: 'villagehouse1.tmj' },
        { id: 'villagehouse2', name: '🏠 Maison Village 2', file: 'villagehouse2.tmj' },
        { id: 'villagelab', name: '🔬 Laboratoire Village', file: 'villagelab.tmj' },
        { id: 'villageflorist', name: '🌸 Fleuriste Village', file: 'villageflorist.tmj' },
        { id: 'villagewindmill', name: '🌾 Moulin Village', file: 'villagewindmill.tmj' },
        
        // Maisons Lavandia
        { id: 'lavandiahouse1', name: '🏠 Maison Lavandia 1', file: 'lavandiahouse1.tmj' },
        { id: 'lavandiahouse2', name: '🏠 Maison Lavandia 2', file: 'lavandiahouse2.tmj' },
        { id: 'lavandiahouse3', name: '🏠 Maison Lavandia 3', file: 'lavandiahouse3.tmj' },
        { id: 'lavandiahouse4', name: '🏠 Maison Lavandia 4', file: 'lavandiahouse4.tmj' },
        { id: 'lavandiahouse5', name: '🏠 Maison Lavandia 5', file: 'lavandiahouse5.tmj' },
        { id: 'lavandiahouse6', name: '🏠 Maison Lavandia 6', file: 'lavandiahouse6.tmj' },
        { id: 'lavandiahouse7', name: '🏠 Maison Lavandia 7', file: 'lavandiahouse7.tmj' },
        { id: 'lavandiahouse8', name: '🏠 Maison Lavandia 8', file: 'lavandiahouse8.tmj' },
        { id: 'lavandiahouse9', name: '🏠 Maison Lavandia 9', file: 'lavandiahouse9.tmj' },
        
        // Bâtiments Lavandia
        { id: 'lavandiashop', name: '🛒 Magasin Lavandia', file: 'lavandiashop.tmj' },
        { id: 'lavandiahealingcenter', name: '🏥 Centre Pokémon Lavandia', file: 'lavandiahealingcenter.tmj' },
        { id: 'lavandiaresearchlab', name: '🔬 Labo Recherche Lavandia', file: 'lavandiaresearchlab.tmj' },
        { id: 'lavandiaequipment', name: '⚒️ Équipement Lavandia', file: 'lavandiaequipment.tmj' },
        { id: 'lavandiafurniture', name: '🪑 Mobilier Lavandia', file: 'lavandiafurniture.tmj' },
        { id: 'lavandiaanalysis', name: '🔍 Analyse Lavandia', file: 'lavandiaanalysis.tmj' },
        { id: 'lavandiabossroom', name: '👑 Salle Boss Lavandia', file: 'lavandiabossroom.tmj' },
        { id: 'lavandiacelebitemple', name: '🏛️ Temple Celebi Lavandia', file: 'lavandiacelebitemple.tmj' },
        
        // Grottes
        { id: 'noctherbcave1', name: '🕳️ Grotte Noctherb 1', file: 'noctherbcave1.tmj' },
        { id: 'noctherbcave2', name: '🕳️ Grotte Noctherb 2', file: 'noctherbcave2.tmj' },
        { id: 'noctherbcave2bis', name: '🕳️ Grotte Noctherb 2bis', file: 'noctherbcave2bis.tmj' },
        
        // Zones spéciales
        { id: 'greenroot', name: '🌳 Greenroot', file: 'Greenroot.tmj' },
        { id: 'greenrootbeach', name: '🌳🏖️ Greenroot Beach', file: 'GreenrootBeach.tmj' },
        { id: 'florist', name: '🌺 Fleuriste', file: 'Florist.tmj' },
        { id: 'wraithmoor', name: '👻 Wraithmoor', file: 'wraithmoor.tmj' },
        { id: 'wraithmoorcimetery', name: '⚰️ Cimetière Wraithmoor', file: 'wraithmoorcimetery.tmj' },
        { id: 'wraithmoormanor1', name: '🏚️ Manoir Wraithmoor 1', file: 'wraithmoormanor1.tmj' },
        
        // Routes cachées/spéciales
        { id: 'road1hidden', name: '🛤️ Route 1 Cachée', file: 'road1hidden.tmj' },
        { id: 'road1house', name: '🏠 Maison Route 1', file: 'road1house.tmj' },
        { id: 'villagehouse1old', name: '🏠 Ancienne Maison Village 1', file: 'VillageHouse1.tmj' },
        { id: 'villagehouse2old', name: '🏠 Ancienne Maison Village 2', file: 'VillageHouse2.tmj' }
    ]

    // Remplir le select avec des catégories
    const mapSelect = document.getElementById('mapSelect')
    if (mapSelect) {
        mapSelect.innerHTML = `
            <option value="">Sélectionner une carte...</option>
            <optgroup label="🌍 Zones principales">
                <option value="beach">🏖️ Beach</option>
                <option value="village">🏘️ Village</option>
                <option value="lavandia">🏙️ Lavandia</option>
                <option value="greenroot">🌳 Greenroot</option>
                <option value="wraithmoor">👻 Wraithmoor</option>
            </optgroup>
            <optgroup label="🛤️ Routes">
                <option value="road1">🛤️ Route 1</option>
                <option value="road2">🛤️ Route 2</option>
                <option value="road3">🛤️ Route 3</option>
                <option value="road1hidden">🛤️ Route 1 Cachée</option>
            </optgroup>
            <optgroup label="🏠 Maisons Village">
                <option value="villagehouse1">🏠 Maison Village 1</option>
                <option value="villagehouse2">🏠 Maison Village 2</option>
                <option value="villagelab">🔬 Laboratoire</option>
                <option value="villageflorist">🌸 Fleuriste</option>
                <option value="villagewindmill">🌾 Moulin</option>
            </optgroup>
            <optgroup label="🏙️ Bâtiments Lavandia">
                <option value="lavandiashop">🛒 Magasin</option>
                <option value="lavandiahealingcenter">🏥 Centre Pokémon</option>
                <option value="lavandiaresearchlab">🔬 Labo Recherche</option>
                <option value="lavandiaequipment">⚒️ Équipement</option>
                <option value="lavandiacelebitemple">🏛️ Temple Celebi</option>
            </optgroup>
            <optgroup label="🏠 Maisons Lavandia">
                <option value="lavandiahouse1">🏠 Maison 1</option>
                <option value="lavandiahouse2">🏠 Maison 2</option>
                <option value="lavandiahouse3">🏠 Maison 3</option>
                <option value="lavandiahouse4">🏠 Maison 4</option>
                <option value="lavandiahouse5">🏠 Maison 5</option>
                <option value="lavandiahouse6">🏠 Maison 6</option>
                <option value="lavandiahouse7">🏠 Maison 7</option>
                <option value="lavandiahouse8">🏠 Maison 8</option>
                <option value="lavandiahouse9">🏠 Maison 9</option>
            </optgroup>
            <optgroup label="🕳️ Grottes">
                <option value="noctherbcave1">🕳️ Grotte Noctherb 1</option>
                <option value="noctherbcave2">🕳️ Grotte Noctherb 2</option>
                <option value="noctherbcave2bis">🕳️ Grotte Noctherb 2bis</option>
            </optgroup>
        `
    }

    console.log(`✅ [MapEditor] ${this.availableMaps.length} cartes chargées`)
}
    async loadMap(mapId) {
        if (!mapId) return

         // ✅ AJOUTEZ CES LIGNES POUR VIDER LE CACHE
    console.log('🗺️ [MapEditor] Clearing tileset cache...')
    this.tilesets.clear()
    this.tilesetImages.clear()
    this.currentMapData = null

        
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
            
            // Charger les tilesets de la carte
            await this.loadTilesets(mapData)
            
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

    async loadTilesets(mapData) {
        console.log('🖼️ [MapEditor] Loading tilesets...')
        
        if (!mapData.tilesets || mapData.tilesets.length === 0) {
            console.warn('🖼️ [MapEditor] No tilesets found in map')
            return
        }

        const promises = mapData.tilesets.map(async (tileset) => {
            try {
                // Si c'est un tileset intégré
                if (tileset.tiles || tileset.image) {
                    return this.processTileset(tileset)
                }
                
                // Si c'est un tileset externe (fichier .tsj)
                if (tileset.source) {
                    const tilesetPath = `/assets/maps/${tileset.source}`
                    console.log(`🖼️ [MapEditor] Loading external tileset: ${tilesetPath}`)
                    
                    try {
                        const response = await fetch(tilesetPath)
                        if (!response.ok) throw new Error(`Tileset not found: ${tilesetPath}`)
                        const externalTileset = await response.json()
                        
                        // Fusionner les propriétés
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
        
        // Stocker les infos du tileset
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

        // Charger l'image du tileset
// Nettoyer le chemin de l'image (supprimer ../ et _Sprites/)
const cleanImageName = tileset.image
    .replace(/\.\.\//g, '')           // Supprimer ../
    .replace(/\/_Sprites\//g, '/')    // Supprimer /_Sprites/
    .replace(/^_Sprites\//, '')       // Supprimer _Sprites/ au début
    .split('/').pop()                 // Garder seulement le nom du fichier

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
                resolve(null) // Continue même si une image échoue
            }
            
            img.src = imagePath
        })
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
        
        // Dessiner les layers de la carte (avec vraies textures)
        this.drawMapLayers(ctx, tileWidth, tileHeight)
        
        // Dessiner la grille par-dessus (optionnel)
        if (this.zoom >= 0.5) { // Seulement si pas trop dézoomé
            this.drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight)
        }
        
        // Dessiner les objets placés
        this.drawPlacedObjects(ctx, tileWidth, tileHeight)
        
        // Mettre à jour l'affichage des objets
        this.updateObjectsList()
        
        console.log(`🗺️ [MapEditor] Map rendered - ${mapWidth}x${mapHeight} tiles, ${tileWidth}x${tileHeight}px per tile`)
    }

    drawGrid(ctx, mapWidth, mapHeight, tileWidth, tileHeight) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
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
        if (!this.currentMapData.layers) {
            console.warn('🗺️ [MapEditor] No layers found in map')
            return
        }

        // Trier les layers par ordre (les plus bas en premier)
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

        // Sauvegarder l'état du contexte pour l'opacité
        ctx.save()
        ctx.globalAlpha = opacity

        for (let i = 0; i < layer.data.length; i++) {
            const tileId = layer.data[i]
            if (tileId === 0) continue // Tile vide

            const tileX = i % mapWidth
            const tileY = Math.floor(i / mapWidth)
            const x = tileX * tileWidth
            const y = tileY * tileHeight

            // Trouver le tileset approprié pour ce tile
            const tilesetInfo = this.findTilesetForTile(tileId)
            if (tilesetInfo) {
                this.drawTile(ctx, tileId, tilesetInfo, x, y, tileWidth, tileHeight)
            } else {
                // Fallback: dessiner un carré coloré si pas de tileset
                ctx.fillStyle = `hsl(${(tileId * 137) % 360}, 50%, 70%)`
                ctx.fillRect(x, y, tileWidth, tileHeight)
                
                // Numéro du tile pour debug
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
        // Trouver le tileset qui contient ce tile ID
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
            // Image pas encore chargée, dessiner un placeholder
            ctx.fillStyle = '#ddd'
            ctx.fillRect(x, y, tileWidth, tileHeight)
            ctx.fillStyle = '#999'
            ctx.font = `${Math.max(8, tileWidth * 0.2)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('...', x + tileWidth/2, y + tileHeight/2)
            return
        }

        // Calculer la position du tile dans le tileset
        const tilesPerRow = tileset.columns || Math.floor(tileset.imagewidth / tileset.tilewidth)
        const sourceX = (localTileId % tilesPerRow) * tileset.tilewidth
        const sourceY = Math.floor(localTileId / tilesPerRow) * tileset.tileheight

        // Dessiner le tile
        try {
            ctx.drawImage(
                image,
                sourceX, sourceY, tileset.tilewidth, tileset.tileheight, // Source
                x, y, tileWidth, tileHeight // Destination
            )
        } catch (error) {
            console.warn(`🖼️ [MapEditor] Error drawing tile ${tileId}:`, error)
            // Fallback
            ctx.fillStyle = '#f00'
            ctx.fillRect(x, y, tileWidth, tileHeight)
        }
    }

    drawPlacedObjects(ctx, tileWidth, tileHeight) {
        this.placedObjects.forEach(obj => {
            const x = obj.x * tileWidth
            const y = obj.y * tileHeight
            
            // Couleur selon le type avec transparence
            const colors = {
                npc: 'rgba(255, 107, 107, 0.8)',
                object: 'rgba(78, 205, 196, 0.8)', 
                spawn: 'rgba(69, 183, 209, 0.8)',
                teleport: 'rgba(155, 89, 182, 0.8)'
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
            
            const icons = {
                npc: '👤',
                object: '📦',
                spawn: '🎯',
                teleport: '🌀'
            }
            
            // Ombre du texte
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.fillText(
                icons[obj.type] || '?',
                x + tileWidth / 2 + 1,
                y + tileHeight / 2 + 1
            )
            
            // Texte principal
            ctx.fillStyle = 'white'
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
        this.tilesets.clear()
        this.tilesetImages.clear()
        
        console.log('🧹 [MapEditor] Module cleanup completed')
    }
}

// Export for global access
export default MapEditorModule
