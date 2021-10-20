//#!/usr/bin/env node

"use strict";

var https = require('https');
var fs = require('fs');
var nStatic = require('node-static');
var WebSocketServer = require('websocket').server;
var Room = require('./room.js');

var rooms = [];
var connections = [];
var nextID = Date.now();

// Load the key and certificate data to be used for our HTTPS/WSS
// server.

var httpsOptions = {
  key: fs.readFileSync("./certs/domain.key"),
  cert: fs.readFileSync("./certs/domain.crt")
};

var fileServer = new nStatic.Server('./public');

var httpsServer = https.createServer(httpsOptions, function(request, response) {
    request.addListener('end', function () {
      fileServer.serve(request, response);
    }).resume();
});

httpsServer.listen(6502, function() {
    console.log((new Date()) + " Server is listening on port 6502");
});

// Create the WebSocket server

console.log("***CREATING WEBSOCKET SERVER");
var wsServer = new WebSocketServer({
    httpServer: httpsServer,
    autoAcceptConnections: false
});
console.log("***CREATED");

function originIsAllowed(origin) {
  // This is where you put code to ensure the connection should
  // be accepted. Return false if it shouldn't be.
  return true;
}

function isRoomNameUnique(name) {
  return ! rooms.find(r => r.name === name);
}

function isUsernameUnique(name) {
  return ! connections.find(c => c.username === name);
}

function getConnectionForID(id) {
  return connections.find(c => c.clientID === id);
}

function makeRoomListMessage() {
  return {
    type: "roomlist",
    rooms: rooms.map(r => {
      return {
        name: r.name,
        playerCount: r.players.length
      };
    })
  };
}

function sendRoomListToAll() {
  sendMessage(makeRoomListMessage());
}

function sendMessageToPlayers(msg, players) {
  const targets = players.map(p => connections.find(c => c.username === p)).filter(c => c);
  sendMessage(msg, targets);
}

function sendMessage(msg, targets = connections) {
  var msgStr = JSON.stringify(msg);
  targets.forEach(c => c.sendUTF(msgStr));
}

console.log("***CREATING REQUEST HANDLER");
wsServer.on('request', function(request) {
  console.log("Handling request from " + request.origin);
  if (!originIsAllowed(request.origin)) {
    request.reject();
    console.log("Connection from " + request.origin + " rejected.");
    return;
  }
  
  // Accept the request and get a connection.

  var connection = request.accept("json", request.origin);

  // Add the new connection to our list of connections.

  console.log((new Date()) + " Connection accepted.");
  connections.push(connection);

  // Send the new client its token; it will
  // respond with its login username.

  connection.clientID = nextID++;

  var msg = {
    type: "id",
    id: connection.clientID
  };
  connection.sendUTF(JSON.stringify(msg));

  // Handle the "message" event received over WebSocket. This
  // is a message sent by a client, and may be text to share with
  // other users or a command to the server.

  connection.on('message', function(message) {
      console.log("***MESSAGE");
      if (message.type === 'utf8') {
          console.log("Received Message: " + message.utf8Data);

          // Process messages

          msg = JSON.parse(message.utf8Data);
          var connect = getConnectionForID(msg.id);
          let room;

          // Look at the received message type and
          // handle it appropriately.

          try{
            switch(msg.type) {
              // Username change request
              case "username":
                if (!isUsernameUnique(msg.name)) {
                  var nameRejectedMsg = {
                    id: msg.id,
                    type: "rejectusername",
                    name: msg.name
                  };
                  connect.sendUTF(JSON.stringify(nameRejectedMsg));
                }
                else {
                  connect.username = msg.name;
                  var nameAcceptedMsg = {
                    id: msg.id,
                    type: "acceptusername",
                    name: msg.name
                  };
                  connect.sendUTF(JSON.stringify(nameAcceptedMsg));
                  connect.sendUTF(JSON.stringify(makeRoomListMessage()));
                }
                break;
              case "deleteroom":
                const roomToBeDeleted = rooms.find(r => r.name === msg.room);
                roomToBeDeleted.remove(); 
                rooms = rooms.filter(r => r !== roomToBeDeleted);
                sendRoomListToAll();
                break;
              case "newroom":
                if (!isRoomNameUnique(msg.room)) {
                  var nameRejectedMsg = {
                    id: msg.id,
                    type: "rejectroomname",
                    name: msg.room
                  };
                  connect.sendUTF(JSON.stringify(nameRejectedMsg));
                }
                else {
                  var nameAcceptedMsg = {
                    id: msg.id,
                    type: "acceptroomname",
                    name: msg.room
                  };
                  connect.sendUTF(JSON.stringify(nameAcceptedMsg));

                  rooms.push(new Room(msg.room, sendMessageToPlayers));
                  sendRoomListToAll();
                }
                break;
              case "joinroom":
                room = rooms.find(r => r.name === msg.room);
                room.join(connect.username);
                sendRoomListToAll();
                break;
              case "exitroom":
                room = rooms.find(r => r.name === msg.room);
                room.unjoin(connect.username);
                sendRoomListToAll();
                break;
              case "playcard":
                room = rooms.find(r => r.name === msg.room);
                room.playCard(msg.story, connect.username, msg.card);
                break;
              case "selectstory":
                room = rooms.find(r => r.name === msg.room);
                room.selectStory(msg.story);
                break;
              case "exportstories":
                room = rooms.find(r => r.name === msg.room);
                room.exportStories(connect.username);
                break;
              case "replaystory":
                room = rooms.find(r => r.name === msg.room);
                room.replayStory(msg.story);
                break;
              case "deletestory":
                room = rooms.find(r => r.name === msg.room);
                room.deleteStory(msg.story);
                break;
              case "showcards":
                room = rooms.find(r => r.name === msg.room);
                room.showCards(msg.story);
                break;
              case "updatestoryresult":
                room = rooms.find(r => r.name === msg.room);
                room.updateStoryResult(msg.story, msg.result);
                break;
              case "addstories":
                room = rooms.find(r => r.name === msg.room);
                room.addStories(msg.text);
                break;
            }
          }
          catch(error) {
            console.log("***ONMESSAGE:ERROR " + error.message);
          }
      }
  });
  
  // Handle the WebSocket "close" event; this means a user has logged off
  // or has been disconnected.
  
  connection.on('close', function() {
    connections.filter(c => !c.connected).forEach(closedConnection => {
      console.log('***CONNECTION CLOSED ' + closedConnection.username + ': ' + closedConnection.clientID);
      rooms.forEach(room => {
        room.unjoin(closedConnection.username);
      });
      sendRoomListToAll();
    });
    connections = connections.filter(c => c.connected);
    console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
  });
});
console.log("***REQUEST HANDLER CREATED");

Room.roomsFromDB(sendMessageToPlayers).then(dbRooms => {
  rooms = dbRooms;
});
