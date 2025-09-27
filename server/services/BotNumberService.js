class BotNumberService {
  constructor() {
    this.botNumber = null;
  }

  setBotNumber(number) {
    this.botNumber = number;
  }

  getBotNumber() {
    return this.botNumber;
  }
}

module.exports = new BotNumberService();
