// server/src/models/OwnedPokemon.ts - VERSION INTÉGRÉE POKÉDEX
import mongoose, { Schema, Document, Model } from "mongoose";
import { getPokemonById } from "../data/PokemonData";
import naturesData from "../data/natures.json";
import { PokemonMoveService } from '../services/PokemonMoveService';
import { pokédexIntegrationService } from '../services/PokédexIntegrationService';

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

// Interface pour le contexte de capture (NOUVEAU pour Pokédex)
interface ICaptureContext {
  location?: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  weather?: string;
  timeOfDay?: string;
  captureTime?: number;
  ballType?: string;
  isFirstAttempt?: boolean;
  encounterLevel?: number;
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
  
  // === NOUVELLES DONNÉES POKÉDEX ===
  captureContext?: ICaptureContext;
  isFirstCapture?: boolean;
  pokédexIntegrated: boolean;
  
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
  
  // === MÉTHODES PP ===
  consumePP(moveId: string): any;
  canUseMove(moveId: string): boolean;
  hasUsableMoves(): boolean;
  restorePP(moveId?: string): void;
  getMovesWithData(): Promise<any[]>;
  
  // === NOUVELLES MÉTHODES POKÉDEX ===
  integrateToPokédex(context?: ICaptureContext): Promise<void>;
  updatePokédexEntry(): Promise<void>;
  markAsEvolved(fromPokemonId: number): Promise<void>;
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
  heldItem: { type: String },
  
  // === NOUVELLES DONNÉES POKÉDEX ===
  captureContext: {
    location: { type: String, default: 'Inconnu' },
    method: { 
      type: String, 
      enum: ['wild', 'trainer', 'gift', 'trade', 'evolution', 'egg', 'special'],
      default: 'wild'
    },
    weather: { 
      type: String,
      enum: ['clear', 'rain', 'storm', 'snow', 'fog', 'sandstorm']
    },
    timeOfDay: {
      type: String,
      enum: ['day', 'night', 'dawn', 'dusk']
    },
    captureTime: { type: Number }, // Temps en secondes pour capturer
    ballType: { type: String, default: 'poke_ball' },
    isFirstAttempt: { type: Boolean, default: false },
    encounterLevel: { type: Number } // Niveau lors de la première rencontre
  },
  
  isFirstCapture: { type: Boolean, default: false },
  pokédexIntegrated: { type: Boolean, default: false }
}, {
  timestamps: true
});

// === INDEX ===
OwnedPokemonSchema.index({ owner: 1, pokemonId: 1 });
OwnedPokemonSchema.index({ owner: 1, isInTeam: 1 });
OwnedPokemonSchema.index({ owner: 1, box: 1, boxSlot: 1 });
OwnedPokemonSchema.index({ pokemonId: 1, shiny: 1 });
OwnedPokemonSchema.index({ owner: 1, shiny: 1 });
OwnedPokemonSchema.index({ pokédexIntegrated: 1 }); // NOUVEAU pour intégration

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

// === MIDDLEWARE RECALCUL STATS ===
OwnedPokemonSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('level') || this.isModified('ivs') || this.isModified('evs') || this.isModified('nature')) {
    await this.recalculateStats();
  }
  next();
});

// === MIDDLEWARE PP ===
OwnedPokemonSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('moves')) {
    try {
      await PokemonMoveService.initializePP(this);
    } catch (error) {
      console.error(`❌ [OwnedPokemon] Erreur initialisation PP:`, error);
    }
  }
  next();
});

// === NOUVEAU MIDDLEWARE POKÉDEX ===
OwnedPokemonSchema.pre('save', async function(next) {
  // Déterminer si c'est une première capture
  if (this.isNew) {
    try {
      // Vérifier si c'est la première capture de cette espèce pour ce joueur
      const existingCapture = await this.constructor.findOne({
        owner: this.owner,
        pokemonId: this.pokemonId
      });
      
      this.isFirstCapture = !existingCapture;
      
      console.log(`🆕 [OwnedPokemon] Nouveau Pokémon: ${this.pokemonId} - Première capture: ${this.isFirstCapture}`);
    } catch (error) {
      console.error(`❌ [OwnedPokemon] Erreur vérification première capture:`, error);
    }
  }
  next();
});

// === MIDDLEWARE POST-SAVE POKÉDEX INTÉGRATION ===
OwnedPokemonSchema.post('save', async function(doc) {
  // Intégration automatique au Pokédx après sauvegarde
  if (doc.isNew && !doc.pokédexIntegrated) {
    try {
      console.log(`🔗 [OwnedPokemon] Intégration Pokédx automatique pour ${doc.pokemonId}`);
      await doc.integrateToPokédex();
    } catch (error) {
      console.error(`❌ [OwnedPokemon] Erreur intégration Pokédx:`, error);
    }
  }
});

// === MÉTHODES D'INSTANCE STATS ===
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
OwnedPokemonSchema.methods.consumePP = function(this: IOwnedPokemon, moveId: string) {
  return PokemonMoveService.consumePP(this, moveId);
};

OwnedPokemonSchema.methods.canUseMove = function(this: IOwnedPokemon, moveId: string): boolean {
  return PokemonMoveService.canUseMove(this, moveId);
};

OwnedPokemonSchema.methods.hasUsableMoves = function(this: IOwnedPokemon): boolean {
  return PokemonMoveService.hasUsableMoves(this);
};

OwnedPokemonSchema.methods.restorePP = function(this: IOwnedPokemon, moveId?: string): void {
  return PokemonMoveService.restorePP(this, moveId);
};

OwnedPokemonSchema.methods.getMovesWithData = async function(this: IOwnedPokemon) {
  return await PokemonMoveService.getMovesWithData(this);
};

// === NOUVELLES MÉTHODES POKÉDEX ===

/**
 * Intègre ce Pokémon au Pokédx
 */
OwnedPokemonSchema.methods.integrateToPokédx = async function(
  this: IOwnedPokemon, 
  context?: ICaptureContext
): Promise<void> {
  try {
    if (this.pokédexIntegrated) {
      console.log(`⏭️ [OwnedPokemon] ${this.pokemonId} déjà intégré au Pokédx`);
      return;
    }
    
    console.log(`🔗 [OwnedPokemon] Intégration Pokédx: ${this.pokemonId} pour ${this.owner}`);
    
    // Fusionner le contexte existant avec le nouveau
    const finalContext = {
      ...this.captureContext,
      ...context
    };
    
    // Appeler le service d'intégration
    const result = await pokédexIntegrationService.onOwnedPokemonCreated(this, finalContext);
    
    // Marquer comme intégré
    this.pokédexIntegrated = true;
    
    // Sauvegarder sans déclencher les hooks (pour éviter la récursion)
    await this.updateOne({ pokédexIntegrated: true }, { timestamps: false });
    
    console.log(`✅ [OwnedPokemon] Intégration Pokédx réussie pour ${this.pokemonId}`);
    
  } catch (error) {
    console.error(`❌ [OwnedPokemon] Erreur intégration Pokédx:`, error);
    throw error;
  }
};

/**
 * Met à jour l'entrée Pokédx pour ce Pokémon
 */
OwnedPokemonSchema.methods.updatePokédexEntry = async function(this: IOwnedPokemon): Promise<void> {
  try {
    if (!this.pokédexIntegrated) {
      await this.integrateToPokédx();
      return;
    }
    
    console.log(`🔄 [OwnedPokemon] Mise à jour entrée Pokédx: ${this.pokemonId}`);
    
    // Forcer une nouvelle intégration pour mettre à jour les données
    this.pokédexIntegrated = false;
    await this.integrateToPokédx();
    
  } catch (error) {
    console.error(`❌ [OwnedPokemon] Erreur mise à jour Pokédx:`, error);
    throw error;
  }
};

/**
 * Marque ce Pokémon comme résultat d'une évolution
 */
OwnedPokemonSchema.methods.markAsEvolved = async function(
  this: IOwnedPokemon, 
  fromPokemonId: number
): Promise<void> {
  try {
    console.log(`🌟 [OwnedPokemon] Évolution: #${fromPokemonId} → #${this.pokemonId}`);
    
    // Mettre à jour le contexte de capture
    this.captureContext = {
      ...this.captureContext,
      method: 'evolution',
      location: this.captureContext?.location || 'Évolution'
    };
    
    // Intégrer l'évolution au Pokédx
    await pokédexIntegrationService.handlePokemonEvolution(
      this.owner,
      fromPokemonId,
      this.pokemonId,
      this._id.toString(),
      this.captureContext.location || 'Évolution'
    );
    
    // Marquer comme intégré
    this.pokédexIntegrated = true;
    await this.save();
    
    console.log(`✅ [OwnedPokemon] Évolution intégrée au Pokédx`);
    
  } catch (error) {
    console.error(`❌ [OwnedPokemon] Erreur intégration évolution:`, error);
    throw error;
  }
};

// === MÉTHODES STATIQUES ===

/**
 * Crée un nouveau Pokémon avec intégration Pokédx automatique
 */
OwnedPokemonSchema.statics.createWithPokédxIntegration = async function(
  pokemonData: Partial<IOwnedPokemon>,
  captureContext?: ICaptureContext
): Promise<IOwnedPokemon> {
  try {
    console.log(`🆕 [OwnedPokemon] Création avec intégration: ${pokemonData.pokemonId} pour ${pokemonData.owner}`);
    
    // Créer le Pokémon avec le contexte de capture
    const pokemon = new this({
      ...pokemonData,
      captureContext: {
        location: 'Inconnu',
        method: 'wild',
        ballType: 'poke_ball',
        isFirstAttempt: false,
        ...captureContext
      },
      pokédexIntegrated: false // Sera mis à true après intégration
    });
    
    // Sauvegarder (déclenche l'intégration automatique)
    await pokemon.save();
    
    return pokemon;
    
  } catch (error) {
    console.error(`❌ [OwnedPokemon] Erreur création avec intégration:`, error);
    throw error;
  }
};

/**
 * Trouve tous les Pokémon non intégrés au Pokédx
 */
OwnedPokemonSchema.statics.findNonIntegrated = async function(): Promise<IOwnedPokemon[]> {
  return await this.find({ pokédexIntegrated: { $ne: true } });
};

/**
 * Intègre en masse les Pokémon existants au Pokédx
 */
OwnedPokemonSchema.statics.bulkIntegrateToPokédx = async function(
  ownerId?: string
): Promise<{ processed: number; succeeded: number; failed: number }> {
  try {
    console.log(`🔄 [OwnedPokemon] Intégration en masse au Pokédx${ownerId ? ` pour ${ownerId}` : ''}`);
    
    const query: any = { pokédexIntegrated: { $ne: true } };
    if (ownerId) query.owner = ownerId;
    
    const nonIntegratedPokemon = await this.find(query);
    
    let succeeded = 0;
    let failed = 0;
    
    for (const pokemon of nonIntegratedPokemon) {
      try {
        await pokemon.integrateToPokédx();
        succeeded++;
      } catch (error) {
        console.error(`❌ Erreur intégration ${pokemon.pokemonId}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ [OwnedPokemon] Intégration en masse terminée: ${succeeded} réussies, ${failed} échouées`);
    
    return {
      processed: nonIntegratedPokemon.length,
      succeeded,
      failed
    };
    
  } catch (error) {
    console.error(`❌ [OwnedPokemon] Erreur intégration en masse:`, error);
    throw error;
  }
};

// === MÉTHODES STATIQUES POKÉDX ===

/**
 * Récupère les statistiques Pokédx pour un propriétaire
 */
OwnedPokemonSchema.statics.getPokédxStats = async function(owner: string) {
  const pipeline = [
    { $match: { owner } },
    {
      $group: {
        _id: null,
        totalPokemon: { $sum: 1 },
        uniqueSpecies: { $addToSet: '$pokemonId' },
        shinies: {
          $sum: { $cond: ['$shiny', 1, 0] }
        },
        integrated: {
          $sum: { $cond: ['$pokédexIntegrated', 1, 0] }
        },
        byMethod: {
          $push: '$captureContext.method'
        }
      }
    },
    {
      $project: {
        totalPokemon: 1,
        uniqueSpecies: { $size: '$uniqueSpecies' },
        shinies: 1,
        integrated: 1,
        integrationRate: {
          $multiply: [
            { $divide: ['$integrated', '$totalPokemon'] },
            100
          ]
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalPokemon: 0,
    uniqueSpecies: 0,
    shinies: 0,
    integrated: 0,
    integrationRate: 0
  };
};

// Export du modèle
export const OwnedPokemon = mongoose.model<IOwnedPokemon>("OwnedPokemon", OwnedPokemonSchema);

// === TYPES D'EXPORT ===
export type OwnedPokemonDocument = IOwnedPokemon;
export type CaptureContext = ICaptureContext;

// === GUIDE D'UTILISATION ===
//
// 🎯 NOUVELLES FONCTIONNALITÉS POKÉDX :
//
// 1. Création automatique avec intégration :
//    const pokemon = await OwnedPokemon.createWithPokédxIntegration({
//      owner: playerId,
//      pokemonId: 25,
//      level: 5,
//      // ... autres données
//    }, {
//      location: 'Route 1',
//      method: 'wild',
//      weather: 'clear',
//      timeOfDay: 'day',
//      captureTime: 15.5,
//      ballType: 'poke_ball',
//      isFirstAttempt: true
//    });
//
// 2. Intégration manuelle :
//    await pokemon.integrateToPokédx({
//      location: 'Forêt de Jade',
//      method: 'wild'
//    });
//
// 3. Gestion des évolutions :
//    await evolvedPokemon.markAsEvolved(originalPokemonId);
//
// 4. Intégration en masse :
//    const result = await OwnedPokemon.bulkIntegrateToPokédx(playerId);
//    console.log(`${result.succeeded} Pokémon intégrés au Pokédx`);
//
// 5. Statistiques Pokédx :
//    const stats = await OwnedPokemon.getPokédxStats(playerId);
//    console.log(`${stats.uniqueSpecies} espèces uniques capturées`);
