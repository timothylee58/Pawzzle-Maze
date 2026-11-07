# Audio assets

## Mocha opening gameplay preview

- File: [Mocha-Opening-Gameplay-Preview.mp3](../Assets/Mocha-Opening-Gameplay-Preview.mp3)
- Source: original MP3 supplied by the project owner on November 7, 2026; copied without conversion.
- Size: 2,002,604 bytes.
- Duration: approximately 50.04 seconds.
- Format: MP3, 320 kbps, 48 kHz, stereo.
- SHA-256: `5b0d5f7f83448713dd0c1638ae46d56516c71cd54aea37173c60501c76c52928`.

The garden demo at `web-prototype/public/pawzzle-garden.html` already references this exact path through GitHub’s raw-file URL. Adding the file supplies that existing reference. The demo starts playback after game interaction and includes a mute control and background-tab pause handling. This import does not change its audio controls or embed the audio into its offline HTML export.

The React Maze Lab screen and Godot demo are separate implementations; this file import does not wire audio into them. Generation tool, creator attribution and license metadata were not supplied with this import.
