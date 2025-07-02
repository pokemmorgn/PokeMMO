// ===============================================
// VillageLabScene.js - Version avec syntaxe corrigée
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

  // ✅ AMÉLIORATION: Position par défaut pour VillageLabScene
  getDefaultSpawnPosition(fromZone) {
    switch(fromZone) {
      case 'VillageScene':
        return { x: 50, y: 100 }; // Entrée depuis le village
      default:
        return { x: 50, y: 100 }; // Position par défaut
    }
  }

  // ✅ NOUVEAU: Hook pour logique spécifique après positionnement
  onPlayerPositioned(player, initData) {
    console.log(`[VillageLabScene] Joueur positionné à (${player.x}, ${player.y})`);
  }

  create() {
    console.log("🚨 DEBUT VillageLabScene.create()");
    super.create();
    console.log("✅ BaseZoneScene.create() appelé");

    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes\nPress "T" to test StarterSelector\nPress "E" near starter table', {
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
        console.log("[VillageLabScene] Réponse starterEligibility:", data);
        if (data.eligible) {
          this.showStarterSelection();
        } else {
          this.showSimpleDialog("Professeur", data.message || "Vous ne pouvez pas choisir de starter.");
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

  // ✅ MÉTHODE MODIFIÉE: Configuration des triggers avec détection automatique
  addStarterTrigger() {
    console.log("🎯 [VillageLabScene] Configuration triggers starter...");
    
    // Charger les zones de starter table depuis la carte
    this.loadStarterTableZones();
    
    // ✅ TRIGGER: Touche T pour test (toujours disponible)
    this.input.keyboard.on('keydown-T', () => {
      console.log("🧪 [TEST] Touche T - Test StarterSelector");
      this.showStarterSelection();
    });

    // ✅ TRIGGER: Touche E pour interaction avec table starter
    this.input.keyboard.on('keydown-E', () => {
      console.log("🎯 [E] Tentative interaction starter...");
      
      if (this.isPlayerNearStarterTable()) {
        console.log("✅ [E] Joueur près de la table - Déclenchement");
        this.triggerStarterSelection();
      } else {
        console.log("❌ [E] Joueur trop loin de la table");
        // Utiliser une méthode sûre pour afficher le message
        this.showSafeMessage("Approchez-vous de la table du professeur.");
      }
    });

    console.log("✅ [VillageLabScene] Triggers starter configurés");
  }

  // ✅ NOUVELLE MÉTHODE: Charger les zones depuis la carte Tiled
  loadStarterTableZones() {
    console.log("📍 [StarterTable] Recherche des zones starter table...");
    
    this.starterTableZones = []; // Reset
    
    if (!this.map) {
      console.error("❌ [StarterTable] Carte non chargée");
      return;
    }

    // Chercher dans tous les layers
    let foundZones = 0;
    
    this.map.layers.forEach((layer) => {
      if (layer.type === 'objectgroup' && layer.objects) {
        console.log(`🔍 [StarterTable] Vérification layer: ${layer.name} (${layer.objects.length} objets)`);
        
        layer.objects.forEach((obj, index) => {
          console.log(`🔍 [StarterTable] Objet ${index}:`, {
            name: obj.name,
            type: obj.type,
            properties: obj.properties,
            x: obj.x,
            y: obj.y
          });
          
          // Vérifier si cet objet a la propriété "startertable"
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
            
            // Créer un indicateur visuel (optionnel, pour debug)
            this.createStarterTableIndicator(zone);
          }
        });
      }
    });
    
    console.log(`📊 [StarterTable] Total zones starter trouvées: ${foundZones}`);
    
    if (foundZones === 0) {
      console.warn("⚠️ [StarterTable] Aucune zone starter table trouvée!");
      console.log("💡 [StarterTable] Assurez-vous que votre carte Tiled contient un objet avec la propriété 'startertable' = true");
    }
  }

  // ✅ MÉTHODE: Vérifier si un objet a la propriété startertable
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

  // ✅ MÉTHODE: Créer un indicateur visuel pour debug
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
      'STARTER TABLE\n[E] pour interagir',
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

  // ✅ MÉTHODE: Vérifier si le joueur est près d'une starter table
  isPlayerNearStarterTable() {
    if (!this.player || !this.starterTableZones || this.starterTableZones.length === 0) {
      console.log("❌ [Proximité] Pas de joueur ou pas de zones starter");
      return false;
    }
    
    const playerX = this.player.x;
    const playerY = this.player.y;
    const detectionRange = 300; // Distance de détection en pixels
    
    for (const zone of this.starterTableZones) {
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        zone.centerX, zone.centerY
      );
      
      if (distance <= detectionRange) {
        console.log(`🎯 [StarterTable] Joueur près de ${zone.name}: distance ${Math.round(distance)}px`);
        return true;
      }
    }
    
    console.log(`❌ [StarterTable] Joueur trop loin. Position: (${playerX}, ${playerY})`);
    
    // Debug: afficher les zones disponibles
    this.starterTableZones.forEach((zone, index) => {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, zone.centerX, zone.centerY);
      console.log(`  📏 ${zone.name}: centre(${zone.centerX}, ${zone.centerY}) - distance: ${Math.round(dist)}px`);
    });
    
    return false;
  }

  // ✅ MÉTHODE: Déclencher la sélection starter avec vérification serveur
  triggerStarterSelection() {
    console.log("🎯 [VillageLabScene] Déclenchement sélection starter...");
    
    if (this.networkManager?.room) {
      console.log("📤 [VillageLabScene] Envoi checkStarterEligibility...");
      this.networkManager.room.send("checkStarterEligibility");
    } else {
      console.warn("⚠️ [VillageLabScene] NetworkManager indisponible, test direct");
      this.showStarterSelection();
    }
  }

  // ✅ MÉTHODE SÉCURISÉE: Afficher un message sans boucle infinie
  showSafeMessage(message) {
    // Utiliser directement console.log au lieu des notifications
    console.log(`💬 [VillageLabScene] ${message}`);
    
    // Optionnel: Créer un dialogue simple sans passer par le système de notifications
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

    this.time.delayedCall(2000, () => {
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
    // Simple : à adapter selon ce que tu veux côté UI
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

  // ✅ NOUVELLES MÉTHODES STARTER SELECTOR

  onStarterConfirmed(data) {
    // Actions après confirmation du starter
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

    // Optionnel: Retour au village après sélection
    // this.time.delayedCall(6000, () => {
    //   this.changeToZone('VillageScene', { x: 400, y: 300 });
    // });
  }

  // ✅ MÉTHODE PUBLIQUE: Test manuel
  testStarterSelection() {
    console.log("🧪 [VillageLabScene] Test manuel du StarterSelector");
    this.showStarterSelection();
  }

  // ✅ MÉTHODE: Gérer les inputs de la scène
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
