// ===============================================
// LoaderScene.js - Version corrigée
// ===============================================
export class LoaderScene extends Phaser.Scene {
constructor() {
super({ key: ‘LoaderScene’ });
}

preload() {
this.createLoadingBar();

```
// ✅ Maps
this.load.tilemapTiledJSON('GreenRootBeach', 'assets/maps/GreenRootBeach.tmj');
this.load.tilemapTiledJSON('Greenroot', 'assets/maps/Greenroot.tmj');
this.load.tilemapTiledJSON('ProfLaboInt', 'assets/maps/ProfLaboInt.tmj');

// ✅ Tilesets - ATTENTION AUX NOMS !
// Les noms doivent correspondre EXACTEMENT à ceux dans vos fichiers .tmj
this.load.image('Assets', 'assets/sprites/Assets.png');
this.load.image('Greenroot', 'assets/sprites/Greenroot.png');
this.load.image('LaboInterior', 'assets/sprites/LaboInterior.png');
this.load.image('LaboInterior2', 'assets/sprites/LaboInterior2.png');
this.load.image('FloatingRing_1', 'assets/sprites/FloatingRing_1.png');
this.load.image('RockFloating_1', 'assets/sprites/RockFloating_1.png');
this.load.image('RockFloating_2', 'assets/sprites/RockFloating_2.png');
this.load.image('RockFloating_3', 'assets/sprites/Rockfloating_3.png'); // ⚠️ Vérifiez la casse !
this.load.image('Umbrella', 'assets/sprites/Umbrella.png');
this.load.image('Water', 'assets/sprites/Water.png');
this.load.image('Water_2', 'assets/sprites/Water_2.png');
this.load.image('Water_3', 'assets/sprites/Water_3.png');

// ✅ Spritesheet du joueur
this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
  frameWidth: 32,
  frameHeight: 48,
});

// ✅ Progress events
this.load.on('progress', (progress) => {
  this.updateProgressBar(progress);
});

this.load.on('complete', () => {
  console.log('✅ Tous les assets sont chargés !');
  this.startGame();
});

// ✅ Error handling
this.load.on('loaderror', (file) => {
  console.error('❌ Erreur de chargement:', file.src);
});
```

}

updateProgressBar(progress) {
if (this.progressBar) {
this.progressBar.clear();
this.progressBar.fillStyle(0x00ff00);
this.progressBar.fillRect(250, 280, 300 * progress, 20);
}
if (this.progressText) {
this.progressText.setText(Math.round(progress * 100) + ‘%’);
}
}

async startGame() {
// Logique pour démarrer la bonne scène (comme votre code existant)
const getWalletFromUrl = () => {
const params = new URLSearchParams(window.location.search);
return params.get(‘wallet’);
};

```
let identifier = getWalletFromUrl();
if (!identifier && window.app?.currentAccount?.address) {
  identifier = window.app.currentAccount.address;
}

if (!identifier) {
  alert("Aucun wallet connecté !");
  return;
}

// Récupérer la dernière position et démarrer la bonne scène
try {
  const res = await fetch(`/api/playerData?username=${encodeURIComponent(identifier)}`);
  if (res.ok) {
    const data = await res.json();
    const lastMap = data.lastMap || 'Beach';
    
    switch (lastMap.toLowerCase()) {
      case 'beach':
        this.scene.start('BeachScene');
        break;
      case 'village':
        this.scene.start('VillageScene');
        break;
      case 'villagelab':
        this.scene.start('VillageLabScene');
        break;
      default:
        this.scene.start('BeachScene');
    }
  } else {
    this.scene.start('BeachScene');
  }
} catch (e) {
  console.warn("Erreur API, démarrage BeachScene", e);
  this.scene.start('BeachScene');
}
```

}

createLoadingBar() {
this.add.rectangle(400, 290, 320, 40, 0x222222);
this.progressBar = this.add.graphics();
this.progressText = this.add.text(400, 290, ‘0%’, {
fontSize: ‘16px’,
fontFamily: ‘monospace’,
color: ‘#ffffff’
}).setOrigin(0.5);
this.add.text(400, 200, ‘PokeWorld MMO’, {
fontSize: ‘32px’,
fontFamily: ‘monospace’,
color: ‘#ffffff’,
fontStyle: ‘bold’
}).setOrigin(0.5);
this.add.text(400, 240, ‘Loading world…’, {
fontSize: ‘18px’,
fontFamily: ‘monospace’,
color: ‘#cccccc’
}).setOrigin(0.5);
}
}

// ===============================================
// BaseZoneScene.js - Version modifiée pour ne pas recharger
// ===============================================
export class BaseZoneScene extends Phaser.Scene {
// … autres méthodes inchangées

preload() {
// ✅ Charger SEULEMENT la map, les images sont déjà chargées
const ext = “tmj”;

```
// Vérifier si la map n'est pas déjà chargée
if (!this.cache.tilemap.has(this.mapKey)) {
  this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);
}

// ✅ Spritesheet du joueur - ne charger que si pas déjà présent
if (!this.textures.exists('dude')) {
  this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
    frameWidth: 32,
    frameHeight: 48,
  });
}
```

}

loadMap() {
console.log(’— DEBUT loadMap —’);
this.map = this.make.tilemap({ key: this.mapKey });

```
// ✅ Debug mais ne plus recharger les tilesets
console.log("========== [DEBUG] Chargement de la map ==========");
console.log("Clé de la map (mapKey):", this.mapKey);
console.log("Tilesets trouvés dans la map:", this.map.tilesets.map(ts => ts.name));
console.log("Layers dans la map:", this.map.layers.map(l => l.name));

// ✅ Vérifier que toutes les images sont chargées
let missingTextures = [];
this.map.tilesets.forEach(tileset => {
  if (!this.textures.exists(tileset.name)) {
    missingTextures.push(tileset.name);
    console.error(`❌ Texture manquante: ${tileset.name}`);
  } else {
    console.log(`✅ Texture trouvée: ${tileset.name}`);
  }
});

if (missingTextures.length > 0) {
  console.error('❌ Textures manquantes:', missingTextures);
  console.error('Vérifiez que les noms dans LoaderScene correspondent aux noms dans le fichier .tmj');
  return;
}

// ✅ Créer les tilesets (les images sont déjà chargées)
this.phaserTilesets = this.map.tilesets.map(ts => {
  console.log(`✅ Création tileset: "${ts.name}"`);
  return this.map.addTilesetImage(ts.name, ts.name);
});

// ✅ Créer les layers
this.layers = {};
const depthOrder = {
  'BelowPlayer': 1,
  'BelowPlayer2': 2,
  'World': 3,
  'AbovePlayer': 4,
  'Grass': 1.5
};

this.map.layers.forEach(layerData => {
  console.log(`✅ Layer créé: ${layerData.name}`);
  const layer = this.map.createLayer(layerData.name, this.phaserTilesets, 0, 0);
  this.layers[layerData.name] = layer;
  layer.setDepth(depthOrder[layerData.name] ?? 0);
});

// ✅ Animated tiles
if (this.sys.animatedTiles) {
  this.sys.animatedTiles.init(this.map);
}

// ✅ Collisions
this.worldLayer = this.layers['World'];
if (this.worldLayer) {
  this.worldLayer.setCollisionByProperty({ collides: true });
  const debugGraphics = this.add.graphics();
  this.worldLayer.renderDebug(debugGraphics, {
    tileColor: null,
    collidingTileColor: new Phaser.Display.Color(255, 128, 0, 180),
    faceColor: new Phaser.Display.Color(255, 0, 0, 255),
  });
}

this.setupAnimatedObjects();
this.setupScene();
this.setupZoneTransitions();
```

}

// … reste des méthodes inchangées
}

// ===============================================
// main.js - Configuration Phaser
// ===============================================
import { LoaderScene } from ‘./scenes/LoaderScene.js’;
import { BeachScene } from ‘./scenes/BeachScene.js’;
import { VillageScene } from ‘./scenes/VillageScene.js’;
import { VillageLabScene } from ‘./scenes/VillageLabScene.js’;

const config = {
type: Phaser.AUTO,
width: 800,
height: 600,
physics: {
default: ‘arcade’,
arcade: {
gravity: { y: 0 },
debug: false
}
},
scene: [
LoaderScene,    // ✅ Première scène = loader
BeachScene,
VillageScene,
VillageLabScene
]
};

const game = new Phaser.Game(config);