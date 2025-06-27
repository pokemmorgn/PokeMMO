// client/src/managers/EncounterManager.js - VERSION CORRIGÉE AVEC NOTIFICATIONS
// ✅ Intégration complète avec le système de notification existant

export class ClientEncounterManager {
  constructor(mapData = null) {
    this.mapData = null;
    this.encounterZones = new Map();
    this.grassTiles = new Set();
    this.waterTiles = new Set();

    // Cooldown client (plus permissif que serveur)
    this.lastEncounterTime = 0;
    this.CLIENT_ENCOUNTER_COOLDOWN = 500;

    // Compteur de pas pour encounters
    this.stepCount = 0;
    this.STEPS_PER_ENCOUNTER_CHECK = 3;

    // ✅ NOUVEAU: Gestion des notifications d'encounter
    this.encounterNotificationCooldown = 5000; // 5 secondes entre notifications
    this.lastNotificationTime = 0;
    this.currentEncounterNotification = null;

    // ✅ Debug et statistiques
    this.encounterStats = {
      totalChecks: 0,
      successfulEncounters: 0,
      notificationsSent: 0,
      lastEncounterData: null
    };

    if (mapData) {
      this.loadMapData(mapData);
    }

    console.log('🎲 [ClientEncounter] Manager initialisé');
  }

  // ✅ CHARGEMENT DES DONNÉES DE CARTE
  loadMapData(mapData) {
    this.mapData = mapData;
    this.loadEncounterZones();
    this.loadGrassTiles();
    this.loadWaterTiles();
    
    console.log(`🗺️ [ClientEncounter] Carte chargée:`);
    console.log(`   📍 Zones encounter: ${this.encounterZones.size}`);
    console.log(`   🌿 Tiles herbe: ${this.grassTiles.size}`);
    console.log(`   🌊 Tiles eau: ${this.waterTiles.size}`);
  }

  // CHARGEMENT DES ZONES DE RENCONTRE (supporte les deux variantes de nom)
  loadEncounterZones() {
    if (!this.mapData) return;
    this.encounterZones.clear();

    for (const layer of this.mapData.layers) {
      if (layer.type === 'objectgroup' && layer.objects) {
        for (const obj of layer.objects) {
          let zoneIdProp = null;
          if (obj.properties) {
            zoneIdProp = obj.properties.find(p =>
              p.name === 'zoneId' || p.name === 'zoneid' || p.name === 'zoneID'
            );
          }
          const isEncounterZone =
            (obj.name === 'encounterzone' || obj.name === 'encouterzone' ||
            obj.type === 'encounterzone' || obj.type === 'encouterzone');

          if (isEncounterZone && zoneIdProp && zoneIdProp.value) {
            this.encounterZones.set(obj.id.toString(), {
              id: obj.id,
              zoneId: zoneIdProp.value,
              x: obj.x,
              y: obj.y,
              width: obj.width,
              height: obj.height,
              bounds: {
                left: obj.x,
                right: obj.x + obj.width,
                top: obj.y,
                bottom: obj.y + obj.height
              }
            });
            
            console.log(`📍 [ClientEncounter] Zone trouvée: ${zoneIdProp.value} à (${obj.x}, ${obj.y})`);
          }
        }
      }
    }
  }

  // CHARGEMENT DES TILES D'HERBE
  loadGrassTiles() {
    if (!this.mapData) return;
    this.grassTiles.clear();

    for (const tileset of this.mapData.tilesets) {
      if (tileset.tiles) {
        for (const tile of tileset.tiles) {
          if (tile.properties) {
            const grassProp = tile.properties.find(p => p.name === 'grassTile');
            if (grassProp && grassProp.value) {
              const globalTileId = tileset.firstgid + tile.id;
              this.grassTiles.add(globalTileId);
            }
          }
        }
      }
    }
  }

  // CHARGEMENT DES TILES D'EAU
  loadWaterTiles() {
    if (!this.mapData) return;
    this.waterTiles.clear();

    for (const tileset of this.mapData.tilesets) {
      if (tileset.tiles) {
        for (const tile of tileset.tiles) {
          if (tile.properties) {
            const waterProp = tile.properties.find(p => p.name === 'waterTile');
            if (waterProp && waterProp.value) {
              const globalTileId = tileset.firstgid + tile.id;
              this.waterTiles.add(globalTileId);
            }
          }
        }
      }
    }
  }

  // ✅ VÉRIFICATION DE RENCONTRE LORS DU MOUVEMENT (MÉTHODE PRINCIPALE)
  checkEncounterOnMove(x, y) {
    this.encounterStats.totalChecks++;
    
    // Cooldown client
    const now = Date.now();
    if (now - this.lastEncounterTime < this.CLIENT_ENCOUNTER_COOLDOWN) {
      return { shouldTrigger: false, method: 'grass', encounterRate: 0, reason: 'cooldown' };
    }

    // Compter les pas
    this.stepCount++;
    if (this.stepCount < this.STEPS_PER_ENCOUNTER_CHECK) {
      return { shouldTrigger: false, method: 'grass', encounterRate: 0, reason: 'steps' };
    }
    this.stepCount = 0;

    // Vérifier si on est sur une herbe ou sur l'eau
    const isOnGrass = this.isPositionOnGrass(x, y);
    const isOnWater = this.isPositionOnWater(x, y);

    if (!isOnGrass && !isOnWater) {
      return { shouldTrigger: false, method: 'grass', encounterRate: 0, reason: 'no_encounter_tile' };
    }

    // Trouver la zone de rencontre
    const zoneId = this.getEncounterZoneAt(x, y);
    if (!zoneId) {
      return { shouldTrigger: false, method: 'grass', encounterRate: 0, reason: 'no_encounter_zone' };
    }

    // Déterminer le type de rencontre et le taux
    const method = isOnWater ? 'fishing' : 'grass';
    const encounterRate = this.calculateEncounterRate(method, zoneId);

    // ✅ CRÉER LES DONNÉES D'ENCOUNTER
    const encounterData = {
      shouldTrigger: true,
      zoneId: zoneId,
      method: method,
      encounterRate: encounterRate,
      position: { x, y },
      tiles: { isOnGrass, isOnWater },
      timestamp: now
    };

    // ✅ STOCKER POUR LES STATS
    this.encounterStats.lastEncounterData = encounterData;
    this.encounterStats.successfulEncounters++;

    // Mettre à jour le cooldown
    this.lastEncounterTime = now;

    // ✅ AFFICHER NOTIFICATION IMMÉDIATEMENT (avant envoi serveur)
    this.showEncounterNotification(encounterData);

    console.log(`🎲 [ClientEncounter] Rencontre détectée !`);
    console.log(`   📍 Zone: ${zoneId} | Méthode: ${method} | Taux: ${(encounterRate*100).toFixed(1)}%`);
    
    return encounterData;
  }

  // ✅ NOUVELLE MÉTHODE: Afficher notification d'encounter
  showEncounterNotification(encounterData) {
    // Vérifier cooldown des notifications
    const now = Date.now();
    if (now - this.lastNotificationTime < this.encounterNotificationCooldown) {
      console.log(`🔕 [ClientEncounter] Notification en cooldown`);
      return;
    }

    // Vérifier que le système de notification est disponible
    if (!window.showGameNotification) {
      console.warn(`⚠️ [ClientEncounter] Système de notification non disponible`);
      return;
    }

    // ✅ FERMER LA NOTIFICATION PRÉCÉDENTE SI ELLE EXISTE
    if (this.currentEncounterNotification) {
      try {
        if (this.currentEncounterNotification.remove) {
          this.currentEncounterNotification.remove();
        }
      } catch (error) {
        // Ignorer les erreurs de suppression
      }
    }

    // ✅ CRÉER LE MESSAGE DE NOTIFICATION
    const zoneDisplayName = this.formatZoneName(encounterData.zoneId);
    const methodIcon = encounterData.method === 'fishing' ? '🎣' : '🌿';
    const encounterChance = Math.round(encounterData.encounterRate * 100);
    
    const message = `${methodIcon} Wild Pokémon encounter possible in ${zoneDisplayName} (${encounterChance}% chance)`;

    // ✅ AFFICHER LA NOTIFICATION AVEC OPTIONS SPÉCIALES
    this.currentEncounterNotification = window.showGameNotification(
      message,
      'info', // Type de base
      {
        duration: 3000, // 3 secondes
        position: 'top-center',
        bounce: true,
        closable: true,
        onClick: () => {
          this.onEncounterNotificationClick(encounterData);
        }
      }
    );

    // ✅ JOUER UN SON LÉGER (si possible)
    this.playEncounterSound();

    // Mettre à jour les stats
    this.lastNotificationTime = now;
    this.encounterStats.notificationsSent++;

    console.log(`🔔 [ClientEncounter] Notification affichée: ${message}`);
  }

  // ✅ GESTION DU CLIC SUR LA NOTIFICATION
  onEncounterNotificationClick(encounterData) {
    console.log(`👆 [ClientEncounter] Clic sur notification encounter`);
    
    // Afficher des détails sur l'encounter
    if (window.showGameNotification) {
      const detailMessage = `Zone: ${encounterData.zoneId} | Method: ${encounterData.method} | Rate: ${(encounterData.encounterRate * 100).toFixed(1)}%`;
      
      window.showGameNotification(
        detailMessage,
        'info',
        {
          duration: 2000,
          position: 'bottom-center'
        }
      );
    }

    // ✅ OPTIONNEL: Forcer un encounter si le joueur clique
    this.forceEncounterFromNotification(encounterData);
  }

  // ✅ FORCER UN ENCOUNTER DEPUIS LA NOTIFICATION
  forceEncounterFromNotification(encounterData) {
    console.log(`🎯 [ClientEncounter] Force encounter depuis notification`);
    
    // Envoyer au serveur avec flag "forced"
    if (window.globalNetworkManager && window.globalNetworkManager.room) {
      window.globalNetworkManager.room.send("triggerEncounter", {
        x: encounterData.position.x,
        y: encounterData.position.y,
        zoneId: encounterData.zoneId,
        method: encounterData.method,
        encounterRate: 1.0, // 100% de chance
        forced: true,
        fromNotification: true,
        timestamp: Date.now()
      });
      
      // Notification de confirmation
      if (window.showGameNotification) {
        window.showGameNotification(
          `🎲 Forcing encounter...`,
          'warning',
          {
            duration: 2000,
            position: 'top-center'
          }
        );
      }
    }
  }

  // ✅ JOUER UN SON D'ENCOUNTER (LÉGER)
  playEncounterSound() {
    try {
      // Son très court et discret
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Note A
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime + 0.1); // Note C
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
    } catch (error) {
      // Ignorer les erreurs audio
    }
  }

  // ✅ FORMATER LE NOM DE ZONE POUR AFFICHAGE
  formatZoneName(zoneId) {
    // Nettoyer et formater le nom de zone
    return zoneId
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // ✅ VÉRIFIER SI POSITION SUR HERBE
  isPositionOnGrass(x, y) {
    if (!this.mapData) return false;
    const tileX = Math.floor(x / this.mapData.tilewidth);
    const tileY = Math.floor(y / this.mapData.tileheight);

    const belowPlayer2Layer = this.mapData.layers.find(layer =>
      layer.name === 'BelowPlayer2' && layer.type === 'tilelayer'
    );

    if (!belowPlayer2Layer || !belowPlayer2Layer.data) return false;
    const index = tileY * (belowPlayer2Layer.width || this.mapData.width) + tileX;
    if (index < 0 || index >= belowPlayer2Layer.data.length) return false;
    const tileId = belowPlayer2Layer.data[index];
    return this.grassTiles.has(tileId);
  }

  // VÉRIFIER SI POSITION SUR EAU
  isPositionOnWater(x, y) {
    if (!this.mapData) return false;
    const tileX = Math.floor(x / this.mapData.tilewidth);
    const tileY = Math.floor(y / this.mapData.tileheight);

    for (const layer of this.mapData.layers) {
      if (layer.type === 'tilelayer' && layer.data) {
        const index = tileY * (layer.width || this.mapData.width) + tileX;
        if (index >= 0 && index < layer.data.length) {
          const tileId = layer.data[index];
          if (this.waterTiles.has(tileId)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // TROUVER LA ZONE DE RENCONTRE À UNE POSITION
  getEncounterZoneAt(x, y) {
    for (const [id, zone] of this.encounterZones.entries()) {
      const inside =
        x >= zone.bounds.left &&
        x <= zone.bounds.right &&
        y >= zone.bounds.top &&
        y <= zone.bounds.bottom;
      if (inside) {
        return zone.zoneId;
      }
    }
    return null;
  }

  // CALCULER LE TAUX DE RENCONTRE
  calculateEncounterRate(method, zoneId) {
    let baseRate = 0.1; // 10% par défaut
    if (method === 'grass') {
      if (zoneId.includes('grass1')) baseRate = 0.08;
      else if (zoneId.includes('grass2')) baseRate = 0.12;
      else if (zoneId.includes('grass3')) baseRate = 0.15;
      else baseRate = 0.1;
    } else if (method === 'fishing') {
      baseRate = 0.3;
    }
    return baseRate;
  }

  // ✅ FORCER UNE VÉRIFICATION DE RENCONTRE (pour tests)
  forceEncounterCheck(x, y) {
    console.log(`🧪 [ClientEncounter] Force check à (${x}, ${y})`);
    
    // Reset cooldowns
    this.lastEncounterTime = 0;
    this.stepCount = this.STEPS_PER_ENCOUNTER_CHECK;
    this.lastNotificationTime = 0;
    
    // Faire le check
    const result = this.checkEncounterOnMove(x, y);
    
    // Afficher le résultat
    if (window.showGameNotification) {
      const message = result.shouldTrigger 
        ? `🎲 Force encounter: SUCCESS (${result.zoneId})`
        : `❌ Force encounter: FAILED (${result.reason})`;
        
      window.showGameNotification(
        message,
        result.shouldTrigger ? 'success' : 'warning',
        {
          duration: 3000,
          position: 'bottom-center'
        }
      );
    }
    
    return result;
  }

  // OBTENIR INFO SUR POSITION ACTUELLE
  getPositionInfo(x, y) {
    const isOnGrass = this.isPositionOnGrass(x, y);
    const isOnWater = this.isPositionOnWater(x, y);
    const zoneId = this.getEncounterZoneAt(x, y);
    const canEncounter = (isOnGrass || isOnWater) && zoneId !== null;
    
    return {
      isOnGrass,
      isOnWater,
      zoneId,
      canEncounter,
      position: { x, y }
    };
  }

  // ✅ DEBUG DES ZONES CHARGÉES
  debugZones() {
    console.log(`🔍 [ClientEncounter] === DEBUG ZONES ===`);
    console.log(`📊 Total zones: ${this.encounterZones.size}`);
    
    this.encounterZones.forEach((zone, id) => {
      console.log(`   📍 Zone ${id}: ${zone.zoneId}`);
      console.log(`      Bounds: (${zone.bounds.left}, ${zone.bounds.top}) to (${zone.bounds.right}, ${zone.bounds.bottom})`);
    });
    
    console.log(`🌿 Grass tiles: ${this.grassTiles.size}`);
    console.log(`🌊 Water tiles: ${this.waterTiles.size}`);
  }

  // ✅ DEBUG COMPLET DU SYSTÈME
  debugSystem() {
    console.log(`🔍 [ClientEncounter] === DEBUG SYSTÈME COMPLET ===`);
    
    // Stats générales
    console.log(`📊 Statistiques:`, this.encounterStats);
    
    // État actuel
    console.log(`⏰ Cooldowns:`, {
      encounterCooldown: this.CLIENT_ENCOUNTER_COOLDOWN,
      lastEncounterTime: this.lastEncounterTime,
      timeSinceLastEncounter: Date.now() - this.lastEncounterTime,
      notificationCooldown: this.encounterNotificationCooldown,
      lastNotificationTime: this.lastNotificationTime,
      timeSinceLastNotification: Date.now() - this.lastNotificationTime
    });
    
    // Données de carte
    console.log(`🗺️ Données carte:`, {
      mapLoaded: !!this.mapData,
      encounterZones: this.encounterZones.size,
      grassTiles: this.grassTiles.size,
      waterTiles: this.waterTiles.size
    });
    
    // Système de notification
    console.log(`🔔 Système notification:`, {
      available: !!window.showGameNotification,
      notificationManager: !!window.NotificationManager,
      gameNotificationSystem: !!window.gameNotificationSystem
    });
    
    // Test de position (si possible)
    if (window.game) {
      const scene = window.game.scene.getScenes(true)[0];
      if (scene && scene.playerManager) {
        const player = scene.playerManager.getMyPlayer();
        if (player) {
          const posInfo = this.getPositionInfo(player.x, player.y);
          console.log(`👤 Position joueur:`, posInfo);
        }
      }
    }
    
    return {
      stats: this.encounterStats,
      zones: this.encounterZones.size,
      tiles: { grass: this.grassTiles.size, water: this.waterTiles.size },
      notification: !!window.showGameNotification
    };
  }

  // RESET COOLDOWNS (pour tests)
  resetCooldowns() {
    this.lastEncounterTime = 0;
    this.stepCount = 0;
    this.lastNotificationTime = 0;
    
    if (window.showGameNotification) {
      window.showGameNotification(
        '🔄 Encounter cooldowns reset',
        'info',
        {
          duration: 1500,
          position: 'bottom-right'
        }
      );
    }
    
    console.log(`🔄 [ClientEncounter] Cooldowns reset`);
  }

  // ✅ OBTENIR STATS POUR DEBUG
  getStats() {
    return {
      encounterZonesCount: this.encounterZones.size,
      grassTilesCount: this.grassTiles.size,
      waterTilesCount: this.waterTiles.size,
      lastEncounterTime: this.lastEncounterTime,
      stepCount: this.stepCount,
      stats: this.encounterStats,
      cooldowns: {
        encounter: this.CLIENT_ENCOUNTER_COOLDOWN,
        notification: this.encounterNotificationCooldown
      },
      notificationSystem: {
        available: !!window.showGameNotification,
        manager: !!window.NotificationManager
      }
    };
  }

  // ✅ CONFIGURER LES COOLDOWNS
  setCooldowns(encounterCooldown, notificationCooldown) {
    if (encounterCooldown !== undefined) {
      this.CLIENT_ENCOUNTER_COOLDOWN = encounterCooldown;
    }
    if (notificationCooldown !== undefined) {
      this.encounterNotificationCooldown = notificationCooldown;
    }
    
    console.log(`⚙️ [ClientEncounter] Cooldowns mis à jour:`, {
      encounter: this.CLIENT_ENCOUNTER_COOLDOWN,
      notification: this.encounterNotificationCooldown
    });
  }

  // ✅ MÉTHODES POUR L'INTÉGRATION AVEC LE SYSTÈME DE COMBAT

  canTriggerEncounter(x, y) {
    const info = this.getPositionInfo(x, y);
    return info.canEncounter;
  }

  getZoneDataForServer(x, y) {
    const info = this.getPositionInfo(x, y);
    return {
      zoneId: info.zoneId,
      method: info.isOnWater ? 'fishing' : 'grass',
      canEncounter: info.canEncounter,
      position: { x, y }
    };
  }

  simulateSteps(count) {
    this.stepCount += count;
    
    if (window.showGameNotification) {
      window.showGameNotification(
        `👟 ${count} steps simulated (total: ${this.stepCount})`,
        'info',
        {
          duration: 1500,
          position: 'bottom-left'
        }
      );
    }
    
    console.log(`👟 [ClientEncounter] ${count} pas simulés (total: ${this.stepCount})`);
  }

  // ✅ MÉTHODE CLEANUP
  destroy() {
    // Nettoyer la notification active
    if (this.currentEncounterNotification) {
      try {
        if (this.currentEncounterNotification.remove) {
          this.currentEncounterNotification.remove();
        }
      } catch (error) {
        // Ignorer
      }
      this.currentEncounterNotification = null;
    }
    
    // Reset des données
    this.mapData = null;
    this.encounterZones.clear();
    this.grassTiles.clear();
    this.waterTiles.clear();
    
    console.log(`🧹 [ClientEncounter] Manager détruit`);
  }
}

// ✅ FONCTIONS UTILITAIRES GLOBALES POUR LE DEBUG
if (typeof window !== 'undefined') {
  // Fonction de test rapide
  window.testEncounterNotification = function() {
    if (window.showGameNotification) {
      window.showGameNotification(
        '🎲 Test encounter notification',
        'info',
        {
          duration: 3000,
          position: 'top-center',
          bounce: true,
          onClick: () => {
            window.showGameNotification('Encounter notification clicked!', 'success', { duration: 2000 });
          }
        }
      );
    } else {
      console.warn('⚠️ Système de notification non disponible');
    }
  };
  
  // Fonction pour tester différents types de notifications d'encounter
  window.testEncounterTypes = function() {
    if (!window.showGameNotification) {
      console.warn('⚠️ Système de notification non disponible');
      return;
    }
    
    const tests = [
      { msg: '🌿 Grass encounter possible!', type: 'info', delay: 0 },
      { msg: '🎣 Water encounter detected!', type: 'info', delay: 1000 },
      { msg: '⚔️ Wild Pokémon appeared!', type: 'warning', delay: 2000 },
      { msg: '✨ Shiny encounter!', type: 'success', delay: 3000 }
    ];
    
    tests.forEach(test => {
      setTimeout(() => {
        window.showGameNotification(test.msg, test.type, {
          duration: 2500,
          position: 'top-center',
          bounce: true
        });
      }, test.delay);
    });
  };
}
