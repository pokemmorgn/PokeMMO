// server/src/services/PokédexNotificationService.ts
import { EventEmitter } from 'events';
import { getPokemonById } from '../data/PokemonData';

// ===== TYPES SIMPLES ET SÉCURISÉS =====

export interface PokédexNotification {
  id: string;
  playerId: string;
  type: 'discovery' | 'capture' | 'shiny' | 'milestone' | 'streak' | 'evolution';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  icon: string;
  timestamp: Date;
  read: boolean;
  autoHide: boolean;
  hideDelay: number; // ms
  data?: any;
}

export interface NotificationSettings {
  enabled: boolean;
  discoveries: boolean;
  captures: boolean;
  shinies: boolean;
  milestones: boolean;
  streaks: boolean;
  sounds: boolean;
  animations: boolean;
}

export interface QuickNotificationData {
  pokemonId?: number;
  pokemonName?: string;
  level?: number;
  location?: string;
  isShiny?: boolean;
  count?: number;
  milestone?: string;
}

// ===== TEMPLATES OPTIMISÉS =====

const NOTIFICATION_TEMPLATES = {
  // Découvertes
  first_discovery: {
    priority: 'high' as const,
    title: 'Première Découverte !',
    message: 'Vous avez découvert {pokemonName} pour la première fois !',
    icon: '🔍',
    autoHide: true,
    hideDelay: 5000
  },
  
  rare_discovery: {
    priority: 'high' as const,
    title: 'Pokémon Rare !',
    message: '{pokemonName} est un Pokémon rare ! Tentez de le capturer !',
    icon: '⭐',
    autoHide: true,
    hideDelay: 6000
  },
  
  // Captures
  first_capture: {
    priority: 'high' as const,
    title: 'Première Capture !',
    message: '{pokemonName} capturé ! Bienvenue dans votre équipe !',
    icon: '🎯',
    autoHide: true,
    hideDelay: 5000
  },
  
  normal_capture: {
    priority: 'medium' as const,
    title: 'Capture Réussie !',
    message: '{pokemonName} (Niv.{level}) capturé !',
    icon: '⚡',
    autoHide: true,
    hideDelay: 3000
  },
  
  // Shinies
  shiny_found: {
    priority: 'critical' as const,
    title: 'Pokémon Shiny !',
    message: '✨ Un {pokemonName} shiny apparaît ! Ne le laissez pas s\'échapper !',
    icon: '✨',
    autoHide: false,
    hideDelay: 10000
  },
  
  shiny_caught: {
    priority: 'critical' as const,
    title: 'Shiny Capturé !',
    message: '🌟 {pokemonName} shiny capturé ! Un trésor rare !',
    icon: '🌟',
    autoHide: true,
    hideDelay: 8000
  },
  
  // Milestones
  milestone_seen: {
    priority: 'high' as const,
    title: 'Étape Atteinte !',
    message: '🏆 {count} Pokémon découverts ! Continuez l\'exploration !',
    icon: '🏆',
    autoHide: true,
    hideDelay: 5000
  },
  
  milestone_caught: {
    priority: 'high' as const,
    title: 'Étape Capture !',
    message: '🎖️ {count} Pokémon capturés ! Impressionnant !',
    icon: '🎖️',
    autoHide: true,
    hideDelay: 5000
  },
  
  // Streaks
  streak_active: {
    priority: 'medium' as const,
    title: 'Série Active !',
    message: '🔥 {count} jours consécutifs ! Continuez !',
    icon: '🔥',
    autoHide: true,
    hideDelay: 4000
  },
  
  // Évolutions
  evolution_new: {
    priority: 'high' as const,
    title: 'Nouvelle Forme !',
    message: '🌟 {pokemonName} découvert par évolution !',
    icon: '🌟',
    autoHide: true,
    hideDelay: 5000
  }
};

// ===== SERVICE NOTIFICATIONS OPTIMISÉ =====

export class PokédexNotificationService extends EventEmitter {
  private static instance: PokédexNotificationService;
  
  // File de notifications par joueur (limitée)
  private notifications = new Map<string, PokédexNotification[]>();
  private readonly MAX_NOTIFICATIONS = 50; // Par joueur
  
  // Paramètres par joueur
  private settings = new Map<string, NotificationSettings>();
  
  // Cache anti-spam
  private recentNotifs = new Map<string, Set<string>>();
  private readonly SPAM_WINDOW = 10 * 1000; // 10 secondes
  
  // Statistiques
  private stats = {
    totalSent: 0,
    totalSpam: 0,
    totalErrors: 0
  };
  
  constructor() {
    super();
    this.setupCleanup();
    console.log('🔔 [PokédexNotificationService] Service de notifications initialisé');
  }
  
  // Singleton sécurisé
  static getInstance(): PokédexNotificationService {
    if (!PokédexNotificationService.instance) {
      PokédexNotificationService.instance = new PokédexNotificationService();
    }
    return PokédexNotificationService.instance;
  }
  
  // ===== API SIMPLE =====
  
  /**
   * 🔍 Notification de découverte
   */
  async notifyDiscovery(
    playerId: string,
    data: QuickNotificationData,
    isFirst: boolean = false,
    isRare: boolean = false
  ): Promise<boolean> {
    try {
      if (!this.shouldNotify(playerId, 'discoveries')) {
        return false;
      }
      
      const templateKey = isFirst ? 'first_discovery' : (isRare ? 'rare_discovery' : 'first_discovery');
      
      return await this.createNotification(playerId, 'discovery', templateKey, data);
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédexNotificationService] Erreur notifyDiscovery:`, error);
      return false;
    }
  }
  
  /**
   * 🎯 Notification de capture
   */
  async notifyCapture(
    playerId: string,
    data: QuickNotificationData,
    isFirst: boolean = false
  ): Promise<boolean> {
    try {
      if (!this.shouldNotify(playerId, 'captures')) {
        return false;
      }
      
      const templateKey = isFirst ? 'first_capture' : 'normal_capture';
      
      return await this.createNotification(playerId, 'capture', templateKey, data);
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédexNotificationService] Erreur notifyCapture:`, error);
      return false;
    }
  }
  
  /**
   * ✨ Notification shiny
   */
  async notifyShiny(
    playerId: string,
    data: QuickNotificationData,
    action: 'found' | 'caught' = 'found'
  ): Promise<boolean> {
    try {
      if (!this.shouldNotify(playerId, 'shinies')) {
        return false;
      }
      
      const templateKey = action === 'found' ? 'shiny_found' : 'shiny_caught';
      
      return await this.createNotification(playerId, 'shiny', templateKey, data);
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédexNotificationService] Erreur notifyShiny:`, error);
      return false;
    }
  }
  
  /**
   * 🏆 Notification de milestone
   */
  async notifyMilestone(
    playerId: string,
    type: 'seen' | 'caught',
    count: number
  ): Promise<boolean> {
    try {
      if (!this.shouldNotify(playerId, 'milestones')) {
        return false;
      }
      
      const templateKey = type === 'seen' ? 'milestone_seen' : 'milestone_caught';
      const data = { count };
      
      return await this.createNotification(playerId, 'milestone', templateKey, data);
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédexNotificationService] Erreur notifyMilestone:`, error);
      return false;
    }
  }
  
  /**
   * 🔥 Notification de streak
   */
  async notifyStreak(
    playerId: string,
    count: number,
    type: string = 'général'
  ): Promise<boolean> {
    try {
      if (!this.shouldNotify(playerId, 'streaks')) {
        return false;
      }
      
      const data = { count };
      
      return await this.createNotification(playerId, 'streak', 'streak_active', data);
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédexNotificationService] Erreur notifyStreak:`, error);
      return false;
    }
  }
  
  /**
   * 🌟 Notification d'évolution
   */
  async notifyEvolution(
    playerId: string,
    data: QuickNotificationData
  ): Promise<boolean> {
    try {
      if (!this.shouldNotify(playerId, 'discoveries')) {
        return false;
      }
      
      return await this.createNotification(playerId, 'evolution', 'evolution_new', data);
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédexNotificationService] Erreur notifyEvolution:`, error);
      return false;
    }
  }
  
  // ===== GESTION DES NOTIFICATIONS =====
  
  /**
   * Récupère les notifications d'un joueur
   */
  getNotifications(
    playerId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      types?: string[];
    } = {}
  ): PokédexNotification[] {
    try {
      if (!this.validatePlayerId(playerId)) {
        return [];
      }
      
      const playerNotifs = this.notifications.get(playerId) || [];
      
      let filtered = playerNotifs;
      
      // Filtres
      if (options.unreadOnly) {
        filtered = filtered.filter(n => !n.read);
      }
      
      if (options.types?.length) {
        filtered = filtered.filter(n => options.types!.includes(n.type));
      }
      
      // Tri par priorité puis date
      filtered.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
      
      // Limite sécurisée
      const limit = Math.min(Math.max(options.limit || 20, 1), 100);
      return filtered.slice(0, limit);
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur getNotifications:`, error);
      return [];
    }
  }
  
  /**
   * Marque une notification comme lue
   */
  markAsRead(playerId: string, notificationId: string): boolean {
    try {
      if (!this.validatePlayerId(playerId) || !notificationId) {
        return false;
      }
      
      const playerNotifs = this.notifications.get(playerId) || [];
      const notif = playerNotifs.find(n => n.id === notificationId);
      
      if (notif && !notif.read) {
        notif.read = true;
        this.emit('notificationRead', { playerId, notificationId });
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur markAsRead:`, error);
      return false;
    }
  }
  
  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead(playerId: string): number {
    try {
      if (!this.validatePlayerId(playerId)) {
        return 0;
      }
      
      const playerNotifs = this.notifications.get(playerId) || [];
      let count = 0;
      
      playerNotifs.forEach(notif => {
        if (!notif.read) {
          notif.read = true;
          count++;
        }
      });
      
      if (count > 0) {
        this.emit('allNotificationsRead', { playerId, count });
      }
      
      return count;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur markAllAsRead:`, error);
      return 0;
    }
  }
  
  /**
   * Supprime une notification
   */
  removeNotification(playerId: string, notificationId: string): boolean {
    try {
      if (!this.validatePlayerId(playerId) || !notificationId) {
        return false;
      }
      
      const playerNotifs = this.notifications.get(playerId) || [];
      const index = playerNotifs.findIndex(n => n.id === notificationId);
      
      if (index !== -1) {
        playerNotifs.splice(index, 1);
        this.emit('notificationRemoved', { playerId, notificationId });
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur removeNotification:`, error);
      return false;
    }
  }
  
  // ===== PARAMÈTRES =====
  
  /**
   * Met à jour les paramètres d'un joueur
   */
  updateSettings(playerId: string, newSettings: Partial<NotificationSettings>): boolean {
    try {
      if (!this.validatePlayerId(playerId)) {
        return false;
      }
      
      const current = this.getSettings(playerId);
      const updated = { ...current, ...newSettings };
      
      this.settings.set(playerId, updated);
      
      console.log(`⚙️ [PokédexNotificationService] Paramètres mis à jour pour ${playerId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur updateSettings:`, error);
      return false;
    }
  }
  
  /**
   * Récupère les paramètres d'un joueur
   */
  getSettings(playerId: string): NotificationSettings {
    return this.settings.get(playerId) || this.getDefaultSettings();
  }
  
  /**
   * Paramètres par défaut
   */
  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      discoveries: true,
      captures: true,
      shinies: true,
      milestones: true,
      streaks: true,
      sounds: true,
      animations: true
    };
  }
  
  // ===== MÉTHODES PRIVÉES OPTIMISÉES =====
  
  /**
   * Crée une notification
   */
  private async createNotification(
    playerId: string,
    type: string,
    templateKey: string,
    data: QuickNotificationData
  ): Promise<boolean> {
    try {
      // Validation
      if (!this.validatePlayerId(playerId)) {
        return false;
      }
      
      // Protection anti-spam
      const spamKey = `${type}:${data.pokemonId || 'general'}`;
      if (this.isSpam(playerId, spamKey)) {
        this.stats.totalSpam++;
        return false;
      }
      
      // Récupérer template
      const template = NOTIFICATION_TEMPLATES[templateKey as keyof typeof NOTIFICATION_TEMPLATES];
      if (!template) {
        console.error(`❌ Template ${templateKey} introuvable`);
        return false;
      }
      
      // Enrichir les données si nécessaire
      const enrichedData = await this.enrichNotificationData(data);
      
      // Créer la notification
      const notification: PokédexNotification = {
        id: this.generateId(),
        playerId,
        type: type as any,
        priority: template.priority,
        title: template.title,
        message: this.interpolateMessage(template.message, enrichedData),
        icon: template.icon,
        timestamp: new Date(),
        read: false,
        autoHide: template.autoHide,
        hideDelay: template.hideDelay,
        data: enrichedData
      };
      
      // Ajouter à la file
      let playerNotifs = this.notifications.get(playerId) || [];
      playerNotifs.unshift(notification); // Plus récent en premier
      
      // Limiter le nombre
      if (playerNotifs.length > this.MAX_NOTIFICATIONS) {
        playerNotifs = playerNotifs.slice(0, this.MAX_NOTIFICATIONS);
      }
      
      this.notifications.set(playerId, playerNotifs);
      
      // Marquer comme envoyé (anti-spam)
      this.markAsSent(playerId, spamKey);
      
      // Statistiques
      this.stats.totalSent++;
      
      // Émettre événement
      this.emit('notificationCreated', notification);
      
      console.log(`🔔 [PokédexNotificationService] ${type} envoyée à ${playerId}: ${notification.title}`);
      
      // Auto-masquage
      if (template.autoHide && template.hideDelay > 0) {
        setTimeout(() => {
          this.markAsRead(playerId, notification.id);
        }, template.hideDelay);
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur createNotification:`, error);
      return false;
    }
  }
  
  /**
   * Enrichit les données de notification
   */
  private async enrichNotificationData(data: QuickNotificationData): Promise<any> {
    const enriched = { ...data };
    
    // Récupérer le nom du Pokémon si pas fourni
    if (data.pokemonId && !data.pokemonName) {
      try {
        const pokemonData = await getPokemonById(data.pokemonId);
        if (pokemonData) {
          enriched.pokemonName = pokemonData.name;
        }
      } catch (error) {
        console.warn(`⚠️ Impossible de récupérer le nom du Pokémon ${data.pokemonId}`);
      }
    }
    
    return enriched;
  }
  
  /**
   * Interpole le message avec les données
   */
  private interpolateMessage(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }
  
  /**
   * Vérifie si on doit envoyer une notification
   */
  private shouldNotify(playerId: string, type: keyof NotificationSettings): boolean {
    const settings = this.getSettings(playerId);
    return settings.enabled && settings[type];
  }
  
  /**
   * Détection de spam
   */
  private isSpam(playerId: string, key: string): boolean {
    const playerSpam = this.recentNotifs.get(playerId);
    return playerSpam?.has(key) || false;
  }
  
  /**
   * Marque comme envoyé (anti-spam)
   */
  private markAsSent(playerId: string, key: string): void {
    let playerSpam = this.recentNotifs.get(playerId);
    if (!playerSpam) {
      playerSpam = new Set();
      this.recentNotifs.set(playerId, playerSpam);
    }
    
    playerSpam.add(key);
    
    // Auto-nettoyage
    setTimeout(() => {
      const spam = this.recentNotifs.get(playerId);
      if (spam) {
        spam.delete(key);
        if (spam.size === 0) {
          this.recentNotifs.delete(playerId);
        }
      }
    }, this.SPAM_WINDOW);
  }
  
  /**
   * Validation playerId
   */
  private validatePlayerId(playerId: string): boolean {
    return typeof playerId === 'string' && playerId.length > 0 && playerId.length <= 50;
  }
  
  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // ===== STATISTIQUES =====
  
  /**
   * Récupère les statistiques du service
   */
  getStats(playerId?: string): any {
    const global = {
      totalSent: this.stats.totalSent,
      totalSpam: this.stats.totalSpam,
      totalErrors: this.stats.totalErrors,
      spamRate: this.stats.totalSent > 0 ? (this.stats.totalSpam / this.stats.totalSent) * 100 : 0,
      totalPlayers: this.notifications.size,
      cacheSize: this.recentNotifs.size
    };
    
    if (playerId && this.validatePlayerId(playerId)) {
      const playerNotifs = this.notifications.get(playerId) || [];
      return {
        ...global,
        player: {
          total: playerNotifs.length,
          unread: playerNotifs.filter(n => !n.read).length,
          byType: this.getNotificationsByType(playerNotifs),
          settings: this.getSettings(playerId)
        }
      };
    }
    
    return global;
  }
  
  /**
   * Statistiques par type
   */
  private getNotificationsByType(notifications: PokédexNotification[]): Record<string, number> {
    const byType: Record<string, number> = {};
    
    notifications.forEach(notif => {
      byType[notif.type] = (byType[notif.type] || 0) + 1;
    });
    
    return byType;
  }
  
  // ===== NETTOYAGE ET MAINTENANCE =====
  
  /**
   * Configuration du nettoyage automatique
   */
  private setupCleanup(): void {
    // Nettoyage toutes les 15 minutes
    setInterval(() => {
      this.cleanupOldNotifications();
      this.cleanupSpamCache();
    }, 15 * 60 * 1000);
  }
  
  /**
   * Nettoie les anciennes notifications
   */
  private cleanupOldNotifications(): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
    const cutoff = new Date(Date.now() - maxAge);
    
    let totalCleaned = 0;
    
    for (const [playerId, notifications] of this.notifications.entries()) {
      const before = notifications.length;
      
      // Garder les notifications récentes ou non lues importantes
      const filtered = notifications.filter(notif => 
        notif.timestamp > cutoff || 
        (!notif.read && (notif.priority === 'high' || notif.priority === 'critical'))
      );
      
      if (filtered.length !== before) {
        this.notifications.set(playerId, filtered);
        totalCleaned += before - filtered.length;
      }
      
      // Supprimer les joueurs sans notifications
      if (filtered.length === 0) {
        this.notifications.delete(playerId);
      }
    }
    
    if (totalCleaned > 0) {
      console.log(`🧹 [PokédexNotificationService] ${totalCleaned} notifications anciennes nettoyées`);
    }
  }
  
  /**
   * Nettoie le cache anti-spam
   */
  private cleanupSpamCache(): void {
    for (const [playerId, spam] of this.recentNotifs.entries()) {
      if (spam.size === 0) {
        this.recentNotifs.delete(playerId);
      }
    }
  }
  
  /**
   * Nettoyage manuel
   */
  clearPlayerData(playerId: string): boolean {
    try {
      if (!this.validatePlayerId(playerId)) {
        return false;
      }
      
      this.notifications.delete(playerId);
      this.settings.delete(playerId);
      this.recentNotifs.delete(playerId);
      
      console.log(`🗑️ [PokédexNotificationService] Données supprimées pour ${playerId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur clearPlayerData:`, error);
      return false;
    }
  }
  
  /**
   * Reset des statistiques
   */
  resetStats(): void {
    this.stats = {
      totalSent: 0,
      totalSpam: 0,
      totalErrors: 0
    };
    console.log('📊 [PokédexNotificationService] Statistiques remises à zéro');
  }
}

// ===== EXPORT SINGLETON =====
export const pokédexNotificationService = PokédexNotificationService.getInstance();
export default pokédexNotificationService;
