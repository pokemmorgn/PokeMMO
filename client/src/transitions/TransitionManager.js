// client/src/transitions/TransitionManager.js
// ✅ VERSION CENTRALISÉE AVEC ZONEMAPPING

// ✅ IMPORTER LES FONCTIONS DE MAPPING
import { sceneToZone, zoneToScene } from '../config/ZoneMapping.js';

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true;
    this.isTransitioning = false;
    
    // Collections locales (pour collision seulement)
    this.teleportZones = new Map(); // Zones de collision pour téléports
    this.currentZone = sceneToZone(scene.scene.key); // ✅ UTILISER LA FONCTION CENTRALISÉE
    
    // Loading overlay
    this.loadingOverlay = null;
    this.transitionStartTime = 0;
    this.transitionTimeout = 10000; // 10 secondes max
    
    // ✅ Stratégies de transition disponibles
    this.transitionStrategy = 'aggressive'; // 'clean', 'aggressive', ou 'recreate'
    
    console.log(`🌀 [TransitionManager] Système dynamique initialisé pour zone: ${this.currentZone}`);
  }

  // ✅ INITIALISATION: Scanner les téléports pour collision locale
  initialize() {
    console.log(`🌀 [TransitionManager] === SCAN TÉLÉPORTS POUR COLLISION ===`);
    
    if (!this.scene.map) {
      console.error(`🌀 [TransitionManager] ❌ Aucune map trouvée!`);
      return false;
    }

    // Chercher le layer "Worlds" (ou autres)
    const worldsLayer = this.scene.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn(`🌀 [TransitionManager] ⚠️ Layer "Worlds" introuvable`);
      return false;
    }

    console.log(`🌀 [TransitionManager] 📂 Scan layer "Worlds" (${worldsLayer.objects.length} objets)`);

    // Scanner SEULEMENT les téléports
    let teleportCount = 0;
    worldsLayer.objects.forEach((obj, index) => {
      const objName = (obj.name || '').toLowerCase();
      
      if (objName === 'teleport') {
        this.processTeleport(obj, index);
        teleportCount++;
      }
      // ✅ IGNORER les spawns - le serveur gère tout
    });

    console.log(`🌀 [TransitionManager] ✅ ${teleportCount} téléports trouvés`);

    // Créer les zones de collision
    this.createCollisionZones();
    
    if (this.debugMode) {
      this.debugInfo();
    }

    this.isActive = true;
    return true;
  }

  // ✅ TRAITER UN TÉLÉPORT (récupération des propriétés)
  processTeleport(obj, index) {
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');

    if (!targetZone) {
      console.warn(`🌀 [TransitionManager] ⚠️ Téléport ${index} sans 'targetzone'`);
      return;
    }

    if (!targetSpawn) {
      console.warn(`🌀 [TransitionManager] ⚠️ Téléport ${index} sans 'targetspawn'`);
      return;
    }

    const teleport = {
      id: `teleport_${index}`,
      x: obj.x,
      y: obj.y,
      width: obj.width || 32,
      height: obj.height || 32,
      targetZone: targetZone,
      targetSpawn: targetSpawn,
      fromZone: this.currentZone
    };

    this.teleportZones.set(teleport.id, teleport);
    
    console.log(`🌀 [TransitionManager] 📍 Téléport "${teleport.id}": ${this.currentZone} → ${targetZone}[${targetSpawn}]`);
  }

  // ✅ CRÉER ZONES DE COLLISION PHASER
  createCollisionZones() {
    console.log(`🌀 [TransitionManager] === CRÉATION ZONES COLLISION ===`);

    this.teleportZones.forEach((teleportData) => {
      // Zone invisible pour collision
      const zone = this.scene.add.zone(
        teleportData.x + teleportData.width / 2,
        teleportData.y + teleportData.height / 2,
        teleportData.width,
        teleportData.height
      );

      // Physique
      this.scene.physics.world.enableBody(zone, Phaser.Physics.Arcade.STATIC_BODY);
      zone.body.setSize(teleportData.width, teleportData.height);
      zone.transitionData = teleportData;

      // Debug visuel
      if (this.debugMode) {
        this.createDebugVisuals(zone, teleportData);
      }

      console.log(`🌀 [TransitionManager] ✅ Zone collision créée: ${teleportData.id}`);
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.teleportZones.size} zones collision actives`);
  }

  // ✅ DEBUG VISUEL STYLE POKÉMON
  createDebugVisuals(zone, teleportData) {
    // Rectangle de zone
    const debugRect = this.scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0x00ff00, 0.2
    );
    debugRect.setDepth(999);
    debugRect.setStrokeStyle(2, 0x00aa00);
    
    // Texte avec zone de destination
    const debugText = this.scene.add.text(
      zone.x, zone.y - 20,
      `→ ${teleportData.targetZone}`,
      {
        fontSize: '12px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }
    );
    debugText.setDepth(1000);
    debugText.setOrigin(0.5);
  }

  // ✅ VÉRIFIER COLLISIONS À CHAQUE FRAME
  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;
    if (this.scene.justArrivedAtZone) return;

    this.teleportZones.forEach((teleportData) => {
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        this.triggerTransition(teleportData);
      }
    });
  }

  // ✅ COLLISION SIMPLE RECTANGLE/RECTANGLE
  isPlayerCollidingWithTeleport(player, teleportData) {
    const playerBounds = {
      x: player.x - 16,
      y: player.y - 32,
      width: 32,
      height: 32
    };

    const teleportBounds = {
      x: teleportData.x,
      y: teleportData.y,
      width: teleportData.width,
      height: teleportData.height
    };

    return (
      playerBounds.x < teleportBounds.x + teleportBounds.width &&
      playerBounds.x + playerBounds.width > teleportBounds.x &&
      playerBounds.y < teleportBounds.y + teleportBounds.height &&
      playerBounds.y + playerBounds.height > teleportBounds.y
    );
  }

  // ✅ DÉCLENCHER TRANSITION AVEC LOADING
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.log(`🌀 [TransitionManager] ⚠️ Transition déjà en cours`);
      return;
    }

    console.log(`🌀 [TransitionManager] === DÉBUT TRANSITION ===`);
    console.log(`📍 De: ${teleportData.fromZone}`);
    console.log(`📍 Vers: ${teleportData.targetZone}`);
    console.log(`🎯 TargetSpawn: ${teleportData.targetSpawn}`);

    this.isTransitioning = true;
    this.transitionStartTime = Date.now();

    // ✅ AFFICHER LE LOADING IMMÉDIATEMENT (avant toute validation)
    this.showLoadingOverlay(teleportData);

    // ✅ NOUVEAU: Vérifier et corriger la désynchronisation AVANT d'envoyer
    const correctionResult = await this.checkAndCorrectZoneDesync(teleportData);
    if (!correctionResult.success) {
      this.hideLoadingOverlay();
      this.showErrorPopup(correctionResult.reason);
      this.isTransitioning = false;
      return;
    }

    // ✅ Utiliser les données corrigées
    const correctedTeleportData = correctionResult.correctedData;

    // Obtenir la position du joueur
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.error(`🌀 [TransitionManager] ❌ Joueur local introuvable`);
      this.hideLoadingOverlay();
      this.showErrorPopup("Joueur local introuvable");
      this.isTransitioning = false;
      return;
    }

    // ✅ SETUP TIMEOUT DE SÉCURITÉ
    const timeoutHandle = setTimeout(() => {
      console.error(`🌀 [TransitionManager] ⏰ TIMEOUT DE TRANSITION`);
      this.hideLoadingOverlay();
      this.showErrorPopup("Timeout de transition (10s)");
      this.isTransitioning = false;
    }, this.transitionTimeout);

    // ✅ SETUP LISTENER DE VALIDATION
    this.setupTransitionListener(correctedTeleportData, timeoutHandle);

    // ✅ ENVOYER DEMANDE AU SERVEUR AVEC DONNÉES CORRIGÉES
    if (this.scene.networkManager?.room) {
      const request = {
        fromZone: correctedTeleportData.fromZone, // ✅ Zone corrigée
        targetZone: correctedTeleportData.targetZone,
        playerX: myPlayer.x,
        playerY: myPlayer.y,
        teleportId: correctedTeleportData.id
      };

      console.log(`📤 [TransitionManager] Envoi demande serveur (corrigée):`, request);
      this.scene.networkManager.room.send("validateTransition", request);
    } else {
      console.error(`🌀 [TransitionManager] ❌ Pas de connexion serveur`);
      clearTimeout(timeoutHandle);
      this.hideLoadingOverlay();
      this.showErrorPopup("Pas de connexion serveur");
      this.isTransitioning = false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Vérifier et corriger la désynchronisation
  async checkAndCorrectZoneDesync(teleportData) {
    console.log(`🔄 [TransitionManager] === VÉRIFICATION DÉSYNC ===`);
    
    // Obtenir la zone serveur et client
    const clientZone = this.scene.zoneName; // Zone de la scène actuelle
    const serverZone = this.scene.networkManager?.getCurrentZone(); // Zone du serveur
    
    console.log(`🔍 [TransitionManager] Client zone: ${clientZone}`);
    console.log(`🔍 [TransitionManager] Server zone: ${serverZone}`);
    console.log(`🔍 [TransitionManager] Teleport fromZone: ${teleportData.fromZone}`);
    
    // Si tout est synchronisé, pas de problème
    if (clientZone === serverZone && serverZone === teleportData.fromZone) {
      console.log(`✅ [TransitionManager] Zones synchronisées`);
      return {
        success: true,
        correctedData: teleportData
      };
    }
    
    // ✅ CORRECTION AUTOMATIQUE
    console.warn(`⚠️ [TransitionManager] DÉSYNCHRONISATION DÉTECTÉE - CORRECTION AUTO`);
    console.warn(`   Client: ${clientZone}`);
    console.warn(`   Serveur: ${serverZone}`);
    console.warn(`   Téléport: ${teleportData.fromZone}`);
    
    // Utiliser la zone du serveur comme référence (plus fiable)
    const correctedFromZone = serverZone || clientZone;
    
    // Mettre à jour le NetworkManager
    if (this.scene.networkManager) {
      this.scene.networkManager.currentZone = correctedFromZone;
      console.log(`🔧 [TransitionManager] Zone NetworkManager mise à jour: ${correctedFromZone}`);
    }
    
    // Créer les données de téléport corrigées
    const correctedTeleportData = {
      ...teleportData,
      fromZone: correctedFromZone
    };
    
    console.log(`✅ [TransitionManager] Correction appliquée: ${teleportData.fromZone} → ${correctedFromZone}`);
    
    return {
      success: true,
      correctedData: correctedTeleportData
    };
  }

  // ✅ SETUP LISTENER POUR RÉPONSE SERVEUR
  setupTransitionListener(teleportData, timeoutHandle) {
    console.log(`👂 [TransitionManager] Setup listener validation...`);

    if (!this.scene.networkManager?.room) {
      console.error(`❌ [TransitionManager] Pas de NetworkManager pour listener`);
      clearTimeout(timeoutHandle);
      this.hideLoadingOverlay();
      this.showErrorPopup("Pas de connexion réseau");
      this.isTransitioning = false;
      return;
    }

    // ✅ NETTOYER L'ANCIEN LISTENER S'IL EXISTE
    if (this.scene.networkManager.onTransitionValidation) {
      console.log(`🧹 [TransitionManager] Nettoyage ancien listener`);
      this.scene.networkManager.onTransitionValidation = null;
    }

    // ✅ Handler pour la réponse du serveur
    const handleTransitionResult = (result) => {
      console.log(`📨 [TransitionManager] Résultat serveur reçu:`, result);
      
      // Nettoyer le timeout
      clearTimeout(timeoutHandle);
      
      // Nettoyer le listener pour éviter les fuites
      this.scene.networkManager.onTransitionValidation = null;
      
      if (result.success) {
        console.log(`✅ [TransitionManager] Transition validée!`);
        this.handleTransitionSuccess(result, teleportData);
      } else {
        console.error(`❌ [TransitionManager] Transition refusée: ${result.reason}`);
        this.handleTransitionError(result);
      }
    };

    // ✅ ASSIGNER LE CALLBACK AU NETWORKMANAGER
    this.scene.networkManager.onTransitionValidation = handleTransitionResult;
    
    console.log(`✅ [TransitionManager] Listener de validation configuré`);
  }

  waitForQueueToBeEmpty() {
    // Petite pause, permet à Phaser de finir d'éteindre les scènes avant de redémarrer.
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  // ✅ SUCCÈS DE TRANSITION - VERSION AGGRESSIVE POUR ZONES VISITÉES
  async handleTransitionSuccess(result, teleportData) {
    try {
      const targetZone = teleportData.targetZone;
      const targetSceneKey = zoneToScene(targetZone); // ✅ UTILISER LA FONCTION CENTRALISÉE

      if (!targetSceneKey) {
        console.error(`[TransitionManager] ❌ Scene introuvable pour zone: ${targetZone}`);
        this.hideLoadingOverlay();
        this.showErrorPopup(`Zone inconnue: ${targetZone}`);
        this.isTransitioning = false;
        return;
      }

      console.log(`🎯 [TransitionManager] Transition vers: ${targetZone} (${targetSceneKey})`);

      // ✅ STRATÉGIE AGGRESSIVE POUR RETÉLÉPORTATION
      if (this.transitionStrategy === 'aggressive') {
        await this.cleanSceneRestart(targetSceneKey, result); // ← Force clean au lieu d'aggressive
      } else if (this.transitionStrategy === 'recreate') {
        await this.fullSceneRecreation(targetSceneKey, result);
      } else {
        await this.cleanSceneRestart(targetSceneKey, result);
      }

    } catch (error) {
      console.error(`❌ [TransitionManager] Erreur lors de la transition:`, error);
      this.hideLoadingOverlay();
      this.showErrorPopup(`Erreur technique: ${error.message}`);
      this.isTransitioning = false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Transition aggressive pour zones visitées
  async aggressiveSceneTransition(targetSceneKey, result) {
    console.log(`⚡ [TransitionManager] === TRANSITION AGGRESSIVE ===`);
    console.log(`🎯 Vers: ${targetSceneKey}`);

    const sceneManager = this.scene.scene;

    // ✅ ÉTAPE 1: Forcer l'arrêt de TOUTES les scènes actives sauf LoaderScene
    const activeScenes = sceneManager.getScenes(true);
    console.log(`🛑 [TransitionManager] Arrêt de ${activeScenes.length} scènes actives...`);
    
    activeScenes.forEach(scene => {
      if (scene.scene.key !== 'LoaderScene' && scene.scene.key !== targetSceneKey) {
        console.log(`⏹️ [TransitionManager] Stop ${scene.scene.key}`);
      }
    });

    // ✅ ÉTAPE 2: Attendre que les scènes s'arrêtent
    await this.waitForAllScenesStop(targetSceneKey);

    // ✅ ÉTAPE 3: Vérifier si la scène cible existe
    const targetScene = sceneManager.get(targetSceneKey);
    
    if (!targetScene) {
      console.error(`❌ [TransitionManager] Scène ${targetSceneKey} n'existe pas dans Phaser!`);
      console.error(`💡 Les scènes disponibles:`, Object.keys(sceneManager.keys));
      this.hideLoadingOverlay();
      this.showErrorPopup(`Scène ${targetSceneKey} non trouvée dans le jeu`);
      this.isTransitioning = false;
      return;
    }

    // ✅ ÉTAPE 4: Forcer l'arrêt de la scène cible si elle est active
    if (sceneManager.isActive(targetSceneKey)) {
      console.log(`⏹️ [TransitionManager] Arrêt forcé de ${targetSceneKey}...`);
      sceneManager.stop(targetSceneKey);
      await this.waitForSceneState(targetSceneKey, 'stopped');
    }

    // ✅ ÉTAPE 5: Si la scène est sleeping, la réveiller d'abord puis l'arrêter
    if (sceneManager.isSleeping(targetSceneKey)) {
      console.log(`😴 [TransitionManager] Réveil de ${targetSceneKey}...`);
      sceneManager.wake(targetSceneKey);
      await this.waitForSceneState(targetSceneKey, 'active');
      
      console.log(`⏹️ [TransitionManager] Arrêt après réveil de ${targetSceneKey}...`);
      sceneManager.stop(targetSceneKey);
      await this.waitForSceneState(targetSceneKey, 'stopped');
    }

    // ✅ ÉTAPE 6: Démarrer avec un délai pour s'assurer que tout est propre
    await this.waitForQueueToBeEmpty();
    this.startSceneWithData(targetSceneKey, result);
  }

  // ✅ NOUVELLE MÉTHODE: Attendre que toutes les scènes s'arrêtent
  async waitForAllScenesStop(exceptSceneKey, maxWait = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkAllStopped = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > maxWait) {
          console.warn(`⏰ [TransitionManager] Timeout arrêt toutes scènes`);
          resolve(false);
          return;
        }
        
        const activeScenes = this.scene.scene.getScenes(true);
        const problematicScenes = activeScenes.filter(scene => 
          scene.scene.key !== 'LoaderScene' && 
          scene.scene.key !== exceptSceneKey
        );
        
        if (problematicScenes.length === 0) {
          console.log(`✅ [TransitionManager] Toutes les scènes sont arrêtées`);
          resolve(true);
        } else {
          console.log(`⏳ [TransitionManager] ${problematicScenes.length} scènes encore actives...`);
          setTimeout(checkAllStopped, 100);
        }
      };
      
      checkAllStopped();
    });
  }

  // ✅ MÉTHODE 1: Redémarrage propre (pour scènes non visitées)
  async cleanSceneRestart(targetSceneKey, result) {
    console.log(`🔄 [TransitionManager] === REDÉMARRAGE PROPRE ===`);
    console.log(`🎯 Vers: ${targetSceneKey}`);

    const sceneManager = this.scene.scene;

    // ✅ Vérifier si la scène existe
    const targetScene = sceneManager.get(targetSceneKey);
    
    if (targetScene) {
      console.log(`♻️ [TransitionManager] Scène ${targetSceneKey} existe, redémarrage...`);
      
      // Stopper si active
      if (sceneManager.isActive(targetSceneKey)) {
        console.log(`⏹️ [TransitionManager] Stop de ${targetSceneKey}...`);
        sceneManager.stop(targetSceneKey);
        await this.waitForSceneState(targetSceneKey, 'stopped');
      }
      
      // Démarrer avec nouvelles données
      await this.waitForQueueToBeEmpty();
      this.startSceneWithData(targetSceneKey, result);      
    } else {
      console.error(`❌ [TransitionManager] Scène ${targetSceneKey} n'existe pas dans Phaser!`);
      console.error(`💡 Les scènes disponibles:`, Object.keys(sceneManager.keys));
      this.hideLoadingOverlay();
      this.showErrorPopup(`Scène ${targetSceneKey} non trouvée dans le jeu`);
      this.isTransitioning = false;
    }
  }

  // ✅ MÉTHODE 2: Recreation complète (si problèmes persistants)
  async fullSceneRecreation(targetSceneKey, result) {
    console.log(`🏗️ [TransitionManager] === RECREATION COMPLÈTE ===`);
    console.log(`⚠️ Cette méthode nécessite que toutes les scènes soient pré-enregistrées dans Phaser`);

    const sceneManager = this.scene.scene;

    // Supprimer si existe
    if (sceneManager.get(targetSceneKey)) {
      console.log(`🗑️ [TransitionManager] Suppression ${targetSceneKey}...`);
      
      // Stopper d'abord
      if (sceneManager.isActive(targetSceneKey)) {
        sceneManager.stop(targetSceneKey);
        await this.waitForSceneState(targetSceneKey, 'stopped');
      }
      
      // Supprimer
      sceneManager.remove(targetSceneKey);
      await this.waitForSceneRemoval(targetSceneKey);
    }

    // ✅ RECREATION - Nécessite un registry des classes
    if (window.sceneRegistry) {
      try {
        console.log(`🏭 [TransitionManager] Création via SceneRegistry...`);
        const SceneClass = await window.sceneRegistry.getSceneClass(
          sceneToZone(targetSceneKey) // ✅ UTILISER LA FONCTION CENTRALISÉE
        );
        
        const sceneInstance = new SceneClass();
        sceneManager.add(targetSceneKey, sceneInstance, false);
        
        await this.waitForSceneRegistration(targetSceneKey);
        this.startSceneWithData(targetSceneKey, result);
        
      } catch (error) {
        console.error(`❌ [TransitionManager] Erreur création via registry:`, error);
        this.hideLoadingOverlay();
        this.showErrorPopup(`Impossible de créer la scène: ${error.message}`);
        this.isTransitioning = false;
      }
    } else {
      console.error(`❌ [TransitionManager] SceneRegistry non disponible!`);
      this.hideLoadingOverlay();
      this.showErrorPopup("Registry des scènes non configuré");
      this.isTransitioning = false;
    }
  }

  // ✅ Démarrer scène avec données de transition
  startSceneWithData(targetSceneKey, result) {
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      networkManager: this.scene.networkManager,
      mySessionId: this.scene.mySessionId,
      spawnX: result.position?.x,
      spawnY: result.position?.y,
      preservePlayer: true,
      transitionId: Date.now() // Pour debug
    };

    console.log(`🚀 [TransitionManager] Démarrage ${targetSceneKey} avec data:`, transitionData);
    // ✅ FORCER LA RESTAURATION DES HANDLERS POUR LA NOUVELLE SCÈNE
    if (this.scene.networkManager?.setupRoomListeners) {
      console.log(`🔧 [TransitionManager] Pre-setup handlers pour nouvelle scène`);
      // Le NetworkManager intelligent va détecter les handlers manquants
      this.scene.networkManager.setupRoomListeners();
    }
    this.scene.scene.start(targetSceneKey, transitionData);
  }

  // ✅ Attendre qu'une scène soit dans un état donné
  async waitForSceneState(sceneKey, targetState, maxWait = 2000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkState = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > maxWait) {
          console.warn(`⏰ [TransitionManager] Timeout attente état ${targetState} pour ${sceneKey}`);
          resolve(false);
          return;
        }
        
        let currentState = 'unknown';
        const scene = this.scene.scene.get(sceneKey);
        
        if (!scene) {
          currentState = 'removed';
        } else if (this.scene.scene.isActive(sceneKey)) {
          currentState = 'active';
        } else if (this.scene.scene.isSleeping(sceneKey)) {
          currentState = 'sleeping';
        } else {
          currentState = 'stopped';
        }
        
        if (currentState === targetState) {
          console.log(`✅ [TransitionManager] Scène ${sceneKey} état: ${currentState}`);
          resolve(true);
        } else {
          setTimeout(checkState, 50);
        }
      };
      
      checkState();
    });
  }

  // ✅ Attendre la suppression complète
  async waitForSceneRemoval(sceneKey, maxWait = 2000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkRemoval = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > maxWait) {
          console.warn(`⏰ [TransitionManager] Timeout suppression ${sceneKey}`);
          resolve(false);
          return;
        }
        
        const scene = this.scene.scene.get(sceneKey);
        if (!scene) {
          console.log(`✅ [TransitionManager] Scène ${sceneKey} supprimée`);
          resolve(true);
        } else {
          setTimeout(checkRemoval, 50);
        }
      };
      
      checkRemoval();
    });
  }

  // ✅ Attendre l'enregistrement
  async waitForSceneRegistration(sceneKey, maxWait = 2000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkRegistration = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > maxWait) {
          console.warn(`⏰ [TransitionManager] Timeout enregistrement ${sceneKey}`);
          resolve(false);
          return;
        }
        
        const scene = this.scene.scene.get(sceneKey);
        if (scene) {
          console.log(`✅ [TransitionManager] Scène ${sceneKey} enregistrée`);
          resolve(true);
        } else {
          setTimeout(checkRegistration, 50);
        }
      };
      
      checkRegistration();
    });
  }

  // ✅ ERREUR DE TRANSITION
  handleTransitionError(result) {
    this.hideLoadingOverlay();
    this.showErrorPopup(result.reason || "Erreur de transition");
    this.isTransitioning = false;
  }

  // ✅ LOADING OVERLAY STYLE POKÉMON
  showLoadingOverlay(teleportData) {
    // Conteneur principal
    this.loadingOverlay = this.scene.add.container(0, 0).setDepth(9999).setScrollFactor(0);

    // Fond semi-transparent
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x1a1a2e,
      0.9
    );

    // Conteneur du modal (style de ton UI)
    const modalWidth = 400;
    const modalHeight = 200;
    const modalBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      modalWidth,
      modalHeight,
      0x2d3748
    ).setStrokeStyle(2, 0x4a5568);

    // Bordure externe (style bleu de ton UI)
    const borderBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      modalWidth + 8,
      modalHeight + 8,
      0x4299e1
    );

    // Titre
    const titleText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 50,
      'Transition en cours...',
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Destination
    const destText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 20,
      `Vers: ${teleportData.targetZone}`,
      {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#a0aec0'
      }
    ).setOrigin(0.5);

    // Spinner simple (rotation)
    const spinner = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY + 20,
      '⟳',
      {
        fontSize: '24px',
        color: '#4299e1'
      }
    ).setOrigin(0.5);

    // Animation rotation
    this.scene.tweens.add({
      targets: spinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    });

    // Ajouter au conteneur
    this.loadingOverlay.add([borderBg, modalBg, overlay, titleText, destText, spinner]);

    console.log(`🔄 [TransitionManager] Loading affiché`);
  }

  // ✅ MASQUER LOADING
  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
      console.log(`🔄 [TransitionManager] Loading masqué`);
    }
  }

  // ✅ POPUP D'ERREUR SIMPLE
  showErrorPopup(message) {
    // Créer popup temporaire
    const errorPopup = this.scene.add.container(0, 0).setDepth(10000).setScrollFactor(0);

    const popupBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      350, 120,
      0xdc2626
    ).setStrokeStyle(2, 0x991b1b);

    const errorText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      `Erreur de transition:\n${message}`,
      {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 300 }
      }
    ).setOrigin(0.5);

    errorPopup.add([popupBg, errorText]);

    // Auto-destruction après 3 secondes
    this.scene.time.delayedCall(3000, () => {
      if (errorPopup) {
        errorPopup.destroy();
      }
    });

    console.log(`🚫 [TransitionManager] Erreur affichée: ${message}`);
  }

  // ✅ HELPER: Récupérer propriété d'objet Tiled
  getProperty(object, propertyName) {
    if (!object.properties) return null;
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ CONFIGURATION
  setTransitionStrategy(strategy = 'aggressive') {
    this.transitionStrategy = strategy;
    console.log(`🔧 [TransitionManager] Stratégie transition: ${strategy}`);
    console.log(`💡 [TransitionManager] Stratégies disponibles: 'clean', 'aggressive', 'recreate'`);
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 [TransitionManager] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  // ✅ DEBUG INFO
  debugInfo() {
    console.log(`🌀 [TransitionManager] === DEBUG TRANSITION DYNAMIQUE ===`);
    console.log(`Zone actuelle: ${this.currentZone}`);
    console.log(`État: ${this.isActive ? 'ACTIF' : 'INACTIF'}`);
    console.log(`En transition: ${this.isTransitioning}`);
    console.log(`Stratégie: ${this.transitionStrategy}`);
    console.log(`Debug mode: ${this.debugMode}`);
    
    console.log(`📍 TÉLÉPORTS (${this.teleportZones.size}):`);
    this.teleportZones.forEach((teleport, id) => {
      console.log(`  - ${id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}[${teleport.targetSpawn}]`);
    });
    
    // Debug des scènes disponibles
    if (this.scene?.scene?.manager?.keys) {
      console.log(`🎬 SCÈNES DISPONIBLES:`, Object.keys(this.scene.scene.manager.keys));
      
      // État de chaque scène
      Object.keys(this.scene.scene.manager.keys).forEach(sceneKey => {
        const isActive = this.scene.scene.isActive(sceneKey);
        const isSleeping = this.scene.scene.isSleeping(sceneKey);
        let status = 'STOPPED';
        if (isActive) status = 'ACTIVE';
        else if (isSleeping) status = 'SLEEPING';
        
        console.log(`    ${sceneKey}: ${status}`);
      });
    }
    
    // Debug du SceneRegistry s'il existe
    if (window.sceneRegistry) {
      console.log(`📋 SCENE REGISTRY DISPONIBLE:`);
      window.sceneRegistry.debugInfo();
    } else {
      console.log(`⚠️ AUCUN SCENE REGISTRY GLOBAL`);
    }
  }

  // ✅ NETTOYAGE
  destroy() {
    console.log(`🌀 [TransitionManager] Nettoyage...`);
    
    this.hideLoadingOverlay();
    this.teleportZones.clear();
    this.isActive = false;
    this.isTransitioning = false;
    
    // Nettoyer les listeners du NetworkManager
    if (this.scene.networkManager?.onTransitionValidation) {
      this.scene.networkManager.onTransitionValidation = null;
    }
    
    console.log(`🌀 [TransitionManager] ✅ Nettoyé`);
  }

  // ✅ CONTRÔLE EXTERNE
  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? 'Activé' : 'Désactivé'}`);
  }

  // ✅ MÉTHODES UTILITAIRES POUR DEBUG ET TESTING
  
  // Forcer une transition (pour debug)
  forceTransition(targetZone, spawnX = 100, spawnY = 100) {
    console.log(`🚀 [TransitionManager] === TRANSITION FORCÉE (DEBUG) ===`);
    
    const fakeTeleportData = {
      id: 'debug_teleport',
      targetZone: targetZone,
      targetSpawn: 'debug_spawn',
      fromZone: this.currentZone,
      x: 0, y: 0, width: 32, height: 32
    };
    
    this.triggerTransition(fakeTeleportData);
  }

  // Vérifier l'état des scènes
  checkScenesHealth() {
    console.log(`🏥 [TransitionManager] === SANTÉ DES SCÈNES ===`);
    
    const sceneManager = this.scene.scene;
    const allScenes = Object.keys(sceneManager.keys);
    
    console.log(`📊 Total scènes enregistrées: ${allScenes.length}`);
    
    allScenes.forEach(sceneKey => {
      const scene = sceneManager.get(sceneKey);
      const isActive = sceneManager.isActive(sceneKey);
      const isSleeping = sceneManager.isSleeping(sceneKey);
      
      let status = 'UNKNOWN';
      if (isActive) status = 'ACTIVE';
      else if (isSleeping) status = 'SLEEPING';
      else status = 'STOPPED';
      
      console.log(`  📋 ${sceneKey}: ${status} ${scene ? '✅' : '❌'}`);
    });
    
    // Vérifier si toutes nos zones ont leur scène en utilisant les fonctions centralisées
    const expectedZones = ['beach', 'village', 'villagelab', 'road1', 'villagehouse1', 'lavandia'];
    
    console.log(`🌍 Vérification des zones attendues:`);
    expectedZones.forEach(zone => {
      const sceneKey = zoneToScene(zone); // ✅ UTILISER LA FONCTION CENTRALISÉE
      const hasScene = !!sceneManager.get(sceneKey);
      console.log(`  🗺️ ${zone} (${sceneKey}): ${hasScene ? '✅' : '❌'}`);
    });
  }

  // ✅ NOUVELLE MÉTHODE: Forcer l'arrêt de toutes les scènes problématiques
  forceStopAllScenes(exceptSceneKey = null) {
    console.log(`🛑 [TransitionManager] === ARRÊT FORCÉ TOUTES SCÈNES ===`);
    
    const sceneManager = this.scene.scene;
    const allScenes = sceneManager.getScenes(true);
    
    console.log(`🛑 [TransitionManager] ${allScenes.length} scènes actives trouvées`);
    
    allScenes.forEach(scene => {
      if (scene.scene.key !== 'LoaderScene' && scene.scene.key !== exceptSceneKey) {
        console.log(`⏹️ [TransitionManager] Arrêt forcé: ${scene.scene.key}`);
        sceneManager.stop(scene.scene.key);
      }
    });
    
    // Vérifier aussi les scènes sleeping
    const sleepingScenes = sceneManager.getScenes(false).filter(scene => 
      sceneManager.isSleeping(scene.scene.key) && 
      scene.scene.key !== 'LoaderScene' && 
      scene.scene.key !== exceptSceneKey
    );
    
    console.log(`😴 [TransitionManager] ${sleepingScenes.length} scènes sleeping trouvées`);
    
    sleepingScenes.forEach(scene => {
      console.log(`⏹️ [TransitionManager] Réveil + arrêt: ${scene.scene.key}`);
      sceneManager.wake(scene.scene.key);
      sceneManager.stop(scene.scene.key);
    });
    
    console.log(`✅ [TransitionManager] Arrêt forcé terminé`);
  }

  // Lister toutes les transitions possibles depuis la zone actuelle
  listAvailableTransitions() {
    console.log(`🔍 [TransitionManager] === TRANSITIONS DISPONIBLES ===`);
    console.log(`📍 Zone actuelle: ${this.currentZone}`);
    
    if (this.teleportZones.size === 0) {
      console.log(`⚠️ Aucun téléport trouvé dans cette zone`);
      return [];
    }
    
    const transitions = [];
    this.teleportZones.forEach((teleport, id) => {
      const transition = {
        id: id,
        from: teleport.fromZone,
        to: teleport.targetZone,
        spawn: teleport.targetSpawn,
        position: { x: teleport.x, y: teleport.y }
      };
      transitions.push(transition);
      
      console.log(`  🚪 ${id}: ${teleport.fromZone} → ${teleport.targetZone}[${teleport.targetSpawn}] @ (${teleport.x}, ${teleport.y})`);
    });
    
    return transitions;
  }

  // Obtenir des statistiques de performance
  getPerformanceStats() {
    return {
      isActive: this.isActive,
      isTransitioning: this.isTransitioning,
      teleportCount: this.teleportZones.size,
      currentZone: this.currentZone,
      strategy: this.transitionStrategy,
      debugMode: this.debugMode,
      hasLoadingOverlay: !!this.loadingOverlay,
      lastTransitionTime: this.transitionStartTime,
      uptime: Date.now() - (this.initTime || Date.now())
    };
  }

  // Réinitialiser complètement le système
  reset() {
    console.log(`🔄 [TransitionManager] === RESET COMPLET ===`);
    
    this.destroy();
    
    // Réinitialiser les états
    this.teleportZones = new Map();
    this.currentZone = sceneToZone(this.scene.scene.key); // ✅ UTILISER LA FONCTION CENTRALISÉE
    this.isActive = false;
    this.isTransitioning = false;
    this.loadingOverlay = null;
    this.transitionStartTime = 0;
    
    console.log(`✅ [TransitionManager] Reset terminé`);
  }

  // Méthode pour tester la connectivité réseau
  testNetworkConnectivity() {
    console.log(`🌐 [TransitionManager] === TEST CONNECTIVITÉ ===`);
    
    const hasNetworkManager = !!this.scene.networkManager;
    const hasRoom = !!this.scene.networkManager?.room;
    const isConnected = this.scene.networkManager?.isConnected;
    const roomState = this.scene.networkManager?.room?.state;
    
    console.log(`📡 NetworkManager: ${hasNetworkManager ? '✅' : '❌'}`);
    console.log(`🏠 Room: ${hasRoom ? '✅' : '❌'}`);
    console.log(`🔌 Connecté: ${isConnected ? '✅' : '❌'}`);
    console.log(`📊 State: ${roomState ? '✅' : '❌'}`);
    
    if (hasRoom) {
      console.log(`🆔 Session ID: ${this.scene.networkManager.room.sessionId}`);
      console.log(`🌍 Zone serveur: ${this.scene.networkManager.getCurrentZone()}`);
    }
    
    return {
      hasNetworkManager,
      hasRoom,
      isConnected,
      hasState: !!roomState
    };
  }
}
