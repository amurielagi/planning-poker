const sqlite3 = require('sqlite3').verbose();

function handleError(err) {
    if(err) {
        console.log('HANDLING ERROR: ' + err.message);
        throw new Error(err.message);
    }
}

class PokerRepository {
    constructor() {
        this.db = new sqlite3.Database('./poker.sqlite', err => {
            handleError(err);
        });

        this.db.serialize(() => {
            this.db.run(`create table if not exists story(
                story_id integer primary key autoincrement,
                room text not null,
                description text not null,
                cards_shown int not null default 0,
                result int,
                unique (room, story_id))`
            );
            this.db.run(`create table if not exists player_vote(
                story_id int not null references story(story_id) on delete cascade,
                player text,
                vote int,
                unique (story_id, player))`
            );
        });
    }

    getRooms() {
        return new Promise((accept, reject) => {
            this.db.serialize(() => {
                this.db.all('select story_id, player, vote from player_vote order by story_id', [], (err, rows) => {
                    err && reject(err);
                    const votesPerStory = {};
                    rows.forEach(row => {
                        const votes = votesPerStory[row.story_id] || {};
                        votes[row.player] = row.vote;
                        votesPerStory[row.story_id] = votes;
                    });
                    
                    this.db.all('select room, story_id, description, cards_shown, result from story order by room, story_id', [], (err, rows) => {
                        err && reject(err);
                        const rooms = [];
                        let room = {};
                        rows.forEach(row => {
                            if(room.name !== row.room) {
                                room = {name: row.room, stories: []};
                                rooms.push(room);
                            }
                            const story = {
                                room: row.room,
                                text: row.description,
                                votes: votesPerStory[row.story_id] || {},
                                storyID: row.story_id,
                                cardsShown: row.cards_shown === 1,
                                result: row.result
                            };
                            room.stories.push(story);
                        });
                        accept(rooms);
                    });
                });
            });
        });
    }

    addStories(stories) {
        return new Promise((accept) => {
            this.db.serialize(() => {
                stories.forEach(story => {
                    this.db.run(`insert into story(room, story_id, description) values(?, ?, ?)`,
                        [story.room, story.storyID, story.text],
                        function(err) {
                            handleError(err);
                            story.storyID = this.lastID;
                            if(stories.every(s => s.storyID != null)) {
                                accept();
                            };
                        }
                    );
                });
            });
        });
    }

    removeStory(storyID) {
        this.db.run(`delete from story where story_id = ?`,[storyID]);
    }

    removeAllStoriesInRoom(room) {
        this.db.run(`delete from story where room = ?`,[room]);
    }

    updateStoryCardsShown(storyID, shown) {
        this.db.run(`update story set cards_shown = ? where story_id = ?`,[shown? 1 : 0, storyID]);
    }

    updateStoryResult(storyID, result) {
        this.db.run(`update story set result = ? where story_id = ?`,[result, storyID]);
    }

    clearStoryVotes(storyID) {
        this.db.serialize(() => {
            this.db.run(`delete from player_vote where story_id = ?`,[storyID]);
            this.updateStoryCardsShown(storyID, false);
            this.updateStoryResult(storyID, null);
        });
    }

    updateStoryVote(storyID, player, vote) {
        this.db.run(`
            insert into player_vote (story_id, player, vote)
            values (?,?,?)
            on conflict (story_id, player) do update set vote = ?`,[storyID, player, vote, vote]);
    }

    clearPlayerStoryVote(storyID, player) {
        this.db.run(`delete from player_vote where story_id = ? and player = ?`,[storyID, player]);
    }
}

module.exports = new PokerRepository();