extends RefCounted

static func neighbors(cell: int, n: int) -> Array:
	var out: Array = []
	if cell % n > 0: out.append(cell - 1)
	if cell % n < n - 1: out.append(cell + 1)
	if cell >= n: out.append(cell - n)
	if cell < n * (n - 1): out.append(cell + n)
	return out

static func solve(graph: Array, start: int = 0, goal: int = -1, skip: Array = []) -> Array:
	if goal < 0: goal = graph.size() - 1
	var queue: Array = [start]
	var previous: Dictionary = {start: -1}
	var cursor := 0
	while cursor < queue.size():
		var cell: int = queue[cursor]
		cursor += 1
		if cell == goal:
			var route: Array = []
			while cell != -1:
				route.push_front(cell)
				cell = previous[cell]
			return route
		for next in graph[cell]:
			if previous.has(next) or (cell in skip and next in skip): continue
			previous[next] = cell
			queue.append(next)
	return []

static func has_alternate(graph: Array) -> bool:
	var route := solve(graph)
	for i in range(1, route.size()):
		if not solve(graph, 0, graph.size() - 1, [route[i-1], route[i]]).is_empty(): return true
	return false

static func generate(n: int, seed_value: int) -> Dictionary:
	var random := RandomNumberGenerator.new()
	random.seed = seed_value
	for trial in range(200):
		var graph: Array = []
		for i in n * n: graph.append([])
		var seen: Dictionary = {0: true}
		var stack: Array = [0]
		while not stack.is_empty():
			var cell: int = stack.back()
			var candidates: Array = []
			for next in neighbors(cell, n):
				if not seen.has(next): candidates.append(next)
			if candidates.is_empty():
				stack.pop_back()
				continue
			var next: int = candidates[random.randi_range(0, candidates.size()-1)]
			graph[cell].append(next)
			graph[next].append(cell)
			seen[next] = true
			stack.append(next)
		for i in n:
			var cell := random.randi_range(0, n*n-1)
			var candidates: Array = []
			for next in neighbors(cell,n):
				if not next in graph[cell]: candidates.append(next)
			if not candidates.is_empty():
				var next: int = candidates[random.randi_range(0,candidates.size()-1)]
				graph[cell].append(next)
				graph[next].append(cell)
		var optimal := solve(graph)
		if optimal.size()-1 > 2*(n-1)+2 and has_alternate(graph):
			return {"n": n,"graph": graph,"optimal": optimal,"seed": seed_value,"id": "godot-1-%s-%s" % [n,seed_value]}
	return {}

static func move(route: Array, cell: int, graph: Array) -> Array:
	if route.is_empty() or not cell in graph[route.back()]: return route
	var index := route.find(cell)
	if index >= 0: return route.slice(0,index+1)
	var result := route.duplicate()
	result.append(cell)
	return result

static func valid(route: Array, graph: Array) -> bool:
	if route.is_empty() or route.front() != 0 or route.back() != graph.size()-1: return false
	var seen: Dictionary = {}
	for i in route.size():
		if seen.has(route[i]): return false
		seen[route[i]] = true
		if i > 0 and not route[i] in graph[route[i-1]]: return false
	return true

static func crossed(a: Vector2, b: Vector2, n: int) -> Array:
	var x := int(floor(a.x))
	var y := int(floor(a.y))
	var end_x := int(floor(b.x))
	var end_y := int(floor(b.y))
	var d := b-a
	var sx := signi(int(sign(d.x)))
	var sy := signi(int(sign(d.y)))
	var tx := INF if is_zero_approx(d.x) else ((x+1 if sx > 0 else x)-a.x)/d.x
	var ty := INF if is_zero_approx(d.y) else ((y+1 if sy > 0 else y)-a.y)/d.y
	var out: Array = []
	for i in n*n:
		if x == end_x and y == end_y: break
		if abs(tx-ty) < 0.000001: break
		if tx < ty:
			x += sx
			tx += 1.0/abs(d.x)
		else:
			y += sy
			ty += 1.0/abs(d.y)
		if x < 0 or y < 0 or x >= n or y >= n: break
		out.append(y*n+x)
	return out
