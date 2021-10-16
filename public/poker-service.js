"use strict";

class PokerService {
  constructor(connect) {
    this.connect = connect;
    this._clientID = 0;
    this._connection = null;
  }

  set connection(c) { this._connection = c; }
  get connection() { return this._connection; }
  set viewModel(vm) { this.vm = vm; }
  set clientID(id) { this._clientID = id; }
  get clientID() { return this._clientID; }

  sendMessage(type, msg = {}) {
    if (!this.connection) {
      return;
    }
    msg = Object.assign({
      type,
      date: Date.now(),
      id: this.clientID,
      room: this.vm.currentRoomName,
      story: this.vm.currentStoryID,
    }, msg);
    this.connection.send(JSON.stringify(msg));
  }
  
  setUsername(username) {
    console.log("***SETUSERNAME");
    this.sendMessage('username', {name: username});
  }

  createRoom(room) {
    console.log("***CREATEROOM");
    this.sendMessage('newroom',{room});
  }
  
  deleteRoom(room) {
    console.log("***DELETEROOM");
    this.sendMessage('deleteroom', {room});
  }
    
  joinRoom(room) {
    console.log("***JOINROOM");
    this.sendMessage('joinroom', {room});
  }
  
  backToLobby(room) {
    console.log("***BACKTOLOBBY");
    this.sendMessage('exitroom', {room});
  }

  logout() {
    console.log("***LOGOUT");
    this.sendMessage('logout');
  }
  
  addNewStories(text) {
    console.log("***ADDNEWSTORIES");
    this.sendMessage('addstories',{text});
  }
  
  exportStories() {
    console.log("***EXPORTSTORIES");
    this.sendMessage('exportstories');
  }

  selectStory(story) {
    console.log("***SELECTSTORY");
    this.sendMessage('selectstory', {story});
  }

  playCard(card) {
    console.log("***PLAYCARD");
    this.sendMessage('playcard', {card});
  }

  deleteStory(story) {
    console.log("***DELETESTORY");
    this.sendMessage('deletestory', {story});
  }
    
  replayStory(story) {
    console.log("***REPLAYSTORY");
    this.sendMessage('replaystory', {story});
  }
  
  showCards(story) {
    console.log("***SHOWCARDS");
    this.sendMessage('showcards', {story});
  }

  updateStoryResult(story, result) {
    console.log("***UPDATESTORYRESULT");
    this.sendMessage('updatestoryresult', {result, story});
  }
}
