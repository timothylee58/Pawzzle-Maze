extends SceneTree
const Rules = preload("res://rules.gd")
const RoundModel = preload("res://round.gd")
var checks := 0
func verify(condition: bool, message: String):
	checks += 1
	if not condition:
		push_error(message)
		quit(1)
func _initialize():
	for n in [6,8,9,12]:
		for seed_value in range(25):
			var maze := Rules.generate(n,seed_value)
			verify(maze == Rules.generate(n,seed_value),"Deterministic seed")
			verify(Rules.has_alternate(maze.graph),"Alternate goal route")
			verify((maze.optimal.size()-1)%2 == 0,"Even route parity")
			for cell in n*n: verify(not Rules.solve(maze.graph,0,cell).is_empty(),"Connected graph")
	var graph := [[1,2],[0,3],[0,3],[1,2]]
	var fixture := {"graph":graph,"optimal":[0,1,3]}
	for path in [[0,1,3],[0,2,3]]:
		var round_model := RoundModel.new(fixture,0)
		verify(round_model.submit(path,59999).extra == 0,"Tied optimum accepted")
		verify(round_model.finished,"Perfect ends round")
		verify(round_model.submit(path,59999).is_empty(),"Duplicate after finish rejected")
	verify(RoundModel.new(fixture,0).submit([0,1,3],60000).is_empty(),"Strict deadline")
	verify(Rules.move([0,1,3],1,graph) == [0,1],"Retraction")
	verify(Rules.move([0],3,graph) == [0],"Walls")
	verify(not Rules.valid([0,1,0,2,3],graph),"Repeated cells")
	verify(not Rules.has_alternate([[1,2,4],[0,3],[0,3],[1,2],[0,5],[4]]),"Irrelevant cycle rejected")
	verify(Rules.crossed(Vector2(0.5,0.5),Vector2(3.5,0.5),6) == [1,2,3],"Fast drag")
	verify(Rules.crossed(Vector2(0.5,0.5),Vector2(2.5,2.5),6).is_empty(),"Corner ambiguity")
	print("PASS: ",checks," maze, route, and deadline assertions")
	quit()
