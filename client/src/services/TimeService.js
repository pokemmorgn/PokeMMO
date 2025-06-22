// TimeService.js
class TimeService {
  constructor() {
    this.listeners = [];
    this.room = null;
  }

  static getInstance() {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }

  connectToRoom(room) {
    this.room = room;
    
    room.state.onChange = () => {
      this.notifyListeners(room.state.gameHour, room.state.isDayTime);
    };
    
    // État initial
    this.notifyListeners(room.state.gameHour, room.state.isDayTime);
  }

  notifyListeners(hour, isDayTime) {
    this.listeners.forEach(callback => callback(hour, isDayTime));
  }

  onTimeChange(callback) {
    this.listeners.push(callback);
  }

  getCurrentTime() {
    return this.room ? {
      hour: this.room.state.gameHour,
      isDayTime: this.room.state.isDayTime
    } : { hour: 12, isDayTime: true };
  }
}

export { TimeService };
