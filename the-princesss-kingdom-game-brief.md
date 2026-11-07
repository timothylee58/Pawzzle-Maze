# The Princess's Kingdom

**Tagline:** Every Neighbourhood Is Her Kingdom  
**Story hook:** The Princess Refuses to Go Home  
**Status:** Shared game concept and MVP build brief — 7 November 2026  
**Platform:** GamePix (HTML5 browser game)  
**Proposed engine:** Three.js + Vite (simple, lightweight, isometric/top-down 3D)

## 1. One-sentence pitch

You are the loyal companion of a tiny princess dog who refuses to go home: navigate her neighbourhood maze, find the royal discovery she demands, and persuade Her Majesty to let you reach the exit before time runs out.

## 2. The idea and why it is fun

**Every neighbourhood is her kingdom.** Ordinary bushes, benches, and corners are matters of royal importance. The princess is curious, demanding, adventurous, and thoroughly convinced that the world belongs to her.

The player wants to get home. The princess wants *one more adventure*.

The fun is not that the dog is another enemy. It is that she behaves like a stubborn little ruler, and players must learn how to work around her demands.

- **Maze challenge:** Navigate branches, dead ends, and shortcuts under time pressure.
- **Princess interruption:** She occupies the passage to the exit and refuses to budge.
- **Playful payoff:** Find the object she wants and return to her; she reacts, moves aside, and lets you pass.
- **Replay motivation:** Beat your completion time, avoid wrong turns, and discover how fast you can earn royal approval.

**Design rule:** Princess personality changes the *feeling and feedback* of the maze, without creating multiple complex game mechanics.

## 3. Agreed player experience (MVP)

### Player and goal

- **Player role:** The princess's human companion, represented by a simple avatar.
- **Goal:** Get home by reaching the exit at the end of each maze.
- **Obstacle:** Princess Mocha is sitting in the exit passage and will not move until her royal request is satisfied.
- **Core mechanic:** **Explore → Collect one royal discovery → Return to Princess → Exit.**
- **Challenge:** A countdown timer and increasingly complicated handcrafted maze layouts.
- **Success:** Deliver the discovery, reach the exit in time, and unlock the next level.
- **Failure:** If the timer reaches zero, show a playful “Her Majesty has extended the walk” screen with **Retry**.

### Controls

- **Desktop:** WASD or arrow keys to walk.
- **Mobile:** Large on-screen directional controls.
- **Interactions:** Collect when close to an object; deliver automatically when near the princess. No extra interaction button required for MVP.

### What the princess does (deliberately simple)

1. **Sits and blocks:** The princess occupies a narrow route to the exit.
2. **Makes a demand:** A short speech bubble hints at the royal discovery she wants.
3. **Accepts the offering:** When you return with it, she gives an expressive reaction, steps aside, and opens the route.

No dynamic chase AI, dialogue tree, inventory system, or complicated physics required.

## 4. Princess personality translated into the maze

These are **three facets of one character**, not separate games:

| Princess facet | How it appears in gameplay | Example line |
| --- | --- | --- |
| **The Stubborn Princess** | Sits in a corridor and refuses to go home until you complete her request. | “Home? We have barely begun our inspection.” |
| **The Curious Explorer** | Names ordinary things as extraordinary discoveries; the collectible may be beside a bush, bench, or fountain. | “That bush looks suspiciously interesting.” |
| **The Royal Boss** | Frames the single collectible task as an absurd royal order and reacts when obeyed. | “You may proceed. I shall allow it.” |

**Tone:** Elegant, lightly dry humour; expressive and a little ridiculous, never overly cutesy. The princess is not evil. She is certain that everyone else is her staff.

### Story moment: “The Princess Refuses to Go Home”

> You have been walking for an hour. The princess has discovered a suspiciously interesting bush.  
> **Princess:** “We cannot possibly leave. This bush has not been properly inspected.”
>
> The exit is right ahead, but she plants herself in the passage. A glowing “royal discovery” waits somewhere in the maze. Find it, return to her, and she will finally consider leaving.

This scene introduces her personality **and** teaches the objective. It is not a separate choice-based game.

## 5. Three-level structure

All levels reuse the same movement, collision, collectible, princess, and exit systems. Difficulty increases through **maze layout**, not new mechanics.

| Level | Setting / story | Maze design | Princess request | Teaching / challenge |
| --- | --- | --- | --- | --- |
| **1 — The Royal Garden** | “We cannot leave before the garden inspection.” | Small, readable maze; one obvious turn and one short dead end. | Pick up the golden treat by the suspicious bush. | Learn movement, glowing collectible, blocked passage, and return-to-princess loop. |
| **2 — The Royal Inspection** | “That bench requires further investigation.” | Medium maze with forks and misleading routes. | Find the royal ball near the bench. | Plan a route and avoid losing time to wrong turns. |
| **3 — Her Majesty's Final Walk** | “One final discovery. Then, perhaps, home.” | Largest maze with a few loops and dead ends; still readable. | Find the golden leaf near the fountain. | Apply what you have learned and finish before time expires. |

**Implementation simplification:** Treat, ball, and leaf all behave as the **same collectible object** with different appearance/text. Only one is active per level. The princess still blocks the exit until it is collected and delivered.

**Provisional timer targets:** 90 / 120 / 150 seconds. Adjust based on playtesting; levels should get harder because of layout, not because the timer becomes unfair.

## 6. Screens and player journey

```text
LOADING
  ↓
START SCREEN
“The Princess's Kingdom”
“Her Majesty has decided the walk is not over.”
[PLAY]  [HOW TO PLAY]
  ↓
LEVEL 1 → LEVEL COMPLETE → LEVEL 2 → LEVEL COMPLETE → LEVEL 3
  ↓               (retry any level if the timer runs out)
VICTORY SCREEN
“Her Majesty Approves!”
Final time / Best time
[PLAY AGAIN]
```

### First-time instructions (keep on-screen and short)

- “Find the royal discovery.”
- “Bring it back to the princess.”
- “Reach home before time runs out.”

HUD: Level number, time remaining, and **Royal discovery: 0/1**. A speech bubble appears when the player approaches the princess without the item.

### Feedback

- **Collected item:** Small sparkle + “Royal discovery found!”
- **Blocked by princess:** She sits firmly; bubble: “Not yet. I have a request.”
- **Offering delivered:** Happy/imperious expression + she moves sideways from the doorway.
- **Level complete:** “Her Majesty permits you to continue.” + time taken + **Next Level**.
- **Time over:** “Her Majesty has extended the walk.” + **Retry**.
- **Final victory:** “Her Majesty Approves! You have earned permission to go home.” + final time + **Play Again**.

## 7. Visual direction

- **View:** Fixed top-down or gently angled isometric 3D camera; no free-look camera.
- **World:** Soft pastel low-poly neighbourhood garden: hedges, paths, a bench, a bush, a fountain, and a home gate.
- **Princess:** Recognisable small white dog with a tiny crown or royal collar. Start with a simple mesh/sprite if a custom model is not ready.
- **Readability:** Walls clearly distinguishable from pathways; collectible glows; exit visually distinct.
- **Animation:** Very small set: princess sits, gives an unimpressed reaction, steps aside. Text carries most of her personality.

The visual goal is an inviting, legible game that loads quickly—not a cinematic 3D world.

## 8. Who builds what

| Owner / workstream | Responsibilities | Deliverable |
| --- | --- | --- |
| **Story, maze layout, princess personality, instructions, playtesting** | Write the story beats and quips; sketch three solvable maps; specify collectible/princess/exit placement; test with a stranger. | Approved flow, level layouts, in-game text, playtest notes. |
| **Gameplay developer** | Three.js scene, fixed camera, grid-based maze walls, player movement, collision, basic timer. | A player can navigate the first maze without walking through walls. |
| **Princess & interaction developer** | One collectible, dog blocking collider, proximity delivery, three simple character states, gate unlocking. | Collect → return → princess moves → exit works. |
| **Integration & GamePix developer** | HUD, menus, level transitions, restart, scaling, touch controls, SDK events, packaging and test upload. | Working browser build, verified GamePix package. |

**Integration agreement:** Everyone works toward one shared game build. Agree on simple state names such as `hasDiscovery`, `princessApproved`, `exitUnlocked`, and `timeRemaining`. Use separate branches or small commits; test after every integration.

## 9. Three-hour build order (stretch goal: three levels)

| Time | Priority | Definition of done |
| --- | --- | --- |
| **0–30 min** | Playable Level 1 shell | Camera, one maze, walking, collisions, start/exit markers. |
| **30–60 min** | Core complete loop | Collect discovery, return to princess, see her move, reach exit, win. |
| **60–75 min** | First GamePix upload | Build and ZIP early; discover platform issues before polishing. |
| **75–135 min** | Personality, UI, extra maps | Add speech bubbles and feedback, timer, menus, mobile controls; reuse mechanics for Levels 2–3. |
| **135–180 min** | Test, fix, final package | Verify loop, pause/resume, iframe sizing, and ZIP structure; upload updated build. |

**Hard cut rule:** If time is tight, ship **one polished, complete level** rather than three broken levels. A finished game loop matters more than level count.

## 10. GamePix technical and publishing checklist

**Engine:** Three.js with a browser-compatible production build (e.g., Vite). Output is a self-contained build folder with `index.html` at its root.

- [ ] Include a loading screen, start screen, clear instructions, gameplay, level complete/failure, final ending, and replay.
- [ ] Keep JS, CSS, images, audio, and game assets bundled with relative paths (aside from the official GamePix SDK URL).
- [ ] Integrate the **GamePix SDK v3** before starting the game; register `GamePix.events.on('pause', ...)` and `GamePix.events.on('resume', ...)`.
- [ ] Pause and resume movement, timers, and audio for SDK events; handle document visibility changes correctly. Do not pause merely because someone clicks outside an iframe.
- [ ] Test responsive scaling inside an iframe at **640 × 480**, and test mouse/keyboard and touch interactions on desktop and mobile.
- [ ] Keep menus fully operable, canvas centered, and touch input usable in portrait and landscape.
- [ ] Do not add external analytics, unrelated third-party SDKs, or links out of the game.
- [ ] Build, test locally, then **ZIP the contents of the build folder**, not the folder itself. The ZIP must open directly to `index.html`, assets, and game files.
- [ ] Test-upload to GamePix early and run through the full game again on the platform.
- [ ] Before final submission, prepare matching game title, description, icon, and cover image; use only assets with appropriate rights.

Official references:

- [GamePix JavaScript SDK v3](https://partners.gamepix.com/sdk/doc/javascript)
- [GamePix submission guidelines](https://partners.gamepix.com/guidelines/submission)

## 11. Acceptance criteria / playtest questions

A build is ready when a first-time player can:

- [ ] Understand the goal within about 10 seconds of entering the first level.
- [ ] Navigate without walking through walls or getting trapped by collisions.
- [ ] Identify a collectible and understand that the princess is blocking the exit.
- [ ] Pick up the object, return to the princess, watch her move, and reach home.
- [ ] See clear success/failure feedback and restart without refreshing the browser.
- [ ] Complete the game on keyboard and touchscreen; see no timer movement while paused.

**Observe, do not explain:** When testing with someone new, ask: “What do you think you need to do?” Watch for confusion about the objective, unreadable paths, unfair timers, and whether Mocha's reaction makes them smile.

## 12. Not in the first version

- Multiplayer or online accounts.
- Autonomous chasing or complicated pathfinding for the princess.
- Branching dialogue or a negotiation-choice system.
- Multiple simultaneous quests, crafting, or inventory management.
- Procedurally generated mazes, elaborate cutscenes, or expensive animations.

These ideas may come later. **The first game is a maze with a memorable princess—not three games mashed together.**

---

**Team alignment summary:** We are building a short browser maze game where the player is trying to go home, but the princess dog considers every corner of the neighbourhood her kingdom. Find her one royal discovery, earn her approval, and escape. Each level makes the maze more challenging; her stubborn, curious, bossy personality makes the journey amusing.