// server/src/managers/battle/BattleEffectSystem.ts
// Système centralisé de gestion des effets et hooks génériques du moteur de combat Pokémon

import { BattleContext, BattlePokemonData, StatStage } from "./types/BattleTypes";

// === TYPES DE BASE POUR LES EFFETS GÉNÉRIQUES ===

export type BattleEffectType = "ability" | "item" | "status" | "terrain" | "weather";
export type EffectHook =
  | "onSwitchIn"
  | "onSwitchOut"
  | "onTurnStart"
  | "onTurnEnd"
  | "onAttack"
  | "onHit"
  | "onDamaged"
  | "onFaint"
  | "onCapture"
  | "onMoveUsed";

// Interface commune pour tout effet pouvant réagir à un hook
export interface BattleEffect {
  id: string;
  type: BattleEffectType;
  name?: string;
  desc?: string;
  hooks: Partial<Record<EffectHook, BattleEffectHookFn>>;
}

// Signature d'une fonction de hook d'effet
export type BattleEffectHookFn = (params: {
  context: BattleContext;
  effect: BattleEffect;
  user?: BattlePokemonData;
  target?: BattlePokemonData;
  [key: string]: any;
}) => any;

// Clamp pour stat stage (Pokémon = -6 à +6)
function clampStatStage(val: number): StatStage {
  return Math.max(-6, Math.min(6, val)) as StatStage;
}

// === TABLE DES EFFETS PRÉDÉFINIS (exemples à étendre) ===

export const BattleEffects: Record<string, BattleEffect> = {
  // --- EXEMPLE ABILITY ---
  "ability_intimidate": {
    id: "ability_intimidate",
    type: "ability",
    name: "Intimidate",
    desc: "Baisse l’Attaque du Pokémon adverse à l'entrée en combat.",
    hooks: {
      onSwitchIn: ({ context, user }) => {
        // Appliqué à l'entrée en combat : baisse l'attaque des adversaires
        context.participants.forEach((p) => {
          // Baisse tous les adversaires sauf le lanceur lui-même
          if (
            user &&
            p.team[0] &&
            p.team[0].pokemonId !== user.pokemonId
          ) {
            p.team[0].statStages.attack = clampStatStage(
              (p.team[0].statStages.attack || 0) - 1
            );
          }
        });
        return { message: "L’intimidation baisse l’Attaque !" };
      },
    },
  },

  // --- EXEMPLE STATUT ---
  "status_burn": {
    id: "status_burn",
    type: "status",
    name: "Brûlure",
    desc: "Diminue l'Attaque et inflige des dégâts à chaque tour.",
    hooks: {
      onTurnEnd: ({ user }) => {
        if (user) {
          const dmg = Math.floor(user.maxHp / 8);
          user.currentHp = Math.max(0, user.currentHp - dmg);
          return { message: `${user.name} souffre de sa brûlure !`, damage: dmg };
        }
      },
    },
  },

  // --- AUTRES EFFETS À AJOUTER ICI ---
  // Suivez la même logique : clé = id, hooks = événements concernés
};

// === SYSTÈME CENTRALISÉ : GÈRE LES TRIGGERS DE HOOKS POUR TOUS LES EFFETS ===

export class BattleEffectSystem {
  /**
   * Déclenche tous les hooks du type donné (ability, status, item...) pour tous les Pokémon du contexte.
   * Exemple : BattleEffectSystem.triggerHook(ctx, "onTurnEnd", { ... });
   */
  static triggerHook(
    context: BattleContext,
    hook: EffectHook,
    params: { user?: BattlePokemonData; target?: BattlePokemonData; [key: string]: any }
  ): any[] {
    const results: any[] = [];

    context.participants.forEach((participant) => {
      const mon = participant.team[0];
      if (!mon) return;

      // Ability
      if (mon.ability) {
        const eff = BattleEffects[`ability_${mon.ability.toLowerCase()}`];
        if (eff?.hooks?.[hook]) {
          results.push(
            eff.hooks[hook]({ context, effect: eff, user: mon, ...params })
          );
        }
      }

      // Status
      if (mon.statusCondition && mon.statusCondition !== "normal") {
        const eff = BattleEffects[`status_${mon.statusCondition.toLowerCase()}`];
        if (eff?.hooks?.[hook]) {
          results.push(
            eff.hooks[hook]({ context, effect: eff, user: mon, ...params })
          );
        }
      }

      // TODO: Items, terrains, weather, etc (à brancher ici)
    });

    return results;
  }
}

// === EXEMPLE D'UTILISATION EN JEU ===
//
// BattleEffectSystem.triggerHook(context, "onTurnEnd", { /* ... */ });
//
// Ajoutez vos hooks dans BattleEffects et le moteur s'occupera de tout !
//

export default BattleEffectSystem;
