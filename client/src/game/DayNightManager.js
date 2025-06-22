// DayNightManager.js
import { TimeService } from './TimeService.js';

class DayNightManager {
  constructor(scene) {
    this.scene = scene;
    this.overlay = null;
    this.setup();
  }

  setup() {
    this.overlay = this.scene.add.rectangle(0, 0, 3000, 3000, 0x000044, 0);
    this.overlay.setOrigin(0, 0);
    this.overlay.setDepth(999);
    this.overlay.setScrollFactor(0);

    TimeService.getInstance().onTimeChange((hour, isDayTime) => {
      this.updateOverlay(isDayTime);
      console.log(`🌙 Client: ${hour}h - ${isDayTime ? 'Jour' : 'Nuit'}`);
    });

    const { isDayTime } = TimeService.getInstance().getCurrentTime();
    this.updateOverlay(isDayTime);
  }

  updateOverlay(isDayTime) {
    if (!this.overlay) return;
    this.overlay.setAlpha(isDayTime ? 0 : 0.5);
  }

  destroy() {
    if (this.overlay) {
      this.overlay.destroy();
    }
  }
}

export { DayNightManager };
