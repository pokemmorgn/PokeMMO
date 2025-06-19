// ===============================================
// BeachScene.js - Intro Bulbizarre animé + dialogue + transition + blocage joueur + Starter HUD
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

// === Mini-manager pour spritesheets Pokémon 2x4 (27x27px) ===
class PokemonSpriteManager {
  constructor(scene) { this.scene = scene; }

  loadSpritesheet(pokemonName) {
    const key = `${pokemonName}_Walk`;
    if (!this.scene.textures.exists(key)) {
      this.scene.load.spritesheet(key, `assets/pokemon/${pokemonName}.png`, {
        frameWidth: 27, frameHeight: 27,
      });
      this.scene.load.once('complete', () => this.createAnimations(key));
      this.scene.load.start();
    } else {
      this.createAnimations(key);
    }
  }

  createPokemonSprite(pokemonName, x, y, direction = "left") {
    const key = `${pokemonName}_Walk`;
    this.createAnimations(key);
    const sprite = this.scene.add.sprite(x, y, key, 0).setOrigin(0.5, 1);
    sprite.setDepth(5);
    sprite.direction = direction;
    sprite.pokemonAnimKey = `${key}_${direction}`;
    sprite.play(sprite.pokemonAnimKey);
    return sprite;
  }

  createAnimations(key) {
    const anims = this.scene.anims;
    if (anims.exists(`${key}_down`)) return;
    anims.create({
      key: `${key}_up`,
      frames: [{ key, frame: 0 }, { key, frame: 1 }],
      frameRate: 6, repeat: -1
    });
    anims.create({
      key: `${key}_down`,
      frames: [{ key, frame: 2 }, { key, frame: 3 }],
      frameRate: 6, repeat: -1
    });
    anims.create({
      key: `${key}_left`,
      frames: [{ key, frame: 4 }, { key, frame: 5 }],
      frameRate: 6, repeat: -1
    });
    anims.create({
      key: `${key}_right`,
      frames: [{ key, frame: 6 }, { key, frame: 7 }],
      frameRate: 6, repeat: -1
    });
  }
}

// ====================== BeachScene ==========================
export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'GreenRootBeach');
    this.transitionCooldowns = {};
    this.pokemonSpriteManager = null;
    this._introBlocked = false;
    this._starterHudInitialized = false;
  }

  async create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.setupBeachEvents();

    // === CONNEXION À LA ROOM DE JEU ET INITIALISATION DU STARTER HUD ===
    await this.initializeGameConnection();

    // Appel setupZoneTransitions _après_ un délai pour s'assurer que le joueur est créé
    this.time.delayedCall(100, () => {
      this.setupZoneTransitions();
    });
  }

  // === NOUVELLE MÉTHODE: Connexion au jeu et init du HUD ===
  async initializeGameConnection() {
    try {
      // Connexion à la BeachRoom (remplacez par le nom de votre room)
      this.gameRoom = await window.colyseus.joinOrCreate("BeachRoom", { 
        username: window.username 
      });

      console.log("✅ Connecté à BeachRoom");

      // Initialiser le HUD de sélection de starter
      if (!this._starterHudInitialized) {
        window.initStarterHUD(this.gameRoom);
        this._starterHudInitialized = true;
        
        // Écouter les événements du starter
        this.setupStarterEventListeners();
      }

      // Stocker la room pour les autres méthodes
      window.currentGameRoom = this.gameRoom;

    } catch (error) {
      console.error("❌ Erreur de connexion à BeachRoom:", error);
    }
  }

  // === ÉCOUTE DES ÉVÉNEMENTS DU STARTER ===
  setupStarterEventListeners() {
    if (!this.gameRoom) return;

    // Quand le starter est sélectionné avec succès
    this.gameRoom.onMessage("starterSelectionResult", (data) => {
      if (data.success) {
        console.log("🎉 Starter sélectionné avec succès!");
        
        // Afficher le Pokémon reçu dans le jeu
        this.showPokemonReceived(data.pokemon);
        
        // Démarrer l'intro animée après la sélection du starter
        this.time.delayedCall(1000, () => {
          const player = this.playerManager.getMyPlayer();
          if (player && !this._introBlocked) {
            this.startIntroSequence(player);
          }
        });
      }
    });

    // Message de bienvenue
    this.gameRoom.onMessage("welcomeMessage", (data) => {
      console.log("📨 Message de bienvenue:", data.message);
      
      // Si le joueur a déjà des Pokémon, démarrer l'intro directement
      if (!data.isNewPlayer && data.teamCount > 0) {
        this.time.delayedCall(500, () => {
          const player = this.playerManager.getMyPlayer();
          if (player && !this._introBlocked) {
            this.startIntroSequence(player);
          }
        });
      }
    });
  }

  // === NOUVELLE MÉTHODE: Afficher le Pokémon reçu ===
  showPokemonReceived(pokemonData) {
    console.log("🎁 Pokémon reçu:", pokemonData);
    
    if (!pokemonData || !pokemonData.pokemonId) return;

    // Afficher un message temporaire
    const congratsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      `🎉 Vous avez reçu ${pokemonData.name}! 🎉`,
      {
        fontSize: "20px",
        color: "#ffd700",
        stroke: "#000",
        strokeThickness: 2,
        fontWeight: "bold"
      }
    ).setOrigin(0.5).setDepth(1000);

    // Animation d'apparition
    congratsText.setAlpha(0);
    this.tweens.add({
      targets: congratsText,
      alpha: 1,
      scale: { from: 0.5, to: 1.2 },
      duration: 800,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        // Faire disparaître après 3 secondes
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: congratsText,
            alpha: 0,
            duration: 500,
            onComplete: () => congratsText.destroy()
          });
        });
      }
    });
  }

  // === MÉTHODE MISE À JOUR: Update avec blocage pour le HUD ===
  update() {
    // Vérifier si les contrôles doivent être bloqués (chat, starter HUD, ou intro)
    if (this.shouldBlockInput()) {
      return;
    }

    // Votre logique d'update existante
    super.update();
  }

  // === NOUVELLE MÉTHODE: Vérifier si les inputs doivent être bloqués ===
  shouldBlockInput() {
    return (
      window.shouldBlockInput() || // Chat ou HUD starter ouvert
      this._introBlocked           // Intro animée en cours
    );
  }

  // --- Gère la transition vers VillageScene ---
  setupZoneTransitions() {
    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn("Layer 'Worlds' non trouvé dans la map");
      return;
    }

    const player = this.playerManager.getMyPlayer();
    if (!player) {
      console.warn("Player non encore créé, impossible d'ajouter les overlaps de transition");
      // Retry avec délai
      this.time.delayedCall(100, () => this.setupZoneTransitions());
      return;
    }
    if (!player.body) {
      console.warn("Player.body non créé, impossible d'ajouter les overlaps de transition");
      // Retry avec délai
      this.time.delayedCall(100, () => this.setupZoneTransitions());
      return;
    }

    worldsLayer.objects.forEach(obj => {
      const targetZoneProp = obj.properties?.find(p => p.name === 'targetZone');
      const directionProp = obj.properties?.find(p => p.name === 'direction');
      if (!targetZoneProp) {
        console.warn(`Objet ${obj.name || obj.id} dans 'Worlds' sans propriété targetZone, ignoré`);
        return;
      }

      const targetZone = targetZoneProp.value;
      const direction = directionProp ? directionProp.value : 'north';

      console.log(`Création zone transition vers ${targetZone} à (${obj.x},${obj.y}) taille ${obj.width}x${obj.height}`);

      const zone = this.add.zone(
        obj.x + obj.width / 2,
        obj.y + obj.height / 2,
        obj.width,
        obj.height
      );
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      zone.body.setImmovable(true);

      this.physics.add.overlap(player, zone, () => {
        // Bloquer les transitions si le HUD est ouvert
        if (this.shouldBlockInput()) {
          return;
        }

        if (!this.networkManager) {
          console.warn("networkManager non défini, transition ignorée");
          return;
        }
        console.log(`Overlap détecté, demande de transition vers ${targetZone} (${direction})`);
        this.networkManager.requestZoneTransition(targetZone, direction);
      });
    });
  }

  // --- Gère le placement joueur au spawn ---
  positionPlayer(player) {
    const initData = this.scene.settings.data;

    if (initData?.fromZone === 'VillageScene' || initData?.fromZone) {
      player.x = 52;
      player.y = 48;
    }
    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }
    if (this.networkManager) this.networkManager.sendMove(player.x, player.y);

    // === MODIFICATION: L'intro se déclenchera après la sélection du starter ===
    // Plus besoin de démarrer l'intro ici, elle sera déclenchée par les événements du starter
  }

  // ==================== INTRO ANIMÉE ======================
  startIntroSequence(player) {
    // Vérifier que le joueur a bien un starter avant de démarrer l'intro
    if (window.starterHUD && window.starterHUD.isVisible) {
      console.log("🚫 HUD de starter ouvert, intro reportée");
      return;
    }

    console.log("🎬 Démarrage de l'intro animée");

    // 1. Bloque les entrées joueur (clavier + collisions)
    this.input.keyboard.enabled = false;
    if (player.body) player.body.enable = false;
    this._introBlocked = true;

    // 2. Tourne le joueur vers la droite (ex : anim ou frame statique)
    if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
      if (this.anims.exists('walk_right')) player.play('walk_right');
    }

    // 3. Bulbizarre spawn loin à droite, arrive devant le joueur
    const spawnX = player.x + 120;
    const arriveX = player.x + 24; // devant le joueur
    const y = player.y;

    this.spawnStarterPokemon(spawnX, y, '001_Bulbasaur', 'left', player, arriveX);
  }

  // Bulbizarre entre, pause, repart au nord
  spawnStarterPokemon(x, y, pokemonName, direction = "left", player = null, arriveX = null) {
    this.pokemonSpriteManager.loadSpritesheet(pokemonName);

    const trySpawn = () => {
      if (this.textures.exists(`${pokemonName}_Walk`)) {
        const starter = this.pokemonSpriteManager.createPokemonSprite(pokemonName, x, y, direction);

        // Avance lentement vers le joueur
        this.tweens.add({
          targets: starter,
          x: arriveX ?? (x - 36),
          duration: 2200,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            // Forcer l'anim du joueur vers la droite
            if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
              if (this.anims.exists('walk_right')) player.play('walk_right');
            }
          },
          onComplete: () => {
            starter.play(`${pokemonName}_Walk_left`);
            if (player.anims && this.anims.exists('idle_right')) player.play('idle_right');
            this.showIntroDialogue(starter, player);
          }
        });
      } else {
        this.time.delayedCall(50, trySpawn);
      }
    };
    trySpawn();
  }

  showIntroDialogue(starter, player) {
    // Dialogue adapté selon si le joueur vient de choisir son starter
    const messages = [
      "Salut ! Tu viens d'arriver ?",
      "Parfait ! Je vais t'emmener au village !",
      "Suis-moi !"
    ];

    let messageIndex = 0;
    const showNextMessage = () => {
      if (messageIndex >= messages.length) {
        // Fin des dialogues, Bulbizarre part
        this.finishIntroSequence(starter, player);
        return;
      }

      const textBox = this.add.text(
        starter.x, starter.y - 32,
        messages[messageIndex],
        {
          fontSize: "13px",
          color: "#fff",
          backgroundColor: "#114",
          padding: { x: 6, y: 4 }
        }
      ).setDepth(1000).setOrigin(0.5);

      messageIndex++;

      // Afficher chaque message pendant 2 secondes
      this.time.delayedCall(2000, () => {
        textBox.destroy();
        showNextMessage();
      });
    };

    showNextMessage();
  }

  finishIntroSequence(starter, player) {
    // Bulbizarre part vers le nord
    this.tweens.add({
      targets: starter,
      y: starter.y - 90,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onStart: () => {
        starter.play(`${starter.texture.key}_up`, true);
      },
      onComplete: () => {
        starter.destroy();
        // Débloque le joueur !
        this.input.keyboard.enabled = true;
        if (player.body) player.body.enable = true;
        this._introBlocked = false;
        if (player.anims && this.anims.exists('idle_down')) player.play('idle_down');
        console.log("✅ Intro terminée, joueur débloqué");
      }
    });
  }

  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  // === MÉTHODE POUR DÉCLENCHER MANUELLEMENT LE HUD (pour NPC plus tard) ===
  triggerStarterSelection() {
    if (window.starterHUD) {
      window.starterHUD.show();
    } else {
      console.warn("⚠️ HUD de starter non initialisé");
    }
  }

  cleanup() {
    this.transitionCooldowns = {};
    this._starterHudInitialized = false;
    super.cleanup();
  }
}
