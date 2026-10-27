/**
 * HTML → Markdown 转换（浏览器端）
 *
 * 两处使用：
 * 1. 写文章页粘贴富文本（handlePaste）：剪贴板 text/html 转成 Markdown 后插入编辑器；
 * 2. 写文章页工具栏「HTML 转 MD」按钮：手头有 HTML 源码时显式转换。
 *
 * 覆盖 DeepSeek/常见渲染器产出的语义标签；样式强调（span/font）按 style 兜底。
 * 判据与 Typora 一致：HTML 里有结构化标签才值得转换（见 hasStructuralHtml）。
 */

/** HTML 里是否存在值得转换的结构化标签（转换与否的唯一判据） */
export function hasStructuralHtml(html: string): boolean {
  return /<(h[1-6]|strong|b|em|i|del|s|u|ins|ul|ol|li|pre|blockquote|table|a|code|img|hr|sup|sub)\b/i.test(html)
}

/** HTML → Markdown；入参可以是完整文档或片段 */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return renderMdChildren(doc.body)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function renderMdChildren(node: Node): string {
  let out = ''
  node.childNodes.forEach((child) => {
    out += renderMdNode(child)
  })
  return out
}

function renderMdNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    // 行内空白折叠成单个空格；块级标签自带 \n\n 分隔
    return (node.textContent || '').replace(/\s+/g, ' ')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const inner = renderMdChildren(el).trim()

  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return `\n\n${'#'.repeat(Number(tag[1]))} ${inner}\n\n`
    case 'p': case 'div': case 'section': case 'article': case 'figure':
      return `\n\n${inner}\n\n`
    case 'strong': case 'b':
      return inner ? `**${inner}**` : ''
    case 'em': case 'i':
      return inner ? `*${inner}*` : ''
    case 'span': case 'font': {
      // 部分渲染器用样式而非语义标签做强调（<span style="font-weight:600">）
      const style = el.getAttribute('style') || ''
      if (/font-weight:\s*(bold|[5-9]00)/i.test(style)) return inner ? `**${inner}**` : ''
      if (/font-style:\s*italic/i.test(style)) return inner ? `*${inner}*` : ''
      return inner
    }
    case 'img':
      return `![${el.getAttribute('alt') || ''}](${el.getAttribute('src') || ''})`
    case 'del': case 's': case 'strike':
      return inner ? `~~${inner}~~` : ''
    case 'code':
      // pre 里的 code 由 pre 分支处理，这里是行内代码
      return el.parentElement?.tagName.toLowerCase() === 'pre'
        ? (el.textContent ?? '')
        : `\`${el.textContent?.trim() ?? ''}\``
    case 'pre': {
      const codeEl = el.querySelector('code')
      const lang =
        (codeEl?.className || el.className || '').match(/language-([\w-]+)/)?.[1] ?? ''
      const body = (codeEl ?? el).textContent ?? ''
      return `\n\n\`\`\`${lang}\n${body.replace(/\n+$/, '')}\n\`\`\`\n\n`
    }
    case 'a': {
      const href = el.getAttribute('href') || ''
      return href ? `[${inner}](${href})` : inner
    }
    case 'br':
      return '\n'
    case 'hr':
      return '\n\n---\n\n'
    case 'blockquote':
      return `\n\n${inner.split('\n').map((line) => `> ${line}`).join('\n')}\n\n`
    case 'ul':
    case 'ol': {
      const ordered = tag === 'ol'
      const items = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      )
      const lines = items.map((li, i) => {
        const content = renderMdChildren(li).trim().replace(/\n+/g, '\n  ')
        return `${ordered ? `${i + 1}.` : '-'} ${content}`
      })
      return lines.length ? `\n\n${lines.join('\n')}\n\n` : ''
    }
    case 'li':
      return renderMdChildren(el)
    case 'table':
      return renderMdTable(el)
    case 'style': case 'script': case 'meta': case 'link': case 'title':
      return ''
    default:
      return inner || (el.textContent ?? '')
  }
}

/** 简易表格：首行当表头 */
function renderMdTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (!rows.length) return ''
  const lines: string[] = []
  rows.forEach((tr, rowIndex) => {
    const cells = Array.from(tr.children).map(
      (cell) => (cell.textContent || '').trim().replace(/\|/g, '\\|')
    )
    lines.push(`| ${cells.join(' | ')} |`)
    if (rowIndex === 0) {
      lines.push(`| ${cells.map(() => '---').join(' | ')} |`)
    }
  })
  return `\n\n${lines.join('\n')}\n\n`
}
