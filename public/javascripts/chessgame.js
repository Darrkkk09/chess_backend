const socket = io();
const boardElement = document.querySelector('.chessboard');
const chess = new Chess();

let draggedFrom = null;
let isGameOver = false; // Track if the game is over

const pieceMap = {
    p: '♟︎', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
    P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

function getSquareId(row, col) {
    return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function renderBoard() {
    boardElement.innerHTML = '';
    const board = chess.board();

    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareDiv = document.createElement('div');
            squareDiv.classList.add('square', (rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark');
            squareDiv.dataset.square = getSquareId(rowIndex, colIndex);

            squareDiv.addEventListener('dragover', (e) => {
                if (!isGameOver) e.preventDefault();
            });

            squareDiv.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!isGameOver) {
                    const target = squareDiv.dataset.square;
                    if (draggedFrom && target) {
                        socket.emit('move', { from: draggedFrom, to: target, promotion: 'q' });
                    }
                }
            });

            if (square) {
                const piece = document.createElement('div');
                piece.classList.add('piece', square.color === 'w' ? 'white' : 'black');
                piece.textContent = pieceMap[square.color === 'w' ? square.type.toUpperCase() : square.type];
                piece.draggable = !isGameOver;

                piece.addEventListener('dragstart', () => {
                    if (!isGameOver) draggedFrom = getSquareId(rowIndex, colIndex);
                });

                piece.addEventListener('dragend', () => {
                    draggedFrom = null;
                });

                squareDiv.appendChild(piece);
            }

            boardElement.appendChild(squareDiv);
        });
    });
}

// Handle player role
socket.on('playerRole', (role) => {
    if (role === 'w') {
        boardElement.classList.remove('flipped');
    } else if (role === 'b') {
        boardElement.classList.add('flipped');
    }
});

// Handle board state updates
socket.on('boardState', (fen) => {
    chess.load(fen);
    renderBoard();
});

// Handle moves
socket.on('move', (move) => {
    chess.move(move);
    renderBoard();
});

// Handle game over
socket.on('gameOver', ({ winner }) => {
    isGameOver = true;
    if (winner === 'Draw') {
        alert('The game is a draw!');
    } else {
        alert(`Checkmate! ${winner} wins!`);
    }
});

// Reset the board
socket.on('resetBoard', () => {
    chess.reset();
    isGameOver = false;
    renderBoard();
});

socket.emit('requestRole');
renderBoard();
