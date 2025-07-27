// server/src/Intelligence/Utils/IntelligenceUtils.ts

/**
 * 🛠️ INTELLIGENCE UTILS - UTILITAIRES POUR L'IA
 * 
 * Collection d'utilitaires et helpers pour tous les systèmes d'IA :
 * - Fonctions de calcul et normalisation
 * - Helpers pour l'analyse de données
 * - Utilitaires de formatage et validation
 * - Fonctions de debugging et monitoring
 * - Constantes et configurations partagées
 */

import type { PlayerAction, ActionType } from '../Core/ActionTypes';
import { ActionCategory } from '../Core/ActionTypes';
import type { DetectedPattern } from '../Analysis/SimplePatternMatcher';
import type { BehaviorProfile } from '../Analysis/PlayerBehaviorAnalyzer';
import type { NPCReaction } from '../NPCSystem/NPCReactionSystem';

// ===================================================================
// 📊 CONSTANTES ET CONFIGURATIONS
// ===================================================================

/**
 * Seuils par défaut pour l'analyse comportementale
 */
export const BEHAVIOR_THRESHOLDS = {
  // Patterns
  FRUSTRATION_MIN_CONFIDENCE: 0.6,
  HELP_NEEDED_MIN_CONFIDENCE: 0.7,
  SKILL_PROGRESSION_MIN_CONFIDENCE: 0.8,
  
  // Personnalité
  HIGH_SOCIALNESS: 0.7,
  LOW_SOCIALNESS: 0.3,
  HIGH_PATIENCE: 0.8,
  LOW_PATIENCE: 0.2,
  HIGH_COMPETITIVENESS: 0.75,
  
  // Risques
  HIGH_CHURN_RISK: 0.7,
  MEDIUM_CHURN_RISK: 0.4,
  HIGH_FRUSTRATION: 0.8,
  
  // Activité
  MIN_ACTIONS_FOR_RELIABLE_ANALYSIS: 20,
  INACTIVE_THRESHOLD_DAYS: 3,
  AFK_THRESHOLD_MINUTES: 5,
  
  // Relations NPCs
  FRIEND_RELATIONSHIP_THRESHOLD: 20,
  ENEMY_RELATIONSHIP_THRESHOLD: -20,
  PROACTIVE_HELP_MIN_RELATIONSHIP: 10
} as const;

/**
 * Messages templates pour les réactions NPCs
 */
export const NPC_MESSAGE_TEMPLATES = {
  frustration: {
    professor: [
      "I notice you're having some difficulties. Every trainer faces challenges - would you like some guidance?",
      "{playerName}, I've been observing your progress. Let me share some strategies that might help.",
      "Research shows that persistence is key to success. Let me help you find a better approach."
    ],
    nurse: [
      "{playerName}, your Pokémon look tired, and you seem frustrated. Why don't you take a break?",
      "I can see you've been working hard. Sometimes a good rest is the best medicine.",
      "Your Pokémon need healing, and you might need some encouragement. Let me help with both!"
    ],
    guide: [
      "Hey {playerName}! Looks like you're having a tough time. Want me to show you some easier areas?",
      "Everyone struggles sometimes. How about we find a better training spot for you?",
      "I know some great places where you can build confidence. Interested?"
    ]
  },
  skillProgression: {
    professor: [
      "Excellent progress, {playerName}! Your dedication to research is paying off.",
      "I'm impressed by your improvement. You're ready for more advanced challenges now.",
      "Your battle data shows remarkable improvement. Keep up the excellent work!"
    ],
    trainer: [
      "{playerName}, your battle skills have really improved! I can see the dedication paying off.",
      "Wow, you've gotten so much stronger! Want to test your skills against tougher opponents?",
      "Your training regimen is clearly working. How about some advanced techniques?"
    ]
  },
  welcomeBack: {
    friend: [
      "{playerName}! Great to see you back! I was wondering where you'd gone.",
      "Welcome back, {playerName}! I hope you had a good rest.",
      "Oh, {playerName}! I've missed our conversations. How was your time away?"
    ],
    acquaintance: [
      "{playerName}, you're back! Ready to continue your adventure?",
      "Good to see you again, {playerName}. How have you been?",
      "Welcome back! I hope you're ready for some new challenges."
    ]
  },
  helpOffer: {
    general: [
      "I'm here if you need any guidance. What would you like to learn more about?",
      "Need some help with anything? I'm always happy to share what I know.",
      "I notice you could use some assistance. How can I help you today?"
    ],
    specific: {
      combat: "I can help you with battle strategies and type effectiveness. Interested?",
      exploration: "Want me to show you some useful exploration techniques?",
      pokemon: "I know a lot about Pokémon care and training. Need some tips?"
    }
  }
} as const;

/**
 * Poids pour le calcul de scores composites
 */
export const ANALYSIS_WEIGHTS = {
  personalityTraits: {
    recentActions: 0.4,
    historicalPatterns: 0.3,
    sessionBehavior: 0.2,
    socialInteractions: 0.1
  },
  churnRisk: {
    activityLevel: 0.3,
    frustrationLevel: 0.25,
    engagementTrend: 0.2,
    socialConnections: 0.15,
    skillProgression: 0.1
  },
  npcReactionPriority: {
    patternConfidence: 0.3,
    relationshipLevel: 0.25,
    urgency: 0.2,
    personalization: 0.15,
    contextRelevance: 0.1
  }
} as const;

// ===================================================================
// 🧮 FONCTIONS DE CALCUL ET NORMALISATION
// ===================================================================

/**
 * Normalise une valeur entre 0 et 1
 */
export function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calcule une moyenne pondérée
 */
export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length || values.length === 0) return 0;
  
  const sum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
  const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
  
  return weightSum > 0 ? sum / weightSum : 0;
}

/**
 * Calcule un score composite basé sur plusieurs métriques
 */
export function calculateCompositeScore(
  metrics: { [key: string]: number },
  weights: { [key: string]: number }
): number {
  const values: number[] = [];
  const weightsArray: number[] = [];
  
  for (const [key, value] of Object.entries(metrics)) {
    if (weights[key] !== undefined) {
      values.push(value);
      weightsArray.push(weights[key]);
    }
  }
  
  return weightedAverage(values, weightsArray);
}

/**
 * Calcule la tendance d'une série de valeurs (régression linéaire simple)
 */
export function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (values[i] - meanY);
    denominator += (x[i] - meanX) ** 2;
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  
  // Normaliser entre -1 et 1
  return Math.max(-1, Math.min(1, slope));
}

/**
 * Calcule la confiance dans une prédiction basée sur la taille de l'échantillon
 */
export function calculatePredictionConfidence(sampleSize: number, minSample: number = 20): number {
  return Math.min(1, sampleSize / minSample);
}

/**
 * Calcule la diversité d'un ensemble de valeurs (entropie normalisée)
 */
export function calculateDiversity<T>(items: T[]): number {
  if (items.length <= 1) return 0;
  
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  
  const total = items.length;
  let entropy = 0;
  
  for (const count of counts.values()) {
    const probability = count / total;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  }
  
  // Normaliser (max entropy = log2(unique items))
  const maxEntropy = Math.log2(counts.size);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

// ===================================================================
// 📊 ANALYSEURS DE DONNÉES SPÉCIALISÉS
// ===================================================================

/**
 * Analyse la fréquence des actions par heure
 */
export function analyzeActionFrequency(actions: PlayerAction[]): { [hour: number]: number } {
  const frequency: { [hour: number]: number } = {};
  
  for (let i = 0; i < 24; i++) {
    frequency[i] = 0;
  }
  
  for (const action of actions) {
    const hour = new Date(action.timestamp).getHours();
    frequency[hour]++;
  }
  
  return frequency;
}

/**
 * Identifie les patterns temporels dans les actions
 */
export function identifyTemporalPatterns(actions: PlayerAction[]): {
  peakHours: number[];
  mostActiveDay: string;
  sessionPattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'mixed';
} {
  const hourFreq = analyzeActionFrequency(actions);
  
  // Trouver les heures de pic (top 3)
  const peakHours = Object.entries(hourFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
  
  // Analyser les jours de la semaine
  const dayFreq: { [day: string]: number } = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (const action of actions) {
    const day = dayNames[new Date(action.timestamp).getDay()];
    dayFreq[day] = (dayFreq[day] || 0) + 1;
  }
  
  const mostActiveDay = Object.entries(dayFreq)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
  
  // Déterminer le pattern de session
  let sessionPattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'mixed' = 'mixed';
  const totalActions = actions.length;
  
  if (totalActions > 0) {
    const morningActions = (hourFreq[6] + hourFreq[7] + hourFreq[8] + hourFreq[9] + hourFreq[10] + hourFreq[11]);
    const afternoonActions = (hourFreq[12] + hourFreq[13] + hourFreq[14] + hourFreq[15] + hourFreq[16] + hourFreq[17]);
    const eveningActions = (hourFreq[18] + hourFreq[19] + hourFreq[20] + hourFreq[21]);
    const nightActions = (hourFreq[22] + hourFreq[23] + hourFreq[0] + hourFreq[1] + hourFreq[2] + hourFreq[3] + hourFreq[4] + hourFreq[5]);
    
    const maxActions = Math.max(morningActions, afternoonActions, eveningActions, nightActions);
    
    if (maxActions / totalActions > 0.5) {
      if (maxActions === morningActions) sessionPattern = 'morning';
      else if (maxActions === afternoonActions) sessionPattern = 'afternoon';
      else if (maxActions === eveningActions) sessionPattern = 'evening';
      else sessionPattern = 'night';
    }
  }
  
  return { peakHours, mostActiveDay, sessionPattern };
}

/**
 * Calcule la cohérence comportementale d'un joueur
 */
export function calculateBehavioralConsistency(actions: PlayerAction[]): number {
  if (actions.length < 10) return 0;
  
  // Analyser la consistance des catégories d'actions
  const windows = [];
  const windowSize = Math.min(10, Math.floor(actions.length / 3));
  
  for (let i = 0; i < actions.length - windowSize; i += windowSize) {
    const window = actions.slice(i, i + windowSize);
    const categories = window.map(a => a.category);
    const diversity = calculateDiversity(categories);
    windows.push(diversity);
  }
  
  // Calculer la variance de la diversité (moins de variance = plus consistant)
  if (windows.length < 2) return 0.5;
  
  const meanDiversity = windows.reduce((a, b) => a + b, 0) / windows.length;
  const variance = windows.reduce((acc, div) => acc + Math.pow(div - meanDiversity, 2), 0) / windows.length;
  
  // Convertir variance en score de consistance (inverse)
  return Math.max(0, 1 - Math.sqrt(variance));
}

/**
 * Détecte les anomalies dans le comportement
 */
export function detectBehavioralAnomalies(actions: PlayerAction[]): {
  anomalies: string[];
  anomalyScore: number; // 0-1, 1 = très anormal
} {
  const anomalies: string[] = [];
  let anomalyScore = 0;
  
  if (actions.length < 5) return { anomalies, anomalyScore };
  
  // Détecter spam d'actions identiques
  const actionTypeFreq = new Map<ActionType, number>();
  for (const action of actions.slice(0, 10)) { // 10 dernières actions
    actionTypeFreq.set(action.actionType, (actionTypeFreq.get(action.actionType) || 0) + 1);
  }
  
  for (const [actionType, count] of actionTypeFreq) {
    if (count >= 5) {
      anomalies.push(`Spam detected: ${count} identical ${actionType} actions`);
      anomalyScore += 0.3;
    }
  }
  
  // Détecter vitesse de jeu anormale
  const intervals = [];
  for (let i = 1; i < Math.min(10, actions.length); i++) {
    intervals.push(actions[i-1].timestamp - actions[i].timestamp);
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (avgInterval < 1000) { // Moins d'1 seconde entre actions
    anomalies.push("Unusually rapid actions detected");
    anomalyScore += 0.4;
  }
  
  // Détecter patterns impossibles
  const combatActions = actions.filter(a => a.category === ActionCategory.COMBAT);
  const pokemonActions = actions.filter(a => a.category === ActionCategory.POKEMON);
  
  if (combatActions.length > pokemonActions.length * 3) {
    anomalies.push("Impossible pattern: too many battles without Pokémon interactions");
    anomalyScore += 0.3;
  }
  
  return { anomalies, anomalyScore: Math.min(1, anomalyScore) };
}

// ===================================================================
// 🎭 HELPERS POUR NPCs ET RÉACTIONS
// ===================================================================

/**
 * Sélectionne le meilleur template de message pour un NPC
 */
export function selectNPCMessageTemplate(
  npcType: string,
  reactionType: string,
  playerName: string,
  relationshipLevel: string = 'stranger'
): string {
  const templates = NPC_MESSAGE_TEMPLATES[reactionType as keyof typeof NPC_MESSAGE_TEMPLATES];
  
  if (!templates) return "Hello there!";
  
  let messageTemplates: string[] = [];
  
  if (typeof templates === 'object' && npcType in templates) {
    messageTemplates = templates[npcType as keyof typeof templates];
  } else if (Array.isArray(templates)) {
    messageTemplates = templates;
  }
  
  if (messageTemplates.length === 0) return "Hello there!";
  
  // Sélectionner aléatoirement un template
  const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
  
  // Remplacer les placeholders
  return template
    .replace(/{playerName}/g, playerName)
    .replace(/{relationshipLevel}/g, relationshipLevel);
}

/**
 * Calcule la priorité d'une réaction NPC
 */
export function calculateNPCReactionPriority(
  pattern: DetectedPattern,
  relationshipLevel: number,
  urgency: 'low' | 'medium' | 'high' | 'critical',
  personalizationLevel: number,
  contextRelevance: number
): number {
  const urgencyScores = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 };
  const normalizedRelationship = normalize(relationshipLevel, -100, 100);
  
  const metrics = {
    patternConfidence: pattern.confidence,
    relationshipLevel: normalizedRelationship,
    urgency: urgencyScores[urgency],
    personalization: personalizationLevel,
    contextRelevance: contextRelevance
  };
  
  const priority = calculateCompositeScore(metrics, ANALYSIS_WEIGHTS.npcReactionPriority);
  
  // Convertir en échelle 1-10
  return Math.max(1, Math.min(10, Math.round(priority * 10)));
}

/**
 * Formate une réaction NPC pour l'affichage
 */
export function formatNPCReaction(reaction: NPCReaction): {
  displayMessage: string;
  actionButtons: string[];
  emotionIcon: string;
  urgencyLevel: string;
} {
  const emotionIcons = {
    helpful: '🤝',
    encouraging: '💪',
    friendly: '😊',
    concerned: '😟',
    excited: '🎉',
    neutral: '😐'
  };
  
  const urgencyLevels = {
    1: 'very_low', 2: 'very_low', 3: 'low', 4: 'low',
    5: 'medium', 6: 'medium', 7: 'high', 8: 'high',
    9: 'very_high', 10: 'critical'
  };
  
  return {
    displayMessage: reaction.content.message,
    actionButtons: reaction.content.actions || [],
    emotionIcon: emotionIcons[reaction.content.emotion] || '😐',
    urgencyLevel: urgencyLevels[reaction.priority as keyof typeof urgencyLevels] || 'medium'
  };
}

// ===================================================================
// 🔍 HELPERS DE VALIDATION ET DEBUGGING
// ===================================================================

/**
 * Valide la cohérence d'un profil comportemental
 */
export function validateBehaviorProfile(profile: BehaviorProfile): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Vérifier les valeurs de personnalité (doivent être entre 0 et 1)
  const personalityTraits = Object.entries(profile.personality);
  for (const [trait, value] of personalityTraits) {
    if (value < 0 || value > 1) {
      errors.push(`Personality trait ${trait} out of range: ${value}`);
    }
  }
  
  // Vérifier la cohérence des prédictions
  if (profile.predictions.churnRisk > 0.8 && profile.currentState.mood === 'happy') {
    warnings.push("High churn risk with happy mood seems inconsistent");
  }
  
  if (profile.personality.socialness > 0.8 && profile.predictions.socialNeeds === false) {
    warnings.push("High socialness but no social needs seems inconsistent");
  }
  
  // Vérifier la confiance vs taille d'échantillon
  if (profile.confidence > 0.8 && profile.sampleSize < BEHAVIOR_THRESHOLDS.MIN_ACTIONS_FOR_RELIABLE_ANALYSIS) {
    warnings.push("High confidence with small sample size");
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Génère un rapport de debugging pour l'analyse
 */
export function generateDebugReport(
  playerId: string,
  patterns: DetectedPattern[],
  profile: BehaviorProfile | null,
  reactions: NPCReaction[]
): string {
  const lines: string[] = [];
  
  lines.push(`=== DEBUG REPORT FOR ${playerId} ===`);
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  lines.push('');
  
  // Patterns détectés
  lines.push(`DETECTED PATTERNS (${patterns.length}):`);
  for (const pattern of patterns) {
    lines.push(`  - ${pattern.patternType}: ${(pattern.confidence * 100).toFixed(1)}% confidence`);
    lines.push(`    Triggers: ${pattern.triggers.join(', ')}`);
  }
  lines.push('');
  
  // Profil comportemental
  if (profile) {
    lines.push('BEHAVIOR PROFILE:');
    lines.push(`  Confidence: ${(profile.confidence * 100).toFixed(1)}%`);
    lines.push(`  Sample Size: ${profile.sampleSize}`);
    lines.push(`  Mood: ${profile.currentState.mood}`);
    lines.push(`  Churn Risk: ${(profile.predictions.churnRisk * 100).toFixed(1)}%`);
    lines.push(`  Socialness: ${(profile.personality.socialness * 100).toFixed(1)}%`);
    lines.push(`  Competitiveness: ${(profile.personality.competitiveness * 100).toFixed(1)}%`);
    
    const validation = validateBehaviorProfile(profile);
    if (validation.warnings.length > 0) {
      lines.push('  WARNINGS:');
      validation.warnings.forEach(w => lines.push(`    - ${w}`));
    }
    if (validation.errors.length > 0) {
      lines.push('  ERRORS:');
      validation.errors.forEach(e => lines.push(`    - ${e}`));
    }
  } else {
    lines.push('BEHAVIOR PROFILE: Not available');
  }
  lines.push('');
  
  // Réactions NPCs
  lines.push(`NPC REACTIONS (${reactions.length}):`);
  for (const reaction of reactions) {
    lines.push(`  - ${reaction.npcId}: ${reaction.reactionType} (Priority: ${reaction.priority})`);
    lines.push(`    Message: "${reaction.content.message.substring(0, 50)}..."`);
    lines.push(`    Emotion: ${reaction.content.emotion}`);
  }
  
  lines.push('=== END DEBUG REPORT ===');
  
  return lines.join('\n');
}

/**
 * Utilitaire pour logger avec timestamp et couleurs
 */
export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  component: string,
  message: string,
  data?: any
): void {
  const timestamp = new Date().toISOString();
  const levelEmojis = { info: 'ℹ️', warn: '⚠️', error: '❌', debug: '🐛' };
  
  const logMessage = `${levelEmojis[level]} [${timestamp}] [${component}] ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage, data || '');
      break;
    case 'warn':
      console.warn(logMessage, data || '');
      break;
    case 'debug':
      console.debug(logMessage, data || '');
      break;
    default:
      console.log(logMessage, data || '');
  }
}

// ===================================================================
// 🎯 HELPERS SPÉCIALISÉS POUR L'ANALYSE
// ===================================================================

/**
 * Extrait les métriques clés d'une liste d'actions
 */
export function extractActionMetrics(actions: PlayerAction[]): {
  totalActions: number;
  uniqueActionTypes: number;
  categoryCounts: { [category: string]: number };
  averageInterval: number;
  peakActivityHour: number;
  longestSequence: number;
} {
  if (actions.length === 0) {
    return {
      totalActions: 0,
      uniqueActionTypes: 0,
      categoryCounts: {},
      averageInterval: 0,
      peakActivityHour: 0,
      longestSequence: 0
    };
  }
  
  const actionTypes = new Set(actions.map(a => a.actionType));
  const categoryCounts: { [category: string]: number } = {};
  
  for (const action of actions) {
    categoryCounts[action.category] = (categoryCounts[action.category] || 0) + 1;
  }
  
  // Calculer intervalle moyen
  const intervals = [];
  for (let i = 1; i < actions.length; i++) {
    intervals.push(actions[i-1].timestamp - actions[i].timestamp);
  }
  const averageInterval = intervals.length > 0 ? 
    intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
  
  // Heure de pic d'activité
  const hourFreq = analyzeActionFrequency(actions);
  const peakActivityHour = Object.entries(hourFreq)
    .sort(([,a], [,b]) => b - a)[0]?.[0] ? 
    parseInt(Object.entries(hourFreq).sort(([,a], [,b]) => b - a)[0][0]) : 0;
  
  // Séquence la plus longue d'actions similaires
  let longestSequence = 0;
  let currentSequence = 1;
  for (let i = 1; i < actions.length; i++) {
    if (actions[i].actionType === actions[i-1].actionType) {
      currentSequence++;
    } else {
      longestSequence = Math.max(longestSequence, currentSequence);
      currentSequence = 1;
    }
  }
  longestSequence = Math.max(longestSequence, currentSequence);
  
  return {
    totalActions: actions.length,
    uniqueActionTypes: actionTypes.size,
    categoryCounts,
    averageInterval,
    peakActivityHour,
    longestSequence
  };
}

/**
 * Compare deux profils comportementaux
 */
export function compareBehaviorProfiles(
  profile1: BehaviorProfile,
  profile2: BehaviorProfile
): {
  similarity: number; // 0-1
  differences: string[];
  recommendations: string[];
} {
  const differences: string[] = [];
  const recommendations: string[] = [];
  
  // Comparer personnalité
  let personalitySimilarity = 0;
  const personalityTraits = Object.keys(profile1.personality) as (keyof BehaviorProfile['personality'])[];
  
  for (const trait of personalityTraits) {
    const diff = Math.abs(profile1.personality[trait] - profile2.personality[trait]);
    personalitySimilarity += (1 - diff);
    
    if (diff > 0.3) {
      differences.push(`${trait}: ${profile1.personality[trait].toFixed(2)} vs ${profile2.personality[trait].toFixed(2)}`);
    }
  }
  personalitySimilarity /= personalityTraits.length;
  
  // Comparer état actuel
  const moodSimilarity = profile1.currentState.mood === profile2.currentState.mood ? 1 : 0;
  const energySimilarity = 1 - Math.abs(profile1.currentState.energyLevel - profile2.currentState.energyLevel);
  
  // Comparer prédictions
  const churnSimilarity = 1 - Math.abs(profile1.predictions.churnRisk - profile2.predictions.churnRisk);
  
  const overallSimilarity = weightedAverage(
    [personalitySimilarity, moodSimilarity, energySimilarity, churnSimilarity],
    [0.4, 0.2, 0.2, 0.2]
  );
  
  // Générer recommandations
  if (overallSimilarity < 0.5) {
    recommendations.push("Profiles are very different - consider individualized approaches");
  }
  
  if (Math.abs(profile1.predictions.churnRisk - profile2.predictions.churnRisk) > 0.3) {
    recommendations.push("Significant difference in churn risk - monitor closely");
  }
  
  return {
    similarity: overallSimilarity,
    differences,
    recommendations
  };
}

// ===================================================================
// 🔧 EXPORTS ORGANISÉS
// ===================================================================

export default {
  // Constantes
  BEHAVIOR_THRESHOLDS,
  NPC_MESSAGE_TEMPLATES,
  ANALYSIS_WEIGHTS,
  
  // Calculs
  normalize,
  weightedAverage,
  calculateCompositeScore,
  calculateTrend,
  calculatePredictionConfidence,
  calculateDiversity,
  
  // Analyse
  analyzeActionFrequency,
  identifyTemporalPatterns,
  calculateBehavioralConsistency,
  detectBehavioralAnomalies,
  extractActionMetrics,
  compareBehaviorProfiles,
  
  // NPCs
  selectNPCMessageTemplate,
  calculateNPCReactionPriority,
  formatNPCReaction,
  
  // Debugging
  validateBehaviorProfile,
  generateDebugReport,
  logWithContext
};
