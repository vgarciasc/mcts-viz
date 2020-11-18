function getOtherPlayer(player) {
    return player == PLAYER.MACHINE ? PLAYER.HUMAN : PLAYER.MACHINE;
}

class AlgAction {
    constructor(kind, node_id, old_data, new_data) {
        this.kind = kind;
        this.node_id = node_id;
        this.old_data = old_data;
        this.new_data = new_data;
    }
}

class MCTS {
    constructor(model, player=PLAYER.MACHINE) {
        this.model = model;

        let root = new Node(new GameNode(new GameMove(getOtherPlayer(player), null)));
        this.tree = new Tree(root);
    }

    runSearch(iterations=50) {
        // let end = Date.now() + timeout * 1000;
        let trace = [];

        var i = 0;
        // while (Date.now() < end) {
        for (var i = 0; i < iterations; i++) {
            let iterationTrace = this.runSearchIteration();
            trace.push(iterationTrace);
        }

        let best_move_node = this.tree.getChildren(this.tree.get(0)).reduce((a, b) => a.data.simulations > b.data.simulations ? a : b);
        trace.push([new AlgAction("finish", best_move_node.id, null, null)]);
        return {move: best_move_node.data.move, trace: trace};
    }

    runSearchIteration() {
        let selectRes = this.select(this.model.copy());
        let selectLeaf = selectRes.node;
        let selectModel = selectRes.model;
        let selectActions = selectRes.actions;

        let expandRes = this.expand(selectLeaf, selectModel);
        let expandLeaf = expandRes.node;
        let expandModel = expandRes.model;
        let expandActions = expandRes.actions;

        let simulation = this.simulate(expandLeaf, expandModel);
        let simulationActions = simulation.actions;

        let backpropagated = this.backpropagate(expandLeaf, simulation.winner_icon);
        let backpropagatedActions = backpropagated.actions;

        return selectActions.concat(expandActions.concat(simulationActions.concat(backpropagatedActions)));
    }

    getBestChildUCB1(node) {
        let nodeScores = this.tree.getChildren(node).map((f) => [f, UCB1(f, node)]);
        return nodeScores.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    select(model) {
        let node = this.tree.get(0);
        let actions = [new AlgAction("selection", node.id, null, null)];

        while (!node.isLeaf() && this.isFullyExplored(node, model)) {
            node = this.getBestChildUCB1(node);
            model.makeMove(node.data.move);

            actions.push(new AlgAction("selection", node.id, null, null));
        }

        return {node: node, model: model, actions: actions};
    }

    expand(node, model) {
        let expandedNode = null;
        let actions = [];

        if (model.checkWin() == "") {
            let legalPositions = this.getAvailablePlays(node, model);
            let randomPos = legalPositions[myp5.round(myp5.random(legalPositions.length - 1))];

            let otherPlayer = getOtherPlayer(node.data.move.player);
            
            let randomMove = new GameMove(otherPlayer, randomPos); 
            model.makeMove(randomMove);

            expandedNode = new Node(new GameNode(randomMove));
            this.tree.insert(expandedNode, node);

            actions = [new AlgAction("expansion", expandedNode.id, null, null)];
        } else {
            expandedNode = node;
        }

        return {
            node: expandedNode,
            model: model,
            actions: actions};
    }

    simulate(node, model) {
        let currentPlayer = node.data.move.player;

        while (model.checkWin() == "") {
            currentPlayer = getOtherPlayer(currentPlayer);
            model.makeRandomMove(currentPlayer);
        }

        let winner_icon = model.checkWin();

        return {
            winner_icon: winner_icon,
            actions: [new AlgAction("simulation", node.id, null, {
                "result": winner_icon,
                "board": model.copy()
            })]
        };
    }

    backpropagate(node, winner) {
        let actions = [];
        let action = new AlgAction("backpropagation", node.id, {
            old_value: node.data.value,
            old_visits: node.data.simulations
        }, null);

        node.data.simulations += 1;
        if (!node.isRoot()) {
            if ((node.data.move.player == PLAYER.MACHINE && winner == "m") ||
                (node.data.move.player == PLAYER.HUMAN   && winner == "h")) {
                node.data.value += 1;
            }
            if ((node.data.move.player == PLAYER.MACHINE && winner == "h") ||
                (node.data.move.player == PLAYER.HUMAN   && winner == "m")) {
                node.data.value -= 1;
            }
        
            actions = actions.concat(this.backpropagate(this.tree.getParent(node), winner).actions);
        }

        action.new_data = {
            new_value: node.data.value,
            new_visits: node.data.simulations
        };

        actions.unshift(action);

        return {actions: actions};
    }

    isFullyExplored(node, model) {
        return this.getAvailablePlays(node, model).length == 0;
    }

    getAvailablePlays(node, model) {
        let children = this.tree.getChildren(node);

        return model.getLegalPositions().filter((pos) => {
            let explored = children.find((child) => child.data.move.position == pos);
            return !explored;
        });
    }
}

class GameNode {
    constructor(move) {
        this.move = move;
        this.value = 0;
        this.simulations = 0;
    }

    copy() {
        var new_game_node = new GameNode(this.move == null ? null : this.move.copy());
        new_game_node.value = this.value;
        new_game_node.simulations = this.simulations;
        return new_game_node;
    }
}

function UCB1(node, parent) {
    let exploitation = node.data.value / node.data.simulations;
    let exploration = Math.sqrt(2 * Math.log(parent.data.simulations) / node.data.simulations);
    return exploitation + exploration;
}