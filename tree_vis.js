const vis = (s) => {
  let tree = null;
  let initial_board = null;

  let zoom = 1.00;
  let zMin = 0.05;
  let zMax = 9.00;
  let sensitivity = 0.001;
  let offset = {"x": 20, "y": 20};
  let dragging = false;
  let lastMouse = {"x": 0, "y": 0};
  let hovered_node_id = -1;
  let hovered_node_pos = {x: 0, y: 0};

  let node_distance = {x: 0.75, y: 0.75};

  let node_size = {x: 50, y: 90};

  s.setup = () => {
    s.textFont("Courier");
    s.createCanvas(800, 500);
  };

  s.draw = () => {
    s.handleHover();

    s.background(255);

    s.push();

    s.translate(offset.x, offset.y);
    s.scale(zoom);

    if (s.tree) {
      s.postorder_draw_tree(s.tree.getRoot(), s.initial_board);
    }

    s.pop();
  };

  s.updateTree = (tree) => {
    s.tree = tree;
  }

  s.postorder_draw_tree = (node, model) => {
  	let children = s.tree.getChildren(node);
    if (!node.data.collapsed) {
    	for (var i = 0; i < children.length; i++) {
    		let child = children[i];

    		let child_model = model.copy();
    		child_model.makeMove(child.data.move);

    		s.postorder_draw_tree(child, child_model);
    	}
    }

  	s.push();
  	s.translate(node.data.final_x * (1 + node_distance.x) * node_size.x,
  		          node.data.y       * (1 + node_distance.y) * node_size.y);

    s.toggleNodeColors(node);

  	//draw node content
  	s.drawNode(model, node.data.value, node.data.simulations, node);

    s.toggleNodeColors(node);

  	//drawing edges
    if (!node.isRoot()) {
      let dashlength = - node_distance.y/2 * node_size.y;
      if (node.data.simulated_board) {
        let total_dashes = 10;
        for (var i = 1; i < total_dashes; i += 2) {
          s.line(node_size.x / 2, i * dashlength / total_dashes, node_size.x / 2, (i-1) * dashlength / total_dashes);
        }
      } else {
      	 s.line(node_size.x / 2, 0, node_size.x / 2, dashlength);
      }
    }

    if (!node.isLeaf()) {
  		s.line(node_size.x / 2, node_size.y, node_size.x / 2, (1 + node_distance.y/2) * node_size.y);
    }

  	if (node.data.should_show_collapse_btn) {
      s.fill(0);
      s.circle(node_size.x / 2, node_size.y, node_size.x / 4);
      s.fill(255);
      s.textAlign(s.CENTER, s.CENTER);
      s.strokeWeight(0);
      s.text(node.data.collapsed ? "+" : "-", node_size.x / 2, node_size.y + 1);
    }

  	s.pop();

    s.toggleActionColors(null);
  	//drawing edges
  	if (children.length > 0 && !node.data.collapsed) {
  		s.line(
           (children[0].data.final_x * (1 + node_distance.x) + 1/2) * node_size.x,
           (node.data.y) * (1 + node_distance.y) * node_size.y + node_size.y + node_distance.y/2 * node_size.y,
           (children[children.length - 1].data.final_x * (1 + node_distance.x) + 1/2) * node_size.x,
           (node.data.y) * (1 + node_distance.y) * node_size.y + node_size.y + node_distance.y/2 * node_size.y);
  	}
  }

  s.drawNode = (board, value, visits, node) => {
    if (node.data.simulated_board) {
      board = node.data.simulated_board;
    }

    let tile_size = node_size.x / 3;

    if (node.id == hovered_node_id) {
      s.fill(200);
    } else {
      s.fill(255);
    }

    if (node.data.best_move) {
      s.strokeWeight(3);
      s.stroke(255, 0, 0);
    }
    
    s.rect(0, 0, node_size.x, node_size.y);

    if (node.data.best_move) {
      s.strokeWeight(1);
      s.stroke(0);
    }

    for (var j = 0; j < 3; j++) {
      for (var i = 0; i < 3; i++) {
        let tile = board.grid[i * 3 + j];
        if (tile == "h") {
            s.fill(100, 100, 240);
        } else if (tile == "m") {
            s.fill(240, 100, 100);
        } else {
            // s.fill(220, 220, 220);
            s.fill(255);
        }

        // s.strokeWeight(0);
        s.rect(j * tile_size, i* tile_size, tile_size, tile_size);  

        s.fill(0);
        s.textAlign(s.CENTER, s.CENTER);
      }
    }
    
    // s.stroke(0);
    s.strokeWeight(0.5);
    s.textSize(tile_size * 0.8);

    for (var j = 0; j < 3; j++) {
      for (var i = 0; i < 3; i++) {
        s.text(board.grid[i * 3 + j],
          j * tile_size + tile_size/2,
          i * tile_size + tile_size/2);
      }
    }
    
    s.push();
    s.textSize(tile_size * 0.4);

    s.translate(0, (node_size.y - node_size.x) / 10);
    
    if (!node.isRoot()) {
      let uct = UCB1(node, s.tree.getParent(node)).toFixed(2);
      if (isNaN(uct)) {
        uct = "--";
      } 

      s.textAlign(s.LEFT, s.TOP);
      s.text(" val:", 0, node_size.x);
      s.text(" vis:", 0, node_size.x + (node_size.y - node_size.x) / 4);
      s.text(" uct:", 0, node_size.x + 2 * (node_size.y - node_size.x) / 4);
      s.textAlign(s.RIGHT, s.TOP);
      s.text(value + " ", node_size.x, node_size.x);
      s.text(visits + " ", node_size.x, node_size.x + (node_size.y - node_size.x) / 4);
      s.text(uct + " ", node_size.x, node_size.x + 2 * (node_size.y - node_size.x) / 4);
    } else {
      s.textAlign(s.LEFT, s.TOP);
      s.text(" vis:", 0, node_size.x + (node_size.y - node_size.x) / 4);
      s.textAlign(s.RIGHT, s.TOP);
      s.text(visits + " ", node_size.x, node_size.x + (node_size.y - node_size.x) / 4);
    }
    
    s.pop();

    if (node.data.simulated_board) {
      let winner_icon = node.data.simulated_board.checkWin();
      s.text(winner_icon == "v" ? "DRAW" : ("WINNER: " + winner_icon),
        node_size.x / 2, node_size.y * 1.25);
    }
  }

  s.toggleNodeColors = (node) => {
    let action_kind = "";
    if (node.data.selected) {
      action_kind = "selection";
    } else if (node.data.backpropagated) {
      action_kind = "backpropagation";
    } else if (node.data.expanded) {
      action_kind = "expansion";
    } else if (node.data.simulated) {
      action_kind = "simulation";
    }
    s.toggleActionColors(action_kind);
  }

  s.toggleActionColors = (action_kind) => {
    switch (action_kind) {
      case "selection":
        s.strokeWeight(1);
        s.stroke(180, 30, 30);
        s.fill(180, 30, 30);
        break;
      case "backpropagation":
        s.strokeWeight(1);
        s.stroke(30, 30, 180);
        s.fill(30, 30, 180);
        break;
      case "expansion":
        s.strokeWeight(1);
        s.stroke(30, 180, 30);
        s.fill(30, 180, 30);
        break;
      case "simulation":
        s.strokeWeight(1);
        s.stroke(30, 180, 180);
        s.fill(30, 180, 180);
        break;
      default:
        s.fill(0);
        s.stroke(0);
        break;
    } 
  }

  s.focusNode = (node, onMouse = false) => {
    let centered = {
      x: onMouse ? (s.mouseX - hovered_node_pos.x) : (s.width  / 2),
      y: onMouse ? (s.mouseY - hovered_node_pos.y) : (s.height / 2),
    };

    offset.x = - node.data.final_x * (1 + node_distance.x) * node_size.x + centered.x;
    offset.y = - node.data.y       * (1 + node_distance.y) * node_size.y + centered.y;
    zoom = 1;
  }

  s.mousePressed = () => {
    dragging = true;
    lastMouse.x = s.mouseX;
    lastMouse.y = s.mouseY;

    if (hovered_node_id != -1) {
      let pressed_node = s.tree.get(hovered_node_id);
      toggleCollapse(pressed_node);  
    }
  }

  s.mouseDragged = () => {
    if (dragging) {
      offset.x += (s.mouseX - lastMouse.x);
      offset.y += (s.mouseY - lastMouse.y);
      lastMouse.x = s.mouseX;
      lastMouse.y = s.mouseY;
    }
  }

  s.mouseReleased = () => {
    dragging = false;
  }

  s.mouseWheel = (event) => {
    zoom += sensitivity * -event.delta;
    zoom = s.constrain(zoom, zMin, zMax);
    return false;
  }

  s.handleHover = () => {
    if (s.mouseX > 0 && s.mouseY > 0 && s.mouseX < s.width && s.mouseY < s.height && s.tree) {
      for (var i = 0; i < s.tree.nodes.length; i++) {
        let node = s.tree.nodes[i];
        let bounds = {
          x_min:  (node.data.final_x * (1 + node_distance.x) * node_size.x) * zoom + offset.x,
          y_min:  (node.data.y       * (1 + node_distance.y) * node_size.y) * zoom + offset.y,
          width:  node_size.x * zoom,
          height: node_size.y * zoom      
        };

        if (s.mouseX > bounds.x_min && s.mouseY > bounds.y_min 
          && s.mouseX < (bounds.x_min + bounds.width) 
          && s.mouseY < (bounds.y_min + bounds.height)) {
          hovered_node_id = node.id;
          hovered_node_pos = {
            x: s.mouseX - bounds.x_min,
            y: s.mouseY - bounds.y_min};
          return;
        }
      }
    }

    hovered_node_id = -1;
    hovered_node_pos = {x: 0, y: 0};
  }
};

let tree_vis_p5 = new p5(vis, "tree_vis");
