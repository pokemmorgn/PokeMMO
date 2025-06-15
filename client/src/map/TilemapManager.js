// src/map/TilemapManager.js - Style PokeMMO
import { GAME_CONFIG } from "../config/gameConfig.js";

export class TilemapManager {
  constructor(scene) {
    this.scene = scene;
    this.map = null;
    this.tileset = null;
    this.layers = {};
    this.collisionLayer = null;
  }

  // Créer une tilemap simple pour commencer (en attendant les vrais assets)
  createBasicMap() {
    // Création d'une map basique 25x19 tiles (800x608 pixels avec zoom x2)
    const mapData = this.generateBasicMapData();
    
    // Créer la tilemap
    this.map = this.scene.make.tilemap({
      data: mapData,
      tileWidth: GAME_CONFIG.tilemap.tileSize,
      tileHeight: GAME_CONFIG.tilemap.tileSize,
      width: GAME_CONFIG.tilemap.mapWidth,
      height: GAME_CONFIG.tilemap.mapHeight
    });

    // Créer un tileset basique avec une texture générée
    this.tileset = this.map.addTilesetImage('basic_tileset', 'grass_tile', 
      GAME_CONFIG.tilemap.tileSize, 
      GAME_CONFIG.tilemap.tileSize
    );

    // Créer les layers
    this.createLayers();

    // Configurer les collisions
    this.setupCollisions();

    console.log("🗺️ Basic tilemap created");
    return this.map;
  }

  // Charger une vraie tilemap depuis Tiled (quand vous aurez les assets)
  loadTiledMap(mapKey, tilesetKey, tilesetImage) {
    this.map = this.scene.make.tilemap({ key: mapKey });
    
    // Ajouter le tileset
    this.tileset = this.map.addTilesetImage(tilesetKey, tilesetImage);
    
    // Créer les layers depuis le fichier Tiled
    this.createTiledLayers();
    
    // Configuration des collisions
    this.setupCollisions();
    
    console.log("🗺️ Tiled map loaded");
    return this.map;
  }

  generateBasicMapData() {
    const width = GAME_CONFIG.tilemap.mapWidth;
    const height = GAME_CONFIG.tilemap.mapHeight;
    const mapData = [];

    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        // Créer un pattern simple
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          row.push(2); // Bordures
        } else if ((x + y) % 3 === 0) {
          row.push(3); // Pattern décoratif
        } else {
          row.push(1); // Sol de base
        }
      }
      mapData.push(row);
    }
    
    return mapData;
  }

  createLayers() {
    // Layer de base (sol)
    this.layers.background = this.map.createLayer(0, this.tileset, 0, 0);
    this.layers.background.setName('background');
    
    // Configuration pour pixel art
    this.layers.background.setScale(1);
    
    // Collision layer (invisible, seulement pour la physique)
    this.collisionLayer = this.layers.background;
  }

  createTiledLayers() {
    // Créer les layers depuis Tiled
    const layerNames = Object.values(GAME_CONFIG.tilemap.layers);
    
    layerNames.forEach(layerName => {
      const layer = this.map.createLayer(layerName, this.tileset, 0, 0);
      if (layer) {
        this.layers[layerName] = layer;
        layer.setScale(1);
        
        // Le layer de collision est spécial
        if (layerName === GAME_CONFIG.tilemap.layers.collision) {
          this.collisionLayer = layer;
          layer.setVisible(false); // Invisible en production
        }
      }
    });
  }

  setupCollisions() {
    if (this.collisionLayer) {
      // Configuration des collisions (tiles 2 et plus sont solides)
      this.collisionLayer.setCollisionByProperty({ collides: true });
      
      // Ou pour la map basique, tiles 2+ sont des murs
      this.collisionLayer.setCollisionBetween(2, 999);
      
      console.log("💥 Collisions configured");
    }
  }

  // Obtenir la tile à une position donnée
  getTileAt(x, y, layer = null) {
    const targetLayer = layer || this.layers.background;
    return targetLayer.getTileAt(x, y);
  }

  // Obtenir la tile à une position monde
  getTileAtWorldXY(worldX, worldY, layer = null) {
    const targetLayer = layer || this.layers.background;
    return targetLayer.getTileAtWorldXY(worldX, worldY);
  }

  // Vérifier si une position est libre (pas de collision)
  isPositionFree(worldX, worldY) {
    if (!this.collisionLayer) return true;
    
    const tile = this.collisionLayer.getTileAtWorldXY(worldX, worldY);
    return !tile || !tile.collides;
  }

  // Convertir coordonnées monde vers tile
  worldToTileXY(worldX, worldY) {
    return this.map.worldToTileXY(worldX, worldY);
  }

  // Convertir coordonnées tile vers monde
  tileToWorldXY(tileX, tileY) {
    return this.map.tileToWorldXY(tileX, tileY);
  }

  // Obtenir les dimensions de la map
  getMapSize() {
    return {
      widthInTiles: this.map.width,
      heightInTiles: this.map.height,
      widthInPixels: this.map.widthInPixels,
      heightInPixels: this.map.heightInPixels,
      tileWidth: this.map.tileWidth,
      tileHeight: this.map.tileHeight
    };
  }

  // Obtenir le layer de collision pour la physique
  getCollisionLayer() {
    return this.collisionLayer;
  }

  // Obtenir tous les layers
  getLayers() {
    return this.layers;
  }

  // Nettoyer
  destroy() {
    this.map = null;
    this.tileset = null;
    this.layers = {};
    this.collisionLayer = null;
  }
}