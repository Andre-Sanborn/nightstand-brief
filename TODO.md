# TODO

## First version, sample brief only

- [x] Write the project rules, mission and implementation notes
- [x] Build the pure core: next alarm time, spoken script, vote records
- [x] Build the dim red clock page with Arm, alarm tone, stop-tap greeting and brief view
- [x] Add thumbs up, thumbs down and "nothing like this" on news items, stored on the device
- [x] Add the workflow that publishes `app/` with GitHub Pages from `main`
- [x] Owner: make the repository public and turn on GitHub Pages
- [x] Merge the development branch to `main` and publish the page
- [ ] Owner: open the page on the iPad and add it to the Home Screen
- [x] Add the soft wake: chimes and a brightening screen before the alarm
- [ ] Device test 1: one-minute alarm on the iPad, soft wake, tone and speech all work
- [ ] Device test 2: arm overnight, read the night log in the morning
- [ ] Device test 3: tap during the soft wake; the alarm should still ring at the alarm time

## Real brief

- [x] Fetch the brief from a private repository with a token typed into the iPad
- [x] Refuse to read a brief dated another day
- [x] Owner: create the private brief repository
- [ ] Owner: create a read-only token and type it into the iPad
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
