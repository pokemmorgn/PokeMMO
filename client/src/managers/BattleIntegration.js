// client/src/managers/BattleIntegration.js - CORRECTION SIMPLE
// 🎯 FOCUS: Corriger uniquement l'erreur d'API Phaser, garder votre BattleScene

import { BattleScene } from '../scenes/BattleScene.js';
import { BattleNetworkHandler } from '../network/BattleNetworkHandler.js';

/**
 * INTÉGRATEUR DE COMBAT - CORRECTION MINIMALE
 * ✅ Corrige UNIQUEMENT: this.phaserGame.scene.setVisible is not a function
 * ✅ Ajoute battleUITransition manquant
 * ✅ Garde votre BattleScene existante
 * ❌ SUPPRIME l'interface de secours (inutile)
 */
export class BattleIntegration {
  constructor(gameManager) {
    this.gameManager = gameManager;
    
    // Composants du système de combat
    this.battleScene = null;
    this.battleNetworkHandler = null;
    
    // État
    this.isInitialized = false;
    this.isInBattle = false;
    this.isTransitioning = false;
    
    // ✅ AJOUT: Système battleUITransition qui utilise pokemonUISystem
    this.battleUITransition = {
      isActive: false,
      start: (fromState, toState, options = {}) => {
        this.battleUITransition.isActive = true;
        console.log(`🎬 Transition UI: ${fromState} → ${toState}`);
        
        // Utiliser le vrai système de transition
        if (window.pokemonUISystem?.setGameState) {
          return window.pokemonUISystem.setGameState(toState, { 
            animated: true, 
            fromState: fromState,
            ...options 
          });
        }
        
        return false;
      },
      complete: () => { 
        this.battleUITransition.isActive = false; 
        console.log('✅ Transition UI terminée');
      }
    };
    
    // Références système existant
    this.worldRoom = null;
    this.phaserGame = null;
    
    // Combat en cours
    this.currentBattleData = null;
    this.selectedPokemon = null;
    
    console.log('⚔️ [BattleIntegration] Constructeur moderne compatible');
  }

  // === INITIALISATION ===

  async initialize(worldRoom, phaserGame) {
    console.log('🔧 [BattleIntegration] Initialisation compatible...');
    
    if (!worldRoom || !phaserGame) {
      console.error('❌ WorldRoom ou PhaserGame manquant');
      return false;
    }
    
    this.worldRoom = worldRoom;
    this.phaserGame = phaserGame;
    
    // ✅ AJOUT: Exposer battleUITransition globalement
    if (typeof window !== 'undefined') {
      window.battleUITransition = this.battleUITransition;
    }
    
    try {
      // 1. Créer le BattleNetworkHandler moderne
      await this.initializeBattleNetworkHandler();
      
      // 2. Préparer la BattleScene (sans la démarrer)
      await this.prepareBattleScene();
      
      // 3. Setup des événements d'intégration
      this.setupIntegrationEvents();
      
      this.isInitialized = true;
      console.log('✅ [BattleIntegration] Système moderne initialisé');
      return true;
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur initialisation:', error);
      return false;
    }
  }

  async initializeBattleNetworkHandler() {
    console.log('🌐 [BattleIntegration] Initialisation BattleNetworkHandler...');
    
    this.battleNetworkHandler = new BattleNetworkHandler(this.gameManager);
    const success = this.battleNetworkHandler.initialize(this.worldRoom, window.client);
    
    if (!success) {
      throw new Error('Échec initialisation BattleNetworkHandler');
    }
    
    console.log('✅ [BattleIntegration] BattleNetworkHandler initialisé');
  }

  async prepareBattleScene() {
    console.log('🎬 [BattleIntegration] Préparation BattleScene...');
    
    try {
      // Vérifier si la BattleScene existe déjà
      let battleSceneExists = false;
      if (this.phaserGame?.scene?.getScene) {
        const existingScene = this.phaserGame.scene.getScene('BattleScene');
        if (existingScene) {
          this.battleScene = existingScene;
          battleSceneExists = true;
          console.log('✅ BattleScene existante trouvée');
        }
      }
      
      // Créer la BattleScene si elle n'existe pas
      if (!battleSceneExists) {
        if (typeof BattleScene !== 'undefined') {
          this.battleScene = new BattleScene();
          
          if (this.phaserGame?.scene?.add && !this.phaserGame.scene.keys?.['BattleScene']) {
            this.phaserGame.scene.add('BattleScene', this.battleScene, false);
            console.log('✅ BattleScene ajoutée au SceneManager');
          }
        } else {
          console.warn('⚠️ BattleScene class non disponible, mode fallback');
          this.battleScene = null;
        }
      }

      // Démarrer la scène MAIS la laisser endormie
      if (this.battleScene && this.phaserGame?.scene?.start && !this.phaserGame.scene.isActive?.('BattleScene')) {
        console.log('💤 Démarrage BattleScene en mode endormi...');
        this.phaserGame.scene.start('BattleScene', {
          battleNetworkHandler: this.battleNetworkHandler,
          gameManager: this.gameManager
        });
        
        // Endormir immédiatement
        setTimeout(() => {
          this.sleepBattleScene();
        }, 100);
      }
      
      console.log('✅ BattleScene préparée');
      
    } catch (error) {
      console.warn('⚠️ Erreur préparation BattleScene:', error);
    }
  }

  // ✅ CORRECTION: Méthode pour endormir la scène SANS setVisible
  sleepBattleScene() {
    try {
      if (this.phaserGame.scene.isActive?.('BattleScene')) {
        this.phaserGame.scene.sleep?.('BattleScene');
        console.log('💤 BattleScene endormie');
      }
    } catch (error) {
      console.warn('⚠️ Erreur endormissement BattleScene:', error);
    }
  }

  // === ÉVÉNEMENTS D'INTÉGRATION ===

  setupIntegrationEvents() {
    if (!this.battleNetworkHandler) return;
    
    console.log('🔗 [BattleIntegration] Configuration événements...');
    
    this.battleNetworkHandler.on('wildEncounterStart', (data) => {
      this.handleWildEncounterStart(data);
    });
    
    this.battleNetworkHandler.on('battleRoomCreated', (data) => {
      this.handleBattleRoomCreated(data);
    });
    
    this.battleNetworkHandler.on('battleRoomConnected', (data) => {
      this.handleBattleRoomConnected(data);
    });
    
    this.battleNetworkHandler.on('battleJoined', (data) => {
      this.handleBattleJoined(data);
    });
    
    this.battleNetworkHandler.on('battleStart', (data) => {
      this.handleBattleStart(data);
    });
    
    this.battleNetworkHandler.on('yourTurn', (data) => {
      this.handleYourTurn(data);
    });
    
    this.battleNetworkHandler.on('battleMessage', (data) => {
      this.handleBattleMessage(data);
    });
    
    this.battleNetworkHandler.on('pokemonHPUpdate', (data) => {
      this.handleHPUpdate(data);
    });
    
    this.battleNetworkHandler.on('battleEndWithRewards', (data) => {
      this.handleBattleEnd(data);
    });
    
    this.battleNetworkHandler.on('battleError', (data) => {
      this.handleBattleError(data);
    });
    
    this.battleNetworkHandler.on('battleConnectionError', (data) => {
      this.handleConnectionError(data);
    });
    
    console.log('✅ Événements d\'intégration configurés');
  }

  // === HANDLERS D'ÉVÉNEMENTS ===

  handleWildEncounterStart(data) {
    console.log('🐾 [BattleIntegration] === DÉBUT RENCONTRE COMPATIBLE ===');
    console.log('📊 Data encounter:', data);
    
    if (this.isInBattle || this.isTransitioning) {
      console.warn('⚠️ Combat déjà en cours, ignoré');
      return;
    }
    
    this.isTransitioning = true;
    this.currentBattleData = data;
    
    // ✅ CORRECTION: Démarrer la vraie transition UI
    console.log('🎬 Démarrage transition vers battle...');
    this.battleUITransition.start('exploration', 'battle', { animated: true });
    
    if (this.gameManager?.onEncounterStart) {
      this.gameManager.onEncounterStart(data);
    }
    
    this.showEncounterMessage(data);
    console.log('⏳ Attente création BattleRoom...');
  }

  async handleBattleRoomCreated(data) {
    console.log('🏠 [BattleIntegration] === BATTLEROOM CRÉÉE ===');
    console.log('📊 Data BattleRoom:', {
      battleRoomId: data.battleRoomId,
      battleType: data.battleType,
      hasPlayerPokemon: !!data.playerPokemon,
      hasOpponentPokemon: !!data.opponentPokemon
    });
    
    this.currentBattleData = {
      ...this.currentBattleData,
      ...data
    };
    
    console.log('✅ BattleRoom créée et connexion en cours...');
  }

  handleBattleRoomConnected(data) {
    console.log('🔗 [BattleIntegration] === CONNECTÉ À BATTLEROOM ===');
    
    this.isInBattle = true;
    this.isTransitioning = false;
    
    this.prepareBattleInterface();
  }

  handleBattleJoined(data) {
    console.log('⚔️ [BattleIntegration] Combat rejoint:', data);
    
    if (this.gameManager?.onBattleJoined) {
      this.gameManager.onBattleJoined(data);
    }
  }

  // ✅ CORRECTION PRINCIPALE: Gestion corrigée du démarrage de combat
  handleBattleStart(data) {
    console.log('🚀 [BattleIntegration] === COMBAT DÉMARRÉ ===');
    console.log('📊 Data combat:', data);
    
    // ✅ CORRECTION: Activer l'interface avec la bonne API
    this.activateBattleInterface(data);
  }

  handleYourTurn(data) {
    console.log('🎯 [BattleIntegration] === VOTRE TOUR ===');
    console.log('⏰ Temps restant:', data.timeRemaining);
    
    if (this.battleScene && this.phaserGame.scene.isActive('BattleScene')) {
      this.battleScene.events.emit('yourTurn', data);
    }
  }

  handleBattleMessage(data) {
    console.log('💬 [BattleIntegration] Message:', data.message);
    
    if (this.battleScene && this.phaserGame.scene.isActive('BattleScene')) {
      this.battleScene.events.emit('battleMessage', data);
    }
  }

  handleHPUpdate(data) {
    console.log('💖 [BattleIntegration] HP Update:', {
      pokemonId: data.pokemonId,
      hp: `${data.newHp}/${data.maxHp}`,
      damage: data.damage,
      isKO: data.isKnockedOut
    });
    
    if (this.battleScene && this.phaserGame.scene.isActive('BattleScene')) {
      this.battleScene.events.emit('pokemonHPUpdate', data);
    }
  }

  handleBattleEnd(data) {
    console.log('🏁 [BattleIntegration] === FIN DE COMBAT ===');
    console.log('🏆 Résultat:', data.result);
    console.log('🎁 Récompenses:', data.rewards);
    
    this.showBattleResults(data);
    
    setTimeout(() => {
      this.endBattle(data);
    }, 5000);
  }

  handleBattleError(data) {
    console.error('❌ [BattleIntegration] Erreur combat:', data);
    this.showError(`Erreur: ${data.message}`);
    
    if (data.critical) {
      setTimeout(() => {
        this.cancelBattle();
      }, 3000);
    }
  }

  handleConnectionError(data) {
    console.error('❌ [BattleIntegration] Erreur connexion:', data);
    this.showError('Impossible de rejoindre le combat');
    this.cancelBattle();
  }

  // === INTERFACE DE COMBAT (CORRIGÉE) ===

  prepareBattleInterface() {
    console.log('🖥️ [BattleIntegration] Préparation interface...');
    
    this.hideWorldUI();
    console.log('⏳ Interface prête, attente battleStart...');
  }

  // ✅ CORRECTION FINALE: Activation interface SANS setVisible
  activateBattleInterface(battleData) {
    console.log('🎮 [BattleIntegration] === ACTIVATION INTERFACE ===');
    
    try {
      // ✅ CORRECTION: Seulement réveiller et amener au premier plan
      if (this.battleScene && this.phaserGame?.scene) {
        
        // Réveiller la scène si elle dort
        if (this.phaserGame.scene.isSleeping && this.phaserGame.scene.isSleeping('BattleScene')) {
          this.phaserGame.scene.wake('BattleScene');
          console.log('😴 BattleScene réveillée');
        }
        
        // Amener au premier plan si possible
        if (this.phaserGame.scene.bringToTop) {
          this.phaserGame.scene.bringToTop('BattleScene');
          console.log('🔝 BattleScene amenée au premier plan');
        }
        
        // Démarrer le combat dans la scène
        if (this.battleScene.startBattle) {
          this.battleScene.startBattle(battleData);
          console.log('⚔️ Combat démarré dans BattleScene');
        }
        
        console.log('✅ BattleScene activée SANS setVisible');
      } else {
        console.error('❌ BattleScene non disponible');
        throw new Error('BattleScene non disponible');
      }
      
      // Notifier le GameManager
      if (this.gameManager?.pauseGame) {
        this.gameManager.pauseGame('battle');
      }
      
    } catch (error) {
      console.error('❌ Erreur activation interface:', error);
      // Juste log l'erreur, pas d'interface de secours
      console.error('💀 [BattleIntegration] Impossible d\'activer l\'interface');
    }
  }

  // === GESTION DE L'UI ===

  hideWorldUI() {
    // ✅ CORRECTION: Utiliser pokemonUISystem pour une vraie transition animée
    if (window.pokemonUISystem?.setGameState) {
      try {
        this.previousUIState = window.pokemonUISystem.getCurrentGameState?.() || 'exploration';
        
        // ✅ Transition animée vers battle
        const success = window.pokemonUISystem.setGameState('battle', { 
          animated: true,
          fromState: this.previousUIState,
          duration: 800  // Durée de transition
        });
        
        if (success) {
          console.log('✅ Transition UI animée vers battle');
          return;
        }
      } catch (error) {
        console.warn('⚠️ Erreur transition UISystem:', error);
      }
    }
    
    // Fallback: Cache manuellement
    const elementsToHide = [
      '#inventory-icon', '#team-icon', '#quest-icon', 
      '#questTracker', '#chat', '.ui-icon'
    ];
    
    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (window.getComputedStyle(el).display !== 'none') {
          el.style.display = 'none';
          el.setAttribute('data-battle-hidden', 'true');
        }
      });
    });
    
    console.log('✅ UI manuelle cachée (sans animation)');
  }

  restoreWorldUI() {
    // ✅ CORRECTION: Restaurer avec transition animée
    if (window.pokemonUISystem?.setGameState && this.previousUIState) {
      try {
        const success = window.pokemonUISystem.setGameState(this.previousUIState, { 
          animated: true,
          fromState: 'battle',
          duration: 600  // Transition de retour plus rapide
        });
        
        if (success) {
          this.previousUIState = null;
          console.log('✅ Transition UI animée vers', this.previousUIState || 'exploration');
          
          // Marquer la transition comme terminée
          setTimeout(() => {
            this.battleUITransition.complete();
          }, 600);
          
          return;
        }
      } catch (error) {
        console.warn('⚠️ Erreur restauration UISystem:', error);
      }
    }
    
    // Fallback: Restaurer manuellement
    const hiddenElements = document.querySelectorAll('[data-battle-hidden="true"]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-battle-hidden');
    });
    
    console.log('✅ UI manuelle restaurée (sans animation)');
  }

  // === MESSAGES ET NOTIFICATIONS ===

  showEncounterMessage(data) {
    const pokemonName = data.pokemon?.name || 'un Pokémon sauvage';
    const message = `Un ${pokemonName} apparaît !`;
    
    if (window.showGameNotification) {
      window.showGameNotification(message, 'encounter', { duration: 3000 });
    } else {
      console.log(`🐾 ${message}`);
    }
  }

  showBattleResults(data) {
    let message = '';
    switch (data.result) {
      case 'victory': message = '🎉 Victoire !'; break;
      case 'defeat': message = '💀 Défaite...'; break;
      case 'fled': message = '🏃 Fuite réussie !'; break;
      default: message = '⚔️ Combat terminé';
    }
    
    if (data.rewards && data.rewards.experience?.length > 0) {
      const totalExp = data.rewards.experience.reduce((sum, exp) => sum + exp.gained, 0);
      message += ` (+${totalExp} XP)`;
    }
    
    if (window.showGameNotification) {
      window.showGameNotification(message, 'battle_result', { duration: 4000 });
    } else {
      console.log(`🏆 ${message}`);
    }
  }

  showError(message) {
    console.error(`❌ [BattleIntegration] ${message}`);
    
    if (window.showGameNotification) {
      window.showGameNotification(message, 'error', { duration: 5000 });
    } else {
      alert(`Erreur: ${message}`);
    }
  }

  // === FIN DE COMBAT ===

  endBattle(data = {}) {
    console.log('🏁 [BattleIntegration] === FIN DE COMBAT COMPATIBLE ===');
    
    this.isInBattle = false;
    this.isTransitioning = false;
    
    this.closeBattleInterface();
    this.restoreWorldUI();
    
    if (this.gameManager?.resumeGame) {
      this.gameManager.resumeGame('battle');
    }
    
    this.currentBattleData = null;
    this.selectedPokemon = null;
    
    if (this.gameManager?.onBattleEnd) {
      this.gameManager.onBattleEnd(data);
    }
    
    console.log('✅ Combat terminé et système nettoyé');
  }

  async cancelBattle() {
    console.log('❌ [BattleIntegration] Annulation combat...');
    
    this.isInBattle = false;
    this.isTransitioning = false;
    
    this.closeBattleInterface();
    this.restoreWorldUI();
    
    if (this.battleNetworkHandler && this.battleNetworkHandler.canSendBattleActions()) {
      this.battleNetworkHandler.leaveBattle('cancelled');
    }
    
    this.currentBattleData = null;
    this.selectedPokemon = null;
    
    console.log('✅ Combat annulé');
  }

  closeBattleInterface() {
    // ✅ CORRECTION: Fermer BattleScene SANS setVisible
    if (this.battleScene && this.phaserGame?.scene) {
      try {
        if (this.phaserGame.scene.isActive && this.phaserGame.scene.isActive('BattleScene')) {
          this.phaserGame.scene.sleep('BattleScene');
          console.log('💤 BattleScene fermée');
        }
      } catch (error) {
        console.warn('⚠️ Erreur fermeture BattleScene:', error);
      }
    }
  }

  // === API PUBLIQUE ===

  startWildBattle(wildPokemonData) {
    if (!this.isInitialized) {
      console.error('❌ Système non initialisé');
      return false;
    }
    
    if (this.isInBattle || this.isTransitioning) {
      console.warn('⚠️ Combat déjà en cours');
      return false;
    }
    
    console.log('🐾 Démarrage combat sauvage manuel...');
    
    if (this.battleNetworkHandler) {
      return this.battleNetworkHandler.requestWildBattle({
        pokemon: wildPokemonData.pokemon || wildPokemonData,
        location: wildPokemonData.location || 'manual_test',
        method: wildPokemonData.method || 'manual'
      });
    }
    
    return false;
  }

  exitBattle(reason = 'manual') {
    if (!this.isInBattle && !this.isTransitioning) {
      console.warn('⚠️ Pas en combat');
      return false;
    }
    
    console.log(`🚪 Sortie combat: ${reason}`);
    
    if (this.isTransitioning) {
      this.cancelBattle();
    } else if (this.battleNetworkHandler) {
      this.battleNetworkHandler.leaveBattle(reason);
    } else {
      this.endBattle({ reason });
    }
    
    return true;
  }

  // === ÉTAT ET DEBUG ===

  getCurrentBattleState() {
    return {
      isInitialized: this.isInitialized,
      isInBattle: this.isInBattle,
      isTransitioning: this.isTransitioning,
      currentBattleData: this.currentBattleData,
      networkStatus: this.battleNetworkHandler?.getConnectionStatus(),
      sceneActive: this.phaserGame?.scene?.isActive('BattleScene') || false
    };
  }

  debug() {
    console.log('🔍 === DEBUG BATTLE INTEGRATION ===');
    const state = this.getCurrentBattleState();
    console.log('📊 État:', state);
    
    if (this.battleNetworkHandler) {
      console.log('🌐 Network:', this.battleNetworkHandler.debug());
    }
    
    return state;
  }

  test() {
    console.log('🧪 [BattleIntegration] Test système complet...');
    
    if (!this.isInitialized) {
      console.error('❌ Système non initialisé');
      return false;
    }
    
    const testPokemon = {
      pokemonId: 25,
      level: 8,
      name: 'Pikachu Test',
      currentHp: 28,
      maxHp: 28
    };
    
    return this.startWildBattle({
      pokemon: testPokemon,
      location: 'test_zone',
      method: 'debug_test'
    });
  }

  // === NETTOYAGE ===

  async destroy() {
    console.log('💀 [BattleIntegration] Destruction...');
    
    if (this.isInBattle || this.isTransitioning) {
      await this.exitBattle('destroy');
    }
    
    if (this.battleNetworkHandler) {
      await this.battleNetworkHandler.destroy();
      this.battleNetworkHandler = null;
    }
    
    this.closeBattleInterface();
    this.restoreWorldUI();
    
    this.gameManager = null;
    this.worldRoom = null;
    this.phaserGame = null;
    this.battleScene = null;
    
    this.isInitialized = false;
    this.isInBattle = false;
    this.isTransitioning = false;
    
    console.log('✅ BattleIntegration détruit proprement');
  }
}

// === TESTS SIMPLIFIÉS ===

window.testBattleIntegration = function() {
  console.log('🧪 === TEST BATTLE INTEGRATION SIMPLE ===');
  
  const integration = new BattleIntegration(window.gameManager || {});
  
  const mockWorldRoom = {
    id: 'test_world',
    sessionId: 'test_session',
    onMessage: (type, callback) => console.log(`Mock onMessage: ${type}`),
    send: (type, data) => console.log(`Mock send: ${type}`, data)
  };
  
  const mockPhaserGame = {
    scene: {
      add: () => console.log('Mock scene.add'),
      getScene: () => null,
      get: (key) => ({ scene: { setVisible: () => console.log(`Mock setVisible: ${key}`) } }),
      isActive: () => false,
      start: () => console.log('Mock scene.start'),
      sleep: () => console.log('Mock scene.sleep'),
      wake: () => console.log('Mock scene.wake'),
      keys: {}
    }
  };
  
  integration.initialize(mockWorldRoom, mockPhaserGame).then(success => {
    console.log(`Initialisation: ${success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
    
    if (success) {
      console.log('État:', integration.getCurrentBattleState());
      
      setTimeout(() => {
        const testResult = integration.test();
        console.log(`Test combat: ${testResult ? '✅ DÉMARRÉ' : '❌ ÉCHEC'}`);
      }, 500);
    }
  }).catch(error => {
    console.error('❌ Erreur initialisation:', error);
  });
  
  return integration;
};

console.log('✅ [BattleIntegration] MODULE CORRIGÉ CHARGÉ !');
console.log('🔧 CORRECTION: Suppression complète de setVisible');
console.log('✅ UTILISE: Seulement wake() + bringToTop() + sleep()');
console.log('✅ AJOUT: Système battleUITransition');
console.log('🧪 Test: window.testBattleIntegration()');
console.log('🚀 Prêt pour intégration dans votre GameManager !');
