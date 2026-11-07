extends SceneTree
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
	var game = load("res://main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	await process_frame
	var platform = root.get_node("GPX")
	check(game.level_index == 0 and not game.unlocked(1), "Tutorials initially locked")
	game.load_level(2)
	check(game.level_index == 0, "Locked level cannot be loaded")
	var fixtures = JSON.parse_string(FileAccess.get_file_as_string("res://campaign_parity_test.json"))
	for index in 3:
		game.load_level(index)
		check(game.level_index == index, "Completed tutorial unlocks next")
		game.start_playback()
		check(game.playback_index == -1, "Incomplete plan cannot submit")
		if index == 1:
			for direction in ["right", "down"]: game.add_direction(direction)
			check(not game.add_direction("right"), "Royal gate closed without delivery")
			game.clear_plan()
			for direction in ["right", "right", "left", "down"]: game.add_direction(direction)
			check(game.preview.state.fulfilledRequestMask == 1, "Treat consumed on delivery")
			game.undo()
			check(game.preview.state.fulfilledRequestMask == 0 and game.preview.state.carriedDiscoveryMask == 1, "Undo restores carried treat and closed gate")
			game.clear_plan()
			check(game.preview.state.collectedDiscoveryMask == 0, "Clear restores discovery")
		for action in fixtures[index].actions: check(game.add_direction(action.direction), "Reference route accepted")
		check(game.preview.complete, "Complete route preview")
		game.start_playback()
		var saved_attempts: int = game.progress[game.save_id(game.definition)].attempts
		game.start_playback()
		check(game.progress[game.save_id(game.definition)].attempts == saved_attempts, "Duplicate Go rejected")
		var frame: int = game.playback_index
		AudioServer.set_bus_mute(0, true)
		platform.set_pause_reason("sdk", true)
		platform.set_pause_reason("hidden", true)
		check(not game.add_direction("left"), "Paused input blocked")
		game._process(1)
		check(game.playback_index == frame, "Playback freezes while paused")
		platform.set_pause_reason("sdk", false)
		check(paused, "Overlapping pause preserved")
		platform.set_pause_reason("hidden", false)
		check(not paused and AudioServer.is_bus_mute(0), "Prior mute restored")
		AudioServer.set_bus_mute(0, false)
		for tick in 300: game._process(0.08)
		check(game.playback_index == -1 and game.result_label.text.contains("Extra: 0"), "Playback finishes with optimal score")
		game.start_playback()
		check(game.playback_index == -1, "Unedited route cannot resubmit")
		game.clear_plan()
		check(game.progress[game.save_id(game.definition)].best.size() == fixtures[index].optimal, "Best survives clear")
	check(game.progress.size() == 3, "All campaign levels completed")
	var snapshot := JSON.stringify(game.progress)
	game.progress = {}
	game.restore_progress(snapshot)
	check(game.progress.size() == 3 and game.unlocked(2), "Save JSON round trip restores campaign")
	game.progress = {}
	game.restore_progress('{"first-steps@1":{"best":["right"],"attempts":1}}')
	check(game.progress.is_empty(), "Incomplete saved plan cannot unlock levels")
	game.restore_progress('{"first-steps@2":{"best":["right","right","down","down"],"attempts":1}}')
	check(game.progress.is_empty(), "Mismatched level version ignored")
	print("Campaign integration passed: %d assertions." % checks)
	quit(1 if failures else 0)
