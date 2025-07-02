// client/src/managers/BattleIntegration.js - Version simplifiée qui utilise le réseau existant
import { BattleUITransition } from '../Battle/BattleUITransition.js';

export class BattleIntegration {
  constructor(gameManager, networkManager) {
    this.gameManager = gameManager;
    this.networkManager = networkManager;
    
    // Gestionnaires
    this.battleUITransition = null;
    this.battleScene = null;
    
    // État
    this.isInitialized = false;
    this.currentBattle = null;
    
    console.log('🎮 [BattleIntegration] Gestionnaire principal créé (version simplifiée)');
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
      
      // 2. ✅ UTILISER LE RÉSEAU EXISTANT au lieu de créer BattleConnection
      // Ton système réseau fonctionne déjà !
      
      // 3. Obtenir la référence à BattleScene
      this.battleScene = this.gameManager?.currentScene?.scene?.get('BattleScene');
      if (!this.battleScene) {
        console.warn('⚠️ [BattleIntegration] BattleScene non trouvée, sera initialisée plus tard');
      }
      
      // 4. Setup des événements sur le réseau existant
      this.setupEvents();
      
      this.isInitialized = true;
      console.log('✅ [BattleIntegration] Système de combat initialisé (sans BattleConnection)');
      
      return true;
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur initialisation:', error);
      return false;
    }
  }

  // === CONFIGURATION DES ÉVÉNEMENTS ===

  setupEvents() {
    console.log('📡 [BattleIntegration] Configuration des événements sur réseau existant...');
    
    // ✅ UTILISER LE SYSTÈME RÉSEAU EXISTANT
    // Ton BattleNetworkHandler fonctionne déjà !
    
    // Écouter les événements existants
    if (window.globalNetworkManager?.battleHandler) {
      const battleHandler = window.globalNetworkManager.battleHandler;
      
      battleHandler.on('wildEncounterStart', (data) => {
        this.handleWildEncounterStart(data);
      });
      
      battleHandler.on('battleRoomCreated', (data) => {
        this.handleBattleRoomCreated(data);
      });
      
      battleHandler.on('battleStart', (data) => {
        this.handleBattleStart(data);
      });
      
      battleHandler.on('battleEnd', (data) => {
        this.handleBattleEnd(data);
      });
    }
    
    // Fallback : écouter sur le networkManager principal
    if (this.networkManager?.on) {
      this.networkManager.on('wildEncounterStart', (data) => {
        this.handleWildEncounterStart(data);
      });
      
      this.networkManager.on('battleStart', (data) => {
        this.handleBattleStart(data);
      });
      
      this.networkManager.on('battleEnd', (data) => {
        this.handleBattleEnd(data);
      });
    }
    
    console.log('✅ [BattleIntegration] Événements configurés sur réseau existant');
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
      // 🟢 === AJOUTER CETTE LIGNE :
  await this.showBattleInterface({
    pokemon: data.pokemon,
    location: data.location,
    method: data.method
  });
    
    console.log('✅ [BattleIntegration] Transition UI lancée - interface dans 2 secondes');
  }

  async showBattleInterface(encounterData) {
    console.log('🖥️ [BattleIntegration] === AFFICHAGE INTERFACE COMBAT ===');
    
    try {
      // ✅ ÉTAPE 1: Obtenir ou initialiser BattleScene
      if (!this.battleScene) {
        this.battleScene = this.gameManager?.currentScene?.scene?.get('BattleScene');
      }
      
      if (!this.battleScene) {
        console.error('❌ [BattleIntegration] BattleScene non disponible');
        return;
      }
      
      // ✅ ÉTAPE 2: Initialiser BattleScene si nécessaire
      if (!this.battleScene.isActive) {
        await this.initializeBattleScene();
      }
      
      // ✅ ÉTAPE 3: Déclencher l'encounter dans BattleScene
      console.log('⚔️ [BattleIntegration] Déclenchement encounter...');
      this.battleScene.handleEncounterStart(encounterData);
      
      console.log('✅ [BattleIntegration] Interface de combat affichée');
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur affichage interface:', error);
      await this.cancelBattle();
    }
  }

  async initializeBattleScene() {
    console.log('🔧 [BattleIntegration] Initialisation BattleScene...');
    
    if (!this.battleScene) return;
    
    // Passer les managers à BattleScene
    this.battleScene.init({
      gameManager: this.gameManager,
      networkHandler: this.networkManager // Utiliser le networkManager existant
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
   * ✅ VERSION SIMPLIFIÉE : Démarrage manuel avec données de test
   */
  async startTestBattle() {
    console.log('🎮 [BattleIntegration] Démarrage combat de test...');
    
    if (!this.isInitialized) {
      console.error('❌ [BattleIntegration] Système non initialisé');
      return false;
    }
    
    // Simuler l'événement de rencontre sauvage
    const testData = {
      pokemon: {
        pokemonId: 16, // Pidgey
        name: 'Pidgey',
        level: 3,
        currentHp: 15,
        maxHp: 15,
        types: ['normal', 'flying'],
        moves: ['tackle', 'sand_attack'],
        statusCondition: 'normal'
      },
      location: 'test_zone',
      method: 'manual'
    };
    
    await this.handleWildEncounterStart(testData);
    
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
        scene: !!this.battleScene,
        networkExists: !!(this.networkManager || window.globalNetworkManager)
      }
    };
  }

  // === DEBUG ET TEST ===

  /**
   * Test simple qui utilise les données de ton réseau existant
   */
  async testBattleSystem() {
    console.log('🧪 [BattleIntegration] === TEST SYSTÈME COMBAT ===');
    
    const success = await this.startTestBattle();
    
    if (success) {
      console.log('✅ [BattleIntegration] Test démarré - transition UI lancée');
      
      // Auto-terminer le test après 15 secondes
      setTimeout(async () => {
        console.log('🧪 [BattleIntegration] Fin auto du test...');
        await this.returnToExploration({ result: 'victory', experience: 50 });
      }, 15000);
      
    } else {
      console.error('❌ [BattleIntegration] Échec du test');
    }
    
    return success;
  }

  debug() {
    console.log('🔍 [BattleIntegration] === DEBUG SYSTÈME ===');
    
    const status = this.getBattleStatus();
    console.log('📊 Statut:', status);
    
    if (this.battleUITransition) {
      console.log('🎬 Transition:', this.battleUITransition.getCurrentUIState());
    }
    
    if (this.battleScene) {
      console.log('🎮 Scène:', this.battleScene.getBattleState ? this.battleScene.getBattleState() : 'Non défini');
    }
    
    console.log('🌐 Réseau existant:', {
      networkManager: !!this.networkManager,
      globalNetworkManager: !!window.globalNetworkManager,
      battleHandler: !!(window.globalNetworkManager?.battleHandler)
    });
    
    return status;
  }

  // === NETTOYAGE ===

  async destroy() {
    console.log('💀 [BattleIntegration] Destruction...');
    
    if (this.currentBattle) {
      await this.cancelBattle();
    }
    
    if (this.battleUITransition) {
      this.battleUITransition.destroy();
      this.battleUITransition = null;
    }
    
    this.battleScene = null;
    this.gameManager = null;
    this.networkManager = null;
    this.currentBattle = null;
    this.isInitialized = false;
    
    console.log('✅ [BattleIntegration] Détruit');
  }
}

// === INTÉGRATION GLOBALE ===

window.BattleIntegration = BattleIntegration;

// ✅ FONCTION DE TEST SIMPLIFIÉE
window.testBattleIntegrationSimple = async function() {
  console.log('🧪 Test intégration combat simple (sans BattleConnection)...');
  
  const integration = new BattleIntegration(
    window.gameManager || window.globalNetworkManager?.gameManager,
    window.globalNetworkManager || window.networkManager
  );
  
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

console.log('🎮 [BattleIntegration] Module chargé (version simplifiée)');
console.log('🧪 Utilisez window.testBattleIntegrationSimple() pour tester');
