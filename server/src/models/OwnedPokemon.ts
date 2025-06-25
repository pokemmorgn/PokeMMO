// server/src/models/OwnedPokemon.ts - Version finale combat-ready
import mongoose from "mongoose";
import { getPokemonById } from "../data/PokemonData";
import naturesData from "../data/natures.json";

const OwnedPokemonSchema = new mongoose.Schema({
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
  
  // === STATS CALCULÉES (mises à jour automatiquement) ===
  calculatedStats: {
    attack: { type: Number, required: true },
    defense: { type: Number, required: true },
    spAttack: { type: Number, required: true },
    spDefense: { type: Number, required: true },
    speed: { type: Number, required: true }
  },
  
  // === ORGANISATION ===
  isInTeam: { type: Boolean, default: false },
  slot: { type: Number, min: 0, max: 5 }, // Position dans l'équipe (0-5)
  box: { type: Number, default: 0, min: 0 }, // Numéro de boîte PC
  boxSlot: { type: Number, min: 0 }, // Position dans la boîte
  
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
// Max 4 attaques
OwnedPokemonSchema.path('moves').validate(function(moves) {
  return moves.length <= 4;
}, 'Un Pokémon ne peut avoir que 4 attaques maximum');

// Total EVs <= 510
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

// === MÉTHODES D'INSTANCE ===
OwnedPokemonSchema.methods.recalculateStats = async function() {
  const basePokemon = await getPokemonById(this.pokemonId);
  if (!basePokemon) {
    throw new Error(`Pokémon ID ${this.pokemonId} introuvable`);
  }

  const stats = this.calculateStatsWithFormula(basePokemon.baseStats);
  
  // Met à jour les stats calculées
  this.calculatedStats = {
    attack: stats.attack,
    defense: stats.defense,
    spAttack: stats.spAttack,
    spDefense: stats.spDefense,
    speed: stats.speed
  };
  
  // Met à jour HP max et ajuste HP courant si nécessaire
  const oldMaxHp = this.maxHp;
  this.maxHp = stats.hp;
  
  if (this.isNew) {
    this.currentHp = this.maxHp;
  } else if (oldMaxHp !== this.maxHp) {
    // Maintient le pourcentage d'HP
    const hpPercent = this.currentHp / oldMaxHp;
    this.currentHp = Math.max(1, Math.floor(this.maxHp * hpPercent));
  }
};

OwnedPokemonSchema.methods.calculateStatsWithFormula = function(baseStats: any) {
  const nature = naturesData[this.nature as keyof typeof naturesData];
  
  const calculateStat = (statName: string, baseStat: number, isHP: boolean = false): number => {
    const iv = this.ivs[statName] || 0;
    const ev = this.evs[statName] || 0;
    
    if (isHP) {
      return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * this.level) / 100) + this.level + 10;
    } else {
      let stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * this.level) / 100) + 5;
      
      // Applique les modificateurs de nature
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
OwnedPokemonSchema.methods.heal = function(amount?: number) {
  if (amount) {
    this.currentHp = Math.min(this.currentHp + amount, this.maxHp);
  } else {
    // Soigne complètement
    this.currentHp = this.maxHp;
    this.status = 'normal';
    this.statusTurns = undefined;
    // Restaure PP
    this.moves.forEach(move => {
      move.currentPp = move.maxPp;
    });
  }
};

OwnedPokemonSchema.methods.takeDamage = function(damage: number) {
  this.currentHp = Math.max(0, this.currentHp - damage);
  return this.currentHp === 0; // retourne true si KO
};

OwnedPokemonSchema.methods.isFainted = function() {
  return this.currentHp === 0;
};

OwnedPokemonSchema.methods.canBattle = function() {
  return this.currentHp > 0 && this.moves.some(move => move.currentPp > 0);
};

OwnedPokemonSchema.methods.getEffectiveAttack = function() {
  let attack = this.calculatedStats.attack;
  
  // Modificateurs de statut
  if (this.status === 'burn') {
    attack = Math.floor(attack * 0.5);
  }
  
  return attack;
};

OwnedPokemonSchema.methods.getEffectiveSpeed = function() {
  let speed = this.calculatedStats.speed;
  
  // Modificateurs de statut
  if (this.status === 'paralysis') {
    speed = Math.floor(speed * 0.25);
  }
  
  return speed;
};

OwnedPokemonSchema.methods.applyStatus = function(newStatus: string, turns?: number) {
  // Ne peut pas appliquer un statut si déjà affecté (sauf normal)
  if (this.status !== 'normal' && newStatus !== 'normal') {
    return false;
  }
  
  this.status = newStatus;
  this.statusTurns = turns;
  return true;
};

// === MÉTHODES STATIQUES ===
OwnedPokemonSchema.statics.findByOwnerTeam = function(owner: string) {
  return this.find({ owner, isInTeam: true }).sort({ slot: 1 });
};

OwnedPokemonSchema.statics.findByOwnerBox = function(owner: string, boxNumber: number = 0) {
  return this.find({ owner, isInTeam: false, box: boxNumber }).sort({ boxSlot: 1 });
};

export interface IOwnedPokemon extends mongoose.Document {
  owner: string;
  pokemonId: number;
  level: number;
  experience: number;
  nature: string;
  nickname?: string;
  shiny: boolean;
  gender: string;
  ability: string;
  ivs: any;
  evs: any;
  moves: Array<{
    moveId: string;
    currentPp: number;
    maxPp: number;
  }>;
  currentHp: number;
  maxHp: number;
  status: string;
  statusTurns?: number;
  calculatedStats: any;
  isInTeam: boolean;
  slot?: number;
  box: number;
  boxSlot?: number;
  caughtAt: Date;
  friendship: number;
  pokeball: string;
  originalTrainer: string;
  heldItem?: string;
  
  // Méthodes
  recalculateStats(): Promise<void>;
  calculateStatsWithFormula(baseStats: any): any;
  heal(amount?: number): void;
  takeDamage(damage: number): boolean;
  isFainted(): boolean;
  canBattle(): boolean;
  getEffectiveAttack(): number;
  getEffectiveSpeed(): number;
  applyStatus(status: string, turns?: number): boolean;
}

export const OwnedPokemon = mongoose.model<IOwnedPokemon>("OwnedPokemon", OwnedPokemonSchema);
