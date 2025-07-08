// client/src/battle/BattleTranslator.js
// Système de traduction complet pour les combats Pokémon - VERSION ES6

/**
 * 🌍 TRADUCTIONS COMPLÈTES DES ÉVÉNEMENTS DE COMBAT
 * Chaque fonction reçoit (data, myPlayerId) et retourne le texte traduit
 */
const BATTLE_TRANSLATIONS = {
  
  // === FRANÇAIS ===
  'fr': {
    // 🎬 Début de combat
    'wildPokemonAppears': (data) => `Un ${data.pokemonName} sauvage apparaît !`,
    'pokemonSentOut': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `Allez-y ${data.pokemonName} !`;
      } else {
        return `L'adversaire envoie ${data.pokemonName} !`;
      }
    },

    // ⚔️ Actions de combat
    'moveUsed': (data) => `${data.pokemonName} utilise ${data.moveName} !`,
    
    'damageDealt': (data, myPlayerId) => {
      if (data.targetPlayerId === myPlayerId) {
        return `Votre Pokémon perd ${data.damage} HP !`;
      } else {
        return `${data.pokemonName} perd ${data.damage} HP !`;
      }
    },

    // 💥 Effets spéciaux
    'criticalHit': () => `Coup critique !`,
    'superEffective': () => `C'est super efficace !`,
    'notVeryEffective': () => `Ce n'est pas très efficace...`,
    'noEffect': () => `Ça n'a aucun effet !`,

    // 💀 KO et conséquences
    'pokemonFainted': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `Votre Pokémon est K.O. !`;
      } else {
        return `${data.pokemonName} est K.O. !`;
      }
    },

    'expGained': (data) => `${data.pokemonName} gagne ${data.exp} points d'expérience !`,
    'levelUp': (data) => `${data.pokemonName} monte au niveau ${data.newLevel} !`,

    // 🌟 Effets de statut
    'statusParalyzed': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Votre Pokémon' : data.pokemonName;
      return `${pokemonRef} est paralysé ! Il ne peut pas attaquer !`;
    },
    
    'statusPoisoned': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Votre Pokémon' : data.pokemonName;
      return `${pokemonRef} est empoisonné !`;
    },
    
    'statusBurned': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Votre Pokémon' : data.pokemonName;
      return `${pokemonRef} est brûlé !`;
    },
    
    'statusAsleep': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Votre Pokémon' : data.pokemonName;
      return `${pokemonRef} dort profondément !`;
    },
    
    'statusFrozen': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Votre Pokémon' : data.pokemonName;
      return `${pokemonRef} est gelé !`;
    },

    'statusCured': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Votre Pokémon' : data.pokemonName;
      return `${pokemonRef} est guéri !`;
    },

    // 🎒 Objets
    'itemUsed': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `Vous utilisez ${data.itemName} !`;
      } else {
        return `L'adversaire utilise ${data.itemName} !`;
      }
    },

    // 🏃 Fuite
    'cantEscape': () => `Impossible de fuir !`,
    'escapedSuccessfully': () => `Vous vous échappez avec succès !`,
    'pokemonFled': (data) => `${data.pokemonName} sauvage s'enfuit !`,

    // 💰 Récompenses
    'moneyGained': (data) => `Vous gagnez ${data.amount} ¥ !`,

    // 🎮 Interface (pas de message, juste pour référence)
    'yourTurn': () => null,
    'opponentTurn': () => `L'adversaire réfléchit...`,
    'selectMove': () => `Choisissez une attaque.`,
    'selectItem': () => `Choisissez un objet.`,
    'selectPokemon': () => `Choisissez un Pokémon.`,

    // 🏁 Fin de combat
    'battleEnd': (data, myPlayerId) => {
      if (data.winnerId === myPlayerId) {
        return `Vous avez gagné !`;
      } else if (data.winnerId === null) {
        return `Combat nul !`;
      } else {
        return `Vous avez perdu !`;
      }
    }
  },

  // === ANGLAIS ===
  'en': {
    // 🎬 Début de combat
    'wildPokemonAppears': (data) => `A wild ${data.pokemonName} appeared!`,
    'pokemonSentOut': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `Go! ${data.pokemonName}!`;
      } else {
        return `Foe sent out ${data.pokemonName}!`;
      }
    },

    // ⚔️ Actions de combat
    'moveUsed': (data) => `${data.pokemonName} used ${data.moveName}!`,
    
    'damageDealt': (data, myPlayerId) => {
      if (data.targetPlayerId === myPlayerId) {
        return `Your Pokémon lost ${data.damage} HP!`;
      } else {
        return `${data.pokemonName} lost ${data.damage} HP!`;
      }
    },

    // 💥 Effets spéciaux
    'criticalHit': () => `A critical hit!`,
    'superEffective': () => `It's super effective!`,
    'notVeryEffective': () => `It's not very effective...`,
    'noEffect': () => `It had no effect!`,

    // 💀 KO et conséquences
    'pokemonFainted': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `Your Pokémon fainted!`;
      } else {
        return `${data.pokemonName} fainted!`;
      }
    },

    'expGained': (data) => `${data.pokemonName} gained ${data.exp} EXP. Points!`,
    'levelUp': (data) => `${data.pokemonName} grew to level ${data.newLevel}!`,

    // 🌟 Effets de statut
    'statusParalyzed': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Your Pokémon' : data.pokemonName;
      return `${pokemonRef} is paralyzed! It can't move!`;
    },
    
    'statusPoisoned': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Your Pokémon' : data.pokemonName;
      return `${pokemonRef} was poisoned!`;
    },
    
    'statusBurned': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Your Pokémon' : data.pokemonName;
      return `${pokemonRef} was burned!`;
    },
    
    'statusAsleep': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Your Pokémon' : data.pokemonName;
      return `${pokemonRef} is fast asleep!`;
    },
    
    'statusFrozen': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Your Pokémon' : data.pokemonName;
      return `${pokemonRef} is frozen solid!`;
    },

    'statusCured': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Your Pokémon' : data.pokemonName;
      return `${pokemonRef} was cured!`;
    },

    // 🎒 Objets
    'itemUsed': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `You used ${data.itemName}!`;
      } else {
        return `Foe used ${data.itemName}!`;
      }
    },

    // 🏃 Fuite
    'cantEscape': () => `Can't escape!`,
    'escapedSuccessfully': () => `Got away safely!`,
    'pokemonFled': (data) => `Wild ${data.pokemonName} fled!`,

    // 💰 Récompenses
    'moneyGained': (data) => `You got ¥${data.amount}!`,

    // 🎮 Interface
    'yourTurn': () => null,
    'opponentTurn': () => `Foe is thinking...`,
    'selectMove': () => `Choose a move.`,
    'selectItem': () => `Choose an item.`,
    'selectPokemon': () => `Choose a Pokémon.`,

    // 🏁 Fin de combat
    'battleEnd': (data, myPlayerId) => {
      if (data.winnerId === myPlayerId) {
        return `You won!`;
      } else if (data.winnerId === null) {
        return `It's a draw!`;
      } else {
        return `You lost!`;
      }
    }
  },

  // === ESPAGNOL ===
  'es': {
    // 🎬 Début de combat
    'wildPokemonAppears': (data) => `¡Un ${data.pokemonName} salvaje apareció!`,
    'pokemonSentOut': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `¡Ve, ${data.pokemonName}!`;
      } else {
        return `¡El rival envía a ${data.pokemonName}!`;
      }
    },

    // ⚔️ Actions de combat
    'moveUsed': (data) => `¡${data.pokemonName} usó ${data.moveName}!`,
    
    'damageDealt': (data, myPlayerId) => {
      if (data.targetPlayerId === myPlayerId) {
        return `¡Tu Pokémon perdió ${data.damage} PS!`;
      } else {
        return `¡${data.pokemonName} perdió ${data.damage} PS!`;
      }
    },

    // 💥 Effets spéciaux
    'criticalHit': () => `¡Golpe crítico!`,
    'superEffective': () => `¡Es súper eficaz!`,
    'notVeryEffective': () => `No es muy eficaz...`,
    'noEffect': () => `¡No tuvo ningún efecto!`,

    // 💀 KO et conséquences
    'pokemonFainted': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `¡Tu Pokémon se debilitó!`;
      } else {
        return `¡${data.pokemonName} se debilitó!`;
      }
    },

    'expGained': (data) => `¡${data.pokemonName} ganó ${data.exp} puntos de experiencia!`,
    'levelUp': (data) => `¡${data.pokemonName} subió al nivel ${data.newLevel}!`,

    // 🌟 Effets de statut
    'statusParalyzed': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Tu Pokémon' : data.pokemonName;
      return `¡${pokemonRef} está paralizado! ¡No se puede mover!`;
    },
    
    'statusPoisoned': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Tu Pokémon' : data.pokemonName;
      return `¡${pokemonRef} fue envenenado!`;
    },
    
    'statusBurned': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Tu Pokémon' : data.pokemonName;
      return `¡${pokemonRef} fue quemado!`;
    },
    
    'statusAsleep': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Tu Pokémon' : data.pokemonName;
      return `¡${pokemonRef} está profundamente dormido!`;
    },
    
    'statusFrozen': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Tu Pokémon' : data.pokemonName;
      return `¡${pokemonRef} está congelado!`;
    },

    'statusCured': (data, myPlayerId) => {
      const pokemonRef = data.playerId === myPlayerId ? 'Tu Pokémon' : data.pokemonName;
      return `¡${pokemonRef} fue curado!`;
    },

    // 🎒 Objets
    'itemUsed': (data, myPlayerId) => {
      if (data.playerId === myPlayerId) {
        return `¡Usaste ${data.itemName}!`;
      } else {
        return `¡El rival usó ${data.itemName}!`;
      }
    },

    // 🏃 Fuite
    'cantEscape': () => `¡No puedes escapar!`,
    'escapedSuccessfully': () => `¡Escapaste con éxito!`,
    'pokemonFled': (data) => `¡${data.pokemonName} salvaje huyó!`,

    // 💰 Récompenses
    'moneyGained': (data) => `¡Ganaste ${data.amount} ¥!`,

    // 🎮 Interface
    'yourTurn': () => null,
    'opponentTurn': () => `El rival está pensando...`,
    'selectMove': () => `Elige un movimiento.`,
    'selectItem': () => `Elige un objeto.`,
    'selectPokemon': () => `Elige un Pokémon.`,

    // 🏁 Fin de combat
    'battleEnd': (data, myPlayerId) => {
      if (data.winnerId === myPlayerId) {
        return `¡Ganaste!`;
      } else if (data.winnerId === null) {
        return `¡Empate!`;
      } else {
        return `¡Perdiste!`;
      }
    }
  }
};

/**
 * 🌍 CLASSE TRADUCTEUR DE COMBAT
 */
class BattleTranslator {
  constructor(myPlayerId) {
    this.myPlayerId = myPlayerId;
    this.language = this.detectLanguage();
    this.fallbackLanguage = 'en';
    
    console.log(`🌍 [BattleTranslator] Langue détectée: ${this.language}, Joueur: ${myPlayerId}`);
  }

  /**
   * Détecte la langue du navigateur
   */
  detectLanguage() {
    const navLang = navigator.language.slice(0, 2).toLowerCase();
    const supportedLanguages = Object.keys(BATTLE_TRANSLATIONS);
    
    // Vérifier si la langue est supportée
    if (supportedLanguages.includes(navLang)) {
      return navLang;
    }
    
    // Fallback vers anglais
    console.warn(`[BattleTranslator] Langue ${navLang} non supportée, utilisation de l'anglais`);
    return 'en';
  }

  /**
   * Traduit un événement de combat
   * @param {string} eventType - Type d'événement (ex: 'damageDealt')
   * @param {object} data - Données de l'événement
   * @returns {string|null} - Texte traduit ou null si pas de message
   */
  translate(eventType, data = {}) {
    try {
      // Récupérer la table de traduction pour la langue
      const langTable = BATTLE_TRANSLATIONS[this.language] || BATTLE_TRANSLATIONS[this.fallbackLanguage];
      
      if (!langTable) {
        console.error(`[BattleTranslator] Aucune traduction trouvée pour ${this.language}`);
        return `[${eventType}]`;
      }

      // Récupérer la fonction de traduction pour cet événement
      const translator = langTable[eventType];
      
      if (!translator) {
        console.warn(`[BattleTranslator] Traduction manquante: ${eventType} pour ${this.language}`);
        return `[${eventType}]`; // Mode debug
      }

      // Exécuter la traduction
      const result = translator(data, this.myPlayerId);
      
      if (result === null) {
        // Événement sans message (ex: yourTurn)
        return null;
      }

      return result;

    } catch (error) {
      console.error(`[BattleTranslator] Erreur traduction ${eventType}:`, error);
      return `[ERREUR: ${eventType}]`;
    }
  }

  /**
   * Change la langue du traducteur
   * @param {string} newLanguage - Code langue (ex: 'fr', 'en', 'es')
   */
  setLanguage(newLanguage) {
    if (BATTLE_TRANSLATIONS[newLanguage]) {
      this.language = newLanguage;
      console.log(`🌍 [BattleTranslator] Langue changée vers: ${newLanguage}`);
    } else {
      console.warn(`[BattleTranslator] Langue ${newLanguage} non supportée`);
    }
  }

  /**
   * Met à jour l'ID du joueur (utile pour les reconnexions)
   * @param {string} newPlayerId - Nouvel ID du joueur
   */
  setPlayerId(newPlayerId) {
    this.myPlayerId = newPlayerId;
    console.log(`🎮 [BattleTranslator] Player ID mis à jour: ${newPlayerId}`);
  }

  /**
   * Retourne les langues supportées
   * @returns {string[]} - Liste des codes de langues
   */
  getSupportedLanguages() {
    return Object.keys(BATTLE_TRANSLATIONS);
  }

  /**
   * Mode debug - affiche toutes les traductions pour un événement
   * @param {string} eventType - Type d'événement
   * @param {object} data - Données de test
   */
  debugEvent(eventType, data = {}) {
    console.log(`🔍 [BattleTranslator] Debug événement: ${eventType}`);
    
    Object.keys(BATTLE_TRANSLATIONS).forEach(lang => {
      const translator = BATTLE_TRANSLATIONS[lang][eventType];
      if (translator) {
        const result = translator(data, this.myPlayerId);
        console.log(`  ${lang}: "${result}"`);
      } else {
        console.log(`  ${lang}: [MANQUANT]`);
      }
    });
  }
}

// ✅ EXPORT ES6 POUR MODULES
export { BattleTranslator, BATTLE_TRANSLATIONS };

console.log('🌍 [BattleTranslator] Module de traduction chargé - Langues:', Object.keys(BATTLE_TRANSLATIONS));
