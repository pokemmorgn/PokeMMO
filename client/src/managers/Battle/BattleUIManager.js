// client/src/managers/Battle/BattleUIManager.js
// Gestionnaire de l'interface utilisateur de combat

export class BattleUIManager {
  constructor(scene) {
    this.scene = scene;
    
    // Éléments UI
    this.actionInterface = null;
    this.actionMessageText = null;
    this.battleDialog = null;
    this.dialogText = null;
    
    // État
    this.interfaceMode = 'hidden'; // 'hidden', 'message', 'buttons'
    this.previousUIState = null;
    
    // Configuration layout
    this.layout = {
      actionInterface: {
        x: -420, // offset depuis la droite
        y: -180, // offset depuis le bas
        width: 380,
        height: 160
      },
      battleDialog: {
        height: 80,
        marginX: 20,
        marginY: 100 // depuis le bas
      }
    };
    
    console.log('🎮 [BattleUIManager] Initialisé');
  }

  // === INITIALISATION ===

  /**
   * Crée tous les éléments d'interface
   */
  create() {
    this.createActionInterface();
    this.createBattleDialog();
    console.log('✅ [BattleUIManager] Interface créée');
  }

  /**
   * Crée l'interface d'actions (boutons et messages)
   */
  createActionInterface() {
    const { width, height } = this.scene.cameras.main;
    
    // Conteneur principal à droite
    this.actionInterface = this.scene.add.container(
      width + this.layout.actionInterface.x, 
      height + this.layout.actionInterface.y
    );
    
    // Panel principal
    const mainPanel = this.scene.add.graphics();
    mainPanel.fillStyle(0x1a1a1a, 0.95);
    mainPanel.fillRoundedRect(20, 0, this.layout.actionInterface.width, this.layout.actionInterface.height, 16);
    mainPanel.lineStyle(4, 0x4A90E2, 1);
    mainPanel.strokeRoundedRect(20, 0, this.layout.actionInterface.width, this.layout.actionInterface.height, 16);
    this.actionInterface.add(mainPanel);
    
    // Zone de texte unifiée
    this.actionMessageText = this.scene.add.text(200, 80, '', {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: { width: 340 }
    });
    this.actionMessageText.setOrigin(0.5, 0.5);
    this.actionMessageText.setVisible(false);
    this.actionInterface.add(this.actionMessageText);
    
    // Créer les boutons d'action
    this.createActionButtons();
    
    this.actionInterface.setDepth(200);
    this.actionInterface.setVisible(false);
  }

  /**
   * Crée les 4 boutons d'action principaux
   */
  createActionButtons() {
    const actions = [
      { key: 'attack', text: 'Attaque', color: 0xE74C3C, icon: '⚔️' },
      { key: 'bag', text: 'Sac', color: 0x9B59B6, icon: '🎒' },
      { key: 'pokemon', text: 'Pokémon', color: 0x3498DB, icon: '🔄' },
      { key: 'run', text: 'Fuite', color: 0x95A5A6, icon: '🏃' }
    ];
    
    const startX = 40;
    const startY = 40;
    const buttonWidth = 160;
    const buttonHeight = 50;
    const gap = 15;
    
    actions.forEach((action, index) => {
      const x = startX + (index % 2) * (buttonWidth + gap);
      const y = startY + Math.floor(index / 2) * (buttonHeight + 15);
      
      const button = this.createActionButton(x, y, { width: buttonWidth, height: buttonHeight }, action);
      this.actionInterface.add(button);
    });
  }

  /**
   * Crée un bouton d'action individuel
   */
  createActionButton(x, y, config, action) {
    const buttonContainer = this.scene.add.container(x, y);
    
    // Background du bouton
    const bg = this.scene.add.graphics();
    bg.fillStyle(action.color, 0.8);
    bg.fillRoundedRect(0, 0, config.width, config.height, 12);
    bg.lineStyle(2, 0xFFFFFF, 0.8);
    bg.strokeRoundedRect(0, 0, config.width, config.height, 12);
    
    // Icône
    const icon = this.scene.add.text(20, config.height/2, action.icon, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    });
    icon.setOrigin(0, 0.5);
    
    // Texte
    const text = this.scene.add.text(55, config.height/2, action.text, {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    text.setOrigin(0, 0.5);
    
    buttonContainer.add([bg, icon, text]);
    buttonContainer.setSize(config.width, config.height);
    buttonContainer.setInteractive();
    
    // Effets hover
    this.setupButtonEffects(buttonContainer, bg, action, config);
    
    // Action clic
    buttonContainer.on('pointerdown', () => {
      this.scene.events.emit('actionButtonClicked', action.key);
    });
    
    return buttonContainer;
  }

  /**
   * Configure les effets visuels des boutons
   */
  setupButtonEffects(buttonContainer, bg, action, config) {
    buttonContainer.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(action.color, 1);
      bg.fillRoundedRect(0, 0, config.width, config.height, 12);
      bg.lineStyle(3, 0xFFD700, 1);
      bg.strokeRoundedRect(0, 0, config.width, config.height, 12);
      
      this.scene.tweens.add({
        targets: buttonContainer,
        scaleX: 1.05, scaleY: 1.05,
        duration: 100
      });
    });
    
    buttonContainer.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(action.color, 0.8);
      bg.fillRoundedRect(0, 0, config.width, config.height, 12);
      bg.lineStyle(2, 0xFFFFFF, 0.8);
      bg.strokeRoundedRect(0, 0, config.width, config.height, 12);
      
      this.scene.tweens.add({
        targets: buttonContainer,
        scaleX: 1, scaleY: 1,
        duration: 100
      });
    });
  }

  /**
   * Crée le dialogue de combat (messages narratifs)
   */
  createBattleDialog() {
    const { width, height } = this.scene.cameras.main;
    
    this.battleDialog = this.scene.add.container(0, height - this.layout.battleDialog.marginY);
    
    // Panel de dialogue
    const dialogPanel = this.scene.add.graphics();
    dialogPanel.fillStyle(0x000000, 0.9);
    dialogPanel.fillRoundedRect(
      this.layout.battleDialog.marginX, 
      0, 
      width - (this.layout.battleDialog.marginX * 2), 
      this.layout.battleDialog.height, 
      12
    );
    dialogPanel.lineStyle(3, 0xFFFFFF, 0.8);
    dialogPanel.strokeRoundedRect(
      this.layout.battleDialog.marginX, 
      0, 
      width - (this.layout.battleDialog.marginX * 2), 
      this.layout.battleDialog.height, 
      12
    );
    
    // Texte du dialogue
    this.dialogText = this.scene.add.text(40, this.layout.battleDialog.height/2, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      wordWrap: { width: width - 80 }
    });
    this.dialogText.setOrigin(0, 0.5);
    
    this.battleDialog.add([dialogPanel, this.dialogText]);
    this.battleDialog.setDepth(150);
    this.battleDialog.setVisible(false);
  }

  // === GESTION DES MESSAGES ===

  /**
   * Affiche un message dans l'interface d'action
   */
  showActionMessage(message) {
    if (!this.actionInterface || !this.actionMessageText) {
      console.warn('⚠️ [BattleUIManager] Interface d\'action non disponible');
      return;
    }
    
    console.log(`💬 [BattleUIManager] Message d'action: ${message}`);
    
    this.hideActionButtons();
    this.actionMessageText.setText(message);
    this.actionMessageText.setVisible(true);
    
    if (!this.actionInterface.visible) {
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(0);
      this.scene.tweens.add({
        targets: this.actionInterface,
        alpha: 1,
        duration: 400,
        ease: 'Power2.easeOut'
      });
    }
    
    this.interfaceMode = 'message';
  }

  /**
   * Masque le message d'action
   */
  hideActionMessage() {
    if (!this.actionMessageText) return;
    this.actionMessageText.setVisible(false);
    this.interfaceMode = 'hidden';
  }

  /**
   * Affiche un message dans le dialogue de combat
   */
  showBattleMessage(message, duration = 0) {
    if (!this.battleDialog || !this.dialogText) {
      console.warn('⚠️ [BattleUIManager] Dialogue de combat non disponible');
      return;
    }
    
    console.log(`💬 [BattleUIManager] Message de combat: ${message}`);
    
    this.dialogText.setText(message);
    this.battleDialog.setVisible(true);
    this.battleDialog.setAlpha(0);
    
    this.scene.tweens.add({
      targets: this.battleDialog,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut'
    });
    
    // Auto-masquage si durée spécifiée
    if (duration > 0) {
      setTimeout(() => {
        this.hideBattleMessage();
      }, duration);
    }
  }

  /**
   * Masque le dialogue de combat
   */
  hideBattleMessage() {
    if (!this.battleDialog) return;
    
    this.scene.tweens.add({
      targets: this.battleDialog,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.battleDialog.setVisible(false);
      }
    });
  }

  // === GESTION DES BOUTONS ===

  /**
   * Affiche les boutons d'action
   */
  showActionButtons() {
    this.hideActionMessage();
    
    if (this.actionInterface) {
      // Afficher tous les boutons (sauf le panel principal et le texte)
      this.actionInterface.list.forEach(child => {
        if (child !== this.actionInterface.list[0] && child !== this.actionMessageText) {
          child.setVisible(true);
        }
      });
      
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(1);
    }
    
    this.interfaceMode = 'buttons';
    console.log('🎯 [BattleUIManager] Boutons d\'action affichés');
  }

  /**
   * Masque les boutons d'action
   */
  hideActionButtons() {
    if (!this.actionInterface) return;
    
    // Masquer tous les boutons (garder le panel principal et le texte)
    this.actionInterface.list.forEach(child => {
      if (child !== this.actionInterface.list[0] && child !== this.actionMessageText) {
        child.setVisible(false);
      }
    });
    
    console.log('🙈 [BattleUIManager] Boutons d\'action masqués');
  }

  /**
   * Active/désactive un bouton spécifique
   */
  setButtonEnabled(buttonKey, enabled) {
    // TODO: Implémenter la logique de désactivation de boutons spécifiques
    console.log(`🔧 [BattleUIManager] ${buttonKey} ${enabled ? 'activé' : 'désactivé'}`);
  }

  // === GESTION DU STATE UI GLOBAL ===

  /**
   * Active l'UI de combat (masque l'UI d'exploration)
   */
  activateBattleUI() {
    console.log('🎮 [BattleUIManager] Activation UI de combat...');
    
    if (window.pokemonUISystem?.setGameState) {
      try {
        this.previousUIState = {
          gameState: window.pokemonUISystem.currentGameState || 'exploration',
          timestamp: Date.now()
        };
        
        const success = window.pokemonUISystem.setGameState('battle', {
          animated: true,
          force: true
        });
        
        if (success) {
          console.log('✅ [BattleUIManager] État UI changé vers "battle"');
          return true;
        } else {
          console.warn('⚠️ [BattleUIManager] Échec changement état UI');
          return this.fallbackHideUI();
        }
      } catch (error) {
        console.error('❌ [BattleUIManager] Erreur UIManager:', error);
        return this.fallbackHideUI();
      }
    } else {
      console.warn('⚠️ [BattleUIManager] PokemonUISystem non disponible');
      return this.fallbackHideUI();
    }
  }

  /**
   * Désactive l'UI de combat (restaure l'UI d'exploration)
   */
  deactivateBattleUI() {
    console.log('🎮 [BattleUIManager] Désactivation UI de combat...');
    
    if (window.pokemonUISystem?.setGameState && this.previousUIState) {
      try {
        const targetState = this.previousUIState.gameState || 'exploration';
        const success = window.pokemonUISystem.setGameState(targetState, {
          animated: true
        });
        
        if (success) {
          console.log(`✅ [BattleUIManager] État UI restauré: ${targetState}`);
          this.previousUIState = null;
          return true;
        }
      } catch (error) {
        console.error('❌ [BattleUIManager] Erreur restauration UIManager:', error);
      }
    }
    
    return this.fallbackRestoreUI();
  }

  /**
   * Fallback: masquage manuel des éléments UI
   */
  fallbackHideUI() {
    console.log('🔧 [BattleUIManager] Fallback masquage UI...');
    
    const elementsToHide = [
      '#inventory-icon', '#team-icon', '#quest-icon', 
      '#questTracker', '#quest-tracker', '#chat',
      '.ui-icon', '.game-icon', '.quest-tracker'
    ];
    
    let hiddenCount = 0;
    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (window.getComputedStyle(el).display !== 'none') {
          el.style.display = 'none';
          el.setAttribute('data-battle-hidden', 'true');
          hiddenCount++;
        }
      });
    });
    
    console.log(`🙈 [BattleUIManager] ${hiddenCount} éléments masqués manuellement`);
    return hiddenCount > 0;
  }

  /**
   * Fallback: restauration manuelle des éléments UI
   */
  fallbackRestoreUI() {
    console.log('🔧 [BattleUIManager] Fallback restauration UI...');
    
    const hiddenElements = document.querySelectorAll('[data-battle-hidden="true"]');
    let restoredCount = 0;
    
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-battle-hidden');
      restoredCount++;
    });
    
    console.log(`👁️ [BattleUIManager] ${restoredCount} éléments restaurés manuellement`);
    return restoredCount > 0;
  }

  // === GETTERS ===

  /**
   * Obtient le mode d'interface actuel
   */
  getInterfaceMode() {
    return this.interfaceMode;
  }

  /**
   * Vérifie si l'interface est visible
   */
  isInterfaceVisible() {
    return this.actionInterface?.visible || false;
  }

  /**
   * Vérifie si les boutons sont affichés
   */
  areButtonsVisible() {
    return this.interfaceMode === 'buttons';
  }

  /**
   * Vérifie si un message est affiché
   */
  isMessageVisible() {
    return this.interfaceMode === 'message';
  }

  // === UTILITAIRES ===

  /**
   * Cache complètement l'interface
   */
  hideInterface() {
    this.hideActionMessage();
    this.hideActionButtons();
    this.hideBattleMessage();
    
    if (this.actionInterface) {
      this.actionInterface.setVisible(false);
    }
    
    this.interfaceMode = 'hidden';
  }

  /**
   * Affiche l'interface avec animation
   */
  showInterface() {
    if (this.actionInterface) {
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(0);
      
      this.scene.tweens.add({
        targets: this.actionInterface,
        alpha: 1,
        duration: 400,
        ease: 'Power2.easeOut'
      });
    }
  }

  /**
   * Redimensionne l'interface si nécessaire
   */
  resize() {
    const { width, height } = this.scene.cameras.main;
    
    // Repositionner l'interface d'action
    if (this.actionInterface) {
      this.actionInterface.setPosition(
        width + this.layout.actionInterface.x,
        height + this.layout.actionInterface.y
      );
    }
    
    // Repositionner le dialogue
    if (this.battleDialog) {
      this.battleDialog.setPosition(0, height - this.layout.battleDialog.marginY);
      
      // Redimensionner le panel de dialogue
      const dialogPanel = this.battleDialog.list[0];
      if (dialogPanel) {
        dialogPanel.clear();
        dialogPanel.fillStyle(0x000000, 0.9);
        dialogPanel.fillRoundedRect(
          this.layout.battleDialog.marginX, 
          0, 
          width - (this.layout.battleDialog.marginX * 2), 
          this.layout.battleDialog.height, 
          12
        );
        dialogPanel.lineStyle(3, 0xFFFFFF, 0.8);
        dialogPanel.strokeRoundedRect(
          this.layout.battleDialog.marginX, 
          0, 
          width - (this.layout.battleDialog.marginX * 2), 
          this.layout.battleDialog.height, 
          12
        );
      }
      
      // Redimensionner le texte
      if (this.dialogText) {
        this.dialogText.setWordWrapWidth(width - 80);
      }
    }
  }

  // === NETTOYAGE ===

  /**
   * Détruit le manager
   */
  destroy() {
    console.log('💀 [BattleUIManager] Destruction...');
    
    // Restaurer l'UI d'exploration
    this.deactivateBattleUI();
    
    // Détruire les conteneurs
    if (this.actionInterface) {
      this.actionInterface.destroy();
      this.actionInterface = null;
    }
    
    if (this.battleDialog) {
      this.battleDialog.destroy();
      this.battleDialog = null;
    }
    
    // Nettoyer les références
    this.actionMessageText = null;
    this.dialogText = null;
    this.scene = null;
    this.previousUIState = null;
    
    console.log('✅ [BattleUIManager] Détruit');
  }
}
