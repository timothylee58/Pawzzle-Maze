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
	game.restart()
	var route: Array = game.rules.solve(game.level)
	var old: Dictionary = game.state.duplicate()
	game.step(route[0])
	check(game.state.moves == 1, "move")
	game.undo()
	check(game.state == old, "undo state")
	game.show_hint()
	check(game.assisted and game.hint_cell == route[0], "hint")
	for to in route: game.step(to)
	check(game.overlay.visible and game.rules.won(game.level, game.state), "win")
	check(game.saves.bests.is_empty(), "assisted excluded")
	game.restart()
	for to in route: game.step(to)
	check(game.saves.bests[game.best_key()] == route.size(), "best stored")
	game.saves = {"bests": {}, "muted": false}
	game._load_save()
	check(game.saves.bests[game.best_key()] == route.size(), "reload best")
	game.restart()
	var gpx = root.get_node("GPX")
	gpx.set_pause_reason("manual", true)
	game.step(route[0])
	check(game.state.moves == 0 and game.pause_cover.visible, "paused input")
	gpx.set_pause_reason("browser", true)
	gpx.set_pause_reason("manual", false)
	check(paused, "overlapping pauses")
	gpx.set_pause_reason("browser", false)
	check(not paused and not game.pause_cover.visible, "resume")
	game._toggle_sound()
	check(AudioServer.is_bus_mute(0), "mute")
	gpx.set_pause_reason("browser", true)
	gpx.set_pause_reason("browser", false)
	check(AudioServer.is_bus_mute(0), "mute preserved")
	# Undo after every pickup must restore complete inventory.
	game.restart()
	for to in route:
		old = game.state.duplicate()
		game.step(to)
		if not game.overlay.visible:
			game.undo()
			check(game.state == old, "undo inventory")
			game.step(to)
	game.saves = original
	game._save()
	game.music.stop()
	game.music.stream = null
	game.queue_free()
	await create_timer(0.1).timeout
	print("Garden integration: %d checks; %d failures." % [checks, failures])
	quit(1 if failures else 0)
