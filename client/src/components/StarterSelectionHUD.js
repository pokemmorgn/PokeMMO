// client/src/components/StarterSelectionHUD.js

export class StarterSelectionHUD {
  constructor(room) {
    this.hudElement = null;
    this.room = room;
    this.isVisible = false;
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    // Écouter les messages du serveur
    this.room.onMessage("showStarterSelection", (data) => {
      this.showStarterSelection(data);
    });

    this.room.onMessage("starterSelectionResult", (data) => {
      this.handleSelectionResult(data);
    });
  }

  showStarterSelection(data) {
    console.log("🎮 Affichage du HUD de sélection de starter");
    
    if (this.isVisible) {
      this.hide();
    }

    // Créer le HUD
    this.hudElement = this.createStarterHUD(data);
    document.body.appendChild(this.hudElement);
    this.isVisible = true;

    // Désactiver les contrôles du joueur pendant la sélection
    this.disablePlayerControls();
  }

  createStarterHUD(data) {
    const hudContainer = document.createElement('div');
    hudContainer.id = 'starter-selection-hud';
    hudContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      font-family: 'Orbitron', 'Arial', sans-serif;
    `;

    const selectionPanel = document.createElement('div');
    selectionPanel.style.cssText = `
      background: linear-gradient(135deg, #4a90e2, #7b68ee);
      border: 4px solid #ffd700;
      border-radius: 20px;
      padding: 30px;
      max-width: 800px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      color: white;
    `;

    // Titre et message
    const title = document.createElement('h1');
    title.textContent = 'Choisissez votre Pokémon !';
    title.style.cssText = `
      color: #ffd700;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      margin-bottom: 10px;
      font-size: 2.5em;
    `;

    const message = document.createElement('p');
    message.textContent = data.message || 'Choisissez votre premier compagnon :';
    message.style.cssText = `
      font-size: 1.3em;
      margin-bottom: 30px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
    `;

    // Container des starters
    const startersContainer = document.createElement('div');
    startersContainer.style.cssText = `
      display: flex;
      justify-content: space-around;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    `;

    // Créer les cartes des starters
    data.starters.forEach((starter) => {
      const starterCard = this.createStarterCard(starter);
      startersContainer.appendChild(starterCard);
    });

    selectionPanel.appendChild(title);
    selectionPanel.appendChild(message);
    selectionPanel.appendChild(startersContainer);
    hudContainer.appendChild(selectionPanel);

    return hudContainer;
  }

  createStarterCard(starter) {
    const card = document.createElement('div');
    card.className = 'starter-card';
    card.style.cssText = `
      background: white;
      border: 3px solid #ddd;
      border-radius: 15px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: #333;
      min-width: 200px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    `;

    // Image du Pokémon
    const image = document.createElement('img');
    image.src = starter.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${starter.id}.png`;
    image.alt = starter.name;
    image.style.cssText = `
      width: 120px;
      height: 120px;
      image-rendering: pixelated;
      margin-bottom: 15px;
    `;

    // Nom
    const name = document.createElement('h3');
    name.textContent = starter.name;
    name.style.cssText = `
      color: #2c5aa0;
      margin: 10px 0;
      font-size: 1.5em;
    `;

    // Types
    const typesContainer = document.createElement('div');
    typesContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 5px;
      margin: 10px 0;
    `;

    starter.types.forEach((type) => {
      const typeSpan = document.createElement('span');
      typeSpan.textContent = type;
      typeSpan.style.cssText = `
        background: ${this.getTypeColor(type)};
        color: white;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: bold;
      `;
      typesContainer.appendChild(typeSpan);
    });

    // Description
    const description = document.createElement('p');
    description.textContent = starter.description;
    description.style.cssText = `
      font-size: 0.9em;
      color: #666;
      margin: 15px 0;
      line-height: 1.4;
    `;

    // Bouton de sélection
    const selectButton = document.createElement('button');
    selectButton.textContent = 'Choisir !';
    selectButton.style.cssText = `
      background: linear-gradient(45deg, #ff6b6b, #ee5a24);
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 25px;
      font-weight: bold;
      cursor: pointer;
      font-size: 1.1em;
      transition: all 0.3s ease;
      box-shadow: 0 3px 10px rgba(238, 90, 36, 0.3);
    `;

    // Événements
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-10px) scale(1.05)';
      card.style.borderColor = '#4a90e2';
      card.style.boxShadow = '0 10px 25px rgba(74, 144, 226, 0.3)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
      card.style.borderColor = '#ddd';
      card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
    });

    selectButton.addEventListener('mouseenter', () => {
      selectButton.style.transform = 'scale(1.1)';
      selectButton.style.boxShadow = '0 5px 15px rgba(238, 90, 36, 0.5)';
    });

    selectButton.addEventListener('mouseleave', () => {
      selectButton.style.transform = 'scale(1)';
      selectButton.style.boxShadow = '0 3px 10px rgba(238, 90, 36, 0.3)';
    });

    selectButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectStarter(starter.id);
    });

    card.appendChild(image);
    card.appendChild(name);
    card.appendChild(typesContainer);
    card.appendChild(description);
    card.appendChild(selectButton);

    return card;
  }

  getTypeColor(type) {
    const typeColors = {
      'Fire': '#ff6b6b',
      'Water': '#4dabf7',
      'Grass': '#51cf66',
      'Poison': '#9775fa',
      'Electric': '#ffd43b',
      'Normal': '#868e96'
    };
    return typeColors[type] || '#868e96';
  }

  selectStarter(starterId) {
    console.log(`🎯 Sélection du starter ${starterId}`);
    
    // Désactiver tous les boutons pour éviter les clics multiples
    const buttons = this.hudElement?.querySelectorAll('button');
    if (buttons) {
      buttons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.5';
      });
    }

    // Envoyer la sélection au serveur
    this.room.send("selectStarter", { starterId });
  }

  handleSelectionResult(data) {
    console.log("📨 Résultat de la sélection:", data);

    if (data.success) {
      // Afficher un message de succès
      this.showSuccessMessage(data);
      
      // Masquer le HUD après un délai
      setTimeout(() => {
        this.hide();
        this.enablePlayerControls();
      }, 3000);
    } else {
      // Afficher l'erreur et permettre de refaire la sélection
      this.showErrorMessage(data.message);
      
      // Réactiver les boutons
      const buttons = this.hudElement?.querySelectorAll('button');
      if (buttons) {
        buttons.forEach(button => {
          button.disabled = false;
          button.style.opacity = '1';
        });
      }
    }
  }

  showSuccessMessage(data) {
    if (!this.hudElement) return;

    const successDiv = document.createElement('div');
    successDiv.className = 'starter-success-message';
    successDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 200, 0, 0.95);
      color: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      font-size: 1.5em;
      font-weight: bold;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;

    successDiv.innerHTML = `
      <h2>🎉 ${data.message}</h2>
      <p>Votre aventure commence maintenant !</p>
    `;

    this.hudElement.appendChild(successDiv);
  }

  showErrorMessage(message) {
    // Version simple avec alert - vous pouvez améliorer avec un joli popup
    alert(message);
  }

  disablePlayerControls() {
    // Désactiver les contrôles du jeu pendant la sélection
    document.body.style.pointerEvents = 'none';
    if (this.hudElement) {
      this.hudElement.style.pointerEvents = 'auto';
    }
  }

  enablePlayerControls() {
    // Réactiver les contrôles du jeu
    document.body.style.pointerEvents = 'auto';
  }

  hide() {
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
      this.hudElement = null;
      this.isVisible = false;
    }
  }

  show() {
    // Méthode pour réafficher le HUD manuellement (optionnel)
    this.room.send("requestStarterSelection");
  }
}
