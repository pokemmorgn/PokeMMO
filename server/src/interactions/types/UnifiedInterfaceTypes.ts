// server/src/interactions/types/UnifiedInterfaceTypes.ts
// Types pour l'interface unifiée des NPCs multi-fonctionnels
// ✅ VERSION MISE À JOUR : Support de la capacité 'deliver'

// ===== TYPES DE CAPACITÉS NPCs =====

export type NpcCapability = 
  | 'dialogue'
  | 'merchant'
  | 'quest'
  | 'healer'
  | 'trainer'
  | 'transport'
  | 'service'
  | 'minigame'
  | 'researcher'
  | 'guild'
  | 'event'
  | 'quest_master'
  | 'deliver';  // ✅ DÉJÀ PRÉSENT

// ===== INTERFACES POUR CHAQUE SECTION DE DONNÉES =====

export interface MerchantData {
  shopId: string;
  shopInfo: {
    name: string;
    currency: 'gold' | 'tokens' | 'points';
    shopType?: string;
  };
  availableItems: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    category?: string;
    description?: string;
  }>;
  playerGold: number;
  welcomeDialogue: string[];
  canBuy: boolean;
  canSell: boolean;
  restrictions?: {
    minLevel?: number;
    requiredBadges?: string[];
    vipOnly?: boolean;
  };
}

export interface QuestData {
  availableQuests: Array<{
    id: string;
    name: string;
    description: string;
    difficulty: 'Très Facile' | 'Facile' | 'Moyen' | 'Difficile' | 'Très Difficile';
    category?: string;
    estimatedTime?: string;
    rewards?: Array<{
      type: 'item' | 'gold' | 'experience';
      itemId?: string;
      amount: number;
    }>;
  }>;
  questsInProgress: Array<{
    id: string;
    name: string;
    progress: string;
    canComplete: boolean;
  }>;
  questsToComplete: Array<{
    id: string;
    name: string;
    rewards: Array<{
      type: 'item' | 'gold' | 'experience';
      itemId?: string;
      amount: number;
    }>;
  }>;
  questDialogue: string[];
  canGiveQuests: boolean;
  canCompleteQuests: boolean;
}

// ✅ NOUVEAU : Interface pour les données de livraison
export interface DeliveryData {
  npcId: string;
  npcName: string;
  deliveries: Array<{
    questId: string;
    questName: string;
    stepIndex: number;
    stepName: string;
    objectiveId: string;
    objectiveDescription: string;
    itemId: string;
    itemName: string;
    requiredAmount: number;
    playerHasAmount: number;
    canDeliver: boolean;
    isCompleted: boolean;
    npcId: string;
  }>;
  allItemsAvailable: boolean;
  totalDeliveries: number;
  readyDeliveries: number;
  welcomeDialogue: string[];
  canDeliverAny: boolean;
}

export interface DialogueData {
  lines: string[];
  conditionalLines?: Record<string, string[]>;
  npcPersonality?: {
    mood: 'friendly' | 'neutral' | 'grumpy' | 'excited';
    topics: string[];
  };
  zoneInfo?: {
    zoneName: string;
    connections: string[];
    wildPokemon?: Array<{
      name: string;
      level: string;
      rarity: string;
    }>;
    landmarks?: string[];
  };
}

export interface HealerData {
  healingType: 'free' | 'paid' | 'pokemon_center';
  cost: number;
  currency: 'gold' | 'tokens' | 'points';
  services: Array<{
    serviceId: string;
    serviceName: string;
    description: string;
    cost: number;
  }>;
  playerPokemonStatus: {
    needsHealing: boolean;
    pokemonCount: number;
    injuredCount: number;
  };
  welcomeDialogue: string[];
  canHeal: boolean;
}

export interface TrainerData {
  trainerId: string;
  trainerClass: string;
  trainerRank?: number;
  battleType: 'single' | 'double' | 'multi';
  teamPreview?: Array<{
    name: string;
    level: number;
    type: string[];
  }>;
  battleConditions?: {
    minLevel?: number;
    maxLevel?: number;
    requiredBadges?: string[];
  };
  battleDialogue: string[];
  rewards: {
    money: number;
    items?: Array<{ itemId: string; quantity: number }>;
  };
  canBattle: boolean;
  reasonIfCannot?: string;
}

export interface TransportData {
  transportType: 'boat' | 'train' | 'fly' | 'teleport';
  destinations: Array<{
    mapId: string;
    mapName: string;
    cost: number;
    currency: 'gold' | 'tokens' | 'points';
    travelTime: number;
    available: boolean;
    reasonIfUnavailable?: string;
  }>;
  playerCanAfford: Record<string, boolean>;
  schedules?: Array<{
    destination: string;
    departTime: string;
    arrivalTime: string;
  }>;
  welcomeDialogue: string[];
}

export interface ServiceData {
  serviceType: 'name_rater' | 'move_deleter' | 'move_reminder' | 'iv_checker';
  availableServices: Array<{
    serviceId: string;
    serviceName: string;
    description: string;
    cost: number;
    available: boolean;
    requirements?: string[];
  }>;
  playerCanUse: Record<string, boolean>;
  welcomeDialogue: string[];
}

// ===== INTERFACE PRINCIPALE =====

export interface UnifiedInterfaceResult {
  success: true;
  type: "unifiedInterface";
  message?: string;
  
  // Informations NPC
  npcId: number;
  npcName: string;
  npcSprite?: string;
  
  // Capacités détectées
  capabilities: NpcCapability[];
  defaultAction: NpcCapability; // Action suggérée par défaut
  
  // Données pré-chargées par capacité (optionnelles selon NPC)
  merchantData?: MerchantData;
  questData?: QuestData;
  dialogueData?: DialogueData;
  healerData?: HealerData;
  trainerData?: TrainerData;
  transportData?: TransportData;
  serviceData?: ServiceData;
  deliveryData?: DeliveryData;  // ✅ NOUVEAU : Données de livraison
  
  // Métadonnées interface
  interfaceConfig?: {
    tabOrder: NpcCapability[]; // Ordre d'affichage des onglets
    primaryTab: NpcCapability; // Onglet ouvert par défaut
    theme?: 'default' | 'shop' | 'quest' | 'battle' | 'delivery';  // ✅ NOUVEAU : thème delivery
    customCss?: string;
  };
  
  // Actions rapides (boutons principaux)
  quickActions?: Array<{
    actionType: NpcCapability;
    label: string;
    icon?: string;
    enabled: boolean;
    reasonIfDisabled?: string;
  }>;
}

// ===== TYPES POUR LES ACTIONS SPÉCIFIQUES =====

export interface SpecificActionRequest {
  npcId: number;
  actionType: NpcCapability;
  actionData?: {
    // Pour merchant
    shopAction?: 'buy' | 'sell';
    itemId?: string;
    quantity?: number;
    
    // Pour quest
    questAction?: 'start' | 'complete' | 'abandon';
    questId?: string;
    
    // ✅ NOUVEAU : Pour deliver
    deliveryAction?: 'deliver_item' | 'deliver_all';
    deliveryData?: {
      questId: string;
      objectiveId: string;
      itemId: string;
      requiredAmount: number;
    };
    
    // Pour healer
    healAction?: 'heal_all' | 'heal_specific' | 'check_status';
    pokemonIndex?: number;
    
    // Pour trainer
    battleAction?: 'challenge' | 'decline';
    
    // Pour transport
    transportAction?: 'travel' | 'schedule';
    destinationId?: string;
    
    // Pour service
    serviceAction?: 'use_service';
    serviceId?: string;
    
    // Données supplémentaires selon le contexte
    additionalData?: Record<string, any>;
  };
}

export interface SpecificActionResult {
  success: boolean;
  type: string;
  message?: string;
  actionType: NpcCapability;
  npcId: number;
  
  // Données spécifiques au résultat
  transactionResult?: {
    success: boolean;
    message: string;
    newGold?: number;
    itemsChanged?: any[];
  };
  
  questResult?: {
    success: boolean;
    message: string;
    questStarted?: any;
    questCompleted?: any;
    rewards?: any[];
  };
  
  // ✅ NOUVEAU : Résultat de livraison
  deliveryResult?: {
    success: boolean;
    message: string;
    itemsDelivered?: Array<{
      itemId: string;
      amount: number;
    }>;
    questProgressed?: boolean;
    questCompleted?: boolean;
    errorCode?: string;
  };
  
  battleResult?: {
    success: boolean;
    battleId?: string;
    battleStarted?: boolean;
    reason?: string;
  };
  
  // Mise à jour de l'interface (optionnel)
  interfaceUpdate?: {
    updateCapabilities?: NpcCapability[];
    newData?: Partial<UnifiedInterfaceResult>;
    refreshRequired?: boolean;
  };
}

// ===== TYPES HELPER =====

export interface CapabilityAnalysis {
  capability: NpcCapability;
  available: boolean;
  priority: number; // 1-10, 10 = priorité max
  reason?: string; // Si non disponible
  dataFetcher: () => Promise<any>; // Fonction pour récupérer les données
}

export interface UnifiedInterfaceConfig {
  enabledCapabilities: NpcCapability[];
  capabilityPriority: Record<NpcCapability, number>;
  defaultTabByType: Record<string, NpcCapability>;
  quickActionLabels: Record<NpcCapability, string>;
  debug: boolean;
}

// ===== CONSTANTES MISES À JOUR =====

export const CAPABILITY_LABELS: Record<NpcCapability, string> = {
  merchant: '🛒 Boutique',
  quest: '💬 Quêtes',
  dialogue: '🗣️ Discussion',
  healer: '🏥 Soins',
  trainer: '⚔️ Combat',
  transport: '🚗 Transport',
  service: '🔧 Services',
  minigame: '🎮 Mini-jeux',
  researcher: '🔬 Recherche',
  guild: '🏛️ Guilde',
  event: '🎉 Événement',
  quest_master: '👑 Maître des Quêtes',
  deliver: '📦 Livraison'  // ✅ NOUVEAU
};

export const CAPABILITY_ICONS: Record<NpcCapability, string> = {
  merchant: '🛒',
  quest: '💬',
  dialogue: '🗣️',
  healer: '🏥',
  trainer: '⚔️',
  transport: '🚗',
  service: '🔧',
  minigame: '🎮',
  researcher: '🔬',
  guild: '🏛️',
  event: '🎉',
  quest_master: '👑',
  deliver: '📦'  // ✅ NOUVEAU
};

export const DEFAULT_CAPABILITY_PRIORITY: Record<NpcCapability, number> = {
  quest_master: 10,
  event: 9,
  deliver: 8,  // ✅ NOUVEAU : Priorité élevée pour les livraisons
  guild: 7,    // ✅ AJUSTÉ : -1
  trainer: 6,  // ✅ AJUSTÉ : -1
  merchant: 5, // ✅ AJUSTÉ : -1
  healer: 4,   // ✅ AJUSTÉ : -1
  transport: 3, // ✅ AJUSTÉ : -1
  service: 2,  // ✅ AJUSTÉ : -1
  researcher: 1, // ✅ AJUSTÉ : -1
  minigame: 1,   // ✅ INCHANGÉ
  quest: 1,      // ✅ INCHANGÉ
  dialogue: 0    // ✅ INCHANGÉ : Toujours en dernier
};
