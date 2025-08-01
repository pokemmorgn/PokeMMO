// server/src/Intelligence/NPCSystem/NPCIntelligenceConnector.ts

/**
 * 🎭 NPC INTELLIGENCE CONNECTOR - PONT ENTRE NPCs ET IA
 * 
 * Connecte le système NPCs existant au système d'IA complet :
 * - Transforme les interactions NPCs basiques en interactions intelligentes
 * - Enregistre automatiquement les NPCs dans le système de réaction
 * - Convertit les réactions IA en réponses concrètes pour les NPCs
 * - Gère la mémoire et l'apprentissage des NPCs
 * - Interface simple pour intégration progressive
 * 
 * OBJECTIF : Rendre les NPCs magiquement intelligents sans casser l'existant !
 */

import { getIntelligenceOrchestrator, trackPlayerAction } from '../IntelligenceOrchestrator';
import type { CompletePlayerAnalysis, GameEvent } from '../IntelligenceOrchestrator';

import { getNPCReactionSystem, registerNPC, triggerNPCReactions } from './NPCReactionSystem';
import type { NPCReaction, NPCContext } from './NPCReactionSystem';

import { getNPCMemoryManager, recordNPCInteraction } from './NPCMemoryManager';
import type { NPCMemory, NPCInteractionEvent } from './NPCMemoryManager';

import { ActionType } from '../Core/ActionTypes';

// Import des types NPCs existants
import type { NpcData } from '../../managers/NPCManager';
import type { NpcType } from '../../types/NpcTypes';

// ===================================================================
// 🎯 INTERFACES DU CONNECTEUR
// ===================================================================

/**
 * Réponse intelligente d'un NPC après analyse IA
 */
export interface SmartNPCResponse {
  npcId: string;
  success: boolean;
  
  // Contenu de la réponse
  dialogue: {
    message: string;
    emotion: 'helpful' | 'encouraging' | 'friendly' | 'concerned' | 'excited' | 'neutral';
    speaker: string; // Nom du NPC
  };
  
  // Actions proposées au joueur
  actions: {
    id: string;
    label: string;
    type: 'dialogue' | 'quest' | 'trade' | 'heal' | 'info' | 'custom';
    data?: any;
  }[];
  
  // Questions de suivi possibles
  followUpQuestions: string[];
  
  // Métadonnées pour le client
  metadata: {
    personalizedLevel: number; // 0-1 : niveau de personnalisation
    relationshipLevel: string; // 'stranger', 'acquaintance', 'friend', etc.
    analysisConfidence: number; // 0-1 : confiance dans l'analyse
    isProactiveHelp: boolean; // L'IA a détecté un besoin d'aide
    triggerReasons: string[]; // Raisons qui ont déclenché cette réponse
  };
  
  // Données pour tracking
  tracking: {
    interactionId: string;
    timestamp: number;
    playerAnalysisUsed: boolean;
    patternsDetected: string[];
  };
}

/**
 * Configuration du connecteur
 */
export interface NPCConnectorConfig {
  // Activation progressive
  enabledNPCTypes: NpcType[];
  enabledZones: string[];
  globallyEnabled: boolean;
  
  // Comportement IA
  minAnalysisConfidence: number; // Confiance min pour utiliser l'IA
  fallbackToBasic: boolean; // Fallback sur dialogues basiques si IA échoue
  proactiveHelpEnabled: boolean; // NPCs peuvent offrir aide non demandée
  
  // Performance
  analysisTimeout: number; // Timeout analyse IA (ms)
  cacheResponses: boolean; // Cache des réponses similaires
  maxConcurrentAnalyses: number; // Max analyses simultanées
  
  // Apprentissage
  trackAllInteractions: boolean; // Tracker toutes les interactions pour apprentissage
  shareMemoryBetweenNPCs: boolean; // NPCs partagent leurs connaissances
  learningRate: number; // Vitesse d'adaptation des NPCs
  
  // Debug
  debugMode: boolean;
  logDetailedInteractions: boolean;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - NPC INTELLIGENCE CONNECTOR
// ===================================================================

export class NPCIntelligenceConnector {
  private orchestrator = getIntelligenceOrchestrator();
  private reactionSystem = getNPCReactionSystem();
  private memoryManager = getNPCMemoryManager();
  
  private config: NPCConnectorConfig;
  
  // NPCs enregistrés dans le système
  private registeredNPCs: Map<string, NPCContext> = new Map();
  private npcDataMap: Map<string, NpcData> = new Map(); // Référence vers données originales
  
  // Cache des réponses pour performance
  private responseCache: Map<string, { response: SmartNPCResponse; expires: number }> = new Map();
  
  // Queue des interactions à traiter
  private interactionQueue: { playerId: string; npcId: string; interactionType: string }[] = [];
  private processingQueue: boolean = false;
  
  // Statistiques
  private stats = {
    totalInteractions: 0,
    intelligentResponses: 0,
    fallbackResponses: 0,
    cacheHits: 0,
    analysisTimeouts: 0,
    npcRegistrations: 0
  };

  constructor(config?: Partial<NPCConnectorConfig>) {
    this.config = {
      // Activation progressive par défaut
      enabledNPCTypes: ['dialogue', 'healer', 'quest_master', 'researcher'],
      enabledZones: [], // Vide = toutes les zones
      globallyEnabled: true,
      
      // IA
      minAnalysisConfidence: 0.3,
      fallbackToBasic: true,
      proactiveHelpEnabled: true,
      
      // Performance
      analysisTimeout: 5000, // 5 secondes max
      cacheResponses: true,
      maxConcurrentAnalyses: 5,
      
      // Apprentissage
      trackAllInteractions: true,
      shareMemoryBetweenNPCs: true,
      learningRate: 0.3,
      
      // Debug
      debugMode: process.env.NODE_ENV === 'development',
      logDetailedInteractions: false, // Désactivé par défaut
      
      ...config
    };

    this.startBackgroundTasks();
  }

  // ===================================================================
  // 🎯 MÉTHODES PRINCIPALES D'INTERACTION
  // ===================================================================

  /**
   * Point d'entrée principal : Gère une interaction NPC avec IA
   */
  async handleIntelligentInteraction(
    playerId: string,
    npcId: string,
    interactionType: string = 'dialogue',
    context?: {
      playerAction?: string;
      location?: { map: string; x: number; y: number };
      sessionData?: any;
    }
  ): Promise<SmartNPCResponse> {
    const startTime = Date.now();
    this.stats.totalInteractions++;
    
    try {
      // Vérifier si ce NPC doit utiliser l'IA
      if (!this.shouldUseIntelligence(npcId)) {
        return this.createFallbackResponse(npcId, 'Intelligence disabled for this NPC');
      }

      // Étape 1 : Analyser le joueur avec timeout
      const playerAnalysis = await this.analyzePlayerWithTimeout(playerId);
      
      if (!playerAnalysis || playerAnalysis.analysisConfidence < this.config.minAnalysisConfidence) {
        return this.createFallbackResponse(npcId, 'Insufficient player analysis');
      }

      // Étape 2 : Récupérer les réactions intelligentes spécifiques à ce NPC
      const reactions = await this.getReactionsForNPC(npcId, playerId);
      
      // Étape 3 : Récupérer la mémoire du NPC pour ce joueur
      const npcMemory = await this.memoryManager.getNPCMemory(npcId, playerId);
      
      // Étape 4 : Générer la réponse intelligente
      const response = await this.generateSmartResponse(
        npcId, playerId, interactionType, reactions, npcMemory, playerAnalysis, context
      );
      
      // Étape 5 : Enregistrer l'interaction pour apprentissage
      await this.recordInteractionForLearning(npcId, playerId, interactionType, response, context);
      
      // Mise à jour statistiques
      this.stats.intelligentResponses++;

      return response;

    } catch (error) {
      if (this.config.debugMode) {
        console.error(`[NPCConnector] Error with NPC ${npcId}:`, error);
      }
      return this.createFallbackResponse(npcId, 'Error during intelligent processing');
    }
  }

  /**
   * Enregistre massivement des NPCs dans le système d'IA
   */
  async registerNPCsBulk(npcs: NpcData[]): Promise<{ registered: number; skipped: number; errors: string[] }> {
    const results = { registered: 0, skipped: 0, errors: [] as string[] };
    
    for (const npc of npcs) {
      try {
        const success = await this.registerSingleNPC(npc);
        if (success) {
          results.registered++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        const errorMsg = `NPC ${npc.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
        results.errors.push(errorMsg);
      }
    }

    return results;
  }

  /**
   * Enregistre un NPC unique dans le système d'IA
   */
  async registerSingleNPC(npc: NpcData): Promise<boolean> {
    try {
      const npcId = npc.id.toString();
      
      // Vérifier si ce NPC doit être intelligent
      if (!this.shouldNPCBeIntelligent(npc)) {
        return false;
      }

      // Stocker la référence aux données originales
      this.npcDataMap.set(npcId, npc);

      // Convertir vers le format attendu par le ReactionSystem
      const npcContext: NPCContext = this.convertNpcDataToContext(npc);
      
      // Enregistrer dans le système de réaction
      this.reactionSystem.registerNPC(npcId, npcContext);
      this.registeredNPCs.set(npcId, npcContext);
      
      this.stats.npcRegistrations++;

      return true;

    } catch (error) {
      if (this.config.debugMode) {
        console.error(`[NPCConnector] Error registering NPC ${npc.id}:`, error);
      }
      return false;
    }
  }

  // ===================================================================
  // 🧠 MÉTHODES D'ANALYSE ET GÉNÉRATION
  // ===================================================================

  /**
   * Analyse un joueur avec timeout
   */
  private async analyzePlayerWithTimeout(playerId: string): Promise<CompletePlayerAnalysis | null> {
    try {
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), this.config.analysisTimeout);
      });

      const analysisPromise = this.orchestrator.analyzePlayer(playerId);
      
      const result = await Promise.race([analysisPromise, timeoutPromise]);
      return result;

    } catch (error) {
      if (error instanceof Error && error.message === 'Analysis timeout') {
        this.stats.analysisTimeouts++;
      }
      return null;
    }
  }

  /**
   * Récupère les réactions spécifiques à un NPC
   */
  private async getReactionsForNPC(npcId: string, playerId: string): Promise<NPCReaction[]> {
    try {
      const allReactions = await triggerNPCReactions(playerId);
      return allReactions.filter(reaction => reaction.npcId === npcId);
    } catch (error) {
      return [];
    }
  }

  /**
   * Génère une réponse intelligente complète
   */
  private async generateSmartResponse(
    npcId: string,
    playerId: string,
    interactionType: string,
    reactions: NPCReaction[],
    memory: NPCMemory | null,
    analysis: CompletePlayerAnalysis,
    context?: any
  ): Promise<SmartNPCResponse> {
    
    const npcData = this.npcDataMap.get(npcId);
    const npcName = npcData?.name || `NPC ${npcId}`;
    
    // Choisir la meilleure réaction
    const primaryReaction = this.selectBestReaction(reactions, analysis);
    
    // Générer le dialogue principal
    const dialogue = this.generateDialogue(primaryReaction, memory, npcName, analysis);
    
    // Générer les actions possibles
    const actions = this.generateActions(primaryReaction, npcData, memory, analysis);
    
    // Générer les questions de suivi
    const followUpQuestions = this.generateFollowUpQuestions(primaryReaction, memory, analysis);
    
    // Calculer les métadonnées
    const metadata = this.calculateResponseMetadata(primaryReaction, memory, analysis, reactions);
    
    // Données de tracking
    const tracking = {
      interactionId: `${npcId}_${playerId}_${Date.now()}`,
      timestamp: Date.now(),
      playerAnalysisUsed: true,
      patternsDetected: analysis.detectedPatterns.map(p => p.patternType)
    };

    return {
      npcId,
      success: true,
      dialogue,
      actions,
      followUpQuestions,
      metadata,
      tracking
    };
  }

  /**
   * Sélectionne la meilleure réaction parmi celles disponibles
   */
  private selectBestReaction(
    reactions: NPCReaction[],
    analysis: CompletePlayerAnalysis
  ): NPCReaction | null {
    
    if (reactions.length === 0) return null;
    
    // Trier par priorité et confiance
    const sortedReactions = reactions.sort((a, b) => {
      const scoreA = a.priority * a.metadata.confidence;
      const scoreB = b.priority * b.metadata.confidence;
      return scoreB - scoreA;
    });
    
    // Prendre la première (meilleure)
    return sortedReactions[0];
  }

  /**
   * Génère le dialogue principal
   */
  private generateDialogue(
    reaction: NPCReaction | null,
    memory: NPCMemory | null,
    npcName: string,
    analysis: CompletePlayerAnalysis
  ): SmartNPCResponse['dialogue'] {
    
    if (reaction) {
      // Utiliser le message de la réaction IA
      return {
        message: reaction.content.message,
        emotion: reaction.content.emotion,
        speaker: npcName
      };
    }
    
    // Générer un dialogue basique mais personnalisé
    const playerMood = analysis.behaviorProfile?.currentState.mood || 'neutral';
    const relationshipLevel = memory?.relationshipLevel || 0;
    
    let message = `Hello there!`;
    let emotion: SmartNPCResponse['dialogue']['emotion'] = 'friendly';
    
    // Personnaliser selon la relation
    if (memory && relationshipLevel > 20) {
      message = `Good to see you again! How are you doing?`;
      emotion = 'friendly';
    } else if (memory && relationshipLevel < -10) {
      message = `Oh... it's you.`;
      emotion = 'neutral';
    }
    
    // Adapter selon l'humeur du joueur
    if (playerMood === 'frustrated') {
      message = `You look like you could use some help. What's troubling you?`;
      emotion = 'concerned';
    } else if (playerMood === 'excited') {
      message = `You seem excited about something! What's going on?`;
      emotion = 'excited';
    }

    return { message, emotion, speaker: npcName };
  }

  /**
   * Génère les actions possibles
   */
  private generateActions(
    reaction: NPCReaction | null,
    npcData: NpcData | undefined,
    memory: NPCMemory | null,
    analysis: CompletePlayerAnalysis
  ): SmartNPCResponse['actions'] {
    
    const actions: SmartNPCResponse['actions'] = [];
    
    // Actions basées sur la réaction IA
    if (reaction?.content.actions) {
      for (const actionLabel of reaction.content.actions) {
        actions.push({
          id: `ai_${actionLabel.toLowerCase().replace(/\s+/g, '_')}`,
          label: actionLabel,
          type: this.mapActionToType(actionLabel),
          data: { source: 'ai_reaction', reactionId: `${reaction.npcId}_${reaction.triggerPattern.timestamp}` }
        });
      }
    }
    
    // Actions basées sur le type de NPC
    if (npcData) {
      const npcActions = this.generateNPCTypeActions(npcData, analysis);
      actions.push(...npcActions);
    }
    
    // Actions basées sur la mémoire
    if (memory) {
      const memoryActions = this.generateMemoryBasedActions(memory, analysis);
      actions.push(...memoryActions);
    }
    
    // Action par défaut
    if (actions.length === 0) {
      actions.push({
        id: 'continue_conversation',
        label: 'Continue talking',
        type: 'dialogue',
        data: {}
      });
    }

    return actions;
  }

  /**
   * Génère les questions de suivi
   */
  private generateFollowUpQuestions(
    reaction: NPCReaction | null,
    memory: NPCMemory | null,
    analysis: CompletePlayerAnalysis
  ): string[] {
    
    const questions: string[] = [];
    
    // Questions de la réaction IA
    if (reaction?.content.followUpQuestions) {
      questions.push(...reaction.content.followUpQuestions);
    }
    
    // Questions basées sur l'analyse comportementale
    if (analysis.behaviorProfile) {
      const profile = analysis.behaviorProfile;
      
      if (profile.currentState.needsHelp) {
        questions.push("Is there anything specific you'd like help with?");
      }
      
      if (profile.personality.socialness > 0.7) {
        questions.push("Have you met any interesting trainers lately?");
      }
      
      if (profile.predictions.churnRisk > 0.6) {
        questions.push("Are you enjoying your journey so far?");
      }
    }
    
    // Questions basées sur la mémoire
    if (memory?.lastInteraction.helpProvided) {
      questions.push(`How did that ${memory.lastInteraction.helpProvided} work out?`);
    }
    
    return [...new Set(questions)]; // Supprimer doublons
  }

  // ===================================================================
  // 🔧 MÉTHODES DE CONVERSION ET MAPPING
  // ===================================================================

  /**
   * Convertit NpcData vers NPCContext pour le ReactionSystem
   */
  private convertNpcDataToContext(npc: NpcData): NPCContext {
    return {
      npcId: npc.id.toString(),
      npcType: this.mapNpcTypeToReactionType(npc.type),
      personality: this.generateNPCPersonality(npc),
      capabilities: this.extractNPCCapabilities(npc),
      location: {
        map: npc.zone || 'unknown',
        x: npc.x,
        y: npc.y
      },
      currentlyBusy: false,
      recentInteractions: []
    };
  }

  /**
   * Mappe les types NPCs vers les types du ReactionSystem
   */
  private mapNpcTypeToReactionType(npcType?: string): string {
    const mapping: { [key: string]: string } = {
      'healer': 'nurse',
      'merchant': 'merchant',
      'trainer': 'trainer',
      'gym_leader': 'trainer',
      'dialogue': 'guide',
      'quest_master': 'guide',
      'researcher': 'professor',
      'service': 'guide',
      'transport': 'guide',
      'minigame': 'guide',
      'guild': 'guide',
      'event': 'guide'
    };
    
    return mapping[npcType || 'dialogue'] || 'guide';
  }

  /**
   * Génère une personnalité pour un NPC basée sur son type
   */
  private generateNPCPersonality(npc: NpcData): NPCContext['personality'] {
    const basePersonality = {
      helpfulness: 0.7,
      chattiness: 0.6,
      formality: 0.5,
      patience: 0.7,
      proactiveness: 0.6
    };

    // Ajuster selon le type
    switch (npc.type) {
      case 'healer':
        return { ...basePersonality, helpfulness: 0.9, patience: 0.9, formality: 0.7 };
      
      case 'merchant':
        return { ...basePersonality, chattiness: 0.8, formality: 0.6, proactiveness: 0.8 };
      
      case 'trainer':
        return { ...basePersonality, chattiness: 0.7, formality: 0.4, proactiveness: 0.7 };
      
      case 'gym_leader':
        return { ...basePersonality, formality: 0.8, patience: 0.6, proactiveness: 0.5 };
      
      case 'researcher':
        return { ...basePersonality, helpfulness: 0.8, chattiness: 0.9, formality: 0.8 };
      
      default:
        return basePersonality;
    }
  }

  /**
   * Extrait les capacités d'un NPC
   */
  private extractNPCCapabilities(npc: NpcData): string[] {
    const capabilities: string[] = [];
    
    // Capacités basées sur le type
    switch (npc.type) {
      case 'healer':
        capabilities.push('heal');
        break;
      case 'merchant':
        capabilities.push('trade');
        break;
      case 'trainer':
      case 'gym_leader':
        capabilities.push('battle');
        break;
      case 'transport':
        capabilities.push('transport');
        break;
    }
    
    // Capacités basées sur les quêtes
    if (npc.questsToGive?.length) {
      capabilities.push('teach', 'guide');
    }
    
    // Tous peuvent dialoguer
    if (!capabilities.includes('teach')) {
      capabilities.push('teach'); // Tous peuvent enseigner des choses basiques
    }
    
    return capabilities.length > 0 ? capabilities : ['dialogue'];
  }

  /**
   * Mappe un label d'action vers un type
   */
  private mapActionToType(actionLabel: string): SmartNPCResponse['actions'][0]['type'] {
    const label = actionLabel.toLowerCase();
    
    if (label.includes('heal') || label.includes('cure')) return 'heal';
    if (label.includes('trade') || label.includes('buy') || label.includes('sell')) return 'trade';
    if (label.includes('quest') || label.includes('mission')) return 'quest';
    if (label.includes('info') || label.includes('guide') || label.includes('help')) return 'info';
    
    return 'dialogue';
  }

  /**
   * Génère des actions basées sur le type de NPC
   */
  private generateNPCTypeActions(npc: NpcData, analysis: CompletePlayerAnalysis): SmartNPCResponse['actions'] {
    const actions: SmartNPCResponse['actions'] = [];
    
    switch (npc.type) {
      case 'healer':
        actions.push({
          id: 'heal_pokemon',
          label: 'Heal my Pokémon',
          type: 'heal',
          data: { healerId: npc.id }
        });
        break;
        
      case 'merchant':
        actions.push({
          id: 'open_shop',
          label: 'Browse items',
          type: 'trade',
          data: { shopId: npc.shopId || npc.id }
        });
        break;
        
      case 'trainer':
        if (analysis.behaviorProfile?.personality.competitiveness > 0.5) {
          actions.push({
            id: 'battle_request',
            label: 'Challenge to battle',
            type: 'custom',
            data: { battleType: 'trainer', trainerId: npc.trainerId || npc.id }
          });
        }
        break;
    }
    
    // Quêtes disponibles
    if (npc.questsToGive?.length) {
      actions.push({
        id: 'ask_quests',
        label: 'Ask about available tasks',
        type: 'quest',
        data: { questIds: npc.questsToGive }
      });
    }
    
    return actions;
  }

  /**
   * Génère des actions basées sur la mémoire
   */
  private generateMemoryBasedActions(memory: NPCMemory, analysis: CompletePlayerAnalysis): SmartNPCResponse['actions'] {
    const actions: SmartNPCResponse['actions'] = [];
    
    // Actions basées sur l'historique d'aide
    if (memory.knownFacts.helpHistory.length > 0) {
      const lastHelp = memory.knownFacts.helpHistory[memory.knownFacts.helpHistory.length - 1];
      actions.push({
        id: 'follow_up_help',
        label: `Ask about ${lastHelp}`,
        type: 'info',
        data: { followUp: lastHelp }
      });
    }
    
    // Actions basées sur la relation
    if (memory.relationshipLevel > 30) {
      actions.push({
        id: 'personal_chat',
        label: 'Have a friendly chat',
        type: 'dialogue',
        data: { conversationType: 'friendly' }
      });
    }
    
    return actions;
  }

  // ===================================================================
  // 🛠️ MÉTHODES UTILITAIRES
  // ===================================================================

  /**
   * Vérifie si un NPC doit utiliser l'intelligence
   */
  private shouldUseIntelligence(npcId: string): boolean {
    if (!this.config.globallyEnabled) return false;
    
    const npcData = this.npcDataMap.get(npcId);
    if (!npcData) return false;
    
    return this.shouldNPCBeIntelligent(npcData);
  }

  /**
   * Vérifie si un NPC doit être intelligent
   */
  private shouldNPCBeIntelligent(npc: NpcData): boolean {
    // Vérifier le type
    if (this.config.enabledNPCTypes.length > 0 && 
        !this.config.enabledNPCTypes.includes(npc.type as NpcType)) {
      return false;
    }
    
    // Vérifier la zone
    if (this.config.enabledZones.length > 0 && 
        !this.config.enabledZones.includes(npc.zone || '')) {
      return false;
    }
    
    return true;
  }

  /**
   * Crée une réponse de fallback
   */
  private createFallbackResponse(npcId: string, reason: string): SmartNPCResponse {
    this.stats.fallbackResponses++;
    
    const npcData = this.npcDataMap.get(npcId);
    const npcName = npcData?.name || `NPC ${npcId}`;
    
    return {
      npcId,
      success: false,
      dialogue: {
        message: "Hello! How can I help you?",
        emotion: 'neutral',
        speaker: npcName
      },
      actions: [{
        id: 'basic_dialogue',
        label: 'Talk',
        type: 'dialogue',
        data: {}
      }],
      followUpQuestions: [],
      metadata: {
        personalizedLevel: 0,
        relationshipLevel: 'stranger',
        analysisConfidence: 0,
        isProactiveHelp: false,
        triggerReasons: [reason]
      },
      tracking: {
        interactionId: `fallback_${npcId}_${Date.now()}`,
        timestamp: Date.now(),
        playerAnalysisUsed: false,
        patternsDetected: []
      }
    };
  }

  /**
   * Calcule les métadonnées de la réponse
   */
  private calculateResponseMetadata(
    reaction: NPCReaction | null,
    memory: NPCMemory | null,
    analysis: CompletePlayerAnalysis,
    allReactions: NPCReaction[]
  ): SmartNPCResponse['metadata'] {
    
    const personalizedLevel = reaction ? reaction.metadata.personalizedLevel : 
                            (memory ? 0.5 : 0.2);
    
    const relationshipLevel = memory ? this.getRelationshipText(memory.relationshipLevel) : 'stranger';
    
    const analysisConfidence = analysis.analysisConfidence;
    
    const isProactiveHelp = reaction ? reaction.reactionType === 'proactive_help' : false;
    
    const triggerReasons = allReactions.map(r => r.triggerPattern.patternType);
    
    return {
      personalizedLevel,
      relationshipLevel,
      analysisConfidence,
      isProactiveHelp,
      triggerReasons
    };
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

  /**
   * Enregistre l'interaction pour apprentissage
   */
  private async recordInteractionForLearning(
    npcId: string,
    playerId: string,
    interactionType: string,
    response: SmartNPCResponse,
    context?: any
  ): Promise<void> {
    
    if (!this.config.trackAllInteractions) return;
    
    try {
      // Enregistrer dans la mémoire NPC
      const interaction: NPCInteractionEvent = {
        npcId,
        playerId,
        interactionType: interactionType as any,
        outcome: 'positive', // Assumé positif pour le moment
        context: {
          location: context?.location || { map: 'unknown', x: 0, y: 0 },
          timestamp: Date.now(),
          sessionDuration: context?.sessionDuration
        },
        details: {
          topicDiscussed: response.dialogue.message.substring(0, 50),
          helpProvided: response.metadata.isProactiveHelp ? 'proactive_assistance' : undefined
        }
      };
      
      await recordNPCInteraction(
        npcId,
        playerId,
        interaction.interactionType,
        interaction.outcome,
        interaction.details
      );
      
      // Enregistrer l'action pour le système global
      await trackPlayerAction(
        playerId,
        ActionType.PLAYER_MESSAGE, // Interaction avec NPC
        {
          npcId,
          interactionType,
          response: response.dialogue.message,
          analysisUsed: response.tracking.playerAnalysisUsed
        },
        context
      );
      
    } catch (error) {
      // Erreur silencieuse sauf en mode debug
      if (this.config.debugMode) {
        console.error(`[NPCConnector] Error recording interaction:`, error);
      }
    }
  }

  // ===================================================================
  // 🔄 TÂCHES DE FOND ET MAINTENANCE
  // ===================================================================

  /**
   * Démarre les tâches de fond
   */
  private startBackgroundTasks(): void {
    // Nettoyage du cache toutes les 10 minutes
    setInterval(() => {
      this.cleanupResponseCache();
    }, 10 * 60 * 1000);

    // Traitement de la queue toutes les 5 secondes
    setInterval(() => {
      this.processInteractionQueue();
    }, 5000);
  }

  /**
   * Nettoie le cache des réponses
   */
  private cleanupResponseCache(): void {
    if (!this.config.cacheResponses) return;
    
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.responseCache) {
      if (now > cached.expires) {
        this.responseCache.delete(key);
        cleanedCount++;
      }
    }
  }

  /**
   * Traite la queue des interactions
   */
  private async processInteractionQueue(): Promise<void> {
    if (this.processingQueue || this.interactionQueue.length === 0) return;
    
    this.processingQueue = true;
    
    try {
      const batch = this.interactionQueue.splice(0, 5); // Traiter par lots de 5
      
      const promises = batch.map(({ playerId, npcId, interactionType }) =>
        this.handleIntelligentInteraction(playerId, npcId, interactionType)
          .catch((error: Error): SmartNPCResponse | null => {
            if (this.config.debugMode) {
              console.error(`[NPCConnector] Queue processing error for ${npcId}:`, error);
            }
            return null;
          })
      );
      
      await Promise.allSettled(promises);
      
    } finally {
      this.processingQueue = false;
    }
  }

  // ===================================================================
  // 📊 MÉTHODES PUBLIQUES D'ADMINISTRATION
  // ===================================================================

  /**
   * Obtient les statistiques du connecteur
   */
  getStats() {
    return {
      ...this.stats,
      registeredNPCs: this.registeredNPCs.size,
      queuedInteractions: this.interactionQueue.length,
      cacheSize: this.responseCache.size,
      config: this.config
    };
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<NPCConnectorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Active/désactive l'intelligence pour un type de NPC
   */
  toggleNPCTypeIntelligence(npcType: NpcType, enabled: boolean): void {
    if (enabled) {
      if (!this.config.enabledNPCTypes.includes(npcType)) {
        this.config.enabledNPCTypes.push(npcType);
      }
    } else {
      const index = this.config.enabledNPCTypes.indexOf(npcType);
      if (index > -1) {
        this.config.enabledNPCTypes.splice(index, 1);
      }
    }
  }

  /**
   * Obtient la mémoire d'un NPC pour un joueur
   */
  async getNPCMemoryForPlayer(npcId: string, playerId: string): Promise<NPCMemory | null> {
    return this.memoryManager.getNPCMemory(npcId, playerId);
  }

  /**
   * Force une réanalyse pour les réactions d'un joueur
   */
  async forcePlayerReanalysis(playerId: string): Promise<NPCReaction[]> {
    return triggerNPCReactions(playerId);
  }

  /**
   * Debug d'un NPC spécifique (seulement en mode debug)
   */
  debugNPC(npcId: string): void {
    if (!this.config.debugMode) return;

    const npcData = this.npcDataMap.get(npcId);
    const npcContext = this.registeredNPCs.get(npcId);
    
    console.log(`[NPCConnector] Debug NPC ${npcId}:`);
    console.log(`  Data:`, npcData ? {
      name: npcData.name,
      type: npcData.type,
      zone: npcData.zone,
      position: { x: npcData.x, y: npcData.y }
    } : 'Not found');
    
    console.log(`  AI Context:`, npcContext ? {
      type: npcContext.npcType,
      capabilities: npcContext.capabilities,
      personality: npcContext.personality
    } : 'Not registered');
    
    console.log(`  Intelligence:`, {
      shouldUseIA: this.shouldUseIntelligence(npcId),
      typeEnabled: this.config.enabledNPCTypes.includes(npcData?.type as NpcType),
      globalEnabled: this.config.globallyEnabled
    });
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    this.registeredNPCs.clear();
    this.npcDataMap.clear();
    this.responseCache.clear();
    this.interactionQueue.length = 0;
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let connectorInstance: NPCIntelligenceConnector | null = null;

/**
 * Récupère l'instance singleton du connecteur
 */
export function getNPCIntelligenceConnector(): NPCIntelligenceConnector {
  if (!connectorInstance) {
    connectorInstance = new NPCIntelligenceConnector();
  }
  return connectorInstance;
}

/**
 * Fonction utilitaire pour interaction intelligente rapide
 */
export async function handleSmartNPCInteraction(
  playerId: string,
  npcId: string,
  interactionType: string = 'dialogue',
  context?: any
): Promise<SmartNPCResponse> {
  return getNPCIntelligenceConnector().handleIntelligentInteraction(
    playerId, npcId, interactionType, context
  );
}

/**
 * Fonction utilitaire pour enregistrement NPCs en masse
 */
export async function registerNPCsWithAI(npcs: NpcData[]): Promise<{ registered: number; skipped: number; errors: string[] }> {
  return getNPCIntelligenceConnector().registerNPCsBulk(npcs);
}

/**
 * Export par défaut
 */
export default NPCIntelligenceConnector;
