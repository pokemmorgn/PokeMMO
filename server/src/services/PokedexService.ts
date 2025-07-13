// server/src/services/PokedexService.ts
import { PokedexEntry, IPokedexEntry, PokedexEntryUtils } from '../models/PokedexEntry';
import { PokedexStats, IPokedexStats } from '../models/PokedexStats';
import { getPokemonById } from '../data/PokemonData';
import { availablePokemonService } from './AvailablePokemonService';
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
  captureTime?: number; // Temps en secondes pour capturer
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
  cacheExpiry: number; // en millisecondes
  enableValidation: boolean;
  enableNotifications: boolean;
  batchSize: number;
  maxSearchResults: number;
}

// ===== SERVICE PRINCIPAL OPTIMISÉ =====

export class PokedexService extends EventEmitter {
  private static instance: PokedexService;
  
  // Configuration du service
  private config: PokedexServiceConfig = {
    enableCache: true,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
    enableValidation: true,
    enableNotifications: true,
    batchSize: 100,
    maxSearchResults: 1000
  };
  
  // Cache multi-niveaux pour optimiser les performances
  private pokemonDataCache = new Map<number, any>();
  private playerStatsCache = new Map<string, { data: IPokedexStats; timestamp: number }>();
  private searchCache = new Map<string, { data: any; timestamp: number }>();
  
  // Statistiques du service pour monitoring
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
    console.log('🔍 [PokedexService] Service Pokédex initialisé avec optimisations');
  }
  
  // Singleton pattern thread-safe
  static getInstance(): PokedexService {
    if (!PokedexService.instance) {
      PokedexService.instance = new PokedexService();
    }
    return PokedexService.instance;
  }
  
  // ===== INITIALISATION =====
  
  private initializeService(): void {
    // Nettoyage périodique du cache
    setInterval(() => this.cleanupCache(), this.config.cacheExpiry);
    
    // Pré-chargement des données communes
    this.preloadCommonData().catch(error => {
      console.error('❌ [PokedexService] Erreur pré-chargement:', error);
    });
    
    // Gestion des erreurs non capturées
    this.on('error', (error) => {
      this.serviceStats.errors++;
      this.serviceStats.lastError = error;
      console.error('❌ [PokedexService] Erreur service:', error);
    });
  }
  
  // ===== API PUBLIQUE SIMPLE (ONE-LINER) =====
  
  /**
   * API simple : Marquer un Pokémon comme vu en une ligne
   * Usage: await pokedexService.setPokemonSeen(playerId, pokemonId, level, location)
   */
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
  
  /**
   * API simple : Marquer un Pokémon comme capturé en une ligne
   */
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
  
  /**
   * API simple : Récupérer les stats d'un joueur
   */
  async getPlayerStats(playerId: string): Promise<any> {
    try {
      return await this.getPlayerProgress(playerId);
    } catch (error) {
      console.error(`❌ [PokedexService] getPlayerStats failed:`, error);
      return null;
    }
  }
  
  // ===== DÉCOUVERTE DE POKÉMON SÉCURISÉE =====
  
  /**
   * Marque un Pokémon comme vu avec validation complète
   */
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
      // Validation stricte des paramètres
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
      
      // Transaction atomique pour éviter les race conditions
      const entry = await PokedexEntry.findOrCreate(playerId, discoveryData.pokemonId);
      const wasAlreadySeen = entry.isSeen;
      
      // Marquer comme vu avec les données de rencontre
      const isNewDiscovery = await entry.markAsSeen({
        location: discoveryData.location,
        level: discoveryData.level,
        method: discoveryData.method,
        weather: discoveryData.weather,
        timeOfDay: discoveryData.timeOfDay,
        sessionId: discoveryData.sessionId
      });
      
      const notifications: string[] = [];
      
      // Si c'est une nouvelle découverte
      if (isNewDiscovery) {
        // Récupérer les données du Pokémon
        const pokemonData = await this.getPokemonData(discoveryData.pokemonId);
        if (pokemonData) {
          notifications.push(`Nouveau Pokémon découvert : ${pokemonData.name} !`);
          
          // Vérifier les rareté et notifications spéciales
          const specialNotifications = await this.checkSpecialDiscovery(pokemonData, discoveryData);
          notifications.push(...specialNotifications);
        }
        
        // Mettre à jour les statistiques de manière asynchrone
        this.updatePlayerStatsAsync(playerId, { newSeen: true });
        
        // Émettre événement pour les listeners
        this.emit('pokemonDiscovered', {
          playerId,
          pokemonId: discoveryData.pokemonId,
          pokemonName: pokemonData?.name,
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
  
  /**
   * Marque un Pokémon comme capturé avec validation complète
   */
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
      // Validation stricte des paramètres
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
      
      // Transaction atomique
      const entry = await PokedexEntry.findOrCreate(playerId, captureData.pokemonId);
      const wasAlreadyCaught = entry.isCaught;
      
      // Marquer comme capturé
      const isNewCapture = await entry.markAsCaught({
        level: captureData.level,
        isShiny: captureData.isShiny || false,
        ownedPokemonId: captureData.ownedPokemonId,
        location: captureData.location,
        method: captureData.method,
        captureTime: captureData.captureTime
      });
      
      // Vérifier si c'est un meilleur spécimen
      const isNewBestSpecimen = await entry.updateBestSpecimen({
        level: captureData.level,
        isShiny: captureData.isShiny || false,
        ownedPokemonId: captureData.ownedPokemonId,
        location: captureData.location,
        captureTime: captureData.captureTime
      });
      
      const notifications: string[] = [];
      
      // Récupérer les données du Pokémon
      const pokemonData = await this.getPokemonData(captureData.pokemonId);
      
      if (isNewCapture && pokemonData) {
        notifications.push(`${pokemonData.name} capturé et ajouté au Pokédex !`);
        
        if (captureData.isShiny) {
          notifications.push(`✨ C'est un ${pokemonData.name} shiny ! Félicitations !`);
        }
        
        if (captureData.isFirstAttempt) {
          notifications.push(`🎯 Capture parfaite du premier coup !`);
        }
        
        // Vérifier les accomplissements de capture
        const achievements = await this.checkCaptureAchievements(playerId, captureData, pokemonData);
        notifications.push(...achievements);
      } else if (isNewBestSpecimen && pokemonData) {
        if (captureData.isShiny && !entry.bestSpecimen?.isShiny) {
          notifications.push(`✨ Premier ${pokemonData.name} shiny capturé !`);
        } else if (captureData.level > (entry.bestSpecimen?.level || 0)) {
          notifications.push(`📈 Nouveau record de niveau pour ${pokemonData.name} : Niv.${captureData.level} !`);
        }
      }
      
      // Mettre à jour les statistiques de manière asynchrone
      this.updatePlayerStatsAsync(playerId, { 
        newCaught: true, 
        isShiny: captureData.isShiny,
        captureTime: captureData.captureTime,
        isPerfect: captureData.isFirstAttempt
      });
      
      // Émettre événement
      this.emit('pokemonCaptured', {
        playerId,
        pokemonId: captureData.pokemonId,
        pokemonName: pokemonData?.name,
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
  
  /**
   * Récupère les entrées du Pokédex avec filtres avancés et cache
   */
  async getPlayerPokedex(
    playerId: string,
    filters: PokedexSearchFilters = {}
  ): Promise<{
    entries: Array<IPokedexEntry & { pokemonData?: any }>;
    pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrev: boolean };
    summary: any;
    performance: { cached: boolean; executionTime: number };
    availablePokemon: number[]; // 🆕 AJOUTER CETTE LIGNE
  }> {
    const startTime = Date.now();
    this.serviceStats.totalRequests++;
    
    try {
      // Validation des paramètres
      if (!PokedexEntryUtils.isValidPlayerId(playerId)) {
        throw new Error('Invalid player ID');
      }
      
      // 🆕 RÉCUPÉRER LES POKÉMON DISPONIBLES SUR LE SERVEUR
      const availablePokemonIds = availablePokemonService.getAvailablePokemonIds();
      const totalAvailableOnServer = availablePokemonService.getTotalAvailable();
      
      // Générer clé de cache
      const cacheKey = this.generateSearchCacheKey(playerId, filters);
      const cachedResult = this.searchCache.get(cacheKey);
      
      if (this.config.enableCache && cachedResult && 
          (Date.now() - cachedResult.timestamp) < this.config.cacheExpiry) {
        this.serviceStats.cacheHits++;
        return {
          ...cachedResult.data,
          availablePokemon: availablePokemonIds, // 🆕 AJOUTER LES IDS DISPONIBLES
          performance: { cached: true, executionTime: Date.now() - startTime }
        };
      }
      
      this.serviceStats.cacheMisses++;
      
      console.log(`📖 [PokedexService] Récupération Pokédx pour ${playerId} (${totalAvailableOnServer} Pokémon disponibles)`);
      // Construction de la requête optimisée
      const query = await this.buildSearchQuery(playerId, filters);
      
      // 🆕 FILTRER POUR NE GARDER QUE LES POKÉMON DISPONIBLES
      query.pokemonId = { $in: availablePokemonIds };
      
      // Ajoutez ces lignes juste après :
      console.log(`🔍 [DEBUG] Requête Pokédx - PlayerId: "${playerId}"`);
      console.log(`🔍 [DEBUG] Filtres appliqués:`, JSON.stringify(filters));
      console.log(`🔍 [DEBUG] Query construite:`, JSON.stringify(query));
      
      // Pagination sécurisée
      const limit = Math.min(filters.limit || 50, this.config.maxSearchResults);
      const offset = Math.max(0, filters.offset || 0);
      const page = Math.floor(offset / limit) + 1;
      
      // Tri optimisé
      const sort = this.buildSortQuery(filters);
      
      // Exécution des requêtes en parallèle
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
      // Enrichissement avec les données Pokémon en batch
      const enrichedEntries = await this.enrichEntriesWithPokemonData(entries);
      
      // Pagination info
      const pagination = {
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      };
      
      // 🆕 RÉSUMÉ AVEC LES VRAIES DONNÉES DU SERVEUR
      const summary = await this.getQuickSummaryWithAvailablePokemon(playerId, totalAvailableOnServer);
      
      const result = {
        entries: enrichedEntries,
        pagination,
        summary,
        availablePokemon: availablePokemonIds, // 🆕 LISTE DES POKÉMON DISPONIBLES
        performance: { cached: false, executionTime: Date.now() - startTime }
      };
      
      // Mise en cache du résultat
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
  
  /**
   * Récupère une entrée spécifique avec cache
   */
  async getPokedexEntry(
    playerId: string,
    pokemonId: number
  ): Promise<{
    entry: IPokedexEntry | null;
    pokemonData: any;
    evolutionChain?: any[];
    relatedEntries?: IPokedexEntry[];
    recommendations?: any[];
  }> {
    try {
      // Validation
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
        // Récupérer la chaîne d'évolution complète en parallèle
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
  
  /**
   * Récupère les statistiques complètes avec cache intelligent
   */
  async getPlayerProgress(playerId: string): Promise<PokedexProgressSummary> {
    try {
      // Validation
      if (!PokedexEntryUtils.isValidPlayerId(playerId)) {
        throw new Error('Invalid player ID');
      }
      
      // Vérifier le cache
      const cachedStats = this.playerStatsCache.get(playerId);
      let stats: IPokedexStats;
      
      if (this.config.enableCache && cachedStats && 
          (Date.now() - cachedStats.timestamp) < this.config.cacheExpiry) {
        stats = cachedStats.data;
        this.serviceStats.cacheHits++;
      } else {
        stats = await PokedexStats.findOrCreate(playerId);
        
        // Vérifier si recalcul nécessaire
        if (stats.needsUpdate()) {
          await stats.recalculateStats();
        }
        
        // Mise en cache
        this.playerStatsCache.set(playerId, { data: stats, timestamp: Date.now() });
        this.serviceStats.cacheMisses++;
      }
      
      // Récupérer données complémentaires en parallèle
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
  
  /**
   * Force un recalcul complet avec optimisations
   */
      async recalculatePlayerStats(playerId: string, force: boolean = false): Promise<IPokedexStats> {
        try {
          if (!PokedexEntryUtils.isValidPlayerId(playerId)) {
            throw new Error('Invalid player ID');
          }
          
          console.log(`🔄 [PokedexService] Recalcul stats pour ${playerId}`);
          
          const stats = await PokedexStats.findOrCreate(playerId);
          await stats.recalculateStats(force);
          
          // Invalider le cache
          this.playerStatsCache.delete(playerId);
          this.searchCache.clear(); // Clear search cache as stats changed
          
          this.emit('statsRecalculated', { playerId, stats });
          
          return stats;
        } catch (error) {
          this.emit('error', error);
          console.error(`❌ [PokedexService] Erreur recalculatePlayerStats:`, error);
          throw error;
        }
      }
      
      // ===== MÉTHODES PRIVÉES UTILITAIRES =====
      
      /**
       * Validation complète des données de découverte
       */
        private async getQuickSummaryWithAvailablePokemon(playerId: string, totalAvailableOnServer: number): Promise<any> {
        try {
          // Récupérer les stats du joueur
          const stats = await PokedexStats.findOrCreate(playerId);
          
          // Récupérer les IDs disponibles sur le serveur
          const availablePokemonIds = availablePokemonService.getAvailablePokemonIds();
          
          // Compter combien de Pokémon disponibles le joueur a vus/capturés
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
          
          // Calculer les pourcentages corrects
          const seenPercentage = totalAvailableOnServer > 0 ? 
            Math.round((seenCount / totalAvailableOnServer) * 10000) / 100 : 0;
          const caughtPercentage = totalAvailableOnServer > 0 ? 
            Math.round((caughtCount / totalAvailableOnServer) * 10000) / 100 : 0;
          
          return {
            // Données basées sur les Pokémon réellement disponibles
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
            
            // Stats générales du joueur (inchangées)
            records: {
              highestLevel: stats.records.highestLevelCaught,
              longestStreak: stats.records.longestCaughtStreak,
              perfectCatches: stats.records.perfectCatches
            },
            
            // Progression et rang
            completion: {
              rank: this.calculateCompletionRank(caughtPercentage),
              nextMilestone: this.getNextMilestoneForAvailable(caughtCount, totalAvailableOnServer)
            },
            
            // Métadonnées
            lastCalculated: new Date(),
            basedOnAvailablePokemon: true // Flag pour indiquer le nouveau calcul
          };
          
        } catch (error) {
          console.error(`❌ [PokedexService] Erreur getQuickSummaryWithAvailablePokemon:`, error);
          
          // Fallback vers l'ancienne méthode en cas d'erreur
          return await this.getQuickSummary(playerId);
        }
      }
    private getNextMilestoneForAvailable(current: number, totalAvailable: number): any {
    // Milestones dynamiques basés sur le total disponible
    const milestones = [
      Math.floor(totalAvailable * 0.1),  // 10%
      Math.floor(totalAvailable * 0.25), // 25%
      Math.floor(totalAvailable * 0.5),  // 50%
      Math.floor(totalAvailable * 0.75), // 75%
      Math.floor(totalAvailable * 0.9),  // 90%
      totalAvailable                      // 100%
    ].filter(m => m > 0); // Retirer les 0
    
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
    
    // Validation des paramètres de base
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
    
    // Validation que le Pokémon existe
    const pokemonData = await this.getPokemonData(data.pokemonId);
    if (!pokemonData) {
      return { isValid: false, error: 'Pokemon not found in database' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validation complète des données de capture
   */
  private async validateCaptureData(
    playerId: string, 
    data: PokedexCaptureData
  ): Promise<{ isValid: boolean; error?: string }> {
    // Validation de base (hérite de la découverte)
    const baseValidation = await this.validateDiscoveryData(playerId, data);
    if (!baseValidation.isValid) return baseValidation;
    
    // Validations spécifiques à la capture
    if (!data.ownedPokemonId || !Types.ObjectId.isValid(data.ownedPokemonId)) {
      return { isValid: false, error: 'Valid owned Pokemon ID is required' };
    }
    
    if (data.captureTime !== undefined && (data.captureTime < 0 || data.captureTime > 3600)) {
      return { isValid: false, error: 'Invalid capture time' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Récupère les données d'un Pokémon avec cache optimisé
   */
  private async getPokemonData(pokemonId: number): Promise<any> {
    if (this.pokemonDataCache.has(pokemonId)) {
      this.serviceStats.cacheHits++;
      return this.pokemonDataCache.get(pokemonId);
    }
    
    this.serviceStats.cacheMisses++;
    const data = await getPokemonById(pokemonId);
    
    if (data && this.config.enableCache) {
      this.pokemonDataCache.set(pokemonId, data);
    }
    
    return data;
  }
  
  /**
   * Met à jour les stats de manière asynchrone pour ne pas bloquer
   */
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
    // Exécution asynchrone sans bloquer la réponse
    setImmediate(async () => {
      try {
        const stats = await PokedexStats.findOrCreate(playerId);
        
        if (updates.newSeen || updates.newCaught) {
          await stats.updateFromEntry(null, updates.newSeen, updates.newCaught);
          
          // Mettre à jour les streaks
          if (updates.newSeen) {
            await stats.updateStreaks('seen');
          }
          if (updates.newCaught) {
            await stats.updateStreaks('caught');
          }
          
          // Invalider le cache
          this.playerStatsCache.delete(playerId);
        }
        
        // Mettre à jour les records spéciaux
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
  
  /**
   * Construit la requête de recherche optimisée
   */
  private async buildSearchQuery(playerId: string, filters: PokedexSearchFilters): Promise<any> {
    const query: any = { playerId };
    
    // Filtres booléens
    if (filters.seen !== undefined) query.isSeen = filters.seen;
    if (filters.caught !== undefined) query.isCaught = filters.caught;
    if (filters.shiny) query['bestSpecimen.isShiny'] = true;
    if (filters.favorited) query.favorited = true;
    
    // Filtres par tags
    if (filters.tags?.length) {
      query.tags = { $in: filters.tags };
    }
    
    // Filtre par niveau
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
    
    // Filtre par date
    if (filters.dateRange) {
      query.$or = [
        { firstSeenAt: { $gte: filters.dateRange.start, $lte: filters.dateRange.end }},
        { firstCaughtAt: { $gte: filters.dateRange.start, $lte: filters.dateRange.end }}
      ];
    }
    
    // Filtres par méthodes
    if (filters.methods?.length) {
      query['firstEncounter.method'] = { $in: filters.methods };
    }
    
    // Recherche par nom/ID (nécessite lookup avec données Pokémon)
    if (filters.nameQuery || filters.types?.length || filters.regions?.length) {
      const pokemonIds = await this.searchPokemonByFilters(filters);
      if (pokemonIds.length === 0) {
        // Aucun résultat trouvé, retourner une requête qui ne match rien
        query.pokemonId = { $in: [] };
      } else {
        query.pokemonId = { $in: pokemonIds };
      }
    }
    
    return query;
  }
  
  /**
   * Construit la requête de tri
   */
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
        return { pokemonId: 1 }; // Tri par défaut
    }
  }
  
  /**
   * Enrichit les entrées avec les données Pokémon en batch
   */
  private async enrichEntriesWithPokemonData(entries: any[]): Promise<any[]> {
    // Batch processing pour optimiser
    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const pokemonData = await this.getPokemonData(entry.pokemonId);
        return { ...entry, pokemonData };
      })
    );
    
    return enrichedEntries;
  }
  
  /**
   * Recherche des Pokémon par filtres complexes
   */
  private async searchPokemonByFilters(filters: PokedexSearchFilters): Promise<number[]> {
    const results: number[] = [];
    
    // Optimisation : déterminer la plage d'IDs à scanner
    const maxId = 1000; // Future-proof
    
    for (let i = 1; i <= maxId; i++) {
      const data = await this.getPokemonData(i);
      if (!data) continue;
      
      // Filtre par nom
      if (filters.nameQuery) {
        const lowerQuery = filters.nameQuery.toLowerCase();
        if (!data.name.toLowerCase().includes(lowerQuery)) continue;
      }
      
      // Filtre par type
      if (filters.types?.length) {
        const hasMatchingType = filters.types.some(type => 
          data.types?.some((pokemonType: string) => 
            pokemonType.toLowerCase() === type.toLowerCase()
          )
        );
        if (!hasMatchingType) continue;
      }
      
      // Filtre par région
      if (filters.regions?.length) {
        const pokemonRegion = this.determineRegionFromId(i);
        if (!filters.regions.some(region => region.toLowerCase() === pokemonRegion)) {
          continue;
        }
      }
      
      results.push(i);
    }
    
    return results;
  }
  
  /**
   * Génère une clé de cache pour les recherches
   */
  private generateSearchCacheKey(playerId: string, filters: PokedexSearchFilters): string {
    return `search_${playerId}_${JSON.stringify(filters)}`;
  }
  
  /**
   * Nettoie les caches expirés
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    // Nettoyage du cache des stats
    for (const [key, value] of this.playerStatsCache.entries()) {
      if ((now - value.timestamp) > this.config.cacheExpiry) {
        this.playerStatsCache.delete(key);
      }
    }
    
    // Nettoyage du cache de recherche
    for (const [key, value] of this.searchCache.entries()) {
      if ((now - value.timestamp) > this.config.cacheExpiry) {
        this.searchCache.delete(key);
      }
    }
    
    console.log(`🧹 [PokedexService] Cache nettoyé - Stats: ${this.playerStatsCache.size}, Search: ${this.searchCache.size}`);
  }
  
  // ===== MÉTHODES UTILITAIRES =====
  
  private async checkSpecialDiscovery(pokemonData: any, discoveryData: PokedexDiscoveryData): Promise<string[]> {
    const notifications: string[] = [];
    
    // Vérifier si c'est un Pokémon rare/légendaire
    if (pokemonData.rarity === 'legendary') {
      notifications.push(`👑 Pokémon Légendaire découvert : ${pokemonData.name} !`);
    } else if (pokemonData.rarity === 'rare') {
      notifications.push(`⭐ Pokémon Rare découvert : ${pokemonData.name} !`);
    }
    
    // Vérifier conditions spéciales
    if (discoveryData.weather && pokemonData.preferredWeather?.includes(discoveryData.weather)) {
      notifications.push(`🌤️ Conditions météo parfaites pour ${pokemonData.name} !`);
    }
    
    return notifications;
  }
  
  private async checkCaptureAchievements(
    playerId: string, 
    captureData: PokedexCaptureData, 
    pokemonData: any
  ): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Implémenter système d'accomplissements complet
    // Pour l'instant, quelques vérifications basiques
    
    if (captureData.isShiny) {
      achievements.push(`✨ Accomplissement : Chasseur de Brillants !`);
    }
    
    if (captureData.level >= 50) {
      achievements.push(`📈 Accomplissement : Capture de Haut Niveau !`);
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
        pokemonName: pokemonData?.name || `Pokémon #${entry.pokemonId}`,
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
  
  private async getEvolutionChain(pokemonId: number): Promise<any[]> {
    // TODO: Implémenter récupération chaîne d'évolution complète
    const pokemonData = await this.getPokemonData(pokemonId);
    return pokemonData ? [pokemonData] : [];
  }
  
  private async getRelatedEntries(playerId: string, pokemonData: any): Promise<IPokedexEntry[]> {
    // TODO: Implémenter logique pour trouver les entrées liées (évolutions, même type, etc.)
    return [];
  }
  
  private async getRecommendations(playerId: string, pokemonData: any): Promise<any[]> {
    // TODO: Implémenter système de recommandations intelligent
    return [];
  }
  
  // ===== MÉTHODES DE MAINTENANCE =====
  
  /**
   * Nettoie tous les caches
   */
  clearAllCaches(): void {
    this.pokemonDataCache.clear();
    this.playerStatsCache.clear();
    this.searchCache.clear();
    console.log('🧹 [PokedexService] Tous les caches nettoyés');
  }
  
  /**
   * Pré-charge les données communes
   */
  async preloadCommonData(): Promise<void> {
    if (!this.config.enableCache) return;
    
    console.log('⚡ [PokedexService] Pré-chargement des données communes...');
    
    // Pré-charger les Pokémon populaires en batch
    const popularIds = Array.from({length: 151}, (_, i) => i + 1); // Kanto
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < popularIds.length; i += batchSize) {
      const batch = popularIds.slice(i, i + batchSize);
      await Promise.all(batch.map(id => this.getPokemonData(id)));
    }
    
    console.log('✅ [PokedexService] Données pré-chargées avec succès');
  }
  
  /**
   * Récupère les statistiques du service
   */
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
  
  /**
   * Met à jour la configuration du service
   */
  updateConfig(newConfig: Partial<PokedexServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [PokedexService] Configuration mise à jour:', newConfig);
  }
}

// ===== EXPORT SINGLETON =====
export const pokedexService = PokedexService.getInstance();
export default pokedexService;
