// ===============================================
// BeachScene.js - Version corrigée avec cooldown
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'GreenRootBeach');
    this.transitionCooldowns = {}; // ✅ AJOUT : Cooldowns par zone de transition
  }

  setupZoneTransitions() {
    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (worldsLayer) {
      const greenRootObj = worldsLayer.objects.find(obj => obj.name === 'GR');
      if (greenRootObj) {
        this.createTransitionZone(greenRootObj, 'VillageScene', 'north');
      }
    }
  }

  createTransitionZone(transitionObj, targetScene, direction) {
    const zone = this.add.zone(
      transitionObj.x + transitionObj.width / 2,
      transitionObj.y + transitionObj.height / 2,
      transitionObj.width,
      transitionObj.height
    );

    this.physics.world.enable(zone);
    zone.body.setAllowGravity(false);
    zone.body.setImmovable(true);

    console.log(`🚪 Zone de transition créée vers ${targetScene}`, zone);

    // ✅ MODIFICATION : Attendre que le joueur soit créé puis créer l'overlap UNE SEULE FOIS
    let overlapCreated = false;
    
    const checkPlayerInterval = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager.getMyPlayer();
        if (myPlayer && !overlapCreated) {
          overlapCreated = true;
          
          this.physics.add.overlap(myPlayer, zone, () => {
            // ✅ AJOUT : Vérifier le cooldown pour éviter les transitions multiples
            const cooldownKey = `${targetScene}_${direction}`;
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) {
              console.log(`[Transition] Cooldown actif ou déjà en transition vers ${targetScene}`);
              return;
            }

            // ✅ AJOUT : Activer le cooldown
            this.transitionCooldowns[cooldownKey] = true;
            console.log("[Transition] Demande transition vers", targetScene);
            
            // ✅ AJOUT : Désactiver temporairement la zone de transition
            zone.body.enable = false;
            
            this.networkManager.requestZoneTransition(targetScene, direction);
            
            // ✅ AJOUT : Réactiver après un délai (au cas où la transition échoue)
            this.time.delayedCall(3000, () => {
              if (this.transitionCooldowns) {
                delete this.transitionCooldowns[cooldownKey];
              }
              if (zone.body) {
                zone.body.enable = true;
              }
            });
          });
          
          checkPlayerInterval.remove(); // ✅ IMPORTANT : Supprimer l'interval
          console.log(`✅ Overlap créé pour transition vers ${targetScene}`);
        }
      },
    });
  }

  positionPlayer(player) {
    const initData = this.scene.settings.data;

    // ✅ SOLUTION : Utiliser la position du serveur sauf si c'est une transition
    if (initData?.fromZone === 'VillageScene') {
      // Transition depuis VillageScene - utiliser position fixe d'entrée
      player.x = 52;
      player.y = 48;
      console.log(`🚪 Joueur positionné depuis VillageScene: ${player.x}, ${player.y}`);
    } else if (initData?.fromZone) {
      // Transition depuis une autre zone - utiliser position fixe d'entrée  
      player.x = 52;
      player.y = 48;
      console.log(`🚪 Joueur positionné depuis ${initData.fromZone}: ${player.x}, ${player.y}`);
    } else {
      // ✅ PAS DE TRANSITION : Utiliser la position du serveur (sauvegardée)
      // Ne pas modifier player.x et player.y - garder les valeurs du serveur
      console.log(`🏖️ Joueur positionné à la position sauvée du serveur: (${player.x}, ${player.y})`);
    }

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }

    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
    }
  }

  create() {
    super.create();
    this.setupBeachEvents();
  }

  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  // ✅ AJOUT : Nettoyage des cooldowns lors de la destruction de la scène
  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}