// client/src/battle/BattleUITransition.js - Gestionnaire de transition UI pour le combat
// ✅ PHASE 1: Passage en mode BATTLE pour masquer les icônes et transitions fluides

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

  /**
   * Lance la transition vers le mode combat
   * ✅ ÉTAPE 1: Créer overlay de transition
   * ✅ ÉTAPE 2: Masquer icônes UI progressivement 
   * ✅ ÉTAPE 3: Changer état UI vers 'battle'
   * ✅ ÉTAPE 4: Préparer l'espace pour BattleScene
   */
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

      // ÉTAPE 3: Animation de masquage des icônes UI
      await this.hideUIIconsWithAnimation();

      // ÉTAPE 4: Changer l'état UI vers 'battle'
      await this.setUIToBattleMode();

      // ÉTAPE 5: Préparer l'espace pour la BattleScene
      this.prepareBattleSpace();

      this.battleActive = true;
      this.isTransitioning = false;

      console.log('✅ [BattleUITransition] Transition vers combat terminée');
      
      // Déclencher événement pour BattleIntegration
      this.notifyBattleUIReady();
      
      return true;

    } catch (error) {
      console.error('❌ [BattleUITransition] Erreur transition:', error);
      this.isTransitioning = false;
      await this.cancelTransition();
      return false;
    }
  }

  // === SAUVEGARDE ÉTAT UI ===

  saveCurrentUIState() {
    console.log('💾 [BattleUITransition] Sauvegarde état UI actuel...');
    
    if (window.pokemonUISystem) {
      this.previousUIState = {
        gameState: window.pokemonUISystem.currentGameState,
        moduleStates: new Map()
      };

      // Sauvegarder l'état de chaque module
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

  // === CRÉATION OVERLAY DE TRANSITION ===

  async createTransitionOverlay(encounterData) {
    console.log('🎨 [BattleUITransition] Création overlay de transition...');

    // Supprimer overlay existant
    this.removeTransitionOverlay();

    this.transitionOverlay = document.createElement('div');
    this.transitionOverlay.className = 'battle-transition-overlay';
    this.transitionOverlay.id = 'battleTransitionOverlay';

    // Styles pour transition fluide
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

    // Contenu de transition avec info du Pokémon
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

    // Ajouter styles d'animation
    this.addTransitionStyles();

    // Ajouter au DOM
    document.body.appendChild(this.transitionOverlay);

    // Animation d'apparition
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
      // Forcer le reflow
      this.transitionOverlay.offsetHeight;
      
      // Déclencher l'animation
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

  // === MASQUAGE ICÔNES UI AVEC ANIMATION ===

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

    // Trouver toutes les icônes visibles
    iconSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (window.getComputedStyle(element).display !== 'none') {
          iconsToHide.push(element);
        }
      });
    });

    console.log(`🎯 [BattleUITransition] ${iconsToHide.length} icônes à masquer`);

    if (iconsToHide.length === 0) {
      console.log('ℹ️ [BattleUITransition] Aucune icône à masquer');
      return;
    }

    // Animation de masquage échelonnée
    return new Promise(resolve => {
      let hiddenCount = 0;

      iconsToHide.forEach((icon, index) => {
        setTimeout(() => {
          // Appliquer classe d'animation
          icon.classList.add('ui-icon-hiding');
          
          // Masquer complètement après l'animation
          setTimeout(() => {
            icon.classList.add('ui-icon-hidden');
            icon.classList.remove('ui-icon-hiding');
            
            hiddenCount++;
            if (hiddenCount === iconsToHide.length) {
              console.log('✅ [BattleUITransition] Toutes les icônes masquées');
              resolve();
            }
          }, 400); // Durée de l'animation CSS
          
        }, index * 100); // Délai échelonné entre chaque icône
      });
    });
  }

  // === CHANGEMENT ÉTAT UI ===

  async setUIToBattleMode() {
    console.log('🎮 [BattleUITransition] Passage en mode battle UI...');

    if (window.pokemonUISystem && window.pokemonUISystem.setGameState) {
      try {
        const success = window.pokemonUISystem.setGameState('battle', {
          animated: false, // Pas d'animation car on gère manuellement
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

    // Fallback : masquage manuel si le système UI n'est pas dispo
    this.fallbackHideAllUI();
  }

  fallbackHideAllUI() {
    console.log('🔧 [BattleUITransition] Fallback masquage UI manuel...');
    
    const allUISelectors = [
      '.ui-icon', '.game-icon', '.interface-icon',
      '#inventory-icon', '#team-icon', '#quest-icon',
      '.inventory-ui', '.team-ui', '.quest-ui',
      '#questTracker', '#chat', '.chat-container'
    ];

    allUISelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.display = 'none';
      });
    });
  }

  // === PRÉPARATION ESPACE BATTLE ===

  prepareBattleSpace() {
    console.log('🏗️ [BattleUITransition] Préparation espace battle...');

    // Désactiver interactions avec le monde
    if (this.gameManager?.pauseWorldInteractions) {
      this.gameManager.pauseWorldInteractions();
    }

    // Désactiver mouvement du joueur
    if (this.gameManager?.player?.setMovementEnabled) {
      this.gameManager.player.setMovementEnabled(false);
    }

    // Préparer le canvas/DOM pour la BattleScene
    const gameCanvas = document.querySelector('#game-canvas, canvas');
    if (gameCanvas) {
      // Ajouter classe pour signaler mode battle
      gameCanvas.classList.add('battle-mode-active');
    }

    console.log('✅ [BattleUITransition] Espace battle préparé');
  }

  // === NOTIFICATION SYSTÈME PRÊT ===

  notifyBattleUIReady() {
    console.log('📢 [BattleUITransition] Notification système prêt...');

    // Événement personnalisé pour BattleIntegration
    window.dispatchEvent(new CustomEvent('battleUITransitionComplete', {
      detail: {
        ready: true,
        transitionDuration: 800,
        previousUIState: this.previousUIState
      }
    }));

    // Callback pour BattleIntegration si définie
    if (window.battleSystem?.onUITransitionComplete) {
      window.battleSystem.onUITransitionComplete(this.previousUIState);
    }

    console.log('✅ [BattleUITransition] Notifications envoyées');
  }

  // === TRANSITION DE RETOUR ===

  /**
   * Restaure l'UI normale après le combat
   */
  async endBattleTransition(battleResult = {}) {
    if (!this.battleActive) {
      console.warn('⚠️ [BattleUITransition] Pas en mode battle');
      return false;
    }

    console.log('🏁 [BattleUITransition] === RETOUR EXPLORATION ===');
    console.log('📊 Résultat battle:', battleResult);

    this.isTransitioning = true;

    try {
      // ÉTAPE 1: Animation de fin (optionnelle)
      await this.showBattleEndAnimation(battleResult);

      // ÉTAPE 2: Restaurer l'état UI précédent
      await this.restorePreviousUIState();

      // ÉTAPE 3: Réafficher les icônes avec animation
      await this.showUIIconsWithAnimation();

      // ÉTAPE 4: Nettoyer l'overlay de transition
      await this.removeTransitionOverlay();

      // ÉTAPE 5: Réactiver les interactions
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
      // Changer le contenu pour le résultat
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

      // Animation du résultat
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async restorePreviousUIState() {
    console.log('🔄 [BattleUITransition] Restauration état UI...');

    if (!this.previousUIState) {
      console.warn('⚠️ [BattleUITransition] Pas d\'état précédent sauvegardé');
      return;
    }

    // Restaurer l'état de jeu
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

  async showUIIconsWithAnimation() {
    console.log('👁️ [BattleUITransition] Réaffichage animé des icônes...');

    // Supprimer les classes de masquage
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
          // Retirer classe de masquage
          icon.classList.remove('ui-icon-hidden');
          
          // Animation d'apparition
          icon.style.opacity = '0';
          icon.style.transform = 'scale(0.5)';
          icon.style.display = '';
          
          // Forcer reflow puis animer
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

    // Réactiver les interactions
    if (this.gameManager?.resumeWorldInteractions) {
      this.gameManager.resumeWorldInteractions();
    }

    // Réactiver le mouvement
    if (this.gameManager?.player?.setMovementEnabled) {
      this.gameManager.player.setMovementEnabled(true);
    }

    // Retirer classe battle du canvas
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

    // Restaurer l'état si possible
    if (this.previousUIState) {
      await this.restorePreviousUIState();
      await this.showUIIconsWithAnimation();
    }

    // Nettoyer
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

    // Annuler toute transition en cours
    if (this.isTransitioning) {
      this.cancelTransition();
    }

    // Nettoyer l'overlay
    this.removeTransitionOverlay();

    // Nettoyer les styles
    const styles = document.querySelector('#battle-transition-styles');
    if (styles) {
      styles.remove();
    }

    // Réinitialiser les propriétés
    this.uiManager = null;
    this.gameManager = null;
    this.previousUIState = null;
    this.battleActive = false;
    this.isTransitioning = false;

    console.log('✅ [BattleUITransition] Détruit');
  }
}

// === INTÉGRATION GLOBALE ===

// Exposer globalement pour les tests
window.BattleUITransition = BattleUITransition;

// Fonction de création globale
window.createBattleUITransition = function(uiManager, gameManager) {
  return new BattleUITransition(uiManager, gameManager);
};

// Fonctions de test globales
window.testBattleUITransition = function() {
  console.log('🧪 Test transition UI battle...');
  
  const transition = new BattleUITransition(
    window.pokemonUISystem?.uiManager,
    window.gameManager || window.globalNetworkManager
  );
  
  // Test transition vers combat
  transition.startBattleTransition({
    pokemon: { name: 'Pikachu', level: 5 },
    location: 'test_zone'
  }).then(success => {
    if (success) {
      console.log('✅ Transition vers combat OK');
      
      // Test retour après 3 secondes
      setTimeout(() => {
        transition.endBattleTransition({
          result: 'victory',
          experience: 50
        }).then(returned => {
          if (returned) {
            console.log('✅ Retour exploration OK');
          }
        });
      }, 3000);
    }
  });
  
  return transition;
};

console.log('✅ [BattleUITransition] Module chargé');
console.log('🧪 Utilisez window.testBattleUITransition() pour tester');
