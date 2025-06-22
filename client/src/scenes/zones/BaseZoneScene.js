// BaseZoneScene.js
import Phaser from 'phaser';
import { TransitionManager } from './TransitionManager.js';
import { NetworkManager } from './NetworkManager.js';

export class BaseZoneScene extends Phaser.Scene {
  constructor(sceneKey) {
    super({ key: sceneKey });
    this.sceneKey = sceneKey;
    this.player = null;
    this.transitionManager = null;
    this.networkManager = null;
  }

  create(data) {
    // Simule un player "au centre"
    this.player = this.add.rectangle(400, 300, 32, 32, 0xffff00);
    this.player.setOrigin(0.5);

    // Setup network (mock)
    this.networkManager = new NetworkManager();

    // Setup transitions
    this.transitionManager = new TransitionManager(this);

    // TP bouton pour tester
    this.add.text(10, 10, `Zone: ${this.sceneKey}\nAppuie sur Espace pour TP`, { fontSize: '18px', fill: '#fff' });

    // Appuie sur espace pour changer de scène
    this.input.keyboard.on('keydown-SPACE', () => {
      const nextScene = this.sceneKey === 'ZoneA' ? 'ZoneB' : 'ZoneA';
      this.transitionManager.transitionTo(nextScene, { x: 400, y: 300 });
    });
  }

  // Pour appliquer les positions lors d'un TP
  setPlayerPosition(x, y) {
    if (this.player) {
      this.player.x = x;
      this.player.y = y;
    }
  }
}
