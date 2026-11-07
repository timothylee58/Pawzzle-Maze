extends RefCounted
var maze: Dictionary
var started: int
var deadline: int
var finished := false
var attempts := 0
var best: Dictionary = {}
const Rules = preload("res://rules.gd")
func _init(definition: Dictionary, now: int):
	maze = definition
	started = now
	deadline = now+60000
func submit(route: Array, now: int) -> Dictionary:
	if finished: return {}
	if now >= deadline:
		finished = true
		return {}
	if not Rules.valid(route,maze.graph): return {}
	attempts += 1
	var result := {"path":route.duplicate(),"moves":route.size()-1,"extra":route.size()-maze.optimal.size(),"elapsed":now-started}
	result.improved = best.is_empty() or result.moves < best.moves
	if result.improved: best = result.duplicate(true)
	if result.extra == 0: finished = true
	return result
