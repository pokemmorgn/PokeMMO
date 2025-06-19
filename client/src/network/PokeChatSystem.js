export function initPokeChat(room, username) {
  window.pokeChat = new PokeChatSystem(room, username);

  // Réception des messages du serveur
  room.onMessage("chat", data => {
    window.pokeChat.addMessage(
      data.author,
      data.message,
      data.timestamp,
      data.type || "normal"
    );
  });
  
  // Réception du nombre de joueurs en ligne (vrai nombre live !)
  room.onMessage("onlineCount", data => {
    window.pokeChat.onlineCount.textContent = `🟢 ${data.count} online`;
  });
  
  // ======== MESSAGES AUTOMATIQUES (simulateActivity) ========
  window.pokeChat.addMessage('System', '🎮 Welcome to PokeWorld! Press T to test NPC dialogue.', null, 'system');
  window.pokeChat.addMessage('KantoTrainer', 'Anyone up for a battle? <span class="pokemon-emoji">⚡</span>', null, 'normal');

  setTimeout(() => {
    window.pokeChat.addMessage('System', '🎉 Daily tournament starting in 10 minutes!', null, 'system');
  }, 15000);

  setTimeout(() => {
    window.pokeChat.addMessage('Professor_Oak', 'Welcome to the world of Pokémon! 🌟', null, 'normal');
  }, 3000);

  setTimeout(() => {
    window.pokeChat.addMessage('Nurse_Joy', 'Don\'t forget to heal your Pokémon regularly! 💊', null, 'normal');
  }, 8000);

  setInterval(() => {
    if (!window.pokeChat) return;
    const tips = [
      "Tip: You can use Ctrl+M to minimize the chat.",
      "Tip: Trade safely, only with trusted players!",
      "Tip: Press T to open a dialogue with Professor Oak."
    ];
    const msg = tips[Math.floor(Math.random() * tips.length)];
    window.pokeChat.addMessage("System", msg, null, "system");
  }, 60000);

  return window.pokeChat;
}

// ======================
// Classe PokeChatSystem
// ======================

class PokeChatSystem {
  constructor(room, username) {
    this.room = room;
    this.username = username;
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
    this.isChatFocused = false;

    this.initListeners();
    this.createKeyboardHint();
    console.log('[CHAT] PokeChatSystem initialized');
  }

  createKeyboardHint() {
    this.keyboardHint = document.createElement('div');
    this.keyboardHint.className = 'keyboard-hint';
    this.keyboardHint.innerHTML = `
      <kbd>T</kbd> Open chat • <kbd>ESC</kbd> Close chat • <kbd>Enter</kbd> Send message
    `;
    document.body.appendChild(this.keyboardHint);
  }

  initListeners() {
    this.chatInput.addEventListener('focus', () => {
      this.isChatFocused = true;
      this.chatInput.classList.add('chat-focused');
      this.chatWindow.classList.add('chat-active');
      this.showKeyboardHint();
      console.log('[CHAT] Chat focused - Game input disabled');
    });

    this.chatInput.addEventListener('blur', () => {
      this.isChatFocused = false;
      this.chatInput.classList.remove('chat-focused');
      this.chatWindow.classList.remove('chat-active');
      this.hideKeyboardHint();
      console.log('[CHAT] Chat unfocused - Game input enabled');
    });

    this.chatInput.addEventListener('keydown', (e) => {
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
        this.chatInput.blur();
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        this.chatInput.blur();
        e.preventDefault();
      }
    });

    this.chatInput.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
      if (this.isChatFocused) return;

      if ((e.key === 't' || e.key === 'T' || e.key === 'Enter') && !this.isHidden) {
        e.preventDefault();
        e.stopPropagation();
        this.openChat();
      }
    });

    this.chatInput.addEventListener('input', (e) => {
      const length = e.target.value.length;
      const remaining = 200 - length;
      this.charCounter.textContent = remaining;
      this.charCounter.className = '';
      if (remaining < 50) this.charCounter.classList.add('warning');
      if (remaining < 20) this.charCounter.classList.add('danger');
    });

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

    if (this.chatToggle) {
      this.chatToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[CHAT] Toggle button clicked');
        this.toggleHide();
      });
    }

    if (this.chatWindow) {
      const chatHeader = this.chatWindow.querySelector('#chat-header');
      if (chatHeader) {
        chatHeader.addEventListener('click', (e) => {
          if (this.isMinimized) {
            e.stopPropagation();
            this.toggleMinimize();
          }
        });
      }
    }

    console.log('[CHAT] Event listeners initialized');
  }

  addMessage(author, message, timestamp = null, type = 'normal') {
    const isMe = (author === this.username || author === "You");
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message new${type !== 'normal' ? ' ' + type : ''}`;

    let dateObj = timestamp ? new Date(timestamp) : new Date();
    const time = dateObj.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

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

  toggleHide() {
    this.isHidden = !this.isHidden;
    this.chatWindow.classList.toggle('hidden', this.isHidden);

    if (this.chatToggle) {
      if (this.isHidden) {
        this.chatToggle.classList.add('show');
        console.log('[CHAT] Chat hidden, toggle button shown');
      } else {
        this.chatToggle.classList.remove('show');
        console.log('[CHAT] Chat shown, toggle button hidden');
      }
    }

    if (!this.isHidden) {
      setTimeout(() => {
        if (this.chatInput) {
          this.chatInput.focus();
        }
      }, 500);
    }

    if (!this.isHidden && this.isMinimized) {
      this.isMinimized = false;
      this.chatWindow.classList.remove('minimized');
      if (this.minimizeBtn) {
        this.minimizeBtn.textContent = '−';
      }
    }

    console.log('[CHAT] Hidden:', this.isHidden);
  }

  openChat() {
    if (this.isHidden) {
      this.toggleHide();
    }
    if (this.isMinimized) {
      this.toggleMinimize();
    }

    setTimeout(() => {
      this.chatInput.focus();
      this.chatInput.select();
    }, 100);

    console.log('[CHAT] Chat opened and focused');
  }

  closeChat() {
    this.chatInput.blur();
    console.log('[CHAT] Chat closed and unfocused');
  }

  hasFocus() {
    return this.isChatFocused;
  }

  showKeyboardHint() {
    if (this.keyboardHint) {
      this.keyboardHint.classList.add('show');
    }
  }

  hideKeyboardHint() {
    if (this.keyboardHint) {
      this.keyboardHint.classList.remove('show');
    }
  }
}
