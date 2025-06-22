/**
 * Fonction utilitaire pour accéder au joueur dans le state Colyseus, quel que soit le format (Map ou Object)
 * @param {Map|Object} players - Le state .players de Colyseus
 * @param {string} sessionId - L'id du joueur à récupérer
 * @returns {Object|null}
 */
export function getPlayerFromState(players, sessionId) {
  if (!players || !sessionId) return null;
  if (typeof players.get === "function") {
    // Cas Map (serveur Colyseus, ou state reçu via socket)
    return players.get(sessionId) || null;
  }
  // Cas objet classique (JSON)
  return players[sessionId] || null;
}
