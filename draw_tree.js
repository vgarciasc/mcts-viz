//Heavily based on https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/

function prepareTree(tree, configs) {
	tree.get(0).data.y = 0;

	//first traversal
	calculateInitialValues(tree, tree.get(0), 0, configs);
	// checkAllChildrenOnScreen(tree, tree.get(0));
	calculateFinalValues(tree, tree.get(0), 0, configs);

	return tree;
}

function calculateInitialValues(tree, node, sibling_idx = 0, configs) {
	let parent = tree.getParent(node);
	let children = tree.getChildren(node);

	for (var i = 0; i < children.length; i++) {
		let child = children[i];

		child.data.y = node.data.y + 1;

		calculateInitialValues(tree, child, i, configs);
	}

	node.data.final_x = 0;
	node.data.mod = 0;

	if (node.isLeaf()) {
		if (sibling_idx == 0) {
			node.data.x = 0;
		}
		else {
			node.data.x = sibling_idx;	
		}
	}
	else if (node.hasNChildren(1)) {
		if (sibling_idx == 0) {
			node.data.x = children[0].data.x;
		}
		else {
			node.data.x = tree.getSiblings(node)[sibling_idx - 1].data.x + 1;
			node.data.mod = node.data.x - children[0].data.x;
		}
	}
	else {
		let left_child = children[0];
		let right_child = children[children.length - 1];
		let mid = (left_child.data.x + right_child.data.x) / 2;

		if (sibling_idx == 0) {
			node.data.x = mid;
		} else {
			node.data.x = tree.getSiblings(node)[sibling_idx - 1].data.x + 1;
			node.data.mod = node.data.x - mid;
		}
	}

	fixConflicts(tree, node, sibling_idx, configs);
}
	
function calculateFinalValues(tree, node, mod_sum, configs) {
	node.data.final_x = node.data.x + mod_sum;

	let children = tree.getChildren(node);
	for (var i = 0; i < children.length; i++) {
		calculateFinalValues(tree, children[i], node.data.mod + mod_sum, configs);
	}
}

function fixConflicts(tree, node, sibling_idx = 0, configs = {min_distance: 1}) {
	let min_distance = configs.min_distance;

	let children = tree.getChildren(node);
	let shift_value = 0;

	let node_contour = getLeftContour(tree, node, 0, {});
	let node_contour_lvls = Object.keys(node_contour).map((f) => parseInt(f));
	let node_contour_max_lvl = Math.max.apply(Math, node_contour_lvls);

	let siblings = tree.getSiblings(node);

	for (var i = 0; i < sibling_idx; i++) {
		let sibling = siblings[i];

		let sibling_contour = getRightContour(tree, sibling, 0, {});
		let sibling_contour_lvls = Object.keys(sibling_contour).map((f) => parseInt(f));
		let sibling_contour_max_lvl = Math.max.apply(Math, sibling_contour_lvls);

		for (var lvl = node.data.y; lvl <= Math.min(node_contour_max_lvl, sibling_contour_max_lvl); lvl++) {
			let distance = node_contour[lvl] - sibling_contour[lvl];
			if (distance + shift_value < min_distance) {
				shift_value = Math.max(min_distance - distance, shift_value);
			}
		}
	}

	if (shift_value > 0) {
		node.data.x += shift_value;
		node.data.mod += shift_value;
		shift_value = 0;
	}
}

function centerNodesBetween(tree, left_node, left_node_idx, right_node, right_node_idx, siblings, shift_value) {
	let num_nodes_between = (right_node_idx - left_node_idx) - 1;

	if (num_nodes_between > 0) {
		let distance_between_nodes = (right_node.data.x + shift_value - left_node.data.x) / (num_nodes_between + 1);

		let count = 1;
		for (var i = left_node_idx + 1; i < right_node_idx; i++) {
			let middle_node = siblings[i];

			let desired_x = left_node.data.x + (distance_between_nodes * count);
			let offset = desired_x - middle_node.data.x;
			middle_node.data.x += offset;
			middle_node.data.mod += offset;

			count++;
		}
		
		fixConflicts(tree, left_node, left_node_idx);
	}
}

function checkAllChildrenOnScreen(tree, root) {
	let root_contours = getLeftContour(tree, root, 0, {});

	let shift_value = 0;
	let lvls = Object.keys(root_contours);
	for (var i = 0; i < lvls.length; i++) {
		if (root_contours[lvls[i]] + shift_value < 0) {
			shift_value += (root_contours[lvls[i]] * -1);
		}
	}

	if (shift_value > 0) {
		root.data.x += shift_value;
		root.data.mod += shift_value;
	}
}

function getLeftContour(tree, node, mod_sum, contours) {
	if (contours[node.data.y] == null) {
		contours[node.data.y] = node.data.x + mod_sum;
	} else {
		contours[node.data.y] = Math.min(contours[node.data.y], node.data.x + mod_sum);
	}

	mod_sum += node.data.mod;

	let children = tree.getChildren(node);
	for (var i = 0; i < children.length; i++) {
		contours = getLeftContour(tree, children[i], mod_sum, contours);
	}

	return contours;
}

function getRightContour(tree, node, mod_sum, contours) {
	if (contours[node.data.y] == null) {
		contours[node.data.y] = node.data.x + mod_sum;
	} else {
		contours[node.data.y] = Math.max(contours[node.data.y], node.data.x + mod_sum);
	}

	mod_sum += node.data.mod;

	let children = tree.getChildren(node);
	for (var i = 0; i < children.length; i++) {
		contours = getRightContour(tree, children[i], mod_sum, contours);
	}

	return contours;
}

function postorder_draw(tree, node, node_size, render_func) {
	let children = tree.getChildren(node);
	for (var i = 0; i < children.length; i++) {
		let child = children[i];
		postorder_draw(tree, child, node_size, render_func);
	}

	push();
	translate(
		node.data.final_x * 2 * node_size.x,
		node.data.y * 2 * node_size.y);
	render_func(node, node_size);

	//drawing edges
	line(node_size.x / 2, 0, node_size.x / 2, - node_size.y/2);
	if (children.length > 0) {
		line(node_size.x / 2, node_size.y, node_size.x / 2, node_size.y * 1.5);
	}
	pop();

	//drawing edges
	if (children.length > 0) {
		line((children[0].data.final_x * 2 + 1/2) * node_size.x,
			 (2 * node.data.y + 3/2) * node_size.y,
			 (children[children.length - 1].data.final_x * 2+ 1/2) * node_size.x,
			 (2 * node.data.y + 3/2) * node_size.y);
	}
}