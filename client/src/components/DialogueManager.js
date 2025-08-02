// client/src/components/DialogueManager.js
// 🎭 Gestionnaire logique pour les dialogues NPCs - Version Simplifiée avec Actions Contextuelles
// ✅ Gestion dialogue classique + actions contextuelles SEULEMENT
// ✅ Intégration avec ShopSystem, QuestSystem, etc.
// ❌ SUPPRIMÉ : Interface unifiée à onglets (pas utilisée)

import { DialogueUI } from './DialogueUI.js';

export class DialogueManager {
  constructor() {
    this.dialogueUI = null;
    this.isInitialized = false;
    this.currentDialogueData = null;
    
    // État du dialogue classique avec actions
    this.classicState = {
      lines: [],
      currentPage: 0,
      onClose: null,
      actions: [] // Actions disponibles
    };
    
    // Systèmes intégrés
    this.shopSystem = null;
    this.questSystem = null;
    this.inventorySystem = null;
    
    console.log('🎭 DialogueManager créé (version simplifiée avec actions)');
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
      console.log('✅ DialogueManager initialisé (version simplifiée)');
      
    } catch (error) {
      console.error('❌ Erreur initialisation DialogueManager:', error);
    }
  }

  setupUICallbacks() {
    if (!this.dialogueUI) return;

    // Callback pour l'avancement des dialogues
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
    
    // 🆕 ÉCOUTER les catalogues shop pour ouverture automatique
    if (window.globalNetworkManager && window.globalNetworkManager.room) {
      window.globalNetworkManager.room.onMessage("shopCatalogResult", (data) => {
        this.handleShopCatalogReceived(data);
      });
    }
    
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

    // 🔧 TOUJOURS utiliser le dialogue classique amélioré (pas d'interface unifiée)
    this.showClassicDialogue(data);
  }

  showClassicDialogue(data) {
    console.log('🎭 Affichage dialogue classique avec détection actions');
    
    // Préparer les données pour l'UI
    const lines = Array.isArray(data.lines) && data.lines.length ? data.lines : [data.text || ""];
    
    // 🆕 DÉTECTION ACTIONS
    const actions = this.detectAvailableActions(data);
    
    // Configurer l'état interne
    this.classicState = {
      lines: lines,
      currentPage: 0,
      onClose: data.onClose,
      actions: actions
    };

    // Préparer les données complètes pour l'UI
    const dialogueDataWithActions = {
      ...data,
      name: data.npcName || data.name || 'PNJ',
      portrait: this.extractPortraitUrl(data),
      lines: lines,
      actions: actions
    };

    // 🔧 LOGIQUE CLAIRE selon les actions
    if (actions && actions.length > 0) {
      console.log(`✅ ${actions.length} actions détectées - dialogue avec zone d'actions`);
      this.dialogueUI.showDialogueWithActions(dialogueDataWithActions);
      
      // Configurer le callback pour les actions
      this.dialogueUI.onActionClick = (action) => {
        this.handleDialogueAction(action, data);
      };
    } else {
      console.log('✅ Aucune action - dialogue simple');
      this.dialogueUI.showClassicDialogue(dialogueDataWithActions);
    }
  }

  // ===== DÉTECTION DES ACTIONS =====
  
 // ===== DÉTECTION DES ACTIONS CORRIGÉE =====
  
detectAvailableActions(data) {
  const actions = [];
  
  // Détecter selon les capabilities ou le type de données
  let capabilities = data.capabilities || [];
  
  // 🆕 Si les données viennent de l'interface unifiée, extraire les capabilities
  if (data.unifiedInterface && data.unifiedInterface.capabilities) {
    capabilities = data.unifiedInterface.capabilities;
    console.log('🔄 Extraction capabilities depuis interface unifiée:', capabilities);
  }
  
  const npcType = data.npcType || data.type;
  
  // 🔧 EXTRACTION QUEST DATA CORRIGÉE
  const unifiedQuestData = data.unifiedInterface?.questData;
  const legacyQuestData = data.questData;
  
  // 🆕 NOUVEAU : Récupérer les quêtes disponibles depuis plusieurs sources
  let availableQuests = [];
  
  // Source 1 : data.availableQuests (le plus direct)
  if (data.availableQuests && Array.isArray(data.availableQuests)) {
    availableQuests = data.availableQuests;
    console.log('📋 Quêtes trouvées dans data.availableQuests:', availableQuests.length);
  }
  // Source 2 : unifiedQuestData
  else if (unifiedQuestData?.availableQuests?.length > 0) {
    availableQuests = unifiedQuestData.availableQuests;
    console.log('📋 Quêtes trouvées dans unifiedQuestData:', availableQuests.length);
  }
  // Source 3 : legacyQuestData
  else if (legacyQuestData?.availableQuests?.length > 0) {
    availableQuests = legacyQuestData.availableQuests;
    console.log('📋 Quêtes trouvées dans legacyQuestData:', availableQuests.length);
  }
  // Source 4 : Quête unique (legacy)
  else if (data.questId) {
    availableQuests = [{ id: data.questId, name: data.questName || 'Quête' }];
    console.log('📋 Quête unique trouvée:', data.questId);
  }
  
  const hasAvailableQuests = availableQuests.length > 0;
  
  console.log('🔍 Détection actions pour:', { 
    name: data.npcName || data.name,
    capabilities, 
    npcType, 
    hasShopData: !!(data.shopData || data.merchantData || (data.unifiedInterface && data.unifiedInterface.merchantData)),
    hasQuestData: hasAvailableQuests,
    availableQuestsCount: availableQuests.length,
    questNames: availableQuests.map(q => q.name || q.id),
    hasHealerData: !!data.healerData
  });
  
  // Action Boutique
  const hasShopData = data.shopData || data.merchantData || (data.unifiedInterface && data.unifiedInterface.merchantData);
  if (capabilities.includes('merchant') || npcType === 'merchant' || hasShopData) {
    actions.push({
      id: 'open_shop',
      type: 'shop',
      label: 'Boutique',
      icon: '🛒',
      description: 'Acheter et vendre des objets',
      data: hasShopData
    });
  }
  
  // 🆕 ACTIONS QUÊTES : UN BOUTON PAR QUÊTE
  if (capabilities.includes('quest') || capabilities.includes('questGiver') || npcType === 'questGiver' || hasAvailableQuests) {
    
    if (availableQuests.length > 0) {
      // 🎯 CRÉER UN BOUTON PAR QUÊTE
      availableQuests.forEach(quest => {
        const questName = quest.name || quest.title || `Quête ${quest.id}`;
        const questId = quest.id;
        
        actions.push({
          id: `accept_${questId}`,
          type: 'quest',
          questId: questId, // 🆕 ID spécifique de la quête
          label: questName, // 🆕 Nom de la quête au lieu de "Quête"
          icon: '📋',
          description: quest.description || 'Mission disponible',
          data: quest
        });
        
        console.log(`✅ Action quête ajoutée: "${questName}" (${questId})`);
      });
    } else {
      // 🔄 Fallback : bouton générique si capabilities mais pas de quêtes détectées
      actions.push({
        id: 'open_quests',
        type: 'quest',
        label: 'Quêtes',
        icon: '📋',
        description: 'Missions disponibles',
        data: unifiedQuestData || legacyQuestData || {}
      });
      
      console.log('✅ Action quête générique ajoutée (fallback)');
    }
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
  
  // Action Informations
  if (data.infoData) {
    actions.push({
      id: 'show_info',
      type: 'info',
      label: 'Infos',
      icon: 'ℹ️',
      description: 'Informations supplémentaires',
      data: data.infoData
    });
  }
  
  if (actions.length === 0) {
    console.log('✅ Aucune action détectée - NPC dialogue simple');
    return [];
  } else {
    const questActions = actions.filter(a => a.type === 'quest');
    const otherActions = actions.filter(a => a.type !== 'quest');
    
    console.log(`✅ ${actions.length} actions détectées:`);
    console.log(`   - ${questActions.length} quêtes:`, questActions.map(a => a.label));
    console.log(`   - ${otherActions.length} autres:`, otherActions.map(a => a.label));
    
    return actions;
  }
}
  
  // ===== EXTRACTION DES DONNÉES =====
  
  extractPortraitUrl(data) {
    // Essayer différentes sources pour le portrait
    if (data.portrait) return data.portrait;
    if (data.unifiedInterface && data.unifiedInterface.npcSprite) {
      return `/assets/portrait/${data.unifiedInterface.npcSprite}Portrait.png`;
    }
    return null;
  }

  // ===== GESTION DES ACTIONS =====

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
          break;
      }
    }, 200);
  }

  handleShopAction(action, originalData) {
    console.log('🛒 Ouverture boutique depuis dialogue...');
    
    // 🔧 MISE À JOUR des références aux systèmes en temps réel
    this.shopSystem = window.shopSystem || null;
    
    // Extraire les bonnes données de shop
    let shopData = action.data || originalData.merchantData || originalData.shopData || {};
    let shopId = originalData.shopId || shopData.shopId || 'default_shop';
    
    // Enrichir avec les données unifiées si disponibles
    if (originalData.unifiedInterface && originalData.unifiedInterface.merchantData) {
      shopData = { ...shopData, ...originalData.unifiedInterface.merchantData };
      shopId = originalData.unifiedInterface.merchantData.shopId || shopId;
    }

    console.log(`🎯 Tentative ouverture shop: ${shopId}`);
    console.log(`🔗 ShopSystem disponible:`, !!this.shopSystem);
    
    // 🆕 APPROCHE 1 : Utiliser le ShopSystem si disponible
    if (this.shopSystem && this.shopSystem.directOpenShop) {
      console.log('✅ Utilisation du ShopSystem existant');
      
      const npcData = {
        name: originalData.npcName || originalData.name || 'Marchand',
        id: originalData.npcId || 'unknown'
      };
      
      const success = this.shopSystem.directOpenShop(shopId, npcData, shopData);
      if (success) {
        console.log('✅ Shop ouvert via ShopSystem');
        return;
      }
    }
    
    // 🆕 APPROCHE 2 : Créer/ouvrir le ShopUI directement
    console.log('🔄 Création/ouverture directe du ShopUI...');
    this.createOrOpenShopUI(shopId, originalData, shopData);
  }

  // 🆕 NOUVELLE MÉTHODE : Créer ou ouvrir le ShopUI directement
  async createOrOpenShopUI(shopId, originalData, shopData) {
    try {
      // 1. S'assurer que le ShopUI existe
      if (!window.shopUI) {
        console.log('🆕 Création du ShopUI...');
        
        // Essayer d'importer le ShopUI dynamiquement
        let ShopUIClass = window.ShopUI;
        
        if (!ShopUIClass && window.shopSystem?.shopUI?.constructor) {
          ShopUIClass = window.shopSystem.shopUI.constructor;
        }
        
        if (!ShopUIClass) {
          // Import dynamique comme fallback
          try {
            const { ShopUI } = await import('../components/ShopUI.js');
            ShopUIClass = ShopUI;
            window.ShopUI = ShopUI; // Rendre accessible globalement
          } catch (importError) {
            console.error('❌ Impossible d\'importer ShopUI:', importError);
            throw new Error('ShopUI not available');
          }
        }

        if (ShopUIClass) {
          const networkRoom = window.globalNetworkManager?.room;
          window.shopUI = new ShopUIClass(networkRoom);
          console.log('✅ ShopUI créé');
        } else {
          throw new Error('ShopUI class not found');
        }
      }

      // 2. Préparer les données du NPC
      const npcData = {
        name: originalData.npcName || originalData.name || 'Marchand',
        id: originalData.npcId || 'unknown'
      };

      console.log(`🚪 Ouverture ShopUI pour ${npcData.name}...`);
      
      // 3. Ouvrir le shop
      await window.shopUI.show(shopId, npcData);
      
      // 4. Si on a des données de shop, les injecter immédiatement
      if (shopData && Object.keys(shopData).length > 0) {
        console.log('💉 Injection des données shop...');
        
        setTimeout(() => {
          if (window.shopUI && window.shopUI.isVisible) {
            // 🔧 CORRECTION : S'assurer que le nom du NPC est dans les données du catalogue
            const catalogData = {
              success: true,
              catalog: {
                ...shopData,
                npcName: npcData.name, // 🆕 FORCER le nom du NPC
                shopInfo: {
                  ...shopData.shopInfo,
                  npcName: npcData.name // 🆕 AUSSI dans shopInfo
                }
              },
              playerGold: shopData.playerGold || 1000,
              npcName: npcData.name // 🆕 AUSSI à la racine
            };
            window.shopUI.handleShopCatalog(catalogData);
            
            // 🆕 FORCER la mise à jour du titre après injection
            setTimeout(() => {
              if (window.shopUI && window.shopUI.updateShopTitle) {
                window.shopUI.updateShopTitle({
                  npcName: npcData.name,
                  name: npcData.name
                });
              }
            }, 50);
          }
        }, 100);
      }

      console.log('✅ ShopUI ouvert avec succès');
      
    } catch (error) {
      console.error('❌ Erreur ouverture ShopUI directe:', error);
      
      // 🆕 FALLBACK FINAL : Demander le catalogue via NetworkManager
      console.log('🔄 Fallback vers NetworkManager...');
      if (window.globalNetworkManager && window.globalNetworkManager.room) {
        if (originalData.npcId) {
          window.globalNetworkManager.room.send('interactWithNpc', { 
            npcId: originalData.npcId,
            action: 'merchant'
          });
        } else {
          window.globalNetworkManager.room.send('getShopCatalog', { 
            shopId: shopId 
          });
        }
        console.log('📡 Demande catalogue envoyée');
      }
    }
  }

  handleQuestAction(action, originalData) {
    console.log('📋 Ouverture journal quêtes...');
    
    if (this.questSystem && this.questSystem.openQuestJournal) {
      // Déléguer au QuestSystem
      this.questSystem.openQuestJournal(action.data);
    } else {
      // Fallback vers système de quêtes via réseau
      if (window.globalNetworkManager && window.globalNetworkManager.room && originalData.npcId) {
        window.globalNetworkManager.room.send('interactWithNpc', { 
          npcId: originalData.npcId,
          action: 'quest'
        });
      }
      console.warn('⚠️ Pas de QuestSystem disponible');
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
    
    // Réafficher le dialogue avec focus sur les infos
    const infoData = {
      ...originalData,
      lines: action.data.description ? [action.data.description] : ['Informations non disponibles'],
      actions: [] // Pas d'actions sur l'info
    };
    
    this.show(infoData);
  }

  // ===== NAVIGATION DIALOGUE CLASSIQUE =====

  advanceClassicDialogue() {
    if (!this.classicState || !this.classicState.lines) return;

    this.classicState.currentPage++;
    
    if (this.classicState.currentPage >= this.classicState.lines.length) {
      this.hide();
      return;
    }

    // Mettre à jour le texte affiché
    const npcText = this.dialogueUI.container.querySelector('#npc-text');
    const counter = this.dialogueUI.container.querySelector('.dialogue-counter');
    
    if (npcText) {
      npcText.textContent = this.classicState.lines[this.classicState.currentPage];
    }
    
    if (counter && this.classicState.lines.length > 1) {
      counter.textContent = `${this.classicState.currentPage + 1}/${this.classicState.lines.length}`;
    }
  }

  // ===== FERMETURE =====

  hide() {
    if (!this.isOpen()) return;

    console.log('🎭 Fermeture DialogueManager');

    // Appeler le callback de fermeture
    const onCloseCallback = this.classicState.onClose;

    // Fermer l'UI
    this.dialogueUI.hide();

    // Nettoyer l'état
    this.currentDialogueData = null;
    this.classicState = { lines: [], currentPage: 0, onClose: null, actions: [] };

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

  canPlayerInteract() {
    const questDialogOpen = window._questDialogActive || false;
    const chatOpen = typeof window.isChatFocused === "function" && window.isChatFocused();
    const inventoryOpen = this.inventorySystem?.isInventoryOpen() || false;
    const shopOpen = this.shopSystem?.isShopOpen() || false;
    
    return !this.isOpen() && !questDialogOpen && !chatOpen && !inventoryOpen && !shopOpen;
  }

  // ===== INTÉGRATION AVEC L'EXISTANT =====

  handleNpcInteractionResult(data) {
    console.log('🎭 Résultat interaction NPC reçu:', data);
    
    if (data.success && (data.dialogue || data.unifiedInterface || data.lines || data.text)) {
      this.show(data);
    } else if (!data.success) {
      console.warn('⚠️ Interaction NPC échouée:', data.message);
    }
  }

  // ===== GESTION CATALOGUE SHOP AUTOMATIQUE =====
  
  handleShopCatalogReceived(data) {
    console.log('🏪 [DialogueManager] Catalogue shop reçu:', data);
    
    // Si le shop n'est pas encore ouvert, l'ouvrir automatiquement
    if (data.success && (!window.shopUI || !window.shopUI.isVisible)) {
      console.log('🚪 Ouverture automatique du shop suite au catalogue...');
      
      // 🔧 EXTRACTION ROBUSTE du nom du marchand
      let npcName = 'Marchand';
      let npcId = 'unknown';
      
      // Priorité 1 : Depuis les données de dialogue en mémoire
      if (this.currentDialogueData) {
        npcName = this.currentDialogueData.npcName || this.currentDialogueData.name || npcName;
        npcId = this.currentDialogueData.npcId || npcId;
        console.log(`🎭 Nom depuis dialogue courant: ${npcName}`);
      }
      
      // Priorité 2 : Depuis les données du catalogue
      if (data.catalog && data.catalog.npcName) {
        npcName = data.catalog.npcName;
        console.log(`🎭 Nom depuis catalog.npcName: ${npcName}`);
      } else if (data.npcName) {
        npcName = data.npcName;
        console.log(`🎭 Nom depuis data.npcName: ${npcName}`);
      }
      
      // Priorité 3 : Depuis l'état de l'interaction manager
      if (window.interactionManager?.state?.lastInteractedNpc) {
        const lastNpc = window.interactionManager.state.lastInteractedNpc;
        npcName = lastNpc.name || npcName;
        npcId = lastNpc.id || npcId;
        console.log(`🎭 Nom depuis InteractionManager: ${npcName}`);
      }
      
      // Ouvrir le shop avec les données du catalogue ET le bon nom
      this.createOrOpenShopUI(data.shopId || 'default_shop', {
        npcName: npcName,
        npcId: npcId,
        name: npcName
      }, data.catalog);
    }
  }

  // ===== NOTIFICATIONS SYSTÈME =====

  notify(eventType, data) {
    console.log(`🔔 Notification DialogueManager: ${eventType}`, data);
    
    switch (eventType) {
      case 'shop_catalog_received':
        console.log('📦 Catalogue shop reçu via DialogueManager');
        break;
        
      case 'quest_completed':
        console.log('🎉 Quête terminée');
        break;
        
      case 'player_level_up':
        console.log('🎉 Joueur level up:', data);
        break;
    }
  }

  // ===== DEBUG ET DÉVELOPPEMENT =====

  debugState() {
    console.log('🔍 === DEBUG DIALOGUE MANAGER SIMPLIFIÉ ===');
    console.log('📊 ÉTAT GÉNÉRAL:');
    console.log('  - Initialisé:', this.isInitialized);
    console.log('  - Ouvert:', this.isOpen());
    console.log('  - DialogueUI existe:', !!this.dialogueUI);
    
    console.log('🎭 DIALOGUE CLASSIQUE:');
    console.log('  - Lignes:', this.classicState.lines.length);
    console.log('  - Page actuelle:', this.classicState.currentPage);
    console.log('  - Actions disponibles:', this.classicState.actions.length);
    
    console.log('🔗 SYSTÈMES:');
    console.log('  - ShopSystem:', !!this.shopSystem);
    console.log('  - QuestSystem:', !!this.questSystem);
    console.log('  - InventorySystem:', !!this.inventorySystem);
    
    return {
      isInitialized: this.isInitialized,
      isOpen: this.isOpen(),
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

// ===== FONCTIONS GLOBALES DE DEBUG =====

window.testDialogueManager = function() {
  if (window.dialogueManager) {
    console.log('🧪 Test DialogueManager simplifié...');
    return window.dialogueManager.debugState();
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

// 🧪 FONCTIONS DE TEST SIMPLIFIÉES
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
      }
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue marchand avec actions affiché');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueSimpleNPC = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Villageois',
      portrait: 'https://via.placeholder.com/80x80/gray/white?text=NPC',
      lines: ['Bonjour !', 'Belle journée, n\'est-ce pas ?']
      // ✅ PAS de capabilities = pas d'actions
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue simple SANS actions affiché');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

console.log('✅ DialogueManager Simplifié avec Actions chargé!');
console.log('🧪 Utilisez window.testDialogueManager() pour diagnostiquer');
console.log('🛒 Utilisez window.testDialogueWithShop() pour tester marchand');
console.log('👤 Utilisez window.testDialogueSimpleNPC() pour tester NPC simple');
