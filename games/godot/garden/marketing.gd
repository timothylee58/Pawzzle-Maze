extends Control
func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color("#8fd1db")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	if get_viewport_rect().size.x < 600:
		var dog := TextureRect.new()
		dog.texture = load("res://Sprites/textures/princess_mocha.png")
		dog.position = Vector2(36, 24)
		dog.size = Vector2(440, 440)
		dog.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		dog.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		add_child(dog)
		return
	var title := Label.new()
	title.position = Vector2(60, 125)
	title.text = "Pawzzle Maze"
	title.add_theme_font_size_override("font_size", 60)
	title.add_theme_color_override("font_color", Color("#174f50"))
	add_child(title)
	var subtitle := Label.new()
	subtitle.position = Vector2(64, 210)
	subtitle.text = "Mocha's Garden"
	subtitle.add_theme_font_size_override("font_size", 40)
	subtitle.add_theme_color_override("font_color", Color("#174f50"))
	add_child(subtitle)
	var message := Label.new()
	message.position = Vector2(64, 660)
	message.text = "Three bones. One key.\nFind your fewest moves home."
	message.add_theme_font_size_override("font_size", 28)
	message.add_theme_color_override("font_color", Color("#174f50"))
	add_child(message)
	var dog := TextureRect.new()
	dog.texture = load("res://Sprites/textures/princess_mocha.png")
	dog.position = Vector2(110, 300)
	dog.size = Vector2(320, 320)
	dog.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	dog.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	add_child(dog)
	var board = load("res://garden/board.gd").new()
	board.position = Vector2(570, 65)
	board.size = Vector2(730, 730)
	add_child(board)
	var rules = load("res://garden/rules.gd").new()
	board.show_board(rules.generate(6, "PAW-1024"), rules.initial(), [], -1)
