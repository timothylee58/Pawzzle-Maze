extends Control
const Rules = preload("res://garden/rules.gd")
const Board = preload("res://garden/board.gd")
const TutorialStrip = preload("res://garden/tutorial_strip.gd")
const SAVE_KEY := "pawzzle-garden-godot-v1"
var rules = Rules.new()
var level: Dictionary = {}
var state: Dictionary = {}
var history: Array = []
var optimal := -1
var minimum_label: Label
var saves: Dictionary = {"bests": {}, "muted": false}
var board: Control
var sidebar_scroll: ScrollContainer
var sidebar: VBoxContainer
var directions: GridContainer
var help_back: Button
var size_select: OptionButton
var setup_panel: PanelContainer
const MODE_NAMES := ["Classic", "Hard", "Brutal"]
const MODE_DESCRIPTIONS := [
	"Collect all bones and the key in any order, then return home.",
	"Collect all bones before picking up the key, then return home. You may revisit cells.",
	"Collect all bones before picking up the key, then return home without revisiting any cell."
]
var selected_mode := 0
var mode_buttons: Array[CheckBox] = []
var mode_description: Label
var tutorial: Control
var tutorial_status: Label
var tutorial_buttons: Array = []
var tutorial_level: Dictionary = {}
var tutorial_state: Dictionary = {}
var tutorial_history: Array = []
var control_strip: ScrollContainer
var control_row: HBoxContainer
var pause_button: Button
var win_next: Button
var win_restart: Button
var header: Control
var toolbar: HBoxContainer
var toolbar_scroll: ScrollContainer
var toolbar_margin: MarginContainer
var undo_button: Button
var restart_button: Button
var header_right: VBoxContainer
var title_center: CenterContainer
var direction_buttons: Array = []
var timer_label: Label
var help_cover: PanelContainer
var help_scroll: ScrollContainer
var elapsed := 0.0
var timer_running := false
var result: Label
var sound: Button
var layout: BoxContainer
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
	return _svg_icon('<path transform="rotate(%d 12 12)" d="M12 20V4m-7 7 7-7 7 7" fill="none" stroke="#174f50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' % angle)

func _ready() -> void:
	theme = Theme.new()
	var playful_font := FontVariation.new()
	playful_font.base_font = load("res://garden/fonts/Fredoka.ttf")
	playful_font.variation_opentype = {"wght": 500}
	theme.default_font = playful_font
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
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	for edge in ["left", "right", "top", "bottom"]: margin.add_theme_constant_override("margin_" + edge, 12)
	scroll.add_child(margin)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 12)
	page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(page)
	title_center = CenterContainer.new()
	title_center.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	title_center.custom_minimum_size.y = 44
	title_center.size_flags_vertical = Control.SIZE_SHRINK_CENTER
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
	header_right = VBoxContainer.new()

	timer_label = label("0 seconds", 22)
	timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	timer_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	timer_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	var tools_row := HBoxContainer.new()
	header_right.add_child(tools_row)
	tools_row.add_child(timer_label)
	_add_gap(tools_row, 12)
	tools_row.add_child(icon_button("help", "How to play", _show_help))
	sound = icon_button("muted" if saves.muted else "sound", "Turn sound on" if saves.muted else "Mute sound", _toggle_sound)
	tools_row.add_child(sound)
	pause_button = icon_button("pause", "Pause", _toggle_pause)
	pause_button.process_mode = Node.PROCESS_MODE_ALWAYS
	tools_row.add_child(pause_button)
	layout = BoxContainer.new()
	layout.add_theme_constant_override("separation", 12)
	layout.size_flags_vertical = Control.SIZE_EXPAND_FILL
	page.add_child(layout)
	sidebar_scroll = ScrollContainer.new()
	sidebar_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	layout.add_child(sidebar_scroll)
	sidebar = VBoxContainer.new()
	sidebar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sidebar.add_theme_constant_override("separation", 12)
	sidebar_scroll.add_child(sidebar)
	setup_panel = panel()
	var setup_style := style("#fff9e9")
	setup_style.content_margin_left = 12
	setup_style.content_margin_right = 12
	setup_panel.add_theme_stylebox_override("panel", setup_style)
	setup_panel.custom_minimum_size.x = 0
	setup_panel.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	sidebar.add_child(setup_panel)
	var setup := VBoxContainer.new()
	setup.add_theme_constant_override("separation", 8)
	setup_panel.add_child(setup)
	play_panel = VBoxContainer.new()
	play_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	play_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	play_panel.add_theme_constant_override("separation", 10)
	layout.add_child(play_panel)
	control_strip = ScrollContainer.new()
	control_strip.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	control_strip.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	control_strip.custom_minimum_size.y = 58
	page.add_child(control_strip)
	page.move_child(control_strip, layout.get_index())
	control_row = HBoxContainer.new()
	control_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control_row.add_theme_constant_override("separation", 16)
	control_strip.add_child(control_row)
	control_row.add_child(title_center)
	var brand_flex := Control.new()
	brand_flex.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control_row.add_child(brand_flex)
	toolbar = HBoxContainer.new()
	toolbar.add_theme_constant_override("separation", 6)
	control_row.add_child(toolbar)
	directions = GridContainer.new()
	directions.columns = 4
	directions.add_theme_constant_override("h_separation", 6)
	directions.add_theme_constant_override("v_separation", 6)
	toolbar.add_child(directions)
	for entry in [["Up", Vector2i.UP], ["Left", Vector2i.LEFT], ["Down", Vector2i.DOWN], ["Right", Vector2i.RIGHT]]:
		if entry[0] == "":
			directions.add_child(Control.new())
			continue
		var direction: Vector2i = entry[1]
		var control := button("", func(): move_direction(direction))
		control.tooltip_text = entry[0]
		control.name = "Move" + entry[0]
		control.icon = _arrow_icon(direction)
		_round_button(control)
		control.focus_mode = Control.FOCUS_NONE
		control.action_mode = BaseButton.ACTION_MODE_BUTTON_PRESS
		direction_buttons.append(control)
		directions.add_child(control)
	_add_gap(toolbar, 18)
	undo_button = icon_button("undo", "Undo last move", undo)
	toolbar.add_child(undo_button)
	restart_button = icon_button("restart", "Restart puzzle", restart)
	restart_button.process_mode = Node.PROCESS_MODE_ALWAYS
	toolbar.add_child(restart_button)
	var toolbar_flex := Control.new()
	toolbar_flex.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control_row.add_child(toolbar_flex)
	control_row.add_child(header_right)
	board = Board.new()
	board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	board.cell_pressed.connect(step)
	play_panel.add_child(board)
	var size_row := HBoxContainer.new()
	size_row.add_theme_constant_override("separation", 6)
	setup.add_child(size_row)
	var size_caption := label("Garden size", 17)
	size_caption.autowrap_mode = TextServer.AUTOWRAP_OFF
	size_row.add_child(size_caption)
	size_select = OptionButton.new()
	size_select.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	for n in range(5, 15): size_select.add_item("%d × %d" % [n, n], n)
	size_select.add_theme_font_size_override("font_size", 17)
	size_select.get_popup().add_theme_font_size_override("font_size", 17)
	size_select.alignment = HORIZONTAL_ALIGNMENT_CENTER
	size_select.selected = 2
	size_select.custom_minimum_size.y = 44
	size_select.add_theme_stylebox_override("normal", style("#f1e6cc", 10))
	size_select.add_theme_color_override("font_color", Color("#174f50"))
	size_row.add_child(size_select)
	var select_style := style("#f1e6cc", 10)
	select_style.content_margin_left = 8
	select_style.content_margin_right = 8
	size_select.add_theme_stylebox_override("normal", select_style)
	size_select.item_selected.connect(func(_index): generate())
	var new_puzzle := button("New puzzle", generate, true)
	new_puzzle.add_theme_font_size_override("font_size", 19)
	setup.add_child(new_puzzle)
	var divider := HSeparator.new()
	divider.custom_minimum_size.y = 20
	setup.add_child(divider)
	setup.add_child(label("Difficulty mode", 20))
	var mode_group := ButtonGroup.new()
	for index in MODE_NAMES.size():
		var choice := CheckBox.new()
		choice.text = MODE_NAMES[index]
		choice.button_group = mode_group
		choice.button_pressed = index == selected_mode
		choice.custom_minimum_size.y = 44
		choice.add_theme_font_size_override("font_size", 20)
		for appearance in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_focus_color"]:
			choice.add_theme_color_override(appearance, Color("#174f50"))
		choice.add_theme_icon_override("radio_unchecked", _svg_icon('<circle cx="12" cy="12" r="8" fill="none" stroke="#174f50" stroke-width="2"/>'))
		choice.add_theme_icon_override("radio_checked", _svg_icon('<circle cx="12" cy="12" r="8" fill="none" stroke="#174f50" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#229c7a"/>'))
		choice.pressed.connect(_mode_changed.bind(index))
		setup.add_child(choice)
		mode_buttons.append(choice)
	mode_description = label(MODE_DESCRIPTIONS[selected_mode], 18)
	var description_space := Control.new()
	description_space.custom_minimum_size.y = 160
	setup.add_child(description_space)
	description_space.add_child(mode_description)
	mode_description.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var optimum_gap := Control.new()
	optimum_gap.custom_minimum_size.y = 20
	setup.add_child(optimum_gap)
	minimum_label = label("", 19)
	minimum_label.tooltip_text = "Fewest legal tile moves from the start to collect all bones and the key, then reach home in the selected mode."
	setup.add_child(minimum_label)
	overlay = _make_overlay()
	var win_box := VBoxContainer.new()
	win_box.add_theme_constant_override("separation", 16)
	overlay.get_meta("card").add_child(win_box)
	win_box.add_child(label("A royal success.", 30))
	result = label("", 20)
	win_box.add_child(result)
	win_next = button("Another adventure", next_puzzle, true)
	win_next.name = "AnotherAdventure"
	win_box.add_child(win_next)
	win_restart = button("Play again", restart)
	win_restart.name = "PlayAgain"
	win_box.add_child(win_restart)
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
	help_back = icon_button("back", "Back to game", _hide_help)
	help_back.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	help_box.add_child(help_back)
	var help_title := label("How to play", 30)
	help_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	help_box.add_child(help_title)
	tutorial = TutorialStrip.new()
	tutorial.name = "TutorialStrip"
	tutorial.cell_pressed.connect(_tutorial_step)
	help_box.add_child(tutorial)
	tutorial_status = label("", 18)
	tutorial_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	help_box.add_child(tutorial_status)
	var tutorial_controls := HBoxContainer.new()
	tutorial_controls.alignment = BoxContainer.ALIGNMENT_CENTER
	help_box.add_child(tutorial_controls)
	for entry in [["Up", Vector2i.UP], ["Left", Vector2i.LEFT], ["Down", Vector2i.DOWN], ["Right", Vector2i.RIGHT]]:
		var direction: Vector2i = entry[1]
		var arrow := button("", func(): _tutorial_move(direction))
		arrow.icon = _arrow_icon(direction)
		arrow.tooltip_text = entry[0]
		_round_button(arrow)
		tutorial_controls.add_child(arrow)
		tutorial_buttons.append(arrow)
	tutorial_controls.add_child(icon_button("restart", "Restart tutorial", _reset_tutorial))
	_add_help_section(help_box, "Your goal", "Collect three bones on 5×5–8×8 gardens, or five bones on 9×9–14×14 gardens. Pick up the key and return to the doghouse. Every puzzle has a verified route without backtracking. Practise on the strip by clicking an adjacent tile or using the arrows.")
	for index in MODE_NAMES.size():
		_add_help_section(help_box, MODE_NAMES[index] + " mode", MODE_DESCRIPTIONS[index])
	_add_help_section(help_box, "Created by", "Frankie — Developed and refined the web app prototype used as the reference for the Godot game.\n\nTimothy — Developed the infrastructure and maze APIs.\n\nHan — Integrated the assets into Godot and carried out penetration testing and debugging.\n\nColin — Designed the sprites and visual assets in Figma.")
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
	layout.vertical = false
	sidebar_scroll.custom_minimum_size.x = 194 if size.x < 600 else 240
	directions.columns = 4
	for control in direction_buttons + [undo_button, restart_button]:
		control.custom_minimum_size = Vector2(44, 44)

func generate() -> void:
	var seed_value := str(Time.get_ticks_usec()) + "-" + str(randi())
	# Certify every garden for Brutal so switching modes never changes its layout.
	level = rules.generate(size_select.get_selected_id(), seed_value, true, true)
	_apply_mode()

func _process(delta: float) -> void:
	if timer_running and not get_tree().paused:
		elapsed += delta
		_update_timer()

func _update_timer() -> void:
	var seconds := int(elapsed)
	timer_label.text = "%d seconds" % seconds

func _show_help() -> void:
	scroll.hide()
	help_cover.show()
	_reset_tutorial()
	get_node("/root/GPX").set_pause_reason("help", true)

func _hide_help() -> void:
	help_cover.hide()
	scroll.show()
	get_node("/root/GPX").set_pause_reason("help", false)
	_paused(get_tree().paused)

func restart() -> void:
	get_node("/root/GPX").set_pause_reason("manual", false)
	minimum_label.text = "Minimum steps to win: %d" % optimal if optimal >= 0 else "No solution"
	state = rules.initial(level)
	history.clear()
	board.cancel_drag()
	elapsed = 0.0
	timer_running = true
	_update_timer()
	overlay.hide()
	for control in direction_buttons: control.disabled = false
	refresh()

func undo() -> void:
	if get_tree().paused or overlay.visible or help_cover.visible or history.is_empty(): return
	state = history.pop_back()
	board.cancel_drag()
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
		result.text = "Mocha is home!\n%s\nYour steps: %d\nMinimum steps: %d" % [timer_label.text, state.moves, optimal]
		if optimal >= 0 and state.moves == optimal: result.text += "\nPerfect route!"
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
	return ("brutal:" if level.get("brutal", false) else "hard:" if level.get("hard", false) else "normal:") + str(level.size) + ":" + level.seed

func refresh() -> void:
	board.locked = get_tree().paused or overlay.visible or help_cover.visible
	undo_button.disabled = board.locked or history.is_empty()
	board.show_board(level, state, history, -1)

func _toggle_sound() -> void:
	begin()
	saves.muted = not bool(saves.muted)
	AudioServer.set_bus_mute(0, saves.muted)
	sound.icon = _control_icon("muted" if saves.muted else "sound")
	sound.tooltip_text = "Turn sound on" if saves.muted else "Mute sound"
	_save()

func _paused(value: bool) -> void:
	pause_cover.visible = value and not help_cover.visible and not get_node("/root/GPX").pause_reasons.has("manual")
	board.locked = value or overlay.visible or help_cover.visible
	pause_button.icon = _control_icon("play" if value else "pause")
	pause_button.tooltip_text = "Resume" if value else "Pause"
	board.set_blurred(value)
	for control in direction_buttons: control.disabled = value or overlay.visible
	undo_button.disabled = value or overlay.visible or history.is_empty()
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
	if header == null: return
	header.custom_minimum_size.y = 46

func _mode_changed(index: int) -> void:
	selected_mode = index
	mode_buttons[index].set_pressed_no_signal(true)
	mode_description.text = MODE_DESCRIPTIONS[index]
	if not level.is_empty(): _apply_mode()

func _apply_mode() -> void:
	level.hard = selected_mode > 0
	level.brutal = selected_mode == 2
	optimal = rules.solve_result(level).minimum_steps
	restart()

func _add_help_section(parent: VBoxContainer, heading: String, body: String) -> void:
	var section := VBoxContainer.new()
	section.add_theme_constant_override("separation", 6)
	parent.add_child(section)
	section.add_child(label(heading, 22))
	var inset := MarginContainer.new()
	inset.add_theme_constant_override("margin_left", 22)
	inset.add_theme_constant_override("margin_right", 22)
	section.add_child(inset)
	inset.add_child(label(body, 18))

func _add_gap(parent: Container, width: float) -> void:
	var gap := Control.new()
	gap.custom_minimum_size.x = width
	gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(gap)

func _round_button(control: Button) -> void:
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	control.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	control.expand_icon = true
	control.add_theme_constant_override("icon_max_width", 24)
	control.focus_mode = Control.FOCUS_NONE
	for appearance in ["normal", "hover", "pressed", "disabled", "focus"]:
		var circle := StyleBoxFlat.new()
		circle.bg_color = Color("#f1e6cc") if appearance != "hover" else Color("#e6dbbd")
		if appearance == "disabled": circle.bg_color = Color("#f1e6cc88")
		circle.set_corner_radius_all(22)
		circle.set_content_margin_all(10)
		control.add_theme_stylebox_override(appearance, circle)

func _reset_tutorial() -> void:
	var edges: Array = []
	for i in 14:
		var adjacent: Array = []
		if i > 0: adjacent.append(i - 1)
		if i < 13: adjacent.append(i + 1)
		edges.append(adjacent)
	tutorial_level = {"size": 14, "edges": edges, "items": [1, 4, 7], "key": 10, "home": 13, "hard": selected_mode > 0, "brutal": selected_mode == 2}
	tutorial_state = rules.initial(tutorial_level)
	tutorial_history.clear()
	_refresh_tutorial()

func _tutorial_move(direction: Vector2i) -> void:
	if rules.won(tutorial_level, tutorial_state) or direction.y != 0: return
	_tutorial_step(tutorial_state.pos + direction.x)

func _tutorial_step(cell: int) -> void:
	if rules.won(tutorial_level, tutorial_state): return
	var next: Dictionary = rules.move(tutorial_level, tutorial_state, cell)
	if next.is_empty(): return
	tutorial_history.append(tutorial_state)
	tutorial_state = next
	_refresh_tutorial()

func _refresh_tutorial() -> void:
	tutorial.show_state(tutorial_state, tutorial_history)
	var complete := rules.won(tutorial_level, tutorial_state)
	tutorial_status.text = "Mocha is home! Tutorial complete." if complete else ""
	tutorial_status.visible = complete
	for arrow in tutorial_buttons: arrow.disabled = complete

func _toggle_pause() -> void:
	var gpx = get_node("/root/GPX")
	gpx.set_pause_reason("manual", not gpx.pause_reasons.has("manual"))

func icon_button(kind: String, description: String, action: Callable) -> Button:
	var control := button("", action)
	control.icon = _control_icon(kind)
	control.tooltip_text = description
	_round_button(control)
	control.focus_mode = Control.FOCUS_NONE
	return control

func _control_icon(kind: String) -> Texture2D:
	var paths := {
		"back": '<path d="M20 12H4m7-7-7 7 7 7" fill="none" stroke="#174f50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
		"pause": '<path d="M8 5v14M16 5v14" stroke="#174f50" stroke-width="4"/>',
		"play": '<path d="m7 4 14 8-14 8z" fill="#174f50"/>',
		"help": '<path d="M8 8a4 4 0 1 1 6 3.5c-2 1-2 2-2 3" fill="none" stroke="#174f50" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="19" r="1.4" fill="#174f50"/>',
		"undo": '<path d="M9 5 3 11l6 6M3 11h11a6 6 0 0 1 6 6v2" fill="none" stroke="#174f50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
		"restart": '<path d="M5 8a8 8 0 1 1-1 7M5 3v6h6" fill="none" stroke="#174f50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
		"sound": '<path d="M3 9h4l5-4v14l-5-4H3z" fill="#174f50"/><path d="M16 8q4 4 0 8M19 5q7 7 0 14" fill="none" stroke="#174f50" stroke-width="2" stroke-linecap="round"/>',
		"muted": '<path d="M3 9h4l5-4v14l-5-4H3z" fill="#174f50"/><path d="m16 9 6 6m0-6-6 6" stroke="#174f50" stroke-width="2" stroke-linecap="round"/>'
	}
	return _svg_icon(paths[kind])


