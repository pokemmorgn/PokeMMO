// PokeWorld Admin Panel - NPC Validator
// Validation intelligente et contextuelle des NPCs selon leur type

import { NPC_TYPES, COMMON_FIELDS, FIELD_VALIDATORS } from './npc-types-config.js'

export class NPCValidator {
    constructor() {
        this.errors = []
        this.warnings = []
        this.suggestions = []
    }

    // Validation complète d'un NPC
    validateNPC(npc) {
        this.reset()
        
        if (!npc || typeof npc !== 'object') {
            this.addError('general', 'NPC invalide ou manquant')
            return this.getResult()
        }

        // Validations de base
        this.validateBasicFields(npc)
        this.validateCommonFields(npc)
        
        // Validations spécifiques au type
        if (npc.type && NPC_TYPES[npc.type]) {
            this.validateTypeSpecificFields(npc)
            this.validateBusinessLogic(npc)
            this.validateReferences(npc)
        } else {
            this.addError('type', `Type NPC invalide: ${npc.type}`)
        }

        // Suggestions d'amélioration
        this.generateSuggestions(npc)

        return this.getResult()
    }

    // Validation des champs de base obligatoires
    validateBasicFields(npc) {
        const requiredFields = ['id', 'name', 'type', 'position', 'sprite']
        
        requiredFields.forEach(field => {
            if (!npc[field]) {
                this.addError(field, `Champ obligatoire manquant: ${field}`)
            }
        })

        // Validation du nom
        if (npc.name) {
            if (typeof npc.name !== 'string' || npc.name.trim().length < 2) {
                this.addError('name', 'Le nom doit contenir au moins 2 caractères')
            }
            if (npc.name.length > 50) {
                this.addWarning('name', 'Le nom est très long (>50 caractères)')
            }
        }

        // Validation de la position
        if (npc.position) {
            if (typeof npc.position !== 'object' || 
                typeof npc.position.x !== 'number' || 
                typeof npc.position.y !== 'number') {
                this.addError('position', 'Position invalide (x et y doivent être des nombres)')
            } else {
                if (npc.position.x < 0 || npc.position.y < 0) {
                    this.addWarning('position', 'Position négative détectée')
                }
                if (npc.position.x > 2000 || npc.position.y > 2000) {
                    this.addWarning('position', 'Position très éloignée (>2000px)')
                }
            }
        }

        // Validation du sprite
        if (npc.sprite) {
            if (!npc.sprite.endsWith('.png')) {
                this.addWarning('sprite', 'Le sprite devrait être un fichier .png')
            }
            if (npc.sprite.includes(' ')) {
                this.addError('sprite', 'Le nom du sprite ne doit pas contenir d\'espaces')
            }
        }
    }

    // Validation des champs communs
    validateCommonFields(npc) {
        // Direction
        if (npc.direction) {
            const validDirections = ['north', 'south', 'east', 'west']
            if (!validDirections.includes(npc.direction)) {
                this.addError('direction', `Direction invalide: ${npc.direction}`)
            }
        }

        // Rayon d'interaction
        if (npc.interactionRadius !== undefined) {
            if (typeof npc.interactionRadius !== 'number' || npc.interactionRadius < 16 || npc.interactionRadius > 128) {
                this.addError('interactionRadius', 'Le rayon d\'interaction doit être entre 16 et 128 pixels')
            }
        }

        // Cooldown
        if (npc.cooldownSeconds !== undefined) {
            if (typeof npc.cooldownSeconds !== 'number' || npc.cooldownSeconds < 0) {
                this.addError('cooldownSeconds', 'Le cooldown doit être un nombre positif')
            }
            if (npc.cooldownSeconds > 3600) {
                this.addWarning('cooldownSeconds', 'Cooldown très long (>1 heure)')
            }
        }
    }

    // Validation des champs spécifiques au type
    validateTypeSpecificFields(npc) {
        const typeConfig = NPC_TYPES[npc.type]
        
        // Vérifier les champs obligatoires du type
        typeConfig.fields.required.forEach(field => {
            if (!npc[field]) {
                this.addError(field, `Champ obligatoire pour ${npc.type}: ${field}`)
            }
        })

        // Validation selon le type
        switch (npc.type) {
            case 'dialogue':
                this.validateDialogueNPC(npc)
                break
            case 'merchant':
                this.validateMerchantNPC(npc)
                break
            case 'trainer':
                this.validateTrainerNPC(npc)
                break
            case 'healer':
                this.validateHealerNPC(npc)
                break
            case 'gym_leader':
                this.validateGymLeaderNPC(npc)
                break
            case 'transport':
                this.validateTransportNPC(npc)
                break
            case 'service':
                this.validateServiceNPC(npc)
                break
            case 'minigame':
                this.validateMinigameNPC(npc)
                break
            case 'researcher':
                this.validateResearcherNPC(npc)
                break
            case 'guild':
                this.validateGuildNPC(npc)
                break
            case 'event':
                this.validateEventNPC(npc)
                break
            case 'quest_master':
                this.validateQuestMasterNPC(npc)
                break
        }
    }

    // Validations spécifiques par type
validateDialogueNPC(npc) {
    // Aucune validation pour les dialogues - tous optionnels
}

    // conditionalDialogueIds complètement optionnel
    if (npc.conditionalDialogueIds) {
        // Nettoyer automatiquement si c'est un tableau
        if (Array.isArray(npc.conditionalDialogueIds)) {
            npc.conditionalDialogueIds = {}
        }
        
        // Si c'est un objet vide, c'est OK
        if (typeof npc.conditionalDialogueIds === 'object' && Object.keys(npc.conditionalDialogueIds).length === 0) {
            return // Objet vide = OK
        }
        
        // Sinon valider la structure
        if (typeof npc.conditionalDialogueIds === 'object') {
            Object.keys(npc.conditionalDialogueIds).forEach(condition => {
                const conditionData = npc.conditionalDialogueIds[condition]
                if (!conditionData || !conditionData.condition || !conditionData.dialogueId) {
                    this.addError('conditionalDialogueIds', `Condition "${condition}" incomplète`)
                }
            })
        }
    }
}

    validateMerchantNPC(npc) {
        if (!npc.shopId || typeof npc.shopId !== 'string') {
            this.addError('shopId', 'ID de boutique requis et doit être une chaîne')
        }

        if (!npc.shopType) {
            this.addError('shopType', 'Type de boutique requis')
        }

        if (npc.shopConfig) {
            if (npc.shopConfig.discountPercent !== undefined) {
                if (npc.shopConfig.discountPercent < 0 || npc.shopConfig.discountPercent > 90) {
                    this.addError('shopConfig', 'Remise doit être entre 0 et 90%')
                }
            }
        }

        if (npc.businessHours && npc.businessHours.enabled) {
            if (!npc.businessHours.openTime || !npc.businessHours.closeTime) {
                this.addError('businessHours', 'Horaires d\'ouverture et fermeture requis')
            }
        }
    }

    validateTrainerNPC(npc) {
        if (!npc.trainerId || typeof npc.trainerId !== 'string') {
            this.addError('trainerId', 'ID de dresseur requis')
        }

        if (!npc.trainerClass) {
            this.addError('trainerClass', 'Classe de dresseur requise')
        }

        if (!npc.battleConfig) {
            this.addError('battleConfig', 'Configuration de combat requise pour un dresseur')
        } else {
            if (!npc.battleConfig.teamId) {
                this.addError('battleConfig', 'ID d\'équipe requis dans la configuration de combat')
            }
            if (npc.battleConfig.levelCap && (npc.battleConfig.levelCap < 1 || npc.battleConfig.levelCap > 100)) {
                this.addError('battleConfig', 'Limite de niveau doit être entre 1 et 100')
            }
        }

        if (npc.visionConfig) {
            if (npc.visionConfig.sightRange && npc.visionConfig.sightRange > 200) {
                this.addWarning('visionConfig', 'Portée de vision très élevée (>200px)')
            }
        }
    }

    validateHealerNPC(npc) {
        if (!npc.healerConfig) {
            this.addError('healerConfig', 'Configuration de soins requise')
        } else {
            if (npc.healerConfig.cost !== undefined && npc.healerConfig.cost < 0) {
                this.addError('healerConfig', 'Le coût de soins ne peut pas être négatif')
            }
        }
    }

    validateGymLeaderNPC(npc) {
        if (!npc.gymConfig) {
            this.addError('gymConfig', 'Configuration d\'arène requise')
        } else {
            if (!npc.gymConfig.gymId || !npc.gymConfig.badgeId) {
                this.addError('gymConfig', 'ID d\'arène et ID de badge requis')
            }
            if (!npc.gymConfig.gymType) {
                this.addError('gymConfig', 'Type d\'arène requis (type Pokémon)')
            }
        }

        if (!npc.battleConfig) {
            this.addError('battleConfig', 'Configuration de combat requise pour un champion')
        }

        if (!npc.challengeConditions) {
            this.addWarning('challengeConditions', 'Conditions de défi recommandées pour un champion')
        }
    }

    validateTransportNPC(npc) {
        if (!npc.destinations || !Array.isArray(npc.destinations) || npc.destinations.length === 0) {
            this.addError('destinations', 'Au moins une destination requise')
        } else {
            npc.destinations.forEach((dest, index) => {
                if (!dest.mapId || !dest.mapName) {
                    this.addError('destinations', `Destination ${index + 1}: mapId et mapName requis`)
                }
                if (dest.cost !== undefined && dest.cost < 0) {
                    this.addError('destinations', `Destination ${index + 1}: coût ne peut pas être négatif`)
                }
            })
        }
    }

    validateServiceNPC(npc) {
        if (!npc.availableServices || !Array.isArray(npc.availableServices) || npc.availableServices.length === 0) {
            this.addError('availableServices', 'Au moins un service requis')
        }

        if (npc.serviceConfig) {
            if (npc.serviceConfig.maxUsesPerDay !== undefined && npc.serviceConfig.maxUsesPerDay < 0) {
                this.addError('serviceConfig', 'Nombre max d\'utilisations ne peut pas être négatif')
            }
        }
    }

    validateMinigameNPC(npc) {
        if (!npc.minigameConfig) {
            this.addError('minigameConfig', 'Configuration de mini-jeu requise')
        } else {
            if (npc.minigameConfig.entryFee !== undefined && npc.minigameConfig.entryFee < 0) {
                this.addError('minigameConfig', 'Frais d\'entrée ne peuvent pas être négatifs')
            }
        }
    }

    validateResearcherNPC(npc) {
        if (!npc.researchServices || !Array.isArray(npc.researchServices) || npc.researchServices.length === 0) {
            this.addError('researchServices', 'Au moins un service de recherche requis')
        }
    }

    validateGuildNPC(npc) {
        if (!npc.guildConfig) {
            this.addError('guildConfig', 'Configuration de guilde requise')
        } else {
            if (!npc.guildConfig.guildId || !npc.guildConfig.guildName) {
                this.addError('guildConfig', 'ID et nom de guilde requis')
            }
        }
    }

    validateEventNPC(npc) {
        if (!npc.eventConfig) {
            this.addError('eventConfig', 'Configuration d\'événement requise')
        }

        if (!npc.eventPeriod) {
            this.addError('eventPeriod', 'Période d\'événement requise')
        } else {
            if (npc.eventPeriod.startDate && npc.eventPeriod.endDate) {
                const start = new Date(npc.eventPeriod.startDate)
                const end = new Date(npc.eventPeriod.endDate)
                if (start >= end) {
                    this.addError('eventPeriod', 'Date de fin doit être après la date de début')
                }
            }
        }
    }

    validateQuestMasterNPC(npc) {
        if (!npc.questMasterConfig) {
            this.addError('questMasterConfig', 'Configuration de maître des quêtes requise')
        }

        if (!npc.questsToGive || npc.questsToGive.length === 0) {
            this.addWarning('questsToGive', 'Un maître des quêtes devrait avoir des quêtes à donner')
        }
    }

    // Validation de la logique métier
    validateBusinessLogic(npc) {
        // Vérifier la cohérence des quêtes
        if (npc.questsToGive && npc.questsToEnd) {
            const duplicates = npc.questsToGive.filter(quest => npc.questsToEnd.includes(quest))
            if (duplicates.length > 0) {
                this.addWarning('quests', `Quêtes présentes dans "à donner" ET "à terminer": ${duplicates.join(', ')}`)
            }
        }

        // Vérifier les conditions de spawn pour les événements
        if (npc.type === 'event' && npc.spawnConditions) {
            if (!npc.spawnConditions.requiredFlags?.includes('event_active')) {
                this.addSuggestion('spawnConditions', 'Ajouter "event_active" dans les flags requis pour un NPC d\'événement')
            }
        }

        // Vérifier les prix et coûts
        this.validateEconomics(npc)
    }

    validateEconomics(npc) {
        const economicFields = ['cost', 'entryFee', 'price', 'money']
        
        const checkEconomicValue = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return
            
            Object.keys(obj).forEach(key => {
                const value = obj[key]
                const fullPath = path ? `${path}.${key}` : key
                
                if (economicFields.includes(key) && typeof value === 'number') {
                    if (value < 0) {
                        this.addError(fullPath, `Valeur économique négative: ${fullPath}`)
                    }
                    if (value > 1000000) {
                        this.addWarning(fullPath, `Valeur économique très élevée: ${fullPath} (${value})`)
                    }
                } else if (typeof value === 'object') {
                    checkEconomicValue(value, fullPath)
                }
            })
        }
        
        checkEconomicValue(npc)
    }

    // Validation des références (IDs, noms de fichiers, etc.)
    validateReferences(npc) {
        // Vérifier les références aux sprites
        if (npc.sprite && !npc.sprite.match(/^[a-zA-Z0-9_-]+\.png$/)) {
            this.addWarning('sprite', 'Format de nom de sprite non standard (utilisez: lettres, chiffres, _ et - uniquement)')
        }

        // Vérifier les IDs de traduction
        const checkTranslationIds = (obj, path = '') => {
            if (!obj) return
            
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    if (typeof item === 'string' && item.startsWith('npc.')) {
                        if (!item.match(/^npc\.[a-z_]+\.[a-z_]+\.[a-z_]+\.\d+$/)) {
                            this.addWarning(`${path}[${index}]`, `Format d'ID de traduction non standard: ${item}`)
                        }
                    }
                })
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                    checkTranslationIds(obj[key], path ? `${path}.${key}` : key)
                })
            }
        }
        
        // Vérifier tous les IDs de dialogue
        if (npc.dialogueIds) checkTranslationIds(npc.dialogueIds, 'dialogueIds')
        if (npc.conditionalDialogueIds) checkTranslationIds(npc.conditionalDialogueIds, 'conditionalDialogueIds')
    }

    // Générer des suggestions d'amélioration
    generateSuggestions(npc) {
        // Suggestion de dialogues conditionnels
        if (npc.type === 'dialogue' && npc.dialogueIds && !npc.conditionalDialogueIds) {
            this.addSuggestion('conditionalDialogueIds', 'Ajoutez des dialogues conditionnels pour plus d\'immersion')
        }

        // Suggestion de quêtes
        if (['dialogue', 'merchant', 'service'].includes(npc.type) && 
            (!npc.questsToGive || npc.questsToGive.length === 0)) {
            this.addSuggestion('questsToGive', 'Considérez ajouter des quêtes pour plus d\'interactions')
        }

        // Suggestion de conditions de spawn
        if (!npc.spawnConditions && npc.type !== 'healer') {
            this.addSuggestion('spawnConditions', 'Ajoutez des conditions d\'apparition pour plus de dynamisme')
        }

        // Suggestion d'horaires pour les marchands
        if (npc.type === 'merchant' && !npc.businessHours?.enabled) {
            this.addSuggestion('businessHours', 'Ajoutez des horaires d\'ouverture pour plus de réalisme')
        }
    }

    // Méthodes utilitaires
    reset() {
        this.errors = []
        this.warnings = []
        this.suggestions = []
    }

    addError(field, message) {
        this.errors.push({ field, message, type: 'error' })
    }

    addWarning(field, message) {
        this.warnings.push({ field, message, type: 'warning' })
    }

    addSuggestion(field, message) {
        this.suggestions.push({ field, message, type: 'suggestion' })
    }

    getResult() {
        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
            suggestions: this.suggestions,
            total: this.errors.length + this.warnings.length + this.suggestions.length
        }
    }

    // Validation rapide (juste les erreurs critiques)
    quickValidate(npc) {
        this.reset()
        this.validateBasicFields(npc)
        
        if (npc.type && NPC_TYPES[npc.type]) {
            const typeConfig = NPC_TYPES[npc.type]
            typeConfig.fields.required.forEach(field => {
                if (!npc[field]) {
                    this.addError(field, `Champ obligatoire manquant: ${field}`)
                }
            })
        }

        return this.errors.length === 0
    }
}

// Validation par lot (pour valider plusieurs NPCs)
export class BatchNPCValidator {
    constructor() {
        this.validator = new NPCValidator()
        this.results = []
    }

    validateBatch(npcs) {
        this.results = []
        
        npcs.forEach((npc, index) => {
            const result = this.validator.validateNPC(npc)
            this.results.push({
                index,
                npc,
                ...result
            })
        })

        return this.getBatchSummary()
    }

    getBatchSummary() {
        const summary = {
            total: this.results.length,
            valid: this.results.filter(r => r.valid).length,
            invalid: this.results.filter(r => !r.valid).length,
            totalErrors: this.results.reduce((sum, r) => sum + r.errors.length, 0),
            totalWarnings: this.results.reduce((sum, r) => sum + r.warnings.length, 0),
            results: this.results
        }

        return summary
    }
}

// Fonction utilitaire pour validation rapide
export function validateNPC(npc) {
    const validator = new NPCValidator()
    return validator.validateNPC(npc)
}

export function quickValidateNPC(npc) {
    const validator = new NPCValidator()
    return validator.quickValidate(npc)
}

export default { NPCValidator, BatchNPCValidator, validateNPC, quickValidateNPC }
