// server/src/services/PokédexService.ts
import { PokédexEntry, IPokédexEntry } from '../models/PokédexEntry';
import { PokédexStats, IPokédexStats } from '../models/PokédexStats';
import { getPokemonById } from '../data/PokemonData';
import { EventEmitter } from 'events';

// ===== TYPES & INTERFACES =====

export interface PokédexDiscoveryData {
  pokemonId: number;
  level: number;
  location: string;
  method: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  weather?: string;
  timeOfDay?: string;
  isShiny?: boolean;
}

export interface PokédexCaptureData extends PokédexDiscoveryData {
  ownedPokemonId: string;
  captureTime?: number; // Temps en secondes pour capturer
}

export interface PokédexSearchFilters {
  seen?: boolean;
  caught?: boolean;
  shiny?: boolean;
  types?: string[];
  regions?: string[];
  levelRange?: { min: number; max: number };
  nameQuery?: string;
  sortBy?: 'id' | 'name' | 'level' | 'date_seen' | 'date_caught';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PokédexProgressSummary {
  seen: { count: number; percentage: number; recent: number };
  caught: { count: number; percentage: number; recent: number };
  shinies: { count: number; recent: number };
  records: any;
  recentActivity: any[];
  typeProgress: any;
  regionProgress: any;
}

// ===== SERVICE PRINCIPAL =====

export class PokédexService extends EventEmitter {
  private static instance: PokédexService;
  
  // Cache pour optimiser les performances
  private pokemonDataCache = new Map<number, any>();
  private playerStatsCache = new Map<string, IPokédexStats>();
  
  constructor() {
    super();
    console.log('🔍 [PokédxService] Service Pokédx initialisé');
  }
  
  // Singleton pattern
  static getInstance(): PokédexService {
    if (!PokédexService.instance) {
      PokédexService.instance = new PokédexService();
    }
    return PokédexService.instance;
  }
  
  // ===== DÉCOUVERTE DE POKÉMON =====
  
  /**
   * Marque un Pokémon comme vu (première rencontre)
   */
  async markPokemonAsSeen(
    playerId: string, 
    discoveryData: PokédexDiscoveryData
  ): Promise<{
    success: boolean;
    isNewDiscovery: boolean;
    entry: IPokédexEntry;
    notifications: string[];
  }> {
    try {
      console.log(`👁️ [PokédxService] ${playerId} voit Pokémon #${discoveryData.pokemonId}`);
      
      // Récupérer ou créer l'entrée
      const entry = await PokédexEntry.findOrCreate(playerId, discoveryData.pokemonId);
      const wasAlreadySeen = entry.isSeen;
      
      // Marquer comme vu avec les données de rencontre
      await entry.markAsSeen({
        location: discoveryData.location,
        level: discoveryData.level,
        method: discoveryData.method,
        weather: discoveryData.weather,
        timeOfDay: discoveryData.timeOfDay
      });
      
      const notifications: string[] = [];
      let isNewDiscovery = false;
      
      // Si c'est une nouvelle découverte
      if (!wasAlreadySeen) {
        isNewDiscovery = true;
        
        // Récupérer les données du Pokémon
        const pokemonData = await this.getPokemonData(discoveryData.pokemonId);
        if (pokemonData) {
          notifications.push(`Nouveau Pokémon découvert : ${pokemonData.name} !`);
          
          // Vérifier les accomplissements
          const achievements = await this.checkDiscoveryAchievements(playerId, discoveryData, pokemonData);
          notifications.push(...achievements);
        }
        
        // Mettre à jour les statistiques
        await this.updatePlayerStats(playerId, { newSeen: true });
        
        // Émettre événement
        this.emit('pokemonDiscovered', {
          playerId,
          pokemonId: discoveryData.pokemonId,
          pokemonName: pokemonData?.name,
          discoveryData,
          entry
        });
      }
      
      return {
        success: true,
        isNewDiscovery,
        entry,
        notifications
      };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur markAsSeen:`, error);
      throw error;
    }
  }
  
  /**
   * Marque un Pokémon comme capturé
   */
  async markPokemonAsCaught(
    playerId: string,
    captureData: PokédexCaptureData
  ): Promise<{
    success: boolean;
    isNewCapture: boolean;
    isNewBestSpecimen: boolean;
    entry: IPokédexEntry;
    notifications: string[];
  }> {
    try {
      console.log(`🎯 [PokédxService] ${playerId} capture Pokémon #${captureData.pokemonId}`);
      
      // Récupérer ou créer l'entrée
      const entry = await PokédexEntry.findOrCreate(playerId, captureData.pokemonId);
      const wasAlreadyCaught = entry.isCaught;
      
      // Marquer comme capturé
      await entry.markAsCaught({
        level: captureData.level,
        isShiny: captureData.isShiny || false,
        ownedPokemonId: captureData.ownedPokemonId,
        location: captureData.location,
        method: captureData.method
      });
      
      const notifications: string[] = [];
      let isNewCapture = false;
      let isNewBestSpecimen = false;
      
      // Récupérer les données du Pokémon
      const pokemonData = await this.getPokemonData(captureData.pokemonId);
      
      if (!wasAlreadyCaught) {
        isNewCapture = true;
        
        if (pokemonData) {
          notifications.push(`${pokemonData.name} capturé et ajouté au Pokédx !`);
          
          if (captureData.isShiny) {
            notifications.push(`✨ C'est un ${pokemonData.name} shiny ! Félicitations !`);
          }
          
          // Vérifier les accomplissements de capture
          const achievements = await this.checkCaptureAchievements(playerId, captureData, pokemonData);
          notifications.push(...achievements);
        }
        
        // Mettre à jour les statistiques
        await this.updatePlayerStats(playerId, { newCaught: true, isShiny: captureData.isShiny });
      } else {
        // Vérifier si c'est un meilleur spécimen
        isNewBestSpecimen = await entry.updateBestSpecimen({
          level: captureData.level,
          isShiny: captureData.isShiny || false,
          ownedPokemonId: captureData.ownedPokemonId
        });
        
        if (isNewBestSpecimen && pokemonData) {
          if (captureData.isShiny && !entry.bestSpecimen?.isShiny) {
            notifications.push(`✨ Premier ${pokemonData.name} shiny capturé !`);
          } else if (captureData.level > (entry.bestSpecimen?.level || 0)) {
            notifications.push(`📈 Nouveau record de niveau pour ${pokemonData.name} : Niv.${captureData.level} !`);
          }
        }
      }
      
      // Sauvegarder les modifications
      await entry.save();
      
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
      console.error(`❌ [PokédxService] Erreur markAsCaught:`, error);
      throw error;
    }
  }
  
  // ===== CONSULTATION DU POKÉDX =====
  
  /**
   * Récupère les entrées du Pokédx d'un joueur avec filtres
   */
  async getPlayerPokedex(
    playerId: string,
    filters: PokédexSearchFilters = {}
  ): Promise<{
    entries: Array<IPokédexEntry & { pokemonData?: any }>;
    pagination: { total: number; page: number; limit: number; hasNext: boolean };
    summary: any;
  }> {
    try {
      console.log(`📖 [PokédxService] Récupération Pokédx pour ${playerId}`);
      
      // Construction de la requête
      const query: any = { playerId };
      
      if (filters.seen !== undefined) query.isSeen = filters.seen;
      if (filters.caught !== undefined) query.isCaught = filters.caught;
      if (filters.shiny) query['bestSpecimen.isShiny'] = true;
      
      // Recherche par nom (nécessite lookup avec données Pokémon)
      let pokemonIds: number[] | undefined;
      if (filters.nameQuery) {
        pokemonIds = await this.searchPokemonByName(filters.nameQuery);
        if (pokemonIds.length === 0) {
          return { entries: [], pagination: { total: 0, page: 1, limit: 50, hasNext: false }, summary: {} };
        }
        query.pokemonId = { $in: pokemonIds };
      }
      
      // Filtres par types/régions (nécessite aussi lookup)
      if (filters.types?.length || filters.regions?.length) {
        const filteredIds = await this.filterPokemonByTypesAndRegions(filters.types, filters.regions);
        if (filteredIds.length === 0) {
          return { entries: [], pagination: { total: 0, page: 1, limit: 50, hasNext: false }, summary: {} };
        }
        
        if (query.pokemonId) {
          // Intersection des deux filtres
          const existingIds = Array.isArray(query.pokemonId.$in) ? query.pokemonId.$in : [query.pokemonId];
          query.pokemonId = { $in: filteredIds.filter(id => existingIds.includes(id)) };
        } else {
          query.pokemonId = { $in: filteredIds };
        }
      }
      
      // Pagination
      const limit = Math.min(filters.limit || 50, 200); // Max 200 par page
      const offset = filters.offset || 0;
      const page = Math.floor(offset / limit) + 1;
      
      // Tri
      let sort: any = { pokemonId: 1 }; // Par défaut par numéro
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'id':
            sort = { pokemonId: filters.sortOrder === 'desc' ? -1 : 1 };
            break;
          case 'date_seen':
            sort = { firstSeenAt: filters.sortOrder === 'desc' ? -1 : 1 };
            break;
          case 'date_caught':
            sort = { firstCaughtAt: filters.sortOrder === 'desc' ? -1 : 1 };
            break;
          case 'level':
            sort = { 'firstEncounter.level': filters.sortOrder === 'desc' ? -1 : 1 };
            break;
        }
      }
      
      // Exécution des requêtes
      const [entries, total] = await Promise.all([
        PokédexEntry.find(query)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean(),
        PokédexEntry.countDocuments(query)
      ]);
      
      // Enrichissement avec les données Pokémon
      const enrichedEntries = await Promise.all(
        entries.map(async (entry) => {
          const pokemonData = await this.getPokemonData(entry.pokemonId);
          return { ...entry, pokemonData };
        })
      );
      
      // Pagination info
      const pagination = {
        total,
        page,
        limit,
        hasNext: offset + limit < total
      };
      
      // Résumé rapide
      const summary = await this.getQuickSummary(playerId);
      
      return {
        entries: enrichedEntries,
        pagination,
        summary
      };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur getPlayerPokedex:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère une entrée spécifique du Pokédx
   */
  async getPokédxEntry(
    playerId: string,
    pokemonId: number
  ): Promise<{
    entry: IPokédexEntry | null;
    pokemonData: any;
    evolutionChain?: any[];
    relatedEntries?: IPokédexEntry[];
  }> {
    try {
      const [entry, pokemonData] = await Promise.all([
        PokédexEntry.findOne({ playerId, pokemonId }),
        this.getPokemonData(pokemonId)
      ]);
      
      let evolutionChain: any[] = [];
      let relatedEntries: IPokédexEntry[] = [];
      
      if (pokemonData?.evolution) {
        // Récupérer la chaîne d'évolution complète
        evolutionChain = await this.getEvolutionChain(pokemonId);
        
        // Récupérer les entrées pour les évolutions
        const evolutionIds = evolutionChain.map(evo => evo.id);
        relatedEntries = await PokédexEntry.find({
          playerId,
          pokemonId: { $in: evolutionIds }
        });
      }
      
      return {
        entry,
        pokemonData,
        evolutionChain,
        relatedEntries
      };
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur getPokédxEntry:`, error);
      throw error;
    }
  }
  
  // ===== STATISTIQUES & PROGRESSION =====
  
  /**
   * Récupère les statistiques complètes d'un joueur
   */
  async getPlayerProgress(playerId: string): Promise<PokédexProgressSummary> {
    try {
      const stats = await this.getPlayerStats(playerId);
      
      const summary: PokédxProgressSummary = {
        seen: {
          count: stats.totalSeen,
          percentage: stats.seenPercentage,
          recent: await this.getRecentDiscoveries(playerId, 7) // 7 derniers jours
        },
        caught: {
          count: stats.totalCaught,
          percentage: stats.caughtPercentage,
          recent: await this.getRecentCaptures(playerId, 7)
        },
        shinies: {
          count: stats.records.totalShinyCaught,
          recent: await this.getRecentShinies(playerId, 30) // 30 derniers jours
        },
        records: {
          highestLevel: stats.records.highestLevelCaught,
          longestStreak: stats.records.longestCaughtStreak,
          fastestCapture: stats.records.fastestCapture === Infinity ? null : stats.records.fastestCapture
        },
        recentActivity: await this.getRecentActivity(playerId, 10),
        typeProgress: this.formatTypeProgress(stats.typeStats),
        regionProgress: this.formatRegionProgress(stats.regionStats)
      };
      
      return summary;
      
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur getPlayerProgress:`, error);
      throw error;
    }
  }
  
  /**
   * Force un recalcul complet des statistiques d'un joueur
   */
  async recalculatePlayerStats(playerId: string): Promise<IPokédexStats> {
    try {
      console.log(`🔄 [PokédexService] Recalcul stats pour ${playerId}`);
      
      const stats = await PokédexStats.findOrCreate(playerId);
      await stats.recalculateStats();
      
      // Mettre à jour le cache
      this.playerStatsCache.set(playerId, stats);
      
      this.emit('statsRecalculated', { playerId, stats });
      
      return stats;
    } catch (error) {
      console.error(`❌ [PokédxService] Erreur recalculatePlayerStats:`, error);
      throw error;
    }
  }
  
  // ===== MÉTHODES PRIVÉES UTILITAIRES =====
  
  /**
   * Récupère les données d'un Pokémon avec cache
   */
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
  
  /**
   * Récupère les stats d'un joueur avec cache
   */
  private async getPlayerStats(playerId: string): Promise<IPokédexStats> {
    if (this.playerStatsCache.has(playerId)) {
      return this.playerStatsCache.get(playerId)!;
    }
    
    const stats = await PokédexStats.findOrCreate(playerId);
    this.playerStatsCache.set(playerId, stats);
    
    return stats;
  }
  
  /**
   * Met à jour les statistiques d'un joueur
   */
  private async updatePlayerStats(
    playerId: string, 
    updates: { newSeen?: boolean; newCaught?: boolean; isShiny?: boolean }
  ): Promise<void> {
    const stats = await this.getPlayerStats(playerId);
    
    if (updates.newSeen || updates.newCaught) {
      await stats.updateFromEntry(null, updates.newSeen, updates.newCaught);
      
      // Mettre à jour le cache
      this.playerStatsCache.set(playerId, stats);
      
      // Ajouter aux progrès hebdomadaires
      stats.addWeeklyProgress(
        updates.newSeen ? 1 : 0, 
        updates.newCaught ? 1 : 0
      );
      
      await stats.save();
    }
  }
  
  /**
   * Recherche des Pokémon par nom
   */
  private async searchPokemonByName(nameQuery: string): Promise<number[]> {
    // Pour l'instant, recherche simple
    // TODO: Implémenter recherche plus sophistiquée avec fuzzy matching
    const lowerQuery = nameQuery.toLowerCase();
    const results: number[] = [];
    
    for (let i = 1; i <= 151; i++) { // Kanto pour commencer
      const data = await this.getPokemonData(i);
      if (data && data.name.toLowerCase().includes(lowerQuery)) {
        results.push(i);
      }
    }
    
    return results;
  }
  
  /**
   * Filtre les Pokémon par types et régions
   */
  private async filterPokemonByTypesAndRegions(
    types?: string[], 
    regions?: string[]
  ): Promise<number[]> {
    const results: number[] = [];
    
    for (let i = 1; i <= 151; i++) { // Kanto pour commencer
      const data = await this.getPokemonData(i);
      if (!data) continue;
      
      // Filtre par type
      if (types?.length) {
        const hasMatchingType = types.some(type => 
          data.types.some((pokemonType: string) => 
            pokemonType.toLowerCase() === type.toLowerCase()
          )
        );
        if (!hasMatchingType) continue;
      }
      
      // Filtre par région (basé sur l'ID pour Kanto)
      if (regions?.length) {
        const pokemonRegion = i <= 151 ? 'kanto' : 'other';
        if (!regions.some(region => region.toLowerCase() === pokemonRegion)) {
          continue;
        }
      }
      
      results.push(i);
    }
    
    return results;
  }
  
  /**
   * Récupère un résumé rapide
   */
  private async getQuickSummary(playerId: string): Promise<any> {
    const stats = await this.getPlayerStats(playerId);
    return stats.getCompletionSummary();
  }
  
  /**
   * Vérifie les accomplissements de découverte
   */
  private async checkDiscoveryAchievements(
    playerId: string, 
    discoveryData: PokédexDiscoveryData, 
    pokemonData: any
  ): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Implémenter système d'accomplissements
    // - Premier Pokémon découvert
    // - Premier de chaque type
    // - Découvertes par région
    // - Milestone (10, 50, 100 découvertes)
    
    return achievements;
  }
  
  /**
   * Vérifie les accomplissements de capture
   */
  private async checkCaptureAchievements(
    playerId: string, 
    captureData: PokédxCaptureData, 
    pokemonData: any
  ): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Implémenter système d'accomplissements de capture
    
    return achievements;
  }
  
  // Méthodes pour les statistiques récentes
  private async getRecentDiscoveries(playerId: string, days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return await PokédexEntry.countDocuments({
      playerId,
      firstSeenAt: { $gte: since }
    });
  }
  
  private async getRecentCaptures(playerId: string, days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return await PokédexEntry.countDocuments({
      playerId,
      firstCaughtAt: { $gte: since }
    });
  }
  
  private async getRecentShinies(playerId: string, days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return await PokédexEntry.countDocuments({
      playerId,
      'bestSpecimen.isShiny': true,
      'bestSpecimen.caughtAt': { $gte: since }
    });
  }
  
  private async getRecentActivity(playerId: string, limit: number): Promise<any[]> {
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
      const pokemonData = await this.getPokemonData(entry.pokemonId);
      return {
        pokemonId: entry.pokemonId,
        pokemonName: pokemonData?.name,
        action: entry.lastCaughtAt && entry.lastCaughtAt > (entry.lastSeenAt || new Date(0)) ? 'caught' : 'seen',
        date: entry.lastCaughtAt || entry.lastSeenAt,
        level: entry.bestSpecimen?.level || entry.firstEncounter?.level
      };
    }));
  }
  
  private formatTypeProgress(typeStats: Map<string, any>): any {
    const formatted: any = {};
    typeStats.forEach((stats, type) => {
      formatted[type] = {
        seen: stats.seen,
        caught: stats.caught,
        total: stats.total,
        percentage: stats.total > 0 ? Math.round((stats.caught / stats.total) * 100) : 0
      };
    });
    return formatted;
  }
  
  private formatRegionProgress(regionStats: Map<string, any>): any {
    const formatted: any = {};
    regionStats.forEach((stats, region) => {
      formatted[region] = {
        seen: stats.seen,
        caught: stats.caught,
        total: stats.total,
        percentage: stats.total > 0 ? Math.round((stats.caught / stats.total) * 100) : 0
      };
    });
    return formatted;
  }
  
  private async getEvolutionChain(pokemonId: number): Promise<any[]> {
    // TODO: Implémenter récupération chaîne d'évolution complète
    const pokemonData = await this.getPokemonData(pokemonId);
    return pokemonData ? [pokemonData] : [];
  }
  
  // ===== MÉTHODES DE NETTOYAGE =====
  
  /**
   * Nettoie les caches
   */
  clearCaches(): void {
    this.pokemonDataCache.clear();
    this.playerStatsCache.clear();
    console.log('🧹 [PokédxService] Caches nettoyés');
  }
  
  /**
   * Pré-charge les données Pokémon fréquemment utilisées
   */
  async preloadCommonData(): Promise<void> {
    console.log('⚡ [PokédxService] Pré-chargement des données communes...');
    
    // Pré-charger les 151 premiers Pokémon (Kanto)
    const promises = [];
    for (let i = 1; i <= 151; i++) {
      promises.push(this.getPokemonData(i));
    }
    
    await Promise.all(promises);
    console.log('✅ [PokédxService] Données Kanto pré-chargées');
  }
}

// ===== EXPORT SINGLETON =====
export const pokédexService = PokédexService.getInstance();
export default pokédexService;
