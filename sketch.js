/// <reference path="./lib/p5.global-mode.d.ts" />

let TTT_BOARD;
let canvas;

var whoseTurn;
var hoveredTile = -1;
var tileSize;

var whoseTurnSpan;
var machineControlsArea;
var whoseturnArea;
var startingPlayerArea;
var gameOverArea;
var gameOverWinner;
var mctsTimeoutSlider;
var mctsTimeoutSpan;

const GameStates = Object.freeze({ 
    SELECT_STARTING_PLAYER: 0, 
    WAITING_HUMAN_MOVE: 1,
    WAITING_MACHINE_MOVE: 2,
    GAME_OVER: 3,
    RUNNING_VIS: 4
});
var currentGameState;

const s = (sketch) => {
  sketch.setup = () => {
    canvas = sketch.createCanvas(200, 200);
    tileSize = (sketch.width - 20)/3;

    whoseTurnSpan = sketch.select("#whoseturn");
    machineControlsArea = sketch.select("#machine_controls_area");
    whoseturnArea = sketch.select("#whoseturn_area");
    startingPlayerArea = sketch.select("#starting_player_area");
    gameOverArea = sketch.select("#game_over_area");
    gameOverWinner = sketch.select("#game_over_winner");
    mctsTimeoutSlider = sketch.select("#mcts_timeout_slider");
    mctsTimeoutSpan = sketch.select("#mcts_timeout_span");

    sketch.reset();
  };

  sketch.draw = () => {
    sketch.handleHover();
    sketch.drawBoard();

    mctsTimeoutSpan.html(mctsTimeoutSlider.value());
  };

  sketch.reset = () => {
    TTT_BOARD = new TicTacToeBoard();
    whoseTurn = sketch.round(sketch.random(0, 1));
    sketch.stateTransition(GameStates.SELECT_STARTING_PLAYER);
  }

  sketch.drawBoard = () => {
        sketch.translate(10, 10);

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                let tile = TTT_BOARD.grid[j + i*3];

                if (hoveredTile == (j + i*3) && currentGameState == GameStates.WAITING_HUMAN_MOVE
                    && TTT_BOARD.isLegalPosition(j + i*3)) {
                    sketch.fill(200, 200, 200);
                } else if (tile == "h") {
                    sketch.fill(100, 100, 240);
                } else if (tile == "m") {
                    sketch.fill(240, 100, 100);
                } else {
                    sketch.fill(255, 255, 255);
                }

                sketch.rect(j * tileSize, i * tileSize, tileSize, tileSize);
                
                sketch.fill(0);
                sketch.textSize(40);
                sketch.textAlign(sketch.CENTER, sketch.CENTER);
                sketch.text(tile, j * tileSize + tileSize/2, i * tileSize + tileSize/2);
            }
        }
    }

    sketch.disableEverythingHTML = () => {
        startingPlayerArea.hide();
        whoseturnArea.hide();
        machineControlsArea.hide();
        gameOverArea.hide();
    }

    sketch.stateTransition = (newGameState) => {
        sketch.disableEverythingHTML();
        
        switch (newGameState) {
            case GameStates.SELECT_STARTING_PLAYER:
                startingPlayerArea.show();
                break;
            case GameStates.WAITING_HUMAN_MOVE:
                whoseTurn = PLAYER.HUMAN;
                whoseturnArea.show();
                whoseTurnSpan.html(whoseTurn == PLAYER.HUMAN ? "HUMAN" : "MACHINE");
                break;
            case GameStates.WAITING_MACHINE_MOVE:
                whoseTurn = PLAYER.MACHINE;
                whoseturnArea.show();
                whoseTurnSpan.html(whoseTurn == PLAYER.HUMAN ? "HUMAN" : "MACHINE");
                machineControlsArea.show();
                break;
            case GameStates.RUNNING_VIS:
                machineControlsArea.hide();
                break;
            case GameStates.GAME_OVER:
                gameOverArea.show();
                let winner = TTT_BOARD.checkWin();
                switch (winner) {
                    case "h": winner = "HUMAN"; break;
                    case "m": winner = "MACHINE"; break;
                    case "v": winner = "DRAW"; break;
                }
                gameOverWinner.html(winner);
                break;
        }

        currentGameState = newGameState;
    }

    sketch.handleHover = () => {
        let mouseX = sketch.mouseX;
        let mouseY = sketch.mouseY;
        
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if (mouseX > (j * tileSize) && mouseX < ((j+1) * tileSize)
                    && mouseY > (i * tileSize) && mouseY < ((i+1) * tileSize)) {
                    hoveredTile = j + i*3;
                    return;
                }
            }
        }

        hoveredTile = -1;
    }

    sketch.selectStartingPlayer = (player) => {
        whoseTurn = player;
        sketch.stateTransition(
            whoseTurn == PLAYER.HUMAN ? 
            GameStates.WAITING_HUMAN_MOVE : 
            GameStates.WAITING_MACHINE_MOVE);
    }

    sketch.mouseClicked = () => {
        if (hoveredTile != -1 && whoseTurn == PLAYER.HUMAN && TTT_BOARD.isLegalPosition(hoveredTile)) {
            TTT_BOARD.humanMakeMove(hoveredTile);
            sketch.endMove(PLAYER.HUMAN);
        }
    }

    sketch.machineRandomMove = () => {
        TTT_BOARD.makeRandomMove(PLAYER.MACHINE);
        sketch.endMove(PLAYER.MACHINE);
    }

    sketch.machineMctsMove = () => {
        let monteCarlo = new MCTS(TTT_BOARD.copy(), PLAYER.MACHINE);
        let MCTS_search = monteCarlo.runSearch(mctsTimeoutSlider.value());
        setMCTS(monteCarlo, MCTS_search);
        sketch.stateTransition(GameStates.RUNNING_VIS);
    }

    sketch.endMove = (player) => {
        if (TTT_BOARD.checkWin() != "") {
            sketch.stateTransition(GameStates.GAME_OVER);
        } else {
            sketch.stateTransition(player == PLAYER.HUMAN ? 
                GameStates.WAITING_MACHINE_MOVE : 
                GameStates.WAITING_HUMAN_MOVE);
        }
    }

    sketch.makeMove = (move) => {
        TTT_BOARD.makeMove(move);
    }
};

let myp5 = new p5(s, "canvascontainer");

function testMCTS() {
    let results = {"h": 0, "m": 0, "v": 0};
    for (var i = 0; i < 100; i++) {
        let board = new TicTacToeBoard();
        
        let player = myp5.int(myp5.random(2)) % 2 == 1 ? PLAYER.MACHINE : PLAYER.HUMAN;
        while (board.checkWin() == "") {
            if (player == PLAYER.MACHINE) {
                let mcts_model = new MCTS(board.copy(), player);
                let mcts_search = mcts_model.runSearch(0.4);

                board.makeMove(mcts_search.move);
            } else {
                board.makeRandomMove(player);
            }

            // board.print();

            player = player == PLAYER.MACHINE ? PLAYER.HUMAN : PLAYER.MACHINE;
        }

        if (i % 10 == 0) { console.log("i: " + i); };
        results[board.checkWin()] += 1;
    }

    console.log(results);
}