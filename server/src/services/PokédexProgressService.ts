// server/src/services/PokédexProgressService.ts
import { PokédexEntry, IPokédexEntry } from '../models/PokédexEntry';
import { PokédexStats, IPokédexStats } from '../models/PokédexStats';
import { getPokemonById } from '../data/PokemonData';
import { EventEmitter } from 'events';

// ===== TODO: ACHIEVEMENT SYSTEM GLOBAL =====
// 
// 🏆 FUTUR SYSTÈME D'ACCOMPLISSEMENTS GÉNÉRAL À CRÉER :
//
// 1. AchievementService.ts - Service principal
//    - Gestion générale des accomplissements
//    - Catégories : pokédex, combat, exploration, social, etc.
//    - Système de points/récompenses unifié
//
// 2. AchievementDefinitions.ts - Définitions des accomplissements
//    - Pokédex : découvertes, captures, shinies, types, régions
//    - Combat : victoires, KO, streaks, tournois
//    - Exploration : zones, distances, secrets
//    - Social : échanges, amis, guildes
//    - Économie : richesse, achats, ventes
//    - Temps : connexions, événements, saisons
//
// 3. AchievementProgress.ts - Modèle de progression
//    - Progression par joueur et par accomplissement
//    - Données de déblocage, progrès, récompenses
//    - Historique et statistiques
//
// 4. AchievementNotification.ts - Système de notifications
//    - Notifications temps réel
//    - Messages formatés selon la catégorie
//    - Intégration avec les autres services
//
// 5. Types d'accomplissements à supporter :
//    - Single : déblocage unique (premier pokémon capturé)
//    - Progressive : avec étapes (10, 50, 100 captures)
//    - Streak : séries consécutives (7 jours d'affilée)
//    - Collectible : ensembles complets (tous les types)
//    - Hidden : secrets à découvrir
//    - Seasonal : événements temporaires
//    - Social : interactions entre joueurs
//    - Competitive : classements et défis
//
// INTÉGRATION AVEC LE POKÉDEX :
// - checkAchievements() appelé depuis PokédexService
// - Événements : 'pokemonSeen', 'pokemonCaught', 'shinyFound'
// - Catégories spécifiques : 'pokedex_discovery', 'pokedex_capture', etc.

// ===== TYPES SIMPLIFIÉS POUR LE POKÉDEX =====

export interface PokédexProgressAnalytics {
  completionTrend: Array<{ date: string; seen: number; caught: number }>;
  typeDistribution: Array<{ type: string; count: number; percentage: number }>;
  activityHeatmap: Array<{ day: string; hour: number; count: number }>;
  recentActivity: any[];
  predictions: {
    estimatedCompletionDate?: Date;
    nextMilestone?: { name: string; remainingDays: number };
    recommendedAreas?: string[];
  };
}

export interface PokédexStreak {
  type: 'daily_discovery' | 'daily_capture';
  current: number;
  best: number;
  lastDate: Date;
  isActive: boolean;
}

// ===== SERVICE PROGRESSION POKÉDEX SIMPLIFIÉ =====

export class PokédexProgressService extends EventEmitter {
  private static instance: PokédexProgressService;
  
  // Cache pour optimiser les performances
  private progressCache = new Map<string, any>();
  
  constructor() {
    super();
    console.log('📈 [PokédexProgressService] Service de progression Pokédx initialisé (version simplifiée)');
  }
  
  // Singleton pattern
  static getInstance(): PokédexProgressService {
    if (!PokédexProgressService.instance) {
      PokédexProgressService.instance = new PokédexProgressService();
    }
    return PokédexProgressService.instance;
  }
  
  // ===== ACCOMPLISSEMENTS POKÉDEX =====
  
  /**
   * Vérifie les accomplissements Pokédx après une action
   * 
   * TODO: ACHIEVEMENT SYSTEM GLOBAL
   * - Remplacer par AchievementService.checkAchievements('pokedex', context)
   * - Catégories : 'pokedex_discovery', 'pokedx_capture', 'pokedex_shiny', etc.
   * - Événements uniformisés entre tous les systèmes
   */
  async checkPokédexAchievements(
    playerId: string,
    context: {
      action: 'seen' | 'caught' | 'shiny';
      pokemonId: number;
      pokemonData?: any;
      isNewDiscovery?: boolean;
      isNewCapture?: boolean;
    }
  ): Promise<string[]> {
    try {
      console.log(`🏆 [PokédxProgressService] Vérification accomplissements Pokédx pour ${playerId}`);
      
      const notifications: string[] = [];
      const stats = await PokédexStats.findOrCreate(playerId);
      
      // === ACCOMPLISSEMENTS SIMPLES ===
      
      // Premier Pokémon vu
      if (context.action === 'seen' && context.isNewDiscovery && stats.totalSeen === 1) {
        notifications.push("🔍 Accomplissement : Premier Pas - Votre première découverte !");
        // TODO: AchievementService.unlock(playerId, 'pokedex_first_discovery');
      }
      
      // Premier Pokémon capturé
      if (context.action === 'caught' && context.isNewCapture && stats.totalCaught === 1) {
        notifications.push("🎯 Accomplissement : Premier Compagnon - Votre première capture !");
        // TODO: AchievementService.unlock(playerId, 'pokedex_first_capture');
      }
      
      // Premier shiny
      if (context.action === 'shiny' && stats.records.totalShinyCaught === 1) {
        notifications.push("✨ Accomplissement : Étoile Filante - Votre premier Pokémon shiny !");
        // TODO: AchievementService.unlock(playerId, 'pokedex_first_shiny');
      }
      
      // === MILESTONES DE DÉCOUVERTE ===
      const discoveryMilestones = [10, 25, 50, 75, 100, 151];
      if (context.isNewDiscovery && discoveryMilestones.includes(stats.totalSeen)) {
        notifications.push(`🏆 Milestone : ${stats.totalSeen} Pokémon découverts !`);
        // TODO: AchievementService.checkMilestone(playerId, 'pokedex_discoveries', stats.totalSeen);
      }
      
      // === MILESTONES DE CAPTURE ===
      const captureMilestones = [5, 10, 25, 50, 75, 100, 150];
      if (context.isNewCapture && captureMilestones.includes(stats.totalCaught)) {
        notifications.push(`🎖️ Milestone : ${stats.totalCaught} Pokémon capturés !`);
        // TODO: AchievementService.checkMilestone(playerId, 'pokedex_captures', stats.totalCaught);
      }
      
      // === MILESTONES SHINY ===
      const shinyMilestones = [1, 3, 5, 10];
      if (context.action === 'shiny' && shinyMilestones.includes(stats.records.totalShinyCaught)) {
        notifications.push(`🌟 Milestone Shiny : ${stats.records.totalShinyCaught} Pokémon brillants !`);
        // TODO: AchievementService.checkMilestone(playerId, 'pokedex_shinies', stats.records.totalShinyCaught);
      }
      
      // === ACCOMPLISSEMENTS SPÉCIAUX ===
      
      // Complétion Kanto
      const kantoStats = stats.regionStats.get('kanto');
      if (kantoStats && kantoStats.caught >= 150) { // Excluant Mew
        notifications.push("👑 Accomplissement Légendaire : Maître Pokémon de Kanto !");
        // TODO: AchievementService.unlock(playerId, 'pokedex_kanto_master');
      }
      
      // TODO: ACHIEVEMENT SYSTEM GLOBAL - Autres accomplissements à implémenter :
      // - Spécialiste par type (tous les Pokémon Feu/Eau/Plante capturés)
      // - Streaks (7 jours consécutifs de découvertes)
      // - Conditions spéciales (captures nocturnes, météo, etc.)
      // - Accomplissements cachés et surprises
      // - Événements saisonniers et temporaires
      
      return notifications;
      
    } catch (error) {
      console.error(`❌ [PokédxProgressService] Erreur checkAchievements:`, error);
      return [];
    }
  }
  
  // ===== GESTION DES STREAKS =====
  
  /**
   * Met à jour les streaks Pokédx
   * 
   * TODO: ACHIEVEMENT SYSTEM GLOBAL
   * - Intégrer dans système de streaks général
   * - Types : daily_login, daily_battle, daily_discovery, etc.
   * - Gestion automatique des cassures et reprises
   */
  async updatePokédexStreaks(
    playerId: string,
    action: 'seen' | 'caught',
    timestamp: Date = new Date()
  ): Promise<{ notifications: string[]; updatedStreaks: PokédexStreak[] }> {
    try {
      const stats = await PokédexStats.findOrCreate(playerId);
      const notifications: string[] = [];
      const updatedStreaks: PokédexStreak[] = [];
      
      const today = timestamp.toDateString();
      const yesterday = new Date(timestamp);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      if (action === 'seen') {
        const lastDiscovery = stats.activity.lastDiscoveryDate;
        const lastDiscoveryStr = lastDiscovery?.toDateString();
        
        if (lastDiscoveryStr !== today) { // Pas encore aujourd'hui
          if (lastDiscoveryStr === yesterdayStr) {
            // Continuation de streak
            stats.records.currentSeenStreak++;
            if (stats.records.currentSeenStreak > stats.records.longestSeenStreak) {
              stats.records.longestSeenStreak = stats.records.currentSeenStreak;
              notifications.push(`🔥 Nouveau record de découvertes : ${stats.records.longestSeenStreak} jours !`);
            }
            
            // Notifications de streak
            if (stats.records.currentSeenStreak === 7) {
              notifications.push("🌟 Streak Découverte : 7 jours consécutifs !");
              // TODO: AchievementService.unlock(playerId, 'streak_discovery_7');
            }
          } else {
            // Nouvelle streak ou cassée
            if (stats.records.currentSeenStreak >= 3) {
              notifications.push(`💔 Streak de découverte cassée après ${stats.records.currentSeenStreak} jours`);
            }
            stats.records.currentSeenStreak = 1;
          }
          
          updatedStreaks.push({
            type: 'daily_discovery',
            current: stats.records.currentSeenStreak,
            best: stats.records.longestSeenStreak,
            lastDate: timestamp,
            isActive: true
          });
        }
      }
      
      if (action === 'caught') {
        const lastCapture = stats.activity.lastCaptureDate;
        const lastCaptureStr = lastCapture?.toDateString();
        
        if (lastCaptureStr !== today) { // Pas encore aujourd'hui
          if (lastCaptureStr === yesterdayStr) {
            // Continuation de streak
            stats.records.currentCaughtStreak++;
            if (stats.records.currentCaughtStreak > stats.records.longestCaughtStreak) {
              stats.records.longestCaughtStreak = stats.records.currentCaughtStreak;
              notifications.push(`🏆 Nouveau record de captures : ${stats.records.longestCaughtStreak} jours !`);
            }
            
            // Notifications de streak
            if (stats.records.currentCaughtStreak === 5) {
              notifications.push("⚡ Streak Capture : 5 jours consécutifs !");
              // TODO: AchievementService.unlock(playerId, 'streak_capture_5');
            }
          } else {
            // Nouvelle streak ou cassée
            if (stats.records.currentCaughtStreak >= 3) {
              notifications.push(`💥 Streak de capture cassée après ${stats.records.currentCaughtStreak} jours`);
            }
            stats.records.currentCaughtStreak = 1;
          }
          
          updatedStreaks.push({
            type: 'daily_capture',
            current: stats.records.currentCaughtStreak,
            best: stats.records.longestCaughtStreak,
            lastDate: timestamp,
            isActive: true
          });
        }
      }
      
      await stats.save();
      
      return { notifications, updatedStreaks };
      
    } catch (error) {
      console.error(`❌ [PokédxProgressService] Erreur updateStreaks:`, error);
      return { notifications: [], updatedStreaks: [] };
    }
  }
  
  // ===== ANALYTICS SIMPLIFIÉES =====
  
  /**
   * Génère des analytics de progression Pokédx
   * 
   * TODO: ANALYTICS SYSTEM GLOBAL
   * - Service d'analytics général pour tous les aspects du jeu
   * - Dashboards unifiés pour les joueurs et administrateurs
   * - Métriques cross-système (Pokédx + Combat + Social, etc.)
   */
  async generatePokédexAnalytics(playerId: string): Promise<PokédexProgressAnalytics> {
    try {
      console.log(`📊 [PokédxProgressService] Génération analytics Pokédx pour ${playerId}`);
      
      const [stats, entries] = await Promise.all([
        PokédexStats.findOrCreate(playerId),
        PokédexEntry.find({ playerId }).lean()
      ]);
      
      // Trend de complétion simplifié
      const completionTrend = this.calculateSimpleCompletionTrend(entries);
      
      // Distribution par type
      const typeDistribution = await this.calculateTypeDistribution(entries);
      
      // Heatmap d'activité basique
      const activityHeatmap = this.calculateBasicActivityHeatmap(entries);
      
      // Activité récente
      const recentActivity = await this.getRecentPokédexActivity(playerId, 10);
      
      // Prédictions simples
      const predictions = this.generateSimplePredictions(stats, entries);
      
      return {
        completionTrend,
        typeDistribution,
        activityHeatmap,
        recentActivity,
        predictions
      };
      
    } catch (error) {
      console.error(`❌ [PokédxProgressService] Erreur generateAnalytics:`, error);
      throw error;
    }
  }
  
  // ===== MÉTHODES PRIVÉES SIMPLIFIÉES =====
  
  /**
   * Calcul simplifié du trend de complétion
   */
  private calculateSimpleCompletionTrend(entries: any[]): Array<{ date: string; seen: number; caught: number }> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const dailyProgress = new Map<string, { seen: number; caught: number }>();
    
    // Compter par jour
    entries.forEach(entry => {
      if (entry.firstSeenAt && entry.firstSeenAt >= last30Days) {
        const date = entry.firstSeenAt.toISOString().split('T')[0];
        if (!dailyProgress.has(date)) {
          dailyProgress.set(date, { seen: 0, caught: 0 });
        }
        dailyProgress.get(date)!.seen++;
      }
      
      if (entry.firstCaughtAt && entry.firstCaughtAt >= last30Days) {
        const date = entry.firstCaughtAt.toISOString().split('T')[0];
        if (!dailyProgress.has(date)) {
          dailyProgress.set(date, { seen: 0, caught: 0 });
        }
        dailyProgress.get(date)!.caught++;
      }
    });
    
    return Array.from(dailyProgress.entries())
      .map(([date, progress]) => ({ date, ...progress }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  /**
   * Distribution par type
   */
  private async calculateTypeDistribution(entries: any[]): Promise<Array<{ type: string; count: number; percentage: number }>> {
    const typeCounts = new Map<string, number>();
    let totalCaught = 0;
    
    for (const entry of entries) {
      if (entry.isCaught) {
        const pokemonData = await getPokemonById(entry.pokemonId);
        if (pokemonData?.types) {
          totalCaught++;
          pokemonData.types.forEach((type: string) => {
            typeCounts.set(type.toLowerCase(), (typeCounts.get(type.toLowerCase()) || 0) + 1);
          });
        }
      }
    }
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalCaught > 0 ? Math.round((count / totalCaught) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Heatmap d'activité basique
   */
  private calculateBasicActivityHeatmap(entries: any[]): Array<{ day: string; hour: number; count: number }> {
    const activityMap = new Map<string, number>();
    
    entries.forEach(entry => {
      [entry.firstSeenAt, entry.firstCaughtAt].filter(Boolean).forEach(date => {
        if (date) {
          const dayOfWeek = date.getDay(); // 0 = dimanche
          const hour = date.getHours();
          const key = `${dayOfWeek}-${hour}`;
          activityMap.set(key, (activityMap.get(key) || 0) + 1);
        }
      });
    });
    
    const result: Array<{ day: string; hour: number; count: number }> = [];
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        result.push({
          day: days[day],
          hour,
          count: activityMap.get(`${day}-${hour}`) || 0
        });
      }
    }
    
    return result;
  }
  
  /**
   * Activité récente
   */
  private async getRecentPokédexActivity(playerId: string, limit: number): Promise<any[]> {
    const recentEntries = await PokédexEntry.find({
      playerId,
      $or: [
        { lastSeenAt: { $exists: true } },
        { lastCaughtAt: { $exists: true } }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
    
    return Promise.all(recentEntries.map(async entry => {
      const pokemonData = await getPokemonById(entry.pokemonId);
      return {
        pokemonId: entry.pokemonId,
        pokemonName: pokemonData?.name || `Pokémon #${entry.pokemonId}`,
        action: entry.lastCaughtAt && entry.lastCaughtAt > (entry.lastSeenAt || new Date(0)) ? 'caught' : 'seen',
        date: entry.lastCaughtAt || entry.lastSeenAt,
        level: entry.bestSpecimen?.level || entry.firstEncounter?.level,
        isShiny: entry.bestSpecimen?.isShiny || false
      };
    }));
  }
  
  /**
   * Prédictions simples
   */
  private generateSimplePredictions(stats: IPokédexStats, entries: any[]): any {
    const predictions: any = {};
    
    // Prochaine étape simple
    const milestones = [10, 25, 50, 75, 100, 151];
    const nextMilestone = milestones.find(m => m > stats.totalCaught);
    
    if (nextMilestone) {
      predictions.nextMilestone = {
        name: `${nextMilestone} Pokémon capturés`,
        remaining: nextMilestone - stats.totalCaught
      };
    }
    
    // Estimation simple basée sur les 7 derniers jours
    const recent = entries.filter(e => 
      e.firstCaughtAt && 
      e.firstCaughtAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    if (recent > 0 && nextMilestone) {
      const dailyRate = recent / 7;
      const daysNeeded = Math.ceil((nextMilestone - stats.totalCaught) / dailyRate);
      predictions.estimatedCompletionDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
    }
    
    // Zones recommandées (statique pour l'instant)
    predictions.recommendedAreas = ['Route 1', 'Forêt de Jade', 'Mont Argenté'];
    
    return predictions;
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Nettoie les caches
   */
  clearCaches(): void {
    this.progressCache.clear();
    console.log('🧹 [PokédxProgressService] Caches nettoyés');
  }
  
  /**
   * Récupère les streaks actuelles d'un joueur
   */
  async getCurrentStreaks(playerId: string): Promise<PokédexStreak[]> {
    const stats = await PokédexStats.findOrCreate(playerId);
    
    return [
      {
        type: 'daily_discovery',
        current: stats.records.currentSeenStreak,
        best: stats.records.longestSeenStreak,
        lastDate: stats.activity.lastDiscoveryDate || new Date(),
        isActive: stats.records.currentSeenStreak > 0
      },
      {
        type: 'daily_capture',
        current: stats.records.currentCaughtStreak,
        best: stats.records.longestCaughtStreak,
        lastDate: stats.activity.lastCaptureDate || new Date(),
        isActive: stats.records.currentCaughtStreak > 0
      }
    ];
  }
}

// ===== EXPORT SINGLETON =====
export const pokédxProgressService = PokédexProgressService.getInstance();
export default pokédxProgressService;

// ===== REMINDER ACHIEVEMENT SYSTEM =====
//
// 🎯 PROCHAINES ÉTAPES POUR LE SYSTÈME D'ACCOMPLISSEMENTS GLOBAL :
//
// 1. Créer AchievementService.ts (service principal)
// 2. Créer AchievementDefinitions.ts (toutes les définitions)
// 3. Créer Achievement.ts (modèle MongoDB)
// 4. Créer AchievementProgress.ts (modèle progression joueur)
// 5. Intégrer dans tous les services (Pokédx, Combat, etc.)
// 6. Créer interface admin pour gérer les accomplissements
// 7. Système de récompenses (titres, badges, monnaie)
// 8. Événements temporaires et accomplissements saisonniers
//
// BÉNÉFICES :
// - Système unifié pour tout le jeu
// - Facilite l'ajout de nouveaux accomplissements
// - Analytics cross-système
// - Engagement joueur maximisé
// - Code réutilisable et maintenable
