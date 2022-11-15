"use strict";

function isEmpty(s) {
  return !s || s.trim().length === 0;
}

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
    if(isEmpty(username)) {
      return;
    }
    console.log("***SETUSERNAME");
    this.sendMessage('username', {name: username});
  }

  createRoom(room) {
    if(isEmpty(room)) {
      return;
    }
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

  toggleWarning(room) {
    console.log("***TOGGLEWARNING");
    this.sendMessage('togglewarning', {room});
  }

  logout() {
    console.log("***LOGOUT");
    this.connection.close();
  }
  
  addNewStories(text) {
    if(isEmpty(text)) {
      return;
    }
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

  addMinutesPerStory(room, minutes) {
    console.log("***ADDMINUTESPERSTORY");
    this.sendMessage('addminutesperstory', {room, minutes});
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
