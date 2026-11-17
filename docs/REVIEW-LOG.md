# Review log

Last reviewed commit: bf3158c

Newest entry first.

## 2026-11-17, verification of the first build

Reviewer: adversarial-verifier. Subject: commit 648b3e6.

| Finding | Decision |
|---|---|
| A brief published in the last ten minutes before the alarm was not read. | Fixed. Faster refresh before the alarm and a fetch at ring time. |
| The tone kept ringing when the stop tap landed during audio recovery. | Fixed. |
| A `resume()` that never settled blocked all later recovery. | Fixed with a three-second limit. |
| No alarm was set unless the chime check was answered, and an open check could ring twice. | Fixed. The alarm is stored at the Arm tap. |
| A stopped reading's timer cancelled a line of the next reading. | Fixed. |
| Phone numbers, dates and model numbers were read as ranges. | Fixed. |
| A date with a time after it counted as stale. | Fixed in the app. The checker still requires the plain date. |
| A page resumed hours late rang. | Fixed. More than 60 minutes late is logged as missed. |
| A reloaded, un-re-armed page passed the alarm time silently. | Fixed. It shows the alarm screen and logs it. |
| Eleven faults in the core survived the tests. | Fixed. Tests added; all now fail the suite. |
| Privacy and security. | Nothing found. |

## 2026-11-17, plan review before the first build

Reviewer: strategy-adversary. Subject: the plan in MISSION.md and
IMPLEMENTATION.md.

| Finding | Decision |
|---|---|
| Silent mode mutes Web Audio and nothing on screen shows it. | Accepted. The page sets the `playback` audio session type and confirms a chime at arm time. |
| An interrupted audio context can refuse `resume()`. | Accepted. State changes are logged and recovery tries suspend then resume. Untested on the device. |
| There is no backup alarm. | Accepted. The owner keeps a Clock-app alarm until the overnight test passes on several nights. |
| A page reload loses the audio engine and the armed state. | Accepted. A reloaded page shows "Tap to re-arm" and logs it. |
| An overnight iPadOS update can restart the iPad. | Accepted. The owner turns off automatic installing. |
| Speech can stall or cut off. | Accepted. Lines are separate utterances chained on `onend` with a timer. |
| Focus and Low Power Mode. | No change. Covered by the overnight device test. |
