const Story = require('./story.js');
const CARD_VALUE = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];

class Room {
    constructor(name, sendMessageToPlayers) {
        this.name = name;
        this.players = [];
        this.stories = [];
        this.currentStory = null;
        this.send = (msg, players = this.players) => sendMessageToPlayers(msg, players);
    }

    sendRoomState(players) {
        this.send({
            type: 'roomstate',
            room: this.name,
            players: this.players,
            stories: this.stories.map(s => s.toJsonObject()),
            currentStory: this.currentStory
        }, players);
    }

    join(username) {
        if (! this.players.find(p => p === username)) {
            this.players.push(username);
            this.send({
                type: 'roomentered',
                room: this.name
            }, [username]);
            this.sendRoomState();
        }
    }

    unjoin(username) {
        const playerCount = this.players.length;
        this.players = this.players.filter(p => p !== username);
        this.send({
            type: 'roomexited',
            room: this.name
        }, [username]);
        if (this.players.length !== playerCount) {
            this.sendRoomState();
        }
    }

    selectStory(storyID) {
        if(this.stories.find(s => s.storyID === storyID)) {
            this.currentStory = storyID;
            this.sendRoomState();
        }
    }

    replayStory(storyID) {
        const story = this.stories.find(s => s.storyID === storyID);
        if (story) {
            story.replay();
            this.currentStory = storyID;
            this.sendRoomState();
        }
    }

    updateStoryResult(storyID, result) {
        const story = this.stories.find(s => s.storyID === storyID);
        if (story) {
            story.result = result;
            this.sendRoomState();
        }
    }

    playCard(storyID, username, card) {
        const story = this.stories.find(s => s.storyID === storyID);
        if (story) {
            story.addVote(username, card);
            this.sendRoomState();
        }
    }

    showCards(storyID) {
        const story = this.stories.find(s => s.storyID === storyID);
        if (story) {
            story.showCards(this.players);
            this.sendRoomState();
        }
    }

    addStories(text) {
        const newStories = text.split('\n').map(t => t.trim()).filter(t => t).map(t => new Story(t));
        if (newStories.length > 0) {
            this.stories.push(...newStories);
            this.sendRoomState();
        }
    }

    resultDisplay(result) {
        if (result < 0 || result >= CARD_VALUE.length) {
            return '';
        }
        return CARD_VALUE[result];
    }

    exportStories(username) {
        const text = this.stories
            .map(s => s.text + '\t' + this.resultDisplay(s.result))
            .join('\n');
        this.send({
            text,
            type: 'exportedstories',
            room: this.name
        }, [username]);
    }
}

module.exports = Room;