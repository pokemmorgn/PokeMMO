// client/src/game/ShopSystem.js - FIX SHOP OPENING
// ✅ Correction des verrous et amélioration du debugging

import { ShopUI } from '../components/ShopUI.js';

export class ShopSystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.shopUI = null;
    this.currentShopId = null;
    this.currentNpcId = null;

    // ✅ VERROUS SIMPLIFIÉS
    this.lastOpenAttempt = 0;
    
    // ✅ Référence au NotificationManager
    this.notificationManager = window.NotificationManager;
    
    // État du système
    this.isInitialized = false;
    this.playerGold = 0;
    this.lastTransactionTime = 0;
    
    this.init();
  }

  init() {
    try {
      // Créer l'interface de shop
      this.shopUI = new ShopUI(this.gameRoom);
      
      // Configurer les interactions entre les composants
      this.setupInteractions();
      
      // Rendre le système accessible globalement
      window.shopSystem = this;
      
      this.isInitialized = true;
      console.log("🏪 Système de shop initialisé");
    } catch (error) {
      console.error("❌ Erreur initialisation ShopSystem:", error);
    }
  }

  setupInteractions() {
    // Écouter les événements du serveur pour les shops
    this.setupServerListeners();
    
    // Configurer les raccourcis clavier
    this.setupKeyboardShortcuts();
    
    // Intégrer avec les autres systèmes
    this.setupSystemIntegration();
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    console.log("📡 Configuration des listeners serveur pour ShopSystem");

    // ✅ SUPPRIMÉ: Listener "npcInteractionResult" - maintenant géré par InteractionManager
    // L'InteractionManager appelle directement handleShopNpcInteraction()

    // ✅ Résultats de transaction shop
    this.gameRoom.onMessage("shopTransactionResult", (data) => {
      this.handleTransactionResult(data);
    });

    // ✅ Catalogue de shop reçu
    this.gameRoom.onMessage("shopCatalogResult", (data) => {
      if (this.shopUI) {
        this.shopUI.handleShopCatalog(data);
      }
    });

    // ✅ Mise à jour de l'or du joueur
    this.gameRoom.onMessage("goldUpdate", (data) => {
      this.updatePlayerGold(data.newGold, data.oldGold);
    });

    // ✅ Rafraîchissement de shop
    this.gameRoom.onMessage("shopRefreshResult", (data) => {
      if (this.shopUI) {
        this.shopUI.handleRefreshResult(data);
      }
    });
  }

  // ✅ GESTION DES INTERACTIONS NPC MARCHAND - VERSION SIMPLIFIÉE
  handleShopNpcInteraction(data) {
    console.log(`🏪 [ShopSystem] === HANDLE SHOP NPC INTERACTION ===`);
    console.log(`📊 Data reçue:`, data);

    // ✅ VERROU SIMPLE : éviter les appels trop rapprochés
    const now = Date.now();
    if (now - this.lastOpenAttempt < 500) {
      console.warn(`⚠️ [ShopSystem] Tentative d'ouverture trop rapide, ignoré`);
      return;
    }
    this.lastOpenAttempt = now;

    try {
      // Extraire les données importantes
      const shopId = data.shopId || 'default_shop';
      const shopData = data.shopData;
      
      // ✅ CORRECTION MAJEURE: Construction robuste de l'objet NPC
      let npc = { name: "Marchand", id: data.npcId || 'unknown' };
      
      // 1. Priorité aux données NPC du serveur
      if (data.npc && typeof data.npc === 'object') {
        npc = { ...npc, ...data.npc };
        console.log('🎭 NPC depuis data.npc:', npc);
      }
      
      // 2. Puis aux données npcName
      if (data.npcName) {
        if (typeof data.npcName === 'object' && data.npcName.name) {
          npc.name = data.npcName.name;
          npc.id = data.npcName.id || npc.id;
          console.log('🎭 NPC depuis data.npcName objet:', npc);
        } else if (typeof data.npcName === 'string') {
          npc.name = data.npcName;
          console.log('🎭 NPC depuis data.npcName string:', npc);
        }
      }
      
      // 3. Enrichir avec le vrai NPC du manager si possible
      const realNpc = this.scene?.npcManager?.getNpcData?.(data.npcId) ||
                     window.interactionManager?.state?.lastInteractedNpc;
      
      if (realNpc) {
        npc = {
          ...realNpc,
          name: realNpc.name || npc.name,
          id: realNpc.id || npc.id
        };
        console.log('🎭 NPC enrichi depuis manager:', npc);
      }

      // Stocker les infos du shop
      this.currentShopId = shopId;
      this.currentNpcId = data.npcId;

      // Extraire l'or du joueur
      if (shopData && shopData.playerGold !== undefined) {
        this.playerGold = shopData.playerGold;
      }

      // ✅ OUVERTURE SIMPLE ET DIRECTE
      console.log(`🚀 [ShopSystem] Ouverture shop: ${shopId} pour ${npc.name}`);
      const success = this.directOpenShop(shopId, npc, shopData);
      
      if (success) {
        // Notification de succès
        this.showInfo(`Bienvenue chez ${npc.name} !`);
      } else {
        console.error('❌ Échec ouverture shop');
        this.showError('Impossible d\'ouvrir le shop');
      }
      
    } catch (error) {
      console.error('❌ Erreur handleShopNpcInteraction:', error);
      console.error('Stack trace:', error.stack);
      this.showError(`Erreur shop: ${error.message}`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Ouverture directe sans verrous complexes
  directOpenShop(shopId, npc, shopData = null) {
    console.log(`🚪 [ShopSystem] === OUVERTURE DIRECTE ===`);
    console.log(`🎯 Shop: ${shopId}`);
    console.log(`🎭 NPC:`, npc);
    console.log(`📦 ShopData disponible:`, !!shopData);

    // ✅ Vérifier l'UI
    if (!this.shopUI) {
      console.error('❌ ShopUI manquant!');
      return false;
    }

    try {
      // ✅ FORCER fermeture si déjà ouvert
      if (this.isShopOpen()) {
        console.log('🔄 Shop déjà ouvert, fermeture forcée...');
        this.shopUI.hide();
        // Petit délai pour s'assurer que la fermeture est effective
        setTimeout(() => this.continueOpening(shopId, npc, shopData), 100);
        return true;
      } else {
        return this.continueOpening(shopId, npc, shopData);
      }

    } catch (error) {
      console.error('❌ Erreur ouverture directe:', error);
      this.showError(`Erreur technique: ${error.message}`);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Continuer l'ouverture
  continueOpening(shopId, npc, shopData) {
    console.log(`▶️ [ShopSystem] Continuation ouverture...`);
    
    try {
      // ✅ RESET complet de l'état du ShopUI
      if (this.shopUI) {
        this.shopUI.isProcessingCatalog = false;
        this.shopUI.selectedItem = null;
        this.shopUI.shopData = null;
      }

      // ✅ OUVERTURE DIRECTE
      console.log(`🚪 Ouverture interface shop...`);
      this.shopUI.show(shopId, npc);

      // ✅ INJECTION IMMÉDIATE DES DONNÉES si disponibles
      if (shopData) {
        console.log('💉 Injection immédiate des données...');
        
        // Construire la structure attendue
        const catalogData = {
          success: true,
          catalog: shopData,
          playerGold: this.playerGold || 0
        };
        
        // Forcer le traitement avec un petit délai pour s'assurer que l'UI est prête
        setTimeout(() => {
          if (this.shopUI && this.shopUI.isVisible) {
            this.shopUI.handleShopCatalog(catalogData);
            console.log('✅ Données injectées avec succès');
          }
        }, 50);
      }

      // ✅ Jouer son d'ouverture
      this.playSound('shop_open');

      // ✅ Mettre à jour l'état global
      this.updateGlobalUIState(true);

      console.log('✅ Ouverture réussie!');
      return true;

    } catch (error) {
      console.error('❌ Erreur continuation ouverture:', error);
      return false;
    }
  }

  // ✅ FERMETURE DE SHOP
  closeShop() {
    if (!this.isShopOpen()) return;
    
    console.log(`🏪 Fermeture du shop: ${this.currentShopId}`);
    
    if (this.shopUI) {
      this.shopUI.hide();
    }
    
    this.currentShopId = null;
    this.currentNpcId = null;
    
    // ✅ Notification de fermeture
    this.showInfo("À bientôt !");
    
    // ✅ Jouer un son de fermeture
    this.playSound('shop_close');
    
    // ✅ Mettre à jour l'état global
    this.updateGlobalUIState(false);
    
    // ✅ Sauvegarder les préférences
    this.saveShopPreferences();
  }

  // ✅ GESTION DES RÉSULTATS DE TRANSACTION
  handleTransactionResult(data) {
    console.log(`💰 Résultat transaction:`, data);
    
    this.lastTransactionTime = Date.now();
    
    if (data.success) {
      // ✅ Notification de succès avec détails
      this.showTransactionSuccessNotification(data);
      
      // ✅ Effet visuel et sonore de succès
      this.playSound('shop_buy_success');
      
      // ✅ Mettre à jour l'or si fourni
      if (data.newGold !== undefined) {
        this.updatePlayerGold(data.newGold);
      }
      
      // ✅ Intégration avec l'inventaire si disponible
      this.updateInventoryAfterTransaction(data);
      
      // ✅ Ajouter à l'historique
      this.addTransactionToHistory(data);
      
    } else {
      // ✅ Notification d'échec
      this.showError(data.message || "Transaction échouée");
      
      // ✅ Son d'erreur
      this.playSound('shop_error');
    }
  }

  // ✅ NOTIFICATION DE SUCCÈS DÉTAILLÉE
  showTransactionSuccessNotification(data) {
    const message = data.message || "Transaction réussie";
    
    // ✅ Notification principale
    this.showSuccess(message);
    
    // ✅ Analyser le type de transaction
    const isBuy = message.includes('Bought') || message.includes('acheté');
    const isSell = message.includes('Sold') || message.includes('vendu');
    
    // ✅ Notification spéciale pour les achats importants
    if (isBuy && data.itemsChanged) {
      const item = data.itemsChanged[0];
      if (this.isImportantItem(item.itemId)) {
        setTimeout(() => {
          this.showAchievement(`Nouvel objet important: ${this.getItemName(item.itemId)} !`);
        }, 1000);
      }
    }
  }

  // ✅ MISE À JOUR DE L'OR DU JOUEUR
  updatePlayerGold(newGold, oldGold = null) {
    const previousGold = oldGold !== null ? oldGold : this.playerGold;
    this.playerGold = newGold;
    
    // Mettre à jour l'interface
    if (this.shopUI) {
      this.shopUI.updatePlayerGold(newGold);
    }
    
    // Notification du changement
    if (oldGold !== null) {
      this.showGoldNotification(newGold, previousGold);
    }
  }

  // ✅ NOTIFICATION DE CHANGEMENT D'OR
  showGoldNotification(newGold, oldGold) {
    const difference = newGold - oldGold;
    if (difference === 0) return;
    
    const isGain = difference > 0;
    const message = isGain 
      ? `+${difference}₽ gagné !`
      : `${Math.abs(difference)}₽ dépensé`;
    
    const notificationType = isGain ? 'success' : 'info';
    this.showNotification(message, notificationType, 2000);
  }

  // ✅ MISE À JOUR DE L'INVENTAIRE APRÈS TRANSACTION
  updateInventoryAfterTransaction(data) {
    if (!data.itemsChanged || !window.inventorySystem) return;
    
    // Notifier le système d'inventaire des changements
    data.itemsChanged.forEach(itemChange => {
      const isAdd = itemChange.quantityChanged > 0;
      
      // ✅ Déclencher les notifications d'inventaire
      if (isAdd) {
        window.inventorySystem.onItemPickup(
          itemChange.itemId, 
          itemChange.quantityChanged
        );
      }
    });
  }

  // ✅ AJOUT À L'HISTORIQUE DES TRANSACTIONS
  addTransactionToHistory(data) {
    if (!window.shopHistory) {
      window.shopHistory = [];
    }

    if (data.itemsChanged && data.itemsChanged.length > 0) {
      const item = data.itemsChanged[0];
      const action = item.quantityChanged > 0 ? 'buy' : 'sell';
      const cost = Math.abs(item.quantityChanged) * (action === 'buy' ? 
        (this.shopUI?.selectedItem?.buyPrice || 0) : 
        (this.shopUI?.selectedItem?.sellPrice || 0));

      window.shopHistory.push({
        timestamp: new Date(),
        shopId: this.currentShopId,
        itemId: item.itemId,
        itemName: this.getItemName(item.itemId),
        quantity: Math.abs(item.quantityChanged),
        action: action,
        cost: cost,
        playerGoldAfter: this.playerGold
      });

      // Garder seulement les 50 dernières transactions
      if (window.shopHistory.length > 50) {
        window.shopHistory = window.shopHistory.slice(-50);
      }
    }
  }

  // ✅ VÉRIFICATION SI UN OBJET EST IMPORTANT
  isImportantItem(itemId) {
    const importantItems = [
      'master_ball',
      'max_potion',
      'full_restore',
      'max_revive',
      'max_repel',
      'rare_candy',
      'pp_max',
      'sacred_ash'
    ];
    return importantItems.includes(itemId);
  }

  // ✅ OBTENIR LE NOM LOCALISÉ D'UN OBJET
  getItemName(itemId) {
    if (this.shopUI) {
      return this.shopUI.getItemName(itemId);
    }
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // ✅ SETUP DES RACCOURCIS CLAVIER - MODIFIÉ POUR LA TOUCHE L
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // ✅ CONDITION RESTRICTIVE : Ne capturer L que dans des conditions très spécifiques
      
      // Si le shop est ouvert, traiter les raccourcis du shop
      if (this.isShopOpen()) {
        this.handleShopKeyboardShortcuts(e);
        return;
      }
      
      // ✅ Pour ouvrir le shop avec L, il faut que TOUTES ces conditions soient vraies :
      // 1. Le joueur ne bouge PAS (aucune touche de mouvement pressée)
      // 2. Aucune autre interface n'est ouverte
      // 3. Le joueur est stationnaire depuis au moins 500ms
      // 4. Il y a un marchand à proximité
      
      if (e.key.toLowerCase() === 'l') {
        // Vérifier si c'est un raccourci shop valide
        if (this.shouldHandleShopShortcut()) {
          this.tryOpenNearbyShop();
          e.preventDefault();
          e.stopPropagation();
        }
        // Sinon, laisser passer la touche L normalement
      }
    });
  }

  // ✅ Nouvelle méthode pour déterminer si on doit traiter le raccourci shop
  shouldHandleShopShortcut() {
    // 1. Vérifier qu'aucune interface n'est ouverte
    if (!this.canPlayerInteract()) {
      return false;
    }
    
    // 2. Vérifier qu'aucune touche de mouvement n'est pressée
    if (this.areMovementKeysPressed()) {
      return false;
    }
    
    // 3. Vérifier que le joueur est près d'un marchand
    if (!this.isNearMerchant()) {
      return false;
    }
    
    // 4. Vérifier un délai depuis le dernier mouvement (optionnel)
    const timeSinceLastMovement = Date.now() - (window.lastMovementTime || 0);
    if (timeSinceLastMovement < 300) { // 300ms de délai
      return false;
    }
    
    return true;
  }

  // ✅ Vérifier si des touches de mouvement sont pressées
  areMovementKeysPressed() {
    // Accéder au système de contrôles si disponible
    if (window.gameControls && window.gameControls.pressedKeys) {
      const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'];
      return movementKeys.some(key => window.gameControls.pressedKeys.has(key.toLowerCase()));
    }
    
    // Fallback : vérifier directement
    if (this.scene && this.scene.input && this.scene.input.keyboard) {
      const cursors = this.scene.input.keyboard.cursors;
      const wasd = this.scene.input.keyboard.addKeys('W,S,A,D');
      
      return (
        cursors.left.isDown || cursors.right.isDown || 
        cursors.up.isDown || cursors.down.isDown ||
        wasd.W.isDown || wasd.A.isDown || wasd.S.isDown || wasd.D.isDown
      );
    }
    
    return false;
  }

  // ✅ Vérifier si le joueur est près d'un marchand
  isNearMerchant() {
    if (!this.scene || !this.scene.playerManager || !this.scene.npcManager) {
      return false;
    }

    const myPlayer = this.scene.playerManager.getMyPlayer();
    if (!myPlayer) return false;

    // Chercher un NPC marchand à proximité (distance plus courte)
    const nearbyNpc = this.scene.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 48); // 48px au lieu de 64
    
    if (!nearbyNpc) return false;
    
    // Vérifier si c'est un marchand
    return !!(
      nearbyNpc.properties?.npcType === 'merchant' ||
      nearbyNpc.properties?.shopId ||
      nearbyNpc.properties?.shop
    );
  }

  // ✅ Gérer les raccourcis quand le shop est ouvert
  handleShopKeyboardShortcuts(e) {
    if (!this.shopUI) return;
    
    const handled = this.shopUI.handleKeyPress(e.key);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Raccourcis supplémentaires
    switch (e.key.toLowerCase()) {
      case 'escape':
        this.closeShop();
        e.preventDefault();
        e.stopPropagation();
        break;
        
      case 'l':
        // Fermer le shop avec L aussi
        this.closeShop();
        e.preventDefault();
        e.stopPropagation();
        break;
        
      case 'arrowup':
      case 'arrowdown':
        if (this.shopUI.navigateItems) {
          this.shopUI.navigateItems(e.key === 'ArrowDown' ? 'next' : 'prev');
          e.preventDefault();
          e.stopPropagation();
        }
        break;
        
      case 'h':
        this.showTransactionHistory();
        e.preventDefault();
        e.stopPropagation();
        break;
        
      case 'p':
        this.checkForPromotions();
        e.preventDefault();
        e.stopPropagation();
        break;
    }
  }

  // ✅ Version améliorée de tryOpenNearbyShop
  tryOpenNearbyShop() {
    console.log("🏪 Recherche de marchand à proximité...");
    
    if (!this.scene || !this.scene.playerManager || !this.scene.npcManager) {
      this.showInfo("Système de jeu non disponible");
      return;
    }

    const myPlayer = this.scene.playerManager.getMyPlayer();
    if (!myPlayer) {
      this.showInfo("Joueur introuvable");
      return;
    }

    // Chercher un NPC marchand à proximité
    const nearbyNpc = this.scene.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 48);
    
    if (!nearbyNpc) {
      this.showInfo("Aucun marchand à proximité - Approchez-vous et appuyez sur L");
      return;
    }
    
    // Vérifier si c'est un marchand
    const isMerchant = !!(
      nearbyNpc.properties?.npcType === 'merchant' ||
      nearbyNpc.properties?.shopId ||
      nearbyNpc.properties?.shop
    );
    
    if (!isMerchant) {
      this.showInfo("Ce NPC n'est pas un marchand");
      return;
    }
    
    // Déclencher l'interaction avec le marchand
    console.log(`🏪 Ouverture shop via raccourci L avec NPC: ${nearbyNpc.name}`);
    if (this.scene.networkManager) {
      this.scene.networkManager.sendNpcInteract(nearbyNpc.id);
    } else {
      this.showError("Connexion réseau indisponible");
    }
  }

  // ✅ INTÉGRATION AVEC LES AUTRES SYSTÈMES
  setupSystemIntegration() {
    // Intégration avec le système d'inventaire
    if (window.inventorySystem) {
      console.log("🔗 Intégration ShopSystem ↔ InventorySystem");
    }
    
    // Intégration avec le système de quêtes
    if (window.questSystem) {
      console.log("🔗 Intégration ShopSystem ↔ QuestSystem");
    }
  }

  // ✅ MÉTHODES PUBLIQUES D'ÉTAT
  isShopOpen() {
    return this.shopUI ? this.shopUI.isVisible : false;
  }

  getCurrentShopId() {
    return this.currentShopId;
  }

  getCurrentNpcId() {
    return this.currentNpcId;
  }

  canPlayerInteract() {
    const questDialogOpen = window._questDialogActive || false;
    const chatOpen = typeof window.isChatFocused === "function" && window.isChatFocused();
    const inventoryOpen = window.inventorySystem?.isInventoryOpen() || false;
    const dialogueOpen = document.getElementById('dialogue-box')?.style.display !== 'none';
    
    return !questDialogOpen && !chatOpen && !inventoryOpen && !dialogueOpen;
  }

  canOpenMenus() {
    return !this.isShopOpen() && this.canPlayerInteract();
  }

  // ✅ MÉTHODES UTILITAIRES
  getPlayerGold() {
    return this.playerGold;
  }

  playSound(soundType) {
    // Intégration avec le système de sons si disponible
    if (typeof window.playSound === 'function') {
      const soundMap = {
        'shop_open': 'ui_shop_open',
        'shop_close': 'ui_shop_close',
        'shop_buy_success': 'ui_purchase_success',
        'shop_sell_success': 'ui_sell_success',
        'shop_error': 'ui_error',
        'shop_select': 'ui_select'
      };
      
      const soundId = soundMap[soundType];
      if (soundId) {
        window.playSound(soundId, { volume: 0.7 });
      }
    }
  }

  // ✅ ACHAT RAPIDE
  quickBuy(itemId, quantity = 1) {
    if (!this.isShopOpen()) {
      this.showWarning("Aucun shop ouvert");
      return false;
    }
    
    // Trouver l'objet dans le catalogue actuel
    const shopData = this.shopUI.shopData;
    if (!shopData) return false;
    
    const item = shopData.availableItems.find(i => i.itemId === itemId);
    if (!item) {
      this.showError(`${this.getItemName(itemId)} non disponible`);
      return false;
    }
    
    // Vérifier que l'achat est possible
    if (!this.canBuyItem(item)) {
      this.showError(`Impossible d'acheter ${this.getItemName(itemId)}`);
      return false;
    }
    
    // Effectuer l'achat
    this.gameRoom.send("shopTransaction", {
      shopId: this.currentShopId,
      action: 'buy',
      itemId: itemId,
      quantity: quantity
    });
    
    return true;
  }

  canBuyItem(item) {
    if (!item) return false;
    
    const canAfford = this.playerGold >= item.buyPrice;
    const inStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
    const isUnlocked = item.unlocked;
    
    return canAfford && inStock && isUnlocked;
  }

  // ✅ STATISTIQUES ET ANALYTICS
  getShopStats() {
    if (!this.shopUI?.shopData) return null;

    const items = this.shopUI.shopData.availableItems;
    const buyableItems = items.filter(item => item.canBuy && item.unlocked);
    const affordableItems = buyableItems.filter(item => this.canBuyItem(item));
    
    return {
      totalItems: items.length,
      buyableItems: buyableItems.length,
      affordableItems: affordableItems.length,
      playerGold: this.playerGold,
      currentTab: this.shopUI.currentTab
    };
  }

  getTransactionHistory() {
    return window.shopHistory || [];
  }

  getTotalSpent() {
    const history = this.getTransactionHistory();
    return history
      .filter(h => h.action === 'buy')
      .reduce((total, h) => total + h.cost, 0);
  }

  getTotalEarned() {
    const history = this.getTransactionHistory();
    return history
      .filter(h => h.action === 'sell')
      .reduce((total, h) => total + h.cost, 0);
  }

  // ✅ AFFICHAGE DE L'HISTORIQUE
  showTransactionHistory() {
    if (!window.shopHistory || window.shopHistory.length === 0) {
      this.showInfo("Aucun historique d'achat");
      return;
    }

    const recent = window.shopHistory.slice(-5).reverse();
    const historyText = recent.map(h => 
      `${h.action === 'buy' ? '🛒' : '💰'} ${h.quantity}x ${h.itemName} (${h.cost}₽)`
    ).join('\n');
    
    console.log('📜 Historique des achats récents:\n' + historyText);
    this.showInfo("Historique affiché dans la console");
  }

  // ✅ VÉRIFICATION DES PROMOTIONS
  checkForPromotions() {
    if (!this.shopUI?.shopData) return;

    // Exemple de logique de promotion
    const promoItems = this.shopUI.shopData.availableItems.filter(item => {
      // Promotion sur les objets chers si le joueur a beaucoup d'or
      return this.playerGold > 5000 && item.buyPrice > 1000;
    });

    if (promoItems.length > 0) {
      this.showSuccess("🎉 Offres spéciales disponibles sur les objets premium !");
    } else {
      this.showInfo("Aucune promotion en cours");
    }
  }

  // ✅ GESTION DES PRÉFÉRENCES
  saveShopPreferences() {
    const preferences = {
      favorites: window.shopFavorites || [],
      lastVisitedShop: this.currentShopId,
      preferredTab: this.shopUI?.currentTab || 'buy',
      soundEnabled: true
    };
    
    try {
      localStorage.setItem('pokeworld_shop_preferences', JSON.stringify(preferences));
      console.log('🏪 Préférences shop sauvegardées');
    } catch (error) {
      console.warn('⚠️ Impossible de sauvegarder les préférences shop:', error);
    }
  }

  loadShopPreferences() {
    try {
      const saved = localStorage.getItem('pokeworld_shop_preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        window.shopFavorites = preferences.favorites || [];
        
        console.log('🏪 Préférences shop chargées');
        return preferences;
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement préférences shop:', error);
    }
    
    return null;
  }

  // ✅ GESTION DE L'ÉTAT GLOBAL DE L'UI
  updateGlobalUIState(shopOpen) {
    // Mettre à jour la classe du body
    if (shopOpen) {
      document.body.classList.add('shop-open');
    } else {
      document.body.classList.remove('shop-open');
    }
  }

  // ✅ MÉTHODES DE NOTIFICATION SIMPLIFIÉES
  showNotification(message, type = 'info', duration = 3000) {
    if (this.notificationManager) {
      this.notificationManager.show(message, {
        type: type,
        duration: duration,
        position: 'top-center'
      });
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error', 4000);
  }

  showWarning(message) {
    this.showNotification(message, 'warning', 4000);
  }

  showInfo(message) {
    this.showNotification(message, 'info', 2000);
  }

  showAchievement(message) {
    if (this.notificationManager) {
      this.notificationManager.achievement(message, {
        duration: 5000,
        bounce: true
      });
    } else {
      this.showSuccess(message);
    }
  }

  // ✅ DEBUG ET DÉVELOPPEMENT - VERSION AMÉLIORÉE
  debugShopState() {
    console.log('🔍 [DEBUG SHOP] === ÉTAT COMPLET DU SYSTÈME ===');
    console.log('📊 GÉNÉRAL:');
    console.log('  - Shop ouvert:', this.isShopOpen());
    console.log('  - Shop ID:', this.currentShopId);
    console.log('  - NPC ID:', this.currentNpcId);
    console.log('  - Or du joueur:', this.getPlayerGold());
    console.log('  - Initialisé:', this.isInitialized);
    console.log('  - Dernière tentative:', Date.now() - this.lastOpenAttempt, 'ms ago');
    
    console.log('🖼️ SHOPUI:');
    if (this.shopUI) {
      console.log('  - Existe:', true);
      console.log('  - Visible:', this.shopUI.isVisible);
      console.log('  - Processing catalog:', this.shopUI.isProcessingCatalog);
      console.log('  - Onglet actuel:', this.shopUI.currentTab);
      console.log('  - Objet sélectionné:', this.shopUI.selectedItem?.itemId);
      console.log('  - Overlay existe:', !!this.shopUI.overlay);
      
      if (this.shopUI.shopData) {
        console.log('  - Shop data existe:', true);
        console.log('  - Nom NPC:', this.shopUI.shopData.npcName);
        console.log('  - Items disponibles:', this.shopUI.shopData.availableItems?.length || 0);
        console.log('  - Shop info:', this.shopUI.shopData.shopInfo);
      } else {
        console.log('  - Shop data:', false);
      }
    } else {
      console.log('  - ShopUI: ❌ MANQUANT');
    }
    
    console.log('🌐 RÉSEAU:');
    console.log('  - GameRoom existe:', !!this.gameRoom);
    console.log('  - NetworkManager existe:', !!this.scene?.networkManager);
    console.log('  - Connecté:', this.scene?.networkManager?.isConnected);
    
    const stats = this.getShopStats();
    if (stats) {
      console.log('📈 STATISTIQUES:', stats);
    }
    
    console.log('🧪 TESTS DISPONIBLES:');
    console.log('  - window.forceOpenTestShop() - Test ouverture forcée');
    console.log('  - window.shopSystem.debugShopState() - Ce debug');
    console.log('  - window.shopSystem.directOpenShop() - Méthode directe');
    
    return {
      isOpen: this.isShopOpen(),
      hasUI: !!this.shopUI,
      hasData: !!this.shopUI?.shopData,
      playerGold: this.playerGold,
      isInitialized: this.isInitialized,
      stats: stats
    };
  }

  // ✅ MÉTHODES DE NETTOYAGE
  cleanupShopData() {
    // Nettoyer les données temporaires
    this.currentShopId = null;
    this.currentNpcId = null;
    
    // Sauvegarder les préférences avant nettoyage
    this.saveShopPreferences();
    
    console.log('🧹 Données shop nettoyées');
  }

  destroy() {
    console.log('💀 Destruction ShopSystem');
    
    // Fermer le shop si ouvert
    if (this.isShopOpen()) {
      this.closeShop();
    }
    
    // Sauvegarder les préférences
    this.saveShopPreferences();
    
    // Nettoyer l'interface
    if (this.shopUI) {
      this.shopUI.destroy();
      this.shopUI = null;
    }
    
    // Nettoyer les références
    this.scene = null;
    this.gameRoom = null;
    this.notificationManager = null;
    this.isInitialized = false;
    
    // Supprimer la référence globale
    if (window.shopSystem === this) {
      window.shopSystem = null;
    }
    
    console.log('✅ ShopSystem détruit');
  }

  // ✅ MÉTHODE D'INITIALISATION FINALE
  onSceneReady() {
    // Charger les préférences sauvegardées
    this.loadShopPreferences();
    
    console.log('🏪 ShopSystem prêt pour la scène');
  }
}

// ✅ FONCTIONS DE DEBUG GLOBALES AMÉLIORÉES
window.forceOpenTestShop = function() {
  if (window.shopSystem && window.shopSystem.directOpenShop) {
    console.log('🧪 Test d\'ouverture directe...');
    window.shopSystem.directOpenShop('test_shop', 
      { name: 'Marchand Test', id: 'test_npc' }, 
      {
        shopInfo: { id: 'test_shop', name: 'Boutique Test' },
        availableItems: [
          { itemId: 'potion', buyPrice: 300, stock: 10, canBuy: true, unlocked: true },
          { itemId: 'poke_ball', buyPrice: 200, stock: 5, canBuy: true, unlocked: true },
          { itemId: 'antidote', buyPrice: 100, stock: 3, canBuy: true, unlocked: true }
        ]
      }
    );
  } else {
    console.error('❌ ShopSystem non disponible');
  }
};

window.debugCompleteShop = function() {
  if (window.shopSystem) {
    return window.shopSystem.debugShopState();
  } else {
    console.error('❌ ShopSystem non disponible');
    return { error: 'ShopSystem manquant' };
  }
};

window.resetShopSystem = function() {
  if (window.shopSystem) {
    console.log('🔄 Reset ShopSystem...');
    
    // Fermer le shop si ouvert
    if (window.shopSystem.isShopOpen()) {
      window.shopSystem.closeShop();
    }
    
    // Reset les verrous
    window.shopSystem.lastOpenAttempt = 0;
    
    // Reset l'UI
    if (window.shopSystem.shopUI) {
      window.shopSystem.shopUI.isProcessingCatalog = false;
      window.shopSystem.shopUI.selectedItem = null;
      window.shopSystem.shopUI.shopData = null;
    }
    
    console.log('✅ ShopSystem reseté');
  }
};

console.log('✅ ShopSystem corrigé chargé!');
console.log('🧪 Utilisez window.forceOpenTestShop() pour tester');
console.log('🔍 Utilisez window.debugCompleteShop() pour diagnostiquer');
console.log('🔄 Utilisez window.resetShopSystem() pour reset');
