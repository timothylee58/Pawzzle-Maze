extends Control
signal cell_pressed(cell: int)
signal cells_crossed(cells: Array)
signal drag_ended
signal direction_pressed(delta: int)
const DOG = preload("res://Sprites/atlas/princess_mocha.tres")
const HOUSE = preload("res://Sprites/atlas/dog_house.tres")
const BUSH = preload("res://Sprites/atlas/wall_bush.tres")
const WALL = preload("res://Sprites/atlas/wall.tres")
var n := 6
var maze: Dictionary = {}
var layer: Node2D
var dragging := false
var last := Vector2.ZERO
var route: Array = []
var best_route: Array = []
var optimal_route: Array = []

func _ready():
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_ALL
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	layer = Node2D.new()
	add_child(layer)
	resized.connect(queue_redraw)

func set_maze(definition: Dictionary):
	maze = definition
	n = maze.n
	route = []
	best_route = []
	optimal_route = []
	queue_redraw()

func show_routes(path: Array, best: Array = [], optimal: Array = []):
	route = path.duplicate()
	best_route = best.duplicate()
	optimal_route = optimal.duplicate()
	queue_redraw()

func cell_center(cell: int) -> Vector2:
	return Vector2(cell % n + 0.5, floori(cell / float(n)) + 0.5) * size / float(n)

func draw_route(path: Array, color: Color, dotted: bool = false):
	var width := maxf(2.0, size.x / n * 0.09)
	for i in range(1, path.size()):
		var a := cell_center(path[i - 1])
		var b := cell_center(path[i])
		if dotted:
			for dot in 5:
				draw_circle(a.lerp(b, float(dot) / 5.0), width * 0.55, color)
		else:
			draw_line(a, b, color, width, true)

func draw_wall(a: Vector2, b: Vector2, hedge: bool):
	var cell_size := size.x / float(n)
	draw_line(a, b, Color("466646"), maxf(3.0, cell_size * 0.12), true)
	var stamp := Vector2.ONE * cell_size * 0.30
	for part in 4:
		var at := a.lerp(b, (part + 0.5) / 4.0)
		draw_texture_rect(BUSH if hedge else WALL, Rect2(at - stamp / 2.0, stamp), false)

func _draw():
	if maze.is_empty() or not layer.visible: return
	draw_rect(Rect2(Vector2.ZERO, size), Color("edf1dc"))
	var cell_size := size / float(n)
	for cell in n * n:
		var x := cell % n
		var y := floori(cell / float(n))
		var at := Vector2(x, y) * cell_size
		if (x + y) % 2 == 0:
			draw_rect(Rect2(at, cell_size), Color("e4ebce"))
		if x < n - 1 and not cell + 1 in maze.graph[cell]:
			draw_wall(at + Vector2(cell_size.x, 0), at + cell_size, true)
		if y < n - 1 and not cell + n in maze.graph[cell]:
			draw_wall(at + Vector2(0, cell_size.y), at + cell_size, false)
	draw_rect(Rect2(Vector2.ZERO, size), Color("486b43"), false, 3.0)
	draw_route(best_route, Color("9cb9a5"))
	draw_route(route, Color("387c70"))
	draw_route(optimal_route, Color("b95127"), true)
	var art_size := cell_size * 0.92
	draw_texture_rect(HOUSE, Rect2(cell_center(n * n - 1) - art_size / 2.0, art_size), false)
	var dog_cell: int = 0 if route.is_empty() else int(route.back())
	draw_texture_rect(DOG, Rect2(cell_center(dog_cell) - art_size / 2.0, art_size), false)

func point(position_in_board: Vector2) -> Vector2:
	return position_in_board / size * float(n)

func _gui_input(event: InputEvent):
	if event is InputEventKey and event.pressed and not event.echo:
		var directions := {KEY_UP: -n, KEY_DOWN: n, KEY_LEFT: -1, KEY_RIGHT: 1}
		if directions.has(event.keycode):
			direction_pressed.emit(directions[event.keycode])
			accept_event()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			grab_focus()
			last = point(event.position)
			if last.x >= 0 and last.y >= 0 and last.x < n and last.y < n:
				cell_pressed.emit(int(floor(last.y)) * n + int(floor(last.x)))
		else:
			dragging = false
			drag_ended.emit()
	if event is InputEventMouseMotion and dragging:
		var p := point(event.position)
		if p.x < 0 or p.y < 0 or p.x >= n or p.y >= n:
			dragging = false
			drag_ended.emit()
			return
		cells_crossed.emit(preload("res://rules.gd").crossed(last, p, n))
		last = p
