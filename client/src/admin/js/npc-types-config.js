// PokeWorld Admin Panel - NPC Types Configuration
// Définitions complètes des 12 types NPCs avec leurs propriétés spécifiques

export const NPC_TYPES = {
    dialogue: {
        icon: '💬',
        name: 'Guide/Information',
        description: 'NPC qui donne des informations, guides touristiques',
        color: '#3498db',
        
        sections: ['basic', 'dialogues', 'quests', 'conditions', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'dialogueIds'],
            optional: [
                'direction', 'conditionalDialogueIds', 'zoneInfo', 
                'questsToGive', 'questsToEnd', 'questRequirements',
                'questDialogueIds', 'spawnConditions'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            dialogues: ['dialogueIds', 'conditionalDialogueIds', 'dialogueId'],
            zoneInfo: ['zoneInfo'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            conditions: ['spawnConditions'],
            interaction: ['interactionRadius', 'canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            dialogueIds: 'array',
            conditionalDialogueIds: 'object',
            zoneInfo: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object',
            interactionRadius: 'number',
            canWalkAway: 'boolean',
            autoFacePlayer: 'boolean',
            repeatable: 'boolean',
            cooldownSeconds: 'number'
        }
    },

    merchant: {
        icon: '🏪',
        name: 'Marchand/Boutique',
        description: 'NPC qui vend des objets, tient une boutique',
        color: '#27ae60',
        
        sections: ['basic', 'shop', 'business', 'access', 'dialogues', 'quests'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'shopId', 'shopType'],
            optional: [
                'direction', 'shopConfig', 'shopDialogueIds', 'businessHours',
                'accessRestrictions', 'questsToGive', 'questsToEnd'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            shop: ['shopId', 'shopType', 'shopConfig'],
            business: ['businessHours'],
            access: ['accessRestrictions'],
            dialogues: ['dialogueIds', 'shopDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds']
        },
        
        fieldTypes: {
            shopId: 'string',
            shopType: 'select',
            shopConfig: 'object',
            shopDialogueIds: 'object',
            businessHours: 'object',
            accessRestrictions: 'object'
        },
        
        selectOptions: {
            shopType: ['pokemart', 'department_store', 'specialty', 'black_market', 'auction_house']
        }
    },

    trainer: {
        icon: '⚔️',
        name: 'Dresseur/Combat',
        description: 'NPC qui défie le joueur en combat Pokémon',
        color: '#e74c3c',
        
        sections: ['basic', 'trainer', 'battle', 'rewards', 'vision', 'dialogues', 'quests'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'trainerId', 'trainerClass', 'battleConfig'],
            optional: [
                'direction', 'trainerRank', 'trainerTitle', 'rewards', 'rebattle',
                'visionConfig', 'battleConditions', 'progressionFlags'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            trainer: ['trainerId', 'trainerClass', 'trainerRank', 'trainerTitle'],
            battle: ['battleConfig', 'battleConditions'],
            rewards: ['rewards', 'rebattle'],
            vision: ['visionConfig'],
            dialogues: ['battleDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements']
        },
        
        fieldTypes: {
            trainerId: 'string',
            trainerClass: 'select',
            trainerRank: 'number',
            trainerTitle: 'string',
            battleConfig: 'object',
            rewards: 'object',
            rebattle: 'object',
            visionConfig: 'object',
            battleConditions: 'object',
            progressionFlags: 'object',
            battleDialogueIds: 'object'
        },
        
        selectOptions: {
            trainerClass: ['youngster', 'lass', 'bug_catcher', 'fisherman', 'hiker', 'biker', 'sailor', 'rocket_grunt']
        }
    },

    healer: {
        icon: '💊',
        name: 'Soigneur/Centre Pokémon',
        description: 'NPC qui soigne les Pokémon du joueur',
        color: '#f39c12',
        
        sections: ['basic', 'healing', 'services', 'restrictions', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'healerConfig'],
            optional: [
                'direction', 'healerDialogueIds', 'additionalServices', 
                'serviceRestrictions', 'questsToGive'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            healing: ['healerConfig'],
            services: ['additionalServices'],
            restrictions: ['serviceRestrictions'],
            dialogues: ['healerDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            healerConfig: 'object',
            healerDialogueIds: 'object',
            additionalServices: 'object',
            serviceRestrictions: 'object'
        }
    },

    gym_leader: {
        icon: '🏆',
        name: 'Chef d\'Arène',
        description: 'Leader de salle de sport Pokémon, donne des badges',
        color: '#9b59b6',
        
        sections: ['basic', 'gym', 'battle', 'challenge', 'rewards', 'rematch', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'gymConfig', 'battleConfig', 'challengeConditions'],
            optional: [
                'direction', 'gymDialogueIds', 'gymRewards', 'rematchConfig',
                'questsToGive', 'questsToEnd'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            gym: ['gymConfig'],
            battle: ['battleConfig'],
            challenge: ['challengeConditions'],
            rewards: ['gymRewards'],
            rematch: ['rematchConfig'],
            dialogues: ['gymDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            gymConfig: 'object',
            battleConfig: 'object',
            challengeConditions: 'object',
            gymDialogueIds: 'object',
            gymRewards: 'object',
            rematchConfig: 'object'
        }
    },

    transport: {
        icon: '🚢',
        name: 'Transport/Voyage',
        description: 'NPC qui transporte le joueur vers d\'autres zones',
        color: '#16a085',
        
        sections: ['basic', 'transport', 'destinations', 'schedule', 'weather', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'transportConfig', 'destinations'],
            optional: [
                'direction', 'schedules', 'weatherRestrictions', 
                'transportDialogueIds', 'questsToGive'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            transport: ['transportConfig'],
            destinations: ['destinations'],
            schedule: ['schedules'],
            weather: ['weatherRestrictions'],
            dialogues: ['transportDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            transportConfig: 'object',
            destinations: 'array',
            schedules: 'array',
            weatherRestrictions: 'object',
            transportDialogueIds: 'object'
        }
    },

    service: {
        icon: '🔧',
        name: 'Service Spécialisé',
        description: 'NPC qui offre des services spéciaux (Name Rater, Move Deleter, etc.)',
        color: '#34495e',
        
        sections: ['basic', 'service', 'restrictions', 'dialogues', 'quests'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'serviceConfig', 'availableServices'],
            optional: [
                'direction', 'serviceDialogueIds', 'serviceRestrictions',
                'questsToGive', 'questsToEnd'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            service: ['serviceConfig', 'availableServices'],
            restrictions: ['serviceRestrictions'],
            dialogues: ['serviceDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            serviceConfig: 'object',
            availableServices: 'array',
            serviceDialogueIds: 'object',
            serviceRestrictions: 'object'
        }
    },

    minigame: {
        icon: '🎮',
        name: 'Mini-jeu/Concours',
        description: 'NPC qui organise des concours, mini-jeux ou compétitions',
        color: '#e67e22',
        
        sections: ['basic', 'minigame', 'activities', 'rewards', 'schedule', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'minigameConfig'],
            optional: [
                'direction', 'contestCategories', 'contestRewards', 'contestSchedule',
                'contestDialogueIds', 'questsToGive'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            minigame: ['minigameConfig'],
            activities: ['contestCategories'],
            rewards: ['contestRewards'],
            schedule: ['contestSchedule'],
            dialogues: ['contestDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            minigameConfig: 'object',
            contestCategories: 'array',
            contestRewards: 'object',
            contestSchedule: 'object',
            contestDialogueIds: 'object'
        }
    },

    researcher: {
        icon: '🔬',
        name: 'Chercheur/Professeur',
        description: 'NPC spécialisé dans la recherche Pokémon, Pokédex, reproduction',
        color: '#8e44ad',
        
        sections: ['basic', 'research', 'services', 'pokemon', 'rewards', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'researchConfig', 'researchServices'],
            optional: [
                'direction', 'acceptedPokemon', 'researchDialogueIds', 
                'researchRewards', 'questsToGive'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            research: ['researchConfig'],
            services: ['researchServices'],
            pokemon: ['acceptedPokemon'],
            rewards: ['researchRewards'],
            dialogues: ['researchDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            researchConfig: 'object',
            researchServices: 'array',
            acceptedPokemon: 'object',
            researchDialogueIds: 'object',
            researchRewards: 'object'
        }
    },

    guild: {
        icon: '🏛️',
        name: 'Guilde/Faction',
        description: 'NPC représentant une guilde, faction ou organisation',
        color: '#c0392b',
        
        sections: ['basic', 'guild', 'recruitment', 'services', 'ranks', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'guildConfig', 'recruitmentRequirements'],
            optional: [
                'direction', 'guildServices', 'guildDialogueIds', 
                'rankSystem', 'questsToGive'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            guild: ['guildConfig'],
            recruitment: ['recruitmentRequirements'],
            services: ['guildServices'],
            ranks: ['rankSystem'],
            dialogues: ['guildDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            guildConfig: 'object',
            recruitmentRequirements: 'object',
            guildServices: 'array',
            guildDialogueIds: 'object',
            rankSystem: 'object'
        }
    },

    event: {
        icon: '🎉',
        name: 'Événement Spécial',
        description: 'NPC d\'événements temporaires, saisonniers ou spéciaux',
        color: '#f1c40f',
        
        sections: ['basic', 'event', 'period', 'activities', 'progress', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'eventConfig', 'eventPeriod'],
            optional: [
                'direction', 'eventActivities', 'eventDialogueIds', 
                'globalProgress', 'questsToGive'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            event: ['eventConfig'],
            period: ['eventPeriod'],
            activities: ['eventActivities'],
            progress: ['globalProgress'],
            dialogues: ['eventDialogueIds'],
            quests: ['questsToGive', 'questsToEnd']
        },
        
        fieldTypes: {
            eventConfig: 'object',
            eventPeriod: 'object',
            eventActivities: 'array',
            eventDialogueIds: 'object',
            globalProgress: 'object'
        }
    },

    quest_master: {
        icon: '📜',
        name: 'Maître des Quêtes',
        description: 'NPC spécialisé dans les quêtes épiques et la progression',
        color: '#2c3e50',
        
        sections: ['basic', 'questmaster', 'quests', 'ranks', 'rewards', 'dialogues'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'questMasterConfig'],
            optional: [
                'direction', 'questMasterDialogueIds', 'questRankSystem', 
                'epicRewards', 'specialConditions', 'questsToGive'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction'],
            questmaster: ['questMasterConfig'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements'],
            ranks: ['questRankSystem'],
            rewards: ['epicRewards'],
            dialogues: ['questMasterDialogueIds'],
            conditions: ['specialConditions']
        },
        
        fieldTypes: {
            questMasterConfig: 'object',
            questMasterDialogueIds: 'object',
            questRankSystem: 'object',
            epicRewards: 'object',
            specialConditions: 'object'
        }
    }
}

// Propriétés communes à tous les NPCs
export const COMMON_FIELDS = {
    id: { type: 'number', required: true, autoGenerate: true },
    name: { type: 'string', required: true, placeholder: 'Nom du NPC' },
    type: { type: 'select', required: true, options: Object.keys(NPC_TYPES) },
    position: { 
        type: 'object', 
        required: true, 
        fields: { x: 'number', y: 'number' },
        placeholder: { x: 'Position X', y: 'Position Y' }
    },
    sprite: { 
        type: 'string', 
        required: true, 
        placeholder: 'nom_sprite.png',
        help: 'Nom du fichier sprite (avec extension .png)'
    },
    direction: { 
        type: 'select', 
        required: false, 
        options: ['north', 'south', 'east', 'west'],
        default: 'south'
    },
    interactionRadius: {
        type: 'number',
        required: false,
        default: 32,
        min: 16,
        max: 96,
        help: 'Rayon d\'interaction en pixels'
    },
    canWalkAway: {
        type: 'boolean',
        required: false,
        default: true,
        help: 'Le joueur peut-il s\'éloigner pendant l\'interaction ?'
    },
    autoFacePlayer: {
        type: 'boolean',
        required: false,
        default: true,
        help: 'Le NPC se tourne-t-il automatiquement vers le joueur ?'
    },
    repeatable: {
        type: 'boolean',
        required: false,
        default: true,
        help: 'L\'interaction est-elle répétable ?'
    },
    cooldownSeconds: {
        type: 'number',
        required: false,
        default: 0,
        min: 0,
        help: 'Délai entre interactions (en secondes)'
    }
}

// Validation des types de données
export const FIELD_VALIDATORS = {
    string: (value) => typeof value === 'string' && value.length > 0,
    number: (value) => typeof value === 'number' && !isNaN(value),
    boolean: (value) => typeof value === 'boolean',
    array: (value) => Array.isArray(value),
    object: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
    select: (value, options) => options.includes(value)
}

// Messages d'aide contextuels
export const FIELD_HELP = {
    position: 'Coordonnées du NPC sur la carte (en pixels)',
    sprite: 'Fichier image du NPC (doit être dans /assets/sprites/)',
    direction: 'Direction initiale du NPC',
    dialogueIds: 'Liste des IDs de dialogue traduits côté client',
    shopId: 'Identifiant unique de la boutique',
    trainerId: 'Identifiant unique du dresseur',
    questsToGive: 'Liste des quêtes que ce NPC peut donner',
    questsToEnd: 'Liste des quêtes que ce NPC peut terminer',
    spawnConditions: 'Conditions pour l\'apparition du NPC'
}

export default { NPC_TYPES, COMMON_FIELDS, FIELD_VALIDATORS, FIELD_HELP }
