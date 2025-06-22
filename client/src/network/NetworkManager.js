// client/src/transitions/TransitionIntegration.js
// ✅ INTÉGRATION SIMPLIFIÉE POUR SYSTÈME DYNAMIQUE

import { TransitionManager } from './TransitionManager.js';

export class TransitionIntegration {

  // À appeler dans BaseZoneScene.create() SI tu veux (optionnel, déjà géré normalement dans le constructeur de la scène)
  static setupTransitions(scene) {
    console.log(`🔌 [TransitionIntegration] Setup dynamique pour ${scene.scene.key}`);

    // Créer le TransitionManager
    scene.transitionManager = new TransitionManager(scene);

    // Initialiser quand la map est prête
    if (scene.map) {
      scene.transitionManager.initialize();
      console.log(`🔌 [TransitionIntegration] ✅ TransitionManager initialisé immédiatement`);
    } else {
      // Attendre que la map soit chargée
      const waitForMap = () => {
        if (scene.map) {
          scene.transitionManager.initialize();
          console.log(`🔌 [TransitionIntegration] ✅ TransitionManager initialisé après chargement map`);
        } else {
          scene.time.delayedCall(100, waitForMap);
        }
      };
      waitForMap();
    }
  }

  // À appeler dans BaseZoneScene.update()
  static updateTransitions(scene) {
    if (!scene.transitionManager?.isActive) return;

    // Récupérer le joueur local
    const myPlayer = scene.playerManager?.getMyPlayer();
    if (!myPlayer) return;

    // Vérifier les collisions (100% local)
    scene.transitionManager.checkCollisions(myPlayer);
  }

  // À appeler dans BaseZoneScene.cleanup()
  static cleanupTransitions(scene) {
    if (scene.transitionManager) {
      console.log(`🔌 [TransitionIntegration] Nettoyage ${scene.scene.key}`);
      scene.transitionManager.destroy();
      scene.transitionManager = null;
    }
  }

  // Pour activer/désactiver dynamiquement
  static setTransitionsActive(scene, active) {
    if (scene.transitionManager) {
      scene.transitionManager.setActive(active);
      console.log(`🔌 [TransitionIntegration] Transitions ${active ? 'activées' : 'désactivées'}`);
    }
  }

  // Infos debug immédiates
  static debugTransitions(scene) {
    if (scene.transitionManager) {
      scene.transitionManager.debugInfo();
    } else {
      console.log(`🔌 [TransitionIntegration] Aucun TransitionManager dans ${scene.scene.key}`);
    }
  }

  // Pour tester la "santé" du système de transition
  static checkTransitionHealth(scene) {
    if (!scene.transitionManager) {
      console.warn(`🔌 [TransitionIntegration] ⚠️ TransitionManager manquant`);
      return false;
    }

    const hasPlayerManager = !!scene.playerManager;
    const hasPlayer = !!scene.playerManager?.getMyPlayer();
    const hasMap = !!scene.map;
    const hasNetwork = !!scene.networkManager?.room;

    const isHealthy = hasPlayerManager && hasPlayer && hasMap && hasNetwork;

    if (!isHealthy) {
      console.warn(`🔌 [TransitionIntegration] ⚠️ Santé transitions:`);
      console.warn(`  - PlayerManager: ${hasPlayerManager}`);
      console.warn(`  - Player: ${hasPlayer}`);
      console.warn(`  - Map: ${hasMap}`);
      console.warn(`  - Network: ${hasNetwork}`);
    }

    return isHealthy;
  }

  // Forcer un rescanning des téléports (utile après reload de la map ou debug)
  static rescanTeleports(scene) {
    if (scene.transitionManager) {
      console.log(`🔌 [TransitionIntegration] 🔄 Rescan des téléports...`);
      scene.transitionManager.destroy();
      scene.transitionManager = new TransitionManager(scene);
      scene.transitionManager.initialize();
      console.log(`🔌 [TransitionIntegration] ✅ Rescan terminé`);
    }
  }

  // Obtenir des infos rapides (pour debug UI ou console)
  static getDebugInfo(scene) {
    if (!scene.transitionManager) {
      return { error: "Aucun TransitionManager" };
    }

    return {
      isActive: scene.transitionManager.isActive,
      isTransitioning: scene.transitionManager.isTransitioning,
      currentZone: scene.transitionManager.currentZone,
      teleportCount: scene.transitionManager.teleportZones.size,
      hasLoadingOverlay: !!scene.transitionManager.loadingOverlay
    };
  }
}
