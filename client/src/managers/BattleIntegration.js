// client/src/managers/BattleIntegration.js - Intégration du système de combat

import { BattleScene } from '../scenes/BattleScene.js';
import { BattleManager } from '../Battle/BattleManager.js';
import { BattleConnection } from '../Battle/BattleConnection.js';

/**
 * Gestionnaire d'intégration du système de combat avec le jeu principal
 */
export class BattleIntegration {
  constructor(gameManager) {
    this.gameManager = gameManager;
    
    // Composants du système de combat
    this.battleScene = null;
    this.battleManager = null;
    this.battleConnection = null;
    
    // État
    this.isInitialized = false;
    this.isInBattle = false;
    
    // Références
    this.worldRoom = null;
    this.phaserGame = null;
    
    console.log('⚔️ [BattleIntegration] Constructeur initialisé');
  }

  // === INITIALISATION ===

  /**
   * Initialise le système de combat
   */
  async initialize(worldRoom, phaserGame) {
    console.log('🔧 [BattleIntegration] Initialisation du système de combat...');
    
    if (!worldRoom || !phaserGame) {
      console.error('❌ [BattleIntegration] WorldRoom ou PhaserGame manquant');
      return false;
    }
    
    this.worldRoom = worldRoom;
    this.phaserGame = phaserGame;
    
    try {
      // 1. Créer la BattleConnection
      this.battleConnection = new BattleConnection(this.gameManager);
      const connectionSuccess = this.battleConnection.initialize(this.gameManager.networkManager);
      
      if (!connectionSuccess) {
        console.error('❌ [BattleIntegration] Échec initialisation BattleConnection');
        return false;
      }
      
      // 2. Créer et ajouter la BattleScene à Phaser
      this.battleScene = new BattleScene();
      phaserGame.scene.add('BattleScene', this.battleScene, false);
      
      // 3. Setup des événements
      this.setupBattleEvents();
      
      this.isInitialized = true;
      console.log('✅ [BattleIntegration] Système de combat initialisé');
      return true;
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  // === CONFIGURATION DES ÉVÉNEMENTS ===

  setupBattleEvents() {
    if (!this.battleConnection) return;
    
    console.log('🔗 [BattleIntegration] Configuration des événements...');
    
    // Événements de la BattleConnection
    this.battleConnection.on('encounterStart', (data) => {
      this.handleEncounterStart(data);
    });
    
    this.battleConnection.on('battleRoomCreated', (data) => {
      this.handleBattleRoomCreated(data);
    });
    
    this.battleConnection.on('battleRoomJoined', (data) => {
      this.handleBattleRoomJoined(data);
    });
    
    this.battleConnection.on('battleStart', (data) => {
      this.handleBattleStart(data);
    });
    
    this.battleConnection.on('battleEnd', (data) => {
      this.handleBattleEnd(data);
    });
    
    this.battleConnection.on('battleLeft', (data) => {
      this.handleBattleLeft(data);
    });
    
    this.battleConnection.on('battleError', (data) => {
      this.handleBattleError(data);
    });
    
    // Événements du GameManager (si disponibles)
    if (this.gameManager) {
      // Écouter les rencontres sauvages depuis le GameManager
      this.gameManager.on?.('wildEncounter', (data) => {
        this.handleWildEncounterFromGame(data);
      });
      
      // Écouter les changements d'état du joueur
      this.gameManager.on?.('playerStateChange', (data) => {
        this.handlePlayerStateChange(data);
      });
    }
    
    console.log('✅ [BattleIntegration] Événements configurés');
  }

  // === HANDLERS D'ÉVÉNEMENTS ===

  handleEncounterStart(data) {
    console.log('🐾 [BattleIntegration] Début de rencontre:', data);
    
    if (this.isInBattle) {
      console.warn('⚠️ [BattleIntegration] Déjà en combat, ignoré');
      return;
    }
    
    // Marquer comme en combat
    this.isInBattle = true;
    
    // Notifier le GameManager
    if (this.gameManager?.onBattleStart) {
      this.gameManager.onBattleStart(data);
    }
    
    // Démarrer la BattleScene
    this.startBattleScene(data);
  }

  handleBattleRoomCreated(data) {
    console.log('🏠 [BattleIntegration] BattleRoom créée:', data.battleRoomId);
    
    // La BattleConnection va automatiquement se connecter
    // On attend juste la confirmation
  }

  handleBattleRoomJoined(data) {
    console.log('🚪 [BattleIntegration] BattleRoom rejointe:', data);
    
    // Maintenant on peut vraiment commencer le combat
    if (this.battleScene && this.battleScene.battleManager) {
      // Le BattleManager va recevoir les événements via la BattleConnection
      console.log('✅ [BattleIntegration] Prêt pour le combat');
    }
  }

  handleBattleStart(data) {
    console.log('⚔️ [BattleIntegration] Combat effectivement commencé:', data);
    
    // S'assurer que l'interface est visible
    if (this.battleScene) {
      this.battleScene.showBattleInterface();
    }
  }

  handleBattleEnd(data) {
    console.log('🏁 [BattleIntegration] Fin de combat:', data);
    
    // Programmer la fin du combat
    setTimeout(() => {
      this.endBattle(data);
    }, 3000); // 3 secondes pour voir les résultats
  }

  handleBattleLeft(data) {
    console.log('👋 [BattleIntegration] Combat quitté:', data);
    
    this.endBattle(data);
  }

  handleBattleError(data) {
    console.error('❌ [BattleIntegration] Erreur de combat:', data);
    
    // Afficher l'erreur à l'utilisateur
    if (this.gameManager?.showError) {
      this.gameManager.showError(`Erreur de combat: ${data.message}`);
    }
    
    // Forcer la fin du combat en cas d'erreur critique
    if (data.critical) {
      this.endBattle({ reason: 'error', error: data });
    }
  }

  handleWildEncounterFromGame(data) {
    console.log('🎮 [BattleIntegration] Rencontre depuis le jeu:', data);
    
    // Si le système de combat est prêt, démarrer
    if (this.isInitialized && !this.isInBattle) {
      // Cette rencontre vient probablement d'un grass patch ou autre trigger
      // On peut démarrer le processus de combat
      this.startWildBattle(data);
    }
  }

  handlePlayerStateChange(data) {
    // Réagir aux changements d'état du joueur
    if (data.inBattle !== undefined && data.inBattle !== this.isInBattle) {
      this.isInBattle = data.inBattle;
      
      if (!this.isInBattle && this.battleScene) {
        // Le joueur n'est plus en combat, nettoyer
        this.endBattle({ reason: 'state_change' });
      }
    }
  }

  // === GESTION DE LA BATTLESCENE ===

  startBattleScene(data) {
    if (!this.battleScene || !this.phaserGame) {
      console.error('❌ [BattleIntegration] BattleScene ou PhaserGame manquant');
      return;
    }
    
    console.log('🎬 [BattleIntegration] Démarrage BattleScene...');
    
    try {
      // Réveiller ou démarrer la BattleScene
      if (this.phaserGame.scene.isActive('BattleScene')) {
        this.phaserGame.scene.bringToTop('BattleScene');
      } else {
        this.phaserGame.scene.start('BattleScene', {
          gameManager: this.gameManager,
          networkHandler: this.battleConnection,
          encounterData: data
        });
      }
      
      // Mettre en pause la scène principale (optionnel)
      if (this.gameManager?.pauseGame) {
        this.gameManager.pauseGame('battle');
      }
      
      console.log('✅ [BattleIntegration] BattleScene démarrée');
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur démarrage BattleScene:', error);
    }
  }

  endBattle(data = {}) {
    console.log('🏁 [BattleIntegration] Fin du combat:', data);
    
    this.isInBattle = false;
    
    // Fermer la BattleScene
    if (this.battleScene) {
      this.battleScene.endBattle();
      
      // Remettre la scène en sommeil
      if (this.phaserGame?.scene.isActive('BattleScene')) {
        this.phaserGame.scene.sleep('BattleScene');
      }
    }
    
    // Reprendre le jeu principal
    if (this.gameManager?.resumeGame) {
      this.gameManager.resumeGame('battle');
    }
    
    // Nettoyer la connexion battle
    if (this.battleConnection) {
      this.battleConnection.disconnectFromBattleRoom();
    }
    
    // Notifier le GameManager
    if (this.gameManager?.onBattleEnd) {
      this.gameManager.onBattleEnd(data);
    }
    
    console.log('✅ [BattleIntegration] Combat terminé et nettoyé');
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Démarre un combat sauvage manuellement
   */
  startWildBattle(wildPokemonData) {
    if (!this.isInitialized) {
      console.error('❌ [BattleIntegration] Système non initialisé');
      return false;
    }
    
    if (this.isInBattle) {
      console.warn('⚠️ [BattleIntegration] Déjà en combat');
      return false;
    }
    
    console.log('🐾 [BattleIntegration] Démarrage combat sauvage manuel...');
    
    // Envoyer la demande via la WorldRoom
    if (this.battleConnection?.worldRoom) {
      this.battleConnection.sendToWorld('startWildBattle', {
        wildPokemon: wildPokemonData.pokemon || wildPokemonData,
        location: wildPokemonData.location || 'unknown',
        method: wildPokemonData.method || 'manual'
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Quitte le combat actuel
   */
  exitBattle(reason = 'manual') {
    if (!this.isInBattle) {
      console.warn('⚠️ [BattleIntegration] Pas en combat');
      return false;
    }
    
    console.log(`🚪 [BattleIntegration] Sortie de combat: ${reason}`);
    
    if (this.battleConnection) {
      this.battleConnection.leaveBattle(reason);
    } else {
      // Forcer la fin si pas de connexion
      this.endBattle({ reason });
    }
    
    return true;
  }

  /**
   * Vérifie si on est en combat
   */
  isCurrentlyInBattle() {
    return this.isInBattle && this.battleConnection?.isConnected;
  }

  /**
   * Obtient l'état du combat actuel
   */
  getCurrentBattleState() {
    if (!this.isInBattle || !this.battleConnection) {
      return null;
    }
    
    return {
      inBattle: this.isInBattle,
      connected: this.battleConnection.isConnected,
      battleRoomId: this.battleConnection.currentBattleRoomId,
      battleState: this.battleConnection.battleState
    };
  }

  /**
   * Envoie une action de combat
   */
  sendBattleAction(actionType, data = {}) {
    if (!this.isInBattle || !this.battleConnection) {
      console.error('❌ [BattleIntegration] Pas en combat ou pas connecté');
      return false;
    }
    
    return this.battleConnection.performBattleAction(actionType, data);
  }

  // === MÉTHODES D'INTÉGRATION AVEC LE GAMEMANAGER ===

  /**
   * Connecte le système aux événements du GameManager
   */
  connectToGameManager(gameManager) {
    this.gameManager = gameManager;
    
    // Si le GameManager a des méthodes spécifiques pour le combat
    if (gameManager.registerBattleSystem) {
      gameManager.registerBattleSystem(this);
    }
    
    // Ajouter notre système comme handler des rencontres
    if (gameManager.setEncounterHandler) {
      gameManager.setEncounterHandler((data) => {
        return this.handleWildEncounterFromGame(data);
      });
    }
    
    console.log('🔗 [BattleIntegration] Connecté au GameManager');
  }

  /**
   * Vérifie la compatibilité avec le système existant
   */
  checkCompatibility() {
    const checks = {
      phaserGame: !!this.phaserGame,
      worldRoom: !!this.worldRoom,
      battleConnection: !!this.battleConnection,
      battleScene: !!this.battleScene,
      gameManager: !!this.gameManager
    };
    
    console.log('🔍 [BattleIntegration] Vérification compatibilité:', checks);
    
    return Object.values(checks).every(check => check);
  }

  // === DEBUG ===

  /**
   * Méthodes de debug pour tester le système
   */
  debug() {
    return {
      isInitialized: this.isInitialized,
      isInBattle: this.isInBattle,
      compatibility: this.checkCompatibility(),
      connectionStatus: this.battleConnection?.getConnectionStatus(),
      battleState: this.getCurrentBattleState()
    };
  }

  /**
   * Test manuel d'un combat
   */
  testBattle() {
    console.log('🧪 [BattleIntegration] Test de combat...');
    
    const testPokemon = {
      pokemonId: 25, // Pikachu
      level: 5,
      name: 'Pikachu',
      shiny: false,
      gender: 'male'
    };
    
    return this.startWildBattle({
      pokemon: testPokemon,
      location: 'test_area',
      method: 'test'
    });
  }

  // === NETTOYAGE ===

  /**
   * Nettoie et détruit le système de combat
   */
  async destroy() {
    console.log('💀 [BattleIntegration] Destruction du système...');
    
    // Terminer tout combat en cours
    if (this.isInBattle) {
      await this.exitBattle('destroy');
    }
    
    // Nettoyer la BattleConnection
    if (this.battleConnection) {
      await this.battleConnection.destroy();
      this.battleConnection = null;
    }
    
    // Nettoyer la BattleScene
    if (this.battleScene && this.phaserGame) {
      this.phaserGame.scene.remove('BattleScene');
      this.battleScene = null;
    }
    
    // Nettoyer les références
    this.gameManager = null;
    this.worldRoom = null;
    this.phaserGame = null;
    
    this.isInitialized = false;
    this.isInBattle = false;
    
    console.log('✅ [BattleIntegration] Système détruit');
  }
}
