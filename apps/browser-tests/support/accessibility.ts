import { AxeBuilder } from "@axe-core/playwright"
import { expect, type Page } from "@playwright/test"

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

// Contrast is measured on the settled page, not halfway through a fade-in.
const SETTLED_STYLES =
  "*, *::before, *::after { animation: none !important; transition: none !important; }"

// Fails on any WCAG 2.2 AA violation axe can detect on the current page.
export async function expectAccessible(page: Page): Promise<void> {
  await page.addStyleTag({ content: SETTLED_STYLES })

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

  const violations = results.violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.map(({ target, failureSummary }) => `${target.join(" ")}: ${failureSummary}`),
  }))

  expect(violations).toEqual([])
}
