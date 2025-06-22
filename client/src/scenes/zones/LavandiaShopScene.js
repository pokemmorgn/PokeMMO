import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaShopScene extends BaseZoneScene {
  constructor() {
    super('LavandiaShopScene', 'lavandiashop');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaShopScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}