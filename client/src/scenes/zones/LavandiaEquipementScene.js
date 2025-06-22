import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaEquipementScene extends BaseZoneScene {
  constructor() {
    super('LavandiaEquipementScene', 'lavandiaequipement');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaEquipementScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}