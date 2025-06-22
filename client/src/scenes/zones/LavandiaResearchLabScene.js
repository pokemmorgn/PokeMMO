import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaResearchLabScene extends BaseZoneScene {
  constructor() {
    super('LavandiaResearchLabScene', 'lavandiaresearchlab');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaResearchLabScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}