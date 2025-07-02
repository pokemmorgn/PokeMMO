// client/src/managers/BattleIntegration.js - Coordination complète du système de combat
import { BattleUITransition } from '../Battle/BattleUITransition.js';
import { BattleConnection } from '../Battle/BattleConnection.js';

export class BattleIntegration {
  constructor(gameManager, networkManager) {
    this.gameManager = gameManager;
    this.networkManager = networkManager;
    
    // Gestionnaires
    this.battleUITransition = null;
    this.battleConnection = null;
    this.battleScene = null;
    
    // État
    this.isInitialized = false;
    this.currentBattle = null;
    
    console.log('🎮 [BattleIntegration] Gestionnaire principal créé');
  }

  // === INITIALISATION ===

  async initialize() {
    console.log('🔧 [BattleIntegration] Initialisation du système de combat...');
    
    try {
      // 1. Initialiser la transition UI
      this.battleUITransition = new BattleUITransition(
        window.pokemonUISystem?.uiManager,
        this.gameManager
      );
      
      // 2. Initialiser la connexion réseau
      this.battleConnection = new BattleConnection(this.gameManager);
      const connectionSuccess = this.battleConnection.initialize(this.networkManager);
      
      if (!connectionSuccess) {
        throw new Error('Échec initialisation BattleConnection');
      }
      
      // 3. Obtenir la référence à BattleScene
      this.battleScene = this.gameManager?.currentScene?.scene?.get('BattleScene');
      if (!this.battleScene) {
        console.warn('⚠️ [BattleIntegration] BattleScene non trouvée, sera initialisée plus tard');
      }
      
      // 4. Setup des événements
      this.setupEvents();
      
      this.isInitialized = true;
      console.log('✅ [BattleIntegration] Système de combat initialisé');
      
      return true;
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur initialisation:', error);
      return false;
    }
  }

  // === CONFIGURATION DES ÉVÉNEMENTS ===

  setupEvents() {
    console.log('📡 [BattleIntegration] Configuration des événements...');
    
    // Événements de transition UI
    if (this.battleUITransition) {
      // Aucun événement spécifique, on gère manuellement
    }
    
    // Événements réseau
    if (this.battleConnection) {
      this.battleConnection.on('wildEncounterStart', (data) => {
        this.handleWildEncounterStart(data);
      });
      
      this.battleConnection.on('battleRoomCreated', (data) => {
        this.handleBattleRoomCreated(data);
      });
      
      this.battleConnection.on('battleStart', (data) => {
        this.handleBattleStart(data);
      });
      
      this.battleConnection.on('battleEnd', (data) => {
        this.handleBattleEnd(data);
      });
    }
    
    // ✅ NOUVEAU: Écouter l'événement de fin de transition
    window.addEventListener('battleUITransitionComplete', (event) => {
      this.handleTransitionComplete(event.detail);
    });
    
    console.log('✅ [BattleIntegration] Événements configurés');
  }

  // === GESTION DES ÉVÉNEMENTS ===

  async handleWildEncounterStart(data) {
    console.log('🐾 [BattleIntegration] === DÉBUT COMBAT SAUVAGE ===');
    console.log('📊 Données:', data);
    
    this.currentBattle = {
      type: 'wild',
      pokemon: data.pokemon,
      startTime: Date.now()
    };
    
    // ✅ ÉTAPE 1: Lancer la transition UI
    console.log('🎬 [BattleIntegration] Étape 1: Transition UI...');
    const transitionSuccess = await this.battleUITransition.startBattleTransition({
      pokemon: data.pokemon,
      location: data.location
    });
    
    if (!transitionSuccess) {
      console.error('❌ [BattleIntegration] Échec transition UI');
      return;
    }
    
    // ✅ ÉTAPE 2: Attendre un peu puis passer à l'interface de combat
    console.log('⏳ [BattleIntegration] Attente puis interface de combat...');
    setTimeout(() => {
      this.showBattleInterface(data);
    }, 2000); // 2 secondes d'affichage de transition
  }

  handleTransitionComplete(detail) {
    console.log('🎬 [BattleIntegration] Transition UI terminée:', detail);
    // La transition est terminée, l'interface de combat peut être affichée
  }

  async showBattleInterface(encounterData) {
    console.log('🖥️ [BattleIntegration] === AFFICHAGE INTERFACE COMBAT ===');
    
    try {
      // ✅ ÉTAPE 1: Masquer l'overlay de transition
      if (this.battleUITransition && this.battleUITransition.transitionOverlay) {
        console.log('🧹 [BattleIntegration] Masquage overlay de transition...');
        
        const overlay = this.battleUITransition.transitionOverlay;
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.style.display = 'none';
          }
        }, 500);
      }
      
      // ✅ ÉTAPE 2: Obtenir ou initialiser BattleScene
      if (!this.battleScene) {
        this.battleScene = this.gameManager?.currentScene?.scene?.get('BattleScene');
      }
      
      if (!this.battleScene) {
        console.error('❌ [BattleIntegration] BattleScene non disponible');
        return;
      }
      
      // ✅ ÉTAPE 3: Initialiser BattleScene si nécessaire
      if (!this.battleScene.isActive) {
        await this.initializeBattleScene();
      }
      
      // ✅ ÉTAPE 4: Déclencher l'encounter dans BattleScene
      console.log('⚔️ [BattleIntegration] Déclenchement encounter...');
      this.battleScene.handleEncounterStart(encounterData);
      
      console.log('✅ [BattleIntegration] Interface de combat affichée');
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur affichage interface:', error);
      
      // Fallback: restaurer l'état normal
      await this.cancelBattle();
    }
  }

  async initializeBattleScene() {
    console.log('🔧 [BattleIntegration] Initialisation BattleScene...');
    
    if (!this.battleScene) return;
    
    // Passer les managers à BattleScene
    this.battleScene.init({
      gameManager: this.gameManager,
      networkHandler: this.battleConnection
    });
    
    // S'assurer que la scène est créée
    if (!this.battleScene.isActive) {
      this.battleScene.create();
    }
    
    console.log('✅ [BattleIntegration] BattleScene initialisée');
  }

  handleBattleRoomCreated(data) {
    console.log('🏠 [BattleIntegration] BattleRoom créée:', data.battleRoomId);
    
    if (this.currentBattle) {
      this.currentBattle.battleRoomId = data.battleRoomId;
    }
  }

  handleBattleStart(data) {
    console.log('⚔️ [BattleIntegration] Combat démarré !');
    
    if (this.currentBattle) {
      this.currentBattle.status = 'active';
      this.currentBattle.battleData = data;
    }
  }

  async handleBattleEnd(data) {
    console.log('🏁 [BattleIntegration] === FIN DE COMBAT ===');
    console.log('📊 Résultat:', data);
    
    if (this.currentBattle) {
      this.currentBattle.status = 'ended';
      this.currentBattle.result = data.result;
      this.currentBattle.endTime = Date.now();
    }
    
    // Attendre un peu puis revenir à l'exploration
    setTimeout(async () => {
      await this.returnToExploration(data);
    }, 3000);
  }

  async returnToExploration(battleResult = {}) {
    console.log('🌍 [BattleIntegration] === RETOUR EXPLORATION ===');
    
    try {
      // ✅ ÉTAPE 1: Masquer l'interface de combat
      if (this.battleScene && this.battleScene.isBattleActive()) {
        console.log('🖥️ [BattleIntegration] Masquage interface combat...');
        this.battleScene.hideBattleInterface();
      }
      
      // ✅ ÉTAPE 2: Transition de retour à l'exploration
      if (this.battleUITransition && this.battleUITransition.isBattleActive()) {
        console.log('🔄 [BattleIntegration] Transition retour...');
        await this.battleUITransition.endBattleTransition(battleResult);
      }
      
      // ✅ ÉTAPE 3: Nettoyer l'état de combat
      this.currentBattle = null;
      
      console.log('✅ [BattleIntegration] Retour exploration terminé');
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur retour exploration:', error);
      
      // Forcer le nettoyage
      await this.forceCleanup();
    }
  }

  async cancelBattle() {
    console.log('❌ [BattleIntegration] Annulation du combat...');
    
    try {
      // Masquer l'interface de combat
      if (this.battleScene) {
        this.battleScene.hideBattleInterface();
      }
      
      // Annuler la transition
      if (this.battleUITransition) {
        await this.battleUITransition.cancelTransition();
      }
      
      // Nettoyer
      this.currentBattle = null;
      
      console.log('✅ [BattleIntegration] Combat annulé');
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur annulation:', error);
      await this.forceCleanup();
    }
  }

  async forceCleanup() {
    console.log('🧹 [BattleIntegration] Nettoyage forcé...');
    
    // Supprimer tous les overlays de combat
    const battleOverlays = document.querySelectorAll(
      '#battleOverlay, #battleActionOverlay, #battleTransitionOverlay'
    );
    battleOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    // Réafficher toutes les icônes UI
    const hiddenIcons = document.querySelectorAll('.ui-icon-hidden');
    hiddenIcons.forEach(icon => {
      icon.classList.remove('ui-icon-hidden');
      icon.style.display = '';
      icon.style.opacity = '1';
      icon.style.transform = 'scale(1)';
    });
    
    // Réactiver le mouvement
    if (this.gameManager?.player?.setMovementEnabled) {
      this.gameManager.player.setMovementEnabled(true);
    }
    
    // Remettre l'état UI à exploration
    if (window.pokemonUISystem?.setGameState) {
      window.pokemonUISystem.setGameState('exploration');
    }
    
    console.log('✅ [BattleIntegration] Nettoyage forcé terminé');
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Démarre un combat sauvage manuellement
   */
  async startWildBattle(pokemonData, location = 'unknown') {
    console.log('🎮 [BattleIntegration] Démarrage combat sauvage manuel...');
    
    if (!this.isInitialized) {
      console.error('❌ [BattleIntegration] Système non initialisé');
      return false;
    }
    
    // Simuler l'événement de rencontre sauvage
    await this.handleWildEncounterStart({
      pokemon: pokemonData,
      location: location,
      method: 'manual'
    });
    
    return true;
  }

  /**
   * Force l'arrêt du combat
   */
  async stopBattle() {
    console.log('🛑 [BattleIntegration] Arrêt forcé du combat...');
    
    if (this.currentBattle) {
      await this.cancelBattle();
    }
  }

  /**
   * Obtient l'état actuel du combat
   */
  getBattleStatus() {
    return {
      active: !!this.currentBattle,
      battle: this.currentBattle,
      initialized: this.isInitialized,
      components: {
        transition: !!this.battleUITransition,
        connection: !!this.battleConnection,
        scene: !!this.battleScene
      }
    };
  }

  // === DEBUG ET TEST ===

  /**
   * Test complet du système
   */
  async testBattleSystem() {
    console.log('🧪 [BattleIntegration] === TEST SYSTÈME COMBAT ===');
    
    const testPokemon = {
      pokemonId: 25,
      name: 'Pikachu',
      level: 5,
      currentHp: 20,
      maxHp: 20,
      types: ['electric'],
      moves: ['thunder_shock', 'growl', 'tail_whip'],
      statusCondition: 'normal'
    };
    
    const success = await this.startWildBattle(testPokemon, 'test_zone');
    
    if (success) {
      console.log('✅ [BattleIntegration] Test démarré - combat dans 5 secondes');
      
      // Auto-terminer le test après 10 secondes
      setTimeout(async () => {
        console.log('🧪 [BattleIntegration] Fin auto du test...');
        await this.returnToExploration({ result: 'victory', experience: 50 });
      }, 10000);
      
    } else {
      console.error('❌ [BattleIntegration] Échec du test');
    }
    
    return success;
  }

  /**
   * Debug du système
   */
  debug() {
    console.log('🔍 [BattleIntegration] === DEBUG SYSTÈME ===');
    
    const status = this.getBattleStatus();
    console.log('📊 Statut:', status);
    
    if (this.battleConnection) {
      console.log('📡 Connexion:', this.battleConnection.getConnectionStatus());
    }
    
    if (this.battleUITransition) {
      console.log('🎬 Transition:', this.battleUITransition.getCurrentUIState());
    }
    
    if (this.battleScene) {
      console.log('🎮 Scène:', this.battleScene.getBattleState());
    }
    
    return status;
  }

  // === NETTOYAGE ===

  async destroy() {
    console.log('💀 [BattleIntegration] Destruction...');
    
    // Arrêter tout combat en cours
    if (this.currentBattle) {
      await this.cancelBattle();
    }
    
    // Détruire les composants
    if (this.battleUITransition) {
      this.battleUITransition.destroy();
      this.battleUITransition = null;
    }
    
    if (this.battleConnection) {
      await this.battleConnection.destroy();
      this.battleConnection = null;
    }
    
    // Nettoyer les références
    this.battleScene = null;
    this.gameManager = null;
    this.networkManager = null;
    this.currentBattle = null;
    this.isInitialized = false;
    
    console.log('✅ [BattleIntegration] Détruit');
  }
}

// === INTÉGRATION GLOBALE ===

// Exposer pour tests
window.BattleIntegration = BattleIntegration;

// Fonction de test globale
window.testBattleIntegration = async function() {
  console.log('🧪 Test intégration combat...');
  
  // Créer l'intégration
  const integration = new BattleIntegration(
    window.gameManager || window.globalNetworkManager?.gameManager,
    window.globalNetworkManager || window.networkManager
  );
  
  // Initialiser
  const initialized = await integration.initialize();
  if (initialized) {
    console.log('✅ Intégration initialisée');
    
    // Lancer le test
    await integration.testBattleSystem();
  } else {
    console.error('❌ Échec initialisation');
  }
  
  return integration;
};

console.log('🎮 [BattleIntegration] Module chargé');
console.log('🧪 Utilisez window.testBattleIntegration() pour tester');
