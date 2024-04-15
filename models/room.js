const mongoose = require("mongoose");
const playerSchema = require("./player");


const roomSchema = new mongoose.Schema({
    occupancy: { // how many users can be in a room (for tic tac toe -> 2)
        type:  Number,
        default: 2
    },
    maxRounds: {    // after how many rounds players thrown out from the room 
        type: Number,
        default: 6
    },
    currentRound: {
        required: true,
        type: Number,
        default: 1
    },
    players: [playerSchema],

    isjoin: {
        type: Boolean,
        default: true
    },
    roomId: {
        type: String,
        default: "111111"
    },
    turn: playerSchema,
    turnIndex: {
        type: Number,
        default: 0
    }

});

const roomModel = mongoose.model("room", roomSchema);


module.exports = roomModel;