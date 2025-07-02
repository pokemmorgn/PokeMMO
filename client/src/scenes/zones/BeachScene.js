// ===============================================
// BeachScene.js - Fix timing intro après spawn player complet
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';
import { PsyduckIntroManager } from '../intros/PsyduckIntroManager.js';

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
    super('BeachScene', 'beach');
    this.transitionCooldowns = {};
    this.pokemonSpriteManager = null;
    this._introBlocked = false;
    this._introTriggered = false;
    this.psyduckIntroManager = null;
    this._serverCheckSent = false;
    this._fallbackTimer = null;
    this._roomConnectionTimer = null;
    this._clientReadySent = false;
    
    // ✅ NOUVEAU: Flags pour gérer le timing correct
    this._playerFullySpawned = false;
    this._playerPositionConfirmed = false;
    this._introReadyToStart = false;
    this._waitingForPlayerSpawn = false;
  }

  // ✅ HOOK: Room disponible
  onRoomAvailable(room) {
    console.log(`📡 [BeachScene] Room disponible, setup listeners...`);
    if (!this.psyduckIntroManager) {
      this.time.delayedCall(50, () => this.onRoomAvailable(room));
      return;
    }
    this.setupEarlyListeners();
  }
  
  async create() {
    console.log(`🏖️ [BeachScene] === CRÉATION SCENE ===`);
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.psyduckIntroManager = new PsyduckIntroManager(this);
    this.setupBeachEvents();
    
    console.log(`✅ [BeachScene] Création terminée, attente spawn joueur...`);
  }

  // ✅ SETUP LISTENERS: Attendre room + délai sécurisé pour clientReady
  setupEarlyListeners() {
    const checkRoom = () => {
      if (this.room) {
        console.log(`📡 [BeachScene] Room détectée, setup listeners...`);
        this.psyduckIntroManager.ensureListenersSetup();
        this.setupServerListeners();
        
        // ✅ DÉLAI PLUS LONG pour être sûr que tout soit prêt
        this.time.delayedCall(3000, () => {
          console.log(`📡 [BeachScene] Envoi clientReady après délai sécurisé`);
          this.sendClientReady();
        });
        return true;
      }
      return false;
    };

    if (!checkRoom()) {
      let attempts = 0;
      const maxAttempts = 60;
      const roomTimer = this.time.addEvent({
        delay: 50,
        repeat: maxAttempts,
        callback: () => {
          attempts++;
          if (checkRoom()) {
            roomTimer.remove();
          } else if (attempts >= maxAttempts) {
            console.warn(`⚠️ [BeachScene] Timeout attente room, mode fallback`);
            roomTimer.remove();
            this.activateFallbackMode();
          }
        }
      });
    }
  }

  // ✅ NOUVEAU: Mode fallback si pas de serveur
  activateFallbackMode() {
    console.log(`🔄 [BeachScene] Activation mode fallback sans serveur`);
    
    // Attendre que le joueur soit prêt avant de démarrer l'intro fallback
    this.waitForPlayerThenStartIntro(() => {
      console.log(`🎬 [BeachScene] Démarrage intro fallback`);
      this.startIntroFallback();
    });
  }

  // ✅ Envoi clientReady seulement quand tout est prêt
  sendClientReady() {
    if (this.room && !this._clientReadySent) {
      // ✅ VÉRIFIER que le joueur est prêt avant d'envoyer clientReady
      if (this._playerFullySpawned && this._playerPositionConfirmed) {
        this.room.send("clientIntroReady");
        this._clientReadySent = true;
        console.log("🚦 [BeachScene] clientReady envoyé au serveur");
      } else {
        console.log("⏳ [BeachScene] Attente spawn joueur avant clientReady...");
        this._waitingForPlayerSpawn = true;
        
        // Retry après délai
        this.time.delayedCall(1000, () => {
          this.sendClientReady();
        });
      }
    }
  }

  // ✅ CONFIGURATION ÉCOUTES SERVEUR
  setupServerListeners() {
    if (!this.room) {
      console.warn(`⚠️ [BeachScene] Pas de room pour écoutes serveur`);
      return;
    }

    console.log(`📡 [BeachScene] Configuration écoutes serveur...`);

    this.room.onMessage("questGranted", (data) => {
      console.log("🎁 [BeachScene] Nouvelle quête reçue:", data);
    });

    this.room.onMessage("introQuestCompleted", (data) => {
      console.log("🎉 [BeachScene] Quête d'intro terminée:", data);
    });

    console.log(`✅ [BeachScene] Écoutes serveur configurées`);
  }

  // ✅ OVERRIDE: onPlayerReady - Hook quand le joueur est prêt
  onPlayerReady(player) {
    console.log(`✅ [BeachScene] === PLAYER READY HOOK ===`);
    console.log(`👤 Joueur prêt: ${player.sessionId} à (${player.x}, ${player.y})`);
    
    // ✅ MARQUER comme spawné
    this._playerFullySpawned = true;
    
    // ✅ VÉRIFIER position valide
    if (player.x !== undefined && player.y !== undefined && player.x !== 0 && player.y !== 0) {
      this._playerPositionConfirmed = true;
      console.log(`📍 [BeachScene] Position joueur confirmée: (${player.x}, ${player.y})`);
    }
    
    // ✅ Si on attendait le spawn pour envoyer clientReady
    if (this._waitingForPlayerSpawn && !this._clientReadySent) {
      console.log(`🚦 [BeachScene] Joueur prêt, envoi clientReady maintenant`);
      this.time.delayedCall(500, () => {
        this.sendClientReady();
      });
    }
    
    // ✅ DÉLAI SÉCURISÉ avant de pouvoir démarrer l'intro
    this.time.delayedCall(1000, () => {
      this._introReadyToStart = true;
      console.log(`🎬 [BeachScene] Intro maintenant autorisée à démarrer`);
      
      // Si on a une intro en attente, la démarrer maintenant
      if (this._pendingIntroStart) {
        console.log(`🚀 [BeachScene] Démarrage intro qui était en attente`);
        this._pendingIntroStart();
        this._pendingIntroStart = null;
      }
    });
    
    // ✅ Appeler le parent
    super.onPlayerReady(player);
  }

// ✅ REMPLACEZ LES DEUX MÉTHODES positionPlayer() PAR CELLE-CI
positionPlayer(player) {
  console.log(`🏖️ [BeachScene] Force position Beach à (360, 120)`);
  
  // ✅ FORCER la position peu importe ce qui se passe
  player.x = 360;
  player.y = 120;
  player.targetX = 360;
  player.targetY = 120;
  
  // Faire le reste (visibilité, caméra, etc.)
  super.positionPlayer(player);
  
  // ✅ Double vérification après le super
  player.x = 360;
  player.y = 120;
  
  // ✅ NE PLUS déclencher l'intro ici !
  // L'intro sera déclenchée par le serveur via triggerIntroSequence
  // ou par le fallback si pas de serveur
  
  console.log(`👤 [BeachScene] Joueur positionné à (${player.x}, ${player.y})`);
}

  // ✅ NOUVEAU: Fonction pour attendre que le joueur soit prêt
  waitForPlayerThenStartIntro(callback) {
    if (this._playerFullySpawned && this._playerPositionConfirmed && this._introReadyToStart) {
      console.log(`✅ [BeachScene] Joueur prêt, exécution callback intro`);
      callback();
      return;
    }
    
    console.log(`⏳ [BeachScene] Attente spawn complet joueur...`);
    console.log(`📊 Status: spawned=${this._playerFullySpawned}, positioned=${this._playerPositionConfirmed}, ready=${this._introReadyToStart}`);
    
    // ✅ Stocker le callback pour l'exécuter plus tard
    this._pendingIntroStart = callback;
    
    // ✅ Timeout de sécurité
    this.time.delayedCall(10000, () => {
      if (this._pendingIntroStart) {
        console.warn(`⚠️ [BeachScene] Timeout attente joueur, force start intro`);
        callback();
        this._pendingIntroStart = null;
      }
    });
  }

  // ✅ Hook après positionnement complet
  onPlayerPositioned(player, initData) {
    console.log(`✅ [BeachScene] Joueur définitivement positionné à (${player.x}, ${player.y})`);
    
    // ✅ S'assurer que le joueur est visible
    if (player.setVisible) player.setVisible(true);
    if (player.alpha !== undefined) player.alpha = 1;
    
    // ✅ Marquer position comme confirmée
    this._playerPositionConfirmed = true;
    
    console.log(`👁️ [BeachScene] Visibilité joueur confirmée`);
    
    // ✅ Appeler le parent
    super.onPlayerPositioned(player, initData);
  }

  // ✅ MODIFIÉ: Fallback intro - attendre joueur
  startIntroFallback() {
    if (this._introTriggered) {
      console.log(`ℹ️ [BeachScene] Intro déjà déclenchée`);
      return;
    }
    
    console.log(`🎬 [BeachScene] Demande démarrage intro fallback...`);
    
    // ✅ Attendre que le joueur soit complètement prêt
    this.waitForPlayerThenStartIntro(() => {
      if (this._introTriggered) return; // Double-check
      
      console.log(`🎬 [BeachScene] Démarrage intro fallback avec joueur prêt`);
      this._introTriggered = true;
      
      if (this.psyduckIntroManager) {
        this.psyduckIntroManager.startIntroFallback();
      }
    });
  }

  // ✅ NOUVEAU: Démarrage intro serveur - attendre joueur
  startServerIntro() {
    console.log(`🎬 [BeachScene] Demande démarrage intro serveur...`);
    
    // ✅ Attendre que le joueur soit complètement prêt
    this.waitForPlayerThenStartIntro(() => {
      if (this._introTriggered) return; // Double-check
      
      console.log(`🎬 [BeachScene] Démarrage intro serveur avec joueur prêt`);
      this._introTriggered = true;
      
      if (this.psyduckIntroManager) {
        this.psyduckIntroManager.startIntro(() => {
          console.log("✅ [BeachScene] Intro serveur terminée");
        });
      }
    });
  }

  // ✅ UPDATE: Vérifier si inputs bloqués
  update() {
    if (this.shouldBlockInput()) return;
    super.update();
  }

  shouldBlockInput() {
    const globalBlock = typeof window.shouldBlockInput === "function" ? window.shouldBlockInput() : false;
    return globalBlock || this._introBlocked;
  }

  getDefaultSpawnPosition(fromZone) {
    if (fromZone === 'VillageScene' || fromZone) {
      return { x: 52, y: 48 };
    }
    return { x: 360, y: 120 };
  }

  // ✅ MÉTHODE PUBLIQUE: Démarrer intro Psyduck (avec attente joueur)
  startPsyduckIntro() {
    console.log(`🎬 [BeachScene] Demande démarrage intro Psyduck...`);
    
    this.waitForPlayerThenStartIntro(() => {
      if (this.psyduckIntroManager) {
        console.log(`🎬 [BeachScene] Démarrage intro Psyduck avec intégration serveur`);
        this.psyduckIntroManager.ensureListenersSetup();
        this.psyduckIntroManager.startIntro(() => {
          console.log("✅ [BeachScene] Intro Psyduck terminée");
        });
      }
    });
  }

  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  triggerStarterSelection() {
    if (window.starterHUD) {
      window.starterHUD.show();
    } else {
      console.warn("⚠️ HUD de starter non initialisé");
    }
  }

  // ✅ FONCTIONS DE DEBUG ET TEST

  forceStartIntro() {
    console.log(`🧪 [BeachScene] Force start intro (mode test)`);
    if (!this._introTriggered) {
      this._introTriggered = true;
      this.psyduckIntroManager.ensureListenersSetup();
      this.startPsyduckIntro();
    }
  }

  resetIntroState() {
    console.log(`🔄 [BeachScene] Reset intro state`);
    this._introTriggered = false;
    this._serverCheckSent = false;
    this._clientReadySent = false;
    this._playerFullySpawned = false;
    this._playerPositionConfirmed = false;
    this._introReadyToStart = false;
    this._waitingForPlayerSpawn = false;
    this._pendingIntroStart = null;
    
    if (this._fallbackTimer) {
      this._fallbackTimer.remove();
      this._fallbackTimer = null;
    }
    if (this._roomConnectionTimer) {
      this._roomConnectionTimer.remove();
      this._roomConnectionTimer = null;
    }
  }

  getIntroStatus() {
    return {
      introTriggered: this._introTriggered,
      serverCheckSent: this._serverCheckSent,
      clientReadySent: this._clientReadySent,
      playerFullySpawned: this._playerFullySpawned,
      playerPositionConfirmed: this._playerPositionConfirmed,
      introReadyToStart: this._introReadyToStart,
      waitingForPlayerSpawn: this._waitingForPlayerSpawn,
      pendingIntroStart: this._pendingIntroStart !== null,
      fallbackTimerActive: this._fallbackTimer !== null,
      roomConnectionTimerActive: this._roomConnectionTimer !== null,
      psyduckManagerReady: this.psyduckIntroManager !== null,
      psyduckManagerStatus: this.psyduckIntroManager?.getStatus(),
      roomConnected: this.room !== null
    };
  }

  debugSceneState() {
    console.log(`🔍 [BeachScene] === DEBUG SCENE STATE ===`);
    console.log(`📊 Intro Status:`, this.getIntroStatus());
    console.log(`🏖️ Beach Events:`, {
      pokemonManagerReady: this.pokemonSpriteManager !== null,
      inputBlocked: this._introBlocked,
      roomConnected: this.room !== null
    });
    
    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer) {
      console.log(`👤 Joueur:`, {
        x: myPlayer.x,
        y: myPlayer.y,
        visible: myPlayer.visible,
        alpha: myPlayer.alpha,
        exists: true,
        sessionId: myPlayer.sessionId
      });
    } else {
      console.log(`👤 Joueur: NON TROUVÉ`);
    }
    
    if (this.psyduckIntroManager) {
      console.log(`🦆 PsyduckIntroManager:`, this.psyduckIntroManager.getStatus());
    }
    
    console.log(`=======================================`);
  }

  // ✅ CLEANUP: Nettoyer tous les flags
  cleanup() {
    console.log(`🧹 [BeachScene] Nettoyage...`);
    
    if (this._fallbackTimer) {
      this._fallbackTimer.remove();
      this._fallbackTimer = null;
    }
    if (this._roomConnectionTimer) {
      this._roomConnectionTimer.remove();
      this._roomConnectionTimer = null;
    }
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.destroy();
      this.psyduckIntroManager = null;
    }
    
    this.transitionCooldowns = {};
    this._introTriggered = false;
    this._serverCheckSent = false;
    this._clientReadySent = false;
    this._playerFullySpawned = false;
    this._playerPositionConfirmed = false;
    this._introReadyToStart = false;
    this._waitingForPlayerSpawn = false;
    this._pendingIntroStart = null;
    
    console.log(`✅ [BeachScene] Nettoyage terminé`);
    super.cleanup();
  }

  onDestroy() {
    console.log(`💀 [BeachScene] Destruction de la scène`);
    this.cleanup();
  }

  // ✅ MÉTHODES DE COMPATIBILITÉ (intro animée classique)
  
  startIntroSequence(player) {
    console.log("🎬 [BeachScene] Démarrage de l'intro animée classique");
    this.input.keyboard.enabled = false;
    if (player.body) player.body.enable = false;
    this._introBlocked = true;

    if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
      if (this.anims.exists('walk_right')) player.play('walk_right');
    }

    const spawnX = player.x + 120;
    const arriveX = player.x + 24;
    const y = player.y;
    this.spawnStarterPokemon(spawnX, y, '001_Bulbasaur', 'left', player, arriveX);
  }

  spawnStarterPokemon(x, y, pokemonName, direction = "left", player = null, arriveX = null) {
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
        if (player.body) player.body.enable = true;
        this._introBlocked = false;
        if (player.anims && this.anims.exists('idle_down')) player.play('idle_down');
        console.log("✅ [BeachScene] Intro classique terminée, joueur débloqué");
      }
    });
  }
}
