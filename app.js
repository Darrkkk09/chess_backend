const express = require('express');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');
const socket = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();
let players = {};

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render("index", { title: "Dark Moves" });
});

io.on('connection', (uniqueSocket) => {
    console.log("Player connected:", uniqueSocket.id);

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", 'w');
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", 'b');
    } else {
        uniqueSocket.emit("spectatorRole");
    }

    uniqueSocket.on("move", (move) => {
        try {
            const turn = chess.turn();

            if ((turn === 'w' && uniqueSocket.id !== players.white) ||
                (turn === 'b' && uniqueSocket.id !== players.black)) {
                return;
            }

            const result = chess.move(move);

            if (!result) {
                uniqueSocket.emit("invalidMove", move);
                return;
            }

            io.emit("move", move);
            io.emit("boardState", chess.fen());

            if (chess.in_checkmate()) {
                const winner = turn === 'w' ? 'Black' : 'White';
                io.emit("gameOver", { winner });
            } else if (chess.in_draw()) {
                io.emit("gameOver", { winner: "Draw" });
            }
        } catch (err) {
            console.error("Move error:", err);
        }
    });

    uniqueSocket.on("resetGame", () => {
        chess.reset();
        io.emit("resetBoard");
    });

    uniqueSocket.on("disconnect", () => {
        if (uniqueSocket.id === players.white) {
            delete players.white;
        } else if (uniqueSocket.id === players.black) {
            delete players.black;
        }
        console.log("Player disconnected:", uniqueSocket.id);
    });
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
