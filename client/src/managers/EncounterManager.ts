// client/src/managers/EncounterManager.ts - CÔTÉ CLIENT D
export class ClientEncounterManager {
  private scene: Phaser.Scene;
  private mapData: any;
  private grassTiles: Set<string> = new Set();
  private encounterZones: any[] = [];
  private lastEncounterTime: number = 0;
  private readonly ENCOUNTER_COOLDOWN = 1000; // 1 seconde
  private readonly BASE_ENCOUNTER_RATE = 0.1; // 10%
  
  // ✅ Compteur de pas pour éviter les rencontres trop fréquentes
  private stepsSinceLastEncounter: number = 0;
  private readonly MIN_STEPS_BETWEEN_ENCOUNTERS = 5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ✅ INITIALISATION: Analyser la map actuelle
  initializeForMap(mapData: any) {
    console.log(`🌍 [ClientEncounter] Initialisation pour la map`);
    
    this.mapData = mapData;
    this.grassTiles.clear();
    this.encounterZones = [];
    
    this.analyzeGrassTiles();
    this.analyzeEncounterZones();
    
    console.log(`🌿 [ClientEncounter] ${this.grassTiles.size} tiles d'herbe détectés`);
    console.log(`⚔️ [ClientEncounter] ${this.encounterZones.length} zones d'encounter détectées`);
  }

  // ✅ DÉTECTION DES TILES D'HERBE (côté client)
  private analyzeGrassTiles() {
    const belowPlayer2Layer = this.mapData.layers.find((layer: any) => 
      layer.name === "BelowPlayer2" && layer.type === "tilelayer"
    );
    
    if (!belowPlayer2Layer || !belowPlayer2Layer.data) {
      console.warn(`⚠️ [ClientEncounter] Calque BelowPlayer2 non trouvé`);
      return;
    }

    for (let i = 0; i < belowPlayer2Layer.data.length; i++) {
      const tileId = belowPlayer2Layer.data[i];
      
      if (tileId > 0) {
        const x = i % this.mapData.width;
        const y = Math.floor(i / this.mapData.width);
        
        if (this.isTileGrass(tileId)) {
          this.grassTiles.add(`${x},${y}`);
        }
      }
    }
  }

  // ✅ DÉTECTION DES ZONES D'ENCOUNTER (côté client)
  private analyzeEncounterZones() {
    const objectLayer = this.mapData.layers.find((layer: any) => 
      layer.type === "objectgroup" && layer.objects
    );
    
    if (objectLayer && objectLayer.objects) {
      this.encounterZones = objectLayer.objects.filter((obj: any) => 
        obj.type === "encounterzone" || obj.name?.includes("encounter")
      );
    }
  }

  // ✅ VÉRIFICATION TILES D'HERBE (côté client)
  private isTileGrass(tileId: number): boolean {
    for (const tileset of this.mapData.tilesets) {
      const localTileId = tileId - tileset.firstgid;
      
      if (localTileId >= 0 && tileset.tiles) {
        const tileData = tileset.tiles[localTileId];
        if (tileData && tileData.properties) {
          const grassProperty = tileData.properties.find((prop: any) => 
            prop.name === "grassTile" && prop.value === true
          );
          
          if (grassProperty) return true;
        }
      }
    }
    return false;
  }

  // ✅ MÉTHODE PRINCIPALE: Vérifier rencontre lors du mouvement
  checkEncounterOnMove(playerX: number, playerY: number, timeOfDay: 'day' | 'night', weather: 'clear' | 'rain'): boolean {
    const now = Date.now();
    
    // ✅ Vérifier cooldown
    if (now - this.lastEncounterTime < this.ENCOUNTER_COOLDOWN) {
      return false;
    }

    // ✅ Incrémenter le compteur de pas
    this.stepsSinceLastEncounter++;

    // ✅ Vérifier le minimum de pas
    if (this.stepsSinceLastEncounter < this.MIN_STEPS_BETWEEN_ENCOUNTERS) {
      return false;
    }

    // ✅ Vérifier si on est sur l'herbe
    const tileX = Math.floor(playerX);
    const tileY = Math.floor(playerY);
    
    if (!this.isOnGrass(tileX, tileY)) {
      return false;
    }

    // ✅ Vérifier si on est dans une zone d'encounter
    const encounterZone = this.getEncounterZoneAt(playerX, playerY);
    if (!encounterZone) {
      return false;
    }

    // ✅ Calculer les chances de rencontre
    const encounterRate = this.calculateEncounterRate(encounterZone, timeOfDay, weather);
    
    // ✅ Tirage aléatoire
    const random = Math.random();
    
    console.log(`🎲 [ClientEncounter] Vérification rencontre:`);
    console.log(`📍 Position: (${tileX}, ${tileY})`);
    console.log(`🎯 Taux: ${(encounterRate * 100).toFixed(1)}%`);
    console.log(`🎲 Tirage: ${(random * 100).toFixed(1)}%`);
    
    if (random < encounterRate) {
      // ✅ RENCONTRE DÉCLENCHÉE !
      this.lastEncounterTime = now;
      this.stepsSinceLastEncounter = 0;
      
      console.log(`⚔️ [ClientEncounter] RENCONTRE DÉCLENCHÉE !`);
      
      // ✅ Envoyer au serveur pour génération du Pokémon
      this.triggerServerEncounter(tileX, tileY, timeOfDay, weather, encounterZone);
      
      return true;
    }

    return false;
  }

  // ✅ VÉRIFIER SI ON EST SUR L'HERBE
  private isOnGrass(x: number, y: number): boolean {
    return this.grassTiles.has(`${x},${y}`);
  }

  // ✅ OBTENIR LA ZONE D'ENCOUNTER À UNE POSITION
  private getEncounterZoneAt(x: number, y: number): any | null {
    const pixelX = x * this.mapData.tilewidth;
    const pixelY = y * this.mapData.tileheight;

    for (const zone of this.encounterZones) {
      if (pixelX >= zone.x && pixelX < zone.x + zone.width &&
          pixelY >= zone.y && pixelY < zone.y + zone.height) {
        return zone;
      }
    }

    return null;
  }

  // ✅ CALCULER LE TAUX DE RENCONTRE
  private calculateEncounterRate(encounterZone: any, timeOfDay: string, weather: string): number {
    let rate = this.BASE_ENCOUNTER_RATE;

    // ✅ Utiliser les propriétés de la zone
    if (encounterZone.properties) {
      const rateProperty = encounterZone.properties.find((prop: any) => 
        prop.name === "encounterRate"
      );
      
      if (rateProperty && typeof rateProperty.value === "number") {
        rate = rateProperty.value / 100;
      }
    }

    // ✅ Modificateurs temporels/météo
    if (timeOfDay === 'night') rate *= 1.2;
    if (weather === 'rain') rate *= 1.5;

    return Math.min(rate, 0.5); // Max 50%
  }

  // ✅ ENVOYER AU SERVEUR POUR GÉNÉRATION
  private triggerServerEncounter(x: number, y: number, timeOfDay: string, weather: string, zone: any) {
    // @ts-ignore - Accès à GameScene
    const gameScene = this.scene as any;
    
    if (gameScene.gameNetworkManager) {
      gameScene.gameNetworkManager.sendMessage("triggerEncounter", {
        x: x,
        y: y,
        timeOfDay: timeOfDay,
        weather: weather,
        zoneName: gameScene.currentZone,
        zoneProperties: zone.properties || {}
      });
    }
  }

  // ✅ EFFETS VISUELS DE RENCONTRE
  playEncounterEffect(x: number, y: number) {
    // ✅ Animation d'herbe qui bouge
    const grassEffect = this.scene.add.sprite(x * 16, y * 16, 'grassShake');
    grassEffect.setOrigin(0, 0);
    grassEffect.play('grassShakeAnim');
    
    // ✅ Son d'encounter
    this.scene.sound.play('encounterSound', { volume: 0.5 });
    
    // ✅ Effet de transition
    this.scene.cameras.main.shake(200, 0.02);
    
    // ✅ Nettoyer après l'animation
    this.scene.time.delayedCall(500, () => {
      grassEffect.destroy();
    });
  }

  // ✅ MÉTHODES DE DEBUG
  debugEncounterData() {
    console.log(`🔍 [ClientEncounter] === DEBUG DONNÉES ===`);
    console.log(`🌿 Tiles d'herbe: ${this.grassTiles.size}`);
    console.log(`⚔️ Zones d'encounter: ${this.encounterZones.length}`);
    
    if (this.grassTiles.size > 0) {
      const samples = Array.from(this.grassTiles).slice(0, 5);
      console.log(`🌿 Exemples herbe:`, samples);
    }
    
    this.encounterZones.forEach((zone, i) => {
      console.log(`⚔️ Zone ${i}:`, {
        name: zone.name || 'unnamed',
        pos: `(${zone.x}, ${zone.y})`,
        size: `${zone.width}x${zone.height}`,
        props: zone.properties?.map((p: any) => `${p.name}: ${p.value}`) || []
      });
    });
  }

  // ✅ Visualiser les zones (debug visuel)
  debugVisualizeZones() {
    // Nettoyer les anciens debug
    this.scene.children.list
      .filter((child: any) => child.debugEncounter)
      .forEach((child: any) => child.destroy());

    // ✅ Afficher les tiles d'herbe
    this.grassTiles.forEach(coord => {
      const [x, y] = coord.split(',').map(Number);
      const rect = this.scene.add.rectangle(
        x * 16 + 8, y * 16 + 8, 16, 16, 0x00ff00, 0.3
      );
      (rect as any).debugEncounter = true;
    });

    // ✅ Afficher les zones d'encounter
    this.encounterZones.forEach(zone => {
      const rect = this.scene.add.rectangle(
        zone.x + zone.width/2, 
        zone.y + zone.height/2, 
        zone.width, 
        zone.height, 
        0xff0000, 
        0.2
      );
      (rect as any).debugEncounter = true;
    });
  }
}

// ===========================================================================================
// INTÉGRATION DANS GAMESCENE
// ===========================================================================================

/*
// Dans GameScene.ts, ajouter :

private encounterManager!: ClientEncounterManager;

create() {
  // ... code existant ...
  
  // ✅ Initialiser le système de rencontres
  this.encounterManager = new ClientEncounterManager(this);
  
  // ✅ Initialiser quand la map est chargée
  this.events.on('mapLoaded', () => {
    this.encounterManager.initializeForMap(this.map);
  });
  
  // ✅ Écouter les réponses du serveur
  this.gameNetworkManager.on("encounterTriggered", (data: any) => {
    this.handleEncounterTriggered(data);
  });
}

// ✅ Modifier la méthode de mouvement du joueur
private movePlayer(direction: string) {
  // ... code existant de mouvement ...
  
  // ✅ Après le mouvement, vérifier les rencontres
  if (this.player.isMoving) {
    const timeInfo = this.getTimeInfo(); // À implémenter selon ton système
    const weatherInfo = this.getWeatherInfo(); // À implémenter selon ton système
    
    const encounterTriggered = this.encounterManager.checkEncounterOnMove(
      this.player.x / 16, // Convertir pixels en tiles
      this.player.y / 16,
      timeInfo.isDayTime ? 'day' : 'night',
      weatherInfo.isRaining ? 'rain' : 'clear'
    );
    
    if (encounterTriggered) {
      // ✅ Jouer l'effet visuel
      this.encounterManager.playEncounterEffect(
        Math.floor(this.player.x / 16),
        Math.floor(this.player.y / 16)
      );
      
      // ✅ Bloquer le mouvement pendant la transition
      this.player.setImmobilized(true);
    }
  }
}

// ✅ Gérer la rencontre reçue du serveur
private handleEncounterTriggered(data: any) {
  console.log(`⚔️ [GameScene] Rencontre reçue du serveur:`, data);
  
  // ✅ Transition vers l'écran de combat
  this.scene.start('BattleScene', {
    wildPokemon: data.wildPokemon,
    playerTeam: this.playerTeam, // Tes données d'équipe
    location: data.location,
    returnScene: 'GameScene',
    returnData: {
      x: this.player.x,
      y: this.player.y,
      zone: this.currentZone
    }
  });
}

// ✅ Commandes de debug
private setupEncounterDebug() {
  // Debug data
  this.input.keyboard?.on('keydown-F1', () => {
    this.encounterManager.debugEncounterData();
  });
  
  // Debug visuel
  this.input.keyboard?.on('keydown-F2', () => {
    this.encounterManager.debugVisualizeZones();
  });
  
  // Forcer une rencontre (debug)
  this.input.keyboard?.on('keydown-F3', () => {
    this.gameNetworkManager.sendMessage("forceEncounter", {
      x: Math.floor(this.player.x / 16),
      y: Math.floor(this.player.y / 16),
      zone: this.currentZone
    });
  });
}
*/
