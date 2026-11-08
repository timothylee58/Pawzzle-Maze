extends Control
signal cell_pressed(cell: int)
var textures: Dictionary = {}
var state: Dictionary = {"pos": 0, "mask": 0, "key": false}
var trail: Array = []
const PLACEMENT := {1: "bone", 4: "bone", 7: "bone", 10: "key", 13: "dog_house"}

func _ready() -> void:
	custom_minimum_size.y = 130
	mouse_filter = Control.MOUSE_FILTER_STOP
	for item in ["princess_mocha", "bone", "key", "dog_house", "wall_bush"]:
		textures[item] = load("res://Sprites/textures/" + item + ".png")
	resized.connect(queue_redraw)

func _draw() -> void:
	if textures.is_empty(): return
	var cell := maxf(1, minf((size.x - 28) / 14.0, 100.0))
	var origin := Vector2((size.x - cell * 14) / 2, (size.y - cell) / 2)
	for i in 14:
		var rect := Rect2(origin + Vector2(i * cell, 0), Vector2.ONE * cell)
		draw_rect(rect, Color("#efe4ae") if i % 2 == 0 else Color("#e8dda3"))
		draw_rect(rect, Color("#9fb06d"), false, 1.5)
		if PLACEMENT.has(i):
			var item: String = PLACEMENT[i]
			var bone_index: int = [1, 4, 7].find(i)
			if (bone_index < 0 or not (state.mask & (1 << bone_index))) and (i != 10 or not state.key):
				draw_texture_rect(textures[item], rect.grow(-cell * 0.08), false)
		if i == state.pos: draw_texture_rect(textures.princess_mocha, rect.grow(-cell * 0.08), false)

	var bounds := Rect2(origin, Vector2(cell * 14, cell))
	for wall in [
		Rect2(bounds.position - Vector2(0, 4), Vector2(bounds.size.x, 8)),
		Rect2(Vector2(bounds.position.x, bounds.end.y - 4), Vector2(bounds.size.x, 8)),
		Rect2(bounds.position - Vector2(4, 0), Vector2(8, bounds.size.y)),
		Rect2(Vector2(bounds.end.x - 4, bounds.position.y), Vector2(8, bounds.size.y))
	]:
		draw_rect(wall, Color("#629b37"))
		_draw_hedge(wall, cell)

func _draw_hedge(rect: Rect2, cell: float) -> void:
	var vertical := rect.size.y > rect.size.x
	var length: float = rect.size.y if vertical else rect.size.x
	var hedge_size := minf(26, cell * 0.38)
	var count := maxi(1, int(ceil(length / (hedge_size * 0.7))))
	for i in count:
		var center := rect.position + (Vector2(4, (i + 0.5) * length / count) if vertical else Vector2((i + 0.5) * length / count, 4))
		draw_texture_rect(textures.wall_bush, Rect2(center - Vector2.ONE * hedge_size / 2, Vector2.ONE * hedge_size), false)

func show_state(current: Dictionary, history: Array) -> void:
	state = current
	trail = history
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	var point: Vector2
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		point = event.position
	elif event is InputEventScreenTouch and event.pressed:
		point = event.position
	else:
		return
	var cell := maxf(1, minf((size.x - 28) / 14.0, 100.0))
	var origin := Vector2((size.x - cell * 14) / 2, (size.y - cell) / 2)
	if Rect2(origin, Vector2(cell * 14, cell)).has_point(point):
		cell_pressed.emit(int((point.x - origin.x) / cell))
		accept_event()
