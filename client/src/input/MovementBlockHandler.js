// client/src/input/MovementBlockHandler.js
// Gestionnaire côté client pour les blocages de mouvement serveur
// ✅ VERSION CORRIGÉE - PRÉVENTION BOUCLES INFINIES

export class MovementBlockHandler {
  constructor() {
    this.isBlocked = false;
    this.blockReason = null;
    this.blockMessage = null;
    this.blockMetadata = null;
    this.blockTimestamp = 0;
    this.blockDuration = null;
    
    // État de blocage par raison
    this.activeBlocks = new Map(); // reason -> { timestamp, duration, metadata, message }
    
    // Références aux managers
    this.inputManager = null;
    this.networkManager = null;
    this.scene = null;
    
    // ✅ PROTECTION CONTRE INITIALISATIONS MULTIPLES - RENFORCÉE
    this.isInitialized = false;
    this.listenersSetup = false;
    this.initializationCount = 0;
    this.maxInitAttempts = 10; // ✅ NOUVEAU: Limite stricte
    
    // ✅ NOUVEAU: Tracking de dernière initialisation pour éviter le spam
    this.lastInitAttempt = 0;
    this.minInitInterval = 1000; // 1 seconde minimum entre tentatives
    
    console.log('🔒 MovementBlockHandler créé');
  }

  /**
   * ✅ MÉTHODE CORRIGÉE: Initialise le handler avec protection absolue contre les boucles
   */
  initialize(inputManager, networkManager, scene) {
    // ✅ PROTECTION TEMPORELLE CONTRE LE SPAM
    const now = Date.now();
    if (now - this.lastInitAttempt < this.minInitInterval) {
      console.log(`⏭️ MovementBlockHandler: Tentative trop rapide (${now - this.lastInitAttempt}ms), ignorée`);
      return;
    }
    this.lastInitAttempt = now;
    
    // ✅ PROTECTION CRITIQUE CONTRE LES BOUCLES INFINIES
    this.initializationCount++;
    
    if (this.initializationCount > this.maxInitAttempts) {
      console.error(`❌ ARRÊT FORCÉ - Trop d'initialisations MovementBlockHandler (${this.initializationCount})`);
      console.error(`❌ Ceci indique un problème dans la logique d'initialisation`);
      return;
    }
    
    // ✅ VÉRIFICATION: Même scène, même état
    if (this.isInitialized && this.scene === scene && this.inputManager === inputManager) {
      console.log(`⏭️ MovementBlockHandler déjà initialisé pour cette scène exacte (tentative ${this.initializationCount})`);
      return;
    }
    
    // ✅ VÉRIFICATION STRICTE DES PARAMÈTRES
    if (!inputManager || !networkManager || !scene) {
      console.error(`❌ Paramètres manquants pour MovementBlockHandler:`, {
        inputManager: !!inputManager,
        networkManager: !!networkManager,
        scene: !!scene
      });
      return;
    }
    
    // ✅ VÉRIFICATION QUE L'INPUTMANAGER EST VRAIMENT PRÊT
    if (typeof inputManager.areInputsEnabled !== 'function') {
      console.error(`❌ InputManager pas entièrement initialisé - manque areInputsEnabled()`);
      return;
    }
    
    // ✅ VÉRIFICATION QUE LE NETWORKMANAGER EST CONNECTÉ
    if (!networkManager.isConnected || !networkManager.room) {
      console.warn(`⚠️ NetworkManager pas encore connecté, init différée`);
      return;
    }
    
    console.log(`🔒 [${scene?.scene?.key}] Initialisation MovementBlockHandler VALIDE (tentative ${this.initializationCount})...`);
    
    // ✅ SI CHANGEMENT DE SCÈNE, RESET PROPREMENT
    if (this.isInitialized && this.scene !== scene) {
      console.log(`🔄 Changement de scène détecté: ${this.scene?.scene?.key} → ${scene?.scene?.key}`);
      this.resetForNewScene();
    }
    
    this.inputManager = inputManager;
    this.networkManager = networkManager;
    this.scene = scene;
    
    // ✅ SETUP LISTENERS SEULEMENT SI PAS DÉJÀ FAIT
    if (!this.listenersSetup) {
      this.setupNetworkListeners();
    }
    
    this.isInitialized = true;
    
    console.log(`✅ [${scene?.scene?.key}] MovementBlockHandler initialisé avec succès`);
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Reset pour nouvelle scène sans tout détruire
   */
  resetForNewScene() {
    console.log(`🔄 Reset MovementBlockHandler pour nouvelle scène...`);
    
    // ✅ Garder les blocages actifs mais reset les références
    this.inputManager = null;
    this.scene = null;
    // Ne pas reset networkManager car il est global
    
    // ✅ Pas de reset des listeners car ils sont attachés au NetworkManager global
    // ✅ Pas de reset isInitialized car on va réinitialiser immédiatement
    
    console.log(`✅ Reset pour nouvelle scène terminé`);
  }

  /**
   * ✅ MÉTHODE AMÉLIORÉE: Setup listeners avec protection absolue
   */
  setupNetworkListeners() {
    // ✅ PROTECTION ABSOLUE CONTRE LES LISTENERS MULTIPLES
    if (this.listenersSetup) {
      console.log(`⏭️ Listeners MovementBlockHandler déjà configurés - SKIP`);
      return;
    }
    
    if (!this.networkManager?.room) {
      console.warn('⚠️ MovementBlockHandler: Pas de room pour setup listeners');
      return;
    }

    console.log(`📡 [${this.scene?.scene?.key}] Configuration listeners MovementBlockHandler...`);

    try {
      // ✅ LISTENERS AVEC PROTECTION CONTRE LES DOUBLONS
      this.networkManager.onMessage("movementBlocked", (data) => {
     //   console.log('🚫 Mouvement bloqué par le serveur:', data);
        this.handleServerBlock(data);
      });

      this.networkManager.onMessage("movementUnblocked", (data) => {
        console.log('🔓 Mouvement débloqué par le serveur:', data);
        this.handleServerUnblock(data);
      });

      this.networkManager.onMessage("movementForceUnblocked", (data) => {
        console.log('🔥 Déblocage forcé par le serveur:', data);
        this.handleServerForceUnblock(data);
      });

      this.networkManager.onMessage("movementBlockStatus", (data) => {
        console.log('📊 État blocages reçu du serveur:', data);
        this.handleServerBlockStatus(data);
      });

      this.networkManager.onMessage("forcePlayerPosition", (data) => {
       // console.log('⛔ Position forcée reçue:', data);
        this.handleForcePosition(data);
      });

      // ✅ MARQUER COMME CONFIGURÉ DE FAÇON PERMANENTE
      this.listenersSetup = true;
      console.log(`✅ [${this.scene?.scene?.key}] Listeners MovementBlockHandler configurés`);
      
    } catch (error) {
      console.error(`❌ Erreur setup listeners MovementBlockHandler:`, error);
    }
  }

  /**
   * Gère un blocage reçu du serveur
   */
  handleServerBlock(data) {
    const { reason, duration, metadata, message } = data;
    
    // Ajouter ce blocage à la liste active
    this.activeBlocks.set(reason, {
      timestamp: Date.now(),
      duration: duration,
      metadata: metadata,
      message: message
    });
    
    // Mettre à jour l'état global
    this.updateBlockState();
    
    // Appliquer le blocage immédiatement
    this.applyMovementBlock(reason, message);
    
    // Programmer le déblocage automatique si durée spécifiée
    if (duration && duration > 0) {
      setTimeout(() => {
        this.removeBlockByReason(reason);
      }, duration);
    }
  }

  /**
   * Gère un déblocage reçu du serveur
   */
  handleServerUnblock(data) {
    const { reason, stillBlocked, remainingBlocks } = data;
    
    if (reason) {
      // Débloquer pour une raison spécifique
      this.removeBlockByReason(reason);
    } else {
      // Déblocage total
      this.clearAllBlocks();
    }
    
    console.log(`🔓 Déblocage: reason=${reason}, encore bloqué=${stillBlocked}, blocks restants=${remainingBlocks}`);
  }

  /**
   * Gère un déblocage forcé par le serveur
   */
  handleServerForceUnblock(data) {
    console.log('🔥 Déblocage forcé - suppression de tous les blocages');
    this.clearAllBlocks();
    
    if (data.message) {
      this.showBlockMessage(data.message, 'info');
    }
  }

  /**
   * Gère la réponse d'état de blocage du serveur
   */
  handleServerBlockStatus(data) {
    const { isBlocked, blocks } = data;
    
    // Synchroniser avec l'état serveur
    this.activeBlocks.clear();
    
    if (isBlocked && blocks) {
      blocks.forEach(block => {
        this.activeBlocks.set(block.reason, {
          timestamp: block.timestamp,
          duration: block.duration,
          metadata: block.metadata,
          message: this.getBlockMessage(block.reason)
        });
      });
    }
    
    this.updateBlockState();
    console.log(`📊 État synchronisé avec serveur: ${this.activeBlocks.size} blocages actifs`);
  }

  /**
   * Gère la position forcée avec info de blocage
   */
  handleForcePosition(data) {
    // Appliquer la position (déléguer au PlayerManager existant)
    if (this.scene?.playerManager) {
      const myPlayer = this.scene.playerManager.getMyPlayer();
      if (myPlayer) {
        myPlayer.x = data.x;
        myPlayer.y = data.y;
        if (data.direction) {
          myPlayer.anims.play(`idle_${data.direction}`, true);
        }
      }
    }
    
    // Si c'est un blocage système (pas juste une collision)
    if (data.blocked && data.reason) {
      console.log(`🚫 Position forcée à cause d'un blocage: ${data.reason}`);
      this.showBlockMessage(data.message || `Mouvement bloqué: ${data.reason}`, 'warning');
      
      // S'assurer que le blocage est actif côté client
      if (!this.isBlockedFor(data.reason)) {
        this.activeBlocks.set(data.reason, {
          timestamp: Date.now(),
          duration: null, // Permanent jusqu'à déblocage serveur
          metadata: null,
          message: data.message
        });
        this.updateBlockState();
      }
    }
    
    // Si c'est juste une collision
    if (data.collision && !data.blocked) {
      console.log('💥 Position forcée à cause d\'une collision');
      // Pas de blocage système, juste un rollback de position
    }
  }

  /**
   * Applique un blocage de mouvement
   */
  applyMovementBlock(reason, message) {
    console.log(`🔒 Application blocage mouvement: ${reason}`);
    
    // Forcer l'arrêt du mouvement via l'InputManager
    if (this.inputManager && typeof this.inputManager.resetMovement === 'function') {
      this.inputManager.resetMovement();
    }
    
    // Arrêter le joueur physiquement
    this.stopPlayerMovement();
    
    // Afficher le message si fourni
    if (message) {
      this.showBlockMessage(message, 'warning');
    }
  }

  /**
   * Arrête physiquement le mouvement du joueur
   */
  stopPlayerMovement() {
    if (!this.scene?.playerManager) return;
    
    const myPlayer = this.scene.playerManager.getMyPlayer();
    if (!myPlayer) return;
    
    // Arrêter la vélocité physique
    if (myPlayer.body) {
      myPlayer.body.setVelocity(0, 0);
    }
    
    // Arrêter l'animation de marche
    if (myPlayer.anims) {
      const currentDirection = this.scene.lastDirection || 'down';
      myPlayer.anims.play(`idle_${currentDirection}`, true);
    }
    
    // Marquer comme non en mouvement
    if (myPlayer.isMovingLocally !== undefined) {
      myPlayer.isMovingLocally = false;
    }
    
    console.log('⏸️ Joueur arrêté physiquement');
  }

  /**
   * Retire un blocage par raison
   */
  removeBlockByReason(reason) {
    if (this.activeBlocks.has(reason)) {
      this.activeBlocks.delete(reason);
      this.updateBlockState();
      console.log(`🔓 Blocage retiré: ${reason}`);
      
      // Si plus aucun blocage, afficher message de déblocage
      if (this.activeBlocks.size === 0) {
        this.showBlockMessage('Mouvement libre !', 'success');
      }
    }
  }

  /**
   * Supprime tous les blocages
   */
  clearAllBlocks() {
    const hadBlocks = this.activeBlocks.size > 0;
    this.activeBlocks.clear();
    this.updateBlockState();
    
    if (hadBlocks) {
      console.log('🔓 Tous les blocages supprimés');
      this.showBlockMessage('Mouvement libre !', 'success');
    }
  }

  /**
   * Met à jour l'état global de blocage
   */
  updateBlockState() {
    const wasBlocked = this.isBlocked;
    
    // Nettoyer les blocages expirés
    this.cleanupExpiredBlocks();
    
    // Calculer le nouvel état
    const hasActiveBlocks = this.activeBlocks.size > 0;
    
    this.isBlocked = hasActiveBlocks;
    
    if (hasActiveBlocks) {
      // Prendre le premier blocage comme principal
      const firstBlock = this.activeBlocks.values().next().value;
      const firstReason = this.activeBlocks.keys().next().value;
      
      this.blockReason = firstReason;
      this.blockMessage = firstBlock.message;
      this.blockMetadata = firstBlock.metadata;
      this.blockTimestamp = firstBlock.timestamp;
      this.blockDuration = firstBlock.duration;
    } else {
      this.blockReason = null;
      this.blockMessage = null;
      this.blockMetadata = null;
      this.blockTimestamp = 0;
      this.blockDuration = null;
    }
    
    // Log si changement d'état
    if (wasBlocked !== this.isBlocked) {
      console.log(`🔄 État blocage changé: ${wasBlocked} → ${this.isBlocked}`);
      console.log(`📊 Blocages actifs: ${this.activeBlocks.size}`);
    }
  }

  /**
   * Nettoie les blocages expirés
   */
  cleanupExpiredBlocks() {
    const now = Date.now();
    
    for (const [reason, block] of this.activeBlocks.entries()) {
      if (block.duration && (now - block.timestamp) > block.duration) {
        console.log(`⏰ Blocage expiré: ${reason}`);
        this.activeBlocks.delete(reason);
      }
    }
  }

  /**
   * Vérifie si le mouvement est bloqué globalement
   */
  isMovementBlocked() {
    this.cleanupExpiredBlocks();
    return this.isBlocked;
  }

  /**
   * Vérifie si bloqué pour une raison spécifique
   */
  isBlockedFor(reason) {
    this.cleanupExpiredBlocks();
    return this.activeBlocks.has(reason);
  }

  /**
   * Intercepte les tentatives de mouvement
   */
  validateMovement() {
    if (this.isMovementBlocked()) {
      console.log(`🚫 Mouvement intercepté - bloqué pour: ${this.blockReason}`);
      
      // Arrêter le mouvement
      this.stopPlayerMovement();
      
      // Afficher message si pas déjà affiché récemment
      if (this.shouldShowBlockMessage()) {
        this.showBlockMessage(this.blockMessage || this.getBlockMessage(this.blockReason), 'warning');
      }
      
      return false; // Mouvement refusé
    }
    
    return true; // Mouvement autorisé
  }

  /**
   * Détermine si on doit afficher un message de blocage
   */
  shouldShowBlockMessage() {
    // Afficher max une fois par seconde pour éviter le spam
    const now = Date.now();
    if (!this.lastMessageTime || (now - this.lastMessageTime) > 1000) {
      this.lastMessageTime = now;
      return true;
    }
    return false;
  }

  /**
   * Retourne un message d'erreur selon la raison
   */
  getBlockMessage(reason) {
    const messages = {
      dialog: "Vous ne pouvez pas bouger pendant un dialogue",
      battle: "Vous ne pouvez pas bouger pendant un combat",
      menu: "Fermez le menu pour pouvoir bouger",
      cutscene: "Attendez la fin de la cinématique",
      transition: "Transition en cours...",
      interaction: "Interaction en cours",
      shop: "Vous êtes dans un magasin",
      encounter: "Rencontre Pokémon en cours",
      custom: "Mouvement temporairement bloqué"
    };
    return messages[reason] || "Mouvement bloqué";
  }

  /**
   * Affiche un message de blocage à l'utilisateur
   */
  showBlockMessage(message, type = 'warning') {
    // Utiliser le système de notification existant si disponible
    if (window.showGameNotification) {
      window.showGameNotification(message, type, {
        duration: 2000,
        position: 'top-center'
      });
      return;
    }
    
    // Fallback: Affichage simple dans la console
    const icon = type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${icon} ${message}`);
  }

  /**
   * Demande l'état actuel des blocages au serveur
   */
  requestBlockStatus() {
    if (this.networkManager?.room) {
      this.networkManager.room.send("checkMovementBlock");
      console.log('📤 Demande état blocages envoyée au serveur');
    }
  }

  /**
   * Force le déblocage (pour admin/debug)
   */
  requestForceUnblock() {
    if (this.networkManager?.room) {
      this.networkManager.room.send("forceUnblockMovement", {});
      console.log('📤 Demande déblocage forcé envoyée au serveur');
    }
  }

  /**
   * Statistiques des blocages
   */
  getStats() {
    this.cleanupExpiredBlocks();
    
    const stats = {
      isBlocked: this.isBlocked,
      activeBlocksCount: this.activeBlocks.size,
      currentReason: this.blockReason,
      currentMessage: this.blockMessage,
      blockDuration: this.blockDuration,
      timeBlocked: this.blockTimestamp ? Date.now() - this.blockTimestamp : 0,
      activeBlocks: {}
    };
    
    // Détails de chaque blocage actif
    for (const [reason, block] of this.activeBlocks.entries()) {
      stats.activeBlocks[reason] = {
        duration: block.duration,
        timeActive: Date.now() - block.timestamp,
        message: block.message
      };
    }
    
    return stats;
  }

  /**
   * Debug complet du système
   */
  debug() {
    console.log('🔍 === DEBUG MOVEMENT BLOCK HANDLER ===');
    console.log('📊 Stats:', this.getStats());
    console.log('🎮 Managers:', {
      inputManager: !!this.inputManager,
      networkManager: !!this.networkManager,
      scene: !!this.scene
    });
    console.log('📡 Network:', {
      connected: this.networkManager?.isConnected,
      room: !!this.networkManager?.room
    });
    
    // Tester la connexion
    this.requestBlockStatus();
  }

  /**
   * ✅ MÉTHODE CORRIGÉE: Reset pour éviter l'accumulation
   */
  reset() {
    console.log(`🔄 Reset MovementBlockHandler...`);
    
    // ✅ RESET DES FLAGS D'INITIALISATION UNIQUEMENT
    this.isInitialized = false;
    // Ne PAS reset listenersSetup car les listeners sont globaux
    
    // ✅ RESET DES COMPTEURS DE FAÇON INTELLIGENTE
    this.initializationCount = Math.max(0, this.initializationCount - 1); // Décrémenter au lieu de reset total
    
    // ✅ Reset du timer pour permettre une nouvelle tentative
    this.lastInitAttempt = 0;
    
    // ✅ Nettoyer les références de scène mais garder networkManager
    this.inputManager = null;
    this.scene = null;
    // this.networkManager = null; // ← NE PAS FAIRE ÇA, il est global
    
    console.log(`✅ MovementBlockHandler reset (count: ${this.initializationCount})`);
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Reset complet (pour transitions de scène)
   */
  fullReset() {
    console.log(`🔄 Reset complet MovementBlockHandler...`);
    
    // ✅ Reset complet de tout
    this.isInitialized = false;
    this.listenersSetup = false;
    this.initializationCount = 0;
    this.lastInitAttempt = 0;
    
    // Nettoyer toutes les références
    this.inputManager = null;
    this.networkManager = null;
    this.scene = null;
    
    console.log('✅ MovementBlockHandler reset complet');
  }

  /**
   * Nettoyage lors de la destruction
   */
  destroy() {
    console.log(`🧹 [${this.scene?.scene?.key}] Destruction MovementBlockHandler...`);
    
    this.clearAllBlocks();
    this.fullReset(); // ✅ Utiliser le reset complet
    
    console.log('🧹 MovementBlockHandler détruit');
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Vérification d'état pour debug
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      listenersSetup: this.listenersSetup,
      initializationCount: this.initializationCount,
      maxInitAttempts: this.maxInitAttempts,
      lastInitAttempt: this.lastInitAttempt,
      hasInputManager: !!this.inputManager,
      hasNetworkManager: !!this.networkManager,
      hasScene: !!this.scene,
      sceneKey: this.scene?.scene?.key,
      isReady: this.isReady(),
      activeBlocksCount: this.activeBlocks.size,
      isBlocked: this.isBlocked,
      blockReason: this.blockReason
    };
  }

  /**
   * Vérifie si le handler est prêt
   */
  isReady() {
    return this.isInitialized && 
           this.inputManager && 
           this.networkManager && 
           this.scene;
  }

  /**
   * Status de l'initialisation
   */
  getInitializationStatus() {
    return {
      isInitialized: this.isInitialized,
      listenersSetup: this.listenersSetup,
      initializationCount: this.initializationCount,
      maxInitAttempts: this.maxInitAttempts,
      hasInputManager: !!this.inputManager,
      hasNetworkManager: !!this.networkManager,
      hasScene: !!this.scene,
      isReady: this.isReady(),
      canInit: this.initializationCount < this.maxInitAttempts,
      timeSinceLastInit: Date.now() - this.lastInitAttempt
    };
  }
}

// ✅ Instance globale pour accès facile
export const movementBlockHandler = new MovementBlockHandler();
