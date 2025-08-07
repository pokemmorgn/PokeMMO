// client/src/Battle/BattleUITransition.js
// Version CORRIGÉE avec intégration complète UIManager pour masquage interface world

export class BattleUITransition {
  constructor(uiManager, gameManager) {
    this.uiManager = uiManager;
    this.gameManager = gameManager;
    
    // État de la transition
    this.isTransitioning = false;
    this.battleActive = false;
    this.previousUIState = null;
    
    // Éléments de transition
    this.transitionOverlay = null;
    
    console.log('⚔️ [BattleUITransition] Gestionnaire créé avec UIManager intégré');
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

      // ✅ ÉTAPE 3: Utiliser UIManager pour masquer COMPLÈTEMENT l'interface world
      await this.hideWorldInterfaceWithUIManager();

      // ÉTAPE 4: Préparer l'espace pour la BattleScene
      this.prepareBattleSpace();

      // ÉTAPE 5: Auto-transition vers interface de combat après 2 secondes
      setTimeout(() => {
        this.proceedToBattleInterface(encounterData);
      }, 2000);

      this.battleActive = true;
      this.isTransitioning = false;

      console.log('✅ [BattleUITransition] Transition vers combat terminée avec UIManager');
      
      return true;

    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur transition:', error);
      this.isTransitioning = false;
      await this.cancelTransition();
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Masquage complet via UIManager
  async hideWorldInterfaceWithUIManager() {
    console.log('🎛️ [BattleUITransition] Masquage interface world via UIManager...');
    
    if (!this.uiManager) {
      console.warn('⚠️ [BattleUITransition] UIManager non disponible, fallback manuel');
      return this.fallbackHideWorldInterface();
    }

    try {
      // ✅ FIX 1: Changer l'état de jeu vers 'battle' via UIManager
      const stateChanged = this.uiManager.setGameState('battle', {
        animated: true,
        force: true
      });

      if (stateChanged) {
        console.log('✅ [BattleUITransition] État jeu changé vers "battle" via UIManager');
      } else {
        console.warn('⚠️ [BattleUITransition] Échec changement état, forçage manuel...');
        this.forceHideAllUIManagerModules();
      }

      // ✅ FIX 2: Attendre que l'animation soit terminée
      await new Promise(resolve => setTimeout(resolve, 200));

      // ✅ FIX 3: Vérification et nettoyage complémentaire
      this.verifyAndCleanupWorldInterface();

      console.log('✅ [BattleUITransition] Interface world masquée via UIManager');

    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur masquage UIManager:', error);
      this.fallbackHideWorldInterface();
    }
  }

  // ✅ NOUVELLE MÉTHODE: Forçage masquage tous les modules UIManager
  forceHideAllUIManagerModules() {
    console.log('🔧 [BattleUITransition] Forçage masquage modules UIManager...');
    
    // Modules à masquer explicitement pendant le combat
    const modulesToHide = [
      'inventory', 'team', 'quest', 'questTracker', 
      'chat', 'pokedex', 'options', 'timeWeather'
    ];

    modulesToHide.forEach(moduleId => {
      try {
        const hidden = this.uiManager.hideModule(moduleId, { animated: false });
        if (hidden) {
          console.log(`👻 [BattleUITransition] Module ${moduleId} masqué via UIManager`);
        } else {
          console.warn(`⚠️ [BattleUITransition] Échec masquage ${moduleId}`);
        }
      } catch (error) {
        console.warn(`⚠️ [BattleUITransition] Erreur masquage ${moduleId}:`, error);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Vérification et nettoyage complémentaire
  verifyAndCleanupWorldInterface() {
    console.log('🔍 [BattleUITransition] Vérification masquage interface...');

    // ✅ Vérifier les éléments encore visibles et les masquer
    const worldInterfaceSelectors = [
      '.ui-icon',
      '#inventory-icon', '#team-icon', '#quest-icon', '#options-icon',
      '.inventory-icon', '.team-icon', '.quest-icon', '.options-icon',
      '#questTracker', '#quest-tracker', '.questTracker',
      '#timeWeather', '.weather-widget',
      '#chat', '.chat-container',
      '.interface-icon', '.game-icon'
    ];

    let hiddenCount = 0;

    worldInterfaceSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // Vérifier si l'élément est encore visible
        const isVisible = window.getComputedStyle(element).display !== 'none' &&
                          window.getComputedStyle(element).visibility !== 'hidden' &&
                          window.getComputedStyle(element).opacity > 0.1;

        if (isVisible) {
          // Masquage BRUTAL pour s'assurer qu'il disparaît
          element.style.setProperty('display', 'none', 'important');
          element.style.setProperty('visibility', 'hidden', 'important');
          element.style.setProperty('opacity', '0', 'important');
          element.style.setProperty('pointer-events', 'none', 'important');
          element.classList.add('battle-hidden');
          element.setAttribute('data-battle-transition-hidden', 'true');
          
          hiddenCount++;
        }
      });
    });

    if (hiddenCount > 0) {
      console.log(`🧹 [BattleUITransition] ${hiddenCount} éléments supplémentaires masqués`);
    } else {
      console.log('✅ [BattleUITransition] Interface déjà complètement masquée');
    }
  }

  // ✅ MÉTHODE FALLBACK: Masquage manuel si UIManager échoue
  fallbackHideWorldInterface() {
    console.log('🔧 [BattleUITransition] Fallback masquage manuel...');
    
    const allWorldSelectors = [
      '.ui-icon', '.interface-icon', '.game-icon',
      '#inventory-icon', '#team-icon', '#quest-icon', '#options-icon',
      '.inventory-icon', '.team-icon', '.quest-icon', '.options-icon',
      '#questTracker', '#quest-tracker', '.quest-tracker', '.questTracker',
      '#timeWeather', '.weather-widget', '.weather-container',
      '#chat', '.chat-container', '.chat-ui',
      '.inventory-ui', '.team-ui', '.quest-ui', '.options-ui'
    ];

    allWorldSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('opacity', '0', 'important');
        element.classList.add('battle-hidden-fallback');
        element.setAttribute('data-battle-fallback-hidden', 'true');
      });
    });

    console.log('🔧 [BattleUITransition] Fallback masquage terminé');
  }

  // === MÉTHODES EXISTANTES (légèrement modifiées) ===

  async proceedToBattleInterface(encounterData) {
    console.log('🖥️ [BattleUITransition] === PASSAGE À L\'INTERFACE COMBAT ===');
    
    try {
      // 1. Masquer graduellement l'overlay de transition
      await this.fadeOutTransitionOverlay();
      
      // 2. Obtenir BattleScene et l'initialiser
      const battleScene = this.getBattleScene();
      if (battleScene) {
        await this.activateBattleScene(battleScene);
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
    let battleScene = null;
    
    if (this.gameManager?.currentScene?.scene?.get) {
      battleScene = this.gameManager.currentScene.scene.get('BattleScene');
    }
    
    if (!battleScene && window.game?.scene?.getScene) {
      battleScene = window.game.scene.getScene('BattleScene');
    }
    
    if (!battleScene && window.scenes?.BattleScene) {
      battleScene = window.scenes.BattleScene;
    }
    
    console.log(`🎮 [BattleUITransition] BattleScene trouvée: ${!!battleScene}`);
    return battleScene;
  }

  async activateBattleScene(battleScene) {
    console.log('🎮 [BattleUITransition] Activation BattleScene...');
    
    try {
      const phaserGame = window.game || window.phaserGame;
      
      if (!phaserGame || !phaserGame.scene) {
        console.error('❌ [BattleUITransition] PhaserGame non disponible');
        return false;
      }
      
      const sceneInstance = phaserGame.scene.getScene('BattleScene');
      
      if (!sceneInstance) {
        console.error('❌ [BattleUITransition] BattleScene non trouvée dans le gestionnaire');
        return false;
      }
      
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

  // === MÉTHODES UTILITAIRES EXISTANTES ===

  saveCurrentUIState() {
    console.log('💾 [BattleUITransition] Sauvegarde état UI actuel...');
    
    this.previousUIState = {
      gameState: 'exploration', // État par défaut à restaurer
      moduleStates: new Map()
    };

    // ✅ Sauvegarder l'état UIManager si disponible
    if (this.uiManager) {
      const currentState = this.uiManager.getGlobalState();
      this.previousUIState.gameState = currentState.currentGameState;
      
      // Sauvegarder l'état de chaque module
      const moduleIds = ['inventory', 'team', 'quest', 'questTracker', 'chat', 'options', 'timeWeather'];
      moduleIds.forEach(moduleId => {
        const moduleState = this.uiManager.getModuleState(moduleId);
        if (moduleState) {
          this.previousUIState.moduleStates.set(moduleId, { ...moduleState });
        }
      });

      console.log('✅ [BattleUITransition] État UIManager sauvegardé:', {
        gameState: this.previousUIState.gameState,
        modulesCount: this.previousUIState.moduleStates.size
      });
    }

    // Fallback sauvegarde manuelle
    if (window.pokemonUISystem) {
      this.previousUIState.pokemonUISystem = {
        gameState: window.pokemonUISystem.currentGameState
      };
    }
  }

  createTransitionOverlay(encounterData) {
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
      z-index: 9000;
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
    
    // Animation d'entrée
    setTimeout(() => {
      this.transitionOverlay.style.opacity = '1';
      const content = this.transitionOverlay.querySelector('.transition-content');
      if (content) {
        content.style.transform = 'scale(1)';
      }
    }, 100);
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
      
      .battle-hidden {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      .battle-hidden-fallback {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    
    document.head.appendChild(style);
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

  // === TRANSITION DE RETOUR VERS L'EXPLORATION ===

  async endBattleTransition(battleResult = {}) {
    if (!this.battleActive) {
      console.warn('⚠️ [BattleUITransition] Pas en mode battle');
      return false;
    }

    console.log('🏁 [BattleUITransition] === RETOUR EXPLORATION ===');
    console.log('📊 Résultat battle:', battleResult);

    this.isTransitioning = true;

    try {
      // 1. Désactiver la BattleScene
      await this.deactivateBattleScene();
      
      // 2. Afficher animation de fin si nécessaire
      if (battleResult.result && battleResult.result !== 'fled') {
        await this.showBattleEndAnimation(battleResult);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // ✅ 3. Restaurer l'interface world via UIManager
      await this.restoreWorldInterfaceWithUIManager();

      // 4. Supprimer overlay et restaurer interactions
      await this.removeTransitionOverlay();
      this.restoreWorldInteractions();

      this.battleActive = false;
      this.isTransitioning = false;

      console.log('✅ [BattleUITransition] Retour exploration terminé avec UIManager');
      
      return true;

    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur retour:', error);
      this.isTransitioning = false;
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Restauration interface world via UIManager
  async restoreWorldInterfaceWithUIManager() {
    console.log('🔄 [BattleUITransition] Restauration interface world via UIManager...');

    if (!this.uiManager || !this.previousUIState) {
      console.warn('⚠️ [BattleUITransition] UIManager ou état précédent non disponible, fallback manuel');
      return this.fallbackRestoreWorldInterface();
    }

    try {
      // ✅ FIX 1: Restaurer l'état de jeu via UIManager
      const gameState = this.previousUIState.gameState || 'exploration';
      const stateRestored = this.uiManager.setGameState(gameState, {
        animated: true,
        force: true
      });

      if (stateRestored) {
        console.log(`✅ [BattleUITransition] État jeu restauré vers "${gameState}" via UIManager`);
      } else {
        console.warn('⚠️ [BattleUITransition] Échec restauration état, forçage manuel...');
        this.forceShowAllUIManagerModules();
      }

      // ✅ FIX 2: Restaurer l'état de chaque module individuellement
      if (this.previousUIState.moduleStates.size > 0) {
        this.previousUIState.moduleStates.forEach((moduleState, moduleId) => {
          try {
            if (moduleState.visible) {
              this.uiManager.showModule(moduleId, { animated: true });
            }
            if (moduleState.enabled) {
              this.uiManager.enableModule(moduleId);
            }
          } catch (error) {
            console.warn(`⚠️ [BattleUITransition] Erreur restauration ${moduleId}:`, error);
          }
        });
      }

      // ✅ FIX 3: Attendre que les animations soient terminées
      await new Promise(resolve => setTimeout(resolve, 300));

      // ✅ FIX 4: Nettoyage des éléments masqués manuellement
      this.cleanupBattleHiddenElements();

      console.log('✅ [BattleUITransition] Interface world restaurée via UIManager');

    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur restauration UIManager:', error);
      this.fallbackRestoreWorldInterface();
    }
  }

  // ✅ NOUVELLE MÉTHODE: Forçage affichage tous les modules UIManager
  forceShowAllUIManagerModules() {
    console.log('🔧 [BattleUITransition] Forçage affichage modules UIManager...');
    
    const modulesToShow = [
      'inventory', 'team', 'quest', 'questTracker', 
      'chat', 'pokedex', 'options', 'timeWeather'
    ];

    modulesToShow.forEach(moduleId => {
      try {
        const shown = this.uiManager.showModule(moduleId, { animated: true });
        const enabled = this.uiManager.enableModule(moduleId);
        
        if (shown && enabled) {
          console.log(`👁️ [BattleUITransition] Module ${moduleId} restauré via UIManager`);
        } else {
          console.warn(`⚠️ [BattleUITransition] Problème restauration ${moduleId}`);
        }
      } catch (error) {
        console.warn(`⚠️ [BattleUITransition] Erreur restauration ${moduleId}:`, error);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Nettoyage éléments masqués pendant le combat
  cleanupBattleHiddenElements() {
    console.log('🧹 [BattleUITransition] Nettoyage éléments masqués battle...');

    // Restaurer les éléments masqués manuellement
    const battleHiddenElements = document.querySelectorAll('[data-battle-transition-hidden="true"]');
    battleHiddenElements.forEach(element => {
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');
      element.style.removeProperty('opacity');
      element.style.removeProperty('pointer-events');
      element.classList.remove('battle-hidden');
      element.removeAttribute('data-battle-transition-hidden');
    });

    // Fallback hidden elements
    const fallbackHiddenElements = document.querySelectorAll('[data-battle-fallback-hidden="true"]');
    fallbackHiddenElements.forEach(element => {
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');
      element.style.removeProperty('opacity');
      element.classList.remove('battle-hidden-fallback');
      element.removeAttribute('data-battle-fallback-hidden');
    });

    console.log(`🧹 [BattleUITransition] ${battleHiddenElements.length + fallbackHiddenElements.length} éléments nettoyés`);
  }

  // ✅ MÉTHODE FALLBACK: Restauration manuelle si UIManager échoue
  fallbackRestoreWorldInterface() {
    console.log('🔧 [BattleUITransition] Fallback restauration manuelle...');
    
    // Restaurer tous les éléments cachés
    this.cleanupBattleHiddenElements();

    // Restaurer pokemonUISystem si disponible
    if (window.pokemonUISystem && this.previousUIState?.pokemonUISystem) {
      try {
        window.pokemonUISystem.setGameState(
          this.previousUIState.pokemonUISystem.gameState || 'exploration'
        );
      } catch (error) {
        console.warn('⚠️ [BattleUITransition] Erreur restauration pokemonUISystem:', error);
      }
    }

    console.log('🔧 [BattleUITransition] Fallback restauration terminé');
  }

  // === MÉTHODES EXISTANTES (inchangées) ===

  async deactivateBattleScene() {
    console.log('🛑 [BattleUITransition] Désactivation BattleScene...');
    
    try {
      const phaserGame = window.game || window.phaserGame;
      
      if (!phaserGame || !phaserGame.scene) {
        console.warn('⚠️ [BattleUITransition] PhaserGame non disponible');
        return false;
      }
      
      const sceneInstance = phaserGame.scene.getScene('BattleScene');
      
      if (!sceneInstance) {
        console.log('ℹ️ [BattleUITransition] BattleScene non trouvée - déjà supprimée ?');
        return true;
      }
      
      const success = sceneInstance.deactivateForTransition();
      
      if (success) {
        console.log('✅ [BattleUITransition] BattleScene désactivée via deactivateForTransition');
        return true;
      } else {
        console.warn('⚠️ [BattleUITransition] Problème désactivation via deactivateForTransition');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur désactivation BattleScene:', error);
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

    // Restaurer l'interface via UIManager
    if (this.previousUIState) {
      await this.restoreWorldInterfaceWithUIManager();
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
      previousUIState: this.previousUIState,
      hasUIManager: !!this.uiManager
    };
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('💀 [BattleUITransition] Destruction...');

    if (this.isTransitioning || this.battleActive) {
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

// ✅ FONCTION DE TEST CORRIGÉE
window.testBattleUITransitionFixed = function() {
  console.log('🧪 Test transition UI battle avec UIManager intégré...');
  
  const transition = new BattleUITransition(
    window.pokemonUISystem?.uiManager || window.globalUIManager,
    window.gameManager || window.globalNetworkManager
  );
  
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
      console.log('✅ Transition lancée - interface world CACHÉE via UIManager');
      
      // Test retour après 10 secondes
      setTimeout(() => {
        transition.endBattleTransition({ result: 'victory' });
        console.log('✅ Test retour exploration avec restauration UIManager');
      }, 10000);
    } else {
      console.error('❌ Échec transition');
    }
  });
  
  return transition;
};

console.log('✅ [BattleUITransition] Module chargé avec intégration UIManager complète');
console.log('🧪 Utilisez window.testBattleUITransitionFixed() pour tester');
console.log('🎛️ Fonctionnalités:');
console.log('   ✅ Masquage COMPLET via UIManager.setGameState("battle")');
console.log('   ✅ Restauration COMPLÈTE via UIManager.setGameState("exploration")');
console.log('   ✅ Sauvegarde/restauration état de chaque module');
console.log('   ✅ Fallback manuel si UIManager échoue');
console.log('   ✅ Nettoyage automatique des éléments cachés');
console.log('   ✅ Vérification et correction des éléments encore visibles');
