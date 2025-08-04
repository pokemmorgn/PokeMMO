// server/src/items/ItemEffectProcessor.ts - MOTEUR D'EXÉCUTION DES EFFETS D'ITEMS
import { 
  ItemEffect, ItemAction, ItemCondition, ItemEffectContext, 
  EffectTrigger, ConditionType, ActionType 
} from './ItemEffectTypes';

export interface EffectProcessResult {
  success: boolean;
  message?: string;
  effects_applied: Array<{
    action_type: ActionType;
    target: string;
    value: any;
    success: boolean;
    message?: string;
  }>;
  side_effects?: any[];
  consumed_item?: boolean;
  errors?: string[];
}

export class ItemEffectProcessor {
  private static logPrefix = "[ItemEffectProcessor]";
  
  private static log = {
    debug: (msg: string, ...args: any[]) => console.debug(`${ItemEffectProcessor.logPrefix} ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => console.info(`${ItemEffectProcessor.logPrefix} ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`${ItemEffectProcessor.logPrefix} ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`${ItemEffectProcessor.logPrefix} ${msg}`, ...args)
  };

  // ===== MÉTHODE PRINCIPALE =====

  /**
   * Traite tous les effets d'un item
   */
  static async processItemEffects(
    effects: ItemEffect[], 
    trigger: EffectTrigger,
    context: ItemEffectContext
  ): Promise<EffectProcessResult[]> {
    this.log.debug(`Processing item effects for trigger: ${trigger}`);
    
    const results: EffectProcessResult[] = [];
    
    // Filtrer les effets par trigger et les trier par priorité
    const relevantEffects = effects
      .filter(effect => effect.trigger === trigger)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    this.log.debug(`Found ${relevantEffects.length} relevant effects`);
    
    for (const effect of relevantEffects) {
      try {
        const result = await this.processEffect(effect, context);
        results.push(result);
        
        // Si l'effet a échoué et est critique, arrêter le traitement
        if (!result.success && effect.priority && effect.priority > 100) {
          this.log.warn(`Critical effect failed, stopping processing: ${effect.id}`);
          break;
        }
      } catch (error) {
        this.log.error(`Error processing effect ${effect.id}:`, error);
        results.push({
          success: false,
          effects_applied: [],
          errors: [`Failed to process effect: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }
    
    return results;
  }

  /**
   * Traite un effet individuel
   */
  static async processEffect(
    effect: ItemEffect, 
    context: ItemEffectContext
  ): Promise<EffectProcessResult> {
    this.log.debug(`Processing effect: ${effect.id} (${effect.name || 'unnamed'})`);
    
    const result: EffectProcessResult = {
      success: false,
      effects_applied: [],
      side_effects: []
    };
    
    try {
      // 1. Vérifier les conditions
      if (effect.conditions && effect.conditions.length > 0) {
        const conditionsCheck = await this.checkConditions(effect.conditions, context);
        if (!conditionsCheck.success) {
          this.log.debug(`Effect ${effect.id} conditions not met: ${conditionsCheck.reason}`);
          return {
            success: false,
            effects_applied: [],
            message: conditionsCheck.reason
          };
        }
      }
      
      // 2. Vérifier les restrictions d'utilisation
      const restrictionCheck = this.checkUsageRestrictions(effect, context);
      if (!restrictionCheck.allowed) {
        this.log.debug(`Effect ${effect.id} usage restricted: ${restrictionCheck.reason}`);
        return {
          success: false,
          effects_applied: [],
          message: restrictionCheck.reason
        };
      }
      
      // 3. Exécuter les actions
      const actionResults = await this.executeActions(effect.actions, context);
      
      // 4. Compiler les résultats
      result.success = actionResults.some((ar: any) => ar.success);
      result.effects_applied = actionResults;
      result.consumed_item = actionResults.some((ar: any) => ar.consumed_item);
      
      // 5. Messages de résultat
      if (result.success) {
        result.message = this.generateSuccessMessage(effect, actionResults);
      } else {
        result.message = this.generateFailureMessage(effect, actionResults);
      }
      
      this.log.info(`Effect ${effect.id} processed: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
      
    } catch (error) {
      this.log.error(`Error in processEffect for ${effect.id}:`, error);
      result.success = false;
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }
    
    return result;
  }

  // ===== VÉRIFICATION DES CONDITIONS =====

  /**
   * Vérifie toutes les conditions d'un effet
   */
  static async checkConditions(
    conditions: ItemCondition[], 
    context: ItemEffectContext
  ): Promise<{ success: boolean; reason?: string }> {
    for (const condition of conditions) {
      const check = await this.checkCondition(condition, context);
      if (!check.success) {
        return { success: false, reason: check.reason };
      }
    }
    return { success: true };
  }

  /**
   * Vérifie une condition individuelle
   */
  static async checkCondition(
    condition: ItemCondition, 
    context: ItemEffectContext
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      let result = false;
      let reason = '';
      
      switch (condition.type) {
        // === CONDITIONS POKÉMON ===
        case 'pokemon_species':
          result = this.checkPokemonSpecies(condition, context);
          reason = `Pokemon species check failed`;
          break;
          
        case 'pokemon_type':
          result = this.checkPokemonType(condition, context);
          reason = `Pokemon type check failed`;
          break;
          
        case 'pokemon_level':
          result = this.checkPokemonLevel(condition, context);
          reason = `Pokemon level check failed`;
          break;
          
        case 'pokemon_ability':
          result = this.checkPokemonAbility(condition, context);
          reason = `Pokemon ability check failed`;
          break;
          
        case 'pokemon_gender':
          result = this.checkPokemonGender(condition, context);
          reason = `Pokemon gender check failed`;
          break;
          
        case 'pokemon_nature':
          result = this.checkPokemonNature(condition, context);
          reason = `Pokemon nature check failed`;
          break;
          
        case 'pokemon_friendship':
          result = this.checkPokemonFriendship(condition, context);
          reason = `Pokemon friendship check failed`;
          break;
          
        // === CONDITIONS STATS ===
        case 'stat_value':
          result = this.checkStatValue(condition, context);
          reason = `Stat value check failed`;
          break;
          
        case 'hp_percentage':
          result = this.checkHPPercentage(condition, context);
          reason = `HP percentage check failed`;
          break;
          
        case 'hp_value':
          result = this.checkHPValue(condition, context);
          reason = `HP value check failed`;
          break;
          
        // === CONDITIONS STATUS ===
        case 'has_status':
          result = this.checkHasStatus(condition, context);
          reason = `Status condition check failed`;
          break;
          
        case 'has_no_status':
          result = this.checkHasNoStatus(condition, context);
          reason = `No status condition check failed`;
          break;
          
        // === CONDITIONS COMBAT ===
        case 'battle_type':
          result = this.checkBattleType(condition, context);
          reason = `Battle type check failed`;
          break;
          
        case 'move_type':
          result = this.checkMoveType(condition, context);
          reason = `Move type check failed`;
          break;
          
        case 'super_effective':
          result = this.checkSuperEffective(condition, context);
          reason = `Super effective check failed`;
          break;
          
        // === CONDITIONS ENVIRONNEMENT ===
        case 'weather_active':
          result = this.checkWeatherActive(condition, context);
          reason = `Weather check failed`;
          break;
          
        case 'terrain_active':
          result = this.checkTerrainActive(condition, context);
          reason = `Terrain check failed`;
          break;
          
        case 'time_of_day':
          result = this.checkTimeOfDay(condition, context);
          reason = `Time of day check failed`;
          break;
          
        case 'location':
          result = this.checkLocation(condition, context);
          reason = `Location check failed`;
          break;
          
        // === CONDITIONS SPÉCIALES ===
        case 'random_chance':
          result = this.checkRandomChance(condition, context);
          reason = `Random chance check failed`;
          break;
          
        case 'first_use':
          result = this.checkFirstUse(condition, context);
          reason = `First use check failed`;
          break;
          
        case 'held_item':
          result = this.checkHeldItem(condition, context);
          reason = `Held item check failed`;
          break;
          
        default:
          this.log.warn(`Unknown condition type: ${condition.type}`);
          return { success: false, reason: `Unknown condition type: ${condition.type}` };
      }
      
      // Appliquer la négation si demandée
      if (condition.negate) {
        result = !result;
      }
      
      // Appliquer la probabilité si spécifiée
      if (result && condition.probability && condition.probability < 1) {
        result = Math.random() < condition.probability;
        if (!result) reason = `Probability check failed (${condition.probability})`;
      }
      
      return { success: result, reason: result ? undefined : reason };
      
    } catch (error) {
      this.log.error(`Error checking condition ${condition.type}:`, error);
      return { success: false, reason: `Condition check error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  }

  // ===== MÉTHODES DE VÉRIFICATION SPÉCIFIQUES =====

  private static checkPokemonSpecies(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const species = context.pokemon.species;
    if (condition.values) {
      return condition.values.includes(species);
    }
    return species === condition.value;
  }

  private static checkPokemonType(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon?.types) return false;
    
    const types = context.pokemon.types;
    if (condition.values) {
      return condition.values.some((type: string) => types.includes(type));
    }
    return types.includes(condition.value);
  }

  private static checkPokemonLevel(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const level = context.pokemon.level;
    return this.compareValue(level, condition);
  }

  private static checkPokemonAbility(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const ability = context.pokemon.ability;
    if (condition.values) {
      return condition.values.includes(ability);
    }
    return ability === condition.value;
  }

  private static checkPokemonGender(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const gender = (context.pokemon as any).gender;
    return gender === condition.value;
  }

  private static checkPokemonNature(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const nature = (context.pokemon as any).nature;
    return nature === condition.value;
  }

  private static checkPokemonFriendship(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const friendship = (context.pokemon as any).friendship || 0;
    return this.compareValue(friendship, condition);
  }

  private static checkStatValue(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon?.stats) return false;
    
    const statName = (condition as any).stat || condition.value;
    const statValue = context.pokemon.stats[statName];
    if (statValue === undefined) return false;
    
    return this.compareValue(statValue, condition);
  }

  private static checkHPPercentage(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const hpPercent = (context.pokemon.hp / context.pokemon.max_hp) * 100;
    return this.compareValue(hpPercent, condition);
  }

  private static checkHPValue(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    return this.compareValue(context.pokemon.hp, condition);
  }

  private static checkHasStatus(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    const status = context.pokemon.status;
    if (!status) return false;
    
    if (condition.values) {
      return condition.values.includes(status);
    }
    return status === condition.value;
  }

  private static checkHasNoStatus(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.pokemon) return false;
    
    return !context.pokemon.status;
  }

  private static checkBattleType(condition: ItemCondition, context: ItemEffectContext): boolean {
    if (!context.battle) return false;
    
    const battleType = context.battle.type;
    if (condition.values) {
      return condition.values.includes(battleType);
    }
    return battleType === condition.value;
  }

  private static checkMoveType(condition: ItemCondition, context: ItemEffectContext): boolean {
    const moveType = (context as any).move?.type;
    if (!moveType) return false;
    
    if (condition.values) {
      return condition.values.includes(moveType);
    }
    return moveType === condition.value;
  }

  private static checkSuperEffective(condition: ItemCondition, context: ItemEffectContext): boolean {
    const effectiveness = (context as any).move?.type_effectiveness;
    return effectiveness > 1;
  }

  private static checkWeatherActive(condition: ItemCondition, context: ItemEffectContext): boolean {
    const weather = context.battle?.weather || context.environment?.weather;
    if (!weather) return false;
    
    if (condition.values) {
      return condition.values.includes(weather);
    }
    return weather === condition.value;
  }

  private static checkTerrainActive(condition: ItemCondition, context: ItemEffectContext): boolean {
    const terrain = context.battle?.terrain;
    if (!terrain) return false;
    
    if (condition.values) {
      return condition.values.includes(terrain);
    }
    return terrain === condition.value;
  }

  private static checkTimeOfDay(condition: ItemCondition, context: ItemEffectContext): boolean {
    const timeOfDay = context.environment?.time_of_day;
    if (!timeOfDay) return false;
    
    if (condition.values) {
      return condition.values.includes(timeOfDay);
    }
    return timeOfDay === condition.value;
  }

  private static checkLocation(condition: ItemCondition, context: ItemEffectContext): boolean {
    const location = context.environment?.location || context.trainer?.location;
    if (!location) return false;
    
    if (condition.values) {
      return condition.values.includes(location);
    }
    return location === condition.value;
  }

  private static checkRandomChance(condition: ItemCondition, context: ItemEffectContext): boolean {
    const chance = condition.value || 0.5;
    return Math.random() < chance;
  }

  private static checkFirstUse(condition: ItemCondition, context: ItemEffectContext): boolean {
    return context.item?.first_use === true;
  }

  private static checkHeldItem(condition: ItemCondition, context: ItemEffectContext): boolean {
    const heldItem = context.pokemon?.held_item;
    if (!heldItem) return false;
    
    if (condition.values) {
      return condition.values.includes(heldItem);
    }
    return heldItem === condition.value;
  }

  // ===== UTILITAIRES DE COMPARAISON =====

  private static compareValue(value: number, condition: ItemCondition): boolean {
    const operator = condition.operator || 'equals';
    const target = condition.value;
    
    switch (operator) {
      case 'equals': return value === target;
      case 'not_equals': return value !== target;
      case 'greater': return value > target;
      case 'less': return value < target;
      case 'greater_equal': return value >= target;
      case 'less_equal': return value <= target;
      case 'range':
        if (condition.range) {
          const { min, max } = condition.range;
          return (min === undefined || value >= min) && (max === undefined || value <= max);
        }
        return false;
      default:
        return false;
    }
  }

  // ===== VÉRIFICATION DES RESTRICTIONS =====

  private static checkUsageRestrictions(
    effect: ItemEffect, 
    context: ItemEffectContext
  ): { allowed: boolean; reason?: string } {
    // Vérifier once_per_battle
    if (effect.once_per_battle && context.item?.uses_this_battle && context.item.uses_this_battle > 0) {
      return { allowed: false, reason: "Effect can only be used once per battle" };
    }
    
    // Vérifier max_uses_per_battle
    if (effect.max_uses_per_battle && context.item?.uses_this_battle && 
        context.item.uses_this_battle >= effect.max_uses_per_battle) {
      return { allowed: false, reason: `Effect can only be used ${effect.max_uses_per_battle} times per battle` };
    }
    
    // Vérifier cooldown
    if (effect.cooldown_turns && (context as any).turns_since_last_use < effect.cooldown_turns) {
      return { allowed: false, reason: `Effect is on cooldown for ${effect.cooldown_turns} turns` };
    }
    
    return { allowed: true };
  }

  // ===== EXÉCUTION DES ACTIONS =====

  /**
   * Exécute toutes les actions d'un effet
   */
  static async executeActions(
    actions: ItemAction[], 
    context: ItemEffectContext
  ): Promise<Array<{ success: boolean; action_type: ActionType; target: string; value: any; message?: string; consumed_item?: boolean }>> {
    const results = [];
    
    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        results.push(result);
      } catch (error) {
        this.log.error(`Error executing action ${action.type}:`, error);
        results.push({
          success: false,
          action_type: action.type,
          target: action.target || 'unknown',
          value: action.value,
          message: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    return results;
  }

  /**
   * Exécute une action individuelle
   */
  static async executeAction(
    action: ItemAction, 
    context: ItemEffectContext
  ): Promise<{ success: boolean; action_type: ActionType; target: string; value: any; message?: string; consumed_item?: boolean }> {
    
    // Vérifier les conditions spécifiques à l'action
    if (action.conditions && action.conditions.length > 0) {
      const conditionsCheck = await this.checkConditions(action.conditions, context);
      if (!conditionsCheck.success) {
        return {
          success: false,
          action_type: action.type,
          target: action.target || 'self',
          value: action.value,
          message: action.failure_message || conditionsCheck.reason
        };
      }
    }
    
    // Vérifier la chance d'activation
    if (action.chance && action.chance < 1 && Math.random() > action.chance) {
      return {
        success: false,
        action_type: action.type,
        target: action.target || 'self',
        value: action.value,
        message: "Action failed due to chance"
      };
    }
    
    // Exécuter l'action selon son type
    let success = false;
    let message = '';
    let consumed_item = false;
    
    switch (action.type) {
      case 'heal_hp_fixed':
        success = await this.executeHealHPFixed(action, context);
        message = success ? `Healed ${action.value} HP` : 'Heal failed';
        break;
        
      case 'heal_hp_percentage':
        success = await this.executeHealHPPercentage(action, context);
        message = success ? `Healed ${action.value}% HP` : 'Heal failed';
        break;
        
      case 'cure_status':
        success = await this.executeCureStatus(action, context);
        message = success ? 'Status cured' : 'No status to cure';
        break;
        
      case 'boost_stat':
        success = await this.executeBoostStat(action, context);
        message = success ? `${action.parameters?.stat} boosted` : 'Stat boost failed';
        break;
        
      case 'evolve_pokemon':
        success = await this.executeEvolvePokemon(action, context);
        message = success ? `Pokemon evolved to ${action.value}` : 'Evolution failed';
        consumed_item = success;
        break;
        
      case 'teach_move':
        success = await this.executeTeachMove(action, context);
        message = success ? `Learned ${action.value}` : 'Could not learn move';
        consumed_item = success && action.parameters?.consumed_on_use;
        break;
        
      case 'modify_catch_rate':
        success = await this.executeModifyCatchRate(action, context);
        message = success ? 'Catch rate modified' : 'Catch rate modification failed';
        consumed_item = true; // Pokéballs sont toujours consommées
        break;
        
      case 'consume_item':
        consumed_item = true;
        success = true;
        message = 'Item consumed';
        break;
        
      case 'show_message':
        success = true;
        message = action.value || action.parameters?.message || '';
        break;
        
      case 'prevent_wild_encounters':
        success = await this.executePreventWildEncounters(action, context);
        message = success ? `Wild encounters prevented for ${action.value} steps` : 'Repel failed';
        break;
        
      default:
        this.log.warn(`Unhandled action type: ${action.type}`);
        success = false;
        message = `Unhandled action: ${action.type}`;
    }
    
    return {
      success,
      action_type: action.type,
      target: action.target || 'self',
      value: action.value,
      message: success ? (action.success_message || message) : (action.failure_message || message),
      consumed_item
    };
  }

  // ===== IMPLÉMENTATIONS D'ACTIONS SPÉCIFIQUES =====

  private static async executeHealHPFixed(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    if (!context.pokemon) return false;
    
    const healAmount = action.value || 0;
    const currentHP = context.pokemon.hp;
    const maxHP = context.pokemon.max_hp;
    
    if (currentHP >= maxHP) return false; // Déjà pleine vie
    
    const newHP = Math.min(currentHP + healAmount, maxHP);
    context.pokemon.hp = newHP;
    
    return true;
  }

  private static async executeHealHPPercentage(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    if (!context.pokemon) return false;
    
    const healPercent = action.value || 0;
    const maxHP = context.pokemon.max_hp;
    const healAmount = Math.floor(maxHP * healPercent / 100);
    
    const currentHP = context.pokemon.hp;
    if (currentHP >= maxHP) return false;
    
    const newHP = Math.min(currentHP + healAmount, maxHP);
    context.pokemon.hp = newHP;
    
    return true;
  }

  private static async executeCureStatus(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    if (!context.pokemon?.status) return false;
    
    const targetStatus = action.value;
    if (targetStatus && context.pokemon.status !== targetStatus) return false;
    
    context.pokemon.status = undefined;
    return true;
  }

  private static async executeBoostStat(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    if (!context.pokemon) return false;
    
    const stat = action.parameters?.stat;
    const stages = action.value || 1;
    
    if (!stat || !context.pokemon.stats[stat]) return false;
    
    // Appliquer le boost (logique simplifiée)
    const currentValue = context.pokemon.stats[stat];
    const multiplier = stages > 0 ? (1 + stages * 0.5) : (1 / (1 + Math.abs(stages) * 0.5));
    context.pokemon.stats[stat] = Math.floor(currentValue * multiplier);
    
    return true;
  }

  private static async executeEvolvePokemon(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    if (!context.pokemon) return false;
    
    const targetSpecies = action.value;
    if (!targetSpecies) return false;
    
    // Vérifier si l'évolution est possible (logique simplifiée)
    const evolutionMappings = action.parameters?.evolution_mappings || [];
    const mapping = evolutionMappings.find((m: any) => m.from_species === context.pokemon!.species);
    
    if (!mapping || mapping.to_species !== targetSpecies) return false;
    
    // Effectuer l'évolution
    context.pokemon.species = targetSpecies;
    
    return true;
  }

  private static async executeTeachMove(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    if (!context.pokemon) return false;
    
    const moveId = action.value;
    if (!moveId) return false;
    
    // Vérifier la compatibilité (logique simplifiée)
    const compatibleSpecies = action.parameters?.compatible_species || [];
    if (compatibleSpecies.length > 0 && !compatibleSpecies.includes(context.pokemon.species)) {
      return false;
    }
    
    // Enseigner le move (logique simplifiée)
    const pokemonMoves = (context.pokemon as any).moves || [];
    if (!pokemonMoves.includes(moveId)) {
      pokemonMoves.push(moveId);
      (context.pokemon as any).moves = pokemonMoves;
    }
    
    return true;
  }

  private static async executeModifyCatchRate(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    const modifier = action.value || 1;
    
    // Appliquer le modificateur de capture
    (context as any).catch_rate_modifier = ((context as any).catch_rate_modifier || 1) * modifier;
    
    return true;
  }

  private static async executePreventWildEncounters(action: ItemAction, context: ItemEffectContext): Promise<boolean> {
    const steps = action.value || 100;
    
    // Appliquer l'effet repel
    (context as any).repel_steps_remaining = steps;
    
    return true;
  }

  // ===== GÉNÉRATION DE MESSAGES =====

  private static generateSuccessMessage(effect: ItemEffect, actionResults: any[]): string {
    const successfulActions = actionResults.filter((ar: any) => ar.success);
    
    if (successfulActions.length === 0) return 'No effects applied';
    if (successfulActions.length === 1) return successfulActions[0].message || 'Effect applied';
    
    return `${successfulActions.length} effects applied successfully`;
  }

  private static generateFailureMessage(effect: ItemEffect, actionResults: any[]): string {
    const failedActions = actionResults.filter((ar: any) => !ar.success);
    
    if (failedActions.length === 0) return 'Effect failed';
    if (failedActions.length === 1) return failedActions[0].message || 'Effect failed';
    
    return `${failedActions.length} effects failed`;
  }
}
