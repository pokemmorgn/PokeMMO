// client/src/Battle/BattleTransitionManager.js
// Gestionnaire principal des transitions de combat authentiques Pokémon

import { SpiralTransition } from './transitions/SpiralTransition.js';
import { CirclesTransition } from './transitions/CirclesTransition.js';
import { CustomTransition } from './transitions/CustomTransition.js';

export class BattleTransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.config = null;
    this.currentTransition = null;
    this.isTransitioning = false;
    this.audioManager = null;
    
    // État de la transition
    this.transitionState = 'idle'; // 'idle', 'starting', 'visual', 'switching', 'ending'
    this.transitionData = null;
    this.onCompleteCallback = null;
    
    // Managers des effets
    this.effectManagers = new Map();
    
    console.log('⚔️ [BattleTransitionManager] Initialisé');
  }

  /**
   * Initialise le manager avec la configuration
   */
  async initialize() {
    try {
      // Charger la config
      await this.loadConfig();
      
      // Créer l'audio manager
      this.createAudioManager();
      
      // Initialiser les transitions disponibles
      this.initializeTransitions();
      
      console.log('✅ [BattleTransitionManager] Initialisé avec succès');
      console.log(`🎨 Transitions disponibles: ${Array.from(this.effectManagers.keys()).join(', ')}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ [BattleTransitionManager] Erreur initialisation:', error);
      return false;
    }
  }

  /**
   * Charge la configuration des transitions
   */
  async loadConfig() {
    try {
      const response = await fetch('client/src/config/BattleTransitionConfig.json');
      this.config = await response.json();
      
      console.log(`📋 [BattleTransitionManager] Config chargée:`, {
        version: this.config.version,
        defaultTransition: this.config.defaultTransition,
        transitionsCount: Object.keys(this.config.transitions).length
      });
      
    } catch (error) {
      console.warn('⚠️ [BattleTransitionManager] Config par défaut utilisée');
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Initialise les transitions disponibles
   */
  initializeTransitions() {
    // Spiral transition (Ruby/Sapphire style)
    this.effectManagers.set('spiral', new SpiralTransition(this.scene));
    
    // Circles transition (versions récentes)
    this.effectManagers.set('circles', new CirclesTransition(this.scene));
    
    // Custom transition (pour extensions)
    this.effectManagers.set('custom', new CustomTransition(this.scene));
    
    console.log('🎭 [BattleTransitionManager] Toutes les transitions initialisées');
  }

  /**
   * Démarre une transition de combat
   */
  async startBattleTransition(battleData, transitionType = null) {
    if (this.isTransitioning) {
      console.warn('⚠️ [BattleTransitionManager] Transition déjà en cours');
      return false;
    }

    const effectType = transitionType || this.config.defaultTransition;
    const transitionConfig = this.config.transitions[effectType];
    
    if (!transitionConfig) {
      console.error(`❌ [BattleTransitionManager] Transition inconnue: ${effectType}`);
      return false;
    }

    console.log(`🎬 [BattleTransitionManager] === DÉBUT TRANSITION ${effectType.toUpperCase()} ===`);
    
    try {
      this.isTransitioning = true;
      this.transitionState = 'starting';
      this.transitionData = battleData;
      this.currentTransition = this.effectManagers.get(effectType);

      // Bloquer le mouvement du joueur
      this.blockPlayerMovement();

      // Étape 1: Fade out musique overworld
      await this.fadeOutOverworldMusic(transitionConfig.timing.fadeOutMusic);

      // Étape 2: Son de déclenchement
      await this.playTransitionSound(transitionConfig, transitionConfig.timing.playSound);

      // Étape 3: Démarrer l'effet visuel
      await this.startVisualEffect(transitionConfig, transitionConfig.timing.startVisual);

      // Étape 4: Fade to black
      await this.fadeToBlack(transitionConfig, transitionConfig.timing.fadeToBlack);

      // Étape 5: Switch vers BattleScene
      await this.switchToBattleScene(transitionConfig.timing.switchScene);

      // Étape 6: Fade in avec musique de combat
      await this.completeBattleTransition(transitionConfig, transitionConfig.timing.fadeIn);

      console.log('✅ [BattleTransitionManager] Transition terminée avec succès');
      return true;

    } catch (error) {
      console.error('❌ [BattleTransitionManager] Erreur pendant la transition:', error);
      this.handleTransitionError();
      return false;
    }
  }

  /**
   * Bloque le mouvement du joueur
   */
  blockPlayerMovement() {
    console.log('🔒 [BattleTransitionManager] Blocage mouvement joueur...');
    
    // Via MovementBlockHandler si disponible
    if (window.movementBlockHandler) {
      // Le serveur enverra un blocage, on ne fait rien côté client
      console.log('🔒 Attente blocage serveur...');
    }
    
    // Arrêter le joueur physiquement
    const playerManager = this.scene.playerManager;
    if (playerManager) {
      const myPlayer = playerManager.getMyPlayer();
      if (myPlayer && myPlayer.body) {
        myPlayer.body.setVelocity(0, 0);
        myPlayer.anims.play(`idle_${this.scene.lastDirection || 'down'}`, true);
        console.log('⏸️ Joueur arrêté physiquement');
      }
    }
  }

  /**
   * Fade out de la musique overworld
   */
  async fadeOutOverworldMusic(delay = 0) {
    if (delay > 0) {
      await this.wait(delay);
    }

    console.log('🎵 [BattleTransitionManager] Fade out musique overworld...');
    
    if (this.audioManager) {
      await this.audioManager.fadeOutCurrentMusic(500);
    }
  }

  /**
   * Joue le son de transition
   */
  async playTransitionSound(config, delay = 0) {
    if (delay > 0) {
      await this.wait(delay);
    }

    console.log('🔊 [BattleTransitionManager] Son de transition...');
    
    if (this.audioManager && config.audio.triggerSound) {
      this.audioManager.playTransitionSound(config.audio.triggerSound, config.audio.volume);
    }
  }

  /**
   * Démarre l'effet visuel
   */
  async startVisualEffect(config, delay = 0) {
    if (delay > 0) {
      await this.wait(delay);
    }

    this.transitionState = 'visual';
    console.log(`🎨 [BattleTransitionManager] Effet visuel: ${config.visual.type}`);
    
    if (this.currentTransition) {
      await this.currentTransition.start(config);
    }
  }

  /**
   * Fade vers le noir
   */
  async fadeToBlack(config, delay = 0) {
    if (delay > 0) {
      await this.wait(delay);
    }

    console.log('⚫ [BattleTransitionManager] Fade to black...');
    
    // Créer overlay noir
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    overlay.setScrollFactor(0);
    overlay.setDepth(10000);

    // Animation fade
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: 400,
        ease: 'Power2.easeInOut',
        onComplete: () => {
          this.blackOverlay = overlay;
          resolve();
        }
      });
    });
  }

  /**
   * Switch vers la BattleScene
   */
  async switchToBattleScene(delay = 0) {
    if (delay > 0) {
      await this.wait(delay);
    }

    this.transitionState = 'switching';
    console.log('🔄 [BattleTransitionManager] Switch vers BattleScene...');
    
    // Préparer les données pour BattleScene
    const battleSceneData = {
      battleData: this.transitionData,
      transitionFrom: this.scene.scene.key,
      networkManager: this.scene.networkManager,
      battleNetworkHandler: this.scene.battleNetworkHandler
    };

    // Activer BattleScene
    if (!this.scene.scene.isActive('BattleScene')) {
      this.scene.scene.launch('BattleScene', battleSceneData);
    } else {
      this.scene.scene.wake('BattleScene');
      const battleScene = this.scene.scene.get('BattleScene');
      if (battleScene) {
        battleScene.startBattle(this.transitionData);
      }
    }

    // Masquer la scène actuelle
    this.scene.scene.setVisible(false);
    this.scene.scene.sleep();
  }

  /**
   * Termine la transition avec fade in
   */
  async completeBattleTransition(config, delay = 0) {
    if (delay > 0) {
      await this.wait(delay);
    }

    this.transitionState = 'ending';
    console.log('✨ [BattleTransitionManager] Finalisation transition...');

    // Démarrer musique de combat
    if (this.audioManager) {
      this.audioManager.startBattleMusic();
    }

    // Fade in BattleScene
    const battleScene = this.scene.scene.get('BattleScene');
    if (battleScene && this.blackOverlay) {
      battleScene.scene.setVisible(true);
      
      // Fade out l'overlay noir
      battleScene.tweens.add({
        targets: this.blackOverlay,
        alpha: 0,
        duration: 500,
        ease: 'Power2.easeOut',
        onComplete: () => {
          if (this.blackOverlay) {
            this.blackOverlay.destroy();
            this.blackOverlay = null;
          }
        }
      });
    }

    // Nettoyer la transition
    this.cleanup();
  }

  /**
   * Gère les erreurs de transition
   */
  handleTransitionError() {
    console.error('💥 [BattleTransitionManager] Gestion erreur transition');
    
    // Débloquer le mouvement
    if (window.movementBlockHandler) {
      window.movementBlockHandler.requestForceUnblock();
    }
    
    // Nettoyer
    this.cleanup();
    
    // Fallback vers combat direct
    this.fallbackToBattle();
  }

  /**
   * Fallback vers combat sans transition
   */
  fallbackToBattle() {
    console.log('🔄 [BattleTransitionManager] Fallback combat direct...');
    
    if (this.transitionData) {
      // Démarrer directement BattleScene
      const battleSceneData = {
        battleData: this.transitionData,
        networkManager: this.scene.networkManager,
        battleNetworkHandler: this.scene.battleNetworkHandler
      };
      
      this.scene.scene.start('BattleScene', battleSceneData);
    }
  }

  /**
   * Crée l'audio manager
   */
  createAudioManager() {
    this.audioManager = {
      currentMusic: null,
      
      async fadeOutCurrentMusic(duration) {
        if (this.currentMusic) {
          return new Promise(resolve => {
            this.scene.tweens.add({
              targets: this.currentMusic,
              volume: 0,
              duration: duration,
              onComplete: () => {
                this.currentMusic.stop();
                this.currentMusic = null;
                resolve();
              }
            });
          });
        }
      },
      
      playTransitionSound(soundKey, volume = 0.8) {
        if (this.scene.sound && this.scene.cache.audio.exists(soundKey)) {
          this.scene.sound.play(soundKey, { volume });
        } else {
          console.warn(`⚠️ Son de transition manquant: ${soundKey}`);
        }
      },
      
      startBattleMusic() {
        const battleMusicKey = this.config?.audio?.battleMusicKey || 'battle_theme';
        if (this.scene.sound && this.scene.cache.audio.exists(battleMusicKey)) {
          this.currentMusic = this.scene.sound.play(battleMusicKey, { 
            loop: true, 
            volume: 0.6 
          });
        }
      }
    };
  }

  /**
   * Configuration par défaut
   */
  getDefaultConfig() {
    return {
      version: "1.0.0",
      defaultTransition: "spiral",
      transitions: {
        spiral: {
          visual: { type: "spiral", duration: 1200 },
          audio: { triggerSound: null, volume: 0.8 },
          timing: {
            fadeOutMusic: 0,
            playSound: 200,
            startVisual: 400,
            fadeToBlack: 800,
            switchScene: 1000,
            fadeIn: 1200
          }
        }
      },
      audio: {
        battleMusicKey: "battle_theme"
      }
    };
  }

  /**
   * Utilitaires
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    console.log('🧹 [BattleTransitionManager] Nettoyage...');
    
    this.isTransitioning = false;
    this.transitionState = 'idle';
    this.transitionData = null;
    this.currentTransition = null;
    
    if (this.blackOverlay) {
      this.blackOverlay.destroy();
      this.blackOverlay = null;
    }
  }

  /**
   * API publique pour customisation
   */
  setTransitionConfig(type, config) {
    if (this.config && this.config.transitions) {
      this.config.transitions[type] = config;
      console.log(`🎨 [BattleTransitionManager] Config ${type} mise à jour`);
    }
  }

  getAvailableTransitions() {
    return Array.from(this.effectManagers.keys());
  }

  isTransitionInProgress() {
    return this.isTransitioning;
  }

  getCurrentTransitionState() {
    return this.transitionState;
  }
}
