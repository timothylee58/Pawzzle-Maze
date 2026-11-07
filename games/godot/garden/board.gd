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
var dragging := false
var active_touch := -1
var drag_position := Vector2.ZERO

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
	var hedge_size := minf(26, cell_size * 0.38)
	var count := maxi(1, int(ceil(length / (hedge_size * 0.7))))
	for i in count:
		var center := rect.position + (Vector2(4, (i + 0.5) * length / count) if vertical else Vector2((i + 0.5) * length / count, 4))
		draw_texture_rect(textures.wall_bush, Rect2(center - Vector2.ONE * hedge_size / 2, Vector2.ONE * hedge_size), false)

func cancel_drag() -> void:
	dragging = false
	active_touch = -1

func _cell_at(point: Vector2) -> int:
	if not board_rect.has_point(point): return -1
	var grid := (point - board_rect.position) / cell_size
	return int(grid.y) * int(level.size) + int(grid.x)

func _press_at(point: Vector2) -> bool:
	var cell := _cell_at(point)
	if cell < 0: return false
	if cell == state.pos:
		dragging = true
		drag_position = point
	else:
		cell_pressed.emit(cell)
	return true

func _drag_to(point: Vector2) -> void:
	if not dragging: return
	# Sample fast gestures so every crossed tile is checked against the rules.
	var from := drag_position
	var samples := maxi(1, int(ceil(from.distance_to(point) / maxf(1, cell_size * 0.2))))
	for i in range(1, samples + 1):
		if not dragging: break
		var cell := _cell_at(from.lerp(point, float(i) / samples))
		if cell >= 0 and cell != state.pos:
			var previous: int = state.pos
			cell_pressed.emit(cell)
			if state.pos == previous:
				# A wall/locked home stops this gesture. Lift and drag again.
				cancel_drag()
				break
	drag_position = point

func _input(event: InputEvent) -> void:
	if locked or level.is_empty() or get_tree().paused:
		cancel_drag()
		return
	var transform := get_global_transform_with_canvas().affine_inverse()
	if event is InputEventScreenTouch:
		if event.pressed and active_touch == -1:
			if _press_at(transform * event.position):
				if dragging: active_touch = event.index
				get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == active_touch:
			cancel_drag()
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and event.index == active_touch:
		_drag_to(transform * event.position)
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.device != InputEvent.DEVICE_ID_EMULATION:
		if event.pressed:
			if _press_at(transform * event.position): get_viewport().set_input_as_handled()
		elif dragging:
			cancel_drag()
			get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and dragging and active_touch == -1:
		_drag_to(transform * event.position)
		get_viewport().set_input_as_handled()
