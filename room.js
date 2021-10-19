var repo = require('./poker-repository.js');
const Story = require('./story.js');
const CARD_VALUE = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];

class Room {
    static roomsFromDB(sendMessageToPlayers) {
        return repo.getRooms().then(rooms => {
            return rooms.map(r => {
                const room = new Room(r.name, sendMessageToPlayers);
                room.stories = r.stories.map(Story.fromDB);
                return room;
            });
        });
    }

    constructor(name, sendMessageToPlayers) {
        this.name = name;
        this.players = [];
        this.stories = [];
        this.currentStoryID = null;
        this.send = (msg, players = this.players) => sendMessageToPlayers(msg, players);
    }

    remove() {
        repo.removeAllStoriesInRoom(this.name);
    }

    sendRoomState(players) {
        this.send({
            type: 'roomstate',
            room: this.name,
            players: this.players,
            stories: this.stories.map(s => s.toJsonObject()),
            currentStoryID: this.currentStoryID
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
            this.currentStoryID = storyID;
            this.sendRoomState();
        }
    }

    replayStory(storyID) {
        const story = this.stories.find(s => s.storyID === storyID);
        if (story) {
            story.replay();
            this.currentStoryID = storyID;
            this.sendRoomState();
        }
    }

    deleteStory(storyID) {
        const story = this.stories.find(s => s.storyID === storyID);
        if (story) {
            if (this.currentStoryID === storyID) {
                this.currentStoryID = null;
            }
            this.stories = this.stories.filter(s => s !== story);
            story.remove();
            this.sendRoomState();
        }
    }

    updateStoryResult(storyID, result) {
        const story = this.stories.find(s => s.storyID === storyID);
        if (story) {
            story.setResult(result);
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

    addStories(text = '') {
        const stories = text
            .split('\n')
            .map(t => t.trim())
            .filter(t => t)
            .map(t => new Story(t, this.name));
        if (stories.length > 0) {
            repo.addStories(stories).then(() => {
                this.stories.push(...stories);
                this.sendRoomState();
            })
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