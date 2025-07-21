// server/src/types/NpcTypes.ts
// Interfaces TypeScript complètes pour le système NPCs JSON
// Basé sur le fichier de référence complet

// ===== TYPES DE BASE =====

export type NpcType = 
  | 'dialogue'
  | 'merchant'
  | 'trainer'
  | 'healer'
  | 'gym_leader'
  | 'transport'
  | 'service'
  | 'minigame'
  | 'researcher'
  | 'guild'
  | 'event'
  | 'quest_master';

export type Direction = 'north' | 'south' | 'east' | 'west';
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';
export type Weather = 'sunny' | 'rain' | 'storm' | 'snow' | 'fog' | 'heavy_rain';
export type Currency = 'gold' | 'tokens' | 'points';

// ===== INTERFACES COMMUNES =====

export interface Position {
  x: number;
  y: number;
}

export interface SpawnConditions {
  timeOfDay?: TimeOfDay[] | null;
  weather?: Weather[] | null;
  minPlayerLevel?: number | null;
  maxPlayerLevel?: number | null;
  requiredFlags?: string[];
  forbiddenFlags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface QuestRequirement {
  minLevel?: number;
  maxLevel?: number | null;
  requiredBadges?: string[];
  requiredItems?: string[];
  requiredFlags?: string[];
  forbiddenFlags?: string[];
}

export interface QuestSystem {
  questsToGive?: string[];
  questsToEnd?: string[];
  questRequirements?: Record<string, QuestRequirement>;
  questDialogueIds?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
}

// ===== INTERFACE NPC DE BASE =====

export interface BaseNpc {
  // Propriétés obligatoires
  id: number;
  name: string;
  type: NpcType;
  position: Position;
  sprite: string;
  
  // Propriétés optionnelles communes
  direction?: Direction;
  interactionRadius?: number;
  canWalkAway?: boolean;
  autoFacePlayer?: boolean;
  repeatable?: boolean;
  cooldownSeconds?: number;
  
  // Système de spawn
  spawnConditions?: SpawnConditions;
  
  // Système de quêtes (tous NPCs)
  questsToGive?: string[];
  questsToEnd?: string[];
  questRequirements?: Record<string, QuestRequirement>;
  questDialogueIds?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
}

// ===== INTERFACES SPÉCIALISÉES PAR TYPE =====

// DIALOGUE NPC
export interface DialogueNpc extends BaseNpc {
  type: 'dialogue';
  dialogueIds: string[];
  dialogueId?: string;
  conditionalDialogueIds?: Record<string, string[]>;
  zoneInfo?: {
    zoneName: string;
    connections: string[];
    wildPokemon: Array<{
      name: string;
      level: string;
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    }>;
    landmarks?: string[];
  };
}

// MERCHANT NPC
export interface MerchantNpc extends BaseNpc {
  type: 'merchant';
  shopId: string;
  shopType: 'pokemart' | 'items' | 'tms' | 'berries' | 'clothes' | 'black_market';
  dialogueIds?: string[];
  shopDialogueIds?: {
    shopOpen?: string[];
    shopClose?: string[];
    noMoney?: string[];
    purchaseSuccess?: string[];
    stockEmpty?: string[];
    bulkDiscount?: string[];
    vipWelcome?: string[];
  };
  shopConfig?: {
    currency: Currency;
    discountPercent?: number;
    memberDiscount?: number;
    vipDiscount?: number;
    restockHours?: number;
    limitedStock?: boolean;
    bulkDiscounts?: {
      enabled: boolean;
      threshold: number;
      discountPercent: number;
    };
    loyaltyProgram?: {
      enabled: boolean;
      pointsPerGold: number;
      rewardThresholds: number[];
    };
  };
  accessRestrictions?: {
    minPlayerLevel?: number;
    maxPlayerLevel?: number | null;
    requiredBadges?: string[];
    requiredItems?: string[];
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    vipOnly?: boolean;
    guildOnly?: boolean;
    membershipRequired?: boolean;
  };
  businessHours?: {
    enabled: boolean;
    openTime?: string;
    closeTime?: string;
    closedDays?: string[];
    closedMessageId?: string;
    holidaySchedule?: {
      enabled: boolean;
      closedDates: string[];
    };
  };
}

// BATTLER NPC (Base commune pour Trainer et Gym Leader)
export interface BattlerNpc extends BaseNpc {
  trainerId: string;
  trainerClass: string;
  trainerRank?: number;
  trainerTitle?: string;
  battleConfig: {
    teamId: string;
    battleType: 'single' | 'double' | 'multi';
    allowItems?: boolean;
    allowSwitching?: boolean;
    levelCap?: number | null;
    customRules?: string[];
    weatherCondition?: string | null;
    terrainCondition?: string | null;
  };
  battleDialogueIds: {
    preBattle: string[];
    defeat: string[];
    victory: string[];
    rematch?: string[];
    busy?: string[];
    lowHealth?: string[];
    lastPokemon?: string[];
  };
  rewards: {
    money: {
      base: number;
      perPokemonLevel?: number;
      bonus?: number;
      multiplier?: number;
    };
    experience?: {
      enabled: boolean;
      multiplier?: number;
      bonusExp?: number;
    };
    items?: Array<{
      itemId: string;
      quantity: number;
      chance: number; // 0-100
    }>;
    badges?: string[];
    trophies?: string[];
  };
  rebattle?: {
    enabled: boolean;
    cooldownHours?: number;
    rematchTeamId?: string;
    increasedRewards?: boolean;
    maxRebattles?: number; // 0 = illimité
    scalingDifficulty?: boolean;
  };
  visionConfig?: {
    sightRange: number;
    sightAngle: number;
    chaseRange: number;
    returnToPosition?: boolean;
    blockMovement?: boolean;
    canSeeHiddenPlayers?: boolean;
  };
  battleConditions?: {
    minPlayerLevel?: number;
    maxPlayerLevel?: number | null;
    requiredBadges?: string[];
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    timeRestrictions?: {
      enabled: boolean;
      allowedTimes?: TimeOfDay[];
    };
  };
  progressionFlags?: {
    onDefeat?: string[];
    onVictory?: string[];
    onRematch?: string[];
    onFirstMeeting?: string[];
  };
}

// TRAINER NPC
export interface TrainerNpc extends BattlerNpc {
  type: 'trainer';
}

// HEALER NPC
export interface HealerNpc extends BaseNpc {
  type: 'healer';
  healerConfig: {
    healingType: 'free' | 'paid' | 'pokemon_center';
    cost?: number;
    currency?: Currency;
    instantHealing?: boolean;
    healFullTeam?: boolean;
    removeStatusEffects?: boolean;
    restorePP?: boolean;
  };
  healerDialogueIds: {
    welcome: string[];
    offerHealing: string[];
    healingStart: string[];
    healingComplete: string[];
    noMoney?: string[];
    alreadyHealthy?: string[];
    noPokemon?: string[];
  };
  additionalServices?: {
    pcAccess?: boolean;
    pokemonStorage?: boolean;
    tradeCenter?: boolean;
    moveReminder?: boolean;
    pokemonDaycare?: boolean;
  };
  serviceRestrictions?: {
    minPlayerLevel?: number;
    maxUsesPerDay?: number; // 0 = illimité
    cooldownBetweenUses?: number; // secondes
    requiredFlags?: string[];
    forbiddenFlags?: string[];
  };
}

// GYM LEADER NPC
export interface GymLeaderNpc extends BattlerNpc {
  type: 'gym_leader';
  gymConfig: {
    gymId: string;
    gymType: string; // electric, water, fire, etc.
    gymLevel: number; // 1-8
    badgeId: string;
    badgeName: string;
    gymPuzzle?: string;
    requiredBadges?: string[];
  };
  gymDialogueIds: {
    firstChallenge: string[];
    preBattle: string[];
    defeat: string[];
    victory: string[];
    badgeAwarded: string[];
    alreadyDefeated?: string[];
    notReady?: string[];
    rematch?: string[];
  };
  challengeConditions: {
    minPlayerLevel: number;
    maxPlayerLevel?: number | null;
    requiredBadges: string[];
    requiredFlags?: string[];
    forbiddenFlags: string[];
    minimumPokemon?: number;
    maximumPokemon?: number;
  };
  gymRewards: {
    badge: {
      badgeId: string;
      tmReward?: string;
      pokemonObeyLevel?: number;
    };
    money: {
      base: number;
      multiplier?: number;
    };
    items?: Array<{
      itemId: string;
      quantity: number;
      chance: number;
    }>;
    titles?: string[];
  };
  rematchConfig?: {
    enabled: boolean;
    cooldownDays?: number;
    rematchTeamId?: string;
    levelIncrease?: number;
    newRewards?: boolean;
    championRequirement?: boolean;
  };
}

// TRANSPORT NPC
export interface TransportNpc extends BaseNpc {
  type: 'transport';
  transportConfig: {
    transportType: 'boat' | 'train' | 'fly' | 'teleport';
    vehicleId: string;
    capacity?: number;
    travelTime?: number; // secondes
  };
  destinations: Array<{
    mapId: string;
    mapName: string;
    cost: number;
    currency: Currency;
    travelTime: number;
    requiredFlags?: string[];
    forbiddenFlags?: string[];
  }>;
  schedules?: Array<{
    departTime: string; // "HH:MM"
    arrivalTime: string;
    destination: string;
    daysOfWeek: string[];
  }>;
  transportDialogueIds: {
    welcome: string[];
    destinations: string[];
    confirmTravel: string[];
    boarding: string[];
    departure: string[];
    arrival: string[];
    noMoney?: string[];
    notAvailable?: string[];
    weatherDelay?: string[];
  };
  weatherRestrictions?: {
    enabled: boolean;
    forbiddenWeather?: Weather[];
    delayWeather?: Weather[];
    delayMessageId?: string;
  };
}

// SERVICE NPC
export interface ServiceNpc extends BaseNpc {
  type: 'service';
  serviceConfig: {
    serviceType: 'name_rater' | 'move_deleter' | 'move_reminder' | 'iv_checker';
    cost: number;
    currency: Currency;
    instantService?: boolean;
    maxUsesPerDay?: number;
  };
  availableServices: Array<{
    serviceId: string;
    serviceName: string;
    cost: number;
    requirements?: {
      originalTrainer?: boolean;
      minFriendship?: number;
      minLevel?: number;
    };
  }>;
  serviceDialogueIds: {
    welcome: string[];
    serviceOffer: string[];
    serviceStart: string[];
    serviceComplete: string[];
    noMoney?: string[];
    notEligible?: string[];
    limitReached?: string[];
  };
  serviceRestrictions?: {
    minPlayerLevel?: number;
    maxUsesPerDay?: number;
    cooldownBetweenUses?: number;
    requiredFlags?: string[];
    forbiddenFlags?: string[];
  };
}

// MINIGAME NPC
export interface MinigameNpc extends BaseNpc {
  type: 'minigame';
  minigameConfig: {
    minigameType: 'pokemon_contest' | 'fishing_contest' | 'slots' | 'lottery';
    contestCategory?: string;
    entryFee: number;
    currency: Currency;
    maxParticipants?: number;
    duration?: number; // secondes
  };
  contestCategories?: Array<{
    categoryId: string;
    categoryName: string;
    requiredStat?: string;
    entryFee: number;
    minLevel?: number;
  }>;
  contestRewards: {
    first?: {
      money?: number;
      items?: Array<{ itemId: string; quantity: number }>;
      titles?: string[];
    };
    second?: {
      money?: number;
      items?: Array<{ itemId: string; quantity: number }>;
    };
    third?: {
      money?: number;
      items?: Array<{ itemId: string; quantity: number }>;
    };
    participation?: {
      money?: number;
      items?: Array<{ itemId: string; quantity: number }>;
    };
  };
  contestDialogueIds: {
    welcome: string[];
    rules: string[];
    entry: string[];
    contestStart: string[];
    judging?: string[];
    results: string[];
    winner?: string[];
    loser?: string[];
    noMoney?: string[];
  };
  contestSchedule?: {
    enabled: boolean;
    startTimes?: string[];
    registrationDeadline?: number; // secondes avant début
    waitingRoom?: boolean;
  };
}

// RESEARCHER NPC
export interface ResearcherNpc extends BaseNpc {
  type: 'researcher';
  researchConfig: {
    researchType: 'pokedex' | 'breeding' | 'genetics' | 'evolution';
    specialization: string;
    researchLevel: number;
    acceptDonations?: boolean;
  };
  researchServices: Array<{
    serviceId: string;
    serviceName: string;
    cost: number;
    requirements?: {
      minPokedexEntries?: number;
      minPlayerLevel?: number;
      requiredFlags?: string[];
    };
  }>;
  acceptedPokemon?: {
    forResearch?: string[]; // ["all"] ou liste spécifique
    forBreeding?: string[];
    forAnalysis?: string[];
    restrictions?: {
      noLegendary?: boolean;
      minLevel?: number;
      maxLevel?: number;
    };
  };
  researchDialogueIds: {
    welcome: string[];
    services: string[];
    pokedexCheck?: string[];
    ivAnalysis?: string[];
    breedingAdvice?: string[];
    researchComplete?: string[];
    notEligible?: string[];
  };
  researchRewards?: {
    pokedexMilestones?: Record<string, {
      items: Array<{ itemId: string; quantity: number }>;
    }>;
    researchContribution?: {
      perPokemon: number;
      rareBonus?: number;
      legendaryBonus?: number;
    };
  };
}

// GUILD NPC
export interface GuildNpc extends BaseNpc {
  type: 'guild';
  guildConfig: {
    guildId: string;
    guildName: string;
    factionType: 'neutral' | 'good' | 'evil' | 'criminal' | 'ranger';
    recruitmentOpen: boolean;
    maxMembers?: number;
  };
  recruitmentRequirements: {
    minPlayerLevel: number;
    maxPlayerLevel?: number | null;
    requiredBadges?: string[];
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    alignmentRequired?: 'good' | 'neutral' | 'evil';
    minimumReputation?: number;
  };
  guildServices: Array<{
    serviceId: string;
    serviceName: string;
    memberRankRequired: number;
  }>;
  guildDialogueIds: {
    recruitment: string[];
    welcome: string[];
    services: string[];
    missions?: string[];
    promotion?: string[];
    rejected?: string[];
    traitor?: string[];
  };
  rankSystem?: {
    ranks: Array<{
      rankId: number;
      rankName: string;
      requirements: {
        reputation?: number;
        missionsCompleted?: number;
        timeInGuild?: number; // jours
      };
    }>;
    promotionRewards?: Record<string, {
      items?: Array<{ itemId: string; quantity: number }>;
    }>;
  };
}

// EVENT NPC
export interface EventNpc extends BaseNpc {
  type: 'event';
  eventConfig: {
    eventId: string;
    eventType: 'seasonal' | 'raid' | 'tournament' | 'limited_time';
    eventStatus: 'inactive' | 'active' | 'ended';
    globalEvent: boolean;
  };
  eventPeriod: {
    startDate: string; // ISO string
    endDate: string;
    timezone: string;
    earlyAccess?: {
      enabled: boolean;
      startDate: string;
      requiredFlags: string[];
    };
  };
  eventActivities: Array<{
    activityId: string;
    activityName: string;
    participationFee?: number;
    rewards?: {
      winner?: { items: Array<{ itemId: string; quantity: number }> };
      participation?: { items: Array<{ itemId: string; quantity: number }> };
    };
  }>;
  eventDialogueIds: {
    welcome: string[];
    activities: string[];
    registration: string[];
    results: string[];
    rewards: string[];
    eventEnded: string[];
    notStarted: string[];
  };
  globalProgress?: {
    enabled: boolean;
    targetGoal: number;
    currentProgress: number;
    progressType: string;
    rewards?: Record<string, {
      items: Array<{ itemId: string; quantity: number }>;
    }>;
  };
}

// QUEST MASTER NPC
export interface QuestMasterNpc extends BaseNpc {
  type: 'quest_master';
  questMasterConfig: {
    masterId: string;
    specialization: string;
    questTier: 'normal' | 'rare' | 'epic' | 'legendary';
    maxActiveQuests: number;
  };
  questMasterDialogueIds: {
    welcome: string[];
    questsAvailable: string[];
    questOffer: string[];
    questAccepted: string[];
    questInProgress: string[];
    questComplete: string[];
    notReady: string[];
    tooManyQuests: string[];
    masterRank?: string[];
  };
  questRankSystem?: {
    ranks: Array<{
      rankId: number;
      rankName: string;
      questsRequired: number;
    }>;
    rankRewards?: Record<string, {
      items: Array<{ itemId: string; quantity: number }>;
    }>;
  };
  epicRewards?: Record<string, {
    money: number;
    items: Array<{ itemId: string; quantity: number }>;
    titles: string[];
  }>;
  specialConditions?: {
    timeRestrictions?: {
      enabled: boolean;
      allowedTimes?: TimeOfDay[];
    };
    weatherRequirements?: {
      enabled: boolean;
      requiredWeather?: Weather[];
    };
    playerAlignment?: {
      required: 'good' | 'neutral' | 'evil';
      minKarma?: number;
    };
  };
}

// ===== UNION TYPE POUR TOUS LES NPCs =====

export type AnyNpc = 
  | DialogueNpc
  | MerchantNpc
  | TrainerNpc
  | HealerNpc
  | GymLeaderNpc
  | TransportNpc
  | ServiceNpc
  | MinigameNpc
  | ResearcherNpc
  | GuildNpc
  | EventNpc
  | QuestMasterNpc;

// ===== UNION TYPE POUR LES COMBATTANTS =====

export type AnyBattlerNpc = TrainerNpc | GymLeaderNpc;

// ===== INTERFACE ZONE NPCs =====

export interface NpcZoneData {
  zone: string;
  version: string;
  lastUpdated: string;
  description?: string;
  translationSystem?: {
    description: string;
    structure: string;
    fallback: string;
    implementation: string;
  };
  npcs: AnyNpc[];
  globalSettings?: {
    maxSimultaneousInteractions?: number;
    globalInteractionCooldown?: number;
    npcRespawnTime?: number;
    enableNpcMovement?: boolean;
    enableNpcSchedules?: boolean;
  };
  questSystem?: {
    description: string;
    properties: Record<string, string>;
    examples: Record<string, string>;
  };
  metadata?: {
    createdBy?: string;
    lastModifiedBy?: string;
    totalNpcs?: number;
    npcsByType?: Record<string, number>;
    translationIds?: {
      totalIds: number;
      byContext: Record<string, number>;
    };
    validated?: boolean;
    notes?: string;
  };
}

// ===== TYPES HELPER POUR VALIDATION =====

export interface NpcValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface NpcTypeGuards {
  isBattlerNpc(npc: AnyNpc): npc is BattlerNpc;
  isDialogueNpc(npc: AnyNpc): npc is DialogueNpc;
  isMerchantNpc(npc: AnyNpc): npc is MerchantNpc;
  isTrainerNpc(npc: AnyNpc): npc is TrainerNpc;
  isHealerNpc(npc: AnyNpc): npc is HealerNpc;
  isGymLeaderNpc(npc: AnyNpc): npc is GymLeaderNpc;
  isTransportNpc(npc: AnyNpc): npc is TransportNpc;
  isServiceNpc(npc: AnyNpc): npc is ServiceNpc;
  isMinigameNpc(npc: AnyNpc): npc is MinigameNpc;
  isResearcherNpc(npc: AnyNpc): npc is ResearcherNpc;
  isGuildNpc(npc: AnyNpc): npc is GuildNpc;
  isEventNpc(npc: AnyNpc): npc is EventNpc;
  isQuestMasterNpc(npc: AnyNpc): npc is QuestMasterNpc;
}

// ===== EXPORT DES CONSTANTES =====

export const NPC_TYPES: readonly NpcType[] = [
  'dialogue',
  'merchant', 
  'trainer',
  'healer',
  'gym_leader',
  'transport',
  'service',
  'minigame',
  'researcher',
  'guild',
  'event',
  'quest_master'
] as const;

export const DIRECTIONS: readonly Direction[] = [
  'north',
  'south', 
  'east',
  'west'
] as const;

export const TIMES_OF_DAY: readonly TimeOfDay[] = [
  'morning',
  'day',
  'evening', 
  'night'
] as const;

export const WEATHER_CONDITIONS: readonly Weather[] = [
  'sunny',
  'rain',
  'storm',
  'snow',
  'fog',
  'heavy_rain'
] as const;

export const CURRENCIES: readonly Currency[] = [
  'gold',
  'tokens',
  'points'
] as const;
