const express=require("express")
const app=express()

const path=require("path")
const http=require("http")
const {Server}=require("socket.io")
const port = process.env.PORT || 3000;

const server=http.createServer(app)

const io=new Server(server)
app.use(express.static(path.resolve("")))


let connected_players = {}
const GRID_SIZE = 15
const CONNECT_TO_WIN = 5

// Initial board state
let initial_board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
let current_player = "X"


app.get("/",(req,res)=>{
    console.log("/")
    return res.sendFile("index.html")
})

server.listen(port,()=>{
    console.log("port connected to "+port)
})

io.on("connection",(socket)=>{
    console.log("connection")
    
    const playerId = socket.id;

    if (Object.keys(connected_players).length < 2) {
        if (Object.keys(connected_players).length === 0) {
            connected_players[playerId] = 'O';
        } else {
            const connectedPlayerId = Object.keys(connected_players);
            connected_players[playerId] = (connected_players[connectedPlayerId] === 'X') ? 'O' : 'X';  
            io.emit('current_player', { current_player: current_player });
            io.emit('game_start', {});
        }
        io.to(playerId).emit('player_role', { role: connected_players[playerId] });
    } else {
        io.to(playerId).emit('game_full', {});
        console.log(`Too many players ${Object.keys(connected_players).length}`);
    }
    

    socket.on('disconnect', () => {
        if(socket.id in connected_players){
            io.emit('player_left', {});
            connected_players = {}
        }
    });
   

    socket.on('update_board', (data) => {
        const playerSocketId = socket.id;
    
        if (!playerSocketId in connected_players) {
            return; // Ignore moves from unauthorized players
        }
    
        const index = parseInt(data.index);
    
        if (index === -1) {
            // Special value for game reset
            initial_board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
            current_player = 'X';
        } else {
            const row = Math.floor(index / GRID_SIZE);
            const col = index % GRID_SIZE;
    
            if (0 <= row && row < GRID_SIZE && 0 <= col && col < GRID_SIZE && initial_board[row][col] === "") {
                initial_board[row][col] = current_player;
                current_player = (current_player === 'X') ? 'O' : 'X';
            } else {
                return; // Ignore invalid moves
            }
        }
    
        const winner = checkWinner();
        
        io.emit('board_updated', {
            board: initial_board,
            current_player: current_player,
            winner: winner
        }); // Broadcast to all connected clients
    
        io.emit('current_player', {
            current_player: current_player
        }); // Broadcast current player information
    
        if (winner) {
            connected_players = {}
            initial_board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
            current_player = 'X';
        }
    });

    


})

function checkWinner() {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (initial_board[i][j] !== "" && (checkRow(i, j) || checkColumn(i, j) || checkDiagonal(i, j))) {
                return initial_board[i][j];
            }
        }
    }

    return null;
}


function checkDiagonal(row, col) {
    let count = 0;
    const player = initial_board[row][col];

    // Check diagonals
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (i + CONNECT_TO_WIN <= GRID_SIZE && j + CONNECT_TO_WIN <= GRID_SIZE) {
                // Check diagonal from top-left to bottom-right
                if (Array.from({ length: CONNECT_TO_WIN }, (_, k) => initial_board[i + k][j + k] === player).every(Boolean)) {
                    return true;
                }
            }
            if (i - CONNECT_TO_WIN + 1 >= 0 && j + CONNECT_TO_WIN <= GRID_SIZE) {
                // Check diagonal from bottom-left to top-right
                if (Array.from({ length: CONNECT_TO_WIN }, (_, k) => initial_board[i - k][j + k] === player).every(Boolean)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function checkRow(row, col) {
    let count = 0;
    const player = initial_board[row][col];

    for (let j = 0; j < GRID_SIZE; j++) {
        if (initial_board[row][j] === player) {
            count += 1;
            if (count === CONNECT_TO_WIN) {
                return true;
            }
        } else {
            count = 0;
        }
    }

    return false;
}

function checkColumn(row, col) {
    let count = 0;
    const player = initial_board[row][col];

    for (let i = 0; i < GRID_SIZE; i++) {
        if (initial_board[i][col] === player) {
            count += 1;
            if (count === CONNECT_TO_WIN) {
                return true;
            }
        } else {
            count = 0;
        }
    }

    return false;
}



