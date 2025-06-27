// server/src/managers/EncounterManager.ts
import fs from 'fs/promises';
import path from 'path';
import { getPokemonById } from '../data/PokemonData';

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

export interface EncounterTable {
  zone: string;
  encounters: {
    grass?: {
      day?: EncounterData[];
      night?: EncounterData[];
      rain?: EncounterData[];
    };
    fishing?: {
      calm_water?: {
        day?: EncounterData[];
        night?: EncounterData[];
        rain?: EncounterData[];
      };
    };
  };
}

export class EncounterManager {
  private encounterTables: Map<string, EncounterTable> = new Map();
  private pokemonNameToId: Map<string, number> = new Map();

  constructor() {
    this.initializePokemonMapping();
  }

  private initializePokemonMapping() {
    // Mapping des noms vers les IDs (à compléter selon tes données)
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
      const filePath = path.join(__dirname, `../data/encounters/${zone}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const encounterData: EncounterTable = JSON.parse(fileContent);
      
      this.encounterTables.set(zone, encounterData);
      console.log(`✅ Table de rencontres chargée pour ${zone}`);
    } catch (error) {
      console.warn(`⚠️ Impossible de charger les rencontres pour ${zone}:`, error);
    }
  }

  async generateWildEncounter(
    zone: string, 
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain' = 'clear'
  ): Promise<WildPokemon | null> {
    const table = this.encounterTables.get(zone);
    if (!table) {
      await this.loadEncounterTable(zone);
      const reloadedTable = this.encounterTables.get(zone);
      if (!reloadedTable) {
        console.error(`❌ Aucune table de rencontres pour ${zone}`);
        return null;
      }
    }

    const encounters = this.getEncountersForConditions(table!, method, timeOfDay, weather);
    if (!encounters || encounters.length === 0) {
      return null;
    }

    // Sélection pondérée
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

    if (!selectedEncounter) return null;

    const pokemonId = this.pokemonNameToId.get(selectedEncounter.species);
    if (!pokemonId) {
      console.warn(`⚠️ ID non trouvé pour ${selectedEncounter.species}`);
      return null;
    }

    // Génération du niveau
    const [minLevel, maxLevel] = selectedEncounter.level_range;
    const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

    // Génération des caractéristiques
    return await this.generateWildPokemonStats(pokemonId, level);
  }

  private getEncountersForConditions(
    table: EncounterTable,
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain'
  ): EncounterData[] | null {
    if (method === 'grass') {
      const grassEncounters = table.encounters.grass;
      if (!grassEncounters) return null;

      // Priorité : météo spéciale > moment de la journée
      if (weather === 'rain' && grassEncounters.rain) {
        return grassEncounters.rain;
      } else if (timeOfDay === 'night' && grassEncounters.night) {
        return grassEncounters.night;
      } else if (grassEncounters.day) {
        return grassEncounters.day;
      }
    } else if (method === 'fishing') {
      const fishingEncounters = table.encounters.fishing?.calm_water;
      if (!fishingEncounters) return null;

      if (weather === 'rain' && fishingEncounters.rain) {
        return fishingEncounters.rain;
      } else if (timeOfDay === 'night' && fishingEncounters.night) {
        return fishingEncounters.night;
      } else if (fishingEncounters.day) {
        return fishingEncounters.day;
      }
    }

    return null;
  }

  private async generateWildPokemonStats(pokemonId: number, level: number): Promise<WildPokemon> {
    const pokemonData = await getPokemonById(pokemonId);
    if (!pokemonData) {
      throw new Error(`Pokémon ${pokemonId} non trouvé`);
    }

    // IVs aléatoires (0-31)
    const ivs = {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      spAttack: Math.floor(Math.random() * 32),
      spDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    };

    // Genre aléatoire selon les ratios
    const gender = this.generateGender(pokemonData.genderRatio);

    // Nature aléatoire
    const natures = [
      "Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", 
      "Relaxed", "Impish", "Lax", "Timid", "Hasty", "Serious", "Jolly", 
      "Naive", "Modest", "Mild", "Quiet", "Bashful", "Rash", "Calm", 
      "Gentle", "Sassy", "Careful", "Quirky"
    ];
    const nature = natures[Math.floor(Math.random() * natures.length)];

    // Shiny (1/4096 par défaut)
    const shiny = Math.random() < (1 / 4096);

    // Attaques apprises au niveau actuel
    const moves = pokemonData.learnset
      .filter(move => move.level <= level)
      .sort((a, b) => b.level - a.level) // Plus récentes en premier
      .slice(0, 4) // Max 4 attaques
      .map(move => move.moveId);

    // Si moins de 4 attaques, compléter avec les attaques de niveau 1
    if (moves.length < 4) {
      const level1Moves = pokemonData.learnset
        .filter(move => move.level === 1)
        .map(move => move.moveId);
      
      for (const move of level1Moves) {
        if (moves.length >= 4) break;
        if (!moves.includes(move)) {
          moves.push(move);
        }
      }
    }

    // Assurer au moins une attaque
    if (moves.length === 0) {
      moves.push("tackle");
    }

    return {
      pokemonId,
      level,
      gender,
      nature,
      shiny,
      moves,
      ivs
    };
  }

  private generateGender(genderRatio: { male: number; female: number }): string {
    if (genderRatio.male === 0 && genderRatio.female === 0) {
      return "unknown"; // Pokémon sans genre
    }
    
    const maleChance = genderRatio.male / 100;
    return Math.random() < maleChance ? "male" : "female";
  }

  // Méthode pour déclencher une rencontre depuis WorldRoom
  async checkForEncounter(
    zone: string,
    method: 'grass' | 'fishing',
    encounterRate: number = 0.1, // 10% par défaut
    timeOfDay: 'day' | 'night' = 'day',
    weather: 'clear' | 'rain' = 'clear'
  ): Promise<WildPokemon | null> {
    // Vérification du taux de rencontre
    if (Math.random() > encounterRate) {
      return null;
    }

    return await this.generateWildEncounter(zone, method, timeOfDay, weather);
  }
}
