import { generateEnvironmentConfig } from "../config/ZoneMapping.js";


export class ZoneEnvironmentManager {
  constructor() {
    this.zoneEnvironments = generateEnvironmentConfig();
  }


  // ✅ MÉTHODE PRINCIPALE: Vérifier si une zone est affectée par le jour/nuit
  shouldApplyDayNightCycle(zoneName) {
    if (!zoneName) return false;
    
    const environment = this.getZoneEnvironment(zoneName);
    
    // Seules les zones outdoor sont affectées par le cycle jour/nuit
    const shouldApply = environment === 'outdoor';
    
    console.log(`🌍 [ZoneEnvironmentManager] Zone "${zoneName}": ${environment} → Jour/Nuit: ${shouldApply ? 'OUI' : 'NON'}`);
    
    return shouldApply;
  }

  // ✅ Obtenir le type d'environnement d'une zone
  getZoneEnvironment(zoneName) {
    if (!zoneName) return 'unknown';
    
    const environment = this.zoneEnvironments[zoneName.toLowerCase()] || 'outdoor'; // Par défaut outdoor
    
    return environment;
  }

  // ✅ Vérifier si une zone est intérieure
  isIndoorZone(zoneName) {
    return this.getZoneEnvironment(zoneName) === 'indoor';
  }

  // ✅ Vérifier si une zone est extérieure
  isOutdoorZone(zoneName) {
    return this.getZoneEnvironment(zoneName) === 'outdoor';
  }

  // ✅ Vérifier si une zone est une grotte
  isCaveZone(zoneName) {
    return this.getZoneEnvironment(zoneName) === 'cave';
  }

  // ✅ Obtenir l'éclairage recommandé pour une zone
  getRecommendedLighting(zoneName, currentTime = { hour: 12, isDayTime: true }) {
    const environment = this.getZoneEnvironment(zoneName);
    
    switch (environment) {
      case 'outdoor':
        // Zones extérieures: suivent le cycle jour/nuit
        return {
          type: 'daynight',
          applyOverlay: true,
          alpha: currentTime.isDayTime ? 0 : 0.8,
          reason: 'Cycle jour/nuit normal'
        };
        
      case 'indoor':
        // Zones intérieures: toujours éclairées
        return {
          type: 'indoor',
          applyOverlay: false,
          alpha: 0,
          reason: 'Intérieur - toujours éclairé'
        };
        
      case 'cave':
        // Grottes: toujours sombres mais pas autant que la nuit
        return {
          type: 'cave',
          applyOverlay: true,
          alpha: 0.5,
          reason: 'Grotte - éclairage tamisé'
        };
        
      default:
        // Zone inconnue: par défaut outdoor
        return {
          type: 'unknown',
          applyOverlay: true,
          alpha: currentTime.isDayTime ? 0 : 0.8,
          reason: 'Zone inconnue - défaut outdoor'
        };
    }
  }

  // ✅ NOUVELLES MÉTHODES: Gestion des couleurs d'overlay par environnement

  getOverlayColor(zoneName, timeWeather = null) {
    const environment = this.getZoneEnvironment(zoneName);
    
    switch (environment) {
      case 'outdoor':
        // Couleur standard pour la nuit extérieure
        return 'rgba(0, 0, 68, 0.8)';
        
      case 'cave':
        // Couleur plus brunâtre pour les grottes
        return 'rgba(34, 17, 0, 0.5)';
        
      case 'indoor':
      default:
        // Transparent pour les intérieurs
        return 'rgba(0, 0, 68, 0)';
    }
  }

  // ✅ Obtenir les paramètres météo pour une zone
  shouldApplyWeatherEffect(zoneName) {
    const environment = this.getZoneEnvironment(zoneName);
    
    // Seules les zones outdoor sont affectées par la météo
    return environment === 'outdoor';
  }

  // ✅ MÉTHODES DE DEBUG ET CONFIGURATION

  debugZoneEnvironment(zoneName) {
    console.log(`🔍 [ZoneEnvironmentManager] === DEBUG ZONE: ${zoneName} ===`);
    
    const environment = this.getZoneEnvironment(zoneName);
    const lighting = this.getRecommendedLighting(zoneName);
    const overlayColor = this.getOverlayColor(zoneName);
    
    console.log(`🌍 Environnement: ${environment}`);
    console.log(`💡 Éclairage:`, lighting);
    console.log(`🎨 Couleur overlay: ${overlayColor}`);
    console.log(`🌙 Affecté par jour/nuit: ${this.shouldApplyDayNightCycle(zoneName)}`);
    console.log(`🌦️ Affecté par météo: ${this.shouldApplyWeatherEffect(zoneName)}`);
    
    return {
      environment,
      lighting,
      overlayColor,
      dayNightEffect: this.shouldApplyDayNightCycle(zoneName),
      weatherEffect: this.shouldApplyWeatherEffect(zoneName)
    };
  }

  getAllZonesByEnvironment() {
    const grouped = {
      outdoor: [],
      indoor: [],
      cave: [],
      unknown: []
    };
    
    Object.entries(this.zoneEnvironments).forEach(([zone, env]) => {
      if (grouped[env]) {
        grouped[env].push(zone);
      } else {
        grouped.unknown.push(zone);
      }
    });
    
    return grouped;
  }

  // ✅ MÉTHODE POUR AJOUTER/MODIFIER DES ZONES
  setZoneEnvironment(zoneName, environment) {
    if (!['outdoor', 'indoor', 'cave'].includes(environment)) {
      console.warn(`⚠️ [ZoneEnvironmentManager] Environnement invalide: ${environment}`);
      return false;
    }
    
    this.zoneEnvironments[zoneName.toLowerCase()] = environment;
    console.log(`✅ [ZoneEnvironmentManager] Zone "${zoneName}" → ${environment}`);
    return true;
  }

  // ✅ CONFIGURATION EN MASSE
  bulkSetEnvironments(zonesConfig) {
    let updated = 0;
    
    Object.entries(zonesConfig).forEach(([zone, environment]) => {
      if (this.setZoneEnvironment(zone, environment)) {
        updated++;
      }
    });
    
    console.log(`📊 [ZoneEnvironmentManager] ${updated} zones mises à jour en masse`);
    return updated;
  }

  // ✅ MÉTHODES DE VALIDATION

  validateAllZones() {
    const issues = [];
    
    Object.entries(this.zoneEnvironments).forEach(([zone, env]) => {
      if (!['outdoor', 'indoor', 'cave'].includes(env)) {
        issues.push(`Zone "${zone}" a un environnement invalide: "${env}"`);
      }
    });
    
    if (issues.length > 0) {
      console.warn(`⚠️ [ZoneEnvironmentManager] Problèmes détectés:`, issues);
    } else {
      console.log(`✅ [ZoneEnvironmentManager] Toutes les zones sont valides`);
    }
    
    return {
      valid: issues.length === 0,
      issues: issues,
      totalZones: Object.keys(this.zoneEnvironments).length
    };
  }

  // ✅ EXPORT/IMPORT DE CONFIGURATION

  exportConfiguration() {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      zones: { ...this.zoneEnvironments }
    };
  }

  importConfiguration(config) {
    if (!config.zones) {
      console.error(`❌ [ZoneEnvironmentManager] Configuration invalide`);
      return false;
    }
    
    this.zoneEnvironments = { ...config.zones };
    console.log(`✅ [ZoneEnvironmentManager] Configuration importée (${Object.keys(this.zoneEnvironments).length} zones)`);
    
    return this.validateAllZones();
  }
}

// ✅ INSTANCE GLOBALE
export const zoneEnvironmentManager = new ZoneEnvironmentManager();
