extends SceneTree
const Rules = preload("res://garden/rules.gd")
var rules = Rules.new()
var checks := 0
var failures := 0

func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		printerr("FAIL " + message)

# Independent enumeration on small boards; no production transitions/search.
func oracle(level: Dictionary, pos: int = 0, mask: int = 0, key: bool = false, visited: Array = [0]) -> int:
	if pos == level.home and mask == 7 and key: return 0
	var best := 99999
	for next in level.edges[pos]:
		if visited.has(next) or (next == level.home and not key): continue
		var next_mask := mask
		for i in 3:
			if next == level.items[i]: next_mask |= 1 << i
		var next_key: bool = key or (next == level.key and mask == 7)
		var distance := oracle(level, next, next_mask, next_key, visited + [next])
		if distance >= 0: best = mini(best, distance + 1)
	return -1 if best == 99999 else best

func verify(level: Dictionary) -> void:
	check(level.brutal and level.hard, "Brutal includes Hard")
	check(rules.placement_valid(level), "quadrants and nearest-item constraints")
	var answer: Dictionary = rules.solve_result(level)
	var relaxed := level.duplicate(true)
	relaxed.brutal = false
	var lower_bound: Dictionary = rules.solve_result(relaxed)
	check(answer.minimum_steps == lower_bound.minimum_steps, "simple route attains relaxed lower bound, proving optimum")
	var state: Dictionary = rules.initial(level)
	var visited := {0: true}
	for cell in answer.route:
		check(not visited.has(cell), "winning route never repeats")
		visited[cell] = true
		var old: Dictionary = state.duplicate(true)
		state = rules.move(level, state, cell)
		check(not state.is_empty(), "certified move legal")
		if state.is_empty(): return
		check(rules.move(level, state, old.pos).is_empty(), "cannot retrace previous edge")
		check(old.visited.size() + 1 == state.visited.size(), "visited history copied without mutation")
	check(rules.won(level, state), "Brutal route wins")

func _initialize() -> void:
	var maximum_ms := 0.0
	for n in range(5, 15):
		for sample in 10:
			var began := Time.get_ticks_usec()
			var level: Dictionary = rules.generate(n, "BRUTAL-%d" % sample, true, true)
			maximum_ms = maxf(maximum_ms, (Time.get_ticks_usec() - began) / 1000.0)
			verify(level)
		verify(rules._brutal_fallback(n, "fallback-%d" % n))
	var random := RandomNumberGenerator.new()
	random.seed = 810
	for sample in 30:
		var edges: Array = []
		for p in 9: edges.append([])
		for p in 9:
			for q in rules.neighbors(p, 3):
				if q > p and random.randf() < 0.75:
					edges[p].append(q)
					edges[q].append(p)
		var level := {"size": 3, "edges": edges, "items": [1, 3, 4], "key": 6, "home": 8, "hard": true, "brutal": true}
		var answer: Dictionary = rules.solve_result(level)
		check(answer.minimum_steps == oracle(level), "history-aware BFS matches independent exhaustive oracle")
	print("Brutal: %d checks; %d failures; slowest generation %.2f ms." % [checks, failures, maximum_ms])
	quit(1 if failures else 0)
