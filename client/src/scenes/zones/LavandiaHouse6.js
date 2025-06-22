import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse6Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse6Scene', 'lavandiahouse6');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse6Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}