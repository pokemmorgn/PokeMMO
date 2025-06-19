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
    this.isChatFocused = false; // NOUVEAU: pour gérer le focus

    this.initListeners();
    this.createKeyboardHint(); // Crée l'élément de hint
    console.log('[CHAT] PokeChatSystem initialized');
  }

  // Crée l'élément pour afficher les raccourcis clavier
  createKeyboardHint() {
    this.keyboardHint = document.createElement('div');
    this.keyboardHint.className = 'keyboard-hint';
    this.keyboardHint.innerHTML = `
      <kbd>T</kbd> Open chat • <kbd>ESC</kbd> Close chat • <kbd>Enter</kbd> Send message
    `;
    document.body.appendChild(this.keyboardHint);
  }

  initListeners() {
    // =========================
    // GESTION DU FOCUS CHAT/JEU
    // =========================
    
    // Quand on clique dans le chat input, on active le mode chat
    this.chatInput.addEventListener('focus', () => {
      this.isChatFocused = true;
      this.chatInput.classList.add('chat-focused');
      this.chatWindow.classList.add('chat-active');
      this.showKeyboardHint();
      console.log('[CHAT] Chat focused - Game input disabled');
    });

    // Quand on quitte le chat input, on réactive le jeu
    this.chatInput.addEventListener('blur', () => {
      this.isChatFocused = false;
      this.chatInput.classList.remove('chat-focused');
      this.chatWindow.classList.remove('chat-active');
      this.hideKeyboardHint();
      console.log('[CHAT] Chat unfocused - Game input enabled');
    });

    // Empêche les touches du jeu quand on tape dans le chat
    this.chatInput.addEventListener('keydown', (e) => {
      // Empêche la propagation vers Phaser pour toutes les touches sauf certaines
      e.stopPropagation();
      
      if (e.key === 'Enter') {
        if (this.chatInput.value.trim() && this.room) {
          const text = this.chatInput.value.trim();
          this.room.send('chat', {
            author: this.username,
            message: text
          });
          this.chatInput.value = '';
          this.charCounter.textContent = '200';
          this.charCounter.className = '';
        }
        // Retire le focus du chat après envoi
        this.chatInput.blur();
        e.preventDefault();
      }
      
      if (e.key === 'Escape') {
        // Escape pour sortir du chat
        this.chatInput.blur();
        e.preventDefault();
      }
    });

    // Empêche aussi les keyup dans le chat
    this.chatInput.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });

    // =========================
    // RACCOURCI POUR OUVRIR LE CHAT
    // =========================
    
    // Écoute globale pour ouvrir le chat avec 'T' ou 'Enter'
    document.addEventListener('keydown', (e) => {
      // Si le chat est déjà focus, on ne fait rien
      if (this.isChatFocused) return;
      
      // Si on appuie sur T ou Enter, on ouvre le chat
      if ((e.key === 't' || e.key === 'T' || e.key === 'Enter') && !this.isHidden) {
        e.preventDefault();
        e.stopPropagation();
        this.openChat();
      }
    });

    // Gestion du compteur de caractères
    this.chatInput.addEventListener('input', (e) => {
      const length = e.target.value.length;
      const remaining = 200 - length;
      this.charCounter.textContent = remaining;
      this.charCounter.className = '';
      if (remaining < 50) this.charCounter.classList.add('warning');
      if (remaining < 20) this.charCounter.classList.add('danger');
    });

    // Minimize/Hide buttons
    if (this.minimizeBtn) {
      this.minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimize();
      });
    }
    
    if (this.hideBtn) {
      this.hideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleHide();
      });
    }

    // Toggle button (la bulle qui apparaît quand le chat est caché)
    if (this.chatToggle) {
      this.chatToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[CHAT] Toggle button clicked');
        this.toggleHide();
      });
    }

    // Clic sur le header pour minimize/deminimize (seulement si minimized)
    if (this.chatWindow) {
      const chatHeader = this.chatWindow.querySelector('#chat-header');
      if (chatHeader) {
        chatHeader.addEventListener('click', (e) => {
          // On ne toggle que si le chat est minimized
          if (this.isMinimized) {
            e.stopPropagation();
            this.toggleMinimize();
          }
        });
      }
    }

    console.log('[CHAT] Event listeners initialized');
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

  // Toggle minimize/deminimize
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.chatWindow.classList.toggle('minimized', this.isMinimized);
    
    if (this.minimizeBtn) {
      this.minimizeBtn.textContent = this.isMinimized ? '+' : '−';
    }
    
    if (!this.isMinimized) {
      setTimeout(() => this.chatInput.focus(), 100);
    }
    
    console.log('[CHAT] Minimized:', this.isMinimized);
  }

  // Toggle hide/show
  toggleHide() {
    this.isHidden = !this.isHidden;
    this.chatWindow.classList.toggle('hidden', this.isHidden);

    // Affiche/masque la bulle "chat-toggle"
    if (this.chatToggle) {
      if (this.isHidden) {
        this.chatToggle.classList.add('show');
        console.log('[CHAT] Chat hidden, toggle button shown');
      } else {
        this.chatToggle.classList.remove('show');
        console.log('[CHAT] Chat shown, toggle button hidden');
      }
    }

    // Focus quand visible
    if (!this.isHidden) {
      setTimeout(() => {
        if (this.chatInput) {
          this.chatInput.focus();
        }
      }, 500);
    }

    // Quand on montre le chat, on enlève le "minimized"
    if (!this.isHidden && this.isMinimized) {
      this.isMinimized = false;
      this.chatWindow.classList.remove('minimized');
      if (this.minimizeBtn) {
        this.minimizeBtn.textContent = '−';
      }
    }
    
    console.log('[CHAT] Hidden:', this.isHidden);
  }

  // =========================
  // MÉTHODES POUR GÉRER LE FOCUS
  // =========================
  
  // Ouvre le chat et donne le focus
  openChat() {
    if (this.isHidden) {
      this.toggleHide();
    }
    if (this.isMinimized) {
      this.toggleMinimize();
    }
    
    setTimeout(() => {
      this.chatInput.focus();
      this.chatInput.select(); // Sélectionne le texte s'il y en a
    }, 100);
    
    console.log('[CHAT] Chat opened and focused');
  }

  // Ferme le chat et retire le focus
  closeChat() {
    this.chatInput.blur();
    console.log('[CHAT] Chat closed and unfocused');
  }

  // Vérifie si le chat a le focus
  hasFocus() {
    return this.isChatFocused;
  }

  // Affiche le hint des raccourcis clavier
  showKeyboardHint() {
    if (this.keyboardHint) {
      this.keyboardHint.classList.add('show');
    }
  }

  // Cache le hint des raccourcis clavier
  hideKeyboardHint() {
    if (this.keyboardHint) {
      this.keyboardHint.classList.remove('show');
    }
  }
}

export default PokeChatSystem;
