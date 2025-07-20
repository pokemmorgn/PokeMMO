// PokeWorld Admin Panel - Quest Generator Module

export class QuestGeneratorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'questGenerator'
        
        console.log('🎲 [QuestGenerator] Module initialized')
        
        // Quest generation data configuration
        this.questData = {
            // Quest types with weights
            questTypes: [
                { type: 'collect', weight: 25, name: 'Collection' },
                { type: 'defeat_pokemon', weight: 20, name: 'Pokemon Combat' },
                { type: 'defeat_trainers', weight: 15, name: 'Trainer Battles' },
                { type: 'talk', weight: 15, name: 'Dialogue' },
                { type: 'deliver', weight: 10, name: 'Delivery' },
                { type: 'explore', weight: 8, name: 'Exploration' },
                { type: 'trade', weight: 5, name: 'Trading' },
                { type: 'catch', weight: 2, name: 'Catch Pokemon' }
            ],
            
            // Quest categories
            categories: [
                { id: 'main', name: 'Main', weight: 10 },
                { id: 'side', name: 'Side', weight: 60 },
                { id: 'daily', name: 'Daily', weight: 25 },
                { id: 'event', name: 'Event', weight: 5 }
            ],
            
            // Available NPCs with characteristics
            npcs: [
                { id: 1, name: 'Professor Oak', location: 'villagelab', personality: 'scientist' },
                { id: 2, name: 'Nurse Joy', location: 'lavandiahealingcenter', personality: 'caring' },
                { id: 3, name: 'Officer Jenny', location: 'village', personality: 'strict' },
                { id: 4, name: 'Merchant Tom', location: 'lavandiashop', personality: 'greedy' },
                { id: 5, name: 'Captain Surge', location: 'lavandia', personality: 'tough' },
                { id: 6, name: 'Old Lady Martha', location: 'lavandiahouse1', personality: 'wise' },
                { id: 7, name: 'Ranger Rick', location: 'road1', personality: 'adventurous' },
                { id: 8, name: 'Miner Joe', location: 'noctherbcave1', personality: 'hardworking' },
                { id: 9, name: 'Fisherman Bob', location: 'beach', personality: 'relaxed' },
                { id: 10, name: 'Researcher Anna', location: 'lavandiaresearchlab', personality: 'curious' },
                { id: 11, name: 'Florist Maya', location: 'villageflorist', personality: 'gentle' },
                { id: 12, name: 'Blacksmith Kane', location: 'lavandiaequipment', personality: 'gruff' },
                { id: 13, name: 'Librarian Sage', location: 'lavandiahouse2', personality: 'intellectual' },
                { id: 14, name: 'Chef Bruno', location: 'lavandiahouse3', personality: 'passionate' },
                { id: 15, name: 'Trainer Alex', location: 'road2', personality: 'competitive' }
            ],
            
            // Collectible items
            items: [
                'potion', 'super_potion', 'hyper_potion', 'max_potion',
                'poke_ball', 'great_ball', 'ultra_ball', 'master_ball',
                'antidote', 'burn_heal', 'ice_heal', 'paralyz_heal',
                'awakening', 'full_heal', 'revive', 'max_revive',
                'rare_candy', 'pp_up', 'pp_max', 'calcium',
                'iron', 'protein', 'zinc', 'carbos', 'hp_up',
                'fishing_line', 'fishing_rod_basic', 'fishing_rod_super',
                'berry_oran', 'berry_pecha', 'berry_cheri', 'berry_rawst',
                'fossil_amber', 'fossil_helix', 'fossil_dome', 'moon_stone',
                'fire_stone', 'water_stone', 'thunder_stone', 'leaf_stone',
                'escape_rope', 'repel', 'super_repel', 'max_repel',
                'old_rod', 'good_rod', 'super_rod', 'net_ball',
                'timer_ball', 'repeat_ball', 'luxury_ball', 'dive_ball',
                'nest_ball', 'premier_ball', 'dusk_ball', 'heal_ball',
                'quick_ball', 'cherish_ball', 'park_ball', 'dream_ball'
            ],
            
            // Wild Pokemon
            wildPokemon: [
                'Pidgey', 'Rattata', 'Spearow', 'Ekans', 'Pikachu',
                'Sandshrew', 'Nidoran♀', 'Nidoran♂', 'Clefairy', 'Vulpix',
                'Jigglypuff', 'Zubat', 'Oddish', 'Paras', 'Venonat',
                'Diglett', 'Meowth', 'Psyduck', 'Mankey', 'Growlithe',
                'Poliwag', 'Abra', 'Machop', 'Bellsprout', 'Tentacool',
                'Geodude', 'Ponyta', 'Slowpoke', 'Magnemite', 'Doduo',
                'Seel', 'Grimer', 'Shellder', 'Gastly', 'Onix',
                'Drowzee', 'Krabby', 'Voltorb', 'Exeggcute', 'Cubone',
                'Hitmonlee', 'Hitmonchan', 'Lickitung', 'Koffing', 'Rhyhorn',
                'Chansey', 'Tangela', 'Kangaskhan', 'Horsea', 'Goldeen',
                'Staryu', 'Mr. Mime', 'Scyther', 'Jynx', 'Electabuzz',
                'Magmar', 'Pinsir', 'Tauros', 'Magikarp', 'Lapras',
                'Ditto', 'Eevee', 'Porygon', 'Omanyte', 'Kabuto',
                'Aerodactyl', 'Snorlax', 'Articuno', 'Zapdos', 'Moltres'
            ],
            
            // Available locations from ZoneMapping
            locations: [
                'beach', 'village', 'lavandia', 'road1', 'road2', 'road3',
                'villagelab', 'villagehouse1', 'villagehouse2', 'villageflorist',
                'villagewindmill', 'road1house', 'road1hidden',
                'lavandiaanalysis', 'lavandiabossroom', 'lavandiacelebitemple',
                'lavandiaequipment', 'lavandiafurniture', 'lavandiahealingcenter',
                'lavandiaresearchlab', 'lavandiashop',
                'lavandiahouse1', 'lavandiahouse2', 'lavandiahouse3', 'lavandiahouse4',
                'lavandiahouse5', 'lavandiahouse6', 'lavandiahouse7', 'lavandiahouse8',
                'lavandiahouse9', 'noctherbcave1', 'noctherbcave2', 'noctherbcave2bis',
                'wraithmoor', 'wraithmoorcimetery', 'wraithmoormanor1'
            ],
            
            // Quest names by type
            questNames: {
                collect: [
                    'The Great Gathering', 'Treasure Hunter', 'Recovery Mission',
                    'Missing Inventory', 'The Search for...', 'The Collector',
                    'Lost Items', 'Resource Quest', 'Precious Finds',
                    'Scavenger Hunt', 'Material Needs', 'Supply Run'
                ],
                defeat_pokemon: [
                    'Pokemon Hunt', 'The Exterminator', 'Cleanup Mission',
                    'Population Control', 'The Protector', 'Territory Defense',
                    'Wild Eradication', 'Savage Battle', 'Beast Tamer',
                    'Monster Slayer', 'Guardian Duty', 'Pest Control'
                ],
                defeat_trainers: [
                    'Champion Challenge', 'Impromptu Tournament', 'The Showdown',
                    'Strength Test', 'Honor Battle', 'The Gladiator',
                    'Trainer War', 'Elite Combat', 'The Invincible',
                    'Battle Royale', 'Proving Grounds', 'Combat Trial'
                ],
                talk: [
                    'The Messenger', 'Diplomacy', 'Negotiations', 'The Intermediary',
                    'Important Conversation', 'Dialogue Mission', 'The Mediator',
                    'Words and Actions', 'Communication', 'Social Call',
                    'Information Gathering', 'Chat Session'
                ],
                deliver: [
                    'Delivery Service', 'The Mailman', 'Express Transport',
                    'Courier Mission', 'Special Delivery', 'The Carrier',
                    'Package Run', 'Transport Service', 'Item Relay',
                    'Urgent Delivery', 'Logistics Mission', 'Supply Drop'
                ],
                explore: [
                    'The Explorer', 'Uncharted Territory', 'Discovery Mission',
                    'Reconnaissance', 'Pathfinder', 'Area Survey',
                    'Scouting Mission', 'Territory Mapping', 'Adventure Call',
                    'Unknown Lands', 'Exploration Quest', 'Journey into...'
                ],
                trade: [
                    'The Trader', 'Exchange Program', 'Business Deal',
                    'Pokemon Swap', 'Trading Post', 'Merchant Mission',
                    'Economic Exchange', 'Barter System', 'Commerce Quest',
                    'Fair Trade', 'Market Exchange', 'Deal Making'
                ],
                catch: [
                    'Pokemon Capture', 'Gotta Catch Em All', 'Capture Mission',
                    'Wild Recruitment', 'Team Building', 'Pokemon Collection',
                    'Taming the Wild', 'New Companions', 'Catch Quest',
                    'Pokemon Gathering', 'Species Hunt', 'Capture Challenge'
                ]
            },
            
            // Dialogue templates by NPC personality
            dialogueTemplates: {
                scientist: {
                    offer: [
                        "Ah! Greetings, young trainer!",
                        "I have an interesting research opportunity.",
                        "Your assistance would be invaluable to science!",
                        "This data could revolutionize our understanding!"
                    ],
                    progress: [
                        "How goes your research assistance?",
                        "Science waits for no one, my friend!",
                        "Every discovery brings us closer to the truth."
                    ],
                    complete: [
                        "Excellent work! The data is fascinating!",
                        "Your contribution to science is immeasurable!",
                        "Here's something for your scientific efforts!"
                    ]
                },
                caring: {
                    offer: [
                        "Oh dear, I could really use your help!",
                        "You look like such a kind trainer.",
                        "Would you be willing to assist me?",
                        "I'm sure together we can solve this!"
                    ],
                    progress: [
                        "How are you feeling? Making progress?",
                        "Please take care of yourself out there!",
                        "I believe in you, trainer!"
                    ],
                    complete: [
                        "Thank you so much for your kindness!",
                        "You have such a caring heart!",
                        "Please accept this as a token of gratitude!"
                    ]
                },
                strict: {
                    offer: [
                        "Trainer! I need your immediate assistance!",
                        "This is an official request for help.",
                        "The law requires your cooperation!",
                        "Justice must be served!"
                    ],
                    progress: [
                        "Stay focused on the mission, trainer!",
                        "Follow the rules and you'll succeed.",
                        "Discipline leads to victory!"
                    ],
                    complete: [
                        "Outstanding work, trainer!",
                        "You've upheld justice today!",
                        "The law recognizes your service!"
                    ]
                },
                greedy: {
                    offer: [
                        "Psst... want to make some easy money?",
                        "I've got a business proposition for you.",
                        "There's profit to be made here!",
                        "Help me and we'll both get rich!"
                    ],
                    progress: [
                        "Time is money, trainer!",
                        "The sooner you finish, the more we earn!",
                        "Think of the rewards waiting for you!"
                    ],
                    complete: [
                        "Excellent! Business is booming!",
                        "You're a natural entrepreneur!",
                        "Here's your well-earned profit!"
                    ]
                },
                tough: {
                    offer: [
                        "Hey! You look strong enough for this job!",
                        "I need someone with real guts!",
                        "Think you can handle what I'm asking?",
                        "This mission is for tough trainers only!"
                    ],
                    progress: [
                        "Show me what you're made of!",
                        "Toughen up and get it done!",
                        "Strength conquers all obstacles!"
                    ],
                    complete: [
                        "Now THAT'S what I call strength!",
                        "You've proven yourself, trainer!",
                        "Take this reward, you've earned it!"
                    ]
                },
                wise: {
                    offer: [
                        "Young one, may I share some wisdom?",
                        "Experience has taught me much...",
                        "Perhaps you could learn from this task.",
                        "Every journey begins with a single step."
                    ],
                    progress: [
                        "Patience, young trainer. All in good time.",
                        "Wisdom comes through experience.",
                        "You're learning valuable lessons."
                    ],
                    complete: [
                        "Well done. You've grown wiser today.",
                        "Experience is the greatest teacher.",
                        "Accept this gift of knowledge."
                    ]
                },
                adventurous: {
                    offer: [
                        "Adventure awaits, brave trainer!",
                        "I've discovered something exciting!",
                        "Ready for a thrilling quest?",
                        "The unknown calls to us!"
                    ],
                    progress: [
                        "The thrill of adventure drives us forward!",
                        "Every step is a new discovery!",
                        "Adventure never waits!"
                    ],
                    complete: [
                        "What an incredible adventure we've had!",
                        "You're a true explorer at heart!",
                        "Here's a reward for your adventurous spirit!"
                    ]
                },
                hardworking: {
                    offer: [
                        "I've got honest work that needs doing.",
                        "Hard work builds character, trainer.",
                        "Are you ready to put in some effort?",
                        "Nothing beats good old-fashioned work!"
                    ],
                    progress: [
                        "Keep up the hard work!",
                        "Effort and dedication pay off!",
                        "You're showing real work ethic!"
                    ],
                    complete: [
                        "Outstanding work ethic, trainer!",
                        "Hard work always pays off!",
                        "You've earned every bit of this reward!"
                    ]
                },
                relaxed: {
                    offer: [
                        "Hey there, no rush, but I could use help.",
                        "Take it easy, but maybe you could assist?",
                        "Life's too short to stress, but...",
                        "In your own time, would you mind...?"
                    ],
                    progress: [
                        "No pressure, just whenever you can.",
                        "Take your time, no need to rush.",
                        "Everything happens at its own pace."
                    ],
                    complete: [
                        "Thanks! That was nice and easy.",
                        "Perfect! No stress, just results.",
                        "Here's a little something for your help."
                    ]
                },
                curious: {
                    offer: [
                        "I wonder... could you help me investigate?",
                        "My curiosity has led to an interesting puzzle.",
                        "There's a mystery I'd love to solve!",
                        "Questions lead to the greatest discoveries!"
                    ],
                    progress: [
                        "What have you discovered so far?",
                        "Curiosity drives all great achievements!",
                        "Every answer leads to new questions!"
                    ],
                    complete: [
                        "Fascinating! My curiosity is satisfied!",
                        "What wonderful discoveries we've made!",
                        "Knowledge is its own reward, but here's more!"
                    ]
                }
            },
            
            // Objective descriptions by type
            objectiveDescriptions: {
                collect: [
                    "Find and collect {amount} {item}",
                    "Gather {amount} {item} for the mission",
                    "Collect {amount} {item} from around the area",
                    "Bring me {amount} {item}",
                    "I need {amount} {item} for my work"
                ],
                defeat_pokemon: [
                    "Defeat {amount} wild {pokemon}",
                    "Battle and win against {amount} {pokemon}",
                    "Clear out {amount} {pokemon} from the area",
                    "Eliminate {amount} {pokemon} threats",
                    "Take down {amount} {pokemon}"
                ],
                defeat_trainers: [
                    "Battle and defeat {amount} trainers",
                    "Win against {amount} opposing trainers",
                    "Challenge {amount} trainers to battle",
                    "Prove your strength against {amount} trainers",
                    "Overcome {amount} trainer opponents"
                ],
                talk: [
                    "Speak with {targetName}",
                    "Have a conversation with {targetName}",
                    "Go talk to {targetName}",
                    "Visit {targetName} for a chat",
                    "Meet with {targetName}"
                ],
                deliver: [
                    "Deliver {item} to {targetName}",
                    "Bring {item} to {targetName}",
                    "Take this {item} to {targetName}",
                    "Give {item} to {targetName}",
                    "Transport {item} to {targetName}"
                ],
                explore: [
                    "Explore the {location} area",
                    "Investigate {location}",
                    "Visit and survey {location}",
                    "Scout the {location} region",
                    "Search through {location}"
                ],
                trade: [
                    "Trade your {pokemon1} for a {pokemon2}",
                    "Exchange {pokemon1} with {targetName}",
                    "Swap {pokemon1} for {pokemon2}",
                    "Make a trade with {targetName}",
                    "Trade {pokemon1} to {targetName}"
                ],
                catch: [
                    "Catch {amount} {pokemon}",
                    "Capture {amount} wild {pokemon}",
                    "Add {amount} {pokemon} to your team",
                    "Successfully catch {amount} {pokemon}",
                    "Obtain {amount} {pokemon} through capture"
                ]
            },
            
            // Rewards by quest difficulty
            rewards: {
                easy: {
                    gold: { min: 50, max: 150 },
                    items: [
                        { item: 'potion', amount: { min: 1, max: 3 } },
                        { item: 'poke_ball', amount: { min: 2, max: 5 } },
                        { item: 'antidote', amount: { min: 1, max: 2 } },
                        { item: 'repel', amount: { min: 1, max: 2 } }
                    ]
                },
                medium: {
                    gold: { min: 200, max: 400 },
                    items: [
                        { item: 'super_potion', amount: { min: 1, max: 3 } },
                        { item: 'great_ball', amount: { min: 2, max: 4 } },
                        { item: 'burn_heal', amount: { min: 1, max: 2 } },
                        { item: 'super_repel', amount: { min: 1, max: 2 } },
                        { item: 'rare_candy', amount: { min: 1, max: 1 } }
                    ]
                },
                hard: {
                    gold: { min: 500, max: 800 },
                    items: [
                        { item: 'hyper_potion', amount: { min: 1, max: 2 } },
                        { item: 'ultra_ball', amount: { min: 1, max: 3 } },
                        { item: 'full_heal', amount: { min: 1, max: 2 } },
                        { item: 'max_repel', amount: { min: 1, max: 2 } },
                        { item: 'rare_candy', amount: { min: 1, max: 2 } },
                        { item: 'pp_up', amount: { min: 1, max: 1 } }
                    ]
                },
                legendary: {
                    gold: { min: 1000, max: 2000 },
                    items: [
                        { item: 'max_potion', amount: { min: 1, max: 2 } },
                        { item: 'master_ball', amount: { min: 1, max: 1 } },
                        { item: 'max_revive', amount: { min: 1, max: 2 } },
                        { item: 'rare_candy', amount: { min: 2, max: 3 } },
                        { item: 'pp_max', amount: { min: 1, max: 1 } },
                        { item: 'moon_stone', amount: { min: 1, max: 1 } }
                    ]
                }
            }
        }
    }

    // Add the generator button to the admin panel
    addGeneratorButton() {
        const questsPanel = document.getElementById('quests')
        if (!questsPanel) return

        // Find the button container
        const buttonContainer = questsPanel.querySelector('div[style*="display: flex"]')
        if (!buttonContainer) return

        // Add the generator button
        const generatorBtn = document.createElement('button')
        generatorBtn.className = 'btn btn-info'
        generatorBtn.onclick = () => this.openQuestGenerator()
        generatorBtn.innerHTML = '<i class="fas fa-dice"></i> Random Quest'
        
        buttonContainer.appendChild(generatorBtn)
        
        console.log('✅ [QuestGenerator] Generator button added to quests panel')
    }

    openQuestGenerator() {
        console.log('🎲 [QuestGenerator] Opening quest generator modal')
        
        // Create and show the generator modal
        this.createGeneratorModal()
        this.adminPanel.showModal('questGeneratorModal')
    }

    createGeneratorModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('questGeneratorModal')
        if (existingModal) {
            existingModal.remove()
        }

        // Create the modal
        const modal = document.createElement('div')
        modal.className = 'modal'
        modal.id = 'questGeneratorModal'
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <h3 style="margin-bottom: 20px; color: #2c3e50;">
                    <i class="fas fa-dice"></i> Random Quest Generator
                </h3>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                    <div class="form-group">
                        <label class="form-label">Quest Type</label>
                        <select class="form-select" id="genQuestType">
                            <option value="random">🎲 Random</option>
                            <option value="collect">📦 Collection</option>
                            <option value="defeat_pokemon">⚔️ Pokemon Combat</option>
                            <option value="defeat_trainers">🥊 Trainer Battles</option>
                            <option value="talk">💬 Dialogue</option>
                            <option value="deliver">📮 Delivery</option>
                            <option value="explore">🗺️ Exploration</option>
                            <option value="trade">🔄 Trading</option>
                            <option value="catch">⚽ Catch Pokemon</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select class="form-select" id="genCategory">
                            <option value="random">🎲 Random</option>
                            <option value="main">⭐ Main</option>
                            <option value="side">📋 Side</option>
                            <option value="daily">📅 Daily</option>
                            <option value="event">🎊 Event</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Difficulty</label>
                        <select class="form-select" id="genDifficulty">
                            <option value="random">🎲 Random</option>
                            <option value="easy">🟢 Easy</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="hard">🔴 Hard</option>
                            <option value="legendary">💜 Legendary</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Number of Steps</label>
                        <select class="form-select" id="genSteps">
                            <option value="random">🎲 Random (1-4)</option>
                            <option value="1">1 Step</option>
                            <option value="2">2 Steps</option>
                            <option value="3">3 Steps</option>
                            <option value="4">4 Steps</option>
                            <option value="5">5 Steps</option>
                        </select>
                    </div>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                    <h4 style="margin-bottom: 15px; color: #2c3e50;">Options</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="genRepeatable">
                            <span>Repeatable Quest</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="genAutoComplete" checked>
                            <span>Auto Complete</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="genMultipleNPCs">
                            <span>Multiple NPCs</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="genRandomRewards" checked>
                            <span>Random Rewards</span>
                        </label>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 25px;">
                    <button class="btn btn-success btn-lg" onclick="adminPanel.questGenerator.generateRandomQuest()" style="padding: 15px 30px; font-size: 1.1rem;">
                        <i class="fas fa-dice"></i> Generate Random Quest!
                    </button>
                </div>

                <div id="generatedQuestPreview" style="display: none; background: #e8f5e8; border: 2px solid #28a745; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #155724; margin-bottom: 15px;">
                        <i class="fas fa-check-circle"></i> Generated Quest Preview
                    </h4>
                    <div id="questPreviewContent"></div>
                    <div style="margin-top: 15px; text-align: center;">
                        <button class="btn btn-primary" onclick="adminPanel.questGenerator.createQuestFromGenerated()">
                            <i class="fas fa-plus"></i> Create This Quest
                        </button>
                        <button class="btn btn-warning" onclick="adminPanel.questGenerator.regenerateQuest()">
                            <i class="fas fa-redo"></i> Generate Another
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

    // Main generation function
    generateRandomQuest() {
        console.log('🎲 [QuestGenerator] Generating random quest...')

        try {
            // Get user preferences
            const preferences = this.getGenerationPreferences()
            
            // Generate the quest
            const generatedQuest = this.createRandomQuest(preferences)
            
            // Store for later use
            this.lastGeneratedQuest = generatedQuest
            
            // Show preview
            this.showQuestPreview(generatedQuest)
            
            console.log('✅ [QuestGenerator] Quest generated successfully:', generatedQuest)
            
        } catch (error) {
            console.error('❌ [QuestGenerator] Error generating quest:', error)
            this.adminPanel.showNotification('Error generating quest: ' + error.message, 'error')
        }
    }

    getGenerationPreferences() {
        return {
            questType: document.getElementById('genQuestType')?.value || 'random',
            category: document.getElementById('genCategory')?.value || 'random',
            difficulty: document.getElementById('genDifficulty')?.value || 'random',
            steps: document.getElementById('genSteps')?.value || 'random',
            repeatable: document.getElementById('genRepeatable')?.checked || false,
            autoComplete: document.getElementById('genAutoComplete')?.checked || true,
            multipleNPCs: document.getElementById('genMultipleNPCs')?.checked || false,
            randomRewards: document.getElementById('genRandomRewards')?.checked || true
        }
    }

    createRandomQuest(preferences) {
        // Determine quest type
        const questType = preferences.questType === 'random' ? 
            this.getRandomWeightedChoice(this.questData.questTypes) : 
            preferences.questType

        // Determine category
        const category = preferences.category === 'random' ? 
            this.getRandomWeightedChoice(this.questData.categories) : 
            preferences.category

        // Determine difficulty
        const difficulty = preferences.difficulty === 'random' ? 
            this.getRandomChoice(['easy', 'medium', 'hard', 'legendary']) : 
            preferences.difficulty

        // Determine number of steps
        const stepCount = preferences.steps === 'random' ? 
            this.getRandomInt(1, 4) : 
            parseInt(preferences.steps)

        // Select NPCs
        const npcs = this.selectRandomNPCs(preferences.multipleNPCs, stepCount)
        const startNpc = npcs[0]
        const endNpc = npcs[npcs.length - 1]

        // Generate quest ID and name
        const questId = this.generateQuestId(questType)
        const questName = this.generateQuestName(questType)
        const questDescription = this.generateQuestDescription(questType, questName)

        // Generate dialogues
        const dialogues = this.generateDialogues(startNpc.personality)

        // Generate steps
        const steps = this.generateQuestSteps(questType, stepCount, npcs, difficulty)

        // Create the complete quest object
        const quest = {
            id: questId,
            name: questName,
            description: questDescription,
            category: category,
            startNpcId: startNpc.id,
            endNpcId: endNpc.id,
            isRepeatable: preferences.repeatable,
            autoComplete: preferences.autoComplete,
            dialogues: dialogues,
            steps: steps
        }

        // Add cooldown for daily quests
        if (category === 'daily') {
            quest.cooldownHours = this.getRandomInt(12, 48)
        }

        return quest
    }

    selectRandomNPCs(allowMultiple, stepCount) {
        const npcs = []
        
        if (allowMultiple && stepCount > 1) {
            // Select different NPCs for different steps
            const shuffledNPCs = [...this.questData.npcs].sort(() => Math.random() - 0.5)
            
            for (let i = 0; i < Math.min(stepCount, 3); i++) {
                npcs.push(shuffledNPCs[i])
            }
        } else {
            // Single NPC for the whole quest
            npcs.push(this.getRandomChoice(this.questData.npcs))
        }
        
        return npcs
    }

    generateQuestId(questType) {
        const prefix = questType.substring(0, 4)
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        return `${prefix}_${randomSuffix}`
    }

    generateQuestName(questType) {
        const names = this.questData.questNames[questType] || this.questData.questNames.collect
        return this.getRandomChoice(names)
    }

    generateQuestDescription(questType, questName) {
        const descriptions = {
            collect: "Someone needs help gathering important items.",
            defeat_pokemon: "Wild Pokemon are causing trouble and need to be dealt with.",
            defeat_trainers: "Prove your strength by defeating other trainers in battle.",
            talk: "Important information needs to be shared between people.",
            deliver: "An important package needs to be delivered safely.",
            explore: "Unknown areas need to be explored and mapped.",
            trade: "A Pokemon exchange will benefit both parties.",
            catch: "New Pokemon companions are needed for various purposes."
        }
        
        return descriptions[questType] || "A mysterious quest awaits completion."
    }

    generateDialogues(personality) {
        const templates = this.questData.dialogueTemplates[personality] || this.questData.dialogueTemplates.curious
        
        return {
            questOffer: [...templates.offer],
            questInProgress: [...templates.progress],
            questComplete: [...templates.complete]
        }
    }

    generateQuestSteps(questType, stepCount, npcs, difficulty) {
        const steps = []
        
        for (let i = 0; i < stepCount; i++) {
            const stepId = `step_${i + 1}`
            const stepName = this.generateStepName(questType, i + 1)
            const stepDescription = this.generateStepDescription(questType, i + 1, stepCount)
            const objectives = this.generateObjectives(questType, npcs[Math.min(i, npcs.length - 1)], difficulty)
            const rewards = i === stepCount - 1 ? this.generateRewards(difficulty) : []

            steps.push({
                id: stepId,
                name: stepName,
                description: stepDescription,
                objectives: objectives,
                rewards: rewards
            })
        }
        
        return steps
    }

    generateStepName(questType, stepNumber) {
        const stepNames = {
            collect: [`Find the Items`, `Gather Resources`, `Complete Collection`, `Final Gathering`],
            defeat_pokemon: [`Clear the Area`, `Battle Wild Pokemon`, `Eliminate Threats`, `Final Confrontation`],
            defeat_trainers: [`First Challenge`, `Prove Your Worth`, `Elite Battle`, `Championship Fight`],
            talk: [`Initial Contact`, `Important Discussion`, `Deliver the Message`, `Final Conversation`],
            deliver: [`Get the Package`, `Transport Safely`, `Navigate Obstacles`, `Complete Delivery`],
            explore: [`Scout the Area`, `Deep Exploration`, `Map the Territory`, `Document Findings`],
            trade: [`Find Trade Partner`, `Negotiate Terms`, `Prepare Pokemon`, `Complete Exchange`],
            catch: [`Locate Pokemon`, `Prepare for Capture`, `Catch Target`, `Secure New Team Member`]
        }
        
        const names = stepNames[questType] || stepNames.collect
        return names[Math.min(stepNumber - 1, names.length - 1)]
    }

    generateStepDescription(questType, stepNumber, totalSteps) {
        if (stepNumber === 1) {
            return `Begin the ${questType.replace('_', ' ')} mission.`
        } else if (stepNumber === totalSteps) {
            return `Complete the final phase of your quest.`
        } else {
            return `Continue with step ${stepNumber} of your mission.`
        }
    }

    generateObjectives(questType, npc, difficulty) {
        const objectiveId = `obj_${Math.random().toString(36).substring(2, 8)}`
        const descriptions = this.questData.objectiveDescriptions[questType]
        
        switch (questType) {
            case 'collect':
                const item = this.getRandomChoice(this.questData.items)
                const amount = this.getAmountByDifficulty(difficulty, 1, 5)
                return [{
                    id: objectiveId,
                    type: 'collect',
                    description: this.formatDescription(descriptions, { amount, item }),
                    target: item,
                    targetName: this.formatItemName(item),
                    requiredAmount: amount
                }]

            case 'defeat_pokemon':
                const pokemon = this.getRandomChoice(this.questData.wildPokemon)
                const pokemonAmount = this.getAmountByDifficulty(difficulty, 3, 15)
                return [{
                    id: objectiveId,
                    type: 'defeat',
                    description: this.formatDescription(descriptions, { amount: pokemonAmount, pokemon }),
                    target: pokemon.toLowerCase(),
                    targetName: pokemon,
                    requiredAmount: pokemonAmount
                }]

            case 'defeat_trainers':
                const trainerAmount = this.getAmountByDifficulty(difficulty, 1, 5)
                return [{
                    id: objectiveId,
                    type: 'defeat_trainers',
                    description: this.formatDescription(descriptions, { amount: trainerAmount }),
                    target: 'trainer',
                    targetName: 'Trainers',
                    requiredAmount: trainerAmount
                }]

            case 'talk':
                return [{
                    id: objectiveId,
                    type: 'talk',
                    description: this.formatDescription(descriptions, { targetName: npc.name }),
                    target: npc.id.toString(),
                    targetName: npc.name,
                    requiredAmount: 1,
                    validationDialogue: [
                        "Perfect! We've had a great conversation!",
                        "Thank you for taking the time to talk.",
                        "Your words are very helpful."
                    ]
                }]

            case 'deliver':
                const deliveryItem = this.getRandomChoice(this.questData.items)
                return [{
                    id: objectiveId,
                    type: 'deliver',
                    description: this.formatDescription(descriptions, { item: this.formatItemName(deliveryItem), targetName: npc.name }),
                    target: npc.id.toString(),
                    targetName: npc.name,
                    itemId: deliveryItem,
                    requiredAmount: 1,
                    validationDialogue: [
                        "Excellent! This is exactly what I needed!",
                        "Thank you for the safe delivery!",
                        "Perfect timing with this delivery!"
                    ]
                }]

            case 'explore':
                const location = this.getRandomChoice(this.questData.locations)
                return [{
                    id: objectiveId,
                    type: 'reach',
                    description: this.formatDescription(descriptions, { location: this.formatLocationName(location) }),
                    target: `${location}_explored`,
                    targetName: this.formatLocationName(location),
                    requiredAmount: 1
                }]

            case 'trade':
                const pokemon1 = this.getRandomChoice(this.questData.wildPokemon)
                const pokemon2 = this.getRandomChoice(this.questData.wildPokemon.filter(p => p !== pokemon1))
                return [{
                    id: objectiveId,
                    type: 'trade',
                    description: this.formatDescription(descriptions, { pokemon1, pokemon2, targetName: npc.name }),
                    target: npc.id.toString(),
                    targetName: npc.name,
                    tradePokemon: pokemon1,
                    receivePokemon: pokemon2,
                    requiredAmount: 1
                }]

            case 'catch':
                const catchPokemon = this.getRandomChoice(this.questData.wildPokemon)
                const catchAmount = this.getAmountByDifficulty(difficulty, 1, 3)
                return [{
                    id: objectiveId,
                    type: 'catch',
                    description: this.formatDescription(descriptions, { amount: catchAmount, pokemon: catchPokemon }),
                    target: catchPokemon.toLowerCase(),
                    targetName: catchPokemon,
                    requiredAmount: catchAmount
                }]

            default:
                return []
        }
    }

    generateRewards(difficulty) {
        const rewards = []
        const rewardData = this.questData.rewards[difficulty]
        
        // Add gold reward
        const goldAmount = this.getRandomInt(rewardData.gold.min, rewardData.gold.max)
        rewards.push({
            type: 'gold',
            amount: goldAmount
        })
        
        // Add 1-3 item rewards
        const itemCount = this.getRandomInt(1, 3)
        const shuffledItems = [...rewardData.items].sort(() => Math.random() - 0.5)
        
        for (let i = 0; i < itemCount; i++) {
            const itemData = shuffledItems[i]
            if (itemData) {
                rewards.push({
                    type: 'item',
                    itemId: itemData.item,
                    amount: this.getRandomInt(itemData.amount.min, itemData.amount.max)
                })
            }
        }
        
        return rewards
    }

    getAmountByDifficulty(difficulty, baseMin, baseMax) {
        const multipliers = {
            easy: 0.5,
            medium: 1.0,
            hard: 1.5,
            legendary: 2.0
        }
        
        const multiplier = multipliers[difficulty] || 1.0
        const min = Math.max(1, Math.floor(baseMin * multiplier))
        const max = Math.floor(baseMax * multiplier)
        
        return this.getRandomInt(min, max)
    }

    formatDescription(descriptions, variables) {
        const template = this.getRandomChoice(descriptions)
        let formatted = template
        
        Object.entries(variables).forEach(([key, value]) => {
            formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), value)
        })
        
        return formatted
    }

    formatItemName(item) {
        return item.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
    }

    formatLocationName(location) {
        return location.split(/(?=[A-Z])/).join(' ')
            .split('_').join(' ')
            .replace(/\b\w/g, l => l.toUpperCase())
    }

    showQuestPreview(quest) {
        const previewDiv = document.getElementById('generatedQuestPreview')
        const contentDiv = document.getElementById('questPreviewContent')
        
        if (!previewDiv || !contentDiv) return
        
        contentDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div><strong>ID:</strong> <code>${quest.id}</code></div>
                <div><strong>Name:</strong> ${quest.name}</div>
                <div><strong>Category:</strong> <span class="badge ${quest.category}">${quest.category}</span></div>
                <div><strong>Steps:</strong> ${quest.steps.length}</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Description:</strong> ${quest.description}
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Start NPC:</strong> ${this.getNPCName(quest.startNpcId)} | 
                <strong>End NPC:</strong> ${this.getNPCName(quest.endNpcId)}
            </div>
            
            <details style="margin-bottom: 15px;">
                <summary style="cursor: pointer; font-weight: bold;">Quest Steps (${quest.steps.length})</summary>
                <div style="margin-top: 10px;">
                    ${quest.steps.map((step, index) => `
                        <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px;">
                            <strong>Step ${index + 1}:</strong> ${step.name}<br>
                            <small>${step.description}</small><br>
                            <em>Objectives:</em> ${step.objectives.length} | 
                            <em>Rewards:</em> ${step.rewards.length}
                        </div>
                    `).join('')}
                </div>
            </details>
            
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <span><strong>Repeatable:</strong> ${quest.isRepeatable ? '✅' : '❌'}</span>
                <span><strong>Auto Complete:</strong> ${quest.autoComplete ? '✅' : '❌'}</span>
                ${quest.cooldownHours ? `<span><strong>Cooldown:</strong> ${quest.cooldownHours}h</span>` : ''}
            </div>
        `
        
        previewDiv.style.display = 'block'
        previewDiv.scrollIntoView({ behavior: 'smooth' })
    }

    getNPCName(npcId) {
        const npc = this.questData.npcs.find(n => n.id === npcId)
        return npc ? npc.name : `NPC ${npcId}`
    }

    createQuestFromGenerated() {
        if (!this.lastGeneratedQuest) {
            this.adminPanel.showNotification('No quest generated yet!', 'error')
            return
        }
        
        console.log('🎲 [QuestGenerator] Creating quest from generated data')
        
        // Close generator modal
        this.adminPanel.closeModal()
        
        // Open quest editor with generated data
        if (this.adminPanel.quests) {
            this.adminPanel.quests.currentQuest = null
            this.adminPanel.quests.questSteps = this.lastGeneratedQuest.steps || []
            
            const editorTitle = document.getElementById('questEditorTitle')
            if (editorTitle) {
                editorTitle.textContent = 'Generated Quest: ' + this.lastGeneratedQuest.name
            }
            
            this.adminPanel.quests.fillQuestEditor(this.lastGeneratedQuest)
            this.adminPanel.showModal('questEditorModal')
            
            this.adminPanel.showNotification('Generated quest loaded in editor!', 'success')
        }
    }

    regenerateQuest() {
        console.log('🎲 [QuestGenerator] Regenerating quest...')
        this.generateRandomQuest()
    }

    // Utility functions
    getRandomChoice(array) {
        return array[Math.floor(Math.random() * array.length)]
    }

    getRandomWeightedChoice(weightedArray) {
        const totalWeight = weightedArray.reduce((sum, item) => sum + item.weight, 0)
        let random = Math.random() * totalWeight
        
        for (const item of weightedArray) {
            random -= item.weight
            if (random <= 0) {
                return item.id || item.type
            }
        }
        
        return weightedArray[0].id || weightedArray[0].type
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    // Initialize when loaded
    init() {
        // Add the generator button when quests module is loaded
        setTimeout(() => {
            this.addGeneratorButton()
        }, 1000)
    }

    // Cleanup
    cleanup() {
        this.lastGeneratedQuest = null
        
        // Remove generator modal if exists
        const modal = document.getElementById('questGeneratorModal')
        if (modal) {
            modal.remove()
        }
        
        console.log('🧹 [QuestGenerator] Module cleanup completed')
    }
}

// Export for global access
export default QuestGeneratorModule
