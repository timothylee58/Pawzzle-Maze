extends Node
## Run ValidateSprites.tscn from the editor to verify the packaged assets.
func _ready() -> void:
	var manifest: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://Sprites/manifest.json"))
	var atlas: Image = (load("res://Sprites/sprite_atlas.png") as Texture2D).get_image()
	atlas.convert(Image.FORMAT_RGBA8)
	assert(atlas.get_size() == Vector2i(1024, 768), "Invalid atlas dimensions")
	assert(manifest.sprites.size() == 12, "Expected 12 sprites")
	for entry in manifest.sprites:
		var texture := load("res://Sprites/" + entry.texture) as Texture2D
		assert(texture != null and texture.get_size() == Vector2(256, 256), "Invalid texture: " + entry.id)
		var png := texture.get_image()
		png.convert(Image.FORMAT_RGBA8)
		assert(png.detect_alpha() != Image.ALPHA_NONE, "Missing transparency: " + entry.id)
		assert(png.get_pixel(0, 0).a == 0.0 and png.get_pixel(255, 255).a == 0.0, "Missing padding")
		var rect := Rect2i(int(entry.atlas_region[0]), int(entry.atlas_region[1]), 256, 256)
		assert(atlas.get_region(rect).get_data() == png.get_data(), "Atlas mismatch: " + entry.id)
		var packed := load("res://Sprites/" + entry.scene) as PackedScene
		assert(packed != null, "Missing scene: " + entry.id)
		var instance := packed.instantiate()
		var sprite := instance.get_node("Sprite2D") as Sprite2D
		assert(sprite != null and sprite.texture is AtlasTexture, "Invalid sprite node")
		assert(sprite.texture.get_size() == Vector2(256, 256), "Incorrect atlas region")
		assert(sprite.centered, "Expected center pivot")
		instance.free()
	print("SPRITES_VALIDATED: 12 scenes, 12 textures, alpha, padding, and pixel-exact atlas regions")
