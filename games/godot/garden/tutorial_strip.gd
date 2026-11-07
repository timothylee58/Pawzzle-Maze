extends Control
var textures: Dictionary = {}
const PLACEMENT := {0: "princess_mocha", 2: "bone", 4: "bone", 5: "bone", 7: "key", 9: "dog_house"}

func _ready() -> void:
	custom_minimum_size.y = 130
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	for item in ["princess_mocha", "bone", "key", "dog_house"]:
		textures[item] = load("res://Sprites/textures/" + item + ".png")
	resized.connect(queue_redraw)

func _draw() -> void:
	if textures.is_empty(): return
	var cell := minf(size.x / 10.0, 100.0)
	var origin := Vector2((size.x - cell * 10) / 2, (size.y - cell) / 2)
	for i in 10:
		var rect := Rect2(origin + Vector2(i * cell, 0), Vector2.ONE * cell)
		draw_rect(rect, Color("#efe4ae") if i % 2 == 0 else Color("#e8dda3"))
		draw_rect(rect, Color("#9fb06d"), false, 1.5)
		if PLACEMENT.has(i):
			draw_texture_rect(textures[PLACEMENT[i]], rect.grow(-cell * 0.08), false)
