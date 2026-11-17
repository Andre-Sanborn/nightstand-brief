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
2. That tap starts the audio engine, asks for the screen wake lock, and stores
   the alarm time.
3. The clock shows the time in dim red on black. Its position shifts a few
   pixels each minute so a static image does not burn into the screen.
4. The page checks the clock once a second. When the time passes the alarm time,
   the tone starts and grows louder over 30 seconds.
5. A tap stops the tone. The same tap is the user gesture that lets the page
   speak, so the greeting starts from inside that tap handler.
6. The brief view opens for scrolling and voting.

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
  creates the audio context. Arming plays a chime and the alarm is only set
  after the owner taps "I heard it", because a page cannot read the volume.
- **A stalled audio context.** One inaudible oscillator runs from the Arm tap so
  the context stays in use. Every state change is logged. When the context
  leaves `running` the page tries `resume()`, then `suspend()` and `resume()`.
- **No sound at alarm time.** The alarm screen flashes bright red. A flash will
  not wake a sleeper, so the owner keeps a backup alarm in the Clock app until
  device test 2 has passed on several nights.
- **A reloaded page.** A page that loads while an alarm is set has no audio
  engine. It shows a full-screen "Tap to re-arm" and logs the reload. A page that
  loads after the alarm time logs a missed alarm.
- **Speech.** The tone stops before speech starts. The first utterance is queued
  inside the stop tap. Each line is its own utterance, chained on `onend`, with
  a timer that moves on if `onend` never fires. The default voice is used, so
  nothing waits on the voice list.

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
- The page was driven through a simulated night in headless Chromium with a fake
  clock on 2026-11-17: arm at 10:15 PM, no ring at 6:29:59, ring at 6:30:00, stop
  tap, all fourteen sample lines spoken in order, a vote stored, and the re-arm
  screen after a reload. That script is not in the repository because it needs
  Playwright, which would be the first dependency. Chromium says nothing about
  iPadOS audio, speech or wake lock behaviour.

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
- While an alarm is set the app refetches every ten minutes, so a brief written
  before the alarm is picked up without a tap.
- The `meta` row carries `date` as `YYYY-MM-DD` in the owner's local time. A
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

## Open

- **Moving the Morning brief task.** It runs at 7:30 AM on weekdays. It has to
  finish before a 6:00 AM alarm, write `brief.json` to the private repository
  with a `date`, and add the news section. Weekend behaviour is undecided.
- **Live weather on the clock.** The clock shows the forecast from the last
  brief. A direct call to the National Weather Service API would keep the
  current temperature fresh overnight.
