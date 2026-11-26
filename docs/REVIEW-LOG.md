# Review log

Last reviewed commit: d05b7f3

Newest entry first.

## 2026-11-26, project check, commit d05b7f3

Reviewer: strategy-adversary.

- The recording step had five open decisions: where the key lives, the host,
  the file format, what happens when synthesis fails, and the pin. Decided and
  recorded in IMPLEMENTATION.md before building.
- The device tests are still the critical path. None has passed overnight.
- Design faults in the playback change: nothing that harms the alarm. Mono is
  required so the decoded size stays as estimated.
- The first real narration kept every rule but one: a to-do was given a time of
  day that no row states. Fixed: the task gives a to-do a time only when its
  title states one.
- Claims, ticked items and privacy: nothing found.

The daily run's pin moves to the commit that carries the narration fix.

## 2026-11-25, review of the narration rules, commit c696037

Reviewer: strategy-adversary, on the generator files, the validator and the
sentence splitter. The plan had its own review before it was built.

- The narration could speak fields meant only to be shown. Fixed: it uses only
  fields marked as read aloud, and never a detail, place or person.
- The example mentioned tomorrow's rain and an invented reassurance against the
  facts rule. Fixed: one phrase on tomorrow's weather is allowed, and the
  reassurance is gone.
- "What needs doing today" clashed with to-dos due later. Fixed: each to-do is
  narrated with its own day.
- Times lacked the part of the day. Fixed: the narration says morning,
  afternoon or evening.
- Sentence splitting and privacy of the changed text: nothing found.

The daily run's pin moves to the commit that carries these fixes.

## 2026-11-24, two-hour project check, commit 647a6af

Reviewer: strategy-adversary. No contradiction, impossible step or privacy
problem. Two edge cases, both accepted as they stand:

- With more than five email rows, two older alerts and replies owed outrank a
  distant deadline. Accepted: an unanswered alert matters more than a deadline
  over three days away, and the deadline returns as a to-do when it is near.
- With three alerts under 48 hours old, the third is spoken but its row is cut.
  Accepted: the two shown alerts already send the reader to their mail.

The daily run's pin moved to 647a6af.

## 2026-11-24, two-hour project check, commit 17303c9

Reviewer: strategy-adversary, two passes.

- The seven-day alert rule had no search that fetched the mail. Fixed: the
  email step searches seven days for security alerts.
- An unresolved alert would be spoken for seven days, and several alerts could
  crowd out deadlines. Fixed: an alert is spoken only in its first 48 hours, and
  the five-row cap keeps the two newest alerts, then replies owed, then the
  nearest deadlines.
- The second pass found the limits covered only one kind of alert. Fixed: they
  cover every kept security alert.
- A note in IMPLEMENTATION.md was more specific than the Privacy section
  allows. Reworded. The earlier wording remains in the branch history; removing
  it is the owner's call.
- The later-day to-do rule: nothing found.

The daily run's pin moves to the commit that carries these fixes.

## 2026-11-20, two-hour project check, commit 32e4adb

Reviewer: strategy-adversary. Nothing found. The daily run's pin moved to
32e4adb.

## 2026-11-20, two-hour project check, commit ed1cf1c

Reviewer: strategy-adversary. The after-midnight rule has no contradiction.

| Finding | Decision |
|---|---|
| "A planned task today" could turn an appointment into a to-do and drop its time and place. | Fixed. Events the reader attends are never to-dos; only a reminder to do a task follows the deadline rule. |

## 2026-11-19, two-hour project check, commit f04aabb

Reviewer: strategy-adversary. Nothing found. The daily run's pin moved to
f04aabb.

## 2026-11-19, two-hour project check, commits 270c08b and 15248a0

Reviewer: strategy-adversary. No blocker; the daily run's pin moved to 15248a0.

| Finding | Decision |
|---|---|
| The open-deadline rule gave two different exits for a kept message. | Fixed. It leaves when the deadline passes, mail shows it was handled, or it is over fourteen days old. |
| Nothing said which rows to drop above five. | Fixed. Nearest deadlines stay; a security alert and a reply owed always stay. |
| A marketing "offer ends" message could be kept by the new rule. | Fixed. Such messages pass the same filter as any other. |
| The notes left out how a kept message leaves. | Fixed. |

## 2026-11-18, two-hour project check, commit fcbc8f3

Reviewer: strategy-adversary. Nothing found in the task instructions as a whole.

## 2026-11-18, two-hour project check, commit 1e9aab5

Reviewer: strategy-adversary.

| Finding | Decision |
|---|---|
| The read step allowed a run with no clone, but the write step still required one. | Fixed. With no clone the file is written with the GitHub file tool, and the report says which way was used. |

## 2026-11-18, two-hour project check, commit 1777506

Reviewer: strategy-adversary. The five fixes read cleanly.

| Finding | Decision |
|---|---|
| The step that reads the previous brief did not say what to do with no clone or a failed pull. | Fixed. The scheduled task's own prompt already creates and updates the clone; the instructions now give the fallback and require the report to say so. |

## 2026-11-18, two-hour project check, commit 99fdf60

Reviewer: strategy-adversary. Subject: the tightened task instructions, read as
the next morning's agent would read them.

| Finding | Decision |
|---|---|
| Dropping a deadline's calendar row lost its spoken time. | Fixed. The to-do title carries the time. |
| A clone that is behind made the run fall back to the tool that commits under the owner's name, and could show an old previous brief. | Fixed. The run pulls first, and only a permission refusal allows the fallback. |
| A fifth deadline was dropped from both the to-dos and the calendar. | Fixed. It keeps its calendar row. |
| Today's calendar could come out empty with no "Nothing scheduled" row. | Fixed. |
| A security alert could be read aloud with the service named. | Fixed. Spoken text names no service. |
| The limits agree across the contract, the task and the checker, and the new test pins the boundary. | Recorded. |

## 2026-11-18, two-hour project check: the first scheduled brief

Reviewer: strategy-adversary. Subject: commit fdba8f7 and the brief the first
scheduled run wrote. The notes' wording about the run holds up. Tomorrow's run
may go ahead.

| Finding | Decision |
|---|---|
| A kept account-recovery alert was worded as routine. | Fixed in the task instructions. Raised with the owner directly. |
| The headline described the owner's own task as if it would happen by itself. | Fixed in the task instructions. |
| Deadlines were read up to four times, and five to-dos were written when four are read. | Fixed. A deadline today is written once, to-dos are capped at four, and the checker warns above four. |
| Course codes may be read badly by the voice. | Left until the owner hears one on the iPad. |
| One news figure could not be confirmed against a primary source. | Open. The cloud environment blocks most news sites; a short list of allowed hosts goes to the owner. |
| The brief's commit in the private repository carried the owner's name and email. | Fixed. The run writes with git under the agent identity. The repository is private. |

## 2026-11-18, two-hour project check, commit 201c6d1

Reviewer: strategy-adversary. Nothing found. If the iPad's clock jumps backwards
between the two taps, the brief's alarm-off button ignores taps until the clock
catches up; "Turn alarm off" in the controls still works. Left as is.

## 2026-11-17, two-hour project check, commit afd038d

Reviewer: strategy-adversary.

| Finding | Decision |
|---|---|
| A quick double-tap on "I'm up: alarm off" cancelled the alarm. | Fixed. A second tap within 0.6 seconds is ignored. |
| A pending first tap survived a cancel from the controls and a re-arm. | Fixed. Disarming clears it. |

## 2026-11-17, two-hour project check, commit 300790f

Reviewer: strategy-adversary. The fix works and nothing is half-removed.

| Finding | Decision |
|---|---|
| "I'm up: alarm off" sat beside "Stop reading" and cancelled on one tap. | Fixed. It moved to the far end of the bar and needs two taps. |
| Three comments still described the removed rule. | Fixed. |
| No pure test pins the always-ring rule. | Left. A function that always returns "ring" tests nothing; the browser check covers the behaviour. |

## 2026-11-17, two-hour project check, commits 7441b58 and 1f6e823

Reviewer: strategy-adversary.

| Finding | Decision |
|---|---|
| A tap on the light counted as a touch, so a sleepy tap in the last two minutes cancelled the alarm; a reading in progress cancelled it too. Measured in the browser. | Fixed. The alarm always rings. Only an explicit button cancels it. |
| MISSION.md said the alarm plays "unless the owner is already up", which the owner never asked for. | Removed. |
| The notes overstated what "tap then doze rings" covered. | Fixed with the rule change. |
| A reloaded page's light hid the notice that the alarm needs a tap. | Fixed. The light says so. |
| No stale tap state, no double ring, and no way to arm or disarm under the light. | Recorded. |
| The first scheduled brief run could fail to fire with nobody noticing. | Accepted. The orchestrator checks the private brief's date after the run. |

## 2026-11-17, two-hour project check, commit 9f90189

Reviewer: strategy-adversary. Verdict: sound for the next morning's run.

| Finding | Decision |
|---|---|
| A forecast served late would give weather for the wrong day and pass every check. | Fixed. Periods that are over are dropped, and the script refuses a forecast that does not start today. |
| The pinned commit was fetched by branch depth, which stops working after enough later commits. | Fixed. The run fetches the commit by its id. |
| The real feed matched the script's assumptions, and its rows matched the feed by hand. | Recorded. |
| Three wrong implementations passed the forecast tests. | Fixed with tests for a late feed, a feed with nothing for today, and a night with no stated chance of rain. |
| The agent copies the rows by hand. | Left. Low risk for seven short rows; the checker catches a malformed row. |

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
