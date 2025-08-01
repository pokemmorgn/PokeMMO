// client/src/config/ZoneMapping.js
// 🌍 CONFIGURATION CENTRALISÉE DES ZONES
// ✅ Source unique de vérité pour tous les mappings zone/scène

/**
 * Configuration centralisée de toutes les zones du jeu
 * 
 * Chaque zone contient :
 * - sceneClass: Nom de la classe de scène Phaser
 * - mapFile: Nom du fichier TMJ (sans extension)
 * - musicTrack: Piste audio associée
 * - environment: Type d'environnement (outdoor/indoor/cave)
 * - category: Catégorie pour l'organisation
 */
export const ZONE_CONFIG = {
  // === ZONES PRINCIPALES ===
  beach: {
    sceneClass: 'BeachScene',
    mapFile: 'beach',
    musicTrack: 'road1_theme',
    environment: 'outdoor',
    category: 'main',
    displayName: 'Plage'
  },
  
  village: {
    sceneClass: 'VillageScene',
    mapFile: 'village',
    musicTrack: 'village_theme',
    environment: 'outdoor',
    category: 'main',
    displayName: 'Village'
  },
  
  lavandia: {
    sceneClass: 'LavandiaScene',
    mapFile: 'lavandia',
    musicTrack: 'lavandia_theme',
    environment: 'outdoor',
    category: 'main',
    displayName: 'Lavandia'
  },

  // === ROUTES ===
  road1: {
    sceneClass: 'Road1Scene',
    mapFile: 'road1',
    musicTrack: 'road1_theme',
    environment: 'outdoor',
    category: 'route',
    displayName: 'Route 1'
  },
  
  road2: {
    sceneClass: 'Road2Scene',
    mapFile: 'road2',
    musicTrack: 'road1_theme',
    environment: 'outdoor',
    category: 'route',
    displayName: 'Route 2'
  },
  
  road3: {
    sceneClass: 'Road3Scene',
    mapFile: 'road3',
    musicTrack: 'road1_theme',
    environment: 'outdoor',
    category: 'route',
    displayName: 'Route 3'
  },

  // === VILLAGE - INTÉRIEURS ===
  villagelab: {
    sceneClass: 'VillageLabScene',
    mapFile: 'villagelab',
    musicTrack: 'village_theme',
    environment: 'indoor',
    category: 'village_interior',
    displayName: 'Laboratoire du Village'
  },
  
  villagehouse1: {
    sceneClass: 'VillageHouse1Scene',
    mapFile: 'villagehouse1',
    musicTrack: 'village_theme',
    environment: 'indoor',
    category: 'village_interior',
    displayName: 'Maison Village 1'
  },
  
  villagehouse2: {
    sceneClass: 'VillageHouse2Scene',
    mapFile: 'villagehouse2',
    musicTrack: 'village_theme',
    environment: 'indoor',
    category: 'village_interior',
    displayName: 'Maison Village 2'
  },
  
  villageflorist: {
    sceneClass: 'VillageFloristScene',
    mapFile: 'villageflorist',
    musicTrack: 'village_theme',
    environment: 'indoor',
    category: 'village_interior',
    displayName: 'Fleuriste du Village'
  },
  
  villagewindmill: {
    sceneClass: 'VillageWindmillScene',
    mapFile: 'villagewindmill',
    musicTrack: 'village_theme',
    environment: 'indoor',
    category: 'village_interior',
    displayName: 'Moulin du Village'
  },

  // === ROUTES - INTÉRIEURS ===
  road1house: {
    sceneClass: 'Road1HouseScene',
    mapFile: 'road1house',
    musicTrack: 'village_theme',
    environment: 'indoor',
    category: 'route_interior',
    displayName: 'Maison Route 1'
  },
  
  road1hidden: {
    sceneClass: 'Road1HiddenScene',
    mapFile: 'road1hidden',
    musicTrack: 'road1_theme',
    environment: 'outdoor',
    category: 'route_secret',
    displayName: 'Passage Caché Route 1'
  },

  // === LAVANDIA - INTÉRIEURS ===
  lavandiaanalysis: {
    sceneClass: 'LavandiaAnalysisScene',
    mapFile: 'lavandiaanalysis',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Centre d\'Analyse Lavandia'
  },
  
  lavandiabossroom: {
    sceneClass: 'LavandiaBossRoomScene',
    mapFile: 'lavandiabossroom',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Salle du Boss Lavandia'
  },
  
  lavandiacelebitemple: {
    sceneClass: 'LavandiaCelebiTempleScene',
    mapFile: 'lavandiacelebitemple',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Temple de Celebi'
  },
  
  lavandiaequipment: {
    sceneClass: 'LavandiaEquipmentScene',
    mapFile: 'lavandiaequipment',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Magasin d\'Équipement'
  },
  
  lavandiafurniture: {
    sceneClass: 'LavandiaFurnitureScene',
    mapFile: 'lavandiafurniture',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Magasin de Meubles'
  },
  
  lavandiahealingcenter: {
    sceneClass: 'LavandiaHealingCenterScene',
    mapFile: 'lavandiahealingcenter',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Centre Pokémon Lavandia'
  },
  
  lavandiaresearchlab: {
    sceneClass: 'LavandiaResearchLabScene',
    mapFile: 'lavandiaresearchlab',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Laboratoire de Recherche'
  },
  
  lavandiashop: {
    sceneClass: 'LavandiaShopScene',
    mapFile: 'lavandiashop',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_interior',
    displayName: 'Magasin Lavandia'
  },

  // === MAISONS LAVANDIA (1-9) ===
  lavandiahouse1: {
    sceneClass: 'LavandiaHouse1Scene',
    mapFile: 'lavandiahouse1',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 1'
  },
  
  lavandiahouse2: {
    sceneClass: 'LavandiaHouse2Scene',
    mapFile: 'lavandiahouse2',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 2'
  },
  
  lavandiahouse3: {
    sceneClass: 'LavandiaHouse3Scene',
    mapFile: 'lavandiahouse3',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 3'
  },
  
  lavandiahouse4: {
    sceneClass: 'LavandiaHouse4Scene',
    mapFile: 'lavandiahouse4',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 4'
  },
  
  lavandiahouse5: {
    sceneClass: 'LavandiaHouse5Scene',
    mapFile: 'lavandiahouse5',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 5'
  },
  
  lavandiahouse6: {
    sceneClass: 'LavandiaHouse6Scene',
    mapFile: 'lavandiahouse6',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 6'
  },
  
  lavandiahouse7: {
    sceneClass: 'LavandiaHouse7Scene',
    mapFile: 'lavandiahouse7',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 7'
  },
  
  lavandiahouse8: {
    sceneClass: 'LavandiaHouse8Scene',
    mapFile: 'lavandiahouse8',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 8'
  },
  
  lavandiahouse9: {
    sceneClass: 'LavandiaHouse9Scene',
    mapFile: 'lavandiahouse9',
    musicTrack: 'lavandia_theme',
    environment: 'indoor',
    category: 'lavandia_house',
    displayName: 'Maison Lavandia 9'
  },

  // === GROTTES ===
  noctherbcave1: {
    sceneClass: 'NoctherbCave1Scene',
    mapFile: 'noctherbcave1',
    musicTrack: 'road1_theme',
    environment: 'cave',
    category: 'cave',
    displayName: 'Grotte de Noctherb 1'
  },
  
  noctherbcave2: {
    sceneClass: 'NoctherbCave2Scene',
    mapFile: 'noctherbcave2',
    musicTrack: 'road1_theme',
    environment: 'cave',
    category: 'cave',
    displayName: 'Grotte de Noctherb 2'
  },
  
  noctherbcave2bis: {
    sceneClass: 'NoctherbCave2BisScene',
    mapFile: 'noctherbcave2bis',
    musicTrack: 'road1_theme',
    environment: 'cave',
    category: 'cave',
    displayName: 'Grotte de Noctherb 2bis'
  },

  // === WRAITHMOOR ===
  wraithmoor: {
    sceneClass: 'WraithmoorScene',
    mapFile: 'wraithmoor',
    musicTrack: 'road1_theme',
    environment: 'outdoor',
    category: 'wraithmoor',
    displayName: 'Lande Spectrale'
  },
  
  wraithmoorcimetery: {
    sceneClass: 'WraithmoorCimeteryScene',
    mapFile: 'wraithmoorcimetery',
    musicTrack: 'road1_theme',
    environment: 'outdoor',
    category: 'wraithmoor',
    displayName: 'Cimetière de la Lande'
  },
  
  wraithmoormanor1: {
    sceneClass: 'WraithmoorManor1Scene',
    mapFile: 'wraithmoormanor1',
    musicTrack: 'road1_theme',
    environment: 'indoor',
    category: 'wraithmoor',
    displayName: 'Manoir de la Lande 1'
  }
};

// =====================================
// FONCTIONS UTILITAIRES
// =====================================

/**
 * Convertit un nom de scène vers un nom de zone
 * @param {string} sceneName - Nom de la scène (ex: 'VillageScene')
 * @returns {string} - Nom de la zone (ex: 'village')
 */
export function sceneToZone(sceneName) {
  // Rechercher dans la config
  for (const [zoneName, config] of Object.entries(ZONE_CONFIG)) {
    if (config.sceneClass === sceneName) {
      return zoneName;
    }
  }
  
  // Fallback : conversion basique
  return sceneName.toLowerCase().replace('scene', '');
}

/**
 * ✅ CORRIGÉ: Convertit un nom de zone vers un nom de scène
 * @param {string} zoneName - Nom de la zone (ex: 'village' ou 'Road1Scene')
 * @returns {string} - Nom de la scène (ex: 'VillageScene' ou 'Road1Scene')
 */
export function zoneToScene(zoneName) {
  // ✅ NOUVEAU: Si zoneName finit déjà par "Scene", le retourner tel quel
  if (zoneName.endsWith('Scene')) {
    console.log(`🔧 [zoneToScene] "${zoneName}" finit déjà par "Scene" → retour tel quel`);
    return zoneName;
  }
  
  // ✅ ANCIEN CODE: Chercher dans la config
  const config = ZONE_CONFIG[zoneName.toLowerCase()];
  if (config) {
    console.log(`🔧 [zoneToScene] "${zoneName}" trouvé in config → "${config.sceneClass}"`);
    return config.sceneClass;
  }
  
  // ✅ ANCIEN CODE: Fallback : conversion basique
  const fallbackScene = zoneName.charAt(0).toUpperCase() + zoneName.slice(1) + 'Scene';
  console.log(`🔧 [zoneToScene] "${zoneName}" fallback → "${fallbackScene}"`);
  return fallbackScene;
}

/**
 * Obtient la configuration complète d'une zone
 * @param {string} zoneName - Nom de la zone
 * @returns {object|null} - Configuration de la zone
 */
export function getZoneConfig(zoneName) {
  return ZONE_CONFIG[zoneName.toLowerCase()] || null;
}

/**
 * Obtient la piste musicale d'une zone
 * @param {string} zoneName - Nom de la zone
 * @returns {string} - Nom de la piste musicale
 */
export function getZoneMusic(zoneName) {
  const config = getZoneConfig(zoneName);
  return config?.musicTrack || 'road1_theme'; // Fallback
}

/**
 * Obtient l'environnement d'une zone
 * @param {string} zoneName - Nom de la zone
 * @returns {string} - Type d'environnement ('outdoor'|'indoor'|'cave')
 */
export function getZoneEnvironment(zoneName) {
  const config = getZoneConfig(zoneName);
  return config?.environment || 'outdoor'; // Fallback
}

/**
 * Obtient le nom d'affichage d'une zone
 * @param {string} zoneName - Nom de la zone
 * @returns {string} - Nom d'affichage
 */
export function getZoneDisplayName(zoneName) {
  const config = getZoneConfig(zoneName);
  return config?.displayName || zoneName;
}

/**
 * Vérifie si une zone existe
 * @param {string} zoneName - Nom de la zone
 * @returns {boolean} - True si la zone existe
 */
export function zoneExists(zoneName) {
  return !!ZONE_CONFIG[zoneName.toLowerCase()];
}

/**
 * Obtient toutes les zones d'une catégorie
 * @param {string} category - Catégorie ('main', 'route', 'village_interior', etc.)
 * @returns {Array} - Liste des zones de cette catégorie
 */
export function getZonesByCategory(category) {
  return Object.entries(ZONE_CONFIG)
    .filter(([_, config]) => config.category === category)
    .map(([zoneName, config]) => ({ 
      zoneName, 
      ...config 
    }));
}

/**
 * Obtient toutes les zones d'un environnement
 * @param {string} environment - Type d'environnement ('outdoor'|'indoor'|'cave')
 * @returns {Array} - Liste des zones de cet environnement
 */
export function getZonesByEnvironment(environment) {
  return Object.entries(ZONE_CONFIG)
    .filter(([_, config]) => config.environment === environment)
    .map(([zoneName, config]) => ({ 
      zoneName, 
      ...config 
    }));
}

/**
 * Obtient la liste de toutes les zones
 * @returns {Array} - Liste de toutes les zones
 */
export function getAllZones() {
  return Object.keys(ZONE_CONFIG);
}

/**
 * Obtient la liste de toutes les scènes
 * @returns {Array} - Liste de toutes les scènes
 */
export function getAllScenes() {
  return Object.values(ZONE_CONFIG).map(config => config.sceneClass);
}

/**
 * Génère la configuration pour le LoaderScene
 * @returns {Array} - Configuration des maps pour Phaser
 */
export function generateMapLoadConfig() {
  return Object.entries(ZONE_CONFIG).map(([zoneName, config]) => ({
    key: config.mapFile,
    path: `assets/maps/${config.mapFile}.tmj`,
    zoneName: zoneName,
    sceneClass: config.sceneClass
  }));
}

/**
 * Génère la configuration pour le MapMusicManager
 * @returns {Object} - Configuration de la musique par zone
 */
export function generateMusicConfig() {
  const musicConfig = {};
  
  Object.entries(ZONE_CONFIG).forEach(([zoneName, config]) => {
    musicConfig[zoneName] = {
      track: config.musicTrack,
      volume: config.environment === 'indoor' ? 0.3 : 
              config.environment === 'cave' ? 0.3 : 0.6,
      loop: true,
      fadeIn: config.environment === 'outdoor'
    };
  });
  
  return musicConfig;
}

/**
 * Génère la configuration pour le ZoneEnvironmentManager
 * @returns {Object} - Configuration des environnements par zone
 */
export function generateEnvironmentConfig() {
  const envConfig = {};
  
  Object.entries(ZONE_CONFIG).forEach(([zoneName, config]) => {
    envConfig[zoneName] = config.environment;
  });
  
  return envConfig;
}

// =====================================
// EXPORTS POUR COMPATIBILITÉ
// =====================================

// Export des mappings pour compatibilité avec l'ancien code
export const SCENE_TO_ZONE_MAPPING = Object.fromEntries(
  Object.entries(ZONE_CONFIG).map(([zoneName, config]) => [
    config.sceneClass, 
    zoneName
  ])
);

export const ZONE_TO_SCENE_MAPPING = Object.fromEntries(
  Object.entries(ZONE_CONFIG).map(([zoneName, config]) => [
    zoneName, 
    config.sceneClass
  ])
);

// =====================================
// FONCTIONS DE DEBUG ET VALIDATION
// =====================================

/**
 * Valide la configuration des zones
 * @returns {Object} - Résultat de la validation
 */
export function validateZoneConfig() {
  const errors = [];
  const warnings = [];
  
  Object.entries(ZONE_CONFIG).forEach(([zoneName, config]) => {
    // Vérifications obligatoires
    if (!config.sceneClass) {
      errors.push(`Zone ${zoneName}: sceneClass manquant`);
    }
    if (!config.mapFile) {
      errors.push(`Zone ${zoneName}: mapFile manquant`);
    }
    if (!config.environment) {
      errors.push(`Zone ${zoneName}: environment manquant`);
    }
    
    // Vérifications optionnelles
    if (!config.musicTrack) {
      warnings.push(`Zone ${zoneName}: musicTrack manquant (fallback utilisé)`);
    }
    if (!config.displayName) {
      warnings.push(`Zone ${zoneName}: displayName manquant`);
    }
    
    // Vérifications de valeurs
    if (config.environment && !['outdoor', 'indoor', 'cave'].includes(config.environment)) {
      errors.push(`Zone ${zoneName}: environment invalide (${config.environment})`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalZones: Object.keys(ZONE_CONFIG).length
  };
}

/**
 * Affiche des statistiques sur la configuration
 */
export function debugZoneConfig() {
  console.log('🌍 === CONFIGURATION DES ZONES ===');
  
  const validation = validateZoneConfig();
  console.log(`📊 Total zones: ${validation.totalZones}`);
  console.log(`✅ Validation: ${validation.valid ? 'OK' : 'ERREURS'}`);
  
  if (validation.errors.length > 0) {
    console.error('❌ Erreurs:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Avertissements:', validation.warnings);
  }
  
  // Statistiques par catégorie
  const categories = {};
  const environments = {};
  
  Object.values(ZONE_CONFIG).forEach(config => {
    categories[config.category] = (categories[config.category] || 0) + 1;
    environments[config.environment] = (environments[config.environment] || 0) + 1;
  });
  
  console.log('📊 Par catégorie:', categories);
  console.log('🌍 Par environnement:', environments);
  
  return {
    validation,
    categories,
    environments
  };
}

// ✅ NOUVELLE FONCTION DE DEBUG pour le mapping spécifique
export function debugZoneMapping(input) {
  console.log('🔧 === DEBUG ZONE MAPPING ===');
  console.log(`📝 Input: "${input}"`);
  
  // Test zoneToScene
  const sceneResult = zoneToScene(input);
  console.log(`🎯 zoneToScene("${input}") → "${sceneResult}"`);
  
  // Test sceneToZone
  const zoneResult = sceneToZone(input);
  console.log(`🎯 sceneToZone("${input}") → "${zoneResult}"`);
  
  // Vérifier si existe dans la config
  const configExists = !!ZONE_CONFIG[input.toLowerCase()];
  console.log(`📊 Existe dans config: ${configExists}`);
  
  if (configExists) {
    const config = ZONE_CONFIG[input.toLowerCase()];
    console.log(`⚙️ Config trouvée:`, config);
  }
  
  return {
    input,
    sceneResult,
    zoneResult,
    configExists
  };
}

// Exposition globale pour debug
if (typeof window !== 'undefined') {
  window.ZoneMapping = {
    config: ZONE_CONFIG,
    sceneToZone,
    zoneToScene,
    getZoneConfig,
    getZoneMusic,
    getZoneEnvironment,
    getAllZones,
    getAllScenes,
    validateZoneConfig,
    debugZoneConfig,
    debugZoneMapping // ✅ NOUVEAU
  };
}
