// PokeWorld Admin Panel - NPC Templates
// Templates par défaut pour chaque type de NPC avec données pré-configurées

export const NPC_TEMPLATES = {
    dialogue: {
        id: null, // Auto-généré
        name: "Guide Marcel",
        type: "dialogue",
        position: { x: 100, y: 100 },
        sprite: "guide_tourist.png",
        direction: "south",
        
        dialogueIds: [
            "npc.dialogue.guide.welcome.1",
            "npc.dialogue.guide.info.1"
        ],
        dialogueId: "npc.dialogue.guide.main",
        
        conditionalDialogueIds: {
            firstVisit: ["npc.dialogue.guide.first.1"],
            hasPokedex: ["npc.dialogue.guide.pokedex.1"]
        },
        
        zoneInfo: {
            zoneName: "current_zone",
            connections: [],
            wildPokemon: []
        },
        
        questsToGive: [],
        questsToEnd: [],
        questRequirements: {},
        questDialogueIds: {
            questOffer: ["npc.dialogue.guide.quest_offer.1"],
            questInProgress: ["npc.dialogue.guide.quest_progress.1"],
            questComplete: ["npc.dialogue.guide.quest_complete.1"]
        },
        
        interactionRadius: 48,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 0,
        
        spawnConditions: {
            timeOfDay: ["morning", "day", "evening"],
            weather: null,
            minPlayerLevel: 1,
            maxPlayerLevel: null,
            requiredFlags: [],
            forbiddenFlags: []
        }
    },

    merchant: {
        id: null,
        name: "Marchand Julie",
        type: "merchant",
        position: { x: 200, y: 100 },
        sprite: "shopkeeper_female.png",
        direction: "west",
        
        shopId: "basic_shop",
        shopType: "pokemart",
        
        dialogueIds: ["npc.merchant.shopkeeper.welcome.1"],
        shopDialogueIds: {
            shopOpen: ["npc.merchant.shopkeeper.shop_open.1"],
            shopClose: ["npc.merchant.shopkeeper.shop_close.1"],
            noMoney: ["npc.merchant.shopkeeper.no_money.1"],
            purchaseSuccess: ["npc.merchant.shopkeeper.purchase_success.1"],
            stockEmpty: ["npc.merchant.shopkeeper.stock_empty.1"]
        },
        
        shopConfig: {
            currency: "gold",
            discountPercent: 0,
            memberDiscount: 0,
            vipDiscount: 0,
            restockHours: 24,
            limitedStock: false,
            bulkDiscounts: {
                enabled: false,
                threshold: 10,
                discountPercent: 10
            },
            loyaltyProgram: {
                enabled: false,
                pointsPerGold: 1,
                rewardThresholds: []
            }
        },
        
        accessRestrictions: {
            minPlayerLevel: 1,
            maxPlayerLevel: null,
            requiredBadges: [],
            requiredItems: [],
            requiredFlags: [],
            forbiddenFlags: [],
            vipOnly: false,
            guildOnly: false,
            membershipRequired: false
        },
        
        businessHours: {
            enabled: false,
            openTime: "08:00",
            closeTime: "20:00",
            closedDays: [],
            closedMessageId: "npc.merchant.shopkeeper.closed"
        },
        
        questsToGive: [],
        questsToEnd: [],
        questRequirements: {},
        questDialogueIds: {
            questOffer: ["npc.merchant.shopkeeper.quest_offer.1"],
            questInProgress: ["npc.merchant.shopkeeper.quest_progress.1"],
            questComplete: ["npc.merchant.shopkeeper.quest_complete.1"]
        },
        
        interactionRadius: 32,
        canWalkAway: false,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 0
    },

    trainer: {
        id: null,
        name: "Dresseur Thomas",
        type: "trainer",
        position: { x: 300, y: 100 },
        sprite: "youngster_thomas.png",
        direction: "north",
        
        trainerId: "youngster_thomas_001",
        trainerClass: "youngster",
        trainerRank: 1,
        trainerTitle: "Rookie Trainer",
        
        battleConfig: {
            teamId: "youngster_team_basic",
            battleType: "single",
            allowItems: true,
            allowSwitching: true,
            levelCap: 15,
            customRules: ["no_legendary", "max_level_15"],
            weatherCondition: null,
            terrainCondition: null
        },
        
        battleDialogueIds: {
            preBattle: ["npc.trainer.youngster.pre_battle.1"],
            defeat: ["npc.trainer.youngster.defeat.1"],
            victory: ["npc.trainer.youngster.victory.1"],
            rematch: ["npc.trainer.youngster.rematch.1"]
        },
        
        rewards: {
            money: {
                base: 500,
                perPokemonLevel: 50,
                bonus: 100,
                multiplier: 1.0
            },
            experience: {
                enabled: true,
                multiplier: 1.2,
                bonusExp: 100
            },
            items: [
                {"itemId": "potion", "quantity": 2, "chance": 100},
                {"itemId": "poke_ball", "quantity": 1, "chance": 50}
            ]
        },
        
        rebattle: {
            enabled: true,
            cooldownHours: 24,
            rematchTeamId: "youngster_team_advanced",
            increasedRewards: true,
            maxRebattles: 0,
            scalingDifficulty: true
        },
        
        visionConfig: {
            sightRange: 96,
            sightAngle: 90,
            chaseRange: 128,
            returnToPosition: true,
            blockMovement: true
        },
        
        battleConditions: {
            minPlayerLevel: 3,
            maxPlayerLevel: 20,
            requiredBadges: [],
            requiredFlags: ["has_pokemon"],
            forbiddenFlags: []
        },
        
        progressionFlags: {
            onDefeat: ["defeated_trainer"],
            onVictory: ["lost_to_trainer"],
            onFirstMeeting: ["met_trainer"]
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 32,
        canWalkAway: false,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 5
    },

    healer: {
        id: null,
        name: "Infirmière Joy",
        type: "healer",
        position: { x: 400, y: 100 },
        sprite: "nurse_joy.png",
        direction: "south",
        
        healerConfig: {
            healingType: "pokemon_center",
            cost: 0,
            currency: "gold",
            instantHealing: true,
            healFullTeam: true,
            removeStatusEffects: true,
            restorePP: true
        },
        
        healerDialogueIds: {
            welcome: ["npc.healer.joy.welcome.1"],
            offerHealing: ["npc.healer.joy.offer_healing.1"],
            healingStart: ["npc.healer.joy.healing_start.1"],
            healingComplete: ["npc.healer.joy.healing_complete.1"],
            alreadyHealthy: ["npc.healer.joy.already_healthy.1"],
            noPokemon: ["npc.healer.joy.no_pokemon.1"]
        },
        
        additionalServices: {
            pcAccess: true,
            pokemonStorage: true,
            tradeCenter: false,
            moveReminder: false,
            pokemonDaycare: false
        },
        
        serviceRestrictions: {
            minPlayerLevel: 1,
            maxUsesPerDay: 0,
            cooldownBetweenUses: 0,
            requiredFlags: [],
            forbiddenFlags: []
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 40,
        canWalkAway: false,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 1
    },

    gym_leader: {
        id: null,
        name: "Champion Lt. Surge",
        type: "gym_leader",
        position: { x: 500, y: 100 },
        sprite: "gym_leader_surge.png",
        direction: "south",
        
        gymConfig: {
            gymId: "electric_gym",
            gymType: "electric",
            gymLevel: 3,
            badgeId: "thunder_badge",
            badgeName: "Thunder Badge",
            gymPuzzle: "none",
            requiredBadges: []
        },
        
        battleConfig: {
            teamId: "gym_leader_team",
            battleType: "single",
            allowItems: false,
            allowSwitching: true,
            levelCap: 25,
            customRules: ["gym_battle_rules"],
            weatherCondition: null,
            terrainCondition: null
        },
        
        gymDialogueIds: {
            firstChallenge: ["npc.gym.leader.first_challenge.1"],
            preBattle: ["npc.gym.leader.pre_battle.1"],
            defeat: ["npc.gym.leader.defeat.1"],
            victory: ["npc.gym.leader.victory.1"],
            badgeAwarded: ["npc.gym.leader.badge_awarded.1"],
            alreadyDefeated: ["npc.gym.leader.already_defeated.1"]
        },
        
        challengeConditions: {
            minPlayerLevel: 20,
            maxPlayerLevel: null,
            requiredBadges: [],
            requiredFlags: [],
            forbiddenFlags: ["badge_obtained"],
            minimumPokemon: 3,
            maximumPokemon: 6
        },
        
        gymRewards: {
            badge: {
                badgeId: "thunder_badge",
                tmReward: "tm24_thunderbolt",
                pokemonObeyLevel: 30
            },
            money: {
                base: 2500,
                multiplier: 1.5
            },
            items: [
                {"itemId": "tm24", "quantity": 1, "chance": 100}
            ]
        },
        
        rematchConfig: {
            enabled: false,
            cooldownDays: 7,
            rematchTeamId: "gym_leader_elite_team",
            levelIncrease: 10,
            newRewards: true
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 48,
        canWalkAway: false,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 0
    },

    transport: {
        id: null,
        name: "Capitaine Briney",
        type: "transport",
        position: { x: 600, y: 100 },
        sprite: "captain_briney.png",
        direction: "west",
        
        transportConfig: {
            transportType: "boat",
            vehicleId: "basic_boat",
            capacity: 10,
            travelTime: 300
        },
        
        destinations: [
            {
                mapId: "other_zone",
                mapName: "Zone Destination",
                cost: 500,
                currency: "gold",
                travelTime: 300,
                requiredFlags: [],
                forbiddenFlags: []
            }
        ],
        
        schedules: [
            {
                departTime: "10:00",
                arrivalTime: "10:30",
                destination: "other_zone",
                daysOfWeek: ["monday", "wednesday", "friday"]
            }
        ],
        
        transportDialogueIds: {
            welcome: ["npc.transport.captain.welcome.1"],
            destinations: ["npc.transport.captain.destinations.1"],
            confirmTravel: ["npc.transport.captain.confirm_travel.1"],
            boarding: ["npc.transport.captain.boarding.1"],
            departure: ["npc.transport.captain.departure.1"],
            arrival: ["npc.transport.captain.arrival.1"],
            noMoney: ["npc.transport.captain.no_money.1"]
        },
        
        weatherRestrictions: {
            enabled: false,
            forbiddenWeather: ["storm"],
            delayWeather: ["rain"],
            delayMessageId: "npc.transport.captain.weather_delay.1"
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 40,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 2
    },

    service: {
        id: null,
        name: "Name Rater Bob",
        type: "service",
        position: { x: 700, y: 100 },
        sprite: "name_rater.png",
        direction: "south",
        
        serviceConfig: {
            serviceType: "name_rater",
            cost: 200,
            currency: "gold",
            instantService: true,
            maxUsesPerDay: 5
        },
        
        availableServices: [
            {
                serviceId: "rename_pokemon",
                serviceName: "Rename Pokémon",
                cost: 200,
                requirements: {
                    originalTrainer: true,
                    minFriendship: 0
                }
            }
        ],
        
        serviceDialogueIds: {
            welcome: ["npc.service.name_rater.welcome.1"],
            serviceOffer: ["npc.service.name_rater.service_offer.1"],
            serviceStart: ["npc.service.name_rater.service_start.1"],
            serviceComplete: ["npc.service.name_rater.service_complete.1"],
            noMoney: ["npc.service.name_rater.no_money.1"],
            notEligible: ["npc.service.name_rater.not_eligible.1"]
        },
        
        serviceRestrictions: {
            minPlayerLevel: 5,
            maxUsesPerDay: 5,
            cooldownBetweenUses: 300,
            requiredFlags: [],
            forbiddenFlags: []
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 32,
        canWalkAway: false,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 1
    },

    minigame: {
        id: null,
        name: "Contest Judge Marina",
        type: "minigame",
        position: { x: 800, y: 100 },
        sprite: "contest_judge.png",
        direction: "west",
        
        minigameConfig: {
            minigameType: "pokemon_contest",
            contestCategory: "beauty",
            entryFee: 1000,
            currency: "gold",
            maxParticipants: 4,
            duration: 300
        },
        
        contestCategories: [
            {
                categoryId: "beauty",
                categoryName: "Beauty Contest",
                requiredStat: "beauty",
                entryFee: 1000,
                minLevel: 10
            }
        ],
        
        contestRewards: {
            first: {
                money: 5000,
                items: [{"itemId": "contest_ribbon", "quantity": 1}]
            },
            participation: {
                money: 500,
                items: [{"itemId": "pokeblock", "quantity": 3}]
            }
        },
        
        contestDialogueIds: {
            welcome: ["npc.minigame.contest.welcome.1"],
            rules: ["npc.minigame.contest.rules.1"],
            entry: ["npc.minigame.contest.entry.1"],
            contestStart: ["npc.minigame.contest.contest_start.1"],
            results: ["npc.minigame.contest.results.1"],
            noMoney: ["npc.minigame.contest.no_money.1"]
        },
        
        contestSchedule: {
            enabled: false,
            startTimes: ["14:00"],
            registrationDeadline: 300,
            waitingRoom: false
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 40,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 2
    },

    researcher: {
        id: null,
        name: "Professeur Willow",
        type: "researcher",
        position: { x: 900, y: 100 },
        sprite: "professor_willow.png",
        direction: "south",
        
        researchConfig: {
            researchType: "pokedex",
            specialization: "general",
            researchLevel: 1,
            acceptDonations: true
        },
        
        researchServices: [
            {
                serviceId: "pokedex_evaluation",
                serviceName: "Pokédex Evaluation",
                cost: 0,
                requirements: {
                    minPokedexEntries: 10
                }
            }
        ],
        
        acceptedPokemon: {
            forResearch: ["all"],
            forBreeding: [],
            forAnalysis: ["owned_by_player"],
            restrictions: {
                noLegendary: true,
                minLevel: 5,
                maxLevel: 100
            }
        },
        
        researchDialogueIds: {
            welcome: ["npc.researcher.professor.welcome.1"],
            services: ["npc.researcher.professor.services.1"],
            pokedexCheck: ["npc.researcher.professor.pokedex_check.1"],
            researchComplete: ["npc.researcher.professor.research_complete.1"],
            notEligible: ["npc.researcher.professor.not_eligible.1"]
        },
        
        researchRewards: {
            pokedexMilestones: {
                "50": {"items": [{"itemId": "exp_share", "quantity": 1}]},
                "100": {"items": [{"itemId": "master_ball", "quantity": 1}]}
            },
            researchContribution: {
                perPokemon: 100,
                rareBonus: 500
            }
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 48,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 3
    },

    guild: {
        id: null,
        name: "Recruteur Guild",
        type: "guild",
        position: { x: 1000, y: 100 },
        sprite: "guild_recruiter.png",
        direction: "west",
        
        guildConfig: {
            guildId: "basic_guild",
            guildName: "Basic Guild",
            factionType: "neutral",
            recruitmentOpen: true,
            maxMembers: 100
        },
        
        recruitmentRequirements: {
            minPlayerLevel: 10,
            maxPlayerLevel: null,
            requiredBadges: [],
            requiredFlags: [],
            forbiddenFlags: [],
            alignmentRequired: null,
            minimumReputation: 0
        },
        
        guildServices: [
            {
                serviceId: "guild_access",
                serviceName: "Guild Access",
                memberRankRequired: 1
            }
        ],
        
        guildDialogueIds: {
            recruitment: ["npc.guild.recruiter.recruitment.1"],
            welcome: ["npc.guild.recruiter.welcome.1"],
            services: ["npc.guild.recruiter.services.1"],
            rejected: ["npc.guild.recruiter.rejected.1"]
        },
        
        rankSystem: {
            ranks: [
                {"rankId": 1, "rankName": "Member", "requirements": {"reputation": 0}},
                {"rankId": 2, "rankName": "Officer", "requirements": {"reputation": 100}}
            ],
            promotionRewards: {}
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        interactionRadius: 40,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 5
    },

    event: {
        id: null,
        name: "Event Coordinator",
        type: "event",
        position: { x: 1100, y: 100 },
        sprite: "event_coordinator.png",
        direction: "south",
        
        eventConfig: {
            eventId: "basic_event",
            eventType: "seasonal",
            eventStatus: "active",
            globalEvent: false
        },
        
        eventPeriod: {
            startDate: "2025-01-01T00:00:00Z",
            endDate: "2025-12-31T23:59:59Z",
            timezone: "UTC",
            earlyAccess: {
                enabled: false,
                startDate: null,
                requiredFlags: []
            }
        },
        
        eventActivities: [
            {
                activityId: "basic_activity",
                activityName: "Basic Activity",
                participationFee: 0,
                rewards: {
                    participation: {"items": [{"itemId": "event_token", "quantity": 1}]}
                }
            }
        ],
        
        eventDialogueIds: {
            welcome: ["npc.event.coordinator.welcome.1"],
            activities: ["npc.event.coordinator.activities.1"],
            registration: ["npc.event.coordinator.registration.1"],
            results: ["npc.event.coordinator.results.1"],
            eventEnded: ["npc.event.coordinator.event_ended.1"]
        },
        
        globalProgress: {
            enabled: false,
            targetGoal: 1000,
            currentProgress: 0,
            progressType: "participation",
            rewards: {}
        },
        
        questsToGive: [],
        questsToEnd: [],
        
        spawnConditions: {
            timeOfDay: null,
            weather: null,
            minPlayerLevel: 1,
            maxPlayerLevel: null,
            requiredFlags: ["event_active"],
            forbiddenFlags: [],
            dateRange: {
                start: "2025-01-01",
                end: "2025-12-31"
            }
        },
        
        interactionRadius: 50,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 2
    },

    quest_master: {
        id: null,
        name: "Quest Master Sage",
        type: "quest_master",
        position: { x: 1200, y: 100 },
        sprite: "quest_master_sage.png",
        direction: "west",
        
        questMasterConfig: {
            masterId: "basic_quest_master",
            specialization: "general",
            questTier: "normal",
            maxActiveQuests: 3
        },
        
        questsToGive: [],
        questsToEnd: [],
        questRequirements: {},
        
        questMasterDialogueIds: {
            welcome: ["npc.quest_master.sage.welcome.1"],
            questsAvailable: ["npc.quest_master.sage.quests_available.1"],
            questOffer: ["npc.quest_master.sage.quest_offer.1"],
            questAccepted: ["npc.quest_master.sage.quest_accepted.1"],
            questInProgress: ["npc.quest_master.sage.quest_progress.1"],
            questComplete: ["npc.quest_master.sage.quest_complete.1"],
            notReady: ["npc.quest_master.sage.not_ready.1"]
        },
        
        questRankSystem: {
            ranks: [
                {"rankId": 1, "rankName": "Novice", "questsRequired": 5},
                {"rankId": 2, "rankName": "Adept", "questsRequired": 15}
            ],
            rankRewards: {}
        },
        
        epicRewards: {},
        
        specialConditions: {
            timeRestrictions: {
                enabled: false
            },
            weatherRequirements: {
                enabled: false
            },
            playerAlignment: {
                required: null,
                minKarma: 0
            }
        },
        
        interactionRadius: 64,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 0
    }
}

// Fonction pour générer un nouveau NPC basé sur un template
export function createNPCFromTemplate(type, overrides = {}) {
    if (!NPC_TEMPLATES[type]) {
        throw new Error(`Template NPC non trouvé pour le type: ${type}`)
    }
    
    const template = JSON.parse(JSON.stringify(NPC_TEMPLATES[type])) // Deep clone
    
    // Générer un ID unique
    template.id = Date.now()
    
    // Appliquer les overrides
    return { ...template, ...overrides }
}

// Fonction pour obtenir un template vierge (minimal)
export function createEmptyNPC(type) {
    const baseNPC = {
        id: Date.now(),
        name: `Nouveau ${type}`,
        type: type,
        position: { x: 0, y: 0 },
        sprite: "default.png",
        direction: "south",
        interactionRadius: 32,
        canWalkAway: true,
        autoFacePlayer: true,
        repeatable: true,
        cooldownSeconds: 0
    }
    
    return baseNPC
}

// Fonction de validation de template
export function validateTemplate(npc) {
    const required = ['id', 'name', 'type', 'position', 'sprite']
    
    for (const field of required) {
        if (!npc[field]) {
            return { valid: false, error: `Champ requis manquant: ${field}` }
        }
    }
    
    if (!NPC_TEMPLATES[npc.type]) {
        return { valid: false, error: `Type NPC invalide: ${npc.type}` }
    }
    
    if (!npc.position.x !== undefined || !npc.position.y !== undefined) {
        return { valid: false, error: 'Position invalide (x, y requis)' }
    }
    
    return { valid: true }
}

// Templates de positions prédéfinies pour placement rapide
export const POSITION_PRESETS = {
    center: { x: 400, y: 300 },
    top_left: { x: 100, y: 100 },
    top_right: { x: 700, y: 100 },
    bottom_left: { x: 100, y: 500 },
    bottom_right: { x: 700, y: 500 },
    entrance: { x: 400, y: 50 },
    exit: { x: 400, y: 550 }
}

// Sprites suggérés par type de NPC
export const SUGGESTED_SPRITES = {
    dialogue: ['guide_tourist.png', 'villager_male.png', 'villager_female.png', 'elder.png'],
    merchant: ['shopkeeper_male.png', 'shopkeeper_female.png', 'mart_clerk.png', 'vendor.png'],
    trainer: ['youngster.png', 'lass.png', 'bug_catcher.png', 'fisherman.png', 'hiker.png'],
    healer: ['nurse_joy.png', 'doctor.png', 'healer.png'],
    gym_leader: ['gym_leader_brock.png', 'gym_leader_misty.png', 'gym_leader_surge.png'],
    transport: ['captain.png', 'pilot.png', 'sailor.png', 'driver.png'],
    service: ['name_rater.png', 'move_deleter.png', 'technician.png'],
    minigame: ['contest_judge.png', 'game_master.png', 'referee.png'],
    researcher: ['professor_oak.png', 'professor_willow.png', 'scientist.png'],
    guild: ['team_rocket_grunt.png', 'guild_member.png', 'faction_leader.png'],
    event: ['event_coordinator.png', 'festival_host.png', 'celebrant.png'],
    quest_master: ['quest_master_sage.png', 'wise_man.png', 'adventure_guide.png']
}

export default { 
    NPC_TEMPLATES, 
    createNPCFromTemplate, 
    createEmptyNPC, 
    validateTemplate,
    POSITION_PRESETS,
    SUGGESTED_SPRITES
}
