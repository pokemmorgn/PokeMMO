// PokeWorld Admin Panel - Enhanced Quests Module

export class QuestsModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'quests'
        this.currentQuest = null
        this.questSteps = []
        
        console.log('📜 [Quests] Enhanced Module initialized')
    }

    async loadQuests() {
        console.log('📜 [Quests] Loading quests...')
        this.adminPanel.showLoading('questsLoading', true)
        
        try {
            const data = await this.adminPanel.apiCall('/quests')
            this.displayQuests(data.quests)
            
            const updateElement = document.getElementById('questsLastUpdate')
            if (updateElement) {
                updateElement.textContent = 
                    `Dernière mise à jour: ${new Date().toLocaleTimeString()} (${data.total || data.quests.length} quêtes)`
            }
            
            this.adminPanel.showNotification(`${data.quests.length} quêtes chargées`, 'success')
        } catch (error) {
            this.adminPanel.showNotification('Erreur chargement quêtes: ' + error.message, 'error')
        } finally {
            this.adminPanel.showLoading('questsLoading', false)
        }
    }

    displayQuests(quests) {
        const tbody = document.getElementById('questsTableBody')
        if (!tbody) return
        
        if (quests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        Aucune quête trouvée
                    </td>
                </tr>
            `
            return
        }

        tbody.innerHTML = quests.map(quest => `
            <tr>
                <td><code>${quest.id}</code></td>
                <td><strong>${quest.name}</strong></td>
                <td>
                    <span class="badge ${this.getCategoryColor(quest.category)}">
                        ${this.getCategoryLabel(quest.category)}
                    </span>
                </td>
                <td>${quest.steps?.length || 0} étapes</td>
                <td>${quest.isRepeatable ? '✅' : '❌'}</td>
                <td>${quest.autoComplete ? '✅' : '❌'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="adminPanel.quests.editQuest('${quest.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="adminPanel.quests.duplicateQuest('${quest.id}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminPanel.quests.deleteQuest('${quest.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('')
    }

    getCategoryColor(category) {
        const colors = {
            'main': 'danger',
            'side': 'info', 
            'daily': 'warning',
            'event': 'success'
        }
        return colors[category] || 'secondary'
    }

    getCategoryLabel(category) {
        const labels = {
            'main': 'Principale',
            'side': 'Secondaire',
            'daily': 'Quotidienne', 
            'event': 'Événement'
        }
        return labels[category] || category
    }

    createNewQuest() {
        console.log('📜 [Quests] Creating new quest')
        
        this.currentQuest = null
        this.questSteps = []
        
        const editorTitle = document.getElementById('questEditorTitle')
        if (editorTitle) {
            editorTitle.textContent = 'Nouvelle Quête'
        }
        
        this.clearQuestEditor()
        this.adminPanel.showModal('questEditorModal')
    }

    async editQuest(questId) {
        console.log(`📜 [Quests] Editing quest: ${questId}`)
        
        try {
            const data = await this.adminPanel.apiCall('/quests')
            const quest = data.quests.find(q => q.id === questId)
            
            if (!quest) {
                this.adminPanel.showNotification('Quête non trouvée', 'error')
                return
            }
            
            this.currentQuest = quest
            this.questSteps = quest.steps || []
            
            const editorTitle = document.getElementById('questEditorTitle')
            if (editorTitle) {
                editorTitle.textContent = `Éditer: ${quest.name}`
            }
            
            this.fillQuestEditor(quest)
            this.adminPanel.showModal('questEditorModal')
        } catch (error) {
            this.adminPanel.showNotification('Erreur chargement quête: ' + error.message, 'error')
        }
    }

    async duplicateQuest(questId) {
        if (!confirm(`Dupliquer la quête "${questId}" ?`)) return
        
        console.log(`📜 [Quests] Duplicating quest: ${questId}`)
        
        try {
            const data = await this.adminPanel.apiCall(`/quests/${questId}/duplicate`, { 
                method: 'POST' 
            })
            this.adminPanel.showNotification('Quête dupliquée avec succès', 'success')
            this.loadQuests()
        } catch (error) {
            this.adminPanel.showNotification('Erreur duplication: ' + error.message, 'error')
        }
    }

    async deleteQuest(questId) {
        if (!confirm(`SUPPRIMER définitivement la quête "${questId}" ?\n\nCette action est irréversible !`)) return
        
        console.log(`📜 [Quests] Deleting quest: ${questId}`)
        
        try {
            await this.adminPanel.apiCall(`/quests/${questId}`, { method: 'DELETE' })
            this.adminPanel.showNotification('Quête supprimée avec succès', 'success')
            this.loadQuests()
        } catch (error) {
            this.adminPanel.showNotification('Erreur suppression: ' + error.message, 'error')
        }
    }

    fillQuestEditor(quest) {
        // Basic info
        this.setInputValue('questId', quest.id || '')
        this.setInputValue('questName', quest.name || '')
        this.setInputValue('questCategory', quest.category || 'side')
        this.setInputValue('questDescription', quest.description || '')
        this.setInputValue('questStartNpc', quest.startNpcId || '')
        this.setInputValue('questEndNpc', quest.endNpcId || '')
        this.setCheckboxValue('questRepeatable', quest.isRepeatable || false)
        this.setCheckboxValue('questAutoComplete', quest.autoComplete || false)
        
        // Dialogues
        this.setInputValue('questDialogueOffer', 
            quest.dialogues?.questOffer?.join('\n') || '')
        this.setInputValue('questDialogueProgress', 
            quest.dialogues?.questInProgress?.join('\n') || '')
        this.setInputValue('questDialogueComplete', 
            quest.dialogues?.questComplete?.join('\n') || '')
        
        // Steps
        this.renderQuestSteps(quest.steps || [])
    }

    setInputValue(elementId, value) {
        const element = document.getElementById(elementId)
        if (element) {
            element.value = value
        }
    }

    setCheckboxValue(elementId, value) {
        const element = document.getElementById(elementId)
        if (element) {
            element.checked = value
        }
    }

    clearQuestEditor() {
        const form = document.getElementById('questEditorForm')
        if (form) {
            form.reset()
        }
        
        const stepsContainer = document.getElementById('questStepsContainer')
        if (stepsContainer) {
            stepsContainer.innerHTML = ''
        }
        
        this.questSteps = []
    }

    renderQuestSteps(steps) {
        const container = document.getElementById('questStepsContainer')
        if (!container) return
        
        this.questSteps = [...steps]
        container.innerHTML = ''
        
        steps.forEach((step, index) => {
            const stepDiv = document.createElement('div')
            stepDiv.className = 'quest-step-editor'
            stepDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f8f9fa; padding: 10px; border-radius: 8px;">
                    <h5 style="margin: 0; color: #2c3e50;">Étape ${index + 1}: ${step.name || 'Sans nom'}</h5>
                    <button type="button" class="btn btn-danger btn-sm" onclick="adminPanel.quests.removeQuestStep(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label class="form-label">Nom de l'étape</label>
                        <input type="text" class="form-input" placeholder="Nom de l'étape" 
                               value="${step.name || ''}" onchange="adminPanel.quests.updateStepData(${index}, 'name', this.value)">
                    </div>
                    <div>
                        <label class="form-label">Description</label>
                        <input type="text" class="form-input" placeholder="Description de l'étape" 
                               value="${step.description || ''}" onchange="adminPanel.quests.updateStepData(${index}, 'description', this.value)">
                    </div>
                </div>
                
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h6 style="margin: 0; color: #495057;">Objectifs de l'étape</h6>
                        <button type="button" class="btn btn-success btn-sm" onclick="adminPanel.quests.addObjectiveToStep(${index})">
                            <i class="fas fa-plus"></i> Ajouter Objectif
                        </button>
                    </div>
                    
                    <div id="objectives-${index}">
                        ${step.objectives ? step.objectives.map((obj, objIndex) => this.renderObjectiveEditor(index, objIndex, obj)).join('') : ''}
                    </div>
                </div>
                
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h6 style="margin: 0; color: #495057;">Récompenses</h6>
                        <button type="button" class="btn btn-success btn-sm" onclick="adminPanel.quests.addRewardToStep(${index})">
                            <i class="fas fa-plus"></i> Ajouter Récompense
                        </button>
                    </div>
                    
                    <div id="rewards-${index}">
                        ${step.rewards ? step.rewards.map((reward, rewardIndex) => this.renderRewardEditor(index, rewardIndex, reward)).join('') : ''}
                    </div>
                </div>
            `
            
            container.appendChild(stepDiv)
        })
    }

    renderObjectiveEditor(stepIndex, objIndex, objective) {
        return `
            <div style="border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin-bottom: 10px; position: relative;">
                <button type="button" class="btn btn-danger btn-sm" 
                        style="position: absolute; top: 5px; right: 5px; padding: 2px 6px;"
                        onclick="adminPanel.quests.removeObjective(${stepIndex}, ${objIndex})">
                    <i class="fas fa-times"></i>
                </button>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">Type d'objectif</label>
                        <select class="form-select" onchange="adminPanel.quests.updateObjectiveType(${stepIndex}, ${objIndex}, this.value)">
                            <option value="collect" ${objective.type === 'collect' ? 'selected' : ''}>Collecte</option>
                            <option value="defeat" ${objective.type === 'defeat' ? 'selected' : ''}>Vaincre Pokémon</option>
                            <option value="defeat_trainers" ${objective.type === 'defeat_trainers' ? 'selected' : ''}>Vaincre Dresseurs</option>
                            <option value="talk" ${objective.type === 'talk' ? 'selected' : ''}>Parler</option>
                            <option value="deliver" ${objective.type === 'deliver' ? 'selected' : ''}>Livrer</option>
                            <option value="reach" ${objective.type === 'reach' ? 'selected' : ''}>Atteindre</option>
                            <option value="trade" ${objective.type === 'trade' ? 'selected' : ''}>Échanger</option>
                            <option value="catch" ${objective.type === 'catch' ? 'selected' : ''}>Capturer</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">Cible</label>
                        <input type="text" class="form-input" placeholder="ID ou nom de la cible" 
                               value="${objective.target || ''}" 
                               onchange="adminPanel.quests.updateObjectiveField(${stepIndex}, ${objIndex}, 'target', this.value)">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">Quantité</label>
                        <input type="number" class="form-input" placeholder="1" min="1"
                               value="${objective.requiredAmount || 1}" 
                               onchange="adminPanel.quests.updateObjectiveField(${stepIndex}, ${objIndex}, 'requiredAmount', parseInt(this.value))">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">Nom affiché</label>
                        <input type="text" class="form-input" placeholder="Nom pour l'affichage" 
                               value="${objective.targetName || ''}" 
                               onchange="adminPanel.quests.updateObjectiveField(${stepIndex}, ${objIndex}, 'targetName', this.value)">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">Item (pour livraison/échange)</label>
                        <input type="text" class="form-input" placeholder="ID de l'item" 
                               value="${objective.itemId || ''}" 
                               onchange="adminPanel.quests.updateObjectiveField(${stepIndex}, ${objIndex}, 'itemId', this.value)">
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label class="form-label" style="font-size: 0.9rem;">Description</label>
                    <input type="text" class="form-input" placeholder="Description de l'objectif" 
                           value="${objective.description || ''}" 
                           onchange="adminPanel.quests.updateObjectiveField(${stepIndex}, ${objIndex}, 'description', this.value)">
                </div>
                
                ${objective.type === 'talk' || objective.type === 'deliver' ? `
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">Dialogue de validation (une ligne par dialogue)</label>
                        <textarea class="form-input" rows="3" placeholder="Dialogue après accomplissement..."
                                  onchange="adminPanel.quests.updateObjectiveValidation(${stepIndex}, ${objIndex}, this.value)">${(objective.validationDialogue || []).join('\n')}</textarea>
                    </div>
                ` : ''}
                
                ${objective.type === 'trade' ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label class="form-label" style="font-size: 0.9rem;">Pokémon à donner</label>
                            <input type="text" class="form-input" placeholder="Nom du Pokémon" 
                                   value="${objective.tradePokemon || ''}" 
                                   onchange="adminPanel.quests.updateObjectiveField(${stepIndex}, ${objIndex}, 'tradePokemon', this.value)">
                        </div>
                        <div>
                            <label class="form-label" style="font-size: 0.9rem;">Pokémon à recevoir</label>
                            <input type="text" class="form-input" placeholder="Nom du Pokémon" 
                                   value="${objective.receivePokemon || ''}" 
                                   onchange="adminPanel.quests.updateObjectiveField(${stepIndex}, ${objIndex}, 'receivePokemon', this.value)">
                        </div>
                    </div>
                ` : ''}
            </div>
        `
    }

    renderRewardEditor(stepIndex, rewardIndex, reward) {
        return `
            <div style="border: 1px solid #e9ecef; border-radius: 6px; padding: 10px; margin-bottom: 10px; position: relative;">
                <button type="button" class="btn btn-danger btn-sm" 
                        style="position: absolute; top: 5px; right: 5px; padding: 2px 6px;"
                        onclick="adminPanel.quests.removeReward(${stepIndex}, ${rewardIndex})">
                    <i class="fas fa-times"></i>
                </button>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">Type</label>
                        <select class="form-select" onchange="adminPanel.quests.updateRewardField(${stepIndex}, ${rewardIndex}, 'type', this.value)">
                            <option value="gold" ${reward.type === 'gold' ? 'selected' : ''}>Gold</option>
                            <option value="item" ${reward.type === 'item' ? 'selected' : ''}>Item</option>
                            <option value="pokemon" ${reward.type === 'pokemon' ? 'selected' : ''}>Pokémon</option>
                            <option value="experience" ${reward.type === 'experience' ? 'selected' : ''}>Expérience</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.9rem;">${reward.type === 'item' ? 'Item ID' : reward.type === 'pokemon' ? 'Pokémon' : 'Quantité'}</label>
                        <input type="text" class="form-input" 
                               value="${reward.type === 'item' ? (reward.itemId || '') : reward.type === 'pokemon' ? (reward.pokemonId || '') : (reward.amount || 0)}" 
                               onchange="adminPanel.quests.updateRewardField(${stepIndex}, ${rewardIndex}, '${reward.type === 'item' ? 'itemId' : reward.type === 'pokemon' ? 'pokemonId' : 'amount'}', this.value)">
                    </div>
                    ${reward.type === 'item' || reward.type === 'pokemon' ? `
                        <div>
                            <label class="form-label" style="font-size: 0.9rem;">Quantité</label>
                            <input type="number" class="form-input" min="1"
                                   value="${reward.amount || 1}" 
                                   onchange="adminPanel.quests.updateRewardField(${stepIndex}, ${rewardIndex}, 'amount', parseInt(this.value))">
                        </div>
                    ` : '<div></div>'}
                </div>
            </div>
        `
    }

    addQuestStep() {
        console.log('📜 [Quests] Adding quest step')
        
        const newStep = {
            id: `step_${this.questSteps.length + 1}`,
            name: 'Nouvelle étape',
            description: 'Description de l\'étape',
            objectives: [],
            rewards: []
        }
        
        this.questSteps.push(newStep)
        this.renderQuestSteps(this.questSteps)
    }

    removeQuestStep(index) {
        console.log(`📜 [Quests] Removing quest step: ${index}`)
        
        if (confirm('Supprimer cette étape ?')) {
            this.questSteps.splice(index, 1)
            this.renderQuestSteps(this.questSteps)
        }
    }

    updateStepData(stepIndex, field, value) {
        if (this.questSteps[stepIndex]) {
            this.questSteps[stepIndex][field] = value
        }
    }

    addObjectiveToStep(stepIndex) {
        if (!this.questSteps[stepIndex]) return
        
        const newObjective = {
            id: `obj_${Math.random().toString(36).substring(2, 8)}`,
            type: 'collect',
            description: 'Nouvel objectif',
            target: '',
            targetName: '',
            requiredAmount: 1
        }
        
        if (!this.questSteps[stepIndex].objectives) {
            this.questSteps[stepIndex].objectives = []
        }
        
        this.questSteps[stepIndex].objectives.push(newObjective)
        this.renderQuestSteps(this.questSteps)
    }

    removeObjective(stepIndex, objIndex) {
        if (this.questSteps[stepIndex] && this.questSteps[stepIndex].objectives) {
            this.questSteps[stepIndex].objectives.splice(objIndex, 1)
            this.renderQuestSteps(this.questSteps)
        }
    }

    updateObjectiveType(stepIndex, objIndex, newType) {
        if (this.questSteps[stepIndex] && this.questSteps[stepIndex].objectives[objIndex]) {
            const objective = this.questSteps[stepIndex].objectives[objIndex]
            objective.type = newType
            
            // Reset type-specific fields
            delete objective.itemId
            delete objective.tradePokemon
            delete objective.receivePokemon
            delete objective.validationDialogue
            
            this.renderQuestSteps(this.questSteps)
        }
    }

    updateObjectiveField(stepIndex, objIndex, field, value) {
        if (this.questSteps[stepIndex] && this.questSteps[stepIndex].objectives[objIndex]) {
            this.questSteps[stepIndex].objectives[objIndex][field] = value
        }
    }

    updateObjectiveValidation(stepIndex, objIndex, value) {
        if (this.questSteps[stepIndex] && this.questSteps[stepIndex].objectives[objIndex]) {
            this.questSteps[stepIndex].objectives[objIndex].validationDialogue = 
                value.split('\n').filter(line => line.trim())
        }
    }

    addRewardToStep(stepIndex) {
        if (!this.questSteps[stepIndex]) return
        
        const newReward = {
            type: 'gold',
            amount: 100
        }
        
        if (!this.questSteps[stepIndex].rewards) {
            this.questSteps[stepIndex].rewards = []
        }
        
        this.questSteps[stepIndex].rewards.push(newReward)
        this.renderQuestSteps(this.questSteps)
    }

    removeReward(stepIndex, rewardIndex) {
        if (this.questSteps[stepIndex] && this.questSteps[stepIndex].rewards) {
            this.questSteps[stepIndex].rewards.splice(rewardIndex, 1)
            this.renderQuestSteps(this.questSteps)
        }
    }

    updateRewardField(stepIndex, rewardIndex, field, value) {
        if (this.questSteps[stepIndex] && this.questSteps[stepIndex].rewards[rewardIndex]) {
            this.questSteps[stepIndex].rewards[rewardIndex][field] = value
        }
    }

    async saveQuest() {
        console.log('📜 [Quests] Saving quest')
        
        try {
            const questData = this.collectQuestData()
            
            // Validation
            if (!this.validateQuestData(questData)) {
                return
            }
            
            const method = this.currentQuest ? 'PUT' : 'POST'
            const endpoint = this.currentQuest ? `/quests/${this.currentQuest.id}` : '/quests'
            
            const result = await this.adminPanel.apiCall(endpoint, {
                method: method,
                body: JSON.stringify(questData)
            })
            
            this.adminPanel.showNotification(result.message || 'Quête sauvegardée avec succès', 'success')
            this.closeQuestEditor()
            this.loadQuests()
            
        } catch (error) {
            this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error')
        }
    }

    collectQuestData() {
        return {
            id: document.getElementById('questId')?.value || '',
            name: document.getElementById('questName')?.value || '',
            description: document.getElementById('questDescription')?.value || '',
            category: document.getElementById('questCategory')?.value || 'side',
            startNpcId: this.parseIntOrNull('questStartNpc'),
            endNpcId: this.parseIntOrNull('questEndNpc'),
            isRepeatable: document.getElementById('questRepeatable')?.checked || false,
            autoComplete: document.getElementById('questAutoComplete')?.checked || false,
            dialogues: {
                questOffer: this.getDialogueLines('questDialogueOffer'),
                questInProgress: this.getDialogueLines('questDialogueProgress'),
                questComplete: this.getDialogueLines('questDialogueComplete')
            },
            steps: this.questSteps
        }
    }

    parseIntOrNull(elementId) {
        const value = document.getElementById(elementId)?.value
        return value ? parseInt(value) : null
    }

    getDialogueLines(elementId) {
        const value = document.getElementById(elementId)?.value || ''
        return value.split('\n').filter(line => line.trim())
    }

    validateQuestData(questData) {
        if (!questData.id || !questData.name) {
            this.adminPanel.showNotification('ID et nom de quête requis', 'error')
            return false
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(questData.id)) {
            this.adminPanel.showNotification('ID invalide (lettres, chiffres, - et _ seulement)', 'error')
            return false
        }
        
        return true
    }

    closeQuestEditor() {
        this.adminPanel.closeModal()
        this.currentQuest = null
        this.questSteps = []
    }

    previewQuest() {
        const questData = this.collectQuestData()
        
        const preview = `
=== APERÇU QUÊTE ===
ID: ${questData.id}
Nom: ${questData.name}
Description: ${questData.description}
Catégorie: ${questData.category}
Répétable: ${questData.isRepeatable ? 'Oui' : 'Non'}
Auto-Complete: ${questData.autoComplete ? 'Oui' : 'Non'}
Étapes: ${questData.steps.length}

${questData.steps.map((step, i) => `
Étape ${i + 1}: ${step.name}
  Description: ${step.description}
  Objectifs: ${step.objectives.length}
  Récompenses: ${step.rewards.length}
`).join('')}

Dialogues:
- Offre: ${questData.dialogues.questOffer.length} lignes
- En cours: ${questData.dialogues.questInProgress.length} lignes  
- Fin: ${questData.dialogues.questComplete.length} lignes
        `
        
        alert(preview)
    }

    async reloadQuestSystem() {
        if (!confirm('Recharger le système de quêtes ?\n\nCela appliquera les modifications et redémarrera le gestionnaire de quêtes.')) return
        
        console.log('📜 [Quests] Reloading quest system')
        
        try {
            await this.adminPanel.apiCall('/quests/reload', { method: 'POST' })
            this.adminPanel.showNotification('Système de quêtes rechargé avec succès', 'success')
        } catch (error) {
            this.adminPanel.showNotification('Erreur rechargement: ' + error.message, 'error')
        }
    }

    async showBackups() {
        console.log('📜 [Quests] Loading backups')
        
        try {
            const data = await this.adminPanel.apiCall('/quests/backups')
            
            const backupsList = document.getElementById('backupsList')
            if (backupsList) {
                backupsList.innerHTML = this.generateBackupsHTML(data.backups)
            }
            
            this.adminPanel.showModal('backupsModal')
        } catch (error) {
            this.adminPanel.showNotification('Erreur chargement backups: ' + error.message, 'error')
        }
    }

    generateBackupsHTML(backups) {
        if (backups.length === 0) {
            return '<p style="text-align: center; color: #666; padding: 20px;">Aucun backup disponible</p>'
        }

        return `
            <div style="max-height: 400px; overflow-y: auto;">
                ${backups.map(backup => `
                    <div style="display: flex; justify-content: space-between; align-items: center; 
                                padding: 10px; border-bottom: 1px solid #eee;">
                        <div>
                            <strong>${backup.filename}</strong><br>
                            <small style="color: #666;">
                                ${new Date(backup.date).toLocaleString()} 
                                (${Math.round(backup.size / 1024)} KB)
                            </small>
                        </div>
                        <button class="btn btn-warning btn-sm" onclick="adminPanel.quests.restoreBackup('${backup.filename}')">
                            <i class="fas fa-undo"></i> Restaurer
                        </button>
                    </div>
                `).join('')}
            </div>
            <p style="text-align: center; margin-top: 15px; color: #666;">
                ${backups.length} backup(s) au total
            </p>
        `
    }

    async restoreBackup(backupFile) {
        if (!confirm(`Restaurer le backup "${backupFile}" ?\n\nCela remplacera le fichier de quêtes actuel !`)) return
        
        console.log(`📜 [Quests] Restoring backup: ${backupFile}`)
        
        try {
            const result = await this.adminPanel.apiCall(`/quests/restore/${backupFile}`, { 
                method: 'POST' 
            })
            this.adminPanel.showNotification(result.message || 'Backup restauré avec succès', 'success')
            this.adminPanel.closeModal()
            this.loadQuests()
        } catch (error) {
            this.adminPanel.showNotification('Erreur restauration: ' + error.message, 'error')
        }
    }

    // Cleanup
    cleanup() {
        this.currentQuest = null
        this.questSteps = []
        console.log('🧹 [Quests] Enhanced module cleanup completed')
    }
}

// Export for global access
export default QuestsModule
