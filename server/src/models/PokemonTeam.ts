// server/src/models/PokemonTeam.ts

import mongoose, { Schema, Document } from 'mongoose';

// Interface pour une attaque Pokémon
export interface IPokemonMove {
  moveId: string;
  currentPp: number;
  maxPp: number;
}

// Interface pour une instance de Pokémon
export interface IPokemonInstance {
  id: string;              // UUID unique pour cette instance
  pokemonId: number;       // ID du Pokémon dans la base de données (1 = Bulbasaur, etc.)
  nickname?: string;       // Surnom donné par le joueur
  level: number;
  experience: number;
  
  // Stats de combat
  currentHp: number;
  maxHp: number;
  status: 'normal' | 'sleep' | 'freeze' | 'paralysis' | 'burn' | 'poison' | 'badly_poison';
  statusTurns?: number;
  
  // Caractéristiques du Pokémon
  nature: string;          // Adamant, Modest, etc.
  ability: string;         // Capacité du Pokémon
  gender: 'Male' | 'Female' | 'Genderless';
  isShiny: boolean;
  
  // Stats calculées (avec IVs/EVs)
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  
  // Valeurs individuelles (0-31)
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  
  // Points d'effort (0-252)
  evs: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  
  // Attaques du Pokémon (max 4)
  moves: IPokemonMove[];
  
  // Infos de capture
  originalTrainer: string;  // Nom du dresseur original
  catchDate: Date;
  pokeball: string;         // Type de Ball utilisée
  happiness: number;        // Bonheur (0-255)
  heldItem?: string;        // Objet tenu (optionnel)
}

// Interface pour l'équipe d'un joueur
export interface IPokemonTeam extends Document {
  userId: mongoose.Types.ObjectId;  // Référence au PlayerData
  pokemon: IPokemonInstance[];      // Liste des Pokémon (max 6)
  activePokemon: number;            // Index du Pokémon actif (0-5, -1 si aucun)
  lastModified: Date;
}

// Schema pour une attaque
const PokemonMoveSchema = new Schema<IPokemonMove>({
  moveId: { type: String, required: true },
  currentPp: { type: Number, required: true, min: 0 },
  maxPp: { type: Number, required: true, min: 1 }
}, { _id: false });

// Schema pour une instance de Pokémon
const PokemonInstanceSchema = new Schema<IPokemonInstance>({
  id: { type: String, required: true, unique: true },
  pokemonId: { type: Number, required: true, min: 1 },
  nickname: { type: String, maxlength: 12 }, // Limite comme dans les jeux
  level: { type: Number, required: true, min: 1, max: 100 },
  experience: { type: Number, required: true, min: 0 },
  
  currentHp: { type: Number, required: true, min: 0 },
  maxHp: { type: Number, required: true, min: 1 },
  status: { 
    type: String, 
    enum: ['normal', 'sleep', 'freeze', 'paralysis', 'burn', 'poison', 'badly_poison'],
    default: 'normal'
  },
  statusTurns: { type: Number, min: 0 },
  
  nature: { type: String, required: true },
  ability: { type: String, required: true },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Genderless'],
    required: true 
  },
  isShiny: { type: Boolean, default: false },
  
  stats: {
    hp: { type: Number, required: true, min: 1 },
    attack: { type: Number, required: true, min: 1 },
    defense: { type: Number, required: true, min: 1 },
    specialAttack: { type: Number, required: true, min: 1 },
    specialDefense: { type: Number, required: true, min: 1 },
    speed: { type: Number, required: true, min: 1 }
  },
  
  ivs: {
    hp: { type: Number, required: true, min: 0, max: 31 },
    attack: { type: Number, required: true, min: 0, max: 31 },
    defense: { type: Number, required: true, min: 0, max: 31 },
    specialAttack: { type: Number, required: true, min: 0, max: 31 },
    specialDefense: { type: Number, required: true, min: 0, max: 31 },
    speed: { type: Number, required: true, min: 0, max: 31 }
  },
  
  evs: {
    hp: { type: Number, required: true, min: 0, max: 252 },
    attack: { type: Number, required: true, min: 0, max: 252 },
    defense: { type: Number, required: true, min: 0, max: 252 },
    specialAttack: { type: Number, required: true, min: 0, max: 252 },
    specialDefense: { type: Number, required: true, min: 0, max: 252 },
    speed: { type: Number, required: true, min: 0, max: 252 }
  },
  
  moves: {
    type: [PokemonMoveSchema],
    validate: {
      validator: function(moves: IPokemonMove[]) {
        return moves.length <= 4; // Maximum 4 attaques
      },
      message: 'Un Pokémon ne peut avoir que 4 attaques maximum'
    }
  },
  
  originalTrainer: { type: String, required: true },
  catchDate: { type: Date, default: Date.now },
  pokeball: { type: String, default: 'poke_ball' },
  happiness: { type: Number, default: 70, min: 0, max: 255 },
  heldItem: { type: String }
}, { _id: false });

// Schema principal pour l'équipe
const PokemonTeamSchema = new Schema<IPokemonTeam>({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PlayerData', 
    required: true,
    unique: true // Un joueur = une équipe
  },
  pokemon: {
    type: [PokemonInstanceSchema],
    validate: {
      validator: function(pokemon: IPokemonInstance[]) {
        return pokemon.length <= 6; // Maximum 6 Pokémon dans l'équipe
      },
      message: 'Une équipe ne peut contenir que 6 Pokémon maximum'
    },
    default: []
  },
  activePokemon: { 
    type: Number, 
    default: -1,
    min: -1, 
    max: 5,
    validate: {
      validator: function(this: IPokemonTeam, value: number) {
        if (value === -1) return true; // Aucun Pokémon actif
        return value < this.pokemon.length; // Index valide
      },
      message: 'Index de Pokémon actif invalide'
    }
  },
  lastModified: { type: Date, default: Date.now }
});

// Index pour améliorer les performances
PokemonTeamSchema.index({ userId: 1 });
PokemonTeamSchema.index({ 'pokemon.id': 1 });

// Middleware pour mettre à jour lastModified
PokemonTeamSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Méthodes statiques utiles
PokemonTeamSchema.statics.findByUserId = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({ userId });
};

PokemonTeamSchema.statics.createEmptyTeam = function(userId: mongoose.Types.ObjectId) {
  return this.create({
    userId,
    pokemon: [],
    activePokemon: -1
  });
};

// Méthodes d'instance
PokemonTeamSchema.methods.addPokemon = function(pokemon: IPokemonInstance) {
  if (this.pokemon.length >= 6) {
    throw new Error('Équipe pleine (6 Pokémon maximum)');
  }
  
  this.pokemon.push(pokemon);
  
  // Définit comme actif si c'est le premier Pokémon
  if (this.pokemon.length === 1) {
    this.activePokemon = 0;
  }
  
  return this.save();
};

PokemonTeamSchema.methods.removePokemon = function(pokemonId: string) {
  const index = this.pokemon.findIndex((p: IPokemonInstance) => p.id === pokemonId);
  if (index === -1) {
    throw new Error('Pokémon non trouvé dans l\'équipe');
  }
  
  this.pokemon.splice(index, 1);
  
  // Ajuste l'index du Pokémon actif
  if (this.activePokemon === index) {
    this.activePokemon = this.pokemon.length > 0 ? 0 : -1;
  } else if (this.activePokemon > index) {
    this.activePokemon--;
  }
  
  return this.save();
};

PokemonTeamSchema.methods.setActivePokemon = function(index: number) {
  if (index < -1 || index >= this.pokemon.length) {
    throw new Error('Index de Pokémon invalide');
  }
  
  this.activePokemon = index;
  return this.save();
};

PokemonTeamSchema.methods.getActivePokemon = function(): IPokemonInstance | null {
  if (this.activePokemon === -1 || this.activePokemon >= this.pokemon.length) {
    return null;
  }
  return this.pokemon[this.activePokemon];
};

PokemonTeamSchema.methods.healAllPokemon = function() {
  this.pokemon.forEach((pokemon: IPokemonInstance) => {
    pokemon.currentHp = pokemon.maxHp;
    pokemon.status = 'normal';
    pokemon.statusTurns = undefined;
    
    // Restaure les PP des attaques
    pokemon.moves.forEach(move => {
      move.currentPp = move.maxPp;
    });
  });
  
  return this.save();
};

export const PokemonTeam = mongoose.model<IPokemonTeam>('PokemonTeam', PokemonTeamSchema);
export default PokemonTeam;
