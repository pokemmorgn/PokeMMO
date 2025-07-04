// client/src/Battle/BattleUITransition.js - Version avec masquage automatique QuestTracker
export class BattleUITransition {
  constructor(uiManager, gameManager) {
    this.uiManager = uiManager;
    this.gameManager = gameManager;
    
    // État de transition
    this.isTransitioning = false;
    this.battleActive = false;
    this.previousUIState = null;
    
    // Éléments de transition
    this.transitionOverlay = null;
    
    console.log('⚔️ [BattleUITransition] Gestionnaire créé');
  }

  // === TRANSITION VERS LE COMBAT ===

  async startBattleTransition(encounterData = {}) {
    if (this.isTransitioning || this.battleActive) {
      console.warn('⚠️ [BattleUITransition] Transition déjà en cours');
      return false;
    }

    console.log('🎬 [BattleUITransition] === DÉBUT TRANSITION COMBAT ===');
    console.log('📊 Données encounter:', encounterData);

    this.isTransitioning = true;

    try {
      // ÉTAPE 1: Sauvegarder l'état UI actuel
      this.saveCurrentUIState();

      // ÉTAPE 2: Créer l'overlay de transition
      await this.createTransitionOverlay(encounterData);

      // ÉTAPE 3: Animation de masquage des icônes UI + QUESTTRACKER AUTO
      await this.hideUIIconsWithAnimation();

      // ÉTAPE 4: Changer l'état UI vers 'battle'
      await this.setUIToBattleMode();

      // ÉTAPE 5: Préparer l'espace pour la BattleScene
      this.prepareBattleSpace();

      // ✅ NOUVEAU: ÉTAPE 6: Auto-transition vers interface de combat après 2 secondes
      setTimeout(() => {
        this.proceedToBattleInterface(encounterData);
      }, 2000);

      this.battleActive = true;
      this.isTransitioning = false;

      console.log('✅ [BattleUITransition] Transition vers combat terminée');
      
      return true;

    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur transition:', error);
      this.isTransitioning = false;
      await this.cancelTransition();
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Procéder à l'interface de combat
  async proceedToBattleInterface(encounterData) {
    console.log('🖥️ [BattleUITransition] === PASSAGE À L\'INTERFACE COMBAT ===');
    
    try {
      // 1. Masquer graduellement l'overlay de transition
      await this.fadeOutTransitionOverlay();
      
      // 2. Obtenir BattleScene et l'initialiser
      const battleScene = this.getBattleScene();
      if (battleScene) {
        // ✅ NOUVEAU: Activer et rendre visible la BattleScene
        await this.activateBattleScene(battleScene);
        
        // Déclencher l'encounter
        battleScene.handleEncounterStart(encounterData);
        
        console.log('✅ [BattleUITransition] Interface de combat lancée');
      } else {
        console.error('❌ [BattleUITransition] BattleScene non trouvée');
        await this.cancelTransition();
      }
      
    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur passage interface:', error);
      await this.cancelTransition();
    }
  }

  async fadeOutTransitionOverlay() {
    if (!this.transitionOverlay) return;
    
    console.log('🌅 [BattleUITransition] Masquage overlay de transition...');
    
    return new Promise(resolve => {
      // Animation de sortie
      this.transitionOverlay.style.transition = 'all 0.8s ease-out';
      this.transitionOverlay.style.opacity = '0';
      this.transitionOverlay.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        if (this.transitionOverlay) {
          this.transitionOverlay.style.display = 'none';
        }
        resolve();
      }, 800);
    });
  }

  getBattleScene() {
    // Essayer plusieurs méthodes pour obtenir BattleScene
    let battleScene = null;
    
    // Méthode 1: Via gameManager
    if (this.gameManager?.currentScene?.scene?.get) {
      battleScene = this.gameManager.currentScene.scene.get('BattleScene');
    }
    
    // Méthode 2: Via Phaser global
    if (!battleScene && window.game?.scene?.getScene) {
      battleScene = window.game.scene.getScene('BattleScene');
    }
    
    // Méthode 3: Via scene manager global
    if (!battleScene && window.scenes?.BattleScene) {
      battleScene = window.scenes.BattleScene;
    }
    
    console.log(`🎮 [BattleUITransition] BattleScene trouvée: ${!!battleScene}`);
    return battleScene;
  }

  async initializeBattleScene(battleScene, encounterData) {
    console.log('🔧 [BattleUITransition] Initialisation BattleScene...');
    
    try {
      // Passer les managers à BattleScene
      battleScene.init({
        gameManager: this.gameManager,
        networkHandler: this.gameManager?.networkHandler || window.globalNetworkManager
      });
      
      // S'assurer que la scène est créée
      if (!battleScene.isActive) {
        battleScene.create();
      }
      
      console.log('✅ [BattleUITransition] BattleScene initialisée');
      
    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur init BattleScene:', error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Activer et rendre visible la BattleScene
async activateBattleScene(battleScene) {
  console.log('🎮 [BattleUITransition] Activation BattleScene...');
  
  try {
    // Obtenir le jeu Phaser
    const phaserGame = window.game || window.phaserGame;
    
    if (!phaserGame || !phaserGame.scene) {
      console.error('❌ [BattleUITransition] PhaserGame non disponible');
      return false;
    }
    
    // Obtenir la BattleScene
    const sceneInstance = phaserGame.scene.getScene('BattleScene');
    
    if (!sceneInstance) {
      console.error('❌ [BattleUITransition] BattleScene non trouvée dans le gestionnaire');
      return false;
    }
    
    // ✅ NOUVEAU: Utiliser la méthode dédiée de BattleScene
    const success = sceneInstance.activateFromTransition();
    
    if (success) {
      console.log('✅ [BattleUITransition] BattleScene activée via activateFromTransition');
      return true;
    } else {
      console.error('❌ [BattleUITransition] Échec activation via activateFromTransition');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [BattleUITransition] Erreur activation BattleScene:', error);
    return false;
  }
}
  
  // === MÉTHODES EXISTANTES (inchangées) ===

  saveCurrentUIState() {
    console.log('💾 [BattleUITransition] Sauvegarde état UI actuel...');
    
    if (window.pokemonUISystem) {
      this.previousUIState = {
        gameState: window.pokemonUISystem.currentGameState,
        moduleStates: new Map()
      };

      const moduleIds = ['inventory', 'team', 'quest', 'questTracker', 'chat'];
      moduleIds.forEach(moduleId => {
        const module = window.pokemonUISystem.getModule(moduleId);
        if (module) {
          this.previousUIState.moduleStates.set(moduleId, {
            visible: module.iconElement ? 
              window.getComputedStyle(module.iconElement).display !== 'none' : false,
            enabled: module.iconElement ? 
              !module.iconElement.disabled : true
          });
        }
      });

      console.log('✅ État UI sauvegardé:', {
        gameState: this.previousUIState.gameState,
        modulesCount: this.previousUIState.moduleStates.size
      });
    } else {
      console.warn('⚠️ [BattleUITransition] PokemonUISystem non trouvé');
      this.previousUIState = { gameState: 'exploration' };
    }
  }

  async createTransitionOverlay(encounterData) {
    console.log('🎨 [BattleUITransition] Création overlay de transition...');

    this.removeTransitionOverlay();

    this.transitionOverlay = document.createElement('div');
    this.transitionOverlay.className = 'battle-transition-overlay';
    this.transitionOverlay.id = 'battleTransitionOverlay';

    this.transitionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%);
      z-index: 4000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: all 0.8s ease-in-out;
      backdrop-filter: blur(2px);
      font-family: 'Arial', sans-serif;
      color: white;
      text-align: center;
    `;

    this.transitionOverlay.innerHTML = `
      <div class="transition-content" style="
        background: rgba(0, 0, 0, 0.7);
        padding: 40px;
        border-radius: 15px;
        border: 3px solid #FFD700;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        max-width: 500px;
        transform: scale(0.8);
        transition: transform 0.5s ease-out;
      ">
        <div class="encounter-icon" style="font-size: 4em; margin-bottom: 20px;">⚔️</div>
        <h2 class="encounter-title" style="
          color: #FFD700; 
          margin: 0 0 15px 0; 
          font-size: 2.2em;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        ">Combat Pokémon !</h2>
        <p class="encounter-text" style="
          font-size: 1.4em; 
          margin: 0 0 20px 0;
          color: #E0E0E0;
        ">${this.getEncounterMessage(encounterData)}</p>
        <div class="loading-indicator" style="
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 20px;
        ">
          <div class="loading-pokeball" style="
            width: 40px;
            height: 40px;
            background: linear-gradient(45deg, #FF0000 50%, #FFFFFF 50%);
            border: 3px solid #000;
            border-radius: 50%;
            animation: rotatePokeball 1s linear infinite;
          "></div>
        </div>
      </div>
    `;

    this.addTransitionStyles();
    document.body.appendChild(this.transitionOverlay);
    await this.animateTransitionIn();
  }

  addTransitionStyles() {
    if (document.querySelector('#battle-transition-styles')) return;

    const style = document.createElement('style');
    style.id = 'battle-transition-styles';
    style.textContent = `
      @keyframes rotatePokeball {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes fadeInScale {
        0% { opacity: 0; transform: scale(0.5); }
        100% { opacity: 1; transform: scale(1); }
      }
      
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
        50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
      }
      
      .transition-content {
        animation: fadeInScale 0.6s ease-out, pulseGlow 2s ease-in-out infinite;
      }
      
      .ui-icon-hiding {
        transition: all 0.4s ease-in-out;
        transform: scale(0.8);
        opacity: 0.3;
      }
      
      .ui-icon-hidden {
        display: none !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  async animateTransitionIn() {
    return new Promise(resolve => {
      this.transitionOverlay.offsetHeight;
      this.transitionOverlay.style.opacity = '1';
      
      const content = this.transitionOverlay.querySelector('.transition-content');
      if (content) {
        setTimeout(() => {
          content.style.transform = 'scale(1)';
        }, 100);
      }
      
      setTimeout(resolve, 800);
    });
  }

  // ✅ MODIFIÉ: Méthode avec masquage automatique QuestTracker
  async hideUIIconsWithAnimation() {
    console.log('👻 [BattleUITransition] Masquage animé des icônes UI...');

    const iconSelectors = [
      '#inventory-icon',
      '#team-icon', 
      '#quest-icon',
      '#questTracker',
      '.ui-icon',
      '.game-icon'
    ];

    const iconsToHide = [];

    iconSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (window.getComputedStyle(element).display !== 'none') {
          iconsToHide.push(element);
        }
      });
    });

    // ✅ AJOUT: Masquage brutal QuestTracker automatique
    this.forceHideQuestTracker();

    console.log(`🎯 [BattleUITransition] ${iconsToHide.length} icônes à masquer`);

    if (iconsToHide.length === 0) {
      console.log('ℹ️ [BattleUITransition] Aucune icône à masquer');
      return;
    }

    return new Promise(resolve => {
      let hiddenCount = 0;

      iconsToHide.forEach((icon, index) => {
        setTimeout(() => {
          icon.classList.add('ui-icon-hiding');
          
          setTimeout(() => {
            icon.classList.add('ui-icon-hidden');
            icon.classList.remove('ui-icon-hiding');
            
            hiddenCount++;
            if (hiddenCount === iconsToHide.length) {
              console.log('✅ [BattleUITransition] Toutes les icônes masquées');
              resolve();
            }
          }, 400);
          
        }, index * 100);
      });
    });
  }

  // ✅ NOUVELLE MÉTHODE: Masquage brutal QuestTracker
  forceHideQuestTracker() {
    const questTrackerSelectors = [
      '#questTracker',
      '#quest-tracker',
      '.quest-tracker',
      '.questTracker',
      '[data-module="questTracker"]',
      '[data-module="quest-tracker"]'
    ];
    
    questTrackerSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('position', 'absolute', 'important');
        el.style.setProperty('top', '-9999px', 'important');
        el.setAttribute('data-battle-hidden', 'questTracker');
      });
    });
  }

  async setUIToBattleMode() {
    console.log('🎮 [BattleUITransition] Passage en mode battle UI...');

    if (window.pokemonUISystem && window.pokemonUISystem.setGameState) {
      try {
        const success = window.pokemonUISystem.setGameState('battle', {
          animated: false,
          force: true
        });
        
        if (success) {
          console.log('✅ [BattleUITransition] État UI changé vers "battle"');
        } else {
          console.warn('⚠️ [BattleUITransition] Échec changement état UI');
        }
      } catch (error) {
        console.error('❌ [BattleUITransition] Erreur changement état:', error);
      }
    } else {
      console.warn('⚠️ [BattleUITransition] PokemonUISystem.setGameState non disponible');
    }

    this.fallbackHideAllUI();
  }

  // ✅ MODIFIÉ: Fallback avec QuestTracker inclus
  fallbackHideAllUI() {
    console.log('🔧 [BattleUITransition] Fallback masquage UI manuel...');
    
    const allUISelectors = [
      '.ui-icon', '.game-icon', '.interface-icon',
      '#inventory-icon', '#team-icon', '#quest-icon',
      '.inventory-ui', '.team-ui', '.quest-ui',
      '#questTracker', '#quest-tracker', '.quest-tracker', '.questTracker',
      '#chat', '.chat-container'
    ];

    allUISelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.display = 'none';
        element.setAttribute('data-battle-hidden', 'fallback');
      });
    });
  }

  prepareBattleSpace() {
    console.log('🏗️ [BattleUITransition] Préparation espace battle...');

    if (this.gameManager?.pauseWorldInteractions) {
      this.gameManager.pauseWorldInteractions();
    }

    if (this.gameManager?.player?.setMovementEnabled) {
      this.gameManager.player.setMovementEnabled(false);
    }

    const gameCanvas = document.querySelector('#game-canvas, canvas');
    if (gameCanvas) {
      gameCanvas.classList.add('battle-mode-active');
    }

    console.log('✅ [BattleUITransition] Espace battle préparé');
  }

  // === TRANSITION DE RETOUR ===

  async endBattleTransition(battleResult = {}) {
    if (!this.battleActive) {
      console.warn('⚠️ [BattleUITransition] Pas en mode battle');
      return false;
    }

    console.log('🏁 [BattleUITransition] === RETOUR EXPLORATION ===');
    console.log('📊 Résultat battle:', battleResult);

    this.isTransitioning = true;

    try {
      await this.showBattleEndAnimation(battleResult);
      await this.restorePreviousUIState();
      await this.showUIIconsWithAnimation();
      await this.removeTransitionOverlay();
      this.restoreWorldInteractions();

      this.battleActive = false;
      this.isTransitioning = false;

      console.log('✅ [BattleUITransition] Retour exploration terminé');
      
      return true;

    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur retour:', error);
      this.isTransitioning = false;
      return false;
    }
  }

  async showBattleEndAnimation(battleResult) {
    if (!this.transitionOverlay) return;

    console.log('🎊 [BattleUITransition] Animation fin de combat...');

    const content = this.transitionOverlay.querySelector('.transition-content');
    if (content) {
      content.innerHTML = `
        <div class="end-icon" style="font-size: 4em; margin-bottom: 20px;">
          ${this.getBattleResultIcon(battleResult.result)}
        </div>
        <h2 style="color: ${this.getBattleResultColor(battleResult.result)}; margin: 0 0 15px 0; font-size: 2em;">
          ${this.getBattleResultMessage(battleResult.result)}
        </h2>
        <p style="font-size: 1.2em; color: #E0E0E0; margin: 0;">
          Retour à l'exploration...
        </p>
      `;

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async restorePreviousUIState() {
    console.log('🔄 [BattleUITransition] Restauration état UI...');

    if (!this.previousUIState) {
      console.warn('⚠️ [BattleUITransition] Pas d\'état précédent sauvegardé');
      return;
    }

    if (window.pokemonUISystem?.setGameState) {
      const restored = window.pokemonUISystem.setGameState(
        this.previousUIState.gameState || 'exploration',
        { animated: false }
      );
      
      if (restored) {
        console.log(`✅ État UI restauré: ${this.previousUIState.gameState}`);
      }
    }
  }

  // ✅ MODIFIÉ: Restauration avec QuestTracker inclus
  async showUIIconsWithAnimation() {
    console.log('👁️ [BattleUITransition] Réaffichage animé des icônes...');

    // Restaurer tous les éléments masqués par data-battle-hidden
    const hiddenElements = document.querySelectorAll('[data-battle-hidden]');
    hiddenElements.forEach(el => {
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
      el.style.removeProperty('position');
      el.style.removeProperty('top');
      el.removeAttribute('data-battle-hidden');
    });

    const hiddenIcons = document.querySelectorAll('.ui-icon-hidden');
    
    return new Promise(resolve => {
      let shownCount = 0;
      const totalIcons = hiddenIcons.length;

      if (totalIcons === 0) {
        console.log('ℹ️ [BattleUITransition] Aucune icône à réafficher');
        resolve();
        return;
      }

      hiddenIcons.forEach((icon, index) => {
        setTimeout(() => {
          icon.classList.remove('ui-icon-hidden');
          
          icon.style.opacity = '0';
          icon.style.transform = 'scale(0.5)';
          icon.style.display = '';
          
          icon.offsetHeight;
          icon.style.transition = 'all 0.4s ease-out';
          icon.style.opacity = '1';
          icon.style.transform = 'scale(1)';
          
          shownCount++;
          if (shownCount === totalIcons) {
            console.log('✅ [BattleUITransition] Toutes les icônes réaffichées');
            setTimeout(resolve, 400);
          }
          
        }, index * 100);
      });
    });
  }

  restoreWorldInteractions() {
    console.log('🌍 [BattleUITransition] Restauration interactions monde...');

    if (this.gameManager?.resumeWorldInteractions) {
      this.gameManager.resumeWorldInteractions();
    }

    if (this.gameManager?.player?.setMovementEnabled) {
      this.gameManager.player.setMovementEnabled(true);
    }

    const gameCanvas = document.querySelector('#game-canvas, canvas');
    if (gameCanvas) {
      gameCanvas.classList.remove('battle-mode-active');
    }

    console.log('✅ [BattleUITransition] Interactions monde restaurées');
  }

  // === NETTOYAGE ===

  async removeTransitionOverlay() {
    if (!this.transitionOverlay) return;

    console.log('🧹 [BattleUITransition] Suppression overlay transition...');

    return new Promise(resolve => {
      this.transitionOverlay.style.opacity = '0';
      
      setTimeout(() => {
        if (this.transitionOverlay && this.transitionOverlay.parentNode) {
          this.transitionOverlay.parentNode.removeChild(this.transitionOverlay);
          this.transitionOverlay = null;
        }
        resolve();
      }, 300);
    });
  }

  async cancelTransition() {
    console.log('❌ [BattleUITransition] Annulation transition...');

    if (this.previousUIState) {
      await this.restorePreviousUIState();
      await this.showUIIconsWithAnimation();
    }

    await this.removeTransitionOverlay();
    this.restoreWorldInteractions();

    this.battleActive = false;
    this.isTransitioning = false;
  }

  // === MÉTHODES UTILITAIRES ===

  getEncounterMessage(encounterData) {
    if (encounterData.pokemon?.name) {
      return `Un ${encounterData.pokemon.name} sauvage apparaît !`;
    }
    return 'Un Pokémon sauvage vous défie !';
  }

  getBattleResultIcon(result) {
    const icons = {
      'victory': '🎉',
      'defeat': '💀', 
      'fled': '🏃',
      'captured': '🎯',
      'draw': '🤝'
    };
    return icons[result] || '⚔️';
  }

  getBattleResultColor(result) {
    const colors = {
      'victory': '#00FF00',
      'defeat': '#FF0000',
      'fled': '#FFD700',
      'captured': '#00FF00',
      'draw': '#FFA500'
    };
    return colors[result] || '#FFD700';
  }

  getBattleResultMessage(result) {
    const messages = {
      'victory': 'Victoire !',
      'defeat': 'Défaite...',
      'fled': 'Fuite réussie !',
      'captured': 'Pokémon capturé !',
      'draw': 'Match nul !'
    };
    return messages[result] || 'Combat terminé';
  }

  // === MÉTHODES PUBLIQUES ===

  isBattleActive() {
    return this.battleActive;
  }

  isCurrentlyTransitioning() {
    return this.isTransitioning;
  }

  getCurrentUIState() {
    return {
      battleActive: this.battleActive,
      isTransitioning: this.isTransitioning,
      previousUIState: this.previousUIState
    };
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('💀 [BattleUITransition] Destruction...');

    if (this.isTransitioning) {
      this.cancelTransition();
    }

    this.removeTransitionOverlay();

    const styles = document.querySelector('#battle-transition-styles');
    if (styles) {
      styles.remove();
    }

    this.uiManager = null;
    this.gameManager = null;
    this.previousUIState = null;
    this.battleActive = false;
    this.isTransitioning = false;

    console.log('✅ [BattleUITransition] Détruit');
  }
}

// === INTÉGRATION GLOBALE ===

window.BattleUITransition = BattleUITransition;

window.createBattleUITransition = function(uiManager, gameManager) {
  return new BattleUITransition(uiManager, gameManager);
};

// ✅ FONCTION DE TEST AMÉLIORÉE
window.testBattleUITransition = function() {
  console.log('🧪 Test transition UI battle avec auto-passage...');
  
  const transition = new BattleUITransition(
    window.pokemonUISystem?.uiManager,
    window.gameManager || window.globalNetworkManager
  );
  
  // Test avec données Pokémon
  transition.startBattleTransition({
    pokemon: { 
      name: 'Pikachu', 
      level: 5,
      pokemonId: 25,
      currentHp: 20,
      maxHp: 20,
      types: ['electric'],
      moves: ['thunder_shock', 'growl']
    },
    location: 'test_zone'
  }).then(success => {
    if (success) {
      console.log('✅ Transition lancée - interface de combat dans 2 secondes');
    } else {
      console.error('❌ Échec transition');
    }
  });
  
  return transition;
};

console.log('✅ [BattleUITransition] Module chargé avec auto-passage');
console.log('🧪 Utilisez window.testBattleUITransition() pour tester');
