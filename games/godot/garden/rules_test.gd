extends SceneTree
const Rules = preload("res://garden/rules.gd")
var checks := 0
var failures := 0
func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		printerr("FAIL: " + message)
		failures += 1
func _initialize() -> void:
	var rules = Rules.new()
	var fixtures = JSON.parse_string(FileAccess.get_file_as_string("res://garden/parity.json"))
	for fixture in fixtures:
		var expected: Dictionary = fixture.level
		var level: Dictionary = rules.generate(int(expected.size), expected.seed)
		check(JSON.parse_string(JSON.stringify(level.edges)) == expected.edges, "edges " + expected.seed)
		check(JSON.parse_string(JSON.stringify(level.items)) == expected.items and level.key == expected.key, "objects " + expected.seed)
		var solution: Array = rules.solve(level)
		check(JSON.parse_string(JSON.stringify(solution)) == fixture.route, "shortest route " + expected.seed)
		var state: Dictionary = rules.initial()
		check(not rules.won(level, state), "initial is not win")
		check(rules.move(level, state, -1).is_empty(), "invalid move")
		var before_home := {"pos": level.edges[level.home][0], "mask": 7, "key": false, "moves": 0}
		check(rules.move(level, before_home, level.home).is_empty(), "locked home")
		check(not rules.won(level, {"pos": level.home, "mask": 3, "key": true, "moves": 5}), "missing bone")
		for to in solution:
			var previous: Dictionary = state.duplicate()
			state = rules.move(level, state, to)
			check(not state.is_empty(), "solution step")
			check(state.moves == previous.moves + 1, "move count")
		check(rules.won(level, state), "complete")
		check(state.moves == solution.size(), "optimal moves")
	print("Garden parity: %d checks across %d puzzles; %d failures." % [checks, fixtures.size(), failures])
	quit(1 if failures else 0)
