# Two-hour project check

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

When there are no new commits and no uncommitted decisions, do not launch the
adversary. Add one line to docs/REVIEW-LOG.md saying the period had no
decisions, and stop.

## The scheduled task

Name: Nightstand Brief two-hour project check. Schedule: every two hours. It
fires into the orchestrator session with this prompt:

> Run the two-hour project check for nightstand-brief. Read
> .claude/reviews/project-check.md in /home/user/nightstand-brief and follow it.
> Launch the review as a strategy-adversary agent on the Opus model, read-only.
> If there are no new commits since "Last reviewed commit" in docs/REVIEW-LOG.md
> and no uncommitted decisions, add the one-line entry and stop without
> launching an agent.
