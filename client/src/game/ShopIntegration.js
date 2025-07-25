// client/src/game/ShopIntegration.js - FIX SHOP HANDLERS
// ✅ Éviter les handlers multiples et conflits

import { ShopSystem } from './ShopSystem.js';

export class ShopIntegration {
  constructor(scene) {
    this.scene = scene;
    this.shopSystem = null;
    this.isInitialized = false;
    
    // ✅ NOUVEAUX VERROUS ANTI-DOUBLON
    this.shopHandlersSetup = false;
    this.networkListenersAdded = false;
    
    console.log(`🏪 [${scene.scene.key}] ShopIntegration créé`);
  }

  // ✅ MÉTHODE PRINCIPALE : Initialisation complète du système shop
  initialize(networkManager) {
    if (this.isInitialized || !networkManager) {
      console.log(`🏪 [${this.scene.scene.key}] Shop déjà initialisé ou pas de NetworkManager`);
      return;
    }

    try {
      console.log(`🏪 [${this.scene.scene.key}] === INITIALISATION SHOP SYSTEM ===`);

      // 1. ✅ Réutiliser l'instance globale si elle existe ET qu'elle fonctionne
      if (window.shopSystem && this.validateExistingShopSystem(window.shopSystem)) {
        console.log(`🔄 [${this.scene.scene.key}] Réutilisation du ShopSystem global existant`);
        this.shopSystem = window.shopSystem;
        this.updateShopSystemScene(networkManager);
      } else {
        // 2. ✅ Créer une nouvelle instance
        console.log(`🆕 [${this.scene.scene.key}] Création d'un nouveau ShopSystem`);
        this.shopSystem = new ShopSystem(this.scene, networkManager.room);
        window.shopSystem = this.shopSystem;
      }

      // 3. ✅ Setup des événements et raccourcis
      this.setupShopEventHandlers();
      
      // ✅ IMPORTANT: NE PAS SETUP LES NETWORK HANDLERS ICI
      // L'InteractionManager gère maintenant les handlers "npcInteractionResult"
      // On setup seulement les handlers spécifiques au shop
      this.setupShopSpecificNetworkHandlers(networkManager);

      // 4. ✅ Marquer comme initialisé
      this.isInitialized = true;
      console.log(`✅ [${this.scene.scene.key}] ShopIntegration initialisé avec succès`);

      // 5. ✅ Test optionnel après initialisation
      this.testShopIntegration();

    } catch (error) {
      console.error(`❌ [${this.scene.scene.key}] Erreur initialisation ShopIntegration:`, error);
    }
  }

  // ✅ Valider un ShopSystem existant
  validateExistingShopSystem(existingShopSystem) {
    try {
      // Vérifier que les composants essentiels existent
      const hasShopUI = existingShopSystem.shopUI && typeof existingShopSystem.shopUI.show === 'function';
      const hasGameRoom = existingShopSystem.gameRoom;
      const isInitialized = existingShopSystem.isInitialized;

      const isValid = hasShopUI && hasGameRoom && isInitialized;
      
      console.log(`🔍 [${this.scene.scene.key}] Validation ShopSystem existant:`, {
        hasShopUI,
        hasGameRoom,
        isInitialized,
        isValid
      });

      return isValid;
    } catch (error) {
      console.warn(`⚠️ [${this.scene.scene.key}] Erreur validation ShopSystem existant:`, error);
      return false;
    }
  }

  // ✅ Mettre à jour un ShopSystem existant avec la nouvelle scène
  updateShopSystemScene(networkManager) {
    if (!this.shopSystem) return;

    try {
      // Mettre à jour les références
      this.shopSystem.scene = this.scene;
      this.shopSystem.gameRoom = networkManager.room;

      console.log(`🔄 [${this.scene.scene.key}] ShopSystem mis à jour pour la nouvelle scène`);
    } catch (error) {
      console.error(`❌ [${this.scene.scene.key}] Erreur mise à jour ShopSystem:`, error);
    }
  }

  // ✅ Setup des événements shop spécifiques à la scène
  setupShopEventHandlers() {
    if (!this.scene.events) return;

    // Événement quand la scène est fermée
    this.scene.events.on('shutdown', () => {
      console.log(`🏪 [${this.scene.scene.key}] Scène fermée, préservation du ShopSystem`);
      this.handleSceneShutdown();
    });

    // Événement de destruction de la scène
    this.scene.events.on('destroy', () => {
      console.log(`🏪 [${this.scene.scene.key}] Scène détruite`);
      this.handleSceneDestroy();
    });

    console.log(`✅ [${this.scene.scene.key}] Événements shop configurés`);
  }

  // ✅ Setup UNIQUEMENT des handlers réseau spécifiques au shop
  setupShopSpecificNetworkHandlers(networkManager) {
    if (!networkManager || !networkManager.room) return;

    // ✅ CRITIQUE: Ne pas ajouter de listener "npcInteractionResult"
    // Ce handler est maintenant géré par l'InteractionManager
    
    // ✅ CORRECTION: Éviter les listeners multiples
    if (this.networkListenersAdded) {
      console.log(`📡 [${this.scene.scene.key}] Listeners shop déjà ajoutés, ignoré`);
      return;
    }
    this.networkListenersAdded = true;

    try {
      const room = networkManager.room;

      // ✅ Handler pour les résultats de transaction shop
      room.onMessage("shopTransactionResult", (data) => {
        console.log(`💰 [${this.scene.scene.key}] Résultat transaction shop:`, data);
        if (this.shopSystem) {
          this.shopSystem.handleTransactionResult(data);
        }
      });

      // ✅ Handler pour le catalogue shop
      room.onMessage("shopCatalogResult", (data) => {
        console.log(`📋 [${this.scene.scene.key}] Catalogue shop reçu:`, data);
        
        if (this.shopSystem && this.shopSystem.shopUI) {
          this.shopSystem.shopUI.handleShopCatalog(data);
        }
      });

      // ✅ Handler pour les mises à jour d'or
      room.onMessage("goldUpdate", (data) => {
        console.log(`💰 [${this.scene.scene.key}] Mise à jour or:`, data);
        if (this.shopSystem) {
          this.shopSystem.updatePlayerGold(data.newGold, data.oldGold);
        }
      });

      // ✅ Handler pour le refresh de shop
      room.onMessage("shopRefreshResult", (data) => {
        console.log(`🔄 [${this.scene.scene.key}] Refresh shop:`, data);
        if (this.shopSystem && this.shopSystem.shopUI) {
          this.shopSystem.shopUI.handleRefreshResult(data);
        }
      });

      console.log(`📡 [${this.scene.scene.key}] Handlers réseau shop spécifiques configurés`);
    } catch (error) {
      console.error(`❌ [${this.scene.scene.key}] Erreur setup handlers shop:`, error);
    }
  }

  // ✅ Gérer le raccourci clavier S (si nécessaire)
  handleShopShortcut() {
    // Vérifier que le joueur peut interagir
    if (!this.canPlayerInteractWithShop()) {
      return;
    }

    if (this.shopSystem && this.shopSystem.isShopOpen()) {
      // Fermer le shop si ouvert
      this.shopSystem.closeShop();
    } else {
      // Essayer d'ouvrir un shop à proximité
      this.tryOpenNearbyShop();
    }
  }

  // ✅ Essayer d'ouvrir un shop à proximité
  tryOpenNearbyShop() {
    if (!this.scene.playerManager || !this.scene.npcManager) {
      console.log(`🏪 [${this.scene.scene.key}] PlayerManager ou NpcManager manquant`);
      return;
    }

    const myPlayer = this.scene.playerManager.getMyPlayer();
    if (!myPlayer) {
      console.log(`🏪 [${this.scene.scene.key}] Joueur local introuvable`);
      return;
    }

    // Chercher un NPC marchand à proximité
    const npc = this.scene.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
    if (!npc) {
      this.showMessage("Aucun marchand à proximité", 'info');
      return;
    }

    // Vérifier si c'est un marchand
    if (!this.isNpcMerchant(npc)) {
      this.showMessage("Ce NPC n'est pas un marchand", 'warning');
      return;
    }

    // Déclencher l'interaction avec le marchand
    console.log(`🏪 [${this.scene.scene.key}] Ouverture shop via raccourci avec NPC: ${npc.name}`);
    if (this.scene.networkManager) {
      this.scene.networkManager.sendNpcInteract(npc.id);
    }
  }

  // ✅ Vérifier si un NPC est un marchand
  isNpcMerchant(npc) {
    if (!npc || !npc.properties) return false;
    
    return !!(
      npc.properties.npcType === 'merchant' ||
      npc.properties.shopId ||
      npc.properties.shop
    );
  }

  // ✅ Vérifier si le joueur peut interagir avec le shop
  canPlayerInteractWithShop() {
    // Vérifications communes
    const questDialogOpen = window._questDialogActive || false;
    const chatOpen = typeof window.isChatFocused === "function" && window.isChatFocused();
    const inventoryOpen = window.inventorySystem?.isInventoryOpen() || false;
    const dialogueOpen = document.getElementById('dialogue-box')?.style.display !== 'none';
    
    const canInteract = !questDialogOpen && !chatOpen && !inventoryOpen && !dialogueOpen;
    
    if (!canInteract) {
      console.log(`🏪 [${this.scene.scene.key}] Interaction bloquée:`, {
        questDialogOpen,
        chatOpen,
        inventoryOpen,
        dialogueOpen
      });
    }
    
    return canInteract;
  }

  // ✅ Afficher un message dans la scène
  showMessage(message, type = 'info') {
    if (this.shopSystem && typeof this.shopSystem.showNotification === 'function') {
      this.shopSystem.showNotification(message, type);
    } else if (this.scene.showNotification && typeof this.scene.showNotification === 'function') {
      this.scene.showNotification(message, type);
    } else {
      console.log(`📢 [${this.scene.scene.key}] ${type.toUpperCase()}: ${message}`);
    }
  }

  // ✅ Test d'intégration shop
  testShopIntegration() {
    if (!this.shopSystem) return;

    this.scene.time.delayedCall(1000, () => {
      try {
        console.log(`🧪 [${this.scene.scene.key}] Test d'intégration shop...`);
        
        const tests = [
          () => this.shopSystem.isShopOpen() !== undefined,
          () => this.shopSystem.canPlayerInteract() !== undefined,
          () => this.shopSystem.shopUI !== null,
          () => this.shopSystem.gameRoom !== null
        ];

        const results = tests.map((test, index) => {
          try {
            return test();
          } catch (error) {
            console.warn(`⚠️ Test ${index + 1} échoué:`, error);
            return false;
          }
        });

        const passedTests = results.filter(Boolean).length;
        const totalTests = tests.length;

        console.log(`🧪 [${this.scene.scene.key}] Tests shop: ${passedTests}/${totalTests} réussis`);

        if (passedTests === totalTests) {
          console.log(`✅ [${this.scene.scene.key}] Intégration shop validée`);
        } else {
          console.warn(`⚠️ [${this.scene.scene.key}] Intégration shop partiellement fonctionnelle`);
        }

      } catch (error) {
        console.error(`❌ [${this.scene.scene.key}] Erreur test intégration shop:`, error);
      }
    });
  }

  // ✅ Gestion de la fermeture de scène (préservation du shop)
  handleSceneShutdown() {
    // ✅ NE PAS détruire le ShopSystem, juste noter le changement de scène
    if (this.shopSystem && this.shopSystem.isShopOpen()) {
      console.log(`🏪 [${this.scene.scene.key}] Shop ouvert pendant changement de scène, préservation`);
      // On peut éventuellement sauvegarder l'état ici
    }
    
    this.isInitialized = false;
    this.networkListenersAdded = false; // ✅ Permettre de reconfigurer les listeners
  }

  // ✅ Gestion de la destruction de scène
  handleSceneDestroy() {
    // ✅ Cleanup léger seulement
    this.scene = null;
    this.isInitialized = false;
    this.networkListenersAdded = false;
    
    // ✅ NE PAS toucher au ShopSystem global
    console.log(`🏪 [ShopIntegration] Références de scène nettoyées`);
  }

  // ✅ MÉTHODES UTILITAIRES PUBLIQUES

  // Obtenir le ShopSystem actuel
  getShopSystem() {
    return this.shopSystem;
  }

  // Vérifier si le shop est initialisé
  isShopInitialized() {
    return this.isInitialized && this.shopSystem !== null;
  }

  // Forcer une réinitialisation
  forceReinitialize(networkManager) {
    console.log(`🔄 [${this.scene.scene.key}] Réinitialisation forcée du shop`);
    this.isInitialized = false;
    this.shopSystem = null;
    this.shopHandlersSetup = false;
    this.networkListenersAdded = false;
    this.initialize(networkManager);
  }

  // ✅ MÉTHODES DE DEBUG

  // Debug de l'état du shop
  debugShopState() {
    console.log(`🔍 [${this.scene.scene.key}] === DEBUG SHOP INTEGRATION ===`);
    console.log(`- Initialisé:`, this.isInitialized);
    console.log(`- ShopSystem:`, !!this.shopSystem);
    console.log(`- Handlers setup:`, this.shopHandlersSetup);
    console.log(`- Network listeners:`, this.networkListenersAdded);
    console.log(`- Shop ouvert:`, this.shopSystem?.isShopOpen());
    console.log(`- ShopUI:`, !!this.shopSystem?.shopUI);
    console.log(`- GameRoom:`, !!this.shopSystem?.gameRoom);
    
    if (this.shopSystem && typeof this.shopSystem.debugShopState === 'function') {
      this.shopSystem.debugShopState();
    }
  }

  // Stats de l'intégration
  getIntegrationStats() {
    return {
      sceneKey: this.scene.scene.key,
      isInitialized: this.isInitialized,
      hasShopSystem: !!this.shopSystem,
      shopOpen: this.shopSystem?.isShopOpen() || false,
      canInteract: this.canPlayerInteractWithShop(),
      handlersSetup: this.shopHandlersSetup,
      networkListeners: this.networkListenersAdded
    };
  }
}

// ✅ MÉTHODE STATIQUE POUR INTÉGRATION EN UNE LIGNE - MISE À JOUR
export function integrateShopToScene(scene, networkManager) {
  if (!scene.shopIntegration) {
    scene.shopIntegration = new ShopIntegration(scene);
  }
  
  scene.shopIntegration.initialize(networkManager);
  
  console.log(`🏪 [${scene.scene.key}] Shop intégré en une ligne`);
  return scene.shopIntegration;
}

// ✅ EXPORT PAR DÉFAUT
export default ShopIntegration;
