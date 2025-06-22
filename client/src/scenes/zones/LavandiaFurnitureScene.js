import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaFurnitureScene extends BaseZoneScene {
  constructor() {
    super('LavandiaFurnitureScene', 'lavandiafurniture');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaFurnitureScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}