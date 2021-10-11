let nextStoryID = Date.now();

class Story {
    constructor(text) {
        this.text = text;
        this.votes = {};
        this.storyID = nextStoryID++;
        this.cardsShown = false;
        this.result = null;
    }

    addVote(player, card) {
        this.votes[player] = card;
    }

    replay() {
        this.votes = {};
        this.cardsShown = false;
        this.result = null;
    }

    cleanPlayerVotes(player) {
        delete this.votes[player];
    }

    showCards(players) {
        this.cardsShown = true;
        const sortedCards = players
            .map(p => this.votes[p])
            .sort((a,b) => a - b);
        const size = sortedCards.length;
        if (size > 0 && sortedCards[0] === sortedCards[size - 1]) {
            this.result = sortedCards[0];
        }
    }

    toJsonObject() {
        return Object.assign({}, this);
    }
}

module.exports = Story;