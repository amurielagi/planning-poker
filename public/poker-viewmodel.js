"use strict";

const CARD_VALUE = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];
const CARD_DISPLAY =["0","&half;","1","2","3","5","8","13","20","40","100","&infin;","?"];

class PokerViewModel {
  constructor (initialRoom, service) {
    this.service = service;
    this.timeOffset = 0;
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
    this.timerText = ko.observable('');
    setInterval(() => this.timerText(this.currentStoryTimeLeft()), 317);
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
    if(this.currentStoryID) {
      const story = this.currentRoom.stories.find(s => s.storyID === this.currentStoryID);
      return story.text;
    }
    return '';
  }

  currentStoryTimeLeft() {
    if(this.currentStoryID && this.currentRoom && this.currentRoom.minutesPerStory > 0) {
      const story = this.currentRoom.stories.find(s => s.storyID === this.currentStoryID);
      if (!story.startTime || story.storyResult() != null) {
        return '';
      }
      let remaining = this.currentRoom.minutesPerStory * 60 - Math.floor((Date.now() - story.startTime - this.timeOffset) / 1000);
      const sign = remaining < 0 ? '- ' : '';
      remaining = Math.abs(remaining);
      const seconds = remaining % 60;
      let minutes = Math.floor(remaining / 60);
      const hours = Math.floor(minutes / 60);
      minutes = minutes % 60;
      return sign + (hours > 0 ? hours + ':' + (minutes > 9 ? '' : '0') : '') + minutes + ':' + (seconds > 9 ? '' : '0') + seconds;
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

  toggleWarning() {
    this.service.toggleWarning(this.currentRoomName);
  }

  incrementMinPerStory() {
    this.service.addMinutesPerStory(this.currentRoomName, 1);
  }

  decrementMinPerStory() {
    this.service.addMinutesPerStory(this.currentRoomName, -1);
  }

  playerVote(player) {
    if(this.currentStoryID) {
      const story = this.currentRoom.stories.find(s => s.storyID === this.currentStoryID);
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

  onShowCards(story, event) {
    this.service.showCards(story.storyID);
    event.cancelBubble = true;
  }
  onReplayStory(story, event) {
    this.service.replayStory(story.storyID);
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
    if(this.currentStoryID === story.storyID) {
      css += ' selected';
      if (story.cardsShown) {
        css += ' -cards-shown';
      }
      else if(Object.getOwnPropertyNames(story.votes).length > 0) {
        css += ' -can-show-cards';
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
    this.currentRoom.subs.forEach(sub => sub.dispose());
    this.currentRoom.subs.length = 0;
  }

  logout() {
    this.service.logout();
  }

}
