// client/src/scenes/zones/BeachScene.js - VERSION REFACTORISÉE
// ✅ Exemple d'adaptation d'une scène existante

import { BaseZoneScene } from './BaseZoneScene.js';

export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'GreenRootBeach');
    
    // Propriétés spécifiques à BeachScene
    this.pokemonSpriteManager = null;
    this._introBlocked = false;
    this._introTriggered = false;
  }

  async create() {
    // Appeler le create de la classe parent
    await super.create();
    
    // Initialisation spécifique à BeachScene
    await this.initializeBeachSpecific();
  }

  async initializeBeachSpecific() {
    console.log("🏖️ Initialisation spécifique à BeachScene...");
    
    // Initialiser le gestionnaire de sprites Pokémon
    const { PokemonSpriteManager } = await import('./PokemonSpriteManager.js');
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    
    // Setup des événements spécifiques à la plage
    this.setupBeachEvents();
    
    console.log("✅ BeachScene initialisée");
  }

  // === HOOKS SPÉCIFIQUES ===
  
  // Hook appelé quand le joueur est prêt
  onPlayerReady(myPlayer) {
    console.log(`🏖️ Joueur prêt sur la plage à (${myPlayer.x}, ${myPlayer.y})`);
    
    // Déclencher l'intro automatiquement si pas déjà fait
    const initData = this.scene.settings.data;
    if (!this._introTriggered && !initData?.fromZone) {
      this._introTriggered = true;
      this.time.delayedCall(1500, () => {
        // this.startIntroSequence(myPlayer); // Décommente si tu veux l'intro
      });
    }
  }

  // Hook appelé après positionnement du joueur
  onPlayerPositioned(player, initData) {
    console.log(`🏖️ Joueur positionné sur la plage`);
    
    // Logique spécifique de positionnement si nécessaire
    if (initData?.fromVillage) {
      // Animation ou dialogue spécial de retour du village
      this.showNotification("Retour sur la plage !", "info");
    }
  }

  // === MÉTHODES SPÉCIFIQUES À LA PLAGE ===
  
  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
      this.updateInfoText(`PokeWorld MMO\nBeach Scene\nBienvenue !`);
    });
  }

  // Méthode pour déclencher manuellement le starter (via NPC, bouton, etc.)
  triggerStarterSelection() {
    if (window.starterHUD) {
      window.starterHUD.show();
    } else {
      console.warn("⚠️ HUD de starter non initialisé");
    }
  }

  // === INTRO ANIMÉE (OPTIONNELLE) ===
  
  startIntroSequence(player) {
    console.log("🎬 Démarrage de l'intro animée");
    
    // Bloquer les contrôles
    this.input.keyboard.enabled = false;
    if (player.body) player.body.enable = false;
    this._introBlocked = true;

    // Animation du joueur (droite)
    if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
      if (this.anims.exists('walk_right')) player.play('walk_right');
    }

    // Spawn du Pokémon starter
    const spawnX = player.x + 120;
    const arriveX = player.x + 24;
    const y = player.y;
    this.spawnStarterPokemon(spawnX, y, '001_Bulbasaur', 'left', player, arriveX);
  }

  spawnStarterPokemon(x, y, pokemonName, direction = "left", player = null, arriveX = null) {
    if (!this.pokemonSpriteManager) return;
    
    this.pokemonSpriteManager.loadSpritesheet(pokemonName);
    
    const trySpawn = () => {
      if (this.textures.exists(`${pokemonName}_Walk`)) {
        const starter = this.pokemonSpriteManager.createPokemonSprite(pokemonName, x, y, direction);
        
        this.tweens.add({
          targets: starter,
          x: arriveX ?? (x - 36),
          duration: 2200,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
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
    const messages = [
      "Salut ! Tu viens d'arriver ?",
      "Parfait ! Je vais t'emmener au village !",
      "Suis-moi !"
    ];
    
    let messageIndex = 0;
    const showNextMessage = () => {
      if (messageIndex >= messages.length) {
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
      this.time.delayedCall(2000, () => {
        textBox.destroy();
        showNextMessage();
  }

  finishIntroSequence(starter, player) {
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
        this.input.keyboard.enabled = true;
        if (player.body) player.body.enable = true;
        this._introBlocked = false;
        if (player.anims && this.anims.exists('idle_down')) player.play('idle_down');
        console.log("✅ Intro terminée, joueur débloqué");
      }
    });
  }

  // === OVERRIDE DES MÉTHODES DE MOUVEMENT SI NÉCESSAIRE ===
  
  update(time, delta) {
    // Vérifier si on doit bloquer les inputs à cause de l'intro
    if (this.shouldBlockInput()) return;
    
    // Appeler l'update de la classe parent
    super.update(time, delta);
  }

  shouldBlockInput() {
    // Vérifier les blocages globaux ET spécifiques à BeachScene
    const globalBlock = typeof window.shouldBlockInput === "function" ? window.shouldBlockInput() : false;
    return globalBlock || this._introBlocked;
  }

  // === NETTOYAGE SPÉCIFIQUE ===
  
  cleanup() {
    // Nettoyer les propriétés spécifiques
    this._introTriggered = false;
    this._introBlocked = false;
    
    // Appeler le cleanup parent
    super.cleanup();
  }

  destroy() {
    // Nettoyer le gestionnaire de sprites Pokémon
    this.pokemonSpriteManager = null;
    
    // Appeler le destroy parent
    super.destroy();
  }
}

// === GESTIONNAIRE DE SPRITES POKÉMON (MINI-CLASSE) ===

class PokemonSpriteManager {
  constructor(scene) { 
    this.scene = scene; 
  }

  loadSpritesheet(pokemonName) {
    const key = `${pokemonName}_Walk`;
    if (!this.scene.textures.exists(key)) {
      this.scene.load.spritesheet(key, `assets/pokemon/${pokemonName}.png`, {
        frameWidth: 27, 
        frameHeight: 27,
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
}NextMessage();
      });
    };
    show
