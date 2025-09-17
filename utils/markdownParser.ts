import { marked } from 'marked'

/**
 * 将markdown文本转换为HTML
 * @param markdownText - markdown格式的文本
 * @returns HTML格式的文本
 */
export function parseMarkdownToHtml(markdownText: string): string {
  try {
    // 配置marked选项
    marked.setOptions({
      breaks: true, // 支持换行符转换为<br>
      gfm: true, // 支持GitHub风格的markdown
    })
    
    // 解析markdown为HTML（使用同步版本）
    const html = marked.parse(markdownText) as string
    return html
  } catch (error) {
    console.error('Markdown parsing error:', error)
    // 如果解析失败，返回原始文本
    return markdownText
  }
}

/**
 * 检查文本是否包含markdown语法
 * @param text - 要检查的文本
 * @returns 是否包含markdown语法
 */
export function containsMarkdown(text: string): boolean {
  // 检查常见的markdown语法
  const markdownPatterns = [
    /\*\*.*?\*\*/, // 粗体
    /\*.*?\*/, // 斜体
    /^#{1,6}\s/m, // 标题
    /^\d+\.\s/m, // 有序列表
    /^[-*+]\s/m, // 无序列表
    /`.*?`/, // 行内代码
    /```[\s\S]*?```/, // 代码块
    /\[.*?\]\(.*?\)/, // 链接
    /!\[.*?\]\(.*?\)/, // 图片
  ]
  
  return markdownPatterns.some(pattern => pattern.test(text))
}
