// client/src/components/PokemonBoxUI.js

export class PokemonBoxUI {
  constructor(options = {}) {
    this.container = null;
    this.overlay = null;
    this.options = options;
    this.isVisible = false;
    this.currentBox = 0;
    this.totalBoxes = options.totalBoxes || 12;
    this.boxData = []; // { boxNumber, pokemons: [...] }
    this.selectedPokemon = null;

    // Événement à bind pour fermeture, sélection, etc.
    this.onClose = options.onClose || (() => {});
    this.onTransfer = options.onTransfer || (() => {});
    this.onRequestBox = options.onRequestBox || (() => {});
    this.onInspect = options.onInspect || (() => {});
  }

  /**
   * Initialise l'UI et ajoute au DOM
   */
  mount(parent = document.body) {
    if (this.overlay) return;
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'team-overlay pokemon-box-overlay';
    this.overlay.innerHTML = this.template();
    parent.appendChild(this.overlay);

    // Récupérer les refs DOM
    this.container = this.overlay.querySelector('.pokemon-box-container');

    // Boutons de navigation
    this.overlay.querySelector('.box-prev-btn').onclick = () => this.changeBox(-1);
    this.overlay.querySelector('.box-next-btn').onclick = () => this.changeBox(1);
    this.overlay.querySelector('.pokemon-box-close-btn').onclick = () => this.hide();

    // Gestion des slots (déléguer les clics)
    this.overlay.querySelector('.pokemon-box-slots').onclick = e => {
      const slot = e.target.closest('.pokemon-box-slot');
      if (slot && slot.dataset.index) {
        const idx = Number(slot.dataset.index);
        this.selectPokemon(idx);
      }
    };

    // Fermer si clic overlay
    this.overlay.onclick = e => {
      if (e.target === this.overlay) this.hide();
    };

    // Première maj
    this.update();
  }

  /**
   * Set les données d'une box (appelé depuis Colyseus)
   */
  setBoxData(boxNumber, pokemons) {
    this.boxData[boxNumber] = pokemons;
    if (boxNumber === this.currentBox) this.renderSlots();
  }

  /**
   * Affiche la box
   */
  show(boxNumber = 0) {
    if (!this.overlay) this.mount();
    this.currentBox = boxNumber;
    this.overlay.classList.remove('hidden');
    this.isVisible = true;
    this.selectedPokemon = null;
    this.onRequestBox(this.currentBox); // Demande data box au serveur
    this.update();
  }

  /**
   * Masque la box
   */
  hide() {
    if (this.overlay) this.overlay.classList.add('hidden');
    this.isVisible = false;
    this.selectedPokemon = null;
    this.onClose();
  }

  /**
   * Change de box
   */
  changeBox(delta) {
    this.currentBox = (this.currentBox + delta + this.totalBoxes) % this.totalBoxes;
    this.selectedPokemon = null;
    this.onRequestBox(this.currentBox);
    this.update();
  }

  /**
   * Sélection d'un Pokémon dans la box
   */
  selectPokemon(idx) {
    const boxPokemons = this.boxData[this.currentBox] || [];
    this.selectedPokemon = boxPokemons[idx] || null;
    this.renderDetailPanel();
  }

  /**
   * Met à jour toute l'UI
   */
  update() {
    this.overlay.querySelector('.pokemon-box-title-num').textContent = `Box ${this.currentBox + 1}`;
    this.renderSlots();
    this.renderDetailPanel();
  }

  /**
   * Rendu des slots (30 par box)
   */
  renderSlots() {
    const grid = this.overlay.querySelector('.pokemon-box-slots');
    grid.innerHTML = '';
    const pokemons = this.boxData[this.currentBox] || [];
    for (let i = 0; i < 30; i++) {
      const poke = pokemons[i];
      const div = document.createElement('div');
      div.className = 'pokemon-box-slot' + (this.selectedPokemon && pokemons.indexOf(this.selectedPokemon) === i ? ' selected' : '');
      div.dataset.index = i;

      if (poke) {
        div.innerHTML = `
          <div class="box-poke-portrait">
            <img class="box-poke-img" src="${this.getSpriteUrl(poke)}" alt="${poke.name}">
          </div>
          <div class="box-poke-info">
            <div class="box-poke-name">${poke.name}</div>
            <div class="box-poke-level">Lv.${poke.level}</div>
            <div class="box-poke-type">
              ${(poke.types || []).map(t => `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`).join(' ')}
            </div>
          </div>
        `;
      } else {
        div.classList.add('empty-slot');
        div.innerHTML = `<span class="empty-icon">+</span>`;
      }
      grid.appendChild(div);
    }
  }

  /**
   * Rendu panneau détail à droite
   */
  renderDetailPanel() {
    const detail = this.overlay.querySelector('.pokemon-box-detail');
    if (!this.selectedPokemon) {
      detail.innerHTML = `<div class="empty-detail"><span>📦</span><div>Sélectionnez un Pokémon pour voir ses infos</div></div>`;
      return;
    }
    const poke = this.selectedPokemon;
    detail.innerHTML = `
      <div class="pokemon-detail-header">
        <div class="pokemon-detail-icon"><img class="pokemon-portrait" src="${this.getSpriteUrl(poke)}" alt=""></div>
        <div class="pokemon-detail-info">
          <h3>${poke.name} <span class="pokemon-gender">${this.getGenderSymbol(poke.gender)}</span></h3>
          <div class="pokemon-detail-subtitle">Niveau ${poke.level}</div>
          <div class="pokemon-detail-nature">Nature : ${poke.nature || '—'}</div>
          <div class="pokemon-types">
            ${(poke.types || []).map(t => `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`).join(' ')}
          </div>
        </div>
      </div>
      <div class="pokemon-stats-section">
        <div class="stats-grid">
          ${(poke.calculatedStats ? Object.entries(poke.calculatedStats).map(([stat, value]) =>
            `<div class="stat-row">
              <span class="stat-name">${stat.toUpperCase()}</span>
              <div class="stat-bar-container">
                <div class="stat-bar">
                  <div class="stat-fill" style="width:${Math.min(100, Math.round((value / 255) * 100))}%;background:${this.statColor(stat)};"></div>
                </div>
                <span class="stat-value">${value}</span>
              </div>
            </div>`).join('') : ''
          )}
        </div>
      </div>
      <div class="pokemon-moves-section">
        <h4>Capacités</h4>
        <div class="moves-list">
          ${(poke.moves ? poke.moves.map(move => `
            <div class="move-item">
              <div class="move-header">
                <span>${move.name}</span>
                <span class="move-pp">${move.pp}/${move.maxPp}</span>
              </div>
              <div class="move-pp-bar">
                <div class="move-pp-fill high" style="width:${Math.round((move.pp/move.maxPp)*100)}%;"></div>
              </div>
            </div>
          `).join('') : '<span class="no-move">Aucune capacité</span>')}
        </div>
      </div>
      <div class="pokemon-actions">
        <button class="detail-btn secondary" onclick="window.pokemonBoxUI.hide()">Fermer</button>
        <button class="detail-btn" onclick="window.pokemonBoxUI.transferSelectedPokemon()">Transférer</button>
      </div>
    `;
  }

  /**
   * Transfert le Pokémon sélectionné (vers team ou autre box)
   */
  transferSelectedPokemon() {
    if (!this.selectedPokemon) return;
    this.onTransfer(this.selectedPokemon, this.currentBox);
    // Option: désélectionne après
    this.selectedPokemon = null;
    this.renderDetailPanel();
  }

  /**
   * Génère la structure HTML principale de la box
   */
  template() {
    return `
      <div class="team-container pokemon-box-container">
        <div class="team-header pokemon-box-header">
          <div class="team-title">
            <span class="team-icon">📦</span>
            <span class="team-title-text">
              <span class="team-name pokemon-box-title-num">Box 1</span>
              <span class="team-subtitle">Stockez, échangez et gérez vos Pokémon</span>
            </span>
          </div>
          <div class="team-controls">
            <button class="team-btn box-prev-btn" title="Box précédente">←</button>
            <button class="team-btn box-next-btn" title="Box suivante">→</button>
            <button class="team-close-btn pokemon-box-close-btn" title="Fermer">&times;</button>
          </div>
        </div>
        <div class="team-content">
          <div class="team-slots-grid pokemon-box-slots"></div>
          <div class="team-detail-panel pokemon-box-detail"></div>
        </div>
      </div>
    `;
  }

  /**
   * Helpers pour les sprites
   */
  getSpriteUrl(poke) {
    // Si t'as un format custom, adapte ici !
    return poke.sprite || `/assets/pokemon/${String(poke.pokemonId).padStart(3,'0')}/front.png`;
  }
  statColor(stat) {
    // Simpliste : adapte selon le stat
    if (stat === "hp") return "#43ea64";
    if (stat === "attack" || stat === "spAttack") return "#e67e22";
    if (stat === "defense" || stat === "spDefense") return "#4a90e2";
    if (stat === "speed") return "#ffe066";
    return "#b6cae7";
  }
  getGenderSymbol(gender) {
    if (gender === 'male') return '♂️';
    if (gender === 'female') return '♀️';
    return '';
  }
}

// Pour accès facile dans la console/détail
window.pokemonBoxUI = new PokemonBoxUI();
