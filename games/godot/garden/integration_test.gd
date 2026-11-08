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
	root.size = Vector2i(1280, 900)
	root.add_child(game)
	await process_frame
	var original: Dictionary = game.saves.duplicate(true)
	game.saves = {"bests": {}, "muted": false}
	game.level = game.rules.generate_legacy(6, "PAW-1024")
	game.optimal = game.rules.solve(game.level).size()
	game.restart()
	var initial: Dictionary = game.state.duplicate()
	var original_seed: String = game.level.seed
	for index in [0, 1, 2]:
		game.direction_buttons[index].pressed.emit()
		check(game.state == initial and game.history.is_empty() and game.timer_running and not game.begun, "blocked arrow has no side effects")
		check(game.level.seed == original_seed and game.scroll.visible and not game.help_cover.visible, "arrow preserves screen and puzzle")
	game.direction_buttons[3].pressed.emit()
	check(game.state.pos == 1 and game.state.moves == 1 and game.history.size() == 1, "right button moves exactly one tile")
	var elapsed_before_undo: float = game.elapsed
	await click_button(game.undo_button)
	check(game.state == initial and game.history.is_empty() and game.undo_button.disabled, "Undo restores position, inventory and moves")
	check(game.elapsed >= elapsed_before_undo and game.timer_running, "Undo does not rewind timer")
	game.undo()
	check(game.state == initial, "empty Undo has no effect")
	game.restart()
	game._process(5.0)
	check(game.elapsed == 5, "timer runs before first move")
	var route: Array = game.rules.solve(game.level)
	game.step(route[0])
	game._process(2.0)
	check(game.state.moves == 1 and game.elapsed >= 7, "movement preserves running timer")
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
	check(game.help_back.text.is_empty() and game.help_back.icon != null, "help back uses icon only")
	await click_button(game.help_back)
	check(not paused and not game.help_cover.visible and game.scroll.visible and not game.board.blur_layer.visible, "help returns to game and clears blur")
	game.restart()
	check(game.elapsed == 0 and game.timer_running, "restart resets and starts timer")
	for to in route: game.step(to)
	check(game.overlay.visible and game.rules.won(game.level, game.state), "complete puzzle")
	check(not game.timer_running, "timer stops at win")
	check(game.minimum_label.text == "Minimum steps: %d" % route.size(), "sidebar displays start optimum")
	check(game.result.text.contains("Your steps: %d" % route.size()) and game.result.text.contains("Minimum steps: %d" % route.size()) and game.result.text.contains("Perfect route!"), "completion compares actual and minimum steps")
	check(game.saves.bests[game.best_key()] == route.size(), "best stored")
	game.saves = {"bests": {}, "muted": false}
	game._load_save()
	check(game.saves.bests[game.best_key()] == route.size(), "reload best")

	await click_button(game.win_restart)
	check(not game.overlay.visible and game.state.pos == 0 and not game.board.locked, "real click: Play again resets and unlocks")
	for to in route: game.step(to)
	await click_button(game.win_next)
	check(not game.overlay.visible and game.level.seed != original_seed and not game.board.locked, "real click: Another adventure generates and unlocks")
	game.mode_select.select(1)
	game._mode_changed(1)
	check(game.level.hard and game.mode_select.get_item_text(1) == "Hard mode", "mode selector generates hard puzzle")
	game.mode_select.select(0)
	game._mode_changed(0)
	game.level = game.rules.generate_legacy(6, "PAW-1024")
	game.restart()
	var board = game.board
	await process_frame
	await process_frame
	var touch := InputEventScreenTouch.new()
	touch.index = 0
	touch.pressed = true
	touch.position = board.get_global_transform_with_canvas() * (board.board_rect.position + Vector2(0.5, 0.5) * board.cell_size)
	board._input(touch)
	check(board.dragging, "touch grabs dog")
	var drag := InputEventScreenDrag.new()
	drag.index = 0
	drag.position = board.get_global_transform_with_canvas() * (board.board_rect.position + Vector2(2.5, 0.5) * board.cell_size)
	board._input(drag)
	check(game.state.pos == 2 and game.state.moves == 2, "fast touch drag crosses open tiles")
	touch.pressed = false
	board._input(touch)
	check(not board.dragging, "lift ends drag")
	game.restart()
	touch.pressed = true
	board._input(touch)
	drag.position = board.get_global_transform_with_canvas() * (board.board_rect.position + Vector2(0.5, 2.5) * board.cell_size)
	board._input(drag)
	check(game.state.pos == 0 and not board.dragging, "drag cannot cross hedge")
	touch.position = board.get_global_transform_with_canvas() * (board.board_rect.position + Vector2(1.5, 0.5) * board.cell_size)
	board._input(touch)
	check(game.state.pos == 1, "touch tap moves to adjacent tile")
	game._toggle_sound()
	check(AudioServer.is_bus_mute(0), "mute")
	gpx.set_pause_reason("browser", true)
	gpx.set_pause_reason("browser", false)
	check(AudioServer.is_bus_mute(0), "mute survives pause")
	check(game.size_select.item_count == 10, "sizes 5 through 14")
	check(game.sidebar.get_child_count() == 1, "checklist removed")
	for n in range(5, 15):
		game.size_select.select(n - 5)
		game.generate()
		check(is_equal_approx(game.board.cell_size * n, game.board.board_rect.size.x) and game.board.board_rect.end.x <= game.board.size.x and game.board.board_rect.end.y <= game.board.size.y, "entire grid fits size %d" % n)
		check(game.timer_running and game.elapsed == 0, "generation starts timer %d" % n)
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

	check(game.timer_label.text == "(0 seconds)", "timer displays elapsed seconds")
	for n in range(5, 15):
		for sample in 100:
			for hard in [false, true]:
				var puzzle: Dictionary = game.rules.generate(n, "verified-%d-%d" % [n, sample], hard)
				var seen := {0: true}
				var current: Dictionary = game.rules.initial()
				var valid := true
				for cell in puzzle.route:
					if seen.has(cell) or (cell == puzzle.key and current.mask != 7): valid = false
					seen[cell] = true
					current = game.rules.move(puzzle, current, cell)
					if current.is_empty():
						valid = false
						break
				var quadrants := {}
				for item in puzzle.items + [puzzle.key]:
					var region := int(item % n >= n / 2) + 2 * int(item / n >= n / 2)
					quadrants[region] = true
				check(quadrants.size() == 4, "one collectible in each quadrant")
				var distance := {puzzle.home: 0}
				var queue: Array = [puzzle.home]
				for cursor in range(n * n):
					if cursor >= queue.size(): break
					for neighbor in puzzle.edges[queue[cursor]]:
						if not distance.has(neighbor):
							distance[neighbor] = distance[queue[cursor]] + 1
							queue.append(neighbor)
				var closer_bone := false
				for bone in puzzle.items:
					if distance[bone] < distance[puzzle.key] and (n - 1 - bone % n) + (n - 1 - bone / n) < (n - 1 - puzzle.key % n) + (n - 1 - puzzle.key / n): closer_bone = true
				check(closer_bone, "a bone is strictly closer to home than key")
				check(valid and game.rules.won(puzzle, current), "no-backtrack route size %d sample %d hard %s" % [n, sample, hard])
	# Collect and undo each inventory transition in both modes.
	for hard in [false, true]:
		game.level = game.rules.generate(8, "undo-inventory", hard)
		game.optimal = game.rules.solve_result(game.level).minimum_steps
		game.restart()
		for cell in game.level.route:
			var before: Dictionary = game.state.duplicate()
			game.step(cell)
			if game.rules.won(game.level, game.state): break
			if before.mask != game.state.mask or before.key != game.state.key:
				game.undo()
				check(game.state == before, "Undo restores collected bone/key in both modes")
				game.step(cell)
	game.restart()
	var verified: Dictionary = game.rules.generate(6, "negative-validation", true)
	check(not game.rules.validate_route(verified, []), "reject incomplete route")
	check(not game.rules.validate_route(verified, [verified.route[0], 0] + verified.route), "reject backtracking")
	var swapped: Dictionary = verified.duplicate(true)
	swapped.key = verified.items[0]
	swapped.items[0] = verified.key
	check(not game.rules.validate_route(swapped, verified.route), "reject key before all bones")
	await click_button(game.pause_button)
	check(paused and game.board.blur_layer.visible and game.pause_button.tooltip_text == "Resume", "pause icon toggles to play")
	await click_button(game.pause_button)
	check(not paused and not game.board.blur_layer.visible and game.pause_button.tooltip_text == "Pause", "play icon resumes")

	check(game.setup_panel.get_parent() == game.sidebar, "settings remain in left sidebar")
	check(game.directions.get_global_rect().end.y <= game.board.get_global_rect().position.y, "arrows above board")
	for dimensions in [Vector2i(1280, 900), Vector2i(640, 480), Vector2i(390, 844), Vector2i(320, 640)]:
		root.size = dimensions
		await process_frame
		await process_frame
		await process_frame
		var rect: Rect2 = game.board.get_global_rect()
		check(rect.end.x <= game.size.x + 1 and rect.end.y <= game.size.y + 1, "board fits viewport %s" % dimensions)
		check(game.board.board_rect.size.x > 0 and game.board.board_rect.end.x <= game.board.size.x + 1 and game.board.board_rect.end.y <= game.board.size.y + 1, "all cells visible %s" % dimensions)

	# Circular controls share a centerline, with real invisible spacing.
	root.size = Vector2i(1280, 900)
	await process_frame
	await process_frame
	for control in game.direction_buttons + [game.undo_button, game.restart_button, game.sound, game.pause_button, game.help_back]:
		check(is_equal_approx(control.size.x, control.size.y), "icon control is circular, not elliptical")
	check(absf(game.timer_label.get_global_rect().get_center().y - game.pause_button.get_global_rect().get_center().y) < 1, "all toolbar controls align horizontally")
	check(game.directions.global_position.x - game.timer_label.get_global_rect().end.x >= 18, "timer group has invisible divider")
	check(game.undo_button.global_position.x - game.directions.get_global_rect().end.x >= 18, "arrows group has invisible divider")
	check(game.size_select.alignment == HORIZONTAL_ALIGNMENT_CENTER, "dropdown text centered")
	check(game.theme.default_font.base_font.resource_path.ends_with("Fredoka.ttf"), "Fredoka is the game theme")

	for mode in 3:
		game.mode_select.select(mode)
		game._mode_changed(mode)
		var original_state: Dictionary = game.state.duplicate(true)
		var original_elapsed: float = game.elapsed
		game._show_help()
		check(paused and game.tutorial_state.pos == 0, "tutorial opens fresh and pauses main game")
		game._tutorial_move(Vector2i.UP)
		check(game.tutorial_state.pos == 0, "tutorial vertical arrow cannot move")
		for i in 9:
			await click_button(game.tutorial_buttons[3])
		check(game.rules.won(game.tutorial_level, game.tutorial_state), "tutorial solved with real arrow clicks in each mode")
		check(game.state == original_state and game.elapsed == original_elapsed, "tutorial leaves main puzzle and timer unchanged")
		await click_button(game.help_back)
		check(not paused and game.scroll.visible, "circular back returns to game")
		if mode == 2:
			var route_brutal: Array = game.level.brutal_solution
			game.step(route_brutal[0])
			var after_step: Dictionary = game.state.duplicate(true)
			game.step(0)
			check(game.state == after_step, "Brutal blocks a revisit without side effects")
			game.undo()
			check(game.state.visited == [0], "Undo restores Brutal visited cells")
			game.step(route_brutal[0])
			check(game.state.pos == route_brutal[0], "Undone cell becomes available again")
			game.restart()
			check(game.state.visited == [0], "restart clears Brutal path")
	game.saves = original
	game._save()
	game.queue_free()
	await create_timer(0.1).timeout
	print("Garden integration: %d checks; %d failures." % [checks, failures])
	quit(1 if failures else 0)

func click_button(control: Button) -> void:
	await process_frame
	await process_frame
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.position = control.get_global_rect().get_center()
	click.global_position = click.position
	click.pressed = true
	root.push_input(click, true)
	await process_frame
	click = click.duplicate()
	click.pressed = false
	root.push_input(click, true)
	await process_frame
