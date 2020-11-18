const PLAYER = Object.freeze({ HUMAN: 0, MACHINE: 1 });

class TicTacToeBoard {
    constructor() {
        this.grid = (new Array(9)).fill("");
    }

    humanMakeMove(position) {
        if (this.getLegalPositions().indexOf(position) == -1) {
            console.error("Illegal move! Legal moves: " + this.getLegalPositions().toString());
            return;
        }

        this.makeMove(new GameMove(PLAYER.HUMAN, position));
    }

    makeRandomMove(player) {
        let legalMoves = this.getLegalPositions();
        let randomMove = myp5.round(myp5.random(legalMoves.length - 1));
        let position = legalMoves[randomMove];
        this.makeMove(new GameMove(player, position));
    }

    makeMove(move) {
        this.grid[move.position] = (move.player == PLAYER.HUMAN) ? "h" : "m";
    }

    getLegalPositions() {
        return this.grid.map((f, i) => [f, i]).filter((f) => f[0] == "").map((f) => f[1]);
    }

    hasLegalPositions() {
        return this.getLegalPositions().length > 0;
    }

    isLegalPosition(position) {
        return this.getLegalPositions().find((f) => f == position) != undefined;
    }

    checkWin() {
        if (areEqual([this.grid[0+0], this.grid[1+0], this.grid[2+0]])) return this.grid[0+0];
        if (areEqual([this.grid[0+3], this.grid[1+3], this.grid[2+3]])) return this.grid[0+3];
        if (areEqual([this.grid[0+6], this.grid[1+6], this.grid[2+6]])) return this.grid[0+6];

        if (areEqual([this.grid[0+0], this.grid[3+0], this.grid[6+0]])) return this.grid[0+0];
        if (areEqual([this.grid[0+1], this.grid[3+1], this.grid[6+1]])) return this.grid[0+1];
        if (areEqual([this.grid[0+2], this.grid[3+2], this.grid[6+2]])) return this.grid[0+2];

        if (areEqual([this.grid[0], this.grid[4], this.grid[8]])) return this.grid[4];
        if (areEqual([this.grid[2], this.grid[4], this.grid[6]])) return this.grid[4];

        if (!this.hasLegalPositions()) return "v";

        return "";
    }

    print() {
        let string = "";
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                let tile = this.grid[i * 3 + j];

                string += " " + (i * 3 + j).toString() + ": ";
                string += (tile == "") ? "_" : tile;
                string += " ";
                string += (j == 2 ? "" : "|");
            }
            string += (i == 2 ? "" : "\n------------------\n");
        }

        console.log(string);
    }

    copy() {
        let board = new TicTacToeBoard();
        board.grid = this.grid.slice();
        return board;
    }
}

class GameMove {
    constructor(player, position) {
        this.player = player;
        this.position = position;
    }

    copy() {
        return new GameMove(this.player, this.position);
    }
}

function areEqual(arr) {
    return arr.find((f) => f != arr[0]) == undefined;
}