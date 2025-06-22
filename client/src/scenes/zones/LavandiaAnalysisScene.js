import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaAnalysisScene extends BaseZoneScene {
  constructor() {
    super('LavandiaAnalysisScene', 'lavandiaanalysis');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaAnalysisScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}