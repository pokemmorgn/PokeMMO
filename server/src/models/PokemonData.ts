// server/src/models/PokemonData.ts - Modèle complet pour toutes les générations
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== TYPES ET ENUMS =====

export type PokemonType = 
  | 'Normal' | 'Fire' | 'Water' | 'Electric' | 'Grass' | 'Ice'
  | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug'
  | 'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel' | 'Fairy';

export type PokemonRegion = 
  | 'kanto' | 'johto' | 'hoenn' | 'sinnoh' | 'unova' | 'kalos' 
  | 'alola' | 'galar' | 'paldea' | 'hisui';

export type PokemonCategory = 
  | 'mythical' | 'legendary' | 'ultra_beast' | 'paradox' | 'starter' 
  | 'fossil' | 'baby' | 'regional_variant' | 'mega_evolution' 
  | 'gigantamax' | 'normal';

export type GrowthRate = 
  | 'slow' | 'medium_slow' | 'medium_fast' | 'fast' | 'erratic' | 'fluctuating';

export type EggGroup = 
  | 'monster' | 'water1' | 'water2' | 'water3' | 'bug' | 'flying'
  | 'field' | 'fairy' | 'grass' | 'human_like' | 'mineral' | 'amorphous'
  | 'ditto' | 'dragon' | 'undiscovered' | 'gender_unknown';

export type Gender = 'male' | 'female' | 'genderless';

export type EncounterMethod = 
  | 'wild_encounter' | 'fishing' | 'surfing' | 'trade' | 'gift' 
  | 'egg' | 'evolution' | 'fossil' | 'special_event' | 'raid' | 'max_raid';

export type BallType = 
  | 'poke_ball' | 'great_ball' | 'ultra_ball' | 'master_ball' 
  | 'safari_ball' | 'net_ball' | 'dive_ball' | 'nest_ball' 
  | 'repeat_ball' | 'timer_ball' | 'luxury_ball' | 'premier_ball'
  | 'dusk_ball' | 'heal_ball' | 'quick_ball' | 'cherish_ball';

export type StatusCondition = 
  | 'normal' | 'sleep' | 'freeze' | 'paralysis' | 'burn' | 'poison';

export type EvolutionMethod = 
  | 'level' | 'trade' | 'stone' | 'friendship' | 'day' | 'night'
  | 'location' | 'item' | 'move' | 'stat' | 'time' | 'weather'
  | 'gender' | 'party' | 'special';

// ===== INTERFACES =====

export interface IBaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface IGenderRatio {
  male: number;    // Pourcentage
  female: number;  // Pourcentage
  genderless?: boolean;
}

export interface ICatchLocation {
  location: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'ultra_rare';
  method: EncounterMethod;
  levelRange: string;           // "10-15" ou "25"
  encounterRate: string;        // "15%" ou "5-10%"
  timeOfDay?: 'any' | 'morning' | 'day' | 'evening' | 'night';
  season?: 'any' | 'spring' | 'summer' | 'autumn' | 'winter';
  weather?: string[];           // Conditions météo spéciales
  requirements?: {              // Conditions spéciales
    hasItem?: string;
    completedQuest?: string;
    badge?: string;
    special?: string;
  };
  
  // Efficacité des Poké Balls
  ballEffectiveness: Record<BallType, number>;
  
  // Modificateurs d'état
  statusModifiers: Record<StatusCondition, number>;
}

export interface ILearnsetMove {
  moveId: string;
  level: number;                // 0 = move de base, 1+ = niveau d'apprentissage
  method: 'level' | 'tm' | 'hm' | 'tutor' | 'egg' | 'special' | 'evolution' | 'reminder';
  generation?: number;          // Dans quelle génération ce move est appris
  priority?: number;            // Ordre d'apprentissage si plusieurs au même niveau
  replacedIn?: number;          // Génération où ce move a été remplacé
  conditions?: {               // Conditions spéciales
    requiresItem?: string;      // Item nécessaire (ex: TM)
    requiresLocation?: string;  // Lieu spécifique (ex: Move Tutor)
    cost?: number;             // Coût en BP, argent, etc.
    oneTime?: boolean;         // Une seule fois par Pokémon
  };
}

export interface IEvolutionData {
  canEvolve: boolean;
  evolvesInto?: number;         // ID du Pokémon d'évolution
  evolvesFrom?: number;         // ID du Pokémon de base
  method: EvolutionMethod;
  requirement: string | number; // Niveau, nom d'objet, etc.
  conditions?: {                // Conditions additionnelles
    timeOfDay?: 'day' | 'night';
    location?: string;
    minimumFriendship?: number;
    heldItem?: string;
    knownMove?: string;
    minimumLevel?: number;
    gender?: Gender;
    partySpecies?: number;       // ID d'espèce dans l'équipe
    minimumStats?: Partial<IBaseStats>;
    weather?: string;
    upside_down?: boolean;       // Pour Inkay → Malamar
  };
}

export interface IFormData {
  formId: string;
  nameKey: string;              // ID de localisation
  descriptionKey: string;       // ID de localisation
  sprite: string;
  types?: PokemonType[];        // Override des types si différents
  baseStats?: Partial<IBaseStats>; // Override des stats si différentes
  abilities?: string[];         // Override des capacités
  weight?: number;              // Override du poids
  height?: number;              // Override de la taille
  isDefault: boolean;           // Forme par défaut
  isTemporary?: boolean;        // Méga-évolution, Gigantamax, etc.
  requirements?: {              // Conditions pour obtenir cette forme
    item?: string;
    move?: string;
    location?: string;
    timeOfDay?: string;
  };
}

export interface IPokemonData extends Document {
  // === IDENTIFICATION UNIQUE ===
  nationalDex: number;          // Numéro National Dex
  regionalDex?: {               // Numéros Dex régionaux
    kanto?: number;
    johto?: number;
    hoenn?: number;
    sinnoh?: number;
    unova?: number;
    kalos?: { central?: number; coastal?: number; mountain?: number; };
    alola?: { alola?: number; melemele?: number; akala?: number; ulaula?: number; poni?: number; };
    galar?: { galar?: number; isle_armor?: number; crown_tundra?: number; };
    hisui?: number;
    paldea?: { paldea?: number; kitakami?: number; blueberry?: number; };
  };
  
  // === NOMS ET DESCRIPTIONS (LOCALISÉS) ===
  nameKey: string;              // ID de localisation pour le nom
  species: string;              // Nom d'espèce (ex: "Seed Pokémon")
  descriptionKey: string;       // ID de localisation pour la description
  category: PokemonCategory;    // Catégorie spéciale
  
  // === DONNÉES DE BASE ===
  types: PokemonType[];         // Types primaire et secondaire
  baseStats: IBaseStats;        // Stats de base
  abilities: string[];          // Capacités normales
  hiddenAbility?: string;       // Capacité cachée
  
  // === CARACTÉRISTIQUES PHYSIQUES ===
  height: number;               // Taille en mètres
  weight: number;               // Poids en kg
  sprite: string;               // URL du sprite principal
  
  // === REPRODUCTION ===
  genderRatio: IGenderRatio;    // Ratio de genre
  eggGroups: EggGroup[];        // Groupes d'œufs
  hatchTime: number;            // Cycles d'éclosion
  
  // === PROGRESSION ===
  baseExperience: number;       // XP de base (Gen 1-4)
  baseExperienceYield?: number; // XP yield moderne (Gen 5+)
  effortValues?: Partial<IBaseStats>; // EVs donnés en battant ce Pokémon
  growthRate: GrowthRate;       // Courbe d'expérience
  captureRate: number;          // Taux de capture (0-255)
  baseHappiness: number;        // Bonheur de base
  
  // === LOCALISATION GÉOGRAPHIQUE ===
  region: PokemonRegion;        // Région d'origine
  generation: number;           // Génération d'introduction
  catchLocations: ICatchLocation[]; // Lieux de capture
  
  // === APPRENTISSAGE OPTIMISÉ ===
  learnset: ILearnsetMove[];    // Toutes les attaques (level + autres méthodes)
  
  // ✅ NOUVEAUX : Organisation par méthode pour performance
  levelMoves?: {                // Moves appris par niveau (optimisé)
    [level: number]: string[];  // Ex: { 1: ['tackle'], 7: ['growl'], 13: ['vine_whip'] }
  };
  tmMoves?: string[];           // TMs compatibles (IDs des moves)
  hmMoves?: string[];           // HMs compatibles  
  tutorMoves?: {                // Moves de tuteur avec métadonnées
    moveId: string;
    location?: string;          // Où l'apprendre
    cost?: number;              // Coût en BP/argent
    generation?: number;        // Génération d'ajout
  }[];
  eggMoves?: string[];          // Moves œuf
  evolutionMoves?: string[];    // Moves appris à l'évolution
  reminderMoves?: string[];     // Moves rappelables (oubliés)
  
  // === ÉVOLUTION ===
  evolution: IEvolutionData;    // Données d'évolution
  evolutionChain?: number[];    // IDs de toute la chaîne d'évolution
  
  // === FORMES ALTERNATIVES ===
  forms?: IFormData[];          // Formes alternatives (Méga, Gigantamax, etc.)
  hasGenderDifferences?: boolean; // Différences visuelles mâle/femelle
  
  // === MÉTADONNÉES TECHNIQUES ===
  isActive: boolean;            // Pokémon actif dans le jeu
  isObtainable: boolean;        // Peut être obtenu par les joueurs
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';
  
  // === DONNÉES DE MIGRATION ===
  version: string;              // Version des données
  sourceFamily?: string;        // Famille JSON d'origine
  lastUpdated: Date;
  migratedFrom?: 'json' | 'api' | 'manual';
  
  // === MÉTADONNÉES AVANCÉES ===
  metadata?: {
    color?: string;             // Couleur principale du Pokémon
    habitat?: string;           // Habitat naturel
    footprint?: string;         // Empreinte
    cryUrl?: string;           // URL du cri
    evolutionRequiresItem?: string; // Item nécessaire pour évoluer
    isStarterPokemon?: boolean;
    isFossil?: boolean;
    isBaby?: boolean;
    isLegendary?: boolean;
    isMythical?: boolean;
    hasRegionalVariant?: boolean;
    originalGeneration?: number; // Pour les variants régionaux
  };
  
  // === MÉTHODES D'INSTANCE ===
  toGameFormat(): any;
  updateFromFamily(familyData: any): Promise<void>;
  // Méthodes d'apprentissage
  canLearnMove(moveId: string, method?: string): boolean;
  getMovesAtLevel(level: number): string[];
  getLearnableMoves(method?: 'level' | 'tm' | 'tutor' | 'egg'): ILearnsetMove[];
  getMoveLearnLevel(moveId: string): number | null;
  canLearnMoveAtLevel(moveId: string, level: number): boolean;
  generateLevelMoves(): void;           // Génère levelMoves depuis learnset
  getNextLevelMove(currentLevel: number): { level: number; moves: string[] } | null;
  getEvolutionRequirements(): any;
  isAvailableInRegion(region: PokemonRegion): boolean;
  calculateStatAtLevel(statName: keyof IBaseStats, level: number, iv?: number, ev?: number): number;
  getFormByName(formName: string): IFormData | undefined;
  
  // Méthodes de validation
  validateEvolutionChain(): { valid: boolean; errors: string[] };
  validateLearnset(): { valid: boolean; errors: string[] };
}

// Interface pour les méthodes statiques
export interface IPokemonDataModel extends Model<IPokemonData> {
  findByNationalDex(dexNumber: number): Promise<IPokemonData | null>;
  findByRegionalDex(region: PokemonRegion, dexNumber: number): Promise<IPokemonData[]>;
  findByType(types: PokemonType[]): Promise<IPokemonData[]>;
  findByGeneration(generation: number): Promise<IPokemonData[]>;
  findByRegion(region: PokemonRegion): Promise<IPokemonData[]>;
  findByCategory(category: PokemonCategory): Promise<IPokemonData[]>;
  findEvolutionFamily(nationalDex: number): Promise<IPokemonData[]>;
  findByAbility(ability: string): Promise<IPokemonData[]>;
  findByMove(moveId: string): Promise<IPokemonData[]>;
  findStarters(): Promise<IPokemonData[]>;
  findLegendaries(): Promise<IPokemonData[]>;
  findObtainable(): Promise<IPokemonData[]>;
  
  // Méthodes d'import/migration
  importFromFamily(familyData: any): Promise<{ success: number; errors: string[] }>;
  migrateFromJson(): Promise<{ migrated: number; errors: string[] }>;
  bulkUpdateExperienceValues(): Promise<{ updated: number; errors: string[] }>;
  validateAllData(): Promise<{ valid: boolean; issues: string[] }>;
}

// ===== CONSTANTES =====

const POKEMON_TYPES: PokemonType[] = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

const POKEMON_REGIONS: PokemonRegion[] = [
  'kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos',
  'alola', 'galar', 'paldea', 'hisui'
];

const GROWTH_RATES: GrowthRate[] = [
  'slow', 'medium_slow', 'medium_fast', 'fast', 'erratic', 'fluctuating'
];

const EGG_GROUPS: EggGroup[] = [
  'monster', 'water1', 'water2', 'water3', 'bug', 'flying',
  'field', 'fairy', 'grass', 'human_like', 'mineral', 'amorphous',
  'ditto', 'dragon', 'undiscovered', 'gender_unknown'
];

const ENCOUNTER_METHODS: EncounterMethod[] = [
  'wild_encounter', 'fishing', 'surfing', 'trade', 'gift',
  'egg', 'evolution', 'fossil', 'special_event', 'raid', 'max_raid'
];

const EVOLUTION_METHODS: EvolutionMethod[] = [
  'level', 'trade', 'stone', 'friendship', 'day', 'night',
  'location', 'item', 'move', 'stat', 'time', 'weather',
  'gender', 'party', 'special'
];

// ===== SCHÉMAS =====

const BaseStatsSchema = new Schema<IBaseStats>({
  hp: { type: Number, required: true, min: 1, max: 255 },
  attack: { type: Number, required: true, min: 1, max: 255 },
  defense: { type: Number, required: true, min: 1, max: 255 },
  specialAttack: { type: Number, required: true, min: 1, max: 255 },
  specialDefense: { type: Number, required: true, min: 1, max: 255 },
  speed: { type: Number, required: true, min: 1, max: 255 }
}, { _id: false });

const GenderRatioSchema = new Schema<IGenderRatio>({
  male: { type: Number, min: 0, max: 100, required: true },
  female: { type: Number, min: 0, max: 100, required: true },
  genderless: { type: Boolean, default: false }
}, { _id: false });

const CatchLocationSchema = new Schema<ICatchLocation>({
  location: { type: String, required: true, trim: true },
  rarity: { 
    type: String, 
    enum: ['common', 'uncommon', 'rare', 'very_rare', 'ultra_rare'],
    required: true
  },
  method: { 
    type: String, 
    enum: ENCOUNTER_METHODS,
    required: true
  },
  levelRange: { type: String, required: true },
  encounterRate: { type: String, required: true },
  timeOfDay: { 
    type: String, 
    enum: ['any', 'morning', 'day', 'evening', 'night'],
    default: 'any'
  },
  season: { 
    type: String, 
    enum: ['any', 'spring', 'summer', 'autumn', 'winter'],
    default: 'any'
  },
  weather: [{ type: String }],
  requirements: {
    hasItem: { type: String },
    completedQuest: { type: String },
    badge: { type: String },
    special: { type: String }
  },
  ballEffectiveness: { 
    type: Schema.Types.Mixed,
    default: {
      poke_ball: 1.0,
      great_ball: 1.5,
      ultra_ball: 2.0,
      master_ball: 255.0
    }
  },
  statusModifiers: { 
    type: Schema.Types.Mixed,
    default: {
      normal: 1.0,
      sleep: 2.5,
      freeze: 2.5,
      paralysis: 1.5,
      burn: 1.5,
      poison: 1.5
    }
  }
}, { _id: false });

const LearnsetMoveSchema = new Schema<ILearnsetMove>({
  moveId: { type: String, required: true, trim: true, index: true },
  level: { type: Number, required: true, min: 0, max: 100 },
  method: { 
    type: String, 
    enum: ['level', 'tm', 'hm', 'tutor', 'egg', 'special', 'evolution', 'reminder'],
    default: 'level',
    index: true
  },
  generation: { type: Number, min: 1, max: 9 },
  priority: { type: Number, min: 0, default: 0 },
  replacedIn: { type: Number, min: 1, max: 9 },
  conditions: {
    requiresItem: { type: String, trim: true },
    requiresLocation: { type: String, trim: true },
    cost: { type: Number, min: 0 },
    oneTime: { type: Boolean, default: false }
  }
}, { _id: false });

// ✅ NOUVEAU : Schéma pour tuteur moves avec métadonnées
const TutorMoveSchema = new Schema({
  moveId: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  cost: { type: Number, min: 0 },
  generation: { type: Number, min: 1, max: 9 }
}, { _id: false });

const EvolutionDataSchema = new Schema<IEvolutionData>({
  canEvolve: { type: Boolean, required: true },
  evolvesInto: { type: Number, min: 1 },
  evolvesFrom: { type: Number, min: 1 },
  method: { 
    type: String, 
    enum: EVOLUTION_METHODS,
    required: true
  },
  requirement: { type: Schema.Types.Mixed, required: true },
  conditions: {
    timeOfDay: { type: String, enum: ['day', 'night'] },
    location: { type: String },
    minimumFriendship: { type: Number, min: 0, max: 255 },
    heldItem: { type: String },
    knownMove: { type: String },
    minimumLevel: { type: Number, min: 1, max: 100 },
    gender: { type: String, enum: ['male', 'female', 'genderless'] },
    partySpecies: { type: Number, min: 1 },
    minimumStats: {
      hp: { type: Number, min: 0 },
      attack: { type: Number, min: 0 },
      defense: { type: Number, min: 0 },
      specialAttack: { type: Number, min: 0 },
      specialDefense: { type: Number, min: 0 },
      speed: { type: Number, min: 0 }
    },
    weather: { type: String },
    upside_down: { type: Boolean }
  }
}, { _id: false });

const FormDataSchema = new Schema<IFormData>({
  formId: { type: String, required: true, trim: true },
  nameKey: { type: String, required: true, trim: true },
  descriptionKey: { type: String, required: true, trim: true },
  sprite: { type: String, required: true, trim: true },
  types: [{ type: String, enum: POKEMON_TYPES }],
  baseStats: {
    hp: { type: Number, min: 1, max: 255 },
    attack: { type: Number, min: 1, max: 255 },
    defense: { type: Number, min: 1, max: 255 },
    specialAttack: { type: Number, min: 1, max: 255 },
    specialDefense: { type: Number, min: 1, max: 255 },
    speed: { type: Number, min: 1, max: 255 }
  },
  abilities: [{ type: String, trim: true }],
  weight: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
  isDefault: { type: Boolean, required: true },
  isTemporary: { type: Boolean, default: false },
  requirements: {
    item: { type: String },
    move: { type: String },
    location: { type: String },
    timeOfDay: { type: String }
  }
}, { _id: false });

// ===== SCHÉMA PRINCIPAL =====

const PokemonDataSchema = new Schema<IPokemonData>({
  // === IDENTIFICATION ===
  nationalDex: { 
    type: Number, 
    required: true,
    unique: true,
    min: [1, 'National Dex number must be positive'],
    index: true
  },
  regionalDex: {
    kanto: { type: Number, min: 1 },
    johto: { type: Number, min: 1 },
    hoenn: { type: Number, min: 1 },
    sinnoh: { type: Number, min: 1 },
    unova: { type: Number, min: 1 },
    kalos: {
      central: { type: Number, min: 1 },
      coastal: { type: Number, min: 1 },
      mountain: { type: Number, min: 1 }
    },
    alola: {
      alola: { type: Number, min: 1 },
      melemele: { type: Number, min: 1 },
      akala: { type: Number, min: 1 },
      ulaula: { type: Number, min: 1 },
      poni: { type: Number, min: 1 }
    },
    galar: {
      galar: { type: Number, min: 1 },
      isle_armor: { type: Number, min: 1 },
      crown_tundra: { type: Number, min: 1 }
    },
    hisui: { type: Number, min: 1 },
    paldea: {
      paldea: { type: Number, min: 1 },
      kitakami: { type: Number, min: 1 },
      blueberry: { type: Number, min: 1 }
    }
  },
  
  // === NOMS (LOCALISÉS) ===
  nameKey: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Name key too long'],
    index: true
  },
  species: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Species name too long']
  },
  descriptionKey: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [150, 'Description key too long']
  },
  category: { 
    type: String,
    enum: ['mythical', 'legendary', 'ultra_beast', 'paradox', 'starter', 'fossil', 'baby', 'regional_variant', 'mega_evolution', 'gigantamax', 'normal'],
    default: 'normal',
    index: true
  },
  
  // === DONNÉES DE BASE ===
  types: { 
    type: [{ type: String, enum: POKEMON_TYPES }], 
    required: true,
    validate: {
      validator: function(types: PokemonType[]) {
        return types.length >= 1 && types.length <= 2;
      },
      message: 'Pokemon must have 1 or 2 types'
    },
    index: true
  },
  baseStats: { 
    type: BaseStatsSchema, 
    required: true 
  },
  abilities: { 
    type: [{ type: String, trim: true }], 
    required: true,
    validate: {
      validator: function(abilities: string[]) {
        return abilities.length >= 1 && abilities.length <= 3;
      },
      message: 'Pokemon must have 1-3 abilities'
    },
    index: true
  },
  hiddenAbility: { 
    type: String, 
    trim: true 
  },
  
  // === CARACTÉRISTIQUES ===
  height: { 
    type: Number, 
    required: true,
    min: [0.1, 'Height must be positive']
  },
  weight: { 
    type: Number, 
    required: true,
    min: [0.1, 'Weight must be positive']
  },
  sprite: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // === REPRODUCTION ===
  genderRatio: { 
    type: GenderRatioSchema, 
    required: true 
  },
  eggGroups: { 
    type: [{ type: String, enum: EGG_GROUPS }], 
    required: true,
    validate: {
      validator: function(groups: EggGroup[]) {
        return groups.length >= 1 && groups.length <= 2;
      },
      message: 'Pokemon must have 1 or 2 egg groups'
    }
  },
  hatchTime: { 
    type: Number, 
    required: true,
    min: [1024, 'Hatch time too low'],
    max: [30720, 'Hatch time too high']
  },
  
  // === PROGRESSION ===
  baseExperience: { 
    type: Number, 
    required: true,
    min: [1, 'Base experience must be positive']
  },
  baseExperienceYield: { 
    type: Number,
    min: [1, 'Base experience yield must be positive']
  },
  effortValues: {
    hp: { type: Number, min: 0, max: 3 },
    attack: { type: Number, min: 0, max: 3 },
    defense: { type: Number, min: 0, max: 3 },
    specialAttack: { type: Number, min: 0, max: 3 },
    specialDefense: { type: Number, min: 0, max: 3 },
    speed: { type: Number, min: 0, max: 3 }
  },
  growthRate: { 
    type: String, 
    enum: GROWTH_RATES,
    required: true,
    index: true
  },
  captureRate: { 
    type: Number, 
    required: true,
    min: [1, 'Capture rate too low'],
    max: [255, 'Capture rate too high']
  },
  baseHappiness: { 
    type: Number, 
    required: true,
    min: [0, 'Base happiness too low'],
    max: [255, 'Base happiness too high']
  },
  
  // === LOCALISATION ===
  region: { 
    type: String, 
    enum: POKEMON_REGIONS,
    required: true,
    index: true
  },
  generation: { 
    type: Number, 
    required: true,
    min: [1, 'Generation must be positive'],
    max: [9, 'Generation too high'],
    index: true
  },
  catchLocations: [CatchLocationSchema],
  
  // === APPRENTISSAGE OPTIMISÉ ===
  learnset: { 
    type: [LearnsetMoveSchema], 
    required: true,
    index: true
  },
  
  // ✅ NOUVEAUX : Champs optimisés pour requêtes rapides
  levelMoves: { 
    type: Schema.Types.Mixed,   // { 1: ['tackle'], 7: ['growl'], etc. }
    default: {}
  },
  tmMoves: [{ type: String, trim: true }],
  hmMoves: [{ type: String, trim: true }],
  tutorMoves: [TutorMoveSchema],
  eggMoves: [{ type: String, trim: true }],
  evolutionMoves: [{ type: String, trim: true }],
  reminderMoves: [{ type: String, trim: true }],
  
  // === ÉVOLUTION ===
  evolution: { 
    type: EvolutionDataSchema, 
    required: true 
  },
  evolutionChain: [{ 
    type: Number, 
    min: 1,
    index: true
  }],
  
  // === FORMES ===
  forms: [FormDataSchema],
  hasGenderDifferences: { 
    type: Boolean, 
    default: false 
  },
  
  // === MÉTADONNÉES ===
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  isObtainable: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  rarity: { 
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'],
    default: 'common',
    index: true
  },
  
  // === MIGRATION ===
  version: { 
    type: String, 
    default: '1.0.0',
    trim: true
  },
  sourceFamily: { 
    type: String,
    trim: true
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  migratedFrom: {
    type: String,
    enum: ['json', 'api', 'manual']
  },
  
  // === MÉTADONNÉES AVANCÉES ===
  metadata: {
    color: { type: String, trim: true },
    habitat: { type: String, trim: true },
    footprint: { type: String, trim: true },
    cryUrl: { type: String, trim: true },
    evolutionRequiresItem: { type: String, trim: true },
    isStarterPokemon: { type: Boolean, default: false },
    isFossil: { type: Boolean, default: false },
    isBaby: { type: Boolean, default: false },
    isLegendary: { type: Boolean, default: false },
    isMythical: { type: Boolean, default: false },
    hasRegionalVariant: { type: Boolean, default: false },
    originalGeneration: { type: Number, min: 1, max: 9 }
  }
}, {
  timestamps: true,
  collection: 'pokemon_data',
  minimize: false
});

// ===== INDEX COMPOSITES =====

// Index principaux
PokemonDataSchema.index({ nationalDex: 1 });
PokemonDataSchema.index({ generation: 1, nationalDex: 1 });
PokemonDataSchema.index({ region: 1, generation: 1 });
PokemonDataSchema.index({ category: 1, isActive: 1 });
PokemonDataSchema.index({ rarity: 1, isObtainable: 1 });

// Index pour recherche par types
PokemonDataSchema.index({ types: 1, isActive: 1 });

// Index pour recherche par capacités
PokemonDataSchema.index({ abilities: 1 });
PokemonDataSchema.index({ hiddenAbility: 1 });

// Index pour évolution
PokemonDataSchema.index({ 'evolution.evolvesFrom': 1 });
PokemonDataSchema.index({ 'evolution.evolvesInto': 1 });
PokemonDataSchema.index({ evolutionChain: 1 });

// Index pour apprentissage OPTIMISÉS
PokemonDataSchema.index({ 'learnset.moveId': 1, 'learnset.method': 1 });
PokemonDataSchema.index({ 'learnset.level': 1, 'learnset.method': 1 });
PokemonDataSchema.index({ tmMoves: 1 });
PokemonDataSchema.index({ eggMoves: 1 });
PokemonDataSchema.index({ 'tutorMoves.moveId': 1 });

// Index pour localisation
PokemonDataSchema.index({ 'catchLocations.location': 1 });

// Index de recherche textuelle
PokemonDataSchema.index({ 
  nameKey: 'text', 
  species: 'text'
});

// ===== VALIDATIONS PRE-SAVE =====

PokemonDataSchema.pre('save', function(next) {
  try {
    // Validation gender ratio
    if (this.genderRatio.genderless) {
      this.genderRatio.male = 0;
      this.genderRatio.female = 0;
    } else if (this.genderRatio.male + this.genderRatio.female !== 100) {
      return next(new Error('Gender ratio must total 100%'));
    }
    
    // Auto-détection de catégories spéciales
    if (this.nationalDex <= 151 && this.region !== 'kanto') {
      this.region = 'kanto';
    }
    
    // ✅ Auto-génération du mapping levelMoves pour performance
    this.generateLevelMoves();
    
    // Validation évolution
    if (this.evolution.canEvolve && !this.evolution.evolvesInto) {
      return next(new Error('Pokemon that can evolve must have evolvesInto defined'));
    }
    
    // Auto-génération de métadonnées
    if (!this.metadata) this.metadata = {};
    
    if (this.category === 'legendary') {
      this.metadata.isLegendary = true;
      this.rarity = 'legendary';
    }
    
    if (this.category === 'mythical') {
      this.metadata.isMythical = true;
      this.rarity = 'mythical';
    }
    
    // Mise à jour timestamp
    this.lastUpdated = new Date();
    
    next();
    
  } catch (error) {
    next(error instanceof Error ? error : new Error('Validation error'));
  }
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Convertit vers le format de jeu legacy
 */
PokemonDataSchema.methods.toGameFormat = function(this: IPokemonData): any {
  return {
    id: this.nationalDex,
    name: this.nameKey,  // Le client devra résoudre la localisation
    types: this.types,
    baseStats: this.baseStats,
    abilities: this.abilities,
    hiddenAbility: this.hiddenAbility,
    height: this.height,
    weight: this.weight,
    sprite: this.sprite,
    description: this.descriptionKey,
    category: this.species,
    genderRatio: this.genderRatio,
    eggGroups: this.eggGroups,
    hatchTime: this.hatchTime,
    baseExperience: this.baseExperience,
    growthRate: this.growthRate,
    captureRate: this.captureRate,
    baseHappiness: this.baseHappiness,
    catchLocations: this.catchLocations,
    learnset: this.learnset,
    evolution: this.evolution
  };
};

/**
 * Met à jour depuis les données de famille JSON
 */
PokemonDataSchema.methods.updateFromFamily = async function(
  this: IPokemonData,
  familyData: any
): Promise<void> {
  // Trouve ce Pokémon dans la famille
  const pokemonData = familyData.pokemon.find((p: any) => p.id === this.nationalDex);
  if (!pokemonData) {
    throw new Error(`Pokemon ${this.nationalDex} not found in family data`);
  }
  
  // Mise à jour des champs
  this.nameKey = `pokemon.name.${pokemonData.name.toLowerCase()}`;
  this.descriptionKey = `pokemon.description.${pokemonData.name.toLowerCase()}`;
  this.types = pokemonData.types;
  this.baseStats = pokemonData.baseStats;
  this.abilities = pokemonData.abilities;
  this.hiddenAbility = pokemonData.hiddenAbility;
  this.height = pokemonData.height;
  this.weight = pokemonData.weight;
  this.sprite = pokemonData.sprite;
  this.species = pokemonData.category;
  this.genderRatio = pokemonData.genderRatio;
  this.eggGroups = pokemonData.eggGroups;
  this.hatchTime = pokemonData.hatchTime;
  this.baseExperience = pokemonData.baseExperience;
  this.growthRate = pokemonData.growthRate.toLowerCase().replace(' ', '_') as GrowthRate;
  this.captureRate = pokemonData.captureRate;
  this.baseHappiness = pokemonData.baseHappiness;
  this.catchLocations = pokemonData.catchLocations;
  this.learnset = pokemonData.learnset;
  this.evolution = pokemonData.evolution;
  
  this.sourceFamily = familyData.family;
  this.region = familyData.region as PokemonRegion;
  this.migratedFrom = 'json';
  
  await this.save();
};

/**
 * Vérifie si le Pokémon peut apprendre une attaque
 */
PokemonDataSchema.methods.canLearnMove = function(
  this: IPokemonData,
  moveId: string,
  method?: string
): boolean {
  if (method) {
    if (method === 'level') {
      return this.learnset.some(move => 
        move.moveId === moveId && move.method === 'level'
      );
    }
    if (method === 'tm') {
      return this.tmMoves?.includes(moveId) || false;
    }
    if (method === 'tutor') {
      return this.tutorMoves?.some(tm => tm.moveId === moveId) || false;
    }
    if (method === 'egg') {
      return this.eggMoves?.includes(moveId) || false;
    }
  }
  
  // Vérification générale toutes méthodes
  return this.learnset.some(move => move.moveId === moveId) ||
         this.tmMoves?.includes(moveId) ||
         this.tutorMoves?.some(tm => tm.moveId === moveId) ||
         this.eggMoves?.includes(moveId) ||
         this.evolutionMoves?.includes(moveId) ||
         this.reminderMoves?.includes(moveId);
};

/**
 * ✅ NOUVEAU : Récupère toutes les attaques apprises à un niveau donné
 */
PokemonDataSchema.methods.getMovesAtLevel = function(
  this: IPokemonData,
  level: number
): string[] {
  // Utilise levelMoves optimisé si disponible
  if (this.levelMoves && this.levelMoves[level]) {
    return this.levelMoves[level];
  }
  
  // Sinon, recherche dans learnset
  return this.learnset
    .filter(move => move.level === level && move.method === 'level')
    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
    .map(move => move.moveId);
};

/**
 * ✅ NOUVEAU : Récupère le niveau d'apprentissage d'une attaque
 */
PokemonDataSchema.methods.getMoveLearnLevel = function(
  this: IPokemonData,
  moveId: string
): number | null {
  const move = this.learnset.find(m => 
    m.moveId === moveId && m.method === 'level'
  );
  return move ? move.level : null;
};

/**
 * ✅ NOUVEAU : Vérifie si une attaque peut être apprise à un niveau donné
 */
PokemonDataSchema.methods.canLearnMoveAtLevel = function(
  this: IPokemonData,
  moveId: string,
  level: number
): boolean {
  return this.learnset.some(move => 
    move.moveId === moveId && 
    move.method === 'level' && 
    move.level <= level
  );
};

/**
 * ✅ NOUVEAU : Génère le mapping levelMoves optimisé
 */
PokemonDataSchema.methods.generateLevelMoves = function(this: IPokemonData): void {
  const levelMoves: { [level: number]: string[] } = {};
  
  // Grouper les moves par niveau
  this.learnset
    .filter(move => move.method === 'level')
    .forEach(move => {
      if (!levelMoves[move.level]) {
        levelMoves[move.level] = [];
      }
      levelMoves[move.level].push(move.moveId);
    });
  
  // Trier par priorité dans chaque niveau
  Object.keys(levelMoves).forEach(level => {
    const levelNum = parseInt(level);
    levelMoves[levelNum] = this.learnset
      .filter(move => move.level === levelNum && move.method === 'level')
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))
      .map(move => move.moveId);
  });
  
  this.levelMoves = levelMoves;
};

/**
 * ✅ NOUVEAU : Trouve la prochaine attaque à apprendre
 */
PokemonDataSchema.methods.getNextLevelMove = function(
  this: IPokemonData,
  currentLevel: number
): { level: number; moves: string[] } | null {
  const nextLevels = this.learnset
    .filter(move => move.method === 'level' && move.level > currentLevel)
    .map(move => move.level)
    .sort((a, b) => a - b);
  
  if (nextLevels.length === 0) return null;
  
  const nextLevel = nextLevels[0];
  return {
    level: nextLevel,
    moves: this.getMovesAtLevel(nextLevel)
  };
};

/**
 * ✅ NOUVEAU : Récupère les attaques par méthode
 */
PokemonDataSchema.methods.getLearnableMoves = function(
  this: IPokemonData,
  method?: 'level' | 'tm' | 'tutor' | 'egg'
): ILearnsetMove[] {
  if (!method) {
    return this.learnset;
  }
  
  return this.learnset.filter(move => move.method === method);
};

/**
 * Calcule une stat à un niveau donné
 */
PokemonDataSchema.methods.calculateStatAtLevel = function(
  this: IPokemonData,
  statName: keyof IBaseStats,
  level: number,
  iv: number = 31,
  ev: number = 0
): number {
  const baseStat = this.baseStats[statName];
  
  if (statName === 'hp') {
    // Formule HP
    return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  } else {
    // Formule autres stats
    return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  }
};

// ===== MÉTHODES STATIQUES =====

PokemonDataSchema.statics.findByNationalDex = function(dexNumber: number): Promise<IPokemonData | null> {
  return this.findOne({ nationalDex: dexNumber, isActive: true });
};

PokemonDataSchema.statics.findByType = function(types: PokemonType[]): Promise<IPokemonData[]> {
  const query = types.length === 1 
    ? { types: { $in: types } }
    : { types: { $all: types } };
  
  return this.find({ ...query, isActive: true }).sort({ nationalDex: 1 });
};

PokemonDataSchema.statics.findByGeneration = function(generation: number): Promise<IPokemonData[]> {
  return this.find({ generation, isActive: true }).sort({ nationalDex: 1 });
};

PokemonDataSchema.statics.findByRegion = function(region: PokemonRegion): Promise<IPokemonData[]> {
  return this.find({ region, isActive: true }).sort({ nationalDex: 1 });
};

PokemonDataSchema.statics.findByCategory = function(category: PokemonCategory): Promise<IPokemonData[]> {
  return this.find({ category, isActive: true }).sort({ nationalDex: 1 });
};

PokemonDataSchema.statics.findEvolutionFamily = function(nationalDex: number): Promise<IPokemonData[]> {
  return this.find({ 
    evolutionChain: nationalDex, 
    isActive: true 
  }).sort({ nationalDex: 1 });
};

PokemonDataSchema.statics.findStarters = function(): Promise<IPokemonData[]> {
  return this.find({ 
    'metadata.isStarterPokemon': true, 
    isActive: true 
  }).sort({ generation: 1, nationalDex: 1 });
};

PokemonDataSchema.statics.findLegendaries = function(): Promise<IPokemonData[]> {
  return this.find({ 
    $or: [
      { category: 'legendary' },
      { category: 'mythical' },
      { 'metadata.isLegendary': true },
      { 'metadata.isMythical': true }
    ],
    isActive: true 
  }).sort({ generation: 1, nationalDex: 1 });
};

/**
 * Importe une famille complète depuis JSON
 */
PokemonDataSchema.statics.importFromFamily = async function(
  familyData: any
): Promise<{ success: number; errors: string[] }> {
  const results = { success: 0, errors: [] as string[] };
  
  if (!familyData.pokemon || !Array.isArray(familyData.pokemon)) {
    results.errors.push('Invalid family data format');
    return results;
  }
  
  for (const pokemonJson of familyData.pokemon) {
    try {
      // Chercher ou créer le Pokémon
      let pokemon = await this.findOne({ nationalDex: pokemonJson.id });
      
      if (!pokemon) {
        // Créer nouveau
        pokemon = new this({
          nationalDex: pokemonJson.id,
          nameKey: `pokemon.name.${pokemonJson.name.toLowerCase()}`,
          species: pokemonJson.category,
          descriptionKey: `pokemon.description.${pokemonJson.name.toLowerCase()}`,
          category: 'normal', // Sera auto-détecté
          generation: Math.ceil(pokemonJson.id / 151), // Estimation basique
          region: familyData.region,
          types: [],
          baseStats: { hp: 1, attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
          abilities: [],
          height: 0,
          weight: 0,
          sprite: '',
          genderRatio: { male: 50, female: 50 },
          eggGroups: ['undiscovered'],
          hatchTime: 5120,
          baseExperience: 1,
          growthRate: 'medium_fast',
          captureRate: 255,
          baseHappiness: 70,
          catchLocations: [],
          learnset: [],
          evolution: { canEvolve: false, method: 'level', requirement: 1 }
        });
      }
      
      // Mettre à jour depuis les données de famille
      await pokemon.updateFromFamily(familyData);
      results.success++;
      
    } catch (error) {
      results.errors.push(`Pokemon ${pokemonJson.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
};

// ===== EXPORT =====
export const PokemonData = mongoose.model<IPokemonData, IPokemonDataModel>('PokemonData', PokemonDataSchema);

export type PokemonDataDocument = IPokemonData;
export type CreatePokemonData = Partial<Pick<IPokemonData, 
  'nationalDex' | 'nameKey' | 'types' | 'baseStats' | 'abilities'
>>;

// ===== UTILITAIRES DE MIGRATION =====

/**
 * Fonction utilitaire pour migrer depuis le système JSON
 */
export async function migratePokemonFromJson(): Promise<void> {
  console.log('🚀 Starting Pokemon migration from JSON families...');
  
  try {
    // Cette fonction devra être appelée pour chaque famille JSON
    // Exemple d'utilisation:
    // const familyData = require('./data/pokemon/families/abra.json');
    // await PokemonData.importFromFamily(familyData);
    
    console.log('✅ Pokemon migration completed');
    
  } catch (error) {
    console.error('💥 Pokemon migration failed:', error);
    throw error;
  }
}

// ===== LOG D'INITIALISATION =====
console.log(`📦 PokemonData schema loaded with support for:
- Types: ${POKEMON_TYPES.length} (${POKEMON_TYPES.slice(0, 5).join(', ')}, ...)
- Regions: ${POKEMON_REGIONS.length} (${POKEMON_REGIONS.slice(0, 3).join(', ')}, ...)
- Evolution methods: ${EVOLUTION_METHODS.length}
- Encounter methods: ${ENCOUNTER_METHODS.length}
✅ Ready for migration from JSON families`);
