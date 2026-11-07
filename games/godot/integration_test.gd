extends SceneTree
func _initialize():
	call_deferred("run")
func run():
	var game = load("res://main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	await process_frame
	assert(game.overlay.visible)
	assert(game.round_model == null)
	game.start_round()
	assert(not game.overlay.visible)
	assert(game.round_model != null)
	var platform = root.get_node("GPX")
	var deadline_before: int = game.round_model.deadline
	var start_before: int = game.round_model.started
	AudioServer.set_bus_mute(0, true)
	platform.set_pause_reason("sdk", true)
	platform.set_pause_reason("hidden", true)
	assert(paused and AudioServer.is_bus_mute(0))
	assert(not game.step(int(game.maze.optimal[1])))
	# Deadline uses wall-clock ticks, not accelerated headless frame deltas.
	OS.delay_msec(50)
	platform.set_pause_reason("sdk", false)
	assert(paused, "Visibility pause must survive an SDK resume")
	platform.set_pause_reason("hidden", false)
	assert(not paused and AudioServer.is_bus_mute(0), "Preserve the user's mute state")
	assert(game.round_model.deadline >= deadline_before + 30)
	assert(game.round_model.started >= start_before + 30)
	# Bring the test clock back before completing the route.
	game.round_model.deadline = deadline_before
	game.round_model.started = start_before
	AudioServer.set_bus_mute(0, false)
	platform.set_pause_reason("sdk", true)
	platform.set_pause_reason("sdk", true)
	platform.set_pause_reason("sdk", false)
	assert(not paused and not AudioServer.is_bus_mute(0))
	var optimal: Array = game.maze.optimal.duplicate()
	var key := InputEventKey.new()
	key.pressed = true
	var direction: int = optimal[1]-optimal[0]
	key.keycode = KEY_RIGHT if direction == 1 else KEY_DOWN
	game.board._gui_input(key)
	assert(game.route.size() == 2)
	for cell in optimal.slice(2):
		assert(game.step(cell))
	assert(game.round_model.finished)
	assert(game.round_model.attempts == 1)
	assert(game.round_model.best.extra == 0)
	assert(game.result.text.contains("Perfectly done."))
	assert(game.clear_button.disabled)
	game.show_optimal = true
	game.refresh()
	await process_frame
	await process_frame
	if "--capture" in OS.get_cmdline_user_args():
		await RenderingServer.frame_post_draw
		var image := root.get_texture().get_image()
		image.save_png(ProjectSettings.globalize_path("res://../godot-preview.png"))
	print("PASS: sprites, complete round, scoring, results, paused input, overlapping pause reasons, frozen deadline and audio restore")
	quit()
