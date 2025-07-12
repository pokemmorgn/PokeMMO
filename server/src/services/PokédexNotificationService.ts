const pokédexProgressService = PokédexProgressService.getInstance();// server/src/services/PokédexNotificationService.ts
import { EventEmitter } from 'events';
import { getPokemonById } from '../data/PokemonData';

// ===== TYPES & INTERFACES =====

export interface PokédexNotification {
  id: string;
  playerId: string;
  type: 'discovery' | 'capture' | 'shiny' | 'milestone' | 'streak' | 'achievement' | 'evolution';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  icon: string;
  data?: any;
  timestamp: Date;
  read: boolean;
  persistent: boolean; // Si true, reste jusqu'à lecture
  autoHideDelay?: number; // Délai auto-masquage en ms
}

export interface PokédexNotificationData {
  pokemonId?: number;
  pokemonName?: string;
  isShiny?: boolean;
  level?: number;
  location?: string;
  milestone?: {
    type: string;
    current: number;
    target: number;
  };
  streak?: {
    type: string;
    count: number;
  };
  achievement?: {
    name: string;
    description: string;
    reward: string;
  };
}

export interface PokédexNotificationTemplate {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  titleTemplate: string;
  messageTemplate: string;
  icon: string;
  persistent: boolean;
  autoHideDelay?: number;
  sound?: string;
  animation?: string;
}

// ===== TEMPLATES DE NOTIFICATIONS =====

const POKEDEX_NOTIFICATION_TEMPLATES: { [key: string]: PokédexNotificationTemplate } = {
  // === DÉCOUVERTES ===
  first_discovery: {
    type: 'discovery',
    priority: 'high',
    titleTemplate: 'Première Découverte !',
    messageTemplate: 'Vous avez découvert {{pokemonName}} pour la première fois !',
    icon: '🔍',
    persistent: true,
    autoHideDelay: 5000,
    sound: 'discovery_fanfare',
    animation: 'bounce'
  },
  
  rare_discovery: {
    type: 'discovery',
    priority: 'high',
    titleTemplate: 'Pokémon Rare !',
    messageTemplate: '{{pokemonName}} est un Pokémon rare ! Essayez de le capturer !',
    icon: '⭐',
    persistent: true,
    autoHideDelay: 6000,
    sound: 'rare_discovery',
    animation: 'glow'
  },
  
  legendary_discovery: {
    type: 'discovery',
    priority: 'critical',
    titleTemplate: 'Pokémon Légendaire !',
    messageTemplate: 'Un {{pokemonName}} légendaire apparaît ! Une occasion unique !',
    icon: '👑',
    persistent: true,
    autoHideDelay: 8000,
    sound: 'legendary_fanfare',
    animation: 'rainbow'
  },
  
  // === CAPTURES ===
  first_capture: {
    type: 'capture',
    priority: 'high',
    titleTemplate: 'Première Capture !',
    messageTemplate: '{{pokemonName}} a été capturé ! Bienvenue dans votre équipe !',
    icon: '🎯',
    persistent: true,
    autoHideDelay: 5000,
    sound: 'capture_success',
    animation: 'zoom'
  },
  
  capture_success: {
    type: 'capture',
    priority: 'medium',
    titleTemplate: 'Capture Réussie !',
    messageTemplate: '{{pokemonName}} (Niv.{{level}}) capturé à {{location}} !',
    icon: '⚡',
    persistent: false,
    autoHideDelay: 4000,
    sound: 'capture_normal',
    animation: 'slide'
  },
  
  perfect_capture: {
    type: 'capture',
    priority: 'high',
    titleTemplate: 'Capture Parfaite !',
    messageTemplate: '{{pokemonName}} capturé du premier coup ! Excellent travail !',
    icon: '🎯',
    persistent: true,
    autoHideDelay: 5000,
    sound: 'perfect_capture',
    animation: 'perfect'
  },
  
  // === SHINY ===
  shiny_discovery: {
    type: 'shiny',
    priority: 'critical',
    titleTemplate: 'Pokémon Shiny !',
    messageTemplate: '✨ Un {{pokemonName}} shiny apparaît ! Ne le laissez pas s\'échapper !',
    icon: '✨',
    persistent: true,
    autoHideDelay: 10000,
    sound: 'shiny_sparkle',
    animation: 'sparkle'
  },
  
  shiny_captured: {
    type: 'shiny',
    priority: 'critical',
    titleTemplate: 'Shiny Capturé !',
    messageTemplate: '🌟 {{pokemonName}} shiny capturé ! Un trésor pour votre collection !',
    icon: '🌟',
    persistent: true,
    autoHideDelay: 8000,
    sound: 'shiny_captured',
    animation: 'golden'
  },
  
  // === MILESTONES ===
  milestone_discovery: {
    type: 'milestone',
    priority: 'high',
    titleTemplate: 'Milestone Atteint !',
    messageTemplate: '🏆 {{current}}/{{target}} Pokémon découverts ! Continuez l\'exploration !',
    icon: '🏆',
    persistent: true,
    autoHideDelay: 6000,
    sound: 'milestone_achievement',
    animation: 'trophy'
  },
  
  milestone_capture: {
    type: 'milestone',
    priority: 'high',
    titleTemplate: 'Milestone Capture !',
    messageTemplate: '🎖️ {{current}}/{{target}} Pokémon capturés ! Impressionnant !',
    icon: '🎖️',
    persistent: true,
    autoHideDelay: 6000,
    sound: 'milestone_achievement',
    animation: 'medal'
  },
  
  pokedex_complete: {
    type: 'milestone',
    priority: 'critical',
    titleTemplate: 'Pokédex Complet !',
    messageTemplate: '👑 Félicitations ! Vous avez complété le Pokédx de {{region}} !',
    icon: '👑',
    persistent: true,
    autoHideDelay: 15000,
    sound: 'pokedex_complete',
    animation: 'celebration'
  },
  
  // === STREAKS ===
  streak_discovery: {
    type: 'streak',
    priority: 'medium',
    titleTemplate: 'Série de Découvertes !',
    messageTemplate: '🔥 {{count}} jours consécutifs de découvertes ! Continuez !',
    icon: '🔥',
    persistent: true,
    autoHideDelay: 4000,
    sound: 'streak_continue',
    animation: 'fire'
  },
  
  streak_capture: {
    type: 'streak',
    priority: 'medium',
    titleTemplate: 'Série de Captures !',
    messageTemplate: '⚡ {{count}} jours consécutifs de captures ! Excellent rythme !',
    icon: '⚡',
    persistent: true,
    autoHideDelay: 4000,
    sound: 'streak_continue',
    animation: 'lightning'
  },
  
  streak_broken: {
    type: 'streak',
    priority: 'low',
    titleTemplate: 'Série Interrompue',
    messageTemplate: '💔 Votre série de {{count}} jours s\'arrête. Recommencez demain !',
    icon: '💔',
    persistent: false,
    autoHideDelay: 5000,
    sound: 'streak_broken',
    animation: 'fade'
  },
  
  // === ACHIEVEMENTS ===
  // TODO: ACHIEVEMENT SYSTEM GLOBAL - Templates pour accomplissements
  achievement_unlock: {
    type: 'achievement',
    priority: 'high',
    titleTemplate: 'Accomplissement Débloqué !',
    messageTemplate: '🏅 {{name}} : {{description}}',
    icon: '🏅',
    persistent: true,
    autoHideDelay: 8000,
    sound: 'achievement_unlock',
    animation: 'badge'
  },
  
  // === ÉVOLUTIONS ===
  evolution_available: {
    type: 'evolution',
    priority: 'medium',
    titleTemplate: 'Évolution Possible !',
    messageTemplate: '🌟 {{pokemonName}} peut évoluer ! Visitez votre équipe !',
    icon: '🌟',
    persistent: true,
    autoHideDelay: 6000,
    sound: 'evolution_ready',
    animation: 'evolve'
  }
};

// ===== SERVICE NOTIFICATIONS POKÉDEX =====

export class PokédexNotificationService extends EventEmitter {
  private static instance: PokédexNotificationService;
  
  // File des notifications par joueur
  private playerNotifications = new Map<string, PokédexNotification[]>();
  
  // Cache des notifications récentes pour éviter les doublons
  private recentNotificationsCache = new Map<string, Set<string>>();
  
  // Paramètres de notification par joueur
  private playerSettings = new Map<string, {
    enabled: boolean;
    discoveryNotifications: boolean;
    captureNotifications: boolean;
    shinyNotifications: boolean;
    milestoneNotifications: boolean;
    streakNotifications: boolean;
    soundEnabled: boolean;
    animationsEnabled: boolean;
  }>();
  
  constructor() {
    super();
    console.log('🔔 [PokédexNotificationService] Service de notifications Pokédx initialisé');
    
    // Nettoyage périodique du cache
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Toutes les 5 minutes
  }
  
  // Singleton pattern
  static getInstance(): PokédexNotificationService {
    if (!PokédexNotificationService.instance) {
      PokédexNotificationService.instance = new PokédexNotificationService();
    }
    return PokédexNotificationService.instance;
  }
  
  // ===== GÉNÉRATION DE NOTIFICATIONS =====
  
  /**
   * Crée une notification de découverte
   */
  async createDiscoveryNotification(
    playerId: string,
    data: {
      pokemonId: number;
      pokemonName: string;
      isFirstDiscovery: boolean;
      isRare?: boolean;
      isLegendary?: boolean;
      level: number;
      location: string;
    }
  ): Promise<PokédexNotification | null> {
    try {
      if (!this.shouldSendNotification(playerId, 'discovery')) return null;
      
      // Déterminer le type de notification
      let templateKey = 'capture_success';
      if (data.isFirstDiscovery) {
        if (data.isLegendary) {
          templateKey = 'legendary_discovery';
        } else if (data.isRare) {
          templateKey = 'rare_discovery';
        } else {
          templateKey = 'first_discovery';
        }
      }
      
      const notification = await this.buildNotification(playerId, templateKey, {
        pokemonId: data.pokemonId,
        pokemonName: data.pokemonName,
        level: data.level,
        location: data.location
      });
      
      if (notification) {
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur createDiscoveryNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification de capture
   */
  async createCaptureNotification(
    playerId: string,
    data: {
      pokemonId: number;
      pokemonName: string;
      isFirstCapture: boolean;
      isShiny: boolean;
      isPerfectCapture?: boolean;
      level: number;
      location: string;
      captureTime?: number;
    }
  ): Promise<PokédexNotification | null> {
    try {
      if (!this.shouldSendNotification(playerId, 'capture')) return null;
      
      // Déterminer le type de notification
      let templateKey = 'capture_success';
      if (data.isShiny) {
        templateKey = 'shiny_captured';
      } else if (data.isFirstCapture) {
        templateKey = 'first_capture';
      } else if (data.isPerfectCapture) {
        templateKey = 'perfect_capture';
      }
      
      const notification = await this.buildNotification(playerId, templateKey, {
        pokemonId: data.pokemonId,
        pokemonName: data.pokemonName,
        level: data.level,
        location: data.location,
        captureTime: data.captureTime
      });
      
      if (notification) {
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur createCaptureNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification shiny
   */
  async createShinyNotification(
    playerId: string,
    data: {
      pokemonId: number;
      pokemonName: string;
      action: 'discovered' | 'captured';
      location?: string;
    }
  ): Promise<PokédexNotification | null> {
    try {
      if (!this.shouldSendNotification(playerId, 'shiny')) return null;
      
      const templateKey = data.action === 'captured' ? 'shiny_captured' : 'shiny_discovery';
      
      const notification = await this.buildNotification(playerId, templateKey, {
        pokemonId: data.pokemonId,
        pokemonName: data.pokemonName,
        location: data.location
      });
      
      if (notification) {
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur createShinyNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification de milestone
   */
  async createMilestoneNotification(
    playerId: string,
    data: {
      type: 'discovery' | 'capture' | 'complete';
      current: number;
      target: number;
      region?: string;
    }
  ): Promise<PokédexNotification | null> {
    try {
      if (!this.shouldSendNotification(playerId, 'milestone')) return null;
      
      let templateKey = 'milestone_discovery';
      if (data.type === 'capture') {
        templateKey = 'milestone_capture';
      } else if (data.type === 'complete') {
        templateKey = 'pokedex_complete';
      }
      
      const notification = await this.buildNotification(playerId, templateKey, {
        milestone: {
          type: data.type,
          current: data.current,
          target: data.target
        },
        region: data.region || 'Kanto'
      });
      
      if (notification) {
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur createMilestoneNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification de streak
   */
  async createStreakNotification(
    playerId: string,
    data: {
      type: 'discovery' | 'capture';
      action: 'continue' | 'broken';
      count: number;
      isNewRecord?: boolean;
    }
  ): Promise<PokédexNotification | null> {
    try {
      if (!this.shouldSendNotification(playerId, 'streak')) return null;
      
      let templateKey = 'streak_discovery';
      if (data.action === 'broken') {
        templateKey = 'streak_broken';
      } else if (data.type === 'capture') {
        templateKey = 'streak_capture';
      }
      
      const notification = await this.buildNotification(playerId, templateKey, {
        streak: {
          type: data.type,
          count: data.count
        },
        count: data.count
      });
      
      if (notification) {
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur createStreakNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification d'accomplissement
   * TODO: ACHIEVEMENT SYSTEM GLOBAL - Remplacer par système unifié
   */
  async createAchievementNotification(
    playerId: string,
    data: {
      name: string;
      description: string;
      reward: string;
      category: string;
    }
  ): Promise<PokédexNotification | null> {
    try {
      if (!this.shouldSendNotification(playerId, 'achievement')) return null;
      
      const notification = await this.buildNotification(playerId, 'achievement_unlock', {
        achievement: {
          name: data.name,
          description: data.description,
          reward: data.reward
        },
        name: data.name,
        description: data.description
      });
      
      if (notification) {
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      console.error(`❌ [PokédexNotificationService] Erreur createAchievementNotification:`, error);
      return null;
    }
  }
  
  // ===== CONSTRUCTION & ENVOI =====
  
  /**
   * Construit une notification depuis un template
   */
  private async buildNotification(
    playerId: string,
    templateKey: string,
    data: any
  ): Promise<PokédexNotification | null> {
    const template = POKEDEX_NOTIFICATION_TEMPLATES[templateKey];
    if (!template) {
      console.error(`❌ Template notification "${templateKey}" introuvable`);
      return null;
    }
    
    // Interpolation des templates
    const title = this.interpolateTemplate(template.titleTemplate, data);
    const message = this.interpolateTemplate(template.messageTemplate, data);
    
    const notification: PokédexNotification = {
      id: this.generateNotificationId(),
      playerId,
      type: template.type as any,
      priority: template.priority,
      title,
      message,
      icon: template.icon,
      data: {
        ...data,
        sound: template.sound,
        animation: template.animation
      },
      timestamp: new Date(),
      read: false,
      persistent: template.persistent,
      autoHideDelay: template.autoHideDelay
    };
    
    return notification;
  }
  
  /**
   * Interpole un template avec les données
   */
  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const keys = key.split('.');
      let value = data;
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      return value?.toString() || match;
    });
  }
  
  /**
   * Ajoute une notification à la file d'un joueur
   */
  private async queueNotification(notification: PokédexNotification): Promise<void> {
    // Vérifier les doublons récents
    const cacheKey = this.getNotificationCacheKey(notification);
    const playerCache = this.recentNotificationsCache.get(notification.playerId) || new Set();
    
    if (playerCache.has(cacheKey)) {
      console.log(`⏭️ Notification dupliquée ignorée pour ${notification.playerId}: ${cacheKey}`);
      return;
    }
    
    // Ajouter au cache
    playerCache.add(cacheKey);
    this.recentNotificationsCache.set(notification.playerId, playerCache);
    
    // Ajouter à la file du joueur
    const playerQueue = this.playerNotifications.get(notification.playerId) || [];
    playerQueue.push(notification);
    
    // Limiter le nombre de notifications en attente
    if (playerQueue.length > 50) {
      playerQueue.splice(0, playerQueue.length - 50);
    }
    
    this.playerNotifications.set(notification.playerId, playerQueue);
    
    // Émettre l'événement
    this.emit('notificationCreated', notification);
    
    // Log
    console.log(`🔔 [PokédexNotificationService] Notification ${notification.type} pour ${notification.playerId}: ${notification.title}`);
    
    // Auto-suppression si configurée
    if (!notification.persistent && notification.autoHideDelay) {
      setTimeout(() => {
        this.markAsRead(notification.playerId, notification.id);
      }, notification.autoHideDelay);
    }
  }
  
  // ===== GESTION DES NOTIFICATIONS =====
  
  /**
   * Récupère les notifications d'un joueur
   */
  getPlayerNotifications(
    playerId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      types?: string[];
    } = {}
  ): PokédexNotification[] {
    const allNotifications = this.playerNotifications.get(playerId) || [];
    
    let filtered = allNotifications;
    
    // Filtrer par statut de lecture
    if (options.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }
    
    // Filtrer par types
    if (options.types?.length) {
      filtered = filtered.filter(n => options.types!.includes(n.type));
    }
    
    // Trier par priorité puis date
    filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    // Limiter le nombre
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }
  
  /**
   * Marque une notification comme lue
   */
  markAsRead(playerId: string, notificationId: string): boolean {
    const notifications = this.playerNotifications.get(playerId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      this.emit('notificationRead', { playerId, notificationId });
      return true;
    }
    
    return false;
  }
  
  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead(playerId: string): number {
    const notifications = this.playerNotifications.get(playerId) || [];
    let count = 0;
    
    notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    });
    
    if (count > 0) {
      this.emit('allNotificationsRead', { playerId, count });
    }
    
    return count;
  }
  
  /**
   * Supprime une notification
   */
  removeNotification(playerId: string, notificationId: string): boolean {
    const notifications = this.playerNotifications.get(playerId) || [];
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index !== -1) {
      notifications.splice(index, 1);
      this.emit('notificationRemoved', { playerId, notificationId });
      return true;
    }
    
    return false;
  }
  
  /**
   * Nettoie les anciennes notifications
   */
  cleanupOldNotifications(playerId: string, maxAge: number = 24 * 60 * 60 * 1000): number {
    const notifications = this.playerNotifications.get(playerId) || [];
    const cutoff = new Date(Date.now() - maxAge);
    
    const before = notifications.length;
    const filtered = notifications.filter(n => 
      n.timestamp > cutoff || (n.persistent && !n.read)
    );
    
    if (filtered.length !== before) {
      this.playerNotifications.set(playerId, filtered);
    }
    
    return before - filtered.length;
  }
  
  // ===== PARAMÈTRES JOUEUR =====
  
  /**
   * Met à jour les paramètres de notification d'un joueur
   */
  updatePlayerSettings(playerId: string, settings: Partial<{
    enabled: boolean;
    discoveryNotifications: boolean;
    captureNotifications: boolean;
    shinyNotifications: boolean;
    milestoneNotifications: boolean;
    streakNotifications: boolean;
    soundEnabled: boolean;
    animationsEnabled: boolean;
  }>): void {
    const currentSettings = this.playerSettings.get(playerId) || this.getDefaultSettings();
    const newSettings = { ...currentSettings, ...settings };
    
    this.playerSettings.set(playerId, newSettings);
    
    console.log(`⚙️ [PokédexNotificationService] Paramètres mis à jour pour ${playerId}`);
  }
  
  /**
   * Récupère les paramètres d'un joueur
   */
  getPlayerSettings(playerId: string) {
    return this.playerSettings.get(playerId) || this.getDefaultSettings();
  }
  
  /**
   * Paramètres par défaut
   */
  private getDefaultSettings() {
    return {
      enabled: true,
      discoveryNotifications: true,
      captureNotifications: true,
      shinyNotifications: true,
      milestoneNotifications: true,
      streakNotifications: true,
      soundEnabled: true,
      animationsEnabled: true
    };
  }
  
  // ===== UTILITAIRES PRIVÉES =====
  
  /**
   * Vérifie si on doit envoyer une notification
   */
  private shouldSendNotification(playerId: string, type: string): boolean {
    const settings = this.getPlayerSettings(playerId);
    
    if (!settings.enabled) return false;
    
    switch (type) {
      case 'discovery': return settings.discoveryNotifications;
      case 'capture': return settings.captureNotifications;
      case 'shiny': return settings.shinyNotifications;
      case 'milestone': return settings.milestoneNotifications;
      case 'streak': return settings.streakNotifications;
      case 'achievement': return true; // TODO: ACHIEVEMENT SYSTEM GLOBAL
      default: return true;
    }
  }
  
  /**
   * Génère un ID unique pour une notification
   */
  private generateNotificationId(): string {
    return `pokedex_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Génère une clé de cache pour éviter les doublons
   */
  private getNotificationCacheKey(notification: PokédexNotification): string {
    const data = notification.data;
    return `${notification.type}_${data?.pokemonId || 'unknown'}_${Math.floor(notification.timestamp.getTime() / 60000)}`;
  }
  
  /**
   * Nettoie le cache périodiquement
   */
  private cleanupCache(): void {
    const maxAge = 10 * 60 * 1000; // 10 minutes
    const cutoff = Date.now() - maxAge;
    
    for (const [playerId, cache] of this.recentNotificationsCache.entries()) {
      // Pour simplifier, on nettoie tout le cache après 10 minutes
      this.recentNotificationsCache.set(playerId, new Set());
    }
    
    console.log('🧹 [PokédexNotificationService] Cache nettoyé');
  }
  
  // ===== STATISTIQUES =====
  
  /**
   * Récupère les statistiques de notifications
   */
  getNotificationStats(playerId: string): {
    total: number;
    unread: number;
    byType: { [type: string]: number };
    byPriority: { [priority: string]: number };
    last24h: number;
  } {
    const notifications = this.playerNotifications.get(playerId) || [];
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {} as { [type: string]: number },
      byPriority: {} as { [priority: string]: number },
      last24h: notifications.filter(n => n.timestamp > last24h).length
    };
    
    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
    });
    
    return stats;
  }
  
  /**
   * Nettoie toutes les données d'un joueur
   */
  clearPlayerData(playerId: string): void {
    this.playerNotifications.delete(playerId);
    this.playerSettings.delete(playerId);
    this.recentNotificationsCache.delete(playerId);
    
    console.log(`🗑️ [PokédexNotificationService] Données supprimées pour ${playerId}`);
  }
}

// ===== EXPORT SINGLETON =====
export const pokédexNotificationService = PokédexNotificationService.getInstance();
export default pokédexNotificationService;
