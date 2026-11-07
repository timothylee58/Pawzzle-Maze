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
	print("PASS: complete Godot round, perfect scoring, results, disabled editing, optimal overlay")
	quit()
