// client/src/scenes/BattleScene.js - VERSION REFACTORISÉE AVEC MANAGERS

// === IMPORTS DES MANAGERS ===
import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleTranslator } from '../Battle/BattleTranslator.js';
import { BattleInventoryUI } from '../components/BattleInventoryUI.js';

// ✅ NOUVEAUX MANAGERS
import { PokemonSpriteManager } from '../managers/Battle/PokemonSpriteManager.js';
import { BattleUIManager } from '../managers/Battle/BattleUIManager.js';
import { BattleBackgroundManager } from '../managers/Battle/BattleBackgroundManager.js';
import { BattleAnimationManager } from '../managers/Battle/BattleAnimationManager.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // === MANAGERS SPÉCIALISÉS ===
    this.pokemonSpriteManager = null;
    this.battleUIManager = null;
    this.backgroundManager = null;
    this.animationManager = null;
    this.healthBarManager = null;
    
    // === MANAGERS EXISTANTS ===
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.battleInventoryUI = null;
    
    // === ÉTAT SIMPLIFIÉ ===
    this.playerRole = null;
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    this.battleTranslator = null;
    
    // === DONNÉES POKÉMON (simplifiées) ===
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    console.log('⚔️ [BattleScene] Initialisé avec architecture modulaire');
  }

  // === INITIALISATION ===

  init(data = {}) {
    console.log('[BattleScene] 🔧 Initialisation avec managers...');
    
    this.gameManager = data.gameManager || 
      this.scene.get('GameScene')?.gameManager || 
      window.pokemonUISystem?.gameManager || 
      window.gameManager;

    this.battleNetworkHandler = data.battleNetworkHandler || 
      window.battleSystem?.battleConnection?.networkHandler || 
      window.globalNetworkManager?.battleNetworkHandler;

    if (!this.battleNetworkHandler) {
      console.warn('[BattleScene] ⚠️ BattleNetworkHandler manquant');
    }

    if (!this.gameManager) {
      console.warn('[BattleScene] ⚠️ GameManager manquant');
    }
    
    // Déclencher combat automatique si battleData fournie
    if (data.battleData) {
      console.log('[BattleScene] 🎯 Déclenchement automatique...');
      this.events.once('create', () => {
        this.startBattle(data.battleData);
      });
    }
  }

  preload() {
    console.log('[BattleScene] 📁 Préchargement...');
    
    if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
  }

  create() {
    console.log('[BattleScene] 🎨 Création avec managers...');

    // Masquer par défaut
    this.scene.setVisible(false);
    this.scene.sleep();
    
    try {
      // === INITIALISATION DES MANAGERS ===
      this.initializeManagers();
      
      // === CRÉATION DE L'ENVIRONNEMENT ET UI ===
      this.createBattleEnvironment();
      
      // === CONFIGURATION DES ÉVÉNEMENTS ===
      this.setupBattleNetworkEvents();
      this.setupManagerEvents();
      
      this.isActive = true;
      this.isReadyForActivation = true;
      
      console.log('[BattleScene] ✅ Création terminée avec managers');
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur création:', error);
    }
  }

  // === INITIALISATION DES MANAGERS ===

  /**
   * Initialise tous les managers spécialisés
   */
  initializeManagers() {
    console.log('🏗️ [BattleScene] Initialisation des managers...');
    
    // 1. Background Manager (premier - environnement)
    this.backgroundManager = new BattleBackgroundManager(this);
    
    // 2. Pokemon Sprite Manager (sprites des Pokémon)
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    
    // 3. Battle UI Manager (interface utilisateur)
    this.battleUIManager = new BattleUIManager(this);
    
    // 4. Animation Manager (effets et animations)
    this.animationManager = new BattleAnimationManager(this);
    
    // 5. Health Bar Manager (existant)
    this.healthBarManager = new HealthBarManager(this);
    
    console.log('✅ [BattleScene] Managers initialisés');
  }

  /**
   * Crée l'environnement de combat via les managers
   */
  createBattleEnvironment() {
    // Environnement via BackgroundManager
    this.backgroundManager.createEnvironment('grass');
    
    // Interface via BattleUIManager
    this.battleUIManager.create();
    
    // Barres de vie modernes via HealthBarManager
    this.healthBarManager.createModernHealthBars();
    
    console.log('🌍 [BattleScene] Environnement créé via managers');
  }

  /**
   * Configure les événements entre managers
   */
  setupManagerEvents() {
    // Événements de l'interface utilisateur
    this.events.on('actionButtonClicked', (actionKey) => {
      this.handleActionButton(actionKey);
    });
    
    // Connecter les managers qui ont besoin de références croisées
    this.connectManagers();
  }

  /**
   * Connecte les managers entre eux
   */
  connectManagers() {
    // L'AnimationManager a besoin des références des sprites
    this.events.on('pokemonSpritesUpdated', () => {
      this.animationManager.setSpriteReferences(
        this.pokemonSpriteManager.getPlayerSprite(),
        this.pokemonSpriteManager.getOpponentSprite()
      );
    });
  }

  // === AFFICHAGE DES POKÉMON (DÉLÉGUÉ) ===

  /**
   * Affiche le Pokémon du joueur via PokemonSpriteManager
   */
  async displayPlayerPokemon(pokemonData) {
    if (!pokemonData) return;
    
    console.log('👤 [BattleScene] Affichage Pokémon joueur via manager');
    
    try {
      const sprite = await this.pokemonSpriteManager.displayPlayerPokemon(pokemonData);
      this.currentPlayerPokemon = pokemonData;
      
      // Animation d'entrée via AnimationManager
      this.animationManager.queueAnimation('pokemonEntry', {
        sprite: sprite,
        direction: 'left'
      });
      
      // Mise à jour barre de vie après un délai
      setTimeout(() => {
        this.healthBarManager.updateModernHealthBar('player1', pokemonData);
      }, 500);
      
      // Notifier que les sprites ont changé
      this.events.emit('pokemonSpritesUpdated');
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur affichage Pokémon joueur:', error);
    }
  }

  /**
   * Affiche le Pokémon adversaire via PokemonSpriteManager
   */
  async displayOpponentPokemon(pokemonData) {
    if (!pokemonData) return;
    
    console.log('👹 [BattleScene] Affichage Pokémon adversaire via manager');
    
    try {
      const sprite = await this.pokemonSpriteManager.displayOpponentPokemon(pokemonData);
      this.currentOpponentPokemon = pokemonData;
      
      // Animation d'entrée via AnimationManager
      this.animationManager.queueAnimation('pokemonEntry', {
        sprite: sprite,
        direction: 'right'
      });
      
      // Mise à jour barre de vie après un délai
      setTimeout(() => {
        this.healthBarManager.updateModernHealthBar('player2', pokemonData);
      }, 800);
      
      // Notifier que les sprites ont changé
      this.events.emit('pokemonSpritesUpdated');
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur affichage Pokémon adversaire:', error);
    }
  }

  // === GESTION DES ACTIONS (DÉLÉGUÉ) ===

  /**
   * Gère les clics sur les boutons d'action
   */
  handleActionButton(actionKey) {
    console.log('[BattleScene] 🎯 Action via UI Manager:', actionKey);
    
    switch (actionKey) {
      case 'attack':
        this.handleAttackAction();
        break;
      case 'bag':
        this.handleBagAction();
        break;
      case 'pokemon':
        this.handlePokemonAction();
        break;
      case 'run':
        this.handleRunAction();
        break;
    }
  }

  /**
   * Gère l'action d'attaque
   */
  handleAttackAction() {
    this.battleUIManager.hideActionButtons();
    
    // Animation d'attaque via AnimationManager
    this.animationManager.queueAnimation('attack', {
      attackerType: 'player',
      targetType: 'opponent',
      moveName: 'Charge',
      moveType: 'normal'
    });
    
    // Envoyer au serveur
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.useMove('tackle');
    }
  }

  /**
   * Gère l'action du sac
   */
  handleBagAction() {
    if (!this.battleInventoryUI) {
      this.createBattleInventoryUI();
    }
    
    if (this.battleInventoryUI) {
      this.battleInventoryUI.openToBalls();
    } else {
      this.battleUIManager.showActionMessage('Inventaire de combat non disponible');
    }
  }

  /**
   * Gère l'action Pokémon
   */
  handlePokemonAction() {
    this.battleUIManager.showActionMessage('Changement de Pokémon indisponible.');
  }

  /**
   * Gère l'action de fuite
   */
  handleRunAction() {
    this.battleUIManager.showActionMessage('Tentative de fuite...');
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.attemptRun();
    }
  }

  // === GESTION DES MESSAGES (DÉLÉGUÉ) ===

  /**
   * Affiche un message d'action via UIManager
   */
  showActionMessage(message) {
    this.battleUIManager.showActionMessage(message);
  }

  /**
   * Affiche un message de combat via UIManager
   */
  showBattleMessage(message, duration = 0) {
    this.battleUIManager.showBattleMessage(message, duration);
  }

  /**
   * Affiche les boutons d'action via UIManager
   */
  showActionButtons() {
    this.battleUIManager.showActionButtons();
  }

  /**
   * Masque les boutons d'action via UIManager
   */
  hideActionButtons() {
    this.battleUIManager.hideActionButtons();
  }

  // === ANIMATIONS (DÉLÉGUÉ) ===

  /**
   * Anime une attaque via AnimationManager
   */
  animateAttack(attackerType, targetType, moveData) {
    this.animationManager.queueAnimation('attack', {
      attackerType,
      targetType,
      moveName: moveData.name,
      moveType: moveData.type
    });
  }

  /**
   * Anime des dégâts via AnimationManager
   */
  animateDamage(targetType, damage, isCritical = false) {
    this.animationManager.queueAnimation('damage', {
      targetType,
      damage,
      isCritical
    });
  }

  /**
   * Anime un K.O. via AnimationManager
   */
  animateFaint(pokemonType) {
    this.animationManager.queueAnimation('faint', {
      pokemonType
    });
  }

  // === ÉVÉNEMENTS RÉSEAU (SIMPLIFIÉ) ===

  setupBattleNetworkEvents() {
    if (!this.battleNetworkHandler) return;
    
    console.log('📡 [BattleScene] Configuration événements réseau...');
    
    // === ÉVÉNEMENTS POKÉMON ===
    this.battleNetworkHandler.on('moveUsed', (data) => {
      console.log('⚔️ [BattleScene] moveUsed reçu:', data);
      
      const message = `${data.attackerName} utilise ${data.moveName} !`;
      this.showActionMessage(message);
      
      // Animation via manager
      this.animateAttack(data.attackerRole, data.targetRole, {
        name: data.moveName,
        type: data.moveType
      });
    });

    this.battleNetworkHandler.on('damageDealt', (data) => {
      console.log('💥 [BattleScene] damageDealt reçu:', data);
      
      // Mettre à jour les données locales
      this.updatePokemonHP(data.targetRole, data.newHp, data.maxHp);
      
      // Mettre à jour les barres de vie
      const pokemonData = this.getPokemonDataForRole(data.targetRole);
      this.healthBarManager.updateModernHealthBar(data.targetRole, pokemonData);
      
      // Animation de dégâts
      this.animateDamage(data.targetRole, data.damage, data.isCritical);
    });
    
    // === ÉVÉNEMENTS DE COMBAT ===
    this.battleNetworkHandler.on('narrativeStart', (data) => {
      this.handleNarrativeStart(data);
    });
    
    this.battleNetworkHandler.on('battleStart', (data) => {
      this.handleNetworkBattleStart(data);
    });
    
    this.battleNetworkHandler.on('yourTurn', (data) => {
      this.handleYourTurn(data);
    });
    
    this.battleNetworkHandler.on('turnChanged', (data) => {
      this.handleTurnChanged(data);
    });
    
    this.battleNetworkHandler.on('battleEnd', (data) => {
      this.handleBattleEnd(data);
    });
    
    // === ÉVÉNEMENTS K.O. ===
    this.battleNetworkHandler.on('koMessage', (data) => {
      console.log('💀 [BattleScene] K.O. Message reçu:', data);
      this.showActionMessage(data.message);
      
      if (data.playerRole === 'player1') {
        this.animateFaint('player');
      } else {
        this.animateFaint('opponent');
      }
    });
    
    this.battleNetworkHandler.on('winnerAnnounce', (data) => {
      console.log('🏆 [BattleScene] Winner Announce reçu:', data);
      
      setTimeout(() => {
        this.transitionToEndBattle(data);
      }, 1500);
    });
    
    // === AUTRES ÉVÉNEMENTS ===
    this.battleNetworkHandler.on('battleRoomDisconnected', (data) => {
      console.log('👋 [BattleScene] Déconnexion BattleRoom détectée:', data);
      setTimeout(() => {
        this.endBattle({ result: 'disconnected' });
      }, 1000);
    });
    
    this.battleNetworkHandler.on('battleJoined', (data) => {
      this.playerRole = data.yourRole;
      this.battleTranslator = new BattleTranslator(this.playerRole);
      console.log('🌍 [BattleScene] Traducteur initialisé pour:', this.playerRole);
    });
  }

  // === HANDLERS D'ÉVÉNEMENTS RÉSEAU ===

  /**
   * Gère le début narratif
   */
  handleNarrativeStart(data) {
    if (this.scene.isSleeping()) {
      this.scene.wake();
    }
    this.scene.setVisible(true);
    this.scene.bringToTop();
    
    if (data.playerPokemon) {
      this.displayPlayerPokemon(data.playerPokemon);
    }
    
    if (data.opponentPokemon) {
      this.displayOpponentPokemon(data.opponentPokemon);
      this.handleBattleEvent('wildPokemonAppears', { 
        pokemonName: data.opponentPokemon.name 
      });
    }
    
    this.activateBattleUI();
    this.isVisible = true;
  }

  /**
   * Gère le début de combat réseau
   */
  handleNetworkBattleStart(data) {
    if (data.isNarrative || data.duration) {
      return; // narrativeStart va gérer
    }
    
    if (data.playerPokemon) {
      this.displayPlayerPokemon(data.playerPokemon);
    }
    
    if (data.opponentPokemon) {
      this.displayOpponentPokemon(data.opponentPokemon);
    }
    
    this.activateBattleUI();
    this.isVisible = true;
    this.startBattleIntroSequence(data.opponentPokemon);
  }

  /**
   * Gère le tour du joueur
   */
  handleYourTurn(data) {
    this.showActionButtons();
  }

  /**
   * Gère le changement de tour
   */
  handleTurnChanged(data) {
    if (data.currentTurn === 'player1') {
      // Le serveur enverra yourTurn quand il voudra
    } else if (data.currentTurn === 'player2') {
      this.hideActionButtons();
    } else if (data.currentTurn === 'narrator') {
      this.hideActionButtons();
    }
  }

  /**
   * Gère la fin de combat
   */
  handleBattleEnd(data) {
    this.hideActionButtons();
    setTimeout(() => {
      this.endBattle({ result: 'ended' });
    }, 3000);
  }

  // === UTILITAIRES POUR LES DONNÉES POKÉMON ===

  /**
   * Met à jour les HP d'un Pokémon
   */
  updatePokemonHP(targetRole, newHp, maxHp) {
    if (targetRole === 'player1' && this.currentPlayerPokemon) {
      this.currentPlayerPokemon.currentHp = newHp;
      this.currentPlayerPokemon.maxHp = maxHp || this.currentPlayerPokemon.maxHp;
    } else if (targetRole === 'player2' && this.currentOpponentPokemon) {
      this.currentOpponentPokemon.currentHp = newHp;
      this.currentOpponentPokemon.maxHp = maxHp || this.currentOpponentPokemon.maxHp;
    }
  }

  /**
   * Obtient les données d'un Pokémon selon son rôle
   */
  getPokemonDataForRole(targetRole) {
    if (targetRole === 'player1') {
      return this.currentPlayerPokemon;
    } else if (targetRole === 'player2') {
      return this.currentOpponentPokemon;
    }
    return null;
  }

  // === GESTION DES ÉVÉNEMENTS DE COMBAT (TRADUCTION) ===

  /**
   * Gère un événement de combat avec traduction
   */
  handleBattleEvent(eventType, data = {}) {
    console.log(`🌍 [BattleScene] Événement: ${eventType}`, data);
    
    // Actions d'interface
    if (eventType === 'yourTurn') {
      this.showActionButtons();
      return;
    }
    
    if (eventType === 'opponentTurn') {
      this.hideActionButtons();
    }
    
    if (eventType === 'battleEnd') {
      this.hideActionButtons();
      setTimeout(() => {
        this.endBattle({ result: 'ended' });
      }, 3000);
    }
    
    // Traduction du message
    if (this.battleTranslator) {
      const message = this.battleTranslator.translate(eventType, data);
      if (message) {
        this.showActionMessage(message);
        console.log(`💬 Message traduit (${this.battleTranslator.language}): "${message}"`);
      }
    } else {
      console.warn('[BattleScene] ⚠️ Traducteur non initialisé pour:', eventType);
    }
  }

  // === SEQUENCE D'INTRODUCTION ===

  /**
   * Démarre la séquence d'introduction du combat
   */
  startBattleIntroSequence(opponentPokemon) {
    setTimeout(() => {
      this.handleBattleEvent('wildPokemonAppears', { 
        pokemonName: opponentPokemon?.name || 'Pokémon' 
      });
    }, 2000);
  }

  // === GESTION DE L'UI GLOBALE ===

  /**
   * Active l'UI de combat via UIManager
   */
  activateBattleUI() {
    return this.battleUIManager.activateBattleUI();
  }

  /**
   * Désactive l'UI de combat via UIManager
   */
  deactivateBattleUI() {
    return this.battleUIManager.deactivateBattleUI();
  }

  // === CONTRÔLES PUBLICS ===

  /**
   * Démarre un combat
   */
  startBattle(battleData) {
    if (!this.isActive) {
      console.error('[BattleScene] ❌ Scène non active');
      return;
    }
    
    this.handleNetworkBattleStart(battleData);
  }

  /**
   * Active la scène depuis une transition
   */
  activateFromTransition() {
    if (!this.isReadyForActivation) {
      console.warn('[BattleScene] ⚠️ Scène non prête');
      return false;
    }
    
    try {
      if (this.scene.isSleeping()) {
        this.scene.wake();
      }
      
      this.scene.setVisible(true);
      this.isVisible = true;
      return true;
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur activation:', error);
      return false;
    }
  }

  /**
   * Désactive la scène pour transition
   */
  deactivateForTransition() {
    try {
      this.scene.setVisible(false);
      this.isVisible = false;
      
      if (this.scene?.sleep) {
        this.scene.sleep();
      }
      
      console.log('✅ [BattleScene] Désactivée pour transition');
      return true;
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur désactivation:', error);
      return false;
    }
  }

  // === CRÉATION BATTLE INVENTORY UI ===

  createBattleInventoryUI() {
    const gameRoom = this.gameManager?.gameRoom || 
                     this.battleNetworkHandler?.gameRoom || 
                     window.currentGameRoom;
    
    const battleContext = {
      battleScene: this,
      networkHandler: this.battleNetworkHandler,
      battleRoomId: this.battleNetworkHandler?.battleRoomId || null
    };
    
    if (!gameRoom) {
      console.warn('⚠️ [BattleScene] GameRoom non trouvé pour BattleInventoryUI');
      return;
    }
    
    if (!this.battleNetworkHandler) {
      console.warn('⚠️ [BattleScene] BattleNetworkHandler manquant');
      return;
    }
    
    this.battleInventoryUI = new BattleInventoryUI(gameRoom, battleContext);
    console.log('⚔️ BattleInventoryUI créé avec:', {
      gameRoom: !!gameRoom,
      networkHandler: !!this.battleNetworkHandler
    });
  }

  // === TRANSITION VERS FIN DE COMBAT ===

  /**
   * Gère la transition vers la fin de combat
   */
  transitionToEndBattle(winnerData) {
    console.log('🎯 [BattleScene] Transition vers end battle');
    console.log('🏆 Données vainqueur:', winnerData);
    
    if (!this.battleNetworkHandler?.isConnectedToBattle) {
      console.warn('⚠️ [BattleScene] Transition ignorée - combat déjà terminé');
      return;
    }
    
    this.hideActionButtons();
    
    // Afficher message de fin avec récompenses
    this.showBattleEndMessage(winnerData);
    
    // Terminer automatiquement après 4s
    setTimeout(() => {
      this.endBattle({ result: 'completed', winner: winnerData.winner });
    }, 4000);
  }

  /**
   * Affiche le message de fin de combat
   */
  showBattleEndMessage(winnerData) {
    console.log('🎁 [BattleScene] Affichage message de fin avec récompenses');
    
    let fullMessage = winnerData.message;
    
    if (winnerData.winner === 'player1') {
      const rewards = this.calculateBattleRewards();
      
      fullMessage += '\n\n🎁 Récompenses :';
      
      if (rewards.experience > 0) {
        fullMessage += `\n🌟 +${rewards.experience} XP`;
      }
      
      if (rewards.money > 0) {
        fullMessage += `\n💰 +${rewards.money}₽`;
      }
      
      if (rewards.items && rewards.items.length > 0) {
        rewards.items.forEach(item => {
          fullMessage += `\n📦 ${item.name} x${item.quantity}`;
        });
      }
    }
    
    this.showActionMessage(fullMessage);
    
    // Effet visuel pour la victoire
    if (winnerData.winner === 'player1') {
      this.animationManager.queueAnimation('victory', {
        winner: winnerData.winner
      });
    }
  }

  /**
   * Calcule les récompenses de combat
   */
  calculateBattleRewards() {
    const opponentLevel = this.currentOpponentPokemon?.level || 5;
    
    return {
      experience: Math.floor(opponentLevel * 10 + Math.random() * 20),
      money: Math.floor(opponentLevel * 15 + Math.random() * 50),
      items: Math.random() > 0.7 ? [
        { name: 'Potion', quantity: 1 }
      ] : []
    };
  }

  // === FIN DE COMBAT ===

  /**
   * Termine le combat
   */
  endBattle(battleResult = {}) {
    console.log('🏁 [BattleScene] Fin du combat via managers');
    
    // Envoyer battleFinished
    try {
      if (this.battleNetworkHandler?.sendToWorld) {
        this.battleNetworkHandler.sendToWorld('battleFinished', {
          battleResult: typeof battleResult === 'string' ? battleResult : 'completed',
          timestamp: Date.now()
        });
      } else if (window.currentGameRoom) {
        window.currentGameRoom.send('battleFinished', {
          battleResult: typeof battleResult === 'string' ? battleResult : 'completed',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur envoi battleFinished:', error);
    }
    
    // Nettoyage via managers
    setTimeout(() => {
      this.completeBattleCleanup(battleResult);
    }, 500);
  }

  /**
   * Nettoyage complet via managers
   */
  completeBattleCleanup(battleResult) {
    console.log('🧹 [BattleScene] Nettoyage via managers...');
    
    // Déconnexion réseau
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.disconnectFromBattleRoom();
    }
    
    // Reset système global
    if (window.battleSystem) {
      window.battleSystem.isInBattle = false;
      window.battleSystem.isTransitioning = false;
      window.battleSystem.currentBattleRoom = null;
      window.battleSystem.currentBattleData = null;
      window.battleSystem.selectedPokemon = null;
    }
    
    // Reset GameManager
    if (this.gameManager?.battleState) {
      this.gameManager.battleState = 'none';
      this.gameManager.inBattle = false;
    }
    
    // Nettoyage via managers
    this.clearAllSprites();
    this.hideBattle();
    
    // Forcer exploration
    if (window.pokemonUISystem?.setGameState) {
      try {
        window.pokemonUISystem.setGameState('exploration', { force: true });
      } catch (error) {
        console.warn('[BattleScene] ⚠️ Erreur reset UI:', error);
      }
    }
  }

  // === NETTOYAGE VIA MANAGERS ===

  /**
   * Supprime tous les sprites via PokemonSpriteManager
   */
  clearAllSprites() {
    if (this.pokemonSpriteManager) {
      this.pokemonSpriteManager.clearAllSprites();
    }
    
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
  }

  /**
   * Cache la bataille via les managers
   */
  hideBattle() {
    // Désactiver l'UI
    this.deactivateBattleUI();
    
    // Masquer l'interface
    if (this.battleUIManager) {
      this.battleUIManager.hideInterface();
    }
    
    // Masquer les barres de vie
    if (this.healthBarManager) {
      this.healthBarManager.hideAllHealthBars();
    }
    
    this.isVisible = false;
    this.scene.setVisible(false);
    
    if (this.scene?.sleep) {
      this.scene.sleep();
    }
  }

  // === TESTS ET DEBUG ===

  /**
   * Test d'affichage moderne
   */
  testModernBattleDisplay() {
    this.activateBattleUI();
    
    const testPlayerPokemon = {
      pokemonId: 1,
      name: 'Bulbasaur',
      level: 12,
      currentHp: 35,
      maxHp: 42,
      currentExp: 156,
      expToNext: 250,
      statusCondition: 'normal',
      types: ['grass', 'poison']
    };
    
    const testOpponentPokemon = {
      pokemonId: 25,
      name: 'Pikachu',
      level: 10,
      currentHp: 28,
      maxHp: 32,
      statusCondition: 'normal',
      types: ['electric'],
      shiny: true
    };
    
    setTimeout(() => this.displayPlayerPokemon(testPlayerPokemon), 500);
    setTimeout(() => this.displayOpponentPokemon(testOpponentPokemon), 1200);
    setTimeout(() => this.showBattleMessage('Un Pikachu chromatique apparaît !'), 2000);
  }

  /**
   * Simule des dégâts sur le joueur
   */
  simulatePlayerDamage(damage) {
    if (!this.currentPlayerPokemon) return 0;
    
    this.currentPlayerPokemon.currentHp = Math.max(0, 
      this.currentPlayerPokemon.currentHp - damage);
    
    this.healthBarManager.updateModernHealthBar('player1', this.currentPlayerPokemon);
    this.animateDamage('player', damage);
    
    return this.currentPlayerPokemon.currentHp;
  }

  /**
   * Simule des dégâts sur l'adversaire
   */
  simulateOpponentDamage(damage) {
    if (!this.currentOpponentPokemon) return 0;
    
    this.currentOpponentPokemon.currentHp = Math.max(0, 
      this.currentOpponentPokemon.currentHp - damage);
    
    this.healthBarManager.updateModernHealthBar('player2', this.currentOpponentPokemon);
    this.animateDamage('opponent', damage);
    
    return this.currentOpponentPokemon.currentHp;
  }

  // === REDIMENSIONNEMENT ===

  /**
   * Redimensionne tous les managers
   */
  resize() {
    console.log('📐 [BattleScene] Redimensionnement via managers...');
    
    if (this.backgroundManager) {
      this.backgroundManager.resize();
    }
    
    if (this.battleUIManager) {
      this.battleUIManager.resize();
    }
    
    if (this.healthBarManager) {
      this.healthBarManager.resize();
    }
  }

  // === DESTRUCTION ===

  /**
   * Détruit la scène et tous ses managers
   */
  destroy() {
    console.log('💀 [BattleScene] Destruction de tous les managers...');
    
    // Désactiver l'UI
    this.deactivateBattleUI();
    
    // Détruire tous les managers
    if (this.pokemonSpriteManager) {
      this.pokemonSpriteManager.destroy();
      this.pokemonSpriteManager = null;
    }
    
    if (this.battleUIManager) {
      this.battleUIManager.destroy();
      this.battleUIManager = null;
    }
    
    if (this.backgroundManager) {
      this.backgroundManager.destroy();
      this.backgroundManager = null;
    }
    
    if (this.animationManager) {
      this.animationManager.destroy();
      this.animationManager = null;
    }
    
    if (this.healthBarManager) {
      this.healthBarManager.destroy();
      this.healthBarManager = null;
    }
    
    // Nettoyer les références
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.battleInventoryUI = null;
    this.battleTranslator = null;
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    super.destroy();
    
    console.log('✅ [BattleScene] Tous les managers détruits');
  }
}

// === FONCTIONS GLOBALES DE TEST (MISES À JOUR) ===

window.testModernBattle = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    window.game.scene.wake('BattleScene');
    battleScene.scene.setVisible(true);
  }
  
  battleScene.testModernBattleDisplay();
};

window.modernDamagePlayer = function(damage = 5) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulatePlayerDamage(damage);
    console.log(`💥 Dégâts joueur via manager: ${damage} (HP: ${result})`);
  }
};

window.modernDamageOpponent = function(damage = 5) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulateOpponentDamage(damage);
    console.log(`💥 Dégâts adversaire via manager: ${damage} (HP: ${result})`);
  }
};

console.log('✅ [BattleScene] VERSION REFACTORISÉE AVEC MANAGERS CHARGÉE !');
console.log('🏗️ Architecture: PokemonSpriteManager + BattleUIManager + BattleBackgroundManager + BattleAnimationManager');
console.log('🧪 Test: window.testModernBattle()');
