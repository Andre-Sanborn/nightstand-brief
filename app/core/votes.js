export const VOTES = ['up', 'down', 'never'];

// One vote per story. Repeating the same vote withdraws it.
export function applyVote(votes, item, vote, at) {
  if (!VOTES.includes(vote)) return votes;
  const existing = votes.find((v) => v.id === item.id);
  const rest = votes.filter((v) => v.id !== item.id);
  if (existing && existing.vote === vote) return rest;
  return [...rest, { id: item.id, topic: item.topic || '', title: item.title || '', vote, at }];
}

export function voteFor(votes, id) {
  const found = votes.find((v) => v.id === id);
  return found ? found.vote : null;
}
