// server/src/services/PokédexProgressService.ts
import { PokédexEntry } from '../models/PokédexEntry';
import { PokédexStats } from '../models/PokédexStats';
import { getPokemonById } from '../data/PokemonData';
import { EventEmitter } from 'events';

// ===== TYPES SIMPLES ET SÉCURISÉS =====

export interface SimpleAchievement {
  id: string;
  name: string;
  description: string;
  category: 'discovery' | 'capture' | 'shiny' | 'streak' | 'milestone' | 'special';
  requirement: number;
  reward: string;
  isUnlocked: boolean;
  progress: number;
  unlockedAt?: Date;
}

export interface StreakInfo {
  type: 'daily_discovery' | 'daily_capture';
  current: number;
  best: number;
  lastDate: Date;
  isActive: boolean;
  daysUntilBreak: number;
}

export interface ProgressAnalytics {
  completionRate: { seen: number; caught: number; shiny: number };
  recentActivity: Array<{ date: string; seen: number; caught: number }>;
  typeProgress: Array<{ type: string; caught: number; total: number; percentage: number }>;
  milestones: {
    next: { name: string; current: number; target: number; progress: number };
    recent: Array<{ name: string; unlockedAt: Date }>;
  };
  streaks: StreakInfo[];
  predictions: {
    estimatedCompletion?: Date;
    recommendedActions: string[];
  };
}

export interface QuickProgressData {
  action: 'seen' | 'caught' | 'shiny';
  pokemonId: number;
  pokemonData?: any;
  isNew: boolean;
  count?: number;
}

// ===== ACHIEVEMENTS SIMPLIFIÉS =====

const SIMPLE_ACHIEVEMENTS = [
  // Découvertes
  { id: 'first_discovery', name: 'Premier Pas', description: 'Découvrir votre premier Pokémon', category: 'discovery', requirement: 1, reward: 'Titre: Explorateur Débutant' },
  { id: 'discovery_10', name: 'Curieux', description: 'Découvrir 10 Pokémon différents', category: 'discovery', requirement: 10, reward: 'Pokédex amélioré' },
  { id: 'discovery_25', name: 'Enquêteur', description: 'Découvrir 25 Pokémon différents', category: 'discovery', requirement: 25, reward: '500 PokéCoins' },
  { id: 'discovery_50', name: 'Explorateur', description: 'Découvrir 50 Pokémon différents', category: 'discovery', requirement: 50, reward: 'Titre: Explorateur Expert' },
  { id: 'discovery_100', name: 'Érudit', description: 'Découvrir 100 Pokémon différents', category: 'discovery', requirement: 100, reward: '1000 PokéCoins' },
  { id: 'discovery_151', name: 'Maître Pokédex', description: 'Découvrir tous les Pokémon de Kanto', category: 'discovery', requirement: 151, reward: 'Titre: Maître Pokédex' },
  
  // Captures
  { id: 'first_capture', name: 'Premier Compagnon', description: 'Capturer votre premier Pokémon', category: 'capture', requirement: 1, reward: 'Titre: Dresseur Débutant' },
  { id: 'capture_5', name: 'Collectionneur', description: 'Capturer 5 Pokémon différents', category: 'capture', requirement: 5, reward: '5 Poké Balls' },
  { id: 'capture_10', name: 'Chasseur', description: 'Capturer 10 Pokémon différents', category: 'capture', requirement: 10, reward: '10 Great Balls' },
  { id: 'capture_25', name: 'Dresseur', description: 'Capturer 25 Pokémon différents', category: 'capture', requirement: 25, reward: 'Titre: Dresseur Confirmé' },
  { id: 'capture_50', name: 'Expert', description: 'Capturer 50 Pokémon différents', category: 'capture', requirement: 50, reward: '5 Ultra Balls' },
  { id: 'capture_100', name: 'Maître Dresseur', description: 'Capturer 100 Pokémon différents', category: 'capture', requirement: 100, reward: 'Titre: Maître Dresseur' },
  { id: 'capture_151', name: 'Champion Pokédex', description: 'Capturer tous les Pokémon de Kanto', category: 'capture', requirement: 151, reward: 'Diplôme de Champion' },
  
  // Shinies
  { id: 'first_shiny', name: 'Étoile Filante', description: 'Trouver votre premier Pokémon shiny', category: 'shiny', requirement: 1, reward: 'Titre: Chasseur de Shinies' },
  { id: 'shiny_3', name: 'Collectionneur Brillant', description: 'Trouver 3 Pokémon shinies', category: 'shiny', requirement: 3, reward: 'Charme Chroma' },
  { id: 'shiny_5', name: 'Expert Shiny', description: 'Trouver 5 Pokémon shinies', category: 'shiny', requirement: 5, reward: 'Titre: Expert Shiny' },
  { id: 'shiny_10', name: 'Légende Brillante', description: 'Trouver 10 Pokémon shinies', category: 'shiny', requirement: 10, reward: 'Titre: Légende Brillante' },
  
  // Streaks
  { id: 'streak_3', name: 'Persévérant', description: '3 jours consécutifs d\'activité', category: 'streak', requirement: 3, reward: '100 XP' },
  { id: 'streak_7', name: 'Dévoué', description: '7 jours consécutifs d\'activité', category: 'streak', requirement: 7, reward: 'Titre: Dresseur Dévoué' },
  { id: 'streak_14', name: 'Assidu', description: '14 jours consécutifs d\'activité', category: 'streak', requirement: 14, reward: '1000 XP' },
  { id: 'streak_30', name: 'Légendaire', description: '30 jours consécutifs d\'activité', category: 'streak', requirement: 30, reward: 'Titre: Dresseur Légendaire' },
] as const;

// ===== SERVICE PROGRESSION OPTIMISÉ =====

export class PokédexProgressService extends EventEmitter {
  private static instance: PokédexProgressService;
  
  // Cache achievements par joueur
  private achievementCache = new Map<string, { data: SimpleAchievement[]; expires: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  
  // Statistiques
  private stats = {
    achievementsUnlocked: 0,
    streaksUpdated: 0,
    analyticsGenerated: 0
  };
  
  constructor() {
    super();
    this.setupCleanup();
    console.log('📈 [PokédexProgressService] Service de progression initialisé');
  }
  
  // Singleton sécurisé
  static getInstance(): PokédexProgressService {
    if (!PokédexProgressService.instance) {
      PokédexProgressService.instance = new PokédexProgressService();
    }
    return PokédexProgressService.instance;
  }
  
  // ===== API SIMPLE =====
  
  /**
   * 🏆 Vérifie et débloque les achievements après une action
   */
  async checkAchievements(playerId: string, data: QuickProgressData): Promise<string[]> {
    try {
      if (!this.validatePlayerId(playerId)) {
        return [];
      }
      
      const notifications: string[] = [];
      
      // Récupérer les stats du joueur
      const stats = await PokédexStats.findOrCreate(playerId);
      
      // Vérifier selon l'action
      switch (data.action) {
        case 'seen':
          if (data.isNew) {
            notifications.push(...await this.checkDiscoveryAchievements(playerId, stats.totalSeen));
          }
          break;
          
        case 'caught':
          if (data.isNew) {
            notifications.push(...await this.checkCaptureAchievements(playerId, stats.totalCaught));
          }
          break;
          
        case 'shiny':
          notifications.push(...await this.checkShinyAchievements(playerId, stats.totalShinies));
          break;
      }
      
      // Invalider le cache si des achievements ont été débloqués
      if (notifications.length > 0) {
        this.invalidateCache(playerId);
        this.stats.achievementsUnlocked += notifications.length;
      }
      
      return notifications;
      
    } catch (error) {
      console.error(`❌ [PokédexProgressService] Erreur checkAchievements:`, error);
      return [];
    }
  }
  
  /**
   * 🔥 Met à jour et vérifie les streaks
   */
  async updateStreaks(playerId: string, action: 'seen' | 'caught'): Promise<{
    notifications: string[];
    currentStreak: number;
    isNewRecord: boolean;
  }> {
    try {
      if (!this.validatePlayerId(playerId)) {
        return { notifications: [], currentStreak: 0, isNewRecord: false };
      }
      
      const stats = await PokédexStats.findOrCreate(playerId);
      const wasRecord = stats.longestStreak;
      
      // Mettre à jour la streak
      const streakContinued = await stats.updateStreak(action);
      
      const notifications: string[] = [];
      let isNewRecord = false;
      
      // Nouveau record
      if (stats.longestStreak > wasRecord) {
        isNewRecord = true;
        notifications.push(`🏆 Nouveau record de série : ${stats.longestStreak} jours !`);
      }
      
      // Milestones de streak
      const streakMilestones = [3, 7, 14, 30];
      if (streakMilestones.includes(stats.currentStreak)) {
        notifications.push(`🔥 ${stats.currentStreak} jours consécutifs d'activité !`);
        
        // Vérifier achievement de streak
        const streakAchievements = await this.checkStreakAchievements(playerId, stats.currentStreak);
        notifications.push(...streakAchievements);
      }
      
      await stats.save();
      this.stats.streaksUpdated++;
      
      return {
        notifications,
        currentStreak: stats.currentStreak,
        isNewRecord
      };
      
    } catch (error) {
      console.error(`❌ [PokédexProgressService] Erreur updateStreaks:`, error);
      return { notifications: [], currentStreak: 0, isNewRecord: false };
    }
  }
  
  /**
   * 📊 Génère les analytics de progression
   */
  async generateAnalytics(playerId: string): Promise<ProgressAnalytics> {
    try {
      if (!this.validatePlayerId(playerId)) {
        throw new Error('PlayerId invalide');
      }
      
      console.log(`📊 [PokédexProgressService] Génération analytics pour ${playerId}`);
      
      const [stats, entries] = await Promise.all([
        PokédexStats.findOrCreate(playerId),
        PokédexEntry.find({ playerId }).lean()
      ]);
      
      // Taux de complétion
      const completionRate = stats.getCompletionRate();
      
      // Activité récente (7 derniers jours)
      const recentActivity = this.calculateRecentActivity(entries);
      
      // Progression par type
      const typeProgress = await this.calculateTypeProgress(entries);
      
      // Milestones
      const milestones = this.calculateMilestones(stats);
      
      // Streaks
      const streaks = await this.getCurrentStreaks(playerId);
      
      // Prédictions
      const predictions = this.generatePredictions(stats, recentActivity);
      
      this.stats.analyticsGenerated++;
      
      return {
        completionRate,
        recentActivity,
        typeProgress,
        milestones,
        streaks,
        predictions
      };
      
    } catch (error) {
      console.error(`❌ [PokédexProgressService] Erreur generateAnalytics:`, error);
      throw error;
    }
  }
  
  /**
   * 🏅 Récupère les achievements d'un joueur
   */
  async getPlayerAchievements(playerId: string): Promise<{
    unlocked: SimpleAchievement[];
    inProgress: SimpleAchievement[];
    locked: SimpleAchievement[];
    totalPoints: number;
  }> {
    try {
      if (!this.validatePlayerId(playerId)) {
        throw new Error('PlayerId invalide');
      }
      
      // Vérifier le cache
      const cached = this.achievementCache.get(playerId);
      if (cached && Date.now() < cached.expires) {
        return this.categorizeAchievements(cached.data);
      }
      
      // Récupérer les stats
      const stats = await PokédexStats.findOrCreate(playerId);
      
      // Calculer le progrès de chaque achievement
      const achievements = await Promise.all(
        SIMPLE_ACHIEVEMENTS.map(async (achievement) => {
          const progress = await this.calculateAchievementProgress(achievement, stats);
          return {
            ...achievement,
            isUnlocked: progress.progress >= achievement.requirement,
            progress: progress.progress,
            unlockedAt: progress.unlockedAt
          };
        })
      );
      
      // Mettre en cache
      this.achievementCache.set(playerId, {
        data: achievements,
        expires: Date.now() + this.CACHE_TTL
      });
      
      return this.categorizeAchievements(achievements);
      
    } catch (error) {
      console.error(`❌ [PokédexProgressService] Erreur getPlayerAchievements:`, error);
      throw error;
    }
  }
  
  /**
   * 🔥 Récupère les streaks actuelles
   */
  async getCurrentStreaks(playerId: string): Promise<StreakInfo[]> {
    try {
      if (!this.validatePlayerId(playerId)) {
        return [];
      }
      
      const stats = await PokédexStats.findOrCreate(playerId);
      const now = new Date();
      
      return [
        {
          type: 'daily_discovery',
          current: stats.currentStreak,
          best: stats.longestStreak,
          lastDate: stats.lastActiveDate,
          isActive: this.isStreakActive(stats.lastActiveDate, now),
          daysUntilBreak: this.getDaysUntilBreak(stats.lastActiveDate, now)
        },
        {
          type: 'daily_capture',
          current: stats.currentStreak,
          best: stats.longestStreak,
          lastDate: stats.lastActiveDate,
          isActive: this.isStreakActive(stats.lastActiveDate, now),
          daysUntilBreak: this.getDaysUntilBreak(stats.lastActiveDate, now)
        }
      ];
      
    } catch (error) {
      console.error(`❌ [PokédexProgressService] Erreur getCurrentStreaks:`, error);
      return [];
    }
  }
  
  // ===== MÉTHODES PRIVÉES OPTIMISÉES =====
  
  /**
   * Vérifie les achievements de découverte
   */
  private async checkDiscoveryAchievements(playerId: string, totalSeen: number): Promise<string[]> {
    const notifications: string[] = [];
    const discoveryAchievements = SIMPLE_ACHIEVEMENTS.filter(a => a.category === 'discovery');
    
    for (const achievement of discoveryAchievements) {
      if (totalSeen === achievement.requirement) {
        notifications.push(`🏆 Achievement débloqué : ${achievement.name} - ${achievement.description}`);
        
        this.emit('achievementUnlocked', {
          playerId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          category: achievement.category
        });
      }
    }
    
    return notifications;
  }
  
  /**
   * Vérifie les achievements de capture
   */
  private async checkCaptureAchievements(playerId: string, totalCaught: number): Promise<string[]> {
    const notifications: string[] = [];
    const captureAchievements = SIMPLE_ACHIEVEMENTS.filter(a => a.category === 'capture');
    
    for (const achievement of captureAchievements) {
      if (totalCaught === achievement.requirement) {
        notifications.push(`🏆 Achievement débloqué : ${achievement.name} - ${achievement.description}`);
        
        this.emit('achievementUnlocked', {
          playerId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          category: achievement.category
        });
      }
    }
    
    return notifications;
  }
  
  /**
   * Vérifie les achievements shiny
   */
  private async checkShinyAchievements(playerId: string, totalShinies: number): Promise<string[]> {
    const notifications: string[] = [];
    const shinyAchievements = SIMPLE_ACHIEVEMENTS.filter(a => a.category === 'shiny');
    
    for (const achievement of shinyAchievements) {
      if (totalShinies === achievement.requirement) {
        notifications.push(`🏆 Achievement débloqué : ${achievement.name} - ${achievement.description}`);
        
        this.emit('achievementUnlocked', {
          playerId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          category: achievement.category
        });
      }
    }
    
    return notifications;
  }
  
  /**
   * Vérifie les achievements de streak
   */
  private async checkStreakAchievements(playerId: string, currentStreak: number): Promise<string[]> {
    const notifications: string[] = [];
    const streakAchievements = SIMPLE_ACHIEVEMENTS.filter(a => a.category === 'streak');
    
    for (const achievement of streakAchievements) {
      if (currentStreak === achievement.requirement) {
        notifications.push(`🏆 Achievement débloqué : ${achievement.name} - ${achievement.description}`);
        
        this.emit('achievementUnlocked', {
          playerId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          category: achievement.category
        });
      }
    }
    
    return notifications;
  }
  
  /**
   * Calcule le progrès d'un achievement
   */
  private async calculateAchievementProgress(achievement: typeof SIMPLE_ACHIEVEMENTS[0], stats: any): Promise<{
    progress: number;
    unlockedAt?: Date;
  }> {
    let progress = 0;
    
    switch (achievement.category) {
      case 'discovery':
        progress = stats.totalSeen;
        break;
      case 'capture':
        progress = stats.totalCaught;
        break;
      case 'shiny':
        progress = stats.totalShinies;
        break;
      case 'streak':
        progress = stats.longestStreak;
        break;
    }
    
    return {
      progress: Math.min(progress, achievement.requirement),
      unlockedAt: progress >= achievement.requirement ? new Date() : undefined
    };
  }
  
  /**
   * Catégorise les achievements
   */
  private categorizeAchievements(achievements: SimpleAchievement[]): {
    unlocked: SimpleAchievement[];
    inProgress: SimpleAchievement[];
    locked: SimpleAchievement[];
    totalPoints: number;
  } {
    const unlocked = achievements.filter(a => a.isUnlocked);
    const inProgress = achievements.filter(a => !a.isUnlocked && a.progress > 0);
    const locked = achievements.filter(a => !a.isUnlocked && a.progress === 0);
    
    return {
      unlocked,
      inProgress,
      locked,
      totalPoints: unlocked.length * 100 // 100 points par achievement
    };
  }
  
  /**
   * Calcule l'activité récente
   */
  private calculateRecentActivity(entries: any[]): Array<{ date: string; seen: number; caught: number }> {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    const activityMap = new Map<string, { seen: number; caught: number }>();
    
    // Initialiser
    last7Days.forEach(date => {
      activityMap.set(date, { seen: 0, caught: 0 });
    });
    
    // Compter
    entries.forEach(entry => {
      if (entry.firstSeenAt) {
        const date = entry.firstSeenAt.toISOString().split('T')[0];
        if (activityMap.has(date)) {
          activityMap.get(date)!.seen++;
        }
      }
      
      if (entry.firstCaughtAt) {
        const date = entry.firstCaughtAt.toISOString().split('T')[0];
        if (activityMap.has(date)) {
          activityMap.get(date)!.caught++;
        }
      }
    });
    
    return last7Days.map(date => ({
      date,
      ...activityMap.get(date)!
    }));
  }
  
  /**
   * Calcule la progression par type
   */
  private async calculateTypeProgress(entries: any[]): Promise<Array<{ type: string; caught: number; total: number; percentage: number }>> {
    const typeCounts = new Map<string, number>();
    const typeTotals = new Map<string, number>();
    
    // Compter les captures par type
    for (const entry of entries) {
      if (entry.isCaught) {
        const pokemonData = await getPokemonById(entry.pokemonId);
        if (pokemonData?.types) {
          pokemonData.types.forEach((type: string) => {
            const typeKey = type.toLowerCase();
            typeCounts.set(typeKey, (typeCounts.get(typeKey) || 0) + 1);
          });
        }
      }
    }
    
    // Calculer les totaux par type (Kanto de base)
    for (let i = 1; i <= 151; i++) {
      const pokemonData = await getPokemonById(i);
      if (pokemonData?.types) {
        pokemonData.types.forEach((type: string) => {
          const typeKey = type.toLowerCase();
          typeTotals.set(typeKey, (typeTotals.get(typeKey) || 0) + 1);
        });
      }
    }
    
    // Créer le résultat
    const result: Array<{ type: string; caught: number; total: number; percentage: number }> = [];
    
    for (const [type, total] of typeTotals) {
      const caught = typeCounts.get(type) || 0;
      const percentage = total > 0 ? Math.round((caught / total) * 100) : 0;
      
      result.push({ type, caught, total, percentage });
    }
    
    return result.sort((a, b) => b.percentage - a.percentage);
  }
  
  /**
   * Calcule les milestones
   */
  private calculateMilestones(stats: any): {
    next: { name: string; current: number; target: number; progress: number };
    recent: Array<{ name: string; unlockedAt: Date }>;
  } {
    const milestones = [
      { threshold: 10, name: '10 Pokémon capturés' },
      { threshold: 25, name: '25 Pokémon capturés' },
      { threshold: 50, name: '50 Pokémon capturés' },
      { threshold: 100, name: '100 Pokémon capturés' },
      { threshold: 151, name: 'Pokédex Kanto complet' }
    ];
    
    const nextMilestone = milestones.find(m => m.threshold > stats.totalCaught);
    
    return {
      next: nextMilestone ? {
        name: nextMilestone.name,
        current: stats.totalCaught,
        target: nextMilestone.threshold,
        progress: Math.round((stats.totalCaught / nextMilestone.threshold) * 100)
      } : {
        name: 'Pokédex complet !',
        current: stats.totalCaught,
        target: 151,
        progress: 100
      },
      recent: [] // TODO: Implémenter historique des milestones
    };
  }
  
  /**
   * Génère des prédictions simples
   */
  private generatePredictions(stats: any, recentActivity: any[]): {
    estimatedCompletion?: Date;
    recommendedActions: string[];
  } {
    const totalActivity = recentActivity.reduce((sum, day) => sum + day.caught, 0);
    const dailyRate = totalActivity / 7;
    
    const recommendations: string[] = [];
    
    if (dailyRate < 1) {
      recommendations.push('Essayez de capturer au moins 1 Pokémon par jour');
    }
    
    if (stats.currentStreak === 0) {
      recommendations.push('Commencez une série en jouant plusieurs jours consécutifs');
    }
    
    if (stats.totalShinies === 0) {
      recommendations.push('Continuez à chercher, votre premier shiny vous attend !');
    }
    
    // Estimation de complétion
    let estimatedCompletion: Date | undefined;
    if (dailyRate > 0) {
      const remaining = 151 - stats.totalCaught;
      const daysNeeded = Math.ceil(remaining / dailyRate);
      estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + daysNeeded);
    }
    
    return {
      estimatedCompletion,
      recommendedActions: recommendations
    };
  }
  
  /**
   * Vérifie si une streak est active
   */
  private isStreakActive(lastActiveDate: Date, now: Date): boolean {
    const diffDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 1; // Active si moins de 2 jours
  }
  
  /**
   * Calcule les jours avant cassure de streak
   */
  private getDaysUntilBreak(lastActiveDate: Date, now: Date): number {
    const diffDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 2 - diffDays); // Se casse après 2 jours d'inactivité
  }
  
  /**
   * Validation playerId
   */
  private validatePlayerId(playerId: string): boolean {
    return typeof playerId === 'string' && playerId.length > 0 && playerId.length <= 50;
  }
  
  /**
   * Invalide le cache
   */
  private invalidateCache(playerId: string): void {
    this.achievementCache.delete(playerId);
  }
  
  // ===== STATISTIQUES =====
  
  /**
   * Récupère les statistiques du service
   */
  getStats(): {
    achievementsUnlocked: number;
    streaksUpdated: number;
    analyticsGenerated: number;
    cacheSize: number;
    totalAchievements: number;
  } {
    return {
      achievementsUnlocked: this.stats.achievementsUnlocked,
      streaksUpdated: this.stats.streaksUpdated,
      analyticsGenerated: this.stats.analyticsGenerated,
      cacheSize: this.achievementCache.size,
      totalAchievements: SIMPLE_ACHIEVEMENTS.length
    };
  }
  
  // ===== NETTOYAGE ET MAINTENANCE =====
  
  /**
   * Configuration du nettoyage automatique
   */
  private setupCleanup(): void {
    // Nettoyage du cache toutes les 15 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 15 * 60 * 1000);
  }
  
  /**
   * Nettoie le cache expiré
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [playerId, cached] of this.achievementCache.entries()) {
      if (now > cached.expires) {
        this.achievementCache.delete(playerId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [PokédexProgressService] ${cleaned} caches expirés nettoyés`);
    }
  }
  
  /**
   * Nettoyage manuel
   */
  clearCache(): void {
    this.achievementCache.clear();
    console.log('🧹 [PokédexProgressService] Cache vidé manuellement');
  }
  
  /**
   * Reset des statistiques
   */
  resetStats(): void {
    this.stats = {
      achievementsUnlocked: 0,
      streaksUpdated: 0,
      analyticsGenerated: 0
    };
    console.log('📊 [PokédexProgressService] Statistiques remises à zéro');
  }
}

// ===== EXPORT SINGLETON =====
export const pokédexProgressService = PokédexProgressService.getInstance();
export default pokédexProgressService;
