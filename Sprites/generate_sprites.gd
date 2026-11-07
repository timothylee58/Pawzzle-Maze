extends Node
## Run GenerateSprites.tscn to rebuild PNGs and the manifest with Godot's Image API.
@export_dir var source_directory: String = "res://sprite_sources"
const ENTRIES = [["Bone.png","bone","collectible"],["Dog House.png","dog_house","exit"],["Frisbee.png","frisbee","collectible"],["Golden Treat.png","golden_treat","collectible"],["Key.png","key","collectible"],["Lever.png","lever","interactable"],["Portal Pair.png","portal_pair","portal"],["Princess Mocha.png","princess_mocha","character"],["Royal Discovery.png","royal_discovery","collectible"],["Tennis Ball.png","tennis_ball","collectible"],["Wall Bush.png","wall_bush","obstacle"],["Wall.png","wall","obstacle"]]
const OUTPUT: String = "res://Sprites"
const CELL: int = 256
const CONTENT: int = 224

func _ready() -> void:
	var result: Error = generate()
	if result != OK:
		push_error("Sprite generation failed: " + error_string(result))
	else:
		print("SPRITES_GENERATED: 12 transparent PNGs, atlas, and manifest")

func generate() -> Error:
	var folder_error := DirAccess.make_dir_recursive_absolute(OUTPUT + "/textures")
	if folder_error != OK:
		return folder_error
	var atlas := Image.create_empty(CELL * 4, CELL * 3, false, Image.FORMAT_RGBA8)
	atlas.fill(Color.TRANSPARENT)
	var records: Array = []
	for index in range(ENTRIES.size()):
		var entry: Array = ENTRIES[index]
		var source_path: String = source_directory.path_join(entry[0])
		var original := Image.new()
		var load_error := original.load(ProjectSettings.globalize_path(source_path))
		if load_error != OK:
			return load_error
		original.convert(Image.FORMAT_RGBA8)
		var used: Rect2i = original.get_used_rect()
		if used.size.x == 0 or used.size.y == 0:
			return ERR_INVALID_DATA
		var cropped := original.get_region(used)
		var factor: float = minf(float(CONTENT) / used.size.x, float(CONTENT) / used.size.y)
		var size := Vector2i(maxi(1, roundi(used.size.x * factor)), maxi(1, roundi(used.size.y * factor)))
		cropped.resize(size.x, size.y, Image.INTERPOLATE_LANCZOS)
		var canvas := Image.create_empty(CELL, CELL, false, Image.FORMAT_RGBA8)
		canvas.fill(Color.TRANSPARENT)
		var offset := Vector2i(floori((CELL - size.x) * 0.5), floori((CELL - size.y) * 0.5))
		canvas.blit_rect(cropped, Rect2i(Vector2i.ZERO, size), offset)
		var png_path: String = OUTPUT + "/textures/" + entry[1] + ".png"
		var save_error := canvas.save_png(png_path)
		if save_error != OK:
			return save_error
		var atlas_position := Vector2i((index % 4) * CELL, floori(index / 4.0) * CELL)
		atlas.blit_rect(canvas, Rect2i(0, 0, CELL, CELL), atlas_position)
		records.append({
			"id": entry[1], "source": "Assets/" + entry[0], "category": entry[2],
			"source_sha256": FileAccess.get_sha256(source_path),
			"source_size": [original.get_width(), original.get_height()],
			"source_crop": [used.position.x, used.position.y, used.size.x, used.size.y],
			"texture": "textures/" + entry[1] + ".png",
			"scene": "scenes/" + entry[1] + ".tscn",
			"atlas_texture": "atlas/" + entry[1] + ".tres",
			"canvas_size": [CELL, CELL], "content_rect": [offset.x, offset.y, size.x, size.y],
			"pivot": [128, 128], "atlas_region": [atlas_position.x, atlas_position.y, CELL, CELL]
		})
	var atlas_error := atlas.save_png(OUTPUT + "/sprite_atlas.png")
	if atlas_error != OK:
		return atlas_error
	var manifest := FileAccess.open(OUTPUT + "/manifest.json", FileAccess.WRITE)
	if manifest == null:
		return FileAccess.get_open_error()
	manifest.store_string(JSON.stringify({
		"version": 1, "generator": "Godot Image API via Godlink MCP",
		"godot_version": Engine.get_version_info().string,
		"atlas_size": [1024, 768], "cell_size": CELL, "columns": 4,
		"sprites": records
	}, "\t") + "\n")
	manifest.close()
	return OK
