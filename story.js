const repo = require('./poker-repository.js');

class Story {
    static fromDB(s) {
        const story = new Story(s.text, s.room, s.storyID);
        story.votes = s.votes;
        story.cardsShown = s.cardsShown;
        story.result = s.result;
        return story;
    }

    constructor(text, room, storyID) {
        this.room = room;
        this.text = text;
        this.votes = {};
        this.cardsShown = false;
        this.result = null;
        this.storyID = storyID;
        this.startTime = null;
    }

    setResult(result) {
        this.result = result;
        repo.updateStoryResult(this.storyID, result);
    }

    remove() {
        repo.removeStory(this.storyID);
    }

    addVote(player, card) {
        this.votes[player] = card;
        if (card == null) {
            repo.clearPlayerStoryVote(this.storyID, player);
        }
        else {
            repo.updateStoryVote(this.storyID, player, card);
        }
    }

    replay(startTime) {
        this.votes = {};
        this.cardsShown = false;
        this.result = null;
        this.startTime = startTime;
        repo.clearStoryVotes(this.storyID);
    }

    showCards(players) {
        this.cardsShown = true;
        const sortedCards = players
            .map(p => this.votes[p])
            .sort((a,b) => a - b);
        const size = sortedCards.length;
        if (size > 0 && sortedCards[0] === sortedCards[size - 1]) {
            this.result = sortedCards[0];
            repo.updateStoryResult(this.storyID, this.result);
        }
        repo.updateStoryCardsShown(this.storyID, true);
    }

    toJsonObject() {
        return Object.assign({}, this);
    }
}

module.exports = Story;