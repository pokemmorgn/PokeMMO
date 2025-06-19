import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaScene extends BaseZoneScene {
  constructor() {
    super('LavandiaScene', 'Lavandia');
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    this.maxPlayerCreationAttempts = 10;
    console.log("[LavandiaScene] Constructor appelé");
  }

   setupZoneTransitions() {
    if (!this.playerManager) {
      console.warn("playerManager non encore initialisé, retry dans 100ms");
      this.time.delayedCall(100, () => this.setupZoneTransitions());
      return;
    }

    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn("Layer 'Worlds' non trouvé");
      return;
    }

    const player = this.playerManager.getMyPlayer();
    if (!player) {
      console.warn("Player non encore créé, retry dans 100ms");
      this.time.delayedCall(100, () => this.setupZoneTransitions());
      return;
    }
    console.log(`🎮 Joueur récupéré: position (${player.x}, ${player.y})`);

    if (!player.body) {
      console.warn("⚠️ Player.body non créé, retry setupZoneTransitions dans 100ms");
      this.time.delayedCall(100, () => this.setupZoneTransitions());
      return;
    }
    console.log("✅ Player.body présent, création des zones de transition");

    worldsLayer.objects.forEach(obj => {
      const targetZoneProp = obj.properties?.find(p => p.name === 'targetZone');
      const directionProp = obj.properties?.find(p => p.name === 'direction');
      if (!targetZoneProp) {
        console.warn(`⚠️ Objet ${obj.name || obj.id} dans 'Worlds' sans propriété targetZone, ignoré`);
        return;
      }

      const targetZone = targetZoneProp.value;
      const direction = directionProp ? directionProp.value : 'north';

      console.log(`➡️ Création zone transition vers ${targetZone} à (${obj.x},${obj.y}), taille ${obj.width}x${obj.height}`);

      const zone = this.add.zone(
        obj.x + obj.width / 2,
        obj.y + obj.height / 2,
        obj.width,
        obj.height
      );
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      zone.body.setImmovable(true);

      this.physics.add.overlap(player, zone, () => {
        if (!this.networkManager) {
          console.warn("⚠️ networkManager non défini, transition ignorée");
          return;
        }
        console.log(`↪️ Overlap détecté avec zone transition vers ${targetZone} (${direction})`);
        this.networkManager.requestZoneTransition(targetZone, direction);
      });
    });


  createTransitionZone(transitionObj, targetScene, direction) {
    const sceneName = this.scene.key || 'BaseZoneScene';
    console.log(`[${sceneName}] createTransitionZone vers ${targetScene}, direction ${direction}`);

    const transitionZone = this.add.zone(
      transitionObj.x + transitionObj.width / 2,
      transitionObj.y + transitionObj.height / 2,
      transitionObj.width,
      transitionObj.height
    );

    this.physics.world.enable(transitionZone);
    transitionZone.body.setAllowGravity(false);
    transitionZone.body.setImmovable(true);

    let overlapCreated = false;
    
    const checkPlayerInterval = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager.getMyPlayer();
        if (myPlayer && !overlapCreated) {
          console.log(`[${sceneName}] Joueur trouvé, création overlap avec zone de transition`);
          overlapCreated = true;
          this.physics.add.overlap(myPlayer, transitionZone, () => {
            console.log(`[${sceneName}] Overlap détecté avec zone vers ${targetScene}`);
            const cooldownKey = `${targetScene}_${direction}`;
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) {
              console.log(`[${sceneName}] Transition en cooldown ou déjà en cours, on ignore`);
              return;
            }
            this.transitionCooldowns[cooldownKey] = true;
            transitionZone.body.enable = false;
            this.networkManager.requestZoneTransition(targetScene, direction);

            this.time.delayedCall(3000, () => {
              if (this.transitionCooldowns) {
                delete this.transitionCooldowns[cooldownKey];
                console.log(`[${sceneName}] Cooldown supprimé pour ${cooldownKey}`);
              }
              if (transitionZone.body) {
                transitionZone.body.enable = true;
              }
            });
          });
          checkPlayerInterval.remove();
        }
      },
    });
  }

  positionPlayer(player) {
    // On récupère la position de SpawnPoint_Lavandiabottom dans la map
    const spawnObj = this.map.getObjectLayer('Worlds')?.objects.find(obj => obj.name === 'SpawnPoint_Lavandiabottom');
    if (spawnObj) {
      player.x = spawnObj.x + (spawnObj.width || 0) / 2;
      player.y = spawnObj.y + (spawnObj.height || 0) / 2;
      console.log(`[LavandiaScene] positionné via SpawnPoint_Lavandiabottom à (${player.x}, ${player.y})`);
    } else {
      // Fallback : coords par défaut si le spawnpoint n’existe pas
      player.x = 350;
      player.y = 750;
      console.warn("[LavandiaScene] SpawnPoint_Lavandiabottom non trouvé, position par défaut utilisée");
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
    this.setupLavandiaUI();
    this.setupLavandiaEvents();
    this.ensurePlayerIsCreated();
  }

  ensurePlayerIsCreated() {
    const checkPlayer = () => {
      const myPlayer = this.playerManager?.getMyPlayer();
      if (myPlayer) return;

      this.playerCreationAttempts++;
      if (this.playerCreationAttempts >= this.maxPlayerCreationAttempts) {
        if (this.networkManager) this.networkManager.reconnect();
        return;
      }
      if (this.networkManager && this.networkManager.getSessionId()) {
        const sessionId = this.networkManager.getSessionId();
        const playerState = this.networkManager.getPlayerState(sessionId);
        if (playerState) {
          // Utilise positionPlayer pour positionner via spawnpoint
          this.playerManager.createPlayer(sessionId, playerState);
          this.positionPlayer(this.playerManager.getMyPlayer());
        } else {
          const defaultState = { sessionId: sessionId, name: sessionId.substring(0, 8) };
          this.playerManager.createPlayer(sessionId, defaultState);
          this.positionPlayer(this.playerManager.getMyPlayer());
        }
      }
      this.time.delayedCall(500, checkPlayer);
    };
    this.time.delayedCall(200, checkPlayer);
  }

  setupLavandiaUI() {
    this.add
      .text(16, 80, 'Lavandia - Cité Mystérieuse', {
        font: '16px monospace',
        fill: '#eeeeee',
        padding: { x: 10, y: 5 },
        backgroundColor: 'rgba(138, 43, 226, 0.8)',
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  setupLavandiaEvents() {
    this.time.delayedCall(1500, () => {
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLavandia\nConnected!');
      }
    });
  }

  cleanup() {
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    super.cleanup();
  }
}
