// PokeWorld Admin Panel - Advanced Quest Generator Module

export class QuestGeneratorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'questGenerator'
        
        console.log('🎲 [QuestGenerator] Advanced Module initialized')
        
        // Advanced quest generation data
        this.questData = {
            // Quest types with weights and complexity
            questTypes: [
                { type: 'collect', weight: 25, name: 'Collection', complexity: 'simple' },
                { type: 'defeat_pokemon', weight: 20, name: 'Pokemon Combat', complexity: 'medium' },
                { type: 'defeat_trainers', weight: 15, name: 'Trainer Battles', complexity: 'medium' },
                { type: 'talk', weight: 15, name: 'Dialogue', complexity: 'simple' },
                { type: 'deliver', weight: 10, name: 'Delivery', complexity: 'medium' },
                { type: 'explore', weight: 8, name: 'Exploration', complexity: 'simple' },
                { type: 'trade', weight: 5, name: 'Trading', complexity: 'complex' },
                { type: 'catch', weight: 2, name: 'Catch Pokemon', complexity: 'medium' }
            ],
            
            // Categories with story context
            categories: [
                { id: 'main', name: 'Main Story', weight: 10, storyImpact: 'high' },
                { id: 'side', name: 'Side Quest', weight: 60, storyImpact: 'medium' },
                { id: 'daily', name: 'Daily Task', weight: 25, storyImpact: 'low' },
                { id: 'event', name: 'Special Event', weight: 5, storyImpact: 'high' }
            ],

            // Progression basée sur les arènes de Kanto
gymProgression: {
    pre_gym: { 
        name: 'Avant première arène', 
        levels: [3, 8], 
        badge: null,
        description: 'Début de l\'aventure à Bourg Palette'
    },
    gym_1: { 
        name: 'Arène de Pierre (Argenta)', 
        levels: [10, 14], 
        badge: 'Boulder Badge',
        leader: 'Brock',
        type: 'Roche'
    },
    gym_2: { 
        name: 'Arène d\'Ondine (Azuria)', 
        levels: [18, 21], 
        badge: 'Cascade Badge',
        leader: 'Misty',
        type: 'Eau'
    },
    gym_3: { 
        name: 'Arène du Major Bob', 
        levels: [24, 26], 
        badge: 'Thunder Badge',
        leader: 'Lt. Surge',
        type: 'Électrik'
    },
    gym_4: { 
        name: 'Arène d\'Erika', 
        levels: [29, 32], 
        badge: 'Rainbow Badge',
        leader: 'Erika',
        type: 'Plante'
    },
    gym_5: { 
        name: 'Arène de Koga', 
        levels: [37, 43], 
        badge: 'Soul Badge',
        leader: 'Koga',
        type: 'Poison'
    },
    gym_6: { 
        name: 'Arène de Sabrina', 
        levels: [43, 50], 
        badge: 'Marsh Badge',
        leader: 'Sabrina',
        type: 'Psy'
    },
    gym_7: { 
        name: 'Arène d\'Auguste', 
        levels: [47, 50], 
        badge: 'Volcano Badge',
        leader: 'Blaine',
        type: 'Feu'
    },
    gym_8: { 
        name: 'Arène de Giovanni', 
        levels: [50, 55], 
        badge: 'Earth Badge',
        leader: 'Giovanni',
        type: 'Sol'
    },
    elite_four: { 
        name: 'Conseil des 4 & Champion', 
        levels: [54, 65], 
        badge: 'Champion'
    },
    post_game: { 
        name: 'Après la Ligue', 
        levels: [65, 100], 
        badge: 'Master'
    }
},
            
            // NPCs with personalities and locations
            npcs: [
                { id: 1, name: 'Professor Oak', location: 'villagelab', personality: 'scientist', expertise: 'research' },
                { id: 2, name: 'Nurse Joy', location: 'lavandiahealingcenter', personality: 'caring', expertise: 'healing' },
                { id: 3, name: 'Officer Jenny', location: 'village', personality: 'strict', expertise: 'law' },
                { id: 4, name: 'Merchant Tom', location: 'lavandiashop', personality: 'greedy', expertise: 'trading' },
                { id: 5, name: 'Captain Surge', location: 'lavandia', personality: 'tough', expertise: 'battle' },
                { id: 6, name: 'Elder Martha', location: 'lavandiahouse1', personality: 'wise', expertise: 'lore' },
                { id: 7, name: 'Ranger Rick', location: 'road1', personality: 'adventurous', expertise: 'exploration' },
                { id: 8, name: 'Miner Joe', location: 'noctherbcave1', personality: 'hardworking', expertise: 'mining' },
                { id: 9, name: 'Fisherman Bob', location: 'beach', personality: 'relaxed', expertise: 'fishing' },
                { id: 10, name: 'Dr. Anna', location: 'lavandiaresearchlab', personality: 'curious', expertise: 'analysis' },
                { id: 11, name: 'Florist Maya', location: 'villageflorist', personality: 'gentle', expertise: 'plants' },
                { id: 12, name: 'Blacksmith Kane', location: 'lavandiaequipment', personality: 'gruff', expertise: 'crafting' },
                { id: 13, name: 'Librarian Sage', location: 'lavandiahouse2', personality: 'intellectual', expertise: 'knowledge' },
                { id: 14, name: 'Chef Bruno', location: 'lavandiahouse3', personality: 'passionate', expertise: 'cooking' },
                { id: 15, name: 'Trainer Alex', location: 'road2', personality: 'competitive', expertise: 'training' }
            ],
            
            // Expanded item categories
items: {
    basic: ['potion', 'poke_ball', 'antidote', 'paralyz_heal', 'awakening'],
    intermediate: ['super_potion', 'great_ball', 'burn_heal', 'ice_heal', 'escape_rope', 'repel'],
    advanced: ['hyper_potion', 'ultra_ball', 'super_repel', 'full_heal', 'revive', 'rare_candy'],
    rare: ['max_potion', 'max_revive', 'master_ball', 'pp_up', 'pp_max', 'max_repel'],
    legendary: ['master_ball', 'rare_candy', 'pp_max', 'max_revive'],
    stones: {
        early: ['moon_stone'],
        mid: ['fire_stone', 'water_stone', 'thunder_stone'],
        late: ['leaf_stone']
    }
},
            
            // Pokemon organized by regions and difficulty
pokemon: {
    pre_gym_1: ['Rattata', 'Pidgey', 'Spearow', 'Caterpie', 'Weedle', 'Pikachu'],
    gym_1_2: ['Nidoran♀', 'Nidoran♂', 'Clefairy', 'Jigglypuff', 'Zubat', 'Oddish', 'Paras'],
    gym_2_3: ['Pikachu', 'Sandshrew', 'Vulpix', 'Meowth', 'Psyduck', 'Mankey', 'Growlithe'],
    gym_3_4: ['Abra', 'Machop', 'Bellsprout', 'Tentacool', 'Geodude', 'Ponyta', 'Magnemite'],
    gym_4_5: ['Gastly', 'Onix', 'Drowzee', 'Krabby', 'Voltorb', 'Exeggcute', 'Cubone'],
    gym_5_6: ['Rhyhorn', 'Chansey', 'Tangela', 'Kangaskhan', 'Horsea', 'Goldeen', 'Staryu'],
    gym_6_7: ['Scyther', 'Jynx', 'Electabuzz', 'Magmar', 'Pinsir', 'Tauros', 'Gyarados'],
    gym_7_8: ['Lapras', 'Ditto', 'Eevee', 'Porygon', 'Omanyte', 'Kabuto', 'Aerodactyl'],
    post_game: ['Snorlax', 'Articuno', 'Zapdos', 'Moltres', 'Dragonite', 'Mewtwo', 'Mew'],
    cave: ['Zubat', 'Geodude', 'Graveler', 'Onix', 'Machop', 'Gastly'],
    water: ['Magikarp', 'Goldeen', 'Psyduck', 'Poliwag', 'Tentacool', 'Staryu', 'Horsea'],
    forest: ['Caterpie', 'Weedle', 'Pidgey', 'Oddish', 'Bellsprout', 'Scyther']
},
            
            // All available locations from ZoneMapping
            locations: {
                outdoor: ['beach', 'village', 'lavandia', 'road1', 'road2', 'road3', 'wraithmoor', 'wraithmoorcimetery'],
                indoor: ['villagelab', 'villagehouse1', 'villagehouse2', 'villageflorist', 'villagewindmill', 'lavandiashop', 'lavandiaresearchlab'],
                cave: ['noctherbcave1', 'noctherbcave2', 'noctherbcave2bis'],
                special: ['road1hidden', 'lavandiacelebitemple', 'wraithmoormanor1']
            },
            
            // Complex quest name templates
            questNames: {
                collect: [
                    'The Great {item} Hunt', 'Gathering {item}s', 'In Search of {item}', 
                    '{item} Expedition', 'The {item} Collection', 'Missing {item}s',
                    'Rare {item} Recovery', '{item} Shortage Crisis', 'The {item} Quest'
                ],
                defeat_pokemon: [
                    '{pokemon} Menace', 'Wild {pokemon} Problem', 'The {pokemon} Invasion',
                    'Taming the {pokemon}s', '{pokemon} Population Control', 'Battle of {location}',
                    'The {pokemon} Hunt', 'Defending Against {pokemon}s', '{pokemon} Extermination'
                ],
                defeat_trainers: [
                    'Tournament of {location}', 'Battle Championship', 'The {difficulty} Challenge',
                    'Trainer Showdown', 'Combat Trials', 'The Arena Test',
                    'Proving Grounds', 'Elite Battle Series', 'Warrior\'s Path'
                ],
                talk: [
                    'Message for {npc}', 'Diplomatic Mission', 'The {npc} Conference',
                    'Important News', 'Spreading the Word', 'Information Network',
                    'The Messenger\'s Path', 'Communication Crisis', 'Urgent Dispatch'
                ],
                deliver: [
                    'Special Delivery to {npc}', '{item} Transport Mission', 'The {location} Package',
                    'Urgent Courier Service', '{item} Emergency', 'Critical Supply Run',
                    'Express Delivery', 'The {npc} Request', 'Important Shipment'
                ],
                explore: [
                    'Exploring {location}', 'Mystery of {location}', 'The {location} Expedition',
                    'Mapping {location}', 'Secrets of {location}', 'Journey to {location}',
                    'The {location} Discovery', 'Uncharted {location}', '{location} Investigation'
                ],
                trade: [
                    '{pokemon} Exchange Program', 'The Great {pokemon} Trade', 'Pokemon Swap Meet',
                    '{pokemon} for {pokemon} Deal', 'Trading Post Business', 'The {npc} Exchange',
                    'Pokemon Commerce', 'Breeding Exchange', 'Rare Pokemon Trade'
                ],
                catch: [
                    'Catch {amount} {pokemon}', 'The {pokemon} Capture', 'New Team Members',
                    '{pokemon} Recruitment', 'Building the Perfect Team', 'Pokemon Collection Drive',
                    'The {pokemon} Gathering', 'Expanding Your Team', 'Wild {pokemon} Taming'
                ]
            },
            
            // Dialogue templates by personality with context
            dialogueTemplates: {
                scientist: {
                    offer: [
                        "Fascinating! I have a research opportunity that requires field work.",
                        "My studies have revealed something that needs investigation.",
                        "Science requires data, and I need someone brave enough to gather it.",
                        "This discovery could change everything we know about Pokemon!"
                    ],
                    progress: [
                        "How goes the data collection? Every sample matters!",
                        "Science is built on careful observation and dedication.",
                        "Your fieldwork is contributing to groundbreaking research!"
                    ],
                    complete: [
                        "Extraordinary! This data will advance our understanding significantly!",
                        "Your contribution to science will be remembered for generations!",
                        "These findings are beyond my wildest theoretical predictions!"
                    ]
                },
                caring: {
                    offer: [
                        "Oh dear, I'm so worried about this situation...",
                        "Someone with a kind heart like yours could really help.",
                        "I hate to ask, but I really need assistance with something important.",
                        "Your compassionate nature makes you perfect for this task."
                    ],
                    progress: [
                        "Please be careful out there! I worry about you.",
                        "Your kindness gives me hope that everything will work out.",
                        "Thank you for taking on this burden. It means so much."
                    ],
                    complete: [
                        "Oh, thank goodness! You've put my mind at ease!",
                        "Your kindness has made all the difference in the world!",
                        "I knew I could count on someone with such a caring heart!"
                    ]
                },
                strict: {
                    offer: [
                        "Citizen! I have an official matter that requires your cooperation.",
                        "The law demands action, and I need a capable individual.",
                        "Justice cannot wait! This situation requires immediate attention.",
                        "By the authority vested in me, I'm requesting your assistance."
                    ],
                    progress: [
                        "Stay focused on the mission! Justice depends on it.",
                        "Follow protocol and you'll succeed in this endeavor.",
                        "The law is clear, and so is your duty in this matter."
                    ],
                    complete: [
                        "Outstanding work! You've upheld justice admirably!",
                        "The community is safer thanks to your actions!",
                        "You've proven yourself worthy of official commendation!"
                    ]
                },
                greedy: {
                    offer: [
                        "Psst... I've got a lucrative proposition for someone like you.",
                        "Money talks, and this opportunity is shouting profits!",
                        "Business is business, and this deal could make us both rich.",
                        "I smell opportunity, and it smells like gold coins!"
                    ],
                    progress: [
                        "Time is money! The sooner you finish, the bigger the profit!",
                        "Think of all the coins waiting for you at the end!",
                        "Every second you waste is money down the drain!"
                    ],
                    complete: [
                        "Excellent! Our business partnership has been most profitable!",
                        "Ka-ching! That's the sound of success!",
                        "Money well earned! You've got a good head for business!"
                    ]
                },
                tough: {
                    offer: [
                        "You look like someone who doesn't back down from a challenge!",
                        "I need someone with real backbone for this job!",
                        "Think you're tough enough to handle what I'm about to ask?",
                        "Only the strongest trainers can succeed at this task!"
                    ],
                    progress: [
                        "Show me what you're really made of out there!",
                        "Toughness isn't just physical - it's mental determination!",
                        "Pain is temporary, but glory lasts forever!"
                    ],
                    complete: [
                        "Now THAT'S what I call real strength and determination!",
                        "You've proven you have the heart of a true warrior!",
                        "Incredible! You're tougher than I even imagined!"
                    ]
                },
                wise: {
                    offer: [
                        "Young one, wisdom comes through experience and challenges.",
                        "Life has taught me much, and this task will teach you.",
                        "Every journey begins with understanding one's purpose.",
                        "Ancient knowledge speaks of the importance of such missions."
                    ],
                    progress: [
                        "Patience, young traveler. All good things take time.",
                        "Each step forward brings you closer to true understanding.",
                        "Wisdom is not in the destination, but in the journey itself."
                    ],
                    complete: [
                        "You have grown wiser through this experience, child.",
                        "The knowledge you've gained is worth more than gold.",
                        "You've learned something valuable that will serve you well."
                    ]
                },
                adventurous: {
                    offer: [
                        "Adventure calls to those brave enough to answer!",
                        "I've discovered something that'll get your blood pumping!",
                        "Ready for an expedition that'll test your mettle?",
                        "The thrill of discovery awaits those bold enough to seek it!"
                    ],
                    progress: [
                        "Feel that rush? That's the spirit of adventure!",
                        "Every step into the unknown brings new possibilities!",
                        "Adventure isn't just a hobby - it's a way of life!"
                    ],
                    complete: [
                        "What an absolutely incredible adventure we've shared!",
                        "You've got the soul of a true explorer!",
                        "That was the kind of adventure legends are made of!"
                    ]
                },
                hardworking: {
                    offer: [
                        "I've got honest work that needs doing by honest hands.",
                        "Roll up your sleeves - this job requires real effort.",
                        "Hard work builds character, and this task builds both.",
                        "No shortcuts here - just good old-fashioned labor."
                    ],
                    progress: [
                        "Keep at it! Persistence pays off in the end!",
                        "Every drop of sweat is an investment in success!",
                        "Hard work never killed anyone - it just made them stronger!"
                    ],
                    complete: [
                        "Outstanding work ethic! You've earned every bit of this reward!",
                        "That's what I call putting in an honest day's work!",
                        "You've proven that dedication and effort always pay off!"
                    ]
                },
                relaxed: {
                    offer: [
                        "Hey there, no pressure, but I could use some help.",
                        "Take it easy, but maybe you could lend me a hand?",
                        "Life's too short to stress, but this still needs doing.",
                        "Whenever you get a chance, would you mind helping out?"
                    ],
                    progress: [
                        "No rush at all - just whenever you get around to it.",
                        "Take your time, enjoy the journey, no need to hurry.",
                        "Everything happens at its own pace, just go with the flow."
                    ],
                    complete: [
                        "Perfect! Thanks for keeping things nice and easy.",
                        "See? No stress, no pressure, just good results.",
                        "That was smooth sailing from start to finish!"
                    ]
                },
                curious: {
                    offer: [
                        "I wonder... could you help me investigate something fascinating?",
                        "My curiosity has uncovered a mystery that needs solving.",
                        "Questions lead to answers, and I have so many questions!",
                        "The pursuit of knowledge never ends, and I need assistance."
                    ],
                    progress: [
                        "What have you discovered? I'm dying to know!",
                        "Every answer seems to lead to three more questions!",
                        "The more we learn, the more we realize how much we don't know!"
                    ],
                    complete: [
                        "Fascinating discoveries! My curiosity is thoroughly satisfied!",
                        "The knowledge you've uncovered is absolutely incredible!",
                        "Questions answered, mysteries solved - perfect!"
                    ]
                }
            },
            
            // Advanced rewards system
rewards: {
    pre_gym: {
        gold: { min: 50, max: 150 },
        items: [{ category: 'basic', amount: { min: 2, max: 4 }, rarity: 'common' }]
    },
    gym_1: {
        gold: { min: 200, max: 350 },
        items: [
            { category: 'basic', amount: { min: 3, max: 5 }, rarity: 'common' },
            { category: 'intermediate', amount: { min: 1, max: 2 }, rarity: 'uncommon' }
        ]
    },
    gym_2: {
        gold: { min: 400, max: 650 },
        items: [
            { category: 'intermediate', amount: { min: 2, max: 4 }, rarity: 'common' },
            { category: 'stones', amount: { min: 1, max: 1 }, rarity: 'rare' }
        ]
    },
    gym_3: {
        gold: { min: 700, max: 1000 },
        items: [
            { category: 'intermediate', amount: { min: 3, max: 5 }, rarity: 'common' },
            { category: 'advanced', amount: { min: 1, max: 2 }, rarity: 'uncommon' }
        ]
    },
    gym_4: {
        gold: { min: 1200, max: 1800 },
        items: [
            { category: 'advanced', amount: { min: 2, max: 4 }, rarity: 'common' },
            { category: 'stones', amount: { min: 1, max: 2 }, rarity: 'rare' }
        ]
    },
    gym_5: {
        gold: { min: 2000, max: 3000 },
        items: [
            { category: 'advanced', amount: { min: 3, max: 5 }, rarity: 'common' },
            { category: 'rare', amount: { min: 1, max: 2 }, rarity: 'rare' }
        ]
    },
    gym_6: {
        gold: { min: 3500, max: 5000 },
        items: [
            { category: 'rare', amount: { min: 2, max: 4 }, rarity: 'common' },
            { category: 'stones', amount: { min: 2, max: 3 }, rarity: 'rare' }
        ]
    },
    gym_7: {
        gold: { min: 5500, max: 8000 },
        items: [
            { category: 'rare', amount: { min: 3, max: 5 }, rarity: 'common' },
            { category: 'legendary', amount: { min: 1, max: 2 }, rarity: 'legendary' }
        ]
    },
    gym_8: {
        gold: { min: 8500, max: 12000 },
        items: [
            { category: 'rare', amount: { min: 4, max: 6 }, rarity: 'common' },
            { category: 'legendary', amount: { min: 2, max: 3 }, rarity: 'legendary' }
        ]
    },
    elite_four: {
        gold: { min: 15000, max: 25000 },
        items: [
            { category: 'legendary', amount: { min: 3, max: 5 }, rarity: 'legendary' },
            { category: 'rare', amount: { min: 5, max: 8 }, rarity: 'rare' }
        ]
    },
    post_game: {
        gold: { min: 30000, max: 50000 },
        items: [{ category: 'legendary', amount: { min: 5, max: 10 }, rarity: 'legendary' }]
    }
}
        }
        
        this.init()
    }

    init() {
        console.log('🎲 [QuestGenerator] Advanced features initializing...')
        setTimeout(() => this.addGeneratorButton(), 2000)
    }

    addGeneratorButton() {
        console.log('🎲 [QuestGenerator] Adding advanced generator button...')
        
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
        console.log('✅ Advanced generator button added!')
    }

    openQuestGenerator() {
        console.log('🎲 Opening advanced quest generator...')
        this.createAdvancedGeneratorModal()
        this.showModal('questGeneratorModal')
    }

    createAdvancedGeneratorModal() {
        const existingModal = document.getElementById('questGeneratorModal')
        if (existingModal) {
            existingModal.remove()
        }

        const modal = document.createElement('div')
        modal.className = 'modal'
        modal.id = 'questGeneratorModal'
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 95vh; overflow-y: auto;">
                <h3 style="margin-bottom: 20px; color: #2c3e50;">
                    <i class="fas fa-dice"></i> Advanced Random Quest Generator
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
                            <option value="main">⭐ Main Story</option>
                            <option value="side">📋 Side Quest</option>
                            <option value="daily">📅 Daily Task</option>
                            <option value="event">🎊 Special Event</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
    <label class="form-label">Progression</label>
    <select class="form-select" id="genProgression">
        <option value="random">🎲 Aléatoire</option>
        <option value="pre_gym">🌱 Avant 1ère Arène</option>
        <option value="gym_1">🗿 Après Arène Pierre</option>
        <option value="gym_2">💧 Après Arène Ondine</option>
        <option value="gym_3">⚡ Après Arène Major Bob</option>
        <option value="gym_4">🌿 Après Arène Erika</option>
        <option value="gym_5">☠️ Après Arène Koga</option>
        <option value="gym_6">🔮 Après Arène Sabrina</option>
        <option value="gym_7">🔥 Après Arène Auguste</option>
        <option value="gym_8">🌍 Après Arène Giovanni</option>
        <option value="elite_four">👑 Conseil des 4</option>
        <option value="post_game">🌟 Post-Ligue</option>
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
                    <h4 style="margin-bottom: 15px; color: #2c3e50;">Advanced Options</h4>
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
                            <span>Enhanced Rewards</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="genStoryElements">
                            <span>Story Elements</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="genChainQuest">
                            <span>Quest Chain</span>
                        </label>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 25px;">
                    <button class="btn btn-success btn-lg" onclick="adminPanel.questGenerator.generateAdvancedQuest()" style="padding: 15px 30px; font-size: 1.1rem; background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                        <i class="fas fa-dice"></i> Generate Advanced Quest!
                    </button>
                </div>

                <div id="generatedQuestPreview" style="display: none; background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border: 2px solid #28a745; border-radius: 15px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.2);">
                    <h4 style="color: #155724; margin-bottom: 20px; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-check-circle"></i> Advanced Quest Generated
                    </h4>
                    <div id="questPreviewContent"></div>
                    <div style="margin-top: 20px; text-align: center; display: flex; gap: 15px; justify-content: center;">
                        <button class="btn btn-primary" onclick="adminPanel.questGenerator.createQuestFromGenerated()">
                            <i class="fas fa-plus"></i> Create This Quest
                        </button>
                        <button class="btn btn-warning" onclick="adminPanel.questGenerator.generateAdvancedQuest()">
                            <i class="fas fa-redo"></i> Generate Another
                        </button>
                        <button class="btn btn-info" onclick="adminPanel.questGenerator.exportQuestData()">
                            <i class="fas fa-download"></i> Export Data
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

    generateAdvancedQuest() {
        console.log('🎲 Generating advanced quest with sophisticated features...')
        
        try {
            const preferences = this.getGenerationPreferences()
            const quest = this.createAdvancedQuest(preferences)
            
            // Store for later use
            this.lastGeneratedQuest = quest
            
            // Show enhanced preview
            this.showAdvancedQuestPreview(quest)
            
            console.log('✅ Advanced quest generated successfully:', quest)
            
        } catch (error) {
            console.error('❌ Error generating advanced quest:', error)
            this.adminPanel.showNotification('Error generating quest: ' + error.message, 'error')
        }
    }

    getGenerationPreferences() {
        return {
            questType: document.getElementById('genQuestType')?.value || 'random',
            category: document.getElementById('genCategory')?.value || 'random',
progression: document.getElementById('genProgression')?.value || 'random',
            steps: document.getElementById('genSteps')?.value || 'random',
            repeatable: document.getElementById('genRepeatable')?.checked || false,
            autoComplete: document.getElementById('genAutoComplete')?.checked || true,
            multipleNPCs: document.getElementById('genMultipleNPCs')?.checked || false,
            randomRewards: document.getElementById('genRandomRewards')?.checked || true,
            storyElements: document.getElementById('genStoryElements')?.checked || false,
            chainQuest: document.getElementById('genChainQuest')?.checked || false
        }
    }

    createAdvancedQuest(preferences) {
        // Determine quest type with weighted selection
        const questType = preferences.questType === 'random' ? 
            this.getRandomWeightedChoice(this.questData.questTypes) : 
            preferences.questType

        // Determine category with story consideration
        const category = preferences.category === 'random' ? 
            this.getRandomWeightedChoice(this.questData.categories) : 
            preferences.category

        // Determine difficulty with complexity scaling
        const difficulty = preferences.difficulty === 'random' ? 
            this.getRandomChoice(['easy', 'medium', 'hard', 'legendary']) : 
            preferences.difficulty

        // Determine number of steps based on complexity
        const stepCount = preferences.steps === 'random' ? 
            this.calculateOptimalSteps(questType, difficulty) : 
            parseInt(preferences.steps)

        // Select appropriate NPCs based on quest type and expertise
        const npcs = this.selectContextualNPCs(questType, preferences.multipleNPCs, stepCount)
        const startNpc = npcs[0]
        const endNpc = npcs[npcs.length - 1]

        // Generate contextual quest ID and name
        const questId = this.generateContextualQuestId(questType, difficulty)
        const questName = this.generateContextualQuestName(questType, difficulty, startNpc)
        const questDescription = this.generateContextualDescription(questType, questName, difficulty, preferences.storyElements)

        // Generate personality-based dialogues
        const dialogues = this.generateContextualDialogues(startNpc.personality, questType, difficulty)

        // Generate sophisticated multi-step objectives
        const steps = this.generateAdvancedQuestSteps(questType, stepCount, npcs, difficulty, preferences)

        // Create the complete advanced quest object
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
            steps: steps,
            metadata: {
                generatedAt: new Date().toISOString(),
                questType: questType,
                difficulty: difficulty,
                stepCount: stepCount,
                features: {
                    multipleNPCs: preferences.multipleNPCs,
                    storyElements: preferences.storyElements,
                    chainQuest: preferences.chainQuest,
                    enhancedRewards: preferences.randomRewards
                }
            }
        }

        // Add special features based on preferences
        if (category === 'daily') {
            quest.cooldownHours = this.getRandomInt(12, 48)
        }

        if (preferences.chainQuest) {
            quest.chainInfo = this.generateQuestChainInfo(questType, difficulty)
        }

        return quest
    }

    calculateOptimalSteps(questType, difficulty) {
        const complexityMap = {
            'collect': { easy: 1, medium: 2, hard: 3, legendary: 4 },
            'defeat_pokemon': { easy: 1, medium: 2, hard: 3, legendary: 4 },
            'defeat_trainers': { easy: 1, medium: 2, hard: 2, legendary: 3 },
            'talk': { easy: 1, medium: 1, hard: 2, legendary: 3 },
            'deliver': { easy: 2, medium: 3, hard: 3, legendary: 4 },
            'explore': { easy: 1, medium: 2, hard: 3, legendary: 4 },
            'trade': { easy: 1, medium: 2, hard: 2, legendary: 3 },
            'catch': { easy: 1, medium: 2, hard: 3, legendary: 4 }
        }
        
        return complexityMap[questType]?.[difficulty] || 2
    }

    selectContextualNPCs(questType, allowMultiple, stepCount) {
        // Filter NPCs by expertise relevant to quest type
        const expertiseMap = {
            'collect': ['trading', 'exploration', 'research'],
            'defeat_pokemon': ['battle', 'training', 'law'],
            'defeat_trainers': ['battle', 'training'],
            'talk': ['lore', 'knowledge', 'law'],
            'deliver': ['trading', 'healing', 'crafting'],
            'explore': ['exploration', 'research', 'adventure'],
            'trade': ['trading', 'research'],
            'catch': ['research', 'training', 'exploration']
        }

        const relevantExpertise = expertiseMap[questType] || ['research']
        let candidateNPCs = this.questData.npcs.filter(npc => 
            relevantExpertise.includes(npc.expertise)
        )

        // Fallback to all NPCs if no matches
        if (candidateNPCs.length === 0) {
            candidateNPCs = this.questData.npcs
        }

        const npcs = []
        
        if (allowMultiple && stepCount > 1) {
            // Select different NPCs for different steps
            const shuffledNPCs = [...candidateNPCs].sort(() => Math.random() - 0.5)
            
            for (let i = 0; i < Math.min(stepCount, 3); i++) {
                npcs.push(shuffledNPCs[i % shuffledNPCs.length])
            }
        } else {
            // Single NPC for the whole quest
            npcs.push(this.getRandomChoice(candidateNPCs))
        }
        
        return npcs
    }

    generateContextualQuestId(questType, difficulty) {
        const prefixes = {
            'collect': 'gather',
            'defeat_pokemon': 'hunt',
            'defeat_trainers': 'duel',
            'talk': 'speak',
            'deliver': 'carry',
            'explore': 'scout',
            'trade': 'exchange',
            'catch': 'capture'
        }
        
        const prefix = prefixes[questType] || 'quest'
        const difficultyCode = difficulty.substring(0, 1).toUpperCase()
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        
        return `${prefix}_${difficultyCode}_${randomSuffix}`
    }

    generateContextualQuestName(questType, difficulty, npc) {
        const templates = this.questData.questNames[questType] || this.questData.questNames.collect
        let template = this.getRandomChoice(templates)
        
        // Replace placeholders with contextual data
        const replacements = {
            '{npc}': npc.name,
            '{location}': this.formatLocationName(npc.location),
            '{difficulty}': difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
            '{item}': this.getRandomChoice(Object.values(this.questData.items).flat()),
            '{pokemon}': this.getRandomChoice(Object.values(this.questData.pokemon).flat()),
            '{amount}': this.getRandomInt(2, 8)
        }
        
        Object.entries(replacements).forEach(([placeholder, value]) => {
            template = template.replace(new RegExp(placeholder, 'g'), value)
        })
        
        return template
    }

    generateContextualDescription(questType, questName, difficulty, includeStory) {
        const baseDescriptions = {
            'collect': "Resources are needed for an important project.",
            'defeat_pokemon': "Wild Pokemon are causing problems in the area.",
            'defeat_trainers': "Your battle skills need to be tested and proven.",
            'talk': "Important information must be shared between people.",
            'deliver': "A critical package needs safe transportation.",
            'explore': "Unknown territories require careful investigation.",
            'trade': "A mutually beneficial Pokemon exchange is needed.",
            'catch': "New Pokemon companions are required for the team."
        }

        let description = baseDescriptions[questType] || "A mysterious task awaits completion."

        if (includeStory) {
            const storyElements = {
                easy: "This simple task will help you get started on your journey.",
                medium: "This challenging quest will test your skills and determination.",
                hard: "This dangerous mission requires courage and expertise.",
                legendary: "This epic undertaking will become the stuff of legends."
            }
            
            description += " " + storyElements[difficulty]
        }

        return description
    }

    generateContextualDialogues(personality, questType, difficulty) {
        const templates = this.questData.dialogueTemplates[personality] || this.questData.dialogueTemplates.curious
        
        // Enhance dialogues with quest-specific context
        const contextualOffers = [...templates.offer]
        const contextualProgress = [...templates.progress]
        const contextualComplete = [...templates.complete]

        // Add quest-type specific dialogue variations
        const questSpecificLines = {
            'collect': {
                offer: "I need someone reliable to gather some important items.",
                progress: "The collection is going well, I hope?",
                complete: "Perfect! These items are exactly what I needed!"
            },
            'defeat_pokemon': {
                offer: "There's been trouble with wild Pokemon lately.",
                progress: "How goes the battle against those troublesome Pokemon?",
                complete: "Excellent! The Pokemon threat has been neutralized!"
            },
            'explore': {
                offer: "There are unexplored areas that need investigation.",
                progress: "What discoveries have you made in your exploration?",
                complete: "Incredible! Your exploration has revealed valuable information!"
            }
        }

        if (questSpecificLines[questType]) {
            contextualOffers.push(questSpecificLines[questType].offer)
            contextualProgress.push(questSpecificLines[questType].progress)
            contextualComplete.push(questSpecificLines[questType].complete)
        }

        return {
            questOffer: contextualOffers,
            questInProgress: contextualProgress,
            questComplete: contextualComplete
        }
    }

    generateAdvancedQuestSteps(questType, stepCount, npcs, difficulty, preferences) {
        const steps = []
        
        for (let i = 0; i < stepCount; i++) {
            const stepId = `step_${i + 1}`
            const stepName = this.generateAdvancedStepName(questType, i + 1, stepCount)
            const stepDescription = this.generateAdvancedStepDescription(questType, i + 1, stepCount, difficulty)
            const objectives = this.generateAdvancedObjectives(questType, npcs[Math.min(i, npcs.length - 1)], difficulty, i + 1, stepCount)
            const rewards = this.generateAdvancedRewards(difficulty, i + 1, stepCount, preferences.randomRewards)

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

    generateAdvancedStepName(questType, stepNumber, totalSteps) {
        const stepNames = {
            'collect': [
                'Locate the Source', 'Gather Required Items', 'Secure Additional Resources', 'Complete the Collection', 'Final Acquisition'
            ],
            'defeat_pokemon': [
                'Scout the Area', 'Engage Wild Pokemon', 'Clear the Territory', 'Final Confrontation', 'Victory Confirmation'
            ],
            'defeat_trainers': [
                'Training Preparation', 'First Challenge', 'Prove Your Skills', 'Elite Battle', 'Championship Victory'
            ],
            'talk': [
                'Initial Contact', 'Information Exchange', 'Relay the Message', 'Final Discussion', 'Communication Complete'
            ],
            'deliver': [
                'Obtain the Package', 'Begin Transport', 'Navigate Obstacles', 'Safe Passage', 'Successful Delivery'
            ],
            'explore': [
                'Area Reconnaissance', 'Deep Investigation', 'Map the Territory', 'Document Findings', 'Complete Survey'
            ],
            'trade': [
                'Find Trading Partner', 'Negotiate Terms', 'Prepare for Exchange', 'Complete the Trade', 'Confirm Transaction'
            ],
            'catch': [
                'Locate Target Pokemon', 'Prepare Capture Equipment', 'Engage and Weaken', 'Successful Capture', 'Secure New Team Member'
            ]
        }
        
        const names = stepNames[questType] || stepNames.collect
        return names[Math.min(stepNumber - 1, names.length - 1)]
    }

    generateAdvancedStepDescription(questType, stepNumber, totalSteps, difficulty) {
        const intensity = {
            easy: 'straightforward',
            medium: 'challenging',
            hard: 'demanding',
            legendary: 'epic'
        }

        if (stepNumber === 1) {
            return `Begin this ${intensity[difficulty]} ${questType.replace('_', ' ')} mission with careful preparation.`
        } else if (stepNumber === totalSteps) {
            return `Complete the final ${intensity[difficulty]} phase of your quest and claim victory.`
        } else {
            return `Continue with step ${stepNumber} of this ${intensity[difficulty]} mission, staying focused on your goals.`
        }
    }

    generateAdvancedObjectives(questType, npc, difficulty, stepNumber, totalSteps) {
        const objectiveId = `obj_${Math.random().toString(36).substring(2, 8)}`
        
        switch (questType) {
            case 'collect':
                return this.generateCollectionObjective(objectiveId, difficulty, stepNumber, totalSteps)
            
            case 'defeat_pokemon':
                return this.generateDefeatPokemonObjective(objectiveId, difficulty, stepNumber, totalSteps)
            
            case 'defeat_trainers':
                return this.generateDefeatTrainersObjective(objectiveId, difficulty, stepNumber, totalSteps)
            
            case 'talk':
                return this.generateTalkObjective(objectiveId, npc, stepNumber, totalSteps)
            
            case 'deliver':
                return this.generateDeliveryObjective(objectiveId, npc, difficulty, stepNumber, totalSteps)
            
            case 'explore':
                return this.generateExplorationObjective(objectiveId, difficulty, stepNumber, totalSteps)
            
            case 'trade':
                return this.generateTradeObjective(objectiveId, npc, difficulty, stepNumber, totalSteps)
            
            case 'catch':
                return this.generateCatchObjective(objectiveId, difficulty, stepNumber, totalSteps)
            
            default:
                return this.generateCollectionObjective(objectiveId, difficulty, stepNumber, totalSteps)
        }
    }

    generateCollectionObjective(objectiveId, difficulty, stepNumber, totalSteps) {
        const difficultyMultipliers = { easy: 1, medium: 1.5, hard: 2, legendary: 3 }
        const multiplier = difficultyMultipliers[difficulty] || 1
        
        // Select items by rarity based on difficulty
        let itemPool = this.questData.items.healing.concat(this.questData.items.pokeballs)
        if (difficulty === 'hard' || difficulty === 'legendary') {
            itemPool = itemPool.concat(this.questData.items.enhancement, this.questData.items.stones)
        }
        if (difficulty === 'legendary') {
            itemPool = itemPool.concat(this.questData.items.rare)
        }
        
        const item = this.getRandomChoice(itemPool)
        const baseAmount = stepNumber === totalSteps ? 3 : 2
        const amount = Math.floor(baseAmount * multiplier)
        
        return [{
            id: objectiveId,
            type: 'collect',
            description: `Collect ${amount} ${this.formatItemName(item)} for the mission`,
            target: item,
            targetName: this.formatItemName(item),
            requiredAmount: amount
        }]
    }

    generateDefeatPokemonObjective(objectiveId, difficulty, stepNumber, totalSteps) {
        const difficultyMultipliers = { easy: 2, medium: 4, hard: 6, legendary: 10 }
        const multiplier = difficultyMultipliers[difficulty] || 3
        
        // Select Pokemon by difficulty
        let pokemonPool = this.questData.pokemon.common
        if (difficulty === 'medium') pokemonPool = pokemonPool.concat(this.questData.pokemon.uncommon)
        if (difficulty === 'hard') pokemonPool = this.questData.pokemon.uncommon.concat(this.questData.pokemon.rare)
        if (difficulty === 'legendary') pokemonPool = this.questData.pokemon.rare
        
        const pokemon = this.getRandomChoice(pokemonPool)
        const amount = Math.floor(multiplier * (stepNumber === totalSteps ? 1.5 : 1))
        
        return [{
            id: objectiveId,
            type: 'defeat',
            description: `Defeat ${amount} wild ${pokemon} in the area`,
            target: pokemon.toLowerCase(),
            targetName: pokemon,
            requiredAmount: amount
        }]
    }

    generateDefeatTrainersObjective(objectiveId, difficulty, stepNumber, totalSteps) {
        const trainerAmounts = { easy: 1, medium: 2, hard: 3, legendary: 5 }
        const amount = trainerAmounts[difficulty] || 2
        
        return [{
            id: objectiveId,
            type: 'defeat_trainers',
            description: `Battle and defeat ${amount} skilled trainers`,
            target: 'trainer',
            targetName: 'Trainers',
            requiredAmount: amount
        }]
    }

    generateTalkObjective(objectiveId, npc, stepNumber, totalSteps) {
        return [{
            id: objectiveId,
            type: 'talk',
            description: `Have an important conversation with ${npc.name}`,
            target: npc.id.toString(),
            targetName: npc.name,
            requiredAmount: 1,
            validationDialogue: [
                `Perfect! I'm glad we could have this important discussion.`,
                `Thank you for taking the time to speak with me about this matter.`,
                `Your input on this situation is extremely valuable.`
            ]
        }]
    }

    generateDeliveryObjective(objectiveId, npc, difficulty, stepNumber, totalSteps) {
        const itemPool = difficulty === 'legendary' ? this.questData.items.rare : 
                        difficulty === 'hard' ? this.questData.items.enhancement :
                        this.questData.items.healing
        
        const deliveryItem = this.getRandomChoice(itemPool)
        
        return [{
            id: objectiveId,
            type: 'deliver',
            description: `Safely deliver ${this.formatItemName(deliveryItem)} to ${npc.name}`,
            target: npc.id.toString(),
            targetName: npc.name,
            itemId: deliveryItem,
            requiredAmount: 1,
            validationDialogue: [
                `Excellent! This delivery is exactly what I was expecting.`,
                `Perfect timing! Thank you for the safe transport.`,
                `This package is in perfect condition - outstanding work!`
            ]
        }]
    }

    generateExplorationObjective(objectiveId, difficulty, stepNumber, totalSteps) {
        const locationTypes = {
            easy: this.questData.locations.outdoor,
            medium: this.questData.locations.indoor.concat(this.questData.locations.outdoor),
            hard: this.questData.locations.cave.concat(this.questData.locations.indoor),
            legendary: this.questData.locations.special.concat(this.questData.locations.cave)
        }
        
        const locationPool = locationTypes[difficulty] || this.questData.locations.outdoor
        const location = this.getRandomChoice(locationPool)
        
        return [{
            id: objectiveId,
            type: 'reach',
            description: `Explore and investigate ${this.formatLocationName(location)}`,
            target: `${location}_explored`,
            targetName: this.formatLocationName(location),
            requiredAmount: 1
        }]
    }

    generateTradeObjective(objectiveId, npc, difficulty, stepNumber, totalSteps) {
        const pokemonPools = {
            easy: this.questData.pokemon.common,
            medium: this.questData.pokemon.uncommon,
            hard: this.questData.pokemon.rare,
            legendary: this.questData.pokemon.rare.concat(['Dragonite', 'Alakazam', 'Machamp'])
        }
        
        const pool = pokemonPools[difficulty] || this.questData.pokemon.common
        const pokemon1 = this.getRandomChoice(pool)
        const pokemon2 = this.getRandomChoice(pool.filter(p => p !== pokemon1))
        
        return [{
            id: objectiveId,
            type: 'trade',
            description: `Trade your ${pokemon1} for a ${pokemon2} with ${npc.name}`,
            target: npc.id.toString(),
            targetName: npc.name,
            tradePokemon: pokemon1,
            receivePokemon: pokemon2,
            requiredAmount: 1
        }]
    }

    generateCatchObjective(objectiveId, difficulty, stepNumber, totalSteps) {
        const catchAmounts = { easy: 1, medium: 2, hard: 3, legendary: 5 }
        const amount = catchAmounts[difficulty] || 2
        
        const pokemonPools = {
            easy: this.questData.pokemon.common,
            medium: this.questData.pokemon.uncommon,
            hard: this.questData.pokemon.rare,
            legendary: this.questData.pokemon.rare
        }
        
        const pool = pokemonPools[difficulty] || this.questData.pokemon.common
        const catchPokemon = this.getRandomChoice(pool)
        
        return [{
            id: objectiveId,
            type: 'catch',
            description: `Successfully catch ${amount} ${catchPokemon} to expand your team`,
            target: catchPokemon.toLowerCase(),
            targetName: catchPokemon,
            requiredAmount: amount
        }]
    }

    generateAdvancedRewards(difficulty, stepNumber, totalSteps, enhancedRewards) {
        const rewards = []
        const rewardData = this.questData.rewards[difficulty]
        
        // Base gold reward
        const goldAmount = this.getRandomInt(rewardData.gold.min, rewardData.gold.max)
        
        // Bonus for final step
        const finalStepBonus = stepNumber === totalSteps ? 1.5 : 1
        
        rewards.push({
            type: 'gold',
            amount: Math.floor(goldAmount * finalStepBonus)
        })
        
        // Only add items to final step unless enhanced rewards is enabled
        if (stepNumber === totalSteps || enhancedRewards) {
            const itemCount = enhancedRewards ? this.getRandomInt(2, 4) : this.getRandomInt(1, 3)
            
            for (let i = 0; i < itemCount; i++) {
                const itemReward = this.getRandomChoice(rewardData.items)
                const itemCategory = this.questData.items[itemReward.category] || this.questData.items.healing
                const item = this.getRandomChoice(itemCategory)
                const amount = this.getRandomInt(itemReward.amount.min, itemReward.amount.max)
                
                rewards.push({
                    type: 'item',
                    itemId: item,
                    amount: amount
                })
            }
        }
        
        return rewards
    }

    generateQuestChainInfo(questType, difficulty) {
        return {
            isChainQuest: true,
            chainPosition: 1,
            totalChainLength: this.getRandomInt(2, 4),
            nextQuestHint: `Continue the ${questType} saga...`,
            chainTheme: `${questType.charAt(0).toUpperCase() + questType.slice(1)} Mastery`
        }
    }

    showAdvancedQuestPreview(quest) {
        const previewDiv = document.getElementById('generatedQuestPreview')
        const contentDiv = document.getElementById('questPreviewContent')
        
        if (!previewDiv || !contentDiv) return
        
        contentDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 8px;">
                    <strong>ID:</strong> <code>${quest.id}</code>
                </div>
                <div style="background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 8px;">
                    <strong>Name:</strong> ${quest.name}
                </div>
                <div style="background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 8px;">
                    <strong>Category:</strong> <span class="badge ${quest.category}">${quest.category}</span>
                </div>
                <div style="background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 8px;">
                    <strong>Steps:</strong> ${quest.steps.length}
                </div>
                <div style="background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 8px;">
                    <strong>Difficulty:</strong> ${quest.metadata.difficulty}
                </div>
                <div style="background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 8px;">
                    <strong>Type:</strong> ${quest.metadata.questType}
                </div>
            </div>
            
            <div style="margin-bottom: 15px; background: rgba(255, 255, 255, 0.8); padding: 15px; border-radius: 10px;">
                <strong>Description:</strong> ${quest.description}
            </div>
            
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <span><strong>Start NPC:</strong> ${this.getNPCName(quest.startNpcId)}</span>
                <span><strong>End NPC:</strong> ${this.getNPCName(quest.endNpcId)}</span>
                <span><strong>Repeatable:</strong> ${quest.isRepeatable ? '✅' : '❌'}</span>
                <span><strong>Auto Complete:</strong> ${quest.autoComplete ? '✅' : '❌'}</span>
            </div>
            
            <details style="margin-bottom: 15px; background: rgba(255, 255, 255, 0.6); padding: 15px; border-radius: 10px;">
                <summary style="cursor: pointer; font-weight: bold; margin-bottom: 10px;">
                    📋 Quest Steps (${quest.steps.length})
                </summary>
                <div style="margin-top: 15px;">
                    ${quest.steps.map((step, index) => `
                        <div style="background: rgba(255, 255, 255, 0.8); padding: 15px; margin: 10px 0; border-radius: 10px; border-left: 4px solid #28a745;">
                            <h5><strong>Step ${index + 1}:</strong> ${step.name}</h5>
                            <p style="margin: 5px 0; color: #666;"><em>${step.description}</em></p>
                            <div style="margin-top: 10px;">
                                <strong>Objectives:</strong> ${step.objectives.length} | 
                                <strong>Rewards:</strong> ${step.rewards.length}
                                <br><small style="color: #555;">${step.objectives[0]?.description || 'No description'}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </details>
            
            <details style="margin-bottom: 15px; background: rgba(255, 255, 255, 0.6); padding: 15px; border-radius: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">🎁 Rewards Summary</summary>
                <div style="margin-top: 10px;">
                    ${quest.steps.map((step, index) => 
                        step.rewards.length > 0 ? `
                            <div style="margin: 5px 0;">
                                <strong>Step ${index + 1}:</strong> 
                                ${step.rewards.map(reward => 
                                    reward.type === 'gold' ? `${reward.amount} gold` : 
                                    `${reward.amount}x ${this.formatItemName(reward.itemId)}`
                                ).join(', ')}
                            </div>
                        ` : ''
                    ).join('')}
                </div>
            </details>
            
            ${quest.chainInfo ? `
                <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <h5 style="color: #856404;">⛓️ Quest Chain Information</h5>
                    <p><strong>Chain Theme:</strong> ${quest.chainInfo.chainTheme}</p>
                    <p><strong>Position:</strong> ${quest.chainInfo.chainPosition} of ${quest.chainInfo.totalChainLength}</p>
                    <p><strong>Next:</strong> ${quest.chainInfo.nextQuestHint}</p>
                </div>
            ` : ''}
            
            ${quest.cooldownHours ? `
                <div style="background: rgba(108, 117, 125, 0.1); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <strong>⏰ Cooldown:</strong> ${quest.cooldownHours} hours (Daily Quest)
                </div>
            ` : ''}
        `
        
        this.lastGeneratedQuest = quest
        previewDiv.style.display = 'block'
        previewDiv.scrollIntoView({ behavior: 'smooth' })
    }

    createQuestFromGenerated() {
        if (!this.lastGeneratedQuest) {
            this.adminPanel.showNotification('No quest generated yet!', 'error')
            return
        }
        
        console.log('🎲 Creating advanced quest from generated data')
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
            
            this.adminPanel.showNotification('Advanced quest loaded in editor!', 'success')
        }
    }

    exportQuestData() {
        if (!this.lastGeneratedQuest) {
            this.adminPanel.showNotification('No quest to export!', 'error')
            return
        }
        
        const questData = JSON.stringify(this.lastGeneratedQuest, null, 2)
        const blob = new Blob([questData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `quest_${this.lastGeneratedQuest.id}.json`
        a.click()
        
        URL.revokeObjectURL(url)
        this.adminPanel.showNotification('Quest data exported!', 'success')
    }

    getNPCName(npcId) {
        const npc = this.questData.npcs.find(n => n.id === npcId)
        return npc ? npc.name : `NPC ${npcId}`
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

    // Enhanced cleanup with advanced features
    cleanup() {
        this.lastGeneratedQuest = null
        
        // Remove generator modal if exists
        const modal = document.getElementById('questGeneratorModal')
        if (modal) {
            modal.remove()
        }
        
        console.log('🧹 [QuestGenerator] Advanced module cleanup completed')
    }
}

// Export for global access
export default QuestGeneratorModule
