// client/src/components/DialogueManager.js
// 🎭 Gestionnaire logique pour les dialogues NPCs - Version Corrigée (Shop fonctionne!)
// ✅ FIX CRITIQUE : Intercepteur quête ne bloque plus les autres boutons
// ✅ Gestion dialogue classique + actions contextuelles TOUTES FONCTIONNELLES
// ✅ Intégration avec ShopSystem, QuestSystem, etc.
// ✅ NOUVEAU : Stockage données pour QuestDetailsUI

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
    
    console.log('🎭 DialogueManager créé (version corrigée - shop fonctionnel)');
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
      console.log('✅ DialogueManager initialisé (version corrigée)');
      
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

    // 🔧 FIX CRITIQUE : Callback pour TOUTES les actions (pas seulement quêtes)
    this.dialogueUI.onActionClick = (action) => {
      console.log('🎯 Action cliquée dans DialogueManager:', action);
      this.handleDialogueAction(action, this.currentDialogueData);
    };

    console.log('✅ Callbacks UI configurés (tous boutons)');
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

    // 🔧 NOUVEAU : Stocker les données pour QuestDetailsUI et autres systèmes
    this.currentDialogueData = data;
    window.dialogueManager = this; // S'assurer que c'est accessible globalement
    
    // 🔧 NOUVEAU : Stocker en backup global pour QuestDetailsUI
    if (data.availableQuests || data.questData || data.unifiedInterface?.questData) {
      window._lastNpcInteractionData = {
        npcId: data.npcId,
        npcName: data.name || data.npcName,
        availableQuests: data.availableQuests || data.questData?.availableQuests || data.unifiedInterface?.questData?.availableQuests || [],
        questData: data.questData || data.unifiedInterface?.questData,
        contextualData: data.contextualData,
        unifiedInterface: data.unifiedInterface
      };
      
      console.log('🔧 [DialogueManager] Données quêtes stockées pour QuestDetailsUI:', window._lastNpcInteractionData);
    }

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
      
      // 🔧 CORRIGÉ : Le callback est maintenant défini dans setupUICallbacks()
      // Plus besoin de le redéfinir ici
    } else {
      console.log('✅ Aucune action - dialogue simple');
      this.dialogueUI.showClassicDialogue(dialogueDataWithActions);
    }
  }

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
  
  // 🔧 EXTRACTION QUEST DATA CORRIGÉE ET SIMPLIFIÉE
  let availableQuests = [];
  
  // 🔧 CORRECTION CRITIQUE : Vérifier d'abord la racine des données
  console.log('🔍 [DEBUG] Recherche quêtes dans data:', {
    'data.availableQuests': data.availableQuests,
    'data.availableQuests?.length': data.availableQuests?.length,
    'Array.isArray(data.availableQuests)': Array.isArray(data.availableQuests)
  });
  
  // ✅ PRIORITÉ 1 : data.availableQuests (le plus direct - C'EST LÀ QU'ELLES SONT !)
  if (data.availableQuests && Array.isArray(data.availableQuests) && data.availableQuests.length > 0) {
    availableQuests = data.availableQuests;
    console.log('📋 ✅ Quêtes trouvées dans data.availableQuests:', availableQuests.length);
    console.log('📋 ✅ Noms des quêtes:', availableQuests.map(q => q.name || q.title || q.id));
  }
  // Source 2 : Interface unifiée
  else if (data.unifiedInterface?.questData?.availableQuests?.length > 0) {
    availableQuests = data.unifiedInterface.questData.availableQuests;
    console.log('📋 Quêtes trouvées dans unifiedInterface.questData:', availableQuests.length);
  }
  // Source 3 : contextualData
  else if (data.contextualData?.questData?.availableQuests?.length > 0) {
    availableQuests = data.contextualData.questData.availableQuests;
    console.log('📋 Quêtes trouvées dans contextualData.questData:', availableQuests.length);
  }
  // Source 4 : contextualData direct
  else if (data.contextualData?.availableQuests?.length > 0) {
    availableQuests = data.contextualData.availableQuests;
    console.log('📋 Quêtes trouvées dans contextualData.availableQuests:', availableQuests.length);
  }
  // Source 5 : questData classique
  else if (data.questData?.availableQuests?.length > 0) {
    availableQuests = data.questData.availableQuests;
    console.log('📋 Quêtes trouvées dans questData:', availableQuests.length);
  }
  // Source 6 : quests direct
  else if (data.quests && Array.isArray(data.quests) && data.quests.length > 0) {
    availableQuests = data.quests;
    console.log('📋 Quêtes trouvées dans data.quests:', availableQuests.length);
  }
  // Source 7 : Quête unique (legacy)
  else if (data.questId) {
    availableQuests = [{ 
      id: data.questId, 
      name: data.questName || data.questTitle || `Quête ${data.questId}`,
      title: data.questName || data.questTitle || `Quête ${data.questId}`,
      description: data.questDescription || 'Mission disponible'
    }];
    console.log('📋 Quête unique trouvée:', data.questId);
  }
  
  const hasAvailableQuests = availableQuests.length > 0;
  
  console.log('🔍 Détection actions pour:', { 
    name: data.npcName || data.name,
    capabilities, 
    npcType, 
    hasShopData: !!(data.shopData || data.merchantData || (data.unifiedInterface && data.unifiedInterface.merchantData)),
    hasQuestData: hasAvailableQuests, // 🔧 CETTE VALEUR DOIT ÊTRE TRUE
    availableQuestsCount: availableQuests.length,
    questNames: availableQuests.map(q => q.name || q.title || q.id),
    hasHealerData: !!data.healerData,
    // 🔧 DEBUG SUPPLÉMENTAIRE
    rawAvailableQuests: data.availableQuests,
    rawAvailableQuestsLength: data.availableQuests?.length
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
  
  // 🆕 ACTIONS QUÊTES : UN BOUTON PAR QUÊTE AVEC NOM SPÉCIFIQUE
  if (capabilities.includes('quest') || capabilities.includes('questGiver') || npcType === 'questGiver' || hasAvailableQuests) {
    
    if (availableQuests.length > 0) {
      console.log('🎯 CRÉATION BOUTONS QUÊTES SPÉCIFIQUES...');
      
      // 🎯 CRÉER UN BOUTON PAR QUÊTE AVEC LE NOM DE LA QUÊTE
      availableQuests.forEach((quest, index) => {
        // 🔧 AMÉLIORATION : Extraction robuste du nom de quête
        const questName = quest.name || quest.title || quest.questName || quest.questTitle || `Quête ${quest.id}`;
        const questId = quest.id || quest.questId || `quest_${index}`;
        const questDescription = quest.description || quest.questDescription || 'Mission disponible';
        
        // 🔧 NOUVEAU : Formatage du label avec préfixe "!"
        const questLabel = `! ${questName}`;
        
        console.log(`🎯 Création bouton pour quête: "${questName}" (ID: ${questId})`);
        
        actions.push({
          id: `accept_${questId}`,
          type: 'quest',
          questId: questId, // 🆕 ID spécifique de la quête
          label: questLabel, // 🆕 "! Nom de la quête" au lieu de "Quête"
          icon: '📋',
          description: questDescription,
          data: quest
        });
        
        console.log(`✅ Action quête spécifique ajoutée: "${questLabel}" (${questId})`);
      });
    } else {
      // 🔄 Fallback : bouton générique si capabilities mais pas de quêtes détectées
      console.log('⚠️ Capabilities quest détectées mais aucune quête trouvée - fallback générique');
      actions.push({
        id: 'open_quests',
        type: 'quest',
        label: 'Quêtes',
        icon: '📋',
        description: 'Missions disponibles',
        data: data.questData || {}
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

  // ===== GESTION DES ACTIONS CORRIGÉE =====

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

  // 🔧 NOUVEAU : Handler quête avec intégration QuestDetailsUI
  handleQuestAction(action, originalData) {
    console.log('📋 Gestion action quête:', action);
    
    // 🔧 NOUVEAU : Vérifier si on a un questId spécifique (bouton quête individuel)
    if (action.questId) {
      console.log(`🎯 Ouverture détails quête spécifique: ${action.questId}`);
      
      // 🔧 Mettre à jour le système de quêtes
      this.questSystem = window.questSystem || null;
      
      // Utiliser QuestDetailsUI pour cette quête spécifique
      if (this.questSystem && this.questSystem.showQuestDetailsForNpc) {
        const npcId = originalData.npcId || 'unknown';
        const success = this.questSystem.showQuestDetailsForNpc(npcId, [action.questId]);
        
        if (success) {
          console.log(`✅ QuestDetailsUI ouvert pour quête: ${action.questId}`);
          return;
        }
      }
      
      // Fallback : essayer d'utiliser les données stockées
      console.log('🔄 Fallback : utilisation données stockées...');
      if (window._lastNpcInteractionData && window._lastNpcInteractionData.availableQuests) {
        const questData = window._lastNpcInteractionData.availableQuests.find(q => q.id === action.questId);
        if (questData && this.questSystem && this.questSystem.detailsUI) {
          this.questSystem.detailsUI.showSingleQuest(
            window._lastNpcInteractionData.npcId || 'unknown',
            action.questId,
            questData
          );
          return;
        }
      }
    }
    
    // 🔄 FALLBACK : Ouverture journal quêtes générale
    console.log('📋 Fallback : ouverture journal quêtes...');
    
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

    // 🔧 NOUVEAU : Garder les données un moment au cas où QuestDetailsUI en aurait besoin
    const currentData = this.currentDialogueData;
    
    // Nettoyer l'état
    this.currentDialogueData = null;
    this.classicState = { lines: [], currentPage: 0, onClose: null, actions: [] };

    // 🔧 NOUVEAU : Nettoyer les données avec délai pour QuestDetailsUI
    setTimeout(() => {
      if (currentData && !window._questDetailsUIActive && window._lastNpcInteractionData) {
        // Ne nettoyer que si QuestDetailsUI n'est pas actif
        console.log('🧹 [DialogueManager] Nettoyage données différé');
        window._lastNpcInteractionData = null;
      }
    }, 5000); // 5 secondes de délai

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
    console.log('🔍 === DEBUG DIALOGUE MANAGER CORRIGÉ ===');
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
    
    // 🔧 NOUVEAU : Debug données stockées
    console.log('💾 DONNÉES STOCKÉES:');
    console.log('  - currentDialogueData:', !!this.currentDialogueData);
    console.log('  - _lastNpcInteractionData:', !!window._lastNpcInteractionData);
    if (window._lastNpcInteractionData) {
      console.log('    - npcName:', window._lastNpcInteractionData.npcName);
      console.log('    - availableQuests:', window._lastNpcInteractionData.availableQuests?.length || 0);
    }
    
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
      },
      storedData: {
        hasCurrentDialogue: !!this.currentDialogueData,
        hasLastNpcData: !!window._lastNpcInteractionData,
        questCount: window._lastNpcInteractionData?.availableQuests?.length || 0
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
    
    // 🔧 NOUVEAU : Nettoyer les données globales
    if (window._lastNpcInteractionData) {
      window._lastNpcInteractionData = null;
    }
    
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
    console.log('🧪 Test DialogueManager corrigé...');
    return window.dialogueManager.debugState();
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

// 🧪 FONCTIONS DE TEST CORRIGÉES
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
    console.log('✅ Dialogue marchand avec actions affiché (shop fonctionnel!)');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueWithQuests = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'Maître des Quêtes',
      portrait: 'https://via.placeholder.com/80x80/orange/white?text=QUEST',
      lines: ['Salut aventurier !', 'J\'ai plusieurs missions pour toi.'],
      capabilities: ['questGiver'],
      availableQuests: [
        {
          id: 'quest_001',
          name: 'Capturer un Pikachu',
          description: 'Trouve et capture un Pikachu sauvage'
        },
        {
          id: 'quest_002', 
          name: 'Collecter 5 Baies',
          description: 'Ramasse 5 baies dans la forêt'
        },
        {
          id: 'quest_003',
          name: 'Défier le Champion',
          description: 'Bats le champion de l\'arène'
        }
      ]
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue avec quêtes spécifiques affiché');
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

window.testDialogueWithBoth = function() {
  if (window.dialogueManager) {
    const testData = {
      name: 'PNJ Complet',
      portrait: 'https://via.placeholder.com/80x80/purple/white?text=ALL',
      lines: ['Salut ! Je peux tout faire !', 'Marchand, quêtes, et plus !'],
      capabilities: ['merchant', 'questGiver'],
      shopData: { 
        shopId: 'multi_shop',
        name: 'Super Boutique'
      },
      availableQuests: [
        {
          id: 'multi_quest_001',
          name: 'Acheter 3 Potions',
          description: 'Achète 3 potions dans ma boutique'
        }
      ]
    };
    
    window.dialogueManager.show(testData);
    console.log('✅ Dialogue multi-fonction affiché (shop + quêtes)');
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

console.log('✅ DialogueManager CORRIGÉ - Shop fonctionnel!');
console.log('🧪 Utilisez window.testDialogueManager() pour diagnostiquer');
console.log('🛒 Utilisez window.testDialogueWithShop() pour tester marchand (maintenant fonctionnel!)');
console.log('📋 Utilisez window.testDialogueWithQuests() pour tester quêtes spécifiques');
console.log('🎭 Utilisez window.testDialogueWithBoth() pour tester shop + quêtes');
console.log('👤 Utilisez window.testDialogueSimpleNPC() pour tester NPC simple');
console.log('🔧 FIX: L\'intercepteur de quêtes ne bloque plus les boutons shop!');
