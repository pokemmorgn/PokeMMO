// server/src/services/PokedexNotificationService.ts
import { EventEmitter } from 'events';
import { getPokemonById } from '../data/PokemonData';

// ===== TYPES & INTERFACES =====

export interface PokedexNotification {
  id: string;
  playerId: string;
  type: 'discovery' | 'capture' | 'shiny' | 'milestone' | 'streak' | 'achievement' | 'evolution' | 'rare' | 'perfect';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  icon: string;
  data?: any;
  timestamp: Date;
  read: boolean;
  persistent: boolean; // Si true, reste jusqu'à lecture
  autoHideDelay?: number; // Délai auto-masquage en ms
  category: string; // Catégorie pour organisation
  sound?: string; // Son à jouer
  animation?: string; // Animation à afficher
  actions?: NotificationAction[]; // Actions possibles
}

export interface NotificationAction {
  id: string;
  label: string;
  icon?: string;
  action: 'dismiss' | 'view' | 'share' | 'favorite' | 'custom';
  data?: any;
}

export interface PokedexNotificationData {
  pokemonId?: number;
  pokemonName?: string;
  isShiny?: boolean;
  level?: number;
  location?: string;
  isFirstDiscovery?: boolean;
  isFirstCapture?: boolean;
  isPerfectCapture?: boolean;
  captureTime?: number;
  milestone?: {
    type: string;
    current: number;
    target: number;
    reward?: string;
  };
  streak?: {
    type: string;
    count: number;
    isRecord?: boolean;
  };
  achievement?: {
    name: string;
    description: string;
    reward: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
}

export interface NotificationTemplate {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  titleTemplate: string;
  messageTemplate: string;
  icon: string;
  persistent: boolean;
  autoHideDelay?: number;
  sound?: string;
  animation?: string;
  actions?: NotificationAction[];
}

export interface NotificationSettings {
  enabled: boolean;
  discoveryNotifications: boolean;
  captureNotifications: boolean;
  shinyNotifications: boolean;
  milestoneNotifications: boolean;
  streakNotifications: boolean;
  achievementNotifications: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  vibrationEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  minimumPriority: 'low' | 'medium' | 'high' | 'critical';
  quietHours: {
    enabled: boolean;
    start: string; // Format: "22:00"
    end: string;   // Format: "08:00"
  };
  typeFilters: string[]; // Types de notifications activées
}

// ===== TEMPLATES OPTIMISÉS =====

const NOTIFICATION_TEMPLATES: { [key: string]: NotificationTemplate } = {
  // === DÉCOUVERTES ===
  first_discovery: {
    type: 'discovery',
    priority: 'high',
    category: 'discovery',
    titleTemplate: 'Première Découverte !',
    messageTemplate: 'Vous avez découvert {{pokemonName}} pour la première fois !',
    icon: '🔍',
    persistent: true,
    autoHideDelay: 5000,
    sound: 'discovery_fanfare',
    animation: 'bounce',
    actions: [
      { id: 'view', label: 'Voir détails', icon: '👁️', action: 'view' },
      { id: 'share', label: 'Partager', icon: '📤', action: 'share' }
    ]
  },
  
  rare_discovery: {
    type: 'discovery',
    priority: 'high',
    category: 'discovery',
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
    category: 'discovery',
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
    category: 'capture',
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
    category: 'capture',
    titleTemplate: 'Capture Réussie !',
    messageTemplate: '{{pokemonName}} (Niv.{{level}}) capturé à {{location}} !',
    icon: '⚡',
    persistent: false,
    autoHideDelay: 4000,
    sound: 'capture_normal',
    animation: 'slide'
  },
  
  perfect_capture: {
    type: 'perfect',
    priority: 'high',
    category: 'capture',
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
    category: 'shiny',
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
    category: 'shiny',
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
    category: 'milestone',
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
    category: 'milestone',
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
    category: 'milestone',
    titleTemplate: 'Pokédex Complet !',
    messageTemplate: '👑 Félicitations ! Vous avez complété le Pokédex de {{region}} !',
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
    category: 'streak',
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
    category: 'streak',
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
    category: 'streak',
    titleTemplate: 'Série Interrompue',
    messageTemplate: '💔 Votre série de {{count}} jours s\'arrête. Recommencez demain !',
    icon: '💔',
    persistent: false,
    autoHideDelay: 5000,
    sound: 'streak_broken',
    animation: 'fade'
  },
  
  // === ACHIEVEMENTS ===
  achievement_unlock: {
    type: 'achievement',
    priority: 'high',
    category: 'achievement',
    titleTemplate: 'Accomplissement Débloqué !',
    messageTemplate: '🏅 {{name}} : {{description}}',
    icon: '🏅',
    persistent: true,
    autoHideDelay: 8000,
    sound: 'achievement_unlock',
    animation: 'badge'
  }
};

// ===== SERVICE NOTIFICATIONS OPTIMISÉ =====

export class PokedexNotificationService extends EventEmitter {
  private static instance: PokedexNotificationService;
  
  // File des notifications par joueur avec limite
  private playerNotifications = new Map<string, PokedexNotification[]>();
  
  // Cache des notifications récentes pour éviter les doublons
  private recentNotificationsCache = new Map<string, Set<string>>();
  
  // Paramètres de notification par joueur avec cache
  private playerSettingsCache = new Map<string, { settings: NotificationSettings; timestamp: number }>();
  
  // Configuration du service
  private config = {
    maxNotificationsPerPlayer: 100,
    cacheExpiry: 10 * 60 * 1000, // 10 minutes
    duplicateWindow: 5 * 60 * 1000, // 5 minutes pour détecter les doublons
    batchSize: 50,
    enableValidation: true,
    enableCompression: true
  };
  
  // Statistiques du service
  private serviceStats = {
    notificationsCreated: 0,
    notificationsSent: 0,
    duplicatesBlocked: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  constructor() {
    super();
    this.initializeService();
    console.log('🔔 [PokedexNotificationService] Service de notifications Pokédex initialisé');
  }
  
  // Singleton pattern
  static getInstance(): PokedexNotificationService {
    if (!PokedexNotificationService.instance) {
      PokedexNotificationService.instance = new PokedexNotificationService();
    }
    return PokedexNotificationService.instance;
  }
  
  private initializeService(): void {
    // Nettoyage périodique
    setInterval(() => this.cleanupExpiredData(), this.config.cacheExpiry);
    
    // Monitoring des performances
    this.on('notificationCreated', () => this.serviceStats.notificationsCreated++);
    this.on('notificationSent', () => this.serviceStats.notificationsSent++);
    this.on('duplicateBlocked', () => this.serviceStats.duplicatesBlocked++);
    this.on('error', () => this.serviceStats.errors++);
  }
  
  // ===== API PUBLIQUE SIMPLE =====
  
  /**
   * API simple : Créer une notification rapide
   */
  async quickNotify(
    playerId: string,
    type: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> {
    try {
      const notification = await this.createCustomNotification(playerId, {
        type,
        title,
        message,
        priority,
        icon: this.getDefaultIconForType(type),
        data: {}
      });
      return notification !== null;
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] quickNotify failed:`, error);
      return false;
    }
  }
  
  /**
   * API simple : Marquer toutes les notifications comme lues
   */
  async markAllRead(playerId: string): Promise<number> {
    try {
      return this.markAllAsRead(playerId);
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] markAllRead failed:`, error);
      return 0;
    }
  }
  
  // ===== GÉNÉRATION DE NOTIFICATIONS SÉCURISÉE =====
  
  /**
   * Crée une notification de découverte avec validation
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
  ): Promise<PokedexNotification | null> {
    try {
      // Validation des paramètres
      if (!this.validatePlayerId(playerId) || !this.validatePokemonData(data)) {
        return null;
      }
      
      // Vérifier les paramètres utilisateur
      if (!await this.shouldSendNotification(playerId, 'discovery')) {
        return null;
      }
      
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
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur createDiscoveryNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification de capture avec validation
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
  ): Promise<PokedexNotification | null> {
    try {
      // Validation des paramètres
      if (!this.validatePlayerId(playerId) || !this.validatePokemonData(data)) {
        return null;
      }
      
      if (!await this.shouldSendNotification(playerId, 'capture')) {
        return null;
      }
      
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
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur createCaptureNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification shiny avec priorité élevée
   */
  async createShinyNotification(
    playerId: string,
    data: {
      pokemonId: number;
      pokemonName: string;
      action: 'discovered' | 'captured';
      location?: string;
    }
  ): Promise<PokedexNotification | null> {
    try {
      if (!this.validatePlayerId(playerId) || !await this.shouldSendNotification(playerId, 'shiny')) {
        return null;
      }
      
      const templateKey = data.action === 'captured' ? 'shiny_captured' : 'shiny_discovery';
      
      const notification = await this.buildNotification(playerId, templateKey, {
        pokemonId: data.pokemonId,
        pokemonName: data.pokemonName,
        location: data.location
      });
      
      if (notification) {
        // Shiny a toujours la priorité maximale
        notification.priority = 'critical';
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur createShinyNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification de milestone avec calculs
   */
  async createMilestoneNotification(
    playerId: string,
    data: {
      type: 'discovery' | 'capture' | 'complete';
      current: number;
      target: number;
      region?: string;
      reward?: string;
    }
  ): Promise<PokedexNotification | null> {
    try {
      if (!this.validatePlayerId(playerId) || !await this.shouldSendNotification(playerId, 'milestone')) {
        return null;
      }
      
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
          target: data.target,
          reward: data.reward
        },
        region: data.region || 'Kanto',
        current: data.current,
        target: data.target
      });
      
      if (notification) {
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur createMilestoneNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification de streak avec logique avancée
   */
  async createStreakNotification(
    playerId: string,
    data: {
      type: 'discovery' | 'capture';
      action: 'continue' | 'broken' | 'record';
      count: number;
      isNewRecord?: boolean;
    }
  ): Promise<PokedexNotification | null> {
    try {
      if (!this.validatePlayerId(playerId) || !await this.shouldSendNotification(playerId, 'streak')) {
        return null;
      }
      
      let templateKey = 'streak_discovery';
      if (data.action === 'broken') {
        templateKey = 'streak_broken';
      } else if (data.type === 'capture') {
        templateKey = 'streak_capture';
      }
      
      const notification = await this.buildNotification(playerId, templateKey, {
        streak: {
          type: data.type,
          count: data.count,
          isRecord: data.isNewRecord
        },
        count: data.count
      });
      
      if (notification) {
        // Nouveau record = priorité élevée
        if (data.isNewRecord) {
          notification.priority = 'high';
        }
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur createStreakNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification d'accomplissement
   */
  async createAchievementNotification(
    playerId: string,
    data: {
      name: string;
      description: string;
      reward: string;
      category: string;
      rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    }
  ): Promise<PokedexNotification | null> {
    try {
      if (!this.validatePlayerId(playerId) || !await this.shouldSendNotification(playerId, 'achievement')) {
        return null;
      }
      
      const notification = await this.buildNotification(playerId, 'achievement_unlock', {
        achievement: {
          name: data.name,
          description: data.description,
          reward: data.reward,
          rarity: data.rarity || 'common'
        },
        name: data.name,
        description: data.description
      });
      
      if (notification) {
        // Ajuster la priorité selon la rareté
        switch (data.rarity) {
          case 'legendary':
            notification.priority = 'critical';
            break;
          case 'epic':
            notification.priority = 'high';
            break;
          case 'rare':
            notification.priority = 'medium';
            break;
          default:
            notification.priority = 'low';
        }
        
        await this.queueNotification(notification);
      }
      
      return notification;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur createAchievementNotification:`, error);
      return null;
    }
  }
  
  /**
   * Crée une notification personnalisée
   */
  async createCustomNotification(
    playerId: string,
    data: {
      type: string;
      title: string;
      message: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      icon: string;
      data: any;
      persistent?: boolean;
      autoHideDelay?: number;
    }
  ): Promise<PokedexNotification | null> {
    try {
      if (!this.validatePlayerId(playerId)) {
        return null;
      }
      
      const notification: PokedexNotification = {
        id: this.generateNotificationId(),
        playerId,
        type: data.type as any,
        priority: data.priority,
        title: this.sanitizeText(data.title),
        message: this.sanitizeText(data.message),
        icon: data.icon,
        data: data.data,
        timestamp: new Date(),
        read: false,
        persistent: data.persistent ?? true,
        autoHideDelay: data.autoHideDelay,
        category: 'custom'
      };
      
      await this.queueNotification(notification);
      return notification;
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur createCustomNotification:`, error);
      return null;
    }
  }
  
  // ===== CONSTRUCTION & ENVOI OPTIMISÉS =====
  
  /**
   * Construit une notification depuis un template avec sécurité
   */
  private async buildNotification(
    playerId: string,
    templateKey: string,
    data: any
  ): Promise<PokedexNotification | null> {
    const template = NOTIFICATION_TEMPLATES[templateKey];
    if (!template) {
      console.error(`❌ Template notification "${templateKey}" introuvable`);
      return null;
    }
    
    try {
      // Interpolation sécurisée des templates
      const title = this.interpolateTemplate(template.titleTemplate, data);
      const message = this.interpolateTemplate(template.messageTemplate, data);
      
      // Vérification des heures silencieuses
      const settings = await this.getPlayerSettings(playerId);
      if (this.isQuietTime(settings)) {
        // Pendant les heures silencieuses, réduire la priorité
        template.priority = 'low';
        template.persistent = false;
      }
      
      const notification: PokedexNotification = {
        id: this.generateNotificationId(),
        playerId,
        type: template.type as any,
        priority: template.priority,
        title: this.sanitizeText(title),
        message: this.sanitizeText(message),
        icon: template.icon,
        category: template.category,
        data: {
          ...data,
          sound: settings.soundEnabled ? template.sound : undefined,
          animation: settings.animationsEnabled ? template.animation : undefined
        },
        timestamp: new Date(),
        read: false,
        persistent: template.persistent,
        autoHideDelay: template.autoHideDelay,
        sound: settings.soundEnabled ? template.sound : undefined,
        animation: settings.animationsEnabled ? template.animation : undefined,
        actions: template.actions
      };
      
      return notification;
      
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur buildNotification:`, error);
      return null;
    }
  }
  
  /**
   * Interpole un template avec protection XSS
   */
  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      const keys = key.split('.');
      let value = data;
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      // Sanitisation de la valeur
      if (value !== null && value !== undefined) {
        return this.sanitizeText(value.toString());
      }
      
      return match;
    });
  }
  
  /**
   * Ajoute une notification à la file avec protection contre les doublons
   */
  private async queueNotification(notification: PokedexNotification): Promise<void> {
    try {
      // Vérifier les doublons récents
      const cacheKey = this.getNotificationCacheKey(notification);
      const playerCache = this.recentNotificationsCache.get(notification.playerId) || new Set();
      
      if (playerCache.has(cacheKey)) {
        console.log(`⏭️ [PokedexNotificationService] Notification dupliquée ignorée: ${cacheKey}`);
        this.emit('duplicateBlocked');
        return;
      }
      
      // Ajouter au cache de doublons
      playerCache.add(cacheKey);
      this.recentNotificationsCache.set(notification.playerId, playerCache);
      
      // Nettoyer le cache après la fenêtre de détection
      setTimeout(() => {
        playerCache.delete(cacheKey);
      }, this.config.duplicateWindow);
      
      // Ajouter à la file du joueur
      let playerQueue = this.playerNotifications.get(notification.playerId) || [];
      playerQueue.push(notification);
      
      // Limiter le nombre de notifications
      if (playerQueue.length > this.config.maxNotificationsPerPlayer) {
        // Supprimer les plus anciennes non persistantes
        const nonPersistent = playerQueue.filter(n => !n.persistent);
        if (nonPersistent.length > 0) {
          const toRemove = nonPersistent.slice(0, playerQueue.length - this.config.maxNotificationsPerPlayer + 1);
          playerQueue = playerQueue.filter(n => !toRemove.includes(n));
        } else {
          // Si toutes sont persistantes, supprimer les plus anciennes
          playerQueue = playerQueue.slice(-(this.config.maxNotificationsPerPlayer - 1));
        }
      }
      
      this.playerNotifications.set(notification.playerId, playerQueue);
      
      // Émettre les événements
      this.emit('notificationCreated', notification);
      this.emit('notificationSent', notification);
      
      // Log sécurisé
      console.log(`🔔 [PokedexNotificationService] Notification ${notification.type} pour ${notification.playerId}: ${notification.title}`);
      
      // Auto-suppression si configurée
      if (!notification.persistent && notification.autoHideDelay) {
        setTimeout(() => {
          this.markAsRead(notification.playerId, notification.id);
        }, notification.autoHideDelay);
      }
      
    } catch (error) {
      this.emit('error', error);
      console.error(`❌ [PokedexNotificationService] Erreur queueNotification:`, error);
    }
  }
  
  // ===== GESTION DES NOTIFICATIONS =====
  
  /**
   * Récupère les notifications d'un joueur avec filtres
   */
  getPlayerNotifications(
    playerId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      types?: string[];
      categories?: string[];
      priorities?: string[];
      sinceDate?: Date;
    } = {}
  ): PokedexNotification[] {
    try {
      if (!this.validatePlayerId(playerId)) {
        return [];
      }
      
      const allNotifications = this.playerNotifications.get(playerId) || [];
      let filtered = allNotifications;
      
      // Appliquer les filtres
      if (options.unreadOnly) {
        filtered = filtered.filter(n => !n.read);
      }
      
      if (options.types?.length) {
        filtered = filtered.filter(n => options.types!.includes(n.type));
      }
      
      if (options.categories?.length) {
        filtered = filtered.filter(n => options.categories!.includes(n.category));
      }
      
      if (options.priorities?.length) {
        filtered = filtered.filter(n => options.priorities!.includes(n.priority));
      }
      
      if (options.sinceDate) {
        filtered = filtered.filter(n => n.timestamp >= options.sinceDate!);
      }
      
      // Trier par priorité puis date
      filtered.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
      
      // Limiter le nombre
      if (options.limit && options.limit > 0) {
        filtered = filtered.slice(0, Math.min(options.limit, 200)); // Limite de sécurité
      }
      
      return filtered;
      
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur getPlayerNotifications:`, error);
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
      
      const notifications = this.playerNotifications.get(playerId) || [];
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification && !notification.read) {
        notification.read = true;
        this.emit('notificationRead', { playerId, notificationId, notification });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur markAsRead:`, error);
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
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur markAllAsRead:`, error);
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
      
      const notifications = this.playerNotifications.get(playerId) || [];
      const index = notifications.findIndex(n => n.id === notificationId);
      
      if (index !== -1) {
        const removed = notifications.splice(index, 1)[0];
        this.emit('notificationRemoved', { playerId, notificationId, notification: removed });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur removeNotification:`, error);
      return false;
    }
  }
  
  /**
   * Nettoie les anciennes notifications
   */
  cleanupOldNotifications(playerId: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    try {
      if (!this.validatePlayerId(playerId)) {
        return 0;
      }
      
      const notifications = this.playerNotifications.get(playerId) || [];
      const cutoff = new Date(Date.now() - maxAge);
      
      const before = notifications.length;
      const filtered = notifications.filter(n => 
        n.timestamp > cutoff || (n.persistent && !n.read)
      );
      
      if (filtered.length !== before) {
        this.playerNotifications.set(playerId, filtered);
        const removed = before - filtered.length;
        this.emit('notificationsCleanedUp', { playerId, removed });
        return removed;
      }
      
      return 0;
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur cleanupOldNotifications:`, error);
      return 0;
    }
  }
  
  // ===== PARAMÈTRES JOUEUR =====
  
  /**
   * Met à jour les paramètres de notification d'un joueur
   */
  updatePlayerSettings(playerId: string, settings: Partial<NotificationSettings>): void {
    try {
      if (!this.validatePlayerId(playerId)) {
        return;
      }
      
      const currentSettings = this.getPlayerSettings(playerId);
      const newSettings = { ...currentSettings, ...settings };
      
      // Validation des paramètres
      if (settings.quietHours) {
        if (!this.validateTimeFormat(settings.quietHours.start) || 
            !this.validateTimeFormat(settings.quietHours.end)) {
          console.error('Format d\'heure invalide pour quietHours');
          return;
        }
      }
      
      this.playerSettingsCache.set(playerId, { 
        settings: newSettings, 
        timestamp: Date.now() 
      });
      
      this.emit('settingsUpdated', { playerId, settings: newSettings });
      console.log(`⚙️ [PokedexNotificationService] Paramètres mis à jour pour ${playerId}`);
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur updatePlayerSettings:`, error);
    }
  }
  
  /**
   * Récupère les paramètres d'un joueur avec cache
   */
  getPlayerSettings(playerId: string): NotificationSettings {
    try {
      if (!this.validatePlayerId(playerId)) {
        return this.getDefaultSettings();
      }
      
      const cached = this.playerSettingsCache.get(playerId);
      if (cached && (Date.now() - cached.timestamp) < this.config.cacheExpiry) {
        this.serviceStats.cacheHits++;
        return cached.settings;
      }
      
      this.serviceStats.cacheMisses++;
      const defaultSettings = this.getDefaultSettings();
      this.playerSettingsCache.set(playerId, { 
        settings: defaultSettings, 
        timestamp: Date.now() 
      });
      
      return defaultSettings;
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur getPlayerSettings:`, error);
      return this.getDefaultSettings();
    }
  }
  
  /**
   * Paramètres par défaut sécurisés
   */
  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      discoveryNotifications: true,
      captureNotifications: true,
      shinyNotifications: true,
      milestoneNotifications: true,
      streakNotifications: true,
      achievementNotifications: true,
      soundEnabled: true,
      animationsEnabled: true,
      vibrationEnabled: true,
      emailNotifications: false,
      pushNotifications: true,
      minimumPriority: 'low',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      typeFilters: []
    };
  }
  
  // ===== UTILITAIRES PRIVÉES =====
  
  /**
   * Vérifie si on doit envoyer une notification
   */
  private async shouldSendNotification(playerId: string, type: string): Promise<boolean> {
    const settings = this.getPlayerSettings(playerId);
    
    if (!settings.enabled) return false;
    
    // Vérifier le type spécifique
    switch (type) {
      case 'discovery': return settings.discoveryNotifications;
      case 'capture': return settings.captureNotifications;
      case 'shiny': return settings.shinyNotifications;
      case 'milestone': return settings.milestoneNotifications;
      case 'streak': return settings.streakNotifications;
      case 'achievement': return settings.achievementNotifications;
      default: return true;
    }
  }
  
  /**
   * Vérifie si on est en heures silencieuses
   */
  private isQuietTime(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quietHours.start;
    const end = settings.quietHours.end;
    
    // Gestion du cas où les heures silencieuses traversent minuit
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }
  
  /**
   * Valide un ID de joueur
   */
  private validatePlayerId(playerId: string): boolean {
    return typeof playerId === 'string' && 
           playerId.trim().length > 0 && 
           playerId.length <= 100;
  }
  
  /**
   * Valide les données Pokémon
   */
  private validatePokemonData(data: any): boolean {
    return data && 
           typeof data.pokemonId === 'number' && 
           data.pokemonId > 0 && 
           data.pokemonId <= 2000 &&
           typeof data.pokemonName === 'string' &&
           data.pokemonName.trim().length > 0;
  }
  
  /**
   * Valide le format d'heure (HH:MM)
   */
  private validateTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  }
  
  /**
   * Sanitise le texte pour éviter les injections
   */
  private sanitizeText(text: string): string {
    if (typeof text !== 'string') return '';
    
    return text
      .replace(/[<>]/g, '') // Supprimer les caractères HTML dangereux
      .replace(/javascript:/gi, '') // Supprimer javascript:
      .trim()
      .substring(0, 500); // Limiter la longueur
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
  private getNotificationCacheKey(notification: PokedexNotification): string {
    const data = notification.data;
    const timeWindow = Math.floor(notification.timestamp.getTime() / 60000); // Fenêtre de 1 minute
    return `${notification.type}_${data?.pokemonId || 'unknown'}_${timeWindow}`;
  }
  
  /**
   * Récupère l'icône par défaut pour un type
   */
  private getDefaultIconForType(type: string): string {
    const icons: { [key: string]: string } = {
      discovery: '🔍',
      capture: '⚡',
      shiny: '✨',
      milestone: '🏆',
      streak: '🔥',
      achievement: '🏅',
      evolution: '🌟',
      rare: '⭐',
      perfect: '🎯'
    };
    
    return icons[type] || '📝';
  }
  
  /**
   * Nettoie les données expirées
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    
    // Nettoyage du cache des paramètres
    for (const [playerId, cached] of this.playerSettingsCache.entries()) {
      if ((now - cached.timestamp) > this.config.cacheExpiry) {
        this.playerSettingsCache.delete(playerId);
      }
    }
    
    // Nettoyage du cache de doublons
    for (const [playerId, cache] of this.recentNotificationsCache.entries()) {
      if (cache.size === 0) {
        this.recentNotificationsCache.delete(playerId);
      }
    }
    
    console.log(`🧹 [PokedexNotificationService] Nettoyage effectué - Settings: ${this.playerSettingsCache.size}, Cache: ${this.recentNotificationsCache.size}`);
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
    byCategory: { [category: string]: number };
    last24h: number;
    thisWeek: number;
  } {
    try {
      if (!this.validatePlayerId(playerId)) {
        return this.getEmptyStats();
      }
      
      const notifications = this.playerNotifications.get(playerId) || [];
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as { [type: string]: number },
        byPriority: {} as { [priority: string]: number },
        byCategory: {} as { [category: string]: number },
        last24h: notifications.filter(n => n.timestamp > last24h).length,
        thisWeek: notifications.filter(n => n.timestamp > thisWeek).length
      };
      
      notifications.forEach(n => {
        stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
        stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
        stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur getNotificationStats:`, error);
      return this.getEmptyStats();
    }
  }
  
  private getEmptyStats() {
    return {
      total: 0,
      unread: 0,
      byType: {},
      byPriority: {},
      byCategory: {},
      last24h: 0,
      thisWeek: 0
    };
  }
  
  /**
   * Récupère les statistiques du service
   */
  getServiceStats(): any {
    return {
      ...this.serviceStats,
      cacheSize: {
        notifications: Array.from(this.playerNotifications.values()).reduce((sum, arr) => sum + arr.length, 0),
        settings: this.playerSettingsCache.size,
        duplicateCache: Array.from(this.recentNotificationsCache.values()).reduce((sum, set) => sum + set.size, 0)
      },
      config: this.config
    };
  }
  
  /**
   * Nettoie toutes les données d'un joueur
   */
  clearPlayerData(playerId: string): void {
    try {
      if (!this.validatePlayerId(playerId)) {
        return;
      }
      
      this.playerNotifications.delete(playerId);
      this.playerSettingsCache.delete(playerId);
      this.recentNotificationsCache.delete(playerId);
      
      this.emit('playerDataCleared', { playerId });
      console.log(`🗑️ [PokedexNotificationService] Données supprimées pour ${playerId}`);
    } catch (error) {
      console.error(`❌ [PokedexNotificationService] Erreur clearPlayerData:`, error);
    }
  }
  
  /**
   * Met à jour la configuration du service
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [PokedexNotificationService] Configuration mise à jour:', newConfig);
  }
}

// ===== EXPORT SINGLETON =====
export const pokedexNotificationService = PokedexNotificationService.getInstance();
export default pokedexNotificationService;
