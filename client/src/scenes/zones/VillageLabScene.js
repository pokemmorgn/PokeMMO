// ===============================================
// VillageLabScene.js - Version complète corrigée
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';
import { integrateStarterSelectorToScene } from '../../components/StarterSelector.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'villagelab');
    this.transitionCooldowns = {};
    this.starterSelector = null;
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

    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes\nPress "T" to test StarterSelector', {
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
      
      // ✅ NOUVEAU: Listeners pour StarterSelector
      this.networkManager.room.onMessage("requestStarterSelection", (data) => {
        console.log("📥 [VillageLabScene] Demande de sélection starter du serveur");
        this.showStarterSelection(data.availableStarters);
      });

      this.networkManager.room.onMessage("starterSelected", (data) => {
        console.log("✅ [VillageLabScene] Starter confirmé:", data);
        // Ici vous pouvez ajouter des actions après sélection
        this.onStarterConfirmed(data);
      });
    }
  }

  setupStarterSelector() {
    try {
      // Intégrer le StarterSelector à cette scène
      this.starterSelector = integrateStarterSelectorToScene(this, this.networkManager);
      
      console.log("✅ [VillageLabScene] StarterSelector intégré");
      
      // Ajouter un test de démo
      this.addStarterTrigger();
      
    } catch (error) {
      console.error("❌ [VillageLabScene] Erreur intégration StarterSelector:", error);
    }
  }

  addStarterTrigger() {
    // ✅ TRIGGER: Touche T pour tester
    this.input.keyboard.on('keydown-T', () => {
      console.log("🧪 [VillageLabScene] Test StarterSelector (Touche T)");
      this.showStarterSelection();
    });

    // ✅ TRIGGER: Zone interactive pour ouvrir la sélection (table du labo)
    const labTable = this.add.rectangle(200, 150, 80, 40, 0x8B4513, 0.8);
    labTable.setInteractive();
    labTable.setDepth(10);
    
    // Texte indicatif
    this.add.text(200, 130, 'Starter Table', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(11);

    labTable.on('pointerdown', () => {
      console.log("🧪 [VillageLabScene] Clic sur table du labo");
      this.showStarterSelection();
    });

    // ✅ TRIGGER: Interaction avec le Professeur pour commencer
    // (sera géré dans createNPC pour le Professeur)
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
      // ✅ NOUVEAU: Interaction avec Professeur = StarterSelector
      this.showProfessorStarterDialog();
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
