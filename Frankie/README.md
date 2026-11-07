# Frankie's workspace

Welcome, Frankie! Use this folder to record what you are working on and leave notes for the team.

Start with the [repository file guide](../FILE_GUIDE.md). It explains all projects and lists every tracked file.

## Pick your task's source location

| Task | Work here |
| --- | --- |
| V3 adventure UI and controls | [apps/web/src](../apps/web/src/) |
| V3 game rules and levels | [packages/game-core/v3](../packages/game-core/v3/) |
| API/server behavior | [apps/api/src](../apps/api/src/) |
| Standalone Maze Lab prototype | [web-prototype](../web-prototype/) |
| Godot game | [games/godot](../games/godot/) |

This folder is for your notes, drafts and handoffs. It is not connected to a game build. Make production code changes in the source folders above; moving or copying the game here would create confusion and may break paths.

## Current task

No specific feature has been assigned in this README yet. Fill this in with the team before starting:

- **Task / goal:** To be agreed.
- **Project:** V3 adventure / Maze Lab / Godot / API.
- **Files I plan to edit:** Add repository-relative paths.
- **Branch:** Add your task branch name (for example, `frankie/describe-the-task`).
- **Done when:** Describe what a player or teammate should be able to do.
- **Status:** Not started.
- **Test result / screenshots:** Add evidence.
- **Pull request:** Add the link when ready.
- **Questions / blockers:** Add anything you need help with.

## Simple workflow

1. Read the chosen project's README and the [V3 design target](../GAME_DESIGN_DEVELOPMENT_V3.md) if relevant.
2. Update your local checkout and create a branch for the task.
3. Fill in the current-task section above. Put extra notes or drafts in this folder with descriptive names.
4. Edit the real source files linked above and run that project's checks from the correct directory.
5. Review your changes, commit only the task files, push your branch and open a pull request.
6. Update this checklist with the result and anything the next teammate needs.

For Godot work, also read the [Godot action plan](../GODOT_FOUR_HOUR_ACTION_PLAN.md) and [Maze Lab porting notes](../web-prototype/GODOT_PORTING.md). They describe planned work; the existing Godot game is still the separate V1 demo.
