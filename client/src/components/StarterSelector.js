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
  
  const size = 48;
  const graphics = this.scene.add.graphics();

  // Partie supérieure rouge plus vive
  graphics.fillStyle(0xFF3030);
  graphics.fillCircle(size/2, size/2, size/2);

  // Partie inférieure blanche
  graphics.fillStyle(0xF8F8F8);
  graphics.fillCircle(size/2, size/2, size/2);
  graphics.fillRect(0, size/2, size, size/2);

  // Ligne centrale noire plus épaisse
  graphics.lineStyle(4, 0x000000);
  graphics.lineBetween(0, size/2, size, size/2);

  // Bouton central plus gros
  graphics.fillStyle(0x000000);
  graphics.fillCircle(size/2, size/2, 8);
  graphics.fillStyle(0xF8F8F8);
  graphics.fillCircle(size/2, size/2, 6);
  graphics.fillStyle(0xC0C0C0);
  graphics.fillCircle(size/2, size/2, 4);

  // Reflet sur la pokéball
  graphics.fillStyle(0xFFFFFF, 0.3);
  graphics.fillCircle(size/2 - 8, size/2 - 8, 8);

  graphics.generateTexture('pokeball_starter', size, size);
  graphics.destroy();
}
createInterface() {
  const centerX = this.scene.cameras.main.centerX;
  const centerY = this.scene.cameras.main.centerY;
  const camera = this.scene.cameras.main;

  this.container = this.scene.add.container(centerX, centerY);
  this.container.setDepth(1000);

  // Background PNG étiré sur tout l'écran
  const bg = this.scene.add.image(0, 0, 'lab_bg');
  bg.setDisplaySize(camera.width, camera.height);
  this.container.add(bg);

  this.createStarters();
  this.createUI();
  this.container.setAlpha(0);
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
  // Charger uniquement l'image du labo
  if (!this.scene.textures.exists('lab_bg')) {
    this.scene.load.image('lab_bg', 'assets/ui/lab_background.png');
    this.scene.load.once('complete', () => {
      console.log("✅ Background labo chargé");
    });
    this.scene.load.start();
  }
  
  this.createPokeballTexture();
  this.starterConfig.forEach(starter => {
    this.createStarterPlaceholder(starter);
  });
}
  // ✅ MÉTHODE: Créer l'interface principale (version compacte)
createStarters() {
  this.pokeballs = [];
  this.starterSprites = [];

  this.starterOptions.forEach((starter, index) => {
    // Positions horizontales simples comme dans l'image
    const spacing = 100;
    const startX = -(this.starterOptions.length - 1) * spacing / 2;
    const posX = startX + (index * spacing);
    const posY = 20; // Un peu au-dessus du centre
    
    // Pokéball simple sans effets
    const pokeball = this.scene.add.image(posX, posY, 'pokeball_starter');
    pokeball.setScale(2.0); // Plus grosse comme dans l'original
    pokeball.setInteractive();

    // Animation simple au survol
    pokeball.on('pointerover', () => {
      if (!this.isAnimating) {
        pokeball.setTint(0xE0E0E0); // Légèrement gris
        this.showStarterInfo(starter, index);
      }
    });

    pokeball.on('pointerout', () => {
      if (!this.isAnimating && this.currentlySelectedIndex !== index) {
        pokeball.clearTint();
      }
    });

    // Click handler
    pokeball.on('pointerdown', () => {
      if (!this.isAnimating) {
        this.selectStarter(starter, index);
      }
    });

    this.container.add(pokeball);
    this.pokeballs.push(pokeball);
  });
}

// Remplace createUI() dans StarterSelector.js
createUI() {
  // Texte simple en bas comme dans l'original
  this.infoText = this.scene.add.text(0, 80, 'Choose a Pokémon.', {
    fontSize: '16px',
    fontFamily: 'Arial',
    color: '#000000',
    align: 'center'
  }).setOrigin(0.5);

  // Pas de bouton visible - sélection directe comme dans l'original
  this.confirmButton = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0);
  this.confirmButton.setInteractive();
  this.confirmButtonText = this.scene.add.text(0, 0, '', { fontSize: '1px' });

  this.container.add([this.infoText]);
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

  // Effet de sélection simple
  this.pokeballs.forEach((pb, i) => {
    if (i === index) {
      pb.setTint(0xFFFF80); // Jaune pour la sélection
    } else {
      pb.setTint(0x808080); // Gris pour les non-sélectionnés
    }
  });

  // Confirmation automatique après un court délai (comme dans l'original)
  this.scene.time.delayedCall(500, () => {
    this.confirmSelection();
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
  // Animation simple de fade-in
  this.scene.tweens.add({
    targets: this.container,
    alpha: 1,
    duration: 300,
    ease: 'Power2'
  });

  // Les pokéballs apparaissent simplement
  this.pokeballs.forEach((pokeball, index) => {
    pokeball.setAlpha(0);
    this.scene.tweens.add({
      targets: pokeball,
      alpha: 1,
      duration: 200,
      delay: index * 100
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
