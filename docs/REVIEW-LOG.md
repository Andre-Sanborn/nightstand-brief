# Review log

Last reviewed commit: 1a2302d

Newest entry first.

## 2026-11-17, two-hour project check, commits 6747c66 to 1a2302d

Reviewer: strategy-adversary.

| Finding | Decision |
|---|---|
| The next daily run would follow the task instructions on `main`, which could write a forecast half a day off that passes the checker. | Accepted. The run now reads the generator files from a pinned commit, and the weather rows come from a tested script, not from the agent. |
| Waiting on the owner for a merge was not needed for the daily run. | Accepted. The merge to `main` still needs the owner's word; the run no longer depends on it. |
| A reclaimed container may have no clone. | Already covered: the task's prompt re-attaches and clones. Unproven until it happens. |
| The notes said the session holds weather access without saying how that was measured. | Fixed. |
| The check costs more than it finds while the project waits on the owner. | Put to the owner as a proposal. A period with no changes now changes no file. |

## 2026-11-17, two-hour project check, commits 6fec1e4 to 962ffb6

Reviewer: strategy-adversary.

| Finding | Decision |
|---|---|
| The scheduled environment has never run the daily brief task. | Accepted. The task was fired once by hand to prove it. |
| The merge commit on `main` carries the owner's name and personal email. | Accepted. Reported to the owner, who decides whether `main` is rewritten. Later merges are pushed with git under the agent identity, not merged through the GitHub API. |
| The notes said the page was confirmed on the iPad. | Fixed. It is untested. |
| The notes overstated the trial run and the browser checks. | Fixed. |
| The notes said the alarm was set only after the chime check. | Fixed. |
| A run before 6 AM could build today's weather row from the night that is ending. | Fixed in the task instructions. |
| Topic names differed between the contract, the sample and the task. | Fixed. One spelling everywhere. |
| The notes named another of the owner's scheduled tasks. | Removed. |
| "Merge and publish" was ticked on the workflow run alone. | Kept. The tick covers the merge and the publish run; opening the page is a separate open item. |

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
