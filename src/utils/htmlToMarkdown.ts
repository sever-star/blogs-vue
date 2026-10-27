/**
 * HTML → Markdown 转换（Turndown 实现，参考 1.html 的方案）
 *
 * 两处使用：
 * 1. 写文章页粘贴富文本（handlePaste）：剪贴板 text/html 转成 Markdown 后插入编辑器；
 * 2. 写文章页工具栏「HTML 转 MD」按钮：手头有 HTML 源码时显式转换。
 *
 * 不再手写标签映射——Turndown 是该转换的事实标准库，GFM 表格/删除线/
 * 任务列表由 turndown-plugin-gfm 提供。
 */

import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

// 单例：规则表在构造时初始化，整个应用共用一个实例
const turndown = new TurndownService({
  headingStyle: 'atx', // # 标题
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced', // ``` 围栏
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
})

// GFM：表格、删除线、任务列表
turndown.use(gfm)

// md-editor 预览的代码块用 <details><summary class="md-editor-code-head">语言 复制代码</summary>…
// 包裹：summary 是 UI 控件（语言标签 + 复制按钮）不属于正文，丢弃；details 内容保留。
turndown.addRule('mdEditorCodeHead', {
  filter: (node) =>
    node.nodeName === 'SUMMARY' &&
    (node.getAttribute('class') || '').includes('md-editor-code-head'),
  replacement: () => '',
})

/** HTML 里是否存在值得转换的结构化标签（粘贴时转换与否的判据，与 Typora 同策略） */
export function hasStructuralHtml(html: string): boolean {
  return /<(h[1-6]|strong|b|em|i|del|s|u|ins|ul|ol|li|pre|blockquote|table|a|code|img|hr|sup|sub)\b/i.test(html)
}

/** HTML → Markdown；入参可以是完整文档或片段 */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim()
}
