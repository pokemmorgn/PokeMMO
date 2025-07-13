// Pokedex/PokedexDataManager.js - Gestionnaire des données Pokémon
// 🎮 Charge et gère les 151 Pokémon avec statuts appropriés

export class PokedexDataManager {
  constructor() {
    this.pokemonData = {};
    this.playerEntries = new Map(); // Statut vu/capturé par le joueur
    this.currentLanguage = 'en';
    this.isLoaded = false;
    
    // Types Pokémon avec couleurs
    this.typeColors = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    
    this.init();
  }
  
  async init() {
    try {
      await this.loadPokemonData();
      await this.loadPokemonTypes();
     // this.initializeAllPokemon();
      this.isLoaded = true;
      console.log('✅ [PokedexDataManager] Données Pokémon chargées (151 Pokémon)');
    } catch (error) {
      console.error('❌ [PokedexDataManager] Erreur chargement données:', error);
      this.createFallbackData();
    }
  }
  
  // === 📡 CHARGEMENT DES DONNÉES ===
  
  async loadPokemonData() {
    try {
      const response = await fetch(`/localization/pokemon/gen1/${this.currentLanguage}.json`);
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      
      this.pokemonData = await response.json();
      console.log(`📋 [PokedexDataManager] Données ${this.currentLanguage} chargées:`, Object.keys(this.pokemonData).length, 'Pokémon');
    } catch (error) {
      console.error('❌ Erreur chargement localisation:', error);
      throw error;
    }
  }
  
  async loadPokemonTypes() {
    // Types des Pokémon Gen 1 (basés sur les données originales)
    this.pokemonTypes = {
      1: ['grass', 'poison'],     // Bulbasaur
      2: ['grass', 'poison'],     // Ivysaur
      3: ['grass', 'poison'],     // Venusaur
      4: ['fire'],                // Charmander
      5: ['fire'],                // Charmeleon
      6: ['fire', 'flying'],      // Charizard
      7: ['water'],               // Squirtle
      8: ['water'],               // Wartortle
      9: ['water'],               // Blastoise
      10: ['bug'],                // Caterpie
      11: ['bug'],                // Metapod
      12: ['bug', 'flying'],      // Butterfree
      13: ['bug', 'poison'],      // Weedle
      14: ['bug', 'poison'],      // Kakuna
      15: ['bug', 'poison'],      // Beedrill
      16: ['normal', 'flying'],   // Pidgey
      17: ['normal', 'flying'],   // Pidgeotto
      18: ['normal', 'flying'],   // Pidgeot
      19: ['normal'],             // Rattata
      20: ['normal'],             // Raticate
      21: ['normal', 'flying'],   // Spearow
      22: ['normal', 'flying'],   // Fearow
      23: ['poison'],             // Ekans
      24: ['poison'],             // Arbok
      25: ['electric'],           // Pikachu
      26: ['electric'],           // Raichu
      27: ['ground'],             // Sandshrew
      28: ['ground'],             // Sandslash
      29: ['poison'],             // Nidoran♀
      30: ['poison'],             // Nidorina
      31: ['poison', 'ground'],   // Nidoqueen
      32: ['poison'],             // Nidoran♂
      33: ['poison'],             // Nidorino
      34: ['poison', 'ground'],   // Nidoking
      35: ['fairy'],              // Clefairy
      36: ['fairy'],              // Clefable
      37: ['fire'],               // Vulpix
      38: ['fire'],               // Ninetales
      39: ['normal', 'fairy'],    // Jigglypuff
      40: ['normal', 'fairy'],    // Wigglytuff
      41: ['poison', 'flying'],   // Zubat
      42: ['poison', 'flying'],   // Golbat
      43: ['grass', 'poison'],    // Oddish
      44: ['grass', 'poison'],    // Gloom
      45: ['grass', 'poison'],    // Vileplume
      46: ['bug', 'grass'],       // Paras
      47: ['bug', 'grass'],       // Parasect
      48: ['bug', 'poison'],      // Venonat
      49: ['bug', 'poison'],      // Venomoth
      50: ['ground'],             // Diglett
      51: ['ground'],             // Dugtrio
      52: ['normal'],             // Meowth
      53: ['normal'],             // Persian
      54: ['water'],              // Psyduck
      55: ['water'],              // Golduck
      56: ['fighting'],           // Mankey
      57: ['fighting'],           // Primeape
      58: ['fire'],               // Growlithe
      59: ['fire'],               // Arcanine
      60: ['water'],              // Poliwag
      61: ['water'],              // Poliwhirl
      62: ['water', 'fighting'],  // Poliwrath
      63: ['psychic'],            // Abra
      64: ['psychic'],            // Kadabra
      65: ['psychic'],            // Alakazam
      66: ['fighting'],           // Machop
      67: ['fighting'],           // Machoke
      68: ['fighting'],           // Machamp
      69: ['grass', 'poison'],    // Bellsprout
      70: ['grass', 'poison'],    // Weepinbell
      71: ['grass', 'poison'],    // Victreebel
      72: ['water', 'poison'],    // Tentacool
      73: ['water', 'poison'],    // Tentacruel
      74: ['rock', 'ground'],     // Geodude
      75: ['rock', 'ground'],     // Graveler
      76: ['rock', 'ground'],     // Golem
      77: ['fire'],               // Ponyta
      78: ['fire'],               // Rapidash
      79: ['water', 'psychic'],   // Slowpoke
      80: ['water', 'psychic'],   // Slowbro
      81: ['electric', 'steel'],  // Magnemite
      82: ['electric', 'steel'],  // Magneton
      83: ['normal', 'flying'],   // Farfetch'd
      84: ['normal', 'flying'],   // Doduo
      85: ['normal', 'flying'],   // Dodrio
      86: ['water'],              // Seel
      87: ['water', 'ice'],       // Dewgong
      88: ['poison'],             // Grimer
      89: ['poison'],             // Muk
      90: ['water'],              // Shellder
      91: ['water', 'ice'],       // Cloyster
      92: ['ghost', 'poison'],    // Gastly
      93: ['ghost', 'poison'],    // Haunter
      94: ['ghost', 'poison'],    // Gengar
      95: ['rock', 'ground'],     // Onix
      96: ['psychic'],            // Drowzee
      97: ['psychic'],            // Hypno
      98: ['water'],              // Krabby
      99: ['water'],              // Kingler
      100: ['electric'],          // Voltorb
      101: ['electric'],          // Electrode
      102: ['grass', 'psychic'],  // Exeggcute
      103: ['grass', 'psychic'],  // Exeggutor
      104: ['ground'],            // Cubone
      105: ['ground'],            // Marowak
      106: ['fighting'],          // Hitmonlee
      107: ['fighting'],          // Hitmonchan
      108: ['normal'],            // Lickitung
      109: ['poison'],            // Koffing
      110: ['poison'],            // Weezing
      111: ['ground', 'rock'],    // Rhyhorn
      112: ['ground', 'rock'],    // Rhydon
      113: ['normal'],            // Chansey
      114: ['grass'],             // Tangela
      115: ['normal'],            // Kangaskhan
      116: ['water'],             // Horsea
      117: ['water'],             // Seadra
      118: ['water'],             // Goldeen
      119: ['water'],             // Seaking
      120: ['water'],             // Staryu
      121: ['water', 'psychic'],  // Starmie
      122: ['psychic', 'fairy'],  // Mr. Mime
      123: ['bug', 'flying'],     // Scyther
      124: ['ice', 'psychic'],    // Jynx
      125: ['electric'],          // Electabuzz
      126: ['fire'],              // Magmar
      127: ['bug'],               // Pinsir
      128: ['normal'],            // Tauros
      129: ['water'],             // Magikarp
      130: ['water', 'flying'],   // Gyarados
      131: ['water', 'ice'],      // Lapras
      132: ['normal'],            // Ditto
      133: ['normal'],            // Eevee
      134: ['water'],             // Vaporeon
      135: ['electric'],          // Jolteon
      136: ['fire'],              // Flareon
      137: ['normal'],            // Porygon
      138: ['rock', 'water'],     // Omanyte
      139: ['rock', 'water'],     // Omastar
      140: ['rock', 'water'],     // Kabuto
      141: ['rock', 'water'],     // Kabutops
      142: ['rock', 'flying'],    // Aerodactyl
      143: ['normal'],            // Snorlax
      144: ['ice', 'flying'],     // Articuno
      145: ['electric', 'flying'], // Zapdos
      146: ['fire', 'flying'],    // Moltres
      147: ['dragon'],            // Dratini
      148: ['dragon'],            // Dragonair
      149: ['dragon', 'flying'],  // Dragonite
      150: ['psychic'],           // Mewtwo
      151: ['psychic']            // Mew
    };
  }
  
  createFallbackData() {
    console.log('🔧 [PokedexDataManager] Création données de secours...');
    
    // Données de secours pour les 151 Pokémon
    for (let i = 1; i <= 151; i++) {
      this.pokemonData[i] = {
        name: `Pokémon #${i.toString().padStart(3, '0')}`,
        description: 'Description non disponible.'
      };
    }
    
    this.isLoaded = true;
  }
  
  // === 🎯 INITIALISATION COMPLÈTE ===
  
initializeAllPokemon() {
  console.log('🎯 [PokedexDataManager] Initialisation des Pokémon disponibles...');
  
  // Utiliser les Pokémon disponibles du serveur au lieu de 1-151
  const availablePokemon = this.availablePokemonIds || [];
  
  if (availablePokemon.length === 0) {
    console.warn('⚠️ [PokedexDataManager] Aucun Pokémon disponible reçu du serveur');
    return;
  }
  
  // Initialiser seulement les Pokémon disponibles sur le serveur
  availablePokemon.forEach(pokemonId => {
    if (!this.playerEntries.has(pokemonId)) {
      this.playerEntries.set(pokemonId, {
        pokemonId: pokemonId,
        seen: false,
        caught: false,
        shiny: false,
        favorited: false,
        firstSeen: null,
        firstCaught: null,
        timesEncountered: 0,
        bestLevel: 0,
        locations: [],
        tags: [],
        notes: ''
      });
    }
  });
  
  console.log(`✅ [PokedexDataManager] ${availablePokemon.length} Pokémon disponibles initialisés`);
}
  
  // === 📊 MÉTHODES D'ACCÈS AUX DONNÉES ===

  setServerData(serverData) {
  console.log('📡 [PokedexDataManager] Réception données serveur:', serverData);
  
  // Définir les Pokémon disponibles
  this.availablePokemonIds = serverData.availablePokemon || [];
  
  // Mettre à jour les stats basées sur les disponibles
  if (serverData.summary) {
    this.playerStats = {
      totalAvailable: serverData.summary.totalAvailable,
      totalSeen: serverData.summary.totalSeen,
      totalCaught: serverData.summary.totalCaught,
      seenPercentage: serverData.summary.seenPercentage,
      caughtPercentage: serverData.summary.caughtPercentage,
      totalShiny: serverData.summary.shinies?.count || 0,
      favoriteCount: 0, // À calculer localement
      lastActivity: new Date()
    };
  }
  
  // Réinitialiser avec les nouveaux Pokémon disponibles
  this.initializeAllPokemon();
  
  console.log(`✅ [PokedexDataManager] ${this.availablePokemonIds.length} Pokémon configurés sur le serveur`);
}
  /**
   * Obtenir tous les Pokémon avec leur statut
   */
// Dans PokedexDataManager.js, ligne ~206
getAllPokemonEntries(filters = {}) {
  const entries = [];
  
  // 🆕 UTILISER LES POKÉMON DISPONIBLES AU LIEU DE 1-151
  const availablePokemon = this.availablePokemonIds || [];
  
  if (availablePokemon.length === 0) {
    console.warn('⚠️ [PokedexDataManager] En attente des données serveur...');
    return [];
  }
  
  availablePokemon.forEach(pokemonId => {
    let pokemonData = this.pokemonData[pokemonId];
    const playerEntry = this.playerEntries.get(pokemonId);
    
    // Créer des données par défaut si manquantes
    if (!pokemonData) {
      pokemonData = {
        name: `Pokémon #${pokemonId.toString().padStart(3, '0')}`,
        description: 'Données non disponibles localement.'
      };
    }
    
    if (!playerEntry) {
      console.warn(`⚠️ [DEBUG] Pas d'entrée joueur pour Pokémon #${pokemonId}`);
      return;
    }
    
    // Appliquer les filtres
    if (filters.seen !== undefined && playerEntry.seen !== filters.seen) return;
    if (filters.caught !== undefined && playerEntry.caught !== filters.caught) return;
    if (filters.shiny !== undefined && playerEntry.shiny !== filters.shiny) return;
    if (filters.favorited !== undefined && playerEntry.favorited !== filters.favorited) return;
    
    // Filtres par type
    if (filters.types && filters.types.length > 0) {
      const pokemonTypes = this.pokemonTypes[pokemonId] || [];
      const hasMatchingType = filters.types.some(type => pokemonTypes.includes(type));
      if (!hasMatchingType) return;
    }
    
    // Filtre par nom/numéro
    if (filters.nameQuery) {
      const query = filters.nameQuery.toLowerCase();
      const name = pokemonData.name.toLowerCase();
      const number = pokemonId.toString();
      
      if (!name.includes(query) && !number.includes(query)) return;
    }
    
    // Créer l'entrée complète
    const entry = {
      ...playerEntry,
      pokemonData: {
        name: pokemonData.name,
        description: pokemonData.description,
        types: this.pokemonTypes[pokemonId] || ['normal'],
        generation: 1,
        region: 'kanto'
      },
      displayStatus: this.getDisplayStatus(playerEntry),
      sprite: this.getPokemonSprite(pokemonId, playerEntry),
      displayName: this.getDisplayName(pokemonId, playerEntry),
      displayNumber: this.getDisplayNumber(pokemonId, playerEntry)
    };
    
    entries.push(entry);
  });
  
  console.log(`✅ [PokedexDataManager] ${entries.length} entrées créées sur ${availablePokemon.length} disponibles`);
  return this.sortEntries(entries, filters.sortBy, filters.sortOrder);
}
  /**
   * Obtenir une entrée Pokémon spécifique
   */
  getPokemonEntry(pokemonId) {
    if (pokemonId < 1 || pokemonId > 151) return null;
    
    const pokemonData = this.pokemonData[pokemonId];
    const playerEntry = this.playerEntries.get(pokemonId);
    
    if (!pokemonData || !playerEntry) return null;
    
    return {
      ...playerEntry,
      pokemonData: {
        name: pokemonData.name,
        description: pokemonData.description,
        types: this.pokemonTypes[pokemonId] || ['normal'],
        generation: 1,
        region: 'kanto'
      },
      displayStatus: this.getDisplayStatus(playerEntry),
      sprite: this.getPokemonSprite(pokemonId, playerEntry),
      displayName: this.getDisplayName(pokemonId, playerEntry),
      displayNumber: this.getDisplayNumber(pokemonId, playerEntry)
    };
  }
  
  // === 🎨 LOGIQUE D'AFFICHAGE ===
  
  /**
   * Détermine comment afficher le Pokémon selon son statut
   */
  getDisplayStatus(playerEntry) {
    if (playerEntry.caught) return 'caught';      // Complet (couleur)
    if (playerEntry.seen) return 'seen';          // Vu (silhouette noire)
    return 'unknown';                             // Inconnu (?)
  }
  
  /**
   * Génère le sprite approprié selon le statut
   */
getPokemonSprite(pokemonId, playerEntry) {
  const paddedId = pokemonId.toString().padStart(3, '0');
  
if (playerEntry.caught) {
  // Pokémon capturé : sprite complet en couleur (shiny si applicable)
  const spriteFile = playerEntry.shiny ? 'shinyfront.png' : 'front.png';
  return `<img src="/assets/pokemon/${paddedId}/${spriteFile}" alt="${this.pokemonData[pokemonId]?.name}" 
          onerror="this.outerHTML='🎮'" class="pokemon-sprite captured ${playerEntry.shiny ? 'shiny' : ''}">`;
  } else if (playerEntry.seen) {
    // Pokémon vu : même sprite en silhouette CSS
    return `<img src="/assets/pokemon/${paddedId}/front.png" alt="Pokémon vu" 
            onerror="this.outerHTML='👤'" class="pokemon-sprite silhouette">`;
  } else {
    // Pokémon inconnu : point d'interrogation
    return `<div class="pokemon-sprite unknown">❓</div>`;
  }
}
  
  /**
   * Détermine le nom à afficher
   */
getDisplayName(pokemonId, playerEntry) {
  if (playerEntry.seen || playerEntry.caught) {
    return this.pokemonData[pokemonId]?.name || `Pokémon #${pokemonId}`;
  }
  return '???';  // ← Ça c'est correct, le nom reste masqué
}
  
  /**
   * Détermine le numéro à afficher
   */
getDisplayNumber(pokemonId, playerEntry) {
  // Toujours afficher le numéro, même pour les Pokémon inconnus
  return `#${pokemonId.toString().padStart(3, '0')}`;
}
  
  // === 📊 MISE À JOUR DES STATUTS ===
  
  /**
   * Marquer un Pokémon comme vu
   */
  markPokemonSeen(pokemonId, encounterData = {}) {
    if (pokemonId < 1 || pokemonId > 151) return false;
    
    const entry = this.playerEntries.get(pokemonId);
    if (!entry) return false;
    
    const wasAlreadySeen = entry.seen;
    
    // Mettre à jour le statut
    entry.seen = true;
    entry.timesEncountered = (entry.timesEncountered || 0) + 1;
    
    if (!entry.firstSeen) {
      entry.firstSeen = new Date();
    }
    
    // Ajouter les données de rencontre
    if (encounterData.level && encounterData.level > entry.bestLevel) {
      entry.bestLevel = encounterData.level;
    }
    
    if (encounterData.location && !entry.locations.includes(encounterData.location)) {
      entry.locations.push(encounterData.location);
    }
    
    this.playerEntries.set(pokemonId, entry);
    
    console.log(`👁️ [PokedexDataManager] #${pokemonId} marqué comme vu ${wasAlreadySeen ? '(déjà vu)' : '(nouveau)'}`);
    return !wasAlreadySeen; // Retourne true si c'est une nouvelle découverte
  }
  
  /**
   * Marquer un Pokémon comme capturé
   */
  markPokemonCaught(pokemonId, captureData = {}) {
    if (pokemonId < 1 || pokemonId > 151) return false;
    
    const entry = this.playerEntries.get(pokemonId);
    if (!entry) return false;
    
    const wasAlreadyCaught = entry.caught;
    
    // Marquer comme vu ET capturé
    entry.seen = true;
    entry.caught = true;
    
    if (!entry.firstSeen) {
      entry.firstSeen = new Date();
    }
    
    if (!entry.firstCaught) {
      entry.firstCaught = new Date();
    }
    
    // Données de capture
    if (captureData.level && captureData.level > entry.bestLevel) {
      entry.bestLevel = captureData.level;
    }
    
    if (captureData.location && !entry.locations.includes(captureData.location)) {
      entry.locations.push(captureData.location);
    }
    
    if (captureData.isShiny) {
      entry.shiny = true;
    }
    
    this.playerEntries.set(pokemonId, entry);
    
    console.log(`🎯 [PokedexDataManager] #${pokemonId} marqué comme capturé ${wasAlreadyCaught ? '(déjà capturé)' : '(nouvelle capture)'}`);
    return !wasAlreadyCaught; // Retourne true si c'est une nouvelle capture
  }
  
  /**
   * Toggle le statut favori
   */
  toggleFavorite(pokemonId) {
    if (pokemonId < 1 || pokemonId > 151) return false;
    
    const entry = this.playerEntries.get(pokemonId);
    if (!entry || !entry.seen) return false; // Peut pas favoriser un Pokémon pas vu
    
    entry.favorited = !entry.favorited;
    this.playerEntries.set(pokemonId, entry);
    
    console.log(`⭐ [PokedexDataManager] #${pokemonId} favori: ${entry.favorited}`);
    return entry.favorited;
  }
  
  // === 📈 STATISTIQUES ===
  
  /**
   * Calcule les statistiques du joueur
   */
  getPlayerStats() {
    let totalSeen = 0;
    let totalCaught = 0;
    let totalShiny = 0;
    let favoriteCount = 0;
    
    for (const entry of this.playerEntries.values()) {
      if (entry.seen) totalSeen++;
      if (entry.caught) totalCaught++;
      if (entry.shiny) totalShiny++;
      if (entry.favorited) favoriteCount++;
    }
    
    const seenPercentage = Math.round((totalSeen / 151) * 100);
    const caughtPercentage = Math.round((totalCaught / 151) * 100);
    
    return {
      totalSeen,
      totalCaught,
      totalShiny,
      favoriteCount,
      seenPercentage,
      caughtPercentage,
      totalPokemon: 151,
      lastActivity: new Date()
    };
  }
  
  /**
   * Obtient les Pokémon favoris
   */
  getFavoritesPokemon() {
    const favorites = [];
    
    for (const [pokemonId, entry] of this.playerEntries.entries()) {
      if (entry.favorited && entry.seen) {
        favorites.push(this.getPokemonEntry(pokemonId));
      }
    }
    
    return favorites.sort((a, b) => a.pokemonId - b.pokemonId);
  }
  
  // === 🔍 MÉTHODES DE RECHERCHE ===
  
  /**
   * Recherche par filtres avancés
   */
  searchPokemon(filters = {}) {
    return this.getAllPokemonEntries(filters);
  }
  
  /**
   * Trie les entrées selon les critères
   */
  sortEntries(entries, sortBy = 'id', sortOrder = 'asc') {
    const sorted = [...entries].sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'name':
          valueA = a.displayName.toLowerCase();
          valueB = b.displayName.toLowerCase();
          break;
        case 'level':
          valueA = a.bestLevel || 0;
          valueB = b.bestLevel || 0;
          break;
        case 'date_seen':
          valueA = a.firstSeen ? new Date(a.firstSeen) : new Date(0);
          valueB = b.firstSeen ? new Date(b.firstSeen) : new Date(0);
          break;
        case 'date_caught':
          valueA = a.firstCaught ? new Date(a.firstCaught) : new Date(0);
          valueB = b.firstCaught ? new Date(b.firstCaught) : new Date(0);
          break;
        case 'times_encountered':
          valueA = a.timesEncountered || 0;
          valueB = b.timesEncountered || 0;
          break;
        default: // 'id'
          valueA = a.pokemonId;
          valueB = b.pokemonId;
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }
  
  // === 🎨 UTILITAIRES ===
  
  /**
   * Obtient les types disponibles
   */
  getAllTypes() {
    return Object.keys(this.typeColors);
  }
  
  /**
   * Obtient la couleur d'un type
   */
  getTypeColor(type) {
    return this.typeColors[type] || '#68A090';
  }
  
  /**
   * Vérifie si les données sont chargées
   */
  isDataLoaded() {
    return this.isLoaded;
  }
  
  /**
   * Change la langue
   */
  async changeLanguage(language) {
    if (language === this.currentLanguage) return;
    
    this.currentLanguage = language;
    await this.loadPokemonData();
    console.log(`🌐 [PokedexDataManager] Langue changée vers: ${language}`);
  }
  
  // === 💾 IMPORT/EXPORT ===
  
  /**
   * Exporte les données du joueur
   */
  exportPlayerData() {
    const data = {};
    for (const [pokemonId, entry] of this.playerEntries.entries()) {
      if (entry.seen || entry.caught) {
        data[pokemonId] = { ...entry };
      }
    }
    return data;
  }
  
  /**
   * Importe les données du joueur
   */
  importPlayerData(data) {
    for (const [pokemonId, entry] of Object.entries(data)) {
      const id = parseInt(pokemonId);
      if (id >= 1 && id <= 151) {
        this.playerEntries.set(id, {
          ...this.playerEntries.get(id),
          ...entry,
          pokemonId: id
        });
      }
    }
    console.log('📥 [PokedexDataManager] Données joueur importées');
  }
}

// === 🏭 INSTANCE GLOBALE ===
export const pokedexDataManager = new PokedexDataManager();

export default PokedexDataManager;

console.log(`
📊 === POKÉDX DATA MANAGER COMPLET ===

🎯 FONCTIONNALITÉS PRINCIPALES:
• Gestion des 151 Pokémon de Kanto
• 3 statuts d'affichage: ?, silhouette, complet
• Localisation depuis tes fichiers JSON
• Types Pokémon avec couleurs
• Statistiques temps réel

📱 AFFICHAGE INTELLIGENT:
• Inconnu: ❓ + "???"
• Vu: Silhouette noire + nom
• Capturé: Sprite couleur + détails complets

🔍 RECHERCHE AVANCÉE:
• Par nom/numéro
• Par type(s)
• Par statut (vu/capturé/shiny/favori)
• Tri multi-critères

📊 STATISTIQUES:
• Taux de complétion temps réel
• Favoris et achievements
• Historique des rencontres

✅ PRÊT POUR TON MMO POKÉMON !
`);
