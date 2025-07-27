// server/src/Intelligence/NPCSystem/NPCMemoryManager.ts

/**
 * 🧠 NPC MEMORY MANAGER - MÉMOIRE PERSISTANTE DES NPCs
 * 
 * Gère la mémoire de chaque NPC pour chaque joueur :
 * - Sauvegarde de chaque interaction NPC-joueur
 * - Évolution des relations (points de relation -100 à +100)
 * - Apprentissage des préférences et habitudes du joueur
 * - Contexte pour dialogues futurs personnalisés
 * - Partage de connaissances entre NPCs du même type
 * 
 * OBJECTIF : NPCs qui se souviennent personnellement de chaque joueur
 */

import { 
  NPCMemoryModel,
  type INPCMemoryDocument 
} from '../Core/DatabaseSchema';

import { PlayerBehaviorAnalyzer, getPlayerBehaviorAnalyzer } from '../Analysis/PlayerBehaviorAnalyzer';
import type { BehaviorProfile } from '../Analysis/PlayerBehaviorAnalyzer';

import { BasicStatsCalculator, getBasicStatsCalculator } from '../Analysis/BasicStatsCalculator';
import type { BasicPlayerStats } from '../Analysis/BasicStatsCalculator';

import { ActionType } from '../Core/ActionTypes';

// ===================================================================
// 🧠 INTERFACES DE MÉMOIRE NPC
// ===================================================================

/**
 * Mémoire d'un NPC pour un joueur spécifique
 */
export interface NPCMemory {
  npcId: string;
  playerId: string;
  
  // Niveau de relation (-100 à +100)
  relationshipLevel: number;
  
  // Faits connus sur le joueur
  knownFacts: {
    favoriteActivity: string; // 'combat', 'exploration', 'collection', 'social'
    skillLevel: string; // 'beginner', 'intermediate', 'advanced', 'expert'
    personalityTraits: string[]; // ['patient', 'competitive', 'social', 'explorer']
    helpHistory: string[]; // Types d'aide fournis
    achievements: string[]; // Accomplissements observés
    preferences: {
      dialogueStyle: 'formal' | 'casual' | 'encouraging' | 'direct';
      helpLevel: 'minimal' | 'guided' | 'detailed';
      socialInteraction: 'brief' | 'normal' | 'extended';
    };
  };
  
  // Dernière interaction
  lastInteraction: {
    timestamp: number;
    playerMood: string; // 'happy', 'frustrated', 'neutral', 'excited', 'bored'
    topicDiscussed: string;
    outcome: 'positive' | 'neutral' | 'negative';
    helpProvided?: string;
    questsGiven?: string[];
    itemsTraded?: string[];
  };
  
  // Historique des interactions
  interactionHistory: {
    date: number;
    type: string; // 'dialogue', 'quest', 'trade', 'help'
    mood: string;
    outcome: string;
    notes: string;
  }[];
  
  // Métadonnées
  firstMet: number;
  totalInteractions: number;
  lastUpdated: number;
}

/**
 * Événement d'interaction avec un NPC
 */
export interface NPCInteractionEvent {
  npcId: string;
  playerId: string;
  interactionType: 'dialogue' | 'quest_give' | 'quest_complete' | 'trade' | 'help' | 'battle';
  playerMood?: string;
  outcome: 'positive' | 'neutral' | 'negative';
  context: {
    location: { map: string; x: number; y: number };
    timestamp: number;
    sessionDuration?: number;
    recentActions?: string[]; // Actions récentes du joueur
  };
  details?: {
    topicDiscussed?: string;
    helpProvided?: string;
    questId?: string;
    itemsTraded?: { given: string[]; received: string[] };
    playerResponse?: string;
  };
}

/**
 * Configuration du memory manager
 */
export interface NPCMemoryConfig {
  // Gestion des relations
  relationshipDecay: number; // Points perdus par jour d'inactivité
  maxRelationshipGain: number; // Gain max par interaction positive
  maxRelationshipLoss: number; // Perte max par interaction négative
  
  // Apprentissage
  learningRate: number; // Vitesse d'adaptation des préférences
  forgettingRate: number; // Vitesse d'oubli des anciennes infos
  
  // Performance
  maxInteractionHistory: number; // Max interactions en mémoire
  memoryUpdateBatchSize: number; // Taille des lots de mise à jour
  cacheExpiryMinutes: number; // Expiration cache
  
  // Partage entre NPCs
  enableKnowledgeSharing: boolean;
  sharingRadius: number; // Distance max pour partage d'infos
  sharingTypes: string[]; // Types de NPCs qui partagent
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - NPC MEMORY MANAGER
// ===================================================================

export class NPCMemoryManager {
  private behaviorAnalyzer: PlayerBehaviorAnalyzer;
  private statsCalculator: BasicStatsCalculator;
  private config: NPCMemoryConfig;
  
  // Cache en mémoire pour performance
  private memoryCache: Map<string, NPCMemory> = new Map(); // key: npcId_playerId
  private cacheExpiry: Map<string, number> = new Map();
  
  // Queue des interactions à traiter
  private interactionQueue: NPCInteractionEvent[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  
  // Statistiques
  private stats = {
    totalMemories: 0,
    interactionsProcessed: 0,
    relationshipsFormed: 0,
    averageRelationshipLevel: 0,
    knowledgeShared: 0
  };

  constructor(config?: Partial<NPCMemoryConfig>) {
    this.behaviorAnalyzer = getPlayerBehaviorAnalyzer();
    this.statsCalculator = getBasicStatsCalculator();
    
    this.config = {
      relationshipDecay: 0.5, // 0.5 points par jour
      maxRelationshipGain: 10,
      maxRelationshipLoss: 15,
      learningRate: 0.2,
      forgettingRate: 0.05,
      maxInteractionHistory: 50,
      memoryUpdateBatchSize: 10,
      cacheExpiryMinutes: 30,
      enableKnowledgeSharing: true,
      sharingRadius: 500, // pixels
      sharingTypes: ['professor', 'nurse', 'guide'],
      ...config
    };

    console.log('🧠 NPCMemoryManager initialisé', this.config);
    this.startInteractionProcessing();
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 🎯 MÉTHODES PRINCIPALES DE GESTION MÉMOIRE
  // ===================================================================

  /**
   * Récupère ou crée la mémoire d'un NPC pour un joueur
   */
  async getNPCMemory(npcId: string, playerId: string): Promise<NPCMemory | null> {
    const cacheKey = `${npcId}_${playerId}`;
    
    // Vérifier le cache
    const cached = this.getCachedMemory(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer depuis la base de données
      const memoryDoc = await NPCMemoryModel.findOne({ npcId, playerId }).lean();
      
      if (memoryDoc) {
        const memory = this.convertFromDatabase(memoryDoc);
        this.cacheMemory(cacheKey, memory);
        return memory;
      }
      
      // Créer une nouvelle mémoire
      const newMemory = await this.createNewMemory(npcId, playerId);
      if (newMemory) {
        this.cacheMemory(cacheKey, newMemory);
      }
      
      return newMemory;

    } catch (error) {
      console.error(`❌ Erreur récupération mémoire NPC ${npcId} pour ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Enregistre une interaction avec un NPC
   */
  async recordInteraction(interaction: NPCInteractionEvent): Promise<boolean> {
    try {
      // Ajouter à la queue pour traitement asynchrone
      this.interactionQueue.push(interaction);
      
      // Traitement immédiat si queue pleine
      if (this.interactionQueue.length >= this.config.memoryUpdateBatchSize) {
        await this.processInteractionQueue();
      }
      
      console.log(`🗣️ Interaction enregistrée: ${interaction.npcId} ↔ ${interaction.playerId}`);
      return true;

    } catch (error) {
      console.error(`❌ Erreur enregistrement interaction:`, error);
      return false;
    }
  }

  /**
   * Met à jour la mémoire après interaction
   */
  async updateMemoryAfterInteraction(
    npcId: string,
    playerId: string,
    interaction: NPCInteractionEvent
  ): Promise<NPCMemory | null> {
    try {
      // Récupérer la mémoire existante
      let memory = await this.getNPCMemory(npcId, playerId);
      if (!memory) {
        console.warn(`⚠️ Impossible de récupérer/créer mémoire pour ${npcId}/${playerId}`);
        return null;
      }

      // Mettre à jour le niveau de relation
      memory = this.updateRelationshipLevel(memory, interaction);
      
      // Apprendre sur le joueur
      memory = await this.learnAboutPlayer(memory, interaction);
      
      // Mettre à jour l'historique
      memory = this.updateInteractionHistory(memory, interaction);
      
      // Sauvegarder en base de données
      await this.saveMemoryToDatabase(memory);
      
      // Mettre à jour le cache
      const cacheKey = `${npcId}_${playerId}`;
      this.cacheMemory(cacheKey, memory);
      
      this.stats.interactionsProcessed++;
      
      return memory;

    } catch (error) {
      console.error(`❌ Erreur mise à jour mémoire:`, error);
      return null;
    }
  }

  /**
   * Partage des connaissances entre NPCs proches
   */
  async shareKnowledge(
    sourceNpcId: string,
    targetNpcId: string,
    playerId: string,
    sharedInfo: Partial<NPCMemory['knownFacts']>
  ): Promise<boolean> {
    if (!this.config.enableKnowledgeSharing) return false;

    try {
      const targetMemory = await this.getNPCMemory(targetNpcId, playerId);
      if (!targetMemory) return false;

      // Fusionner les connaissances avec un facteur de confiance réduit
      if (sharedInfo.personalityTraits) {
        targetMemory.knownFacts.personalityTraits = [
          ...new Set([...targetMemory.knownFacts.personalityTraits, ...sharedInfo.personalityTraits])
        ];
      }

      if (sharedInfo.favoriteActivity && !targetMemory.knownFacts.favoriteActivity) {
        targetMemory.knownFacts.favoriteActivity = sharedInfo.favoriteActivity;
      }

      if (sharedInfo.skillLevel && !targetMemory.knownFacts.skillLevel) {
        targetMemory.knownFacts.skillLevel = sharedInfo.skillLevel;
      }

      // Sauvegarder
      await this.saveMemoryToDatabase(targetMemory);
      
      this.stats.knowledgeShared++;
      console.log(`🔄 Connaissances partagées: ${sourceNpcId} → ${targetNpcId} pour ${playerId}`);
      
      return true;

    } catch (error) {
      console.error(`❌ Erreur partage connaissances:`, error);
      return false;
    }
  }

  // ===================================================================
  // 🔧 MÉTHODES PRIVÉES DE TRAITEMENT
  // ===================================================================

  /**
   * Crée une nouvelle mémoire pour un NPC
   */
  private async createNewMemory(npcId: string, playerId: string): Promise<NPCMemory | null> {
    try {
      // Analyser le joueur pour initialiser la mémoire
      const [behaviorProfile, playerStats] = await Promise.all([
        this.behaviorAnalyzer.generateBehaviorProfile(playerId),
        this.statsCalculator.calculatePlayerStats(playerId)
      ]);

      const now = Date.now();
      
      const memory: NPCMemory = {
        npcId,
        playerId,
        relationshipLevel: 0, // Neutre au début
        knownFacts: {
          favoriteActivity: behaviorProfile?.predictions.nextAction || 'exploration',
          skillLevel: this.determineSkillLevel(playerStats),
          personalityTraits: this.extractPersonalityTraits(behaviorProfile),
          helpHistory: [],
          achievements: [],
          preferences: {
            dialogueStyle: this.determineDialogueStyle(behaviorProfile),
            helpLevel: this.determineHelpLevel(behaviorProfile),
            socialInteraction: this.determineSocialInteraction(behaviorProfile)
          }
        },
        lastInteraction: {
          timestamp: now,
          playerMood: 'neutral',
          topicDiscussed: 'first_meeting',
          outcome: 'neutral'
        },
        interactionHistory: [],
        firstMet: now,
        totalInteractions: 0,
        lastUpdated: now
      };

      // Sauvegarder en base
      await this.saveMemoryToDatabase(memory);
      
      this.stats.totalMemories++;
      console.log(`🆕 Nouvelle mémoire créée: ${npcId} pour ${playerId}`);
      
      return memory;

    } catch (error) {
      console.error(`❌ Erreur création nouvelle mémoire:`, error);
      return null;
    }
  }

  /**
   * Met à jour le niveau de relation
   */
  private updateRelationshipLevel(memory: NPCMemory, interaction: NPCInteractionEvent): NPCMemory {
    let change = 0;
    
    switch (interaction.outcome) {
      case 'positive':
        change = Math.min(this.config.maxRelationshipGain, 
          2 + (interaction.interactionType === 'help' ? 3 : 0));
        break;
      case 'negative':
        change = -Math.min(this.config.maxRelationshipLoss, 5);
        break;
      case 'neutral':
        change = 1; // Petit gain pour simple interaction
        break;
    }
    
    // Bonus/malus selon le type d'interaction
    if (interaction.interactionType === 'quest_complete') change += 2;
    if (interaction.interactionType === 'trade') change += 1;
    
    memory.relationshipLevel = Math.max(-100, Math.min(100, memory.relationshipLevel + change));
    
    return memory;
  }

  /**
   * Apprend sur le joueur à partir de l'interaction
   */
  private async learnAboutPlayer(memory: NPCMemory, interaction: NPCInteractionEvent): Promise<NPCMemory> {
    try {
      // Récupérer le profil comportemental actuel
      const behaviorProfile = await this.behaviorAnalyzer.generateBehaviorProfile(interaction.playerId);
      if (!behaviorProfile) return memory;

      // Mise à jour de l'activité favorite
      const currentActivity = this.mapActionToActivity(interaction.interactionType);
      if (currentActivity) {
        memory.knownFacts.favoriteActivity = this.adaptiveLearn(
          memory.knownFacts.favoriteActivity,
          currentActivity,
          this.config.learningRate
        );
      }

      // Mise à jour du niveau de skill
      const currentSkillLevel = this.determineSkillLevel(await this.statsCalculator.calculatePlayerStats(interaction.playerId));
      if (currentSkillLevel !== memory.knownFacts.skillLevel) {
        memory.knownFacts.skillLevel = currentSkillLevel;
      }

      // Mise à jour des traits de personnalité
      const newTraits = this.extractPersonalityTraits(behaviorProfile);
      memory.knownFacts.personalityTraits = this.mergeTraits(
        memory.knownFacts.personalityTraits,
        newTraits
      );

      // Apprendre les préférences de dialogue
      if (interaction.playerMood) {
        memory.knownFacts.preferences.dialogueStyle = this.adaptDialogueStyle(
          memory.knownFacts.preferences.dialogueStyle,
          interaction.playerMood,
          interaction.outcome
        );
      }

      // Enregistrer l'aide fournie
      if (interaction.details?.helpProvided) {
        memory.knownFacts.helpHistory.push(interaction.details.helpProvided);
        // Garder seulement les 10 derniers
        memory.knownFacts.helpHistory = memory.knownFacts.helpHistory.slice(-10);
      }

      return memory;

    } catch (error) {
      console.error(`❌ Erreur apprentissage sur joueur:`, error);
      return memory;
    }
  }

  /**
   * Met à jour l'historique des interactions
   */
  private updateInteractionHistory(memory: NPCMemory, interaction: NPCInteractionEvent): NPCMemory {
    // Mettre à jour la dernière interaction
    memory.lastInteraction = {
      timestamp: interaction.context.timestamp,
      playerMood: interaction.playerMood || 'neutral',
      topicDiscussed: interaction.details?.topicDiscussed || interaction.interactionType,
      outcome: interaction.outcome,
      helpProvided: interaction.details?.helpProvided,
      questsGiven: interaction.details?.questId ? [interaction.details.questId] : undefined,
      itemsTraded: interaction.details?.itemsTraded ? 
        [...(interaction.details.itemsTraded.given || []), ...(interaction.details.itemsTraded.received || [])] : undefined
    };

    // Ajouter à l'historique
    memory.interactionHistory.unshift({
      date: interaction.context.timestamp,
      type: interaction.interactionType,
      mood: interaction.playerMood || 'neutral',
      outcome: interaction.outcome,
      notes: interaction.details?.topicDiscussed || ''
    });

    // Limiter la taille de l'historique
    memory.interactionHistory = memory.interactionHistory.slice(0, this.config.maxInteractionHistory);
    
    memory.totalInteractions++;
    memory.lastUpdated = Date.now();

    return memory;
  }

  // ===================================================================
  // 🧠 MÉTHODES D'ANALYSE ET ADAPTATION
  // ===================================================================

  /**
   * Détermine le niveau de skill d'un joueur
   */
  private determineSkillLevel(playerStats: BasicPlayerStats | null): string {
    if (!playerStats) return 'beginner';
    
    const winRate = playerStats.gameplay.winRate;
    const questsCompleted = playerStats.gameplay.questsCompleted;
    const pokemonCaught = playerStats.gameplay.pokemonCaught;
    
    // Score composite
    const skillScore = (winRate * 0.4) + 
                     (Math.min(1, questsCompleted / 20) * 0.3) + 
                     (Math.min(1, pokemonCaught / 50) * 0.3);
    
    if (skillScore > 0.8) return 'expert';
    if (skillScore > 0.6) return 'advanced';
    if (skillScore > 0.3) return 'intermediate';
    return 'beginner';
  }

  /**
   * Extrait les traits de personnalité du profil comportemental
   */
  private extractPersonalityTraits(behaviorProfile: BehaviorProfile | null): string[] {
    if (!behaviorProfile) return [];
    
    const traits: string[] = [];
    const personality = behaviorProfile.personality;
    
    if (personality.frustrationTolerance > 0.7) traits.push('patient');
    if (personality.frustrationTolerance < 0.3) traits.push('impatient');
    if (personality.competitiveness > 0.7) traits.push('competitive');
    if (personality.socialness > 0.7) traits.push('social');
    if (personality.socialness < 0.3) traits.push('solitary');
    if (personality.explorationTendency > 0.7) traits.push('explorer');
    if (personality.riskTaking > 0.7) traits.push('bold');
    if (personality.riskTaking < 0.3) traits.push('cautious');
    
    return traits;
  }

  /**
   * Détermine le style de dialogue préféré
   */
  private determineDialogueStyle(behaviorProfile: BehaviorProfile | null): NPCMemory['knownFacts']['preferences']['dialogueStyle'] {
    if (!behaviorProfile) return 'casual';
    
    const personality = behaviorProfile.personality;
    
    if (personality.socialness > 0.7) return 'casual';
    if (personality.competitiveness > 0.7) return 'direct';
    if (behaviorProfile.currentState.needsHelp) return 'encouraging';
    
    return 'formal';
  }

  /**
   * Détermine le niveau d'aide préféré
   */
  private determineHelpLevel(behaviorProfile: BehaviorProfile | null): NPCMemory['knownFacts']['preferences']['helpLevel'] {
    if (!behaviorProfile) return 'guided';
    
    if (behaviorProfile.currentState.needsHelp) return 'detailed';
    if (behaviorProfile.personality.patience < 0.3) return 'minimal';
    
    return 'guided';
  }

  /**
   * Détermine le niveau d'interaction sociale préféré
   */
  private determineSocialInteraction(behaviorProfile: BehaviorProfile | null): NPCMemory['knownFacts']['preferences']['socialInteraction'] {
    if (!behaviorProfile) return 'normal';
    
    const socialness = behaviorProfile.personality.socialness;
    
    if (socialness > 0.7) return 'extended';
    if (socialness < 0.3) return 'brief';
    
    return 'normal';
  }

  /**
   * Apprentissage adaptatif d'une valeur
   */
  private adaptiveLearn(currentValue: string, newValue: string, learningRate: number): string {
    // Pour les chaînes, on fait un vote pondéré simple
    if (Math.random() < learningRate) {
      return newValue;
    }
    return currentValue;
  }

  /**
   * Mappe un type d'interaction à une activité
   */
  private mapActionToActivity(interactionType: string): string | null {
    const mapping: { [key: string]: string } = {
      'battle': 'combat',
      'quest_give': 'exploration',
      'quest_complete': 'exploration',
      'trade': 'social',
      'dialogue': 'social',
      'help': 'exploration'
    };
    
    return mapping[interactionType] || null;
  }

  /**
   * Fusionne les anciens et nouveaux traits
   */
  private mergeTraits(oldTraits: string[], newTraits: string[]): string[] {
    const merged = [...new Set([...oldTraits, ...newTraits])];
    
    // Limiter à 5 traits maximum
    return merged.slice(0, 5);
  }

  /**
   * Adapte le style de dialogue selon les résultats
   */
  private adaptDialogueStyle(
    currentStyle: NPCMemory['knownFacts']['preferences']['dialogueStyle'],
    playerMood: string,
    outcome: string
  ): NPCMemory['knownFacts']['preferences']['dialogueStyle'] {
    
    // Si l'interaction a mal tourné, ajuster le style
    if (outcome === 'negative') {
      if (playerMood === 'frustrated' && currentStyle === 'direct') {
        return 'encouraging';
      }
      if (playerMood === 'bored' && currentStyle === 'formal') {
        return 'casual';
      }
    }
    
    // Si l'interaction a bien marché, garder le style
    if (outcome === 'positive') {
      return currentStyle;
    }
    
    return currentStyle;
  }

  // ===================================================================
  // 🔄 TRAITEMENT ASYNCHRONE DES INTERACTIONS
  // ===================================================================

  /**
   * Démarre le traitement asynchrone des interactions
   */
  private startInteractionProcessing(): void {
    this.processingTimer = setInterval(async () => {
      if (this.interactionQueue.length > 0) {
        await this.processInteractionQueue();
      }
    }, 5000); // Traitement toutes les 5 secondes

    console.log('🔄 Traitement asynchrone des interactions démarré');
  }

  /**
   * Traite la queue des interactions
   */
  private async processInteractionQueue(): Promise<void> {
    if (this.interactionQueue.length === 0) return;

    const batch = this.interactionQueue.splice(0, this.config.memoryUpdateBatchSize);
    
    console.log(`🔄 Traitement de ${batch.length} interactions en attente`);

    const promises = batch.map(interaction => 
      this.updateMemoryAfterInteraction(
        interaction.npcId,
        interaction.playerId,
        interaction
      ).catch((error: Error): NPCMemory | null => {
        console.error(`❌ Erreur traitement interaction:`, error);
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  // ===================================================================
  // 💾 SAUVEGARDE ET CHARGEMENT BASE DE DONNÉES
  // ===================================================================

  /**
   * Sauvegarde la mémoire en base de données
   */
  private async saveMemoryToDatabase(memory: NPCMemory): Promise<boolean> {
    try {
      const updateData = {
        npcId: memory.npcId,
        playerId: memory.playerId,
        interactions: [{
          type: memory.lastInteraction.topicDiscussed,
          timestamp: memory.lastInteraction.timestamp,
          data: memory.lastInteraction,
          location: { map: '', x: 0, y: 0 }, // TODO: Récupérer vraie localisation
          playerMood: memory.lastInteraction.playerMood,
          npcResponse: ''
        }],
        relationship: {
          points: memory.relationshipLevel,
          level: this.getRelationshipLevel(memory.relationshipLevel),
          firstMet: memory.firstMet,
          lastSeen: memory.lastInteraction.timestamp,
          totalInteractions: memory.totalInteractions
        },
        knownFacts: {
          playerPreferences: {
            favoriteActivity: memory.knownFacts.favoriteActivity,
            playstyle: memory.knownFacts.preferences.dialogueStyle,
            skillLevel: memory.knownFacts.skillLevel,
            socialness: memory.knownFacts.preferences.socialInteraction
          },
          playerHistory: {
            achievements: memory.knownFacts.achievements,
            failures: [] as string[], // TODO: Tracker les échecs
            patterns: memory.knownFacts.personalityTraits
          },
          personalInfo: {
            notes: memory.knownFacts.helpHistory,
            friendsList: [] as string[] // TODO: Intégrer avec système d'amis
          }
        }
      };

      await NPCMemoryModel.findOneAndUpdate(
        { npcId: memory.npcId, playerId: memory.playerId },
        { $set: updateData },
        { upsert: true, new: true }
      );

      return true;

    } catch (error) {
      console.error(`❌ Erreur sauvegarde mémoire:`, error);
      return false;
    }
  }

  /**
   * Convertit depuis le format base de données
   */
  private convertFromDatabase(doc: INPCMemoryDocument): NPCMemory {
    return {
      npcId: doc.npcId,
      playerId: doc.playerId,
      relationshipLevel: doc.relationship.points,
      knownFacts: {
        favoriteActivity: doc.knownFacts.playerPreferences.favoriteActivity || 'exploration',
        skillLevel: doc.knownFacts.playerPreferences.skillLevel || 'beginner',
        personalityTraits: doc.knownFacts.playerHistory.patterns || [],
        helpHistory: doc.knownFacts.personalInfo.notes || [],
        achievements: doc.knownFacts.playerHistory.achievements || [],
        preferences: {
          dialogueStyle: (doc.knownFacts.playerPreferences.playstyle as any) || 'casual',
          helpLevel: 'guided',
          socialInteraction: (doc.knownFacts.playerPreferences.socialness as any) || 'normal'
        }
      },
      lastInteraction: {
        timestamp: doc.relationship.lastSeen,
        playerMood: doc.interactions[0]?.playerMood || 'neutral',
        topicDiscussed: doc.interactions[0]?.type || 'general',
        outcome: 'neutral'
      },
      interactionHistory: doc.interactions.map(i => ({
        date: i.timestamp,
        type: i.type,
        mood: i.playerMood || 'neutral',
        outcome: 'neutral',
        notes: i.npcResponse || ''
      })),
      firstMet: doc.relationship.firstMet,
      totalInteractions: doc.relationship.totalInteractions,
      lastUpdated: doc.updatedAt.getTime()
    };
  }

  /**
   * Détermine le niveau de relation textuel
   */
  private getRelationshipLevel(points: number): string {
    if (points > 50) return 'best_friend';
    if (points > 20) return 'friend';
    if (points > 0) return 'acquaintance';
    if (points > -20) return 'stranger';
    return 'enemy';
  }

  // ===================================================================
  // 🗂️ GESTION DU CACHE
  // ===================================================================

  private getCachedMemory(cacheKey: string): NPCMemory | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (expiry && Date.now() > expiry) {
      this.memoryCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }
    return this.memoryCache.get(cacheKey) || null;
  }

  private cacheMemory(cacheKey: string, memory: NPCMemory): void {
    this.memoryCache.set(cacheKey, memory);
    this.cacheExpiry.set(cacheKey, Date.now() + this.config.cacheExpiryMinutes * 60 * 1000);
  }

  // ===================================================================
  // 📊 MÉTHODES PUBLIQUES D'UTILITÉ
  // ===================================================================

  /**
   * Récupère toutes les mémoires d'un joueur
   */
  async getPlayerMemories(playerId: string): Promise<NPCMemory[]> {
    try {
      const memories = await NPCMemoryModel.find({ playerId }).lean();
      return memories.map(doc => this.convertFromDatabase(doc));
    } catch (error) {
      console.error(`❌ Erreur récupération mémoires joueur ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Récupère toutes les mémoires d'un NPC
   */
  async getNPCMemories(npcId: string): Promise<NPCMemory[]> {
    try {
      const memories = await NPCMemoryModel.find({ npcId }).lean();
      return memories.map(doc => this.convertFromDatabase(doc));
    } catch (error) {
      console.error(`❌ Erreur récupération mémoires NPC ${npcId}:`, error);
      return [];
    }
  }

  /**
   * Obtient le résumé de relation d'un joueur avec tous les NPCs
   */
  async getPlayerRelationshipSummary(playerId: string): Promise<{
    npcId: string;
    relationshipLevel: number;
    relationshipText: string;
    lastInteraction: number;
    totalInteractions: number;
  }[]> {
    try {
      const memories = await this.getPlayerMemories(playerId);
      
      return memories.map(memory => ({
        npcId: memory.npcId,
        relationshipLevel: memory.relationshipLevel,
        relationshipText: this.getRelationshipLevel(memory.relationshipLevel),
        lastInteraction: memory.lastInteraction.timestamp,
        totalInteractions: memory.totalInteractions
      }));

    } catch (error) {
      console.error(`❌ Erreur résumé relations ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Force une mise à jour de la dégradation des relations
   */
  async updateRelationshipDecay(): Promise<void> {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      // Récupérer toutes les mémoires non mises à jour depuis 24h
      const memories = await NPCMemoryModel.find({
        'relationship.lastSeen': { $lt: oneDayAgo }
      });

      const updates = memories.map(async memory => {
        const daysSinceLastSeen = (Date.now() - memory.relationship.lastSeen) / (24 * 60 * 60 * 1000);
        const decay = Math.floor(daysSinceLastSeen * this.config.relationshipDecay);
        
        const newPoints = Math.max(-100, memory.relationship.points - decay);
        
        return NPCMemoryModel.updateOne(
          { _id: memory._id },
          { $set: { 'relationship.points': newPoints } }
        );
      });

      await Promise.all(updates);
      console.log(`🕒 Dégradation des relations mise à jour pour ${memories.length} mémoires`);

    } catch (error) {
      console.error(`❌ Erreur mise à jour dégradation:`, error);
    }
  }

  /**
   * Statistiques du memory manager
   */
  getStats() {
    return {
      ...this.stats,
      cachedMemories: this.memoryCache.size,
      queuedInteractions: this.interactionQueue.length
    };
  }

  // ===================================================================
  // 🧹 MAINTENANCE
  // ===================================================================

  private startMaintenanceTasks(): void {
    // Mise à jour dégradation des relations toutes les 6 heures
    setInterval(() => {
      this.updateRelationshipDecay();
    }, 6 * 60 * 60 * 1000);

    // Nettoyage du cache toutes les 15 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 15 * 60 * 1000);

    console.log('🧹 Tâches de maintenance NPCMemoryManager démarrées');
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.cacheExpiry) {
      if (now > expiry) {
        this.memoryCache.delete(key);
        this.cacheExpiry.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} mémoires expirées nettoyées du cache`);
    }
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    
    // Traiter les interactions restantes
    if (this.interactionQueue.length > 0) {
      this.processInteractionQueue();
    }
    
    this.memoryCache.clear();
    this.cacheExpiry.clear();
    
    console.log('🧠 NPCMemoryManager détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let memoryManagerInstance: NPCMemoryManager | null = null;

/**
 * Récupère l'instance singleton du memory manager
 */
export function getNPCMemoryManager(): NPCMemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new NPCMemoryManager();
  }
  return memoryManagerInstance;
}

/**
 * Fonction utilitaire pour enregistrer rapidement une interaction
 */
export async function recordNPCInteraction(
  npcId: string,
  playerId: string,
  interactionType: NPCInteractionEvent['interactionType'],
  outcome: 'positive' | 'neutral' | 'negative',
  details?: NPCInteractionEvent['details']
): Promise<boolean> {
  const interaction: NPCInteractionEvent = {
    npcId,
    playerId,
    interactionType,
    outcome,
    context: {
      location: { map: '', x: 0, y: 0 }, // TODO: Récupérer vraie localisation
      timestamp: Date.now()
    },
    details
  };
  
  return getNPCMemoryManager().recordInteraction(interaction);
}

/**
 * Export par défaut
 */
export default NPCMemoryManager;
