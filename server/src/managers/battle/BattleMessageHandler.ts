// server/src/managers/battle/BattleMessageHandler.ts
// Gestionnaire centralisé des messages de combat avec IDs pour localisation

import { 
  PokemonMessageCategory, 
  PokemonMessage, 
  BattlePokemonData,
  EffectivenessMultiplier,
  BATTLE_TIMINGS 
} from './types/BattleTypes';

export interface MessageTemplate {
  id: string;
  category: PokemonMessageCategory;
  template: string;
  variables: string[];
  timing: number;
  priority: number;
  sound?: string;
  animation?: string;
}

export interface MessageContext {
  pokemon?: string;
  move?: string;
  item?: string;
  trainer?: string;
  trainerName?: string;  // ✅ AJOUT manquant
  target?: string;
  damage?: number;
  effectiveness?: EffectivenessMultiplier;
  weather?: string;
  ability?: string;
  status?: string;
  level?: number;
  ballType?: string;
  shakeCount?: number;
  money?: number;
  hp?: number;           // ✅ AJOUT pour les soins
}

export class BattleMessageHandler {
  
  // === TEMPLATES DE MESSAGES ===
  
  private static readonly MESSAGE_TEMPLATES: MessageTemplate[] = [
    
    // === DÉBUT/FIN DE COMBAT ===
    {
      id: "MSG_WILD_POKEMON_APPEARS",
      category: "battle_start",
      template: "Un {pokemon} sauvage apparaît !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 100,
      sound: "wild_encounter",
      animation: "pokemon_entrance"
    },
    {
      id: "MSG_TRAINER_WANTS_BATTLE",
      category: "trainer_intro", 
      template: "Le {trainer} {trainerName} veut se battre !",
      variables: ["trainer", "trainerName"],
      timing: BATTLE_TIMINGS.BATTLE_START,
      priority: 100,
      sound: "trainer_encounter"
    },
    {
      id: "MSG_TRAINER_SENDS_OUT",
      category: "pokemon_switch",
      template: "{trainerName} envoie {pokemon} !",
      variables: ["trainerName", "pokemon"],
      timing: BATTLE_TIMINGS.POKEMON_SWITCH,
      priority: 90,
      sound: "pokeball_open",
      animation: "pokemon_entrance"
    },
    {
      id: "MSG_GO_POKEMON", 
      category: "pokemon_switch",
      template: "Vas-y, {pokemon} !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.POKEMON_SWITCH,
      priority: 90,
      sound: "pokeball_open",
      animation: "pokemon_entrance"
    },
    
    // === ATTAQUES ===
    {
      id: "MSG_POKEMON_USES_MOVE",
      category: "attack_use",
      template: "{pokemon} utilise {move} !",
      variables: ["pokemon", "move"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 80,
      sound: "move_select"
    },
    {
      id: "MSG_ENEMY_POKEMON_USES_MOVE",
      category: "attack_use", 
      template: "{pokemon} ennemi utilise {move} !",
      variables: ["pokemon", "move"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 80,
      sound: "enemy_move"
    },
    {
      id: "MSG_MOVE_MISSED",
      category: "attack_miss",
      template: "{pokemon} rate son attaque !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 75,
      sound: "move_miss"
    },
    {
      id: "MSG_MOVE_FAILED",
      category: "attack_miss",
      template: "Mais cela échoue !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 75,
      sound: "move_fail"
    },
    
    // === EFFICACITÉ DES TYPES ===
    {
      id: "MSG_SUPER_EFFECTIVE",
      category: "attack_effect",
      template: "C'est super efficace !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 70,
      sound: "super_effective"
    },
    {
      id: "MSG_EFFECTIVE",
      category: "attack_effect",
      template: "C'est efficace !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 65,
      sound: "effective"
    },
    {
      id: "MSG_NOT_VERY_EFFECTIVE",
      category: "attack_effect",
      template: "Ce n'est pas très efficace...",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 60,
      sound: "not_effective"
    },
    {
      id: "MSG_BARELY_EFFECTIVE",
      category: "attack_effect",
      template: "Ce n'est vraiment pas efficace...",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 60,
      sound: "barely_effective"
    },
    {
      id: "MSG_NO_EFFECT",
      category: "attack_effect",
      template: "Ça n'a aucun effet...",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 65,
      sound: "no_effect"
    },
    
    // === COUPS CRITIQUES ET DÉGÂTS ===
    {
      id: "MSG_CRITICAL_HIT",
      category: "attack_critical",
      template: "Coup critique !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 85,
      sound: "critical_hit",
      animation: "critical_flash"
    },
    {
      id: "MSG_HUGE_DAMAGE",
      category: "damage_dealt",
      template: "Ça fait très mal !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 50
    },
    {
      id: "MSG_POKEMON_WILL_FAINT",
      category: "damage_dealt",
      template: "Un coup de plus et c'est fini !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 50
    },
    
    // === STATUTS ===
    {
      id: "MSG_POKEMON_POISONED",
      category: "status_inflicted",
      template: "{pokemon} est empoisonné !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 60,
      sound: "poison",
      animation: "poison_bubble"
    },
    {
      id: "MSG_POKEMON_BURNED",
      category: "status_inflicted",
      template: "{pokemon} est brûlé !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 60,
      sound: "burn",
      animation: "burn_flame"
    },
    {
      id: "MSG_POKEMON_PARALYZED",
      category: "status_inflicted",
      template: "{pokemon} est paralysé !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 60,
      sound: "paralysis",
      animation: "paralysis_spark"
    },
    {
      id: "MSG_POKEMON_FROZEN",
      category: "status_inflicted",
      template: "{pokemon} est gelé !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 60,
      sound: "freeze",
      animation: "freeze_ice"
    },
    {
      id: "MSG_POKEMON_ASLEEP",
      category: "status_inflicted",
      template: "{pokemon} s'endort !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 60,
      sound: "sleep",
      animation: "sleep_zzz"
    },
    {
      id: "MSG_POKEMON_CONFUSED",
      category: "status_inflicted",
      template: "{pokemon} est confus !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 60,
      sound: "confusion",
      animation: "confusion_stars"
    },
    
    // === DÉGÂTS DE STATUT ===
    {
      id: "MSG_POISON_DAMAGE",
      category: "status_damage",
      template: "{pokemon} souffre du poison !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 40,
      sound: "poison_damage"
    },
    {
      id: "MSG_BURN_DAMAGE",
      category: "status_damage",
      template: "{pokemon} souffre de sa brûlure !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 40,
      sound: "burn_damage"
    },
    {
      id: "MSG_PARALYSIS_PREVENTS",
      category: "status_damage",
      template: "{pokemon} est paralysé ! Il ne peut pas attaquer !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 50,
      sound: "paralysis_prevent"
    },
    {
      id: "MSG_POKEMON_WAKES_UP",
      category: "status_healed",
      template: "{pokemon} se réveille !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 45,
      sound: "wake_up"
    },
    {
      id: "MSG_POKEMON_THAWED",
      category: "status_healed",
      template: "{pokemon} dégèle !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 45,
      sound: "thaw"
    },
    
    // === K.O. ===
    {
      id: "MSG_POKEMON_FAINTED",
      category: "pokemon_faint",
      template: "{pokemon} est K.O. !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 95,
      sound: "faint",
      animation: "pokemon_faint"
    },
    {
      id: "MSG_ENEMY_POKEMON_FAINTED",
      category: "pokemon_faint",
      template: "{pokemon} ennemi est K.O. !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 95,
      sound: "enemy_faint",
      animation: "pokemon_faint"
    },
    
    // === CHANGEMENT DE POKÉMON ===
    {
      id: "MSG_POKEMON_RECALL",
      category: "pokemon_switch",
      template: "Ça suffit, {pokemon} ! Reviens !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.POKEMON_SWITCH,
      priority: 70,
      sound: "pokeball_recall",
      animation: "pokemon_recall"
    },
    {
      id: "MSG_TRAINER_RECALLS",
      category: "pokemon_switch",
      template: "{trainerName} rappelle {pokemon} !",
      variables: ["trainerName", "pokemon"],
      timing: BATTLE_TIMINGS.POKEMON_SWITCH,
      priority: 70,
      sound: "trainer_recall"
    },
    
    // === OBJETS ===
    {
      id: "MSG_TRAINER_USES_ITEM",
      category: "item_use",
      template: "{trainer} utilise {item} !",
      variables: ["trainer", "item"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 75,
      sound: "item_use"
    },
    {
      id: "MSG_POTION_USED",
      category: "item_use",
      template: "{pokemon} récupère {hp} PV !",
      variables: ["pokemon", "hp"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 70,
      sound: "heal",
      animation: "heal_sparkle"
    },
    
    // === CAPTURE ===
    {
      id: "MSG_THROW_POKEBALL",
      category: "capture_attempt",
      template: "{trainer} lance {ballType} !",
      variables: ["trainer", "ballType"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 90,
      sound: "pokeball_throw",
      animation: "ball_throw"
    },
    {
      id: "MSG_POKEBALL_BOUNCE",
      category: "capture_attempt",
      template: "*Boing*",
      variables: [],
      timing: BATTLE_TIMINGS.CAPTURE_BOUNCE,
      priority: 80,
      sound: "ball_bounce",
      animation: "ball_bounce"
    },
    {
      id: "MSG_POKEBALL_SHAKE",
      category: "capture_attempt",
      template: "*Clic*",
      variables: [],
      timing: BATTLE_TIMINGS.CAPTURE_SHAKE,
      priority: 80,
      sound: "ball_shake",
      animation: "ball_shake"
    },
    {
      id: "MSG_POKEMON_CAUGHT",
      category: "capture_success",
      template: "Gotcha ! {pokemon} a été capturé !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.BATTLE_END,
      priority: 100,
      sound: "capture_success",
      animation: "capture_success"
    },
    {
      id: "MSG_CRITICAL_CAPTURE",
      category: "capture_success",
      template: "Capture critique !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 95,
      sound: "critical_capture",
      animation: "critical_capture"
    },
    {
      id: "MSG_POKEMON_ESCAPED",
      category: "capture_fail",
      template: "Mince ! {pokemon} s'est échappé !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 85,
      sound: "capture_fail",
      animation: "capture_fail"
    },
    {
      id: "MSG_POKEMON_BROKE_FREE",
      category: "capture_fail",
      template: "{pokemon} sort de la Ball !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 85,
      sound: "break_free",
      animation: "break_free"
    },
    
    // === FUITE ===
    {
      id: "MSG_CANT_ESCAPE",
      category: "flee_attempt",
      template: "Impossible de fuir !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 60,
      sound: "cant_escape"
    },
    {
      id: "MSG_ESCAPED_SAFELY",
      category: "flee_success",
      template: "Vous prenez la fuite avec succès !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 80,
      sound: "escape_success"
    },
    {
      id: "MSG_WILD_POKEMON_FLED",
      category: "flee_success",
      template: "{pokemon} sauvage prend la fuite !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 80,
      sound: "wild_flee"
    },
    
    // === CAPACITÉS SPÉCIALES ===
    {
      id: "MSG_ABILITY_ACTIVATED",
      category: "ability_trigger",
      template: "{ability} de {pokemon} s'active !",
      variables: ["ability", "pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 65,
      sound: "ability_activate"
    },
    {
      id: "MSG_INTIMIDATE_ACTIVATED",
      category: "ability_trigger",
      template: "{pokemon} intimide l'adversaire !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 70,
      sound: "intimidate",
      animation: "intimidate_effect"
    },
    {
      id: "MSG_STATIC_PARALYSIS",
      category: "ability_trigger",
      template: "Statik de {pokemon} paralyse l'adversaire !",
      variables: ["pokemon"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 65,
      sound: "static_effect",
      animation: "paralysis_spark"
    },
    
    // === MÉTÉO ET TERRAIN ===
    {
      id: "MSG_WEATHER_SUNNY",
      category: "weather_change",
      template: "Le soleil brille intensément !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 55,
      sound: "sunny_weather",
      animation: "sun_effect"
    },
    {
      id: "MSG_WEATHER_RAIN",
      category: "weather_change",
      template: "Il commence à pleuvoir !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 55,
      sound: "rain_weather",
      animation: "rain_effect"
    },
    {
      id: "MSG_WEATHER_SANDSTORM",
      category: "weather_change",
      template: "Une tempête de sable se lève !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 55,
      sound: "sandstorm_weather",
      animation: "sandstorm_effect"
    },
    {
      id: "MSG_WEATHER_BOOST",
      category: "weather_change",
      template: "L'attaque est renforcée par la météo !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 50,
      sound: "weather_boost"
    },
    {
      id: "MSG_WEATHER_WEAKEN",
      category: "weather_change",
      template: "L'attaque est affaiblie par la météo !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 50,
      sound: "weather_weaken"
    },
    
    // === DRESSEURS ===
    {
      id: "MSG_TRAINER_DEFEATED",
      category: "trainer_defeat",
      template: "{trainerName} n'a plus de Pokémon ! {trainerName} est vaincu !",
      variables: ["trainerName"],
      timing: BATTLE_TIMINGS.BATTLE_END,
      priority: 100,
      sound: "trainer_defeated"
    },
    {
      id: "MSG_PLAYER_DEFEATED",
      category: "trainer_defeat",
      template: "Vous n'avez plus de Pokémon ! Vous êtes vaincu !",
      variables: [],
      timing: BATTLE_TIMINGS.BATTLE_END,
      priority: 100,
      sound: "player_defeated"
    },
    {
      id: "MSG_PRIZE_MONEY",
      category: "battle_end",
      template: "Vous gagnez {money}₽ !",
      variables: ["money"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 90,
      sound: "money_earned",
      animation: "money_sparkle"
    },
    
    // === SYSTÈME ===
    {
      id: "MSG_TURN_START",
      category: "turn_info",
      template: "Que voulez-vous faire ?",
      variables: [],
      timing: BATTLE_TIMINGS.TURN_TRANSITION,
      priority: 30
    },
    {
      id: "MSG_WAITING_FOR_OPPONENT",
      category: "turn_info",
      template: "En attente de l'adversaire...",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 20
    },
    {
      id: "MSG_BATTLE_INTERRUPTED",
      category: "battle_end",
      template: "Le combat a été interrompu !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 95,
      sound: "battle_interrupted"
    },
    
    // === AUTRES EFFETS ===
    {
      id: "MSG_STATUS_MOVE_USED",
      category: "attack_use",
      template: "{pokemon} utilise {move} !",
      variables: ["pokemon", "move"],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 70
    },
    {
      id: "MSG_ITEM_EFFECT",
      category: "item_use",
      template: "L'objet tenu renforce l'attaque !",
      variables: [],
      timing: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 50,
      sound: "item_boost"
    }
  ];
  
  // === MÉTHODES PRINCIPALES ===
  
  /**
   * Génère un message formaté avec contexte
   */
  static generateMessage(
    messageId: string, 
    context: MessageContext = {}
  ): PokemonMessage | null {
    const template = this.MESSAGE_TEMPLATES.find(t => t.id === messageId);
    if (!template) {
      console.warn(`[BattleMessageHandler] Template non trouvé: ${messageId}`);
      return null;
    }
    
    // Formater le template avec les variables
    let formattedMessage = template.template;
    const providedVariables: { [key: string]: string | number } = {};
    
    template.variables.forEach(variable => {
      const value = context[variable as keyof MessageContext];
      if (value !== undefined) {
        const stringValue = String(value);
        formattedMessage = formattedMessage.replace(`{${variable}}`, stringValue);
        providedVariables[variable] = stringValue;
      } else {
        console.warn(`[BattleMessageHandler] Variable manquante: ${variable} pour ${messageId}`);
        formattedMessage = formattedMessage.replace(`{${variable}}`, `[${variable}]`);
        providedVariables[variable] = `[${variable}]`;
      }
    });
    
    return {
      id: messageId,
      category: template.category,
      template: formattedMessage,
      variables: providedVariables,
      priority: template.priority,
      timing: template.timing
    };
  }
  
  /**
   * Génère une séquence de messages pour une attaque complète
   */
  static generateAttackSequence(
    attackerName: string,
    moveName: string,
    effectiveness: EffectivenessMultiplier,
    isCritical: boolean,
    isEnemyAttack: boolean = false
  ): PokemonMessage[] {
    const messages: PokemonMessage[] = [];
    
    // 1. Message d'utilisation de l'attaque
    const useMessageId = isEnemyAttack ? "MSG_ENEMY_POKEMON_USES_MOVE" : "MSG_POKEMON_USES_MOVE";
    const useMessage = this.generateMessage(useMessageId, {
      pokemon: attackerName,
      move: moveName
    });
    if (useMessage) messages.push(useMessage);
    
    // 2. Message de coup critique si applicable
    if (isCritical) {
      const critMessage = this.generateMessage("MSG_CRITICAL_HIT");
      if (critMessage) messages.push(critMessage);
    }
    
    // 3. Message d'efficacité si applicable
    if (effectiveness === 4) {
      const effMessage = this.generateMessage("MSG_SUPER_EFFECTIVE");
      if (effMessage) messages.push(effMessage);
    } else if (effectiveness === 2) {
      const effMessage = this.generateMessage("MSG_EFFECTIVE");
      if (effMessage) messages.push(effMessage);
    } else if (effectiveness === 0.5) {
      const effMessage = this.generateMessage("MSG_NOT_VERY_EFFECTIVE");
      if (effMessage) messages.push(effMessage);
    } else if (effectiveness === 0.25) {
      const effMessage = this.generateMessage("MSG_BARELY_EFFECTIVE");
      if (effMessage) messages.push(effMessage);
    } else if (effectiveness === 0) {
      const effMessage = this.generateMessage("MSG_NO_EFFECT");
      if (effMessage) messages.push(effMessage);
    }
    
    return messages;
  }
  
  /**
   * Génère une séquence de capture complète
   */
  static generateCaptureSequence(
    trainerName: string,
    ballType: string,
    pokemonName: string,
    shakeCount: number,
    success: boolean,
    criticalCapture: boolean = false
  ): PokemonMessage[] {
    const messages: PokemonMessage[] = [];
    
    // 1. Lancer de Ball
    const throwMessage = this.generateMessage("MSG_THROW_POKEBALL", {
      trainer: trainerName,
      ballType: ballType
    });
    if (throwMessage) messages.push(throwMessage);
    
    // 2. Rebond
    const bounceMessage = this.generateMessage("MSG_POKEBALL_BOUNCE");
    if (bounceMessage) messages.push(bounceMessage);
    
    // 3. Secousses
    for (let i = 0; i < shakeCount; i++) {
      const shakeMessage = this.generateMessage("MSG_POKEBALL_SHAKE");
      if (shakeMessage) messages.push(shakeMessage);
    }
    
    // 4. Résultat
    if (success) {
      if (criticalCapture) {
        const critMessage = this.generateMessage("MSG_CRITICAL_CAPTURE");
        if (critMessage) messages.push(critMessage);
      }
      
      const successMessage = this.generateMessage("MSG_POKEMON_CAUGHT", {
        pokemon: pokemonName
      });
      if (successMessage) messages.push(successMessage);
    } else {
      const failMessage = this.generateMessage("MSG_POKEMON_ESCAPED", {
        pokemon: pokemonName
      });
      if (failMessage) messages.push(failMessage);
    }
    
    return messages;
  }
  
  /**
   * Génère une séquence de changement de Pokémon
   */
  static generateSwitchSequence(
    trainerName: string,
    oldPokemonName: string,
    newPokemonName: string,
    isPlayerSwitch: boolean = true
  ): PokemonMessage[] {
    const messages: PokemonMessage[] = [];
    
    // 1. Rappel
    if (isPlayerSwitch) {
      const recallMessage = this.generateMessage("MSG_POKEMON_RECALL", {
        pokemon: oldPokemonName
      });
      if (recallMessage) messages.push(recallMessage);
    } else {
      const trainerRecallMessage = this.generateMessage("MSG_TRAINER_RECALLS", {
        trainerName: trainerName,
        pokemon: oldPokemonName
      });
      if (trainerRecallMessage) messages.push(trainerRecallMessage);
    }
    
    // 2. Envoi nouveau Pokémon
    if (isPlayerSwitch) {
      const sendMessage = this.generateMessage("MSG_GO_POKEMON", {
        pokemon: newPokemonName
      });
      if (sendMessage) messages.push(sendMessage);
    } else {
      const trainerSendMessage = this.generateMessage("MSG_TRAINER_SENDS_OUT", {
        trainerName: trainerName,
        pokemon: newPokemonName
      });
      if (trainerSendMessage) messages.push(trainerSendMessage);
    }
    
    return messages;
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Obtient le template d'un message
   */
  static getTemplate(messageId: string): MessageTemplate | null {
    return this.MESSAGE_TEMPLATES.find(t => t.id === messageId) || null;
  }
  
  /**
   * Obtient tous les messages d'une catégorie
   */
  static getMessagesByCategory(category: PokemonMessageCategory): MessageTemplate[] {
    return this.MESSAGE_TEMPLATES.filter(t => t.category === category);
  }
  
  /**
   * Valide qu'un message a toutes ses variables
   */
  static validateMessage(messageId: string, context: MessageContext): boolean {
    const template = this.getTemplate(messageId);
    if (!template) return false;
    
    return template.variables.every(variable => {
      return context[variable as keyof MessageContext] !== undefined;
    });
  }
  
  /**
   * Obtient la durée totale d'une séquence de messages
   */
  static getSequenceDuration(messages: PokemonMessage[]): number {
    return messages.reduce((total, message) => total + message.timing, 0);
  }
  
  /**
   * Trie les messages par priorité
   */
  static sortMessagesByPriority(messages: PokemonMessage[]): PokemonMessage[] {
    return [...messages].sort((a, b) => b.priority - a.priority);
  }
  
  // === DEBUG ET TESTS ===
  
  /**
   * Liste tous les IDs de messages disponibles
   */
  static getAllMessageIds(): string[] {
    return this.MESSAGE_TEMPLATES.map(t => t.id);
  }
  
  /**
   * Teste la génération de messages
   */
  static runMessageTests(): void {
    console.log("🧪 [BattleMessageHandler] === TESTS DE MESSAGES ===");
    
    // Test message simple
    const simpleMessage = this.generateMessage("MSG_WILD_POKEMON_APPEARS", {
      pokemon: "Pikachu"
    });
    
    if (simpleMessage && simpleMessage.template === "Un Pikachu sauvage apparaît !") {
      console.log("✅ Test message simple réussi");
    } else {
      console.error("❌ Test message simple échoué");
    }
    
    // Test séquence d'attaque
    const attackSequence = this.generateAttackSequence(
      "Pikachu", 
      "Éclair", 
      4, // Super efficace
      true, // Critique
      false // Pas ennemi
    );
    
    if (attackSequence.length >= 3) {
      console.log("✅ Test séquence d'attaque réussi");
      console.log(`   Messages: ${attackSequence.map(m => m.id).join(" → ")}`);
    } else {
      console.error("❌ Test séquence d'attaque échoué");
    }
    
    // Test séquence de capture
    const captureSequence = this.generateCaptureSequence(
      "Dresseur",
      "Poké Ball",
      "Pikachu",
      3, // 3 secousses
      true, // Succès
      false // Pas critique
    );
    
    if (captureSequence.length >= 5) {
      console.log("✅ Test séquence de capture réussi");
      console.log(`   Messages: ${captureSequence.map(m => m.id).join(" → ")}`);
    } else {
      console.error("❌ Test séquence de capture échoué");
    }
    
    console.log(`📊 [BattleMessageHandler] ${this.MESSAGE_TEMPLATES.length} messages disponibles`);
    console.log(`📋 [BattleMessageHandler] Catégories: ${new Set(this.MESSAGE_TEMPLATES.map(t => t.category)).size}`);
  }
  
  /**
   * Debug d'un message spécifique
   */
  static debugMessage(messageId: string, context: MessageContext = {}): void {
    console.log(`🔍 [BattleMessageHandler] === DEBUG ${messageId} ===`);
    
    const template = this.getTemplate(messageId);
    if (!template) {
      console.error(`❌ Template non trouvé: ${messageId}`);
      return;
    }
    
    console.log(`📝 Template: ${template.template}`);
    console.log(`🏷️ Catégorie: ${template.category}`);
    console.log(`⏱️ Timing: ${template.timing}ms`);
    console.log(`🔢 Priorité: ${template.priority}`);
    console.log(`📋 Variables: ${template.variables.join(", ")}`);
    
    if (template.sound) console.log(`🔊 Son: ${template.sound}`);
    if (template.animation) console.log(`🎬 Animation: ${template.animation}`);
    
    const generated = this.generateMessage(messageId, context);
    if (generated) {
      console.log(`✅ Message généré: "${generated.template}"`);
    } else {
      console.error(`❌ Échec génération message`);
    }
  }
  
  /**
   * Affiche les statistiques des messages
   */
  static getMessageStats(): void {
    console.log("📊 [BattleMessageHandler] === STATISTIQUES ===");
    
    const categories = new Map<string, number>();
    let totalTiming = 0;
    let withSound = 0;
    let withAnimation = 0;
    
    this.MESSAGE_TEMPLATES.forEach(template => {
      // Compter par catégorie
      categories.set(template.category, (categories.get(template.category) || 0) + 1);
      
      // Timing total
      totalTiming += template.timing;
      
      // Effets
      if (template.sound) withSound++;
      if (template.animation) withAnimation++;
    });
    
    console.log(`📝 Total messages: ${this.MESSAGE_TEMPLATES.length}`);
    console.log(`⏱️ Timing moyen: ${Math.round(totalTiming / this.MESSAGE_TEMPLATES.length)}ms`);
    console.log(`🔊 Avec son: ${withSound}/${this.MESSAGE_TEMPLATES.length} (${Math.round(withSound * 100 / this.MESSAGE_TEMPLATES.length)}%)`);
    console.log(`🎬 Avec animation: ${withAnimation}/${this.MESSAGE_TEMPLATES.length} (${Math.round(withAnimation * 100 / this.MESSAGE_TEMPLATES.length)}%)`);
    
    console.log("\n📋 Par catégorie:");
    Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count} messages`);
      });
  }
}

// === FONCTIONS UTILITAIRES GLOBALES ===

/**
 * Fonction rapide pour générer un message
 */
export function createBattleMessage(
  messageId: string, 
  context: MessageContext = {}
): PokemonMessage | null {
  return BattleMessageHandler.generateMessage(messageId, context);
}

/**
 * Fonction rapide pour une séquence d'attaque
 */
export function createAttackMessages(
  attackerName: string,
  moveName: string,
  effectiveness: EffectivenessMultiplier,
  isCritical: boolean = false,
  isEnemyAttack: boolean = false
): PokemonMessage[] {
  return BattleMessageHandler.generateAttackSequence(
    attackerName, 
    moveName, 
    effectiveness, 
    isCritical, 
    isEnemyAttack
  );
}

/**
 * Fonction rapide pour une séquence de capture
 */
export function createCaptureMessages(
  trainerName: string,
  ballType: string,
  pokemonName: string,
  shakeCount: number,
  success: boolean,
  criticalCapture: boolean = false
): PokemonMessage[] {
  return BattleMessageHandler.generateCaptureSequence(
    trainerName,
    ballType,
    pokemonName,
    shakeCount,
    success,
    criticalCapture
  );
}

/**
 * Fonction rapide pour une séquence de switch
 */
export function createSwitchMessages(
  trainerName: string,
  oldPokemonName: string,
  newPokemonName: string,
  isPlayerSwitch: boolean = true
): PokemonMessage[] {
  return BattleMessageHandler.generateSwitchSequence(
    trainerName,
    oldPokemonName,
    newPokemonName,
    isPlayerSwitch
  );
}

// === CONSTANTES EXPORTÉES ===

export const MESSAGE_CATEGORIES = {
  BATTLE_START: "battle_start",
  BATTLE_END: "battle_end",
  ATTACK_USE: "attack_use",
  ATTACK_EFFECT: "attack_effect",
  ATTACK_MISS: "attack_miss",
  ATTACK_CRITICAL: "attack_critical",
  DAMAGE_DEALT: "damage_dealt",
  STATUS_INFLICTED: "status_inflicted",
  STATUS_DAMAGE: "status_damage",
  STATUS_HEALED: "status_healed",
  POKEMON_FAINT: "pokemon_faint",
  POKEMON_SWITCH: "pokemon_switch",
  ITEM_USE: "item_use",
  CAPTURE_ATTEMPT: "capture_attempt",
  CAPTURE_SUCCESS: "capture_success",
  CAPTURE_FAIL: "capture_fail",
  FLEE_ATTEMPT: "flee_attempt",
  FLEE_SUCCESS: "flee_success",
  TRAINER_INTRO: "trainer_intro",
  TRAINER_DEFEAT: "trainer_defeat",
  ABILITY_TRIGGER: "ability_trigger",
  WEATHER_CHANGE: "weather_change",
  TURN_INFO: "turn_info"
} as const;

export const PRIORITY_LEVELS = {
  CRITICAL: 100,     // Messages critiques (victoire, défaite)
  HIGH: 80,          // Messages importants (attaques, K.O.)
  MEDIUM: 60,        // Messages normaux (statuts, effets)
  LOW: 40,           // Messages secondaires (dégâts continus)
  SYSTEM: 20         // Messages système
} as const;

// === TESTS AUTOMATIQUES ===

if (process.env.NODE_ENV === 'development') {
  BattleMessageHandler.runMessageTests();
  BattleMessageHandler.getMessageStats();
}

export default BattleMessageHandler;
