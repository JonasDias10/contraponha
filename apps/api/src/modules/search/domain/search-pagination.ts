// Relevance order is not stable enough for keyset pagination, so search pages by offset
// and stops after a cap; deeper results call for a more specific query.
export const SEARCH_MAX_OFFSET = 200

// LIKE treats % and _ as wildcards; the user's text must match literally.
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`)
}
