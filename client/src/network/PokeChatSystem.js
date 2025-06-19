class PokeChatSystem {
  constructor(room, username) {
    this.room = room; // Colyseus room
    this.username = username; // Ton pseudo local
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.charCounter = document.getElementById('char-counter');
    this.typingIndicator = document.getElementById('typing-indicator');
    this.chatWindow = document.getElementById('chat-window');
    this.minimizeBtn = document.getElementById('minimize-btn');
    this.hideBtn = document.getElementById('hide-btn');
    this.chatToggle = document.getElementById('chat-toggle');
    this.onlineCount = document.getElementById('online-count');

    this.maxMessages = 50;
    this.messageHistory = [];
    this.isMinimized = false;
    this.isHidden = false;

    this.initListeners();
  }

  initListeners() {
    // Envoi du message au serveur Colyseus
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.chatInput.value.trim() && this.room) {
        const text = this.chatInput.value.trim();
        this.room.send('chat', {
          author: this.username,
          message: text
        });
        this.chatInput.value = '';
        this.charCounter.textContent = '200';
        this.charCounter.className = '';
      }
    });

    if (this.chatToggle) {
    this.chatToggle.addEventListener('click', () => {
      console.log('[CHAT] bulle cliquée');
      this.toggleHide();
    });
  }
    // Gestion du compteur de caractères
    this.chatInput.addEventListener('input', (e) => {
      const length = e.target.value.length;
      const remaining = 200 - length;
      this.charCounter.textContent = remaining;
      this.charCounter.className = '';
      if (remaining < 50) this.charCounter.classList.add('warning');
      if (remaining < 20) this.charCounter.classList.add('danger');
    });

    // Minimize/Hide
    if (this.minimizeBtn) {
      this.minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    }
    if (this.hideBtn) {
      this.hideBtn.addEventListener('click', () => this.toggleHide());
    }
    if (this.chatToggle) {
      this.chatToggle.addEventListener('click', () => this.toggleHide());
    }
  }

  // Ajoute un message stylé dans le chat
  addMessage(author, message, timestamp = null, type = 'normal') {
    const isMe = (author === this.username || author === "You");
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message new${type !== 'normal' ? ' ' + type : ''}`;

    let dateObj = timestamp ? new Date(timestamp) : new Date();
    // Format: 07:14 au lieu de 7:14
    const time = dateObj.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // For 24h format with leading zeros
    });

    // Construction du nom d'utilisateur + badge de niveau
    let userClass = "chat-username";
    let extraAttrs = "";
    if (isMe) {
      userClass += " level";
      extraAttrs = ' data-level="You"';
    }

    if (type === 'system') {
      msgDiv.innerHTML = `
        <span class="chat-text">${message}</span>
        <span class="chat-timestamp">${time}</span>
      `;
    } else {
      msgDiv.innerHTML = `
        <span class="${userClass}"${extraAttrs}>${isMe ? "You" : author}</span>
        <span class="chat-text">${message}</span>
        <span class="chat-timestamp">${time}</span>
      `;
    }

    this.chatMessages.appendChild(msgDiv);
    this.scrollToBottom();
    setTimeout(() => msgDiv.classList.remove('new'), 400);

    // Gère la limite de messages
    this.messageHistory.push(msgDiv);
    if (this.messageHistory.length > this.maxMessages) {
      const oldMsg = this.messageHistory.shift();
      oldMsg.classList.add('leaving');
      setTimeout(() => oldMsg.remove(), 300);
    }
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  // Optionnel: minimize/hide
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.chatWindow.classList.toggle('minimized', this.isMinimized);
    if (this.minimizeBtn)
      this.minimizeBtn.textContent = this.isMinimized ? '+' : '−';
    if (!this.isMinimized) setTimeout(() => this.chatInput.focus(), 100);
  }

  toggleHide() {
    this.isHidden = !this.isHidden;
    this.chatWindow.classList.toggle('hidden', this.isHidden);

    // Affiche/masque la bulle "chat-toggle"
    if (this.chatToggle) {
      if (this.isHidden) {
        this.chatToggle.classList.add('show');
      } else {
        this.chatToggle.classList.remove('show');
      }
    }

    // focus quand visible
    if (!this.isHidden) setTimeout(() => this.chatInput.focus(), 500);

    // Quand on montre le chat, on enlève le "minimized"
    if (!this.isHidden && this.isMinimized) {
      this.isMinimized = false;
      this.chatWindow.classList.remove('minimized');
      if (this.minimizeBtn)
        this.minimizeBtn.textContent = '−';
    }
  }
}

export default PokeChatSystem;
