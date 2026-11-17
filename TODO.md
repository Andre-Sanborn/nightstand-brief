# TODO

## First version, sample brief only

- [x] Write the project rules, mission and implementation notes
- [x] Build the pure core: next alarm time, spoken script, vote records
- [x] Build the dim red clock page with Arm, alarm tone, stop-tap greeting and brief view
- [x] Add thumbs up, thumbs down and "nothing like this" on news items, stored on the device
- [x] Add the workflow that publishes `app/` with GitHub Pages from `main`
- [ ] Owner: make the repository public and turn on GitHub Pages
- [ ] Merge the development branch to `main` and confirm the page loads
- [ ] Device test 1: one-minute alarm on the iPad, tone and speech both heard
- [ ] Device test 2: arm overnight, read the night log in the morning

## Real brief

- [x] Fetch the brief from a private repository with a token typed into the iPad
- [x] Refuse to read a brief dated another day
- [ ] Owner: create the private brief repository and a read-only token
- [x] Write the brief generator contract and a checker for `brief.json`
- [ ] Have the brief generator run the checker and refuse to write a brief with errors
- [ ] Move the Morning brief task ahead of the alarm and have it write `brief.json` to the private repository
- [ ] Add the news section to the Morning brief task, driven by MISSION.md interests
- [ ] Send votes back so the next brief's news picks use them
- [ ] Ask the owner follow-up questions to narrow each news topic

## Later

- [ ] Live temperature on the clock from the National Weather Service API
- [ ] Snooze
- [ ] Per-weekday alarm times
