// src/network/NetworkManager.js
import { Client } from "colyseus.js";
import { GAME_CONFIG } from "../config/gameConfig.js";

export class NetworkManager {
  constructor() {
    this.client = new Client(GAME_CONFIG.server.url);
    this.room = null;
    this.sessionId = null;
    this.isConnected = false;
    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onPlayerData: null,
      onDisconnect: null
    };
  }

  async connect() {
    try {
let username = localStorage.getItem('username');
if (!username) {
  username = prompt("Choisis un pseudo :");
  localStorage.setItem('username', username);
}

this.room = await this.client.joinOrCreate(GAME_CONFIG.server.roomName, {
  username: window.username
});
      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      
      console.log("🌍 Connected to PokeWorld! Session:", this.sessionId);
      
      // Setup event listeners
      this.room.onStateChange((state) => {
        if (this.callbacks.onStateChange) {
          this.callbacks.onStateChange(state);
        }
      });

      this.room.onMessage("playerData", (data) => {
        if (this.callbacks.onPlayerData) {
          this.callbacks.onPlayerData(data);
        }
      });

      this.room.onLeave(() => {
        this.isConnected = false;
        if (this.callbacks.onDisconnect) {
          this.callbacks.onDisconnect();
        }
      });

      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }

      return true;
    } catch (error) {
      console.error("❌ Connection error:", error);
      return false;
    }
  }

  sendMove(x, y) {
    if (this.isConnected && this.room) {
      this.room.send("move", { x, y });
    }
  }

  sendMessage(type, data) {
    if (this.isConnected && this.room) {
      this.room.send(type, data);
    }
  }

  onConnect(callback) {
    this.callbacks.onConnect = callback;
  }

  onStateChange(callback) {
    this.callbacks.onStateChange = callback;
  }

  onPlayerData(callback) {
    this.callbacks.onPlayerData = callback;
  }

  onDisconnect(callback) {
    this.callbacks.onDisconnect = callback;
  }

  disconnect() {
    if (this.room) {
      this.room.leave();
      this.isConnected = false;
    }
  }

  getSessionId() {
    return this.sessionId;
  }

  getPlayerState(sessionId) {
    if (this.room && this.room.state && this.room.state.players) {
      return this.room.state.players.get(sessionId);
    }
    return null;
  }
}