# Passenger voices

Generated with Higgsfield Seed Audio on 2026-09-28 using the user's selected preset voices.

| Passenger | Assigned voice | Recording status |
| --- | --- | --- |
| Nova | Giselle | Partial |
| Juno | Juno | Complete |
| Atlas | Holden | Complete |
| Pip | Benji | Complete |
| Sol | Holden | Complete |
| Rae | Giselle | Partial |

Juno has all 23 requested phrases. Giselle's output ended after “Pad 5, please.”; only the first 12 verified phrases are enabled. Holden and Benji succeeded on retry in three shorter takes each, providing all 25 and 23 phrases respectively. Missing phrases use the existing browser speech fallback.

`provenance.json` records the selected voice IDs, exact scripts, successful generation IDs, and remaining lines. Only Giselle has outstanding lines; use smaller scripts to avoid another truncated take.

The WAV files are mono 24 kHz PCM, converted from the generated stereo recordings. `src/voice-clips.js` maps phrases to verified start/duration pairs. Speech recognition confirmed the spoken text, and silence boundaries determine the cuts. Hails combine the rider's call and a pad-number clip. Playback uses the game's mute and music-ducking controls, cancels pending loads on interruption, and stops on pause, crash, restart, menu navigation, and tab hiding.
