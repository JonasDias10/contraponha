import {
  AUTHOR_REPEAT_DECAY,
  AUTHOR_REPEAT_FLOOR,
  FOLLOWED_TOPIC_BOOST,
} from "./featured-ranking.js"

// Discover runs in stages: sources -> merge -> filter -> score -> diversify -> page.
// Each stage is replaceable on its own; a learned ranker would only swap scoreCandidates.

export interface DiscoverCandidate {
  postId: string
  authorId: string
  qualityScore: number
  matchedTopicSlug: string | null
}

export interface ScoredCandidate extends DiscoverCandidate {
  score: number
}

export interface ViewerExclusions {
  postIds: ReadonlySet<string>
  authorIds: ReadonlySet<string>
}

export interface FilterCandidatesParams {
  candidates: readonly DiscoverCandidate[]
  viewerId: string | undefined
  exclusions: ViewerExclusions
}

export const NO_EXCLUSIONS: ViewerExclusions = { postIds: new Set(), authorIds: new Set() }

// Earlier sources win on duplicates, so a source that explains the pick (followed topic)
// should come before the generic one.
export function mergeCandidates(
  sources: readonly (readonly DiscoverCandidate[])[],
): DiscoverCandidate[] {
  const byPost = new Map<string, DiscoverCandidate>()

  for (const candidate of sources.flat())
    if (!byPost.has(candidate.postId)) byPost.set(candidate.postId, candidate)

  return [...byPost.values()]
}

export function filterCandidates({
  candidates,
  viewerId,
  exclusions,
}: FilterCandidatesParams): DiscoverCandidate[] {
  return candidates.filter(
    ({ postId, authorId }) =>
      authorId !== viewerId &&
      !exclusions.postIds.has(postId) &&
      !exclusions.authorIds.has(authorId),
  )
}

export function scoreCandidates(candidates: readonly DiscoverCandidate[]): ScoredCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    score: candidate.qualityScore * (candidate.matchedTopicSlug ? FOLLOWED_TOPIC_BOOST : 1),
  }))
}

// Highest score first; ties go to the newest post (ids are time ordered).
function sortByScore(candidates: readonly ScoredCandidate[]): ScoredCandidate[] {
  return candidates.toSorted((first, second) =>
    first.score === second.score
      ? first.postId < second.postId
        ? 1
        : -1
      : second.score - first.score,
  )
}

function authorRepeatWeight(repeat: number): number {
  return (1 - AUTHOR_REPEAT_FLOOR) * AUTHOR_REPEAT_DECAY ** repeat + AUTHOR_REPEAT_FLOOR
}

// Each further post by an author already ranked above is weighted down, so one prolific
// author cannot fill a page.
export function diversifyAuthors(candidates: readonly ScoredCandidate[]): ScoredCandidate[] {
  const seenByAuthor = new Map<string, number>()

  const weighted = sortByScore(candidates).map((candidate) => {
    const repeat = seenByAuthor.get(candidate.authorId) ?? 0

    seenByAuthor.set(candidate.authorId, repeat + 1)

    return { ...candidate, score: candidate.score * authorRepeatWeight(repeat) }
  })

  return sortByScore(weighted)
}

export function rankDiscover(params: FilterCandidatesParams): ScoredCandidate[] {
  return diversifyAuthors(scoreCandidates(filterCandidates(params)))
}
