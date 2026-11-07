extends Control
const Rules = preload("res://campaign_rules.gd")
const Board = preload("res://campaign_board.gd")
const SAVE_KEY = "pawzzle:godot-campaign:rules-3.0"
var levels: Array = Rules.Levels.LEVELS
var level_index := 0
var definition: Dictionary = {}
var actions: Array = []
var preview: Dictionary = {}
var progress: Dictionary = {}
var playback_index := -1
var playback_elapsed := 0.0
var submitted := false
var reduced_motion := false
var board: Control
var selector: OptionButton
var title_label: Label
var feedback: Label
var objectives: Label
var stats: Label
var result_label: Label
var storage_label: Label
var go_button: Button
var undo_button: Button
var clear_button: Button
var next_button: Button
var pause_button: Button
var direction_buttons: Array = []
var body: BoxContainer
var aspect: AspectRatioContainer
var platform: Node

func label(parent: Node, text: String, font_size := 18) -> Label:
	var item := Label.new()
	item.text = text
	item.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	item.add_theme_color_override("font_color", Color("294b40"))
	item.add_theme_font_size_override("font_size", font_size)
	parent.add_child(item)
	return item

func button(parent: Node, text: String, callback: Callable) -> Button:
	var item := Button.new()
	item.text = text
	item.custom_minimum_size.y = 42
	item.pressed.connect(callback)
	parent.add_child(item)
	return item

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	theme = Theme.new()
	theme.default_font_size = 16
	for kind in ["Button", "OptionButton", "CheckButton"]:
		for status in ["normal", "hover", "pressed", "disabled", "focus"]:
			var style := StyleBoxFlat.new()
			style.bg_color = Color("d0d9cf") if status == "disabled" else Color("365e4d")
			if status == "hover" or status == "focus": style.bg_color = Color("477c65")
			style.content_margin_left = 10
			style.content_margin_right = 10
			style.content_margin_top = 7
			style.content_margin_bottom = 7
			theme.set_stylebox(status, kind, style)
		for color_name in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: theme.set_color(color_name, kind, Color("fff8e8"))
		theme.set_color("font_disabled_color", kind, Color("526450"))
	platform = get_node("/root/GPX")
	var scroll := ScrollContainer.new()
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for edge in ["left", "right", "top", "bottom"]: margin.add_theme_constant_override("margin_" + edge, 12)
	scroll.add_child(margin)
	var root_box := VBoxContainer.new()
	root_box.add_theme_constant_override("separation", 8)
	margin.add_child(root_box)
	title_label = label(root_box, "Pawzzle • The Princess’s Kingdom", 26)
	var nav := HFlowContainer.new()
	root_box.add_child(nav)
	selector = OptionButton.new()
	selector.custom_minimum_size = Vector2(230, 42)
	nav.add_child(selector)
	selector.item_selected.connect(load_level)
	pause_button = button(nav, "Pause", toggle_pause)
	var motion := CheckButton.new()
	motion.text = "Reduced motion"
	motion.toggled.connect(func(value): reduced_motion = value)
	nav.add_child(motion)
	feedback = label(root_box, "", 17)
	body = BoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	root_box.add_child(body)
	aspect = AspectRatioContainer.new()
	aspect.ratio = 1.0
	aspect.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	aspect.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	body.add_child(aspect)
	board = Board.new()
	aspect.add_child(board)
	board.cell_requested.connect(step_cell)
	board.direction_requested.connect(add_direction)
	var rail := VBoxContainer.new()
	rail.custom_minimum_size.x = 220
	rail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(rail)
	label(rail, "PLAN YOUR ADVENTURE", 20)
	objectives = label(rail, "")
	stats = label(rail, "", 16)
	var actions_row := HFlowContainer.new()
	rail.add_child(actions_row)
	undo_button = button(actions_row, "Undo", undo)
	clear_button = button(actions_row, "Clear", clear_plan)
	go_button = button(actions_row, "Go", start_playback)
	var directions := HFlowContainer.new()
	rail.add_child(directions)
	for item in [["Left", "left"], ["Up", "up"], ["Down", "down"], ["Right", "right"]]:
		direction_buttons.append(button(directions, item[0], add_direction.bind(item[1])))
	label(rail, "Arrow keys, adjacent tiles, or drag to plan. Revisiting a tile counts as another move. Undo restores your inventory and gate state.", 15)
	result_label = label(rail, "", 19)
	next_button = button(rail, "Next adventure", func(): load_level(level_index + 1))
	storage_label = label(root_box, "Campaign • No timer • Blue ring = your dog • Crown = Mocha", 14)
	load_progress()
	resized.connect(layout)
	platform.pause_changed.connect(func(_value): board.dragging = false; call_deferred("refresh"))
	load_level(0)
	layout()
	platform.game_loaded()

func layout():
	if body == null: return
	body.vertical = size.x < 600
	aspect.custom_minimum_size.y = maxf(240, minf(size.y - 185, size.x - (24 if body.vertical else 280)))

func save_id(d: Dictionary) -> String:
	return "%s@%d" % [d.levelId, d.levelVersion]

func unlocked(index: int) -> bool:
	if index < 0 or index >= levels.size(): return false
	for id in levels[index].get("prerequisites", []):
		var matched := false
		for d in levels:
			if d.levelId == id: matched = progress.has(save_id(d))
		if not matched: return false
	return true

func load_level(index: int):
	if get_tree().paused or not unlocked(index) or playback_index >= 0: return
	level_index = index
	definition = levels[index]
	if not Rules.validate(definition):
		feedback.text = "This level needs mechanics not supported by this campaign build."
		return
	actions = []
	submitted = false
	result_label.text = ""
	feedback.text = definition.get("instruction", "Fetch the golden treat, deliver it to Mocha’s crown tile, then head home.")
	refresh()
	board.grab_focus()

func editable() -> bool:
	return not get_tree().paused and playback_index < 0

func add_direction(direction: String) -> bool:
	if not editable() or actions.size() >= 4096: return false
	var next := Rules.step(definition, preview.state, direction)
	if next.has("error"):
		feedback.text = "That passage is closed. Fetch Mocha’s treat before crossing the royal gate."
		board.dragging = false
		return false
	actions.append(direction)
	submitted = false
	result_label.text = ""
	feedback.text = "Keep planning. Revisits count as moves."
	for event in next.events:
		match event.type:
			"discoveryCollected": feedback.text = "Treat found! Carry it to Mocha’s crown tile."
			"requestFulfilled": feedback.text = "Mocha approves! The royal gate is open."
			"requestMissingItem": feedback.text = "Mocha is waiting. Fetch the golden treat first."
	refresh()
	if preview.complete: feedback.text = "Your route is ready. Press Go to play it."
	return true

func step_cell(cell: int):
	if not editable(): return
	var current := int(preview.state.dogCell)
	if current == cell: return
	var n := int(definition.width)
	var diff := Vector2i(cell % n - current % n, cell / n - current / n)
	for direction in Rules.DIRECTIONS:
		if diff == Rules.DIRECTIONS[direction]:
			add_direction(direction)
			return
	board.dragging = false

func undo():
	if not editable() or actions.is_empty(): return
	actions.pop_back()
	submitted = false
	result_label.text = ""
	feedback.text = "Last step removed. Inventory and gate preview restored."
	refresh()

func clear_plan():
	if not editable(): return
	actions.clear()
	submitted = false
	result_label.text = ""
	feedback.text = "A fresh plan. Your personal best is safe."
	refresh()

func start_playback():
	if not editable() or submitted or not preview.complete: return
	submitted = true
	platform.game_start()
	var key := save_id(definition)
	var previous: Dictionary = progress.get(key, {})
	var best: Array = previous.get("best", actions).duplicate()
	if actions.size() < best.size(): best = actions.duplicate()
	if Rules.demonstrated(definition, preview):
		progress[key] = {"best": best, "attempts": int(previous.get("attempts", 0)) + 1}
		persist()
	playback_index = 0
	playback_elapsed = 0
	board.dragging = false
	feedback.text = "Off we go! Playing your planned route."
	refresh()

func _process(delta: float):
	if playback_index < 0 or get_tree().paused: return
	playback_elapsed += minf(delta, 0.08)
	if playback_elapsed < (0.10 if reduced_motion else 0.36): return
	playback_elapsed = 0
	playback_index += 1
	if playback_index >= preview.frames.size() - 1:
		playback_index = -1
		var optimum := Rules.optimal_moves(definition)
		var best: Array = progress.get(save_id(definition), {}).get("best", actions)
		result_label.text = "%s\n%d moves • Optimal: %d • Extra: %d\nPersonal best: %d moves" % [definition.get("ending", "Home safely!"), actions.size(), optimum, actions.size() - optimum, best.size()]
		feedback.text = "Adventure complete. Try another route or continue."
		platform.happyMoment()
	refresh()

func refresh():
	if definition.is_empty(): return
	preview = Rules.simulate(definition, actions)
	var s: Dictionary = preview.frames[playback_index].state if playback_index >= 0 else preview.state
	board.definition = definition
	board.state = s
	board.route = []
	for frame in preview.frames: board.route.append(frame.state.dogCell)
	board.editable = editable()
	board.queue_redraw()
	selector.clear()
	for i in levels.size():
		selector.add_item(("Done: " if progress.has(save_id(levels[i])) else "") + levels[i].title + (" • Locked" if not unlocked(i) else ""))
		selector.set_item_disabled(i, not unlocked(i))
	selector.select(level_index)
	selector.disabled = not editable()
	var request_text := ""
	if not definition.royalRequests.is_empty():
		request_text = ("Done: Treat found\n" if int(s.collectedDiscoveryMask) else "- Find the golden treat\n") + ("Done: Delivered to Mocha\n" if int(s.fulfilledRequestMask) else "- Deliver at the crown tile\n")
	objectives.text = definition.title + "\n\n" + request_text + ("Done: Home" if Rules.complete(definition, s) else "- Reach the doghouse")
	var saved: Dictionary = progress.get(save_id(definition), {})
	stats.text = "%s • %d moves\nBest: %s • Attempts: %d" % ["Paused" if get_tree().paused else ("Playing" if playback_index >= 0 else "Planning"), actions.size(), str(saved.best.size()) if saved.has("best") else "—", int(saved.get("attempts", 0))]
	go_button.disabled = not editable() or not preview.complete or submitted
	undo_button.disabled = not editable() or actions.is_empty()
	clear_button.disabled = not editable() or actions.is_empty()
	for item in direction_buttons: item.disabled = not editable()
	next_button.visible = submitted and playback_index < 0 and unlocked(level_index + 1)
	next_button.disabled = not editable()
	pause_button.text = "Resume" if platform.pause_reasons.has("manual") else "Pause"

func toggle_pause():
	platform.set_pause_reason("manual", not platform.pause_reasons.has("manual"))
	refresh()

func persist():
	if "--test-mode" in OS.get_cmdline_user_args(): return
	var data := JSON.stringify(progress)
	if OS.has_feature("web"):
		platform.setItem(SAVE_KEY, data)
		if platform.getItem(SAVE_KEY) != data: storage_label.text = "Storage unavailable • Progress lasts this visit."
	else:
		var file := FileAccess.open("user://campaign-v3.json", FileAccess.WRITE)
		if file: file.store_string(data)
		else: storage_label.text = "Storage unavailable • Progress lasts this visit."

func load_progress():
	if "--test-mode" in OS.get_cmdline_user_args(): return
	var raw = platform.getItem(SAVE_KEY) if OS.has_feature("web") else (FileAccess.get_file_as_string("user://campaign-v3.json") if FileAccess.file_exists("user://campaign-v3.json") else null)
	restore_progress(raw)

func restore_progress(raw):
	if raw == null: return
	var saved = JSON.parse_string(str(raw))
	if not saved is Dictionary:
		storage_label.text = "Saved progress could not be read • Starting a fresh campaign."
		return
	for d in levels:
		var key := save_id(d)
		var record = saved.get(key)
		if not record is Dictionary or not record.get("best") is Array: continue
		var attempt = Rules.simulate(d, record.best)
		if attempt.has("error") or not Rules.demonstrated(d, attempt): continue
		if not (record.get("attempts") is float or record.get("attempts") is int): continue
		progress[key] = {"best": record.best, "attempts": maxi(1, int(record.attempts))}
