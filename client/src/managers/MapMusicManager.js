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

  // ✅ CONFIGURATION MUSICALE SIMPLIFIÉE (3 musiques seulement)
  initializeZoneMusic() {
    return {
      // === ZONES PRINCIPALES ===
      'beach': {
        track: 'road1_theme', // Utilise road1_theme pour la plage
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
      'lavandiaequipement': { track: 'lavandia_theme', volume: 0.4, loop: true, fadeIn: false },
      'lavandiafurniture': { track: 'lavandia_theme', volume: 0.4, loop: true, fadeIn: false },
      
      // === ROUTES HOUSES → village_theme ===
      'road1house': { track: 'village_theme', volume: 0.3, loop: true, fadeIn: false }
    };
  }

  // ✅ MÉTHODE PRINCIPALE : Initialiser avec une scène Phaser
  initialize(scene) {
    if (this.isInitialized) {
      console.log('🎵 [MapMusicManager] Déjà initialisé, mise à jour scène');
      // ✅ METTRE À JOUR LA RÉFÉRENCE DE SCÈNE SANS RÉINITIALISER
      this.scene = scene;
      this.soundManager = scene.sound;
      return;
    }

    this.scene = scene;
    this.soundManager = scene.sound;
    this.isInitialized = true;

    // ✅ FORCER L'ACTIVATION DU SON
    console.log('🔊 [MapMusicManager] Activation forcée du son...');
    scene.sound.unlock();
    scene.sound.resumeAll();
    
    // ✅ VÉRIFIER LES PARAMÈTRES AUDIO
    console.log('🔍 [MapMusicManager] État audio:', {
      volume: scene.sound.volume,
      mute: scene.sound.mute,
      locked: scene.sound.locked
    });

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

    console.log(`🎵 [MapMusicManager] Transition vers: ${track} (${zoneName})`);

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

    // Stopper la musique actuelle et démarrer immédiatement la nouvelle
    if (this.currentTrack) {
      console.log(`🎵 [MapMusicManager] Arrêt de la track actuelle: ${this.currentTrack.key}`);
      this.currentTrack.stop();
    }
    
    // Toujours démarrer la nouvelle musique
    this.startNewMusic(track, volume, loop, fadeIn, zoneName);
  }

  // ✅ DÉMARRER NOUVELLE MUSIQUE
  startNewMusic(trackKey, volume, loop, fadeIn, zoneName) {
    console.log(`🎵 [MapMusicManager] Démarrage: ${trackKey} (vol: ${volume})`);

    try {
      // ✅ VÉRIFIER QUE LA TRACK EXISTE VRAIMENT
      if (!this.scene.cache.audio.exists(trackKey)) {
        console.error(`❌ [MapMusicManager] Track ${trackKey} n'existe pas dans le cache!`);
        return;
      }

      // ✅ ARRÊTER PROPREMENT LA MUSIQUE PRÉCÉDENTE
      if (this.currentTrack) {
        console.log(`🛑 [MapMusicManager] Arrêt propre de la track précédente`);
        this.currentTrack.destroy();
        this.currentTrack = null;
      }

      // ✅ CRÉER UNE NOUVELLE INSTANCE À CHAQUE FOIS
      this.currentTrack = this.soundManager.add(trackKey, {
        loop: loop,
        volume: fadeIn ? 0 : volume * this.musicVolume
      });

      console.log(`🎵 [MapMusicManager] Track créée:`, this.currentTrack);

      // ✅ FORCER LE DÉMARRAGE
      this.currentTrack.play();
      
      // ✅ VÉRIFIER QUE LA MUSIQUE JOUE VRAIMENT
      setTimeout(() => {
        if (this.currentTrack && this.currentTrack.isPlaying) {
          console.log(`✅ [MapMusicManager] Musique confirmée en cours: ${trackKey}`);
        } else {
          console.error(`❌ [MapMusicManager] Musique n'a pas démarré: ${trackKey}`);
          console.log(`🔍 [MapMusicManager] État track:`, {
            exists: !!this.currentTrack,
            isPlaying: this.currentTrack?.isPlaying,
            isPaused: this.currentTrack?.isPaused,
            volume: this.currentTrack?.volume
          });
          
          // ✅ RETRY UNE FOIS
          if (this.currentTrack && !this.currentTrack.isPlaying) {
            console.log(`🔄 [MapMusicManager] Retry play...`);
            this.currentTrack.play();
          }
        }
      }, 200);
      
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
  // ✅ ÉVITER LES INITIALISATIONS MULTIPLES
  if (scene._musicIntegrated) {
    console.log(`🎵 [MapMusicManager] Déjà intégré à: ${scene.scene.key}`);
    return mapMusicManager;
  }
  
  scene._musicIntegrated = true;
  
  if (!mapMusicManager.isInitialized) {
    mapMusicManager.initialize(scene);
  }
  
  // Exposer sur la scène pour faciliter l'utilisation
  scene.musicManager = mapMusicManager;
  
  // Auto-démarrage de la musique selon la zone
  const normalizeSceneName = (sceneKey) => {
    console.log(`🔍 [MapMusicManager] Scene key reçu: ${sceneKey}`);
    
    // Convertir VillageScene → village, LavandiaScene → lavandia, etc.
    let zoneName = sceneKey.toLowerCase().replace('scene', '');
    
    console.log(`🔍 [MapMusicManager] Zone normalisée: ${zoneName}`);
    return zoneName;
  };
  
  const zoneName = normalizeSceneName(scene.scene.key);
  
  // ✅ CHANGEMENT IMMÉDIAT SANS ATTENDRE L'ÉVÉNEMENT CREATE
  console.log(`🎵 [MapMusicManager] Changement immédiat pour: ${zoneName}`);
  setTimeout(() => {
    mapMusicManager.changeZoneMusic(zoneName, true);
  }, 100);
  
  // ✅ NETTOYAGE À LA DESTRUCTION DE LA SCÈNE
  scene.events.once('shutdown', () => {
    console.log(`🧹 [MapMusicManager] Scene shutdown: ${scene.scene.key}`);
    scene._musicIntegrated = false;
  });
  
  console.log(`🔗 [MapMusicManager] Intégré à la scène: ${scene.scene.key}`);
  
  return mapMusicManager;
}
