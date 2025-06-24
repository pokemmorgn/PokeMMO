// server/src/managers/BattleManager.ts
import { BattleState, BattlePokemon, BattleAction } from '../schema/BattleState';
import { getPokemonById, getPokemonData } from '../data/PokemonData';
import { PokemonManager } from './PokemonManager';
import { CaptureManager, CaptureAttempt } from './CaptureManager';
import { MoveManager, MoveData } from './MoveManager';
import { WildPokemon } from './EncounterManager';

export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  expGained: number;
  pokemonCaught?: boolean;
  captureResult?: any;
  battleLog: string[];
}

export class BattleManager {
  private battleState: BattleState;
  private pokemonManager: PokemonManager;

  constructor(battleState: BattleState) {
    this.battleState = battleState;
    this.pokemonManager = new PokemonManager();
  }

  // Initialiser un combat sauvage
  async initializeWildBattle(
    playerId: string,
    playerName: string,
    playerPokemonId: number,
    wildPokemon: WildPokemon,
    location: string
  ): Promise<void> {
    this.battleState.battleId = `wild_${Date.now()}_${playerId}`;
    this.battleState.battleType = "wild";
    this.battleState.player1Id = playerId;
    this.battleState.player1Name = playerName;
    this.battleState.player2Name = "Wild Pokémon";
    this.battleState.encounterLocation = location;
    this.battleState.phase = "intro";

    // Charger le Pokémon du joueur
    await this.setupPlayerPokemon(playerPokemonId);
    
    // Créer le Pokémon sauvage
    await this.setupWildPokemon(wildPokemon);

    // Déterminer qui commence (plus rapide en premier)
    this.determineTurnOrder();

    this.addBattleMessage(`Un ${this.battleState.player2Pokemon.name} sauvage apparaît !`);
    this.addBattleMessage(`Allez ${this.battleState.player1Pokemon.name} !`);
    
    this.battleState.phase = "battle";
    this.battleState.waitingForAction = true;
  }

  private async setupPlayerPokemon(pokemonId: number): Promise<void> {
    const pokemonData = await getPokemonById(pokemonId);
    if (!pokemonData) {
      throw new Error(`Pokémon ${pokemonId} non trouvé`);
    }

    const playerPokemon = new BattlePokemon();
    playerPokemon.pokemonId = pokemonId;
    playerPokemon.name = pokemonData.name;
    playerPokemon.level = 5; // À récupérer depuis les données du joueur
    playerPokemon.types.push(...pokemonData.types);
    playerPokemon.statusCondition = "normal";
    playerPokemon.isWild = false;

    // Calculer les stats
    const stats = this.calculateStats(pokemonData, playerPokemon.level);
    playerPokemon.maxHp = stats.hp;
    playerPokemon.currentHp = stats.hp;
    playerPokemon.attack = stats.attack;
    playerPokemon.defense = stats.defense;
    playerPokemon.specialAttack = stats.specialAttack;
    playerPokemon.specialDefense = stats.specialDefense;
    playerPokemon.speed = stats.speed;

    // Attaques (à récupérer depuis les données du joueur)
    const moves = pokemonData.learnset
      .filter(move => move.level <= playerPokemon.level)
      .slice(-4)
      .map(move => move.moveId);
    playerPokemon.moves.push(...moves);

    if (playerPokemon.moves.length === 0) {
      playerPokemon.moves.push("tackle");
    }

    this.battleState.player1Pokemon = playerPokemon;
  }

  private async setupWildPokemon(wildPokemon: WildPokemon): Promise<void> {
    const pokemonData = await getPokemonById(wildPokemon.pokemonId);
    if (!pokemonData) {
      throw new Error(`Pokémon sauvage ${wildPokemon.pokemonId} non trouvé`);
    }

    const wildBattlePokemon = new BattlePokemon();
    wildBattlePokemon.pokemonId = wildPokemon.pokemonId;
    wildBattlePokemon.name = pokemonData.name;
    wildBattlePokemon.level = wildPokemon.level;
    wildBattlePokemon.types.push(...pokemonData.types);
    wildBattlePokemon.statusCondition = "normal";
    wildBattlePokemon.isWild = true;
    wildBattlePokemon.gender = wildPokemon.gender;
    wildBattlePokemon.shiny = wildPokemon.shiny;

    // Calculer les stats avec IVs
    const stats = this.calculateStatsWithIVs(pokemonData, wildPokemon.level, wildPokemon.ivs);
    wildBattlePokemon.maxHp = stats.hp;
    wildBattlePokemon.currentHp = stats.hp;
    wildBattlePokemon.attack = stats.attack;
    wildBattlePokemon.defense = stats.defense;
    wildBattlePokemon.specialAttack = stats.specialAttack;
    wildBattlePokemon.specialDefense = stats.specialDefense;
    wildBattlePokemon.speed = stats.speed;

    wildBattlePokemon.moves.push(...wildPokemon.moves);

    this.battleState.player2Pokemon = wildBattlePokemon;
  }

  private calculateStats(pokemonData: any, level: number) {
    const calculateStat = (baseStat: number, isHP: boolean = false): number => {
      if (isHP) {
        return Math.floor(((2 * baseStat + 31) * level) / 100) + level + 10;
      } else {
        return Math.floor(((2 * baseStat + 31) * level) / 100) + 5;
      }
    };

    return {
      hp: calculateStat(pokemonData.baseStats.hp, true),
      attack: calculateStat(pokemonData.baseStats.attack),
      defense: calculateStat(pokemonData.baseStats.defense),
      specialAttack: calculateStat(pokemonData.baseStats.specialAttack),
      specialDefense: calculateStat(pokemonData.baseStats.specialDefense),
      speed: calculateStat(pokemonData.baseStats.speed)
    };
  }

  private calculateStatsWithIVs(pokemonData: any, level: number, ivs: any) {
    const calculateStat = (baseStat: number, iv: number, isHP: boolean = false): number => {
      if (isHP) {
        return Math.floor(((2 * baseStat + iv) * level) / 100) + level + 10;
      } else {
        return Math.floor(((2 * baseStat + iv) * level) / 100) + 5;
      }
    };

    return {
      hp: calculateStat(pokemonData.baseStats.hp, ivs.hp, true),
      attack: calculateStat(pokemonData.baseStats.attack, ivs.attack),
      defense: calculateStat(pokemonData.baseStats.defense, ivs.defense),
      specialAttack: calculateStat(pokemonData.baseStats.specialAttack, ivs.spAttack),
      specialDefense: calculateStat(pokemonData.baseStats.specialDefense, ivs.spDefense),
      speed: calculateStat(pokemonData.baseStats.speed, ivs.speed)
    };
  }

  private determineTurnOrder(): void {
    const player1Speed = this.battleState.player1Pokemon.speed;
    const player2Speed = this.battleState.player2Pokemon.speed;

    if (player1Speed > player2Speed) {
      this.battleState.currentTurn = "player1";
    } else if (player2Speed > player1Speed) {
      this.battleState.currentTurn = "player2";
    } else {
      // Égalité : aléatoire
      this.battleState.currentTurn = Math.random() < 0.5 ? "player1" : "player2";
    }
  }

  // Traiter une action de combat
  async processAction(action: BattleAction): Promise<void> {
    this.battleState.pendingActions.push(action);

    // Si c'est un combat sauvage, générer l'action de l'IA
    if (this.battleState.battleType === "wild" && this.battleState.pendingActions.length === 1) {
      const aiAction = this.generateAIAction();
      this.battleState.pendingActions.push(aiAction);
    }

    // Exécuter les actions quand on en a assez
    if (this.shouldExecuteActions()) {
      await this.executeActions();
    }
  }

  private shouldExecuteActions(): boolean {
    if (this.battleState.battleType === "wild") {
      return this.battleState.pendingActions.length >= 1; // Une seule action pour combat sauvage
    }
    return this.battleState.pendingActions.length >= 2; // Deux actions pour combat PvP
  }

  private generateAIAction(): BattleAction {
    const aiAction = new BattleAction();
    aiAction.type = "attack";
    aiAction.playerId = "ai";
    
    // Choisir une attaque aléatoirement
    const moves = Array.from(this.battleState.player2Pokemon.moves);
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    aiAction.data = JSON.stringify({
      moveId: randomMove,
      targetId: this.battleState.player1Id
    });

    // Définir la priorité et vitesse pour l'ordre d'action
    const moveData = MoveManager.getMoveData(randomMove);
    aiAction.priority = moveData?.priority || 0;
    aiAction.speed = this.battleState.player2Pokemon.speed;

    return aiAction;
  }

  private async executeActions(): Promise<void> {
    // Trier les actions par priorité puis par vitesse
    const sortedActions = Array.from(this.battleState.pendingActions).sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Priorité plus haute en premier
      }
      return b.speed - a.speed; // Vitesse plus haute en premier
    });

    // Exécuter chaque action
    for (const action of sortedActions) {
      if (this.battleState.battleEnded) break;
      
      await this.executeAction(action);
    }

    // Nettoyer les actions
    this.battleState.pendingActions.clear();

    // Vérifier les conditions de fin
    this.checkBattleEnd();

    if (!this.battleState.battleEnded) {
      this.battleState.turnNumber++;
      this.battleState.waitingForAction = true;
    }
  }

  private async executeAction(action: BattleAction): Promise<void> {
    const actionData = JSON.parse(action.data);

    switch (action.type) {
      case "attack":
        await this.executeAttack(action.playerId, actionData.moveId);
        break;
      case "item":
        await this.executeItemUse(action.playerId, actionData.itemId);
        break;
      case "run":
        await this.executeRun(action.playerId);
        break;
      case "switch":
        // À implémenter pour le changement de Pokémon
        break;
    }
  }

  private async executeAttack(attackerId: string, moveId: string): Promise<void> {
    const attacker = attackerId === this.battleState.player1Id 
      ? this.battleState.player1Pokemon 
      : this.battleState.player2Pokemon;
    
    const defender = attackerId === this.battleState.player1Id 
      ? this.battleState.player2Pokemon 
      : this.battleState.player1Pokemon;

    const moveData = MoveManager.getMoveData(moveId);
    if (!moveData) {
      this.addBattleMessage(`${attacker.name} ne peut pas utiliser cette attaque !`);
      return;
    }

    this.addBattleMessage(`${attacker.name} utilise ${moveData.name} !`);

    // Vérifier la précision
    if (!this.checkAccuracy(moveData.accuracy, attacker, defender)) {
      this.addBattleMessage(`L'attaque échoue !`);
      return;
    }

    // Calculer les dégâts
    if (moveData.category !== "Status") {
      const damage = this.calculateDamage(attacker, defender, moveData);
      defender.currentHp = Math.max(0, defender.currentHp - damage);
      
      if (damage > 0) {
        this.addBattleMessage(`${defender.name} subit ${damage} points de dégâts !`);
      }
    } else {
      // Attaque de statut
      this.applyStatusMove(attacker, defender, moveData);
    }

    // Appliquer les effets secondaires
    this.applyMoveEffects(attacker, defender, moveData);
  }

  private checkAccuracy(baseAccuracy: number, attacker: BattlePokemon, defender: BattlePokemon): boolean {
    // Modificateurs de précision/esquive
    const accuracyMod = Math.max(-6, Math.min(6, attacker.accuracyStage));
    const evasionMod = Math.max(-6, Math.min(6, defender.evasionStage));
    
    const accuracyMultiplier = accuracyMod > 0 ? (3 + accuracyMod) / 3 : 3 / (3 - accuracyMod);
    const evasionMultiplier = evasionMod > 0 ? 3 / (3 + evasionMod) : (3 - evasionMod) / 3;
    
    const finalAccuracy = baseAccuracy * accuracyMultiplier * evasionMultiplier;
    
    return Math.random() * 100 < finalAccuracy;
  }

  private calculateDamage(attacker: BattlePokemon, defender: BattlePokemon, moveData: MoveData): number {
    if (moveData.power === 0) return 0;

    // Stats d'attaque et de défense
    let attackStat = moveData.category === "Physical" ? attacker.attack : attacker.specialAttack;
    let defenseStat = moveData.category === "Physical" ? defender.defense : defender.specialDefense;

    // Modificateurs de stats
    const attackMod = moveData.category === "Physical" ? attacker.attackStage : attacker.specialAttackStage;
    const defenseMod = moveData.category === "Physical" ? defender.defenseStage : defender.specialDefenseStage;
    
    const attackMultiplier = attackMod > 0 ? (2 + attackMod) / 2 : 2 / (2 - attackMod);
    const defenseMultiplier = defenseMod > 0 ? 2 / (2 + defenseMod) : (2 - defenseMod) / 2;
    
    attackStat = Math.floor(attackStat * attackMultiplier);
    defenseStat = Math.floor(defenseStat * defenseMultiplier);

    // Formule de dégâts Pokémon simplifiée
    let damage = Math.floor(
      (((2 * attacker.level + 10) / 250) * (attackStat / defenseStat) * moveData.power + 2)
    );

    // Modificateur de type (STAB)
    if (attacker.types.includes(moveData.type)) {
      damage = Math.floor(damage * 1.5); // Same Type Attack Bonus
    }

    // Efficacité des types
    const effectiveness = this.getTypeEffectiveness(moveData.type, defender.types);
    damage = Math.floor(damage * effectiveness);

    if (effectiveness > 1) {
      this.addBattleMessage("C'est super efficace !");
    } else if (effectiveness < 1 && effectiveness > 0) {
      this.addBattleMessage("Ce n'est pas très efficace...");
    } else if (effectiveness === 0) {
      this.addBattleMessage("Ça n'affecte pas " + defender.name + " !");
    }

    // Coup critique (1/24 de chance)
    if (Math.random() < 1/24) {
      damage = Math.floor(damage * 1.5);
      this.addBattleMessage("Coup critique !");
    }

    // Variation aléatoire (85%-100%)
    damage = Math.floor(damage * (0.85 + Math.random() * 0.15));

    return Math.max(1, damage);
  }

  private getTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
    // Table d'efficacité des types simplifiée
    const typeChart: { [key: string]: { [key: string]: number } } = {
      "Normal": { "Rock": 0.5, "Ghost": 0, "Steel": 0.5 },
      "Fire": { "Fire": 0.5, "Water": 0.5, "Grass": 2, "Ice": 2, "Bug": 2, "Rock": 0.5, "Dragon": 0.5, "Steel": 2 },
      "Water": { "Fire": 2, "Water": 0.5, "Grass": 0.5, "Ground": 2, "Rock": 2, "Dragon": 0.5 },
      "Electric": { "Water": 2, "Electric": 0.5, "Grass": 0.5, "Ground": 0, "Flying": 2, "Dragon": 0.5 },
      "Grass": { "Fire": 0.5, "Water": 2, "Grass": 0.5, "Poison": 0.5, "Ground": 2, "Flying": 0.5, "Bug": 0.5, "Rock": 2, "Dragon": 0.5, "Steel": 0.5 },
      "Ice": { "Fire": 0.5, "Water": 0.5, "Grass": 2, "Ice": 0.5, "Ground": 2, "Flying": 2, "Dragon": 2, "Steel": 0.5 },
      "Fighting": { "Normal": 2, "Ice": 2, "Poison": 0.5, "Flying": 0.5, "Psychic": 0.5, "Bug": 0.5, "Rock": 2, "Ghost": 0, "Dark": 2, "Steel": 2 },
      "Poison": { "Grass": 2, "Poison": 0.5, "Ground": 0.5, "Rock": 0.5, "Ghost": 0.5, "Steel": 0 },
      "Ground": { "Fire": 2, "Electric": 2, "Grass": 0.5, "Poison": 2, "Flying": 0, "Bug": 0.5, "Rock": 2, "Steel": 2 },
      "Flying": { "Electric": 0.5, "Grass": 2, "Ice": 0.5, "Fighting": 2, "Bug": 2, "Rock": 0.5, "Steel": 0.5 },
      "Psychic": { "Fighting": 2, "Poison": 2, "Psychic": 0.5, "Dark": 0, "Steel": 0.5 },
      "Bug": { "Fire": 0.5, "Grass": 2, "Fighting": 0.5, "Poison": 0.5, "Flying": 0.5, "Psychic": 2, "Ghost": 0.5, "Dark": 2, "Steel": 0.5 },
      "Rock": { "Fire": 2, "Ice": 2, "Fighting": 0.5, "Ground": 0.5, "Flying": 2, "Bug": 2, "Steel": 0.5 },
      "Ghost": { "Normal": 0, "Psychic": 2, "Ghost": 2, "Dark": 0.5 },
      "Dragon": { "Dragon": 2, "Steel": 0.5 },
      "Dark": { "Fighting": 0.5, "Psychic": 2, "Ghost": 2, "Dark": 0.5 },
      "Steel": { "Fire": 0.5, "Water": 0.5, "Electric": 0.5, "Ice": 2, "Rock": 2, "Steel": 0.5 }
    };

    let effectiveness = 1;
    
    for (const defenderType of defenderTypes) {
      const matchup = typeChart[attackType]?.[defenderType];
      if (matchup !== undefined) {
        effectiveness *= matchup;
      }
    }

    return effectiveness;
  }

  private applyStatusMove(attacker: BattlePokemon, defender: BattlePokemon, moveData: MoveData): void {
    if (!moveData.effects) return;

    for (const effect of moveData.effects) {
      if (effect.includes("raises user's")) {
        this.applyStatChange(attacker, effect, 1);
      } else if (effect.includes("lowers target's")) {
        this.applyStatChange(defender, effect, -1);
      } else if (effect.includes("puts target to sleep")) {
        this.applyStatusCondition(defender, "sleep");
      } else if (effect.includes("paralyzes target")) {
        this.applyStatusCondition(defender, "paralysis");
      } else if (effect.includes("poisons target")) {
        this.applyStatusCondition(defender, "poison");
      } else if (effect.includes("confuses target")) {
        this.applyStatusCondition(defender, "confusion");
      }
    }
  }

  private applyStatChange(pokemon: BattlePokemon, effect: string, direction: number): void {
    let statChanged = false;
    
    if (effect.includes("Attack")) {
      pokemon.attackStage = Math.max(-6, Math.min(6, pokemon.attackStage + direction));
      statChanged = true;
    } else if (effect.includes("Defense")) {
      pokemon.defenseStage = Math.max(-6, Math.min(6, pokemon.defenseStage + direction));
      statChanged = true;
    } else if (effect.includes("Speed")) {
      pokemon.speedStage = Math.max(-6, Math.min(6, pokemon.speedStage + direction));
      statChanged = true;
    } else if (effect.includes("Special Attack")) {
      pokemon.specialAttackStage = Math.max(-6, Math.min(6, pokemon.specialAttackStage + direction));
      statChanged = true;
    } else if (effect.includes("Special Defense")) {
      pokemon.specialDefenseStage = Math.max(-6, Math.min(6, pokemon.specialDefenseStage + direction));
      statChanged = true;
    }

    if (statChanged) {
      const change = direction > 0 ? "augmente" : "diminue";
      this.addBattleMessage(`${pokemon.name} ${change} une statistique !`);
    }
  }

  private applyStatusCondition(pokemon: BattlePokemon, condition: string): void {
    if (pokemon.statusCondition !== "normal") {
      this.addBattleMessage(`${pokemon.name} a déjà un statut !`);
      return;
    }

    pokemon.statusCondition = condition;
    
    switch (condition) {
      case "sleep":
        this.addBattleMessage(`${pokemon.name} s'endort !`);
        break;
      case "paralysis":
        this.addBattleMessage(`${pokemon.name} est paralysé !`);
        break;
      case "poison":
        this.addBattleMessage(`${pokemon.name} est empoisonné !`);
        break;
      case "burn":
        this.addBattleMessage(`${pokemon.name} est brûlé !`);
        break;
      case "freeze":
        this.addBattleMessage(`${pokemon.name} est gelé !`);
        break;
      case "confusion":
        this.addBattleMessage(`${pokemon.name} est confus !`);
        break;
    }
  }

  private applyMoveEffects(attacker: BattlePokemon, defender: BattlePokemon, moveData: MoveData): void {
    if (!moveData.effects) return;

    for (const effect of moveData.effects) {
      if (effect.includes("% chance")) {
        const chanceMatch = effect.match(/(\d+)%/);
        if (chanceMatch) {
          const chance = parseInt(chanceMatch[1]);
          if (Math.random() * 100 < chance) {
            if (effect.includes("paralyze")) {
              this.applyStatusCondition(defender, "paralysis");
            } else if (effect.includes("poison")) {
              this.applyStatusCondition(defender, "poison");
            } else if (effect.includes("burn")) {
              this.applyStatusCondition(defender, "burn");
            } else if (effect.includes("freeze")) {
              this.applyStatusCondition(defender, "freeze");
            } else if (effect.includes("confuse")) {
              this.applyStatusCondition(defender, "confusion");
            }
          }
        }
      } else if (effect.includes("heals user")) {
        const healAmount = Math.floor(defender.currentHp * 0.5); // 50% des dégâts infligés
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
        if (healAmount > 0) {
          this.addBattleMessage(`${attacker.name} récupère ${healAmount} PV !`);
        }
      }
    }
  }

  private async executeItemUse(playerId: string, itemId: string): Promise<void> {
    if (playerId !== this.battleState.player1Id) {
      this.addBattleMessage("Seul le joueur peut utiliser des objets !");
      return;
    }

    // Vérifier si c'est une Poké Ball
    if (itemId.includes("ball")) {
      await this.attemptCapture(itemId);
    } else {
      // Autres objets (potions, etc.)
      this.addBattleMessage(`${this.battleState.player1Name} utilise ${itemId} !`);
      // Logique pour les objets de soin à implémenter
    }
  }

  private async attemptCapture(ballType: string): Promise<void> {
    if (this.battleState.battleType !== "wild") {
      this.addBattleMessage("Vous ne pouvez pas capturer le Pokémon d'un autre dresseur !");
      return;
    }

    this.addBattleMessage(`${this.battleState.player1Name} lance une ${ballType} !`);
    
    const captureAttempt: CaptureAttempt = {
      pokemonId: this.battleState.player2Pokemon.pokemonId,
      pokemonLevel: this.battleState.player2Pokemon.level,
      currentHp: this.battleState.player2Pokemon.currentHp,
      maxHp: this.battleState.player2Pokemon.maxHp,
      statusCondition: this.battleState.player2Pokemon.statusCondition,
      ballType: ballType,
      location: this.battleState.encounterLocation
    };

    const pokemonData = await getPokemonById(this.battleState.player2Pokemon.pokemonId);
    const captureResult = CaptureManager.calculateCaptureRate(captureAttempt, pokemonData);

    // Animation de capture
    this.addBattleMessage("*Boing*");
    
    // Simuler les secousses
    for (let i = 0; i < captureResult.shakeCount; i++) {
      this.addBattleMessage("*Clic*");
    }

    if (captureResult.success) {
      this.addBattleMessage(`Gotcha ! ${this.battleState.player2Pokemon.name} a été capturé !`);
      this.battleState.pokemonCaught = true;
      this.battleState.battleEnded = true;
      this.battleState.winner = this.battleState.player1Id;
      this.battleState.phase = "victory";
    } else {
      this.addBattleMessage(`Oh non ! ${this.battleState.player2Pokemon.name} s'est échappé !`);
    }
  }

  private async executeRun(playerId: string): Promise<void> {
    if (playerId !== this.battleState.player1Id) {
      return;
    }

    if (!this.battleState.canRun) {
      this.addBattleMessage("Impossible de fuir !");
      return;
    }

    // Calcul de réussite de fuite (simplifiée)
    const playerSpeed = this.battleState.player1Pokemon.speed;
    const opponentSpeed = this.battleState.player2Pokemon.speed;
    
    let escapeChance = 50; // Base 50%
    if (playerSpeed > opponentSpeed) {
      escapeChance = 100; // Garanti si plus rapide
    } else if (playerSpeed < opponentSpeed) {
      escapeChance = 25; // Réduit si plus lent
    }

    if (Math.random() * 100 < escapeChance) {
      this.addBattleMessage(`${this.battleState.player1Name} prend la fuite !`);
      this.battleState.battleEnded = true;
      this.battleState.phase = "fled";
    } else {
      this.addBattleMessage("Impossible de fuir !");
    }
  }

  private checkBattleEnd(): void {
    if (this.battleState.battleEnded) return;

    // Vérifier si un Pokémon est KO
    if (this.battleState.player1Pokemon.currentHp <= 0) {
      this.addBattleMessage(`${this.battleState.player1Pokemon.name} est KO !`);
      this.battleState.battleEnded = true;
      this.battleState.winner = this.battleState.player2Id || "opponent";
      this.battleState.phase = "defeat";
    } else if (this.battleState.player2Pokemon.currentHp <= 0) {
      this.addBattleMessage(`${this.battleState.player2Pokemon.name} est KO !`);
      this.battleState.battleEnded = true;
      this.battleState.winner = this.battleState.player1Id;
      this.battleState.phase = "victory";
      
      // Calculer l'XP gagnée
      this.battleState.expGained = this.calculateExpGain();
      this.addBattleMessage(`${this.battleState.player1Pokemon.name} gagne ${this.battleState.expGained} points d'expérience !`);
    }
  }

  private calculateExpGain(): number {
    const baseExp = 64; // Base d'expérience du Pokémon sauvage
    const level = this.battleState.player2Pokemon.level;
    const isWild = this.battleState.player2Pokemon.isWild;
    
    let exp = Math.floor((baseExp * level) / 7);
    
    if (isWild) {
      exp = Math.floor(exp * 1.0); // Pas de multiplicateur pour les sauvages
    }
    
    return Math.max(1, exp);
  }

  private addBattleMessage(message: string): void {
    this.battleState.battleLog.push(message);
    this.battleState.lastMessage = message;
    
    // Limiter le log à 50 messages
    if (this.battleState.battleLog.length > 50) {
      this.battleState.battleLog.splice(0, this.battleState.battleLog.length - 50);
    }
  }

  // Appliquer les effets de fin de tour (poison, brûlure, etc.)
  processEndOfTurnEffects(): void {
    this.processStatusEffects(this.battleState.player1Pokemon);
    this.processStatusEffects(this.battleState.player2Pokemon);
  }

  private processStatusEffects(pokemon: BattlePokemon): void {
    switch (pokemon.statusCondition) {
      case "poison":
        const poisonDamage = Math.floor(pokemon.maxHp / 8);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - poisonDamage);
        this.addBattleMessage(`${pokemon.name} souffre du poison et perd ${poisonDamage} PV !`);
        break;
        
      case "burn":
        const burnDamage = Math.floor(pokemon.maxHp / 16);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - burnDamage);
        this.addBattleMessage(`${pokemon.name} souffre de la brûlure et perd ${burnDamage} PV !`);
        break;
        
      case "sleep":
        // Chance de se réveiller (simplifié)
        if (Math.random() < 0.33) {
          pokemon.statusCondition = "normal";
          this.addBattleMessage(`${pokemon.name} se réveille !`);
        }
        break;
    }
  }

  getBattleResult(): BattleResult {
    return {
      winner: this.battleState.winner === this.battleState.player1Id ? 'player' : 'opponent',
      expGained: this.battleState.expGained,
      pokemonCaught: this.battleState.pokemonCaught,
      battleLog: Array.from(this.battleState.battleLog)
    };
  }
}
