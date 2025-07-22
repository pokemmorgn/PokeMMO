// client/src/components/DialogueManager.js
// 🎭 Gestionnaire logique pour les dialogues NPCs - Version avec Actions Contextuelles
// ✅ Gestion dialogue classique + actions contextuelles + interface unifiée
// ✅ Intégration avec ShopSystem, QuestSystem, etc.
// ✅ Remplacement des fonctions globales de index.html

import { DialogueUI } from './DialogueUI.js';

export class DialogueManager {
  constructor() {
    this.dialogueUI = null;
    this.isInitialized = false;
    this.currentDialogueData = null;
    this.currentMode = null; // 'classic' | 'unified'
    
    // État du dialogue classique
    this.classicState = {
      lines: [],
      currentPage: 0,
      onClose: null,
      actions: [] // 🆕 NOUVEAU: Actions disponibles
    };
    
    // État de l'interface unifiée
    this.unifiedState = {
      tabs: [],
      currentTab: null,
      tabData: {},
      npcData: {},
      onTabSwitch: null,
      onClose: null
    };
    
    // Systèmes intégrés
    this.shopSystem = null;
    this.questSystem = null;
    this.inventorySystem = null;
    
    console.log('🎭 DialogueManager créé avec support actions');
    this.init();
  }

  // ===== INITIALISATION =====
  
  async init() {
    try {
      // Créer l'interface utilisateur
      this.dialogueUI = new DialogueUI();
      
      // Configurer les callbacks de l'UI
      this.setupUICallbacks();
      
      // Intégrer avec les autres systèmes
      this.integrateWithSystems();
      
      // Configurer l'API globale
      this.setupGlobalAPI();
      
      // Remplacer les fonctions globales existantes
      this.replaceGlobalFunctions();
      
      this.isInitialized = true;
      console.log('✅ DialogueManager initialisé avec actions');
      
    } catch (error) {
      console.error('❌ Erreur initialisation DialogueManager:', error);
    }
  }

  setupUICallbacks() {
    if (!this.dialogueUI) return;

    // Callback pour l'avancement des dialogues classiques
    this.dialogueUI.onDialogueAdvance = () => {
      this.advanceClassicDialogue();
    };

    console.log('✅ Callbacks UI configurés');
  }

  integrateWithSystems() {
    // Références aux systèmes existants
    this.shopSystem = window.shopSystem || null;
    this.questSystem = window.questSystem || null;
    this.inventorySystem = window.inventorySystem || null;
    
    // Surveiller l'apparition de nouveaux systèmes
    this.watchForSystems();
    
    console.log('🔗 Intégration systèmes:', {
      shop: !!this.shopSystem,
      quest: !!this.questSystem,
      inventory: !!this.inventorySystem
    });
  }

  watchForSystems() {
    // Observer l'ajout de nouveaux systèmes
    const checkSystems = () => {
      if (!this.shopSystem && window.shopSystem) {
        this.shopSystem = window.shopSystem;
        console.log('🔗 ShopSystem connecté');
      }
      if (!this.questSystem && window.questSystem) {
        this.questSystem = window.questSystem;
        console.log('🔗 QuestSystem connecté');
      }
      if (!this.inventorySystem && window.inventorySystem) {
        this.inventorySystem = window.inventorySystem;
        console.log('🔗 InventorySystem connecté');
      }
    };

    // Vérifier toutes les 2 secondes
    setInterval(checkSystems, 2000);
  }

  setupGlobalAPI() {
    // API globale pour les autres modules
    window.dialogueManager = this;
    
    // Raccourcis pour compatibilité
    window.showDialogue = (data) => this.show(data);
    window.hideDialogue = () => this.hide();
    window.isDialogueOpen = () => this.isOpen();
    
    console.log('🌍 API globale DialogueManager configurée');
  }

  replaceGlobalFunctions() {
    // Remplacer showNpcDialogue de index.html
    window.showNpcDialogue = (data) => {
      console.log('🎭 showNpcDialogue appelé via DialogueManager:', data);
      this.show(data);
    };

    // Remplacer les fonctions de dialogue
    window.advanceDialogue = () => {
      this.advanceClassicDialogue();
    };

    window.closeDialogue = () => {
      this.hide();
    };

    console.log('🔄 Fonctions globales remplacées');
  }

  // ===== AFFICHAGE DES DIALOGUES =====

  show(data) {
    if (!data) {
      console.warn('⚠️ Données de dialogue manquantes');
      return;
    }

    console.log('🎭 DialogueManager.show:', data);

    // Fermer le dialogue précédent si nécessaire
    if (this.isOpen()) {
      this.hide();
    }

    // Stocker les données
    this.currentDialogueData = data;

    // Déterminer le mode
    if (data.isUnifiedInterface) {
      this.showUnifiedInterface(data);
    } else {
      this.showClassicDialogue(data);
    }
  }

  // 🆕 MÉTHODE MODIFIÉE: Logique claire pour les actions
  showClassicDialogue(data) {
    console.log('🎭 Affichage dialogue avec détection actions');
    
    this.currentMode = 'classic';
    
    // Préparer les données pour l'UI
    const lines = Array.isArray(data.lines) && data.lines.length ? data.lines : [data.text || ""];
    
    // 🆕 NOUVEAU: Détecter et préparer les actions
    const actions = this.detectAvailableActions(data);
    
    // Configurer l'état interne
    this.classicState = {
      lines: lines,
      currentPage: 0,
      onClose: data.onClose,
      actions: actions // Stocker les actions
    };

    // Préparer les données complètes pour l'UI
    const dialogueDataWithActions = {
      ...data,
      lines: lines,
      actions: actions
    };

    // 🔧 CORRECTION: Logique claire selon les actions
    if (actions && actions.length > 0) {
      console.log(`✅ ${actions.length} actions détectées - affichage avec zone d'actions`);
      this.dialogueUI.showDialogueWithActions(dialogueDataWithActions);
    } else {
      console.log('✅ Aucune action - dialogue simple sans zone d\'actions');
      this.dialogueUI.showClassicDialogue(dialogueDataWithActions);
    }

    // Configurer le callback pour les actions (seulement si nécessaire)
    if (actions && actions.length > 0) {
      this.dialogueUI.onActionClick = (action) => {
        this.handleDialogueAction(action, data);
      };
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Détecter les actions disponibles
  detectAvailableActions(data) {
    const actions = [];
    
    // Détecter selon les capabilities ou le type de données
    const capabilities = data.capabilities || data.unifiedInterface?.capabilities || [];
    const npcType = data.npcType || data.type;
    
    console.log('🔍 Détection actions pour:', { 
      name: data.name,
      capabilities, 
      npcType, 
      hasShopData: !!data.shopData,
      hasQuestData: !!data.questData,
      hasHealerData: !!data.healerData
    });
    
    // Action Boutique
    if (capabilities.includes('merchant') || npcType === 'merchant' || data.shopData || data.shopId) {
      actions.push({
        id: 'open_shop',
        type: 'shop',
        label: 'Boutique',
        icon: '🛒',
        description: 'Acheter et vendre des objets',
        data: data.shopData || data.merchantData
      });
    }
    
    // Action Quêtes
    if (capabilities.includes('questGiver') || npcType === 'questGiver' || data.questData || data.questId) {
      const questData = data.questData || data.questGiver || {};
      const questCount = questData.availableQuests?.length || (data.questId ? 1 : 0);
      
      actions.push({
        id: 'open_quests',
        type: 'quest',
        label: questCount > 1 ? 'Quêtes' : 'Quête',
        icon: '📋',
        badge: questCount > 0 ? questCount.toString() : null,
        description: 'Missions disponibles',
        data: questData
      });
    }
    
    // Action Soins
    if (capabilities.includes('healer') || npcType === 'healer' || data.healerData) {
      actions.push({
        id: 'heal_pokemon',
        type: 'heal',
        label: 'Soigner',
        icon: '💊',
        description: 'Soigner vos Pokémon',
        data: data.healerData
      });
    }
    
    // Action Informations (si des données supplémentaires)
    if (data.infoData || (data.tabData && data.tabData.info)) {
      actions.push({
        id: 'show_info',
        type: 'info',
        label: 'Infos',
        icon: 'ℹ️',
        description: 'Informations supplémentaires',
        data: data.infoData || data.tabData.info
      });
    }
    
    if (actions.length === 0) {
      console.log('✅ Aucune action détectée - NPC dialogue simple');
      return []; // ✅ Retourner tableau vide explicitement
    } else {
      console.log(`✅ ${actions.length} actions détectées:`, actions.map(a => a.label));
      return actions;
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Gérer les clics sur actions
  handleDialogueAction(action, originalData) {
    console.log(`🎯 Exécution action: ${action.id} (${action.type})`);
    
    // Fermer le dialogue actuel
    this.hide();
    
    // Délai court pour la transition
    setTimeout(() => {
      switch (action.type) {
        case 'shop':
          this.handleShopAction(action, originalData);
          break;
          
        case 'quest':
          this.handleQuestAction(action, originalData);
          break;
          
        case 'heal':
          this.handleHealAction(action, originalData);
          break;
          
        case 'info':
          this.handleInfoAction(action, originalData);
          break;
          
        default:
          console.warn(`Action non gérée: ${action.type}`);
          this.handleGenericAction(action, originalData);
          break;
      }
    }, 200);
  }

  // 🆕 NOUVELLES MÉTHODES: Gestion des actions spécifiques
  handleShopAction(action, originalData) {
    console.log('🛒 Ouverture boutique...');
    
    if (this.shopSystem && this.shopSystem.openShop) {
      // Déléguer au ShopSystem
      const shopData = {
        ...originalData,
        shopData: action.data,
        fromDialogueAction: true
      };
      this.shopSystem.openShop(shopData);
    } else {
      // Fallback vers interface unifiée
      this.showUnifiedInterfaceForAction('shop', action, originalData);
    }
  }

  handleQuestAction(action, originalData) {
    console.log('📋 Ouverture journal quêtes...');
    
    if (this.questSystem && this.questSystem.openQuestJournal) {
      // Déléguer au QuestSystem
      this.questSystem.openQuestJournal(action.data);
    } else {
      // Fallback vers interface unifiée
      this.showUnifiedInterfaceForAction('quest', action, originalData);
    }
  }

  handleHealAction(action, originalData) {
    console.log('💊 Démarrage soins...');
    
    // Action directe de soin
    if (window.globalNetworkManager && window.globalNetworkManager.room) {
      window.globalNetworkManager.room.send('healPokemon', {
        npcId: originalData.npcId,
        healType: 'full'
      });
      
      // Feedback utilisateur
      window.showGameNotification?.('Vos Pokémon sont soignés !', 'success', {
        duration: 2000,
        position: 'top-center'
      });
    }
  }

  handleInfoAction(action, originalData) {
    console.log('ℹ️ Affichage informations...');
    
    // Fallback vers interface unifiée pour les infos
    this.showUnifiedInterfaceForAction('info', action, originalData);
  }

  handleGenericAction(action, originalData) {
    console.log('🔧 Action générique...');
    
    // Fallback universel
    this.showUnifiedInterfaceForAction(action.type, action, originalData);
  }

  // 🆕 NOUVELLE MÉTHODE: Fallback pour interface unifiée
  showUnifiedInterfaceForAction(targetTab, action, originalData) {
    console.log(`🎭 Fallback interface unifiée pour: ${targetTab}`);
    
    // Construire les données d'interface unifiée
    const unifiedData = {
      ...originalData,
      isUnifiedInterface: true,
      tabs: this.generateTabsFromAction(action, originalData),
      defaultTab: targetTab,
      tabData: {
        [targetTab]: action.data
      },
      fromDialogueAction: true,
      sourceAction: action
    };
    
    // Afficher l'interface unifiée
    this.showUnifiedInterface(unifiedData);
  }

  generateTabsFromAction(action, originalData) {
    // Générer les onglets basés sur l'action + données disponibles
    const tabs = [];
    
    // Toujours inclure l'onglet de l'action
    tabs.push({
      id: action.type,
      label: action.label,
      icon: action.icon,
      description: action.description
    });
    
    // Ajouter dialogue si pas la seule option
    tabs.push({
      id: 'dialogue',
      label: 'Discussion',
      icon: '💬',
      description: 'Parler avec le PNJ'
    });
    
    return tabs;
  }

  showUnifiedInterface(data) {
    console.log('🎭 Affichage interface unifiée');
    
    this.currentMode = 'unified';
    
    // Configurer l'état interne
    this.unifiedState = {
      tabs: data.tabs || [],
      currentTab: null,
      tabData: data.tabData || {},
      npcData: {
        name: data.name || 'Unknown NPC',
        title: data.title || 'Villager',
        portrait: data.portrait || null
      },
      onTabSwitch: (tabId) => this.handleTabSwitch(tabId),
      onClose: data.onClose
    };

    // Préparer les données pour l'UI
    const uiData = {
      ...data,
      onTabSwitch: this.unifiedState.onTabSwitch,
      onClose: () => this.hide()
    };

    // Afficher via l'UI
    this.dialogueUI.showUnifiedInterface(uiData);
  }

  // ===== GESTION DES ONGLETS (INTERFACE UNIFIÉE) =====

  handleTabSwitch(tabId) {
    console.log(`🎭 Changement d'onglet: ${tabId}`);
    
    this.unifiedState.currentTab = tabId;
    
    // Charger le contenu de l'onglet
    this.loadTabContent(tabId);
    
    // Appeler le callback original si fourni
    if (this.currentDialogueData.onTabSwitch && typeof this.currentDialogueData.onTabSwitch === 'function') {
      this.currentDialogueData.onTabSwitch(tabId);
    }
  }

  async loadTabContent(tabId) {
    console.log(`📄 Chargement contenu onglet: ${tabId}`);

    try {
      switch (tabId) {
        case 'dialogue':
          this.loadDialogueTabContent();
          break;
          
        case 'shop':
        case 'merchant':
          await this.loadShopTabContent();
          break;
          
        case 'quest':
        case 'quests':
          await this.loadQuestTabContent();
          break;
          
        case 'info':
        case 'information':
          this.loadInfoTabContent();
          break;
          
        case 'trade':
          this.loadTradeTabContent();
          break;
          
        case 'battle':
          this.loadBattleTabContent();
          break;
          
        default:
          this.loadGenericTabContent(tabId);
          break;
      }
    } catch (error) {
      console.error(`❌ Erreur chargement onglet ${tabId}:`, error);
      this.loadErrorTabContent(tabId, error);
    }
  }

  loadDialogueTabContent() {
    const dialogueData = this.unifiedState.tabData.dialogue || {};
    const lines = dialogueData.lines || [dialogueData.text || "Bonjour !"];
    
    const html = `
      <div class="dialogue-content">
        <div class="dialogue-speaker">${this.unifiedState.npcData.name}</div>
        <div class="dialogue-text">${lines[0]}</div>
        ${lines.length > 1 ? `
          <div class="dialogue-pagination">
            <button class="dialogue-nav-btn" onclick="window.dialogueManager.prevDialoguePage()" disabled>◀ Précédent</button>
            <span class="dialogue-page-info">1 / ${lines.length}</span>
            <button class="dialogue-nav-btn" onclick="window.dialogueManager.nextDialoguePage()">Suivant ▶</button>
          </div>
        ` : ''}
      </div>
    `;
    
    this.dialogueUI.injectTabContent('dialogue', html);
    
    // Stocker les lignes pour la pagination
    this.dialoguePaginationData = {
      lines: lines,
      currentPage: 0
    };
  }

  async loadShopTabContent() {
    if (!this.shopSystem) {
      this.loadErrorTabContent('shop', new Error('Système de shop non disponible'));
      return;
    }

    // Créer un conteneur pour le shop
    const html = `<div id="embedded-shop-content" class="embedded-content"></div>`;
    this.dialogueUI.injectTabContent('shop', html);
    
    // Obtenir le conteneur et y injecter l'interface shop
    const container = this.dialogueUI.getContentContainer().querySelector('#embedded-shop-content');
    if (container && this.shopSystem.shopUI) {
      // Modifier temporairement l'affichage du shop pour l'intégrer
      await this.embedShopInterface(container);
    }
  }

  async embedShopInterface(container) {
    try {
      // Créer une version simplifiée de l'interface shop
      const shopData = this.unifiedState.tabData.merchant || this.unifiedState.tabData.shop || {};
      
      container.innerHTML = `
        <div class="embedded-shop">
          <div class="shop-header-mini">
            <h3>🏪 ${shopData.name || 'Boutique'}</h3>
            <div class="player-gold">💰 ${this.shopSystem.getPlayerGold()} ₽</div>
          </div>
          <div class="shop-items-mini" id="embedded-shop-items">
            <div class="shop-loading">
              <div class="shop-loading-spinner"></div>
              <div>Chargement des articles...</div>
            </div>
          </div>
          <div class="shop-actions-mini">
            <button onclick="window.dialogueManager.openFullShop()" class="shop-btn primary">
              🛒 Ouvrir la boutique complète
            </button>
          </div>
        </div>
      `;

      // Demander le catalogue si nécessaire
      if (shopData.shopId) {
        this.requestShopCatalogForEmbed(shopData.shopId);
      }

    } catch (error) {
      console.error('❌ Erreur intégration shop:', error);
      container.innerHTML = `
        <div class="error-content">
          <h3>❌ Erreur shop</h3>
          <p>${error.message}</p>
          <button onclick="window.dialogueManager.openFullShop()" class="shop-btn secondary">
            Essayer d'ouvrir le shop
          </button>
        </div>
      `;
    }
  }

  async loadQuestTabContent() {
    const questData = this.unifiedState.tabData.quest || {};
    
    let html = `
      <div class="quest-content">
        <div class="quest-header">
          <h3>📋 Quêtes disponibles</h3>
        </div>
    `;

    if (questData.available && questData.available.length > 0) {
      html += `<div class="quest-list">`;
      questData.available.forEach(quest => {
        html += `
          <div class="quest-item">
            <div class="quest-title">${quest.title}</div>
            <div class="quest-description">${quest.description}</div>
            <div class="quest-reward">💰 ${quest.reward} XP</div>
            <button onclick="window.dialogueManager.acceptQuest('${quest.id}')" class="quest-btn primary">
              Accepter
            </button>
          </div>
        `;
      });
      html += `</div>`;
    } else {
      html += `
        <div class="quest-empty">
          <div class="quest-empty-icon">📭</div>
          <p>Aucune quête disponible pour le moment</p>
        </div>
      `;
    }

    html += `</div>`;
    
    this.dialogueUI.injectTabContent('quest', html);
  }

  loadInfoTabContent() {
    const infoData = this.unifiedState.tabData.info || {};
    
    const html = `
      <div class="info-content">
        <div class="npc-info-card">
          <h3>ℹ️ Informations</h3>
          <div class="info-section">
            <h4>À propos de ${this.unifiedState.npcData.name}</h4>
            <p>${infoData.description || 'Aucune information supplémentaire disponible.'}</p>
          </div>
          ${infoData.tips ? `
            <div class="info-section">
              <h4>💡 Conseils</h4>
              <ul class="info-tips">
                ${infoData.tips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${infoData.location ? `
            <div class="info-section">
              <h4>📍 Localisation</h4>
              <p>${infoData.location}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    this.dialogueUI.injectTabContent('info', html);
  }

  loadTradeTabContent() {
    const html = `
      <div class="trade-content">
        <h3>🔄 Échange</h3>
        <p>Fonctionnalité d'échange en développement...</p>
        <button class="trade-btn secondary" disabled>Bientôt disponible</button>
      </div>
    `;
    
    this.dialogueUI.injectTabContent('trade', html);
  }

  loadBattleTabContent() {
    const html = `
      <div class="battle-content">
        <h3>⚔️ Combat</h3>
        <p>Fonctionnalité de combat en développement...</p>
        <button class="battle-btn secondary" disabled>Bientôt disponible</button>
      </div>
    `;
    
    this.dialogueUI.injectTabContent('battle', html);
  }

  loadGenericTabContent(tabId) {
    const tabData = this.unifiedState.tabData[tabId] || {};
    
    const html = `
      <div class="generic-tab-content">
        <h3>${tabData.title || `Onglet ${tabId}`}</h3>
        <p>${tabData.content || 'Contenu en cours de développement...'}</p>
      </div>
    `;
    
    this.dialogueUI.injectTabContent(tabId, html);
  }

  loadErrorTabContent(tabId, error) {
    const html = `
      <div class="error-content">
        <h3>❌ Erreur</h3>
        <p>Impossible de charger l'onglet "${tabId}"</p>
        <p class="error-message">${error.message}</p>
        <button onclick="window.dialogueManager.reloadTab('${tabId}')" class="error-btn">
          🔄 Réessayer
        </button>
      </div>
    `;
    
    this.dialogueUI.injectTabContent(tabId, html);
  }

  // ===== NAVIGATION DIALOGUE CLASSIQUE =====

  advanceClassicDialogue() {
    if (this.currentMode !== 'classic') return;

    this.classicState.currentPage++;
    
    if (this.classicState.currentPage >= this.classicState.lines.length) {
      this.hide();
      return;
    }

    // Mettre à jour le texte affiché
    const npcText = this.dialogueUI.container.querySelector('#npc-text');
    if (npcText) {
      npcText.textContent = this.classicState.lines[this.classicState.currentPage];
    }
  }

  // ===== PAGINATION DIALOGUE DANS ONGLET =====

  nextDialoguePage() {
    if (!this.dialoguePaginationData) return;
    
    const { lines, currentPage } = this.dialoguePaginationData;
    if (currentPage < lines.length - 1) {
      this.dialoguePaginationData.currentPage++;
      this.updateDialoguePagination();
    }
  }

  prevDialoguePage() {
    if (!this.dialoguePaginationData) return;
    
    if (this.dialoguePaginationData.currentPage > 0) {
      this.dialoguePaginationData.currentPage--;
      this.updateDialoguePagination();
    }
  }

  updateDialoguePagination() {
    const { lines, currentPage } = this.dialoguePaginationData;
    const container = this.dialogueUI.getContentContainer();
    
    const textElement = container.querySelector('.dialogue-text');
    const pageInfo = container.querySelector('.dialogue-page-info');
    const prevBtn = container.querySelector('.dialogue-nav-btn');
    const nextBtn = container.querySelectorAll('.dialogue-nav-btn')[1];
    
    if (textElement) textElement.textContent = lines[currentPage];
    if (pageInfo) pageInfo.textContent = `${currentPage + 1} / ${lines.length}`;
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage === lines.length - 1;
  }

  // ===== ACTIONS SHOP INTÉGRÉES =====

  openFullShop() {
    if (!this.shopSystem) {
      console.error('❌ ShopSystem non disponible');
      return;
    }

    // Masquer le dialogue unifié
    this.hide();

    // Ouvrir le shop complet
    const shopData = this.unifiedState.tabData.merchant || this.unifiedState.tabData.shop || {};
    if (shopData.shopId) {
      // Utiliser les données existantes ou déclencher une interaction
      if (this.shopSystem.directOpenShop) {
        this.shopSystem.directOpenShop(shopData.shopId, this.unifiedState.npcData, shopData);
      } else {
        console.warn('⚠️ Méthode directOpenShop non disponible');
      }
    }
  }

  requestShopCatalogForEmbed(shopId) {
    // Demander le catalogue pour affichage simplifié
    if (this.shopSystem && this.shopSystem.gameRoom) {
      this.shopSystem.gameRoom.send("getShopCatalog", { shopId });
    }
  }

  // ===== ACTIONS QUÊTE =====

  acceptQuest(questId) {
    console.log(`📋 Acceptation quête: ${questId}`);
    
    if (this.questSystem && this.questSystem.acceptQuest) {
      this.questSystem.acceptQuest(questId);
    } else {
      // Envoyer au serveur directement
      if (window.networkManager && window.networkManager.room) {
        window.networkManager.room.send("acceptQuest", { questId });
      }
    }
    
    // Optionnel : rafraîchir l'onglet quête
    this.reloadTab('quest');
  }

  // ===== UTILITAIRES =====

  reloadTab(tabId) {
    if (this.currentMode === 'unified' && this.unifiedState.currentTab === tabId) {
      this.loadTabContent(tabId);
    }
  }

  hide() {
    if (!this.isOpen()) return;

    console.log('🎭 Fermeture DialogueManager');

    // Appeler le callback de fermeture approprié
    let onCloseCallback = null;
    if (this.currentMode === 'classic') {
      onCloseCallback = this.classicState.onClose;
    } else if (this.currentMode === 'unified') {
      onCloseCallback = this.unifiedState.onClose;
    }

    // Fermer l'UI
    this.dialogueUI.hide();

    // Nettoyer l'état
    this.currentDialogueData = null;
    this.currentMode = null;
    this.classicState = { lines: [], currentPage: 0, onClose: null, actions: [] };
    this.unifiedState = { tabs: [], currentTab: null, tabData: {}, npcData: {}, onTabSwitch: null, onClose: null };
    this.dialoguePaginationData = null;

    // Appeler le callback
    if (onCloseCallback && typeof onCloseCallback === 'function') {
      try {
        onCloseCallback();
      } catch (error) {
        console.error('❌ Erreur callback fermeture:', error);
      }
    }
  }

  // ===== ÉTAT ET INFORMATIONS =====

  isOpen() {
    return this.dialogueUI ? this.dialogueUI.isOpen() : false;
  }

  getCurrentMode() {
    return this.currentMode;
  }

  getCurrentTab() {
    return this.unifiedState.currentTab;
  }

  canPlayerInteract() {
    const questDialogOpen = window._questDialogActive || false;
    const chatOpen = typeof window.isChatFocused === "function" && window.isChatFocused();
    const inventoryOpen = this.inventorySystem?.isInventoryOpen() || false;
    const shopOpen = this.shopSystem?.isShopOpen() || false;
    
    return !this.isOpen() && !questDialogOpen && !chatOpen && !inventoryOpen && !shopOpen;
  }

  // ===== INTÉGRATION AVEC L'EXISTANT =====

  // Méthode pour l'InteractionManager
  handleNpcInteractionResult(data) {
    console.log('🎭 Résultat interaction NPC reçu:', data);
    
    if (data.success && (data.dialogue || data.unifiedInterface)) {
      this.show(data);
    } else if (!data.success) {
      console.warn('⚠️ Interaction NPC échouée:', data.message);
    }
  }

  // Méthode pour les systèmes externes
  notify(eventType, data) {
    console.log(`🔔 Notification DialogueManager: ${eventType}`, data);
    
    switch (eventType) {
      case 'shop_catalog_received':
        this.handleShopCatalogForEmbed(data);
        break;
        
      case 'quest_completed':
        this.handleQuestCompleted(data);
        break;
        
      case 'player_level_up':
        this.handlePlayerLevelUp(data);
        break;
    }
  }

  handleShopCatalogForEmbed(data) {
    // Mettre à jour l'affichage shop intégré si visible
    if (this.unifiedState.currentTab === 'shop' || this.unifiedState.currentTab === 'merchant') {
      const container = this.dialogueUI.getContentContainer().querySelector('#embedded-shop-items');
      if (container && data.catalog) {
        this.updateEmbeddedShopItems(container, data.catalog);
      }
    }
  }

  updateEmbeddedShopItems(container, catalog) {
    const items = catalog.availableItems || [];
    
    if (items.length === 0) {
      container.innerHTML = `
        <div class="shop-empty">
          <div class="shop-empty-icon">🏪</div>
          <p>Aucun article disponible</p>
        </div>
      `;
      return;
    }

    let html = '<div class="shop-items-grid-mini">';
    items.slice(0, 6).forEach(item => { // Max 6 items dans l'aperçu
      html += `
        <div class="shop-item-mini">
          <div class="item-icon">${this.getItemIcon(item.itemId)}</div>
          <div class="item-name">${this.getItemName(item.itemId)}</div>
          <div class="item-price">${item.buyPrice}₽</div>
        </div>
      `;
    });
    html += '</div>';
    
    if (items.length > 6) {
      html += `<p class="shop-more">... et ${items.length - 6} autres articles</p>`;
    }
    
    container.innerHTML = html;
  }

  getItemIcon(itemId) {
    // Réutiliser la logique du ShopSystem si disponible
    if (this.shopSystem && this.shopSystem.shopUI && this.shopSystem.shopUI.getItemIcon) {
      return this.shopSystem.shopUI.getItemIcon(itemId);
    }
    
    // Fallback simple
    const iconMap = {
      'potion': '💊',
      'poke_ball': '⚪',
      'great_ball': '🟡',
      'ultra_ball': '🟠'
    };
    return iconMap[itemId] || '📦';
  }

  getItemName(itemId) {
    // Réutiliser la logique du ShopSystem si disponible
    if (this.shopSystem && this.shopSystem.shopUI && this.shopSystem.shopUI.getItemName) {
      return this.shopSystem.shopUI.getItemName(itemId);
    }
    
    // Fallback simple
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  handleQuestCompleted(data) {
    // Si l'onglet quête est ouvert, le rafraîchir
    if (this.unifiedState.currentTab === 'quest') {
      this.reloadTab('quest');
    }
  }

  handlePlayerLevelUp(data) {
    // Mettre à jour les informations du joueur si affichées
    console.log('🎉 Joueur level up:', data);
  }

  // ===== DEBUG ET DÉVELOPPEMENT =====

  debugState() {
    console.log('🔍 === DEBUG DIALOGUE MANAGER AVEC ACTIONS ===');
    console.log('📊 ÉTAT GÉNÉRAL:');
    console.log('  - Initialisé:', this.isInitialized);
    console.log('  - Ouvert:', this.isOpen());
    console.log('  - Mode actuel:', this.currentMode);
    console.log('  - DialogueUI existe:', !!this.dialogueUI);
    
    console.log('🎭 DIALOGUE CLASSIQUE:');
    console.log('  - Lignes:', this.classicState.lines.length);
    console.log('  - Page actuelle:', this.classicState.currentPage);
    console.log('  - Actions disponibles:', this.classicState.actions.length);
    
    console.log('🎯 INTERFACE UNIFIÉE:');
    console.log('  - Onglets:', this.unifiedState.tabs.length);
    console.log('  - Onglet actuel:', this.unifiedState.currentTab);
    console.log('  - NPC:', this.unifiedState.npcData.name);
    
    console.log('🔗 SYSTÈMES:');
    console.log('  - ShopSystem:', !!this.shopSystem);
    console.log('  - QuestSystem:', !!this.questSystem);
    console.log('  - InventorySystem:', !!this.inventorySystem);
    
    return {
      isInitialized: this.isInitialized,
      isOpen: this.isOpen(),
      currentMode: this.currentMode,
      hasUI: !!this.dialogueUI,
      classicState: {
        linesCount: this.classicState.lines.length,
        currentPage: this.classicState.currentPage,
        actionsCount: this.classicState.actions.length,
        actions: this.classicState.actions.map(a => ({ id: a.id, type: a.type, label: a.label }))
      },
      systems: {
        shop: !!this.shopSystem,
        quest: !!this.questSystem,
        inventory: !!this.inventorySystem
      }
    };
  }

  // ===== NETTOYAGE =====

  destroy() {
    console.log('💀 Destruction DialogueManager');
    
    // Fermer le dialogue si ouvert
    if (this.isOpen()) {
      this.hide();
    }
    
    // Détruire l'UI
    if (this.dialogueUI) {
      this.dialogueUI.destroy();
      this.dialogueUI = null;
    }
    
    // Nettoyer les références
    this.shopSystem = null;
    this.questSystem = null;
    this.inventorySystem = null;
    this.currentDialogueData = null;
    
    // Supprimer les références globales
    if (window.dialogueManager === this) {
      window.dialogueManager = null;
      delete window.showNpcDialogue;
      delete window.advanceDialogue;
      delete window.closeDialogue;
    }
    
    this.isInitialized = false;
    console.log('✅ DialogueManager détruit');
  }
}

// ===== FONCTIONS GLOBALES DE DEBUG MISES À JOUR =====

window.testDialogueManager = function() {
  if (window.dialogueManager) {
    console.log('🧪 Test DialogueManager avec actions...');
    return window.dialogueManager.debugState();
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

// 🆕 NOUVELLES FONCTIONS DE TEST AVEC ACTIONS
window.testDialogueWithShop = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Marchand Test',
      portrait: 'https://via.placeholder.com/80x80/green/white?text=SHOP',
      lines: ['Bonjour ! Bienvenue dans ma boutique.', 'Que puis-je faire pour vous ?'],
      capabilities: ['merchant'],
      shopData: { 
        shopId: 'test_shop',
        name: 'Boutique du Marchand'
      },
      onClose: () => {
        console.log('✅ Dialogue marchand fermé');
        window.showGameNotification?.('Dialogue fermé', 'info', { duration: 1500 });
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue marchand avec actions affiché');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueWithQuest = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Garde Questeur',
      portrait: 'https://via.placeholder.com/80x80/orange/white?text=QUEST',
      lines: ['Salut, aventurier !', 'J\'ai des missions importantes pour toi.'],
      capabilities: ['questGiver'],
      questData: { 
        availableQuests: [
          { id: 'quest1', title: 'Mission Test 1' },
          { id: 'quest2', title: 'Mission Test 2' },
          { id: 'quest3', title: 'Mission Test 3' }
        ]
      },
      onClose: () => {
        console.log('✅ Dialogue quêtes fermé');
        window.showGameNotification?.('Dialogue fermé', 'info', { duration: 1500 });
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue quêtes avec actions affiché');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueWithHealer = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Infirmière Joy',
      portrait: 'https://via.placeholder.com/80x80/red/white?text=HEAL',
      lines: ['Bonjour ! Vos Pokémon ont l\'air fatigués.', 'Voulez-vous que je les soigne ?'],
      capabilities: ['healer'],
      healerData: { 
        healType: 'full',
        cost: 0
      },
      onClose: () => {
        console.log('✅ Dialogue soigneur fermé');
        window.showGameNotification?.('Dialogue fermé', 'info', { duration: 1500 });
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue soigneur avec actions affiché');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueMultiActions = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'PNJ Multifonction',
      portrait: 'https://via.placeholder.com/80x80/purple/white?text=MULTI',
      lines: ['Salutations !', 'Je propose plusieurs services.'],
      capabilities: ['merchant', 'questGiver', 'healer'],
      shopData: { shopId: 'multi_shop' },
      questData: { availableQuests: [{ id: 'multi_quest' }] },
      healerData: { healType: 'full' },
      onClose: () => {
        console.log('✅ Dialogue multi-actions fermé');
        window.showGameNotification?.('Dialogue fermé', 'info', { duration: 1500 });
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue multi-actions affiché');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

console.log('✅ DialogueManager avec Actions Contextuelles chargé!');
console.log('🧪 Utilisez window.testDialogueManager() pour diagnostiquer');
console.log('🛒 Utilisez window.testDialogueWithShop() pour tester marchand');
console.log('📋 Utilisez window.testDialogueWithQuest() pour tester quêtes');
console.log('💊 Utilisez window.testDialogueWithHealer() pour tester soigneur');
console.log('🎯 Utilisez window.testDialogueMultiActions() pour tester multi-actions');

// 🆕 NOUVELLES FONCTIONS DE TEST: Dialogue multi-pages
window.testDialogueMultiPages = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Conteur',
      portrait: 'https://via.placeholder.com/80x80/purple/white?text=STORY',
      lines: [
        'Il était une fois, dans un royaume lointain...',
        'Un brave aventurier partit en quête d\'un trésor légendaire.',
        'Il traversa des montagnes périlleuses et des forêts mystérieuses.',
        'Enfin, il découvrit le secret qu\'il cherchait depuis si longtemps.',
        'Et c\'est ainsi que se termine cette histoire !'
      ],
      onClose: () => {
        console.log('✅ Histoire terminée');
        window.showGameNotification?.('Histoire finie !', 'info', { duration: 1500 });
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue multi-pages affiché (compteur visible)');
    return testData;
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueMultiPagesWithActions = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Libraire',
      portrait: 'https://via.placeholder.com/80x80/brown/white?text=BOOK',
      lines: [
        'Bienvenue dans ma librairie !',
        'J\'ai de nombreux livres et services à votre disposition.',
        'Que puis-je faire pour vous aujourd\'hui ?'
      ],
      capabilities: ['merchant', 'questGiver'],
      shopData: { shopId: 'book_shop', name: 'Librairie' },
      questData: { availableQuests: [{ id: 'book_quest' }] },
      onClose: () => {
        console.log('✅ Dialogue libraire fermé');
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue multi-pages AVEC actions affiché');
    return testData;
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueSimpleNPC = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Villageois',
      portrait: 'https://via.placeholder.com/80x80/gray/white?text=NPC',
      lines: ['Bonjour !', 'Belle journée, n\'est-ce pas ?'],
      // ✅ PAS de capabilities, shopData, questData, etc.
      onClose: () => {
        console.log('✅ Dialogue simple fermé');
        window.showGameNotification?.('Dialogue simple fini', 'info', { duration: 1500 });
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue simple SANS actions affiché (pas de zone d\'actions)');
    return testData;
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

console.log('📖 Utilisez window.testDialogueMultiPages() pour tester le compteur multi-pages');
console.log('📚 Utilisez window.testDialogueMultiPagesWithActions() pour tester pages + actions');
console.log('👤 Utilisez window.testDialogueSimpleNPC() pour tester NPC simple SANS actions');
