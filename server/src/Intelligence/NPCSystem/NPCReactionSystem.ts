// server/src/Intelligence/NPCSystem/NPCReactionSystem.ts

/**
 * 🎭 NPC REACTION SYSTEM - RÉACTIONS INTELLIGENTES DES NPCs
 * 
 * Système qui fait réagir les NPCs intelligemment selon l'analyse comportementale :
 * - Réactions automatiques basées sur patterns détectés
 * - Sélection de dialogues appropriés selon contexte et mémoire
 * - Déclenchement d'actions proactives (offrir aide, etc.)
 * - Système de priorités pour réactions multiples
 * - Intégration complète avec tous les systèmes d'IA précédents
 * 
 * OBJECTIF : NPCs qui semblent magiquement intelligents et personnalisés !
 */

import { SimplePatternMatcher, getSimplePatternMatcher } from '../Analysis/SimplePatternMatcher';
import type { DetectedPattern } from '../Analysis/SimplePatternMatcher';

import { PlayerBehaviorAnalyzer, getPlayerBehaviorAnalyzer } from '../Analysis/PlayerBehaviorAnalyzer';
import type { BehaviorProfile } from '../Analysis/PlayerBehaviorAnalyzer';

import { NPCMemoryManager, getNPCMemoryManager } from './NPCMemoryManager';
import type { NPCMemory, NPCInteractionEvent } from './NPCMemoryManager';

import { ActionSummary, getActionSummary } from '../Analysis/ActionSummary';
import type { PlayerActivityReport } from '../Analysis/ActionSummary';

import { ActionType, ActionCategory } from '../Core/ActionTypes';

// ===================================================================
// 🎭 INTERFACES DES RÉACTIONS NPC
// ===================================================================

/**
 * Réaction d'un NPC à un pattern comportemental
 */
export interface NPCReaction {
  npcId: string;
  playerId: string;
  triggerPattern: DetectedPattern; // Pattern qui a déclenché la réaction
  reactionType: 'dialogue' | 'action' | 'proactive_help' | 'social_comment' | 'quest_offer' | 'item_gift';
  content: {
    message: string; // Dialogue principal
    emotion: 'helpful' | 'encouraging' | 'friendly' | 'concerned' | 'excited' | 'neutral';
    actions?: string[]; // Actions à proposer au joueur
    followUpQuestions?: string[]; // Questions de suivi possibles
    context?: { // Contexte pour personnaliser
      playerName: string;
      relationshipLevel: string;
      recentAchievements?: string[];
      knownPreferences?: string[];
    };
  };
  priority: number; // 1-10 (10 = urgent)
  timing: {
    shouldTriggerImmediately: boolean;
    delayMs?: number; // Délai avant déclenchement
    validUntil: number; // Timestamp d'expiration
  };
  metadata: {
    generatedAt: number;
    confidence: number; // Confiance dans la pertinence de la réaction
    personalizedLevel: number; // 0-1 : niveau de personnalisation
    learningValue: number; // 0-1 : valeur d'apprentissage de cette interaction
  };
}

/**
 * Contexte d'un NPC pour générer des réactions
 */
export interface NPCContext {
  npcId: string;
  npcType: string; // 'professor', 'nurse', 'guide', 'merchant', 'trainer'
  personality: {
    helpfulness: number; // 0-1
    chattiness: number; // 0-1
    formality: number; // 0-1
    patience: number; // 0-1
    proactiveness: number; // 0-1
  };
  capabilities: string[]; // 'heal', 'teach', 'trade', 'guide', 'battle'
  location: { map: string; x: number; y: number };
  currentlyBusy: boolean;
  recentInteractions: string[]; // IDs des joueurs récemment interagis
}

/**
 * Configuration du système de réaction
 */
export interface ReactionSystemConfig {
  // Seuils de déclenchement
  minPatternConfidence: number; // Confiance min pour déclencher réaction
  minRelationshipForProactive: number; // Relation min pour aide proactive
  maxReactionsPerMinute: number; // Limite réactions par minute par NPC
  
  // Personnalisation
  personalizationWeight: number; // Poids de la personnalisation (0-1)
  memoryInfluence: number; // Influence de la mémoire NPC (0-1)
  contextAwareness: number; // Prise en compte du contexte (0-1)
  
  // Performance
  reactionCacheMinutes: number;
  maxActiveReactions: number; // Max réactions actives par joueur
  batchProcessingSize: number;
  
  // Types de réactions activées
  enabledReactionTypes: {
    frustrationHelp: boolean;
    skillProgression: boolean;
    socialEncouragement: boolean;
    proactiveGuidance: boolean;
    personalRecognition: boolean;
  };
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - NPC REACTION SYSTEM
// ===================================================================

export class NPCReactionSystem {
  private patternMatcher: SimplePatternMatcher;
  private behaviorAnalyzer: PlayerBehaviorAnalyzer;
  private memoryManager: NPCMemoryManager;
  private actionSummary: ActionSummary;
  private config: ReactionSystemConfig;
  
  // NPCs enregistrés dans le système
  private npcs: Map<string, NPCContext> = new Map();
  
  // Réactions actives et cache
  private activeReactions: Map<string, NPCReaction[]> = new Map(); // playerId -> reactions
  private reactionCache: Map<string, { reaction: NPCReaction; expires: number }> = new Map();
  
  // Queue de traitement
  private reactionQueue: { playerId: string; patterns: DetectedPattern[] }[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  
  // Statistiques
  private stats = {
    reactionsGenerated: 0,
    reactionsTriggered: 0,
    proactiveHelp: 0,
    playersSatisfied: 0,
    averagePersonalization: 0
  };

  constructor(config?: Partial<ReactionSystemConfig>) {
    this.patternMatcher = getSimplePatternMatcher();
    this.behaviorAnalyzer = getPlayerBehaviorAnalyzer();
    this.memoryManager = getNPCMemoryManager();
    this.actionSummary = getActionSummary();
    
    this.config = {
      minPatternConfidence: 0.6,
      minRelationshipForProactive: 10,
      maxReactionsPerMinute: 3,
      personalizationWeight: 0.8,
      memoryInfluence: 0.7,
      contextAwareness: 0.9,
      reactionCacheMinutes: 5,
      maxActiveReactions: 3,
      batchProcessingSize: 5,
      enabledReactionTypes: {
        frustrationHelp: true,
        skillProgression: true,
        socialEncouragement: true,
        proactiveGuidance: true,
        personalRecognition: true
      },
      ...config
    };

    console.log('🎭 NPCReactionSystem initialisé', this.config);
    this.startReactionProcessing();
    this.initializeDefaultNPCs();
  }

  // ===================================================================
  // 🎯 MÉTHODES PRINCIPALES DE RÉACTION
  // ===================================================================

  /**
   * Analyse un joueur et génère des réactions appropriées
   */
  async generateReactionsForPlayer(playerId: string): Promise<NPCReaction[]> {
    try {
      // Détecter les patterns comportementaux
      const patterns = await this.patternMatcher.analyzePlayerPatterns(playerId);
      
      if (patterns.length === 0) return [];

      // Filtrer les patterns significatifs
      const significantPatterns = patterns.filter(p => p.confidence >= this.config.minPatternConfidence);
      
      if (significantPatterns.length === 0) return [];

      // Générer des réactions pour chaque pattern
      const allReactions: NPCReaction[] = [];
      
      for (const pattern of significantPatterns) {
        const reactions = await this.generateReactionsForPattern(playerId, pattern);
        allReactions.push(...reactions);
      }

      // Trier par priorité et limiter
      const sortedReactions = allReactions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.maxActiveReactions);

      // Mettre à jour les réactions actives
      this.activeReactions.set(playerId, sortedReactions);
      
      this.stats.reactionsGenerated += sortedReactions.length;
      
      console.log(`🎭 ${sortedReactions.length} réactions générées pour ${playerId}`);
      return sortedReactions;

    } catch (error) {
      console.error(`❌ Erreur génération réactions pour ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Génère des réactions spécifiques à un pattern
   */
  private async generateReactionsForPattern(playerId: string, pattern: DetectedPattern): Promise<NPCReaction[]> {
    const reactions: NPCReaction[] = [];
    
    // Récupérer le contexte du joueur
    const [behaviorProfile, playerReport] = await Promise.all([
      this.behaviorAnalyzer.generateBehaviorProfile(playerId),
      this.actionSummary.generatePlayerReport(playerId)
    ]);

    if (!behaviorProfile || !playerReport) return reactions;

    // Trouver les NPCs appropriés pour ce type de pattern
    const relevantNPCs = this.findRelevantNPCs(pattern, behaviorProfile);

    for (const npcId of relevantNPCs) {
      const npcContext = this.npcs.get(npcId);
      if (!npcContext) continue;

      // Récupérer la mémoire du NPC pour ce joueur
      const npcMemory = await this.memoryManager.getNPCMemory(npcId, playerId);
      
      // Générer la réaction selon le type de pattern
      let reaction: NPCReaction | null = null;

      switch (pattern.patternType) {
        case 'frustration':
          if (this.config.enabledReactionTypes.frustrationHelp) {
            reaction = await this.generateFrustrationHelpReaction(
              npcId, playerId, pattern, behaviorProfile, npcMemory, npcContext
            );
          }
          break;
          
        case 'skill_progression':
          if (this.config.enabledReactionTypes.skillProgression) {
            reaction = await this.generateSkillProgressionReaction(
              npcId, playerId, pattern, behaviorProfile, npcMemory, npcContext
            );
          }
          break;
          
        case 'help_needed':
          if (this.config.enabledReactionTypes.proactiveGuidance) {
            reaction = await this.generateProactiveHelpReaction(
              npcId, playerId, pattern, behaviorProfile, npcMemory, npcContext
            );
          }
          break;
          
        case 'social':
          if (this.config.enabledReactionTypes.socialEncouragement) {
            reaction = await this.generateSocialReaction(
              npcId, playerId, pattern, behaviorProfile, npcMemory, npcContext
            );
          }
          break;
          
        case 'afk':
          if (this.config.enabledReactionTypes.personalRecognition) {
            reaction = await this.generateWelcomeBackReaction(
              npcId, playerId, pattern, behaviorProfile, npcMemory, npcContext
            );
          }
          break;
      }

      if (reaction) {
        reactions.push(reaction);
      }
    }

    return reactions;
  }

  // ===================================================================
  // 🎪 GÉNÉRATEURS DE RÉACTIONS SPÉCIALISÉS
  // ===================================================================

  /**
   * Génère une réaction d'aide pour la frustration
   */
  private async generateFrustrationHelpReaction(
    npcId: string,
    playerId: string,
    pattern: DetectedPattern,
    profile: BehaviorProfile,
    memory: NPCMemory | null,
    npcContext: NPCContext
  ): Promise<NPCReaction | null> {
    
    // Vérifier si l'aide est appropriée
    if (memory && memory.relationshipLevel < this.config.minRelationshipForProactive && npcContext.personality.proactiveness < 0.7) {
      return null;
    }

    const playerName = profile.playerId; // TODO: Récupérer le vrai nom
    const relationshipLevel = memory ? this.getRelationshipText(memory.relationshipLevel) : 'stranger';
    
    // Personnaliser selon la mémoire et le contexte
    let message = '';
    let emotion: NPCReaction['content']['emotion'] = 'concerned';
    let actions: string[] = [];

    // Messages selon le type de NPC et relation
    if (npcContext.npcType === 'professor') {
      if (relationshipLevel === 'friend' || relationshipLevel === 'best_friend') {
        message = `${playerName}, I noticed you've been struggling lately. Let me help you with some strategies that might work better for your style.`;
      } else {
        message = `I see you're having some difficulties. Every trainer faces challenges - would you like some guidance?`;
      }
      actions = ['Battle Strategy Guide', 'Type Effectiveness Chart', 'Training Tips'];
      
    } else if (npcContext.npcType === 'nurse') {
      message = `${playerName}, your Pokémon look tired, and you seem frustrated. Why don't you take a break and let me heal your team?`;
      actions = ['Heal Pokémon', 'Rest at Pokémon Center', 'Relaxation Tips'];
      emotion = 'helpful';
      
    } else if (npcContext.npcType === 'guide') {
      message = `Hey ${playerName}! I've been watching your progress, and I think you might benefit from exploring some easier areas first. Want me to show you around?`;
      actions = ['Easier Training Areas', 'Beginner-Friendly Routes', 'Skill Building Exercises'];
      emotion = 'encouraging';
    }

    // Adapter selon la personnalité du joueur
    if (profile.personality.frustrationTolerance < 0.3) {
      emotion = 'encouraging';
      message = message.replace('struggling', 'learning');
      message = message.replace('difficulties', 'new challenges');
    }

    // Ajouter du contexte personnel si disponible
    const context = {
      playerName,
      relationshipLevel,
      recentAchievements: memory?.knownFacts.achievements.slice(-2) || [],
      knownPreferences: memory ? [memory.knownFacts.favoriteActivity] : []
    };

    return {
      npcId,
      playerId,
      triggerPattern: pattern,
      reactionType: 'proactive_help',
      content: {
        message,
        emotion,
        actions,
        followUpQuestions: [
          "What type of challenge are you finding most difficult?",
          "Would you like me to explain the mechanics better?",
          "Do you want to practice in a safer environment first?"
        ],
        context
      },
      priority: 8, // Haute priorité pour frustration
      timing: {
        shouldTriggerImmediately: true,
        validUntil: Date.now() + 10 * 60 * 1000 // 10 minutes
      },
      metadata: {
        generatedAt: Date.now(),
        confidence: pattern.confidence,
        personalizedLevel: memory ? 0.8 : 0.4,
        learningValue: 0.7
      }
    };
  }

  /**
   * Génère une réaction de félicitation pour progression
   */
  private async generateSkillProgressionReaction(
    npcId: string,
    playerId: string,
    pattern: DetectedPattern,
    profile: BehaviorProfile,
    memory: NPCMemory | null,
    npcContext: NPCContext
  ): Promise<NPCReaction | null> {
    
    const playerName = profile.playerId;
    const relationshipLevel = memory ? this.getRelationshipText(memory.relationshipLevel) : 'stranger';
    
    let message = '';
    let emotion: NPCReaction['content']['emotion'] = 'excited';
    let actions: string[] = [];

    // Messages selon le type de NPC
    if (npcContext.npcType === 'professor') {
      message = `Excellent progress, ${playerName}! I've been observing your improvement. You're ready for more advanced challenges now.`;
      actions = ['Advanced Training', 'New Research Tasks', 'Elite Challenges'];
      
    } else if (npcContext.npcType === 'trainer') {
      message = `${playerName}, your battle skills have really improved! I can see the dedication paying off. Want to test your skills against tougher opponents?`;
      actions = ['Elite Trainer Battles', 'Tournament Entry', 'Advanced Techniques'];
      
    } else {
      message = `Wow ${playerName}, you've gotten so much better! Keep up the great work!`;
      actions = ['Continue Current Path', 'Try New Challenges'];
    }

    // Personnaliser selon la mémoire
    if (memory && memory.knownFacts.achievements.length > 0) {
      const lastAchievement = memory.knownFacts.achievements[memory.knownFacts.achievements.length - 1];
      message += ` I remember when you ${lastAchievement} - look how far you've come!`;
    }

    return {
      npcId,
      playerId,
      triggerPattern: pattern,
      reactionType: 'social_comment',
      content: {
        message,
        emotion,
        actions,
        followUpQuestions: [
          "What would you like to focus on improving next?",
          "Are you ready for bigger challenges?",
          "Would you like to help other trainers with your experience?"
        ],
        context: {
          playerName,
          relationshipLevel,
          recentAchievements: memory?.knownFacts.achievements.slice(-3) || [],
          knownPreferences: memory ? [memory.knownFacts.favoriteActivity] : []
        }
      },
      priority: 6, // Priorité moyenne pour félicitations
      timing: {
        shouldTriggerImmediately: false,
        delayMs: 2000, // Petit délai pour que ce soit naturel
        validUntil: Date.now() + 30 * 60 * 1000 // 30 minutes
      },
      metadata: {
        generatedAt: Date.now(),
        confidence: pattern.confidence,
        personalizedLevel: memory ? 0.9 : 0.5,
        learningValue: 0.5
      }
    };
  }

  /**
   * Génère une réaction d'aide proactive
   */
  private async generateProactiveHelpReaction(
    npcId: string,
    playerId: string,
    pattern: DetectedPattern,
    profile: BehaviorProfile,
    memory: NPCMemory | null,
    npcContext: NPCContext
  ): Promise<NPCReaction | null> {
    
    // Vérifier si le NPC peut fournir de l'aide
    if (!npcContext.capabilities.includes('teach') && !npcContext.capabilities.includes('guide')) {
      return null;
    }

    const playerName = profile.playerId;
    
    let message = '';
    let actions: string[] = [];

    // Identifier le type d'aide nécessaire selon les patterns
    const helpNeeded = this.identifyHelpNeeded(profile, pattern);
    
    if (helpNeeded.includes('combat')) {
      message = `${playerName}, I notice you could use some help with battling. Let me share some strategies that work well for trainers like you.`;
      actions = ['Battle Fundamentals', 'Team Building Guide', 'Type Matchup Help'];
      
    } else if (helpNeeded.includes('exploration')) {
      message = `${playerName}, exploring can be tricky at first. Would you like me to show you some useful techniques?`;
      actions = ['Exploration Tips', 'Hidden Item Guide', 'Area Recommendations'];
      
    } else {
      message = `${playerName}, I'm here if you need any guidance. What would you like to learn more about?`;
      actions = ['General Tips', 'Ask a Question'];
    }

    // Personnaliser selon la mémoire
    if (memory && memory.knownFacts.helpHistory.length > 0) {
      const recentHelp = memory.knownFacts.helpHistory[memory.knownFacts.helpHistory.length - 1];
      message += ` I remember helping you with ${recentHelp} before - how did that work out?`;
    }

    return {
      npcId,
      playerId,
      triggerPattern: pattern,
      reactionType: 'proactive_help',
      content: {
        message,
        emotion: 'helpful',
        actions,
        followUpQuestions: [
          "What specific area would you like help with?",
          "Are you having trouble with any particular mechanic?",
          "Would you like a step-by-step guide?"
        ],
        context: {
          playerName,
          relationshipLevel: memory ? this.getRelationshipText(memory.relationshipLevel) : 'stranger',
          knownPreferences: memory ? [memory.knownFacts.favoriteActivity] : []
        }
      },
      priority: 7, // Haute priorité pour aide proactive
      timing: {
        shouldTriggerImmediately: false,
        delayMs: 5000, // Délai pour éviter d'être trop intrusif
        validUntil: Date.now() + 15 * 60 * 1000 // 15 minutes
      },
      metadata: {
        generatedAt: Date.now(),
        confidence: pattern.confidence,
        personalizedLevel: memory ? 0.7 : 0.3,
        learningValue: 0.8
      }
    };
  }

  /**
   * Génère une réaction sociale
   */
  private async generateSocialReaction(
    npcId: string,
    playerId: string,
    pattern: DetectedPattern,
    profile: BehaviorProfile,
    memory: NPCMemory | null,
    npcContext: NPCContext
  ): Promise<NPCReaction | null> {
    
    const playerName = profile.playerId;
    const isVerySocial = profile.personality.socialness > 0.7;
    const isAntisocial = profile.personality.socialness < 0.3;
    
    let message = '';
    let emotion: NPCReaction['content']['emotion'] = 'friendly';
    let actions: string[] = [];

    if (isVerySocial) {
      // Encourager la socialité
      message = `${playerName}, I love how friendly you are with everyone! Have you considered joining some group activities?`;
      actions = ['Group Events', 'Social Challenges', 'Team Activities'];
      
    } else if (isAntisocial) {
      // Respecter la préférence pour le solo mais offrir des options douces
      message = `${playerName}, I respect that you prefer training alone. If you ever want to try something with others, I know some quiet group activities.`;
      actions = ['Small Group Options', 'Solo with Support', 'Quiet Activities'];
      emotion = 'neutral';
      
    } else {
      // Encourager modérément
      message = `${playerName}, you might enjoy meeting some other trainers. There are some great people around here.`;
      actions = ['Meet Other Trainers', 'Group Suggestions'];
    }

    // Adapter selon la chattiness du NPC
    if (npcContext.personality.chattiness > 0.7) {
      message += ` I've met so many interesting trainers here - everyone has such unique stories!`;
    }

    return {
      npcId,
      playerId,
      triggerPattern: pattern,
      reactionType: 'social_comment',
      content: {
        message,
        emotion,
        actions,
        followUpQuestions: isAntisocial ? [] : [
          "Would you like me to introduce you to someone?",
          "Are you interested in any group activities?",
          "Have you made any friends on your journey?"
        ],
        context: {
          playerName,
          relationshipLevel: memory ? this.getRelationshipText(memory.relationshipLevel) : 'stranger',
          knownPreferences: memory ? [memory.knownFacts.favoriteActivity] : []
        }
      },
      priority: 4, // Priorité plus basse pour social
      timing: {
        shouldTriggerImmediately: false,
        delayMs: 10000, // Délai plus long pour social
        validUntil: Date.now() + 20 * 60 * 1000 // 20 minutes
      },
      metadata: {
        generatedAt: Date.now(),
        confidence: pattern.confidence,
        personalizedLevel: memory ? 0.6 : 0.3,
        learningValue: 0.4
      }
    };
  }

  /**
   * Génère une réaction de retour (AFK)
   */
  private async generateWelcomeBackReaction(
    npcId: string,
    playerId: string,
    pattern: DetectedPattern,
    profile: BehaviorProfile,
    memory: NPCMemory | null,
    npcContext: NPCContext
  ): Promise<NPCReaction | null> {
    
    if (!memory || memory.relationshipLevel < 0) return null; // Pas de "welcome back" pour inconnus ou ennemis
    
    const playerName = profile.playerId;
    const minutesAway = pattern.metadata?.minutesInactive || 5;
    
    let message = '';
    let emotion: NPCReaction['content']['emotion'] = 'friendly';

    if (memory.relationshipLevel > 50) {
      message = `${playerName}! Great to see you back! I was wondering where you'd gone. How was your break?`;
      emotion = 'excited';
    } else if (memory.relationshipLevel > 20) {
      message = `Oh, ${playerName}! Welcome back. I hope you had a good rest.`;
    } else {
      message = `${playerName}, you're back! Ready to continue your adventure?`;
    }

    // Ajouter contexte selon la durée d'absence
    if (minutesAway > 30) {
      message += ` You were away for a while - anything exciting happen?`;
    }

    // Mentionner les dernières interactions si pertinentes
    if (memory.lastInteraction.helpProvided) {
      message += ` How did that ${memory.lastInteraction.helpProvided} I mentioned work out for you?`;
    }

    return {
      npcId,
      playerId,
      triggerPattern: pattern,
      reactionType: 'dialogue',
      content: {
        message,
        emotion,
        actions: ['Continue Adventure', 'Share Updates', 'Ask for Advice'],
        followUpQuestions: [
          "How was your time away?",
          "Ready to get back to training?",
          "Need any updates on what you missed?"
        ],
        context: {
          playerName,
          relationshipLevel: this.getRelationshipText(memory.relationshipLevel),
          recentAchievements: memory.knownFacts.achievements.slice(-2),
          knownPreferences: [memory.knownFacts.favoriteActivity]
        }
      },
      priority: 5, // Priorité moyenne pour welcome back
      timing: {
        shouldTriggerImmediately: true, // Immediate pour welcome back
        validUntil: Date.now() + 5 * 60 * 1000 // 5 minutes
      },
      metadata: {
        generatedAt: Date.now(),
        confidence: pattern.confidence,
        personalizedLevel: 0.9, // Très personnalisé car basé sur mémoire
        learningValue: 0.3
      }
    };
  }

  // ===================================================================
  // 🎪 MÉTHODES UTILITAIRES
  // ===================================================================

  /**
   * Trouve les NPCs pertinents pour un pattern
   */
  private findRelevantNPCs(pattern: DetectedPattern, profile: BehaviorProfile): string[] {
    const relevantNPCs: string[] = [];
    
    for (const [npcId, npcContext] of this.npcs) {
      if (npcContext.currentlyBusy) continue;
      
      // Vérifier la pertinence selon le type de pattern
      let isRelevant = false;
      
      switch (pattern.patternType) {
        case 'frustration':
          isRelevant = npcContext.capabilities.includes('heal') || 
                      npcContext.capabilities.includes('teach') ||
                      npcContext.personality.helpfulness > 0.6;
          break;
          
        case 'help_needed':
          isRelevant = npcContext.capabilities.includes('teach') || 
                      npcContext.capabilities.includes('guide');
          break;
          
        case 'skill_progression':
          isRelevant = npcContext.npcType === 'professor' || 
                      npcContext.npcType === 'trainer' ||
                      npcContext.personality.chattiness > 0.5;
          break;
          
        case 'social':
          isRelevant = npcContext.personality.chattiness > 0.4;
          break;
          
        case 'afk':
          isRelevant = npcContext.personality.chattiness > 0.3; // Tous peuvent dire welcome back
          break;
      }
      
      if (isRelevant) {
        relevantNPCs.push(npcId);
      }
    }
    
    return relevantNPCs;
  }

  /**
   * Identifie le type d'aide nécessaire
   */
  private identifyHelpNeeded(profile: BehaviorProfile, pattern: DetectedPattern): string[] {
    const helpNeeded: string[] = [];
    
    if (profile.predictions.helpTopics.some(topic => topic.includes('combat') || topic.includes('battle'))) {
      helpNeeded.push('combat');
    }
    
    if (profile.predictions.helpTopics.some(topic => topic.includes('exploration') || topic.includes('quest'))) {
      helpNeeded.push('exploration');
    }
    
    if (profile.predictions.helpTopics.some(topic => topic.includes('social'))) {
      helpNeeded.push('social');
    }
    
    return helpNeeded;
  }

  /**
   * Convertit niveau de relation en texte
   */
  private getRelationshipText(level: number): string {
    if (level > 50) return 'best_friend';
    if (level > 20) return 'friend';
    if (level > 0) return 'acquaintance';
    if (level > -20) return 'stranger';
    return 'enemy';
  }

  // ===================================================================
  // 🎮 GESTION DES NPCs ET CONTEXTE
  // ===================================================================

  /**
   * Enregistre un NPC dans le système
   */
  registerNPC(npcId: string, npcContext: NPCContext): void {
    this.npcs.set(npcId, npcContext);
    console.log(`🎭 NPC enregistré: ${npcId} (${npcContext.npcType})`);
  }

  /**
   * Met à jour le contexte d'un NPC
   */
  updateNPCContext(npcId: string, updates: Partial<NPCContext>): void {
    const existing = this.npcs.get(npcId);
    if (existing) {
      this.npcs.set(npcId, { ...existing, ...updates });
    }
  }

  /**
   * Initialise les NPCs par défaut
   */
  private initializeDefaultNPCs(): void {
    // Professor Oak
    this.registerNPC('professor_oak', {
      npcId: 'professor_oak',
      npcType: 'professor',
      personality: {
        helpfulness: 0.9,
        chattiness: 0.7,
        formality: 0.8,
        patience: 0.9,
        proactiveness: 0.8
      },
      capabilities: ['teach', 'guide', 'heal'],
      location: { map: 'pallet_town', x: 100, y: 100 },
      currentlyBusy: false,
      recentInteractions: []
    });

    // Nurse Joy
    this.registerNPC('nurse_joy', {
      npcId: 'nurse_joy',
      npcType: 'nurse',
      personality: {
        helpfulness: 1.0,
        chattiness: 0.6,
        formality: 0.6,
        patience: 0.8,
        proactiveness: 0.7
      },
      capabilities: ['heal', 'guide'],
      location: { map: 'pokemon_center', x: 200, y: 150 },
      currentlyBusy: false,
      recentInteractions: []
    });

    // Guide NPC
    this.registerNPC('guide_sam', {
      npcId: 'guide_sam',
      npcType: 'guide',
      personality: {
        helpfulness: 0.8,
        chattiness: 0.9,
        formality: 0.3,
        patience: 0.7,
        proactiveness: 0.6
      },
      capabilities: ['guide', 'teach'],
      location: { map: 'route_1', x: 300, y: 200 },
      currentlyBusy: false,
      recentInteractions: []
    });

    console.log('🎭 NPCs par défaut initialisés');
  }

  // ===================================================================
  // 🔄 TRAITEMENT ASYNCHRONE ET API PUBLIQUE
  // ===================================================================

  /**
   * Démarre le traitement asynchrone des réactions
   */
  private startReactionProcessing(): void {
    this.processingTimer = setInterval(async () => {
      if (this.reactionQueue.length > 0) {
        await this.processReactionQueue();
      }
    }, 3000); // Traitement toutes les 3 secondes

    console.log('🔄 Traitement asynchrone des réactions démarré');
  }

  /**
   * Traite la queue des réactions
   */
  private async processReactionQueue(): Promise<void> {
    const batch = this.reactionQueue.splice(0, this.config.batchProcessingSize);
    
    const promises = batch.map(async ({ playerId, patterns }) => {
      try {
        return await this.generateReactionsForPlayer(playerId);
      } catch (error) {
        console.error(`❌ Erreur traitement réactions pour ${playerId}:`, error);
        return [];
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * API publique : Déclenche l'analyse d'un joueur
   */
  async triggerPlayerAnalysis(playerId: string): Promise<NPCReaction[]> {
    try {
      const reactions = await this.generateReactionsForPlayer(playerId);
      
      // Enregistrer les interactions appropriées
      for (const reaction of reactions) {
        if (reaction.timing.shouldTriggerImmediately) {
          await this.recordReactionInteraction(reaction);
        }
      }
      
      return reactions;
    } catch (error) {
      console.error(`❌ Erreur analyse joueur ${playerId}:`, error);
      return [];
    }
  }

  /**
   * API publique : Récupère les réactions actives d'un joueur
   */
  getActiveReactions(playerId: string): NPCReaction[] {
    return this.activeReactions.get(playerId) || [];
  }

  /**
   * API publique : Exécute une réaction
   */
  async executeReaction(reactionId: string, playerId: string): Promise<boolean> {
    try {
      const reactions = this.activeReactions.get(playerId) || [];
      const reaction = reactions.find(r => 
        `${r.npcId}_${r.triggerPattern.timestamp}` === reactionId
      );
      
      if (!reaction) return false;

      // Enregistrer l'interaction
      await this.recordReactionInteraction(reaction);
      
      // Supprimer de la liste active
      const updatedReactions = reactions.filter(r => 
        `${r.npcId}_${r.triggerPattern.timestamp}` !== reactionId
      );
      this.activeReactions.set(playerId, updatedReactions);
      
      this.stats.reactionsTriggered++;
      
      return true;
    } catch (error) {
      console.error(`❌ Erreur exécution réaction ${reactionId}:`, error);
      return false;
    }
  }

  /**
   * Enregistre une interaction de réaction dans la mémoire NPC
   */
  private async recordReactionInteraction(reaction: NPCReaction): Promise<void> {
    const interaction: NPCInteractionEvent = {
      npcId: reaction.npcId,
      playerId: reaction.playerId,
      interactionType: reaction.reactionType === 'proactive_help' ? 'help' : 'dialogue',
      outcome: 'positive', // Assumé positif pour réaction proactive
      context: {
        location: { map: '', x: 0, y: 0 }, // TODO: Récupérer vraie localisation
        timestamp: Date.now()
      },
      details: {
        topicDiscussed: reaction.triggerPattern.patternType,
        helpProvided: reaction.reactionType === 'proactive_help' ? reaction.content.message : undefined
      }
    };

    await this.memoryManager.recordInteraction(interaction);
  }

  // ===================================================================
  // 📊 STATISTIQUES ET MONITORING
  // ===================================================================

  /**
   * Retourne les statistiques du système
   */
  getStats() {
    return {
      ...this.stats,
      registeredNPCs: this.npcs.size,
      activeReactions: Array.from(this.activeReactions.values()).reduce((sum, reactions) => sum + reactions.length, 0),
      queuedReactions: this.reactionQueue.length
    };
  }

  /**
   * Nettoie les réactions expirées
   */
  private cleanupExpiredReactions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [playerId, reactions] of this.activeReactions) {
      const validReactions = reactions.filter(r => r.timing.validUntil > now);
      if (validReactions.length !== reactions.length) {
        this.activeReactions.set(playerId, validReactions);
        cleanedCount += reactions.length - validReactions.length;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} réactions expirées nettoyées`);
    }
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    
    this.npcs.clear();
    this.activeReactions.clear();
    this.reactionCache.clear();
    this.reactionQueue.length = 0;
    
    console.log('🎭 NPCReactionSystem détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let reactionSystemInstance: NPCReactionSystem | null = null;

/**
 * Récupère l'instance singleton du reaction system
 */
export function getNPCReactionSystem(): NPCReactionSystem {
  if (!reactionSystemInstance) {
    reactionSystemInstance = new NPCReactionSystem();
  }
  return reactionSystemInstance;
}

/**
 * Fonction utilitaire pour déclencher rapidement l'analyse d'un joueur
 */
export async function triggerNPCReactions(playerId: string): Promise<NPCReaction[]> {
  return getNPCReactionSystem().triggerPlayerAnalysis(playerId);
}

/**
 * Fonction utilitaire pour enregistrer un NPC
 */
export function registerNPC(npcId: string, npcType: string, capabilities: string[], location: { map: string; x: number; y: number }): void {
  const npcContext: NPCContext = {
    npcId,
    npcType,
    personality: {
      helpfulness: 0.7,
      chattiness: 0.6,
      formality: 0.5,
      patience: 0.7,
      proactiveness: 0.6
    },
    capabilities,
    location,
    currentlyBusy: false,
    recentInteractions: []
  };
  
  getNPCReactionSystem().registerNPC(npcId, npcContext);
}

/**
 * Export par défaut
 */
export default NPCReactionSystem;
