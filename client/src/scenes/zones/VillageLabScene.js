// ===============================================
// VillageLabScene.js - Version corrigée avec debug amélioré
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';
import { integrateStarterSelectorToScene } from '../../components/StarterSelector.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'villagelab');
    this.transitionCooldowns = {};
    this.starterSelector = null;
    this.starterTableZones = []; // Zones de détection pour la table starter
  }

  // ✅ Position par défaut pour VillageLabScene
  getDefaultSpawnPosition(fromZone) {
    switch(fromZone) {
      case 'VillageScene':
        return { x: 50, y: 100 }; // Entrée depuis le village
      default:
        return { x: 50, y: 100 }; // Position par défaut
    }
  }

  // ✅ Hook pour logique spécifique après positionnement
  onPlayerPositioned(player, initData) {
    console.log(`[VillageLabScene] Joueur positionné à (${player.x}, ${player.y})`);
  }

  create() {
    console.log("🚨 DEBUT VillageLabScene.create()");
    super.create();
    console.log("✅ BaseZoneScene.create() appelé");

    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes\nPress "T" to test StarterSelector\nPress "E" near starter table\nPress "F" to force starter test', {
      font: '18px monospace',
      fill: '#000000',
      padding: { x: 20, y: 10 },
      backgroundColor: '#ffffff',
    }).setScrollFactor(0).setDepth(30);

    console.log("⚙️ Setup lab events...");
    this.setupLabEvents();

    console.log("⚙️ Setup NPCs...");
    this.setupNPCs();
    
    console.log("⚙️ Setup StarterSelector...");
    this.setupStarterSelector();

    console.log("🚨 FIN VillageLabScene.create()");
  }

  setupLabEvents() {
    this.time.delayedCall(1000, () => {
      console.log("🧪 Bienvenue au Laboratoire !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLaboratoire Pokémon\nConnected!');
        console.log("InfoText mise à jour");
      }
    });

    // Gestion des messages serveur (dialogues, starter...)
    if (this.networkManager?.room) {
      this.networkManager.room.onMessage('professorDialog', (data) => this.showProfessorDialog(data));
      this.networkManager.room.onMessage('starterReceived', (data) => this.showStarterReceived(data));
      this.networkManager.room.onMessage('welcomeToLab', (data) => this.showWelcomeMessage(data));
      this.networkManager.room.onMessage("requestStarterSelection", (data) => {
        console.log("📥 [VillageLabScene] Demande de sélection starter du serveur");
        this.showStarterSelection(data.availableStarters);
      });
      this.networkManager.room.onMessage("starterSelected", (data) => {
        console.log("✅ [VillageLabScene] Starter confirmé:", data);
        this.onStarterConfirmed(data);
      });

      // Handler pour la réponse d'éligibilité
      this.networkManager.room.onMessage("starterEligibility", (data) => {
        console.log("📥 [VillageLabScene] === RÉPONSE ÉLIGIBILITÉ REÇUE ===");
        console.log("📊 Données reçues:", data);
        
        if (data.eligible) {
          console.log("✅ [VillageLabScene] Joueur éligible - Affichage sélection");
          this.showStarterSelection();
        } else {
          console.log("❌ [VillageLabScene] Joueur non éligible:", data.reason);
          console.log("📍 Debug position:", data.playerPosition);
          console.log("🏢 Table configurée:", data.tablePosition);
          
          let message = data.message || "Vous ne pouvez pas choisir de starter.";
          
          // Ajouter des infos de debug si disponibles
          if (data.debugInfo) {
            message += `\nDébug: ${data.debugInfo.tablesConfigured} tables configurées`;
          }
          
          this.showSimpleDialog("Professeur", message);
        }
      });
    }
  }

  setupStarterSelector() {
    try {
      // Intégrer le StarterSelector à cette scène
      this.starterSelector = integrateStarterSelectorToScene(this, this.networkManager);
      
      console.log("✅ [VillageLabScene] StarterSelector intégré");
      
      // Ajouter les triggers
      this.addStarterTrigger();
      
    } catch (error) {
      console.error("❌ [VillageLabScene] Erreur intégration StarterSelector:", error);
    }
  }

  // ✅ Configuration des triggers avec détection automatique et debug amélioré
  addStarterTrigger() {
    console.log("🎯 [VillageLabScene] Configuration triggers starter...");
    
    // Charger les zones de starter table depuis la carte
    this.loadStarterTableZones();
    
    // ✅ TRIGGER: Touche T pour test (toujours disponible)
    this.input.keyboard.on('keydown-T', () => {
      console.log("🧪 [TEST] Touche T - Test StarterSelector");
      this.showStarterSelection();
    });

    // ✅ TRIGGER: Touche F pour forcer le test (bypass proximité)
    this.input.keyboard.on('keydown-F', () => {
      console.log("🔧 [FORCE] Touche F - Test forcé avec bypass");
      this.triggerStarterSelection();
    });

    // ✅ TRIGGER: Touche E pour interaction avec table starter
    this.input.keyboard.on('keydown-E', () => {
      console.log("🎯 [E] === INTERACTION E DÉCLENCHÉE ===");
      
      console.log("🎯 [E] Vérification proximité...");
      
      if (this.isPlayerNearStarterTable()) {
        console.log("✅ [E] Joueur proche - Déclenchement");
        this.triggerStarterSelection();
      } else {
        console.log("❌ [E] Joueur trop loin");
        
        // Afficher la position et les zones pour debug
        if (this.player) {
          console.log(`👤 Position actuelle: (${this.player.x}, ${this.player.y})`);
        }
        
        if (this.starterTableZones.length > 0) {
          console.log("🏢 Tables disponibles:");
          this.starterTableZones.forEach((zone, i) => {
            const distance = this.player ? Phaser.Math.Distance.Between(
              this.player.x, this.player.y,
              zone.centerX, zone.centerY
            ) : -1;
            console.log(`  ${i}: ${zone.name} à (${zone.centerX}, ${zone.centerY}) - Distance: ${Math.round(distance)}px`);
          });
        } else {
          console.log("❌ Aucune table starter détectée!");
        }
        
        this.showSafeMessage("Approchez-vous de la table du professeur.");
      }
    });

    console.log("✅ [VillageLabScene] Triggers starter configurés");
  }

  // ✅ Charger les zones depuis la carte Tiled
  // ✅ Charger les zones depuis la carte Tiled - VERSION AVEC TILES
loadStarterTableZones() {
  console.log("📍 [StarterTable] Recherche des zones starter table...");
  
  this.starterTableZones = []; // Reset
  
  if (!this.map) {
    console.error("❌ [StarterTable] Carte non chargée");
    return;
  }

  let foundZones = 0;
  
  // ✅ FIX: Utiliser getObjectLayer() pour les objectgroups
  const worldsObjectLayer = this.map.getObjectLayer('Worlds');
  
  if (worldsObjectLayer && worldsObjectLayer.objects) {
    console.log(`🔍 [StarterTable] ObjectLayer "Worlds" trouvé avec ${worldsObjectLayer.objects.length} objets`);
    
    worldsObjectLayer.objects.forEach((obj, index) => {
      console.log(`🔍 [StarterTable] Objet ${index}:`, {
        name: obj.name,
        type: obj.type,
        properties: obj.properties,
        x: obj.x,
        y: obj.y
      });
      
      if (this.hasStarterTableProperty(obj)) {
        const zone = {
          x: obj.x,
          y: obj.y,
          width: obj.width || 32,
          height: obj.height || 32,
          centerX: obj.x + (obj.width || 32) / 2,
          centerY: obj.y + (obj.height || 32) / 2,
          name: obj.name || 'StarterTable'
        };
        
        this.starterTableZones.push(zone);
        foundZones++;
        console.log(`✅ [StarterTable] Zone starter détectée:`, zone);
        this.createStarterTableIndicator(zone);
      }
    });
  } else {
    console.warn("⚠️ [StarterTable] Layer 'Worlds' non trouvé");
  }
  
  console.log(`📊 [StarterTable] Total zones starter trouvées: ${foundZones}`);
  
  if (foundZones === 0) {
    console.warn("⚠️ [StarterTable] Aucune zone starter table trouvée!");
  }
}
    
    // ✅ NOUVEAU: TILELAYER pour chercher dans "Worlds"
    else if (layer.type === 'tilelayer' && layer.name.toLowerCase().includes('worlds')) {
      console.log(`🔍 [StarterTable] TileLayer "${layer.name}": recherche tiles avec propriétés`);
      
      // Parcourir les tiles de ce layer
      if (layer.data && this.map.tilesets) {
        for (let y = 0; y < layer.height; y++) {
          for (let x = 0; x < layer.width; x++) {
            const tileIndex = y * layer.width + x;
            const gid = layer.data[tileIndex];
            
            if (gid > 0) {
              // Trouver le tileset et la tile
              const tileInfo = this.getTileInfo(gid);
              
              if (tileInfo && tileInfo.tile && tileInfo.tile.properties) {
                // Vérifier si cette tile a la propriété startertable
                if (this.hasStarterTableProperty(tileInfo.tile)) {
                  const zone = {
                    x: x * this.map.tilewidth,
                    y: y * this.map.tileheight,
                    width: this.map.tilewidth,
                    height: this.map.tileheight,
                    centerX: (x * this.map.tilewidth) + (this.map.tilewidth / 2),
                    centerY: (y * this.map.tileheight) + (this.map.tileheight / 2),
                    name: `StarterTable_Tile_${x}_${y}`
                  };
                  
                  this.starterTableZones.push(zone);
                  foundZones++;
                  console.log(`✅ [StarterTable] Zone starter détectée (tilelayer):`, zone);
                  this.createStarterTableIndicator(zone);
                }
              }
            }
          }
        }
      }
    }
  });
  
  console.log(`📊 [StarterTable] Total zones starter trouvées: ${foundZones}`);
  
  if (foundZones === 0) {
    console.warn("⚠️ [StarterTable] Aucune zone starter table trouvée!");
    console.log("💡 [StarterTable] Assurez-vous que votre carte Tiled contient un objet avec la propriété 'startertable' = true");
    console.log("📋 [StarterTable] Vérifiez le nom de vos layers et objets dans Tiled");
  }
}

// ✅ NOUVELLE MÉTHODE: Récupérer les infos d'une tile
getTileInfo(gid) {
  if (!this.map.tilesets) return null;
  
  for (const tileset of this.map.tilesets) {
    if (gid >= tileset.firstgid && gid < tileset.firstgid + tileset.tilecount) {
      const localId = gid - tileset.firstgid;
      
      if (tileset.tiles) {
        const tile = tileset.tiles.find(t => t.id === localId);
        if (tile) {
          return { tileset, tile, localId };
        }
      }
    }
  }
  
  return null;
}

  // ✅ Vérifier si un objet a la propriété startertable
  hasStarterTableProperty(obj) {
    // Vérifier les propriétés custom de Tiled
    if (obj.properties) {
      // Tiled peut stocker les propriétés de différentes façons
      if (Array.isArray(obj.properties)) {
        // Format tableau (Tiled récent)
        const starterProp = obj.properties.find(prop => 
          prop.name === 'startertable' || prop.name === 'starterTable'
        );
        if (starterProp && (starterProp.value === true || starterProp.value === 'true')) {
          console.log(`🎯 [StarterTable] Propriété trouvée (array):`, starterProp);
          return true;
        }
      } else if (typeof obj.properties === 'object') {
        // Format objet (Tiled ancien)
        if (obj.properties.startertable === true || 
            obj.properties.startertable === 'true' ||
            obj.properties.starterTable === true || 
            obj.properties.starterTable === 'true') {
          console.log(`🎯 [StarterTable] Propriété trouvée (object):`, obj.properties);
          return true;
        }
      }
    }
    
    // Fallback: Vérifier le nom ou type
    if (obj.name && obj.name.toLowerCase().includes('starter')) {
      console.log(`🎯 [StarterTable] Détecté par nom: ${obj.name}`);
      return true;
    }
    
    if (obj.type && obj.type.toLowerCase().includes('starter')) {
      console.log(`🎯 [StarterTable] Détecté par type: ${obj.type}`);
      return true;
    }
    
    return false;
  }

  // ✅ Créer un indicateur visuel pour debug
  createStarterTableIndicator(zone) {
    // Rectangle de debug (semi-transparent)
    const indicator = this.add.rectangle(
      zone.centerX,
      zone.centerY,
      zone.width,
      zone.height,
      0x00ff00,
      0.3
    );
    indicator.setDepth(5);
    
    // Texte indicatif
    const label = this.add.text(
      zone.centerX,
      zone.centerY - zone.height / 2 - 10,
      'STARTER TABLE\n[E] pour interagir\n[F] pour forcer',
      {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 150, 0, 0.8)',
        padding: { x: 4, y: 2 },
        align: 'center'
      }
    );
    label.setOrigin(0.5).setDepth(6);
    
    console.log(`🎨 [StarterTable] Indicateur visuel créé à (${zone.centerX}, ${zone.centerY})`);
  }

  // ✅ Vérifier si le joueur est près d'une starter table AVEC DEBUG AMÉLIORÉ
 // ✅ Vérifier si le joueur est près d'une starter table AVEC FIX PLAYER
isPlayerNearStarterTable() {
  console.log("🔍 [CLIENT] === VÉRIFICATION PROXIMITÉ TABLE ===");
  
  // ✅ FIX: Récupérer le joueur depuis PlayerManager
  const player = this.playerManager?.getMyPlayer();
  
  if (!player || !this.starterTableZones || this.starterTableZones.length === 0) {
    console.log("❌ [CLIENT] Pas de joueur ou pas de zones starter");
    console.log("  - player:", !!player);
    console.log("  - this.starterTableZones:", this.starterTableZones);
    return false;
  }
  
  const playerX = player.x;
  const playerY = player.y;
  const detectionRange = 100; // Range généreux pour les tests
  
  console.log(`👤 [CLIENT] Position joueur: (${playerX}, ${playerY})`);
  console.log(`🎯 [CLIENT] Range de détection: ${detectionRange}px`);
  console.log(`📊 [CLIENT] Nombre de zones starter: ${this.starterTableZones.length}`);
  
  for (const zone of this.starterTableZones) {
    const distance = Phaser.Math.Distance.Between(
      playerX, playerY,
      zone.centerX, zone.centerY
    );
    
    console.log(`📏 [CLIENT] Zone ${zone.name}:`);
    console.log(`  - Centre: (${zone.centerX}, ${zone.centerY})`);
    console.log(`  - Distance: ${Math.round(distance)}px`);
    console.log(`  - Seuil: ${detectionRange}px`);
    console.log(`  - Proche: ${distance <= detectionRange ? 'OUI' : 'NON'}`);
    
    if (distance <= detectionRange) {
      console.log(`✅ [CLIENT] JOUEUR PROCHE de ${zone.name}!`);
      return true;
    }
  }
  
  console.log(`❌ [CLIENT] JOUEUR TROP LOIN de toutes les tables`);
  return false;
}

  // ✅ Déclencher la sélection starter avec debug amélioré
  triggerStarterSelection() {
    console.log("🎯 [CLIENT] === DÉCLENCHEMENT SÉLECTION STARTER ===");
    
    // Vérifier NetworkManager
    if (!this.networkManager) {
      console.error("❌ [CLIENT] NetworkManager indisponible!");
      this.showSafeMessage("Erreur réseau - NetworkManager manquant");
      return;
    }
    
    if (!this.networkManager.room) {
      console.error("❌ [CLIENT] Room non connectée!");
      this.showSafeMessage("Erreur réseau - Room non connectée");
      return;
    }
    
    console.log("✅ [CLIENT] NetworkManager OK, envoi de la demande...");
    console.log("📤 [CLIENT] Envoi checkStarterEligibility...");
    
    try {
      this.networkManager.room.send("checkStarterEligibility");
      console.log("✅ [CLIENT] Message checkStarterEligibility envoyé!");
      
      // Debug: Afficher l'état de la connexion
      console.log("🔗 [CLIENT] État Room:", {
        id: this.networkManager.room.id,
        sessionId: this.networkManager.room.sessionId,
        state: this.networkManager.room.state
      });
      
    } catch (error) {
      console.error("❌ [CLIENT] Erreur envoi message:", error);
      this.showSafeMessage("Erreur lors de l'envoi de la demande");
    }
  }

  // ✅ Afficher un message sans boucle infinie
  showSafeMessage(message) {
    console.log(`💬 [VillageLabScene] ${message}`);
    
    // Créer un dialogue simple sans passer par le système de notifications
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      message,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
    });
  }

  setupNPCs() {
    console.log("⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => {
        this.createNPC(npcObj);
      });
    } else {
      console.warn("⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`Création NPC: ${npcData.name || 'Sans nom'}`);
    const color = npcData.name === 'Professeur' ? 0x2ecc71 : 0x3498db;
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      color
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Assistant');
    });

    console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`💬 Interaction avec ${npcName}`);
    if (npcName === 'Professeur') {
      // ✅ Interaction avec Professeur = demande d'éligibilité starter au serveur
      this.triggerStarterSelection();
    } else {
      const messages = {
        Assistant: 'Je m\'occupe de l\'entretien du laboratoire.',
        Chercheur: 'Nous étudions les Pokémon ici. Fascinant !',
        Stagiaire: 'J\'apprends encore... C\'est compliqué !',
      };
      const message = messages[npcName] || 'Bonjour ! Je travaille ici.';
      this.showSimpleDialog(npcName, message);
    }
  }

  showProfessorStarterDialog() {
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      'Professeur: "Bienvenue ! Choisissez votre premier Pokémon !"',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    // Afficher la sélection après 2 secondes
    this.time.delayedCall(2000, () => {
      dialogueBox.destroy();
      this.showStarterSelection();
    });
  }

  showSimpleDialog(npcName, message) {
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`💬 Dialogue avec ${npcName} détruit`);
    });
  }

  // === Gestion du dialogue professeur & starter via serveur ===

  showProfessorDialog(data) {
    const dialogBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Professeur: "${data.message}"`,
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 14, y: 10 },
        wordWrap: { width: 350 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    this.time.delayedCall(6000, () => dialogBox.destroy());
  }

  showStarterReceived(data) {
    const msg = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 40,
      data.message,
      {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffff00',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 20, y: 15 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(4000, () => msg.destroy());
  }

  showWelcomeMessage(data) {
    if (data.message) {
      const box = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 100,
        `Laboratoire: "${data.message}"`,
        {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: { x: 10, y: 8 },
          wordWrap: { width: 350 },
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

      this.time.delayedCall(3000, () => box.destroy());
    }
  }

  // ✅ Actions après confirmation du starter
  onStarterConfirmed(data) {
    console.log("🎉 [VillageLabScene] Actions après sélection du starter:", data);
    
    // Dialogue de félicitations
    const congratsBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Félicitations ! Vous avez choisi ${data.starterName || data.starterId} !`,
      {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#00ff00',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: { x: 20, y: 15 },
        align: 'center',
        wordWrap: { width: 400 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);

    // Animation de célébration
    this.tweens.add({
      targets: congratsBox,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: 2
    });

    // Supprimer après 5 secondes
    this.time.delayedCall(5000, () => {
      congratsBox.destroy();
    });
  }

  // ✅ Test manuel
  testStarterSelection() {
    console.log("🧪 [VillageLabScene] Test manuel du StarterSelector");
    this.showStarterSelection();
  }

  // ✅ Gérer les inputs de la scène
  update() {
    // Vérifier si la sélection de starter est active
    if (this.isStarterSelectionActive && this.isStarterSelectionActive()) {
      // Désactiver les mouvements du joueur pendant la sélection
      return; // Sortir de update() pour bloquer les autres inputs
    }

    // Appeler l'update parent pour le reste
    super.update();
  }

  // ✅ CLEAN UP
  cleanup() {
    // Nettoyer le StarterSelector
    if (this.starterSelector) {
      this.starterSelector.destroy();
      this.starterSelector = null;
    }

    // Nettoyer les zones starter
    this.starterTableZones = [];

    this.transitionCooldowns = {};
    console.log("⚙️ VillageLabScene cleanup appelé");
    super.cleanup();
  }

  destroy() {
    // Nettoyer le StarterSelector au destroy aussi
    if (this.starterSelector) {
      this.starterSelector.destroy();
      this.starterSelector = null;
    }

    // Nettoyer les zones starter
    this.starterTableZones = [];

    super.destroy();
  }
}

// ✅ FONCTIONS UTILITAIRES GLOBALES POUR TESTER
window.testLabStarter = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.testStarterSelection) {
    labScene.testStarterSelection();
  } else {
    console.warn("❌ VillageLabScene non trouvée ou pas de méthode test");
  }
};

window.getLabScene = () => {
  return window.game?.scene?.getScene('VillageLabScene');
};

// ✅ FONCTION DEBUG POUR TESTER LA DÉTECTION
window.debugStarterTable = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene) {
    console.log("🔍 Debug StarterTable zones:", labScene.starterTableZones);
    console.log("🎯 Joueur près d'une table:", labScene.isPlayerNearStarterTable());
    if (labScene.map) {
      console.log("🗺️ Layers disponibles:", labScene.map.layers.map(l => `${l.name} (${l.type})`));
    }
  } else {
    console.warn("❌ VillageLabScene non trouvée");
  }
};

// ✅ FONCTION POUR FORCER LA POSITION DU JOUEUR (debug)
// ✅ FONCTION POUR FORCER LA POSITION DU JOUEUR (debug)
window.movePlayerToTable = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.playerManager && labScene.starterTableZones.length > 0) {
    const player = labScene.playerManager.getMyPlayer();
    const table = labScene.starterTableZones[0];
    
    if (player && table) {
      player.x = table.centerX;
      player.y = table.centerY;
      console.log(`🎯 Joueur déplacé à (${table.centerX}, ${table.centerY})`);
    } else {
      console.warn("❌ Joueur ou table non trouvé");
    }
  } else {
    console.warn("❌ Impossible de déplacer le joueur");
  }
};
