const COLORS = {
  page: "#f2f3f1",
  card: "#ffffff",
  line: "#e3e6eb",
  ink: "#14161a",
  muted: "#5b6270",
  subtle: "#636a77",
  brand: "#1f4fd8",
  onBrand: "#ffffff",
}

const SANS = `'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
const SERIF = `Literata, Georgia, 'Times New Roman', serif`

export interface EmailAction {
  label: string
  url: string
}

export interface EmailLayout {
  lang: string
  webAppUrl: string
  preheader: string
  title: string
  paragraphs: string[]
  action: EmailAction
  note: string
  linkFallback: string
  ignore: string
  signature: string
  footer: string
  tagline: string
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

interface ParagraphParams {
  text: string
  style: string
}

function paragraph({ text, style }: ParagraphParams): string {
  return `<p style="margin:0 0 16px;${style}">${escapeHtml(text)}</p>`
}

function renderHeader(webAppUrl: string): string {
  const home = escapeHtml(webAppUrl)

  return `<a href="${home}" style="text-decoration:none;color:${COLORS.ink};">
  <img src="${home}/brand/symbol.png" width="44" height="29" alt="" style="display:inline-block;vertical-align:middle;border:0;" />
  <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-family:${SERIF};font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.6px;color:${COLORS.ink};">contraponha</span>
</a>`
}

function renderButton({ label, url }: EmailAction): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
  <tr>
    <td style="border-radius:8px;background:${COLORS.brand};">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:16px;line-height:1;font-weight:600;color:${COLORS.onBrand};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}

// Table layout with inline styles: the subset of HTML and CSS that email clients render consistently.
export function renderEmailLayout(layout: EmailLayout): string {
  const body = `color:${COLORS.ink};font-family:${SANS};font-size:16px;line-height:1.6;`
  const small = `color:${COLORS.subtle};font-family:${SANS};font-size:13px;line-height:1.6;`
  const url = escapeHtml(layout.action.url)

  return `<!doctype html>
<html lang="${escapeHtml(layout.lang)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(layout.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(layout.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 4px 24px;">${renderHeader(layout.webAppUrl)}</td>
        </tr>
        <tr>
          <td style="background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:12px;padding:36px 32px;">
            <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:600;color:${COLORS.ink};">${escapeHtml(layout.title)}</h1>
            ${layout.paragraphs.map((text) => paragraph({ text, style: body })).join("\n            ")}
            ${renderButton(layout.action)}
            ${paragraph({ text: layout.note, style: `${body}color:${COLORS.muted};font-size:15px;` })}
            <hr style="margin:24px 0;border:0;border-top:1px solid ${COLORS.line};" />
            <p style="margin:0 0 16px;${small}">${escapeHtml(layout.linkFallback)}<br /><a href="${url}" style="color:${COLORS.brand};word-break:break-all;">${url}</a></p>
            <p style="margin:0;${small}">${escapeHtml(layout.ignore)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 4px 0;${small}">
            <p style="margin:0 0 4px;color:${COLORS.ink};font-weight:600;">${escapeHtml(layout.signature)}</p>
            <p style="margin:0;">${escapeHtml(layout.footer)} ${escapeHtml(layout.tagline)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
