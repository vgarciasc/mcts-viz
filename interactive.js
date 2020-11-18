function makeGameNode(model, value, visits, children) {
  return {
    "board": model,
    "value": value,
    "visits": visits,
    "children": children
  };
}

let initial_board = undefined;
let action_trace = [];
let best_move = null;

let currentActionIdx = -1;
let currentIterationIdx = -1;
let totalActionsTillNow = 0;

let final_tree = undefined;
let reconstructed_tree = undefined;
let draw_tree = undefined;

const VisualizationStates = Object.freeze({ 
    NONE: 0,
    VISUALIZING: 1,
    LAST_STEP: 2
});
let current_vis_state = 0;

function transitionToState(new_state) {
  current_vis_state = new_state;
  
  switch (new_state) {
    case VisualizationStates.NONE:
      currentActionIdx = 0;
      currentIterationIdx = 0;
      totalActionsTillNow = 0;
      updateInterface();
      sendDrawTree(null);

      document.getElementById("btn_next_iteration").disabled = true;
      document.getElementById("btn_next_action").disabled = true;
      document.getElementById("btn_last_step").disabled = true;
      document.getElementById("btn_make_play").disabled = true;
      break;
    case VisualizationStates.VISUALIZING:
      document.getElementById("btn_next_iteration").disabled = false;
      document.getElementById("btn_next_action").disabled = false;
      document.getElementById("btn_last_step").disabled = false;
      document.getElementById("btn_make_play").disabled = false;
      break;
    case VisualizationStates.LAST_STEP:
      document.getElementById("btn_next_iteration").disabled = true;
      document.getElementById("btn_next_action").disabled = true;
      document.getElementById("btn_last_step").disabled = true;
      document.getElementById("btn_make_play").disabled = false;
      break;
  }
}

function setupInteractive() {
  document.getElementById("btn_next_action").addEventListener("click", clickNextAction);
  document.getElementById("btn_next_iteration").addEventListener("click", clickNextIteration);
  document.getElementById("btn_last_step").addEventListener("click", clickVisualizeLastStep);
  document.getElementById("btn_make_play").addEventListener("click", clickMakePlay);
  transitionToState(VisualizationStates.NONE);
}

function setMCTS(mcts_obj, trace) {
  initial_board = mcts_obj.model.copy();
  action_trace = trace.trace;
  best_move = trace.move;

  final_tree = mcts_obj.tree.copy();
  reconstructed_tree = new Tree(new Node(new GameNode(null)));
  draw_tree = makeDrawTree(reconstructed_tree);

  tree_vis_p5.initial_board = initial_board;

  let action = action_trace[0][0];
  applyAction(action);

  transitionToState(VisualizationStates.VISUALIZING);
  draw_tree = makeDrawTree(reconstructed_tree);
  sendDrawTree(draw_tree);

  tree_vis_p5.focusNode(tree_vis_p5.tree.getRoot());
}

function sendDrawTree(tree) {
  updateInterface();
  tree_vis_p5.updateTree(tree);
}

function updateInterface() {
  let action_kind = "---";
  let action_progress_bar = "(-/-)";
  let iteration_progress_bar = "(-/-)";

  if (current_vis_state != VisualizationStates.NONE) {
    action_kind = action_trace[currentIterationIdx][currentActionIdx].kind;
    action_progress_bar = "(" + totalActionsTillNow + "/" + (action_trace.flat().length - 1) + ")";
    iteration_progress_bar = "(" + currentIterationIdx + "/" + (action_trace.length - 1) + ")";
  }

  document.getElementById("current_action_kind").innerHTML = action_kind;
  document.getElementById("current_action_kind").className = action_kind;
  document.getElementById("current_action_count").innerHTML = action_progress_bar;
  document.getElementById("current_iteration_count").innerHTML = iteration_progress_bar;
}

function makeDrawTree(tree) {
  let d_tree = tree.copy();

  d_tree.nodes.forEach((f) => { if (!f.isLeaf()) f.data.should_show_collapse_btn = true; })

  while (true) {
    for (var i = 0; i < d_tree.nodes.length; i++) {
      let parent = d_tree.getParent(d_tree.get(i));
      if (parent && parent.data.collapsed) {
        d_tree.remove(d_tree.get(i));
        i = 0;
      }
    }
    break;
  }

  return prepareTree(d_tree, {min_distance: 1});
}

function applyAction(action) {
  reconstructed_tree.nodes.forEach((f) => { 
    f.data.backpropagated = false;
    f.data.simulated = false;
    f.data.selected = false;
    f.data.expanded = false
  });

  switch (action.kind) {
    case "selection":
      reconstructed_tree.nodes.forEach((f) => {
        if (f.data.simulated_board) {
          reconstructed_tree.getParent(f).data.should_show_collapse_btn = false;
          reconstructed_tree.remove(f);
        }
      })
      reconstructed_tree.get(action.node_id).data.selected = true;
      break;
    case "expansion":
      let parent = reconstructed_tree.get(final_tree.getParent(final_tree.get(action.node_id)).id);
      reconstructed_tree.insert(new Node(new GameNode(final_tree.get(action.node_id).data.move)), parent);
      reconstructed_tree.get(action.node_id).data.action_id = totalActionsTillNow;
      reconstructed_tree.get(action.node_id).data.expanded = true;
      reconstructed_tree.get(action.node_id).data.collapsed = false;
      break;
    case "simulation":
      let simulated_node = new Node(new GameNode(reconstructed_tree.get(action.node_id).data.move.copy()));
      simulated_node.data.simulated_board = action.new_data.board;
      simulated_node.data.simulated = true;
      reconstructed_tree.insert(simulated_node, reconstructed_tree.get(action.node_id));
      break;
    case "backpropagation":
      reconstructed_tree.get(action.node_id).data.backpropagated = true;
      reconstructed_tree.get(action.node_id).data.value = action.new_data.new_value;
      reconstructed_tree.get(action.node_id).data.simulations = action.new_data.new_visits;
      break;
    case "finish":
      let best_move_node = reconstructed_tree.get(action.node_id);
      best_move_node.data.best_move = true;
      break;
  }
}

// CONTROL

function clickNextAction(send_tree=true) {
  if (isLastStep()) {
    transitionToState(VisualizationStates.LAST_STEP);
    return;
  }

  if (currentActionIdx == action_trace[currentIterationIdx].length - 1) {
    currentActionIdx = 0;
    currentIterationIdx += 1;
    totalActionsTillNow += 1;
  } else {
    currentActionIdx += 1;
    totalActionsTillNow += 1;
  }

  let action = action_trace[currentIterationIdx][currentActionIdx];
  applyAction(action);

  if (send_tree) {
    draw_tree = makeDrawTree(reconstructed_tree);
    sendDrawTree(draw_tree);

    transitionToState(VisualizationStates.VISUALIZING);
  }
}

function clickNextIteration(send_tree=true) {
  if (isLastStep()) {
    transitionToState(VisualizationStates.LAST_STEP);
    return;
  }

  let iteration = action_trace[currentIterationIdx];
  for (var i = currentActionIdx; i < iteration.length - 1; i++) {
    clickNextAction(false);
  }

  clickNextAction(send_tree); //last action sends the tree if necessary
}

function clickVisualizeLastStep() {
  for (var i = currentIterationIdx; i < action_trace.length; i++) {
    clickNextIteration(send_tree=false);
  }

  draw_tree = makeDrawTree(reconstructed_tree);

  draw_tree.nodes.forEach((node) => {
    let reconstructed_node = reconstructed_tree.nodes.find((f) => f.data.action_id == node.data.action_id);
    if (!reconstructed_node.isRoot()) {
      reconstructed_node.data.collapsed = true;
    }
  });

  draw_tree = makeDrawTree(reconstructed_tree);
  sendDrawTree(draw_tree);

  tree_vis_p5.focusNode(tree_vis_p5.tree.getRoot());
}

function clickMakePlay() {
  myp5.makeMove(best_move);
  myp5.endMove(best_move.player);
  transitionToState(VisualizationStates.NONE);
}

function isLastStep() {
  return currentIterationIdx == action_trace.length - 1
    && currentActionIdx == action_trace[action_trace.length - 1].length - 1;
}

function toggleCollapse(node) {
  let reconstructed_node = reconstructed_tree.nodes.find((f) => f.data.action_id == node.data.action_id);
  reconstructed_node.data.collapsed = !reconstructed_node.data.collapsed;
  
  draw_tree = makeDrawTree(reconstructed_tree);
  sendDrawTree(draw_tree);

  tree_vis_p5.focusNode(node, true);
}