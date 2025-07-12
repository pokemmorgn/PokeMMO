// server/src/services/PokedexProgressService.ts
import { PokedexEntry, IPokedexEntry } from '../models/PokedexEntry';
import { PokedexStats, IPokedexStats } from '../models/PokedexStats';
import { getPokemonById } from '../data/PokemonData';
import { EventEmitter } from 'events';

// ===== TYPES & INTERFACES =====

export interface PokedexProgressAnalytics {
  // Tendances temporelles
  completionTrend: Array<{ 
    date: string; 
    seen: number; 
    caught: number; 
    cumulative: { seen: number; caught: number };
    rate: { seenPerDay: number; caughtPerDay: number };
  }>;
  
  // Distribution par type
  typeDistribution: Array<{ 
    type: string; 
    count: number; 
    percentage: number;
    rarity: number; // Basé sur la difficulté d'obtenir ce type
    completion: number; // % de complétion pour ce type
  }>;
  
  // Heatmap d'activité
  activityHeatmap: Array<{ 
    day: string; 
    hour: number; 
    count: number;
    intensity: number; // 0-100 basé sur l'activité relative
  }>;
  
  // Activité récente détaillée
  recentActivity: Array<{
    pokemonId: number;
    pokemonName: string;
    action: 'seen' | 'caught';
    date: Date;
    level?: number;
    isShiny: boolean;
    location: string;
    significance: 'normal' | 'rare' | 'milestone' | 'record';
  }>;
  
  // Prédictions et recommandations
  predictions: {
    estimatedCompletionDate?: Date;
    nextMilestone?: { 
      name: string; 
      remainingDays: number; 
      confidence: number;
    };
    recommendedAreas?: Array<{
      location: string;
      missingPokemon: number[];
      difficulty: number;
      priority: number;
    }>;
    optimalPlayTimes?: Array<{
      day: string;
      hours: string;
      expectedDiscoveries: number;
    }>;
  };
  
  // Insights intelligents
  insights: Array<{
    type: 'achievement' | 'improvement' | 'warning' | 'milestone';
    title: string;
    description: string;
    priority: number;
    actionable: boolean;
    data?: any;
  }>;
}

export interface PokedexStreak {
  type: 'daily_discovery' | 'daily_capture' | 'weekly_goal' | 'monthly_challenge';
  current: number;
  best: number;
  lastDate: Date;
  isActive: boolean;
  difficulty: number; // 1-10
  multiplier: number; // Bonus actuel
  requirements?: {
    daily: number;
    weekly: number;
    conditions?: string[];
  };
}

export interface PokedexGoal {
  id: string;
  type: 'catch_all' | 'shiny_hunt' | 'type_master' | 'region_complete' | 'level_master' | 'speed_complete';
  title: string;
  description: string;
  target: number;
  current: number;
  deadline?: Date;
  priority: number;
  difficulty: number;
  rewards?: string[];
  milestones?: Array<{
    threshold: number;
    reward: string;
    unlocked: boolean;
  }>;
}

export interface ProgressServiceConfig {
  enableCache: boolean;
  cacheExpiry: number;
  enablePredictions: boolean;
  enableInsights: boolean;
  maxAnalyticsHistory: number; // Jours d'historique
  insightUpdateInterval: number;
  predictionAccuracy: number; // 0-1
  streakToleranceDays: number;
}

// ===== SERVICE PROGRESSION OPTIMISÉ =====

export class PokedexProgressService extends EventEmitter {
  private static instance: PokedexProgressService;
  
  // Configuration du service
  private config: ProgressServiceConfig = {
    enableCache: true,
    cacheExpiry: 10 * 60 * 1000, // 10 minutes
    enablePredictions: true,
    enableInsights: true,
    maxAnalyticsHistory: 365, // 1 an
    insightUpdateInterval: 60 * 60 * 1000, // 1 heure
    predictionAccuracy: 0.8,
    streakToleranceDays: 1
  };
  
  // Cache pour optimiser les performances
  private analyticsCache = new Map<string, { data: PokedexProgressAnalytics; timestamp: number }>();
  private streaksCache = new Map<string, { data: PokedexStreak[]; timestamp: number }>();
  private goalsCache = new Map<string, { data: PokedexGoal[]; timestamp: number }>();
  private insightsCache = new Map<string, { data: any[]; timestamp: number }>();
  
  // Cache des données Pokémon pour éviter les requêtes répétées
  private pokemonDataCache = new Map<number, any>();
  
  // Statistiques de performance
  private performanceStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageExecutionTime: 0,
    errors: 0,
    predictionsGenerated: 0,
    insightsGenerated: 0
  };
  
  constructor() {
    super();
    this.initializeService();
    console.log('📈 [PokedexProgressService] Service de progression Pokédex initialisé');
  }
  
  // Singleton pattern
  static getInstance(): PokedexProgressService {
    if (!PokedexProgressService.instance) {
      PokedexProgressService.instance = new PokedexProgressService();
    }
    return PokedexProgressService.instance;
  }
  
  // ===== INITIALISATION =====
  
  private initializeService(): void {
    // Nettoyage périodique du cache
    setInterval(() => this.cleanupCache(), this.config.cacheExpiry);
    
    // Mise à jour périodique des insights
    if (this.config.enableInsights) {
      setInterval(() => this.updateAllInsights(), this.config.insightUpdateInterval);
    }
    
    // Monitoring des erreurs
    this.on('error', (error) => {
      this.performanceStats.errors++;
      console.error('❌ [PokedexProgressService] Erreur service:', error);
    });
    
    // Pré-charger les données communes
    this.preloadCommonData().catch(console.error);
  }
  
  // ===== API PUBLIQUE SIMPLE =====
  
  /**
   * API simple : Récupérer les analytics d'un joueur
   */
  async getPlayerAnalytics(playerId: string): Promise<PokedexProgressAnalytics | null> {
    try {
      return await this.generatePokedexAnalytics(playerId);
    } catch (error) {
      console.error(`❌ [PokedexProgressService] getPlayerAnalytics failed:`, error);
      return null;
    }
  }
  
  /**
   * API simple : Récupérer les streaks actuelles
   */
  async getPlayerStreaks(playerId: string): Promise<PokedexStreak[]> {
    try {
      return await this.getCurrentStreaks(playerId);
    } catch (error) {
      console.error(`❌ [PokedexProgressService] getPlayerStreaks failed:`, error);
      return [];
    }
  }
  
  /**
   * API simple : Mettre à jour les streaks
   */
  async updatePlayerStreaks(
    playerId: string,
    action: 'seen' | 'caught'
  ): Promise<{ newRecord: boolean; notifications: string[] }> {
    try {
      return await this.updatePokedexStreaks(playerId, action);
    } catch (error) {
      console.error(`❌ [PokedexProgressService] updatePlayerStreaks failed:`, error);
      return { newRecord: false, notifications: [] };
    }
  }
  
  // ===== ACCOMPLISSEMENTS POKÉDX =====
  
  /**
   * Vérifie les accomplissements Pokédx avec système intelligent
   */
  async checkPokedexAchievements(
    playerId: string,
    context: {
      action: 'seen' | 'caught' | 'shiny' | 'evolution' | 'trade';
      pokemonId: number;
      pokemonData?: any;
      isNewDiscovery?: boolean;
      isNewCapture?: boolean;
      isNewBestSpecimen?: boolean;
      level?: number;
      location?: string;
      method?: string;
    }
  ): Promise<string[]> {
    const startTime = Date.now();
    this.performanceStats.totalRequests++;
    
    try {
      if (!this.validatePlayerId(playerId)) {
        return [];
      }
      
      console.log(`🏆 [PokedexProgressService] Vérification accomplissements pour ${playerId}`);
      
      const notifications: string[] = [];
      const stats = await this.getPlayerStats(playerId);
      const pokemonData = context.pokemonData || await this.getPokemonData(context.pokemonId);
      
      // === ACCOMPLISSEMENTS DE BASE ===
      
      // Premier Pokémon vu
      if (context.action === 'seen' && context.isNewDiscovery && stats.totalSeen === 1) {
        notifications.push("🔍 Accomplissement : Premier Pas - Votre première découverte !");
        await this.recordAchievement(playerId, 'first_discovery', { pokemonId: context.pokemonId });
      }
      
      // Premier Pokémon capturé
      if (context.action === 'caught' && context.isNewCapture && stats.totalCaught === 1) {
        notifications.push("🎯 Accomplissement : Premier Compagnon - Votre première capture !");
        await this.recordAchievement(playerId, 'first_capture', { pokemonId: context.pokemonId });
      }
      
      // Premier shiny
      if (context.action === 'shiny' && stats.records.totalShinyCaught === 1) {
        notifications.push("✨ Accomplissement : Étoile Filante - Votre premier Pokémon shiny !");
        await this.recordAchievement(playerId, 'first_shiny', { pokemonId: context.pokemonId });
      }
      
      // === MILESTONES DE DÉCOUVERTE ===
      const discoveryMilestones = [10, 25, 50, 75, 100, 151, 200, 300, 500];
      if (context.isNewDiscovery && discoveryMilestones.includes(stats.totalSeen)) {
        const milestone = this.getMilestoneData('discovery', stats.totalSeen);
        notifications.push(`🏆 ${milestone.title} : ${stats.totalSeen} Pokémon découverts !`);
        await this.recordMilestone(playerId, 'discovery', stats.totalSeen);
        
        // Récompenses spéciales
        if (milestone.reward) {
          notifications.push(`🎁 Récompense débloquée : ${milestone.reward} !`);
        }
      }
      
      // === MILESTONES DE CAPTURE ===
      const captureMilestones = [5, 10, 25, 50, 75, 100, 150, 250, 500];
      if (context.isNewCapture && captureMilestones.includes(stats.totalCaught)) {
        const milestone = this.getMilestoneData('capture', stats.totalCaught);
        notifications.push(`🎖️ ${milestone.title} : ${stats.totalCaught} Pokémon capturés !`);
        await this.recordMilestone(playerId, 'capture', stats.totalCaught);
      }
      
      // === ACCOMPLISSEMENTS PAR TYPE ===
      if (pokemonData && (context.isNewDiscovery || context.isNewCapture)) {
        const typeAchievements = await this.checkTypeAchievements(playerId, pokemonData, context.action);
        notifications.push(...typeAchievements);
      }
      
      // === ACCOMPLISSEMENTS SPÉCIAUX ===
      const specialAchievements = await this.checkSpecialAchievements(playerId, stats, context);
      notifications.push(...specialAchievements);
      
      // === ACCOMPLISSEMENTS DE PERFORMANCE ===
      const performanceAchievements = await this.checkPerformanceAchievements(playerId, context);
      notifications.push(...performanceAchievements);
      
      // Mettre à jour les statistiques de performance
      const executionTime = Date.now() - startTime;
      this.updatePerformanceStats(executionTime);
      
      return notifications;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexProgressService] Erreur checkAchievements:`, error);
      return [];
    }
  }
  
  // ===== GESTION DES STREAKS AVANCÉE =====
  
  /**
   * Met à jour les streaks Pokédx avec logique intelligente
   */
  async updatePokedexStreaks(
    playerId: string,
    action: 'seen' | 'caught',
    timestamp: Date = new Date()
  ): Promise<{ newRecord: boolean; notifications: string[]; updatedStreaks: PokedexStreak[] }> {
    try {
      if (!this.validatePlayerId(playerId)) {
        return { newRecord: false, notifications: [], updatedStreaks: [] };
      }
      
      // Vérifier le cache
      const cached = this.streaksCache.get(playerId);
      let stats: IPokedexStats;
      
      if (this.config.enableCache && cached && 
          (Date.now() - cached.timestamp) < this.config.cacheExpiry) {
        // Utiliser les données en cache mais quand même mettre à jour les streaks
        stats = await this.getPlayerStats(playerId);
      } else {
        stats = await this.getPlayerStats(playerId);
      }
      
      const notifications: string[] = [];
      const updatedStreaks: PokedexStreak[] = [];
      let newRecord = false;
      
      const today = timestamp.toDateString();
      const yesterday = new Date(timestamp);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      // === STREAK DE DÉCOUVERTE ===
      if (action === 'seen') {
        const lastDiscovery = stats.activity.lastDiscoveryDate;
        const lastDiscoveryStr = lastDiscovery?.toDateString();
        
        if (lastDiscoveryStr !== today) { // Pas encore aujourd'hui
          if (lastDiscoveryStr === yesterdayStr || this.isWithinToleranceWindow(lastDiscovery, timestamp)) {
            // Continuation de streak
            stats.records.currentSeenStreak++;
            
            if (stats.records.currentSeenStreak > stats.records.longestSeenStreak) {
              stats.records.longestSeenStreak = stats.records.currentSeenStreak;
              newRecord = true;
              notifications.push(`🔥 Nouveau record de découvertes : ${stats.records.longestSeenStreak} jours !`);
            }
            
            // Notifications de milestone de streak
            const streakNotifications = this.getStreakNotifications('discovery', stats.records.currentSeenStreak);
            notifications.push(...streakNotifications);
            
          } else {
            // Nouvelle streak ou cassée
            if (stats.records.currentSeenStreak >= 3) {
              notifications.push(`💔 Streak de découverte interrompue après ${stats.records.currentSeenStreak} jours`);
              await this.recordStreakBroken(playerId, 'discovery', stats.records.currentSeenStreak);
            }
            stats.records.currentSeenStreak = 1;
          }
          
          updatedStreaks.push({
            type: 'daily_discovery',
            current: stats.records.currentSeenStreak,
            best: stats.records.longestSeenStreak,
            lastDate: timestamp,
            isActive: true,
            difficulty: this.calculateStreakDifficulty('discovery', stats.records.currentSeenStreak),
            multiplier: this.calculateStreakMultiplier(stats.records.currentSeenStreak)
          });
        }
      }
      
      // === STREAK DE CAPTURE ===
      if (action === 'caught') {
        const lastCapture = stats.activity.lastCaptureDate;
        const lastCaptureStr = lastCapture?.toDateString();
        
        if (lastCaptureStr !== today) { // Pas encore aujourd'hui
          if (lastCaptureStr === yesterdayStr || this.isWithinToleranceWindow(lastCapture, timestamp)) {
            // Continuation de streak
            stats.records.currentCaughtStreak++;
            
            if (stats.records.currentCaughtStreak > stats.records.longestCaughtStreak) {
              stats.records.longestCaughtStreak = stats.records.currentCaughtStreak;
              newRecord = true;
              notifications.push(`🏆 Nouveau record de captures : ${stats.records.longestCaughtStreak} jours !`);
            }
            
            // Notifications de milestone de streak
            const streakNotifications = this.getStreakNotifications('capture', stats.records.currentCaughtStreak);
            notifications.push(...streakNotifications);
            
          } else {
            // Nouvelle streak ou cassée
            if (stats.records.currentCaughtStreak >= 3) {
              notifications.push(`💥 Streak de capture interrompue après ${stats.records.currentCaughtStreak} jours`);
              await this.recordStreakBroken(playerId, 'capture', stats.records.currentCaughtStreak);
            }
            stats.records.currentCaughtStreak = 1;
          }
          
          updatedStreaks.push({
            type: 'daily_capture',
            current: stats.records.currentCaughtStreak,
            best: stats.records.longestCaughtStreak,
            lastDate: timestamp,
            isActive: true,
            difficulty: this.calculateStreakDifficulty('capture', stats.records.currentCaughtStreak),
            multiplier: this.calculateStreakMultiplier(stats.records.currentCaughtStreak)
          });
        }
      }
      
      // Sauvegarder les modifications
      await stats.save();
      
      // Mettre à jour le cache des streaks
      this.streaksCache.set(playerId, { 
        data: updatedStreaks, 
        timestamp: Date.now() 
      });
      
      // Émettre événement de mise à jour
      this.emit('streaksUpdated', {
        playerId,
        updatedStreaks,
        newRecord,
        notifications
      });
      
      return { newRecord, notifications, updatedStreaks };
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexProgressService] Erreur updateStreaks:`, error);
      return { newRecord: false, notifications: [], updatedStreaks: [] };
    }
  }
  
  // ===== ANALYTICS AVANCÉES =====
  
  /**
   * Génère des analytics complètes avec prédictions et insights
   */
  async generatePokedexAnalytics(playerId: string): Promise<PokedexProgressAnalytics> {
    const startTime = Date.now();
    this.performanceStats.totalRequests++;
    
    try {
      if (!this.validatePlayerId(playerId)) {
        throw new Error('Player ID invalide');
      }
      
      // Vérifier le cache
      const cached = this.analyticsCache.get(playerId);
      if (this.config.enableCache && cached && 
          (Date.now() - cached.timestamp) < this.config.cacheExpiry) {
        this.performanceStats.cacheHits++;
        return cached.data;
      }
      
      this.performanceStats.cacheMisses++;
      console.log(`📊 [PokedexProgressService] Génération analytics pour ${playerId}`);
      
      const [stats, entries] = await Promise.all([
        this.getPlayerStats(playerId),
        this.getPlayerEntries(playerId)
      ]);
      
      // Génération des analytics en parallèle
      const [
        completionTrend,
        typeDistribution,
        activityHeatmap,
        recentActivity,
        predictions,
        insights
      ] = await Promise.all([
        this.calculateCompletionTrend(entries),
        this.calculateAdvancedTypeDistribution(entries),
        this.calculateActivityHeatmap(entries),
        this.getDetailedRecentActivity(playerId, 20),
        this.config.enablePredictions ? this.generatePredictions(stats, entries) : Promise.resolve({}),
        this.config.enableInsights ? this.generateInsights(playerId, stats, entries) : Promise.resolve([])
      ]);
      
      const analytics: PokedexProgressAnalytics = {
        completionTrend,
        typeDistribution,
        activityHeatmap,
        recentActivity,
        predictions,
        insights
      };
      
      // Mise en cache
      if (this.config.enableCache) {
        this.analyticsCache.set(playerId, { 
          data: analytics, 
          timestamp: Date.now() 
        });
      }
      
      // Mettre à jour les statistiques de performance
      const executionTime = Date.now() - startTime;
      this.updatePerformanceStats(executionTime);
      
      return analytics;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexProgressService] Erreur generateAnalytics:`, error);
      throw error;
    }
  }
  
  // ===== MÉTHODES PRIVÉES OPTIMISÉES =====
  
  /**
   * Calcul avancé du trend de complétion avec taux et projections
   */
  private async calculateCompletionTrend(entries: any[]): Promise<PokedexProgressAnalytics['completionTrend']> {
    const dayMap = new Map<string, { seen: number; caught: number; cumulativeSeen: number; cumulativeCaught: number }>();
    
    // Analyser les entrées par jour
    entries.forEach(entry => {
      const seenDate = entry.firstSeenAt ? entry.firstSeenAt.toISOString().split('T')[0] : null;
      const caughtDate = entry.firstCaughtAt ? entry.firstCaughtAt.toISOString().split('T')[0] : null;
      
      if (seenDate) {
        if (!dayMap.has(seenDate)) {
          dayMap.set(seenDate, { seen: 0, caught: 0, cumulativeSeen: 0, cumulativeCaught: 0 });
        }
        dayMap.get(seenDate)!.seen++;
      }
      
      if (caughtDate) {
        if (!dayMap.has(caughtDate)) {
          dayMap.set(caughtDate, { seen: 0, caught: 0, cumulativeSeen: 0, cumulativeCaught: 0 });
        }
        dayMap.get(caughtDate)!.caught++;
      }
    });
    
    // Convertir en tableau trié et calculer les cumulatifs
    const sortedDays = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b));
    
    let cumulativeSeen = 0;
    let cumulativeCaught = 0;
    
    return sortedDays.map(([date, data], index) => {
      cumulativeSeen += data.seen;
      cumulativeCaught += data.caught;
      
      // Calculer le taux sur les 7 derniers jours
      const recentDays = sortedDays.slice(Math.max(0, index - 6), index + 1);
      const totalRecentSeen = recentDays.reduce((sum, [, d]) => sum + d.seen, 0);
      const totalRecentCaught = recentDays.reduce((sum, [, d]) => sum + d.caught, 0);
      
      return {
        date,
        seen: data.seen,
        caught: data.caught,
        cumulative: { seen: cumulativeSeen, caught: cumulativeCaught },
        rate: {
          seenPerDay: totalRecentSeen / recentDays.length,
          caughtPerDay: totalRecentCaught / recentDays.length
        }
      };
    });
  }
  
  /**
   * Distribution par type avec données de rareté et complétion
   */
  private async calculateAdvancedTypeDistribution(entries: any[]): Promise<PokedexProgressAnalytics['typeDistribution']> {
    const typeMap = new Map<string, { count: number; total: number; rarity: number[] }>();
    
    // Analyser toutes les entrées capturées
    for (const entry of entries) {
      if (entry.isCaught) {
        const pokemonData = await this.getPokemonData(entry.pokemonId);
        if (pokemonData?.types) {
          for (const type of pokemonData.types) {
            const typeKey = type.toLowerCase();
            if (!typeMap.has(typeKey)) {
              typeMap.set(typeKey, { count: 0, total: 0, rarity: [] });
            }
            typeMap.get(typeKey)!.count++;
            typeMap.get(typeKey)!.rarity.push(pokemonData.rarity || 1);
          }
        }
      }
    }
    
    // Calculer les totaux par type dans le jeu
    for (let i = 1; i <= 151; i++) { // Kanto pour commencer
      const pokemonData = await this.getPokemonData(i);
      if (pokemonData?.types) {
        for (const type of pokemonData.types) {
          const typeKey = type.toLowerCase();
          if (!typeMap.has(typeKey)) {
            typeMap.set(typeKey, { count: 0, total: 0, rarity: [] });
          }
          typeMap.get(typeKey)!.total++;
        }
      }
    }
    
    // Convertir en tableau avec calculs
    return Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        percentage: data.total > 0 ? Math.round((data.count / data.total) * 100) : 0,
        rarity: data.rarity.length > 0 ? data.rarity.reduce((a, b) => a + b, 0) / data.rarity.length : 1,
        completion: data.total > 0 ? (data.count / data.total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Heatmap d'activité avec intensité calculée
   */
  private calculateActivityHeatmap(entries: any[]): PokedexProgressAnalytics['activityHeatmap'] {
    const activityMap = new Map<string, number>();
    let maxActivity = 0;
    
    // Analyser toutes les activités
    entries.forEach(entry => {
      [entry.firstSeenAt, entry.firstCaughtAt, entry.lastSeenAt, entry.lastCaughtAt]
        .filter(Boolean)
        .forEach(date => {
          if (date) {
            const dayOfWeek = date.getDay(); // 0 = dimanche
            const hour = date.getHours();
            const key = `${dayOfWeek}-${hour}`;
            
            const current = activityMap.get(key) || 0;
            const newValue = current + 1;
            activityMap.set(key, newValue);
            
            if (newValue > maxActivity) {
              maxActivity = newValue;
            }
          }
        });
    });
    
    // Générer la heatmap complète
    const result: PokedexProgressAnalytics['activityHeatmap'] = [];
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const count = activityMap.get(key) || 0;
        
        result.push({
          day: days[day],
          hour,
          count,
          intensity: maxActivity > 0 ? Math.round((count / maxActivity) * 100) : 0
        });
      }
    }
    
    return result;
  }
  
  /**
   * Activité récente détaillée avec signification
   */
  private async getDetailedRecentActivity(playerId: string, limit: number): Promise<PokedexProgressAnalytics['recentActivity']> {
    const recentEntries = await PokedexEntry.find({
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
      const pokemonData = await this.getPokemonData(entry.pokemonId);
      const isShiny = entry.bestSpecimen?.isShiny || false;
      const action = entry.lastCaughtAt && entry.lastCaughtAt > (entry.lastSeenAt || new Date(0)) ? 'caught' : 'seen';
      
      // Déterminer la signification
      let significance: 'normal' | 'rare' | 'milestone' | 'record' = 'normal';
      if (isShiny) significance = 'rare';
      if (pokemonData?.rarity === 'legendary') significance = 'milestone';
      if (entry.bestSpecimen?.level && entry.bestSpecimen.level >= 80) significance = 'record';
      
      return {
        pokemonId: entry.pokemonId,
        pokemonName: pokemonData?.name || `Pokémon #${entry.pokemonId}`,
        action,
        date: entry.lastCaughtAt || entry.lastSeenAt || entry.updatedAt,
        level: entry.bestSpecimen?.level || entry.firstEncounter?.level,
        isShiny,
        location: entry.bestSpecimen?.location || entry.firstEncounter?.location || 'Unknown',
        significance
      };
    }));
  }
  
  /**
   * Génère des prédictions intelligentes
   */
  private async generatePredictions(stats: IPokedexStats, entries: any[]): Promise<PokedexProgressAnalytics['predictions']> {
    const predictions: PokedexProgressAnalytics['predictions'] = {};
    
    try {
      // Analyser le taux de progression récent
      const recentEntries = entries.filter(e => 
        e.firstCaughtAt && 
        e.firstCaughtAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      
      if (recentEntries.length > 0) {
        const dailyRate = recentEntries.length / 30;
        const remaining = 151 - stats.totalCaught; // Kanto
        
        if (dailyRate > 0 && remaining > 0) {
          const daysNeeded = Math.ceil(remaining / dailyRate);
          predictions.estimatedCompletionDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
          
          // Calculer la confiance basée sur la régularité
          const confidence = Math.min(0.9, Math.max(0.3, dailyRate * 0.1));
          
          // Prochaine milestone
          const milestones = [50, 75, 100, 125, 151];
          const nextMilestone = milestones.find(m => m > stats.totalCaught);
          if (nextMilestone) {
            const milestoneRemaining = nextMilestone - stats.totalCaught;
            const milestoneDays = Math.ceil(milestoneRemaining / dailyRate);
            
            predictions.nextMilestone = {
              name: `${nextMilestone} Pokémon capturés`,
              remainingDays: milestoneDays,
              confidence
            };
          }
        }
      }
      
      // Zones recommandées (basique pour l'instant)
      predictions.recommendedAreas = [
        {
          location: 'Route 1',
          missingPokemon: [16, 17, 18], // Exemple
          difficulty: 2,
          priority: 8
        },
        {
          location: 'Forêt de Jade',
          missingPokemon: [10, 11, 12, 13, 14, 15],
          difficulty: 4,
          priority: 7
        }
      ];
      
      // Heures optimales basées sur l'historique
      predictions.optimalPlayTimes = this.calculateOptimalPlayTimes(entries);
      
      this.performanceStats.predictionsGenerated++;
      
    } catch (error) {
      console.error('❌ Erreur génération prédictions:', error);
    }
    
    return predictions;
  }
  
  /**
   * Génère des insights intelligents
   */
  private async generateInsights(playerId: string, stats: IPokedexStats, entries: any[]): Promise<PokedexProgressAnalytics['insights']> {
    const insights: PokedexProgressAnalytics['insights'] = [];
    
    try {
      // Insight de progression
      if (stats.caughtPercentage > 80) {
        insights.push({
          type: 'achievement',
          title: 'Excellent Progrès !',
          description: `Vous avez capturé ${stats.caughtPercentage.toFixed(1)}% des Pokémon. Vous êtes sur la bonne voie pour devenir un Maître Pokémon !`,
          priority: 8,
          actionable: false
        });
      }
      
      // Insight de streak
      if (stats.records.currentCaughtStreak >= 7) {
        insights.push({
          type: 'milestone',
          title: 'Série Impressionnante !',
          description: `${stats.records.currentCaughtStreak} jours consécutifs de captures. Continuez ainsi !`,
          priority: 7,
          actionable: true,
          data: { type: 'streak', current: stats.records.currentCaughtStreak }
        });
      }
      
      // Insight d'amélioration
      const recentActivity = await this.getRecentActivityCount(playerId, 7);
      if (recentActivity < 3) {
        insights.push({
          type: 'improvement',
          title: 'Activité Réduite',
          description: `Seulement ${recentActivity} nouvelles découvertes cette semaine. Explorez de nouvelles zones pour relancer votre progression !`,
          priority: 6,
          actionable: true,
          data: { type: 'activity', suggestions: ['Route 1', 'Forêt de Jade'] }
        });
      }
      
      // Insight de type
      const typeDistribution = await this.calculateAdvancedTypeDistribution(entries);
      const incompletTypes = typeDistribution.filter(t => t.completion < 50);
      if (incompletTypes.length > 0) {
        const lowestType = incompletTypes[incompletTypes.length - 1];
        insights.push({
          type: 'improvement',
          title: 'Diversifiez Vos Captures',
          description: `Vous n'avez capturé que ${lowestType.completion.toFixed(1)}% des Pokémon de type ${lowestType.type}. Explorez des zones spécialisées !`,
          priority: 5,
          actionable: true,
          data: { type: 'type_focus', targetType: lowestType.type }
        });
      }
      
      this.performanceStats.insightsGenerated++;
      
    } catch (error) {
      console.error('❌ Erreur génération insights:', error);
    }
    
    return insights.sort((a, b) => b.priority - a.priority);
  }
  
  // ===== UTILITAIRES PRIVÉES =====
  
  private validatePlayerId(playerId: string): boolean {
    return typeof playerId === 'string' && playerId.trim().length > 0 && playerId.length <= 100;
  }
  
  private async getPlayerStats(playerId: string): Promise<IPokedexStats> {
    return await PokedexStats.findOrCreate(playerId);
  }
  
  private async getPlayerEntries(playerId: string): Promise<any[]> {
    return await PokedexEntry.find({ playerId }).lean();
  }
  
  private async getPokemonData(pokemonId: number): Promise<any> {
    if (this.pokemonDataCache.has(pokemonId)) {
      return this.pokemonDataCache.get(pokemonId);
    }
    
    const data = await getPokemonById(pokemonId);
    if (data) {
      this.pokemonDataCache.set(pokemonId, data);
    }
    
    return data;
  }
  
  private isWithinToleranceWindow(lastDate: Date | undefined, currentDate: Date): boolean {
    if (!lastDate) return false;
    
    const diffHours = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= (this.config.streakToleranceDays * 24);
  }
  
  private calculateStreakDifficulty(type: string, count: number): number {
    // Plus le streak est long, plus c'est difficile de le maintenir
    const base = type === 'discovery' ? 3 : 5;
    return Math.min(10, base + Math.floor(count / 7));
  }
  
  private calculateStreakMultiplier(count: number): number {
    // Bonus multiplicateur basé sur la longueur du streak
    return 1 + Math.min(2, count * 0.1);
  }
  
  private getStreakNotifications(type: string, count: number): string[] {
    const notifications: string[] = [];
    
    const milestones = type === 'discovery' ? [7, 14, 30, 60, 100] : [5, 10, 21, 45, 90];
    
    if (milestones.includes(count)) {
      const emoji = type === 'discovery' ? '🌟' : '⚡';
      const name = type === 'discovery' ? 'Découverte' : 'Capture';
      notifications.push(`${emoji} Streak ${name} : ${count} jours consécutifs !`);
      
      if (count >= 30) {
        notifications.push(`🏆 Streak Légendaire atteinte !`);
      }
    }
    
    return notifications;
  }
  
  private getMilestoneData(type: string, count: number): { title: string; reward?: string } {
    const milestones: { [key: string]: { [key: number]: { title: string; reward?: string } } } = {
      discovery: {
        10: { title: 'Explorateur Débutant', reward: 'Badge Découvreur' },
        25: { title: 'Explorateur Confirmé', reward: 'Pokédex Amélioré' },
        50: { title: 'Explorateur Expérimenté', reward: 'Boussole Spéciale' },
        100: { title: 'Maître Explorateur', reward: 'Radar Pokémon' },
        151: { title: 'Pokédex Kanto Complet', reward: 'Diplôme Maître' }
      },
      capture: {
        10: { title: 'Dresseur Débutant', reward: 'Kit de Capture' },
        25: { title: 'Dresseur Confirmé', reward: 'Pokéballs Spéciales' },
        50: { title: 'Dresseur Expérimenté', reward: 'Master Ball' },
        100: { title: 'Maître Dresseur', reward: 'Ceinture Champion' },
        151: { title: 'Champion Pokémon', reward: 'Trophée Légendaire' }
      }
    };
    
    return milestones[type]?.[count] || { title: `Milestone ${count}` };
  }
  
  private calculateOptimalPlayTimes(entries: any[]): PokedexProgressAnalytics['predictions']['optimalPlayTimes'] {
    const dayHourMap = new Map<string, number>();
    
    // Analyser les heures de succès
    entries.forEach(entry => {
      if (entry.firstCaughtAt) {
        const day = entry.firstCaughtAt.getDay();
        const hour = entry.firstCaughtAt.getHours();
        const key = `${day}-${hour}`;
        dayHourMap.set(key, (dayHourMap.get(key) || 0) + 1);
      }
    });
    
    // Trouver les créneaux les plus productifs
    const sortedSlots = Array.from(dayHourMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    
    return sortedSlots.map(([key, count]) => {
      const [dayNum, hour] = key.split('-').map(Number);
      return {
        day: days[dayNum],
        hours: `${hour}h-${hour + 1}h`,
        expectedDiscoveries: Math.round(count * 1.2) // Projection avec bonus
      };
    });
  }
  
  private async getRecentActivityCount(playerId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await PokedexEntry.countDocuments({
      playerId,
      $or: [
        { firstSeenAt: { $gte: since } },
        { firstCaughtAt: { $gte: since } }
      ]
    });
  }
  
  private updatePerformanceStats(executionTime: number): void {
    const totalOps = this.performanceStats.totalRequests;
    this.performanceStats.averageExecutionTime = 
      (this.performanceStats.averageExecutionTime * (totalOps - 1) + executionTime) / totalOps;
  }
  
  // ===== MÉTHODES D'ENREGISTREMENT =====
  
  private async recordAchievement(playerId: string, type: string, data: any): Promise<void> {
    // TODO: Enregistrer dans système d'accomplissements global
    console.log(`🏆 Achievement unlocked for ${playerId}: ${type}`, data);
  }
  
  private async recordMilestone(playerId: string, type: string, value: number): Promise<void> {
    // TODO: Enregistrer milestone
    console.log(`🎖️ Milestone reached for ${playerId}: ${type} ${value}`);
  }
  
  private async recordStreakBroken(playerId: string, type: string, count: number): Promise<void> {
    // TODO: Enregistrer streak cassée pour analytics
    console.log(`💔 Streak broken for ${playerId}: ${type} after ${count} days`);
  }
  
  // ===== MÉTHODES PUBLIQUES COMPLÉMENTAIRES =====
  
  /**
   * Récupère les streaks actuelles d'un joueur
   */
  async getCurrentStreaks(playerId: string): Promise<PokedexStreak[]> {
    try {
      if (!this.validatePlayerId(playerId)) {
        return [];
      }
      
      // Vérifier le cache
      const cached = this.streaksCache.get(playerId);
      if (this.config.enableCache && cached && 
          (Date.now() - cached.timestamp) < this.config.cacheExpiry) {
        this.performanceStats.cacheHits++;
        return cached.data;
      }
      
      this.performanceStats.cacheMisses++;
      const stats = await this.getPlayerStats(playerId);
      
      const streaks: PokedexStreak[] = [
        {
          type: 'daily_discovery',
          current: stats.records.currentSeenStreak,
          best: stats.records.longestSeenStreak,
          lastDate: stats.activity.lastDiscoveryDate || new Date(),
          isActive: stats.records.currentSeenStreak > 0,
          difficulty: this.calculateStreakDifficulty('discovery', stats.records.currentSeenStreak),
          multiplier: this.calculateStreakMultiplier(stats.records.currentSeenStreak)
        },
        {
          type: 'daily_capture',
          current: stats.records.currentCaughtStreak,
          best: stats.records.longestCaughtStreak,
          lastDate: stats.activity.lastCaptureDate || new Date(),
          isActive: stats.records.currentCaughtStreak > 0,
          difficulty: this.calculateStreakDifficulty('capture', stats.records.currentCaughtStreak),
          multiplier: this.calculateStreakMultiplier(stats.records.currentCaughtStreak)
        }
      ];
      
      // Mise en cache
      this.streaksCache.set(playerId, { data: streaks, timestamp: Date.now() });
      
      return streaks;
    } catch (error) {
      console.error(`❌ [PokedexProgressService] Erreur getCurrentStreaks:`, error);
      return [];
    }
  }
  
  // ===== ACCOMPLISSEMENTS SPÉCIALISÉS =====
  
  private async checkTypeAchievements(playerId: string, pokemonData: any, action: string): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Vérifier si c'est le premier Pokémon de ce type
    // TODO: Vérifier si tous les Pokémon de ce type sont capturés
    
    return achievements;
  }
  
  private async checkSpecialAchievements(playerId: string, stats: IPokedexStats, context: any): Promise<string[]> {
    const achievements: string[] = [];
    
    // Complétion Kanto
    if (stats.totalCaught >= 150) { // Excluant Mew
      achievements.push("👑 Accomplissement Légendaire : Maître Pokémon de Kanto !");
    }
    
    // Série de 100 jours
    if (stats.records.longestCaughtStreak >= 100) {
      achievements.push("🔥 Accomplissement Épique : Centurion des Captures !");
    }
    
    return achievements;
  }
  
  private async checkPerformanceAchievements(playerId: string, context: any): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Accomplissements basés sur les temps de capture, etc.
    
    return achievements;
  }
  
  // ===== MAINTENANCE =====
  
  private cleanupCache(): void {
    const now = Date.now();
    
    // Nettoyage de tous les caches
    [this.analyticsCache, this.streaksCache, this.goalsCache, this.insightsCache].forEach(cache => {
      for (const [key, value] of cache.entries()) {
        if ((now - value.timestamp) > this.config.cacheExpiry) {
          cache.delete(key);
        }
      }
    });
    
    console.log(`🧹 [PokedexProgressService] Cache nettoyé`);
  }
  
  private async updateAllInsights(): Promise<void> {
    // TODO: Mettre à jour les insights pour tous les joueurs actifs
    console.log('📊 [PokedexProgressService] Mise à jour des insights globale');
  }
  
  private async preloadCommonData(): Promise<void> {
    // Pré-charger les données Pokémon les plus courantes
    const commonIds = Array.from({length: 151}, (_, i) => i + 1);
    
    for (const id of commonIds.slice(0, 50)) { // Les 50 premiers
      await this.getPokemonData(id);
    }
    
    console.log('⚡ [PokedexProgressService] Données communes pré-chargées');
  }
  
  // ===== CONFIGURATION =====
  
  updateConfig(newConfig: Partial<ProgressServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [PokedexProgressService] Configuration mise à jour');
  }
  
  getServiceStats(): any {
    return {
      ...this.performanceStats,
      cacheSize: {
        analytics: this.analyticsCache.size,
        streaks: this.streaksCache.size,
        goals: this.goalsCache.size,
        insights: this.insightsCache.size,
        pokemonData: this.pokemonDataCache.size
      },
      config: this.config,
      cacheHitRatio: this.performanceStats.cacheHits / (this.performanceStats.cacheHits + this.performanceStats.cacheMisses) * 100
    };
  }
  
  clearCaches(): void {
    this.analyticsCache.clear();
    this.streaksCache.clear();
    this.goalsCache.clear();
    this.insightsCache.clear();
    this.pokemonDataCache.clear();
    console.log('🧹 [PokedexProgressService] Tous les caches nettoyés');
  }
  
  clearPlayerData(playerId: string): void {
    this.analyticsCache.delete(playerId);
    this.streaksCache.delete(playerId);
    this.goalsCache.delete(playerId);
    this.insightsCache.delete(playerId);
    console.log(`🗑️ [PokedexProgressService] Données supprimées pour ${playerId}`);
  }
}

// ===== EXPORT SINGLETON =====
export const pokedexProgressService = PokedexProgressService.getInstance();
export default pokedexProgressService;
