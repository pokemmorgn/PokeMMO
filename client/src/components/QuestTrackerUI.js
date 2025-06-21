// client/src/components/QuestTrackerUI.js

export class QuestTrackerUI {
  constructor(questSystem) {
    this.questSystem = questSystem;
    this.trackerElement = null;
    this.trackedQuests = new Map();
    this.isVisible = true;
    this.isMinimized = false;
    this.maxTrackedQuests = 5;
    
    this.init();
  }

  init() {
    this.createTracker();
    this.setupEventListeners();
    console.log('📊 Quest tracker UI created');
  }

  createTracker() {
    const tracker = document.createElement('div');
    tracker.id = 'quest-tracker';
    tracker.className = 'quest-tracker';
    tracker.innerHTML = `
      <div class="quest-tracker-header">
        <div class="tracker-title">
          <span class="tracker-icon">📋</span>
          <span class="tracker-text">Quests</span>
        </div>
        <div class="tracker-controls">
          <button class="tracker-btn minimize-btn" title="Minimize">−</button>
          <button class="tracker-btn close-btn" title="Hide">×</button>
        </div>
      </div>
      <div class="quest-tracker-content">
        <div class="tracked-quests" id="tracked-quests">
          <div class="no-quests">No active quests</div>
        </div>
      </div>
    `;

    document.body.appendChild(tracker);
    this.trackerElement = tracker;

    this.addStyles();
  }

  addStyles() {
    if (document.querySelector('#quest-tracker-styles')) return;

    const style = document.createElement('style');
    style.id = 'quest-tracker-styles';
    style.textContent = `
      .quest-tracker {
        position: fixed;
        top: 120px;
        right: 20px;
        width: 280px;
        max-height: 70vh;
        background: linear-gradient(145deg, rgba(15, 20, 35, 0.95), rgba(25, 30, 45, 0.95));
        border: 2px solid rgba(138, 43, 226, 0.6);
        border-radius: 12px;
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #fff;
        z-index: 950;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }

      .quest-tracker.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateX(100%);
      }

      .quest-tracker.minimized {
        height: 40px;
      }

      .quest-tracker.minimized .quest-tracker-content {
        display: none;
      }

      .quest-tracker-header {
        background: rgba(138, 43, 226, 0.3);
        border-bottom: 1px solid rgba(138, 43, 226, 0.5);
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }

      .quest-tracker.minimized .quest-tracker-header {
        cursor: pointer;
      }

      .tracker-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
        color: #e1bee7;
      }

      .tracker-icon {
        font-size: 16px;
      }

      .tracker-controls {
        display: flex;
        gap: 4px;
      }

      .tracker-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .tracker-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .quest-tracker-content {
        max-height: calc(70vh - 40px);
        overflow-y: auto;
        padding: 8px;
      }

      .tracked-quests {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .no-quests {
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
        padding: 20px 10px;
        font-size: 13px;
      }

      .tracked-quest {
        background: rgba(255, 255, 255, 0.05);
        border-left: 3px solid #8a2be2;
        border-radius: 6px;
        padding: 10px;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }

      .tracked-quest:hover {
        background: rgba(138, 43, 226, 0.1);
        transform: translateX(-2px);
        box-shadow: 0 2px 8px rgba(138, 43, 226, 0.3);
      }

      .tracked-quest.completed {
        border-left-color: #4caf50;
        background: rgba(76, 175, 80, 0.1);
        animation: questCompleteGlow 1s ease;
      }

      .tracked-quest.new {
        animation: questAppear 0.5s ease;
      }

      .tracked-quest.updated {
        animation: questUpdate 0.3s ease;
      }

      @keyframes questCompleteGlow {
        0%, 100% { box-shadow: 0 0 0 rgba(76, 175, 80, 0); }
        50% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.6); }
      }

      @keyframes questAppear {
        from { 
          opacity: 0; 
          transform: translateX(20px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateX(0) scale(1); 
        }
      }

      @keyframes questUpdate {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }

      .quest-name {
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
        line-height: 1.2;
      }

      .quest-level {
        color: #ffc107;
        font-size: 11px;
        font-weight: bold;
        margin-left: 4px;
      }

      .quest-category {
        position: absolute;
        top: 6px;
        right: 6px;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 8px;
        font-weight: bold;
        text-transform: uppercase;
      }

      .quest-category.main {
        background: rgba(255, 193, 7, 0.3);
        color: #ffc107;
      }

      .quest-category.side {
        background: rgba(76, 175, 80, 0.3);
        color: #4caf50;
      }

      .quest-category.daily {
        background: rgba(244, 67, 54, 0.3);
        color: #f44336;
      }

      .quest-objectives {
        margin-top: 6px;
      }

      .quest-objective {
        font-size: 12px;
        margin: 2px 0;
        padding-left: 12px;
        position: relative;
        color: #ccc;
        line-height: 1.3;
      }

      .quest-objective:before {
        content: "•";
        position: absolute;
        left: 0;
        color: #8a2be2;
        font-weight: bold;
      }

      .quest-objective.completed {
        color: #4caf50;
        text-decoration: line-through;
      }

      .quest-objective.completed:before {
        content: "✓";
        color: #4caf50;
      }

      .quest-objective.failed {
        color: #f44336;
        text-decoration: line-through;
      }

      .quest-objective.failed:before {
        content: "✗";
        color: #f44336;
      }

      .quest-progress {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
      }

      .quest-progress-bar {
        flex: 1;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }

      .quest-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #8a2be2, #ab47bc);
        border-radius: 2px;
        transition: width 0.5s ease;
        position: relative;
      }

      .quest-progress-fill.completed {
        background: linear-gradient(90deg, #4caf50, #66bb6a);
      }

      .quest-progress-text {
        font-size: 10px;
        color: #ccc;
        font-weight: 500;
        min-width: 35px;
        text-align: right;
      }

      .quest-distance {
        font-size: 10px;
        color: #ff9800;
        margin-top: 2px;
        font-weight: 500;
      }

      .quest-timer {
        font-size: 10px;
        color: #f44336;
        margin-top: 2px;
        font-weight: 500;
        animation: timerBlink 1s infinite alternate;
      }

      @keyframes timerBlink {
        0% { opacity: 1; }
        100% { opacity: 0.6; }
      }

      /* Scrollbar styling */
      .quest-tracker-content::-webkit-scrollbar {
        width: 6px;
      }

      .quest-tracker-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }

      .quest-tracker-content::-webkit-scrollbar-thumb {
        background: rgba(138, 43, 226, 0.6);
        border-radius: 3px;
      }

      .quest-tracker-content::-webkit-scrollbar-thumb:hover {
        background: rgba(138, 43, 226, 0.8);
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .quest-tracker {
          width: 260px;
          right: 10px;
          top: 100px;
        }

        .quest-name {
          font-size: 12px;
        }

        .quest-objective {
          font-size: 11px;
        }
      }

      /* Dragging state */
      .quest-tracker.dragging {
        cursor: grabbing;
        z-index: 1000;
      }

      /* Special effects for quest events */
      .quest-tracker.quest-completed {
        border-color: rgba(76, 175, 80, 0.8);
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.5),
          0 0 20px rgba(76, 175, 80, 0.4);
      }

      .quest-tracker.new-quest {
        animation: trackerNewQuest 0.6s ease;
      }

      @keyframes trackerNewQuest {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); border-color: rgba(255, 193, 7, 0.8); }
        100% { transform: scale(1); }
      }
    `;

    document.head.appendChild(style);
  }

  setupEventListeners() {
    const header = this.trackerElement.querySelector('.quest-tracker-header');
    const minimizeBtn = this.trackerElement.querySelector('.minimize-btn');
    const closeBtn = this.trackerElement.querySelector('.close-btn');

    // Minimize/maximize functionality
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });

    // Hide functionality
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // Header click to expand when minimized
    header.addEventListener('click', () => {
      if (this.isMinimized) {
        this.toggleMinimize();
      }
    });

    // Make tracker draggable
    this.setupDragging(header);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  setupDragging(header) {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('tracker-btn')) return;
      
      isDragging = true;
      this.trackerElement.classList.add('dragging');
      
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      // Keep within viewport bounds
      const rect = this.trackerElement.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      
      this.trackerElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
      this.trackerElement.style.right = 'auto';
      this.trackerElement.style.top = 'auto';
      this.trackerElement.style.left = '0';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      this.trackerElement.classList.remove('dragging');
    });
  }

  updateQuests(quests) {
    console.log('📊 Updating quest tracker with', quests.length, 'quests');
    
    const container = this.trackerElement.querySelector('#tracked-quests');
    
    if (!quests || quests.length === 0) {
      container.innerHTML = '<div class="no-quests">No active quests</div>';
      return;
    }

    // Sort quests by priority (main > side > daily)
    const sortedQuests = quests.sort((a, b) => {
      const priority = { main: 3, side: 2, daily: 1 };
      return (priority[b.category] || 0) - (priority[a.category] || 0);
    });

    // Limit to max tracked quests
    const questsToShow = sortedQuests.slice(0, this.maxTrackedQuests);
    
    container.innerHTML = '';
    
    questsToShow.forEach((quest, index) => {
      const questElement = this.createQuestElement(quest, index);
      container.appendChild(questElement);
    });

    // Update tracker state
    this.trackerElement.classList.toggle('quest-completed', 
      questsToShow.some(q => q.currentStepIndex >= q.steps.length));
  }

  createQuestElement(quest, index) {
    const questDiv = document.createElement('div');
    questDiv.className = 'tracked-quest';
    questDiv.dataset.questId = quest.id;
    
    // Check if quest is completed
    const isCompleted = quest.currentStepIndex >= quest.steps.length;
    if (isCompleted) {
      questDiv.classList.add('completed');
    }

    // Get current step
    const currentStep = quest.steps[quest.currentStepIndex];
    const questLevel = quest.level || '';
    const questCategory = quest.category || 'side';

    // Calculate overall progress
    const totalObjectives = quest.steps.reduce((total, step) => 
      total + (step.objectives ? step.objectives.length : 1), 0);
    const completedObjectives = quest.steps.slice(0, quest.currentStepIndex)
      .reduce((total, step) => total + (step.objectives ? step.objectives.length : 1), 0) +
      (currentStep?.objectives ? currentStep.objectives.filter(obj => obj.completed).length : 0);
    
    const progressPercent = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

    questDiv.innerHTML = `
      <div class="quest-name">
        ${quest.name}
        ${questLevel ? `<span class="quest-level">[${questLevel}]</span>` : ''}
      </div>
      <div class="quest-category ${questCategory}">${questCategory}</div>
      <div class="quest-objectives">
        ${this.renderObjectives(quest, currentStep)}
      </div>
      <div class="quest-progress">
        <div class="quest-progress-bar">
          <div class="quest-progress-fill ${isCompleted ? 'completed' : ''}" 
               style="width: ${progressPercent}%"></div>
        </div>
        <div class="quest-progress-text">${Math.round(progressPercent)}%</div>
      </div>
      ${this.renderQuestExtras(quest)}
    `;

    // Add click handler to open quest journal
    questDiv.addEventListener('click', () => {
      if (this.questSystem && this.questSystem.questJournal) {
        this.questSystem.questJournal.show();
        // Focus on this quest if possible
        if (typeof this.questSystem.questJournal.selectQuestById === 'function') {
          this.questSystem.questJournal.selectQuestById(quest.id);
        }
      }
    });

    // Animation for new quests
    setTimeout(() => {
      questDiv.classList.add('new');
      setTimeout(() => questDiv.classList.remove('new'), 500);
    }, index * 100);

    return questDiv;
  }

  renderObjectives(quest, currentStep) {
    if (!currentStep || !currentStep.objectives) {
      if (currentStep && currentStep.description) {
        return `<div class="quest-objective">${currentStep.description}</div>`;
      }
      return '';
    }

    return currentStep.objectives.map(objective => {
      const isCompleted = objective.completed;
      const current = objective.currentAmount || 0;
      const required = objective.requiredAmount || 1;
      
      let objectiveClass = 'quest-objective';
      if (isCompleted) objectiveClass += ' completed';
      if (objective.failed) objectiveClass += ' failed';

      let objectiveText = objective.description || 'Unknown objective';
      if (required > 1) {
        objectiveText += ` (${current}/${required})`;
      }

      return `<div class="${objectiveClass}">${objectiveText}</div>`;
    }).join('');
  }

  renderQuestExtras(quest) {
    let extras = '';
    
    // Add distance if available
    if (quest.distance && quest.distance > 0) {
      extras += `<div class="quest-distance">📍 ${Math.round(quest.distance)}m away</div>`;
    }
    
    // Add timer if quest has time limit
    if (quest.timeLimit && quest.timeRemaining) {
      const minutes = Math.floor(quest.timeRemaining / 60);
      const seconds = quest.timeRemaining % 60;
      extras += `<div class="quest-timer">⏰ ${minutes}:${seconds.toString().padStart(2, '0')}</div>`;
    }
    
    return extras;
  }

  // Quest event handlers
  onQuestAdded(quest) {
    console.log('📊 Quest added to tracker:', quest.name);
    this.trackedQuests.set(quest.id, quest);
    
    // Trigger new quest animation
    this.trackerElement.classList.add('new-quest');
    setTimeout(() => {
      this.trackerElement.classList.remove('new-quest');
    }, 600);
    
    // Update display
    this.updateQuests(Array.from(this.trackedQuests.values()));
  }

  onQuestUpdated(quest) {
    console.log('📊 Quest updated in tracker:', quest.name);
    this.trackedQuests.set(quest.id, quest);
    
    // Find and animate the updated quest
    const questElement = this.trackerElement.querySelector(`[data-quest-id="${quest.id}"]`);
    if (questElement) {
      questElement.classList.add('updated');
      setTimeout(() => {
        questElement.classList.remove('updated');
      }, 300);
    }
    
    // Update display
    this.updateQuests(Array.from(this.trackedQuests.values()));
  }

  onQuestCompleted(quest) {
    console.log('📊 Quest completed in tracker:', quest.name);
    
    // Trigger completion animation
    this.trackerElement.classList.add('quest-completed');
    setTimeout(() => {
      this.trackerElement.classList.remove('quest-completed');
    }, 1000);
    
    // Update quest in tracker
    this.trackedQuests.set(quest.id, quest);
    
    // Remove from tracker after a delay
    setTimeout(() => {
      this.trackedQuests.delete(quest.id);
      this.updateQuests(Array.from(this.trackedQuests.values()));
    }, 3000);
  }

  onQuestRemoved(questId) {
    console.log('📊 Quest removed from tracker:', questId);
    this.trackedQuests.delete(questId);
    this.updateQuests(Array.from(this.trackedQuests.values()));
  }

  // Public methods
  show() {
    this.isVisible = true;
    this.trackerElement.classList.remove('hidden');
  }

  hide() {
    this.isVisible = false;
    this.trackerElement.classList.add('hidden');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.trackerElement.classList.toggle('minimized', this.isMinimized);
    
    const minimizeBtn = this.trackerElement.querySelector('.minimize-btn');
    minimizeBtn.textContent = this.isMinimized ? '+' : '−';
    minimizeBtn.title = this.isMinimized ? 'Maximize' : 'Minimize';
  }

  setPosition(x, y) {
    this.trackerElement.style.left = `${x}px`;
    this.trackerElement.style.top = `${y}px`;
    this.trackerElement.style.right = 'auto';
    this.trackerElement.style.transform = 'none';
  }

  setMaxTrackedQuests(max) {
    this.maxTrackedQuests = max;
    this.updateQuests(Array.from(this.trackedQuests.values()));
  }

  // Integration methods
  connectToQuestSystem(questSystem) {
    this.questSystem = questSystem;
    
    // Listen for quest events if the quest system supports them
    if (questSystem.on) {
      questSystem.on('questAdded', (quest) => this.onQuestAdded(quest));
      questSystem.on('questUpdated', (quest) => this.onQuestUpdated(quest));
      questSystem.on('questCompleted', (quest) => this.onQuestCompleted(quest));
      questSystem.on('questRemoved', (questId) => this.onQuestRemoved(questId));
    }
  }

  // Update quest distance (for location-based objectives)
  updateQuestDistances(playerX, playerY) {
    this.trackedQuests.forEach(quest => {
      if (quest.targetLocation) {
        const dx = quest.targetLocation.x - playerX;
        const dy = quest.targetLocation.y - playerY;
        quest.distance = Math.sqrt(dx * dx + dy * dy);
      }
    });
    
    // Update display if distances changed significantly
    this.updateQuests(Array.from(this.trackedQuests.values()));
  }

  // Update quest timers
  updateQuestTimers() {
    let hasTimers = false;
    
    this.trackedQuests.forEach(quest => {
      if (quest.timeLimit && quest.timeRemaining > 0) {
        quest.timeRemaining--;
        hasTimers = true;
        
        if (quest.timeRemaining <= 0) {
          // Quest expired
          this.onQuestExpired(quest);
        }
      }
    });
    
    if (hasTimers) {
      this.updateQuests(Array.from(this.trackedQuests.values()));
    }
  }

  onQuestExpired(quest) {
    console.log('📊 Quest expired:', quest.name);
    // Mark quest as failed or handle expiration
    quest.expired = true;
    this.onQuestRemoved(quest.id);
  }

  // Save/load tracker state
  saveState() {
    const state = {
      isVisible: this.isVisible,
      isMinimized: this.isMinimized,
      maxTrackedQuests: this.maxTrackedQuests,
      position: {
        x: this.trackerElement.offsetLeft,
        y: this.trackerElement.offsetTop
      }
    };
    
    localStorage.setItem('quest_tracker_state', JSON.stringify(state));
  }

  loadState() {
    try {
      const savedState = localStorage.getItem('quest_tracker_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        
        if (state.isVisible !== undefined) {
          this.isVisible = state.isVisible;
          this.trackerElement.classList.toggle('hidden', !this.isVisible);
        }
        
        if (state.isMinimized !== undefined) {
          this.isMinimized = state.isMinimized;
          this.trackerElement.classList.toggle('minimized', this.isMinimized);
          const minimizeBtn = this.trackerElement.querySelector('.minimize-btn');
          minimizeBtn.textContent = this.isMinimized ? '+' : '−';
        }
        
        if (state.maxTrackedQuests) {
          this.maxTrackedQuests = state.maxTrackedQuests;
        }
        
        if (state.position) {
          this.setPosition(state.position.x, state.position.y);
        }
      }
    } catch (error) {
      console.warn('Failed to load quest tracker state:', error);
    }
  }

  destroy() {
    // Save state before destroying
    this.saveState();
    
    if (this.trackerElement && this.trackerElement.parentNode) {
      this.trackerElement.remove();
    }
    
    this.trackedQuests.clear();
    console.log('📊 Quest tracker destroyed');
  }
}
