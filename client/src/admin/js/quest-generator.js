// PokeWorld Admin Panel - Quest Generator Module

export class QuestGeneratorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'questGenerator'
        console.log('🎲 [QuestGenerator] Module initialized')
        this.init()
    }

    init() {
        console.log('🎲 [QuestGenerator] Initializing...')
        setTimeout(() => this.addGeneratorButton(), 2000)
    }

    addGeneratorButton() {
        console.log('🎲 [QuestGenerator] Adding generator button...')
        
        const questsPanel = document.getElementById('quests')
        if (!questsPanel) {
            console.error('Quests panel not found')
            return
        }

        const buttonContainer = questsPanel.querySelector('div[style*="display: flex"]')
        if (!buttonContainer) {
            console.error('Button container not found')
            return
        }

        if (buttonContainer.querySelector('.btn-generator')) {
            console.log('Button already exists')
            return
        }

        const generatorBtn = document.createElement('button')
        generatorBtn.className = 'btn btn-info btn-generator'
        generatorBtn.onclick = () => this.openQuestGenerator()
        generatorBtn.innerHTML = '<i class="fas fa-dice"></i> Random Quest'
        generatorBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
        
        buttonContainer.appendChild(generatorBtn)
        console.log('✅ Generator button added!')
    }

    openQuestGenerator() {
        console.log('🎲 Opening quest generator...')
        this.createGeneratorModal()
        this.showModal('questGeneratorModal')
    }

    createGeneratorModal() {
        const existingModal = document.getElementById('questGeneratorModal')
        if (existingModal) {
            existingModal.remove()
        }

        const modal = document.createElement('div')
        modal.className = 'modal'
        modal.id = 'questGeneratorModal'
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <h3 style="margin-bottom: 20px; color: #2c3e50;">
                    <i class="fas fa-dice"></i> Random Quest Generator
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div class="form-group">
                        <label class="form-label">Quest Type</label>
                        <select class="form-select" id="genQuestType">
                            <option value="random">🎲 Random</option>
                            <option value="collect">📦 Collection</option>
                            <option value="defeat_pokemon">⚔️ Pokemon Combat</option>
                            <option value="talk">💬 Dialogue</option>
                            <option value="deliver">📮 Delivery</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Difficulty</label>
                        <select class="form-select" id="genDifficulty">
                            <option value="random">🎲 Random</option>
                            <option value="easy">🟢 Easy</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="hard">🔴 Hard</option>
                        </select>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 25px;">
                    <button class="btn btn-success btn-lg" onclick="adminPanel.questGenerator.generateRandomQuest()" style="padding: 15px 30px; font-size: 1.1rem;">
                        <i class="fas fa-dice"></i> Generate Random Quest!
                    </button>
                </div>

                <div id="generatedQuestPreview" style="display: none; background: #e8f5e8; border: 2px solid #28a745; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #155724;">
                        <i class="fas fa-check-circle"></i> Generated Quest Preview
                    </h4>
                    <div id="questPreviewContent"></div>
                    <div style="margin-top: 15px; text-align: center;">
                        <button class="btn btn-primary" onclick="adminPanel.questGenerator.createQuestFromGenerated()">
                            <i class="fas fa-plus"></i> Create This Quest
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="adminPanel.closeModal()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `

        document.body.appendChild(modal)
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId)
        if (modal) {
            modal.classList.add('active')
        }
    }

    generateRandomQuest() {
        console.log('🎲 Generating random quest...')
        
        const questType = document.getElementById('genQuestType')?.value || 'collect'
        const difficulty = document.getElementById('genDifficulty')?.value || 'medium'
        
        const quest = this.createSimpleQuest(questType, difficulty)
        this.showQuestPreview(quest)
    }

    createSimpleQuest(type, difficulty) {
        const questNames = {
            collect: ['The Great Gathering', 'Treasure Hunt', 'Resource Mission'],
            defeat_pokemon: ['Wild Hunt', 'Monster Cleanup', 'Territory Defense'],
            talk: ['The Messenger', 'Important News', 'Social Call'],
            deliver: ['Special Delivery', 'Package Run', 'Courier Mission']
        }

        const items = ['potion', 'poke_ball', 'berry_oran', 'antidote', 'repel']
        const pokemon = ['Pidgey', 'Rattata', 'Zubat', 'Geodude', 'Psyduck']
        
        const questId = `${type}_${Math.random().toString(36).substring(2, 8)}`
        const questName = this.getRandomChoice(questNames[type] || questNames.collect)
        
        let objective = {}
        
        switch(type) {
            case 'collect':
                const item = this.getRandomChoice(items)
                const amount = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 3 : 2
                objective = {
                    type: 'collect',
                    description: `Collect ${amount} ${item}`,
                    target: item,
                    requiredAmount: amount
                }
                break
                
            case 'defeat_pokemon':
                const targetPokemon = this.getRandomChoice(pokemon)
                const pokemonAmount = difficulty === 'hard' ? 8 : difficulty === 'medium' ? 5 : 3
                objective = {
                    type: 'defeat',
                    description: `Defeat ${pokemonAmount} ${targetPokemon}`,
                    target: targetPokemon.toLowerCase(),
                    requiredAmount: pokemonAmount
                }
                break
                
            case 'talk':
                objective = {
                    type: 'talk',
                    description: 'Speak with Professor Oak',
                    target: '1',
                    targetName: 'Professor Oak',
                    requiredAmount: 1
                }
                break
                
            case 'deliver':
                const deliveryItem = this.getRandomChoice(items)
                objective = {
                    type: 'deliver',
                    description: `Deliver ${deliveryItem} to Nurse Joy`,
                    target: '2',
                    itemId: deliveryItem,
                    requiredAmount: 1
                }
                break
        }

        return {
            id: questId,
            name: questName,
            description: `A ${difficulty} ${type} quest generated randomly.`,
            category: 'side',
            startNpcId: 1,
            endNpcId: 1,
            isRepeatable: false,
            autoComplete: true,
            dialogues: {
                questOffer: ['I have a task for you!', 'Will you help me?'],
                questInProgress: ['How is it going?', 'Keep up the good work!'],
                questComplete: ['Excellent work!', 'Thank you for your help!']
            },
            steps: [{
                id: 'step_1',
                name: 'Complete the Task',
                description: 'Do what is asked of you.',
                objectives: [objective],
                rewards: [{
                    type: 'gold',
                    amount: difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100
                }]
            }]
        }
    }

    showQuestPreview(quest) {
        const previewDiv = document.getElementById('generatedQuestPreview')
        const contentDiv = document.getElementById('questPreviewContent')
        
        if (!previewDiv || !contentDiv) return
        
        contentDiv.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong>ID:</strong> <code>${quest.id}</code><br>
                <strong>Name:</strong> ${quest.name}<br>
                <strong>Description:</strong> ${quest.description}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Objective:</strong> ${quest.steps[0].objectives[0].description}<br>
                <strong>Reward:</strong> ${quest.steps[0].rewards[0].amount} gold
            </div>
        `
        
        this.lastGeneratedQuest = quest
        previewDiv.style.display = 'block'
    }

    createQuestFromGenerated() {
        if (!this.lastGeneratedQuest) {
            this.adminPanel.showNotification('No quest generated!', 'error')
            return
        }
        
        console.log('Creating quest from generated data')
        this.adminPanel.closeModal()
        
        if (this.adminPanel.quests) {
            this.adminPanel.quests.currentQuest = null
            this.adminPanel.quests.questSteps = this.lastGeneratedQuest.steps || []
            
            const editorTitle = document.getElementById('questEditorTitle')
            if (editorTitle) {
                editorTitle.textContent = 'Generated: ' + this.lastGeneratedQuest.name
            }
            
            this.adminPanel.quests.fillQuestEditor(this.lastGeneratedQuest)
            this.adminPanel.showModal('questEditorModal')
            
            this.adminPanel.showNotification('Generated quest loaded in editor!', 'success')
        }
    }

    getRandomChoice(array) {
        return array[Math.floor(Math.random() * array.length)]
    }

    cleanup() {
        const modal = document.getElementById('questGeneratorModal')
        if (modal) {
            modal.remove()
        }
        console.log('🧹 [QuestGenerator] Module cleanup completed')
    }
}

export default QuestGeneratorModule
