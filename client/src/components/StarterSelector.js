// Système de sélection de starter SIMPLE pour PokéMon MMO

export class StarterSelector {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.selectedStarterId = null;
    this.networkManager = null;
    
    // Containers Phaser
    this.container = null;
    this.pokeballs = [];
    this.starterSprites = [];
    
    // Configuration des starters
    this.starterConfig = [
      {
        id: 'bulbasaur',
        name: 'Bulbizarre',
        type: 'Plante',
        description: 'Un Pokémon Graine docile et loyal.',
        color: 0x4CAF50
      },
      {
        id: 'charmander', 
        name: 'Salamèche',
        type: 'Feu',
        description: 'Un Pokémon Lézard fougueux et brave.',
        color: 0xFF5722
      },
      {
        id: 'squirtle',
        name: 'Carapuce', 
        type: 'Eau',
        description: 'Un Pokémon Minitortue calme et sage.',
        color: 0x2196F3
      }
    ];
    
    // État de sélection
    this.currentlySelectedIndex = -1;
    this.isAnimating = false;
    
    console.log("🎯 [StarterSelector] Initialisé pour la scène:", scene.scene.key);
  }

  // ✅ MÉTHODE PRINCIPALE: Initialiser avec le NetworkManager
  initialize(networkManager) {
    this.networkManager = networkManager;
    
    if (this.networkManager?.room) {
      this.setupNetworkListeners();
    }
    
    console.log("✅ [StarterSelector] Initialisé avec NetworkManager");
    return this;
  }

  // ✅ SETUP DES LISTENERS RÉSEAU
  setupNetworkListeners() {
    if (!this.networkManager?.room) return;

    // Écouter la demande de sélection de starter du serveur
    this.networkManager.room.onMessage("showStarterSelection", (data) => {
      console.log("📥 [StarterSelector] Demande de sélection reçue:", data);
      this.show(data.availableStarters || this.starterConfig);
    });

    // Écouter la confirmation de sélection
    this.networkManager.room.onMessage("starterSelected", (data) => {
      console.log("✅ [StarterSelector] Starter confirmé:", data);
      this.onStarterConfirmed(data);
    });

    // Écouter les erreurs de sélection
    this.networkManager.room.onMessage("starterSelectionError", (data) => {
      console.error("❌ [StarterSelector] Erreur sélection:", data);
      this.showError(data.message || "Erreur lors de la sélection");
    });

    console.log("📡 [StarterSelector] Listeners réseau configurés");
  }

  // ✅ MÉTHODE: Créer la texture de pokéball
  createPokeballTexture() {
    if (this.scene.textures.exists('pokeball_starter')) return;
    
    const size = 32; // Plus petit
    const graphics = this.scene.add.graphics();

    // Partie supérieure rouge
    graphics.fillStyle(0xFF0000);
    graphics.fillCircle(size/2, size/2, size/2);

    // Partie inférieure blanche
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(size/2, size/2, size/2);
    graphics.fillRect(0, size/2, size, size/2);

    // Ligne centrale noire
    graphics.lineStyle(2, 0x000000);
    graphics.lineBetween(0, size/2, size, size/2);

    // Bouton central
    graphics.fillStyle(0x000000);
    graphics.fillCircle(size/2, size/2, 4);
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(size/2, size/2, 2);

    graphics.generateTexture('pokeball_starter', size, size);
    graphics.destroy();
  }

  // ✅ MÉTHODE: Créer placeholder pour starter
  createStarterPlaceholder(starter) {
    const textureKey = `starter_${starter.id}`;
    if (this.scene.textures.exists(textureKey)) return;
    
    const size = 48; // Plus petit
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(starter.color);
    graphics.fillRoundedRect(0, 0, size, size, 8);
    
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRoundedRect(4, 4, size-8, size-8, 6);
    
    // Première lettre du nom
    graphics.fillStyle(starter.color);
    
    graphics.generateTexture(textureKey, size, size);
    graphics.destroy();
  }

  // ✅ MÉTHODE PRINCIPALE: Afficher la sélection
  show(availableStarters = null) {
    if (this.isVisible) {
      console.warn("⚠️ [StarterSelector] Déjà visible");
      return;
    }

    console.log("🎯 [StarterSelector] Affichage de la sélection...");
    
    // Bloquer les inputs du joueur
    this.blockPlayerInput(true);
    
    // Utiliser les starters fournis ou la config par défaut
    this.starterOptions = availableStarters || this.starterConfig;
    
    // Précharger les assets si nécessaire
    this.preloadAssets();
    
    // Créer l'interface
    this.createInterface();
    
    // Marquer comme visible
    this.isVisible = true;
    
    // Animation d'entrée
    this.animateIn();
    
    // Notification
    if (window.showGameNotification) {
      window.showGameNotification(
        "Choisissez votre starter Pokémon !",
        'info',
        { duration: 3000, position: 'top-center' }
      );
    }
  }

  // ✅ MÉTHODE: Précharger les assets nécessaires
  preloadAssets() {
    // Créer pokéball
    this.createPokeballTexture();

    // Créer sprites des starters
    this.starterConfig.forEach(starter => {
      this.createStarterPlaceholder(starter);
    });
  }

  // ✅ MÉTHODE: Créer l'interface principale (version compacte)
  createInterface() {
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // Container principal
    this.container = this.scene.add.container(centerX, centerY);
    this.container.setDepth(1000);

    // Fond semi-transparent
    const bg = this.scene.add.rectangle(0, 0, 300, 200, 0x000000, 0.8); // Plus petit
    this.container.add(bg);

    // Titre
    const title = this.scene.add.text(0, -80, 'Choisissez votre Pokémon', {
      fontSize: '16px', // Plus petit
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);
    this.container.add(title);

    // Créer les starters
    this.createStarters();
    
    // Créer l'UI (textes, boutons)
    this.createUI();
    
    // Rendre invisible pour l'animation
    this.container.setAlpha(0);
  }

  // ✅ MÉTHODE: Créer les starters (version compacte)
  createStarters() {
    this.pokeballs = [];
    this.starterSprites = [];

    this.starterOptions.forEach((starter, index) => {
      // Positions horizontales
      const posX = (index - 1) * 80; // -80, 0, 80
      const posY = -20;
      
      // Pokéball cliquable
      const pokeball = this.scene.add.image(posX, posY, 'pokeball_starter');
      pokeball.setInteractive();
      
      // Sprite du starter (au-dessus de la pokéball)
      const starterSprite = this.scene.add.image(
        posX, 
        posY - 30,
        `starter_${starter.id}`
      );
      starterSprite.setAlpha(0.7);

      // Animation de hover
      pokeball.on('pointerover', () => {
        if (!this.isAnimating) {
          pokeball.setScale(1.2);
          starterSprite.setScale(1.1);
          starterSprite.setAlpha(1.0);
          this.showStarterInfo(starter, index);
        }
      });

      pokeball.on('pointerout', () => {
        if (!this.isAnimating && this.currentlySelectedIndex !== index) {
          pokeball.setScale(1.0);
          starterSprite.setScale(1.0);
          starterSprite.setAlpha(0.7);
        }
      });

      // Click handler
      pokeball.on('pointerdown', () => {
        if (!this.isAnimating) {
          this.selectStarter(starter, index);
        }
      });

      this.container.add([pokeball, starterSprite]);
      this.pokeballs.push(pokeball);
      this.starterSprites.push(starterSprite);
    });
  }

  // ✅ MÉTHODE: Créer l'UI (textes, boutons) - version compacte
  createUI() {
    // Zone d'information du starter
    this.infoText = this.scene.add.text(0, 40, '', {
      fontSize: '12px', // Plus petit
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      align: 'center',
      wordWrap: { width: 280 }
    }).setOrigin(0.5);

    // Bouton de confirmation
    this.confirmButton = this.scene.add.rectangle(0, 70, 120, 25, 0x4CAF50); // Plus petit
    this.confirmButton.setStrokeStyle(2, 0x2E7D32);
    this.confirmButton.setInteractive();
    this.confirmButton.setAlpha(0);

    this.confirmButtonText = this.scene.add.text(0, 70, 'CONFIRMER', {
      fontSize: '12px', // Plus petit
      fontFamily: 'Arial Black',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.confirmButtonText.setAlpha(0);

    // Handler du bouton de confirmation
    this.confirmButton.on('pointerdown', () => {
      if (this.selectedStarterId && !this.isAnimating) {
        this.confirmSelection();
      }
    });

    this.confirmButton.on('pointerover', () => {
      if (this.selectedStarterId) {
        this.confirmButton.setFillStyle(0x66BB6A);
      }
    });

    this.confirmButton.on('pointerout', () => {
      if (this.selectedStarterId) {
        this.confirmButton.setFillStyle(0x4CAF50);
      }
    });

    this.container.add([this.infoText, this.confirmButton, this.confirmButtonText]);
  }

  // ✅ MÉTHODE: Afficher les infos d'un starter
  showStarterInfo(starter, index) {
    const infoText = `${starter.name} - Type ${starter.type}\n${starter.description}`;
    
    this.scene.tweens.add({
      targets: this.infoText,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.infoText.setText(infoText);
        this.scene.tweens.add({
          targets: this.infoText,
          alpha: 1,
          duration: 200
        });
      }
    });
  }

  // ✅ MÉTHODE: Sélectionner un starter
  selectStarter(starter, index) {
    console.log("🎯 [StarterSelector] Starter sélectionné:", starter.name);
    
    this.isAnimating = true;
    this.currentlySelectedIndex = index;
    this.selectedStarterId = starter.id;

    // Animation de sélection
    const pokeball = this.pokeballs[index];
    const starterSprite = this.starterSprites[index];

    // Désélectionner les autres
    this.pokeballs.forEach((pb, i) => {
      if (i !== index) {
        this.scene.tweens.add({
          targets: pb,
          alpha: 0.5,
          scale: 0.8,
          duration: 300
        });
        this.scene.tweens.add({
          targets: this.starterSprites[i],
          alpha: 0.3,
          scale: 0.8,
          duration: 300
        });
      }
    });

    // Animer le starter sélectionné
    this.scene.tweens.add({
      targets: pokeball,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 400,
      ease: 'Back.easeOut'
    });

    this.scene.tweens.add({
      targets: starterSprite,
      scaleX: 1.3,
      scaleY: 1.3,
      y: starterSprite.y - 10,
      alpha: 1.0,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isAnimating = false;
        this.showConfirmButton();
      }
    });
  }

  // ✅ MÉTHODE: Afficher le bouton de confirmation
  showConfirmButton() {
    this.scene.tweens.add({
      targets: [this.confirmButton, this.confirmButtonText],
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  // ✅ MÉTHODE: Confirmer la sélection
  confirmSelection() {
    if (!this.selectedStarterId || !this.networkManager?.room) {
      console.error("❌ [StarterSelector] Impossible de confirmer - données manquantes");
      return;
    }

    console.log("📤 [StarterSelector] Envoi confirmation au serveur:", this.selectedStarterId);
    
    this.isAnimating = true;

    // Envoyer au serveur
    this.networkManager.room.send("selectStarter", {
      starterId: this.selectedStarterId,
      timestamp: Date.now()
    });

    // Animation de confirmation
    this.animateConfirmation();

    // Notification
    if (window.showGameNotification) {
      window.showGameNotification(
        "Sélection envoyée au serveur...",
        'info',
        { duration: 2000, position: 'top-center' }
      );
    }
  }

  // ✅ MÉTHODE: Animation de confirmation
  animateConfirmation() {
    // Flash blanc
    const flash = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0xFFFFFF
    );
    flash.setDepth(1003);
    flash.setAlpha(0);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0.8,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  // ✅ MÉTHODE: Starter confirmé par le serveur
  onStarterConfirmed(data) {
    console.log("✅ [StarterSelector] Starter confirmé par le serveur:", data);
    
    const starter = this.starterOptions.find(s => s.id === data.starterId);
    
    // Notification de succès
    if (window.showGameNotification) {
      window.showGameNotification(
        `${starter?.name || data.starterId} ajouté à votre équipe !`,
        'success',
        { duration: 4000, position: 'top-center' }
      );
    }

    // Fermer après sélection
    this.scene.time.delayedCall(1500, () => {
      this.hide();
    });
  }

  // ✅ MÉTHODE: Afficher une erreur
  showError(message) {
    console.error("❌ [StarterSelector] Erreur:", message);
    
    if (window.showGameNotification) {
      window.showGameNotification(
        `Erreur: ${message}`,
        'error',
        { duration: 4000, position: 'top-center' }
      );
    }

    // Permettre une nouvelle sélection
    this.isAnimating = false;
    this.currentlySelectedIndex = -1;
    this.selectedStarterId = null;
    
    // Réinitialiser l'affichage
    this.resetDisplay();
  }

  // ✅ MÉTHODE: Réinitialiser l'affichage
  resetDisplay() {
    // Remettre tous les starters dans leur état initial
    this.pokeballs.forEach((pokeball, index) => {
      this.scene.tweens.add({
        targets: pokeball,
        alpha: 1,
        scale: 1.0,
        duration: 300
      });
    });

    this.starterSprites.forEach((sprite, index) => {
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.7,
        scale: 1.0,
        y: -50, // Position originale
        duration: 300
      });
    });

    // Masquer le bouton de confirmation
    this.scene.tweens.add({
      targets: [this.confirmButton, this.confirmButtonText],
      alpha: 0,
      duration: 200
    });

    // Effacer le texte d'info
    this.infoText.setText('');
  }

  // ✅ MÉTHODE: Animation d'entrée
  animateIn() {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1.0,
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Animation des pokéballs en cascade
    this.pokeballs.forEach((pokeball, index) => {
      pokeball.setScale(0);
      this.scene.tweens.add({
        targets: pokeball,
        scale: 1.0,
        duration: 400,
        delay: 200 + (index * 100),
        ease: 'Back.easeOut'
      });
    });

    this.starterSprites.forEach((sprite, index) => {
      sprite.setAlpha(0);
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.7,
        duration: 300,
        delay: 300 + (index * 100)
      });
    });
  }

  // ✅ MÉTHODE: Masquer la sélection
  hide() {
    if (!this.isVisible) {
      console.warn("⚠️ [StarterSelector] Déjà masqué");
      return;
    }

    console.log("🚫 [StarterSelector] Masquage de la sélection...");

    // Animation de sortie
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.8,
      duration: 400,
      onComplete: () => {
        this.cleanup();
      }
    });

    // Débloquer les inputs du joueur
    this.blockPlayerInput(false);
    
    this.isVisible = false;
  }

  // ✅ MÉTHODE: Bloquer/débloquer les inputs du joueur
  blockPlayerInput(block) {
    console.log(`${block ? '🔒' : '🔓'} [StarterSelector] ${block ? 'Blocage' : 'Déblocage'} inputs...`);
    
    // Flag simple pour le système
    window._starterSelectionActive = block;
    
    // Essayer le MovementBlockHandler si disponible
    if (window.movementBlockHandler && typeof window.movementBlockHandler.requestBlock === 'function') {
      try {
        if (block) {
          window.movementBlockHandler.requestBlock('starter_selection', 'Choix du starter en cours');
        } else {
          window.movementBlockHandler.requestUnblock('starter_selection');
        }
      } catch (error) {
        console.warn(`⚠️ [StarterSelector] Erreur MovementBlockHandler:`, error.message);
      }
    }
  }

  // ✅ MÉTHODE: Nettoyage
  cleanup() {
    console.log("🧹 [StarterSelector] Nettoyage...");

    // Détruire le container
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    // Réinitialiser les variables
    this.pokeballs = [];
    this.starterSprites = [];
    this.selectedStarterId = null;
    this.currentlySelectedIndex = -1;
    this.isAnimating = false;

    console.log("✅ [StarterSelector] Nettoyage terminé");
  }

  // ✅ MÉTHODE: Détruire complètement
  destroy() {
    console.log("💀 [StarterSelector] Destruction...");

    // Nettoyer les listeners réseau
    if (this.networkManager?.room) {
      this.networkManager.room.removeAllListeners("showStarterSelection");
      this.networkManager.room.removeAllListeners("starterSelected");
      this.networkManager.room.removeAllListeners("starterSelectionError");
    }

    // Débloquer les inputs
    this.blockPlayerInput(false);

    // Masquer si visible
    if (this.isVisible) {
      this.hide();
    } else {
      this.cleanup();
    }

    // Null toutes les références
    this.scene = null;
    this.networkManager = null;
    this.starterConfig = null;
    this.starterOptions = null;
  }

  // ✅ MÉTHODES UTILITAIRES
  isSelectionVisible() {
    return this.isVisible;
  }

  getCurrentSelection() {
    return this.selectedStarterId;
  }

  getAvailableStarters() {
    return this.starterOptions;
  }
}

// ✅ GESTIONNAIRE GLOBAL SIMPLE
export class StarterSelectionManager {
  constructor() {
    this.activeSelector = null;
    this.currentScene = null;
  }

  getSelector(scene) {
    if (!this.activeSelector || this.currentScene !== scene) {
      if (this.activeSelector) {
        this.activeSelector.destroy();
      }
      this.activeSelector = new StarterSelector(scene);
      this.currentScene = scene;
    }
    return this.activeSelector;
  }

  initialize(scene, networkManager) {
    const selector = this.getSelector(scene);
    return selector.initialize(networkManager);
  }

  show(scene, availableStarters = null) {
    const selector = this.getSelector(scene);
    selector.show(availableStarters);
    return selector;
  }

  hide() {
    if (this.activeSelector) {
      this.activeSelector.hide();
    }
  }

  cleanup() {
    if (this.activeSelector) {
      this.activeSelector.destroy();
      this.activeSelector = null;
      this.currentScene = null;
    }
  }

  isActive() {
    return this.activeSelector?.isSelectionVisible() || false;
  }

  getCurrentSelection() {
    return this.activeSelector?.getCurrentSelection() || null;
  }
}

// ✅ INSTANCE GLOBALE
export const globalStarterManager = new StarterSelectionManager();

// ✅ FONCTION D'INTÉGRATION SIMPLE
export function integrateStarterSelectorToScene(scene, networkManager) {
  console.log(`🎯 [StarterIntegration] Intégration à la scène: ${scene.scene.key}`);

  const selector = globalStarterManager.initialize(scene, networkManager);

  scene.showStarterSelection = (availableStarters = null) => {
    return globalStarterManager.show(scene, availableStarters);
  };

  scene.hideStarterSelection = () => {
    globalStarterManager.hide();
  };

  scene.isStarterSelectionActive = () => {
    return globalStarterManager.isActive();
  };

  console.log(`✅ [StarterIntegration] Intégration terminée pour ${scene.scene.key}`);
  return selector;
}

// ✅ UTILITAIRES GLOBAUX
export const StarterUtils = {
  showSelection: (availableStarters = null) => {
    const activeScene = window.game?.scene?.getScenes(true)[0];
    if (activeScene && activeScene.showStarterSelection) {
      return activeScene.showStarterSelection(availableStarters);
    } else {
      console.warn("⚠️ [StarterUtils] Aucune scène active avec starter system");
      return null;
    }
  },

  hideSelection: () => {
    globalStarterManager.hide();
  },

  isActive: () => {
    return globalStarterManager.isActive();
  },

  test: () => {
    console.log("🧪 [StarterUtils] Test du système de sélection de starter...");
    
    const testStarters = [
      { id: 'bulbasaur', name: 'Bulbizarre', type: 'Plante', description: 'Un Pokémon Graine docile et loyal.', color: 0x4CAF50 },
      { id: 'charmander', name: 'Salamèche', type: 'Feu', description: 'Un Pokémon Lézard fougueux et brave.', color: 0xFF5722 },
      { id: 'squirtle', name: 'Carapuce', type: 'Eau', description: 'Un Pokémon Minitortue calme et sage.', color: 0x2196F3 }
    ];
    
    return StarterUtils.showSelection(testStarters);
  }
};

console.log("🎯 [StarterSelector] Module chargé et prêt !");
console.log("✅ Utilisez window.testStarterSelection() pour tester");
