# Implementation

## Shape

The app is static files in `app/`, served as-is over HTTPS and added to the iPad
Home Screen. There is no build step and no runtime dependency.

- `app/core/` holds pure logic: when the alarm next fires, what the greeting
  says, how votes are recorded. It runs under `node --test`.
- The rest of `app/` is the page: the clock, the alarm, speech, the brief view.
- `tests/` holds the tests for `app/core/`.
- `archive/` holds replaced and removed files.

Run the tests with `npm test`. Serve the app locally with `npm run serve`.

## The night, step by step

1. The owner opens the app from the Home Screen and taps **Arm**.
2. That tap stores the alarm time, starts the audio engine, asks for the screen
   wake lock, and plays a chime.
3. A chime check asks whether the owner heard it. The answer is logged and does
   not change the alarm. "Turn alarm off" there disarms. With no answer in two
   minutes the check closes and logs "chime not confirmed".
4. The clock shows the time in dim red on black. Its position shifts a few
   pixels each minute so a static image does not burn into the screen.
5. The page checks the clock once a second. At the alarm time the tone starts
   and grows louder over 30 seconds.
6. A tap stops the tone. The same tap is the user gesture that lets the page
   speak, so the greeting starts from inside that tap handler.
7. The brief view opens for scrolling and voting.

Late and missed alarms:

- A page that resumes up to 60 minutes after the alarm time rings and logs how
  late it was. Later than that, it disarms and logs a missed alarm.
- A page that was reloaded and never re-armed shows the flashing alarm screen at
  the alarm time, with no tone, and logs it.
- A time already past is never stored as an alarm.

## Soft wake

The owner asked for this on 2026-11-17: gentle chimes and a screen that
brightens slowly over a few minutes.

- A setting of Off, 3, 5 or 10 minutes, default 5, adds a soft wake that ends at
  the alarm time.
- Arming stores the alarm time, the arming time and the length, so a reloaded
  page keeps the same window. Arming inside the window shortens it, so the light
  still starts from black.
- A full-screen light changes once a second from black through deep red, amber
  and warm white to white. Progress is squared, so the first third stays very
  dark.
- Soft sine chimes from a pentatonic scale play one at a time, 3 to 5 seconds
  apart, from very quiet to moderate. They are synthesised, so no audio file is
  shipped.
- A tap on the light opens the brief and starts the greeting. It leaves the
  alarm armed. On a reloaded page that tap also starts the audio engine, and the
  light says the alarm is silent until tapped.
- The alarm always rings at the alarm time. A tap on the light, a reading in
  progress and later touches do not cancel it, because none of them shows the
  owner is awake. A reading in progress is stopped when the tone starts.
- While an alarm is set, the brief view shows "I'm up: alarm off" at the far end
  of its bar. It needs a second tap within five seconds, and a second tap in
  the first 0.6 seconds is ignored as a double-tap. That button and "Turn
  alarm off" in the controls are the only ways to cancel.
- The always-ring rule has no pure test, because it is the absence of a
  decision. The browser check covers it.
- With no tap, the alarm tone starts at the alarm time and the light is hidden.
- Starting the soft wake closes the chime check and the re-arm screen, and
  starts a brief fetch.
- "Test in 1 minute" runs 30 seconds of soft wake, then the alarm.

A web page cannot raise the iPad's backlight, so the white is as bright as the
iPad's own brightness setting. The in-app brightness levels change the clock's
colours only.

Checked in headless Chromium: the light's timing and colours, one chime at a
time and none after a stop, arming inside the window, a reloaded page, soft wake
off, and that a tap on the light at any point still leaves the alarm ringing at
the alarm time. Untested on the iPad: whether chimes play from an audio context
idle all night, how the colours look on the panel, and whether the tap on a
reloaded page can start audio and speech together.

## iPad behaviour the design depends on

| Claim | Status |
|---|---|
| A Home Screen web app can hold a screen wake lock on iPadOS 18.4 or later. | Cited: Safari 18.4 release notes, WebKit bug 254545. |
| Sound and speech start only from a user gesture. | Cited: WebKit bug 223473. |
| Web Audio is muted by Silent mode unless the audio session type is `playback`. | Cited: WebKit bugs 237322 and 252746. |
| An interrupted audio context can need `suspend()` before `resume()` works. | Cited: WebKit bug 276016. |
| `speechSynthesis.speak()` interrupts other playing media. | Cited: WebKit bug 218815. |
| Re-acquiring a wake lock after leaving and returning to the page can fail. | Cited: WebKit bug 255363. |
| An audio context started at night still plays a tone eight hours later. | Untested. Device test 2. |
| The wake lock holds all night on a plugged-in iPad. | Untested. Device test 2. |
| Utterances queued after the first play without a new gesture. | Untested. Device test 1. |
| A phone call or Siri overnight leaves the alarm able to play. | Untested. |

What the page does about each risk:

- **Muted audio.** The page sets the audio session type to `playback` before it
  creates the audio context. Arming plays a chime and asks whether the owner heard
  it, because a page cannot read the volume. The answer is logged; the alarm is
  set either way.
- **A stalled audio context.** One inaudible oscillator runs from the Arm tap so
  the context stays in use. Every state change is logged. When the context
  leaves `running` the page tries `resume()`, then `suspend()` and `resume()`.
  Each attempt gets three seconds. A stop tap during recovery cancels the
  pending tone.
- **No sound at alarm time.** The alarm screen flashes bright red. A flash will
  not wake a sleeper, so the owner keeps a backup alarm in the Clock app until
  device test 2 has passed on several nights.
- **A reloaded page.** A page that loads while an alarm is set has no audio
  engine. It shows a full-screen "Tap to re-arm" and logs the reload. A page that
  loads after the alarm time logs a missed alarm.
- **Speech.** The tone stops before speech starts. The first utterance is queued
  inside the stop tap. Each line is its own utterance, chained on `onend`, with
  a timer that moves on if `onend` never fires. Stopping a reading clears that
  timer. The default voice is used, so nothing waits on the voice list.

The page keeps a night log in the browser's storage: when it was armed, each
time the page was hidden or the wake lock dropped, each audio state change, and
when the tone started. The log is how a device test is read the next morning.

## iPad settings the owner changes

- Settings, Display & Brightness, Auto-Lock: Never.
- Settings, General, Software Update, Automatic Updates: turn off automatic
  installing, so an overnight update does not restart the iPad.
- A backup alarm in the Clock app two minutes after the page alarm.

## Checks

- `npm test` runs the pure logic in `app/core/`.
- The page is driven through simulated nights in headless Chromium with a fake
  clock and a stubbed speech engine. Last run 2026-11-17, all passing: no ring at
  6:29:59 and a ring at 6:30:00 without the chime check answered; no ring
  returning after the stop tap; a brief changed at 6:25 spoken at 6:30; the
  alarm screen shown after an unanswered reload; no ring and a logged miss when
  the clock jumps to 2:00 PM; a second reading after "Stop reading" speaking
  every line once; and load, failure and stale cases against a mocked GitHub.
  The scripts are not in the repository and cannot be re-run from it, because
  they need Playwright, which would be the first dependency. Chromium says nothing about iPadOS audio,
  speech or wake lock behaviour.
- Each of twelve deliberate faults in `app/core/` fails `npm test`.

## Brief format

The app reads one JSON file: `{ "rows": [...] }`. Each row has a `section` and
an `ord`, plus `title`, `detail`, `tag`, `link`, `day`, `time`, `hi`, `lo`,
`pop` and `source` where they apply. This is the format the existing Morning
brief dashboard already uses, so one generated file can feed both.

Sections: `meta`, `todo`, `cal`, `wx`, `wx_note`, `news`, `ai`, `email`, `tip`.

Two additions for this app:

- `news` rows carry the top three stories. Each has an `id` that stays the same
  if the story appears again, and a `topic`.
- The `meta` row may carry `greeting`, a sentence written for the ear. Without
  it the app composes a greeting from the date.

The spoken script is composed in `app/core/` from the rows, in this order:
greeting, headline, to-dos, today's calendar, today's weather, news. Email, AI
notes and tips are on screen only.

- Only calendar rows whose `day` begins with the word "Today" are read.
- An en or em dash between times or numbers is read "to". A hyphen is read "to"
  only with spaces on both sides, so phone numbers and dates are left alone.
- A to-do with a blank title is neither counted nor read.

The full contract for whoever writes the file is in
[`generator/README.md`](generator/README.md). `app/core/validate.js` checks a
brief against it. Errors break the contract: no rows array, an unknown section,
no `meta` row or more than one, a missing or impossible `meta.date`, an empty
title on a titled row, a missing or repeated news `id`, a non-numeric
`hi`/`lo`/`pop`, or more than three news rows. Warnings are worth fixing: a date
other than today's, no weather, nothing for "Today" on the calendar, a news row
without `topic` or `detail`, a title over 140 characters, or a link that is not
`https://`.

A date other than today's is a warning in the checker because the checker may run
on another day. The app refuses to read such a brief aloud, so the generator
treats it as an error on the morning it runs.

The checker does not flag a missing or repeated `ord`, or more than four to-dos.

## Votes

A vote is `{ id, topic, title, vote, at }` where `vote` is `up`, `down` or
`never`. Votes are kept in the browser's storage. Sending them back to the
brief generator is not built.

## Decisions

- **Web app, not native.** The owner accepted a plugged-in, screen-on iPad. A
  native app needs a Mac, Xcode and a paid developer account.
- **On-device speech.** The browser's speech synthesis costs nothing and works
  offline. Pre-recorded audio from a text-to-speech service would sound better
  and would cost money per brief; that is a scope question for the owner.
- **The stop tap triggers speech.** Speech needs a gesture, and the owner has to
  touch the iPad to stop the alarm anyway.
- **Votes stay on the device first.** It proves the interaction before any
  credential is involved.

## How the brief reaches the iPad

The owner chose this route on 2026-11-17 because it costs nothing.

- This repository is public. A GitHub Actions workflow runs the tests and
  publishes `app/` with GitHub Pages on every push to `main`.
- Real briefs live in a separate private repository as `brief.json` at its root.
- The owner types that repository's name and a read-only token into the app's
  "Brief source" screen. The app stores both in the browser and fetches the file
  from the GitHub contents API. With no source set, the app shows the sample.
- While an alarm is set the app refetches every ten minutes, and every two
  minutes in the last fifteen minutes before the alarm. The ring also starts a
  fetch without waiting for it. The stop tap reads whatever rows have arrived.
- The `meta` row carries `date` as `YYYY-MM-DD` in the owner's local time. The
  app judges it by its leading `YYYY-MM-DD`; the checker accepts only the plain
  date. A
  brief dated another day is not read aloud; the greeting says the brief has not
  arrived, and the brief view shows a notice.
- A failed fetch keeps the rows already loaded and logs the failure.

Known limits:

- Every Pages site under one GitHub account shares a browser origin, so another
  site published from the same account could read the stored token. The token is
  fine-grained, read-only, and limited to the brief repository.
- The token expires on the date chosen when it is created. The app then shows
  "GitHub answered 401" until a new one is typed in.
- Fetching from the mocked API was checked in headless Chromium on 2026-11-17.
  It is untested against GitHub and on the iPad.
- The first publish from `main` succeeded on 2026-11-17 according to the
  workflow run. The build container cannot reach the published site, so the
  page loading is untested until the owner opens it on the iPad.

## The daily brief task

A scheduled Claude task named "Nightstand Brief morning brief" fires every day
at 5:17 AM Mountain time into the orchestrator session. That session launches
one agent, which follows [`generator/TASK.md`](generator/TASK.md) and writes
`brief.json` to the private repository. The task's stored prompt names one
commit of this repository, and the run reads the generator files and the checker
from that commit. A change to `generator/` reaches the run only when the
orchestrator moves that pin, so an unreviewed edit never does. The owner approved
the daily run and its usage cost on 2026-11-17.

The task depends on the orchestrator session. That session holds what the run
needs: the Gmail and Google Calendar connectors, GitHub write access to the
private repository, and a cloud environment named `nightstand-brief` that allows
`api.weather.gov` (reached with curl from this session on 2026-11-17; Node's own
fetch does not go through the environment's proxy). If the session is archived, the brief stops and the app says
it has not arrived.

A task that starts a fresh session each morning does not work when it is created
from inside a session. Measured on 2026-11-17 by firing one: the fresh session
had no connectors, no tool to attach a repository, and no GitHub credential, and
wrote nothing. A durable version has to be created by the owner on the claude.ai
routines page, with both repositories and both connectors attached.

A trial run by hand on 2026-11-17 took about six minutes and wrote a brief that
passed the checker, with mail, calendar, AI notes and three news items. It had
no weather, because that session could not then reach the forecast; the weather
rows were added afterwards by a one-off script. Its news sources were checked
against search summaries, not fetched articles. The first scheduled firing ran on
2026-11-18: it fired at 5:19 AM, the brief was written at 5:23 AM, and the
checker reported no errors and no warnings. That run could not open three news
sites from the cloud environment, so its news was confirmed from search results
only.

The weather rows come from `generator/weather.mjs`, which pipes the forecast
through `forecastRows` in `app/core/forecast.js`. It drops periods that are over, including a
leading night that is ending, refuses a forecast that does not start today,
pairs each day with the night after it, and on an evening run keeps
tonight as today with a low and no high. The agent copies the rows and does not
compute them.

The second scheduled run, on 2026-11-19, wrote its brief with git under the
agent identity. It dropped an email whose deadline was still four days away,
because the email had aged out of the two-day window. The instructions now search
the last fourteen days for such messages and keep each until its deadline
passes or later mail shows it was handled.

The third scheduled run, on 2026-11-20, used the open-deadline search and
brought the security alert back into the brief. It wrote a deadline that falls
after midnight Mountain time with only the earlier day's name; the instructions
now name both the day and the night.

A kept security alert keeps its row for seven days, found by a seven-day
search, unless mail shows it was resolved. It is spoken only in its first 48
hours, because answering an alert on the provider's
page usually sends no mail, and the room should not hear it all week.

Votes do not reach the task yet, so news picks use only the interests in
MISSION.md.

## Open

- **Live weather on the clock.** The clock shows the forecast from the last
  brief. A direct call to the National Weather Service API would keep the
  current temperature fresh overnight.
