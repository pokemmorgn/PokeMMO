// BattleEffectSystem.ts
// Système de hooks génériques pour tous les effets du jeu Pokémon

import {
  BattleContext,
  BattlePokemonData,
  BattleAction,
  BattleEvent,
  DamageCalculationInput,
  DamageCalculationResult,
} from "./types/BattleTypes";

// === TYPES GÉNÉRIQUES ===

export type BattleEffectTrigger =
  | "onStartTurn"
  | "onBeforeMove"
  | "onAfterMove"
  | "onDamageCalc"
  | "onDamageTaken"
  | "onStatusChange"
  | "onSwitchIn"
  | "onSwitchOut"
  | "onFaint"
  | "onEndTurn"
  | "onCapture"
  | "onVictory"
  | "onBattleStart"
  | "onBattleEnd"
  | "onTryRun"
  | "onItemUse"
  | "onWeatherChange"
  | "onTerrainChange";

export type BattleEffect = {
  /** Nom interne ou id unique */
  id: string;
  /** Source de l'effet : 'ability', 'item', 'status', 'move', 'terrain', 'weather', 'custom'... */
  type: string;
  /** Qui possède l'effet ? (pokemonId ou 'global') */
  owner?: string | number;
  /** Hooks : callbacks pour chaque trigger possible */
  hooks: Partial<Record<BattleEffectTrigger, BattleEffectHook>>;
  /** Optionnel : durée de l’effet (ex : 3 tours, 'permanent', etc.) */
  duration?: number | "permanent";
  /** Source d’affichage, pour log ou UI */
  display?: {
    name?: string;
    icon?: string;
    description?: string;
    color?: string;
  };
  /** Statut actif/inactif */
  active?: boolean;
};

export type BattleEffectHook = (
  options: {
    context: BattleContext;
    effect: BattleEffect;
    target?: BattlePokemonData;
    source?: BattlePokemonData;
    action?: BattleAction;
    event?: BattleEvent;
    damageInput?: DamageCalculationInput;
    damageResult?: DamageCalculationResult;
    value?: any; // pour custom ou chaining
    [key: string]: any;
  }
) => any | void | Promise<any>;

// === RÉGISTRY D’EFFETS (mapping id → BattleEffect) ===

export const BattleEffectRegistry: Record<
  string,
  Omit<BattleEffect, "owner">
> = {
  // -- Exemples standards (à étoffer selon besoin) --
  // INTIMIDATE (Talent)
  "ability_intimidate": {
    id: "ability_intimidate",
    type: "ability",
    hooks: {
      onSwitchIn: ({ context, effect, target }) => {
        // Baisse l’attaque du(s) Pokémon adverse(s)
        context.participants.forEach((p) => {
          if (target && p.sessionId !== target.pokemonId && p.team[0]) {
            p.team[0].statStages.attack = Math.max(
              -6,
              (p.team[0].statStages.attack || 0) - 1
            );
          }
        });
        return { message: "L’intimidation baisse l’Attaque !" };
      },
    },
    display: {
      name: "Intimidate",
      description: "Baisse l'Attaque de l'adversaire lors de l'entrée en combat.",
    },
    duration: "permanent",
  },
  // LEFTOVERS (Objet)
  "item_leftovers": {
    id: "item_leftovers",
    type: "item",
    hooks: {
      onEndTurn: ({ context, target }) => {
        if (!target) return;
        const heal = Math.floor(target.maxHp / 16);
        target.currentHp = Math.min(target.currentHp + heal, target.maxHp);
        return { message: `Les Restes rendent ${heal} PV à ${target.name}!` };
      },
    },
    display: {
      name: "Restes",
      description: "Rend quelques PV à chaque tour.",
    },
    duration: "permanent",
  },
  // SLEEP (Statut)
  "status_sleep": {
    id: "status_sleep",
    type: "status",
    hooks: {
      onBeforeMove: ({ target }) => {
        if (!target) return;
        // Réveil après X tours, ou bloque le move
        if ((target as any).sleepTurns !== undefined) {
          (target as any).sleepTurns--;
          if ((target as any).sleepTurns <= 0) {
            target.statusCondition = "normal";
            return { message: `${target.name} se réveille !` };
          }
        }
        // Sinon, empêche d’agir
        return { cancelMove: true, message: `${target.name} dort.` };
      },
    },
    display: {
      name: "Sommeil",
      description: "Empêche d'agir pendant plusieurs tours.",
    },
    duration: 3,
  },
  // ... Ajouter tous les autres effets !
};

// === SYSTÈME PRINCIPAL ===

export class BattleEffectSystem {
  // Effets actifs du combat (context.effects, ou local à la classe)
  public activeEffects: BattleEffect[] = [];

  constructor(effects?: BattleEffect[]) {
    if (effects) this.activeEffects = effects;
  }

  /** Ajoute un effet */
  addEffect(effect: BattleEffect) {
    this.activeEffects.push(effect);
  }

  /** Retire un effet par id */
  removeEffect(id: string, owner?: string | number) {
    this.activeEffects = this.activeEffects.filter(
      (eff) => eff.id !== id || (owner && eff.owner !== owner)
    );
  }

  /** Applique tous les hooks pour un trigger */
  async runHooks(
    trigger: BattleEffectTrigger,
    options: {
      context: BattleContext;
      target?: BattlePokemonData;
      source?: BattlePokemonData;
      action?: BattleAction;
      event?: BattleEvent;
      damageInput?: DamageCalculationInput;
      damageResult?: DamageCalculationResult;
      value?: any;
      [key: string]: any;
    }
  ): Promise<any[]> {
    const results: any[] = [];
    for (const effect of this.activeEffects) {
      if (effect.active === false) continue;
      const hook = effect.hooks[trigger];
      if (typeof hook === "function") {
        const res = await hook({ ...options, effect });
        if (res !== undefined) results.push(res);
      }
    }
    return results;
  }

  /** Génère automatiquement les effets de la situation courante (abilities, objets, statuts, terrains, météo, moves spéciaux, etc.) */
  static fromContext(context: BattleContext): BattleEffectSystem {
    const effects: BattleEffect[] = [];

    // --- Abilities des participants ---
    context.participants.forEach((p) => {
      const poke = p.team[0];
      if (poke && poke.ability) {
        const effectDef = BattleEffectRegistry[`ability_${poke.ability}`];
        if (effectDef)
          effects.push({ ...effectDef, owner: poke.pokemonId, active: true });
      }
      // --- Objets tenus ---
      if (poke && poke.heldItem) {
        const effectDef = BattleEffectRegistry[`item_${poke.heldItem}`];
        if (effectDef)
          effects.push({ ...effectDef, owner: poke.pokemonId, active: true });
      }
      // --- Statut (ex: sleep, burn, etc.) ---
      if (poke && poke.statusCondition && poke.statusCondition !== "normal") {
        const effectDef = BattleEffectRegistry[`status_${poke.statusCondition}`];
        if (effectDef)
          effects.push({ ...effectDef, owner: poke.pokemonId, active: true });
      }
    });

    // --- Terrain/Météo globaux ---
    if (context.environment?.terrain) {
      const effectDef = BattleEffectRegistry[`terrain_${context.environment.terrain}`];
      if (effectDef)
        effects.push({ ...effectDef, owner: "global", active: true });
    }
    if (context.environment?.weather) {
      const effectDef = BattleEffectRegistry[`weather_${context.environment.weather}`];
      if (effectDef)
        effects.push({ ...effectDef, owner: "global", active: true });
    }

    // ... Ajouter d'autres effets globaux/temporaires/moves spéciaux...

    return new BattleEffectSystem(effects);
  }

  /** Debug, état courant */
  debug() {
    console.log("🪄 [BattleEffectSystem] Effets actifs :", this.activeEffects);
  }
}

// === UTILISATION (exemple dans un handler) ===
// const effectSystem = BattleEffectSystem.fromContext(context);
// await effectSystem.runHooks("onDamageCalc", { context, target, source, damageInput });

// === AJOUTER UN EFFET EN COURS DE COMBAT ===
// effectSystem.addEffect({
//   id: "custom_effect",
//   type: "move",
//   owner: pokemonId,
//   hooks: { onBeforeMove: ({target}) => { ... } },
//   duration: 3,
//   display: { name: "Effet Custom" }
// });

export default BattleEffectSystem;
