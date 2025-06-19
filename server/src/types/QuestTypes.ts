// server/src/types/QuestTypes.ts

export interface QuestObjective {
  id: string;
  type: 'collect' | 'defeat' | 'talk' | 'reach';
  description: string;
  target?: string; // ID de l'objet, Pokémon, NPC, ou zone
  targetName?: string; // Nom affiché à l'utilisateur
  currentAmount: number;
  requiredAmount: number;
  completed: boolean;
}

export interface QuestReward {
  type: 'gold' | 'item' | 'pokemon' | 'experience';
  itemId?: string;
  amount?: number;
  pokemonId?: number;
}

export interface QuestStep {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards?: QuestReward[];
  completed: boolean;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  category: 'main' | 'side' | 'daily' | 'repeatable';
  prerequisites?: string[]; // IDs des quêtes requises
  steps: QuestStep[];
  currentStepIndex: number;
  status: 'available' | 'active' | 'completed' | 'failed';
  startNpcId?: number;
  endNpcId?: number;
  isRepeatable: boolean;
  cooldownHours?: number; // Pour les quêtes répétables
  lastCompletedAt?: Date;
}

export interface PlayerQuestProgress {
  questId: string;
  currentStepIndex: number;
  objectives: {
    [objectiveId: string]: {
      currentAmount: number;
      completed: boolean;
    };
  };
  status: 'active' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

// Types pour les événements de progression
export interface QuestProgressEvent {
  type: 'collect' | 'defeat' | 'talk' | 'reach';
  targetId?: string;
  amount?: number;
  location?: { x: number; y: number; map: string };
  pokemonId?: number;
  npcId?: number;
}

// Interface pour les définitions de quêtes (JSON)
export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  category: 'main' | 'side' | 'daily' | 'repeatable';
  prerequisites?: string[];
  startNpcId?: number;
  endNpcId?: number;
  isRepeatable: boolean;
  cooldownHours?: number;
  steps: {
    id: string;
    name: string;
    description: string;
    objectives: {
      id: string;
      type: 'collect' | 'defeat' | 'talk' | 'reach';
      description: string;
      target?: string;
      targetName?: string;
      requiredAmount: number;
    }[];
    rewards?: QuestReward[];
  }[];
}
