// client/src/scenes/zones/BeachScene.js - VERSION COMPLÈTE REFACTORISÉE
// ✅ Beach + Intro automatique (sans starter automatique)

import { BaseZoneScene } from './BaseZoneScene.js';

// === Mini-manager pour spritesheets Pokémon 2x4 (27x27px) ===
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
}

// ====================== BeachScene ==========================
export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'GreenRootBeach');
    
    // Propriétés spécifiques à BeachScene
    this.pokemonSpriteManager = null;
    this._introBlocked = false;
    this._introTriggered = false;
  }

  async create() {
    // Appeler le create de la classe parent (fait tout le travail de base)
    await super.create();
    
    // Initialisation spécifique à BeachScene
    await this.initializeBeachSpecific();
  }

  async initializeBeachSpecific() {
    console.log("🏖️ Initialisation spécifique à BeachScene...");
    
    // Initialiser le gestionnaire de sprites Pokémon
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    
    // Setup des événements spécifiques à la plage
    this.setupBeachEvents();
    
    console.log("✅ BeachScene spécifique initialisée");
  }

  // === HOOKS SPÉCIFIQUES APPELÉS PAR LA CLASSE PARENT ===
  
  // Hook appelé automatiquement quand le joueur est prêt et positionné
  onPlayerReady(myPlayer) {
    console.log(`🏖️ Joueur prêt sur la plage à (${myPlayer.x}, ${myPlayer.y})`);
    
    // 🎬 Déclencher l'intro automatiquement (seulement si pas déjà fait)
    const initData = this.scene.settings.data;
    if (!this._introTriggered && !initData?.fromZone) {
      this._introTriggered = true;
      this.time.delayedCall(1500, () => {
        // this.startIntroSequence(myPlayer); // Décommente si tu veux l'intro auto
      });
    }
  }

  // Hook appelé après positionnement du joueur
  onPlayerPositioned(player, initData) {
    console.log(`🏖️ Joueur positionné sur la plage`);
    
    // Logique spécifique de positionnement
    if (initData?.fromZone === 'village') {
      // Animation ou dialogue spécial de retour du village
      this.showNotification("Retour sur la plage depuis le village !", "info");
    } else if (!initData?.fromZone) {
      // Premier spawn sur la plage
      this.showNotification("Bienvenue sur la plage de GreenRoot !", "success");
    }
  }

  // === MÉTHODES SPÉCIFIQUES À LA PLAGE ===
  
  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
      this.updateInfoText(`PokeWorld MMO\nBeach Scene\nConnected!\nInventory: ${this.inventoryComponent?.getInventoryStatus().initialized ? 'Ready' : 'Loading...'}`);
    });

    // Événement spécial de plage (exemple)
    this.time.delayedCall(10000, () => {
      if (Math.random() < 0.3) { // 30% de chance
        this.showNotification("🌊 Une vague apporte quelque chose...", "info");
        // Possibilité de faire apparaître un objet rare
      }
    });
  }

  // 🎮 Méthode pour déclencher manuellement le starter (via NPC, bouton, etc.)
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

  spawnStarterPokemon(pokemonName, x, y, direction = "left", player = null, arriveX = null) {
    if (!this.pokemonSpriteManager) {
      console.warn("⚠️ PokemonSpriteManager non initialisé");
      return;
    }
    
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
            if (player && player.anims && player.anims.currentAnim?.key !== 'walk_right') {
              if (this.anims.exists('walk_right')) player.play('walk_right');
            }
          },
          onComplete: () => {
            starter.play(`${pokemonName}_Walk_left`);
            if (player && player.anims && this.anims.exists('idle_right')) {
              player.play('idle_right');
            }
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
      });
    };
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
        if (player && player.body) player.body.enable = true;
        this._introBlocked = false;
        if (player && player.anims && this.anims.exists('idle_down')) {
          player.play('idle_down');
        }
        console.log("✅ Intro terminée, joueur débloqué");
      }
    });
  }

  // === OVERRIDE DES MÉTHODES SI NÉCESSAIRE ===
  
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

  // === MÉTHODES UTILITAIRES SPÉCIFIQUES ===
  
  // Position par défaut pour les spawns sur la plage
  getDefaultSpawnPosition(fromZone) {
    switch(fromZone) {
      case 'village':
      case 'VillageScene':
        return { x: 52, y: 48 }; // Position depuis le village
      default:
        return { x: 52, y: 48 }; // Position par défaut
    }
  }

  // Créer des objets spéciaux sur la plage
  createBeachItems() {
    if (!this.inventoryComponent) return;
    
    console.log("🏖️ Création d'objets spéciaux sur la plage...");
    
    // Objets spéciaux à la plage
    const beachItems = [
      { itemId: 'sea_shell', x: 100, y: 200, emoji: '🐚' },
      { itemId: 'drift_wood', x: 180, y: 180, emoji: '🪵' },
      { itemId: 'pearl', x: 250, y: 220, emoji: '🦪' }
    ];

    beachItems.forEach(item => {
      this.inventoryComponent.createAdvancedWorldItem(item.itemId, item.x, item.y, item.emoji);
    });
  }

  // Événement météo sur la plage
  triggerWeatherEvent() {
    const weatherEvents = [
      { type: 'rain', message: '🌧️ Il commence à pleuvoir sur la plage...' },
      { type: 'sun', message: '☀️ Le soleil brille intensément...' },
      { type: 'wind', message: '💨 Un vent fort souffle depuis l\'océan...' }
    ];
    
    const event = weatherEvents[Math.floor(Math.random() * weatherEvents.length)];
    this.showNotification(event.message, 'info');
    
    // Effets visuels selon la météo
    switch(event.type) {
      case 'rain':
        this.createRainEffect();
        break;
      case 'wind':
        this.createWindEffect();
        break;
    }
  }

  createRainEffect() {
    // Effet de pluie simple
    for (let i = 0; i < 20; i++) {
      const drop = this.add.rectangle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(-50, 0),
        2, 10, 0x87ceeb
      ).setDepth(100);
      
      this.tweens.add({
        targets: drop,
        y: this.scale.height + 50,
        duration: Phaser.Math.Between(1000, 2000),
        ease: 'Linear',
        onComplete: () => drop.destroy()
      });
    }
  }

  createWindEffect() {
    // Effet de vent avec des particules
    for (let i = 0; i < 10; i++) {
      const particle = this.add.circle(
        -20,
        Phaser.Math.Between(50, this.scale.height - 50),
        3, 0xf0f8ff
      ).setDepth(100);
      
      this.tweens.add({
        targets: particle,
        x: this.scale.width + 20,
        y: particle.y + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(2000, 4000),
        ease: 'Power1',
        onComplete: () => particle.destroy()
      });
    }
  }

  // === INTERACTIONS SPÉCIALES DE LA PLAGE ===
  
  // Override de la gestion NPC pour ajouter des NPCs spéciaux
  handleSpecialBeachNpc(npcName) {
    switch(npcName) {
      case 'Surfeur':
        this.showNotification("🏄‍♂️ Les vagues sont parfaites aujourd'hui !", "info");
        break;
      case 'Collectionneur':
        this.showNotification("🐚 Je collectionne les coquillages rares...", "info");
        break;
      case 'Pêcheur':
        this.showNotification("🎣 J'ai attrapé un gros poisson !", "success");
        // Possibilité de donner un objet au joueur
        if (this.inventoryComponent) {
          // Simuler l'ajout d'un poisson
          this.time.delayedCall(1000, () => {
            this.inventoryComponent.showNotification("Vous recevez : Poisson x1", "success");
          });
        }
        break;
    }
  }

  // === NETTOYAGE SPÉCIFIQUE ===
  
  cleanup() {
    console.log("🧹 Nettoyage spécifique BeachScene...");
    
    // Nettoyer les propriétés spécifiques
    this._introTriggered = false;
    this._introBlocked = false;
    
    // Appeler le cleanup parent
    super.cleanup();
  }

  destroy() {
    console.log("💀 Destruction BeachScene...");
    
    // Nettoyer le gestionnaire de sprites Pokémon
    this.pokemonSpriteManager = null;
    
    // Appeler le destroy parent
    super.destroy();
  }
}
