// server/src/managers/EncounterManager.ts - VERSION SERVEUR SIMPLIFIÉE
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

export class ServerEncounterManager {
  private encounterTables: Map<string, EncounterTable> = new Map();
  private pokemonNameToId: Map<string, number> = new Map();
  
  // ✅ Anti-cheat: Cooldown par joueur
  private playerCooldowns: Map<string, number> = new Map();
  private readonly ENCOUNTER_COOLDOWN = 800; // 800ms côté serveur (plus strict que client)

  constructor() {
    this.initializePokemonMapping();
  }

  // ✅ VALIDATION D'UNE RENCONTRE DEPUIS LE CLIENT
  async validateAndGenerateEncounter(
    playerId: string,
    zoneName: string,
    x: number,
    y: number,
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain',
    clientZoneProperties?: any
  ): Promise<WildPokemon | null> {
    
    console.log(`🔍 [ServerEncounter] Validation rencontre ${playerId} à (${x}, ${y}) dans ${zoneName}`);
    
    // ✅ ANTI-CHEAT: Vérifier le cooldown
    const now = Date.now();
    const lastEncounter = this.playerCooldowns.get(playerId) || 0;
    
    if (now - lastEncounter < this.ENCOUNTER_COOLDOWN) {
      console.log(`⚠️ [ServerEncounter] Cooldown actif pour ${playerId}`);
      return null;
    }

    // ✅ Vérifier que la zone existe
    if (!this.encounterTables.has(zoneName)) {
      await this.loadEncounterTable(zoneName);
    }

    const table = this.encounterTables.get(zoneName);
    if (!table) {
      console.warn(`❌ [ServerEncounter] Aucune table pour ${zoneName}`);
      return null;
    }

    // ✅ ANTI-CHEAT: Validation basique des coordonnées
    if (!this.isValidPosition(x, y)) {
      console.warn(`❌ [ServerEncounter] Position invalide: (${x}, ${y})`);
      return null;
    }

    // ✅ ANTI-CHEAT: Rate limiting par joueur
    if (!this.isEncounterAllowed(playerId)) {
      console.warn(`❌ [ServerEncounter] Trop de rencontres pour ${playerId}`);
      return null;
    }

    // ✅ Générer le Pokémon sauvage
    const wildPokemon = await this.generateWildEncounter(zoneName, 'grass', timeOfDay, weather);
    
    if (wildPokemon) {
      // ✅ Mettre à jour le cooldown
      this.playerCooldowns.set(playerId, now);
      
      console.log(`⚔️ [ServerEncounter] Rencontre validée: ${wildPokemon.pokemonId} lvl ${wildPokemon.level}`);
      console.log(`✨ [ServerEncounter] Shiny: ${wildPokemon.shiny}, Nature: ${wildPokemon.nature}`);
    }

    return wildPokemon;
  }

  // ✅ VALIDATION ANTI-CHEAT BASIQUE
  private isValidPosition(x: number, y: number): boolean {
    // Vérifications basiques
    if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
    if (x < 0 || y < 0) return false;
    if (x > 1000 || y > 1000) return false; // Limite raisonnable
    
    return true;
  }

  // ✅ RATE LIMITING ANTI-CHEAT
  private isEncounterAllowed(playerId: string): boolean {
    // Ici tu peux ajouter une logique plus sophistiquée
    // Par exemple, max 10 rencontres par minute
    
    // Pour l'instant, simple cooldown
    return true;
  }

  // ✅ GÉNÉRATION DU POKÉMON (logique existante simplifiée)
  async generateWildEncounter(
    zone: string, 
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain' = 'clear'
  ): Promise<WildPokemon | null> {
    const table = this.encounterTables.get(zone);
    if (!table) return null;

    const encounters = this.getEncountersForConditions(table, method, timeOfDay, weather);
    if (!encounters || encounters.length === 0) return null;

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

    if (!selectedEncounter) return null;

    const pokemonId = this.pokemonNameToId.get(selectedEncounter.species);
    if (!pokemonId) {
      console.warn(`⚠️ [ServerEncounter] ID non trouvé pour ${selectedEncounter.species}`);
      return null;
    }

    // ✅ Génération du niveau
    const [minLevel, maxLevel] = selectedEncounter.level_range;
    const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

    // ✅ Génération des stats complètes
    return await this.generateWildPokemonStats(pokemonId, level);
  }

  // ✅ MÉTHODES UTILITAIRES (versions simplifiées)

  private initializePokemonMapping() {
    this.pokemonNameToId.set("Pidgey", 16);
    this.pokemonNameToId.set("Rattata", 19);
    this.pokemonNameToId.set("Caterpie", 10);
    this.pokemonNameToId.set("Weedle", 13);
    this.pokemonNameToId.set("Oddish", 43);
    this.pokemonNameToId.set("Bellsprout", 69);
    this.pokemonNameToId.set("Zubat", 41);
    this.pokemonNameToid.set("Gastly", 92);
    this.pokemonNameToId.set("Pikachu", 25);
    this.pokemonNameToId.set("Axoloto", 194);
    this.pokemonNameToId.set("Magikarp", 129);
    this.pokemonNameToId.set("Loupio", 170);
    this.pokemonNameToId.set("Poissirene", 116);
  }

  async loadEncounterTable(zone: string): Promise<void> {
    try {
      const filePath = path.join(__dirname, `../data/encounters/${zone}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const encounterData: EncounterTable = JSON.parse(fileContent);
      
      this.encounterTables.set(zone, encounterData);
      console.log(`✅ [ServerEncounter] Table ${zone} chargée`);
    } catch (error) {
      console.warn(`⚠️ [ServerEncounter] Impossible de charger ${zone}:`, error);
    }
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

      if (weather === 'rain' && grassEncounters.rain) {
        return grassEncounters.rain;
      } else if (timeOfDay === 'night' && grassEncounters.night) {
        return grassEncounters.night;
      } else if (grassEncounters.day) {
        return grassEncounters.day;
      }
    }
    return null;
  }

  private async generateWildPokemonStats(pokemonId: number, level: number): Promise<WildPokemon> {
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

    // ✅ Shiny (1/4096)
    const shiny = Math.random() < (1 / 4096);

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

  // ✅ Nettoyage périodique
  cleanupCooldowns(): void {
    const now = Date.now();
    const cutoff = now - (this.ENCOUNTER_COOLDOWN * 10);
    
    for (const [playerId, lastTime] of this.playerCooldowns.entries()) {
      if (lastTime < cutoff) {
        this.playerCooldowns.delete(playerId);
      }
    }
  }
}

// ===========================================================================================
// INTÉGRATION DANS WORLDROOM
// ===========================================================================================

/*
// Dans WorldRoom.ts, remplacer les méthodes d'encounter par :

private serverEncounterManager!: ServerEncounterManager;

onCreate(options: any) {
  // ... code existant ...
  
  // ✅ Initialiser le système côté serveur
  this.serverEncounterManager = new ServerEncounterManager();
  
  // ✅ Nettoyage périodique
  setInterval(() => {
    this.serverEncounterManager.cleanupCooldowns();
  }, 60000);
}

// ✅ NOUVEAU HANDLER: Validation rencontre depuis client
this.onMessage("triggerEncounter", async (client, data: {
  x
