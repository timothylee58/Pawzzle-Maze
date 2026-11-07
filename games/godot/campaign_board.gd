extends Control
signal cell_requested(cell: int)
signal direction_requested(direction: String)
const Rules = preload("res://campaign_rules.gd")
const Crossed = preload("res://rules.gd")
const DOG = preload("res://Sprites/atlas/princess_mocha.tres")
const HOUSE = preload("res://Sprites/atlas/dog_house.tres")
const TREAT = preload("res://Sprites/atlas/golden_treat.tres")
const CROWN = preload("res://Sprites/atlas/royal_discovery.tres")
const BUSH = preload("res://Sprites/atlas/wall_bush.tres")
var definition: Dictionary = {}
var state: Dictionary = {}
var route: Array = []
var dragging := false
var last := Vector2.ZERO
var editable := true

func _ready():
	focus_mode = Control.FOCUS_ALL
	mouse_filter = Control.MOUSE_FILTER_STOP
	resized.connect(queue_redraw)

func center(cell: int) -> Vector2:
	var n := int(definition.width)
	return Vector2(cell % n + 0.5, floori(cell / float(n)) + 0.5) * size / n

func sprite(texture: Texture2D, cell: int, scale_value := 0.85, offset := Vector2.ZERO, tint := Color.WHITE):
	var side := size.x / float(definition.width)
	var art := Vector2.ONE * side * scale_value
	draw_texture_rect(texture, Rect2(center(cell) + offset * side - art / 2, art), false, tint)

func wall(a: int, b: int, color: Color, hedge: bool):
	var mid := (center(a) + center(b)) / 2
	var side := size.x / float(definition.width)
	var half := Vector2(0, side / 2) if abs(a - b) == 1 else Vector2(side / 2, 0)
	draw_line(mid - half, mid + half, color, maxf(3, side * 0.055), true)
	if hedge:
		for i in 3:
			var at := (mid - half).lerp(mid + half, (i + 0.5) / 3)
			draw_texture_rect(BUSH, Rect2(at - Vector2.ONE * side * 0.12, Vector2.ONE * side * 0.24), false)

func _draw():
	if definition.is_empty(): return
	var n := int(definition.width)
	var side := size.x / n
	for cell in n * n:
		draw_rect(Rect2(center(cell) - Vector2.ONE * side / 2, Vector2.ONE * side), Color("e5edce") if (cell + cell / n) % 2 == 0 else Color("f2f2df"))
		for dest in [cell + 1 if cell % n < n - 1 else -1, cell + n if cell + n < n * n else -1]:
			if dest < 0: continue
			var edge := Rules.passage(definition, state, cell, dest)
			if edge.has("requestId"):
				wall(cell, dest, Color("ac8530") if not edge.open else Color("b7d7a4"), false)
			elif not edge.open: wall(cell, dest, Color("54774a"), true)
	draw_rect(Rect2(Vector2.ZERO, size), Color("54774a"), false, 3)
	for i in range(1, route.size()): draw_line(center(route[i-1]), center(route[i]), Color(0.23, 0.53, 0.48, 0.4), maxf(3, side * 0.07), true)
	sprite(HOUSE, int(definition.goalCell))
	for i in definition.discoveries.size():
		if not (int(state.collectedDiscoveryMask) & (1 << i)): sprite(TREAT, int(definition.discoveries[i].cell), 0.6)
	for tile in definition.interactionCells:
		draw_circle(center(int(tile.cell)), side * 0.4, Color("eddca7"))
		sprite(DOG, int(tile.cell), 0.55, Vector2(0.18, -0.12))
		sprite(CROWN, int(tile.cell), 0.35, Vector2(0.18, -0.34))
	# The player's warm tint and blue position ring distinguish them from Mocha.
	draw_arc(center(int(state.dogCell)), side * 0.32, 0, TAU, 40, Color("267b91"), 3, true)
	sprite(DOG, int(state.dogCell), 0.64, Vector2(-0.06, 0.08), Color(1, 0.80, 0.60))
	if int(state.carriedDiscoveryMask): sprite(TREAT, int(state.dogCell), 0.3, Vector2(-0.22, -0.30))

func _gui_input(event: InputEvent):
	if not editable: return
	if event is InputEventKey and event.pressed and not event.echo:
		var keys := {KEY_UP: "up", KEY_DOWN: "down", KEY_LEFT: "left", KEY_RIGHT: "right"}
		if keys.has(event.keycode):
			direction_requested.emit(keys[event.keycode])
			accept_event()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging = event.pressed
		if dragging:
			grab_focus()
			last = event.position / size * float(definition.width)
			request_point(last)
		accept_event()
	if event is InputEventMouseMotion and dragging:
		var point: Vector2 = event.position / size * float(definition.width)
		var n := int(definition.width)
		if point.x < 0 or point.y < 0 or point.x >= n or point.y >= n:
			dragging = false
			return
		for cell in Crossed.crossed(last, point, n):
			cell_requested.emit(cell)
			if not dragging: break
		last = point
		accept_event()

func request_point(p: Vector2):
	var n := int(definition.width)
	if p.x >= 0 and p.y >= 0 and p.x < n and p.y < n: cell_requested.emit(floori(p.y) * n + floori(p.x))
