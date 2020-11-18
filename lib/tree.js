class Tree {
	constructor(root) {
		root.id = 0;
		this.nodes = [root];
	}

	get(id) {
		return this.nodes[id];
	}

	insert(node, parent) {
		node.id = this.nodes.length;
		node.parent_id = parent.id;
		this.nodes.push(node);
		this.nodes[node.parent_id].children_id.push(node.id);
	}

	remove(node) {
		let removed_ids = this.remove_rec(node);

		this.nodes = this.nodes.filter((f) => f);

		for (var i = 0; i < this.nodes.length; i++) {
			let removed_before_id = this.removed_before(this.nodes[i].id, removed_ids);
			this.nodes[i].id -= removed_before_id;

			let removed_before_parent_id = this.removed_before(this.nodes[i].parent_id, removed_ids);
			this.nodes[i].parent_id -= removed_before_parent_id;

			for (var j = 0; j < this.nodes[i].children_id.length; j++) {
				let removed_before_children_id = this.removed_before(this.nodes[i].children_id[j], removed_ids);
				this.nodes[i].children_id[j] -= removed_before_children_id;
			}
		}
	}

	remove_rec(node) {
		let removed = [];

		if (node.isRoot()) return removed;

		let children = this.getChildren(node).slice();
		for (var i = 0; i < children.length; i++) {
			if (children[i]) {
				removed = removed.concat(this.remove_rec(children[i]));
			}
		}

		let parent_children = this.getParent(node).children_id;

		let index_of_in_parent = parent_children.indexOf(node.id);
		
		if (index_of_in_parent == -1) return;

		this.getParent(node).children_id.splice(index_of_in_parent, 1);
		this.nodes[node.id] = null;

		removed.push(node.id);

		return removed;
	}

	removed_before(id, removed_id) {
		let num = 0;
		for (var i = 0; i < removed_id.length; i++) {
			if (removed_id[i] < id) {
				num += 1;
			}
		}
		return num;
	}

	update(node, new_data) {
		this.nodes[node.id].data = new_data;
	}

	getParent(node) {
		return this.nodes[node.parent_id];
	}

	getChildren(node) {
		if (!node) return [];
		let arr = [];
		for (var i = 0; i < node.children_id.length; i++) {
			arr.push(this.nodes[node.children_id[i]]);
		}
		return arr;
	}

	getSiblings(node) {
		return this.getChildren(this.getParent(node));
	}

	getRoot() {
		return this.get(0);
	}

	// getSubtree() {
	// 	let new_tree = ;
	// }

	copy() {
		let arr = []
		for (var i = 0; i < this.nodes.length; i++) {
			arr.push(this.nodes[i].copy());
		}
		let new_tree = new Tree(arr[0]);
		new_tree.nodes = arr.slice();
		return new_tree;
	}
}

class Node {
	constructor (data, id=-1, children_id=[], parent_id=-1) {
		this.data = data;
		this.id = id;
		this.children_id = children_id;
		this.parent_id = parent_id;
	}

	copy() {
		return new Node(this.data, this.id, this.children_id.slice(), this.parent_id);
	}

    hasNChildren(n) {
    	return this.children_id.length == n;
    }

    isLeaf() {
        return this.hasNChildren(0);
    }

    isRoot() {
        return this.id == 0;
    }
}