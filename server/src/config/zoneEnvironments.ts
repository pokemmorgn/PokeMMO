// server/src/config/zoneEnvironments.ts
// Configuration serveur des environnements de zones

export interface ZoneEnvironmentConfig {
  environment: 'outdoor' | 'indoor' | 'cave';
  lighting?: {
    hasNaturalLight: boolean;
    baseIllumination: number; // 0-1
    affectedByWeather: boolean;
  };
  climate?: {
    temperature: 'normal' | 'cold' | 'warm';
    humidity: 'normal' | 'dry' | 'humid';
  };
}

// ✅ CONFIGURATION COMPLÈTE DES ZONES SERVEUR
export const ZONE_ENVIRONMENTS: Record<string, ZoneEnvironmentConfig> = {
  // === ZONES EXTÉRIEURES ===
  'beach': {
    environment: 'outdoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 1.0,
      affectedByWeather: true
    },
    climate: {
      temperature: 'normal',
      humidity: 'humid'
    }
  },
  
  'village': {
    environment: 'outdoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 1.0,
      affectedByWeather: true
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'lavandia': {
    environment: 'outdoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 1.0,
      affectedByWeather: true
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'road1': {
    environment: 'outdoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 1.0,
      affectedByWeather: true
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'road2': {
    environment: 'outdoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 1.0,
      affectedByWeather: true
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'road3': {
    environment: 'outdoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 1.0,
      affectedByWeather: true
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },

  // === GROTTES ===
  'noctherbcave1': {
    environment: 'cave',
    lighting: {
      hasNaturalLight: false,
      baseIllumination: 0.3,
      affectedByWeather: false
    },
    climate: {
      temperature: 'cold',
      humidity: 'humid'
    }
  },
  
  'noctherbcave2': {
    environment: 'cave',
    lighting: {
      hasNaturalLight: false,
      baseIllumination: 0.3,
      affectedByWeather: false
    },
    climate: {
      temperature: 'cold',
      humidity: 'humid'
    }
  },
  
  'noctherbcave2bis': {
    environment: 'cave',
    lighting: {
      hasNaturalLight: false,
      baseIllumination: 0.3,
      affectedByWeather: false
    },
    climate: {
      temperature: 'cold',
      humidity: 'humid'
    }
  },

  // === BÂTIMENTS VILLAGE ===
  'villagehouse1': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'villagehouse2': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'villageflorist': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.9,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'humid'
    }
  },
  
  'villagelab': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.95,
      affectedByWeather: false
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },

  // === BÂTIMENTS ROAD ===
  'road1house': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },

  // === BÂTIMENTS LAVANDIA ===
  'lavandiahouse1': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse2': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse3': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse4': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse5': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse6': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse7': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse8': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahouse9': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },

  // === BÂTIMENTS PUBLICS LAVANDIA ===
  'lavandiashop': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.9,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiaanalysis': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.95,
      affectedByWeather: false
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'lavandiabossroom': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: false,
      baseIllumination: 0.7,
      affectedByWeather: false
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'lavandiacelebitemple': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.8,
      affectedByWeather: false
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'lavandiaequipement': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.9,
      affectedByWeather: false
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  },
  
  'lavandiafurniture': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.9,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiahealingcenter': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.95,
      affectedByWeather: false
    },
    climate: {
      temperature: 'warm',
      humidity: 'normal'
    }
  },
  
  'lavandiaresearchlab': {
    environment: 'indoor',
    lighting: {
      hasNaturalLight: true,
      baseIllumination: 0.95,
      affectedByWeather: false
    },
    climate: {
      temperature: 'normal',
      humidity: 'normal'
    }
  }
};

// ✅ CLASSE DE GESTION DES ENVIRONNEMENTS SERVEUR
export class ServerZoneEnvironmentManager {
  private static instance: ServerZoneEnvironmentManager;
  
  private constructor() {}
  
  static getInstance(): ServerZoneEnvironmentManager {
    if (!ServerZoneEnvironmentManager.instance) {
      ServerZoneEnvironmentManager.instance = new ServerZoneEnvironmentManager();
    }
    return ServerZoneEnvironmentManager.instance;
  }

  // ✅ Obtenir la configuration d'une zone
  getZoneConfig(zoneName: string): ZoneEnvironmentConfig | null {
    const config = ZONE_ENVIRONMENTS[zoneName.toLowerCase()];
    if (!config) {
      console.warn(`⚠️ [ServerZoneEnvironment] Zone "${zoneName}" non configurée, utilisation des défauts`);
      return this.getDefaultConfig();
    }
    return config;
  }

  // ✅ Configuration par défaut
  private getDefaultConfig(): ZoneEnvironmentConfig {
    return {
      environment: 'outdoor',
      lighting: {
        hasNaturalLight: true,
        baseIllumination: 1.0,
        affectedByWeather: true
      },
      climate: {
        temperature: 'normal',
        humidity: 'normal'
      }
    };
  }

  // ✅ Vérifier si une zone est affectée par le temps
  isAffectedByDayNight(zoneName: string): boolean {
    const config = this.getZoneConfig(zoneName);
    return config?.environment === 'outdoor' && config?.lighting?.hasNaturalLight;
  }

  // ✅ Vérifier si une zone est affectée par la météo
  isAffectedByWeather(zoneName: string): boolean {
    const config = this.getZoneConfig(zoneName);
    return config?.lighting?.affectedByWeather ?? false;
  }

  // ✅ Obtenir l'illumination de base d'une zone
  getBaseIllumination(zoneName: string): number {
    const config = this.getZoneConfig(zoneName);
    return config?.lighting?.baseIllumination ?? 1.0;
  }

  // ✅ Calculer l'illumination effective selon l'heure et la météo
  calculateEffectiveIllumination(
    zoneName: string, 
    isDayTime: boolean, 
    weatherModifier: number = 1.0
  ): number {
    const config = this.getZoneConfig(zoneName);
    if (!config) return 1.0;

    let illumination = config.lighting.baseIllumination;

    // Modifier selon le jour/nuit si applicable
    if (config.lighting.hasNaturalLight && config.environment === 'outdoor') {
      illumination *= isDayTime ? 1.0 : 0.2; // Nuit = 20% de la lumière du jour
    }

    // Modifier selon la météo si applicable
    if (config.lighting.affectedByWeather) {
      illumination *= weatherModifier;
    }

    return Math.max(0.1, Math.min(1.0, illumination)); // Clamp entre 0.1 et 1.0
  }

  // ✅ Obtenir les modificateurs d'environnement pour les rencontres
  getEncounterModifiers(zoneName: string): {
    rateModifier: number;
    typeModifiers: Record<string, number>;
  } {
    const config = this.getZoneConfig(zoneName);
    if (!config) return { rateModifier: 1.0, typeModifiers: {} };

    const modifiers = { rateModifier: 1.0, typeModifiers: {} as Record<string, number> };

    switch (config.environment) {
      case 'cave':
        modifiers.rateModifier = 1.2; // Plus de rencontres dans les grottes
        modifiers.typeModifiers = {
          'rock': 1.5,
          'ground': 1.3,
          'dark': 1.2
        };
        break;

      case 'outdoor':
        if (config.climate?.humidity === 'humid') {
          modifiers.typeModifiers['water'] = 1.2;
        }
        if (config.climate?.temperature === 'cold') {
          modifiers.typeModifiers['ice'] = 1.3;
        }
        break;

      case 'indoor':
        modifiers.rateModifier = 0.0; // Pas de rencontres à l'intérieur
        break;
    }

    return modifiers;
  }

  // ✅ Méthodes de debug et validation
  validateAllZones(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    Object.entries(ZONE_ENVIRONMENTS).forEach(([zone, config]) => {
      if (!['outdoor', 'indoor', 'cave'].includes(config.environment)) {
        issues.push(`Zone "${zone}": environnement invalide "${config.environment}"`);
      }

      if (config.lighting) {
        if (config.lighting.baseIllumination < 0 || config.lighting.baseIllumination > 1) {
          issues.push(`Zone "${zone}": baseIllumination doit être entre 0 et 1`);
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  getAllZonesByEnvironment(): Record<string, string[]> {
    const grouped: Record<string, string[]> = {
      outdoor: [],
      indoor: [],
      cave: []
    };

    Object.entries(ZONE_ENVIRONMENTS).forEach(([zone, config]) => {
      if (grouped[config.environment]) {
        grouped[config.environment].push(zone);
      }
    });

    return grouped;
  }

  debugZoneEnvironment(zoneName: string): void {
    console.log(`🔍 [ServerZoneEnvironment] === DEBUG ZONE: ${zoneName} ===`);
    
    const config = this.getZoneConfig(zoneName);
    console.log(`📊 Configuration:`, config);
    console.log(`🌙 Affecté par jour/nuit: ${this.isAffectedByDayNight(zoneName)}`);
    console.log(`🌦️ Affecté par météo: ${this.isAffectedByWeather(zoneName)}`);
    
    // Test illumination jour/nuit
    const dayIllumination = this.calculateEffectiveIllumination(zoneName, true, 1.0);
    const nightIllumination = this.calculateEffectiveIllumination(zoneName, false, 1.0);
    console.log(`💡 Illumination jour: ${dayIllumination}, nuit: ${nightIllumination}`);
    
    // Modificateurs de rencontre
    const encounterMods = this.getEncounterModifiers(zoneName);
    console.log(`🎯 Modificateurs rencontre:`, encounterMods);
  }

  // ✅ Méthode pour obtenir les données client
  getClientEnvironmentData(): Record<string, string> {
    const clientData: Record<string, string> = {};
    
    Object.entries(ZONE_ENVIRONMENTS).forEach(([zone, config]) => {
      clientData[zone] = config.environment;
    });
    
    return clientData;
  }
}

// ✅ Export de l'instance singleton
export const serverZoneEnvironmentManager = ServerZoneEnvironmentManager.getInstance();
