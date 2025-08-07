// PokeWorld Admin Panel - NPC Validator
// Validation intelligente et contextuelle des NPCs selon leur type
// Version avec validations assouplies

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

        // Validations de base (assouplies)
        this.validateBasicFields(npc)
        this.validateCommonFields(npc)
        
        // Validations spécifiques au type (optionnelles)
        if (npc.type && NPC_TYPES[npc.type]) {
            this.validateTypeSpecificFields(npc)
            this.validateBusinessLogic(npc)
            this.validateReferences(npc)
        } else if (npc.type) {
            this.addWarning('type', `Type NPC non reconnu: ${npc.type}`)
        }

        // Suggestions d'amélioration
        this.generateSuggestions(npc)

        return this.getResult()
    }

    // Validation des champs de base (plus flexible)
    validateBasicFields(npc) {
        // Seuls ID et nom sont vraiment obligatoires
        if (!npc.id) {
            this.addError('id', 'ID obligatoire')
        }
        
        if (!npc.name) {
            this.addError('name', 'Nom obligatoire')
        }

        // Les autres champs deviennent des warnings ou suggestions
        if (!npc.type) {
            this.addWarning('type', 'Type de NPC recommandé')
        }
        
        if (!npc.position) {
            this.addWarning('position', 'Position recommandée')
        }
        
        if (!npc.sprite) {
            this.addSuggestion('sprite', 'Sprite recommandé pour l\'affichage')
        }

        // Validation du nom (si présent)
        if (npc.name) {
            if (typeof npc.name !== 'string' || npc.name.trim().length < 1) {
                this.addError('name', 'Le nom doit contenir au moins 1 caractère')
            }
            if (npc.name.length > 100) {
                this.addWarning('name', 'Le nom est très long (>100 caractères)')
            }
        }

        // Validation de la position (si présente)
        if (npc.position) {
            if (typeof npc.position !== 'object') {
                this.addWarning('position', 'Position doit être un objet')
            } else {
                if (typeof npc.position.x !== 'number' || typeof npc.position.y !== 'number') {
                    this.addWarning('position', 'Position doit contenir x et y numériques')
                } else {
                    if (npc.position.x < 0 || npc.position.y < 0) {
                        this.addSuggestion('position', 'Position négative détectée')
                    }
                    if (npc.position.x > 5000 || npc.position.y > 5000) {
                        this.addSuggestion('position', 'Position très éloignée (>5000px)')
                    }
                }
            }
        }

        // Validation du sprite (si présent)
        if (npc.sprite) {
            if (!npc.sprite.endsWith('.png') && !npc.sprite.endsWith('.jpg') && !npc.sprite.endsWith('.gif')) {
                this.addSuggestion('sprite', 'Format d\'image recommandé: .png, .jpg ou .gif')
            }
            if (npc.sprite.includes(' ')) {
                this.addWarning('sprite', 'Le nom du sprite ne devrait pas contenir d\'espaces')
            }
        }
    }

    // Validation des champs communs (plus tolérante)
    validateCommonFields(npc) {
        // Direction
        if (npc.direction) {
            const validDirections = ['north', 'south', 'east', 'west', 'up', 'down', 'left', 'right']
            if (!validDirections.includes(npc.direction)) {
                this.addWarning('direction', `Direction non standard: ${npc.direction}`)
            }
        }

        // Rayon d'interaction
        if (npc.interactionRadius !== undefined) {
            if (typeof npc.interactionRadius !== 'number') {
                this.addWarning('interactionRadius', 'Le rayon d\'interaction doit être un nombre')
            } else if (npc.interactionRadius < 8 || npc.interactionRadius > 256) {
                this.addSuggestion('interactionRadius', 'Rayon d\'interaction recommandé: 8-256 pixels')
            }
        }

        // Cooldown
        if (npc.cooldownSeconds !== undefined) {
            if (typeof npc.cooldownSeconds !== 'number' || npc.cooldownSeconds < 0) {
                this.addWarning('cooldownSeconds', 'Le cooldown doit être un nombre positif')
            }
            if (npc.cooldownSeconds > 7200) {
                this.addSuggestion('cooldownSeconds', 'Cooldown très long (>2 heures)')
            }
        }
    }

    // Validation des champs spécifiques au type (plus flexible)
    validateTypeSpecificFields(npc) {
        const typeConfig = NPC_TYPES[npc.type]
        
        // Champs obligatoires deviennent des warnings
        if (typeConfig && typeConfig.fields && typeConfig.fields.required) {
            typeConfig.fields.required.forEach(field => {
                if (!npc[field]) {
                    this.addWarning(field, `Champ recommandé pour ${npc.type}: ${field}`)
                }
            })
        }

        // Validation selon le type (assouplies)
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

    // Validations spécifiques par type (assouplies)
    validateDialogueNPC(npc) {
        // Dialogue IDs complètement optionnels
        if (!npc.dialogueIds) {
            this.addSuggestion('dialogueIds', 'Ajoutez des dialogues pour l\'interaction')
        }
        
        // conditionalDialogueIds complètement optionnel
        if (npc.conditionalDialogueIds) {
            // Nettoyer automatiquement si c'est un tableau
            if (Array.isArray(npc.conditionalDialogueIds)) {
                npc.conditionalDialogueIds = {}
            }
            
            // Validation souple de la structure
            if (typeof npc.conditionalDialogueIds === 'object' && Object.keys(npc.conditionalDialogueIds).length > 0) {
                Object.keys(npc.conditionalDialogueIds).forEach(condition => {
                    const conditionData = npc.conditionalDialogueIds[condition]
                    if (!conditionData || !conditionData.condition || !conditionData.dialogueId) {
                        this.addWarning('conditionalDialogueIds', `Condition "${condition}" incomplète`)
                    }
                })
            }
        }
    }

    validateMerchantNPC(npc) {
        if (!npc.shopId) {
            this.addWarning('shopId', 'ID de boutique recommandé pour un marchand')
        } else if (typeof npc.shopId !== 'string') {
            this.addWarning('shopId', 'ID de boutique doit être une chaîne')
        } else {
            // Validation souple du format shopId
            if (npc.shopId.trim().length === 0) {
                this.addWarning('shopId', 'ID de boutique ne peut pas être vide')
            }
            if (npc.shopId.includes(' ')) {
                this.addSuggestion('shopId', 'ID de boutique ne devrait pas contenir d\'espaces')
            }
            if (!npc.shopId.match(/^[a-zA-Z0-9_-]+$/)) {
                this.addSuggestion('shopId', 'Format d\'ID recommandé: lettres, chiffres, _ et - uniquement')
            }
        }
    }

    validateTrainerNPC(npc) {
        if (!npc.trainerId) {
            this.addWarning('trainerId', 'ID de dresseur recommandé')
        }

        if (!npc.trainerClass) {
            this.addSuggestion('trainerClass', 'Classe de dresseur recommandée')
        }

        if (!npc.battleConfig) {
            this.addWarning('battleConfig', 'Configuration de combat recommandée pour un dresseur')
        } else {
            if (!npc.battleConfig.teamId) {
                this.addWarning('battleConfig', 'ID d\'équipe recommandé dans la configuration de combat')
            }
            if (npc.battleConfig.levelCap && (npc.battleConfig.levelCap < 1 || npc.battleConfig.levelCap > 100)) {
                this.addWarning('battleConfig', 'Limite de niveau recommandée: 1-100')
            }
        }

        if (npc.visionConfig && npc.visionConfig.sightRange && npc.visionConfig.sightRange > 300) {
            this.addSuggestion('visionConfig', 'Portée de vision très élevée (>300px)')
        }
    }

    validateHealerNPC(npc) {
        if (!npc.healerConfig) {
            this.addWarning('healerConfig', 'Configuration de soins recommandée')
        } else {
            if (npc.healerConfig.cost !== undefined && npc.healerConfig.cost < 0) {
                this.addWarning('healerConfig', 'Le coût de soins ne devrait pas être négatif')
            }
        }
    }

    validateGymLeaderNPC(npc) {
        if (!npc.gymConfig) {
            this.addWarning('gymConfig', 'Configuration d\'arène recommandée')
        } else {
            if (!npc.gymConfig.gymId || !npc.gymConfig.badgeId) {
                this.addWarning('gymConfig', 'ID d\'arène et ID de badge recommandés')
            }
            if (!npc.gymConfig.gymType) {
                this.addSuggestion('gymConfig', 'Type d\'arène recommandé (type Pokémon)')
            }
        }

        if (!npc.battleConfig) {
            this.addWarning('battleConfig', 'Configuration de combat recommandée pour un champion')
        }

        if (!npc.challengeConditions) {
            this.addSuggestion('challengeConditions', 'Conditions de défi recommandées pour un champion')
        }
    }

    validateTransportNPC(npc) {
        if (!npc.destinations || !Array.isArray(npc.destinations) || npc.destinations.length === 0) {
            this.addWarning('destinations', 'Au moins une destination recommandée')
        } else {
            npc.destinations.forEach((dest, index) => {
                if (!dest.mapId && !dest.mapName) {
                    this.addWarning('destinations', `Destination ${index + 1}: mapId ou mapName recommandé`)
                }
                if (dest.cost !== undefined && dest.cost < 0) {
                    this.addWarning('destinations', `Destination ${index + 1}: coût négatif détecté`)
                }
            })
        }
    }

    validateServiceNPC(npc) {
        if (!npc.availableServices || !Array.isArray(npc.availableServices) || npc.availableServices.length === 0) {
            this.addWarning('availableServices', 'Au moins un service recommandé')
        }

        if (npc.serviceConfig && npc.serviceConfig.maxUsesPerDay !== undefined && npc.serviceConfig.maxUsesPerDay < 0) {
            this.addWarning('serviceConfig', 'Nombre max d\'utilisations négatif détecté')
        }
    }

    validateMinigameNPC(npc) {
        if (!npc.minigameConfig) {
            this.addWarning('minigameConfig', 'Configuration de mini-jeu recommandée')
        } else {
            if (npc.minigameConfig.entryFee !== undefined && npc.minigameConfig.entryFee < 0) {
                this.addWarning('minigameConfig', 'Frais d\'entrée négatifs détectés')
            }
        }
    }

    validateResearcherNPC(npc) {
        if (!npc.researchServices || !Array.isArray(npc.researchServices) || npc.researchServices.length === 0) {
            this.addWarning('researchServices', 'Au moins un service de recherche recommandé')
        }
    }

    validateGuildNPC(npc) {
        if (!npc.guildConfig) {
            this.addWarning('guildConfig', 'Configuration de guilde recommandée')
        } else {
            if (!npc.guildConfig.guildId || !npc.guildConfig.guildName) {
                this.addWarning('guildConfig', 'ID et nom de guilde recommandés')
            }
        }
    }

    validateEventNPC(npc) {
        if (!npc.eventConfig) {
            this.addWarning('eventConfig', 'Configuration d\'événement recommandée')
        }

        if (!npc.eventPeriod) {
            this.addSuggestion('eventPeriod', 'Période d\'événement recommandée')
        } else {
            if (npc.eventPeriod.startDate && npc.eventPeriod.endDate) {
                const start = new Date(npc.eventPeriod.startDate)
                const end = new Date(npc.eventPeriod.endDate)
                if (start >= end) {
                    this.addWarning('eventPeriod', 'Date de fin devrait être après la date de début')
                }
            }
        }
    }

    validateQuestMasterNPC(npc) {
        if (!npc.questMasterConfig) {
            this.addWarning('questMasterConfig', 'Configuration de maître des quêtes recommandée')
        }

        if (!npc.questsToGive || npc.questsToGive.length === 0) {
            this.addSuggestion('questsToGive', 'Un maître des quêtes devrait avoir des quêtes à donner')
        }
    }

    // Validation de la logique métier (assouplies)
    validateBusinessLogic(npc) {
        // Vérifier la cohérence des quêtes
        if (npc.questsToGive && npc.questsToEnd) {
            const duplicates = npc.questsToGive.filter(quest => npc.questsToEnd.includes(quest))
            if (duplicates.length > 0) {
                this.addSuggestion('quests', `Quêtes présentes dans "à donner" ET "à terminer": ${duplicates.join(', ')}`)
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
                        this.addWarning(fullPath, `Valeur économique négative: ${fullPath}`)
                    }
                    if (value > 10000000) {
                        this.addSuggestion(fullPath, `Valeur économique très élevée: ${fullPath} (${value})`)
                    }
                } else if (typeof value === 'object') {
                    checkEconomicValue(value, fullPath)
                }
            })
        }
        
        checkEconomicValue(npc)
    }

    // Validation des références (plus tolérante)
    validateReferences(npc) {
        // Vérifier les références aux sprites
        if (npc.sprite && !npc.sprite.match(/^[a-zA-Z0-9_.-]+\.(png|jpg|gif)$/)) {
            this.addSuggestion('sprite', 'Format de nom de sprite recommandé: lettres, chiffres, _, . et - uniquement')
        }

        // Vérifier les IDs de traduction (suggestions seulement)
        const checkTranslationIds = (obj, path = '') => {
            if (!obj) return
            
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    if (typeof item === 'string' && item.startsWith('npc.')) {
                        if (!item.match(/^npc\.[a-z_]+\.[a-z_]+\.[a-z_]+\.\d+$/)) {
                            this.addSuggestion(`${path}[${index}]`, `Format d'ID de traduction recommandé: ${item}`)
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
        
        // Suggestion pour les marchands
        if (npc.type === 'merchant' && npc.shopId) {
            this.addSuggestion('shopId', 'Configurez les détails de la boutique dans le module ShopData')
        }

        // Suggestions générales
        if (!npc.description) {
            this.addSuggestion('description', 'Ajoutez une description pour documenter le NPC')
        }

        if (!npc.interactionRadius) {
            this.addSuggestion('interactionRadius', 'Définissez un rayon d\'interaction (par défaut: 32px)')
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

    // Validation ultra-minimale (seulement les erreurs critiques)
    quickValidate(npc) {
        this.reset()
        
        // Seuls les champs absolument essentiels
        if (!npc.id) {
            this.addError('id', 'ID obligatoire')
        }
        if (!npc.name) {
            this.addError('name', 'Nom obligatoire')
        }

        return this.errors.length === 0
    }

    // Validation stricte (mode original)
    strictValidate(npc) {
        // Ici on pourrait garder l'ancienne logique si besoin
        return this.validateNPC(npc)
    }
}

// Validation par lot (pour valider plusieurs NPCs)
export class BatchNPCValidator {
    constructor(strictMode = false) {
        this.validator = new NPCValidator()
        this.results = []
        this.strictMode = strictMode
    }

    validateBatch(npcs) {
        this.results = []
        
        npcs.forEach((npc, index) => {
            const result = this.strictMode ? 
                this.validator.strictValidate(npc) : 
                this.validator.validateNPC(npc)
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
            totalSuggestions: this.results.reduce((sum, r) => sum + r.suggestions.length, 0),
            results: this.results
        }

        return summary
    }
}

// Fonction utilitaire pour validation rapide
export function validateNPC(npc, strictMode = false) {
    const validator = new NPCValidator()
    return strictMode ? validator.strictValidate(npc) : validator.validateNPC(npc)
}

export function quickValidateNPC(npc) {
    const validator = new NPCValidator()
    return validator.quickValidate(npc)
}

export default { NPCValidator, BatchNPCValidator, validateNPC, quickValidateNPC }
