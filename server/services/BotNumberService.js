class BotNumberService {
  constructor() {
    this.botNumber = null;
    this.idClient = null;
    this.phoneNumberClient = null;
  }

  setBotNumber(number) {
    this.botNumber = number;
  }

  getBotNumber() {
    return this.botNumber;
  }

  setIdClient(id) {
    this.idClient = id;
  }

  getIdClient() {
    return this.idClient;
  }

  setPhoneNumberClient(phone) {
    this.phoneNumberClient = phone;
  }

  getPhoneNumberClient() {
    return this.phoneNumberClient;
  }
}

module.exports = new BotNumberService();
