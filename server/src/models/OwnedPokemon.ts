// server/src/models/OwnedPokemon.ts - Version avec types corrigés + PP
import mongoose, { Schema, Document, Model } from "mongoose";
import { getPokemonById } from "../data/PokemonData";
import naturesData from "../data/natures.json";
import { PokemonMoveService } from '../services/PokemonMoveService';

// Interface pour les attaques
interface IPokemonMove {
  moveId: string;
  currentPp: number;
  maxPp: number;
}

// Interface pour les IVs/EVs
interface IPokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

// Interface principale
export interface IOwnedPokemon extends Document {
  // === DONNÉES DE BASE ===
  owner: string;
  pokemonId: number;
  level: number;
  experience: number;
  nature: string;
  nickname?: string;
  shiny: boolean;
  gender: "Male" | "Female" | "Genderless";
  ability: string;
  
  // === STATS ===
  ivs: IPokemonStats;
  evs: IPokemonStats;
  calculatedStats: Omit<IPokemonStats, 'hp'>;
  
  // === ÉTAT DE COMBAT ===
  moves: IPokemonMove[];
  currentHp: number;
  maxHp: number;
  status: "normal" | "sleep" | "freeze" | "paralysis" | "burn" | "poison" | "badly_poison";
  statusTurns?: number;
  
  // === ORGANISATION ===
  isInTeam: boolean;
  slot?: number;
  box: number;
  boxSlot?: number;
  
  // === MÉTADONNÉES ===
  caughtAt: Date;
  friendship: number;
  pokeball: string;
  originalTrainer: string;
  heldItem?: string;
  
  // === MÉTHODES D'INSTANCE ===
  recalculateStats(): Promise<void>;
  calculateStatsWithFormula(baseStats: any): any;
  heal(amount?: number): void;
  takeDamage(damage: number): boolean;
  isFainted(): boolean;
  canBattle(): boolean;
  getEffectiveAttack(): number;
  getEffectiveSpeed(): number;
  applyStatus(status: string, turns?: number): boolean;
  
  // === NOUVELLES MÉTHODES PP ===
  consumePP(moveId: string): any;
  canUseMove(moveId: string): boolean;
  hasUsableMoves(): boolean;
  restorePP(moveId?: string): void;
  getMovesWithData(): Promise<any[]>;
}

const OwnedPokemonSchema = new Schema<IOwnedPokemon>({
  // === DONNÉES DE BASE ===
  owner: { type: String, required: true, index: true },
  pokemonId: { type: Number, required: true },
  level: { type: Number, default: 1, min: 1, max: 100 },
  experience: { type: Number, default: 0, min: 0 },
  nature: { type: String, default: "hardy" },
  nickname: { type: String, maxlength: 12 },
  shiny: { type: Boolean, default: false },
  gender: { type: String, enum: ["Male", "Female", "Genderless"], required: true },
  ability: { type: String, required: true },
  
  // === IVS (0-31) ===
  ivs: {
    hp: { type: Number, default: 0, min: 0, max: 31 },
    attack: { type: Number, default: 0, min: 0, max: 31 },
    defense: { type: Number, default: 0, min: 0, max: 31 },
    spAttack: { type: Number, default: 0, min: 0, max: 31 },
    spDefense: { type: Number, default: 0, min: 0, max: 31 },
    speed: { type: Number, default: 0, min: 0, max: 31 },
  },
  
  // === EVS (0-252, max 510 total) ===
  evs: {
    hp: { type: Number, default: 0, min: 0, max: 252 },
    attack: { type: Number, default: 0, min: 0, max: 252 },
    defense: { type: Number, default: 0, min: 0, max: 252 },
    spAttack: { type: Number, default: 0, min: 0, max: 252 },
    spDefense: { type: Number, default: 0, min: 0, max: 252 },
    speed: { type: Number, default: 0, min: 0, max: 252 },
  },

  // === ATTAQUES (max 4) ===
  moves: [{
    moveId: { type: String, required: true },
    currentPp: { type: Number, required: true, min: 0 },
    maxPp: { type: Number, required: true, min: 1 }
  }],
  
  // === ÉTAT DE COMBAT ===
  currentHp: { type: Number, required: true, min: 0 },
  maxHp: { type: Number, required: true, min: 1 },
  status: { 
    type: String, 
    enum: ["normal", "sleep", "freeze", "paralysis", "burn", "poison", "badly_poison"],
    default: "normal"
  },
  statusTurns: { type: Number, min: 0 },
  
  // === STATS CALCULÉES ===
  calculatedStats: {
    attack: { type: Number, required: true },
    defense: { type: Number, required: true },
    spAttack: { type: Number, required: true },
    spDefense: { type: Number, required: true },
    speed: { type: Number, required: true }
  },
  
  // === ORGANISATION ===
  isInTeam: { type: Boolean, default: false },
  slot: { type: Number, min: 0, max: 5 },
  box: { type: Number, default: 0, min: 0 },
  boxSlot: { type: Number, min: 0 },
  
  // === MÉTADONNÉES ===
  caughtAt: { type: Date, default: Date.now },
  friendship: { type: Number, default: 70, min: 0, max: 255 },
  pokeball: { type: String, default: "poke_ball" },
  originalTrainer: { type: String, required: true },
  heldItem: { type: String }
}, {
  timestamps: true
});

// === VALIDATIONS ===
OwnedPokemonSchema.path('moves').validate(function(moves: IPokemonMove[]) {
  return moves.length <= 4;
}, 'Un Pokémon ne peut avoir que 4 attaques maximum');

OwnedPokemonSchema.pre('save', function(next) {
  const totalEvs = Object.values(this.evs).reduce((sum: number, val: number) => sum + val, 0);
  if (totalEvs > 510) {
    return next(new Error('Le total des EVs ne peut pas dépasser 510'));
  }
  next();
});

// === MIDDLEWARE POUR RECALCUL AUTO DES STATS ===
OwnedPokemonSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('level') || this.isModified('ivs') || this.isModified('evs') || this.isModified('nature')) {
    await this.recalculateStats();
  }
  next();
});

// === MIDDLEWARE PP ===
OwnedPokemonSchema.pre('save', async function(next) {
  // Initialisation PP pour nouveaux Pokémon ou moves modifiés
  if (this.isNew || this.isModified('moves')) {
    try {
      await PokemonMoveService.initializePP(this);
    } catch (error) {
      console.error(`❌ [OwnedPokemon] Erreur initialisation PP:`, error);
      // Ne pas bloquer la sauvegarde
    }
  }
  next();
});

// === MÉTHODES D'INSTANCE ===
OwnedPokemonSchema.methods.recalculateStats = async function(this: IOwnedPokemon) {
  const basePokemon = await getPokemonById(this.pokemonId);
  if (!basePokemon) {
    throw new Error(`Pokémon ID ${this.pokemonId} introuvable`);
  }

  const stats = this.calculateStatsWithFormula(basePokemon.baseStats);
  
  this.calculatedStats = {
    attack: stats.attack,
    defense: stats.defense,
    spAttack: stats.spAttack,
    spDefense: stats.spDefense,
    speed: stats.speed
  };
  
  const oldMaxHp = this.maxHp;
  this.maxHp = stats.hp;
  
  if (this.isNew) {
    this.currentHp = this.maxHp;
  } else if (oldMaxHp !== this.maxHp) {
    const hpPercent = this.currentHp / oldMaxHp;
    this.currentHp = Math.max(1, Math.floor(this.maxHp * hpPercent));
  }
};

OwnedPokemonSchema.methods.calculateStatsWithFormula = function(this: IOwnedPokemon, baseStats: any) {
  const nature = naturesData[this.nature as keyof typeof naturesData];
  
  const calculateStat = (statName: keyof IPokemonStats, baseStat: number, isHP: boolean = false): number => {
    const iv = this.ivs[statName] || 0;
    const ev = this.evs[statName] || 0;
    
    if (isHP) {
      return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * this.level) / 100) + this.level + 10;
    } else {
      let stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * this.level) / 100) + 5;
      
      if (nature?.increased === statName) {
        stat = Math.floor(stat * 1.1);
      } else if (nature?.decreased === statName) {
        stat = Math.floor(stat * 0.9);
      }
      
      return stat;
    }
  };

  return {
    hp: calculateStat('hp', baseStats.hp, true),
    attack: calculateStat('attack', baseStats.attack),
    defense: calculateStat('defense', baseStats.defense),
    spAttack: calculateStat('spAttack', baseStats.specialAttack),
    spDefense: calculateStat('spDefense', baseStats.specialDefense),
    speed: calculateStat('speed', baseStats.speed)
  };
};

// === MÉTHODES DE COMBAT ===
OwnedPokemonSchema.methods.heal = function(this: IOwnedPokemon, amount?: number) {
  if (amount) {
    this.currentHp = Math.min(this.currentHp + amount, this.maxHp);
  } else {
    this.currentHp = this.maxHp;
    this.status = 'normal';
    this.statusTurns = undefined;
    this.moves.forEach((move: IPokemonMove) => {
      move.currentPp = move.maxPp;
    });
  }
};

OwnedPokemonSchema.methods.takeDamage = function(this: IOwnedPokemon, damage: number): boolean {
  this.currentHp = Math.max(0, this.currentHp - damage);
  return this.currentHp === 0;
};

OwnedPokemonSchema.methods.isFainted = function(this: IOwnedPokemon): boolean {
  return this.currentHp === 0;
};

OwnedPokemonSchema.methods.canBattle = function(this: IOwnedPokemon): boolean {
  return this.currentHp > 0 && this.moves.some((move: IPokemonMove) => move.currentPp > 0);
};

OwnedPokemonSchema.methods.getEffectiveAttack = function(this: IOwnedPokemon): number {
  let attack = this.calculatedStats.attack;
  if (this.status === 'burn') {
    attack = Math.floor(attack * 0.5);
  }
  return attack;
};

OwnedPokemonSchema.methods.getEffectiveSpeed = function(this: IOwnedPokemon): number {
  let speed = this.calculatedStats.speed;
  if (this.status === 'paralysis') {
    speed = Math.floor(speed * 0.25);
  }
  return speed;
};

OwnedPokemonSchema.methods.applyStatus = function(this: IOwnedPokemon, newStatus: string, turns?: number): boolean {
  if (this.status !== 'normal' && newStatus !== 'normal') {
    return false;
  }
  this.status = newStatus as any;
  this.statusTurns = turns;
  return true;
};

// === MÉTHODES DE CONVENANCE PP ===

/**
 * Méthode de convenance pour consommer PP
 */
OwnedPokemonSchema.methods.consumePP = function(this: IOwnedPokemon, moveId: string) {
  return PokemonMoveService.consumePP(this, moveId);
};

/**
 * Méthode de convenance pour vérifier attaque utilisable
 */
OwnedPokemonSchema.methods.canUseMove = function(this: IOwnedPokemon, moveId: string): boolean {
  return PokemonMoveService.canUseMove(this, moveId);
};

/**
 * Méthode de convenance pour vérifier attaques utilisables
 */
OwnedPokemonSchema.methods.hasUsableMoves = function(this: IOwnedPokemon): boolean {
  return PokemonMoveService.hasUsableMoves(this);
};

/**
 * Méthode de convenance pour restaurer PP
 */
OwnedPokemonSchema.methods.restorePP = function(this: IOwnedPokemon, moveId?: string): void {
  return PokemonMoveService.restorePP(this, moveId);
};

/**
 * Méthode de convenance pour obtenir attaques avec données
 */
OwnedPokemonSchema.methods.getMovesWithData = async function(this: IOwnedPokemon) {
  return await PokemonMoveService.getMovesWithData(this);
};

// Export du modèle simplifié
export const OwnedPokemon = mongoose.model<IOwnedPokemon>("OwnedPokemon", OwnedPokemonSchema);
