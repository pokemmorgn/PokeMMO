// client/src/managers/MapMusicManager.js
// 🎵 Gestionnaire de musique des maps - Architecture modulaire et indépendante

export class MapMusicManager {
  constructor() {
    this.currentTrack = null;
    this.currentZone = null;
    this.isInitialized = false;
    this.musicVolume = 0.6;
    this.fadeSpeed = 800; // ms
    this.isEnabled = true;
    
    // Cache des tracks chargées
    this.loadedTracks = new Map();
    
    // Configuration musicale des zones
    this.zoneMusic = this.initializeZoneMusic();
    
    console.log('🎵 [MapMusicManager] Initialisé');
  }

  // ✅ CONFIGURATION MUSICALE COMPLÈTE
  initializeZoneMusic() {
    return {
      // === ZONES EXTÉRIEURES ===
      'beach': {
        track: 'beach_theme',
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
      'road1': {
        track: 'route_theme',
        volume: 0.5,
        loop: true,
        fadeIn: true
      },
      'road2': {
        track: 'route_theme',
        volume: 0.5,
        loop: true,
        fadeIn: true
      },
      'road3': {
        track: 'route_theme',
        volume: 0.5,
        loop: true,
        fadeIn: true
      },
      
      // === GROTTES ===
      'nocthercave1': {
        track: 'cave_theme',
        volume: 0.4,
        loop: true,
        fadeIn: true
      },
      'nocthercave2': {
        track: 'cave_theme',
        volume: 0.4,
        loop: true,
        fadeIn: true
      },
      'nocthercave2bis': {
        track: 'cave_theme',
        volume: 0.4,
        loop: true,
        fadeIn: true
      },
      
      // === INTÉRIEURS VILLAGE ===
      'villagehouse1': {
        track: 'house_theme',
        volume: 0.4,
        loop: true,
        fadeIn: false
      },
      'villagehouse2': {
        track: 'house_theme',
        volume: 0.4,
        loop: true,
        fadeIn: false
      },
      'villageflorist': {
        track: 'shop_theme',
        volume: 0.5,
        loop: true,
        fadeIn: false
      },
      'villagelab': {
        track: 'lab_theme',
        volume: 0.5,
        loop: true,
        fadeIn: false
      },
      
      // === INTÉRIEURS LAVANDIA ===
      'lavandiashop': {
        track: 'shop_theme',
        volume: 0.5,
        loop: true,
        fadeIn: false
      },
      'lavandiahealingcenter': {
        track: 'healing_theme',
        volume: 0.4,
        loop: true,
        fadeIn: false
      },
      'lavandiaresearchlab': {
        track: 'lab_theme',
        volume: 0.5,
        loop: true,
        fadeIn: false
      },
      'lavandiabossroom': {
        track: 'boss_theme',
        volume: 0.8,
        loop: true,
        fadeIn: true
      },
      'lavandiacelebitemple': {
        track: 'temple_theme',
        volume: 0.6,
        loop: true,
        fadeIn: true
      },
      
      // Toutes les autres maisons de Lavandia → house_theme
      'lavandiahouse1': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse2': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse3': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse4': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse5': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse6': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse7': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse8': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiahouse9': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiaanalysis': { track: 'house_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiaequipement': { track: 'shop_theme', volume: 0.5, loop: true, fadeIn: false },
      'lavandiafurniture': { track: 'shop_theme', volume: 0.5, loop: true, fadeIn: false },
      
      // Routes houses
      'road1house': {
        track: 'house_theme',
        volume: 0.4,
        loop: true,
        fadeIn: false
      }
    };
  }

  // ✅ MÉTHODE PRINCIPALE : Initialiser avec une scène Phaser
  initialize(scene) {
    if (this.isInitialized) {
      console.log('🎵 [MapMusicManager] Déjà initialisé');
      return;
    }

    this.scene = scene;
    this.soundManager = scene.sound;
    this.isInitialized = true;

    console.log('✅ [MapMusicManager] Initialisé avec scène:', scene.scene.key);
  }

  // ✅ MÉTHODE PRINCIPALE : Changer de musique selon la zone
  changeZoneMusic(zoneName, forceChange = false) {
    if (!this.isInitialized || !this.isEnabled) {
      console.log(`🎵 [MapMusicManager] Pas initialisé ou désactivé`);
      return;
    }

    const normalizedZone = zoneName.toLowerCase();
    
    // Éviter les changements inutiles
    if (this.currentZone === normalizedZone && !forceChange) {
      console.log(`🎵 [MapMusicManager] Déjà sur zone: ${normalizedZone}`);
      return;
    }

    console.log(`🎵 [MapMusicManager] Changement: ${this.currentZone} → ${normalizedZone}`);

    const musicConfig = this.getMusicConfig(normalizedZone);
    
    if (!musicConfig) {
      console.warn(`⚠️ [MapMusicManager] Pas de musique pour zone: ${normalizedZone}`);
      this.stopCurrentMusic();
      return;
    }

    this.transitionToMusic(musicConfig, normalizedZone);
  }

  // ✅ OBTENIR LA CONFIGURATION MUSICALE D'UNE ZONE
  getMusicConfig(zoneName) {
    return this.zoneMusic[zoneName] || null;
  }

  // ✅ TRANSITION MUSICALE AVEC FADE
  transitionToMusic(musicConfig, zoneName) {
    const { track, volume, loop, fadeIn } = musicConfig;

    // Vérifier si la track existe
    if (!this.scene.cache.audio.exists(track)) {
      console.warn(`⚠️ [MapMusicManager] Track manquante: ${track}`);
      return;
    }

    // Si même track, juste ajuster le volume
    if (this.currentTrack && this.currentTrack.key === track) {
      console.log(`🎵 [MapMusicManager] Même track, ajustement volume: ${volume}`);
      this.fadeVolume(this.currentTrack, volume * this.musicVolume);
      this.currentZone = zoneName;
      return;
    }

    // Stopper la musique actuelle
    if (this.currentTrack) {
      if (fadeIn) {
        this.fadeOut(this.currentTrack, () => {
          this.startNewMusic(track, volume, loop, fadeIn, zoneName);
        });
      } else {
        this.currentTrack.stop();
        this.startNewMusic(track, volume, loop, fadeIn, zoneName);
      }
    } else {
      this.startNewMusic(track, volume, loop, fadeIn, zoneName);
    }
  }

  // ✅ DÉMARRER NOUVELLE MUSIQUE
  startNewMusic(trackKey, volume, loop, fadeIn, zoneName) {
    console.log(`🎵 [MapMusicManager] Démarrage: ${trackKey} (vol: ${volume})`);

    try {
      this.currentTrack = this.soundManager.add(trackKey, {
        loop: loop,
        volume: fadeIn ? 0 : volume * this.musicVolume
      });

      this.currentTrack.play();
      this.currentZone = zoneName;

      // Fade in si demandé
      if (fadeIn) {
        this.fadeIn(this.currentTrack, volume * this.musicVolume);
      }

      console.log(`✅ [MapMusicManager] Musique démarrée: ${trackKey} pour zone ${zoneName}`);

    } catch (error) {
      console.error(`❌ [MapMusicManager] Erreur démarrage musique:`, error);
    }
  }

  // ✅ EFFETS DE FADE
  fadeOut(track, callback) {
    if (!track) return;

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
    if (!track) return;

    this.scene.tweens.add({
      targets: track,
      volume: targetVolume,
      duration: this.fadeSpeed
    });
  }

  fadeVolume(track, targetVolume) {
    if (!track) return;

    this.scene.tweens.add({
      targets: track,
      volume: targetVolume,
      duration: this.fadeSpeed / 2
    });
  }

  // ✅ CONTRÔLES PUBLICS
  stopCurrentMusic() {
    if (this.currentTrack) {
      this.currentTrack.stop();
      this.currentTrack = null;
      this.currentZone = null;
      console.log(`⏹️ [MapMusicManager] Musique arrêtée`);
    }
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

  // ✅ MÉTHODES DE DEBUG
  getCurrentState() {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.isEnabled,
      currentZone: this.currentZone,
      currentTrack: this.currentTrack ? {
        key: this.currentTrack.key,
        isPlaying: this.currentTrack.isPlaying,
        volume: this.currentTrack.volume
      } : null,
      masterVolume: this.musicVolume,
      totalZones: Object.keys(this.zoneMusic).length
    };
  }

  debugState() {
    console.log(`🔍 [MapMusicManager] === DEBUG STATE ===`);
    console.log(this.getCurrentState());
  }

  // ✅ CLEAN UP
  destroy() {
    this.stopCurrentMusic();
    
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

// ✅ INSTANCE GLOBALE
export const mapMusicManager = new MapMusicManager();

// ✅ FONCTION D'INTÉGRATION SIMPLE POUR LES SCÈNES
export function integrateMusicToScene(scene) {
  if (!mapMusicManager.isInitialized) {
    mapMusicManager.initialize(scene);
  }
  
  // Exposer sur la scène pour faciliter l'utilisation
  scene.musicManager = mapMusicManager;
  
  // Auto-démarrage de la musique selon la zone
  const zoneName = scene.scene.key.toLowerCase()
    .replace('scene', '')
    .replace(/([A-Z])/g, (match, letter) => letter.toLowerCase());
  
  scene.events.once('create', () => {
    // Délai pour s'assurer que tout est chargé
    scene.time.delayedCall(100, () => {
      mapMusicManager.changeZoneMusic(zoneName);
    });
  });
  
  console.log(`🔗 [MapMusicManager] Intégré à la scène: ${scene.scene.key}`);
  
  return mapMusicManager;
}
