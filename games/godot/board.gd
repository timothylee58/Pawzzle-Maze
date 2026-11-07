extends Control
signal cell_pressed(cell: int)
signal cells_crossed(cells: Array)
signal drag_ended
signal direction_pressed(delta: int)
var n := 6
var maze: Dictionary = {}
var viewport: SubViewport
var stage: Node3D
var walls: Node3D
var routes: Node3D
var camera: Camera3D
var layer: SubViewportContainer
var dragging := false
var last := Vector2.ZERO
var wall_material: StandardMaterial3D
var route_material: StandardMaterial3D

func material(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.7
	return m

func _ready():
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_ALL
	layer = SubViewportContainer.new()
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.stretch = true
	layer.show_behind_parent = true
	layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(layer)
	viewport = SubViewport.new()
	viewport.transparent_bg = false
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport.msaa_3d = Viewport.MSAA_4X
	layer.add_child(viewport)
	stage = Node3D.new()
	viewport.add_child(stage)
	var environment := WorldEnvironment.new()
	environment.environment = Environment.new()
	environment.environment.background_mode = Environment.BG_COLOR
	environment.environment.background_color = Color("eef2e9")
	environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_color = Color.WHITE
	environment.environment.ambient_light_energy = 0.35
	stage.add_child(environment)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-65,-30,0)
	light.light_energy = 0.8
	light.shadow_enabled = true
	stage.add_child(light)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.rotation_degrees.x = -90
	camera.current = true
	stage.add_child(camera)
	walls = Node3D.new()
	routes = Node3D.new()
	stage.add_child(walls)
	stage.add_child(routes)
	wall_material = material(Color("526647"))
	route_material = material(Color("255d40"))
	resized.connect(func(): queue_redraw())

func box(parent: Node3D, at: Vector3, dimensions: Vector3, mat: StandardMaterial3D):
	var mesh := MeshInstance3D.new()
	var geometry := BoxMesh.new()
	geometry.size = dimensions
	mesh.mesh = geometry
	mesh.material_override = mat
	mesh.position = at
	parent.add_child(mesh)

func clear(parent: Node3D):
	for child in parent.get_children():
		parent.remove_child(child)
		child.queue_free()

func set_maze(definition: Dictionary):
	maze = definition
	n = maze.n
	clear(walls)
	clear(routes)
	camera.size = n
	camera.position = Vector3(n/2.0,20,n/2.0)
	box(walls,Vector3(n/2.0,-0.10,n/2.0),Vector3(n,0.15,n),material(Color("b5c3ab")))
	box(walls,Vector3(n/2.0,0.12,0.05),Vector3(n,0.24,0.1),wall_material)
	box(walls,Vector3(n/2.0,0.12,n-0.05),Vector3(n,0.24,0.1),wall_material)
	box(walls,Vector3(0.05,0.12,n/2.0),Vector3(0.1,0.24,n),wall_material)
	box(walls,Vector3(n-0.05,0.12,n/2.0),Vector3(0.1,0.24,n),wall_material)
	for cell in n*n:
		var x := cell%n
		var y := cell/n
		if x < n-1 and not cell+1 in maze.graph[cell]: box(walls,Vector3(x+1,0.12,y+0.5),Vector3(0.1,0.24,1.05),wall_material)
		if y < n-1 and not cell+n in maze.graph[cell]: box(walls,Vector3(x+0.5,0.12,y+1),Vector3(1.05,0.24,0.1),wall_material)
	queue_redraw()

func center(cell: int, height: float = 0.08) -> Vector3:
	return Vector3(cell%n+0.5,height,cell/n+0.5)

func sphere(at: Vector3, radius: float, mat: StandardMaterial3D):
	var mesh := MeshInstance3D.new()
	var geometry := SphereMesh.new()
	geometry.radius = radius
	geometry.height = radius*2
	mesh.mesh = geometry
	mesh.material_override = mat
	mesh.position = at
	routes.add_child(mesh)

func add_route(path: Array, mat: StandardMaterial3D, height: float = 0.06, dotted: bool = false):
	for i in range(1,path.size()):
		var a := center(path[i-1],height)
		var b := center(path[i],height)
		if dotted:
			for dot in 5: sphere(a.lerp(b,float(dot)/5.0),0.045,mat)
		else:
			var dimensions := Vector3(0.12,0.10,0.12)
			if a.x != b.x: dimensions.x = 1.0
			else: dimensions.z = 1.0
			box(routes,(a+b)/2,dimensions,mat)
	if not dotted:
		for cell in path: sphere(center(cell,height),0.06,mat)

func show_routes(path: Array, best: Array = [], optimal: Array = []):
	clear(routes)
	add_route(best,material(Color("b0c9b3")),0.04)
	add_route(path,route_material)
	add_route(optimal,material(Color("263c2d")),0.18,true)
	if not path.is_empty(): sphere(center(path.back(),0.15),0.11,material(Color("fcfff0")))
	queue_redraw()

func _draw():
	if maze.is_empty(): return
	var font := ThemeDB.fallback_font
	for cell in [0,n*n-1]:
		var p := Vector2(cell%n+0.5,cell/n+0.5)*size/float(n)
		draw_circle(p,12,Color("dce8d5"))
		draw_string(font,p+Vector2(-5,5),"S" if cell == 0 else "G",HORIZONTAL_ALIGNMENT_LEFT,-1,15,Color("274d32"))

func point(position_in_board: Vector2) -> Vector2:
	return position_in_board/size*float(n)

func _gui_input(event: InputEvent):
	if event is InputEventKey and event.pressed and not event.echo:
		var directions := {KEY_UP:-n,KEY_DOWN:n,KEY_LEFT:-1,KEY_RIGHT:1}
		if directions.has(event.keycode):
			direction_pressed.emit(directions[event.keycode])
			accept_event()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			grab_focus()
			last = point(event.position)
			cell_pressed.emit(int(floor(last.y))*n+int(floor(last.x)))
		else:
			dragging = false
			drag_ended.emit()
	if event is InputEventMouseMotion and dragging:
		var p := point(event.position)
		if p.x < 0 or p.y < 0 or p.x >= n or p.y >= n:
			dragging = false
			drag_ended.emit()
			return
		cells_crossed.emit(preload("res://rules.gd").crossed(last,p,n))
		last = p
