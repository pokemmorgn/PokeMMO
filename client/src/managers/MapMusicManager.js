// client/src/managers/MapMusicManager.js
// 🔧 VERSION CORRIGÉE - Fix pour le changement de musique entre maps

export class MapMusicManager {
  constructor() {
    this.currentTrack = null;
    this.currentZone = null;
    this.isInitialized = false;
    this.musicVolume = 0.6;
    this.fadeSpeed = 800; // ms
    this.isEnabled = true;
    this.audioContextUnlocked = false;
    this.pendingZone = null;
    
    // 🔧 FIX: Cache global des tracks pour éviter les conflits
    this.loadedTracks = new Map();
    this.activeSound = null; // Track du son actuel
    
    // Configuration musicale des zones
    this.zoneMusic = this.initializeZoneMusic();
    
    console.log('🎵 [MapMusicManager] Initialisé (version corrigée)');
  }

  // ✅ CONFIGURATION MUSICALE IDENTIQUE
  initializeZoneMusic() {
    return {
      // === ZONES PRINCIPALES ===
      'beach': {
        track: 'road1_theme',
        volume: 0.5,
        loop: true,
        fadeIn: true
      },
      'village': {
        track: 'village_theme', 
        volume: 0.6,
        loop: true,
        fadeIn: true
      },
      'lavandia': {
        track: 'lavandia_theme',
        volume: 0.7,
        loop: true,
        fadeIn: true
      },
      
      // === TOUTES LES ROUTES → road1_theme ===
      'road1': { track: 'road1_theme', volume: 0.5, loop: true, fadeIn: true },
      'road2': { track: 'road1_theme', volume: 0.5, loop: true, fadeIn: true },
      'road3': { track: 'road1_theme', volume: 0.5, loop: true, fadeIn: true },
      
      // === GROTTES → road1_theme (en attendant) ===
      'nocthercave1': { track: 'road1_theme', volume: 0.3, loop: true, fadeIn: true },
      'nocthercave2': { track: 'road1_theme', volume: 0.3, loop: true, fadeIn: true },
      'nocthercave2bis': { track: 'road1_theme', volume: 0.3, loop: true, fadeIn: true },
      
      // === INTÉRIEURS VILLAGE → village_theme mais plus doux ===
      'villagehouse1': { track: 'village_theme', volume: 0.3, loop: true, fadeIn: false },
      'villagehouse2': { track: 'village_theme', volume: 0.3, loop: true, fadeIn: false },
      'villageflorist': { track: 'village_theme', volume: 0.4, loop: true, fadeIn: false },
      'villagelab': { track: 'village_theme', volume: 0.4, loop: true, fadeIn: false },
      
      // === INTÉRIEURS LAVANDIA → lavandia_theme mais plus doux ===
      'lavandiashop': { track: 'lavandia_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahealingcenter': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiaresearchlab': { track: 'lavandia_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiabossroom': { track: 'lavandia_theme', volume: 0.8, loop: true, fadeIn: true },
      'lavandiacelebitemple': { track: 'lavandia_theme', volume: 0.5, loop: true, fadeIn: true },
      
      // === TOUTES LES MAISONS LAVANDIA → lavandia_theme doux ===
      'lavandiahouse1': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse2': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse3': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse4': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse5': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse6': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse7': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse8': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiahouse9': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiaanalysis': { track: 'lavandia_theme', volume: 0.3, loop: true, fadeIn: false },
      'lavandiaequipment': { track: 'lavandia_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiafurniture': { track: 'lavandia_theme', volume: 0.4, loop: true, fadeIn: false },
      
      // === ROUTES HOUSES → village_theme ===
      'road1house': { track: 'village_theme', volume: 0.3, loop: true, fadeIn: false }
    };
  }

  // 🔧 FIX: Méthode d'initialisation avec vérifications renforcées
  initialize(scene) {
    console.log(`🎵 [MapMusicManager] === INITIALISATION SCENE: ${scene.scene.key} ===`);
    
    if (this.isInitialized) {
      console.log('🎵 [MapMusicManager] Déjà initialisé, mise à jour scène');
      // 🔧 FIX: Vérifier que la scène a changé
      if (this.scene !== scene) {
        console.log('🔄 [MapMusicManager] Nouvelle scène détectée, mise à jour...');
        this.scene = scene;
        this.soundManager = scene.sound;
        
        // 🔧 FIX: NE PAS changer automatiquement - laisser integrateMusicToScene le faire
        const newZone = this.extractZoneFromSceneKey(scene.scene.key);
        console.log(`🎯 [MapMusicManager] Zone extraite: ${newZone} (changement sera fait par integrateMusicToScene)`);
      }
      return;
    }

    this.scene = scene;
    this.soundManager = scene.sound;
    this.isInitialized = true;

    // 🔧 FIX: Logs détaillés pour debug
    console.log(`🔧 [MapMusicManager] Scene.sound disponible:`, !!scene.sound);
    console.log(`🔧 [MapMusicManager] Scene.cache.audio:`, !!scene.cache?.audio);

    this.setupAudioUnlock(scene);

    console.log(`✅ [MapMusicManager] Initialisé avec gestionnaire global`);
    
    // 🔧 FIX: Test immédiat des assets audio
    this.testAudioAssets();
  }

  // 🔧 NOUVELLE MÉTHODE: Test des assets audio
  testAudioAssets() {
    const requiredTracks = ['road1_theme', 'village_theme', 'lavandia_theme'];
    
    console.log(`🧪 [MapMusicManager] === TEST ASSETS AUDIO ===`);
    
    requiredTracks.forEach(track => {
      if (this.scene.cache.audio.exists(track)) {
        console.log(`✅ [MapMusicManager] Asset trouvé: ${track}`);
      } else {
        console.error(`❌ [MapMusicManager] Asset MANQUANT: ${track}`);
      }
    });
    
    // 🔧 FIX: Lister tous les assets audio disponibles
    const audioKeys = this.scene.cache.audio.getKeys();
    console.log(`📋 [MapMusicManager] Assets audio disponibles (${audioKeys.length}):`, audioKeys);
  }

  // 🔧 FIX: Méthode robuste d'extraction de zone
  extractZoneFromSceneKey(sceneKey) {
    console.log(`🔍 [MapMusicManager] Extraction zone de: ${sceneKey}`);
    
    // 🔧 FIX: Mapping plus robuste
    const zoneMapping = {
      // Principales
      'BeachScene': 'beach',
      'VillageScene': 'village', 
      'LavandiaScene': 'lavandia',
      'VillageLabScene': 'villagelab',
      
      // Routes
      'Road1Scene': 'road1',
      'Road2Scene': 'road2', 
      'Road3Scene': 'road3',
      'Road1HouseScene': 'road1house',
      
      // Maisons Village
      'VillageHouse1Scene': 'villagehouse1',
      'VillageHouse2Scene': 'villagehouse2',
      'VillageFloristScene': 'villageflorist',
      
      // Maisons Lavandia
      'LavandiaHouse1Scene': 'lavandiahouse1',
      'LavandiaHouse2Scene': 'lavandiahouse2',
      'LavandiaHouse3Scene': 'lavandiahouse3',
      'LavandiaHouse4Scene': 'lavandiahouse4',
      'LavandiaHouse5Scene': 'lavandiahouse5',
      'LavandiaHouse6Scene': 'lavandiahouse6',
      'LavandiaHouse7Scene': 'lavandiahouse7',
      'LavandiaHouse8Scene': 'lavandiahouse8',
      'LavandiaHouse9Scene': 'lavandiahouse9',
      
      // Bâtiments Lavandia
      'LavandiaShopScene': 'lavandiashop',
      'LavandiaHealingCenterScene': 'lavandiahealingcenter',
      'LavandiaResearchLabScene': 'lavandiaresearchlab',
      'LavandiaBossRoomScene': 'lavandiabossroom',
      'LavandiaCelibTempleScene': 'lavandiacelebitemple',
      'LavandiaAnalysisScene': 'lavandiaanalysis',
      'LavandiaequipmentScene': 'lavandiaequipment',
      'LavandiaFurnitureScene': 'lavandiafurniture',
      
      // Grottes
      'NoctherCave1Scene': 'nocthercave1',
      'NoctherCave2Scene': 'nocthercave2', 
      'NoctherCave2BisScene': 'nocthercave2bis'
    };
    
    const mappedZone = zoneMapping[sceneKey];
    
    if (mappedZone) {
      console.log(`✅ [MapMusicManager] Zone mappée: ${sceneKey} → ${mappedZone}`);
      return mappedZone;
    }
    
    // 🔧 FIX: Fallback avec extraction intelligente
    const fallbackZone = sceneKey.toLowerCase().replace('scene', '');
    console.warn(`⚠️ [MapMusicManager] Zone non mappée, fallback: ${sceneKey} → ${fallbackZone}`);
    return fallbackZone;
  }

  // 🔧 FIX: Setup débloquage audio amélioré
  setupAudioUnlock(scene) {
    if (this.audioContextUnlocked) {
      console.log('🔓 [MapMusicManager] AudioContext déjà débloqué');
      return;
    }

    console.log('🔒 [MapMusicManager] Setup débloquage AudioContext...');

    const unlockEvents = ['click', 'touchstart', 'keydown', 'pointerdown'];
    
    const unlockAudio = () => {
      console.log('🔓 [MapMusicManager] Tentative débloquage AudioContext...');
      
      if (scene.sound.context && scene.sound.context.state === 'suspended') {
        scene.sound.context.resume().then(() => {
          console.log('✅ [MapMusicManager] AudioContext débloqué!');
          this.audioContextUnlocked = true;
          
          if (this.pendingZone) {
            console.log('🔄 [MapMusicManager] Redémarrage musique après débloquage...');
            this.changeZoneMusic(this.pendingZone, true);
            this.pendingZone = null;
          }
        }).catch(err => {
          console.warn('⚠️ [MapMusicManager] Échec débloquage AudioContext:', err);
        });
      } else {
        console.log('ℹ️ [MapMusicManager] AudioContext déjà actif');
        this.audioContextUnlocked = true;
        
        if (this.pendingZone) {
          console.log('🔄 [MapMusicManager] Redémarrage musique (AudioContext déjà actif)...');
          this.changeZoneMusic(this.pendingZone, true);
          this.pendingZone = null;
        }
      }

      unlockEvents.forEach(event => {
        scene.input.removeListener(event, unlockAudio);
        document.removeEventListener(event, unlockAudio);
      });
    };

    unlockEvents.forEach(event => {
      scene.input.on(event, unlockAudio);
      document.addEventListener(event, unlockAudio, { once: true });
    });

    console.log('🎮 [MapMusicManager] Listeners débloquage ajoutés');
  }

  // 🔧 FIX: Méthode principale COMPLÈTEMENT RÉÉCRITE
  changeZoneMusic(zoneName, forceChange = false) {
    console.log(`🎵 [MapMusicManager] === CHANGEMENT MUSIQUE ===`);
    console.log(`🎯 Zone demandée: ${zoneName}`);
    console.log(`🔄 Force change: ${forceChange}`);
    console.log(`🎵 Zone actuelle: ${this.currentZone}`);
    console.log(`🎼 Track actuelle: ${this.currentTrack?.key || 'aucune'}`);

    if (!this.isInitialized || !this.isEnabled) {
      console.log(`🎵 [MapMusicManager] Pas initialisé (${this.isInitialized}) ou désactivé (${this.isEnabled})`);
      return;
    }

    const normalizedZone = zoneName.toLowerCase();
    
    // 🔧 FIX: Condition stricte - forcer le changement si demandé
    if (this.currentZone === normalizedZone && !forceChange) {
      console.log(`🎵 [MapMusicManager] Déjà sur zone: ${normalizedZone} (pas de force)`);
      return;
    }

    const musicConfig = this.getMusicConfig(normalizedZone);
    
    if (!musicConfig) {
      console.warn(`⚠️ [MapMusicManager] Pas de config pour zone: ${normalizedZone}`);
      this.stopCurrentMusic();
      return;
    }

    console.log(`🎶 [MapMusicManager] Config trouvée:`, musicConfig);

    // 🔧 FIX: ARRÊT FORCÉ AVANT TOUT NOUVEAU SON
    console.log(`🛑 [MapMusicManager] ARRÊT FORCÉ DE TOUTE MUSIQUE`);
    this.forceStopAllMusic();

    // 🔧 FIX: Attendre un peu avant de démarrer (évite les conflicts)
    setTimeout(() => {
      this.startNewMusicImmediate(musicConfig, normalizedZone);
    }, 100);
  }

  // 🔧 NOUVELLE MÉTHODE: Arrêt forcé de toute musique
  forceStopAllMusic() {
    console.log(`🛑 [MapMusicManager] === ARRÊT FORCÉ TOUTE MUSIQUE ===`);
    
    // 1. Arrêter via SoundManager global
    if (this.soundManager) {
      console.log(`🛑 [MapMusicManager] Arrêt via SoundManager.stopAll()`);
      this.soundManager.stopAll();
    }
    
    // 2. Arrêter track actuelle si elle existe
    if (this.currentTrack) {
      console.log(`🛑 [MapMusicManager] Arrêt track actuelle: ${this.currentTrack.key}`);
      try {
        if (this.currentTrack.isPlaying) {
          this.currentTrack.stop();
        }
        this.currentTrack.destroy();
      } catch (e) {
        console.warn(`⚠️ [MapMusicManager] Erreur arrêt track:`, e);
      }
      this.currentTrack = null;
    }
    
    // 3. Arrêter activeSound si différent
    if (this.activeSound && this.activeSound !== this.currentTrack) {
      console.log(`🛑 [MapMusicManager] Arrêt activeSound`);
      try {
        if (this.activeSound.isPlaying) {
          this.activeSound.stop();
        }
        this.activeSound.destroy();
      } catch (e) {
        console.warn(`⚠️ [MapMusicManager] Erreur arrêt activeSound:`, e);
      }
      this.activeSound = null;
    }
    
    // 4. Reset état
    this.currentZone = null;
    
    console.log(`✅ [MapMusicManager] Arrêt forcé terminé`);
  }

  // 🔧 FIX: Démarrage immédiat de nouvelle musique
  startNewMusicImmediate(musicConfig, zoneName) {
    const { track, volume, loop, fadeIn } = musicConfig;

    console.log(`🎵 [MapMusicManager] === DÉMARRAGE IMMÉDIAT ===`);
    console.log(`🎼 Track: ${track}`);
    console.log(`🔊 Volume: ${volume}`);
    console.log(`🔄 Loop: ${loop}`);
    console.log(`🌅 Zone: ${zoneName}`);

    // 🔧 FIX: Vérification d'asset stricte
    if (!this.scene?.cache?.audio?.exists(track)) {
      console.error(`❌ [MapMusicManager] ASSET MANQUANT: ${track}`);
      console.error(`📋 Assets disponibles:`, this.scene?.cache?.audio?.getKeys() || []);
      return;
    }

    try {
      // 🔧 FIX: Créer et jouer le son de manière robuste
      console.log(`🎮 [MapMusicManager] Création sound via scene.sound.add`);
      
      const newSound = this.soundManager.add(track, {
        loop: loop,
        volume: volume * this.musicVolume
      });

      // 🔧 FIX: Vérifications avant de jouer
      if (!newSound) {
        console.error(`❌ [MapMusicManager] Impossible de créer le son: ${track}`);
        return;
      }

      console.log(`🎮 [MapMusicManager] Son créé, tentative de lecture...`);
      
      // 🔧 FIX: Jouer avec gestion d'erreur
      const playPromise = newSound.play();
      
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
          console.log(`✅ [MapMusicManager] Lecture réussie: ${track}`);
        }).catch((error) => {
          console.error(`❌ [MapMusicManager] Erreur lecture:`, error);
        });
      }

      // 🔧 FIX: Assigner le nouveau son comme courant
      this.currentTrack = newSound;
      this.activeSound = newSound;
      this.currentZone = zoneName;

      console.log(`✅ [MapMusicManager] Musique démarrée: ${track} pour zone ${zoneName}`);

    } catch (error) {
      console.error(`❌ [MapMusicManager] Erreur critique démarrage:`, error);
    }
  }

  // ✅ MÉTHODE INCHANGÉE
  getMusicConfig(zoneName) {
    const config = this.zoneMusic[zoneName];
    if (config) {
      console.log(`🎶 [MapMusicManager] Config trouvée pour ${zoneName}:`, config);
    } else {
      console.warn(`⚠️ [MapMusicManager] Aucune config pour ${zoneName}`);
    }
    return config;
  }

  // 🔧 FIX: Simplification des effets de fade (optionnels)
  fadeOut(track, callback) {
    if (!track || !this.scene) return;

    this.scene.tweens.add({
      targets: track,
      volume: 0,
      duration: this.fadeSpeed,
      onComplete: () => {
        track.stop();
        if (callback) callback();
      }
    });
  }

  fadeIn(track, targetVolume) {
    if (!track || !this.scene) return;

    this.scene.tweens.add({
      targets: track,
      volume: targetVolume,
      duration: this.fadeSpeed
    });
  }

  fadeVolume(track, targetVolume) {
    if (!track || !this.scene) return;

    this.scene.tweens.add({
      targets: track,
      volume: targetVolume,
      duration: this.fadeSpeed / 2
    });
  }

  // 🔧 FIX: Contrôles publics améliorés
  stopCurrentMusic() {
    console.log(`⏹️ [MapMusicManager] stopCurrentMusic() appelé`);
    this.forceStopAllMusic();
  }

  pauseMusic() {
    if (this.currentTrack && this.currentTrack.isPlaying) {
      this.currentTrack.pause();
      console.log(`⏸️ [MapMusicManager] Musique en pause`);
    }
  }

  resumeMusic() {
    if (this.currentTrack && this.currentTrack.isPaused) {
      this.currentTrack.resume();
      console.log(`▶️ [MapMusicManager] Musique reprise`);
    }
  }

  setMasterVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    
    if (this.currentTrack) {
      const currentZoneConfig = this.getMusicConfig(this.currentZone);
      if (currentZoneConfig) {
        this.currentTrack.setVolume(currentZoneConfig.volume * this.musicVolume);
      }
    }
    
    console.log(`🔊 [MapMusicManager] Volume master: ${this.musicVolume}`);
  }

  toggleMusic() {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      console.log(`🔊 [MapMusicManager] Musique activée`);
      if (this.currentZone) {
        this.changeZoneMusic(this.currentZone, true);
      }
    } else {
      console.log(`🔇 [MapMusicManager] Musique désactivée`);
      this.stopCurrentMusic();
    }
  }

  // 🔧 FIX: Debug amélioré
  getCurrentState() {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.isEnabled,
      currentZone: this.currentZone,
      audioContextUnlocked: this.audioContextUnlocked,
      pendingZone: this.pendingZone,
      currentTrack: this.currentTrack ? {
        key: this.currentTrack.key,
        isPlaying: this.currentTrack.isPlaying,
        volume: this.currentTrack.volume
      } : null,
      activeSound: this.activeSound ? {
        key: this.activeSound.key,
        isPlaying: this.activeSound.isPlaying
      } : null,
      masterVolume: this.musicVolume,
      totalZones: Object.keys(this.zoneMusic).length,
      sceneKey: this.scene?.scene?.key || 'aucune'
    };
  }

  debugState() {
    console.log(`🔍 [MapMusicManager] === DEBUG STATE COMPLET ===`);
    const state = this.getCurrentState();
    console.table(state);
    
    // 🔧 FIX: Debug supplémentaire
    console.log(`🎮 Scene soundManager:`, !!this.soundManager);
    console.log(`🎵 Assets audio:`, this.scene?.cache?.audio?.getKeys() || []);
    console.log(`🔧 Context state:`, this.scene?.sound?.context?.state || 'unknown');
  }

  // ✅ CLEAN UP identique
  destroy() {
    this.forceStopAllMusic();
    
    if (this.scene) {
      this.scene.tweens.killTweensOf(this.currentTrack);
    }
    
    this.loadedTracks.clear();
    this.scene = null;
    this.soundManager = null;
    this.isInitialized = false;
    
    console.log(`🧹 [MapMusicManager] Détruit`);
  }
}

// ✅ INSTANCE GLOBALE IDENTIQUE
export const mapMusicManager = new MapMusicManager();

// 🔧 FIX: Fonction d'intégration améliorée avec debug
export function integrateMusicToScene(scene) {
  console.log(`🎵 [integrateMusicToScene] === INTÉGRATION SCÈNE: ${scene.scene.key} ===`);
  
  if (scene._musicIntegrated) {
    console.log(`🎵 [integrateMusicToScene] Déjà intégré à: ${scene.scene.key}`);
    return mapMusicManager;
  }
  
  scene._musicIntegrated = true;
  
  if (!mapMusicManager.isInitialized) {
    console.log(`🔧 [integrateMusicToScene] Initialisation MapMusicManager...`);
    mapMusicManager.initialize(scene);
  } else {
    console.log(`🔧 [integrateMusicToScene] MapMusicManager déjà initialisé, update...`);
    mapMusicManager.initialize(scene); // Mettra à jour la scène
  }
  
  scene.musicManager = mapMusicManager;
  
  // 🔧 FIX: Extraction de zone robuste
  const zoneName = mapMusicManager.extractZoneFromSceneKey(scene.scene.key);
  
  console.log(`🎯 [integrateMusicToScene] Zone extraite: ${zoneName}`);
  console.log(`🎵 [integrateMusicToScene] Changement FORCÉ pour: ${zoneName}`);
  
  // 🔧 FIX: Délai plus long et vérification avant changement
  setTimeout(() => {
    console.log(`🚀 [integrateMusicToScene] VÉRIFICATION changement musique...`);
    
    // 🔧 FIX: Vérifier qu'on n'est pas déjà en train de jouer la bonne musique
    const currentTrackKey = mapMusicManager.currentTrack?.key;
    const expectedConfig = mapMusicManager.getMusicConfig(zoneName);
    const expectedTrack = expectedConfig?.track;
    
    console.log(`🔍 [integrateMusicToScene] Current: ${currentTrackKey}, Expected: ${expectedTrack}`);
    
    if (currentTrackKey !== expectedTrack || !mapMusicManager.currentTrack?.isPlaying) {
      console.log(`🎵 [integrateMusicToScene] CHANGEMENT NÉCESSAIRE: ${currentTrackKey} → ${expectedTrack}`);
      mapMusicManager.changeZoneMusic(zoneName, true);
    } else {
      console.log(`✅ [integrateMusicToScene] Musique déjà correcte: ${currentTrackKey}`);
    }
  }, 400); // Délai plus long pour laisser le temps à la scène
  
  scene.events.once('shutdown', () => {
    console.log(`🧹 [integrateMusicToScene] Scene shutdown: ${scene.scene.key}`);
    scene._musicIntegrated = false;
  });
  
  console.log(`🔗 [integrateMusicToScene] Intégration complète: ${scene.scene.key} → ${zoneName}`);
  
  return mapMusicManager;
}

// 🔧 NOUVELLES FONCTIONS UTILITAIRES DE DEBUG
export function debugMapMusic() {
  console.log(`🔍 [DEBUG] === DEBUG GLOBAL MAP MUSIC ===`);
  mapMusicManager.debugState();
}

export function forceChangeMusicToZone(zoneName) {
  console.log(`🔧 [DEBUG] Force changement vers zone: ${zoneName}`);
  mapMusicManager.changeZoneMusic(zoneName, true);
}

export function testAllMusicTracks() {
  console.log(`🧪 [DEBUG] === TEST TOUS LES TRACKS ===`);
  const tracks = ['road1_theme', 'village_theme', 'lavandia_theme'];
  
  tracks.forEach((track, index) => {
    setTimeout(() => {
      console.log(`🎵 Test track: ${track}`);
      
      if (mapMusicManager.scene?.cache?.audio?.exists(track)) {
        const testSound = mapMusicManager.soundManager.add(track, { volume: 0.1 });
        testSound.play();
        
        setTimeout(() => {
          testSound.stop();
          testSound.destroy();
          console.log(`✅ Test ${track} terminé`);
        }, 2000);
      } else {
        console.error(`❌ Track manquant: ${track}`);
      }
    }, index * 3000);
  });
}

// 🔧 EXPOSITION GLOBALE POUR DEBUG CONSOLE
if (typeof window !== 'undefined') {
  window.debugMapMusic = debugMapMusic;
  window.forceChangeMusicToZone = forceChangeMusicToZone;
  window.testAllMusicTracks = testAllMusicTracks;
  window.mapMusicManager = mapMusicManager;
}
