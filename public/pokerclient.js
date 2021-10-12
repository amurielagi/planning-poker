"use strict";
var connection = null;
var username = null;
var clientID = 0;
var currentRoom = null;
var currentStory = null;
var cardsShown = false;
const CARD_VALUE = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];
const CARD_DISPLAY =["0","&half;","1","2","3","5","8","13","20","40","100","&infin;","?"];
const USERNAME_TOKEN = 'agi-poker.username';

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

function sendMessage(msg) {
  connection.send(JSON.stringify(msg));
}

function setUsername() {
  console.log("***SETUSERNAME");
  sendMessage({
    name: document.getElementById("name").value,
    date: Date.now(),
    id: clientID,
    type: "username"
  });
}

function createRoom() {
  console.log("***CREATEROOM");
  sendMessage({
    name: document.getElementById("roomName").value,
    date: Date.now(),
    id: clientID,
    type: "newroom"
  });
}

function deleteRoom(room) {
  const answer = window.confirm(`Are you sure you want to delete room ${room}?`);
  if(!answer) {
    return;
  }
  console.log("***DELETEROOM");
  sendMessage({
    room,
    date: Date.now(),
    id: clientID,
    type: "deleteroom"
  });
}

function joinRoom(room) {
  console.log("***CREATEROOM");
  sendMessage({
    room,
    date: Date.now(),
    id: clientID,
    type: "joinroom"
  });
}

function backToLobby() {
  console.log("***BACKTOLOBBY");
  sendMessage({
    room: currentRoom,
    date: Date.now(),
    id: clientID,
    type: "exitroom"
  });
}

function logoutIfUserConfirms() {
  const answer = window.confirm('Are you sure you want to log out?');
  if(answer) {
    logout();
  }
}

function logout() {
  console.log("***LOGOUT");
  sendMessage({
    date: Date.now(),
    id: clientID,
    type: "logout"
  });
}

function addNewStories() {
  console.log("***ADDNEWSTORIES");
  const storiesDiv = document.getElementById("roomNewStories");
  sendMessage({
    text: storiesDiv.value,
    room: currentRoom,
    date: Date.now(),
    id: clientID,
    type: "addstories"
  });
  storiesDiv.value = '';
}

function selectStory(storyID) {
  console.log("***SELECTSTORY");
  sendMessage({
    room: currentRoom,
    story: storyID,
    date: Date.now(),
    id: clientID,
    type: "selectstory"
  });
}

function exportStories() {
  console.log("***EXPORTSTORIES");
  sendMessage({
    room: currentRoom,
    date: Date.now(),
    id: clientID,
    type: "exportstories"
  });
}

function clearCards() {
  const cards = [...document.getElementById('cards').children];
  cards.forEach(c => {
    c.className = '';
  });
}

function updateCard(cardIndex) {
  clearCards();
  if (cardIndex != null) {
    document.getElementById('card' + cardIndex).className = 'active';
  }
}

function playCard(cardElement) {
  if(!currentStory || cardsShown) {
    return;
  }
  const card = cardElement.className === 'active' ? null : parseInt(cardElement.id.substring(4));
  sendMessage({
    card,
    room: currentRoom,
    story: currentStory,
    date: Date.now(),
    id: clientID,
    type: "playcard"
  });
  updateCard(card);
}

function deleteStory(storyID) {
  const answer = window.confirm('Are you sure you want to delete this story?');
  if(!answer) {
    return;
  }
  console.log("***DELETESTORY");
  sendMessage({
    room: currentRoom,
    story: storyID,
    date: Date.now(),
    id: clientID,
    type: "deletestory"
  });
}

function replayStory(storyID) {
  console.log("***REPLAYSTORY");
  sendMessage({
    room: currentRoom,
    story: storyID,
    date: Date.now(),
    id: clientID,
    type: "replaystory"
  });
}

function showCards(storyID) {
  console.log("***REPLAYSTORY");
  sendMessage({
    room: currentRoom,
    story: storyID,
    date: Date.now(),
    id: clientID,
    type: "showcards"
  });
}

function updateStoryResult(storyID, result) {

  console.log("***UPDATESTORYRESULT");
  sendMessage({
    result,
    room: currentRoom,
    story: storyID,
    date: Date.now(),
    id: clientID,
    type: "updatestoryresult"
  });
}

function updatePlayerVotes(players, stories) {
  const playerVotes = document.getElementById('playerVotes');
  playerVotes.innerHTML = '';
  players.sort().forEach(player => {
    const tr = document.createElement('tr');
    let td = document.createElement('td');
    td.className = 'room-player';

    td.innerText = player;
    tr.appendChild(td);

    td = document.createElement('td');
    td.className = 'player-vote';
    if(currentStory) {
      const story = stories.find(s => s.storyID === currentStory);
      const card = CARD_DISPLAY[story.votes[player]];
      td.innerHTML = card ? (story.cardsShown? card : '*') : '';
    }
    tr.appendChild(td);
    playerVotes.appendChild(tr);
  });
}

function updateStories(stories) {
  const roomStories = document.getElementById('roomStories');
  roomStories.innerHTML = '';
  stories.forEach(s => {
    const caption = document.createElement('div');
    caption.innerText = s.text;

    const vote = document.createElement('button');
    vote.className = 'play-story';
    if(s.cardsShown) {
      vote.innerText = 'Replay';
      vote.onclick = e => {
        replayStory(s.storyID);
        e.cancelBubble = true;
      };
    }
    else {
      vote.innerText = 'Show Cards';
      vote.onclick = e => {
        showCards(s.storyID);
        e.cancelBubble = true;
      };
    }

    const deleteStoryButton = document.createElement('span');
    deleteStoryButton.className = 'delete-story';
    deleteStoryButton.innerHTML = '&times;';
    deleteStoryButton.onclick = e => {
      deleteStory(s.storyID);
      e.cancelBubble = true;
    };

    const result = document.createElement('input');
    result.type = 'number';
    result.min = 0;
    result.max = 100;
    result.maxLength = 3;
    result.disabled = true;
    result.className = 'story-result';
    result.onclick = e => {
      e.cancelBubble = true;
    };
    result.onkeyup = e => {
      if(e.key.toLocaleLowerCase() === 'enter') {
        const resultVal = parseFloat(result.value);
        const resultIndex = CARD_VALUE.findIndex(c => c === resultVal);
        if (resultIndex !== -1) {
          updateStoryResult(s.storyID, resultIndex);
        }
        else {
          result.value = '';
        }
      }
    };

    if (s.result >= 0 && s.result < CARD_VALUE.length) {
      result.value = CARD_VALUE[s.result];
    }
    
    const footer = document.createElement('div');
    footer.className = 'story-footer';
    footer.appendChild(vote);
    footer.appendChild(result);
    footer.appendChild(deleteStoryButton);

    const div = document.createElement('div');
    div.id = 'story_' + s.storyID;
    div.onclick = e => {
      selectStory(s.storyID);
      e.cancelBubble = true;
    };
    div.appendChild(caption);
    div.appendChild(footer);

    if(s.storyID === currentStory) {
      div.className = 'selected';
      result.disabled = false;
      if (s.cardsShown) {
        div.className += ' -cards-shown';
      }
      if(Object.getOwnPropertyNames(s.votes).length > 0) {
        div.className += ' -show-cards';
      }
    }
    roomStories.appendChild(div);
  });
}

function connect() {
  if (connection) {
    setUsername();
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

  connection = new WebSocket(serverUrl, "json");
  console.log("***CREATED WEBSOCKET");

  connection.onopen = function(evt) {
    console.log("***ONOPEN");
  };
  console.log("***CREATED ONOPEN");

  connection.onmessage = function(evt) {
    console.log("***ONMESSAGE");
    var msg = JSON.parse(evt.data);
    console.log("Message received: ");
    console.dir(msg);
    let tr, td;

    switch(msg.type) {
      case "loggedout":
        document.getElementById("loginPage").className = "active";
        document.getElementById("lobbyPage").className = "";
        document.getElementById("roomPage").className = "";
        document.getElementById("name").disabled = false;
        document.getElementById("name").value = "";
        document.getElementById("login").disabled = false;
        connection = null;
        username = null;
        clientID = 0;
        currentRoom = null;
        currentStory = null;
        cardsShown = false;
        break;
      case "id":
        clientID = msg.id;
        setUsername();
        break;
      case "acceptusername":
        document.getElementById("loginMessage").innerHTML = "";
        document.getElementById("name").disabled = true;
        document.getElementById("login").disabled = true;
        document.getElementById("loginPage").className = "";
        document.getElementById("lobbyPage").className = "active";
        document.getElementById("lobbyUsername").innerText = msg.name;
        document.getElementById("roomUsername").innerText = msg.name;
        username = document.getElementById("name").value;
        localStorage.setItem(USERNAME_TOKEN, username);
        break;
      case "rejectusername":
        document.getElementById("name").focus();
        document.getElementById("loginMessage").innerHTML = "<b>The username <em>" + msg.name + "</em> is already in use. Please provide another username and login again.</b><br>";
        break;
      case "acceptroomname":
        document.getElementById("roomName").value = '';
        break;
      case "rejectroomname":
        document.getElementById("roomName").focus();
        document.getElementById("lobbyMessage").innerHTML = "<b>The room name <em>" + msg.name + "</em> is already in use. Please provide another name and try again.</b><br>";
        break;
      case "roomlist":
        const roomList = document.getElementById('roomList');
        roomList.innerHTML = '';
        msg.rooms.forEach(r => {
          tr = document.createElement('tr');
          td = document.createElement('td');
          td.innerText = `${r.name} (${r.playerCount})`;
          td.title = 'Click to enter room';
          td.onclick = () => joinRoom(r.name);
          tr.appendChild(td);

          td = document.createElement('td');
          const span = document.createElement('span');
          span.className = 'delete-button' + (r.playerCount ? '' : ' active');
          span.innerText = 'Delete';
          span.onclick = () => deleteRoom(r.name);

          td.appendChild(span);
          tr.appendChild(td);
          
          roomList.appendChild(tr);
        });
        if(msg.rooms.length === 0) {
          roomList.innerHTML = '<tr><td><i>No rooms available</i></td></tr>';
        }
        break;
      case "roomexited":
        if (msg.room === currentRoom) {
          currentRoom = null;
          document.getElementById("lobbyPage").className = "active";
          document.getElementById("roomPage").className = "";
          document.getElementById("roomRoomname").innerText = "";
        }
        break;
      case "roomentered":
        currentRoom = msg.room;
        document.getElementById("lobbyPage").className = "";
        document.getElementById("roomPage").className = "active";
        document.getElementById("roomRoomname").innerText = currentRoom;
        break;
      case "exportedstories":
        copyToClipboard(msg.text);
        break;
      case "roomstate":
        if (msg.room === currentRoom) {
          currentStory = msg.currentStory;
          updatePlayerVotes(msg.players, msg.stories);
          updateStories(msg.stories);
          if(currentStory) {
            const story = msg.stories.find(s => s.storyID === currentStory);
            updateCard(story.votes[username]);
            cardsShown = story.cardsShown;
            const currentStoryDiv = document.getElementById('story_' + currentStory);
            currentStoryDiv.scrollIntoView();
          }
          else {
            updateCard();
            cardsShown = false;
          }
        }
        break;
    }
  };
  console.log("***CREATED ONMESSAGE");
}

function enterKeyTriggersButton(sourceId, targetId) {
  document.getElementById(sourceId).onkeyup = e => {
    if(e.key.toLocaleLowerCase() === 'enter') {
      document.getElementById(targetId).click();
    }
  };
}

window.onload = () => {
  enterKeyTriggersButton('name', 'login');
  enterKeyTriggersButton('roomName', 'createRoom');
  const usernameElement = document.getElementById('name');
  usernameElement.focus();
  const oldUserName = localStorage.getItem(USERNAME_TOKEN);
  if(oldUserName) {
    usernameElement.value = oldUserName;
  }
  document.body.onunload = () => {
    logout();
  };
};
