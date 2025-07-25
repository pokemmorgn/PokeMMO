// PokeWorld Admin Panel - NPC Types Configuration - VERSION COMPLÈTE
// Définitions complètes des 12 types NPCs avec TOUS leurs champs

export const NPC_TYPES = {
    dialogue: {
        icon: '💬',
        name: 'Guide/Information',
        description: 'NPC qui donne des informations, guides touristiques',
        color: '#3498db',
        
        sections: ['basic', 'dialogues', 'zoneInfo', 'quests', 'conditions', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'dialogueIds'],
            optional: [
                'direction', 'dialogueId', 'conditionalDialogueIds', 'zoneInfo', 
                'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds', 
                'spawnConditions', 'interactionRadius', 'canWalkAway', 'autoFacePlayer', 
                'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            dialogues: ['dialogueIds', 'dialogueId', 'conditionalDialogueIds'],
            zoneInfo: ['zoneInfo'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            conditions: ['spawnConditions'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            dialogueIds: 'array',
            dialogueId: 'string',
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
        
        sections: ['basic', 'shop', 'business', 'access', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'shopId', 'shopType'],
            optional: [
                'direction', 'dialogueIds', 'shopConfig', 'shopDialogueIds', 'businessHours',
                'accessRestrictions', 'questsToGive', 'questsToEnd', 'questRequirements',
                'questDialogueIds', 'spawnConditions', 'interactionRadius', 'canWalkAway',
                'autoFacePlayer', 'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            shop: ['shopId', 'shopType', 'shopConfig'],
            business: ['businessHours'],
            access: ['accessRestrictions'],
            dialogues: ['dialogueIds', 'shopDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            shopId: 'string',
            shopType: 'select',
            dialogueIds: 'array',
            shopConfig: 'object',
            shopDialogueIds: 'object',
            businessHours: 'object',
            accessRestrictions: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            shopType: ['pokemart', 'items', 'tms', 'berries', 'clothes', 'black_market']
        }
    },

    trainer: {
        icon: '⚔️',
        name: 'Dresseur/Combat',
        description: 'NPC qui défie le joueur en combat Pokémon',
        color: '#e74c3c',
        
        sections: ['basic', 'trainer', 'battle', 'rewards', 'vision', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'trainerId', 'trainerClass', 'battleConfig'],
            optional: [
                'direction', 'trainerRank', 'trainerTitle', 'battleDialogueIds', 'rewards', 'rebattle',
                'visionConfig', 'battleConditions', 'progressionFlags', 'questsToGive', 'questsToEnd',
                'questRequirements', 'questDialogueIds', 'spawnConditions', 'interactionRadius',
                'canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            trainer: ['trainerId', 'trainerClass', 'trainerRank', 'trainerTitle'],
            battle: ['battleConfig', 'battleConditions'],
            rewards: ['rewards', 'rebattle'],
            vision: ['visionConfig'],
            dialogues: ['battleDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            trainerId: 'string',
            trainerClass: 'select',
            trainerRank: 'number',
            trainerTitle: 'string',
            gymConfig: 'object',
            battleConfig: 'object',
            challengeConditions: 'object',
            gymDialogueIds: 'object',
            battleDialogueIds: 'object',
            gymRewards: 'object',
            rematchConfig: 'object',
            rewards: 'object',
            rebattle: 'object',
            visionConfig: 'object',
            battleConditions: 'object',
            progressionFlags: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            trainerClass: ['gym_leader', 'elite_four', 'champion']
        }
    },

    transport: {
        icon: '🚢',
        name: 'Transport/Voyage',
        description: 'NPC qui transporte le joueur vers d\'autres zones',
        color: '#16a085',
        
        sections: ['basic', 'transport', 'destinations', 'schedule', 'weather', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'transportConfig', 'destinations'],
            optional: [
                'direction', 'schedules', 'weatherRestrictions', 'transportDialogueIds',
                'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
                'spawnConditions', 'interactionRadius', 'canWalkAway', 'autoFacePlayer',
                'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            transport: ['transportConfig'],
            destinations: ['destinations'],
            schedule: ['schedules'],
            weather: ['weatherRestrictions'],
            dialogues: ['transportDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            transportConfig: 'object',
            destinations: 'array',
            schedules: 'array',
            weatherRestrictions: 'object',
            transportDialogueIds: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            transportType: ['boat', 'train', 'fly', 'teleport']
        }
    },

    service: {
        icon: '🔧',
        name: 'Service Spécialisé',
        description: 'NPC qui offre des services spéciaux (Name Rater, Move Deleter, etc.)',
        color: '#34495e',
        
        sections: ['basic', 'service', 'restrictions', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'serviceConfig', 'availableServices'],
            optional: [
                'direction', 'serviceDialogueIds', 'serviceRestrictions', 'questsToGive',
                'questsToEnd', 'questRequirements', 'questDialogueIds', 'spawnConditions',
                'interactionRadius', 'canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            service: ['serviceConfig', 'availableServices'],
            restrictions: ['serviceRestrictions'],
            dialogues: ['serviceDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            serviceConfig: 'object',
            availableServices: 'array',
            serviceDialogueIds: 'object',
            serviceRestrictions: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            serviceType: ['name_rater', 'move_deleter', 'move_reminder', 'iv_checker']
        }
    },

    minigame: {
        icon: '🎮',
        name: 'Mini-jeu/Concours',
        description: 'NPC qui organise des concours, mini-jeux ou compétitions',
        color: '#e67e22',
        
        sections: ['basic', 'minigame', 'activities', 'rewards', 'schedule', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'minigameConfig'],
            optional: [
                'direction', 'contestCategories', 'contestRewards', 'contestSchedule',
                'contestDialogueIds', 'questsToGive', 'questsToEnd', 'questRequirements',
                'questDialogueIds', 'spawnConditions', 'interactionRadius', 'canWalkAway',
                'autoFacePlayer', 'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            minigame: ['minigameConfig'],
            activities: ['contestCategories'],
            rewards: ['contestRewards'],
            schedule: ['contestSchedule'],
            dialogues: ['contestDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            minigameConfig: 'object',
            contestCategories: 'array',
            contestRewards: 'object',
            contestSchedule: 'object',
            contestDialogueIds: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            minigameType: ['pokemon_contest', 'fishing_contest', 'slots', 'lottery']
        }
    },

    researcher: {
        icon: '🔬',
        name: 'Chercheur/Professeur',
        description: 'NPC spécialisé dans la recherche Pokémon, Pokédex, reproduction',
        color: '#8e44ad',
        
        sections: ['basic', 'research', 'services', 'pokemon', 'rewards', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'researchConfig', 'researchServices'],
            optional: [
                'direction', 'acceptedPokemon', 'researchDialogueIds', 'researchRewards',
                'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
                'spawnConditions', 'interactionRadius', 'canWalkAway', 'autoFacePlayer',
                'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            research: ['researchConfig'],
            services: ['researchServices'],
            pokemon: ['acceptedPokemon'],
            rewards: ['researchRewards'],
            dialogues: ['researchDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            researchConfig: 'object',
            researchServices: 'array',
            acceptedPokemon: 'object',
            researchDialogueIds: 'object',
            researchRewards: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            researchType: ['pokedex', 'breeding', 'genetics', 'evolution']
        }
    },

    guild: {
        icon: '🏛️',
        name: 'Guilde/Faction',
        description: 'NPC représentant une guilde, faction ou organisation',
        color: '#c0392b',
        
        sections: ['basic', 'guild', 'recruitment', 'services', 'ranks', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'guildConfig', 'recruitmentRequirements'],
            optional: [
                'direction', 'guildServices', 'guildDialogueIds', 'rankSystem',
                'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
                'spawnConditions', 'interactionRadius', 'canWalkAway', 'autoFacePlayer',
                'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            guild: ['guildConfig'],
            recruitment: ['recruitmentRequirements'],
            services: ['guildServices'],
            ranks: ['rankSystem'],
            dialogues: ['guildDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            guildConfig: 'object',
            recruitmentRequirements: 'object',
            guildServices: 'array',
            guildDialogueIds: 'object',
            rankSystem: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            factionType: ['neutral', 'good', 'evil', 'criminal', 'ranger']
        }
    },

    event: {
        icon: '🎉',
        name: 'Événement Spécial',
        description: 'NPC d\'événements temporaires, saisonniers ou spéciaux',
        color: '#f1c40f',
        
        sections: ['basic', 'event', 'period', 'activities', 'progress', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'eventConfig', 'eventPeriod'],
            optional: [
                'direction', 'eventActivities', 'eventDialogueIds', 'globalProgress',
                'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
                'spawnConditions', 'interactionRadius', 'canWalkAway', 'autoFacePlayer',
                'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            event: ['eventConfig'],
            period: ['eventPeriod'],
            activities: ['eventActivities'],
            progress: ['globalProgress'],
            dialogues: ['eventDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            eventConfig: 'object',
            eventPeriod: 'object',
            eventActivities: 'array',
            eventDialogueIds: 'object',
            globalProgress: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            eventType: ['seasonal', 'raid', 'tournament', 'limited_time'],
            eventStatus: ['inactive', 'active', 'ended']
        }
    },

    quest_master: {
        icon: '📜',
        name: 'Maître des Quêtes',
        description: 'NPC spécialisé dans les quêtes épiques et la progression',
        color: '#2c3e50',
        
        sections: ['basic', 'questmaster', 'quests', 'ranks', 'rewards', 'conditions', 'dialogues', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'questMasterConfig'],
            optional: [
                'direction', 'questMasterDialogueIds', 'questRankSystem', 'epicRewards',
                'specialConditions', 'questsToGive', 'questsToEnd', 'questRequirements',
                'questDialogueIds', 'spawnConditions', 'interactionRadius', 'canWalkAway',
                'autoFacePlayer', 'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            questmaster: ['questMasterConfig'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            ranks: ['questRankSystem'],
            rewards: ['epicRewards'],
            conditions: ['specialConditions'],
            dialogues: ['questMasterDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            questMasterConfig: 'object',
            questMasterDialogueIds: 'object',
            questRankSystem: 'object',
            epicRewards: 'object',
            specialConditions: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        },
        
        selectOptions: {
            questTier: ['normal', 'rare', 'epic', 'legendary']
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
    interactionRadius: 'Distance maximale pour interagir avec le NPC',
    cooldownSeconds: 'Délai d\'attente entre les interactions',
    canWalkAway: 'Si activé, le joueur peut partir pendant l\'interaction',
    autoFacePlayer: 'Le NPC se tourne automatiquement vers le joueur',
    repeatable: 'L\'interaction peut être répétée plusieurs fois',
    
    // Dialogue
    dialogueIds: 'Liste des IDs de dialogue traduits côté client',
    dialogueId: 'ID de dialogue principal (si différent du premier)',
    conditionalDialogueIds: 'Dialogues selon des conditions spéciales',
    zoneInfo: 'Informations sur la zone actuelle',
    
    // Merchant
    shopId: 'Identifiant unique de la boutique',
    shopType: 'Type de boutique (détermine les objets vendus)',
    shopConfig: 'Configuration avancée de la boutique (remises, horaires, etc.)',
    shopDialogueIds: 'Dialogues spécifiques aux interactions commerciales',
    businessHours: 'Horaires d\'ouverture/fermeture',
    accessRestrictions: 'Restrictions d\'accès à la boutique',
    
    // Trainer
    trainerId: 'Identifiant unique du dresseur',
    trainerClass: 'Classe/type de dresseur',
    trainerRank: 'Niveau de difficulté du dresseur',
    trainerTitle: 'Titre ou surnom du dresseur',
    battleConfig: 'Configuration du combat (équipe, règles, etc.)',
    battleDialogueIds: 'Dialogues avant/pendant/après combat',
    rewards: 'Récompenses données après victoire',
    rebattle: 'Configuration pour les recombats',
    visionConfig: 'Paramètres de détection du joueur',
    battleConditions: 'Conditions pour déclencher le combat',
    progressionFlags: 'Flags activés selon le résultat du combat',
    
    // Gym Leader
    gymConfig: 'Configuration de l\'arène (badge, type, etc.)',
    gymDialogueIds: 'Dialogues spécifiques aux champions d\'arène',
    challengeConditions: 'Conditions pour défier le champion',
    gymRewards: 'Récompenses spéciales d\'arène (badge, CT, etc.)',
    rematchConfig: 'Configuration pour les revanches de champion',
    
    // Healer
    healerConfig: 'Configuration des soins (gratuit/payant, type)',
    healerDialogueIds: 'Dialogues du processus de soins',
    additionalServices: 'Services supplémentaires (PC, stockage, etc.)',
    serviceRestrictions: 'Limitations d\'usage des services',
    
    // Transport
    transportConfig: 'Configuration du moyen de transport',
    destinations: 'Liste des destinations disponibles',
    schedules: 'Horaires de départ/arrivée',
    transportDialogueIds: 'Dialogues de voyage',
    weatherRestrictions: 'Restrictions selon la météo',
    
    // Service
    serviceConfig: 'Configuration du service proposé',
    availableServices: 'Liste des services disponibles',
    serviceDialogueIds: 'Dialogues du processus de service',
    
    // Minigame
    minigameConfig: 'Configuration du mini-jeu',
    contestCategories: 'Catégories de concours disponibles',
    contestRewards: 'Récompenses selon le classement',
    contestDialogueIds: 'Dialogues du concours',
    contestSchedule: 'Planning des concours',
    
    // Researcher
    researchConfig: 'Configuration de la recherche',
    researchServices: 'Services de recherche disponibles',
    acceptedPokemon: 'Types de Pokémon acceptés pour la recherche',
    researchDialogueIds: 'Dialogues liés à la recherche',
    researchRewards: 'Récompenses de recherche',
    
    // Guild
    guildConfig: 'Configuration de la guilde',
    recruitmentRequirements: 'Conditions pour rejoindre la guilde',
    guildServices: 'Services exclusifs aux membres',
    guildDialogueIds: 'Dialogues de guilde',
    rankSystem: 'Système de rangs de la guilde',
    
    // Event
    eventConfig: 'Configuration de l\'événement',
    eventPeriod: 'Période de validité de l\'événement',
    eventActivities: 'Activités disponibles pendant l\'événement',
    eventDialogueIds: 'Dialogues spéciaux d\'événement',
    globalProgress: 'Progression partagée entre tous les joueurs',
    
    // Quest Master
    questMasterConfig: 'Configuration du maître des quêtes',
    questMasterDialogueIds: 'Dialogues spécialisés en quêtes',
    questRankSystem: 'Système de rangs basé sur les quêtes accomplies',
    epicRewards: 'Récompenses légendaires pour quêtes épiques',
    specialConditions: 'Conditions spéciales d\'accès',
    
    // Quests (commun)
    questsToGive: 'Liste des quêtes que ce NPC peut donner',
    questsToEnd: 'Liste des quêtes que ce NPC peut terminer',
    questRequirements: 'Prérequis pour recevoir les quêtes',
    questDialogueIds: 'Dialogues liés aux quêtes',
    
    // Conditions
    spawnConditions: 'Conditions pour l\'apparition du NPC (météo, heure, flags, etc.)'
}

export default { NPC_TYPES, COMMON_FIELDS, FIELD_VALIDATORS, FIELD_HELP }
            battleConfig: 'object',
            battleDialogueIds: 'object',
            rewards: 'object',
            rebattle: 'object',
            visionConfig: 'object',
            battleConditions: 'object',
            progressionFlags: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
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
        
        sections: ['basic', 'healing', 'services', 'restrictions', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'healerConfig'],
            optional: [
                'direction', 'healerDialogueIds', 'additionalServices', 'serviceRestrictions',
                'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
                'spawnConditions', 'interactionRadius', 'canWalkAway', 'autoFacePlayer',
                'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            healing: ['healerConfig'],
            services: ['additionalServices'],
            restrictions: ['serviceRestrictions'],
            dialogues: ['healerDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            healerConfig: 'object',
            healerDialogueIds: 'object',
            additionalServices: 'object',
            serviceRestrictions: 'object',
            questsToGive: 'array',
            questsToEnd: 'array',
            questRequirements: 'object',
            questDialogueIds: 'object',
            spawnConditions: 'object'
        }
    },

    gym_leader: {
        icon: '🏆',
        name: 'Chef d\'Arène',
        description: 'Leader de salle de sport Pokémon, donne des badges',
        color: '#9b59b6',
        
        sections: ['basic', 'trainer', 'gym', 'battle', 'challenge', 'rewards', 'rematch', 'dialogues', 'quests', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'trainerId', 'trainerClass', 'gymConfig', 'battleConfig', 'challengeConditions'],
            optional: [
                'direction', 'trainerRank', 'trainerTitle', 'gymDialogueIds', 'gymRewards', 'rematchConfig',
                'battleDialogueIds', 'rewards', 'rebattle', 'visionConfig', 'battleConditions',
                'progressionFlags', 'questsToGive', 'questsToEnd', 'questRequirements',
                'questDialogueIds', 'spawnConditions', 'interactionRadius', 'canWalkAway',
                'autoFacePlayer', 'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            trainer: ['trainerId', 'trainerClass', 'trainerRank', 'trainerTitle'],
            gym: ['gymConfig'],
            battle: ['battleConfig', 'battleConditions'],
            challenge: ['challengeConditions'],
            rewards: ['rewards', 'gymRewards'],
            rematch: ['rematchConfig', 'rebattle'],
            dialogues: ['gymDialogueIds', 'battleDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
      fieldTypes: {
            guildConfig: 'object',
            recruitmentRequirements: 'object',
            guildServices: 'array',
            guildDialogueIds: 'object',
            rankSystem: 'object',
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
        },
        
        selectOptions: {
            factionType: ['neutral', 'good', 'evil', 'criminal', 'ranger']
        }
    },

    event: {
        icon: '🎉',
        name: 'Événement Spécial',
        description: 'NPC d\'événements temporaires, saisonniers ou spéciaux',
        color: '#f1c40f',
        
        sections: ['basic', 'event', 'period', 'activities', 'progress', 'dialogues', 'quests', 'conditions', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'eventConfig', 'eventPeriod'],
            optional: [
                'direction', 'eventActivities', 'eventDialogueIds', 'globalProgress',
                'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
                'spawnConditions', 'interactionRadius', 'canWalkAway', 'autoFacePlayer',
                'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            event: ['eventConfig'],
            period: ['eventPeriod'],
            activities: ['eventActivities'],
            progress: ['globalProgress'],
            dialogues: ['eventDialogueIds'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            conditions: ['spawnConditions'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            eventConfig: 'object',
            eventPeriod: 'object',
            eventActivities: 'array',
            eventDialogueIds: 'object',
            globalProgress: 'object',
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
        },
        
        selectOptions: {
            eventType: ['seasonal', 'raid', 'tournament', 'limited_time'],
            eventStatus: ['inactive', 'active', 'ended']
        }
    },

    quest_master: {
        icon: '📜',
        name: 'Maître des Quêtes',
        description: 'NPC spécialisé dans les quêtes épiques et la progression',
        color: '#2c3e50',
        
        sections: ['basic', 'questmaster', 'quests', 'ranks', 'rewards', 'conditions', 'dialogues', 'interaction'],
        
        fields: {
            required: ['name', 'type', 'position', 'sprite', 'questMasterConfig'],
            optional: [
                'direction', 'questMasterDialogueIds', 'questRankSystem', 'epicRewards',
                'specialConditions', 'questsToGive', 'questsToEnd', 'questRequirements',
                'questDialogueIds', 'spawnConditions', 'interactionRadius', 'canWalkAway',
                'autoFacePlayer', 'repeatable', 'cooldownSeconds'
            ]
        },
        
        fieldGroups: {
            basic: ['name', 'position', 'sprite', 'direction', 'interactionRadius'],
            questmaster: ['questMasterConfig'],
            quests: ['questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'],
            ranks: ['questRankSystem'],
            rewards: ['epicRewards'],
            conditions: ['specialConditions', 'spawnConditions'],
            dialogues: ['questMasterDialogueIds'],
            interaction: ['canWalkAway', 'autoFacePlayer', 'repeatable', 'cooldownSeconds']
        },
        
        fieldTypes: {
            questMasterConfig: 'object',
            questMasterDialogueIds: 'object',
            questRankSystem: 'object',
            epicRewards: 'object',
            specialConditions: 'object',
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
        },
        
        selectOptions: {
            questTier: ['normal', 'rare', 'epic', 'legendary']
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

// Messages d'aide contextuels - VERSION COMPLÈTE
export const FIELD_HELP = {
    // Champs de base
    position: 'Coordonnées du NPC sur la carte (en pixels)',
    sprite: 'Fichier image du NPC (doit être dans /assets/sprites/)',
    direction: 'Direction initiale du NPC',
    interactionRadius: 'Distance maximale pour interagir avec le NPC',
    cooldownSeconds: 'Délai d\'attente entre les interactions',
    canWalkAway: 'Si activé, le joueur peut partir pendant l\'interaction',
    autoFacePlayer: 'Le NPC se tourne automatiquement vers le joueur',
    repeatable: 'L\'interaction peut être répétée plusieurs fois',
    
    // Dialogue
    dialogueIds: 'Liste des IDs de dialogue traduits côté client',
    dialogueId: 'ID de dialogue principal (si différent du premier)',
    conditionalDialogueIds: 'Dialogues selon des conditions spéciales',
    zoneInfo: 'Informations sur la zone actuelle',
    
    // Merchant
    shopId: 'Identifiant unique de la boutique',
    shopType: 'Type de boutique (détermine les objets vendus)',
    shopConfig: 'Configuration avancée de la boutique (remises, horaires, etc.)',
    shopDialogueIds: 'Dialogues spécifiques aux interactions commerciales',
    businessHours: 'Horaires d\'ouverture/fermeture',
    accessRestrictions: 'Restrictions d\'accès à la boutique',
    
    // Trainer
    trainerId: 'Identifiant unique du dresseur',
    trainerClass: 'Classe/type de dresseur',
    trainerRank: 'Niveau de difficulté du dresseur',
    trainerTitle: 'Titre ou surnom du dresseur',
    battleConfig: 'Configuration du combat (équipe, règles, etc.)',
    battleDialogueIds: 'Dialogues avant/pendant/après combat',
    rewards: 'Récompenses données après victoire',
    rebattle: 'Configuration pour les recombats',
    visionConfig: 'Paramètres de détection du joueur',
    battleConditions: 'Conditions pour déclencher le combat',
    progressionFlags: 'Flags activés selon le résultat du combat',
    
    // Gym Leader
    gymConfig: 'Configuration de l\'arène (badge, type, etc.)',
    gymDialogueIds: 'Dialogues spécifiques aux champions d\'arène',
    challengeConditions: 'Conditions pour défier le champion',
    gymRewards: 'Récompenses spéciales d\'arène (badge, CT, etc.)',
    rematchConfig: 'Configuration pour les revanches de champion',
    
    // Healer
    healerConfig: 'Configuration des soins (gratuit/payant, type)',
    healerDialogueIds: 'Dialogues du processus de soins',
    additionalServices: 'Services supplémentaires (PC, stockage, etc.)',
    serviceRestrictions: 'Limitations d\'usage des services',
    
    // Transport
    transportConfig: 'Configuration du moyen de transport',
    destinations: 'Liste des destinations disponibles',
    schedules: 'Horaires de départ/arrivée',
    transportDialogueIds: 'Dialogues de voyage',
    weatherRestrictions: 'Restrictions selon la météo',
    
    // Service
    serviceConfig: 'Configuration du service proposé',
    availableServices: 'Liste des services disponibles',
    serviceDialogueIds: 'Dialogues du processus de service',
    
    // Minigame
    minigameConfig: 'Configuration du mini-jeu',
    contestCategories: 'Catégories de concours disponibles',
    contestRewards: 'Récompenses selon le classement',
    contestDialogueIds: 'Dialogues du concours',
    contestSchedule: 'Planning des concours',
    
    // Researcher
    researchConfig: 'Configuration de la recherche',
    researchServices: 'Services de recherche disponibles',
    acceptedPokemon: 'Types de Pokémon acceptés pour la recherche',
    researchDialogueIds: 'Dialogues liés à la recherche',
    researchRewards: 'Récompenses de recherche',
    
    // Guild
    guildConfig: 'Configuration de la guilde',
    recruitmentRequirements: 'Conditions pour rejoindre la guilde',
    guildServices: 'Services exclusifs aux membres',
    guildDialogueIds: 'Dialogues de guilde',
    rankSystem: 'Système de rangs de la guilde',
    
    // Event
    eventConfig: 'Configuration de l\'événement',
    eventPeriod: 'Période de validité de l\'événement',
    eventActivities: 'Activités disponibles pendant l\'événement',
    eventDialogueIds: 'Dialogues spéciaux d\'événement',
    globalProgress: 'Progression partagée entre tous les joueurs',
    
    // Quest Master
    questMasterConfig: 'Configuration du maître des quêtes',
    questMasterDialogueIds: 'Dialogues spécialisés en quêtes',
    questRankSystem: 'Système de rangs basé sur les quêtes accomplies',
    epicRewards: 'Récompenses légendaires pour quêtes épiques',
    specialConditions: 'Conditions spéciales d\'accès',
    
    // Quests (commun à tous)
    questsToGive: 'Liste des quêtes que ce NPC peut donner',
    questsToEnd: 'Liste des quêtes que ce NPC peut terminer',
    questRequirements: 'Prérequis pour recevoir les quêtes',
    questDialogueIds: 'Dialogues liés aux quêtes',
    
    // Conditions (commun à tous)
    spawnConditions: 'Conditions pour l\'apparition du NPC (météo, heure, flags, etc.)'
}

export default { NPC_TYPES, COMMON_FIELDS, FIELD_VALIDATORS, FIELD_HELP }
