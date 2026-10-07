import { PAGE_SIZE_MAX } from "@ponto/validation"

// Quality signals only: there is no agreement reaction, and popularity (followers, views)
// plays no part, so a well-argued post most people disagree with can still be recommended.
export const FEATURED_WEIGHTS = {
  goodArgument: 3,
  changedMyMind: 3,
  insightful: 2,
  comment: 1,
} as const

// Hacker News style decay: score / (ageInHours + AGE_OFFSET) ^ GRAVITY.
export const FEATURED_GRAVITY = 1.5
export const FEATURED_AGE_OFFSET_HOURS = 2

// Posts in a topic the reader follows rank as if their score were this many times higher.
export const FOLLOWED_TOPIC_BOOST = 2

// The n-th extra post by the same author is weighted by
// (1 - AUTHOR_REPEAT_FLOOR) * AUTHOR_REPEAT_DECAY ^ n + AUTHOR_REPEAT_FLOOR.
export const AUTHOR_REPEAT_DECAY = 0.5
export const AUTHOR_REPEAT_FLOOR = 0.1

export const FEATURED_MAX_OFFSET = 500

// Each source returns enough candidates to fill every page up to the offset cap.
export const DISCOVER_CANDIDATES_PER_SOURCE = FEATURED_MAX_OFFSET + PAGE_SIZE_MAX

export const ONGOING_DISCUSSIONS_LIMIT = 3
