// server/src/models/TrainerTeam.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== INTERFACES =====

// Interface pour les stats d'un Pokémon (réutilise la logique existante)
interface IPokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

// Interface pour la configuration d'un Pokémon de dresseur
export interface ITrainerPokemon {
  species: number;        // ID du Pokémon (1 = Bulbasaur, etc.)
  level: number;          // Niveau du Pokémon
  nature: string;         // Nature (adamant, modest, etc.)
  ability: string;        // Capacité du Pokémon
  moves: string[];        // Liste des attaques (max 4)
  ivs: IPokemonStats;     // Valeurs individuelles (0-31)
  evs: IPokemonStats;     // Points d'effort (0-252)
  heldItem?: string;      // Objet tenu (optionnel)
  shiny?: boolean;        // Pokémon shiny (optionnel)
  gender?: "Male" | "Female" | "Genderless"; // Genre (optionnel, sinon aléatoire)
}

// Interface principale pour l'équipe de dresseur
export interface ITrainerTeam extends Document {
  teamId: string;                    // ID unique de l'équipe
  teamName: string;                  // Nom d'affichage de l'équipe
  pokemon: ITrainerPokemon[];        // Liste des Pokémon (1-6)
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;                 // Équipe active ou désactivée
  
  // === MÉTHODES D'INSTANCE ===
  getAverageLevel(): number;
  getMinLevel(): number;
  getMaxLevel(): number;
  getPokemonCount(): number;
  validateTeam(): { valid: boolean; errors: string[] };
  toTeamSummary(): TeamSummary;
}

// Interface pour résumé d'équipe (pour affichage/API)
export interface TeamSummary {
  teamId: string;
  teamName: string;
  pokemonCount: number;
  averageLevel: number;
  levelRange: { min: number; max: number };
  pokemonSpecies: number[]; // IDs des espèces
}

// Interface pour les méthodes statiques
export interface ITrainerTeamModel extends Model<ITrainerTeam> {
  findByTeamId(teamId: string): Promise<ITrainerTeam | null>;
  findActiveTeams(): Promise<ITrainerTeam[]>;
  findTeamsByLevelRange(minLevel: number, maxLevel: number): Promise<ITrainerTeam[]>;
  createTeam(teamData: CreateTrainerTeamData): Promise<ITrainerTeam>;
  validateTeamData(teamData: any): { valid: boolean; errors: string[] };
}

// ===== SCHÉMAS =====

// Schéma pour les stats Pokémon
const PokemonStatsSchema = new Schema<IPokemonStats>({
  hp: { type: Number, required: true, min: 0, max: 31 },
  attack: { type: Number, required: true, min: 0, max: 31 },
  defense: { type: Number, required: true, min: 0, max: 31 },
  spAttack: { type: Number, required: true, min: 0, max: 31 },
  spDefense: { type: Number, required: true, min: 0, max: 31 },
  speed: { type: Number, required: true, min: 0, max: 31 }
}, { _id: false });

// Schéma pour les EVs (limites différentes)
const PokemonEVsSchema = new Schema<IPokemonStats>({
  hp: { type: Number, required: true, min: 0, max: 252 },
  attack: { type: Number, required: true, min: 0, max: 252 },
  defense: { type: Number, required: true, min: 0, max: 252 },
  spAttack: { type: Number, required: true, min: 0, max: 252 },
  spDefense: { type: Number, required: true, min: 0, max: 252 },
  speed: { type: Number, required: true, min: 0, max: 252 }
}, { _id: false });

// Schéma pour un Pokémon de dresseur
const TrainerPokemonSchema = new Schema<ITrainerPokemon>({
  species: { 
    type: Number, 
    required: true, 
    min: [1, 'Species ID must be positive'],
    max: [1025, 'Species ID too high'] // Ajuster selon votre Pokédex
  },
  level: { 
    type: Number, 
    required: true, 
    min: [1, 'Level must be at least 1'], 
    max: [100, 'Level cannot exceed 100'] 
  },
  nature: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    maxlength: [20, 'Nature name too long']
  },
  ability: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [50, 'Ability name too long']
  },
  moves: {
    type: [String],
    required: true,
    validate: {
      validator: function(moves: string[]) {
        return moves.length >= 1 && moves.length <= 4;
      },
      message: 'Un Pokémon doit avoir entre 1 et 4 attaques'
    }
  },
  ivs: { 
    type: PokemonStatsSchema, 
    required: true 
  },
  evs: { 
    type: PokemonEVsSchema, 
    required: true 
  },
  heldItem: { 
    type: String,
    trim: true,
    maxlength: [50, 'Item name too long']
  },
  shiny: { 
    type: Boolean, 
    default: false 
  },
  gender: {
    type: String,
    enum: {
      values: ['Male', 'Female', 'Genderless'],
      message: 'Invalid gender'
    }
  }
}, { _id: false });

// ===== SCHÉMA PRINCIPAL =====

const TrainerTeamSchema = new Schema<ITrainerTeam>({
  teamId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [100, 'Team ID too long'],
    match: [/^[a-z0-9_-]+$/, 'Team ID must contain only lowercase letters, numbers, hyphens and underscores']
  },
  teamName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Team name too long'],
    minlength: [1, 'Team name required']
  },
  pokemon: {
    type: [TrainerPokemonSchema],
    required: true,
    validate: {
      validator: function(pokemon: ITrainerPokemon[]) {
        return pokemon.length >= 1 && pokemon.length <= 6;
      },
      message: 'Une équipe doit avoir entre 1 et 6 Pokémon'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'trainer_teams'
});

// ===== INDEX =====

TrainerTeamSchema.index({ teamId: 1 }, { unique: true });
TrainerTeamSchema.index({ isActive: 1 });
TrainerTeamSchema.index({ createdAt: -1 });

// ===== VALIDATIONS PRE-SAVE =====

TrainerTeamSchema.pre('save', function(next) {
  // Validation des EVs totaux pour chaque Pokémon
  for (const pokemon of this.pokemon) {
    const totalEvs = Object.values(pokemon.evs).reduce((sum: number, val: number) => sum + val, 0);
    if (totalEvs > 510) {
      return next(new Error(`Pokémon ${pokemon.species}: Le total des EVs (${totalEvs}) ne peut pas dépasser 510`));
    }
  }
  
  // Validation des attaques uniques par Pokémon
  for (const pokemon of this.pokemon) {
    const uniqueMoves = [...new Set(pokemon.moves)];
    if (uniqueMoves.length !== pokemon.moves.length) {
      return next(new Error(`Pokémon ${pokemon.species}: Les attaques doivent être uniques`));
    }
  }
  
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Calcule le niveau moyen de l'équipe
 */
TrainerTeamSchema.methods.getAverageLevel = function(this: ITrainerTeam): number {
  if (this.pokemon.length === 0) return 0;
  const totalLevel = this.pokemon.reduce((sum, pokemon) => sum + pokemon.level, 0);
  return Math.round(totalLevel / this.pokemon.length);
};

/**
 * Trouve le niveau minimum de l'équipe
 */
TrainerTeamSchema.methods.getMinLevel = function(this: ITrainerTeam): number {
  if (this.pokemon.length === 0) return 0;
  return Math.min(...this.pokemon.map(pokemon => pokemon.level));
};

/**
 * Trouve le niveau maximum de l'équipe
 */
TrainerTeamSchema.methods.getMaxLevel = function(this: ITrainerTeam): number {
  if (this.pokemon.length === 0) return 0;
  return Math.max(...this.pokemon.map(pokemon => pokemon.level));
};

/**
 * Retourne le nombre de Pokémon dans l'équipe
 */
TrainerTeamSchema.methods.getPokemonCount = function(this: ITrainerTeam): number {
  return this.pokemon.length;
};

/**
 * Valide la cohérence de l'équipe
 */
TrainerTeamSchema.methods.validateTeam = function(this: ITrainerTeam): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Vérifier que l'équipe n'est pas vide
  if (this.pokemon.length === 0) {
    errors.push("L'équipe ne peut pas être vide");
  }
  
  // Vérifier chaque Pokémon
  this.pokemon.forEach((pokemon, index) => {
    if (pokemon.level < 1 || pokemon.level > 100) {
      errors.push(`Pokémon ${index + 1}: Niveau invalide (${pokemon.level})`);
    }
    
    if (pokemon.moves.length === 0) {
      errors.push(`Pokémon ${index + 1}: Aucune attaque définie`);
    }
    
    if (!pokemon.nature || pokemon.nature.trim().length === 0) {
      errors.push(`Pokémon ${index + 1}: Nature manquante`);
    }
    
    if (!pokemon.ability || pokemon.ability.trim().length === 0) {
      errors.push(`Pokémon ${index + 1}: Capacité manquante`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Retourne un résumé de l'équipe pour affichage
 */
TrainerTeamSchema.methods.toTeamSummary = function(this: ITrainerTeam): TeamSummary {
  return {
    teamId: this.teamId,
    teamName: this.teamName,
    pokemonCount: this.getPokemonCount(),
    averageLevel: this.getAverageLevel(),
    levelRange: {
      min: this.getMinLevel(),
      max: this.getMaxLevel()
    },
    pokemonSpecies: this.pokemon.map(p => p.species)
  };
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve une équipe par son ID
 */
TrainerTeamSchema.statics.findByTeamId = function(teamId: string): Promise<ITrainerTeam | null> {
  return this.findOne({ teamId, isActive: true });
};

/**
 * Trouve toutes les équipes actives
 */
TrainerTeamSchema.statics.findActiveTeams = function(): Promise<ITrainerTeam[]> {
  return this.find({ isActive: true }).sort({ teamName: 1 });
};

/**
 * Trouve les équipes dans une plage de niveaux
 */
TrainerTeamSchema.statics.findTeamsByLevelRange = function(
  minLevel: number, 
  maxLevel: number
): Promise<ITrainerTeam[]> {
  return this.find({ isActive: true }).then((teams: ITrainerTeam[]) => {
    return teams.filter((team: ITrainerTeam) => {
      const avgLevel = team.getAverageLevel();
      return avgLevel >= minLevel && avgLevel <= maxLevel;
    });
  });
};

/**
 * Crée une nouvelle équipe avec validation
 */
TrainerTeamSchema.statics.createTeam = async function(
  teamData: CreateTrainerTeamData
): Promise<ITrainerTeam> {
  // Validation des données
  const validation = (this as ITrainerTeamModel).validateTeamData(teamData);
  if (!validation.valid) {
    throw new Error(`Données d'équipe invalides: ${validation.errors.join(', ')}`);
  }
  
  // Vérifier l'unicité du teamId
  const existing = await this.findOne({ teamId: teamData.teamId });
  if (existing) {
    throw new Error(`Une équipe avec l'ID "${teamData.teamId}" existe déjà`);
  }
  
  // Créer l'équipe
  const team = new this(teamData);
  return await team.save();
};

/**
 * Valide les données d'une équipe
 */
TrainerTeamSchema.statics.validateTeamData = function(teamData: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!teamData.teamId || typeof teamData.teamId !== 'string') {
    errors.push('teamId requis et doit être une chaîne');
  }
  
  if (!teamData.teamName || typeof teamData.teamName !== 'string') {
    errors.push('teamName requis et doit être une chaîne');
  }
  
  if (!Array.isArray(teamData.pokemon) || teamData.pokemon.length === 0) {
    errors.push('pokemon requis et doit être un tableau non vide');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// ===== TYPES D'EXPORT =====
export type TrainerTeamDocument = ITrainerTeam;
export type CreateTrainerTeamData = Partial<Pick<ITrainerTeam, 
  'teamId' | 'teamName' | 'pokemon' | 'isActive'
>>;

// ===== EXPORT =====
export const TrainerTeam = mongoose.model<ITrainerTeam, ITrainerTeamModel>('TrainerTeam', TrainerTeamSchema);
export default TrainerTeam;
