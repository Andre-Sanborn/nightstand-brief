# Brief generator contract

A scheduled Claude task writes the morning brief each day. The iPad app in
`app/` reads it, shows it, and reads part of it aloud. This file says what the
task must write. `app/core/validate.js` checks a brief against it.

## The file and where it goes

- The brief is one JSON file named `brief.json`.
- It is written to the root of a private repository that the iPad reads with a
  read-only token.
- **It is never written to this repository.** This repository is public. A real
  brief holds email, calendar and to-do content.
- The file is an object with one key, `rows`, holding an array of row objects:
  `{ "rows": [ ... ] }`.

## Timing

- The file must be written before 6:00 AM Mountain time. The alarm normally
  rings between 6:00 and 7:00 AM, and while it is armed the app refetches every ten
  minutes, and every two minutes in the last fifteen minutes before the alarm.
- `meta.date` is the date of the morning the brief is for, in Mountain local
  time, written `YYYY-MM-DD`. The app refuses to read a brief whose date is not
  the iPad's local date. Do not use the UTC date: at 11 PM Mountain it is
  already tomorrow in UTC.
- The app also reads a `meta.date` with a time after the date, such as
  `2026-03-03T05:20:00-07:00`, and uses only the date part. Write the plain
  date: the checker accepts only `YYYY-MM-DD`.

## Rows

Every row has two fields:

| Field | Meaning |
|---|---|
| `section` | One of `meta`, `todo`, `cal`, `wx`, `wx_note`, `news`, `ai`, `email`, `tip`. |
| `ord` | A number. Rows in a section are shown and read in `ord` order, lowest first. Start at 0. |

The other fields depend on the section. "Read aloud" means the field goes into
the spoken script. "Shown" means it is on screen only. A field not listed for a
section is ignored.

### `meta`: exactly one row

| Field | Required | Use |
|---|---|---|
| `date` | Yes | `YYYY-MM-DD`, the local date of the morning. Read by the app to decide whether the brief is today's. |
| `title` | No | The headline: one sentence summing up the day. Read aloud after the greeting. |
| `greeting` | No | A sentence written for the ear, such as "Good morning. It's a cold one." Read aloud first. Without it the app says "Good morning. It's Tuesday, March 3." |
| `day` | No | The date as shown, such as "Tuesday · March 3 2026". Shown. |
| `time` | No | When the brief was made, such as "Ready 5:30 AM". Shown. |

### `todo`: things to do

| Field | Required | Use |
|---|---|---|
| `title` | Yes | The task, such as "Return the library books". Read aloud. Only the first four to-dos are read. |
| `tag` | No | When it is due, such as "Today" or "Friday". Read aloud before the title, as "Today: Return the library books." |
| `detail` | No | One sentence of context. Shown. |

### `cal`: calendar events

| Field | Required | Use |
|---|---|---|
| `day` | Yes | Begins with the word "Today" for today's events, such as "Today · Tue Mar 3". Only rows whose `day` begins with the word "Today" are read aloud; "Todayish" does not count. Later days are shown. |
| `time` | No | Such as "2 PM", "2 to 2:45 PM" or "All day". Read aloud before the title. |
| `title` | Yes | The event, such as "Dentist cleaning". Read aloud for today's events. |
| `detail` | No | Place or people. Shown. |

When nothing is on the calendar today, write one row with `day` starting with
"Today" and `title` "Nothing scheduled". The app then says "Nothing on the
calendar today."

### `wx`: daily forecast

One row per day, today first at `ord` 0. Only the `ord` 0 row is read aloud.
It also appears on the clock overnight.

| Field | Required | Use |
|---|---|---|
| `day` | No | Short day name, such as "Tue". Shown. |
| `title` | No | Conditions, such as "Partly sunny". Read aloud for today. |
| `hi` | No | High temperature in degrees Fahrenheit, as a number. |
| `lo` | No | Low temperature in degrees Fahrenheit, as a number. |
| `pop` | No | Chance of rain or snow in percent, 0 to 100, as a number. Not read when 0. |

### `wx_note`: one forecast summary

| Field | Required | Use |
|---|---|---|
| `detail` | No | One or two sentences about the coming days. Shown. |
| `source` | No | Where the forecast came from. |

### `news`: the three news items

| Field | Required | Use |
|---|---|---|
| `id` | Yes | A stable identifier for the story. Votes are stored against it. See below. |
| `topic` | Yes | The interest it belongs to, such as "Markets & economy". Stored with each vote. |
| `title` | Yes | One sentence, under 140 characters. Read aloud. |
| `detail` | Yes | One or two sentences. Read aloud straight after the title. |
| `source` | No | The publisher. Shown. |
| `link` | No | An `https://` address for the story. The app does not show links yet. |

### `ai`, `email`, `tip`: shown only

These are on screen and never read aloud.

| Field | Required | Use |
|---|---|---|
| `title` | Yes | One line. |
| `tag` | No | A short label, such as "New". |
| `detail` | No | One or two sentences. |
| `source` | No | Where it came from. |
| `link` | No | An `https://` address. The app does not show links yet. |

`ai` holds first-party AI release notes. `email` holds messages that need the
reader. `tip` holds one short tip.

## What the checker enforces

`validateBrief(json, now)` in `app/core/validate.js` returns
`{ ok, errors, warnings }`. Each message names the row by section and `ord`. A
brief with any error must not be written. Fix it first. Fix warnings when you
can.

Errors:

- The file is not an object with a `rows` array.
- A row is not an object, or its `section` is not one of the nine above.
- There is no `meta` row, or more than one.
- `meta.date` is missing, is not `YYYY-MM-DD`, or is not a real date.
- A `todo`, `cal`, `news`, `ai`, `email` or `tip` row has an empty `title`.
- A `news` row has no `id`, or reuses another news row's `id`.
- A `wx` row has `hi`, `lo` or `pop` that is present but not a number. A
  number or a string such as `"52"` passes. `"52°"` fails.
- There are more than three `news` rows.

Warnings:

- `meta.date` is not the local date of `now`. When the generator runs the check
  on the morning of the brief, treat this as an error: the app will not read the
  brief aloud.
- There are no `wx` rows.
- No `cal` row has a `day` starting with "Today".
- A `news` row has no `topic` or no `detail`.
- Any row's `title` is longer than 140 characters.
- A `link` does not start with `https://`.

To run the check, clone this repository and run this from its root, with the
path to the new brief and the run time's zone:

```bash
TZ=America/Boise node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { validateBrief } from './app/core/validate.js';
const result = validateBrief(JSON.parse(readFileSync(process.argv[1], 'utf8')), new Date());
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
" /path/to/brief.json
```

## Picking the three news items

The interests and exclusions are in [MISSION.md](../MISSION.md), under "News
interests". Read them there each time. They will change as the owner answers
follow-up questions.

- Pick three stories. Draw them from different topics where possible, one story
  per topic.
- Leave out every excluded topic, even when a story is big.
- Prefer primary sources: the agency, company, court or researcher that made
  the news, over a report about it.
- State facts. Leave out opinion pieces, columns and predictions.
- Pick stories from the last day that the owner would want to hear before
  getting up.

Each item gets:

- **`id`**: lowercase words joined by hyphens that name the story's subject and
  event, such as `river-flood-warning-lifted`. Use the same `id` when the same
  story returns on a later day, so a vote on it still applies. Never put the
  brief's date in it.
- **`topic`**: the MISSION.md interest it belongs to, spelled the same way each
  day.
- **`title`**: one sentence under 140 characters that says what happened.
- **`detail`**: one or two sentences that say why it matters or what comes next,
  written to be read aloud.

### Votes

The owner votes on each news item on the iPad. A vote is
`{ id, topic, title, vote, at }`, where `vote` is one of:

- `up`: more like this. Raise that topic in later picks.
- `down`: less like this. Lower that topic in later picks.
- `never`: nothing like this. Leave out stories like that one, and do not pick
  that `id` again.

Votes stay on the iPad today. Sending them back to the generator is not built.
Until it is, pick from MISSION.md alone.

## Writing for the ear

The app speaks `meta.greeting`, `meta.title`, to-do titles and tags, today's
calendar times and titles, today's weather, and news titles and details. Write
those fields so a speech voice reads them well.

- Write words, not symbols. Write "and", not "&". Write "percent" and
  "degrees", not "%" and "°".
- Put no URLs, email addresses or hashtags in `title` or `detail`.
- Write times the way people say them: "2 PM", "2:30 PM", "2 to 2:45 PM",
  "noon". Not "14:00" or "2:00pm".
- Write dates as words: "Friday" or "March 6", not "3/6".
- Spell out abbreviations a voice may misread, unless they are said as letters
  (such as "NASA" or "AI").
- Keep each sentence short. Each line is spoken as its own utterance.

## Example

An invented brief for Tuesday, March 3, 2026. Every person, event and story in
it is made up.

```json
{
  "rows": [
    { "section": "meta", "ord": 0, "date": "2026-03-03", "day": "Tuesday · March 3 2026", "time": "Ready 5:20 AM",
      "title": "A quiet morning, then the dentist at two." },
    { "section": "todo", "ord": 0, "tag": "Today", "title": "Return the library books",
      "detail": "Three books are due at the Maple Street branch by closing time." },
    { "section": "cal", "ord": 0, "day": "Today · Tue Mar 3", "time": "2 to 2:45 PM", "title": "Dentist cleaning",
      "detail": "Elm Street office" },
    { "section": "cal", "ord": 1, "day": "Wed Mar 4", "time": "All day", "title": "Recycling pickup" },
    { "section": "wx", "ord": 0, "day": "Tue", "title": "Partly sunny", "hi": 52, "lo": 34, "pop": 10 },
    { "section": "wx", "ord": 1, "day": "Wed", "title": "Rain", "hi": 47, "lo": 36, "pop": 80 },
    { "section": "wx_note", "ord": 0, "detail": "Dry today, then rain moves in Wednesday morning.", "source": "Sample forecast" },
    { "section": "news", "ord": 0, "id": "sample-lab-releases-model", "topic": "AI & tech",
      "title": "A sample lab released a smaller language model that runs on phones.",
      "detail": "It is free to download. The lab says it answers about as well as last year's largest model.",
      "source": "Sample Lab", "link": "https://example.com/sample-model" },
    { "section": "news", "ord": 1, "id": "sample-bank-holds-rates", "topic": "Markets & economy",
      "title": "A sample central bank held its interest rate steady.",
      "detail": "It said it will look at the rate again in six weeks.", "source": "Sample Bank" },
    { "section": "news", "ord": 2, "id": "sample-cave-mapped", "topic": "Outdoors, caving & Idaho",
      "title": "Volunteers finished mapping a sample cave.",
      "detail": "The map adds two miles of passage and will be published this spring.", "source": "Sample Grotto" },
    { "section": "email", "ord": 0, "title": "A neighbor asked to borrow the ladder", "detail": "They need it Saturday." },
    { "section": "tip", "ord": 0, "tag": "iPad", "title": "Swipe down from the top right",
      "detail": "Opens Control Centre, where the brightness slider is." }
  ]
}
```
