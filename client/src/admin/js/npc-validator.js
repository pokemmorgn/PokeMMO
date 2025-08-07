// PokeWorld Admin Panel - NPC Validator avec LOGS DE DEBUG
// À remplacer dans client/src/admin/js/npc-validator.js

import { NPC_TYPES, COMMON_FIELDS, FIELD_VALIDATORS } from './npc-types-config.js'

export class NPCValidator {
    constructor(options = {}) {
        this.errors = []
        this.warnings = []
        this.suggestions = []
        this.enableLogging = options.enableLogging || false
        this.logLevel = options.logLevel || 'info'
    }

    log(level, message, data = null) {
        if (!this.enableLogging) return
        
        const levels = ['debug', 'info', 'warn', 'error']
        if (levels.indexOf(level) >= levels.indexOf(this.logLevel)) {
            console.log(`🔍 [NPCValidator] ${level.toUpperCase()}: ${message}`, data || '')
        }
    }

    // Validation complète d'un NPC
    validateNPC(npc) {
        this.reset()
        
        this.log('info', '=== DÉBUT VALIDATION NPC ===')
        this.log('debug', 'NPC à valider:', {
            id: npc?.id,
            name: npc?.name,
            type: npc?.type,
            keysCount: npc ? Object.keys(npc).length : 0
        })
        
        if (!npc || typeof npc !== 'object') {
            this.addError('general', 'NPC invalide ou manquant')
            this.log('error', 'NPC invalide ou manquant')
            return this.getResult()
        }

        // Validations de base
        this.log('info', 'Validation des champs de base...')
        this.validateBasicFields(npc)
        
        this.log('info', 'Validation des champs communs...')
        this.validateCommonFields(npc)
        
        // Validations spécifiques au type
        if (npc.type && NPC_TYPES[npc.type]) {
            this.log('info', `Validation spécifique au type: ${npc.type}`)
            this.validateTypeSpecificFields(npc)
            this.validateBusinessLogic(npc)
            this.validateReferences(npc)
        } else {
            this.addError('type', `Type NPC invalide: ${npc.type}`)
            this.log('error', `Type NPC invalide: ${npc.type}`)
        }

        // Suggestions d'amélioration
        this.generateSuggestions(npc)

        this.log('info', '=== RÉSULTAT VALIDATION ===')
        this.log('info', `Erreurs: ${this.errors.length}`)
        this.log('info', `Avertissements: ${this.warnings.length}`)
        this.log('info', `Suggestions: ${this.suggestions.length}`)
        
        if (this.errors.length > 0) {
            this.log('error', 'DÉTAIL DES ERREURS:')
            this.errors.forEach((error, index) => {
                this.log('error', `${index + 1}. [${error.field}] ${error.message}`)
            })
        }

        return this.getResult()
    }

    // Validation des champs de base obligatoires
    validateBasicFields(npc) {
        this.log('debug', 'validateBasicFields - début')
        
        const requiredFields = ['id', 'name', 'type', 'position', 'sprite']
        
        requiredFields.forEach(field => {
            this.log('debug', `Vérification champ requis: ${field}`, npc[field])
            
            if (!npc[field]) {
                this.addError(field, `Champ obligatoire manquant: ${field}`)
                this.log('error', `Champ manquant: ${field}`)
            }
        })

        // Validation du nom
        if (npc.name) {
            this.log('debug', 'Validation du nom:', npc.name)
            
            if (typeof npc.name !== 'string' || npc.name.trim().length < 2) {
                this.addError('name', 'Le nom doit contenir au moins 2 caractères')
                this.log('error', 'Nom invalide:', npc.name)
            }
            if (npc.name.length > 50) {
                this.addWarning('name', 'Le nom est très long (>50 caractères)')
                this.log('warn', 'Nom très long:', npc.name.length)
            }
        }

        // Validation de la position
        if (npc.position) {
            this.log('debug', 'Validation position:', npc.position)
            
            if (typeof npc.position !== 'object' || 
                typeof npc.position.x !== 'number' || 
                typeof npc.position.y !== 'number') {
                this.addError('position', 'Position invalide (x et y doivent être des nombres)')
                this.log('error', 'Position invalide:', {
                    position: npc.position,
                    xType: typeof npc.position?.x,
                    yType: typeof npc.position?.y
                })
            } else {
                if (npc.position.x < 0 || npc.position.y < 0) {
                    this.addWarning('position', 'Position négative détectée')
                    this.log('warn', 'Position négative:', npc.position)
                }
                if (npc.position.x > 2000 || npc.position.y > 2000) {
                    this.addWarning('position', 'Position très éloignée (>2000px)')
                    this.log('warn', 'Position éloignée:', npc.position)
                }
            }
        }

        // Validation du sprite
        if (npc.sprite) {
            this.log('debug', 'Validation sprite:', npc.sprite)
            
            if (!npc.sprite.endsWith('.png')) {
                this.addWarning('sprite', 'Le sprite devrait être un fichier .png')
                this.log('warn', 'Sprite pas .png:', npc.sprite)
            }
            if (npc.sprite.includes(' ')) {
                this.addError('sprite', 'Le nom du sprite ne doit pas contenir d\'espaces')
                this.log('error', 'Sprite avec espaces:', npc.sprite)
            }
        }
        
        this.log('debug', 'validateBasicFields - fin')
    }

    // Validation des champs communs
    validateCommonFields(npc) {
        this.log('debug', 'validateCommonFields - début')
        
        // Direction
        if (npc.direction) {
            this.log('debug', 'Validation direction:', npc.direction)
            
            const validDirections = ['north', 'south', 'east', 'west']
            if (!validDirections.includes(npc.direction)) {
                this.addError('direction', `Direction invalide: ${npc.direction}`)
                this.log('error', 'Direction invalide:', npc.direction)
            }
        }

        // Rayon d'interaction
        if (npc.interactionRadius !== undefined) {
            this.log('debug', 'Validation interactionRadius:', npc.interactionRadius)
            
            if (typeof npc.interactionRadius !== 'number' || npc.interactionRadius < 16 || npc.interactionRadius > 128) {
                this.addError('interactionRadius', 'Le rayon d\'interaction doit être entre 16 et 128 pixels')
                this.log('error', 'interactionRadius invalide:', npc.interactionRadius)
            }
        }

        // Cooldown
        if (npc.cooldownSeconds !== undefined) {
            this.log('debug', 'Validation cooldownSeconds:', npc.cooldownSeconds)
            
            if (typeof npc.cooldownSeconds !== 'number' || npc.cooldownSeconds < 0) {
                this.addError('cooldownSeconds', 'Le cooldown doit être un nombre positif')
                this.log('error', 'cooldownSeconds invalide:', npc.cooldownSeconds)
            }
            if (npc.cooldownSeconds > 3600) {
                this.addWarning('cooldownSeconds', 'Cooldown très long (>1 heure)')
                this.log('warn', 'Cooldown très long:', npc.cooldownSeconds)
            }
        }
        
        this.log('debug', 'validateCommonFields - fin')
    }

    // Validation des champs spécifiques au type
    validateTypeSpecificFields(npc) {
        this.log('debug', `validateTypeSpecificFields - type: ${npc.type}`)
        
        const typeConfig = NPC_TYPES[npc.type]
        
        if (!typeConfig) {
            this.addError('type', `Configuration manquante pour le type: ${npc.type}`)
            this.log('error', 'Config type manquante:', npc.type)
            return
        }
        
        // Vérifier les champs obligatoires du type
        if (typeConfig.fields && typeConfig.fields.required) {
            this.log('debug', 'Champs requis pour ce type:', typeConfig.fields.required)
            
            typeConfig.fields.required.forEach(field => {
                if (!npc[field]) {
                    this.addError(field, `Champ obligatoire pour ${npc.type}: ${field}`)
                    this.log('error', `Champ requis manquant pour ${npc.type}:`, field)
                }
            })
        }

        // Validation selon le type
        this.log('debug', `Validation spécifique pour type: ${npc.type}`)
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
            default:
                this.log('debug', `Pas de validation spécifique pour le type: ${npc.type}`)
        }
    }

    // ✅ NOUVELLE VERSION avec logs détaillés
    validateMerchantNPC(npc) {
        this.log('info', '=== VALIDATION MERCHANT ===')
        this.log('debug', 'NPC Merchant data:', {
            shopId: npc.shopId,
            shopIdType: typeof npc.shopId,
            shopConfig: npc.shopConfig,
            hasShopConfig: !!npc.shopConfig
        })
        
        // ✅ CORRECTION : Validation du nouveau format shopId simplifié
        if (npc.type === 'merchant') {
            // Vérifier que shopId existe et est une chaîne valide
            if (npc.shopId === undefined || npc.shopId === null) {
                this.log('warn', 'Merchant sans shopId - sera générique')
                this.addWarning('shopId', 'Merchant sans shopId - sera un marchand générique')
            } else if (typeof npc.shopId !== 'string') {
                this.log('error', 'shopId pas string:', typeof npc.shopId)
                this.addError('shopId', 'shopId doit être une chaîne de caractères')
            } else {
                // Validation du format shopId
                if (npc.shopId.trim().length === 0) {
                    this.log('info', 'shopId vide - marchand générique')
                    this.addWarning('shopId', 'shopId vide - sera un marchand générique')
                } else if (npc.shopId.includes(' ')) {
                    this.log('error', 'shopId avec espaces:', npc.shopId)
                    this.addError('shopId', 'shopId ne doit pas contenir d\'espaces')
                } else if (!npc.shopId.match(/^[a-zA-Z0-9_-]+$/)) {
                    this.log('warn', 'Format shopId non standard:', npc.shopId)
                    this.addWarning('shopId', 'Format d\'ID recommandé: lettres, chiffres, _ et - uniquement')
                } else {
                    this.log('info', 'shopId valide:', npc.shopId)
                }
            }
        }
        
        // ✅ MIGRATION : Détecter l'ancien format et avertir
        if (npc.shopConfig) {
            this.log('warn', 'Ancien format shopConfig détecté:', npc.shopConfig)
            this.addWarning('shopConfig', 'Ancien format shopConfig détecté - utilisez shopId directement')
            
            // Suggérer la migration
            if (npc.shopConfig.shopId && !npc.shopId) {
                this.log('info', 'Migration suggérée:', npc.shopConfig.shopId)
                this.addSuggestion('shopId', `Migrer shopConfig.shopId vers shopId: "${npc.shopConfig.shopId}"`)
            }
        }
        
        this.log('info', '=== FIN VALIDATION MERCHANT ===')
    }

    validateDialogueNPC(npc) {
        this.log('debug', 'validateDialogueNPC')
        // Pas de validation stricte pour les dialogues - complètement libre
    }

    validateTrainerNPC(npc) {
        this.log('debug', 'validateTrainerNPC')
        // Validation trainer existante...
    }

    validateHealerNPC(npc) {
        this.log('debug', 'validateHealerNPC')
        // Validation healer existante...
    }

    validateGymLeaderNPC(npc) {
        this.log('debug', 'validateGymLeaderNPC')
        // Validation gym leader existante...
    }

    validateTransportNPC(npc) {
        this.log('debug', 'validateTransportNPC')
        // Validation transport existante...
    }

    validateServiceNPC(npc) {
        this.log('debug', 'validateServiceNPC')
        // Validation service existante...
    }

    // Validation de la logique métier
    validateBusinessLogic(npc) {
        this.log('debug', 'validateBusinessLogic')
        // Logique existante...
    }

    // Validation des références
    validateReferences(npc) {
        this.log('debug', 'validateReferences')
        // Logique existante...
    }

    // Générer des suggestions d'amélioration
    generateSuggestions(npc) {
        this.log('debug', 'generateSuggestions')
        // Logique existante...
    }

    // Méthodes utilitaires
    reset() {
        this.errors = []
        this.warnings = []
        this.suggestions = []
    }

    addError(field, message) {
        this.errors.push({ field, message, type: 'error' })
        this.log('error', `ERREUR AJOUTÉE [${field}]: ${message}`)
    }

    addWarning(field, message) {
        this.warnings.push({ field, message, type: 'warning' })
        this.log('warn', `AVERTISSEMENT AJOUTÉ [${field}]: ${message}`)
    }

    addSuggestion(field, message) {
        this.suggestions.push({ field, message, type: 'suggestion' })
        this.log('info', `SUGGESTION AJOUTÉE [${field}]: ${message}`)
    }

    getResult() {
        const result = {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
            suggestions: this.suggestions,
            total: this.errors.length + this.warnings.length + this.suggestions.length
        }
        
        this.log('info', 'RÉSULTAT FINAL:', {
            valid: result.valid,
            errorsCount: result.errors.length,
            warningsCount: result.warnings.length,
            suggestionsCount: result.suggestions.length
        })
        
        return result
    }

    // Validation rapide (juste les erreurs critiques)
    quickValidate(npc) {
        this.reset()
        this.validateBasicFields(npc)
        
        if (npc.type && NPC_TYPES[npc.type]) {
            const typeConfig = NPC_TYPES[npc.type]
            if (typeConfig.fields && typeConfig.fields.required) {
                typeConfig.fields.required.forEach(field => {
                    if (!npc[field]) {
                        this.addError(field, `Champ obligatoire manquant: ${field}`)
                    }
                })
            }
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
