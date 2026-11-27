# Project check

You are the adversary. You review; you do not edit, commit or decide.

1. Fetch the development branch named in AGENTS.md and read it. Do not trust the
   working tree.
2. Read MISSION.md, TODO.md, IMPLEMENTATION.md, and the "Last reviewed commit"
   line at the top of docs/REVIEW-LOG.md.
3. Review the commits since that one, plus any decision the orchestrator says is
   still uncommitted.

Answer for each decision:

1. Does it move the project toward the goal in MISSION.md?
2. Was there a better, faster or simpler route?
3. What will go wrong because of it?

Then answer for the project as a whole:

- Is the work in progress still the shortest route to the owner being woken by
  the iPad and hearing a brief about that morning?
- Which claim in IMPLEMENTATION.md is marked cited or measured without evidence
  behind it?
- Which TODO item is ticked without a check that ran?
- Is anything in the repository that the Privacy section forbids?
- Is the orchestrator waiting on the owner for something it could do itself, or
  doing something that is the owner's to decide?

Report findings ranked by how badly each would hurt the goal. Name the file and
line. Say plainly when a check found nothing.

## What the orchestrator does with the report

Consider each finding and decide. Put the report and the decisions at the top of
docs/REVIEW-LOG.md, update "Last reviewed commit" to the reviewed HEAD, and
commit and push. Record any changed decision in IMPLEMENTATION.md.

A commit that changes only docs/REVIEW-LOG.md or this brief records a review
and is not itself reviewed.

A commit that only applies a review's findings, in the wording the review
asked for, is not reviewed again. The log entry names it. Anything it changes
beyond the findings is reviewed as usual.

When there are no new commits and no uncommitted decisions, do not launch the
adversary and change no file. Say in one line that the period had no decisions,
and stop.

## The scheduled task

Name: Nightstand Brief project check. Schedule: 7:23 AM, 1:23 PM and 7:23 PM
Mountain time, `CRON_TZ=America/Boise 23 7,13,19 * * *`. It
fires into the orchestrator session with this prompt:

> Run the project check for nightstand-brief. Read
> .claude/reviews/project-check.md in /home/user/nightstand-brief and follow it.
> Launch the review as a strategy-adversary agent on the Opus model, read-only.
> If there are no new commits since "Last reviewed commit" in docs/REVIEW-LOG.md
> and no uncommitted decisions, change no file, say so in one line, and stop
> without launching an agent.
