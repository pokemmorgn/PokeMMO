// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - VERSION TILE PAR TILE AVEC FLAPAROUND
// ================================================================================================
import { SpriteUtils } from '../utils/SpriteUtils.js';

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map(); // pokemonId -> sprite
    this.loadedSprites = new Set(); // Cache des sprites chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées
    this.tileSize = 16; // Taille d'une tile
    this.moveSpeed = 32; // Pixels par seconde pour le lerp (plus lent = plus naturel)
    
    console.log("🌍 [OverworldPokemonManager] Initialisé - Système tile par tile avec FlapAround");
  }

  /**
   * ✅ Détermine si une animation utilise la première rangée seulement (FlapAround-Anim)
   */
  isFirstRowOnlyAnimation(animationFile) {
    return animationFile.toLowerCase().includes('flaparound-anim.png');
  }

  /**
   * ✅ Détection structure avec SpriteUtils
   */
  async detectSpriteStructure(pokemonId, animationFile, width, height) {
    return await SpriteUtils.getSpriteStructure(pokemonId, animationFile, width, height);
  }

  /**
   * ✅ Charge un sprite Pokémon avec animation spécifique
   */
  async loadPokemonSprite(pokemonId, animationFile = 'Walk-Anim.png') {
    const spriteKey = `overworld_pokemon_${pokemonId}_${animationFile.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    if (this.loadedSprites.has(spriteKey) || this.loadingSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    this.loadingSprites.add(spriteKey);
    
    const paddedId = pokemonId.toString().padStart(3, '0');
    const spritePath = `/assets/pokemon/${paddedId}/${animationFile}`;
    
    console.log(`🎨 [OverworldPokemonManager] Chargement sprite ${pokemonId}: ${spritePath}`);
    
    try {
      const tempKey = `${spriteKey}_temp`;
      
      await new Promise((resolve, reject) => {
        this.scene.load.image(tempKey, spritePath);
        
        this.scene.load.once('complete', async () => {
          try {
            const texture = this.scene.textures.get(tempKey);
            if (!texture || !texture.source[0]) {
              throw new Error(`Texture ${tempKey} introuvable`);
            }
            
            const width = texture.source[0].width;
            const height = texture.source[0].height;
            const structure = await this.detectSpriteStructure(pokemonId, animationFile, width, height);
            this.spriteStructures.set(`${pokemonId}_${animationFile}`, structure);
