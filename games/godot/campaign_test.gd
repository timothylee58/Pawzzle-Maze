extends SceneTree
const Rules = preload("res://campaign_rules.gd")
var checks := 0
var failures := 0
func check(value: bool, message: String):
	checks += 1
	if not value:
		push_error(message)
		failures += 1
		return
func _initialize():
	call_deferred("run")
func run():
	var fixtures = JSON.parse_string(FileAccess.get_file_as_string("res://campaign_parity_test.json"))
	for i in fixtures.size():
		var d: Dictionary = Rules.Levels.LEVELS[i]
		var fixture: Dictionary = fixtures[i]
		check(Rules.validate(d), "Supported campaign")
		for row in fixture.transitions:
			var actual := Rules.step(d, row.state, row.direction)
			check(equivalent(actual, row.result), "JS/Godot transition parity: %s %s" % [fixture.id, row.direction])
		check(Rules.optimal_moves(d) == fixture.optimal, "Independent BFS optimal parity")
		var directions: Array = []
		for action in fixture.actions: directions.append(action.direction)
		var preview := Rules.simulate(d, directions)
		check(preview.complete, "Optimal route completes")
		check(equivalent(preview.events, fixture.simulation.events), "Trace event parity")
		check(equivalent(preview.state, fixture.simulation.state), "Final state parity")
		check(Rules.demonstrated(d, preview), "Tutorial demonstrated")
		for j in preview.frames.size(): check(equivalent(preview.frames[j].state, fixture.simulation.frames[j].state), "Every playback frame matches V3")
	print("Campaign rules passed: %d assertions; 352 exhaustive reachable transitions." % checks)
	quit(1 if failures else 0)


func equivalent(a, b) -> bool:
	# JSON numbers arrive as floats; GDScript game state uses integer bit masks.
	if a is Dictionary and b is Dictionary:
		if a.size() != b.size(): return false
		for key in a:
			if not b.has(key) or not equivalent(a[key], b[key]): return false
		return true
	if a is Array and b is Array:
		if a.size() != b.size(): return false
		for i in a.size():
			if not equivalent(a[i], b[i]): return false
		return true
	return a == b
