# TODO

## First version, sample brief only

- [x] Write the project rules, mission and implementation notes
- [x] Build the pure core: next alarm time, spoken script, vote records
- [x] Build the dim red clock page with Arm, alarm tone, stop-tap greeting and brief view
- [x] Add thumbs up, thumbs down and "nothing like this" on news items, stored on the device
- [x] Add the workflow that publishes `app/` with GitHub Pages from `main`
- [x] Owner: make the repository public and turn on GitHub Pages
- [x] Merge the development branch to `main` and publish the page
- [x] Owner: open the page on the iPad and add it to the Home Screen
- [x] Add the soft wake: chimes and a brightening screen before the alarm
- [x] Read a narration written for listening from the brief's spoken rows
- [x] Add a voice choice with Try it, used for every reading
- [x] Keep buttons inside the screen edges and safe areas at iPad sizes
- [ ] Device check: controls and brief bar not clipped in the Home Screen app
- [ ] Fall back to the default voice when the chosen voice fails
- [ ] Owner: decide on a paid voice service for a natural voice
- [ ] Device test 1: one-minute alarm on the iPad, soft wake, tone and speech all work
- [ ] Device test 2: arm overnight, read the night log in the morning
- [ ] Device test 3: tap during the soft wake; the alarm should still ring at the alarm time

## Real brief

- [x] Fetch the brief from a private repository with a token typed into the iPad
- [x] Refuse to read a brief dated another day
- [x] Owner: create the private brief repository
- [x] Owner: create a read-only token and type it into the iPad
- [x] Write the brief generator contract and a checker for `brief.json`
- [x] Write the instructions the daily brief task follows, including the checker step
- [x] Create the daily brief task
- [ ] Owner: create a durable daily brief task on the routines page, with repositories and connectors
- [x] Confirm one scheduled run writes a valid `brief.json`
- [ ] Send votes back so the next brief's news picks use them
- [ ] Ask the owner follow-up questions to narrow each news topic

## Later

- [ ] Live temperature on the clock from the National Weather Service API
- [ ] Snooze
- [ ] Per-weekday alarm times
