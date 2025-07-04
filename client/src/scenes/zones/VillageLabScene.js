// ===============================================
// VillageLabScene.js - Version simple comme les autres scènes + Starter
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';
import { integrateStarterSelectorToScene } from '../../components/StarterSelector.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'villagelab');
    this.transitionCooldowns = {};
    this.starterSelector = null;
    this.starterTableZones = [];
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[VillageLabScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions
    this.add.text(16, 16, 'Laboratoire Pokémon\nFlèches pour se déplacer\nAppuyez sur "E" près de la table du professeur\nAppuyez sur "T" pour test starter', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil
    this.setupLabEvents();
    
    // Setup du système starter
    this.setupStarterSystem();
  }

  setupLabEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[VillageLabScene] Bienvenue au Laboratoire !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLaboratoire Pokémon\nConnected!');
      }
    });
  }

  setupStarterSystem() {
    console.log("[VillageLabScene] Setup système starter...");
    
    try {
      // Intégrer le StarterSelector
      this.starterSelector = integrateStarterSelectorToScene(this, this.networkManager);
      console.log("✅ [VillageLabScene] StarterSelector intégré");
      
      // Charger les zones de la table starter
      this.loadStarterTableZones();
      
      // Setup des touches
      this.setupStarterControls();
      
      // Setup des handlers réseau
      this.setupStarterNetworkHandlers();
      
    } catch (error) {
      console.error("❌ [VillageLabScene] Erreur setup starter:", error);
    }
  }

  loadStarterTableZones() {
    this.starterTableZones = [];
    
    if (!this.map) {
      console.warn("[VillageLabScene] Carte non chargée");
      return;
    }

    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn("[VillageLabScene] Layer 'Worlds' non trouvé");
      return;
    }

    worldsLayer.objects.forEach((obj) => {
      if (this.isStarterTable(obj)) {
        const zone = {
          x: obj.x,
          y: obj.y,
          width: obj.width || 32,
          height: obj.height || 32,
          centerX: obj.x + (obj.width || 32) / 2,
          centerY: obj.y + (obj.height || 32) / 2,
          name: obj.name || 'StarterTable',
          radius: Math.max(obj.width || 32, obj.height || 32) + 50
        };
        
        this.starterTableZones.push(zone);
        console.log(`✅ [VillageLabScene] Table starter trouvée:`, zone);
      }
    });

    console.log(`[VillageLabScene] ${this.starterTableZones.length} table(s) starter chargée(s)`);
  }

  isStarterTable(obj) {
    // Vérifier par propriétés
    if (obj.properties) {
      if (Array.isArray(obj.properties)) {
        const prop = obj.properties.find(p => p.name === 'startertable' || p.name === 'starterTable');
        if (prop && (prop.value === true || prop.value === 'true')) {
          return true;
        }
      } else if (typeof obj.properties === 'object') {
        if (obj.properties.startertable === true || obj.properties.starterTable === true) {
          return true;
        }
      }
    }
    
    // Vérifier par nom
    if (obj.name && obj.name.toLowerCase().includes('starter')) {
      return true;
    }
    
    return false;
  }

  setupStarterControls() {
    // Touche E pour interaction
    this.input.keyboard.on('keydown-E', () => {
      console.log("[VillageLabScene] Touche E - Vérification proximité...");
      
      if (this.isPlayerNearStarterTable()) {
        console.log("✅ Joueur proche de la table, déclenchement starter");
        this.triggerStarterSelection();
      } else {
        console.log("❌ Joueur trop loin de la table");
        this.showMessage("Approchez-vous de la table du professeur.");
      }
    });

    // Touche T pour test
    this.input.keyboard.on('keydown-T', () => {
      console.log("[VillageLabScene] Test starter forcé");
      this.showStarterSelection();
    });
  }

  isPlayerNearStarterTable() {
    const player = this.playerManager?.getMyPlayer();
    if (!player || this.starterTableZones.length === 0) {
      return false;
    }

    for (const zone of this.starterTableZones) {
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y,
        zone.centerX, zone.centerY
      );
      
      if (distance <= zone.radius) {
        console.log(`[VillageLabScene] Joueur proche de ${zone.name} (distance: ${Math.round(distance)}px)`);
        return true;
      }
    }
    
    return false;
  }

  triggerStarterSelection() {
    if (!this.networkManager?.room) {
      console.error("[VillageLabScene] Pas de connexion serveur");
      this.showMessage("Erreur de connexion serveur");
      return;
    }

    console.log("[VillageLabScene] Envoi demande starter au serveur...");
    this.networkManager.room.send("checkStarterEligibility");
  }

  showStarterSelection(availableStarters = null) {
    console.log("[VillageLabScene] Affichage sélection starter");
    
    if (this.starterSelector && typeof this.starterSelector.show === 'function') {
      this.starterSelector.show(availableStarters);
    } else {
      console.warn("[VillageLabScene] StarterSelector non disponible");
      this.showMessage("StarterSelector non disponible");
    }
  }

  setupStarterNetworkHandlers() {
    if (!this.networkManager?.room) {
      console.warn("[VillageLabScene] Pas de room pour les handlers");
      return;
    }

    // Réponse d'éligibilité
    this.networkManager.room.onMessage("starterEligibility", (data) => {
      console.log("[VillageLabScene] Réponse éligibilité:", data);
      
      if (data.eligible) {
        this.showStarterSelection();
      } else {
        this.showMessage(data.message || "Vous ne pouvez pas choisir de starter.");
      }
    });

    // Confirmation de réception du starter
    this.networkManager.room.onMessage("starterReceived", (data) => {
      console.log("[VillageLabScene] Starter reçu:", data);
      this.showMessage(data.message || "Starter reçu avec succès !");
    });

    // Demande du serveur
    this.networkManager.room.onMessage("requestStarterSelection", (data) => {
      console.log("[VillageLabScene] Serveur demande sélection starter");
      this.showStarterSelection(data.availableStarters);
    });

    console.log("✅ [VillageLabScene] Handlers starter configurés");
  }

  showMessage(message) {
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

  cleanup() {
    console.log("[VillageLabScene] cleanup appelé");
    
    // Nettoyer le starter selector
    if (this.starterSelector) {
      if (typeof this.starterSelector.destroy === 'function') {
        this.starterSelector.destroy();
      }
      this.starterSelector = null;
    }
    
    // Nettoyer les zones
    this.starterTableZones = [];
    this.transitionCooldowns = {};
    
    super.cleanup();
  }
}

// ✅ Fonctions utilitaires globales simples
window.testLabStarter = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.showStarterSelection) {
    labScene.showStarterSelection();
  } else {
    console.warn("❌ VillageLabScene non trouvée");
  }
};

window.debugLabStarter = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene) {
    console.log("🔍 Debug VillageLabScene:");
    console.log("- Tables starter:", labScene.starterTableZones.length);
    console.log("- StarterSelector:", !!labScene.starterSelector);
    console.log("- NetworkManager:", !!labScene.networkManager);
    console.log("- Room:", !!labScene.networkManager?.room);
    
    const player = labScene.playerManager?.getMyPlayer();
    if (player) {
      console.log("- Joueur position:", { x: player.x, y: player.y });
      console.log("- Proche table:", labScene.isPlayerNearStarterTable());
    }
  } else {
    console.warn("❌ VillageLabScene non trouvée");
  }
};

console.log("✅ VillageLabScene chargée avec système starter simple");
console.log("🎮 Commandes disponibles:");
console.log("  • window.testLabStarter() - Test starter");
console.log("  • window.debugLabStarter() - Debug info");
console.log("  • [E] près de la table - Demander starter");
console.log("  • [T] - Test starter forcé");
