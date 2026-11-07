extends Control
const Rules = preload("res://garden/rules.gd")
const Board = preload("res://garden/board.gd")
const TutorialStrip = preload("res://garden/tutorial_strip.gd")
const SAVE_KEY := "pawzzle-garden-godot-v1"
var rules = Rules.new()
var level: Dictionary = {}
var state: Dictionary = {}
var history: Array = []
var optimal := 0
var saves: Dictionary = {"bests": {}, "muted": false}
var board: Control
var size_select: OptionButton
var setup_panel: PanelContainer
var mode_select: OptionButton
var header: Control
var header_left: VBoxContainer
var header_right: VBoxContainer
var title_center: CenterContainer
var direction_buttons: Array = []
var timer_label: Label
var help_cover: PanelContainer
var help_scroll: ScrollContainer
var elapsed := 0.0
var timer_running := false
var objective_rows: Array = []
var objective_checks: Array = []
var objective_labels: Array = []
var checked_icon: Texture2D
var unchecked_icon: Texture2D
var result: Label
var sound: Button
var layout: BoxContainer
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
	header = Control.new()
	header.custom_minimum_size.y = 170
	page.add_child(header)
	title_center = CenterContainer.new()
	title_center.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	title_center.custom_minimum_size.y = 44
	header.add_child(title_center)
	var brand := HBoxContainer.new()
	brand.add_theme_constant_override("separation", 10)
	title_center.add_child(brand)
	var paw := TextureRect.new()
	paw.texture = _svg_icon('<ellipse cx="12" cy="16" rx="6.5" ry="5" fill="#174f50"/><ellipse cx="4.5" cy="9" rx="2.5" ry="3.3" transform="rotate(-25 4.5 9)" fill="#174f50"/><ellipse cx="9" cy="5" rx="2.5" ry="3.3" fill="#174f50"/><ellipse cx="15" cy="5" rx="2.5" ry="3.3" fill="#174f50"/><ellipse cx="19.5" cy="9" rx="2.5" ry="3.3" transform="rotate(25 19.5 9)" fill="#174f50"/>')
	paw.custom_minimum_size = Vector2(34, 34)
	paw.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	paw.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	brand.add_child(paw)
	var brand_title := label("Pawzzle Maze", 28)
	brand_title.autowrap_mode = TextServer.AUTOWRAP_OFF
	brand.add_child(brand_title)
	header_left = VBoxContainer.new()
	header.add_child(header_left)
	header_left.add_child(button("Restart", restart))
	header_right = VBoxContainer.new()
	header.add_child(header_right)
	timer_label = label("00:00", 22)
	timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	timer_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	header_right.add_child(timer_label)
	header_right.add_child(button("How to play", _show_help))
	sound = button("Sound off" if saves.muted else "Sound on", _toggle_sound)
	header_right.add_child(sound)
	header_right.add_child(button("Pause", func(): get_node("/root/GPX").set_pause_reason("manual", true)))
	header.resized.connect(_layout_header)
	header_right.resized.connect(_layout_header)
	layout = BoxContainer.new()
	layout.add_theme_constant_override("separation", 20)
	page.add_child(layout)
	setup_panel = panel()
	setup_panel.custom_minimum_size.x = 190
	layout.add_child(setup_panel)
	var setup := VBoxContainer.new()
	setup.add_theme_constant_override("separation", 14)
	setup_panel.add_child(setup)
	play_panel = VBoxContainer.new()
	play_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	play_panel.add_theme_constant_override("separation", 10)
	layout.add_child(play_panel)
	board = Board.new()
	board.custom_minimum_size = Vector2(280, 450)
	board.cell_pressed.connect(step)
	play_panel.add_child(board)
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
		control.action_mode = BaseButton.ACTION_MODE_BUTTON_PRESS
		direction_buttons.append(control)
		directions.add_child(control)
	var movement_help := label("Drag Mocha along a path, tap an adjacent tile, or use the direction buttons.", 13)
	movement_help.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	play_panel.add_child(movement_help)
	objectives_panel = panel()
	objectives_panel.custom_minimum_size.x = 230
	layout.add_child(objectives_panel)
	var objectives := VBoxContainer.new()
	objectives.add_theme_constant_override("separation", 18)
	objectives_panel.add_child(objectives)
	setup.add_child(label("Garden size", 15))
	size_select = OptionButton.new()
	for n in range(5, 15): size_select.add_item("%d × %d" % [n, n], n)
	size_select.selected = 1
	size_select.custom_minimum_size.y = 44
	size_select.add_theme_stylebox_override("normal", style("#f1e6cc", 10))
	size_select.add_theme_color_override("font_color", Color("#174f50"))
	setup.add_child(size_select)
	size_select.item_selected.connect(func(_index): generate())
	setup.add_child(button("New puzzle", generate, true))
	setup.add_child(label("Mode", 15))
	mode_select = OptionButton.new()
	mode_select.add_item("Normal", 0)
	mode_select.add_item("Hard", 1)
	mode_select.custom_minimum_size.y = 44
	mode_select.add_theme_stylebox_override("normal", style("#f1e6cc", 10))
	mode_select.add_theme_color_override("font_color", Color("#174f50"))
	setup.add_child(mode_select)
	mode_select.item_selected.connect(func(_index): generate())
	setup.add_child(label("Hard mode: collect all bones before picking up the key.", 14))
	objectives.add_child(label("YOUR CHECKLIST", 17))
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
	overlay = _make_overlay()
	var win_box := VBoxContainer.new()
	win_box.add_theme_constant_override("separation", 16)
	overlay.get_meta("card").add_child(win_box)
	win_box.add_child(label("A royal success.", 30))
	result = label("", 20)
	win_box.add_child(result)
	win_box.add_child(button("Another adventure", next_puzzle, true))
	win_box.add_child(button("Play again", restart))
	pause_cover = _make_overlay()
	pause_cover.add_theme_stylebox_override("panel", style("#174f5066", 0))
	pause_cover.process_mode = Node.PROCESS_MODE_ALWAYS
	var pause_box := VBoxContainer.new()
	pause_cover.get_meta("card").add_child(pause_box)
	pause_box.add_child(label("Garden paused", 30))
	pause_box.add_child(label("Your puzzle is waiting right here.", 18))
	pause_box.add_child(button("Resume", func(): get_node("/root/GPX").set_pause_reason("manual", false), true))
	help_cover = panel()
	help_cover.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	help_cover.add_theme_stylebox_override("panel", style("#8fd1db", 0))
	help_cover.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(help_cover)
	help_scroll = ScrollContainer.new()
	help_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	help_cover.add_child(help_scroll)
	var help_box := VBoxContainer.new()
	help_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	help_box.add_theme_constant_override("separation", 22)
	help_scroll.add_child(help_box)
	var back := button("Back to game", _hide_help, true)
	back.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	help_box.add_child(back)
	var help_title := label("How to play", 30)
	help_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	help_box.add_child(help_title)
	var tutorial := TutorialStrip.new()
	tutorial.name = "TutorialStrip"
	help_box.add_child(tutorial)
	help_box.add_child(label("Help Mocha collect all three bones and one key, then return to the doghouse.", 22))
	help_box.add_child(label("NORMAL MODE\nCollect the bones and key in any order, then go home.\n\nHARD MODE\nCollect all three bones first. The key stays in the garden until you have every bone. If you walk over it early, come back for it later.", 18))
	help_box.add_child(label("Drag Mocha along open paths, tap an adjacent tile, or use the direction buttons. On a keyboard, use arrow keys or WASD. Hedges block movement.\n\nThe timer starts on your first move and pauses while this page is open. Restart resets the current garden; New puzzle generates another.", 16))
	help_cover.hide()
	scroll.show()
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
	_layout_header()
	for popup in [overlay, pause_cover]:
		if popup != null: popup.get_meta("card").custom_minimum_size.x = minf(440, size.x - 40)
	layout.vertical = narrow
	setup_panel.custom_minimum_size.x = 0 if narrow else 190
	layout.move_child(setup_panel, 1 if narrow else 0)
	layout.move_child(play_panel, 0 if narrow else 1)
	objectives_panel.custom_minimum_size.x = 0 if narrow else 230
	# 125% of the prior grid target, capped to the available width on phones.
	var old_target := clampf(minf(size.x - 60, size.y * 0.60) if narrow else minf(size.x - 540, size.y * 0.65), 260, 580)
	var available := size.x - (40 if narrow else 520)
	board.custom_minimum_size.y = minf(available, old_target * 1.25)

func generate() -> void:
	var seed_value := str(Time.get_ticks_usec()) + "-" + str(randi())
	level = rules.generate(size_select.get_selected_id(), seed_value, mode_select.selected == 1)
	optimal = rules.solve(level).size()
	restart()

func _process(delta: float) -> void:
	if timer_running and not get_tree().paused:
		elapsed += delta
		_update_timer()

func _update_timer() -> void:
	var seconds := int(elapsed)
	timer_label.text = "%02d:%02d" % [int(seconds / 60.0), seconds % 60]

func _show_help() -> void:
	scroll.hide()
	help_cover.show()
	get_node("/root/GPX").set_pause_reason("help", true)

func _hide_help() -> void:
	help_cover.hide()
	scroll.show()
	get_node("/root/GPX").set_pause_reason("help", false)
	_paused(get_tree().paused)

func restart() -> void:
	state = rules.initial()
	history.clear()
	board.cancel_drag()
	elapsed = 0.0
	timer_running = false
	_update_timer()
	overlay.hide()
	for control in direction_buttons: control.disabled = false
	refresh()

func begin() -> void:
	if not begun:
		begun = true
		get_node("/root/GPX").game_start()
		music.play()

func step(to: int) -> void:
	if get_tree().paused or rules.won(level, state): return
	var next: Dictionary = rules.move(level, state, to)
	if next.is_empty(): return
	begin()
	timer_running = true
	history.append(state.duplicate())
	state = next
	if rules.won(level, state):
		var key := best_key()
		timer_running = false
		board.cancel_drag()
		if state.moves < int(saves.bests.get(key, 999999)):
			saves.bests[key] = state.moves
			_save()
		result.text = "Mocha is home!\n%s" % timer_label.text
		overlay.show()
		for control in direction_buttons: control.disabled = true
		get_node("/root/GPX").happyMoment()
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
	generate()

func best_key() -> String:
	return ("hard:" if level.get("hard", false) else "normal:") + str(level.size) + ":" + level.seed

func refresh() -> void:
	for i in 5:
		var complete: bool = bool(state.mask & (1 << i)) if i < 3 else bool(state.key) if i == 3 else rules.won(level, state)
		objective_checks[i].texture = checked_icon if complete else unchecked_icon
		objective_rows[i].add_theme_stylebox_override("panel", style("#dcefdc" if complete else "#f1e6cc", 12))
		objective_rows[i].tooltip_text = "Completed" if complete else "Still to collect" if i < 4 else "Collect the bones and key, then reach home"
	board.show_board(level, state, history, -1)

func _toggle_sound() -> void:
	begin()
	saves.muted = not bool(saves.muted)
	AudioServer.set_bus_mute(0, saves.muted)
	sound.text = "Sound off" if saves.muted else "Sound on"
	_save()

func _paused(value: bool) -> void:
	pause_cover.visible = value and not help_cover.visible
	board.locked = value
	board.set_blurred(value)
	for control in direction_buttons: control.disabled = value
	if value: board.cancel_drag()
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
func _layout_header() -> void:
	if header == null or header_right == null: return
	var compact := size.x < 600
	header.custom_minimum_size.y = 270 if compact else 220
	header_left.position = Vector2(0, 50 if compact else 0)
	header_right.position = Vector2(maxf(0, header.size.x - header_right.size.x), 50 if compact else 0)

