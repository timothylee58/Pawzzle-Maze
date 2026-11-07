extends Control
const Rules = preload("res://garden/rules.gd")
const Board = preload("res://garden/board.gd")
const SAVE_KEY := "pawzzle-garden-godot-v1"
var rules = Rules.new()
var level: Dictionary = {}
var state: Dictionary = {}
var history: Array = []
var assisted := false
var optimal := 0
var hint_cell := -1
var saves: Dictionary = {"bests": {}, "muted": false}
var board: Control
var size_select: OptionButton
var seed_input: LineEdit
var stats: Label
var status: Label
var objective_rows: Array = []
var objective_checks: Array = []
var objective_labels: Array = []
var checked_icon: Texture2D
var unchecked_icon: Texture2D
var result: Label
var sound: Button
var undo_button: Button
var layout: BoxContainer
var setup_panel: PanelContainer
var objectives_panel: PanelContainer
var play_panel: VBoxContainer
var overlay: PanelContainer
var pause_cover: PanelContainer
var music: AudioStreamPlayer
var scroll: ScrollContainer
var begun := false
var narrow := false

func label(text: String, font_size: int = 16) -> Label:
	var node := Label.new()
	node.text = text
	node.add_theme_font_size_override("font_size", font_size)
	node.add_theme_color_override("font_color", Color("#174f50"))
	node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return node

func style(color: String, radius: int = 18) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(color)
	box.set_corner_radius_all(radius)
	box.content_margin_left = 18
	box.content_margin_right = 18
	box.content_margin_top = 16
	box.content_margin_bottom = 16
	return box

func panel() -> PanelContainer:
	var node := PanelContainer.new()
	node.add_theme_stylebox_override("panel", style("#fff9e9"))
	return node

func button(text: String, action: Callable, primary: bool = false) -> Button:
	var node := Button.new()
	node.text = text
	node.custom_minimum_size.y = 44
	node.add_theme_font_size_override("font_size", 15)
	node.add_theme_stylebox_override("normal", style("#229c7a" if primary else "#f1e6cc", 12))
	node.add_theme_stylebox_override("hover", style("#36b68d" if primary else "#e6dbbd", 12))
	node.add_theme_stylebox_override("pressed", style("#168266" if primary else "#d5c79f", 12))
	node.add_theme_color_override("font_color", Color.WHITE if primary else Color("#174f50"))
	node.add_theme_color_override("font_hover_color", Color.WHITE if primary else Color("#174f50"))
	node.pressed.connect(action)
	return node

func _svg_icon(body: String) -> Texture2D:
	var image := Image.new()
	image.load_svg_from_string('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' + body + '</svg>')
	return ImageTexture.create_from_image(image)

func _arrow_icon(direction: Vector2i) -> Texture2D:
	var angle := 0
	if direction == Vector2i.RIGHT: angle = 90
	elif direction == Vector2i.DOWN: angle = 180
	elif direction == Vector2i.LEFT: angle = 270
	return _svg_icon('<path transform="rotate(%d 12 12)" d="M12 3 3 12h6v9h6v-9h6z" fill="#174f50"/>' % angle)

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color("#8fd1db")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	_load_save()
	music = AudioStreamPlayer.new()
	music.stream = load("res://garden/audio/music.mp3")
	music.volume_db = -10
	music.finished.connect(func(): music.play())
	add_child(music)
	AudioServer.set_bus_mute(0, bool(saves.muted))
	scroll = ScrollContainer.new()
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for edge in ["left", "right", "top", "bottom"]: margin.add_theme_constant_override("margin_" + edge, 20)
	scroll.add_child(margin)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 18)
	margin.add_child(page)
	var header := HBoxContainer.new()
	page.add_child(header)
	var title := VBoxContainer.new()
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	title.add_child(label("A LITTLE PLANNING GOES A LONG WAY", 12))
	title.add_child(label("Pawzzle Maze", 34))
	title.add_child(label("Mocha's Garden  ·  Collect what matters. Find your way home.", 15))
	var header_buttons := VBoxContainer.new()
	header.add_child(header_buttons)
	sound = button("Sound off" if saves.muted else "Sound on", _toggle_sound)
	header_buttons.add_child(sound)
	header_buttons.add_child(button("Pause", func(): get_node("/root/GPX").set_pause_reason("manual", true)))
	layout = BoxContainer.new()
	layout.add_theme_constant_override("separation", 20)
	page.add_child(layout)
	setup_panel = panel()
	setup_panel.custom_minimum_size.x = 210
	layout.add_child(setup_panel)
	var setup := VBoxContainer.new()
	setup.add_theme_constant_override("separation", 12)
	setup_panel.add_child(setup)
	setup.add_child(label("PUZZLE SETUP", 18))
	setup.add_child(label("Garden size", 14))
	size_select = OptionButton.new()
	for text in ["Small · 5 × 5", "Classic · 6 × 6", "Adventurous · 8 × 8"]: size_select.add_item(text)
	size_select.selected = 1
	size_select.custom_minimum_size.y = 44
	setup.add_child(size_select)
	setup.add_child(label("Puzzle seed", 14))
	seed_input = LineEdit.new()
	seed_input.text = "PAW-1024"
	seed_input.max_length = 40
	seed_input.custom_minimum_size.y = 44
	seed_input.add_theme_stylebox_override("normal", style("#f1e6cc", 10))
	seed_input.add_theme_color_override("font_color", Color("#174f50"))
	size_select.add_theme_stylebox_override("normal", style("#f1e6cc", 10))
	size_select.add_theme_color_override("font_color", Color("#174f50"))
	setup.add_child(seed_input)
	setup.add_child(button("Generate puzzle", generate, true))
	setup.add_child(label("THE ROYAL ERRAND\n\nThree bones. One golden key. A well-earned nap at home.", 16))
	setup.add_child(label("HOW TO PLAY\n\nArrow keys / WASD, or tap a neighbouring open tile. Every step counts, including walking back.", 14))
	setup.add_child(label("Same seed, same garden. Each puzzle is checked for a complete solution.", 13))
	play_panel = VBoxContainer.new()
	play_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	play_panel.add_theme_constant_override("separation", 10)
	layout.add_child(play_panel)
	var score_panel := panel()
	play_panel.add_child(score_panel)
	stats = label("", 19)
	score_panel.add_child(stats)
	board = Board.new()
	board.custom_minimum_size = Vector2(280, 450)
	board.cell_pressed.connect(step)
	play_panel.add_child(board)
	var toolbar := HBoxContainer.new()
	toolbar.add_theme_constant_override("separation", 8)
	play_panel.add_child(toolbar)
	undo_button = button("Undo", undo)
	toolbar.add_child(undo_button)
	toolbar.add_child(button("Restart", restart))
	toolbar.add_child(button("Hint", show_hint, true))
	var movement_title := label("MOVE MOCHA", 14)
	movement_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	play_panel.add_child(movement_title)
	var directions_center := CenterContainer.new()
	play_panel.add_child(directions_center)
	var directions := GridContainer.new()
	directions.columns = 3
	directions.add_theme_constant_override("h_separation", 8)
	directions.add_theme_constant_override("v_separation", 6)
	directions_center.add_child(directions)
	for entry in [["", Vector2i.ZERO], ["Up", Vector2i.UP], ["", Vector2i.ZERO], ["Left", Vector2i.LEFT], ["Down", Vector2i.DOWN], ["Right", Vector2i.RIGHT]]:
		if entry[0] == "":
			directions.add_child(Control.new())
			continue
		var direction: Vector2i = entry[1]
		var control := button(entry[0], func(): move_direction(direction))
		control.name = "Move" + entry[0]
		control.icon = _arrow_icon(direction)
		control.expand_icon = true
		control.add_theme_constant_override("icon_max_width", 20)
		control.add_theme_font_size_override("font_size", 14)
		for appearance in ["normal", "hover", "pressed"]:
			var compact := control.get_theme_stylebox(appearance).duplicate() as StyleBoxFlat
			compact.content_margin_left = 8
			compact.content_margin_right = 8
			control.add_theme_stylebox_override(appearance, compact)
		control.custom_minimum_size = Vector2(82, 48)
		control.focus_mode = Control.FOCUS_NONE
		control.tooltip_text = "Move Mocha " + entry[0].to_lower()
		directions.add_child(control)
	var movement_help := label("Click a direction, use arrow keys / WASD, or tap an open neighbouring tile.", 13)
	movement_help.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	play_panel.add_child(movement_help)
	objectives_panel = panel()
	objectives_panel.custom_minimum_size.x = 230
	layout.add_child(objectives_panel)
	var objectives := VBoxContainer.new()
	objectives.add_theme_constant_override("separation", 18)
	objectives_panel.add_child(objectives)
	objectives.add_child(label("YOUR ROUTE CHECKLIST", 17))
	checked_icon = _svg_icon('<rect x="2" y="2" width="20" height="20" rx="5" fill="#229c7a"/><path d="m6 12 4 4 8-9" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>')
	unchecked_icon = _svg_icon('<rect x="2" y="2" width="20" height="20" rx="5" fill="#fff9e9" stroke="#8ca89c" stroke-width="2"/>')
	for entry in [["bone", "Bone 1"], ["bone", "Bone 2"], ["bone", "Bone 3"], ["key", "Golden key"], ["dog_house", "Return home"]]:
		var row := PanelContainer.new()
		row.add_theme_stylebox_override("panel", style("#f1e6cc", 12))
		objectives.add_child(row)
		objective_rows.append(row)
		var items := HBoxContainer.new()
		items.add_theme_constant_override("separation", 8)
		row.add_child(items)
		var check := TextureRect.new()
		check.texture = unchecked_icon
		check.custom_minimum_size = Vector2(22, 22)
		check.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		check.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		items.add_child(check)
		objective_checks.append(check)
		var sprite := TextureRect.new()
		sprite.texture = load("res://Sprites/textures/" + entry[0] + ".png")
		sprite.custom_minimum_size = Vector2(38, 38)
		sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		items.add_child(sprite)
		var caption := label(entry[1], 15)
		caption.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		items.add_child(caption)
		objective_labels.append(caption)
	status = label("", 15)
	objectives.add_child(status)
	objectives.add_child(label("THE FEWEST MOVES WIN\n\nTake your time. Hints mark the attempt as assisted; assisted runs do not replace your personal best.", 14))
	overlay = _make_overlay()
	var win_box := VBoxContainer.new()
	win_box.add_theme_constant_override("separation", 16)
	overlay.get_meta("card").add_child(win_box)
	win_box.add_child(label("A royal success.", 30))
	result = label("", 20)
	win_box.add_child(result)
	win_box.add_child(button("Another adventure", next_puzzle, true))
	win_box.add_child(button("Try fewer moves", restart))
	pause_cover = _make_overlay()
	pause_cover.process_mode = Node.PROCESS_MODE_ALWAYS
	var pause_box := VBoxContainer.new()
	pause_cover.get_meta("card").add_child(pause_box)
	pause_box.add_child(label("Garden paused", 30))
	pause_box.add_child(label("Your puzzle is waiting right here.", 18))
	pause_box.add_child(button("Resume", func(): get_node("/root/GPX").set_pause_reason("manual", false), true))
	get_node("/root/GPX").pause_changed.connect(_paused)
	resized.connect(_resize)
	generate()
	_resize()
	get_node("/root/GPX").game_loaded()
	_paused(get_tree().paused)

func _exit_tree() -> void:
	if music != null:
		music.stop()
		music.stream = null

func _make_overlay() -> PanelContainer:
	var node := panel()
	node.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	node.add_theme_stylebox_override("panel", style("#174f50dd", 0))
	var center := CenterContainer.new()
	node.add_child(center)
	var card := panel()
	card.custom_minimum_size.x = 300
	center.add_child(card)
	node.set_meta("card", card)
	node.visible = false
	node.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(node)
	return node

func _resize() -> void:
	narrow = size.x < 960
	for popup in [overlay, pause_cover]:
		if popup != null: popup.get_meta("card").custom_minimum_size.x = minf(440, size.x - 40)
	layout.vertical = narrow
	setup_panel.custom_minimum_size.x = 0 if narrow else 210
	objectives_panel.custom_minimum_size.x = 0 if narrow else 230
	layout.move_child(play_panel, 0 if narrow else 1)
	board.custom_minimum_size.y = clampf(minf(size.x - 60, size.y * 0.60) if narrow else minf(size.x - 540, size.y * 0.65), 260, 580)

func generate() -> void:
	var seed_value := seed_input.text.strip_edges()
	if seed_value.is_empty(): seed_value = "PAW-1024"
	seed_input.text = seed_value
	level = rules.generate([5, 6, 8][size_select.selected], seed_value)
	var route: Array = rules.solve(level)
	if route.is_empty():
		level = rules.generate(5, "PAW-1024")
		route = rules.solve(level)
	optimal = route.size()
	restart()

func restart() -> void:
	state = rules.initial()
	history.clear()
	hint_cell = -1
	assisted = false
	overlay.hide()
	status.text = "Collect all three bones, find the golden key, then head home."
	refresh()

func begin() -> void:
	if not begun:
		begun = true
		get_node("/root/GPX").game_start()
		music.play()

func step(to: int) -> void:
	if get_tree().paused or rules.won(level, state): return
	begin()
	var next: Dictionary = rules.move(level, state, to)
	if next.is_empty():
		status.text = "Find the golden key to unlock home." if to == level.home and not state.key else "That path is blocked. Choose a neighbouring open tile."
		return
	history.append(state.duplicate())
	state = next
	hint_cell = -1
	status.text = "Every step counts. A little backtracking is part of the adventure."
	if state.pos == level.home and state.mask != 7: status.text = "There are still bones to collect before your royal nap!"
	if rules.won(level, state):
		var key := best_key()
		if not assisted and state.moves < int(saves.bests.get(key, 999999)):
			saves.bests[key] = state.moves
			_save()
		result.text = "All three bones collected in %d moves.\nShortest route: %d moves.%s" % [state.moves, optimal, "\nAssisted attempt — personal best unchanged." if assisted else "\nA perfect route!" if state.moves == optimal else "\nCan you find a shorter route?"]
		overlay.show()
		get_node("/root/GPX").happyMoment()
	refresh()

func undo() -> void:
	if get_tree().paused or history.is_empty() or overlay.visible: return
	state = history.pop_back()
	hint_cell = -1
	status.text = "One step undone. Try another route."
	refresh()

func show_hint() -> void:
	if get_tree().paused or overlay.visible: return
	var path: Array = rules.solve(level, state)
	if not path.is_empty():
		assisted = true
		hint_cell = path[0]
		status.text = "The green tile is your next step on a shortest remaining route. Assisted attempt."
		refresh()

func move_direction(direction: Vector2i) -> void:
	var n: int = level.size
	var x: int = state.pos % n + direction.x
	var y: int = state.pos / n + direction.y
	if x >= 0 and x < n and y >= 0 and y < n: step(y * n + x)

func _unhandled_key_input(event: InputEvent) -> void:
	if not event.is_pressed() or event.is_echo() or overlay.visible: return
	if get_viewport().gui_get_focus_owner() is LineEdit: return
	var map := {KEY_LEFT: Vector2i.LEFT, KEY_A: Vector2i.LEFT, KEY_RIGHT: Vector2i.RIGHT, KEY_D: Vector2i.RIGHT, KEY_UP: Vector2i.UP, KEY_W: Vector2i.UP, KEY_DOWN: Vector2i.DOWN, KEY_S: Vector2i.DOWN}
	if map.has(event.keycode):
		move_direction(map[event.keycode])
		get_viewport().set_input_as_handled()

func next_puzzle() -> void:
	seed_input.text = "PAW-" + str(randi_range(0, 99999))
	generate()

func best_key() -> String:
	return str(level.size) + ":" + level.seed

func refresh() -> void:
	var count := 0
	for i in 3:
		if state.mask & (1 << i): count += 1
	stats.text = "%d × %d  /  %s\n%d moves   ·   Best %s   ·   %d/3 bones" % [level.size, level.size, level.seed, state.moves, str(saves.bests.get(best_key(), "—")), count]
	for i in 5:
		var complete: bool = bool(state.mask & (1 << i)) if i < 3 else bool(state.key) if i == 3 else rules.won(level, state)
		objective_checks[i].texture = checked_icon if complete else unchecked_icon
		objective_rows[i].add_theme_stylebox_override("panel", style("#dcefdc" if complete else "#f1e6cc", 12))
		objective_rows[i].tooltip_text = "Completed" if complete else "Still to collect" if i < 4 else "Collect the bones and key, then reach home"
	undo_button.disabled = history.is_empty()
	board.show_board(level, state, history, hint_cell)

func _toggle_sound() -> void:
	begin()
	saves.muted = not bool(saves.muted)
	AudioServer.set_bus_mute(0, saves.muted)
	sound.text = "Sound off" if saves.muted else "Sound on"
	_save()

func _paused(value: bool) -> void:
	pause_cover.visible = value
	board.locked = value
	if music != null: music.stream_paused = value

func _load_save() -> void:
	var raw = get_node("/root/GPX").getItem(SAVE_KEY) if OS.has_feature("web") else FileAccess.get_file_as_string("user://garden-v1.json") if FileAccess.file_exists("user://garden-v1.json") else ""
	if raw == null or str(raw).is_empty(): return
	var data = JSON.parse_string(str(raw))
	if data is Dictionary and data.get("bests") is Dictionary and data.get("muted") is bool:
		for key in data.bests:
			var value = data.bests[key]
			if (value is float or value is int) and value > 0 and value < 100000: saves.bests[key] = int(value)
		saves.muted = data.muted

func _save() -> void:
	var raw := JSON.stringify(saves)
	if OS.has_feature("web"): get_node("/root/GPX").setItem(SAVE_KEY, raw)
	else:
		var file := FileAccess.open("user://garden-v1.json", FileAccess.WRITE)
		if file != null: file.store_string(raw)
