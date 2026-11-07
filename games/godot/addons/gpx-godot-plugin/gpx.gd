extends Node
## Official GamePix 1.2r API, adapted for SDK v3 and robust pause/storage handling.
signal pause_changed(paused: bool)
var bridge = null
var pause_callback = null
var interstitial_callback = null
var reward_callback = null
var interstitial_complete: Callable
var reward_success: Callable
var reward_fail: Callable
var ad_pending := false
var pause_reasons: Dictionary = {}
var was_muted := false

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	if OS.has_feature("web"):
		bridge = JavaScriptBridge.get_interface("PawzzlePlatform")
		if bridge != null:
			pause_callback = JavaScriptBridge.create_callback(_browser_pause)
			interstitial_callback = JavaScriptBridge.create_callback(_interstitial_finished)
			reward_callback = JavaScriptBridge.create_callback(_reward_finished)
			bridge.registerPause(pause_callback)

func _browser_pause(args):
	set_pause_reason("browser", bool(args[0]))

func set_pause_reason(reason: String, paused: bool):
	var previously_paused := not pause_reasons.is_empty()
	if paused: pause_reasons[reason] = true
	else: pause_reasons.erase(reason)
	var now_paused := not pause_reasons.is_empty()
	if previously_paused == now_paused: return
	if now_paused:
		was_muted = AudioServer.is_bus_mute(0)
		AudioServer.set_bus_mute(0, true)
	else:
		AudioServer.set_bus_mute(0, was_muted)
	pause_changed.emit(now_paused)
	get_tree().paused = now_paused

func game_loaded():
	if bridge != null: bridge.loaded()

func game_start():
	if bridge != null: bridge.gameStart()

func lang():
	return bridge.lang() if bridge != null else "en"

func setItem(key, value):
	if bridge != null: bridge.save(str(key), str(value))

func getItem(key):
	return bridge.read(str(key)) if bridge != null else null

func updateScore(score):
	if bridge != null: bridge.updateScore(score)

func updateLevel(level):
	if bridge != null: bridge.updateLevel(level)

func happyMoment():
	if bridge != null: bridge.happyMoment()

func interstitialAd(fn: Callable = Callable()):
	if ad_pending:
		if fn.is_valid(): fn.call()
		return
	ad_pending = true
	interstitial_complete = fn
	if bridge != null: bridge.interstitial(interstitial_callback)
	else: _interstitial_finished([])

func _interstitial_finished(_args):
	ad_pending = false
	var callback := interstitial_complete
	interstitial_complete = Callable()
	if callback.is_valid(): callback.call()

func rewardAd(success: Callable = Callable(), fail: Callable = Callable()):
	if ad_pending:
		if fail.is_valid(): fail.call()
		return
	ad_pending = true
	reward_success = success
	reward_fail = fail
	if bridge != null: bridge.reward(reward_callback)
	else: _reward_finished([false])

func _reward_finished(args):
	ad_pending = false
	var callback: Callable = reward_success if not args.is_empty() and bool(args[0]) else reward_fail
	reward_success = Callable()
	reward_fail = Callable()
	if callback.is_valid(): callback.call()
