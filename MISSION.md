# Mission

Nightstand Brief turns an iPad on a nightstand into a dim red bedside clock that
wakes its owner and reads them the morning brief.

## What it does

1. **Night.** The iPad sits plugged in. The screen shows the time and the weather
   in dim red on black, like an iPhone in StandBy.
2. **Soft wake.** A few minutes before the alarm, gentle chimes begin and the
   screen brightens slowly from black to white.
3. **Alarm.** At the set time an alarm tone plays, unless the owner is already
   up.
4. **Greeting.** A tap stops the sound. The app says good morning and reads the
   highlights: the headline, today's to-dos and calendar, the weather, and the
   top three news items.
5. **Details.** The full brief is on screen to scroll through.
6. **Feedback.** Each news item takes a thumbs up, a thumbs down, or "nothing
   like this". The votes shape the next day's news picks.

## Where the brief comes from

A scheduled Claude task builds the brief each morning from Gmail, Google
Calendar, the National Weather Service forecast for Boise, first-party AI release
notes, and the news. It finishes before the alarm, which is normally between
6:00 and 7:00 AM Mountain time.

## News interests

Recorded 2026-11-17 from the owner's answers. Follow-up questions will narrow
these.

- Draw from: AI and tech; markets and the economy; outdoors, caving and Idaho;
  world and US headlines.
- Leave out: sports and celebrity.

## Constraints the owner accepted

- The app is a web page added to the iPad Home Screen, not a native app.
- The iPad stays plugged in with the clock on screen all night. A web page
  cannot wake a locked iPad.
- The owner taps "Arm" each night.

## What done looks like

The owner goes to bed, taps Arm, and is woken at the set time by the iPad, hears
a brief that is about that morning, and finds the three news items worth
hearing on most days.
