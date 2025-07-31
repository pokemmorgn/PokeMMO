// server/src/types/QuestTypes.ts - VERSION MISE À JOUR

export interface QuestObjective {
  id: string;
  type: 'collect' | 'defeat' | 'talk' | 'reach' | 'deliver';
  description: string;
  target?: string;
  targetName?: string;
  itemId?: string;
  currentAmount: number;
  requiredAmount: number;
  completed: boolean;
  validationDialogue?: string[]; // ✅ NOUVEAU: Dialogue quand objectif validé
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
  prerequisites?: string[];
  steps: QuestStep[];
  currentStepIndex: number;
  status: 'available' | 'active' | 'readyToComplete' | 'completed' | 'failed'; // ✅ AJOUT readyToComplete
  startNpcId?: number;
  endNpcId?: number;
  isRepeatable: boolean;
  cooldownHours?: number;
  lastCompletedAt?: Date;
}

export interface PlayerQuestProgress {
  questId: string;
  currentStepIndex: number;
  objectives: Map<string, {
    currentAmount: number;
    completed: boolean;
  }>;
  status: 'active' | 'readyToComplete' | 'completed' | 'failed'; // ✅ AJOUT readyToComplete
  startedAt: Date;
  completedAt?: Date;
}

export interface QuestProgressEvent {
  type: 'collect' | 'defeat' | 'talk' | 'reach' | 'deliver';
  targetId?: string;
  amount?: number;
  location?: { x: number; y: number; map: string };
  pokemonId?: number;
  npcId?: number;
  questId?: string; // ✅ NOUVEAU pour completion manuelle
}

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
  autoComplete?: boolean; // ✅ NOUVEAU FLAG
  dialogues?: { // ✅ NOUVEAU: Dialogues spécifiques
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
    postQuestDialogue?: string[];
  };
  steps: {
    id: string;
    name: string;
    description: string;
    objectives: {
      id: string;
      type: 'collect' | 'defeat' | 'talk' | 'reach' | 'deliver';
      description: string;
      target?: string;
      targetName?: string;
      itemId?: string;
      requiredAmount: number;
      validationDialogue?: string[]; // ✅ NOUVEAU: Dialogue de validation
    }[];
    rewards?: QuestReward[];
  }[];
}
