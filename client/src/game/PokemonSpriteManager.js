// src/game/PokemonSpriteManager.js
export class PokemonSpriteManager {
  constructor(scene) {
    this.scene = scene;
  }

  // Charger le spritesheet si pas déjà chargé
  loadSpritesheet(pokemonName) {
    const key = pokemonName + 'Walk';
    if (!this.scene.textures.exists(key)) {
      this.scene.load.spritesheet(key, `assets/pokemon/${pokemonName}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }
  }

  // Créer un sprite avec anims auto pour ce Pokémon
  createPokemonSprite(pokemonName, x, y) {
    const key = pokemonName + 'Walk';

    // Générer les anims si pas déjà fait
    this.createAnimations(key);

    // Par défaut : frame 0 (marche haut)
    const sprite = this.scene.add.sprite(x, y, key, 0).setOrigin(0.5, 1);

    return sprite;
  }

  createAnimations(key) {
    const anims = this.scene.anims;
    if (!anims.exists(`${key}_up`)) {
      anims.create({
        key: `${key}_up`,
        frames: anims.generateFrameNumbers(key, { start: 0, end: 1 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!anims.exists(`${key}_down`)) {
      anims.create({
        key: `${key}_down`,
        frames: anims.generateFrameNumbers(key, { start: 2, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!anims.exists(`${key}_left`)) {
      anims.create({
        key: `${key}_left`,
        frames: anims.generateFrameNumbers(key, { start: 4, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!anims.exists(`${key}_right`)) {
      anims.create({
        key: `${key}_right`,
        frames: anims.generateFrameNumbers(key, { start: 6, end: 7 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}
