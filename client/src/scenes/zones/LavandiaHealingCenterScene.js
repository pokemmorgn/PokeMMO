import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHealingCenterScene extends BaseZoneScene {
  constructor() {
    super('LavandiaHealingCenterScene', 'lavandiahealingcenter');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHealingCenterScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}