// Quality signals only: agreement and disagreement do not make a post rank higher,
// so a well-argued post the majority disagrees with can still be featured.
export const FEATURED_WEIGHTS = {
  goodArgument: 3,
  insightful: 2,
  comment: 1,
} as const

// Hacker News style decay: score / (ageInHours + AGE_OFFSET) ^ GRAVITY.
export const FEATURED_GRAVITY = 1.5
export const FEATURED_AGE_OFFSET_HOURS = 2

export const FEATURED_MAX_OFFSET = 500
