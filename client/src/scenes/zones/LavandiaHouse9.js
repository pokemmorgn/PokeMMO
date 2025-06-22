import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse9Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse9Scene', 'lavandiahouse9');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse9Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}