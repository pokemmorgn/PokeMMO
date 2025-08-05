// server/src/config/TeleportConfig.ts
import fs from "fs";
import path from "path";
import { getDbZoneName } from "./ZoneMapping"; // ✅ IMPORT DU MAPPING

export interface ValidationContext {
  playerName: string;
  playerLevel: number;
  currentZone: string;
  targetZone: string;
  playerX: number;
  playerY: number;
  hasVipAccess: boolean;
  completedQuests: string[];
  inventory: string[];
  badges: string[];
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface TransitionRule {
  id: string;
  name: string;
  description: string;
  fromZone: string;
  toZone: string;
  conditions: {
    minLevel?: number;
    maxLevel?: number;
    requiredQuests?: string[];
    requiredItems?: string[];
    requiredBadges?: string[];
    vipOnly?: boolean;
    proximityCheck?: {
      enabled: boolean;
      maxDistance?: number;
    };
    timeRestrictions?: {
      enabled: boolean;
      allowedHours?: number[];
      allowedDays?: number[];
    };
    cooldown?: {
      enabled: boolean;
      durationMinutes?: number;
    };
  };
  message?: {
    success?: string;
    failure?: string;
  };
  enabled: boolean;
}

export interface TeleportConfigData {
  version: string;
  lastUpdated: string;
  globalSettings: {
    enableValidation: boolean;
    enableProximityCheck: boolean;
    enableCooldowns: boolean;
    defaultCooldownMinutes: number;
    enableLevelRestrictions: boolean;
    enableVipRestrictions: boolean;
    logTransitions: boolean;
  };
  zones: {
    [zoneName: string]: {
      name: string;
      displayName: string;
      minLevel?: number;
      maxLevel?: number;
      vipOnly?: boolean;
      description?: string;
    };
  };
  rules: TransitionRule[];
  emergencyOverride: {
    enabled: boolean;
    allowAllTransitions: boolean;
    reason?: string;
  };
}

export class TeleportConfig {
  private config: TeleportConfigData;
  private playerCooldowns: Map<string, Map<string, number>> = new Map();

  constructor() {
    this.config = this.loadConfig();
    console.log(`🔧 [TeleportConfig] Configuration chargée: ${this.config.rules.length} règles`);
  }

  // ✅ CHARGEMENT DE LA CONFIGURATION
  private loadConfig(): TeleportConfigData {
    try {
      const configPath = path.join(__dirname, "./teleportConfig.json");
      
      if (!fs.existsSync(configPath)) {
        console.warn(`⚠️ [TeleportConfig] Fichier de config non trouvé, création avec valeurs par défaut`);
        const defaultConfig = this.createDefaultConfig();
        this.saveConfig(defaultConfig);
        return defaultConfig;
      }

      const rawData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(rawData);
      
      console.log(`✅ [TeleportConfig] Configuration chargée depuis ${configPath}`);
      return config;
      
    } catch (error) {
      console.error(`❌ [TeleportConfig] Erreur lors du chargement:`, error);
      return this.createDefaultConfig();
    }
  }

  // ✅ SAUVEGARDE DE LA CONFIGURATION
  private saveConfig(config: TeleportConfigData): void {
    try {
      const configPath = path.join(__dirname, "./teleportConfig.json");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`✅ [TeleportConfig] Configuration sauvegardée`);
    } catch (error) {
      console.error(`❌ [TeleportConfig] Erreur lors de la sauvegarde:`, error);
    }
  }

  // ✅ CRÉATION DE LA CONFIGURATION PAR DÉFAUT AVEC NOMS CLIENT ET DB
  private createDefaultConfig(): TeleportConfigData {
    return {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      globalSettings: {
        enableValidation: true,
        enableProximityCheck: true,
        enableCooldowns: false,
        defaultCooldownMinutes: 1,
        enableLevelRestrictions: true,
        enableVipRestrictions: false,
        logTransitions: true
      },
      zones: {
        // ✅ UTILISER LES NOMS DB DANS LA CONFIG (cohérent avec les fichiers .tmj)
        beach: {
          name: "beach",
          displayName: "Plage de départ",
          minLevel: 1,
          description: "Zone de départ pour les nouveaux dresseurs"
        },
        village: {
          name: "village",
          displayName: "Village Pokémon",
          minLevel: 1,
          description: "Centre du village avec Centre Pokémon"
        },
        villagelab: {
          name: "villagelab",
          displayName: "Laboratoire du Professeur",
          minLevel: 1,
          description: "Laboratoire de recherche Pokémon"
        },
        villagehouse1: {
          name: "villagehouse1",
          displayName: "Maison du village",
          minLevel: 1,
          description: "Maison d'habitant du village"
        },
        villageflorist: {
          name: "villageflorist",
          displayName: "Fleuriste du village",
          minLevel: 1,
          description: "Boutique de fleurs du village"
        },
        road1: {
          name: "road1",
          displayName: "Route 1",
          minLevel: 5,
          description: "Première route sauvage"
        },
        road1house: {
          name: "road1house",
          displayName: "Maison Route 1",
          minLevel: 5,
          description: "Maison isolée sur la Route 1"
        },
        road1hidden: {
          name: "road1hidden",
          displayName: "Zone cachée Route 1",
          minLevel: 10,
          description: "Zone secrète de la Route 1"
        },
        road3: {
          name: "road3",
          displayName: "Route 3",
          minLevel: 15,
          description: "Route vers les montagnes"
        },
        lavandia: {
          name: "lavandia",
          displayName: "Ville de Lavandia",
          minLevel: 15,
          vipOnly: false,
          description: "Ville mystérieuse aux tours fantômes"
        },
        // ✅ AJOUT DES NOUVELLES ZONES LAVANDIA
        lavandiaanalysis: {
          name: "lavandiaanalysis",
          displayName: "Centre d'Analyse Lavandia",
          minLevel: 15,
          description: "Centre d'analyse Pokémon de Lavandia"
        },
        lavandiacelebitemple: {
          name: "lavandiacelebitemple",
          displayName: "Temple de Celebi",
          minLevel: 25,
          vipOnly: true,
          description: "Temple mystique dédié à Celebi"
        },
        lavandiaequipment: {
          name: "lavandiaequipment",
          displayName: "Magasin d'Équipement",
          minLevel: 15,
          description: "Boutique d'équipement de Lavandia"
        },
        lavandiafurniture: {
          name: "lavandiafurniture",
          displayName: "Magasin de Meubles",
          minLevel: 15,
          description: "Boutique de meubles de Lavandia"
        },
        lavandiahealingcenter: {
          name: "lavandiahealingcenter",
          displayName: "Centre de Soins",
          minLevel: 15,
          description: "Centre Pokémon de Lavandia"
        },
        lavandiashop: {
          name: "lavandiashop",
          displayName: "Magasin Lavandia",
          minLevel: 15,
          description: "Magasin général de Lavandia"
        },
        // Maisons de Lavandia
        lavandiahouse1: { name: "lavandiahouse1", displayName: "Maison Lavandia 1", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse2: { name: "lavandiahouse2", displayName: "Maison Lavandia 2", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse3: { name: "lavandiahouse3", displayName: "Maison Lavandia 3", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse4: { name: "lavandiahouse4", displayName: "Maison Lavandia 4", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse5: { name: "lavandiahouse5", displayName: "Maison Lavandia 5", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse6: { name: "lavandiahouse6", displayName: "Maison Lavandia 6", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse7: { name: "lavandiahouse7", displayName: "Maison Lavandia 7", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse8: { name: "lavandiahouse8", displayName: "Maison Lavandia 8", minLevel: 15, description: "Résidence de Lavandia" },
        lavandiahouse9: { name: "lavandiahouse9", displayName: "Maison Lavandia 9", minLevel: 15, description: "Résidence de Lavandia" },
        // Grottes
        noctherbcave1: {
          name: "noctherbcave1",
          displayName: "Grotte Noctherb 1",
          minLevel: 20,
          description: "Première partie de la grotte Noctherb"
        },
        noctherbcave2: {
          name: "noctherbcave2",
          displayName: "Grotte Noctherb 2",
          minLevel: 25,
          description: "Profondeurs de la grotte Noctherb"
        },
        wraithmoor: {
          name: "wraithmoor",
          displayName: "Lande des Esprits",
          minLevel: 30,
          vipOnly: true,
          description: "Terre maudite hantée par les esprits"
        }
      },
      rules: [
        // ✅ RÈGLES AVEC NOMS DB (cohérent avec les fichiers)
        
        // Beach ↔ Village (libre)
        {
          id: "beach_to_village",
          name: "Plage vers Village",
          description: "Transition libre entre la plage et le village",
          fromZone: "beach",
          toZone: "village",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        {
          id: "village_to_beach",
          name: "Village vers Plage",
          description: "Retour libre vers la plage",
          fromZone: "village",
          toZone: "beach",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Village ↔ Lab (libre)
        {
          id: "village_to_lab",
          name: "Village vers Laboratoire",
          description: "Accès libre au laboratoire",
          fromZone: "village",
          toZone: "villagelab",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        {
          id: "lab_to_village",
          name: "Laboratoire vers Village",
          description: "Retour libre vers le village",
          fromZone: "villagelab",
          toZone: "village",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Village ↔ House1 (libre)
        {
          id: "village_to_house1",
          name: "Village vers Maison",
          description: "Accès libre à la maison",
          fromZone: "village",
          toZone: "villagehouse1",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        {
          id: "house1_to_village",
          name: "Maison vers Village",
          description: "Sortie libre de la maison",
          fromZone: "villagehouse1",
          toZone: "village",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Village ↔ Florist (libre)
        {
          id: "village_to_florist",
          name: "Village vers Fleuriste",
          description: "Accès libre au fleuriste",
          fromZone: "village",
          toZone: "villageflorist",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        {
          id: "florist_to_village",
          name: "Fleuriste vers Village",
          description: "Sortie libre du fleuriste",
          fromZone: "villageflorist",
          toZone: "village",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Village ↔ Road1 (niveau 5+)
        {
          id: "village_to_road1",
          name: "Village vers Route 1",
          description: "Accès à la première route sauvage",
          fromZone: "village",
          toZone: "road1",
          conditions: {
            minLevel: 5,
            proximityCheck: { enabled: true }
          },
          message: {
            failure: "Vous devez être niveau 5+ pour accéder à la Route 1"
          },
          enabled: true
        },
        {
          id: "road1_to_village",
          name: "Route 1 vers Village",
          description: "Retour libre vers le village",
          fromZone: "road1",
          toZone: "village",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Road1 ↔ Road1House
        {
          id: "road1_to_road1house",
          name: "Route 1 vers Maison",
          description: "Accès à la maison de la Route 1",
          fromZone: "road1",
          toZone: "road1house",
          conditions: {
            minLevel: 5,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        {
          id: "road1house_to_road1",
          name: "Maison vers Route 1",
          description: "Sortie de la maison vers la Route 1",
          fromZone: "road1house",
          toZone: "road1",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Road1 ↔ Road1Hidden (niveau 10+)
        {
          id: "road1_to_road1hidden",
          name: "Route 1 vers Zone Cachée",
          description: "Accès à la zone secrète",
          fromZone: "road1",
          toZone: "road1hidden",
          conditions: {
            minLevel: 10,
            proximityCheck: { enabled: true }
          },
          message: {
            failure: "Vous devez être niveau 10+ pour accéder à cette zone secrète"
          },
          enabled: true
        },
        {
          id: "road1hidden_to_road1",
          name: "Zone Cachée vers Route 1",
          description: "Retour vers la Route 1",
          fromZone: "road1hidden",
          toZone: "road1",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Road1 ↔ Road3 (niveau 15+)
        {
          id: "road1_to_road3",
          name: "Route 1 vers Route 3",
          description: "Accès à la Route 3",
          fromZone: "road1",
          toZone: "road3",
          conditions: {
            minLevel: 15,
            proximityCheck: { enabled: true }
          },
          message: {
            failure: "Vous devez être niveau 15+ pour accéder à la Route 3"
          },
          enabled: true
        },
        {
          id: "road3_to_road1",
          name: "Route 3 vers Route 1",
          description: "Retour vers la Route 1",
          fromZone: "road3",
          toZone: "road1",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Road3 ↔ Lavandia (niveau 15+ avec quête)
        {
          id: "road3_to_lavandia",
          name: "Route 3 vers Lavandia",
          description: "Accès à Lavandia pour les dresseurs expérimentés",
          fromZone: "road3",
          toZone: "lavandia",
          conditions: {
            minLevel: 15,
            requiredQuests: ["starter_quest"],
            proximityCheck: { enabled: true },
            cooldown: { enabled: true, durationMinutes: 2 }
          },
          message: {
            failure: "Vous devez être niveau 15+ et avoir terminé la quête starter pour accéder à Lavandia"
          },
          enabled: true
        },
        {
          id: "lavandia_to_road3",
          name: "Lavandia vers Route 3",
          description: "Retour vers la Route 3",
          fromZone: "lavandia",
          toZone: "road3",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // ✅ RÈGLES POUR TOUTES LES ZONES DE LAVANDIA (générique - accès libre depuis Lavandia)
        
        // Lavandia vers ses bâtiments
        {
          id: "lavandia_to_buildings",
          name: "Lavandia vers Bâtiments",
          description: "Accès libre aux bâtiments de Lavandia",
          fromZone: "lavandia",
          toZone: "*", // Wildcard pour tous les bâtiments lavandia*
          conditions: {
            minLevel: 15,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // Bâtiments vers Lavandia
        {
          id: "buildings_to_lavandia",
          name: "Bâtiments vers Lavandia",
          description: "Retour libre vers Lavandia",
          fromZone: "*", // Wildcard pour tous les bâtiments lavandia*
          toZone: "lavandia",
          conditions: {
            minLevel: 1,
            proximityCheck: { enabled: true }
          },
          enabled: true
        },
        
        // ✅ RÈGLES SPÉCIALES POUR LES ZONES À RESTRICTIONS
        
        // Temple de Celebi (VIP + niveau 25+)
        {
          id: "lavandia_to_celebitemple",
          name: "Lavandia vers Temple de Celebi",
          description: "Accès VIP au temple mystique",
          fromZone: "lavandia",
          toZone: "lavandiacelebitemple",
          conditions: {
            minLevel: 25,
            vipOnly: true,
            proximityCheck: { enabled: true }
          },
          message: {
            failure: "Accès VIP requis et niveau 25+ pour entrer dans le Temple de Celebi"
          },
          enabled: true
        },
        
        // Grottes Noctherb
        {
          id: "lavandia_to_noctherbcave1",
          name: "Lavandia vers Grotte Noctherb 1",
          description: "Exploration des grottes",
          fromZone: "lavandia",
          toZone: "noctherbcave1",
          conditions: {
            minLevel: 20,
            proximityCheck: { enabled: true }
          },
          message: {
            failure: "Vous devez être niveau 20+ pour explorer les grottes"
          },
          enabled: true
        },
        {
          id: "noctherbcave1_to_noctherbcave2",
          name: "Grotte 1 vers Grotte 2",
          description: "Descente vers les profondeurs",
          fromZone: "noctherbcave1",
          toZone: "noctherbcave2",
          conditions: {
            minLevel: 25,
            proximityCheck: { enabled: true }
          },
          message: {
            failure: "Vous devez être niveau 25+ pour descendre plus profondément"
          },
          enabled: true
        },
        
        // Wraithmoor (zone ultra-difficile)
        {
          id: "noctherbcave2_to_wraithmoor",
          name: "Grotte 2 vers Lande des Esprits",
          description: "Accès à la zone la plus dangereuse",
          fromZone: "noctherbcave2",
          toZone: "wraithmoor",
          conditions: {
            minLevel: 30,
            vipOnly: true,
            requiredBadges: ["ghost_badge"],
            proximityCheck: { enabled: true },
            cooldown: { enabled: true, durationMinutes: 5 }
          },
          message: {
            failure: "Zone ultra-dangereuse : niveau 30+, VIP et Badge Spectre requis"
          },
          enabled: true
        }
      ],
      emergencyOverride: {
        enabled: false,
        allowAllTransitions: false,
        reason: "Aucun override actif"
      }
    };
  }

  // ✅ VALIDATION PRINCIPALE AVEC ZONE MAPPING
  async canPlayerTransition(context: ValidationContext): Promise<ValidationResult> {
    // ✅ CONVERTIR LES NOMS DE ZONES CLIENT → DB POUR LA VALIDATION
    const dbFromZone = getDbZoneName(context.currentZone);
    const dbToZone = getDbZoneName(context.targetZone);
    
    console.log(`🔍 [TeleportConfig] Validation: ${context.currentZone}→${dbFromZone} → ${context.targetZone}→${dbToZone} (${context.playerName}, lvl ${context.playerLevel})`);

    // 1. Vérifier l'override d'urgence
    if (this.config.emergencyOverride.enabled && this.config.emergencyOverride.allowAllTransitions) {
      console.log(`🚨 [TeleportConfig] Override d'urgence actif: ${this.config.emergencyOverride.reason}`);
      return { allowed: true };
    }

    // 2. Vérifier si la validation est activée
    if (!this.config.globalSettings.enableValidation) {
      console.log(`🔓 [TeleportConfig] Validation désactivée globalement`);
      return { allowed: true };
    }

    // 3. Chercher une règle correspondante (avec noms DB)
    const applicableRule = this.findApplicableRule(dbFromZone, dbToZone);
    if (!applicableRule) {
      console.log(`❌ [TeleportConfig] Aucune règle trouvée pour ${dbFromZone} → ${dbToZone}`);
      return { 
        allowed: false, 
        reason: `Transition non autorisée entre ${context.currentZone} et ${context.targetZone}` 
      };
    }

    if (!applicableRule.enabled) {
      console.log(`❌ [TeleportConfig] Règle désactivée: ${applicableRule.id}`);
      return { 
        allowed: false, 
        reason: applicableRule.message?.failure || "Cette transition est temporairement désactivée" 
      };
    }

    // 4. Valider toutes les conditions (avec contexte original pour les messages)
    const conditionResult = await this.validateConditions(context, applicableRule);
    if (!conditionResult.allowed) {
      return conditionResult;
    }

    // 5. Appliquer le cooldown si nécessaire
    if (applicableRule.conditions.cooldown?.enabled) {
      this.applyCooldown(context.playerName, applicableRule.id);
    }

    console.log(`✅ [TeleportConfig] Transition autorisée: ${applicableRule.name}`);
    return { allowed: true };
  }

  // ✅ RECHERCHE DE RÈGLE APPLICABLE AVEC SUPPORT WILDCARD
  private findApplicableRule(fromZone: string, toZone: string): TransitionRule | null {
    // 1. Chercher une règle exacte
    let rule = this.config.rules.find(rule => 
      rule.fromZone === fromZone && rule.toZone === toZone
    );
    
    if (rule) {
      console.log(`🎯 [TeleportConfig] Règle exacte trouvée: ${rule.id}`);
      return rule;
    }
    
    // 2. Chercher avec wildcards pour les zones Lavandia
    if (fromZone === 'lavandia' && toZone.startsWith('lavandia')) {
      rule = this.config.rules.find(rule => 
        rule.fromZone === 'lavandia' && rule.toZone === '*'
      );
      if (rule) {
        console.log(`🌟 [TeleportConfig] Règle wildcard trouvée (lavandia → bâtiment): ${rule.id}`);
        return rule;
      }
    }
    
    if (fromZone.startsWith('lavandia') && toZone === 'lavandia') {
      rule = this.config.rules.find(rule => 
        rule.fromZone === '*' && rule.toZone === 'lavandia'
      );
      if (rule) {
        console.log(`🌟 [TeleportConfig] Règle wildcard trouvée (bâtiment → lavandia): ${rule.id}`);
        return rule;
      }
    }
    
    console.log(`❌ [TeleportConfig] Aucune règle trouvée pour ${fromZone} → ${toZone}`);
    return null;
  }

  // ✅ VALIDATION DES CONDITIONS (inchangé)
  private async validateConditions(context: ValidationContext, rule: TransitionRule): Promise<ValidationResult> {
    const conditions = rule.conditions;

    // Niveau minimum
    if (conditions.minLevel && context.playerLevel < conditions.minLevel) {
      const message = rule.message?.failure || `Niveau ${conditions.minLevel} requis`;
      return { allowed: false, reason: message };
    }

    // Niveau maximum
    if (conditions.maxLevel && context.playerLevel > conditions.maxLevel) {
      const message = rule.message?.failure || `Niveau maximum ${conditions.maxLevel} dépassé`;
      return { allowed: false, reason: message };
    }

    // Accès VIP
    if (conditions.vipOnly && !context.hasVipAccess) {
      const message = rule.message?.failure || "Accès VIP requis";
      return { allowed: false, reason: message };
    }

    // Quêtes requises
    if (conditions.requiredQuests && conditions.requiredQuests.length > 0) {
      const missingQuests = conditions.requiredQuests.filter(
        questId => !context.completedQuests.includes(questId)
      );
      if (missingQuests.length > 0) {
        const message = rule.message?.failure || `Quêtes requises: ${missingQuests.join(', ')}`;
        return { allowed: false, reason: message };
      }
    }

    // Objets requis
    if (conditions.requiredItems && conditions.requiredItems.length > 0) {
      const missingItems = conditions.requiredItems.filter(
        itemId => !context.inventory.includes(itemId)
      );
      if (missingItems.length > 0) {
        const message = rule.message?.failure || `Objets requis: ${missingItems.join(', ')}`;
        return { allowed: false, reason: message };
      }
    }

    // Badges requis
    if (conditions.requiredBadges && conditions.requiredBadges.length > 0) {
      const missingBadges = conditions.requiredBadges.filter(
        badgeId => !context.badges.includes(badgeId)
      );
      if (missingBadges.length > 0) {
        const message = rule.message?.failure || `Badges requis: ${missingBadges.join(', ')}`;
        return { allowed: false, reason: message };
      }
    }

    // Cooldown
    if (conditions.cooldown?.enabled) {
      const cooldownCheck = this.checkCooldown(context.playerName, rule.id, conditions.cooldown.durationMinutes);
      if (!cooldownCheck.allowed) {
        return cooldownCheck;
      }
    }

    // Restrictions horaires
    if (conditions.timeRestrictions?.enabled) {
      const timeCheck = this.checkTimeRestrictions(conditions.timeRestrictions);
      if (!timeCheck.allowed) {
        return timeCheck;
      }
    }

    return { allowed: true };
  }

  // ✅ GESTION DES COOLDOWNS (inchangé)
  private checkCooldown(playerName: string, ruleId: string, durationMinutes: number = 1): ValidationResult {
    if (!this.playerCooldowns.has(playerName)) {
      this.playerCooldowns.set(playerName, new Map());
    }

    const playerCooldowns = this.playerCooldowns.get(playerName)!;
    const lastUsed = playerCooldowns.get(ruleId);

    if (lastUsed) {
      const now = Date.now();
      const cooldownMs = durationMinutes * 60 * 1000;
      const timeSinceLastUse = now - lastUsed;

      if (timeSinceLastUse < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastUse) / 60000);
        return { 
          allowed: false, 
          reason: `Cooldown actif, attendez ${remainingMinutes} minute(s)` 
        };
      }
    }

    return { allowed: true };
  }

  private applyCooldown(playerName: string, ruleId: string): void {
    if (!this.playerCooldowns.has(playerName)) {
      this.playerCooldowns.set(playerName, new Map());
    }

    const playerCooldowns = this.playerCooldowns.get(playerName)!;
    playerCooldowns.set(ruleId, Date.now());
  }

  // ✅ RESTRICTIONS HORAIRES (inchangé)
  private checkTimeRestrictions(timeRestrictions: any): ValidationResult {
    const now = new Date();
    
    if (timeRestrictions.allowedHours) {
      const currentHour = now.getHours();
      if (!timeRestrictions.allowedHours.includes(currentHour)) {
        return { 
          allowed: false, 
          reason: `Transition autorisée uniquement entre ${timeRestrictions.allowedHours.join('h, ')}h` 
        };
      }
    }

    if (timeRestrictions.allowedDays) {
      const currentDay = now.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
      if (!timeRestrictions.allowedDays.includes(currentDay)) {
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const allowedDayNames = timeRestrictions.allowedDays.map((day: number) => dayNames[day]);
        return { 
          allowed: false, 
          reason: `Transition autorisée uniquement les: ${allowedDayNames.join(', ')}` 
        };
      }
    }

    return { allowed: true };
  }

  // ✅ MÉTHODES PUBLIQUES POUR LA GESTION (inchangées)

  public reloadConfig(): void {
    this.config = this.loadConfig();
    console.log(`🔄 [TeleportConfig] Configuration rechargée`);
  }

  public enableEmergencyOverride(reason: string): void {
    this.config.emergencyOverride.enabled = true;
    this.config.emergencyOverride.allowAllTransitions = true;
    this.config.emergencyOverride.reason = reason;
    console.log(`🚨 [TeleportConfig] Override d'urgence activé: ${reason}`);
  }

  public disableEmergencyOverride(): void {
    this.config.emergencyOverride.enabled = false;
    this.config.emergencyOverride.allowAllTransitions = false;
    this.config.emergencyOverride.reason = "Override désactivé";
    console.log(`✅ [TeleportConfig] Override d'urgence désactivé`);
  }

  public toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.config.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.saveConfig(this.config);
      console.log(`🔧 [TeleportConfig] Règle ${ruleId} ${enabled ? 'activée' : 'désactivée'}`);
      return true;
    }
    return false;
  }

  public clearPlayerCooldowns(playerName?: string): void {
    if (playerName) {
      this.playerCooldowns.delete(playerName);
      console.log(`🗑️ [TeleportConfig] Cooldowns effacés pour ${playerName}`);
    } else {
      this.playerCooldowns.clear();
      console.log(`🗑️ [TeleportConfig] Tous les cooldowns effacés`);
    }
  }

  public getConfig(): TeleportConfigData {
    return { ...this.config };
  }

  public getStats(): any {
    return {
      rulesCount: this.config.rules.length,
      enabledRules: this.config.rules.filter(r => r.enabled).length,
      zonesCount: Object.keys(this.config.zones).length,
      activeCooldowns: Array.from(this.playerCooldowns.entries()).map(([player, cooldowns]) => ({
        player,
        cooldownCount: cooldowns.size
      })),
      globalSettings: this.config.globalSettings,
      emergencyOverride: this.config.emergencyOverride
    };
  }

  // ✅ DEBUG AVEC MAPPING
  public debugRule(clientFromZone: string, clientToZone: string): any {
    const dbFromZone = getDbZoneName(clientFromZone);
    const dbToZone = getDbZoneName(clientToZone);
    
    console.log(`🔍 [TeleportConfig] Debug: ${clientFromZone}→${dbFromZone} → ${clientToZone}→${dbToZone}`);
    
    const rule = this.findApplicableRule(dbFromZone, dbToZone);
    if (!rule) {
      return { 
        error: `Aucune règle trouvée pour ${clientFromZone}→${dbFromZone} → ${clientToZone}→${dbToZone}`,
        searched: { dbFromZone, dbToZone }
      };
    }

    return {
      rule: rule,
      enabled: rule.enabled,
      conditions: rule.conditions,
      message: rule.message,
      mapping: { 
        client: { from: clientFromZone, to: clientToZone },
        db: { from: dbFromZone, to: dbToZone }
      }
    };
  }
}
