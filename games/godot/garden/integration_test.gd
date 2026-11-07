extends SceneTree
var failures := 0
var checks := 0
func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL " + message)
func _initialize() -> void:
	call_deferred("run")
func run() -> void:
	var game = load("res://garden/main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	var original: Dictionary = game.saves.duplicate(true)
	game.saves = {"bests": {}, "muted": false}
	game.level = game.rules.generate(6, "PAW-1024")
	game.optimal = game.rules.solve(game.level).size()
	game.restart()
	var initial: Dictionary = game.state.duplicate()
	var original_seed: String = game.level.seed
	for index in [0, 1, 2]:
		game.direction_buttons[index].pressed.emit()
		check(game.state == initial and game.history.is_empty() and not game.timer_running and not game.begun, "blocked arrow has no side effects")
		check(game.level.seed == original_seed and game.scroll.visible and not game.help_cover.visible, "arrow preserves screen and puzzle")
	game.direction_buttons[3].pressed.emit()
	check(game.state.pos == 1 and game.state.moves == 1 and game.history.size() == 1, "right button moves exactly one tile")
	game.restart()
	game._process(5.0)
	check(game.elapsed == 0, "timer waits for first move")
	var route: Array = game.rules.solve(game.level)
	game.step(route[0])
	game._process(2.0)
	check(game.state.moves == 1 and game.elapsed >= 2, "first move starts timer")
	var gpx = root.get_node("GPX")
	gpx.set_pause_reason("manual", true)
	var frozen: float = game.elapsed
	game._process(5.0)
	game.step(route[1])
	check(game.elapsed == frozen and game.state.moves == 1 and game.board.blur_layer.visible, "pause freezes timer/input and enables blur")
	gpx.set_pause_reason("browser", true)
	gpx.set_pause_reason("manual", false)
	check(paused, "overlapping pauses")
	gpx.set_pause_reason("browser", false)
	game._show_help()
	check(paused and game.help_cover.visible and not game.pause_cover.visible, "help pauses with its own overlay")
	game._hide_help()
	check(not paused and not game.help_cover.visible and game.scroll.visible and not game.board.blur_layer.visible, "help returns to game and clears blur")
	game.restart()
	check(game.elapsed == 0 and not game.timer_running, "restart resets timer")
	for to in route: game.step(to)
	check(game.overlay.visible and game.rules.won(game.level, game.state), "complete puzzle")
	check(not game.timer_running, "timer stops at win")
	check(game.saves.bests[game.best_key()] == route.size(), "best stored")
	game.saves = {"bests": {}, "muted": false}
	game._load_save()
	check(game.saves.bests[game.best_key()] == route.size(), "reload best")
	game.restart()
	var board = game.board
	board.board_rect = Rect2(0, 0, 600, 600)
	board.cell_size = 100
	var touch := InputEventScreenTouch.new()
	touch.index = 0
	touch.pressed = true
	touch.position = board.get_global_transform_with_canvas() * Vector2(50, 50)
	board._input(touch)
	check(board.dragging, "touch grabs dog")
	var drag := InputEventScreenDrag.new()
	drag.index = 0
	drag.position = board.get_global_transform_with_canvas() * Vector2(250, 50)
	board._input(drag)
	check(game.state.pos == 2 and game.state.moves == 2, "fast touch drag crosses open tiles")
	touch.pressed = false
	board._input(touch)
	check(not board.dragging, "lift ends drag")
	game.restart()
	touch.pressed = true
	board._input(touch)
	drag.position = board.get_global_transform_with_canvas() * Vector2(50, 250)
	board._input(drag)
	check(game.state.pos == 0 and not board.dragging, "drag cannot cross hedge")
	touch.position = board.get_global_transform_with_canvas() * Vector2(150, 50)
	board._input(touch)
	check(game.state.pos == 1, "touch tap moves to adjacent tile")
	game._toggle_sound()
	check(AudioServer.is_bus_mute(0), "mute")
	gpx.set_pause_reason("browser", true)
	gpx.set_pause_reason("browser", false)
	check(AudioServer.is_bus_mute(0), "mute survives pause")
	check(game.size_select.item_count == 10, "sizes 5 through 14")
	for n in range(5, 15):
		game.size_select.select(n - 5)
		game.generate()
		var previous_seed: String = game.level.seed
		game.generate()
		check(game.level.size == n and game.level.seed != previous_seed, "random new puzzle size %d" % n)
		for sample in 8:
			var level: Dictionary = game.rules.generate(n, "large-%d-%d" % [n, sample])
			var path: Array = game.rules.solve(level)
			var state: Dictionary = game.rules.initial()
			for cell in path:
				state = game.rules.move(level, state, cell)
			check(not path.is_empty() and game.rules.won(level, state), "solvable size %d sample %d" % [n, sample])
	# Hard mode: key remains until all 3 bones, even when crossing its tile.
	var hard_level: Dictionary = game.rules.generate(6, "hard-key-test", true)
	for mask in 8:
		var before := {"pos": hard_level.edges[hard_level.key][0], "mask": mask, "key": false, "moves": 0}
		var after: Dictionary = game.rules.move(hard_level, before, hard_level.key)
		check(not after.is_empty() and after.key == (mask == 7), "hard key gate mask %d" % mask)
	for n in range(5, 15):
		for sample in 8:
			var level: Dictionary = game.rules.generate(n, "hard-%d-%d" % [n, sample], true)
			var path: Array = game.rules.solve(level)
			var state: Dictionary = game.rules.initial()
			var valid_order := true
			for cell in path:
				state = game.rules.move(level, state, cell)
				if state.key and state.mask != 7: valid_order = false
			check(not path.is_empty() and game.rules.won(level, state) and valid_order, "hard solvable and ordered size %d sample %d" % [n, sample])
	check(game.timer_label.text == "00:00", "timer has no prefix")
	game.saves = original
	game._save()
	game.queue_free()
	await create_timer(0.1).timeout
	print("Garden integration: %d checks; %d failures." % [checks, failures])
	quit(1 if failures else 0)
