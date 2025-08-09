// server/src/services/PokedexService.ts - Version mise à jour pour MongoDB
import { PokedexEntry, IPokedexEntry, PokedexEntryUtils } from '../models/PokedexEntry';
import { PokedexStats, IPokedexStats } from '../models/PokedexStats';
import { PokemonData, IPokemonData } from '../models/PokemonData'; // 🔄 NOUVEAU : Import du modèle MongoDB
import { EventEmitter } from 'events';
import { Types } from 'mongoose';

// ===== TYPES & INTERFACES =====

export interface PokedexDiscoveryData {
  pokemonId: number;
  level: number;
  location: string;
  method: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special' | 'raid' | 'legendary';
  weather?: string;
  timeOfDay?: string;
  sessionId?: string;
  isShiny?: boolean;
}

export interface PokedexCaptureData extends PokedexDiscoveryData {
  ownedPokemonId: string;
  captureTime?: number;
  isFirstAttempt?: boolean;
  ballType?: string;
}

export interface PokedexSearchFilters {
  seen?: boolean;
  caught?: boolean;
  shiny?: boolean;
  favorited?: boolean;
  types?: string[];
  regions?: string[];
  methods?: string[];
  levelRange?: { min: number; max: number };
  nameQuery?: string;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  sortBy?: 'id' | 'name' | 'level' | 'date_seen' | 'date_caught' | 'times_encountered';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PokedexProgressSummary {
  overview: {
    seen: { count: number; percentage: number; recent: number };
    caught: { count: number; percentage: number; recent: number };
    shinies: { count: number; recent: number };
    completion: { rank: string; nextMilestone?: any };
  };
  records: {
    highestLevel: number;
    longestStreak: number;
    fastestCapture?: number;
    perfectCatches: number;
    totalPlayTime: number;
  };
  activity: {
    recentActivity: any[];
    streaks: any;
    mostActiveTime: { day: string; hour: number };
  };
  progress: {
    typeProgress: any;
    regionProgress: any;
    weeklyTrend: any[];
    goals: any[];
  };
}

export interface PokedexServiceConfig {
  enableCache: boolean;
  cacheExpiry: number;
  enableValidation: boolean;
  enableNotifications: boolean;
  batchSize: number;
  maxSearchResults: number;
}

// === FONCTIONS DE DONNÉES MISES À JOUR ===

/**
 * 🔄 NOUVEAU : Récupère un Pokémon depuis MongoDB
 */
async function getPokemonById(pokemonId: number): Promise<IPokemonData | null> {
  try {
    const pokemon = await PokemonData.findByNationalDex(pokemonId);
    return pokemon;
  } catch (error) {
    console.error(`❌ [PokedexService] Erreur récupération Pokémon #${pokemonId}:`, error);
    return null;
  }
}

/**
 * 🔄 NOUVEAU : Service d'availability mis à jour
 */
class AvailablePokemonService {
  private cachedIds: number[] = [];
  private cacheTimestamp: number = 0;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  async getAvailablePokemonIds(): Promise<number[]> {
    const now = Date.now();
    if (this.cachedIds.length > 0 && (now - this.cacheTimestamp) < this.cacheExpiry) {
      return this.cachedIds;
    }

    try {
      const availablePokemon = await PokemonData.find(
        { isActive: true, isObtainable: true },
        { nationalDex: 1 }
      ).sort({ nationalDex: 1 });

      this.cachedIds = availablePokemon.map(p => p.nationalDex);
      this.cacheTimestamp = now;
      
      console.log(`🔄 [AvailablePokemonService] Cache mis à jour: ${this.cachedIds.length} Pokémon disponibles`);
      return this.cachedIds;
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur récupération IDs:`, error);
      return this.cachedIds; // Retourner le cache existant en cas d'erreur
    }
  }

  async getTotalAvailable(): Promise<number> {
    try {
      return await PokemonData.countDocuments({ isActive: true, isObtainable: true });
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur count:`, error);
      return 0;
    }
  }

  clearCache(): void {
    this.cachedIds = [];
    this.cacheTimestamp = 0;
    console.log(`🧹 [AvailablePokemonService] Cache vidé`);
  }
}

const availablePokemonService = new AvailablePokemonService();

// ===== SERVICE PRINCIPAL OPTIMISÉ =====

export class PokedexService extends EventEmitter {
  private static instance: PokedexService;
  
  private config: PokedexServiceConfig = {
    enableCache: true,
    cacheExpiry: 5 * 60 * 1000,
    enableValidation: true,
    enableNotifications: true,
    batchSize: 100,
    maxSearchResults: 1000
  };
  
  private pokemonDataCache = new Map<number, IPokemonData>();
  private playerStatsCache = new Map<string, { data: IPokedexStats; timestamp: number }>();
  private searchCache = new Map<string, { data: any; timestamp: number }>();
  
  private serviceStats = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    errors: 0,
    lastError: null as Error | null
  };
  
  constructor() {
    super();
    this.initializeService();
    console.log('🔍 [PokedexService] Service Pokédex initialisé avec MongoDB');
  }
  
  static getInstance(): PokedexService {
    if (!PokedexService.instance) {
      PokedexService.instance = new PokedexService();
    }
    return PokedexService.instance;
  }
  
  private initializeService(): void {
    setInterval(() => this.cleanupCache(), this.config.cacheExpiry);
    this.preloadCommonData().catch(error => {
      console.error('❌ [PokedexService] Erreur pré-chargement:', error);
    });
    
    this.on('error', (error) => {
      this.serviceStats.errors++;
      this.serviceStats.lastError = error;
      console.error('❌ [PokedexService] Erreur service:', error);
    });
  }
  
  // ===== API PUBLIQUE SIMPLE =====
  
  async setPokemonSeen(
    playerId: string,
    pokemonId: number,
    level: number = 1,
    location: string = 'Unknown',
    method: string = 'wild'
  ): Promise<boolean> {
    try {
      const result = await this.markPokemonAsSeen(playerId, {
        pokemonId,
        level,
        location,
        method: method as any
      });
      return result.success && result.isNewDiscovery;
    } catch (error) {
      console.error(`❌ [PokedexService] setPokemonSeen failed:`, error);
      return false;
    }
  }
  
  async setPokemonCaught(
    playerId: string,
    pokemonId: number,
    ownedPokemonId: string,
    level: number = 1,
    location: string = 'Unknown',
    isShiny: boolean = false
  ): Promise<boolean> {
    try {
      const result = await this.markPokemonAsCaught(playerId, {
        pokemonId,
        level,
        location,
        method: 'wild',
        ownedPokemonId,
        isShiny
      });
      return result.success && result.isNewCapture;
    } catch (error) {
      console.error(`❌ [PokedexService] setPokemonCaught failed:`, error);
      return false;
    }
  }
  
  async getPlayerStats(playerId: string): Promise<any> {
    try {
      return await this.getPlayerProgress(playerId);
    } catch (error) {
      console.error(`❌ [PokedexService] getPlayerStats failed:`, error);
      return null;
    }
  }
  
  // ===== DÉCOUVERTE DE POKÉMON =====
  
  async markPokemonAsSeen(
    playerId: string, 
    discoveryData: PokedexDiscoveryData
  ): Promise<{
    success: boolean;
    isNewDiscovery: boolean;
    entry: IPokedexEntry | null;
    notifications: string[];
    error?: string;
  }> {
    this.serviceStats.totalRequests++;
    
    try {
      const validation = await this.validateDiscoveryData(playerId, discoveryData);
      if (!validation.isValid) {
        return {
          success: false,
          isNewDiscovery: false,
          entry: null,
          notifications: [],
          error: validation.error
        };
      }
      
      console.log(`👁️ [PokedexService] ${playerId} voit Pokémon #${discoveryData.pokemonId}`);
      
      const entry = await PokedexEntry.findOrCreate(playerId, discoveryData.pokemonId);
      const wasAlreadySeen = entry.isSeen;
      
      const isNewDiscovery = await entry.markAsSeen({
        location: discoveryData.location,
        level: discoveryData.level,
        method: discoveryData.method,
        weather: discoveryData.weather,
        timeOfDay: discoveryData.timeOfDay,
        sessionId: discoveryData.sessionId
      });
      
      const notifications: string[] = [];
      
      if (isNewDiscovery) {
        const pokemonData = await this.getPokemonData(discoveryData.pokemonId);
        if (pokemonData) {
          // 🔄 NOUVEAU : Utiliser le nom depuis MongoDB
          const pokemonName = this.extractPokemonName(pokemonData);
          notifications.push(`Nouveau Pokémon découvert : ${pokemonName} !`);
          
          const specialNotifications = await this.checkSpecialDiscovery(pokemonData, discoveryData);
          notifications.push(...specialNotifications);
        }
        
        this.updatePlayerStatsAsync(playerId, { newSeen: true });
        
        this.emit('pokemonDiscovered', {
          playerId,
          pokemonId: discoveryData.pokemonId,
          pokemonName: pokemonData ? this.extractPokemonName(pokemonData) : undefined,
          discoveryData,
          entry,
          isNewDiscovery
        });
      }
      
      return {
        success: true,
        isNewDiscovery,
        entry,
        notifications
      };
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexService] Erreur markAsSeen:`, error);
      return {
        success: false,
        isNewDiscovery: false,
        entry: null,
        notifications: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  async markPokemonAsCaught(
    playerId: string,
    captureData: PokedexCaptureData
  ): Promise<{
    success: boolean;
    isNewCapture: boolean;
    isNewBestSpecimen: boolean;
    entry: IPokedexEntry | null;
    notifications: string[];
    error?: string;
  }> {
    this.serviceStats.totalRequests++;
    
    try {
      const validation = await this.validateCaptureData(playerId, captureData);
      if (!validation.isValid) {
        return {
          success: false,
          isNewCapture: false,
          isNewBestSpecimen: false,
          entry: null,
          notifications: [],
          error: validation.error
        };
      }
      
      console.log(`🎯 [PokedexService] ${playerId} capture Pokémon #${captureData.pokemonId} ${captureData.isShiny ? '✨' : ''}`);
      
      const entry = await PokedexEntry.findOrCreate(playerId, captureData.pokemonId);
      const wasAlreadyCaught = entry.isCaught;
      
      const isNewCapture = await entry.markAsCaught({
        level: captureData.level,
        isShiny: captureData.isShiny || false,
        ownedPokemonId: captureData.ownedPokemonId,
        location: captureData.location,
        method: captureData.method,
        captureTime: captureData.captureTime
      });
      
      const isNewBestSpecimen = await entry.updateBestSpecimen({
        level: captureData.level,
        isShiny: captureData.isShiny || false,
        ownedPokemonId: captureData.ownedPokemonId,
        location: captureData.location,
        captureTime: captureData.captureTime
      });
      
      const notifications: string[] = [];
      const pokemonData = await this.getPokemonData(captureData.pokemonId);
      
      if (isNewCapture && pokemonData) {
        const pokemonName = this.extractPokemonName(pokemonData);
        notifications.push(`${pokemonName} capturé et ajouté au Pokédex !`);
        
        if (captureData.isShiny) {
          notifications.push(`✨ C'est un ${pokemonName} shiny ! Félicitations !`);
        }
        
        if (captureData.isFirstAttempt) {
          notifications.push(`🎯 Capture parfaite du premier coup !`);
        }
        
        const achievements = await this.checkCaptureAchievements(playerId, captureData, pokemonData);
        notifications.push(...achievements);
      } else if (isNewBestSpecimen && pokemonData) {
        const pokemonName = this.extractPokemonName(pokemonData);
        if (captureData.isShiny && !entry.bestSpecimen?.isShiny) {
          notifications.push(`✨ Premier ${pokemonName} shiny capturé !`);
        } else if (captureData.level > (entry.bestSpecimen?.level || 0)) {
          notifications.push(`📈 Nouveau record de niveau pour ${pokemonName} : Niv.${captureData.level} !`);
        }
      }
      
      this.updatePlayerStatsAsync(playerId, { 
        newCaught: true, 
        isShiny: captureData.isShiny,
        captureTime: captureData.captureTime,
        isPerfect: captureData.isFirstAttempt
      });
      
      this.emit('pokemonCaptured', {
        playerId,
        pokemonId: captureData.pokemonId,
        pokemonName: pokemonData ? this.extractPokemonName(pokemonData) : undefined,
        captureData,
        isNewCapture,
        isNewBestSpecimen,
        entry
      });
      
      return {
        success: true,
        isNewCapture,
        isNewBestSpecimen,
        entry,
        notifications
      };
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexService] Erreur markAsCaught:`, error);
      return {
        success: false,
        isNewCapture: false,
        isNewBestSpecimen: false,
        entry: null,
        notifications: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  // ===== CONSULTATION OPTIMISÉE =====
  
  async getPlayerPokedex(
    playerId: string,
    filters: PokedexSearchFilters = {}
  ): Promise<{
    entries: Array<IPokedexEntry & { pokemonData?: IPokemonData }>;
    pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrev: boolean };
    summary: any;
    performance: { cached: boolean; executionTime: number };
    availablePokemon: number[];
  }> {
    const startTime = Date.now();
    this.serviceStats.totalRequests++;
    
    try {
      if (!PokedexEntryUtils.isValidPlayerId(playerId)) {
        throw new Error('Invalid player ID');
      }
      
      // 🔄 NOUVEAU : Récupérer les Pokémon disponibles depuis MongoDB
      const availablePokemonIds = await availablePokemonService.getAvailablePokemonIds();
      const totalAvailableOnServer = await availablePokemonService.getTotalAvailable();
      
      const cacheKey = this.generateSearchCacheKey(playerId, filters);
      const cachedResult = this.searchCache.get(cacheKey);
      
      if (this.config.enableCache && cachedResult && 
          (Date.now() - cachedResult.timestamp) < this.config.cacheExpiry) {
        this.serviceStats.cacheHits++;
        return {
          ...cachedResult.data,
          availablePokemon: availablePokemonIds,
          performance: { cached: true, executionTime: Date.now() - startTime }
        };
      }
      
      this.serviceStats.cacheMisses++;
      
      console.log(`📖 [PokedexService] Récupération Pokédx pour ${playerId} (${totalAvailableOnServer} Pokémon disponibles)`);
      
      const query = await this.buildSearchQuery(playerId, filters);
      query.pokemonId = { $in: availablePokemonIds };
      
      console.log(`🔍 [DEBUG] Requête Pokédx - PlayerId: "${playerId}"`);
      console.log(`🔍 [DEBUG] Filtres appliqués:`, JSON.stringify(filters));
      console.log(`🔍 [DEBUG] Query construite:`, JSON.stringify(query));
      
      const limit = Math.min(filters.limit || 50, this.config.maxSearchResults);
      const offset = Math.max(0, filters.offset || 0);
      const page = Math.floor(offset / limit) + 1;
      
      const sort = this.buildSortQuery(filters);
      
      const [entries, total] = await Promise.all([
        PokedexEntry.find(query)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean(),
        PokedexEntry.countDocuments(query)
      ]);
      
      console.log(`🔍 [DEBUG] Résultats trouvés: ${entries.length} entrées, total: ${total}`);
      console.log(`🔍 [DEBUG] Première entrée:`, entries[0] ? JSON.stringify(entries[0]) : 'aucune');
      
      const enrichedEntries = await this.enrichEntriesWithPokemonData(entries);
      
      const pagination = {
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      };
      
      const summary = await this.getQuickSummaryWithAvailablePokemon(playerId, totalAvailableOnServer);
      
      const result = {
        entries: enrichedEntries,
        pagination,
        summary,
        availablePokemon: availablePokemonIds,
        performance: { cached: false, executionTime: Date.now() - startTime }
      };
      
      if (this.config.enableCache) {
        this.searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
      
      return result;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexService] Erreur getPlayerPokedex:`, error);
      throw error;
    }
  }
  
  async getPokedexEntry(
    playerId: string,
    pokemonId: number
  ): Promise<{
    entry: IPokedexEntry | null;
    pokemonData: IPokemonData | null;
    evolutionChain?: any[];
    relatedEntries?: IPokedexEntry[];
    recommendations?: any[];
  }> {
    try {
      if (!PokedexEntryUtils.isValidPlayerId(playerId) || !PokedexEntryUtils.isValidPokemonId(pokemonId)) {
        throw new Error('Invalid parameters');
      }
      
      const [entry, pokemonData] = await Promise.all([
        PokedexEntry.findOne({ playerId, pokemonId }).lean(),
        this.getPokemonData(pokemonId)
      ]);
      
      let evolutionChain: any[] = [];
      let relatedEntries: IPokedexEntry[] = [];
      let recommendations: any[] = [];
      
      if (pokemonData) {
        const [evolutionData, relatedData, recommendationData] = await Promise.all([
          this.getEvolutionChain(pokemonId),
          this.getRelatedEntries(playerId, pokemonData),
          this.getRecommendations(playerId, pokemonData)
        ]);
        
        evolutionChain = evolutionData;
        relatedEntries = relatedData;
        recommendations = recommendationData;
      }
      
      return {
        entry,
        pokemonData,
        evolutionChain,
        relatedEntries,
        recommendations
      };
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexService] Erreur getPokedexEntry:`, error);
      throw error;
    }
  }
  
  // ===== STATISTIQUES & PROGRESSION =====
  
  async getPlayerProgress(playerId: string): Promise<PokedexProgressSummary> {
    try {
      if (!PokedexEntryUtils.isValidPlayerId(playerId)) {
        throw new Error('Invalid player ID');
      }
      
      const cachedStats = this.playerStatsCache.get(playerId);
      let stats: IPokedexStats;
      
      if (this.config.enableCache && cachedStats && 
          (Date.now() - cachedStats.timestamp) < this.config.cacheExpiry) {
        stats = cachedStats.data;
        this.serviceStats.cacheHits++;
      } else {
        stats = await PokedexStats.findOrCreate(playerId);
        
        if (stats.needsUpdate()) {
          await stats.recalculateStats();
        }
        
        this.playerStatsCache.set(playerId, { data: stats, timestamp: Date.now() });
        this.serviceStats.cacheMisses++;
      }
      
      const [recentActivity, streaks, weeklyTrend] = await Promise.all([
        this.getRecentActivity(playerId, 10),
        this.getCurrentStreaks(playerId),
        this.getWeeklyTrend(playerId, 12)
      ]);
      
      const summary: PokedexProgressSummary = {
        overview: {
          seen: {
            count: stats.totalSeen,
            percentage: stats.seenPercentage,
            recent: await this.getRecentCount(playerId, 'seen', 7)
          },
          caught: {
            count: stats.totalCaught,
            percentage: stats.caughtPercentage,
            recent: await this.getRecentCount(playerId, 'caught', 7)
          },
          shinies: {
            count: stats.records.totalShinyCaught,
            recent: await this.getRecentCount(playerId, 'shiny', 30)
          },
          completion: {
            rank: this.calculateCompletionRank(stats.caughtPercentage),
            nextMilestone: this.getNextMilestone(stats.totalCaught)
          }
        },
        records: {
          highestLevel: stats.records.highestLevelCaught,
          longestStreak: stats.records.longestCaughtStreak,
          fastestCapture: stats.records.fastestCapture || undefined,
          perfectCatches: stats.records.perfectCatches,
          totalPlayTime: stats.records.totalPlayTime
        },
        activity: {
          recentActivity,
          streaks,
          mostActiveTime: {
            day: stats.activity.mostActiveDay,
            hour: stats.activity.mostActiveHour
          }
        },
        progress: {
          typeProgress: this.formatTypeProgress(stats.typeStats),
          regionProgress: this.formatRegionProgress(stats.regionStats),
          weeklyTrend,
          goals: stats.preferences.goals
        }
      };
      
      return summary;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexService] Erreur getPlayerProgress:`, error);
      throw error;
    }
  }
  
  async recalculatePlayerStats(playerId: string, force: boolean = false): Promise<IPokedexStats> {
    try {
      if (!PokedexEntryUtils.isValidPlayerId(playerId)) {
        throw new Error('Invalid player ID');
      }
      
      console.log(`🔄 [PokedexService] Recalcul stats pour ${playerId}`);
      
      const stats = await PokedexStats.findOrCreate(playerId);
      await stats.recalculateStats(force);
      
      this.playerStatsCache.delete(playerId);
      this.searchCache.clear();
      
      this.emit('statsRecalculated', { playerId, stats });
      
      return stats;
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexService] Erreur recalculatePlayerStats:`, error);
      throw error;
    }
  }
  
  // ===== MÉTHODES PRIVÉES =====
  
  private async getQuickSummaryWithAvailablePokemon(playerId: string, totalAvailableOnServer: number): Promise<any> {
    try {
      const stats = await PokedexStats.findOrCreate(playerId);
      const availablePokemonIds = await availablePokemonService.getAvailablePokemonIds();
      
      const [seenCount, caughtCount, shinyCount] = await Promise.all([
        PokedexEntry.countDocuments({
          playerId,
          pokemonId: { $in: availablePokemonIds },
          isSeen: true
        }),
        PokedexEntry.countDocuments({
          playerId,
          pokemonId: { $in: availablePokemonIds },
          isCaught: true
        }),
        PokedexEntry.countDocuments({
          playerId,
          pokemonId: { $in: availablePokemonIds },
          'bestSpecimen.isShiny': true
        })
      ]);
      
      const seenPercentage = totalAvailableOnServer > 0 ? 
        Math.round((seenCount / totalAvailableOnServer) * 10000) / 100 : 0;
      const caughtPercentage = totalAvailableOnServer > 0 ? 
        Math.round((caughtCount / totalAvailableOnServer) * 10000) / 100 : 0;
      
      return {
        totalAvailable: totalAvailableOnServer,
        seen: {
          count: seenCount,
          percentage: seenPercentage,
          remaining: Math.max(0, totalAvailableOnServer - seenCount)
        },
        caught: {
          count: caughtCount,
          percentage: caughtPercentage,
          remaining: Math.max(0, totalAvailableOnServer - caughtCount)
        },
        shinies: {
          count: shinyCount,
          percentage: caughtCount > 0 ? Math.round((shinyCount / caughtCount) * 100) : 0
        },
        records: {
          highestLevel: stats.records.highestLevelCaught,
          longestStreak: stats.records.longestCaughtStreak,
          perfectCatches: stats.records.perfectCatches
        },
        completion: {
          rank: this.calculateCompletionRank(caughtPercentage),
          nextMilestone: this.getNextMilestoneForAvailable(caughtCount, totalAvailableOnServer)
        },
        lastCalculated: new Date(),
        basedOnAvailablePokemon: true
      };
      
    } catch (error) {
      console.error(`❌ [PokedexService] Erreur getQuickSummaryWithAvailablePokemon:`, error);
      return await this.getQuickSummary(playerId);
    }
  }
  
  private getNextMilestoneForAvailable(current: number, totalAvailable: number): any {
    const milestones = [
      Math.floor(totalAvailable * 0.1),
      Math.floor(totalAvailable * 0.25),
      Math.floor(totalAvailable * 0.5),
      Math.floor(totalAvailable * 0.75),
      Math.floor(totalAvailable * 0.9),
      totalAvailable
    ].filter(m => m > 0);
    
    const next = milestones.find(m => m > current);
    
    if (next) {
      return {
        target: next,
        remaining: next - current,
        progress: (current / next) * 100,
        percentage: Math.round((next / totalAvailable) * 100)
      };
    }
    
    return null;
  }
  
  private async validateDiscoveryData(
    playerId: string, 
    data: PokedexDiscoveryData
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!this.config.enableValidation) return { isValid: true };
    
    if (!PokedexEntryUtils.isValidPlayerId(playerId)) {
      return { isValid: false, error: 'Invalid player ID' };
    }
    
    if (!PokedexEntryUtils.isValidPokemonId(data.pokemonId)) {
      return { isValid: false, error: 'Invalid Pokemon ID' };
    }
    
    if (!PokedexEntryUtils.isValidLevel(data.level)) {
      return { isValid: false, error: 'Invalid level' };
    }
    
    if (!data.location || data.location.trim().length === 0) {
      return { isValid: false, error: 'Location is required' };
    }
    
    const pokemonData = await this.getPokemonData(data.pokemonId);
    if (!pokemonData) {
      return { isValid: false, error: 'Pokemon not found in database' };
    }
    
    return { isValid: true };
  }
  
  private async validateCaptureData(
    playerId: string, 
    data: PokedexCaptureData
  ): Promise<{ isValid: boolean; error?: string }> {
    const baseValidation = await this.validateDiscoveryData(playerId, data);
    if (!baseValidation.isValid) return baseValidation;
    
    if (!data.ownedPokemonId || !Types.ObjectId.isValid(data.ownedPokemonId)) {
      return { isValid: false, error: 'Valid owned Pokemon ID is required' };
    }
    
    if (data.captureTime !== undefined && (data.captureTime < 0 || data.captureTime > 3600)) {
      return { isValid: false, error: 'Invalid capture time' };
    }
    
    return { isValid: true };
  }
  
  /**
   * 🔄 NOUVEAU : Récupère les données d'un Pokémon avec cache MongoDB
   */
  private async getPokemonData(pokemonId: number): Promise<IPokemonData | null> {
    if (this.pokemonDataCache.has(pokemonId)) {
      this.serviceStats.cacheHits++;
      return this.pokemonDataCache.get(pokemonId) || null;
    }
    
    this.serviceStats.cacheMisses++;
    const data = await getPokemonById(pokemonId);
    
    if (data && this.config.enableCache) {
      this.pokemonDataCache.set(pokemonId, data);
    }
    
    return data;
  }
  
  /**
   * 🔄 NOUVEAU : Extrait le nom du Pokémon depuis le nameKey
   */
  private extractPokemonName(pokemonData: IPokemonData): string {
    // Extraire le nom depuis le nameKey (ex: "pokemon.name.pikachu" -> "Pikachu")
    const nameFromKey = pokemonData.nameKey.split('.').pop();
    if (nameFromKey) {
      return nameFromKey.charAt(0).toUpperCase() + nameFromKey.slice(1);
    }
    return `Pokemon #${pokemonData.nationalDex}`;
  }
  
  private updatePlayerStatsAsync(
    playerId: string, 
    updates: { 
      newSeen?: boolean; 
      newCaught?: boolean; 
      isShiny?: boolean;
      captureTime?: number;
      isPerfect?: boolean;
    }
  ): void {
    setImmediate(async () => {
      try {
        const stats = await PokedexStats.findOrCreate(playerId);
        
        if (updates.newSeen || updates.newCaught) {
          await stats.updateFromEntry(null, updates.newSeen, updates.newCaught);
          
          if (updates.newSeen) {
            await stats.updateStreaks('seen');
          }
          if (updates.newCaught) {
            await stats.updateStreaks('caught');
          }
          
          this.playerStatsCache.delete(playerId);
        }
        
        if (updates.isPerfect) {
          stats.records.perfectCatches++;
          await stats.save();
        }
        
        if (updates.captureTime && 
            (stats.records.fastestCapture === 0 || updates.captureTime < stats.records.fastestCapture)) {
          stats.records.fastestCapture = updates.captureTime;
          await stats.save();
        }
        
      } catch (error) {
        console.error(`❌ [PokedexService] Erreur updateStatsAsync:`, error);
      }
    });
  }
  
  private async buildSearchQuery(playerId: string, filters: PokedexSearchFilters): Promise<any> {
    const query: any = { playerId };
    
    if (filters.seen !== undefined) query.isSeen = filters.seen;
    if (filters.caught !== undefined) query.isCaught = filters.caught;
    if (filters.shiny) query['bestSpecimen.isShiny'] = true;
    if (filters.favorited) query.favorited = true;
    
    if (filters.tags?.length) {
      query.tags = { $in: filters.tags };
    }
    
    if (filters.levelRange) {
      query.$or = [
        { 'firstEncounter.level': { 
          $gte: filters.levelRange.min, 
          $lte: filters.levelRange.max 
        }},
        { 'bestSpecimen.level': { 
          $gte: filters.levelRange.min, 
          $lte: filters.levelRange.max 
        }}
      ];
    }
    
    if (filters.dateRange) {
      query.$or = [
        { firstSeenAt: { $gte: filters.dateRange.start, $lte: filters.dateRange.end }},
        { firstCaughtAt: { $gte: filters.dateRange.start, $lte: filters.dateRange.end }}
      ];
    }
    
    if (filters.methods?.length) {
      query['firstEncounter.method'] = { $in: filters.methods };
    }
    
    // 🔄 NOUVEAU : Recherche améliorée avec MongoDB
    if (filters.nameQuery || filters.types?.length || filters.regions?.length) {
      const pokemonIds = await this.searchPokemonByFilters(filters);
      if (pokemonIds.length === 0) {
        query.pokemonId = { $in: [] };
      } else {
        query.pokemonId = { $in: pokemonIds };
      }
    }
    
    return query;
  }
  
  private buildSortQuery(filters: PokedexSearchFilters): any {
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
    
    switch (filters.sortBy) {
      case 'id':
        return { pokemonId: sortOrder };
      case 'date_seen':
        return { firstSeenAt: sortOrder };
      case 'date_caught':
        return { firstCaughtAt: sortOrder };
      case 'level':
        return { 'bestSpecimen.level': sortOrder, 'firstEncounter.level': sortOrder };
      case 'times_encountered':
        return { timesEncountered: sortOrder };
      default:
        return { pokemonId: 1 };
    }
  }
  
  private async enrichEntriesWithPokemonData(entries: any[]): Promise<any[]> {
    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const pokemonData = await this.getPokemonData(entry.pokemonId);
        return { ...entry, pokemonData };
      })
    );
    
    return enrichedEntries;
  }
  
  /**
   * 🔄 NOUVEAU : Recherche optimisée avec MongoDB
   */
  private async searchPokemonByFilters(filters: PokedexSearchFilters): Promise<number[]> {
    try {
      const mongoQuery: any = { isActive: true, isObtainable: true };
      
      // Filtre par nom
      if (filters.nameQuery) {
        const lowerQuery = filters.nameQuery.toLowerCase();
        mongoQuery.$or = [
          { nameKey: { $regex: lowerQuery, $options: 'i' } },
          { nationalDex: isNaN(parseInt(filters.nameQuery)) ? -1 : parseInt(filters.nameQuery) }
        ];
      }
      
      // Filtre par type
      if (filters.types?.length) {
        mongoQuery.types = { $in: filters.types };
      }
      
      // Filtre par région
      if (filters.regions?.length) {
        mongoQuery.region = { $in: filters.regions };
      }
      
      const pokemonList = await PokemonData.find(mongoQuery, { nationalDex: 1 }).lean();
      return pokemonList.map(p => p.nationalDex);
      
    } catch (error) {
      console.error(`❌ [PokedexService] Erreur searchPokemonByFilters:`, error);
      return [];
    }
  }
  
  private generateSearchCacheKey(playerId: string, filters: PokedexSearchFilters): string {
    return `search_${playerId}_${JSON.stringify(filters)}`;
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, value] of this.playerStatsCache.entries()) {
      if ((now - value.timestamp) > this.config.cacheExpiry) {
        this.playerStatsCache.delete(key);
      }
    }
    
    for (const [key, value] of this.searchCache.entries()) {
      if ((now - value.timestamp) > this.config.cacheExpiry) {
        this.searchCache.delete(key);
      }
    }
    
    console.log(`🧹 [PokedexService] Cache nettoyé - Stats: ${this.playerStatsCache.size}, Search: ${this.searchCache.size}`);
  }
  
  // ===== MÉTHODES UTILITAIRES =====
  
  private async checkSpecialDiscovery(pokemonData: IPokemonData, discoveryData: PokedexDiscoveryData): Promise<string[]> {
    const notifications: string[] = [];
    
    // 🔄 NOUVEAU : Utiliser les vraies données de rareté
    if (pokemonData.category === 'legendary') {
      notifications.push(`👑 Pokémon Légendaire découvert : ${this.extractPokemonName(pokemonData)} !`);
    } else if (pokemonData.category === 'mythical') {
      notifications.push(`🌟 Pokémon Mythique découvert : ${this.extractPokemonName(pokemonData)} !`);
    } else if (pokemonData.rarity === 'legendary' || pokemonData.rarity === 'mythical') {
      notifications.push(`⭐ Pokémon Rare découvert : ${this.extractPokemonName(pokemonData)} !`);
    }
    
    // Vérifier conditions spéciales basées sur les catch locations
    if (discoveryData.weather && pokemonData.catchLocations.some(loc => 
        loc.weather?.includes(discoveryData.weather!)
    )) {
      notifications.push(`🌤️ Conditions météo parfaites pour ${this.extractPokemonName(pokemonData)} !`);
    }
    
    return notifications;
  }
  
  private async checkCaptureAchievements(
    playerId: string, 
    captureData: PokedexCaptureData, 
    pokemonData: IPokemonData
  ): Promise<string[]> {
    const achievements: string[] = [];
    
    if (captureData.isShiny) {
      achievements.push(`✨ Accomplissement : Chasseur de Brillants !`);
    }
    
    if (captureData.level >= 50) {
      achievements.push(`📈 Accomplissement : Capture de Haut Niveau !`);
    }
    
    // 🔄 NOUVEAU : Accomplissements basés sur les vraies données
    if (pokemonData.category === 'legendary' || pokemonData.category === 'mythical') {
      achievements.push(`👑 Accomplissement : Maître des Légendaires !`);
    }
    
    if (pokemonData.captureRate <= 45) { // Pokémon difficile à capturer
      achievements.push(`🎯 Accomplissement : Capture Difficile !`);
    }
    
    return achievements;
  }
  
  private async getRecentActivity(playerId: string, limit: number): Promise<any[]> {
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
      return {
        pokemonId: entry.pokemonId,
        pokemonName: pokemonData ? this.extractPokemonName(pokemonData) : `Pokémon #${entry.pokemonId}`,
        action: entry.lastCaughtAt && entry.lastCaughtAt > (entry.lastSeenAt || new Date(0)) ? 'caught' : 'seen',
        date: entry.lastCaughtAt || entry.lastSeenAt,
        level: entry.bestSpecimen?.level || entry.firstEncounter?.level,
        isShiny: entry.bestSpecimen?.isShiny || false
      };
    }));
  }
  
  private async getCurrentStreaks(playerId: string): Promise<any> {
    const stats = await PokedexStats.findOrCreate(playerId);
    
    return {
      discovery: {
        current: stats.records.currentSeenStreak,
        best: stats.records.longestSeenStreak
      },
      capture: {
        current: stats.records.currentCaughtStreak,
        best: stats.records.longestCaughtStreak
      }
    };
  }
  
  private async getWeeklyTrend(playerId: string, weeks: number): Promise<any[]> {
    const stats = await PokedexStats.findOrCreate(playerId);
    return stats.activity.weeklyProgress.slice(-weeks);
  }
  
  private async getRecentCount(playerId: string, type: 'seen' | 'caught' | 'shiny', days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const query: any = { playerId };
    
    switch (type) {
      case 'seen':
        query.firstSeenAt = { $gte: since };
        break;
      case 'caught':
        query.firstCaughtAt = { $gte: since };
        break;
      case 'shiny':
        query['bestSpecimen.isShiny'] = true;
        query['bestSpecimen.caughtAt'] = { $gte: since };
        break;
    }
    
    return await PokedexEntry.countDocuments(query);
  }
  
  private calculateCompletionRank(percentage: number): string {
    if (percentage >= 100) return 'Maître Pokémon';
    if (percentage >= 90) return 'Expert';
    if (percentage >= 75) return 'Vétéran';
    if (percentage >= 50) return 'Intermédiaire';
    if (percentage >= 25) return 'Débutant';
    return 'Novice';
  }
  
  private getNextMilestone(current: number): any {
    const milestones = [10, 25, 50, 75, 100, 151, 200, 300, 500, 1000];
    const next = milestones.find(m => m > current);
    
    if (next) {
      return {
        target: next,
        remaining: next - current,
        progress: (current / next) * 100
      };
    }
    
    return null;
  }
  
  private formatTypeProgress(typeStats: Map<string, any>): any {
    const formatted: any = {};
    if (typeStats instanceof Map) {
      typeStats.forEach((stats, type) => {
        formatted[type] = {
          seen: stats.seen,
          caught: stats.caught,
          total: stats.total,
          percentage: stats.percentage || 0
        };
      });
    }
    return formatted;
  }
  
  private formatRegionProgress(regionStats: Map<string, any>): any {
    const formatted: any = {};
    if (regionStats instanceof Map) {
      regionStats.forEach((stats, region) => {
        formatted[region] = {
          seen: stats.seen,
          caught: stats.caught,
          total: stats.total,
          percentage: stats.percentage || 0
        };
      });
    }
    return formatted;
  }
  
  private determineRegionFromId(pokemonId: number): string {
    if (pokemonId <= 151) return 'kanto';
    if (pokemonId <= 251) return 'johto';
    if (pokemonId <= 386) return 'hoenn';
    if (pokemonId <= 493) return 'sinnoh';
    if (pokemonId <= 649) return 'unova';
    if (pokemonId <= 721) return 'kalos';
    if (pokemonId <= 809) return 'alola';
    if (pokemonId <= 905) return 'galar';
    return 'other';
  }
  
  private async getQuickSummary(playerId: string): Promise<any> {
    const stats = await PokedexStats.findOrCreate(playerId);
    return stats.getCompletionSummary();
  }
  
  /**
   * 🔄 NOUVEAU : Récupère la chaîne d'évolution depuis MongoDB
   */
  private async getEvolutionChain(pokemonId: number): Promise<any[]> {
    try {
      const pokemon = await this.getPokemonData(pokemonId);
      if (!pokemon || !pokemon.evolutionChain?.length) {
        return pokemon ? [pokemon] : [];
      }
      
      // Récupérer toute la chaîne d'évolution
      const chainData = await Promise.all(
        pokemon.evolutionChain.map(async (id) => {
          const pokemonData = await this.getPokemonData(id);
          return pokemonData;
        })
      );
      
      return chainData.filter(Boolean);
    } catch (error) {
      console.error(`❌ [PokedexService] Erreur getEvolutionChain:`, error);
      return [];
    }
  }
  
  private async getRelatedEntries(playerId: string, pokemonData: IPokemonData): Promise<IPokedexEntry[]> {
    try {
      // Récupérer les entrées des Pokémon du même type
      const sameTypeIds = await this.searchPokemonByFilters({ 
        types: pokemonData.types.slice(0, 1) // Premier type seulement
      });
      
      // Filtrer pour exclure le Pokémon courant et limiter à 5
      const filteredIds = sameTypeIds
        .filter(id => id !== pokemonData.nationalDex)
        .slice(0, 5);
      
      const relatedEntries = await PokedexEntry.find({
        playerId,
        pokemonId: { $in: filteredIds }
      }).lean();
      
      return relatedEntries;
    } catch (error) {
      console.error(`❌ [PokedexService] Erreur getRelatedEntries:`, error);
      return [];
    }
  }
  
  private async getRecommendations(playerId: string, pokemonData: IPokemonData): Promise<any[]> {
    try {
      // Recommandations basées sur les évolutions et types similaires
      const recommendations = [];
      
      // Si le Pokémon peut évoluer
      if (pokemonData.evolution.canEvolve && pokemonData.evolution.evolvesInto) {
        const evolution = await this.getPokemonData(pokemonData.evolution.evolvesInto);
        if (evolution) {
          recommendations.push({
            type: 'evolution',
            pokemon: evolution,
            reason: `${this.extractPokemonName(pokemonData)} peut évoluer en ${this.extractPokemonName(evolution)}`
          });
        }
      }
      
      // Pokémon du même type non découverts
      const sameTypeIds = await this.searchPokemonByFilters({ 
        types: pokemonData.types 
      });
      
      const undiscoveredSameType = await PokedexEntry.find({
        playerId,
        pokemonId: { $in: sameTypeIds },
        isSeen: false
      }).limit(3).lean();
      
      for (const entry of undiscoveredSameType) {
        const pokemon = await this.getPokemonData(entry.pokemonId);
        if (pokemon) {
          recommendations.push({
            type: 'similar_type',
            pokemon,
            reason: `Même type que ${this.extractPokemonName(pokemonData)}`
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error(`❌ [PokedexService] Erreur getRecommendations:`, error);
      return [];
    }
  }
  
  // ===== MÉTHODES DE MAINTENANCE =====
  
  clearAllCaches(): void {
    this.pokemonDataCache.clear();
    this.playerStatsCache.clear();
    this.searchCache.clear();
    availablePokemonService.clearCache();
    console.log('🧹 [PokedexService] Tous les caches nettoyés');
  }
  
  /**
   * 🔄 NOUVEAU : Pré-chargement optimisé avec MongoDB
   */
  async preloadCommonData(): Promise<void> {
    if (!this.config.enableCache) return;
    
    console.log('⚡ [PokedexService] Pré-chargement des données depuis MongoDB...');
    
    try {
      // Pré-charger les Pokémon populaires (Gen 1)
      const popularPokemon = await PokemonData.find(
        { generation: 1, isActive: true, isObtainable: true },
        { nationalDex: 1, nameKey: 1, types: 1, baseStats: 1 }
      ).limit(this.config.batchSize);
      
      for (const pokemon of popularPokemon) {
        this.pokemonDataCache.set(pokemon.nationalDex, pokemon);
      }
      
      console.log(`✅ [PokedexService] ${popularPokemon.length} Pokémon pré-chargés`);
    } catch (error) {
      console.error('❌ [PokedexService] Erreur pré-chargement:', error);
    }
  }
  
  getServiceStats(): any {
    return {
      ...this.serviceStats,
      cacheSize: {
        pokemon: this.pokemonDataCache.size,
        playerStats: this.playerStatsCache.size,
        search: this.searchCache.size
      },
      config: this.config
    };
  }
  
  updateConfig(newConfig: Partial<PokedexServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [PokedexService] Configuration mise à jour:', newConfig);
  }
}

// ===== EXPORT SINGLETON =====
export const pokedexService = PokedexService.getInstance();
export default pokedexService;
