// client/src/transitions/TransitionIntegration.js
// ✅ INTÉGRATION 100% LOCALE - AUCUNE INTERACTION SERVEUR

import { TransitionManager } from './TransitionManager.js';

export class TransitionIntegration {
  
  // ✅ MÉTHODE 1: Initialiser dans BaseZoneScene.create()
  static setupTransitions(scene) {
    console.log(`🔌 [TransitionIntegration] Setup LOCAL pour ${scene.scene.key}`);
    
    // Créer le TransitionManager
    scene.transitionManager = new TransitionManager(scene);
    
    // L'initialiser après que la map soit chargée
    if (scene.map) {
      scene.transitionManager.initialize();
    } else {
      // Attendre que la map soit prête
      const checkMap = () => {
        if (scene.map) {
          scene.transitionManager.initialize();
        } else {
          scene.time.delayedCall(100, checkMap);
        }
      };
      checkMap();
    }
    
    console.log(`🔌 [TransitionIntegration] ✅ Setup LOCAL terminé - aucune dépendance serveur`);
  }

  // ✅ MÉTHODE 2: Vérifier les collisions dans BaseZoneScene.update()
  static updateTransitions(scene) {
    if (!scene.transitionManager || !scene.transitionManager.isActive) {
      return;
    }

    // ✅ RÉCUPÉRER LE JOUEUR DEPUIS PLAYERMANAGER (pas du serveur)
    const myPlayer = scene.playerManager?.getMyPlayer();
    if (!myPlayer) {
      return;
    }

    // Vérifier les collisions (100% local)
    scene.transitionManager.checkCollisions(myPlayer);
  }

  // ✅ MÉTHODE 3: Nettoyer dans BaseZoneScene.cleanup()
  static cleanupTransitions(scene) {
    if (scene.transitionManager) {
      console.log(`🔌 [TransitionIntegration] Nettoyage LOCAL ${scene.scene.key}`);
      scene.transitionManager.destroy();
      scene.transitionManager = null;
    }
  }

  // ✅ MÉTHODE 4: Activer/désactiver temporairement
  static setTransitionsActive(scene, active) {
    if (scene.transitionManager) {
      scene.transitionManager.setActive(active);
    }
  }

  // ✅ MÉTHODE 5: Debug - afficher les infos
  static debugTransitions(scene) {
    if (scene.transitionManager) {
      scene.transitionManager.debugInfo();
    } else {
      console.log(`🔌 [TransitionIntegration] Aucun TransitionManager dans ${scene.scene.key}`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Vérifier si on peut faire des transitions locales
  static canDoLocalTransitions(scene) {
    // Vérifier que les éléments nécessaires sont présents
    const hasPlayerManager = !!scene.playerManager;
    const hasPlayer = !!scene.playerManager?.getMyPlayer();
    const hasMap = !!scene.map;
    
    const canTransition = hasPlayerManager && hasPlayer && hasMap;
    
    if (!canTransition) {
      console.warn(`🔌 [TransitionIntegration] ⚠️ Transition locale impossible:`);
      console.warn(`  - PlayerManager: ${hasPlayerManager}`);
      console.warn(`  - Player: ${hasPlayer}`);
      console.warn(`  - Map: ${hasMap}`);
    }
    
    return canTransition;
  }
}
