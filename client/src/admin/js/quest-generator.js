export class QuestGeneratorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'questGenerator'
        console.log('🎲 [QuestGenerator] Module initialized')
    }

    openQuestGenerator() {
        alert('Quest generator works!')
    }

    addGeneratorButton() {
        setTimeout(() => {
            const questsPanel = document.getElementById('quests')
            if (!questsPanel) return

            const buttons = questsPanel.querySelectorAll('.btn')
            if (buttons.length === 0) return

            const buttonContainer = buttons[0].parentElement
            
            const generatorBtn = document.createElement('button')
            generatorBtn.className = 'btn btn-info'
            generatorBtn.onclick = () => this.openQuestGenerator()
            generatorBtn.innerHTML = '<i class="fas fa-dice"></i> Random Quest'
            
            buttonContainer.appendChild(generatorBtn)
            console.log('✅ [QuestGenerator] Button added!')
        }, 1000)
    }

    init() {
        this.addGeneratorButton()
    }

    cleanup() {
        console.log('🧹 [QuestGenerator] Module cleanup completed')
    }
}

export default QuestGeneratorModule
