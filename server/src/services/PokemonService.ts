// server/src/services/PokédexService.ts
import { PokédexEntry, IPokédexEntry } from '../models/PokédexEntry';
import { PokédexStats, IPokédexStats } from '../models/PokédexStats';
import { getPokemonById } from '../data/PokemonData';
import { EventEmitter } from 'events';

// ===== TYPES SIMPLES ET SÉCURISÉS =====

export interface PokemonSeenData {
  playerId: string;
  pokemonId: number;
  level?: number;
  location?: string;
  weather?: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
}

export interface PokemonCaughtData extends PokemonSeenData {
  ownedPokemonId: string;
  isShiny?: boolean;
  captureTime?: number;
}

export interface PokédexFilters {
  seen?: boolean;
  caught?: boolean;
  shiny?: boolean;
  types?: string[];
  nameQuery?: string;
  sortBy?: 'id' | 'name' | 'level' | 'recent';
  limit?: number;
  offset?: number;
}

export interface PokédexResult {
  success: boolean;
  isNew: boolean;
  notifications: string[];
  error?: string;
}

export interface PokédexSummary {
  totalSeen: number;
  totalCaught: number;
  totalShinies: number;
  seenPercentage: number;
  caughtPercentage: number;
  currentStreak: number;
  recentActivity: number;
}

// ===== SERVICE POKÉDEX OPTIMISÉ =====

export class PokédexService extends EventEmitter {
  private static instance: PokédexService;
  
  // Cache optimisé avec TTL
  private pokemonCache = new Map<number, any>();
  private statsCache = new Map<string, { data: IPokédexStats; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Rate limiting
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_ACTIONS_PER_MINUTE = 30;
  
  constructor() {
    super();
    this.setupCleanup();
    console.log('🔍 [PokédexService] Service initialisé avec cache et rate limiting');
  }
  
  // Singleton avec protection
  static getInstance(): PokédexService {
    if (!PokédexService.instance) {
      PokédexService.instance = new PokédxService();
    }
    return PokédxService.instance;
  }
  
  // ===== API SIMPLE ET SÉCURISÉE =====
  
  /**
   * 👁️ POKÉMON VU - Interface ultra-simple
   * À appeler depuis vos combats/rencontres
   */
  async pokemonSeen(data: PokemonSeenData): Promise<PokédxResult> {
    try {
      // Validation et sécurité
      const validationError = this.validateSeenData(data);
      if (validationError) {
        return { success: false, isNew: false, notifications: [], error: validationError };
      }
      
      // Rate limiting
      if (!this.checkRateLimit(data.playerId, 'seen')) {
        return { success: false, isNew: false, notifications: [], error: 'Trop de requêtes' };
      }
      
      console.log(`👁️ [PokédxService] ${data.playerId} voit #${data.pokemonId}`);
      
      // Récupérer ou créer l'entrée
      const entry = await PokédxEntry.findOrCreate(data.playerId, data.pokemonId, {
        location: data.location || 'Zone Inconnue',
        level: data.level || 5,
        method: data.method || 'wild'
      });
      
      // Marquer comme vu
      const isNewDiscovery = await entry.markSeen({
        location: data.location || 'Zone Inconnue',
        level: data.level || 5,
        method: data.method || 'wild',
        weather: data.weather,
        timeOfDay: data.timeOfDay
      });
      
      const notifications: string[] = [];
      
      if (isNewDiscovery) {
        // Récupérer données Pokémon
        const pokemonData = await this.getPokemonData(data.pokemonId);
        if (pokemonData) {
          notifications.push(`Nouveau Pokémon découvert : ${pokemonData.name} !`);
          
          // Mettre à jour les statistiques
          const stats = await this.getPlayerStats(data.playerId);
          await stats.incrementSeen(pokemonData);
          
          // Invalider cache
          this.invalidateStatsCache(data.playerId);
          
          // Vérifier accomplissements simples
          const achievements = this.checkSimpleAchievements(stats, 'seen');
          notifications.push(...achievements);
        }
        
        // Émettre événement
        this.emit('pokemonDiscovered', {
          playerId: data.playerId,
          pokemonId: data.pokemonId,
          pokemonName: pokemonData?.name,
          isNewDiscovery: true
        });
      }
      
      return {
        success: true,
        isNew: isNewDiscovery,
        notifications
      };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur pokemonSeen:`, error);
      return {
        success: false,
        isNew: false,
        notifications: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  /**
   * 🎯 POKÉMON CAPTURÉ - Interface ultra-simple
   * À appeler lors des captures réussies
   */
  async pokemonCaught(data: PokemonCaughtData): Promise<PokédxResult & { isNewBest?: boolean }> {
    try {
      // Validation et sécurité
      const validationError = this.validateCaughtData(data);
      if (validationError) {
        return { success: false, isNew: false, notifications: [], error: validationError };
      }
      
      // Rate limiting
      if (!this.checkRateLimit(data.playerId, 'caught')) {
        return { success: false, isNew: false, notifications: [], error: 'Trop de requêtes' };
      }
      
      console.log(`🎯 [PokédxService] ${data.playerId} capture #${data.pokemonId}${data.isShiny ? ' ✨' : ''}`);
      
      // Récupérer ou créer l'entrée
      const entry = await PokédxEntry.findOrCreate(data.playerId, data.pokemonId, {
        location: data.location || 'Zone Inconnue',
        level: data.level || 5,
        method: data.method || 'wild'
      });
      
      // Marquer comme capturé
      const result = await entry.markCaught({
        level: data.level || 5,
        location: data.location || 'Zone Inconnue',
        method: data.method || 'wild',
        isShiny: data.isShiny || false,
        ownedPokemonId: data.ownedPokemonId,
        captureTime: data.captureTime
      });
      
      const notifications: string[] = [];
      
      // Récupérer données Pokémon
      const pokemonData = await this.getPokemonData(data.pokemonId);
      
      if (result.isNewCapture && pokemonData) {
        notifications.push(`${pokemonData.name} capturé et ajouté au Pokédx !`);
        
        if (data.isShiny) {
          notifications.push(`✨ C'est un ${pokemonData.name} shiny ! Félicitations !`);
        }
        
        // Mettre à jour les statistiques
        const stats = await this.getPlayerStats(data.playerId);
        await stats.incrementCaught(pokemonData, data.isShiny);
        
        // Invalider cache
        this.invalidateStatsCache(data.playerId);
        
        // Vérifier accomplissements
        const achievements = this.checkSimpleAchievements(stats, 'caught');
        notifications.push(...achievements);
        
        // Émettre événement
        this.emit('pokemonCaptured', {
          playerId: data.playerId,
          pokemonId: data.pokemonId,
          pokemonName: pokemonData.name,
          isNewCapture: true,
          isShiny: data.isShiny
        });
      }
      
      if (result.isNewBest && pokemonData) {
        if (data.isShiny) {
          notifications.push(`🌟 Premier ${pokemonData.name} shiny capturé !`);
        } else {
          notifications.push(`📈 Nouveau record de niveau pour ${pokemonData.name} !`);
        }
      }
      
      return {
        success: true,
        isNew: result.isNewCapture,
        isNewBest: result.isNewBest,
        notifications
      };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur pokemonCaught:`, error);
      return {
        success: false,
        isNew: false,
        notifications: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  // ===== CONSULTATION OPTIMISÉE =====
  
  /**
   * Récupère le Pokédx d'un joueur avec pagination
   */
  async getPlayerPokedex(playerId: string, filters: PokédxFilters = {}): Promise<{
    entries: Array<IPokédxEntry & { pokemonData?: any }>;
    total: number;
    summary: PokédxSummary;
  }> {
    try {
      if (!this.validatePlayerId(playerId)) {
        throw new Error('PlayerId invalide');
      }
      
      // Construction requête sécurisée
      const query: any = { playerId };
      
      if (filters.seen !== undefined) query.isSeen = filters.seen;
      if (filters.caught !== undefined) query.isCaught = filters.caught;
      if (filters.shiny) query.hasShiny = true;
      
      // Filtres par nom/types (sécurisés)
      if (filters.nameQuery) {
        const pokemonIds = await this.searchPokemonSafe(filters.nameQuery);
        if (pokemonIds.length === 0) {
          return { entries: [], total: 0, summary: await this.getPlayerSummary(playerId) };
        }
        query.pokemonId = { $in: pokemonIds };
      }
      
      if (filters.types?.length) {
        const typeIds = await this.filterByTypesSafe(filters.types);
        if (typeIds.length === 0) {
          return { entries: [], total: 0, summary: await this.getPlayerSummary(playerId) };
        }
        query.pokemonId = query.pokemonId ? 
          { $in: typeIds.filter(id => query.pokemonId.$in.includes(id)) } :
          { $in: typeIds };
      }
      
      // Pagination sécurisée
      const limit = Math.min(Math.max(filters.limit || 20, 1), 100);
      const offset = Math.max(filters.offset || 0, 0);
      
      // Tri sécurisé
      let sort: any = { pokemonId: 1 };
      switch (filters.sortBy) {
        case 'recent':
          sort = { lastSeenAt: -1 };
          break;
        case 'level':
          sort = { bestLevel: -1 };
          break;
      }
      
      // Exécution optimisée
      const [entries, total] = await Promise.all([
        PokédxEntry.find(query)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean(),
        PokédxEntry.countDocuments(query)
      ]);
      
      // Enrichissement avec données Pokémon
      const enrichedEntries = await Promise.all(
        entries.map(async (entry) => {
          const pokemonData = await this.getPokemonData(entry.pokemonId);
          return { ...entry, pokemonData };
        })
      );
      
      const summary = await this.getPlayerSummary(playerId);
      
      return {
        entries: enrichedEntries,
        total,
        summary
      };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur getPlayerPokedex:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère une entrée spécifique
   */
  async getPokedexEntry(playerId: string, pokemonId: number): Promise<{
    entry: IPokédxEntry | null;
    pokemonData: any;
  }> {
    try {
      if (!this.validatePlayerId(playerId) || !this.validatePokemonId(pokemonId)) {
        throw new Error('Paramètres invalides');
      }
      
      const [entry, pokemonData] = await Promise.all([
        PokédxEntry.findOne({ playerId, pokemonId }),
        this.getPokemonData(pokemonId)
      ]);
      
      return { entry, pokemonData };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur getPokedexEntry:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère le résumé d'un joueur
   */
  async getPlayerSummary(playerId: string): Promise<PokédxSummary> {
    try {
      const stats = await this.getPlayerStats(playerId);
      const completion = stats.getCompletionRate();
      
      return {
        totalSeen: stats.totalSeen,
        totalCaught: stats.totalCaught,
        totalShinies: stats.totalShinies,
        seenPercentage: completion.seen,
        caughtPercentage: completion.caught,
        currentStreak: stats.currentStreak,
        recentActivity: await this.getRecentActivityCount(playerId, 7)
      };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur getPlayerSummary:`, error);
      throw error;
    }
  }
  
  // ===== MÉTHODES PRIVÉES OPTIMISÉES =====
  
  /**
   * Récupère les données Pokémon avec cache
   */
  private async getPokemonData(pokemonId: number): Promise<any> {
    if (this.pokemonCache.has(pokemonId)) {
      return this.pokemonCache.get(pokemonId);
    }
    
    try {
      const data = await getPokemonById(pokemonId);
      if (data) {
        this.pokemonCache.set(pokemonId, data);
        // Limiter la taille du cache
        if (this.pokemonCache.size > 500) {
          const firstKey = this.pokemonCache.keys().next().value;
          this.pokemonCache.delete(firstKey);
        }
      }
      return data;
    } catch (error) {
      console.error(`❌ Erreur getPokemonData(${pokemonId}):`, error);
      return null;
    }
  }
  
  /**
   * Récupère les stats avec cache
   */
  private async getPlayerStats(playerId: string): Promise<IPokédxStats> {
    const cached = this.statsCache.get(playerId);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    
    const stats = await PokédxStats.findOrCreate(playerId);
    this.statsCache.set(playerId, {
      data: stats,
      expires: Date.now() + this.CACHE_TTL
    });
    
    return stats;
  }
  
  /**
   * Invalide le cache des stats
   */
  private invalidateStatsCache(playerId: string): void {
    this.statsCache.delete(playerId);
  }
  
  /**
   * Vérifie les accomplissements simples
   */
  private checkSimpleAchievements(stats: IPokédxStats, action: 'seen' | 'caught'): string[] {
    const notifications: string[] = [];
    
    if (action === 'seen') {
      // Milestones de découverte
      const seenMilestones = [1, 10, 25, 50, 100, 151];
      if (seenMilestones.includes(stats.totalSeen)) {
        notifications.push(`🏆 ${stats.totalSeen} Pokémon découvert${stats.totalSeen > 1 ? 's' : ''} !`);
      }
      
      // Streak de découverte
      if (stats.currentStreak > 0 && stats.currentStreak % 7 === 0) {
        notifications.push(`🔥 ${stats.currentStreak} jours de découvertes consécutives !`);
      }
    }
    
    if (action === 'caught') {
      // Milestones de capture
      const caughtMilestones = [1, 5, 10, 25, 50, 100, 151];
      if (caughtMilestones.includes(stats.totalCaught)) {
        notifications.push(`🎯 ${stats.totalCaught} Pokémon capturé${stats.totalCaught > 1 ? 's' : ''} !`);
      }
      
      // Premier shiny
      if (stats.totalShinies === 1) {
        notifications.push(`✨ Premier Pokémon shiny capturé ! Félicitations !`);
      }
    }
    
    return notifications;
  }
  
  /**
   * Rate limiting sécurisé
   */
  private checkRateLimit(playerId: string, action: string): boolean {
    const key = `${playerId}:${action}`;
    const now = Date.now();
    const minute = 60 * 1000;
    
    const current = this.rateLimiter.get(key);
    if (!current || now > current.resetTime) {
      this.rateLimiter.set(key, { count: 1, resetTime: now + minute });
      return true;
    }
    
    if (current.count >= this.MAX_ACTIONS_PER_MINUTE) {
      return false;
    }
    
    current.count++;
    return true;
  }
  
  // ===== VALIDATIONS SÉCURISÉES =====
  
  private validateSeenData(data: PokemonSeenData): string | null {
    if (!data.playerId || typeof data.playerId !== 'string' || data.playerId.length > 50) {
      return 'PlayerId invalide';
    }
    
    if (!this.validatePokemonId(data.pokemonId)) {
      return 'PokemonId invalide';
    }
    
    if (data.level !== undefined && (data.level < 1 || data.level > 100)) {
      return 'Niveau invalide (1-100)';
    }
    
    if (data.location && data.location.length > 100) {
      return 'Nom de lieu trop long';
    }
    
    return null;
  }
  
  private validateCaughtData(data: PokemonCaughtData): string | null {
    const seenError = this.validateSeenData(data);
    if (seenError) return seenError;
    
    if (!data.ownedPokemonId || typeof data.ownedPokemonId !== 'string') {
      return 'OwnedPokemonId requis';
    }
    
    if (data.captureTime !== undefined && (data.captureTime < 0 || data.captureTime > 3600)) {
      return 'Temps de capture invalide';
    }
    
    return null;
  }
  
  private validatePlayerId(playerId: string): boolean {
    return typeof playerId === 'string' && playerId.length > 0 && playerId.length <= 50;
  }
  
  private validatePokemonId(pokemonId: number): boolean {
    return Number.isInteger(pokemonId) && pokemonId >= 1 && pokemonId <= 2000;
  }
  
  // ===== RECHERCHE SÉCURISÉE =====
  
  private async searchPokemonSafe(nameQuery: string): Promise<number[]> {
    if (!nameQuery || nameQuery.length > 50) return [];
    
    const lowerQuery = nameQuery.toLowerCase().trim();
    const results: number[] = [];
    
    // Recherche limitée pour éviter la surcharge
    for (let i = 1; i <= 151 && results.length < 20; i++) {
      const data = await this.getPokemonData(i);
      if (data && data.name.toLowerCase().includes(lowerQuery)) {
        results.push(i);
      }
    }
    
    return results;
  }
  
  private async filterByTypesSafe(types: string[]): Promise<number[]> {
    if (!types || types.length === 0 || types.length > 5) return [];
    
    const validTypes = types.filter(type => 
      typeof type === 'string' && type.length > 0 && type.length <= 20
    );
    
    if (validTypes.length === 0) return [];
    
    const results: number[] = [];
    
    for (let i = 1; i <= 151 && results.length < 100; i++) {
      const data = await this.getPokemonData(i);
      if (data && data.types) {
        const hasMatchingType = validTypes.some(type =>
          data.types.some((pokemonType: string) =>
            pokemonType.toLowerCase() === type.toLowerCase()
          )
        );
        if (hasMatchingType) {
          results.push(i);
        }
      }
    }
    
    return results;
  }
  
  private async getRecentActivityCount(playerId: string, days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return await PokédxEntry.countDocuments({
      playerId,
      lastSeenAt: { $gte: since }
    });
  }
  
  // ===== NETTOYAGE ET MAINTENANCE =====
  
  private setupCleanup(): void {
    // Nettoyage cache toutes les 10 minutes
    setInterval(() => {
      this.cleanupCaches();
    }, 10 * 60 * 1000);
    
    // Nettoyage rate limiter toutes les 5 minutes
    setInterval(() => {
      this.cleanupRateLimiter();
    }, 5 * 60 * 1000);
  }
  
  private cleanupCaches(): void {
    const now = Date.now();
    
    // Nettoyer le cache des stats expirées
    for (const [playerId, cached] of this.statsCache.entries()) {
      if (now > cached.expires) {
        this.statsCache.delete(playerId);
      }
    }
    
    // Limiter la taille du cache Pokémon
    if (this.pokemonCache.size > 300) {
      const toDelete = this.pokemonCache.size - 300;
      const iterator = this.pokemonCache.keys();
      for (let i = 0; i < toDelete; i++) {
        const key = iterator.next().value;
        this.pokemonCache.delete(key);
      }
    }
  }
  
  private cleanupRateLimiter(): void {
    const now = Date.now();
    
    for (const [key, data] of this.rateLimiter.entries()) {
      if (now > data.resetTime) {
        this.rateLimiter.delete(key);
      }
    }
  }
  
  /**
   * Méthode de maintenance publique
   */
  async recalculatePlayerStats(playerId: string): Promise<IPokédxStats> {
    if (!this.validatePlayerId(playerId)) {
      throw new Error('PlayerId invalide');
    }
    
    const stats = await this.getPlayerStats(playerId);
    await stats.recalculateFromEntries();
    this.invalidateStatsCache(playerId);
    
    return stats;
  }
  
  /**
   * Nettoyage manuel des caches
   */
  clearCaches(): void {
    this.pokemonCache.clear();
    this.statsCache.clear();
    this.rateLimiter.clear();
    console.log('🧹 [PokédxService] Caches nettoyés manuellement');
  }
}

// ===== EXPORT SINGLETON =====
export const pokédxService = PokédxService.getInstance();
export default pokédxService;
