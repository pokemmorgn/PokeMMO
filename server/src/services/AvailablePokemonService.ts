// server/src/services/AvailablePokemonService.ts
import pokemonIndexData from '../data/pokemon/pokemon-index.json';

// ===== TYPES & INTERFACES =====

export interface AvailablePokemonInfo {
  totalAvailable: number;
  availableIds: number[];
  groupsByFamily: Map<string, number[]>;
  regionDistribution: Map<string, number[]>;
}

// ===== SERVICE POKÉMON DISPONIBLES =====

export class AvailablePokemonService {
  private static instance: AvailablePokemonService;
  
  // Cache des données pour optimiser
  private availableIds: number[] = [];
  private totalAvailable: number = 0;
  private groupsByFamily = new Map<string, number[]>();
  private regionDistribution = new Map<string, number[]>();
  
  // Flag pour savoir si les données sont initialisées
  private isInitialized: boolean = false;
  
  constructor() {
    this.initializeData();
    console.log('📋 [AvailablePokemonService] Service initialisé avec', this.totalAvailable, 'Pokémon disponibles');
  }
  
  // Singleton pattern
  static getInstance(): AvailablePokemonService {
    if (!AvailablePokemonService.instance) {
      AvailablePokemonService.instance = new AvailablePokemonService();
    }
    return AvailablePokemonService.instance;
  }
  
  // ===== INITIALISATION =====
  
  private initializeData(): void {
    try {
      // Extraire les IDs depuis pokemon-index.json
      const pokemonIndex = pokemonIndexData as { [key: string]: string };
      
      // Convertir en tableau d'IDs triés
      this.availableIds = Object.keys(pokemonIndex)
        .map(id => parseInt(id))
        .filter(id => !isNaN(id))
        .sort((a, b) => a - b);
      
      this.totalAvailable = this.availableIds.length;
      
      // Grouper par famille/type
      this.groupsByFamily.clear();
      Object.entries(pokemonIndex).forEach(([idStr, family]) => {
        const id = parseInt(idStr);
        if (!isNaN(id)) {
          if (!this.groupsByFamily.has(family)) {
            this.groupsByFamily.set(family, []);
          }
          this.groupsByFamily.get(family)!.push(id);
        }
      });
      
      // Distribuer par région
      this.calculateRegionDistribution();
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ [AvailablePokemonService] Erreur initialisation:', error);
      // Fallback vers Kanto complet en cas d'erreur
      this.availableIds = Array.from({length: 151}, (_, i) => i + 1);
      this.totalAvailable = 151;
      this.isInitialized = true;
    }
  }
  
  private calculateRegionDistribution(): void {
    this.regionDistribution.clear();
    
    this.availableIds.forEach(id => {
      const region = this.determineRegionFromId(id);
      if (!this.regionDistribution.has(region)) {
        this.regionDistribution.set(region, []);
      }
      this.regionDistribution.get(region)!.push(id);
    });
    
    // Trier chaque région
    this.regionDistribution.forEach(ids => ids.sort((a, b) => a - b));
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
  
  // ===== API PUBLIQUE =====
  
  /**
   * Récupère tous les IDs de Pokémon disponibles sur le serveur
   */
  getAvailablePokemonIds(): number[] {
    this.ensureInitialized();
    return [...this.availableIds]; // Copie pour éviter les modifications
  }
  
  /**
   * Récupère le nombre total de Pokémon disponibles
   */
  getTotalAvailable(): number {
    this.ensureInitialized();
    return this.totalAvailable;
  }
  
  /**
   * Vérifie si un Pokémon est disponible sur le serveur
   */
  isPokemonAvailable(pokemonId: number): boolean {
    this.ensureInitialized();
    return this.availableIds.includes(pokemonId);
  }
  
  /**
   * Filtre une liste d'IDs pour ne garder que ceux disponibles
   */
  filterAvailableIds(pokemonIds: number[]): number[] {
    this.ensureInitialized();
    return pokemonIds.filter(id => this.availableIds.includes(id));
  }
  
  /**
   * Récupère les informations complètes sur les Pokémon disponibles
   */
  getAvailablePokemonInfo(): AvailablePokemonInfo {
    this.ensureInitialized();
    
    return {
      totalAvailable: this.totalAvailable,
      availableIds: [...this.availableIds],
      groupsByFamily: new Map(this.groupsByFamily),
      regionDistribution: new Map(this.regionDistribution)
    };
  }
  
  /**
   * Récupère les Pokémon disponibles par région
   */
  getAvailablePokemonByRegion(region?: string): { [region: string]: number[] } {
    this.ensureInitialized();
    
    const result: { [region: string]: number[] } = {};
    
    if (region) {
      // Région spécifique
      const ids = this.regionDistribution.get(region.toLowerCase()) || [];
      result[region] = [...ids];
    } else {
      // Toutes les régions
      this.regionDistribution.forEach((ids, regionName) => {
        result[regionName] = [...ids];
      });
    }
    
    return result;
  }
  
  /**
   * Récupère les Pokémon disponibles par famille
   */
  getAvailablePokemonByFamily(family?: string): { [family: string]: number[] } {
    this.ensureInitialized();
    
    const result: { [family: string]: number[] } = {};
    
    if (family) {
      // Famille spécifique
      const ids = this.groupsByFamily.get(family) || [];
      result[family] = [...ids];
    } else {
      // Toutes les familles
      this.groupsByFamily.forEach((ids, familyName) => {
        result[familyName] = [...ids];
      });
    }
    
    return result;
  }
  
  /**
   * Calcule les statistiques de disponibilité
   */
  getAvailabilityStats(): {
    total: number;
    byRegion: { [region: string]: { count: number; percentage: number } };
    topFamilies: Array<{ family: string; count: number }>;
  } {
    this.ensureInitialized();
    
    const stats = {
      total: this.totalAvailable,
      byRegion: {} as { [region: string]: { count: number; percentage: number } },
      topFamilies: [] as Array<{ family: string; count: number }>
    };
    
    // Stats par région
    this.regionDistribution.forEach((ids, region) => {
      stats.byRegion[region] = {
        count: ids.length,
        percentage: Math.round((ids.length / this.totalAvailable) * 100)
      };
    });
    
    // Top familles
    const familyStats = Array.from(this.groupsByFamily.entries())
      .map(([family, ids]) => ({ family, count: ids.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    stats.topFamilies = familyStats;
    
    return stats;
  }
  
  /**
   * Vérifie les Pokémon manquants dans une région
   */
  getMissingPokemonInRegion(region: string): number[] {
    this.ensureInitialized();
    
    const available = this.regionDistribution.get(region.toLowerCase()) || [];
    const allInRegion: number[] = [];
    
    // Déterminer tous les Pokémon qui devraient être dans cette région
    let start = 1, end = 151;
    switch (region.toLowerCase()) {
      case 'kanto': start = 1; end = 151; break;
      case 'johto': start = 152; end = 251; break;
      case 'hoenn': start = 252; end = 386; break;
      case 'sinnoh': start = 387; end = 493; break;
      case 'unova': start = 494; end = 649; break;
      case 'kalos': start = 650; end = 721; break;
      case 'alola': start = 722; end = 809; break;
      case 'galar': start = 810; end = 905; break;
      default: return [];
    }
    
    for (let i = start; i <= end; i++) {
      allInRegion.push(i);
    }
    
    return allInRegion.filter(id => !available.includes(id));
  }
  
  /**
   * Récupère un échantillon aléatoire de Pokémon disponibles
   */
  getRandomAvailablePokemon(count: number = 10): number[] {
    this.ensureInitialized();
    
    const shuffled = [...this.availableIds].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, this.availableIds.length));
  }
  
  // ===== UTILITAIRES =====
  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.initializeData();
    }
  }
  
  /**
   * Force la recharge des données depuis le fichier
   */
  reloadData(): void {
    this.isInitialized = false;
    this.initializeData();
    console.log('🔄 [AvailablePokemonService] Données rechargées:', this.totalAvailable, 'Pokémon');
  }
  
  /**
   * Récupère les statistiques du service
   */
  getServiceStats(): any {
    return {
      isInitialized: this.isInitialized,
      totalAvailable: this.totalAvailable,
      regionsCount: this.regionDistribution.size,
      familiesCount: this.groupsByFamily.size,
      lastUpdate: new Date()
    };
  }
}

// ===== EXPORT SINGLETON =====
export const availablePokemonService = AvailablePokemonService.getInstance();
export default availablePokemonService;
