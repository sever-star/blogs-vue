/** turndown-plugin-gfm 未自带类型声明，按实际导出补一份（gfm/tables/strikethrough/taskListItems/highlightedCodeBlock） */
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown'
  type Plugin = (service: TurndownService) => void
  export const gfm: Plugin
  export const tables: Plugin
  export const strikethrough: Plugin
  export const taskListItems: Plugin
  export const highlightedCodeBlock: Plugin
}
