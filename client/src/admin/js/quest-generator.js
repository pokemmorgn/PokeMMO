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
                healing: ['potion', 'super_potion', 'hyper_potion', 'max_potion', 'full_heal', 'revive', 'max_revive'],
                pokeballs: ['poke_ball', 'great_ball', 'ultra_ball', 'master_ball', 'timer_ball', 'repeat_ball', 'luxury_ball'],
                medicine: ['antidote', 'burn_heal', 'ice_heal', 'paralyz_heal', 'awakening'],
                enhancement: ['rare_candy', 'pp_up', 'pp_max', 'calcium', 'iron', 'protein', 'zinc', 'carbos', 'hp_up'],
                tools: ['escape_rope', 'repel', 'super_repel', 'max_repel', 'fishing_rod_basic', 'fishing_rod_super'],
                berries: ['berry_oran', 'berry_pecha', 'berry_cheri', 'berry_rawst'],
                stones: ['moon_stone', 'fire_stone', 'water_stone', 'thunder_stone', 'leaf_stone'],
                fossils: ['fossil_amber', 'fossil_helix', 'fossil_dome'],
                rare: ['master_ball', 'rare_candy', 'pp_max', 'max_revive']
            },
            
            // Pokemon organized by regions and difficulty
            pokemon: {
                common: ['Pidgey', 'Rattata', 'Spearow', 'Caterpie', 'Weedle', 'Magikarp'],
                uncommon: ['Pikachu', 'Sandshrew', 'Nidoran♀', 'Nidoran♂', 'Clefairy', 'Vulpix', 'Jigglypuff'],
                rare: ['Abra', 'Machop', 'Gastly', 'Onix', 'Scyther', 'Electabuzz', 'Magmar'],
                legendary: ['Articuno', 'Zapdos', 'Moltres', 'Mewtwo', 'Mew'],
                cave: ['Zubat', 'Geodude', 'Graveler', 'Onix', 'Machop', 'Gastly'],
                water: ['Magikarp', 'Goldeen', 'Psyduck', 'Poliwag', 'Tentacool', 'Staryu'],
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
// Enhanced English Dialogue Templates - Replace the dialogueTemplates section in quest-generator.js

dialogueTemplates: {
    scientist: {
        offer: [
            "Fascinating! I have a research opportunity that requires field work.",
            "My studies have revealed something that needs investigation.",
            "Science requires data, and I need someone brave enough to gather it.",
            "This discovery could change everything we know about Pokemon!",
            "Eureka! I need a field assistant to validate my theory!",
            "Data doesn't lie, but we need to obtain it first... are you up for it?",
            "My laboratory overflows with hypotheses, but I lack empirical proof!",
            "Scientific research is a battle against ignorance. Join me!",
            "I've made a troubling discovery that requires field verification.",
            "Pokemon still hide so many secrets... help me uncover them!",
            "Excellent! My calculations indicate a research mission is necessary.",
            "The scientific method demands rigorous testing. Will you assist?",
            "I've theorized something incredible, but theory without proof is just wishful thinking!",
            "My instruments are detecting anomalies that need investigation!",
            "The pursuit of knowledge never ends, and I need a capable research partner!"
        ],
        progress: [
            "How goes the data collection? Every sample matters!",
            "Science is built on careful observation and dedication.",
            "Your fieldwork is contributing to groundbreaking research!",
            "Excellent progress! The data you're gathering is invaluable!",
            "Keep documenting everything - even the smallest detail matters!",
            "Science rewards patience and thoroughness. You're doing brilliantly!",
            "Each piece of evidence brings us closer to the truth!",
            "Your methodology is impeccable! Continue the good work!",
            "The scientific community will thank you for this research!",
            "Remember: observe, hypothesize, test, repeat!",
            "Your dedication to the scientific method is commendable!",
            "The data you're collecting will advance our understanding tremendously!"
        ],
        complete: [
            "Extraordinary! This data will advance our understanding significantly!",
            "Your contribution to science will be remembered for generations!",
            "These findings are beyond my wildest theoretical predictions!",
            "Remarkable! You've provided the missing piece to my research puzzle!",
            "This data validates my hypothesis perfectly! Outstanding work!",
            "The scientific implications of your findings are staggering!",
            "You've just contributed to a major scientific breakthrough!",
            "This research will be published in the most prestigious journals!",
            "Your fieldwork has exceeded all my expectations!",
            "The accuracy of your data collection is simply phenomenal!",
            "Science has advanced today thanks to your efforts!",
            "This discovery will revolutionize our field of study!"
        ]
    },
    
    competitive: {
        offer: [
            "Think you've got what it takes to beat the competition?",
            "I need someone who plays to win, not just to participate!",
            "This challenge will separate the champions from the also-rans!",
            "Are you ready to prove you're the best at what you do?",
            "I don't accept second place - do you have that killer instinct?",
            "This task requires someone who thrives under pressure!",
            "Only winners need apply for this challenge!",
            "I can smell victory from here - can you deliver it?",
            "This is your chance to show everyone what you're made of!",
            "Champions are forged in moments like this!",
            "I need someone who doesn't know the meaning of 'quit'!",
            "This competition will push you to your absolute limits!",
            "Are you hungry for victory? Because that's what this takes!",
            "I'm looking for someone who makes winning look effortless!",
            "This challenge demands nothing less than perfection!"
        ],
        progress: [
            "Stay focused! Champions never take their eyes off the prize!",
            "You're in the lead, but don't get complacent now!",
            "Push harder! The competition doesn't rest!",
            "This is where winners separate themselves from the pack!",
            "Feel that pressure? That's the weight of victory calling!",
            "Your competitive spirit is exactly what this needs!",
            "Don't just meet expectations - obliterate them!",
            "You're performing like a true champion out there!",
            "The finish line is in sight - sprint for glory!",
            "Your drive to win is absolutely inspiring!",
            "This is championship-level performance!",
            "You're making victory look inevitable!"
        ],
        complete: [
            "VICTORY! You've proven you're a true champion!",
            "That's how winners get it done! Absolutely flawless!",
            "You didn't just win - you dominated completely!",
            "Champion mindset, champion results - perfect!",
            "You've set the gold standard for excellence!",
            "That performance will be talked about for years!",
            "You've earned your place among the elite!",
            "Victory tastes sweeter when it's earned like this!",
            "You've redefined what winning looks like!",
            "That's not just success - that's pure championship glory!",
            "You've proven that true champions rise to every occasion!",
            "Flawless victory! You've achieved legendary status!"
        ]
    },
    
    mysterious: {
        offer: [
            "The shadows whisper of a task that requires... special attention.",
            "I have knowledge of something that others must not discover.",
            "There are secrets in this world that demand careful handling.",
            "What I'm about to tell you must remain between us alone.",
            "The veil between worlds grows thin, and action is required.",
            "Ancient forces stir, and I need someone who understands discretion.",
            "Some truths are too dangerous for common knowledge.",
            "The cosmos has aligned to bring you to me at this moment.",
            "I deal in mysteries that most minds cannot comprehend.",
            "There are powers at work here beyond ordinary understanding.",
            "The unseen world has needs that the visible cannot fulfill.",
            "Destiny has woven our paths together for this purpose.",
            "I have glimpsed something that requires immediate yet subtle action.",
            "The balance of things depends on what I'm about to ask.",
            "Some knowledge comes with a price - are you willing to pay it?"
        ],
        progress: [
            "The shadows watch your progress with great interest.",
            "You move through this task like one touched by destiny.",
            "The unseen forces approve of your methods.",
            "Each step you take ripples through the fabric of reality.",
            "You handle these mysteries with admirable discretion.",
            "The ancient ones smile upon your progress.",
            "Your actions echo through dimensions unknown.",
            "The veil grows thinner with each task you complete.",
            "You walk the path between worlds with grace.",
            "The cosmic balance shifts favorably with your efforts.",
            "Hidden truths reveal themselves to worthy souls like yours.",
            "The mysteries unfold before you as they should."
        ],
        complete: [
            "The cosmos recognizes your service to the hidden truths.",
            "You have maintained the balance between seen and unseen.",
            "The mysteries you've preserved will protect many.",
            "Your discretion has prevented chaos from spilling into our world.",
            "The ancient pacts have been honored through your actions.",
            "You've proven worthy of the deepest secrets.",
            "The shadows themselves sing your praises.",
            "Reality remains stable thanks to your intervention.",
            "You have walked between worlds and emerged victorious.",
            "The hidden knowledge is safe in hands like yours.",
            "The universe owes you a debt that cannot be repaid.",
            "You've become a guardian of mysteries most sacred."
        ]
    },
    
    eccentric: {
        offer: [
            "Splendid! I have a wonderfully peculiar task that needs doing!",
            "Most people think I'm mad, but you look like you might understand!",
            "This job is so bizarre that it just might work perfectly!",
            "Conventional wisdom says this is impossible - want to prove it wrong?",
            "I've got an idea that's so crazy it circles back to genius!",
            "Normal people wouldn't understand, but you're not normal, are you?",
            "This task defies logic, reason, and probably several laws of physics!",
            "They said it couldn't be done - let's prove them magnificently wrong!",
            "I need someone who appreciates the beauty of organized chaos!",
            "This mission requires thinking so far outside the box we can't see it!",
            "Madness and genius are separated by the thinnest of lines!",
            "I've concocted a plan so outrageous it might just succeed!",
            "Logic is overrated - intuition and chaos are where the magic happens!",
            "This task will either be brilliant or completely insane - possibly both!",
            "I need someone who dances to the beat of their own drummer!"
        ],
        progress: [
            "Marvelous! You're embracing the beautiful madness of it all!",
            "See? What others call crazy, we call creative problem-solving!",
            "Your unconventional approach is working perfectly!",
            "Chaos theory in action - beautiful, isn't it?",
            "You're proving that the impossible is just improbable!",
            "This glorious madness is exactly what the situation needed!",
            "Convention is the enemy of innovation - you understand this!",
            "Your delightfully eccentric methods are yielding results!",
            "The universe appreciates a good dose of controlled chaos!",
            "You're thinking in dimensions that most people can't see!",
            "This organized insanity is a work of art!",
            "Your beautifully bizarre approach is pure genius!"
        ],
        complete: [
            "EUREKA! Your magnificent madness has achieved the impossible!",
            "They said we were crazy - and they were absolutely right!",
            "This gloriously chaotic success will confound the experts!",
            "You've transformed beautiful madness into practical magic!",
            "The impossible has become inevitable through sheer eccentricity!",
            "Your wonderfully weird methods have saved the day!",
            "This outcome is so delightfully absurd it must be perfect!",
            "You've proven that genius and madness are the same thing!",
            "The chaos you've created has birthed perfect order!",
            "This success is beautifully, brilliantly, completely bonkers!",
            "You've redefined the possible through pure eccentricity!",
            "History will remember this as magnificently mad genius!"
        ]
    },
    
    mentor: {
        offer: [
            "Young one, it's time for you to take on a greater challenge.",
            "I see potential in you that must be properly cultivated.",
            "This task will teach you lessons no classroom ever could.",
            "Every master was once a student - let me guide your growth.",
            "True learning comes from facing real challenges with purpose.",
            "I offer you wisdom earned through years of experience.",
            "This mission will reveal strengths you didn't know you possessed.",
            "A teacher's greatest joy is watching students surpass them.",
            "Some lessons can only be learned through direct experience.",
            "I've walked this path before - let me help you navigate it.",
            "Growth requires stepping outside your comfort zone.",
            "This challenge will forge you into something greater.",
            "The best education happens when theory meets practice.",
            "I see in you the spark that all great achievements require.",
            "This task will be your graduation from novice to expert."
        ],
        progress: [
            "Excellent! You're learning faster than I anticipated!",
            "Your growth through this challenge fills me with pride.",
            "Each obstacle overcome makes you stronger and wiser.",
            "You're beginning to see solutions I haven't taught you yet.",
            "The student becomes the teacher through experiences like this.",
            "Your instincts are developing beautifully.",
            "This is exactly the kind of progress I hoped to see.",
            "You're not just completing a task - you're becoming complete.",
            "Each step forward is a lesson mastered.",
            "Your confidence is growing along with your skills.",
            "The wisdom you're gaining will serve you for life.",
            "I can see the expert you're becoming emerging clearly."
        ],
        complete: [
            "Magnificent! You've exceeded even my highest expectations!",
            "The student has truly become the master today.",
            "You've learned more than I could have taught in years.",
            "This achievement marks your transformation into excellence.",
            "You've proven ready for challenges I never dreamed to give you.",
            "The wisdom you've gained through this is immeasurable.",
            "You've graduated from my tutelage with highest honors.",
            "This success proves you've internalized everything I've taught.",
            "You've shown that the greatest lessons are self-discovered.",
            "Your growth through this trial has been extraordinary.",
            "I can now proudly call you colleague rather than student.",
            "You've achieved something that will inspire future learners."
        ]
    },
    
    dramatic: {
        offer: [
            "FATE ITSELF has conspired to bring us together at this moment!",
            "The very foundations of our world tremble, demanding action!",
            "This task shall echo through the ages as legend!",
            "Destiny calls your name with the voice of thunder!",
            "The stars have aligned to herald this momentous occasion!",
            "This mission will be sung by bards for a thousand years!",
            "The weight of history itself rests upon what I ask!",
            "This is your moment of destiny - seize it with both hands!",
            "The gods themselves have orchestrated this meeting!",
            "This quest shall be etched in stone for all eternity!",
            "The very air crackles with the electricity of importance!",
            "This is no mere task - it is DESTINY INCARNATE!",
            "The universe holds its breath awaiting your decision!",
            "This moment shall be remembered as the turning point!",
            "Glory and honor await those brave enough to answer!"
        ],
        progress: [
            "BEHOLD! Your progress shakes the very heavens!",
            "The earth itself trembles at your magnificent efforts!",
            "Your deeds write themselves across the sky in letters of fire!",
            "Each step you take resonates through the corridors of time!",
            "The angels weep tears of joy at your dedication!",
            "Your noble quest unfolds like the greatest epic ever told!",
            "The winds carry tales of your heroism to distant lands!",
            "Your courage blazes like a beacon in the darkness!",
            "The very stones beneath your feet sing of your valor!",
            "Your actions paint masterpieces across the canvas of history!",
            "The cosmos aligns itself in recognition of your greatness!",
            "Your journey becomes the stuff of immortal legend!"
        ],
        complete: [
            "TRIUMPH! The heavens themselves rejoice at your victory!",
            "Your success shall be remembered until the end of days!",
            "The universe itself applauds your magnificent achievement!",
            "This victory shall inspire heroes for generations to come!",
            "Your name is now written in the stars themselves!",
            "The gods have witnessed greatness incarnate today!",
            "This achievement transcends mortal accomplishment!",
            "The very fabric of reality celebrates your success!",
            "Your triumph shall echo through eternity's halls!",
            "History itself has been rewritten by your deeds!",
            "The cosmos sings an eternal song of your victory!",
            "You have achieved something truly LEGENDARY!"
        ]
    }
}
    
    caring: {
        offer: [
            "Oh dear, I'm so worried about this situation...",
            "Someone with a kind heart like yours could really help.",
            "I hate to ask, but I really need assistance with something important.",
            "Your compassionate nature makes you perfect for this task.",
            "Please, I'm at my wit's end and could use your help!",
            "You have such a gentle soul... would you consider helping me?",
            "I've been losing sleep over this problem. Could you assist?",
            "Your reputation for kindness precedes you. I need your help!",
            "This situation weighs heavily on my heart. Will you help?",
            "I can see the goodness in your eyes. Please, lend me your aid!",
            "My heart aches thinking about this problem. Can you help?",
            "You seem like someone who truly cares about others...",
            "I'm desperate and need someone with your compassion!",
            "This matter is close to my heart. Would you be willing to help?",
            "Your kindness could make all the difference in this situation!"
        ],
        progress: [
            "Please be careful out there! I worry about you.",
            "Your kindness gives me hope that everything will work out.",
            "Thank you for taking on this burden. It means so much.",
            "I'm praying for your safety every step of the way!",
            "Your compassion shines through everything you do!",
            "Knowing you're helping puts my mind at ease.",
            "You're an angel for taking this on. Please stay safe!",
            "Your gentle nature is exactly what this situation needs.",
            "I can't thank you enough for your selfless help!",
            "You're making such a positive difference!",
            "My heart is full of gratitude for your assistance!",
            "Please don't push yourself too hard. Your wellbeing matters!"
        ],
        complete: [
            "Oh, thank goodness! You've put my mind at ease!",
            "Your kindness has made all the difference in the world!",
            "I knew I could count on someone with such a caring heart!",
            "You've lifted such a weight off my shoulders! Bless you!",
            "Your compassion has saved the day once again!",
            "I'm moved to tears by your generosity and kindness!",
            "You're truly a guardian angel in disguise!",
            "The world needs more people like you in it!",
            "Your selfless actions have touched my heart deeply!",
            "You've restored my faith in the goodness of people!",
            "I'll never forget your kindness and compassion!",
            "You've made an old soul very, very happy today!"
        ]
    },
    
    strict: {
        offer: [
            "Citizen! I have an official matter that requires your cooperation.",
            "The law demands action, and I need a capable individual.",
            "Justice cannot wait! This situation requires immediate attention.",
            "By the authority vested in me, I'm requesting your assistance.",
            "Order must be maintained! Are you willing to serve justice?",
            "The safety of our community depends on swift action!",
            "I need someone who respects the law and order!",
            "This is a matter of public safety and civic duty!",
            "The authorities require a responsible citizen for this task!",
            "Justice is blind, but it needs dedicated hands to work!",
            "I'm calling upon your sense of civic responsibility!",
            "The law is clear, and so is what needs to be done!",
            "Discipline and order are the foundation of civilization!",
            "I need someone who understands the importance of rules!",
            "This official business cannot be delayed any longer!"
        ],
        progress: [
            "Stay focused on the mission! Justice depends on it.",
            "Follow protocol and you'll succeed in this endeavor.",
            "The law is clear, and so is your duty in this matter.",
            "Maintain discipline and see this through to completion!",
            "Your adherence to procedure is exemplary!",
            "Justice moves forward thanks to your dedication!",
            "Stay the course - the law backs your actions!",
            "Your commitment to order is commendable!",
            "Precision and discipline will lead to success!",
            "The community's safety rests on your shoulders!",
            "Follow regulations and victory is assured!",
            "Your methodical approach is exactly what's needed!"
        ],
        complete: [
            "Outstanding work! You've upheld justice admirably!",
            "The community is safer thanks to your actions!",
            "You've proven yourself worthy of official commendation!",
            "Exemplary service! You understand the meaning of duty!",
            "Your adherence to protocol has ensured success!",
            "Justice has been served through your dedicated efforts!",
            "You've set an example for all citizens to follow!",
            "The law has been upheld through your actions!",
            "Your discipline and dedication are truly inspiring!",
            "Order has been restored thanks to your intervention!",
            "You've demonstrated the highest standards of citizenship!",
            "The authorities recognize your exceptional service!"
        ]
    },
    
    greedy: {
        offer: [
            "Psst... I've got a lucrative proposition for someone like you.",
            "Money talks, and this opportunity is shouting profits!",
            "Business is business, and this deal could make us both rich.",
            "I smell opportunity, and it smells like gold coins!",
            "Listen, there's serious money to be made here!",
            "This could be the deal of a lifetime! Interested?",
            "I've got a business venture that's pure gold!",
            "Forget charity work - this pays REAL money!",
            "Want to turn a quick profit? I've got just the thing!",
            "My nose for business is never wrong - this is big!",
            "Coins are calling, and they're calling YOUR name!",
            "I see dollar signs when I look at this opportunity!",
            "Strike while the iron is hot - and the gold is flowing!",
            "This isn't just business, it's a goldmine waiting to happen!",
            "They say money can't buy happiness, but it sure helps!"
        ],
        progress: [
            "Time is money! The sooner you finish, the bigger the profit!",
            "Think of all the coins waiting for you at the end!",
            "Every second you waste is money down the drain!",
            "Ka-ching! Can you hear those coins calling?",
            "Speed equals profit in this business!",
            "The meter is running, and so should you be!",
            "Efficiency means more money in your pocket!",
            "Don't let this golden opportunity slip away!",
            "The competition never sleeps - neither should we!",
            "Every moment counts when profit is on the line!",
            "Money doesn't grow on trees, but this is close!",
            "The treasure chest is waiting - go claim it!"
        ],
        complete: [
            "Excellent! Our business partnership has been most profitable!",
            "Ka-ching! That's the sound of success!",
            "Money well earned! You've got a good head for business!",
            "Pure profit! I knew you had the golden touch!",
            "This deal was worth its weight in gold!",
            "You've just made yourself a very wealthy individual!",
            "The coins are practically singing your praises!",
            "Business with you is always a pleasure and a profit!",
            "You've got the Midas touch - everything turns to gold!",
            "This partnership is more valuable than any treasure!",
            "The cash register in my mind is going wild!",
            "You've proven that success and profit go hand in hand!"
        ]
    },
    
    tough: {
        offer: [
            "You look like someone who doesn't back down from a challenge!",
            "I need someone with real backbone for this job!",
            "Think you're tough enough to handle what I'm about to ask?",
            "Only the strongest trainers can succeed at this task!",
            "This job separates the warriors from the weaklings!",
            "I need someone who fights first and asks questions later!",
            "Are you ready to prove your mettle in battle?",
            "This task requires guts, determination, and raw strength!",
            "Weaklings need not apply - this is serious business!",
            "I can see the fire in your eyes. You're ready for this!",
            "This challenge will test every fiber of your being!",
            "Only those with iron will can handle what's coming!",
            "The weak crumble under pressure. You don't look weak!",
            "This mission demands a warrior's spirit and heart!",
            "Blood, sweat, and determination - that's what this takes!"
        ],
        progress: [
            "Show me what you're really made of out there!",
            "Toughness isn't just physical - it's mental determination!",
            "Pain is temporary, but glory lasts forever!",
            "Push through the pain and emerge victorious!",
            "Real warriors never give up, no matter the odds!",
            "Your strength is being tested - don't let me down!",
            "Fight like your life depends on it!",
            "Channel that inner fire and burn through obstacles!",
            "Weakness is a choice - choose strength instead!",
            "Every scar tells a story of survival and strength!",
            "The battlefield rewards only the strong!",
            "Your determination is your greatest weapon!"
        ],
        complete: [
            "Now THAT'S what I call real strength and determination!",
            "You've proven you have the heart of a true warrior!",
            "Incredible! You're tougher than I even imagined!",
            "That display of strength was absolutely phenomenal!",
            "You've earned the respect of every warrior I know!",
            "Your courage under fire is the stuff of legends!",
            "I've seen battles, but that performance was art!",
            "You've got the soul of a champion burning within you!",
            "That kind of determination can't be taught - it's earned!",
            "You've proven that true strength comes from within!",
            "Warriors like you are born once in a generation!",
            "Your victory echoes through the halls of the mighty!"
        ]
    },
    
    wise: {
        offer: [
            "Young one, wisdom comes through experience and challenges.",
            "Life has taught me much, and this task will teach you.",
            "Every journey begins with understanding one's purpose.",
            "Ancient knowledge speaks of the importance of such missions.",
            "The path of wisdom is paved with meaningful actions.",
            "In my years, I've learned that some tasks choose their bearers.",
            "Destiny whispers, and I believe it speaks through this quest.",
            "The universe has a way of putting the right person in place.",
            "True understanding comes from walking difficult paths.",
            "The old ways teach us that every challenge has purpose.",
            "Enlightenment awaits those brave enough to seek it.",
            "The wheel of fate turns, and your time has come.",
            "Ancient texts foretold of one who would take this task.",
            "Wisdom flows to those who act with pure intentions.",
            "The spirits of old guide us toward meaningful deeds."
        ],
        progress: [
            "Patience, young traveler. All good things take time.",
            "Each step forward brings you closer to true understanding.",
            "Wisdom is not in the destination, but in the journey itself.",
            "The path you walk now will shape who you become.",
            "Every lesson learned is a treasure more valuable than gold.",
            "The ancient ones smile upon your progress.",
            "Trust in the journey, for it knows where it leads.",
            "Your growth through this trial brings me great joy.",
            "The seeds of wisdom you plant now will bloom in time.",
            "Experience is the greatest teacher of all.",
            "The universe conspires to help those who help others.",
            "Your journey echoes the great heroes of old."
        ],
        complete: [
            "You have grown wiser through this experience, child.",
            "The knowledge you've gained is worth more than gold.",
            "You've learned something valuable that will serve you well.",
            "Your spirit has matured through this trial.",
            "The wisdom you've earned will light your path forward.",
            "You've proven that age is not the only source of wisdom.",
            "The ancestors would be proud of your accomplishment.",
            "This experience has forged you into someone greater.",
            "You carry within you now a piece of ancient understanding.",
            "The circle of wisdom continues through your actions.",
            "You've taken your first steps on the path to enlightenment.",
            "The universe recognizes your growth and smiles upon you."
        ]
    },
    
    adventurous: {
        offer: [
            "Adventure calls to those brave enough to answer!",
            "I've discovered something that'll get your blood pumping!",
            "Ready for an expedition that'll test your mettle?",
            "The thrill of discovery awaits those bold enough to seek it!",
            "Pack your bags - we're about to embark on something epic!",
            "I can smell adventure in the air, can't you?",
            "Life's too short for boring quests - this one's incredible!",
            "Are you ready to write your name in the book of legends?",
            "The unknown beckons with promises of glory and discovery!",
            "I've got a map to places most people only dream about!",
            "Adventure doesn't come knocking - you have to chase it!",
            "The wild calls, and only the brave dare answer!",
            "This journey will be talked about for generations!",
            "Forget the beaten path - we're forging our own trail!",
            "The horizon holds secrets just waiting to be uncovered!"
        ],
        progress: [
            "Feel that rush? That's the spirit of adventure!",
            "Every step into the unknown brings new possibilities!",
            "Adventure isn't just a hobby - it's a way of life!",
            "You're living the dream that most people only imagine!",
            "Each discovery makes the next one even more exciting!",
            "The thrill of exploration never gets old, does it?",
            "You're writing an adventure story with every step!",
            "The unknown becomes known through brave souls like you!",
            "Adventure rewards the bold and punishes the timid!",
            "You're dancing on the edge of the map itself!",
            "Every true adventurer knows this feeling!",
            "The world reveals its secrets to those who dare explore!"
        ],
        complete: [
            "What an absolutely incredible adventure we've shared!",
            "You've got the soul of a true explorer!",
            "That was the kind of adventure legends are made of!",
            "I knew you had the spirit of a real adventurer!",
            "This expedition will be remembered for years to come!",
            "You've proven that the age of exploration isn't over!",
            "The tales of this adventure will inspire others to explore!",
            "You've expanded the boundaries of the known world!",
            "Adventure flows through your veins like wildfire!",
            "You've experienced something most people never will!",
            "This journey has forged you into a true explorer!",
            "The spirit of adventure burns brightest in souls like yours!"
        ]
    },
    
    hardworking: {
        offer: [
            "I've got honest work that needs doing by honest hands.",
            "Roll up your sleeves - this job requires real effort.",
            "Hard work builds character, and this task builds both.",
            "No shortcuts here - just good old-fashioned labor.",
            "This job won't do itself, and I need someone reliable.",
            "I need someone who understands the value of hard work.",
            "Sweat equity pays the best dividends in life.",
            "This task requires elbow grease and determination.",
            "I'm looking for someone who takes pride in their work.",
            "Good work requires good workers - are you one?",
            "This job demands dedication and a strong work ethic.",
            "I need someone who finishes what they start.",
            "Hard work never killed anyone - it made them stronger!",
            "This is the kind of work that builds backbone.",
            "I can tell by looking at you that you're not afraid of work."
        ],
        progress: [
            "Keep at it! Persistence pays off in the end!",
            "Every drop of sweat is an investment in success!",
            "Hard work never killed anyone - it just made them stronger!",
            "You're proving that dedication always pays off!",
            "Your work ethic is something to be proud of!",
            "This is how real progress gets made - one step at a time!",
            "Steady effort beats sporadic brilliance every time!",
            "You're showing what true commitment looks like!",
            "The fruits of labor are always the sweetest!",
            "Your persistence is an inspiration to us all!",
            "Good things come to those who work for them!",
            "You're building more than just completing a task - you're building character!"
        ],
        complete: [
            "Outstanding work ethic! You've earned every bit of this reward!",
            "That's what I call putting in an honest day's work!",
            "You've proven that dedication and effort always pay off!",
            "The quality of your work speaks volumes about your character!",
            "You've accomplished something you can be truly proud of!",
            "Hard work like yours is becoming rarer these days!",
            "You've shown that there's no substitute for good old effort!",
            "The pride in good work well done is written all over your face!",
            "You've earned the respect that comes with honest labor!",
            "This is what happens when skill meets determination!",
            "Your work ethic is a testament to your character!",
            "You've proven that rolling up your sleeves gets results!"
        ]
    },
    
    relaxed: {
        offer: [
            "Hey there, no pressure, but I could use some help.",
            "Take it easy, but maybe you could lend me a hand?",
            "Life's too short to stress, but this still needs doing.",
            "Whenever you get a chance, would you mind helping out?",
            "No rush at all, but I've got something that needs attention.",
            "Chill vibes only, but I could really use your assistance.",
            "Don't stress about it, but this task could use someone like you.",
            "Easy does it, but would you be up for lending a hand?",
            "Keep calm and carry on... to help me with this task!",
            "No worries if you're busy, but this could use your touch.",
            "Take your time deciding, but I think you'd be perfect for this.",
            "Smooth sailing ahead if you're willing to help out.",
            "Keep it cool, keep it simple - just like this task.",
            "No pressure, no diamonds... but also no stress here!",
            "Laid back doesn't mean lazy - sometimes it means efficient."
        ],
        progress: [
            "No rush at all - just whenever you get around to it.",
            "Take your time, enjoy the journey, no need to hurry.",
            "Everything happens at its own pace, just go with the flow.",
            "You're doing great - no need to stress about timing.",
            "Slow and steady wins the race, my friend.",
            "Take it one step at a time, no pressure whatsoever.",
            "You're handling this beautifully - stay relaxed!",
            "Good things come to those who don't rush.",
            "Keep that zen attitude - it's working perfectly!",
            "No deadlines here, just progress at your own pace.",
            "You're in the flow now - keep that energy!",
            "Relax and let things unfold naturally."
        ],
        complete: [
            "Perfect! Thanks for keeping things nice and easy.",
            "See? No stress, no pressure, just good results.",
            "That was smooth sailing from start to finish!",
            "You handled that with exactly the right energy.",
            "Cool, calm, and collected - that's how it's done!",
            "Thanks for proving that easy does it!",
            "You made that look effortless - well done!",
            "That's the kind of laid-back excellence I appreciate!",
            "No stress, all success - exactly what I hoped for!",
            "You kept your cool and delivered perfectly!",
            "Sometimes the best approach is the relaxed approach!",
            "You've shown that calm confidence gets results!"
        ]
    },
    
    curious: {
        offer: [
            "I wonder... could you help me investigate something fascinating?",
            "My curiosity has uncovered a mystery that needs solving.",
            "Questions lead to answers, and I have so many questions!",
            "The pursuit of knowledge never ends, and I need assistance.",
            "Something peculiar has caught my attention... interested?",
            "I've stumbled upon a puzzle that's driving me crazy!",
            "My inquisitive nature has led to something requiring investigation.",
            "There's a mystery here that's begging to be solved!",
            "I can't rest until I know the truth about this situation.",
            "Something doesn't add up, and I need help figuring it out.",
            "The more I learn, the more questions I have!",
            "This enigma has captured my imagination completely.",
            "I've found something that defies explanation... so far.",
            "My curiosity is killing me - I must know more!",
            "There are secrets here waiting to be uncovered!"
        ],
        progress: [
            "What have you discovered? I'm dying to know!",
            "Every answer seems to lead to three more questions!",
            "The more we learn, the more we realize how much we don't know!",
            "Your findings are adding pieces to this fascinating puzzle!",
            "I can barely contain my excitement about what you might find!",
            "Each discovery opens new avenues of investigation!",
            "You're unraveling mysteries that have puzzled me for ages!",
            "The plot thickens with every piece of information you gather!",
            "I'm on the edge of my seat waiting for your next discovery!",
            "This investigation is revealing more than I ever imagined!",
            "Your detective work is absolutely fascinating!",
            "We're getting closer to the truth with each step!"
        ],
        complete: [
            "Fascinating discoveries! My curiosity is thoroughly satisfied!",
            "The knowledge you've uncovered is absolutely incredible!",
            "Questions answered, mysteries solved - perfect!",
            "You've satisfied my burning curiosity completely!",
            "The truth was even more interesting than I imagined!",
            "You've solved a puzzle that's been haunting my thoughts!",
            "This investigation has exceeded all my expectations!",
            "The mysteries you've unraveled are simply astounding!",
            "My thirst for knowledge has been thoroughly quenched!",
            "You've answered questions I didn't even know I had!",
            "The truth is often stranger than fiction - and this proves it!",
            "Your investigative skills have impressed me beyond measure!"
        ]
    },
    
    gentle: {
        offer: [
            "Oh my, I hope you don't mind me asking for a small favor?",
            "Would you be so kind as to help me with something delicate?",
            "I apologize for bothering you, but I could use gentle assistance.",
            "Your tender approach would be perfect for this task.",
            "This requires a soft touch and caring heart - like yours.",
            "I hope I'm not imposing, but you seem like someone who understands.",
            "This situation calls for someone with your gentle nature.",
            "Would you mind terribly helping with something that needs care?",
            "I sense you have the patience this task requires.",
            "Your kind spirit is exactly what this situation needs.",
            "I don't mean to trouble you, but this needs a gentle hand.",
            "You have such a calming presence - would you help me?",
            "This delicate matter could benefit from your tender care.",
            "I hope you'll forgive my asking, but you're perfect for this.",
            "Sometimes the gentlest approach yields the best results."
        ],
        progress: [
            "You're handling this with such grace and care.",
            "Your gentle approach is making all the difference.",
            "Thank you for being so patient and understanding.",
            "Your tender care shows in everything you do.",
            "You have such a soothing way about you.",
            "This situation is in the best possible hands.",
            "Your kindness shines through every action.",
            "You're approaching this with perfect sensitivity.",
            "I knew your gentle nature was right for this task.",
            "Your caring touch is exactly what was needed.",
            "You're handling this more beautifully than I hoped.",
            "Your compassionate approach is truly heartwarming."
        ],
        complete: [
            "You've handled this with such beautiful care and grace.",
            "Your gentle touch has made all the difference in the world.",
            "Thank you for approaching this with such tender consideration.",
            "You've shown that kindness truly is the most powerful force.",
            "Your gentle nature has brought peace to this situation.",
            "I'm moved by the care and love you've shown throughout.",
            "You've proven that softness can be a tremendous strength.",
            "Your tender heart has created something truly beautiful here.",
            "The world needs more people with your gentle spirit.",
            "You've touched this situation with grace and made it better.",
            "Your caring approach has brought harmony where there was none.",
            "Thank you for showing that gentleness can accomplish miracles."
        ]
    },
    
    intellectual: {
        offer: [
            "I've been contemplating a problem that requires practical application.",
            "My theoretical framework needs empirical validation.",
            "The literature suggests this phenomenon requires investigation.",
            "I've hypothesized something that demands field verification.",
            "This intellectual puzzle requires more than just theory.",
            "My research has reached a point where action is necessary.",
            "Academic discourse only goes so far - I need practical results.",
            "The philosophical implications of this task are quite intriguing.",
            "I've been analyzing patterns that suggest intervention is needed.",
            "This conundrum requires both intellectual rigor and practical action.",
            "My studies have led to a hypothesis that needs testing.",
            "The complexity of this situation fascinates me intellectually.",
            "I need someone who can bridge theory and practice effectively.",
            "This challenge combines multiple disciplines beautifully.",
            "The epistemological implications of this task are remarkable."
        ],
        progress: [
            "Your methodology is quite sound from an analytical perspective.",
            "I'm documenting your progress for future academic reference.",
            "The data you're providing supports my theoretical framework.",
            "Your approach demonstrates excellent critical thinking skills.",
            "This case study is developing beautifully.",
            "Your practical application of theory is exemplary.",
            "The empirical evidence you're gathering is invaluable.",
            "I'm observing fascinating patterns in your work.",
            "Your logical approach to this problem is commendable.",
            "The intellectual rigor you're applying is impressive.",
            "You're validating several key theoretical principles.",
            "This research is yielding exceptional insights."
        ],
        complete: [
            "Excellent! Your work has validated my theoretical predictions.",
            "The intellectual satisfaction of this completion is immense.",
            "You've provided empirical proof for several academic theories.",
            "This case study will contribute significantly to the literature.",
            "Your practical application of theory has been remarkable.",
            "The academic implications of your success are far-reaching.",
            "You've demonstrated the beautiful marriage of theory and practice.",
            "This outcome supports my research hypothesis perfectly.",
            "Your intellectual approach to this problem was exemplary.",
            "The scholarly community would appreciate your methodology.",
            "You've contributed to the advancement of knowledge itself.",
            "This research will influence academic thinking for years to come."
        ]
    },
    
    passionate: {
        offer: [
            "This task ignites a fire in my soul! Will you help me?",
            "I'm absolutely burning with enthusiasm for this project!",
            "My heart races just thinking about this opportunity!",
            "This is more than a job - it's my calling, my passion!",
            "I live and breathe for challenges like this one!",
            "Every fiber of my being tells me this is important!",
            "This isn't just work - it's art, it's poetry in motion!",
            "My passion for this task knows no bounds!",
            "I'm electrified by the possibilities this task presents!",
            "This challenge speaks to the very core of who I am!",
            "I've never felt more alive than when working on tasks like this!",
            "My enthusiasm for this project is absolutely infectious!",
            "This task embodies everything I'm passionate about!",
            "I'm completely consumed by the potential of this mission!",
            "Every instinct I have screams that this is vital work!"
        ],
        progress: [
            "Your dedication feeds my passion even more!",
            "I can feel the energy and love you're putting into this!",
            "This is what happens when passion meets action!",
            "Your commitment to excellence mirrors my own fervor!",
            "Every step you take increases my excitement!",
            "You're bringing the same intensity I feel to this task!",
            "The passion you're showing makes my heart sing!",
            "This is pure artistry in motion - absolutely beautiful!",
            "Your effort is fueling the fire of my enthusiasm!",
            "I can see the love and care in everything you're doing!",
            "This collaboration is everything I dreamed it could be!",
            "You're channeling the same passionate energy I feel!"
        ],
        complete: [
            "MAGNIFICENT! Your passion has created something beautiful!",
            "This outcome exceeds even my most passionate dreams!",
            "You've poured your heart into this, and it shows!",
            "The fire in your work has ignited something truly special!",
            "This completion fills my soul with indescribable joy!",
            "You've transformed my passionate vision into reality!",
            "The love and dedication you've shown is overwhelming!",
            "This is what happens when passion meets perfect execution!",
            "My heart is overflowing with gratitude and excitement!",
            "You've proven that passion truly is the secret ingredient!",
            "This masterpiece will inspire passion in others for years!",
            "You've shown that when hearts are in it, miracles happen!"
        ]
    },
            
            // Advanced rewards system
            rewards: {
                easy: {
                    gold: { min: 75, max: 200 },
                    items: [
                        { category: 'healing', amount: { min: 2, max: 4 }, rarity: 'common' },
                        { category: 'pokeballs', amount: { min: 3, max: 6 }, rarity: 'common' },
                        { category: 'medicine', amount: { min: 1, max: 3 }, rarity: 'common' }
                    ]
                },
                medium: {
                    gold: { min: 250, max: 500 },
                    items: [
                        { category: 'healing', amount: { min: 2, max: 4 }, rarity: 'uncommon' },
                        { category: 'pokeballs', amount: { min: 3, max: 5 }, rarity: 'uncommon' },
                        { category: 'enhancement', amount: { min: 1, max: 2 }, rarity: 'common' },
                        { category: 'tools', amount: { min: 1, max: 2 }, rarity: 'common' }
                    ]
                },
                hard: {
                    gold: { min: 600, max: 1000 },
                    items: [
                        { category: 'healing', amount: { min: 2, max: 3 }, rarity: 'rare' },
                        { category: 'pokeballs', amount: { min: 2, max: 4 }, rarity: 'rare' },
                        { category: 'enhancement', amount: { min: 1, max: 3 }, rarity: 'uncommon' },
                        { category: 'stones', amount: { min: 1, max: 1 }, rarity: 'rare' }
                    ]
                },
                legendary: {
                    gold: { min: 1500, max: 3000 },
                    items: [
                        { category: 'rare', amount: { min: 1, max: 2 }, rarity: 'legendary' },
                        { category: 'enhancement', amount: { min: 2, max: 4 }, rarity: 'rare' },
                        { category: 'stones', amount: { min: 1, max: 2 }, rarity: 'rare' }
                    ]
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
            difficulty: document.getElementById('genDifficulty')?.value || 'random',
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
