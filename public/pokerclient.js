"use strict";
const USERNAME_TOKEN = 'agi-poker.username';
const NULL_ROOM = {
  players: [],
  stories: [],
  subs: []
};

function copyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.style.position = 'absolute';
  ta.style.top = '0px';
  ta.style.left = '-9999px';
  ta.value = text;
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
  }
  finally {
    document.body.removeChild(ta);
  }
}

function connect() {
  if (service.connection) {
    service.setUsername(vm.username());
    return;
  }

  var serverUrl;
  var scheme = "ws";

  // If this is an HTTPS connection, we have to use a secure WebSocket
  // connection too, so add another "s" to the scheme.

  if (document.location.protocol === "https:") {
    scheme += "s";
  }

  serverUrl = scheme + "://" + document.location.hostname + ":6502";

  service.connection = new WebSocket(serverUrl, "json");
  console.log("***CREATED WEBSOCKET");

  service.connection.onopen = function(evt) {
    console.log("***ONOPEN");
  };
  console.log("***CREATED ONOPEN");

  service.connection.onmessage = function(evt) {
    console.log("***ONMESSAGE");
    var msg = JSON.parse(evt.data);
    console.log("Message received: ");
    console.dir(msg);

    switch(msg.type) {
      case "loggedout":
        vm.currentPage('loginPage');
        vm.loginButtonEnabled(true);
        service.connection = null;
        service.clientID = 0;
        vm.currentRoomName = null;
        vm.currentRoom = NULL_ROOM;
        break;
      case "id":
        service.clientID = msg.id;
        service.setUsername(vm.username());
        break;
      case "acceptusername":
        vm.loginMessage('');
        vm.loginButtonEnabled(false);
        vm.currentPage('lobbyPage');
        localStorage.setItem(USERNAME_TOKEN, vm.username());
        break;
      case "rejectusername":
        vm.usernameFocus(true);
        vm.loginMessage('<b>The username <em>" + msg.name + "</em> is already in use. Please provide another username and login again.</b><br>');
        break;
      case "acceptroomname":
        vm.roomName('');
        vm.lobbyMessage('');
        break;
      case "rejectroomname":
        vm.roomNameFocus(true);
        vm.lobbyMessage('<b>The room name <em>" + msg.name + "</em> is already in use. Please provide another name and try again.</b><br>');
        break;
      case "roomlist":
        vm.lobbyRooms(msg.rooms);
        break;
      case "roomexited":
        if (msg.room === vm.currentRoomName) {
          vm.currentPage('lobbyPage');
          vm.currentRoomName = null;
          vm.currentRoom = NULL_ROOM;
        }
        break;
      case "roomentered":
        vm.currentRoomName = msg.room;
        vm.currentPage('roomPage');
        break;
      case "exportedstories":
        copyToClipboard(msg.text);
        break;
      case "roomstate":
        if (msg.room === vm.currentRoomName) {
          vm.currentRoom = msg;
          if(vm.currentStoryID) {
            document.getElementById('story_' + vm.currentStoryID).scrollIntoView();
          }
        }
        break;
    }
  };
  console.log("***CREATED ONMESSAGE");
}

const service = new PokerService(connect);
const vm = new PokerViewModel(NULL_ROOM, service);
service.viewModel = vm;

window.onload = () => {
  vm.usernameFocus(true);
  const oldUserName = localStorage.getItem(USERNAME_TOKEN);
  if(oldUserName) {
    vm.username(oldUserName);
  }
  ko.applyBindings(vm, document.body);
  document.body.onunload = () => {
    service.logout();
  };
};
