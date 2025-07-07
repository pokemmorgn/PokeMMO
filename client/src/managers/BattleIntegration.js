// client/src/managers/BattleIntegration.js - VERSION MODERNE COMPATIBLE
// 🔄 RÉCRÉE pour être compatible avec votre système d'encounter existant

import { BattleScene } from '../scenes/BattleScene.js';
import { BattleNetworkHandler } from '../network/BattleNetworkHandler.js';

/**
 * INTÉGRATEUR DE COMBAT MODERNE
 * ✅ Compatible avec votre système d'encounter existant
 * ✅ Ne casse rien, s'intègre proprement
 * ✅ Synchronisé avec le serveur modernisé
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
    
    // Références système existant
    this.worldRoom = null;
    this.phaserGame = null;
    
    // Combat en cours
    this.currentBattleData = null;
    this.selectedPokemon = null;
    
    console.log('⚔️ [BattleIntegration] Constructeur moderne compatible');
  }

  // === INITIALISATION COMPATIBLE ===

  async initialize(worldRoom, phaserGame) {
    console.log('🔧 [BattleIntegration] Initialisation compatible...');
    
    if (!worldRoom || !phaserGame) {
      console.error('❌ WorldRoom ou PhaserGame manquant');
      return false;
    }
    
    this.worldRoom = worldRoom;
    this.phaserGame = phaserGame;
    
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

  // === INITIALISATION DES COMPOSANTS ===

  async initializeBattleNetworkHandler() {
    console.log('🌐 [BattleIntegration] Initialisation BattleNetworkHandler...');
    
    // Créer le handler moderne
    this.battleNetworkHandler = new BattleNetworkHandler(this.gameManager);
    
    // L'initialiser avec votre WorldRoom existante
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
        this.battleScene = new BattleScene();
        
        if (!this.phaserGame.scene.keys['BattleScene']) {
          this.phaserGame.scene.add('BattleScene', this.battleScene, false);
          console.log('✅ BattleScene ajoutée au SceneManager');
        }
      }

      // ✅ IMPORTANT: Démarrer la scène MAIS la laisser endormie
      if (!this.phaserGame.scene.isActive('BattleScene')) {
        console.log('💤 Démarrage BattleScene en mode endormi...');
        this.phaserGame.scene.start('BattleScene', {
          battleNetworkHandler: this.battleNetworkHandler,
          gameManager: this.gameManager
        });
        
        // Endormir immédiatement
        setTimeout(() => {
          if (this.phaserGame.scene.isActive('BattleScene')) {
            this.phaserGame.scene.setVisible(false, 'BattleScene');
            this.phaserGame.scene.sleep('BattleScene');
            console.log('💤 BattleScene endormie');
          }
        }, 100);
      }
      
      console.log('✅ BattleScene préparée');
      
    } catch (error) {
      console.warn('⚠️ Erreur préparation BattleScene:', error);
    }
  }

  // === ÉVÉNEMENTS D'INTÉGRATION ===

  setupIntegrationEvents() {
    if (!this.battleNetworkHandler) return;
    
    console.log('🔗 [BattleIntegration] Configuration événements...');
    
    // === ÉVÉNEMENTS DE RENCONTRE (COMPATIBLES SYSTÈME EXISTANT) ===
    
    this.battleNetworkHandler.on('wildEncounterStart', (data) => {
      this.handleWildEncounterStart(data);
    });
    
    this.battleNetworkHandler.on('battleRoomCreated', (data) => {
      this.handleBattleRoomCreated(data);
    });
    
    this.battleNetworkHandler.on('battleRoomConnected', (data) => {
      this.handleBattleRoomConnected(data);
    });
    
    // === ÉVÉNEMENTS DE COMBAT ===
    
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
    
    // === ÉVÉNEMENTS D'ERREUR ===
    
    this.battleNetworkHandler.on('battleError', (data) => {
      this.handleBattleError(data);
    });
    
    this.battleNetworkHandler.on('battleConnectionError', (data) => {
      this.handleConnectionError(data);
    });
    
    console.log('✅ Événements d\'intégration configurés');
  }

  // === HANDLERS D'ÉVÉNEMENTS ===

  /**
   * ✅ COMPATIBLE: Début de rencontre sauvage
   */
  handleWildEncounterStart(data) {
    console.log('🐾 [BattleIntegration] === DÉBUT RENCONTRE COMPATIBLE ===');
    console.log('📊 Data encounter:', data);
    
    if (this.isInBattle || this.isTransitioning) {
      console.warn('⚠️ Combat déjà en cours, ignoré');
      return;
    }
    
    // Marquer comme en transition
    this.isTransitioning = true;
    this.currentBattleData = data;
    
    // ✅ COMPATIBLE: Notifier le GameManager existant
    if (this.gameManager?.onEncounterStart) {
      this.gameManager.onEncounterStart(data);
    }
    
    // ✅ COMPATIBLE: Afficher message d'encounter si système UI existe
    this.showEncounterMessage(data);
    
    console.log('⏳ Attente création BattleRoom...');
  }

  /**
   * ✅ MODERN: BattleRoom créée par le serveur
   */
  async handleBattleRoomCreated(data) {
    console.log('🏠 [BattleIntegration] === BATTLEROOM CRÉÉE ===');
    console.log('📊 Data BattleRoom:', {
      battleRoomId: data.battleRoomId,
      battleType: data.battleType,
      hasPlayerPokemon: !!data.playerPokemon,
      hasOpponentPokemon: !!data.opponentPokemon
    });
    
    // Sauvegarder les données de combat
    this.currentBattleData = {
      ...this.currentBattleData,
      ...data
    };
    
    // ✅ Le BattleNetworkHandler s'est déjà connecté automatiquement
    console.log('✅ BattleRoom créée et connexion en cours...');
  }

  /**
   * ✅ MODERN: Connecté à la BattleRoom
   */
  handleBattleRoomConnected(data) {
    console.log('🔗 [BattleIntegration] === CONNECTÉ À BATTLEROOM ===');
    
    // Marquer comme en combat
    this.isInBattle = true;
    this.isTransitioning = false;
    
    // ✅ MODERN: Préparer l'interface de combat
    this.prepareBattleInterface();
  }

  /**
   * ✅ MODERN: Combat rejoint
   */
  handleBattleJoined(data) {
    console.log('⚔️ [BattleIntegration] Combat rejoint:', data);
    
    // ✅ COMPATIBLE: Notifier le système existant
    if (this.gameManager?.onBattleJoined) {
      this.gameManager.onBattleJoined(data);
    }
  }

  /**
   * ✅ MODERN: Combat démarré avec données complètes
   */
  handleBattleStart(data) {
    console.log('🚀 [BattleIntegration] === COMBAT DÉMARRÉ ===');
    console.log('📊 Data combat:', data);
    
    // ✅ MODERN: Activer l'interface de combat
    this.activateBattleInterface(data);
  }

  /**
   * ✅ MODERN: Notre tour de jouer
   */
  handleYourTurn(data) {
    console.log('🎯 [BattleIntegration] === VOTRE TOUR ===');
    console.log('⏰ Temps restant:', data.timeRemaining);
    
    // ✅ Notifier la BattleScene
    if (this.battleScene && this.phaserGame.scene.isActive('BattleScene')) {
      this.battleScene.events.emit('yourTurn', data);
    }
  }

  /**
   * ✅ MODERN: Message de combat
   */
  handleBattleMessage(data) {
    console.log('💬 [BattleIntegration] Message:', data.message);
    
    // ✅ Transmettre à la BattleScene
    if (this.battleScene && this.phaserGame.scene.isActive('BattleScene')) {
      this.battleScene.events.emit('battleMessage', data);
    }
  }

  /**
   * ✅ MODERN: Mise à jour HP synchronisée
   */
  handleHPUpdate(data) {
    console.log('💖 [BattleIntegration] HP Update:', {
      pokemonId: data.pokemonId,
      hp: `${data.newHp}/${data.maxHp}`,
      damage: data.damage,
      isKO: data.isKnockedOut
    });
    
    // ✅ Transmettre à la BattleScene
    if (this.battleScene && this.phaserGame.scene.isActive('BattleScene')) {
      this.battleScene.events.emit('pokemonHPUpdate', data);
    }
  }

  /**
   * ✅ MODERN: Fin de combat avec récompenses
   */
  handleBattleEnd(data) {
    console.log('🏁 [BattleIntegration] === FIN DE COMBAT ===');
    console.log('🏆 Résultat:', data.result);
    console.log('🎁 Récompenses:', data.rewards);
    
    // ✅ COMPATIBLE: Afficher les résultats
    this.showBattleResults(data);
    
    // ✅ Programmer la fermeture
    setTimeout(() => {
      this.endBattle(data);
    }, 5000);
  }

  /**
   * ✅ Gestion des erreurs
   */
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

  // === INTERFACE DE COMBAT ===

  /**
   * ✅ COMPATIBLE: Prépare l'interface sans l'activer
   */
  prepareBattleInterface() {
    console.log('🖥️ [BattleIntegration] Préparation interface...');
    
    // ✅ COMPATIBLE: Masquer l'UI existante si nécessaire
    this.hideWorldUI();
    
    // ✅ La BattleScene est déjà préparée, on attend battleStart
    console.log('⏳ Interface prête, attente battleStart...');
  }

  /**
   * ✅ MODERN: Active l'interface de combat
   */
  activateBattleInterface(battleData) {
    console.log('🎮 [BattleIntegration] === ACTIVATION INTERFACE ===');
    
    try {
      // ✅ MODERN: Réveiller la BattleScene
      if (this.battleScene && this.phaserGame?.scene) {
        if (this.phaserGame.scene.isSleeping('BattleScene')) {
          this.phaserGame.scene.wake('BattleScene');
        }
        
        this.phaserGame.scene.setVisible(true, 'BattleScene');
        
        // ✅ MODERN: Démarrer le combat dans la scène
        if (this.battleScene.startBattle) {
          this.battleScene.startBattle(battleData);
        }
        
        console.log('✅ BattleScene activée');
      } else {
        console.warn('⚠️ BattleScene non disponible, fallback...');
        this.createFallbackInterface(battleData);
      }
      
      // ✅ COMPATIBLE: Notifier le GameManager
      if (this.gameManager?.pauseGame) {
        this.gameManager.pauseGame('battle');
      }
      
    } catch (error) {
      console.error('❌ Erreur activation interface:', error);
      this.createFallbackInterface(battleData);
    }
  }

  /**
   * ✅ COMPATIBLE: Interface de secours
   */
  createFallbackInterface(battleData) {
    console.log('🆘 [BattleIntegration] Interface de secours...');
    
    // Créer une interface DOM simple et fonctionnelle
    const overlay = document.createElement('div');
    overlay.id = 'battle-fallback-interface';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
      z-index: 10000; display: flex; flex-direction: column;
      justify-content: center; align-items: center; color: white;
      font-family: Arial, sans-serif; text-align: center;
    `;
    
    const playerPokemon = battleData.playerPokemon || this.currentBattleData?.playerPokemon;
    const opponentPokemon = battleData.opponentPokemon || this.currentBattleData?.opponentPokemon;
    
    overlay.innerHTML = `
      <div style="background: rgba(0,0,0,0.8); padding: 30px; border-radius: 15px; max-width: 600px;">
        <h1 style="color: #FFD700; margin-bottom: 20px;">⚔️ COMBAT POKÉMON ⚔️</h1>
        
        <div style="display: flex; justify-content: space-between; margin: 20px 0;">
          <div style="text-align: left;">
            <h3 style="color: #90EE90;">🔹 ${playerPokemon?.name || 'Votre Pokémon'}</h3>
            <p>Niveau ${playerPokemon?.level || '?'}</p>
            <p>PV: ${playerPokemon?.currentHp || '?'}/${playerPokemon?.maxHp || '?'}</p>
          </div>
          
          <div style="font-size: 3em;">⚡</div>
          
          <div style="text-align: right;">
            <h3 style="color: #FFB6C1;">🔸 ${opponentPokemon?.name || 'Adversaire'}</h3>
            <p>Niveau ${opponentPokemon?.level || '?'}</p>
            <p>PV: ${opponentPokemon?.currentHp || '?'}/${opponentPokemon?.maxHp || '?'}</p>
          </div>
        </div>
        
        <div style="margin: 20px 0;">
          <p id="battleStatus">🔄 Combat en cours...</p>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
          <button id="attackBtn" onclick="window.battleSystem.useAttack()">⚔️ Attaquer</button>
          <button id="runBtn" onclick="window.battleSystem.attemptRun()">🏃 Fuir</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Exposer les actions
    window.battleSystem = {
      useAttack: () => {
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.useMove('tackle');
          document.getElementById('battleStatus').textContent = '⚔️ Attaque lancée !';
        }
      },
      attemptRun: () => {
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.attemptRun();
          document.getElementById('battleStatus').textContent = '🏃 Tentative de fuite...';
        }
      }
    };
    
    console.log('✅ Interface de secours créée');
  }

  // === GESTION DE L'UI ===

  /**
   * ✅ COMPATIBLE: Cache l'UI du monde
   */
  hideWorldUI() {
    // ✅ COMPATIBLE: Ne pas casser l'UI existante
    if (window.pokemonUISystem?.setGameState) {
      try {
        this.previousUIState = window.pokemonUISystem.getCurrentGameState?.() || 'exploration';
        window.pokemonUISystem.setGameState('battle', { animated: true });
        console.log('✅ UI système cachée via pokemonUISystem');
        return;
      } catch (error) {
        console.warn('⚠️ Erreur UISystem:', error);
      }
    }
    
    // ✅ FALLBACK: Cache manuellement
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
    
    console.log('✅ UI manuelle cachée');
  }

  /**
   * ✅ COMPATIBLE: Restaure l'UI du monde
   */
  restoreWorldUI() {
    // ✅ COMPATIBLE: Restaurer via le système
    if (window.pokemonUISystem?.setGameState && this.previousUIState) {
      try {
        window.pokemonUISystem.setGameState(this.previousUIState, { animated: true });
        this.previousUIState = null;
        console.log('✅ UI système restaurée');
        return;
      } catch (error) {
        console.warn('⚠️ Erreur restauration UISystem:', error);
      }
    }
    
    // ✅ FALLBACK: Restaurer manuellement
    const hiddenElements = document.querySelectorAll('[data-battle-hidden="true"]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-battle-hidden');
    });
    
    console.log('✅ UI manuelle restaurée');
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

  /**
   * ✅ COMPATIBLE: Fin de combat propre
   */
  endBattle(data = {}) {
    console.log('🏁 [BattleIntegration] === FIN DE COMBAT COMPATIBLE ===');
    
    this.isInBattle = false;
    this.isTransitioning = false;
    
    // ✅ COMPATIBLE: Fermer toutes les interfaces
    this.closeBattleInterface();
    
    // ✅ COMPATIBLE: Restaurer l'UI
    this.restoreWorldUI();
    
    // ✅ COMPATIBLE: Reprendre le jeu
    if (this.gameManager?.resumeGame) {
      this.gameManager.resumeGame('battle');
    }
    
    // ✅ MODERN: Nettoyer la connexion
    if (this.battleNetworkHandler) {
      // La BattleRoom se déconnecte automatiquement
    }
    
    // ✅ Nettoyer les données
    this.currentBattleData = null;
    this.selectedPokemon = null;
    
    // ✅ COMPATIBLE: Notifier le système existant
    if (this.gameManager?.onBattleEnd) {
      this.gameManager.onBattleEnd(data);
    }
    
    console.log('✅ Combat terminé et système nettoyé');
  }

  /**
   * ✅ COMPATIBLE: Annulation de combat
   */
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

  /**
   * ✅ Ferme toutes les interfaces
   */
  closeBattleInterface() {
    // Fermer BattleScene
    if (this.battleScene && this.phaserGame?.scene) {
      try {
        if (this.phaserGame.scene.isActive('BattleScene')) {
          this.phaserGame.scene.setVisible(false, 'BattleScene');
          this.phaserGame.scene.sleep('BattleScene');
        }
      } catch (error) {
        console.warn('⚠️ Erreur fermeture BattleScene:', error);
      }
    }
    
    // Fermer interface fallback
    const fallbackInterface = document.getElementById('battle-fallback-interface');
    if (fallbackInterface) {
      fallbackInterface.remove();
    }
    
    // Nettoyer les exports globaux
    if (window.battleSystem) {
      delete window.battleSystem;
    }
  }

  // === API PUBLIQUE ===

  /**
   * ✅ COMPATIBLE: Démarrage manuel d'un combat
   */
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

  /**
   * ✅ COMPATIBLE: Quitter le combat
   */
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

  /**
   * ✅ État du système
   */
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

  /**
   * ✅ Debug complet
   */
  debug() {
    console.log('🔍 === DEBUG BATTLE INTEGRATION ===');
    const state = this.getCurrentBattleState();
    console.log('📊 État:', state);
    
    if (this.battleNetworkHandler) {
      console.log('🌐 Network:', this.battleNetworkHandler.debug());
    }
    
    return state;
  }

  /**
   * ✅ Test du système complet
   */
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

  /**
   * ✅ COMPATIBLE: Destruction propre
   */
  async destroy() {
    console.log('💀 [BattleIntegration] Destruction...');
    
    // Terminer tout combat en cours
    if (this.isInBattle || this.isTransitioning) {
      await this.exitBattle('destroy');
    }
    
    // Détruire les composants
    if (this.battleNetworkHandler) {
      await this.battleNetworkHandler.destroy();
      this.battleNetworkHandler = null;
    }
    
    // Fermer les interfaces
    this.closeBattleInterface();
    
    // Restaurer l'UI
    this.restoreWorldUI();
    
    // Nettoyer les références
    this.gameManager = null;
    this.worldRoom = null;
    this.phaserGame = null;
    this.battleScene = null;
    
    // Réinitialiser l'état
    this.isInitialized = false;
    this.isInBattle = false;
    this.isTransitioning = false;
    
    console.log('✅ BattleIntegration détruit proprement');
  }
}

// === FONCTIONS GLOBALES DE TEST ===

/**
 * Test d'intégration complète
 */
window.testBattleIntegration = function() {
  console.log('🧪 === TEST BATTLE INTEGRATION COMPLÈTE ===');
  
  // Créer une instance de test
  const integration = new BattleIntegration(window.gameManager || {});
  
  // Test d'initialisation
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
      isActive: () => false,
      start: () => console.log('Mock scene.start'),
      setVisible: () => console.log('Mock scene.setVisible'),
      sleep: () => console.log('Mock scene.sleep')
    }
  };
  
  integration.initialize(mockWorldRoom, mockPhaserGame).then(success => {
    console.log(`Initialisation: ${success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
    
    if (success) {
      console.log('État:', integration.getCurrentBattleState());
      
      // Test combat
      setTimeout(() => {
        const testResult = integration.test();
        console.log(`Test combat: ${testResult ? '✅ DÉMARRÉ' : '❌ ÉCHEC'}`);
      }, 1000);
    }
  });
  
  return integration;
};

console.log('✅ [BattleIntegration] MODULE MODERNE COMPATIBLE CHARGÉ !');
console.log('🔧 COMPATIBLE avec votre système d\'encounter existant');
console.log('🌐 SYNCHRONISÉ avec le serveur modernisé');
console.log('🧪 Test: window.testBattleIntegration()');
console.log('🚀 Prêt pour intégration dans votre GameManager !');
