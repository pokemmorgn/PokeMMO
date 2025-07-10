// server/src/managers/EncounterManager.ts - REFACTORÉ AVEC POKÉMONCREATOR
import fs from 'fs/promises';
import path from 'path';
import { getPokemonById } from '../data/PokemonData';
import { PokemonCreator, PokemonCreationOptions } from './PokemonCreator';
import { IOwnedPokemon } from '../models/OwnedPokemon';

// ✅ NOUVELLE INTERFACE SIMPLIFIÉE (plus de duplication)
export interface WildEncounterResult {
  pokemon: IOwnedPokemon;  // Pokémon complet avec PP corrects
  encounterData: {
    zone: string;
    method: 'grass' | 'fishing';
    timeOfDay: 'day' | 'night';
    weather: 'clear' | 'rain';
    shinyModifier: number;
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
  
  // Anti-cheat: Cooldown par joueur
  private playerCooldowns: Map<string, number> = new Map();
  private readonly ENCOUNTER_COOLDOWN = 800;
  
  // Rate limiting par joueur
  private playerEncounterCount: Map<string, { count: number; timestamp: number }> = new Map();
  private readonly MAX_ENCOUNTERS_PER_MINUTE = 1000;

  constructor() {
    this.initializePokemonMapping();
  }

  // ✅ VALIDATION D'UNE RENCONTRE DEPUIS LE CLIENT - REFACTORÉ
  async validateAndGenerateEncounter(
    playerId: string,
    zoneName: string,
    x: number,
    y: number,
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain',
    zoneId?: string,
    method: 'grass' | 'fishing' = 'grass'
  ): Promise<WildEncounterResult | null> {
    
    console.log(`🔍 [ServerEncounter] === VALIDATION RENCONTRE (REFACTORÉ) ===`);
    console.log(`👤 Joueur: ${playerId}`);
    console.log(`📍 Position: (${x}, ${y}) dans ${zoneName}`);
    console.log(`🌿 Zone ID: ${zoneId || 'default'}`);
    console.log(`⏰ Conditions: ${timeOfDay}, ${weather}`);
    
    // Anti-cheat validations (inchangées)
    if (!this.checkCooldown(playerId)) {
      console.log(`⚠️ [ServerEncounter] Cooldown actif pour ${playerId}`);
      return null;
    }

    if (!this.checkRateLimit(playerId)) {
      console.warn(`❌ [ServerEncounter] Rate limit dépassé pour ${playerId}`);
      return null;
    }

    if (!this.isValidPosition(x, y)) {
      console.warn(`❌ [ServerEncounter] Position invalide: (${x}, ${y})`);
      return null;
    }

    // Charger la table de rencontres
    if (!this.encounterTables.has(zoneName)) {
      await this.loadEncounterTable(zoneName);
    }

    const table = this.encounterTables.get(zoneName);
    if (!table) {
      console.warn(`❌ [ServerEncounter] Aucune table pour ${zoneName}`);
      return null;
    }

    // ✅ NOUVEAU: Générer via PokemonCreator
    const encounterResult = await this.generateWildEncounterViaCreator(
      table, 
      zoneId || `${zoneName}_default`, 
      method, 
      timeOfDay, 
      weather
    );
    
    if (encounterResult) {
      // Mettre à jour anti-cheat
      this.updatePlayerCooldown(playerId);
      this.updateRateLimit(playerId);
      
      console.log(`⚔️ [ServerEncounter] Rencontre validée avec PokemonCreator !`);
      console.log(`🐾 Pokémon: ${encounterResult.pokemon.pokemonId} niveau ${encounterResult.pokemon.level}`);
      console.log(`✨ Shiny: ${encounterResult.pokemon.shiny}, Nature: ${encounterResult.pokemon.nature}`);
      console.log(`🎮 Moves avec PP: ${encounterResult.pokemon.moves.length} attaques`);
    } else {
      console.log(`❌ [ServerEncounter] Aucune rencontre générée`);
    }

    return encounterResult;
  }

  // ✅ NOUVELLE MÉTHODE : GÉNÉRATION VIA POKÉMONCREATOR
  private async generateWildEncounterViaCreator(
    table: EncounterTable,
    zoneId: string,
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain'
  ): Promise<WildEncounterResult | null> {
    
    console.log(`🎯 [ServerEncounter] Génération via PokemonCreator pour zone: ${zoneId}`);
    
    // Sélectionner l'encounter (logique existante conservée)
    const selectedEncounter = await this.selectEncounterFromTable(table, zoneId, method, timeOfDay, weather);
    if (!selectedEncounter) {
      return null;
    }

    const { encounterData, shinyModifier } = selectedEncounter;

    // Convertir nom → ID
    const pokemonId = this.pokemonNameToId.get(encounterData.species);
    if (!pokemonId) {
      console.warn(`⚠️ [ServerEncounter] ID non trouvé pour ${encounterData.species}`);
      return null;
    }

    // Générer niveau
    const [minLevel, maxLevel] = encounterData.level_range;
    const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

    console.log(`🏭 [ServerEncounter] Création ${encounterData.species} (ID:${pokemonId}) niveau ${level} via PokemonCreator`);

    // ✅ DÉLÉGUER À POKÉMONCREATOR
    const creationOptions: PokemonCreationOptions = {
      // Appliquer modificateur shiny si présent
      shiny: shinyModifier > 1.0 ? (Math.random() < ((1/4096) * shinyModifier)) : undefined
    };

    try {
      // Créer via PokemonCreator (PP automatiquement corrects !)
      const pokemon = await PokemonCreator.createWild(pokemonId, level, 'wild', creationOptions);
      
      console.log(`✅ [ServerEncounter] Pokémon créé avec PokemonCreator !`);
      console.log(`📊 [ServerEncounter] Stats: ${pokemon.maxHp} HP, Nature: ${pokemon.nature}`);
      console.log(`🎮 [ServerEncounter] Attaques: ${pokemon.moves.map(m => `${m.moveId} (${m.currentPp}/${m.maxPp})`).join(', ')}`);

      return {
        pokemon: pokemon,
        encounterData: {
          zone: zoneId,
          method,
          timeOfDay,
          weather,
          shinyModifier
        }
      };

    } catch (error) {
      console.error(`❌ [ServerEncounter] Erreur PokemonCreator:`, error);
      return null;
    }
  }

  // ✅ LOGIQUE DE SÉLECTION D'ENCOUNTER (EXTRAITE)
  private async selectEncounterFromTable(
    table: EncounterTable,
    zoneId: string,
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain'
  ): Promise<{ encounterData: EncounterData; shinyModifier: number } | null> {
    
    // Vérifier si la zone existe
    const zoneData = table.encounters.zones[zoneId];
    if (!zoneData) {
      console.warn(`⚠️ [ServerEncounter] Zone ${zoneId} non trouvée, essai fallback`);
      
      // Fallback: zone par défaut
      const defaultZoneKey = Object.keys(table.encounters.zones).find(key => 
        key.includes('default') || key.endsWith('_default')
      );
      
      if (defaultZoneKey) {
        const defaultZone = table.encounters.zones[defaultZoneKey];
        console.log(`🔄 [ServerEncounter] Utilisation zone fallback: ${defaultZoneKey}`);
        return this.selectFromZoneData(defaultZone, method, timeOfDay, weather, table);
      }
      
      return null;
    }

    return this.selectFromZoneData(zoneData, method, timeOfDay, weather, table);
  }

  // ✅ SÉLECTION DEPUIS LES DONNÉES D'UNE ZONE
  private async selectFromZoneData(
    zoneData: EncounterZone,
    method: 'grass' | 'fishing',
    timeOfDay: 'day' | 'night',
    weather: 'clear' | 'rain',
    table: EncounterTable
  ): Promise<{ encounterData: EncounterData; shinyModifier: number } | null> {
    
    let encounters: EncounterData[] | undefined;

    if (method === 'grass' && zoneData.grass) {
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
      console.log(`❌ [ServerEncounter] Aucune rencontre disponible`);
      return null;
    }

    console.log(`📊 [ServerEncounter] ${encounters.length} rencontres possibles`);

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

    if (!selectedEncounter) {
      console.warn(`⚠️ [ServerEncounter] Aucune rencontre sélectionnée`);
      return null;
    }

    console.log(`🎲 [ServerEncounter] Sélectionné: ${selectedEncounter.species} (chance: ${selectedEncounter.chance})`);

    // Modificateur shiny de la table
    const shinyModifier = table.encounters.conditions?.shiny_rate_modifier || 1.0;

    return {
      encounterData: selectedEncounter,
      shinyModifier
    };
  }

  // ✅ API SIMPLIFIÉE POUR WORLDROOM
  async checkForEncounter(
    zone: string,
    method: 'grass' | 'fishing',
    encounterRate: number = 0.1,
    timeOfDay: 'day' | 'night' = 'day',
    weather: 'clear' | 'rain' = 'clear',
    zoneId?: string
  ): Promise<IOwnedPokemon | null> {
    // Vérification taux de rencontre
    if (Math.random() > encounterRate) {
      return null;
    }

    // Générer via la méthode principale
    const result = await this.validateAndGenerateEncounter(
      'system', // playerId système pour les rencontres automatiques
      zone,
      0, 0, // position système
      timeOfDay,
      weather,
      zoneId,
      method
    );

    return result ? result.pokemon : null;
  }

  // === MÉTHODES ANTI-CHEAT (INCHANGÉES) ===
  
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

    if (now - playerData.timestamp > 60000) {
      this.playerEncounterCount.set(playerId, { count: 1, timestamp: now });
      return true;
    }

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
    if (typeof x !== 'number' || typeof y !== 'number') return false;
    if (isNaN(x) || isNaN(y)) return false;
    if (!isFinite(x) || !isFinite(y)) return false;
    if (x < 0 || y < 0) return false;
    if (x > 2000 || y > 2000) return false;
    return true;
  }

  // === MÉTHODES UTILITAIRES (INCHANGÉES) ===

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
      console.log(`✅ [ServerEncounter] Table ${zone} chargée (refactoré)`);
    } catch (error) {
      console.warn(`⚠️ [ServerEncounter] Impossible de charger ${zone}:`, error);
    }
  }

  // === NETTOYAGE ET DEBUG (INCHANGÉS) ===

  cleanupCooldowns(): void {
    const now = Date.now();
    const cutoff = now - (this.ENCOUNTER_COOLDOWN * 10);
    
    for (const [playerId, lastTime] of this.playerCooldowns.entries()) {
      if (lastTime < cutoff) {
        this.playerCooldowns.delete(playerId);
      }
    }

    const rateLimitCutoff = now - 120000;
    for (const [playerId, data] of this.playerEncounterCount.entries()) {
      if (data.timestamp < rateLimitCutoff) {
        this.playerEncounterCount.delete(playerId);
      }
    }
  }

  debugEncounterTable(zone: string): void {
    const table = this.encounterTables.get(zone);
    if (!table) {
      console.log(`❌ Pas de table pour ${zone}`);
      return;
    }

    console.log(`🔍 [DEBUG] Table ${zone} (refactoré):`);
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
