# TODO

## First version, sample brief only

- [x] Write the project rules, mission and implementation notes
- [x] Build the pure core: next alarm time, spoken script, vote records
- [x] Build the dim red clock page with Arm, alarm tone, stop-tap greeting and brief view
- [x] Add thumbs up, thumbs down and "nothing like this" on news items, stored on the device
- [ ] Publish `app/` somewhere the iPad can open over HTTPS
- [ ] Device test 1: one-minute alarm on the iPad, tone and speech both heard
- [ ] Device test 2: arm overnight, read the night log in the morning

## Real brief

- [ ] Decide how the private brief reaches the iPad and build the fetch
- [ ] Move the Morning brief task ahead of the alarm and have it write the JSON here
- [ ] Add the news section to the Morning brief task, driven by MISSION.md interests
- [ ] Send votes back so the next brief's news picks use them
- [ ] Ask the owner follow-up questions to narrow each news topic

## Later

- [ ] Live temperature on the clock from the National Weather Service API
- [ ] Snooze
- [ ] Per-weekday alarm times
