// client/src/scenes/intros/PsyduckIntroManager.js
// Version modifiée avec intégration du prologue

import { PrologueManager } from './PrologueManager.js';

export class PsyduckIntroManager {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.psyduck = null;
    this.onCompleteCallback = null;
    this.questIntegrationEnabled = false;
    this.fallbackMode = false;
    this.listenersSetup = false;
    this.cameraFollowingPsyduck = false;
    this.originalCameraTarget = null;
    this.introType = 'beach'; // 'beach', 'village', ou 'village_simple'
    
    // ✅ NOUVEAU: Gestionnaire de prologue
    this.prologueManager = null;
    this.prologueEnabled = true; // Flag pour activer/désactiver le prologue
  }

  // ✅ NOUVELLE MÉTHODE: Point d'entrée principal avec prologue
  async startFullIntro(type = 'beach', options = {}) {
    if (this.isPlaying) {
      console.warn('[PsyduckIntro] Intro déjà en cours');
      return false;
    }

    console.log(`[PsyduckIntro] 🎬 Démarrage intro complète: prologue + ${type}`);

    // Option pour désactiver le prologue
    const skipPrologue = options.skipPrologue || !this.prologueEnabled;

    if (skipPrologue) {
      console.log('[PsyduckIntro] ⏩ Prologue désactivé, intro directe');
      return this.startIntro(type, options.onComplete);
    }

    try {
      // 1. Démarrer le prologue
      this.prologueManager = new PrologueManager(this.scene);
      
      const prologueSuccess = await this.prologueManager.start(() => {
        console.log('[PsyduckIntro] ✅ Prologue terminé, démarrage intro Psyduck');
        
        // 2. Quand le prologue est fini, lancer l'intro Psyduck
        this.scene.time.delayedCall(500, () => {
          this.startIntro(type, options.onComplete);
        });
      });

      if (!prologueSuccess) {
        console.warn('[PsyduckIntro] ⚠️ Prologue échoué, intro Psyduck directe');
        this.prologueManager = null;
        return this.startIntro(type, options.onComplete);
      }

      return true;

    } catch (error) {
      console.error('[PsyduckIntro] Erreur lors du prologue:', error);
      this.prologueManager = null;
      return this.startIntro(type, options.onComplete);
    }
  }

  // ✅ MÉTHODES D'ACCÈS SIMPLIFIÉES AVEC PROLOGUE
  async startFullBeachIntro(onComplete = null) {
    return this.startFullIntro('beach', { onComplete });
  }

  async startFullVillageIntro(onComplete = null) {
    return this.startFullIntro('village', { onComplete });
  }

  async startFullSimpleVillageIntro(onComplete = null) {
    return this.startFullIntro('village_simple', { onComplete });
  }

  // ✅ MÉTHODES ORIGINALES CONSERVÉES (pour compatibilité)
  startBeachIntro(onComplete = null) {
    this.introType = 'beach';
    return this.startIntro(onComplete);
  }

  startVillageIntro(onComplete = null) {
    this.introType = 'village';
    return this.startIntro(onComplete);
  }

  async startSimpleVillageIntro(onComplete = null) {
    this.introType = 'village_simple';
    
    if (this.isPlaying || !this.scene) return;

    if (!this.listenersSetup) {
      this.ensureListenersSetup();
    }
    this.blockPlayerInputs();
    this.isPlaying = true;
    this.onCompleteCallback = onComplete;

    console.log(`[PsyduckIntro] === DÉMARRAGE INTRO VILLAGE SIMPLE (SANS DIALOGUE) ===`);

    // Vérifications comme dans startIntro
    const loadingClosed = await this.waitForLoadingScreenClosed(10000);
    if (!loadingClosed) {
      console.warn('[PsyduckIntro] LoadingScreen pas fermé après 10s, continue quand même');
    }

    const playerReady = await this.waitForPlayerReady(8000);
    if (!playerReady) {
      console.warn('[PsyduckIntro] Flag playerReady pas prêt après 8s, annulation intro');
      this.cleanup();
      return;
    }

    const playerObject = await this.waitForValidPlayerObject(3000);
    if (!playerObject) {
      console.warn('[PsyduckIntro] Objet joueur pas valide après 3s, annulation intro');
      this.cleanup();
      return;
    }

    console.log('[PsyduckIntro] ⏳ Attente 2 secondes supplémentaires...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`[PsyduckIntro] ✅ Démarrage intro village simple`);
    
    this.blockPlayerInputs();
    this.loadPsyduckSpritesheet();

    // Spawn Psyduck en mode simple (sans dialogue)
    this.scene.time.delayedCall(800, () => {
      this.spawnPsyduckAtLabSimple();
    });
  }

  // ✅ MÉTHODE ORIGINALE MODIFIÉE (pour auto-détection du type)
  async startIntro(typeOrCallback = null, onComplete = null) {
    // Gestion des paramètres (rétro-compatibilité)
    let introType = this.introType;
    let callback = onComplete;

    if (typeof typeOrCallback === 'string') {
      introType = typeOrCallback;
      callback = onComplete;
    } else if (typeof typeOrCallback === 'function') {
      callback = typeOrCallback;
    }

    if (this.isPlaying || !this.scene) return;

    if (!this.listenersSetup) {
      this.ensureListenersSetup();
    }
    this.blockPlayerInputs();
    this.isPlaying = true;
    this.onCompleteCallback = callback;
    this.introType = introType;

    console.log(`[PsyduckIntro] === DÉMARRAGE INTRO ${this.introType.toUpperCase()} - VÉRIFICATIONS ===`);

    // ÉTAPE 1: Attendre que le LoadingScreen soit fermé
    const loadingClosed = await this.waitForLoadingScreenClosed(10000);
    if (!loadingClosed) {
      console.warn('[PsyduckIntro] LoadingScreen pas fermé après 10s, continue quand même');
    }

    // ÉTAPE 2: Attendre que le flag global playerReady soit true
    const playerReady = await this.waitForPlayerReady(8000);
    if (!playerReady) {
      console.warn('[PsyduckIntro] Flag playerReady pas prêt après 8s, annulation intro');
      this.cleanup();
      return;
    }

    // ÉTAPE 3: Vérifier que l'objet joueur existe et est valide
    const playerObject = await this.waitForValidPlayerObject(3000);
    if (!playerObject) {
      console.warn('[PsyduckIntro] Objet joueur pas valide après 3s, annulation intro');
      this.cleanup();
      return;
    }

    // NOUVEAU: DÉLAI DE 2 SECONDES avant démarrage
    console.log('[PsyduckIntro] ⏳ Attente 2 secondes supplémentaires...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`[PsyduckIntro] ✅ Toutes les vérifications passées, démarrage intro ${this.introType}`);
    
    // ÉTAPE 4: Bloquer les inputs et charger Psyduck
    this.blockPlayerInputs();
    this.loadPsyduckSpritesheet();

    // ÉTAPE 5: Délai final avant spawn Psyduck selon le type d'intro
    this.scene.time.delayedCall(800, () => {
      if (this.introType === 'village') {
        this.spawnPsyduckAtLab();
      } else if (this.introType === 'village_simple') {
        this.spawnPsyduckAtLabSimple();
      } else {
        this.spawnPsyduck(); // Version beach originale
      }
    });

    return true;
  }

  // ✅ CONFIGURATION DU PROLOGUE
  enablePrologue(enabled = true) {
    this.prologueEnabled = enabled;
    console.log(`[PsyduckIntro] Prologue ${enabled ? 'activé' : 'désactivé'}`);
  }

  isPrologueEnabled() {
    return this.prologueEnabled;
  }

  // ✅ CONTRÔLE DU PROLOGUE
  skipPrologue() {
    if (this.prologueManager && this.prologueManager.isActive()) {
      console.log('[PsyduckIntro] ⏩ Skip du prologue demandé');
      this.prologueManager.skip();
    }
  }

  isPrologueActive() {
    return this.prologueManager && this.prologueManager.isActive();
  }

  // ✅ CLEANUP AMÉLIORÉ
  cleanup() {
    try {
      console.log(`[PsyduckIntro] 🧹 Nettoyage intro ${this.introType}...`);
      
      // Nettoyer le prologue si actif
      if (this.prologueManager) {
        if (this.prologueManager.isActive()) {
          this.prologueManager.cleanup();
        }
        this.prologueManager = null;
      }
      
      // Nettoyer la caméra si nécessaire
      if (this.cameraFollowingPsyduck && this.scene && this.scene.cameras) {
        const camera = this.scene.cameras.main;
        camera.stopFollow();
        
        const myPlayer = this.scene.playerManager?.getMyPlayer();
        if (myPlayer) {
          camera.startFollow(myPlayer, true, 0.08, 0.08);
        }
        
        this.cameraFollowingPsyduck = false;
        this.originalCameraTarget = null;
      }
      
      // Nettoyer Psyduck
      if (this.psyduck && this.psyduck.destroy) {
        this.psyduck.destroy();
      }
      this.psyduck = null;
      
      this.isPlaying = false;
      this.unblockPlayerInputs();
      
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = null;
      }
    } catch (error) {
      console.error(`[PsyduckIntro] Cleanup error:`, error);
    }
  }

  // ✅ ARRÊT FORCÉ AMÉLIORÉ
  forceStop() {
    if (!this.isPlaying && !this.isPrologueActive()) return;
    
    try {
      console.log(`[PsyduckIntro] 🛑 Arrêt forcé de l'intro complète`);
      
      // Arrêter le prologue s'il est actif
      if (this.prologueManager && this.prologueManager.isActive()) {
        this.prologueManager.cleanup();
        this.prologueManager = null;
      }
      
      if (this.psyduck) {
        if (this.psyduck.destroy) {
          this.psyduck.destroy();
        }
        this.psyduck = null;
      }
      
      this.cleanup();
    } catch (error) {
      console.error(`[PsyduckIntro] Force stop error:`, error);
      this.isPlaying = false;
      this.psyduck = null;
      this.cameraFollowingPsyduck = false;
      this.originalCameraTarget = null;
      this.prologueManager = null;
      this.unblockPlayerInputs();
    }
  }

  // ✅ STATUS AMÉLIORÉ
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      introType: this.introType,
      questIntegrationEnabled: this.questIntegrationEnabled,
      fallbackMode: this.fallbackMode,
      listenersSetup: this.listenersSetup,
      hasPsyduck: this.psyduck !== null,
      hasScene: this.scene !== null,
      hasRoom: this.scene?.room !== null,
      hasCallback: this.onCompleteCallback !== null,
      cameraFollowingPsyduck: this.cameraFollowingPsyduck,
      playerReady: typeof window !== "undefined" && window.playerReady === true,
      loadingScreenClosed: typeof window !== "undefined" && window.loadingScreenClosed === true,
      validPlayerObject: this.scene?.playerManager?.getMyPlayer?.() !== null,
      // Nouveaux status prologue
      prologueEnabled: this.prologueEnabled,
      prologueActive: this.isPrologueActive(),
      hasPrologueManager: this.prologueManager !== null
    };
  }

  // ✅ TESTS AMÉLIORÉS
  async testFullIntro(type = 'beach') {
    if (this.isPlaying || this.isPrologueActive()) {
      await this.forceStop();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return this.startFullIntro(type);
  }

  testIntro() {
    if (this.isPlaying) {
      this.forceStop();
      setTimeout(() => {
        this.startIntroFallback();
      }, 1000);
    } else {
      this.startIntroFallback();
    }
  }

  // Nouvelles méthodes de test pour chaque type avec prologue
  async testFullBeachIntro() {
    return this.testFullIntro('beach');
  }

  async testFullVillageIntro() {
    return this.testFullIntro('village');
  }

  async testFullSimpleVillageIntro() {
    return this.testFullIntro('village_simple');
  }

  // ✅ DESTRUCTION AMÉLIORÉE
  destroy() {
    try {
      console.log('[PsyduckIntro] 💀 Destruction du manager');
      this.forceStop();
      
      if (this.prologueManager) {
        this.prologueManager.destroy();
        this.prologueManager = null;
      }
      
      this.scene = null;
      this.onCompleteCallback = null;
      this.questIntegrationEnabled = false;
      this.fallbackMode = false;
      this.listenersSetup = false;
      this.cameraFollowingPsyduck = false;
      this.originalCameraTarget = null;
      this.introType = 'beach';
      this.prologueEnabled = true;
    } catch (error) {
      console.error(`[PsyduckIntro] Destruction error:`, error);
    }
  }

  // === MÉTHODES ORIGINALES CONSERVÉES ===
  // [Toutes les autres méthodes restent identiques...]
  // setupServerListenersWhenReady, spawnPsyduck, showDialogue, etc.
  
  // [Le reste du code reste exactement pareil que dans ton fichier original]
}

// ✅ EXEMPLE D'UTILISATION SIMPLE:
/*
// Dans ta scène, au lieu de:
// psyduckIntro.startBeachIntro();

// Tu utilises maintenant:
await psyduckIntro.startFullBeachIntro();

// Ou pour désactiver le prologue:
psyduckIntro.enablePrologue(false);
psyduckIntro.startBeachIntro(); // Sans prologue

// Pour tester:
psyduckIntro.testFullBeachIntro(); // Avec prologue
psyduckIntro.testBeachIntro(); // Sans prologue
*/
