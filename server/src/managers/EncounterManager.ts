// server/src/managers/EncounterManager.ts - VERSION AVEC CONFIG
import fs from 'fs/promises';
import path from 'path';
import { getPokemonById } from '../data/PokemonData';
import { getServerConfig } from '../config/serverConfig';

export interface WildPokemon {
  pokemonId: number;
  level: number;
  gender: string;
  nature: string;
  shiny: boolean;
  moves: string[];
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
}

export interface EncounterData {
  species: string;
  level_range: [number, number];
  chance: number;
}

export interface EncounterZone {
  grass?: {
    day?: EncounterData[];
    night?: EncounterData[];
    rain?: EncounterData[];
  };
  fishing?: {
    day?: EncounterData[];
    night?: EncounterData[];
    rain?: EncounterData[];
  };
}

export interface EncounterTable {
  zone: string;
  encounters: {
    zones: {
      [zoneId: string]: EncounterZone;
    };
    fishing?: {
      calm_water?: {
        day?: EncounterData[];
        night?: EncounterData[];
        rain?: EncounterData[];
      };
    };
    held_items?: Array<{
      species: string;
      item: string;
      chance: number;
    }>;
    conditions?: {
      spawn_condition?: string;
      shiny_rate_modifier?: number;
      nature?: string;
      gender_ratio?: string;
      experience_yield?: string;
    };
  };
}

export class ServerEncounterManager {
  private encounterTables: Map<string, EncounterTable> = new Map();
  private pokemonNameToId: Map<string, number> = new Map();
  
  // ✅ Anti-cheat: Cooldown par joueur
  private playerCooldowns: Map<string, number> = new Map();
  
  // ✅ Rate limiting par joueur (anti-spam)
  private playerEncounterCount: Map<string, { count: number; timestamp: number }> = new Map();

  constructor() {
    this.initializePokemonMapping();
  }

  // ✅ GETTERS UTILISANT LA CONFIG
  private getEncounterConfig() {
    return getServerConfig().encounterSystem;
  }

  private get ENCOUNTER_COOLDOWN() {
    return this.getEncounterConfig().playerCooldownMs;
  }

  private get MAX_ENCOUNTERS_PER_MINUTE() {
    return this.getEncounterConfig().maxEncountersPerMinute;
  }

  // ✅ VALIDATION D'UNE RENCONTRE DEPUIS LE CLIENT
  async validateAndGenerateEncounter(
    playerId: string,
    zoneName: string,
    x: number,
    y: number,
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain',
    zoneId?: string, // ✅ NOUVEAU: Zone spécifique de rencontre
    method: 'grass' | 'fishing' = 'grass'
  ): Promise<WildPokemon | null> {
    
    console.log(`🔍 [ServerEncounter] === VALIDATION RENCONTRE ===`);
    console.log(`👤 Joueur: ${playerId}`);
    console.log(`📍 Position: (${x}, ${y}) dans ${zoneName}`);
    console.log(`🌿 Zone ID: ${zoneId || 'default'}`);
    console.log(`⏰ Conditions: ${timeOfDay}, ${weather}`);
    
    // ✅ ANTI-CHEAT: Vérifier le cooldown
    if (!this.checkCooldown(playerId)) {
      console.log(`⚠️ [ServerEncounter] Cooldown actif pour ${playerId}`);
      return null;
    }

    // ✅ ANTI-CHEAT: Rate limiting
    if (!this.checkRateLimit(playerId)) {
      console.warn(`❌ [ServerEncounter] Rate limit dépassé pour ${playerId}`);
      return null;
    }

    // ✅ ANTI-CHEAT: Validation position
    if (!this.isValidPosition(x, y)) {
      console.warn(`❌ [ServerEncounter] Position invalide: (${x}, ${y})`);
      return null;
    }

    // ✅ Charger la table de rencontres si nécessaire
    if (!this.encounterTables.has(zoneName)) {
      await this.loadEncounterTable(zoneName);
    }

    const table = this.encounterTables.get(zoneName);
    if (!table) {
      console.warn(`❌ [ServerEncounter] Aucune table pour ${zoneName}`);
      return null;
    }

    // ✅ Générer le Pokémon selon la zone spécifique
    const wildPokemon = await this.generateWildEncounterByZone(
      table, 
      zoneId || `${zoneName}_default`, 
      method, 
      timeOfDay, 
      weather
    );
    
    if (wildPokemon) {
      // ✅ Mettre à jour les anti-cheat
      this.updatePlayerCooldown(playerId);
      this.updateRateLimit(playerId);
      
      console.log(`⚔️ [ServerEncounter] Rencontre validée !`);
      console.log(`🐾 Pokémon: ${wildPokemon.pokemonId} niveau ${wildPokemon.level}`);
      console.log(`✨ Shiny: ${wildPokemon.shiny}, Nature: ${wildPokemon.nature}`);
    } else {
      console.log(`❌ [ServerEncounter] Aucune rencontre générée`);
    }

    return wildPokemon;
  }

  // ✅ GÉNÉRATION PAR ZONE SPÉCIFIQUE
  private async generateWildEncounterByZone(
    table: EncounterTable,
    zoneId: string,
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain'
  ): Promise<WildPokemon | null> {
    
    console.log(`🎯 [ServerEncounter] Génération pour zone: ${zoneId}`);
    
    // ✅ Vérifier si la zone existe
    const zoneData = table.encounters.zones[zoneId];
    if (!zoneData) {
      console.warn(`⚠️ [ServerEncounter] Zone ${zoneId} non trouvée, essai avec fallback`);
      
      // ✅ Fallback: essayer la zone par défaut
      const defaultZoneKey = Object.keys(table.encounters.zones).find(key => 
        key.includes('default') || key.endsWith('_default')
      );
      
      if (defaultZoneKey) {
        const defaultZone = table.encounters.zones[defaultZoneKey];
        console.log(`🔄 [ServerEncounter] Utilisation zone fallback: ${defaultZoneKey}`);
        return this.generateFromZoneData(defaultZone, method, timeOfDay, weather, table);
      }
      
      return null;
    }

    return this.generateFromZoneData(zoneData, method, timeOfDay, weather, table);
  }

  // ✅ GÉNÉRATION DEPUIS LES DONNÉES D'UNE ZONE
  private async generateFromZoneData(
    zoneData: EncounterZone,
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain',
    table: EncounterTable
  ): Promise<WildPokemon | null> {
    
    let encounters: EncounterData[] | undefined;

    if (method === 'grass' && zoneData.grass) {
      // ✅ Priorité: météo spéciale > moment de la journée > défaut
      if (weather === 'rain' && zoneData.grass.rain) {
        encounters = zoneData.grass.rain;
        console.log(`🌧️ [ServerEncounter] Utilisation rencontres pluie`);
      } else if (timeOfDay === 'night' && zoneData.grass.night) {
        encounters = zoneData.grass.night;
        console.log(`🌙 [ServerEncounter] Utilisation rencontres nuit`);
      } else if (zoneData.grass.day) {
        encounters = zoneData.grass.day;
        console.log(`☀️ [ServerEncounter] Utilisation rencontres jour`);
      }
    } else if (method === 'fishing') {
      // ✅ Pour la pêche, utiliser la table globale de la zone
      const fishingData = table.encounters.fishing?.calm_water;
      if (fishingData) {
        if (weather === 'rain' && fishingData.rain) {
          encounters = fishingData.rain;
        } else if (timeOfDay === 'night' && fishingData.night) {
          encounters = fishingData.night;
        } else if (fishingData.day) {
          encounters = fishingData.day;
        }
      }
    }

    if (!encounters || encounters.length === 0) {
      console.log(`❌ [ServerEncounter] Aucune rencontre disponible pour ces conditions`);
      return null;
    }

    console.log(`📊 [ServerEncounter] ${encounters.length} rencontres possibles`);

    // ✅ Sélection pondérée
    const totalChance = encounters.reduce((sum, enc) => sum + enc.chance, 0);
    let random = Math.random() * totalChance;
    
    let selectedEncounter: EncounterData | null = null;
    for (const encounter of encounters) {
      random -= encounter.chance;
      if (random <= 0) {
        selectedEncounter = encounter;
        break;
      }
    }

    if (!selectedEncounter) {
      console.warn(`⚠️ [ServerEncounter] Aucune rencontre sélectionnée`);
      return null;
    }

    console.log(`🎲 [ServerEncounter] Sélectionné: ${selectedEncounter.species} (chance: ${selectedEncounter.chance})`);

    // ✅ Convertir le nom en ID
    const pokemonId = this.pokemonNameToId.get(selectedEncounter.species);
    if (!pokemonId) {
      console.warn(`⚠️ [ServerEncounter] ID non trouvé pour ${selectedEncounter.species}`);
      return null;
    }

    // ✅ Générer le niveau
    const [minLevel, maxLevel] = selectedEncounter.level_range;
    const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

    // ✅ Appliquer modificateurs de la table si présents
    const shinyModifier = table.encounters.conditions?.shiny_rate_modifier || 1.0;

    // ✅ Génération complète du Pokémon
    return await this.generateWildPokemonStats(pokemonId, level, shinyModifier);
  }

  // ✅ MÉTHODES ANTI-CHEAT AMÉLIORÉES

  private checkCooldown(playerId: string): boolean {
    const now = Date.now();
    const lastEncounter = this.playerCooldowns.get(playerId) || 0;
    return (now - lastEncounter) >= this.ENCOUNTER_COOLDOWN;
  }

  private updatePlayerCooldown(playerId: string): void {
    this.playerCooldowns.set(playerId, Date.now());
  }

  private checkRateLimit(playerId: string): boolean {
    const now = Date.now();
    const playerData = this.playerEncounterCount.get(playerId);
    
    if (!playerData) {
      this.playerEncounterCount.set(playerId, { count: 1, timestamp: now });
      return true;
    }

    // Reset compteur si plus d'une minute
    if (now - playerData.timestamp > 60000) {
      this.playerEncounterCount.set(playerId, { count: 1, timestamp: now });
      return true;
    }

    // Vérifier limite
    if (playerData.count >= this.MAX_ENCOUNTERS_PER_MINUTE) {
      return false;
    }

    return true;
  }

  private updateRateLimit(playerId: string): void {
    const now = Date.now();
    const playerData = this.playerEncounterCount.get(playerId);
    
    if (playerData) {
      playerData.count++;
    } else {
      this.playerEncounterCount.set(playerId, { count: 1, timestamp: now });
    }
  }

private isValidPosition(x: number, y: number): boolean {
  // ✅ FIX: Accepter les nombres décimaux (coordonnées Phaser)
  if (typeof x !== 'number' || typeof y !== 'number') return false;
  if (isNaN(x) || isNaN(y)) return false;
  if (!isFinite(x) || !isFinite(y)) return false;
  if (x < 0 || y < 0) return false;
  if (x > 2000 || y > 2000) return false; // Limite raisonnable
  return true;
}

  // ✅ MÉTHODES UTILITAIRES EXISTANTES

  private initializePokemonMapping() {
    this.pokemonNameToId.set("Pidgey", 16);
    this.pokemonNameToId.set("Rattata", 19);
    this.pokemonNameToId.set("Caterpie", 10);
    this.pokemonNameToId.set("Weedle", 13);
    this.pokemonNameToId.set("Oddish", 43);
    this.pokemonNameToId.set("Bellsprout", 69);
    this.pokemonNameToId.set("Zubat", 41);
    this.pokemonNameToId.set("Gastly", 92);
    this.pokemonNameToId.set("Pikachu", 25);
    this.pokemonNameToId.set("Axoloto", 194); // Wooper
    this.pokemonNameToId.set("Magikarp", 129);
    this.pokemonNameToId.set("Loupio", 170); // Chinchou
    this.pokemonNameToId.set("Poissirene", 116); // Horsea
  }

async loadEncounterTable(zone: string): Promise<void> {
  try {
    // ✅ DEBUG: Afficher le chemin exact
    const filePath = path.join(__dirname, `../data/encounters/${zone}.json`);
    console.log(`🔍 [ServerEncounter] Tentative de chargement: ${zone}`);
    console.log(`📁 [ServerEncounter] Chemin complet: ${filePath}`);
    console.log(`📂 [ServerEncounter] __dirname: ${__dirname}`);
    
    // ✅ FIX: Utiliser fs synchrone pour les vérifications
    const fsSync = require('fs');
    const fileExists = fsSync.existsSync(filePath);
    console.log(`📄 [ServerEncounter] Fichier existe: ${fileExists}`);
    
    if (!fileExists) {
      // ✅ DEBUG: Lister le contenu du dossier
      const encountersDir = path.join(__dirname, '../data/encounters');
      console.log(`📂 [ServerEncounter] Dossier encounters: ${encountersDir}`);
      
      try {
        const dirExists = fsSync.existsSync(encountersDir);
        console.log(`📁 [ServerEncounter] Dossier existe: ${dirExists}`);
        
        if (dirExists) {
          const files = fsSync.readdirSync(encountersDir);
          console.log(`📋 [ServerEncounter] Fichiers dans encounters:`, files);
        } else {
          // Essayer le dossier mal orthographié
          const badDir = path.join(__dirname, '../data/encouters');
          console.log(`🔍 [ServerEncounter] Test dossier 'encouters': ${badDir}`);
          const badDirExists = fsSync.existsSync(badDir);
          console.log(`📁 [ServerEncounter] Dossier 'encouters' existe: ${badDirExists}`);
          
          if (badDirExists) {
            const badFiles = fsSync.readdirSync(badDir);
            console.log(`📋 [ServerEncounter] Fichiers dans 'encouters':`, badFiles);
          }
        }
      } catch (dirError) {
        console.error(`❌ [ServerEncounter] Erreur lecture dossier:`, dirError);
      }
    }
    
    // ✅ FIX: Utiliser fs async (importé en haut) pour la lecture
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const encounterData: EncounterTable = JSON.parse(fileContent);
    
    this.encounterTables.set(zone, encounterData);
    console.log(`✅ [ServerEncounter] Table ${zone} chargée avec ${Object.keys(encounterData.encounters.zones).length} zones`);
  } catch (error) {
    console.warn(`⚠️ [ServerEncounter] Impossible de charger ${zone}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [ServerEncounter] Erreur détaillée:`, errorMessage);
  }
}

  private async generateWildPokemonStats(
    pokemonId: number, 
    level: number,
    shinyModifier: number = 1.0
  ): Promise<WildPokemon> {
    const pokemonData = await getPokemonById(pokemonId);
    if (!pokemonData) {
      throw new Error(`Pokémon ${pokemonId} non trouvé`);
    }

    // ✅ IVs aléatoires
    const ivs = {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      spAttack: Math.floor(Math.random() * 32),
      spDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    };

    // ✅ Genre selon ratios
    const gender = this.generateGender(pokemonData.genderRatio);

    // ✅ Nature aléatoire
    const natures = [
      "Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", 
      "Relaxed", "Impish", "Lax", "Timid", "Hasty", "Serious", "Jolly", 
      "Naive", "Modest", "Mild", "Quiet", "Bashful", "Rash", "Calm", 
      "Gentle", "Sassy", "Careful", "Quirky"
    ];
    const nature = natures[Math.floor(Math.random() * natures.length)];

    // ✅ Shiny avec modificateur
    const baseShinyRate = 1 / 4096;
    const adjustedShinyRate = baseShinyRate * shinyModifier;
    const shiny = Math.random() < adjustedShinyRate;

    // ✅ Moves selon niveau
    const moves = pokemonData.learnset
      .filter(move => move.level <= level)
      .sort((a, b) => b.level - a.level)
      .slice(0, 4)
      .map(move => move.moveId);

    if (moves.length < 4) {
      const level1Moves = pokemonData.learnset
        .filter(move => move.level === 1)
        .map(move => move.moveId);
      
      for (const move of level1Moves) {
        if (moves.length >= 4) break;
        if (!moves.includes(move)) moves.push(move);
      }
    }

    if (moves.length === 0) moves.push("tackle");

    return { pokemonId, level, gender, nature, shiny, moves, ivs };
  }

  private generateGender(genderRatio: { male: number; female: number }): string {
    if (genderRatio.male === 0 && genderRatio.female === 0) return "unknown";
    const maleChance = genderRatio.male / 100;
    return Math.random() < maleChance ? "male" : "female";
  }

  // ✅ API PUBLIQUE POUR WORLDROOM
  
  async checkForEncounter(
    zone: string,
    method: 'grass' | 'fishing',
    encounterRate: number = 0.1,
    timeOfDay: 'day' | 'night' = 'day',
    weather: 'clear' | 'rain' = 'clear',
    zoneId?: string
  ): Promise<WildPokemon | null> {
    // Vérification du taux de rencontre
    if (Math.random() > encounterRate) {
      return null;
    }

    if (!this.encounterTables.has(zone)) {
      await this.loadEncounterTable(zone);
    }

    const table = this.encounterTables.get(zone);
    if (!table) return null;

    return await this.generateWildEncounterByZone(
      table,
      zoneId || `${zone}_default`,
      method,
      timeOfDay,
      weather
    );
  }

  // ✅ Nettoyage périodique
  cleanupCooldowns(): void {
    const now = Date.now();
    const cutoff = now - (this.ENCOUNTER_COOLDOWN * 10);
    
    for (const [playerId, lastTime] of this.playerCooldowns.entries()) {
      if (lastTime < cutoff) {
        this.playerCooldowns.delete(playerId);
      }
    }

    // Nettoyer aussi le rate limiting
    const rateLimitCutoff = now - 120000; // 2 minutes
    for (const [playerId, data] of this.playerEncounterCount.entries()) {
      if (data.timestamp < rateLimitCutoff) {
        this.playerEncounterCount.delete(playerId);
      }
    }
  }

  // ✅ DEBUG
  debugEncounterTable(zone: string): void {
    const table = this.encounterTables.get(zone);
    if (!table) {
      console.log(`❌ Pas de table pour ${zone}`);
      return;
    }

    console.log(`🔍 [DEBUG] Table ${zone}:`);
    Object.keys(table.encounters.zones).forEach(zoneId => {
      const zoneData = table.encounters.zones[zoneId];
      console.log(`  📍 Zone: ${zoneId}`);
      
      if (zoneData.grass) {
        const grassKeys = Object.keys(zoneData.grass);
        console.log(`    🌿 Herbes: ${grassKeys.join(', ')}`);
      }
      
      if (zoneData.fishing) {
        const fishingKeys = Object.keys(zoneData.fishing);
        console.log(`    🎣 Pêche: ${fishingKeys.join(', ')}`);
      }
    });
  }
}
