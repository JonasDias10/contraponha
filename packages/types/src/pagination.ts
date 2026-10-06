export interface Page<TItem> {
  items: TItem[]
  nextCursor: string | null
}
