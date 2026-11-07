extends Control
const Rules = preload("res://rules.gd")
const RoundModel = preload("res://round.gd")
const Board = preload("res://board.gd")
var board: Control
var maze: Dictionary
var round_model: RefCounted
var route: Array = []
var submitted := false
var mode := "practice"
var daily_key := ""
var storage: Dictionary = {"scores":[],"daily":{}}
var time_label: Label
var moves_label: Label
var best_label: Label
var attempts_label: Label
var feedback: Label
var result: Label
var title_label: Label
var mode_label: Label
var difficulty: OptionButton
var start_button: Button
var clear_button: Button
var finish_button: Button
var optimal_button: Button
var replay_button: Button
var overlay: PanelContainer
var show_optimal := false
var saved := false
var ink := Color("25382c")
var muted := Color("62705f")

func label(text: String, font_size: int = 16, color: Color = Color("25382c")) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size",font_size)
	l.add_theme_color_override("font_color",color)
	return l

func button(text: String, callback: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size.y = 42
	b.pressed.connect(callback)
	return b

func panel_style(color: Color, radius: int = 8) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(radius)
	style.content_margin_left = 16
	style.content_margin_right = 16
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	return style

func _ready():
	load_storage()
	var base_theme := Theme.new()
	base_theme.default_font_size = 15
	base_theme.set_stylebox("normal","Button",panel_style(Color("e4ebdf")))
	base_theme.set_stylebox("hover","Button",panel_style(Color("d5e0ce")))
	base_theme.set_stylebox("pressed","Button",panel_style(Color("c5d6bc")))
	base_theme.set_stylebox("disabled","Button",panel_style(Color("eef1eb")))
	base_theme.set_color("font_color","Button",ink)
	base_theme.set_color("font_hover_color","Button",ink)
	base_theme.set_color("font_pressed_color","Button",ink)
	base_theme.set_color("font_disabled_color","Button",Color("9aa593"))
	theme = base_theme
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left","right","top","bottom"]: margin.add_theme_constant_override("margin_"+side,24)
	add_child(margin)
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation",18)
	margin.add_child(root)
	var top := HBoxContainer.new()
	root.add_child(top)
	var brand := label("Pawzzle Maze",24)
	brand.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(brand)
	top.add_child(label("Godot edition · Local prototype",13,muted))
	var nav := HBoxContainer.new()
	nav.add_theme_constant_override("separation",10)
	root.add_child(nav)
	nav.add_child(button("Practice",func(): change_mode("practice")))
	nav.add_child(button("Daily challenge",func(): change_mode("daily")))
	nav.add_child(button("Local leaderboard",show_scores))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nav.add_child(spacer)
	difficulty = OptionButton.new()
	difficulty.add_item("Introductory · 6 × 6",6)
	difficulty.add_item("Standard · 9 × 9",9)
	difficulty.add_item("Advanced · 12 × 12",12)
	difficulty.item_selected.connect(func(_index): setup())
	nav.add_child(difficulty)
	title_label = label("Find your shortest way.",26)
	root.add_child(title_label)
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation",28)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(body)
	var game := VBoxContainer.new()
	game.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	game.add_theme_constant_override("separation",12)
	body.add_child(game)
	var hud := HBoxContainer.new()
	hud.add_theme_constant_override("separation",28)
	game.add_child(hud)
	var values: Array = []
	for text in ["Time left","Current moves","Best moves","Attempts"]:
		var column := VBoxContainer.new()
		column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hud.add_child(column)
		column.add_child(label(text,12,muted))
		var value := label("—",28)
		values.append(value)
		column.add_child(value)
	time_label = values[0]
	moves_label = values[1]
	best_label = values[2]
	attempts_label = values[3]
	var aspect := AspectRatioContainer.new()
	aspect.ratio = 1.0
	aspect.stretch_mode = AspectRatioContainer.STRETCH_FIT
	aspect.size_flags_vertical = Control.SIZE_EXPAND_FILL
	aspect.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	game.add_child(aspect)
	board = Board.new()
	aspect.add_child(board)
	board.cell_pressed.connect(begin_route)
	board.direction_pressed.connect(func(delta):
		if active() and not route.is_empty(): step(route.back()+delta))
	board.cells_crossed.connect(func(cells):
		for cell in cells:
			if not board.dragging or not step(cell): break)
	overlay = PanelContainer.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_theme_stylebox_override("panel",panel_style(Color("e7eee0")))
	board.add_child(overlay)
	var center := CenterContainer.new()
	overlay.add_child(center)
	var intro := VBoxContainer.new()
	intro.add_theme_constant_override("separation",18)
	center.add_child(intro)
	var heading := label("Take a moment.",28)
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	intro.add_child(heading)
	var description := label("Draw from S to G.\nFind the fewest moves in 60 seconds.",16,muted)
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	intro.add_child(description)
	start_button = button("Start maze →",start_round)
	intro.add_child(start_button)
	var hint := label("The clock starts when the maze appears.",12,muted)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	intro.add_child(hint)
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation",12)
	game.add_child(actions)
	clear_button = button("Clear path",func():
		if active():
			route = [0]
			submitted = false
			refresh())
	actions.add_child(clear_button)
	finish_button = button("Finish round →",func():
		if active() and not round_model.best.is_empty(): finish_round())
	actions.add_child(finish_button)
	feedback = label("Your best completed route is always kept.",13,Color("31734b"))
	feedback.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	feedback.custom_minimum_size.y = 42
	game.add_child(feedback)
	var rail := VBoxContainer.new()
	rail.custom_minimum_size.x = 245
	rail.add_theme_constant_override("separation",14)
	body.add_child(rail)
	rail.add_child(label("Make every move count.",20))
	var instructions := label("Draw a route\nPress S and drag to G.\nOr use the arrow keys.\n\nTry a shorter way\nBacktrack to revise your path.\nYour best route stays safe.\n\nFind your perfect\nFewest moves wins.\nTime breaks ties.",14,muted)
	rail.add_child(instructions)
	result = label("",14,ink)
	result.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	rail.add_child(result)
	optimal_button = button("View optimal route",func():
		show_optimal = not show_optimal
		optimal_button.text = "Hide optimal route" if show_optimal else "View optimal route"
		feedback.text = "One optimal route · dotted line" if show_optimal else "Best completed route kept in pale green."
		refresh())
	rail.add_child(optimal_button)
	replay_button = button("Replay in practice",func():
		mode = "practice"
		setup(true))
	rail.add_child(replay_button)
	rail.add_child(button("New practice maze →",func(): change_mode("practice")))
	mode_label = label("Practice · Unranked · Scores stay on this device",12,muted)
	root.add_child(mode_label)
	setup()

func setup(replay: bool = false):
	round_model = null
	route = []
	submitted = false
	show_optimal = false
	saved = false
	board.dragging = false
	daily_key = Time.get_date_string_from_system(true)
	if not replay:
		var n := 8 if mode == "daily" else difficulty.get_selected_id()
		maze = Rules.generate(n,int(daily_key.replace("-","")) if mode == "daily" else randi())
	overlay.show()
	# Do not put the challenge in the viewport until Start.
	board.maze = {}
	board.layer.hide()
	board.queue_redraw()
	start_button.disabled = false
	start_button.text = "Review daily result" if mode == "daily" and storage.daily.has(daily_key) else "Start maze →"
	clear_button.disabled = true
	finish_button.disabled = true
	difficulty.disabled = mode == "daily"
	optimal_button.hide()
	replay_button.hide()
	result.text = ""
	feedback.text = "Your best completed route is always kept."
	title_label.text = "One maze for today." if mode == "daily" else "Find your shortest way."
	mode_label.text = "Daily · Device-only · Resets 00:00 UTC (08:00 Malaysia)" if mode == "daily" else "Practice · Unranked · Scores stay on this device"
	if mode == "daily" and storage.daily.has(daily_key):
		result.text = "Today's local daily run is used.\nReplay it in practice below."
		replay_button.show()
	refresh()

func start_round():
	if mode == "daily" and storage.daily.has(daily_key):
		var prior: Dictionary = storage.daily[daily_key]
		board.set_maze(maze)
		board.layer.show()
		overlay.hide()
		round_model = RoundModel.new(maze,Time.get_ticks_msec())
		round_model.best = prior.get("best",{})
		round_model.attempts = int(prior.get("attempts",0))
		route = round_model.best.get("path",[])
		finish_round()
		return
	board.set_maze(maze)
	board.layer.show()
	overlay.hide()
	round_model = RoundModel.new(maze,Time.get_ticks_msec())
	route = [0]
	if mode == "daily":
		storage.daily[daily_key] = {"status":"active"}
		persist()
	clear_button.disabled = false
	difficulty.disabled = true
	feedback.text = "Draw from S to G. Arrow keys work too."
	board.grab_focus()
	refresh()

func active() -> bool:
	if round_model == null or round_model.finished: return false
	if Time.get_ticks_msec() >= round_model.deadline:
		feedback.text = "Time’s up. Your best completed route is kept."
		finish_round()
		return false
	return true

func _process(_delta):
	if round_model != null and not round_model.finished:
		var remaining: int = maxi(0,round_model.deadline-Time.get_ticks_msec())
		time_label.text = "%s s" % int(ceil(remaining/1000.0))
		time_label.add_theme_color_override("font_color",Color("a04c2a") if remaining < 10000 else ink)
		if remaining == 0: active()

func begin_route(cell: int):
	if not active(): return
	if cell == 0:
		route = [0]
		submitted = false
	elif submitted and cell in route:
		route = route.slice(0,route.find(cell)+1)
		submitted = false
	elif route.is_empty() or cell != route.back(): return
	board.dragging = true
	refresh()

func step(cell: int) -> bool:
	if not active(): return false
	var next := Rules.move(route,cell,maze.graph)
	if next == route:
		feedback.text = "That passage is closed. Try an open edge."
		return false
	route = next
	submitted = false
	if cell == maze.n*maze.n-1:
		board.dragging = false
		submitted = true
		var attempt: Dictionary = round_model.submit(route,Time.get_ticks_msec())
		if not attempt.is_empty():
			feedback.text = "Perfect! %s moves." % attempt.moves if attempt.extra == 0 else "%s%s moves — %s more moves than optimal." % ["New best. " if attempt.improved else "",attempt.moves,attempt.extra]
			finish_button.disabled = false
			persist_best()
		if round_model.finished: finish_round()
	refresh()
	return true

func _unhandled_key_input(event: InputEvent):
	if not event is InputEventKey or not event.pressed or event.echo: return
	var directions := {KEY_UP:-maze.n,KEY_DOWN:maze.n,KEY_LEFT:-1,KEY_RIGHT:1}
	if not directions.has(event.keycode) or not active(): return
	if route.is_empty(): route = [0]
	step(route.back()+directions[event.keycode])
	get_viewport().set_input_as_handled()

func refresh():
	moves_label.text = str(maxi(0,route.size()-1))
	best_label.text = str(round_model.best.moves) if round_model != null and not round_model.best.is_empty() else "—"
	attempts_label.text = str(round_model.attempts) if round_model != null else "0"
	if round_model == null:
		time_label.text = "60 s"
		time_label.add_theme_color_override("font_color",ink)
	if not board.maze.is_empty():
		var best: Array = round_model.best.path if round_model != null and round_model.finished and not round_model.best.is_empty() else []
		board.show_routes(route,best,maze.optimal if show_optimal else [])

func finish_round():
	if round_model == null: return
	round_model.finished = true
	board.dragging = false
	clear_button.disabled = true
	finish_button.disabled = true
	difficulty.disabled = mode == "daily"
	persist_best()
	if not saved and mode != "daily" and not round_model.best.is_empty():
		var entry: Dictionary = round_model.best.duplicate(true)
		entry["challenge"] = maze.id
		entry["mode"] = mode
		storage.scores.append(entry)
		saved = true
		persist()
	var best: Dictionary = round_model.best
	result.text = "No completed route\nOptimal: %s moves\nAttempts: %s" % [maze.optimal.size()-1,round_model.attempts] if best.is_empty() else "%s\n\nBest route: %s moves\nOptimal: %s moves\nExtra moves: +%s\nBest achieved: %.2f s\nAttempts: %s" % ["Perfectly done." if best.extra == 0 else "Room to improve.",best.moves,maze.optimal.size()-1,best.extra,best.elapsed/1000.0,round_model.attempts]
	optimal_button.show()
	replay_button.show()
	refresh()

func change_mode(next: String):
	if round_model != null and not round_model.finished: finish_round()
	mode = next
	setup()

func show_scores():
	var scores: Array = storage.scores.filter(func(score): return score.challenge == maze.id and score.mode == mode)
	scores.sort_custom(func(a,b): return a.extra < b.extra or (a.extra == b.extra and a.elapsed < b.elapsed))
	result.text = "Local leaderboard\nSame maze and mode · Unverified\n"
	var rank := 0
	for i in scores.size():
		if i == 0 or scores[i].extra != scores[i-1].extra or scores[i].elapsed != scores[i-1].elapsed: rank = i+1
		result.text += "\n#%s · %s moves · +%s · %.2f s" % [rank,scores[i].moves,scores[i].extra,scores[i].elapsed/1000.0]
	if scores.is_empty(): result.text += "\nNo completed runs for this maze yet."

func persist_best():
	if mode == "daily" and round_model != null:
		storage.daily[daily_key] = {"status":"finished" if round_model.finished else "active","best":round_model.best,"attempts":round_model.attempts}
		if not round_model.best.is_empty():
			var entry: Dictionary = round_model.best.duplicate(true)
			entry["challenge"] = maze.id
			entry["mode"] = mode
			storage.scores = storage.scores.filter(func(score): return not (score.challenge == maze.id and score.mode == "daily"))
			storage.scores.append(entry)
		persist()

func persist():
	if "--test-mode" in OS.get_cmdline_user_args(): return
	var file := FileAccess.open("user://maze-results.json",FileAccess.WRITE)
	if file: file.store_string(JSON.stringify(storage))

func load_storage():
	if "--test-mode" in OS.get_cmdline_user_args(): return
	if FileAccess.file_exists("user://maze-results.json"):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string("user://maze-results.json"))
		if parsed is Dictionary and parsed.has("scores") and parsed.has("daily"): storage = parsed
