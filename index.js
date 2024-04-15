require('dotenv').config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);

app.get('/', (req, res) => {
    res.send('Welcome to my tic tac toe game!');
  });

// import room model
const Room = require("./models/room");

var socketIo = require("socket.io");

const io = socketIo(server);
/*
    By:
        io -> we can send data to everyone (backend to frontend or oposite)
        socket -> we can manupulate data for yourself
    
*/

 // Function to shuffle a string
 function shuffleString(str) {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

 const generateRoomID = (nickName)=> {
    const nicknameChars = nickName.toUpperCase().replace(/[^A-Z]/g, '');
    const nicknameLength = Math.min(nicknameChars.length, 3); // Consider up to 3 characters from the nickname
    const randomChars = '0123456789'; // Characters for random numbers
    let roomID = '';
    
      // Add random numbers
  for (let i = 0; i < 6 - nicknameLength; i++) {
    const randomIndex = Math.floor(Math.random() * randomChars.length);
    roomID += randomChars[randomIndex];
  }

  // Add capitalized nickname characters
  for (let i = 0; i < nicknameLength; i++) {
    const charIndex = Math.floor(Math.random() * nicknameChars.length);
    roomID += nicknameChars[charIndex];
  }

  // Shuffle the room ID characters to randomize their order
  roomID = shuffleString(roomID);

  return roomID;
 } 
 


// socket io connection
io.on("connection", (socket)=> {
    console.log("Socketio connected");

    // get createRoom
    socket.on("createRoom", async ({nickName})=> {
        console.log("room", nickName);

        try {
            // create a room in db
            let room = new Room();      // Room model instanace
            
                // make a player
            let player = {
                socketId: socket.id,
                nickName: nickName,
                playerType: 'X'
            }

            // generate room id
            const roomId = generateRoomID(nickName)
            console.log("roomID", roomId)
    
            // push the data into the model
            room.players.push(player);
            room.turn = player;


            room.roomId = roomId.toString()
    
            // save data in db
             room = await room.save();
            console.log("createdRoom", room)
             // extract roomid
            //  const roomId = room._id.toString();
    
             // now join this player sothat it doesnt goes to the another players room
             socket.join(roomId);

             // sendback the response to the room
             io.to(roomId).emit("createRoomSuccess", room);
            
        } catch (error) {
            console.log('err', error);
        }
    });


    // join room
    socket.on("joinRoom", async ({nickName, roomId})=> {

        try {
            // check if it is a valid room id or not
            if(roomId.length !== 6){
                socket.emit("errorOccured", "Room id must be an 6 characters");
                return;
            }
    
            // first fine a room by id
            let room = await Room.findOne({roomId});
    
            // check if player is already joined or not
            if(room?.isjoin){
                let player = {
                    nickName: nickName,
                    socketId: socket.id,
                    playerType: "O"
                }
             
                socket.join(roomId);
                room.players.push(player);
                room.isjoin = false;
    
                 room = await room.save();
    
                 io.to(roomId).emit("joinRoomSuccess", room);
                 io.to(roomId).emit("updatePlayers", room.players);

                 // we have to update the room
                 io.to(roomId).emit("updateRoom", room);
    
            }else{
                socket.emit("errorOccured", "The game is in progress, please try again later");
            }
            
        } catch (error) {
            console.log(error);
        }
        
    });


    // on tap of cell
    socket.on('tap', async({index, roomId})=> {

        try {
            console.log("tapdata", index, roomId);
            let room = await Room.findOne({roomId}); // find the room
            console.log("taproom", room)
    
            let choice = room.turn.playerType;      // choice of current player -> X or 0
    
            // switch the turn
            if(room.turnIndex == 0){
                room.turn = room.players[1];
                room.turnIndex = 1;
            }else{
                room.turn = room.players[0];
                room.turnIndex = 0;
            }
    
            room = await room.save();
    
            io.to(roomId).emit("tapped", {
                index,
                choice,
                room
            })
            
        } catch (error) {
            console.log(error)
        }
    
    });


    // winner 
    socket.on("winner", async ({winnerSocketId, roomId}) => {
        try {
            // find the room
            let room = await Room.findOne({roomId});

            console.log("pointss", winnerSocketId, roomId);

            let player = room.players.find((player)=> player?.socketId ==  winnerSocketId)

            player.points += 1;
            room = await room.save();

            if(player.points >= room.maxRounds){
                io.to(roomId).emit("endGame", player);
            }
            else{
                io.to(roomId).emit("increasePoints", player);
            }

        } catch (error) {
            console.log(error);
        }
    });

});


const Db = process.env.MONGODBURI;

// mongoDb connection
mongoose.connect(Db).then(()=> {
    console.log("MongoDb connected  successfully!");
}).catch(()=> {
    console.log("Error in connecting to MongoDB!");
});




// middle ware
app.use(express.json());

server.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})