// ✅ MÉTHODE SIMPLE: Utiliser uniquement des flags globaux
  blockPlayerInput(block) {
    console.log(`${block ? '🔒' : '🔓'} [StarterSelector] ${block ? 'Blocage' : 'Déblocage'} inputs via flags...`);
    
    // ✅ MÉTHODE PRINCIPALE: Flag global simple
    window._starterSelectionActive = block;
    
    // ✅ MÉTHODE SECONDAIRE: Essayer les systèmes avancés si disponibles
    if (window.movementBlockHandler && typeof window.movementBlockHandler.requestBlock === 'function') {
      try {
        if (block) {
          window.movementBlockHandler.requestBlock('starter_selection', 'Sélection de starter en cours');
        } else {
          window.movementBlockHandler.requestUnblock('starter_selection');
        }
        console.log(`✅ [StarterSelector] MovementBlockHandler ${block ? 'bloqué' : 'débloqué'}`);
      } catch (error) {
        console.warn(`⚠️ [StarterSelector] Erreur MovementBlockHandler:`, error.message);
      }
    }
    
    // ✅ LOG FINAL
    console.log(`${block ? '🔒' : '🔓'} [StarterSelector] Inputs ${block ? 'BLOQUÉS' : 'DÉBLOQUÉS'} - Flag: ${window._starterSelectionActive}`);
  }// client/src/components/StarterSelector.js
// Système de sélection de starter externalisé pour PokéMon MMO

export class StarterSelector {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.selectedStarterId = null;
    this.starterOptions = [];
    this.networkManager = null;
    
    // Containers Phaser
    this.backgroundContainer = null;
    this.starterContainer = null;
    this.uiContainer = null;
    
    // Assets
    this.baseBackground = null;
    this.pokeballs = [];
    this.starterSprites = [];
    
    // Configuration des starters
    this.starterConfig = [
      {
        id: 'bulbasaur',
        name: 'Bulbizarre',
        type: 'Plante',
        description: 'Un Pokémon Graine. Bulbizarre peut rester plusieurs jours sans manger grâce à sa graine.',
        position: { x: 200, y: 350 },
        color: 0x4CAF50
      },
      {
        id: 'charmander', 
        name: 'Salamèche',
        type: 'Feu',
        description: 'Un Pokémon Lézard. La flamme sur sa queue indique son humeur et sa santé.',
        position: { x: 400, y: 350 },
        color: 0xFF5722
      },
      {
        id: 'squirtle',
        name: 'Carapuce', 
        type: 'Eau',
        description: 'Un Pokémon Minitortue. Il se cache dans sa carapace pour se protéger.',
        position: { x: 600, y: 350 },
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

  // ✅ MÉTHODE: Charger les assets nécessaires
  preloadAssets() {
    // Vérifier si les assets sont déjà chargés
    if (!this.scene.textures.exists('starter_background')) {
      // Créer la texture de fond depuis tes assets
      this.createBackgroundTexture();
    }

    // Pokéballs - utiliser tes PNGs existants
    if (!this.scene.textures.exists('pokeball')) {
      // Si tu as le PNG de pokéball, charger ici
      // this.scene.load.image('pokeball', 'assets/ui/pokeball.png');
      
      // Sinon créer une texture temporaire
      this.createPokeballTexture();
    }

    // Sprites des starters (optionnel si tu les as)
    this.starterConfig.forEach(starter => {
      if (!this.scene.textures.exists(starter.id)) {
        // this.scene.load.image(starter.id, `assets/pokemon/${starter.id}.png`);
        this.createStarterPlaceholder(starter);
      }
    });
  }

  // ✅ MÉTHODE: Créer la texture de fond (similaire à ton image)
  createBackgroundTexture() {
    const width = 800;
    const height = 600;
    const graphics = this.scene.add.graphics();

    // Fond gris-bleu (comme ton image)
    graphics.fillStyle(0x8B9DC3);
    graphics.fillRect(0, 0, width, 200);

    // Grille de carreaux
    graphics.lineStyle(2, 0x7A8BB0);
    for (let x = 0; x < width; x += 50) {
      graphics.lineBetween(x, 0, x, 200);
    }
    for (let y = 0; y < 200; y += 50) {
      graphics.lineBetween(0, y, width, y);
    }

    // Zone verte centrale
    graphics.fillStyle(0x4CAF50);
    graphics.fillRoundedRect(50, 250, 700, 200, 20);

    // Dégradé subtil sur la zone verte
    graphics.fillStyle(0x45A049);
    graphics.fillEllipse(200, 350, 150, 80);
    graphics.fillEllipse(400, 350, 150, 80);
    graphics.fillEllipse(600, 350, 150, 80);

    // Bordure inférieure
    graphics.fillStyle(0x606060);
    graphics.fillRect(0, 500, width, 100);

    // Générer la texture
    graphics.generateTexture('starter_background', width, height);
    graphics.destroy();
  }

  // ✅ MÉTHODE: Créer la texture de pokéball
  createPokeballTexture() {
    const size = 64;
    const graphics = this.scene.add.graphics();

    // Partie supérieure rouge
    graphics.fillStyle(0xFF0000);
    graphics.fillCircle(size/2, size/2, size/2);

    // Partie inférieure blanche
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(size/2, size/2, size/2);
    graphics.fillRect(0, size/2, size, size/2);

    // Ligne centrale noire
    graphics.lineStyle(3, 0x000000);
    graphics.lineBetween(0, size/2, size, size/2);

    // Bouton central
    graphics.fillStyle(0x000000);
    graphics.fillCircle(size/2, size/2, 8);
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(size/2, size/2, 5);

    graphics.generateTexture('pokeball', size, size);
    graphics.destroy();
  }

  // ✅ MÉTHODE: Créer placeholder pour starter
  createStarterPlaceholder(starter) {
    const size = 96;
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(starter.color);
    graphics.fillRoundedRect(0, 0, size, size, 10);
    
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRoundedRect(8, 8, size-16, size-16, 8);
    
    // Initiale du nom
    graphics.fillStyle(starter.color);
    
    graphics.generateTexture(starter.id, size, size);
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
        { duration: 4000, position: 'top-center', bounce: true }
      );
    }
  }

  // ✅ MÉTHODE: Créer l'interface principale
  createInterface() {
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // Container principal
    this.backgroundContainer = this.scene.add.container(0, 0);
    this.backgroundContainer.setDepth(1000);

    // Fond principal (utilise ta texture de base ou l'asset que tu as)
    this.baseBackground = this.scene.add.image(centerX, centerY, 'starter_background');
    this.baseBackground.setDisplaySize(800, 600);
    this.backgroundContainer.add(this.baseBackground);

    // Container pour les starters
    this.starterContainer = this.scene.add.container(0, 0);
    this.starterContainer.setDepth(1001);
    
    // Container pour l'UI (textes, boutons)
    this.uiContainer = this.scene.add.container(0, 0);
    this.uiContainer.setDepth(1002);

    // Créer les éléments de chaque starter
    this.createStarters();
    
    // Créer l'interface utilisateur
    this.createUI();
    
    // Rendre non-visible pour l'animation
    this.backgroundContainer.setAlpha(0);
    this.starterContainer.setAlpha(0);
    this.uiContainer.setAlpha(0);
  }

  // ✅ MÉTHODE: Créer les starters
  createStarters() {
    this.pokeballs = [];
    this.starterSprites = [];

    this.starterOptions.forEach((starter, index) => {
      // Pokéball cliquable
      const pokeball = this.scene.add.image(starter.position.x, starter.position.y, 'pokeball');
      pokeball.setInteractive();
      pokeball.setScale(1.2);
      
      // Sprite du starter (au-dessus de la pokéball)
      const starterSprite = this.scene.add.image(
        starter.position.x, 
        starter.position.y - 80, 
        starter.id
      );
      starterSprite.setScale(0.8);
      starterSprite.setAlpha(0.7);

      // Animation de hover
      pokeball.on('pointerover', () => {
        if (!this.isAnimating) {
          this.scene.tweens.add({
            targets: pokeball,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 200,
            ease: 'Back.easeOut'
          });
          
          this.scene.tweens.add({
            targets: starterSprite,
            scaleX: 1.0,
            scaleY: 1.0,
            alpha: 1.0,
            duration: 200,
            ease: 'Back.easeOut'
          });
          
          this.showStarterInfo(starter, index);
        }
      });

      pokeball.on('pointerout', () => {
        if (!this.isAnimating && this.currentlySelectedIndex !== index) {
          this.scene.tweens.add({
            targets: pokeball,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200
          });
          
          this.scene.tweens.add({
            targets: starterSprite,
            scaleX: 0.8,
            scaleY: 0.8,
            alpha: 0.7,
            duration: 200
          });
        }
      });

      // Click handler
      pokeball.on('pointerdown', () => {
        if (!this.isAnimating) {
          this.selectStarter(starter, index);
        }
      });

      this.starterContainer.add([pokeball, starterSprite]);
      this.pokeballs.push(pokeball);
      this.starterSprites.push(starterSprite);
    });
  }

  // ✅ MÉTHODE: Créer l'UI (titre, descriptions, boutons)
  createUI() {
    const centerX = this.scene.cameras.main.centerX;
    
    // Titre principal
    const title = this.scene.add.text(centerX, 80, 'Choisissez votre Pokémon', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    // Sous-titre
    const subtitle = this.scene.add.text(centerX, 120, 'Ce Pokémon vous accompagnera dans votre aventure', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    // Zone d'information du starter (initialement vide)
    this.infoText = this.scene.add.text(centerX, 500, '', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: 600 }
    }).setOrigin(0.5);

    // Bouton de confirmation (initialement caché)
    this.confirmButton = this.scene.add.rectangle(centerX, 550, 200, 50, 0x4CAF50);
    this.confirmButton.setStrokeStyle(3, 0x2E7D32);
    this.confirmButton.setInteractive();
    this.confirmButton.setAlpha(0);

    this.confirmButtonText = this.scene.add.text(centerX, 550, 'CONFIRMER', {
      fontSize: '18px',
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

    this.uiContainer.add([
      title, subtitle, this.infoText, 
      this.confirmButton, this.confirmButtonText
    ]);
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
          scale: 1.0,
          duration: 300
        });
        this.scene.tweens.add({
          targets: this.starterSprites[i],
          alpha: 0.3,
          scale: 0.6,
          duration: 300
        });
      }
    });

    // Animer le starter sélectionné
    this.scene.tweens.add({
      targets: pokeball,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 400,
      ease: 'Back.easeOut'
    });

    this.scene.tweens.add({
      targets: starterSprite,
      scaleX: 1.2,
      scaleY: 1.2,
      y: starterSprite.y - 20,
      alpha: 1.0,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isAnimating = false;
        this.showConfirmButton();
      }
    });

    // Son de sélection (optionnel)
    if (this.scene.sound.sounds.find(s => s.key === 'select_sound')) {
      this.scene.sound.play('select_sound', { volume: 0.6 });
    }
  }

  // ✅ MÉTHODE: Afficher le bouton de confirmation
  showConfirmButton() {
    this.scene.tweens.add({
      targets: [this.confirmButton, this.confirmButtonText],
      alpha: 1,
      scale: 1.1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Animation de pulse pour attirer l'attention
        this.scene.tweens.add({
          targets: this.confirmButton,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
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
    const selectedStarter = this.starterOptions.find(s => s.id === this.selectedStarterId);
    
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

    // Son de confirmation (optionnel)
    if (this.scene.sound.sounds.find(s => s.key === 'confirm_sound')) {
      this.scene.sound.play('confirm_sound', { volume: 0.8 });
    }
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
        { duration: 4000, position: 'top-center', bounce: true }
      );
    }

    // Masquer après un délai
    this.scene.time.delayedCall(2000, () => {
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
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 300
      });
    });

    this.starterSprites.forEach((sprite, index) => {
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.7,
        scaleX: 0.8,
        scaleY: 0.8,
        y: this.starterOptions[index].position.y - 80,
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
    // Animation du fond
    this.scene.tweens.add({
      targets: this.backgroundContainer,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });

    // Animation des starters en cascade
    this.scene.tweens.add({
      targets: this.starterContainer,
      alpha: 1,
      duration: 300,
      delay: 200
    });

    this.pokeballs.forEach((pokeball, index) => {
      pokeball.setScale(0);
      this.scene.tweens.add({
        targets: pokeball,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 400,
        delay: 400 + (index * 150),
        ease: 'Back.easeOut'
      });
    });

    this.starterSprites.forEach((sprite, index) => {
      sprite.setAlpha(0);
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.7,
        duration: 300,
        delay: 600 + (index * 150)
      });
    });

    // Animation de l'UI
    this.scene.tweens.add({
      targets: this.uiContainer,
      alpha: 1,
      duration: 400,
      delay: 800
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
      targets: [this.backgroundContainer, this.starterContainer, this.uiContainer],
      alpha: 0,
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
    console.log(`${block ? '🔒' : '🔓'} [StarterSelector] Tentative ${block ? 'blocage' : 'déblocage'} inputs...`);
    
    // ✅ MÉTHODE 1: Utiliser InputManager si disponible et compatible
    if (this.scene.inputManager) {
      try {
        if (typeof this.scene.inputManager.disableInputs === 'function') {
          if (block) {
            this.scene.inputManager.disableInputs('starter_selection');
          } else {
            this.scene.inputManager.enableInputs('starter_selection');
          }
          console.log(`✅ [StarterSelector] InputManager utilisé pour ${block ? 'bloquer' : 'débloquer'}`);
        } else if (typeof this.scene.inputManager.setInputsEnabled === 'function') {
          // Alternative si la méthode s'appelle différemment
          this.scene.inputManager.setInputsEnabled(!block, 'starter_selection');
          console.log(`✅ [StarterSelector] InputManager.setInputsEnabled utilisé`);
        } else {
          console.warn(`⚠️ [StarterSelector] InputManager sans méthodes de blocage compatibles`);
        }
      } catch (error) {
        console.warn(`⚠️ [StarterSelector] Erreur InputManager:`, error);
      }
    } else {
      console.warn(`⚠️ [StarterSelector] Pas d'InputManager disponible`);
    }

    // ✅ MÉTHODE 2: Utiliser MovementBlockHandler si disponible
    if (window.movementBlockHandler) {
      try {
        if (block) {
          if (typeof window.movementBlockHandler.requestBlock === 'function') {
            window.movementBlockHandler.requestBlock('starter_selection', 'Sélection de starter en cours');
            console.log(`✅ [StarterSelector] MovementBlockHandler bloqué`);
          }
        } else {
          if (typeof window.movementBlockHandler.requestUnblock === 'function') {
            window.movementBlockHandler.requestUnblock('starter_selection');
            console.log(`✅ [StarterSelector] MovementBlockHandler débloqué`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ [StarterSelector] Erreur MovementBlockHandler:`, error);
      }
    } else {
      console.warn(`⚠️ [StarterSelector] Pas de MovementBlockHandler disponible`);
    }

    // ✅ MÉTHODE 3: Fallback direct avec shouldBlockInput
    try {
      if (block) {
        // Ajouter un flag global pour que shouldBlockInput le détecte
        window._starterSelectionActive = true;
        console.log(`✅ [StarterSelector] Flag global _starterSelectionActive = true`);
      } else {
        // Retirer le flag
        window._starterSelectionActive = false;
        console.log(`✅ [StarterSelector] Flag global _starterSelectionActive = false`);
      }
    } catch (error) {
      console.warn(`⚠️ [StarterSelector] Erreur flag global:`, error);
    }

    console.log(`${block ? '🔒' : '🔓'} [StarterSelector] Inputs joueur ${block ? 'bloqués' : 'débloqués'} (multi-méthodes)`);
  }

  // ✅ MÉTHODE: Nettoyage
  cleanup() {
    console.log("🧹 [StarterSelector] Nettoyage...");

    // Détruire les containers
    if (this.backgroundContainer) {
      this.backgroundContainer.destroy();
      this.backgroundContainer = null;
    }

    if (this.starterContainer) {
      this.starterContainer.destroy();
      this.starterContainer = null;
    }

    if (this.uiContainer) {
      this.uiContainer.destroy();
      this.uiContainer = null;
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

  // ✅ MÉTHODE: Debug
  debug() {
    console.log("🔍 [StarterSelector] === DEBUG ===");
    console.log("Visible:", this.isVisible);
    console.log("Selected:", this.selectedStarterId);
    console.log("Animating:", this.isAnimating);
    console.log("Network:", !!this.networkManager);
    console.log("Containers:", {
      background: !!this.backgroundContainer,
      starter: !!this.starterContainer,
      ui: !!this.uiContainer
    });
    console.log("Assets:", {
      pokeballs: this.pokeballs.length,
      sprites: this.starterSprites.length
    });
  }
}

// ✅ CLASSE DE GESTION GLOBALE (optionnelle)
export class StarterSelectionManager {
  constructor() {
    this.activeSelector = null;
    this.currentScene = null;
  }

  // Créer ou récupérer le sélecteur pour une scène
  getSelector(scene) {
    if (!this.activeSelector || this.currentScene !== scene) {
      // Nettoyer l'ancien sélecteur
      if (this.activeSelector) {
        this.activeSelector.destroy();
      }

      // Créer le nouveau
      this.activeSelector = new StarterSelector(scene);
      this.currentScene = scene;
    }

    return this.activeSelector;
  }

  // Initialiser avec NetworkManager
  initialize(scene, networkManager) {
    const selector = this.getSelector(scene);
    return selector.initialize(networkManager);
  }

  // Afficher la sélection
  show(scene, availableStarters = null) {
    const selector = this.getSelector(scene);
    selector.show(availableStarters);
    return selector;
  }

  // Masquer la sélection
  hide() {
    if (this.activeSelector) {
      this.activeSelector.hide();
    }
  }

  // Nettoyer tout
  cleanup() {
    if (this.activeSelector) {
      this.activeSelector.destroy();
      this.activeSelector = null;
      this.currentScene = null;
    }
  }

  // Status
  isActive() {
    return this.activeSelector?.isSelectionVisible() || false;
  }

  getCurrentSelection() {
    return this.activeSelector?.getCurrentSelection() || null;
  }
}

// ✅ INSTANCE GLOBALE (pour usage dans ton jeu)
export const globalStarterManager = new StarterSelectionManager();

// ✅ FONCTIONS D'INTÉGRATION POUR BaseZoneScene
export function integrateStarterSelectorToScene(scene, networkManager) {
  console.log(`🎯 [StarterIntegration] Intégration à la scène: ${scene.scene.key}`);

  // Créer et initialiser le sélecteur
  const selector = globalStarterManager.initialize(scene, networkManager);

  // Ajouter des méthodes à la scène
  scene.showStarterSelection = (availableStarters = null) => {
    return globalStarterManager.show(scene, availableStarters);
  };

  scene.hideStarterSelection = () => {
    globalStarterManager.hide();
  };

  scene.isStarterSelectionActive = () => {
    return globalStarterManager.isActive();
  };

  scene.getStarterSelection = () => {
    return globalStarterManager.getCurrentSelection();
  };

  // Setup des raccourcis clavier (optionnel)
  if (scene.input?.keyboard) {
    scene.input.keyboard.on('keydown-S', () => {
      if (!scene.isStarterSelectionActive()) {
        scene.showStarterSelection();
      }
    });

    scene.input.keyboard.on('keydown-ESC', () => {
      if (scene.isStarterSelectionActive()) {
        scene.hideStarterSelection();
      }
    });
  }

  // Ajouter au cleanup de la scène
  const originalCleanup = scene.cleanup;
  scene.cleanup = function() {
    if (scene.isStarterSelectionActive()) {
      scene.hideStarterSelection();
    }
    
    if (originalCleanup) {
      originalCleanup.call(this);
    }
  };

  console.log(`✅ [StarterIntegration] Intégration terminée pour ${scene.scene.key}`);
  return selector;
}

// ✅ CONFIGURATION POUR LES ASSETS (à ajouter dans ton LoaderScene)
export const STARTER_ASSETS_CONFIG = {
  // Images à charger - ADAPTÉES À TON PROJET
  images: [
    { key: 'pokeball', path: 'assets/ui/pokeball.png' },
    { key: 'bulbasaur', path: 'assets/pokemon/starters/001.png' },     // ou bulbasaur.png
    { key: 'charmander', path: 'assets/pokemon/starters/004.png' },    // ou charmander.png  
    { key: 'squirtle', path: 'assets/pokemon/starters/007.png' },      // ou squirtle.png
    { key: 'starter_background', path: 'assets/ui/starter_background.png' } // optionnel
  ],
  
  // Sons à charger (optionnel)
  audio: [
    { key: 'select_sound', path: 'assets/audio/sfx/select.ogg' },
    { key: 'confirm_sound', path: 'assets/audio/sfx/confirm.ogg' },
    { key: 'starter_theme', path: 'assets/audio/music/starter_selection.ogg' }
  ],

  // Fonction pour charger dans Phaser
  loadAssets: function(scene) {
    console.log('🎨 [StarterAssets] Chargement des assets...');
    
    // Charger les images
    this.images.forEach(asset => {
      if (!scene.textures.exists(asset.key)) {
        scene.load.image(asset.key, asset.path);
      }
    });

    // Charger les sons
    this.audio.forEach(asset => {
      if (!scene.cache.audio.exists(asset.key)) {
        scene.load.audio(asset.key, asset.path);
      }
    });

    console.log('✅ [StarterAssets] Assets ajoutés au loader');
  }
};

// ✅ HELPER POUR LE SERVEUR (structure des messages)
export const STARTER_MESSAGES = {
  // Message pour demander la sélection
  SHOW_SELECTION: 'showStarterSelection',
  
  // Message pour sélectionner
  SELECT_STARTER: 'selectStarter',
  
  // Message de confirmation
  STARTER_SELECTED: 'starterSelected',
  
  // Message d'erreur
  SELECTION_ERROR: 'starterSelectionError',

  // Structures des données
  createShowSelectionData: (availableStarters) => ({
    availableStarters: availableStarters,
    timestamp: Date.now()
  }),

  createSelectData: (starterId) => ({
    starterId: starterId,
    timestamp: Date.now()
  }),

  createConfirmationData: (starterId, playerData) => ({
    starterId: starterId,
    success: true,
    playerData: playerData,
    timestamp: Date.now()
  }),

  createErrorData: (message, code = null) => ({
    success: false,
    message: message,
    code: code,
    timestamp: Date.now()
  })
};

// ✅ EXEMPLE D'USAGE DANS BaseZoneScene.js
/*
// Dans initializeGameSystems() de BaseZoneScene.js :

initializeStarterSystem() {
  console.log(`🎯 [${this.scene.key}] Initialisation du système de starter...`);
  
  try {
    // Intégrer le sélecteur à cette scène
    const selector = integrateStarterSelectorToScene(this, this.networkManager);
    
    // Marquer comme initialisé
    this.starterSystemInitialized = true;
    
    console.log(`✅ [${this.scene.key}] Système de starter initialisé`);
    
    // Exposer globalement pour debug
    window.starterSelector = selector;
    
    return selector;
    
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur init starter system:`, error);
  }
}

// Ajouter cette ligne dans initializeGameSystems() :
setTimeout(() => {
  this.initializeStarterSystem();
}, 300);
*/

// ✅ EXEMPLE D'USAGE CÔTÉ SERVEUR (structure pour Colyseus)
/*
// Dans votre Room Colyseus :

onMessage(client, type, message) {
  if (type === "selectStarter") {
    this.handleStarterSelection(client, message);
  }
}

handleStarterSelection(client, data) {
  const player = this.state.players.get(client.sessionId);
  
  if (!player) {
    client.send("starterSelectionError", STARTER_MESSAGES.createErrorData("Joueur introuvable"));
    return;
  }

  if (player.hasStarter) {
    client.send("starterSelectionError", STARTER_MESSAGES.createErrorData("Vous avez déjà un starter"));
    return;
  }

  // Valider le starter
  const validStarters = ['bulbasaur', 'charmander', 'squirtle'];
  if (!validStarters.includes(data.starterId)) {
    client.send("starterSelectionError", STARTER_MESSAGES.createErrorData("Starter invalide"));
    return;
  }

  // Ajouter le starter au joueur
  const starterData = this.createStarterPokemon(data.starterId);
  player.team.push(starterData);
  player.hasStarter = true;

  // Confirmer au client
  client.send("starterSelected", STARTER_MESSAGES.createConfirmationData(
    data.starterId, 
    { level: starterData.level, moves: starterData.moves }
  ));

  console.log(`✅ Starter ${data.starterId} attribué à ${client.sessionId}`);
}
*/

// ✅ FONCTIONS UTILITAIRES GLOBALES (à exposer dans main.js)
export const StarterUtils = {
  // Afficher la sélection depuis n'importe où
  showSelection: (availableStarters = null) => {
    const activeScene = window.game?.scene?.getScenes(true)[0];
    if (activeScene && activeScene.showStarterSelection) {
      return activeScene.showStarterSelection(availableStarters);
    } else {
      console.warn("⚠️ [StarterUtils] Aucune scène active avec starter system");
      return null;
    }
  },

  // Masquer la sélection
  hideSelection: () => {
    globalStarterManager.hide();
  },

  // Status
  isActive: () => {
    return globalStarterManager.isActive();
  },

  // Debug
  debug: () => {
    if (globalStarterManager.activeSelector) {
      globalStarterManager.activeSelector.debug();
    } else {
      console.log("🔍 [StarterUtils] Aucun sélecteur actif");
    }
  },

  // Test
  test: () => {
    const testStarters = [
      { id: 'bulbasaur', name: 'Bulbizarre', type: 'Plante', description: 'Un Pokémon Graine', position: { x: 200, y: 350 }, color: 0x4CAF50 },
      { id: 'charmander', name: 'Salamèche', type: 'Feu', description: 'Un Pokémon Lézard', position: { x: 400, y: 350 }, color: 0xFF5722 },
      { id: 'squirtle', name: 'Carapuce', type: 'Eau', description: 'Un Pokémon Minitortue', position: { x: 600, y: 350 }, color: 0x2196F3 }
    ];
    
    return StarterUtils.showSelection(testStarters);
  }
};

console.log("🎯 [StarterSelector] Module chargé - fonctions disponibles:");
console.log("- StarterSelector (classe principale)");
console.log("- StarterSelectionManager (gestionnaire)"); 
console.log("- integrateStarterSelectorToScene() (intégration)");
console.log("- STARTER_ASSETS_CONFIG (configuration assets)");
console.log("- STARTER_MESSAGES (helpers serveur)");
console.log("- StarterUtils (fonctions utilitaires)");
console.log("✅ Prêt pour intégration dans BaseZoneScene !");
