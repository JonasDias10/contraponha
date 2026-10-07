import { describe, expect, it } from "vitest"

import {
  diversifyAuthors,
  filterCandidates,
  mergeCandidates,
  NO_EXCLUSIONS,
  rankDiscover,
  scoreCandidates,
  type DiscoverCandidate,
  type ScoredCandidate,
} from "./discover-pipeline.js"
import { FOLLOWED_TOPIC_BOOST } from "./featured-ranking.js"

function candidate(overrides: Partial<DiscoverCandidate>): DiscoverCandidate {
  return {
    postId: "post",
    authorId: "author",
    qualityScore: 1,
    matchedTopicSlug: null,
    ...overrides,
  }
}

function scored(overrides: Partial<ScoredCandidate>): ScoredCandidate {
  return { ...candidate(overrides), score: overrides.score ?? 1 }
}

describe("mergeCandidates", () => {
  it("keeps the first source's copy of a post found by several sources", () => {
    const fromTopic = candidate({ postId: "a", matchedTopicSlug: "saude" })
    const fromGlobal = candidate({ postId: "a" })
    const other = candidate({ postId: "b" })

    expect(mergeCandidates([[fromTopic], [fromGlobal, other]])).toEqual([fromTopic, other])
  })
})

describe("filterCandidates", () => {
  const own = candidate({ postId: "own", authorId: "viewer" })
  const reportedPost = candidate({ postId: "reported", authorId: "x" })
  const reportedAuthor = candidate({ postId: "by-reported", authorId: "troll" })
  const kept = candidate({ postId: "kept", authorId: "y" })
  const candidates = [own, reportedPost, reportedAuthor, kept]

  it("drops the viewer's own posts and what they reported", () => {
    const exclusions = { postIds: new Set(["reported"]), authorIds: new Set(["troll"]) }

    expect(filterCandidates({ candidates, viewerId: "viewer", exclusions })).toEqual([kept])
  })

  it("keeps everything for an anonymous reader", () => {
    expect(
      filterCandidates({ candidates, viewerId: undefined, exclusions: NO_EXCLUSIONS }),
    ).toEqual(candidates)
  })
})

describe("scoreCandidates", () => {
  it("boosts posts in followed topics", () => {
    const [plain, boosted] = scoreCandidates([
      candidate({ qualityScore: 2 }),
      candidate({ qualityScore: 2, matchedTopicSlug: "saude" }),
    ])

    expect(plain?.score).toBe(2)

    expect(boosted?.score).toBe(2 * FOLLOWED_TOPIC_BOOST)
  })
})

describe("diversifyAuthors", () => {
  it("lets other authors through when one author dominates the top", () => {
    const ranked = diversifyAuthors([
      scored({ postId: "a1", authorId: "a", score: 10 }),
      scored({ postId: "a2", authorId: "a", score: 9 }),
      scored({ postId: "a3", authorId: "a", score: 8 }),
      scored({ postId: "b1", authorId: "b", score: 6 }),
    ])

    expect(ranked.map(({ postId }) => postId)).toEqual(["a1", "b1", "a2", "a3"])
  })

  it("never drops a repeated author's posts to zero", () => {
    const ranked = diversifyAuthors(
      Array.from({ length: 20 }, (_, index) =>
        scored({ postId: `a${String(index)}`, authorId: "a", score: 1 }),
      ),
    )

    expect(ranked.every(({ score }) => score > 0)).toBe(true)
  })

  it("breaks ties by newest post id", () => {
    const ranked = diversifyAuthors([
      scored({ postId: "01", authorId: "a" }),
      scored({ postId: "02", authorId: "b" }),
    ])

    expect(ranked.map(({ postId }) => postId)).toEqual(["02", "01"])
  })
})

describe("rankDiscover", () => {
  it("filters before ranking", () => {
    const ranked = rankDiscover({
      candidates: [candidate({ postId: "hidden" }), candidate({ postId: "shown", authorId: "b" })],
      viewerId: "viewer",
      exclusions: { postIds: new Set(["hidden"]), authorIds: new Set() },
    })

    expect(ranked.map(({ postId }) => postId)).toEqual(["shown"])
  })
})
