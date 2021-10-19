"use strict";

const CARD_VALUE = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];
const CARD_DISPLAY =["0","&half;","1","2","3","5","8","13","20","40","100","&infin;","?"];

class PokerViewModel {
  constructor (initialRoom, service) {
    this.service = service;
    this.currentPage = ko.observable('loginPage');
    this.username = ko.observable('');
    this.usernameFocus = ko.observable();
    this.roomName = ko.observable('');
    this.roomNameFocus = ko.observable();
    this.loginButtonEnabled = ko.observable(true);
    this.loginMessage = ko.observable('');
    this.lobbyMessage = ko.observable('');
    this.lobbyRooms = ko.observableArray();
    this.newStoriesText = ko.observable('');
    this._currentRoomName = ko.observable('');
    this._currentRoom = ko.observable(initialRoom);
    this.cards = CARD_DISPLAY.map((c, index) => {
      return {
        html: c,
        cardIndex: index,
        selected: ko.pureComputed(() => {
          const story = this.currentRoom.stories.find(s => s.storyID === this.currentStoryID);
          return !!story && story.votes[this.username()] === index;
        })
      };
    });
  }

  get currentStoryID() { return this.currentRoom.currentStoryID; }
  get cardsShown() {
     if (!this.currentStoryID || this.currentRoom.stories.length === 0) {
       return false;
     }
     const story = this.currentRoom.stories.find(s => s.storyID === this.currentStoryID);
     return story.cardsShown;
  }
  get currentRoom() { return this._currentRoom(); }
  set currentRoom(r) {
    this.disposeStorySubs();
    r.subs = [];
    r.stories.forEach(s => {
      s.result = ko.observable(s.result).extend({ notify: 'always' });
      s.storyResult = ko.pureComputed({
        owner: s,
        read: function() {
          return this.result() != null ? CARD_VALUE[this.result()] : null;
        },
        write: function(value) {
          if(value == null || value === '') {
            this.result(null);
          }
          const resultVal = parseFloat(value);
          const resultIndex = CARD_VALUE.findIndex(c => c === resultVal);
          if (resultIndex !== -1) {
            this.result(resultIndex);
          }
          else {
            this.result(this.result());
          }
        }
      });
      const sub = s.result.subscribe(value => {
        this.service.updateStoryResult(s.storyID, value);
      });
      r.subs.push(sub);
    });
    this._currentRoom(r);
  }
  get currentRoomName() { return this._currentRoomName(); }
  set currentRoomName(n) {this._currentRoomName(n); }
  
  currentStoryText() {
    if(vm.currentStoryID) {
      const story = this.currentRoom.stories.find(s => s.storyID === vm.currentStoryID);
      return story.text;
    }
    return '';
  }

  connect() {
    this.service.connect();
  }

  createRoom() {
    this.service.createRoom(this.roomName());
  }

  joinRoom(lobbyRoom) {
    this.service.joinRoom(lobbyRoom.name);
  }

  deleteRoom(lobbyRoom) {
    const answer = window.confirm(`Are you sure you want to delete room ${lobbyRoom.name}?`);
    if(!answer) {
      return;
    }
    this.service.deleteRoom(lobbyRoom.name);
  }

  backToLobby() {
    this.service.backToLobby(this.currentRoomName);
  }

  playerVote(player) {
    if(vm.currentStoryID) {
      const story = this.currentRoom.stories.find(s => s.storyID === vm.currentStoryID);
      const card = CARD_DISPLAY[story.votes[player]];
      return card ? (story.cardsShown? card : '*') : '';
    }
    return '';
  }

  addNewStories() {
    this.service.addNewStories(this.newStoriesText());
    this.newStoriesText('');
  }

  deleteStory(story, event) {
    const answer = window.confirm('Are you sure you want to delete this story?');
    if(!answer) {
      return;
    }
    this.service.deleteStory(story.storyID);
    event.cancelBubble = true;
  }

  exportStories() {
    this.service.exportStories();
  }

  storyButton(story, event) {
    if(story.cardsShown) {
      this.service.replayStory(story.storyID);
    }
    else {
      this.service.showCards(story.storyID);
    }
    event.cancelBubble = true;
  }

  evalStoryResul(story, event) {
    if (event.key === 'Enter') {
      event.target.blur();
    }
  }
  
  storyClick(story, event) {
    this.service.selectStory(story.storyID);
    event.cancelBubble = true;
  }

  storyCss(story) {
    let css = '';
    if(vm.currentStoryID === story.storyID) {
      css += ' selected';
      if (story.cardsShown) {
        css += ' -cards-shown';
      }
      if(Object.getOwnPropertyNames(story.votes).length > 0) {
        css += ' -show-cards';
      }      
    }
    return css;
  }

  playCard(card) {
    if(!this.currentStoryID || this.cardsShown) {
      return;
    }
    this.service.playCard(card.selected() ? null : card.cardIndex);
  }

  disposeStorySubs() {
    vm.currentRoom.subs.forEach(sub => sub.dispose());
    vm.currentRoom.subs.length = 0;
  }

  logout() {
    this.service.logout();
  }

}
