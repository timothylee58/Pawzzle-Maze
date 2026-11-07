extends Control
signal cell_pressed(cell: int)
var level: Dictionary = {}
var state: Dictionary = {}
var trail: Array = []
var hint := -1
var textures: Dictionary = {}
var board_rect := Rect2()
var cell_size := 1.0
var locked := false

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	resized.connect(queue_redraw)
	for item in ["princess_mocha", "wall_bush", "bone", "key", "dog_house"]:
		textures[item] = load("res://Sprites/textures/" + item + ".png")

func show_board(data: Dictionary, current: Dictionary, history: Array, hint_cell: int) -> void:
	level = data
	state = current
	trail = history
	hint = hint_cell
	queue_redraw()

func _draw() -> void:
	if level.is_empty(): return
	var side: float = minf(size.x, size.y) - 28
	board_rect = Rect2((size - Vector2.ONE * side) / 2, Vector2.ONE * side)
	cell_size = side / level.size
	var island := StyleBoxFlat.new()
	island.bg_color = Color("#7daf4c")
	island.border_color = Color("#d9c58e")
	island.set_border_width_all(9)
	island.set_corner_radius_all(22)
	island.shadow_color = Color("#4d8a8660")
	island.shadow_size = 8
	draw_style_box(island, board_rect.grow(12))
	for p in level.size * level.size:
		var rect := Rect2(board_rect.position + Vector2(p % level.size, p / level.size) * cell_size, Vector2.ONE * cell_size)
		draw_rect(rect, Color("#efe4ae") if p % 2 == 0 else Color("#e8dda3"))
		if p == hint:
			draw_rect(rect.grow(-3), Color("#37ac8b"), false, 4)
		for old in trail:
			if old.pos == p:
				draw_circle(rect.get_center(), 3, Color("#19a58b66"))
				break
		var item := ""
		var i: int = level.items.find(p)
		if i >= 0 and not (state.mask & (1 << i)): item = "bone"
		elif p == level.key and not state.key: item = "key"
		elif p == level.home: item = "dog_house"
		if not item.is_empty(): draw_texture_rect(textures[item], rect.grow(-cell_size * 0.12), false)
		if p == state.pos: draw_texture_rect(textures.princess_mocha, rect.grow(-cell_size * 0.03), false)
	# Paint hedges after cells so neighbouring tiles cannot cover their edges.
	for p in level.size * level.size:
		var rect := Rect2(board_rect.position + Vector2(p % level.size, p / level.size) * cell_size, Vector2.ONE * cell_size)
		if p % level.size < level.size - 1 and not level.edges[p].has(p + 1):
			var wall := Rect2(Vector2(rect.end.x - 4, rect.position.y), Vector2(8, cell_size))
			draw_rect(wall, Color("#629b37"))
			_draw_hedge(wall)
		if p < level.size * (level.size - 1) and not level.edges[p].has(p + level.size):
			var wall := Rect2(Vector2(rect.position.x, rect.end.y - 4), Vector2(cell_size, 8))
			draw_rect(wall, Color("#629b37"))
			_draw_hedge(wall)

func _draw_hedge(rect: Rect2) -> void:
	var vertical := rect.size.y > rect.size.x
	var length: float = rect.size.y if vertical else rect.size.x
	var count := maxi(1, int(ceil(length / 18.0)))
	for i in count:
		var center := rect.position + (Vector2(4, (i + 0.5) * length / count) if vertical else Vector2((i + 0.5) * length / count, 4))
		draw_texture_rect(textures.wall_bush, Rect2(center - Vector2(13, 13), Vector2(26, 26)), false)

func _gui_input(event: InputEvent) -> void:
	if locked or level.is_empty(): return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if board_rect.has_point(event.position):
			var grid: Vector2 = (event.position - board_rect.position) / cell_size
			cell_pressed.emit(int(grid.y) * level.size + int(grid.x))
			accept_event()
