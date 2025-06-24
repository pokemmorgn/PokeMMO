// client/src/game/InteractionManager.js - VERSION CORRIGÉE
// ✅ Fix: Gestion propre des interactions NPC → Shop, debugging amélioré

export class InteractionManager {
  constructor(scene) {
    this.scene = scene;
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.shopSystem = null;
    
    // ✅ FIX: État et verrous simplifiés
    this.state = {
      isInteracting: false,
      lastInteractionTime: 0,
      lastInteractedNpc: null,
      interactionInProgress: false
    };
    
    // ✅ NOUVEAU: Monitoring et debug
    this.interactionHistory = [];
    this.debugMode = false;
    
    console.log(`🎯 [${scene.scene.key}] InteractionManager créé`);
  }

  // ✅ FIX: Initialisation robuste
  initialize(networkManager, playerManager, npcManager) {
    console.log(`🎯 [${this.scene.scene.key}] === INITIALISATION INTERACTION MANAGER ===`);
    
    this.networkManager = networkManager;
    this.playerManager = playerManager;
    this.npcManager = npcManager;
    
    // ✅ Validation des dépendances
    if (!this.validateDependencies()) {
      console.error(`❌ [${this.scene.scene.key}] Dépendances manquantes pour InteractionManager`);
      return false;
    }
    
    // ✅ Configuration
    this.setupNetworkHandlers();
    this.setupInputHandlers();
    this.setupShopSystemReference();
    
    console.log(`✅ [${this.scene.scene.key}] InteractionManager initialisé`);
    return true;
  }

  // ✅ NOUVEAU: Validation des dépendances
  validateDependencies() {
    const deps = {
      networkManager: this.networkManager,
      playerManager: this.playerManager,
      npcManager: this.npcManager,
      scene: this.scene
    };
    
    const missing = Object.entries(deps)
      .filter(([name, dep]) => !dep)
      .map(([name]) => name);
    
    if (missing.length > 0) {
      console.error(`❌ Dépendances manquantes: ${missing.join(', ')}`);
      return false;
    }
    
    console.log(`✅ Toutes les dépendances validées`);
    return true;
  }

  // ✅ FIX: Setup des handlers réseau spécifiques aux interactions
  setupNetworkHandlers() {
    if (!this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.scene.key}] Pas de room pour setup handlers`);
      return;
    }

    console.log(`📡 [${this.scene.scene.key}] Configuration handlers réseau InteractionManager...`);

    // ✅ CRITIQUE: Handler principal pour les résultats d'interaction NPC
    this.networkManager.room.onMessage("npcInteractionResult", (data) => {
      console.log(`🎭 [${this.scene.scene.key}] === NPC INTERACTION RESULT ===`);
      console.log(`📊 Data reçue:`, data);
      
      this.logInteraction('npc_interaction_result', data);
      this.handleNpcInteractionResult(data);
    });

    // ✅ Handler pour les erreurs d'interaction
    this.networkManager.room.onMessage("interactionError", (data) => {
      console.error(`❌ [${this.scene.scene.key}] Erreur interaction:`, data);
      this.handleInteractionError(data);
    });

    // ✅ Handler pour les dialogues (si implémenté)
    this.networkManager.room.onMessage("npcDialogue", (data) => {
      console.log(`💬 [${this.scene.scene.key}] Dialogue NPC:`, data);
      this.handleNpcDialogue(data);
    });

    console.log(`✅ [${this.scene.scene.key}] Handlers réseau InteractionManager configurés`);
  }

  // ✅ FIX: Gestion des résultats d'interaction avec shop
  handleNpcInteractionResult(data) {
    console.log(`🎭 [${this.scene.scene.key}] === HANDLE NPC INTERACTION RESULT FIX ===`);
    
    // ✅ Validation des données
    if (!this.validateInteractionData(data)) {
      this.showMessage("Interaction invalide", "error");
      return;
    }

    // ✅ Mettre à jour l'état
    this.state.lastInteractionTime = Date.now();
    this.state.lastInteractedNpc = data.npc || { id: data.npcId, name: data.npcName };
    this.state.interactionInProgress = true;

    try {
      // ✅ Traitement selon le type d'interaction
      switch (data.interactionType || data.type) {
        case 'shop':
        case 'merchant':
          this.handleShopInteraction(data);
          break;
          
        case 'dialogue':
        case 'talk':
          this.handleDialogueInteraction(data);
          break;
          
        case 'quest':
          this.handleQuestInteraction(data);
          break;
          
        case 'heal':
        case 'nurse':
          this.handleHealInteraction(data);
          break;
          
        default:
          console.warn(`⚠️ Type d'interaction non géré: ${data.interactionType}`);
          this.handleGenericInteraction(data);
      }
      
    } catch (error) {
      console.error(`❌ Erreur traitement interaction:`, error);
      this.showMessage(`Erreur interaction: ${error.message}`, "error");
    } finally {
      // ✅ Reset état après traitement
      setTimeout(() => {
        this.state.interactionInProgress = false;
      }, 1000);
    }
  }

  // ✅ NOUVEAU: Validation des données d'interaction
  validateInteractionData(data) {
    if (!data) {
      console.error(`❌ Pas de données d'interaction`);
      return false;
    }

    if (!data.npcId && !data.npc?.id) {
      console.error(`❌ Pas d'ID NPC dans les données`);
      return false;
    }

    if (!data.interactionType && !data.type && !data.shopData && !data.shopId) {
      console.warn(`⚠️ Type d'interaction non spécifié, tentative de déduction...`);
      
      // ✅ Déduction du type
      if (data.shopData || data.shopId) {
        data.interactionType = 'shop';
      } else if (data.dialogue || data.message) {
        data.interactionType = 'dialogue';
      } else {
        data.interactionType = 'generic';
      }
      
      console.log(`🔍 Type déduit: ${data.interactionType}`);
    }

    return true;
  }

  // ✅ FIX: Gestion spécifique des interactions shop
  handleShopInteraction(data) {
    console.log(`🏪 [${this.scene.scene.key}] === HANDLE SHOP INTERACTION ===`);
    console.log(`📊 Shop data:`, data);

    // ✅ Vérifier que le shop system est disponible
    if (!this.shopSystem && !window.shopSystem) {
      console.error(`❌ ShopSystem non disponible`);
      this.showMessage("Système de boutique non disponible", "error");
      return;
    }

    // ✅ Utiliser la référence shop disponible
    const shopSystem = this.shopSystem || window.shopSystem;

    // ✅ Validation des données shop
    if (!data.shopId && !data.shopData) {
      console.error(`❌ Pas de données de boutique`);
      this.showMessage("Boutique indisponible", "error");
      return;
    }

    try {
      // ✅ Déléguer au ShopSystem
      console.log(`🚀 Délégation vers ShopSystem...`);
      
      // ✅ Structurer les données pour le ShopSystem
      const shopInteractionData = {
        shopId: data.shopId || 'default_shop',
        shopData: data.shopData,
        npcId: data.npcId || data.npc?.id,
        npc: data.npc,
        npcName: data.npcName,
        interactionType: 'shop'
      };

      // ✅ Appeler la méthode du ShopSystem
      if (typeof shopSystem.handleShopNpcInteraction === 'function') {
        shopSystem.handleShopNpcInteraction(shopInteractionData);
        console.log(`✅ Interaction shop déléguée avec succès`);
      } else {
        console.error(`❌ Méthode handleShopNpcInteraction manquante`);
        this.showMessage("Erreur interne boutique", "error");
      }
      
    } catch (error) {
      console.error(`❌ Erreur délégation shop:`, error);
      this.showMessage(`Erreur boutique: ${error.message}`, "error");
    }
  }

  // ✅ NOUVEAU: Gestion des dialogues
  handleDialogueInteraction(data) {
    console.log(`💬 [${this.scene.scene.key}] Dialogue avec NPC:`, data);
    
    // ✅ Afficher le dialogue
    const message = data.dialogue || data.message || "Bonjour !";
    const npcName = data.npcName || data.npc?.name || "NPC";
    
    this.showDialogue(npcName, message);
  }

  // ✅ NOUVEAU: Gestion des quêtes
  handleQuestInteraction(data) {
    console.log(`🎯 [${this.scene.scene.key}] Interaction quête:`, data);
    
    // ✅ Déléguer au système de quêtes si disponible
    if (window.questSystem && typeof window.questSystem.handleNpcQuestInteraction === 'function') {
      window.questSystem.handleNpcQuestInteraction(data);
    } else {
      this.showMessage("Système de quêtes non disponible", "warning");
    }
  }

  // ✅ NOUVEAU: Gestion des soins
  handleHealInteraction(data) {
    console.log(`🏥 [${this.scene.scene.key}] Interaction soin:`, data);
    
    // ✅ Logique de soin basique
    this.showMessage("Vos Pokémon ont été soignés !", "success");
    
    // ✅ Si système de Pokémon disponible, déclencher soin
    if (window.pokemonSystem && typeof window.pokemonSystem.healAllPokemon === 'function') {
      window.pokemonSystem.healAllPokemon();
    }
  }

  // ✅ NOUVEAU: Gestion générique
  handleGenericInteraction(data) {
    console.log(`🎭 [${this.scene.scene.key}] Interaction générique:`, data);
    
    const npcName = data.npcName || data.npc?.name || "NPC";
    const message = data.message || `Vous parlez avec ${npcName}`;
    
    this.showMessage(message, "info");
  }

  // ✅ FIX: Setup des inputs avec gestion de touche E
  setupInputHandlers() {
    if (!this.scene.input?.keyboard) {
      console.warn(`⚠️ [${this.scene.scene.key}] Pas de clavier pour setup inputs`);
      return;
    }

    console.log(`⌨️ [${this.scene.scene.key}] Configuration inputs InteractionManager...`);

    // ✅ Touche E pour interaction
    this.scene.input.keyboard.on('keydown-E', () => {
      if (this.canPlayerInteract()) {
        this.tryInteractWithNearestNpc();
      }
    });

    // ✅ Empêcher la propagation de E dans d'autres systèmes quand on peut interagir
    this.scene.input.keyboard.on('keydown', (event) => {
      if (event.key.toLowerCase() === 'e' && this.canPlayerInteract()) {
        event.stopPropagation();
        event.preventDefault();
      }
    });

    console.log(`✅ [${this.scene.scene.key}] Inputs InteractionManager configurés`);
  }

  // ✅ FIX: Tentative d'interaction avec vérifications robustes
  tryInteractWithNearestNpc() {
    console.log(`🎯 [${this.scene.scene.key}] === TENTATIVE INTERACTION ===`);

    // ✅ Vérifications préalables
    if (!this.validateInteractionConditions()) {
      return;
    }

    // ✅ Protection contre spam
    const now = Date.now();
    if (now - this.state.lastInteractionTime < 500) {
      console.log(`⚠️ Interaction trop rapide, ignoré`);
      return;
    }

    try {
      // ✅ Trouver le joueur local
      const myPlayer = this.playerManager.getMyPlayer();
      if (!myPlayer) {
        console.warn(`❌ Joueur local introuvable`);
        this.showMessage("Erreur joueur", "error");
        return;
      }

      // ✅ Trouver le NPC le plus proche
      const nearestNpc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 48);
      if (!nearestNpc) {
        this.showMessage("Aucun personnage à proximité", "info");
        return;
      }

      console.log(`🎭 NPC trouvé: ${nearestNpc.name} (ID: ${nearestNpc.id})`);

      // ✅ Envoyer l'interaction au serveur
      this.sendNpcInteraction(nearestNpc);

    } catch (error) {
      console.error(`❌ Erreur tentative interaction:`, error);
      this.showMessage(`Erreur interaction: ${error.message}`, "error");
    }
  }

  // ✅ NOUVEAU: Validation des conditions d'interaction
  validateInteractionConditions() {
    // ✅ Managers disponibles
    if (!this.playerManager || !this.npcManager) {
      console.warn(`❌ Managers manquants pour interaction`);
      return false;
    }

    // ✅ Réseau disponible
    if (!this.networkManager?.room) {
      console.warn(`❌ Pas de connexion réseau pour interaction`);
      this.showMessage("Connexion requise", "warning");
      return false;
    }

    // ✅ Pas d'autre interaction en cours
    if (this.state.interactionInProgress) {
      console.log(`⚠️ Interaction déjà en cours`);
      return false;
    }

    return true;
  }

  // ✅ FIX: Envoi d'interaction au serveur
// Dans votre InteractionManager.js, remplacez la méthode sendNpcInteraction par ceci :

// ✅ FIX: Envoi d'interaction compatible avec NetworkManager mis à jour
sendNpcInteraction(npc) {
  console.log(`📤 [${this.scene.scene.key}] === ENVOI INTERACTION COMPATIBLE ===`);
  console.log(`🎭 NPC: ${npc.name} (ID: ${npc.id})`);

  if (!this.networkManager?.room) {
    console.error(`❌ Pas de room pour envoyer interaction`);
    return;
  }

  try {
    // ✅ UTILISER LES NOUVELLES MÉTHODES DU NETWORKMANAGER
    
    // Option 1: Méthode simple (recommandée pour compatibilité maximale)
    if (typeof this.networkManager.sendNpcInteract === 'function') {
      console.log(`✅ Utilisation NetworkManager.sendNpcInteract() - Format simple`);
      this.networkManager.sendNpcInteract(npc.id);
    }
    // Option 2: Méthode étendue si disponible
    else if (typeof this.networkManager.sendNpcInteraction === 'function') {
      console.log(`✅ Utilisation NetworkManager.sendNpcInteraction() - Format étendu`);
      this.networkManager.sendNpcInteraction(npc.id, {
        zone: this.scene.scene.key,
        includePosition: true,
        includeTimestamp: true
      });
    }
    // Option 3: Méthode universelle si disponible
    else if (typeof this.networkManager.interactWithNpc === 'function') {
      console.log(`✅ Utilisation NetworkManager.interactWithNpc() - Format universel`);
      this.networkManager.interactWithNpc(npc.id, {
        zone: this.scene.scene.key,
        useExtended: false // Force format simple pour compatibilité
      });
    }
    // Option 4: Fallback direct (ancien format)
    else {
      console.log(`🔄 Fallback direct vers format simple`);
      this.networkManager.room.send("npcInteract", { npcId: npc.id });
    }
    
    // ✅ Feedback utilisateur
    this.showMessage(`Interaction avec ${npc.name}...`, "info");
    
    // ✅ Log pour debug
    this.logInteraction('npc_interaction_sent_fixed', { 
      npcId: npc.id, 
      npcName: npc.name,
      method: 'networkManager_compatible'
    });

    // ✅ Timeout de sécurité
    setTimeout(() => {
      if (this.state.interactionInProgress) {
        console.warn(`⚠️ Timeout interaction avec ${npc.name}`);
        this.showMessage("Le personnage ne répond pas", "warning");
        this.state.interactionInProgress = false;
      }
    }, 10000);

    console.log(`✅ Interaction envoyée via NetworkManager`);

  } catch (error) {
    console.error(`❌ Erreur envoi interaction:`, error);
    
    // ✅ DERNIER RECOURS: Format le plus simple possible
    try {
      console.log(`🆘 Dernier recours: format ultra-simple`);
      this.networkManager.room.send("npcInteract", { npcId: npc.id });
      this.showMessage("Tentative d'interaction...", "info");
    } catch (finalError) {
      console.error(`❌ Échec complet:`, finalError);
      this.showMessage("Erreur de communication", "error");
    }
  }
}

  // ✅ NOUVEAU: Vérification si le joueur peut interagir
  canPlayerInteract() {
    // ✅ Vérifications d'interface
    const questDialogOpen = window._questDialogActive || false;
    const chatOpen = typeof window.isChatFocused === "function" && window.isChatFocused();
    const inventoryOpen = window.inventorySystem?.isInventoryOpen() || false;
    const shopOpen = this.shopSystem?.isShopOpen() || window.shopSystem?.isShopOpen() || false;
    const dialogueOpen = document.getElementById('dialogue-box')?.style.display !== 'none';
    
    const canInteract = !questDialogOpen && !chatOpen && !inventoryOpen && !shopOpen && !dialogueOpen;
    
    if (!canInteract && this.debugMode) {
      console.log(`🎯 Interaction bloquée:`, {
        questDialogOpen,
        chatOpen,
        inventoryOpen,
        shopOpen,
        dialogueOpen
      });
    }
    
    return canInteract;
  }

  // ✅ NOUVEAU: Gestion des erreurs d'interaction
  handleInteractionError(data) {
    console.error(`❌ [${this.scene.scene.key}] Erreur interaction:`, data);
    
    const message = data.message || "Erreur d'interaction";
    this.showMessage(message, "error");
    
    this.state.interactionInProgress = false;
    this.logInteraction('interaction_error', data);
  }

  // ✅ NOUVEAU: Affichage de messages
  showMessage(message, type = 'info') {
    // ✅ Utiliser NotificationManager si disponible
    if (window.NotificationManager) {
      const options = {
        duration: type === 'error' ? 4000 : 3000,
        position: 'top-center'
      };
      
      switch (type) {
        case 'success':
          window.NotificationManager.success(message, options);
          break;
        case 'error':
          window.NotificationManager.error(message, options);
          break;
        case 'warning':
          window.NotificationManager.warning(message, options);
          break;
        default:
          window.NotificationManager.info(message, options);
      }
      return;
    }

    // ✅ Fallback vers notification Phaser
    const notification = this.scene.add.text(
      this.scene.cameras.main.centerX,
      50,
      message,
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : type === 'success' ? '#44ff44' : '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    // ✅ Auto-suppression
    this.scene.time.delayedCall(3000, () => {
      if (notification && notification.scene) {
        notification.destroy();
      }
    });
  }

  // ✅ NOUVEAU: Affichage de dialogue
  showDialogue(npcName, message) {
    console.log(`💬 Dialogue: ${npcName} dit "${message}"`);
    
    // ✅ Si système de dialogue disponible
    if (window.dialogueSystem && typeof window.dialogueSystem.showDialogue === 'function') {
      window.dialogueSystem.showDialogue(npcName, message);
      return;
    }

    // ✅ Fallback: affichage simple
    this.showMessage(`${npcName}: ${message}`, 'info');
  }

  // ✅ NOUVEAU: Log des interactions pour debug
  logInteraction(type, data) {
    const logEntry = {
      timestamp: new Date(),
      type: type,
      data: data,
      scene: this.scene.scene.key,
      state: { ...this.state }
    };
    
    this.interactionHistory.push(logEntry);
    
    // Garder seulement les 20 dernières
    if (this.interactionHistory.length > 20) {
      this.interactionHistory = this.interactionHistory.slice(-20);
    }
    
    if (this.debugMode) {
      console.log(`📝 Interaction loggée: ${type}`, logEntry);
    }
  }

  // ✅ MÉTHODES PUBLIQUES

  // ✅ Activer/désactiver debug
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🐛 Debug InteractionManager: ${enabled ? 'ON' : 'OFF'}`);
  }

  // ✅ Obtenir l'état actuel
  getState() {
    return {
      ...this.state,
      hasShopSystem: !!this.shopSystem,
      canInteract: this.canPlayerInteract(),
      dependencies: {
        networkManager: !!this.networkManager,
        playerManager: !!this.playerManager,
        npcManager: !!this.npcManager
      }
    };
  }

  // ✅ Vérifier si shop ouvert
  isShopOpen() {
    return this.shopSystem?.isShopOpen() || window.shopSystem?.isShopOpen() || false;
  }

  // ✅ Debug de l'état complet
  debugState() {
    console.log(`🔍 === DEBUG INTERACTION MANAGER STATE ===`);
    
    const state = this.getState();
    console.log(`📊 État général:`, state);
    
    console.log(`📜 Historique (${this.interactionHistory.length} entrées):`);
    this.interactionHistory.slice(-5).forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.type} à ${entry.timestamp.toLocaleTimeString()}`);
    });
    
    // ✅ Test des dépendances
    console.log(`🔧 Test dépendances:`);
    const deps = this.validateDependencies();
    console.log(`  Dépendances: ${deps ? '✅ OK' : '❌ MANQUANTES'}`);
    
    // ✅ Test interaction possible
    const canInteract = this.canPlayerInteract();
    console.log(`  Peut interagir: ${canInteract ? '✅ OUI' : '❌ NON'}`);
    
    return state;
  }

  // ✅ Forcer une interaction (pour debug)
  forceInteraction(npcId) {
    console.log(`🧪 Force interaction avec NPC: ${npcId}`);
    
    const npc = this.npcManager?.getNpcData?.(npcId);
    if (!npc) {
      console.error(`❌ NPC ${npcId} introuvable`);
      return false;
    }
    
    this.sendNpcInteraction(npc);
    return true;
  }

  // ✅ Nettoyage
  destroy() {
    console.log(`💀 [${this.scene.scene.key}] Destruction InteractionManager`);
    
    // ✅ Nettoyer les listeners
    if (this.networkManager?.room) {
      this.networkManager.room.removeAllListeners("npcInteractionResult");
      this.networkManager.room.removeAllListeners("interactionError");
      this.networkManager.room.removeAllListeners("npcDialogue");
    }
    
    // ✅ Reset état
    this.state.interactionInProgress = false;
    
    // ✅ Nettoyer références
    this.scene = null;
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.shopSystem = null;
    
    console.log(`✅ [InteractionManager] Nettoyage terminé`);
  }
}

// ✅ Fonctions de debug globales
window.debugInteractionManager = function() {
  const currentScene = window.game?.scene?.scenes?.find(s => s.scene.isActive());
  if (currentScene?.interactionManager) {
    return currentScene.interactionManager.debugState();
  } else {
    console.error('❌ InteractionManager non trouvé dans la scène active');
    return { error: 'InteractionManager manquant' };
  }
};

window.forceNpcInteraction = function(npcId) {
  const currentScene = window.game?.scene?.scenes?.find(s => s.scene.isActive());
  if (currentScene?.interactionManager) {
    return currentScene.interactionManager.forceInteraction(npcId);
  } else {
    console.error('❌ InteractionManager non trouvé');
    return false;
  }
};

console.log('✅ InteractionManager corrigé chargé!');
console.log('🔍 Utilisez window.debugInteractionManager() pour diagnostiquer');
console.log('🧪 Utilisez window.forceNpcInteraction(npcId) pour forcer interaction');
