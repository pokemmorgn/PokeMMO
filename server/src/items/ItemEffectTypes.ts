// server/src/items/ItemEffectTypes.ts - TYPES ET DÉFINITIONS COMPLÈTES DES EFFETS D'ITEMS POKÉMON
// Couvre TOUTES les générations jusqu'à Gen 9 (Scarlet/Violet)

// ===== TYPES DE BASE =====

export type ItemCategory = 
  | 'medicine' | 'pokeballs' | 'battle_items' | 'key_items' | 'berries' 
  | 'machines' | 'evolution_items' | 'held_items' | 'z_crystals' 
  | 'dynamax_crystals' | 'tera_shards' | 'poke_toys' | 'ingredients'
  | 'treasure' | 'fossil' | 'flutes' | 'mail' | 'exp_items';

export type EffectTrigger = 
  // Usage direct
  | 'on_use' | 'on_use_in_battle' | 'on_use_on_pokemon' | 'on_use_in_field'
  // Combat
  | 'turn_start' | 'turn_end' | 'on_switch_in' | 'on_switch_out'
  | 'before_move' | 'after_move' | 'on_hit' | 'on_miss' | 'on_critical'
  | 'on_ko' | 'on_faint' | 'when_hit' | 'when_damaged'
  // Status
  | 'on_status_inflict' | 'on_status_cure' | 'on_stat_change'
  // HP events
  | 'on_hp_low' | 'on_hp_critical' | 'on_full_hp'
  // Move events
  | 'on_move_select' | 'on_move_fail' | 'on_super_effective' | 'on_not_very_effective'
  // Weather/Terrain
  | 'on_weather_change' | 'on_terrain_change' | 'in_weather' | 'in_terrain'
  // Special
  | 'on_level_up' | 'on_evolution' | 'in_wild_encounter' | 'during_breeding'
  | 'on_capture' | 'continuous' | 'passive' | 'on_equip' | 'on_unequip';

export type ConditionType =
  // Pokémon conditions
  | 'pokemon_species' | 'pokemon_type' | 'pokemon_ability' | 'pokemon_gender'
  | 'pokemon_level' | 'pokemon_nature' | 'pokemon_friendship' | 'pokemon_form'
  | 'pokemon_original_trainer' | 'pokemon_shiny' | 'pokemon_egg_group'
  // Stats conditions
  | 'stat_value' | 'stat_stage' | 'hp_percentage' | 'hp_value'
  | 'iv_value' | 'ev_value' | 'base_stat_total'
  // Status conditions
  | 'has_status' | 'has_no_status' | 'status_turns_remaining'
  | 'volatile_status' | 'non_volatile_status'
  // Battle conditions
  | 'battle_type' | 'opponent_type' | 'move_type' | 'move_category'
  | 'move_power' | 'move_priority' | 'damage_dealt' | 'damage_received'
  | 'critical_hit' | 'super_effective' | 'not_very_effective'
  // Field conditions
  | 'weather_active' | 'terrain_active' | 'gravity' | 'trick_room'
  | 'field_effect' | 'entry_hazards'
  // Time/Location conditions
  | 'time_of_day' | 'season' | 'location' | 'map_type' | 'wild_encounter'
  // Item conditions
  | 'held_item' | 'consumed_berry' | 'item_used' | 'first_use'
  // Trainer conditions
  | 'trainer_level' | 'badges_count' | 'party_size' | 'money_amount'
  // Special conditions
  | 'random_chance' | 'turn_number' | 'consecutive_use' | 'last_move_used';

export type ActionType =
  // HP actions
  | 'heal_hp_fixed' | 'heal_hp_percentage' | 'heal_hp_max' | 'damage_hp'
  | 'restore_hp_item' | 'drain_hp' | 'recoil_damage'
  // Status actions
  | 'cure_status' | 'cure_all_status' | 'inflict_status' | 'prevent_status'
  | 'cure_confusion' | 'cure_attraction' | 'remove_volatile_status'
  // Stats actions
  | 'boost_stat' | 'lower_stat' | 'reset_stats' | 'set_stat_stage'
  | 'copy_stat_changes' | 'reverse_stat_changes' | 'prevent_stat_lower'
  // Move actions
  | 'teach_move' | 'delete_move' | 'restore_pp' | 'restore_pp_max'
  | 'increase_pp_max' | 'reset_pp' | 'disable_move' | 'encore_move'
  // Evolution actions
  | 'evolve_pokemon' | 'prevent_evolution' | 'trigger_evolution_check'
  // Catch actions  
  | 'modify_catch_rate' | 'guaranteed_catch' | 'prevent_escape'
  | 'apply_pokeball_modifier' | 'break_pokeball'
  // Battle actions
  | 'switch_pokemon' | 'force_switch' | 'prevent_switch' | 'escape_battle'
  | 'end_battle' | 'double_prize_money' | 'halve_prize_money'
  // Field actions
  | 'change_weather' | 'change_terrain' | 'remove_weather' | 'remove_terrain'
  | 'set_gravity' | 'set_trick_room' | 'remove_entry_hazards'
  // Move modifications
  | 'increase_move_power' | 'decrease_move_power' | 'change_move_type'
  | 'change_move_category' | 'add_move_effect' | 'guarantee_critical'
  | 'increase_accuracy' | 'decrease_accuracy' | 'bypass_accuracy'
  // Special actions
  | 'transform_pokemon' | 'change_ability' | 'change_type' | 'change_form'
  | 'mega_evolve' | 'z_move_unlock' | 'dynamax' | 'terastalize'
  // Breeding actions
  | 'enable_baby_pokemon' | 'pass_down_move' | 'guarantee_shiny'
  | 'modify_egg_cycles' | 'inherit_pokeball'
  // Misc actions
  | 'play_sound' | 'show_message' | 'add_money' | 'consume_item'
  | 'duplicate_item' | 'random_item' | 'revive_pokemon'
  // Experience actions
  | 'gain_exp' | 'gain_ev' | 'reset_ev' | 'increase_friendship'
  | 'decrease_friendship' | 'max_friendship'
  // Contest actions (for Contests/Showcases)
  | 'increase_beauty' | 'increase_cool' | 'increase_cute'
  | 'increase_smart' | 'increase_tough' | 'increase_sheen';

// ===== INTERFACES PRINCIPALES =====

export interface ItemCondition {
  id?: string;                    // ID unique pour référence
  type: ConditionType;           // Type de condition
  operator?: 'equals' | 'not_equals' | 'greater' | 'less' | 'greater_equal' 
           | 'less_equal' | 'in' | 'not_in' | 'contains' | 'range';
  value?: any;                   // Valeur à comparer
  values?: any[];                // Valeurs multiples (pour 'in', 'not_in')
  range?: { min?: number; max?: number }; // Pour les ranges
  target?: 'self' | 'opponent' | 'ally' | 'any' | 'user'; // Cible de la condition
  negate?: boolean;              // Inverser la condition
  probability?: number;          // Chance que la condition soit vraie (0-1)
}

export interface ItemAction {
  id?: string;                   // ID unique pour référence
  type: ActionType;              // Type d'action
  target?: 'self' | 'opponent' | 'ally' | 'user' | 'party' | 'field' | 'all';
  value?: any;                   // Valeur principale
  duration?: number;             // Durée en tours (si applicable)
  chance?: number;               // Chance d'activation (0-1)
  priority?: number;             // Priorité d'exécution
  parameters?: { [key: string]: any }; // Paramètres spécifiques
  
  // Messages
  success_message?: string;
  failure_message?: string;
  
  // Conditions spécifiques à cette action
  conditions?: ItemCondition[];
  
  // Actions liées (pour les effets en chaîne)
  chain_actions?: ItemAction[];
  
  // Restrictions
  once_per_battle?: boolean;
  once_per_turn?: boolean;
  max_uses?: number;
}

export interface ItemEffect {
  id: string;                    // ID unique de l'effet
  name?: string;                 // Nom descriptif
  description?: string;          // Description de l'effet
  
  trigger: EffectTrigger;        // Quand l'effet se déclenche
  priority?: number;             // Priorité d'exécution (défaut: 0)
  
  conditions?: ItemCondition[];   // Conditions pour activer l'effet
  actions: ItemAction[];         // Actions à exécuter
  
  // Configuration
  stackable?: boolean;           // Peut se cumuler avec d'autres effets
  removable?: boolean;           // Peut être retiré/annulé
  temporary?: boolean;           // Effet temporaire
  duration?: number;             // Durée en tours/utilisation
  
  // Restrictions
  once_per_battle?: boolean;
  once_per_turn?: boolean;
  max_uses_per_battle?: number;
  cooldown_turns?: number;
  
  // Métadonnées
  generation?: number;           // Génération d'introduction
  tags?: string[];               // Tags pour catégorisation
  hidden?: boolean;              // Effet caché (pour certains objets)
}

// ===== CONTEXTE D'EXÉCUTION =====

export type ItemEffectContext = {
  // Contexte Pokémon
  pokemon?: {
    species: string;
    level: number;
    stats: { [stat: string]: number };
    types: string[];
    ability: string;
    held_item?: string;
    status?: string;
    hp: number;
    max_hp: number;
    // ... autres propriétés Pokémon
  };
  
  // Contexte combat
  battle?: {
    type: string;
    turn_number: number;
    weather?: string;
    terrain?: string;
    field_effects: string[];
    // ... autres propriétés combat
  };
  
  // Contexte utilisateur
  trainer?: {
    level: number;
    money: number;
    badges: string[];
    location: string;
    // ... autres propriétés dresseur
  };
  
  // Contexte item
  item?: {
    id: string;
    quantity: number;
    first_use: boolean;
    uses_this_battle: number;
    // ... autres propriétés item
  };
  
  // Contexte environnemental
  environment?: {
    time_of_day: string;
    season: string;
    weather: string;
    location: string;
    map_type: string;
    // ... autres propriétés environnement
  };
};

// ===== CONSTANTES DE VALIDATION =====

export const POKEMON_STATS = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'] as const;
export const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 
  'steel', 'fairy'
] as const;

export const STATUS_CONDITIONS = [
  'burn', 'freeze', 'paralysis', 'poison', 'bad_poison', 'sleep'
] as const;

export const VOLATILE_STATUS_CONDITIONS = [
  'confusion', 'attraction', 'curse', 'embargo', 'encore', 'flinch', 'heal_block',
  'identified', 'leech_seed', 'nightmare', 'perish_song', 'substitute', 'taunt',
  'torment', 'yawn', 'bound', 'can_not_use', 'destiny_bond', 'disable', 'drowsy',
  'focus_energy', 'foresight', 'grudge', 'imprison', 'ingrain', 'lock_on',
  'magic_coat', 'minimize', 'miracle_eye', 'mud_sport', 'odor_sleuth', 'powder',
  'rage', 'roost', 'smack_down', 'snatch', 'stockpile', 'telekinesis', 'water_sport'
] as const;

export const WEATHER_CONDITIONS = [
  'sunny', 'rain', 'sandstorm', 'hail', 'fog', 'harsh_sunlight', 'heavy_rain',
  'strong_winds', 'snow'  // Gen 9
] as const;

export const TERRAIN_CONDITIONS = [
  'electric_terrain', 'grassy_terrain', 'misty_terrain', 'psychic_terrain'
] as const;

export const BATTLE_TYPES = [
  'single', 'double', 'triple', 'rotation', 'horde', 'royal', 'sos', 'raid', 'max_raid'
] as const;
