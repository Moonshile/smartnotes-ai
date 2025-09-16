interface FormatAnalysis {
    headingStyle: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    paragraphStyle: 'normal' | 'quote' | 'code'
    listStyle: 'bullet' | 'numbered' | 'none'
    emphasisStyle: 'bold' | 'italic' | 'underline'
    spacing: 'tight' | 'normal' | 'loose'
}

export class FormatAnalyzer {
    static analyzeDocument(html: string): FormatAnalysis {
        const container = document.createElement('div')
        container.innerHTML = html

        const headingLevels = this.extractHeadingLevels(container)
        const paragraphStyles = this.extractParagraphStyles(container)
        const listStyles = this.extractListStyles(container)
        const emphasisStyles = this.extractEmphasisStyles(container)
        const spacing = this.extractSpacing(container)

        return {
            headingStyle: this.determineHeadingStyle(headingLevels),
            paragraphStyle: this.determineParagraphStyle(paragraphStyles),
            listStyle: this.determineListStyle(listStyles),
            emphasisStyle: this.determineEmphasisStyle(emphasisStyles),
            spacing
        }
    }

    static formatContent(content: string, analysis: FormatAnalysis): string {
        return this.applyFormatting(content, analysis)
    }

    private static extractHeadingLevels(container: HTMLElement): number[] {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
        return Array.from(headings).map(h => {
            const tagName = h.tagName.toLowerCase()
            return parseInt(tagName.substring(1))
        })
    }

    private static extractParagraphStyles(container: HTMLElement): string[] {
        const paragraphs = container.querySelectorAll('p, blockquote, pre')
        return Array.from(paragraphs).map(p => p.tagName.toLowerCase())
    }

    private static extractListStyles(container: HTMLElement): string[] {
        const lists = container.querySelectorAll('ul, ol')
        return Array.from(lists).map(l => l.tagName.toLowerCase())
    }

    private static extractEmphasisStyles(container: HTMLElement): string[] {
        const emphasis = container.querySelectorAll('strong, b, em, i, u')
        return Array.from(emphasis).map(e => e.tagName.toLowerCase())
    }

    private static extractSpacing(container: HTMLElement): 'tight' | 'normal' | 'loose' {
        const paragraphs = container.querySelectorAll('p')
        if (paragraphs.length === 0) return 'normal'

        const lineHeights = Array.from(paragraphs).map(p => {
            const computed = window.getComputedStyle(p)
            return parseFloat(computed.lineHeight)
        })

        const avgLineHeight = lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length

        if (avgLineHeight < 1.3) return 'tight'
        if (avgLineHeight > 1.7) return 'loose'
        return 'normal'
    }

    private static determineHeadingStyle(levels: number[]): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
        if (levels.length === 0) return 'h2'

        const mostCommon = this.getMostCommon(levels)
        const maxLevel = Math.max(...levels)

        // 如果最高级别是h1，使用h2作为默认
        if (maxLevel === 1) return 'h2'

        // 使用最常见的级别，但不超过h6
        return `h${Math.min(mostCommon, 6)}` as any
    }

    private static determineParagraphStyle(styles: string[]): 'normal' | 'quote' | 'code' {
        if (styles.includes('blockquote')) return 'quote'
        if (styles.includes('pre')) return 'code'
        return 'normal'
    }

    private static determineListStyle(styles: string[]): 'bullet' | 'numbered' | 'none' {
        if (styles.includes('ul')) return 'bullet'
        if (styles.includes('ol')) return 'numbered'
        return 'none'
    }

    private static determineEmphasisStyle(styles: string[]): 'bold' | 'italic' | 'underline' {
        if (styles.includes('strong') || styles.includes('b')) return 'bold'
        if (styles.includes('em') || styles.includes('i')) return 'italic'
        if (styles.includes('u')) return 'underline'
        return 'bold'
    }

    private static getMostCommon(arr: number[]): number {
        const counts: { [key: number]: number } = {}
        arr.forEach(num => {
            counts[num] = (counts[num] || 0) + 1
        })

        const keys = Object.keys(counts).map(k => parseInt(k))
        return keys.reduce((a, b) => counts[a] > counts[b] ? a : b)
    }

    private static applyFormatting(content: string, analysis: FormatAnalysis): string {
        let formatted = content

        // 应用段落格式
        if (analysis.paragraphStyle === 'quote') {
            formatted = `<blockquote>${formatted}</blockquote>`
        } else if (analysis.paragraphStyle === 'code') {
            formatted = `<pre><code>${formatted}</code></pre>`
        } else {
            formatted = `<p>${formatted}</p>`
        }

        // 应用强调格式
        if (analysis.emphasisStyle === 'bold') {
            formatted = `<strong>${formatted}</strong>`
        } else if (analysis.emphasisStyle === 'italic') {
            formatted = `<em>${formatted}</em>`
        } else if (analysis.emphasisStyle === 'underline') {
            formatted = `<u>${formatted}</u>`
        }

        // 应用间距
        if (analysis.spacing === 'tight') {
            formatted = formatted.replace(/<p>/g, '<p style="line-height: 1.2; margin: 0.5em 0;">')
        } else if (analysis.spacing === 'loose') {
            formatted = formatted.replace(/<p>/g, '<p style="line-height: 1.8; margin: 1em 0;">')
        }

        return formatted
    }
}

export function analyzeTextStructure(text: string): {
    isList: boolean
    isNumberedList: boolean
    isCode: boolean
    isQuote: boolean
} {
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length === 0) {
        return { isList: false, isNumberedList: false, isCode: false, isQuote: false }
    }

    // 检查是否为列表
    const listItems = lines.filter(line =>
        /^[-*•]\s+/.test(line) || /^\d+[\.)]\s+/.test(line)
    )

    const isList = listItems.length >= 2
    const isNumberedList = isList && lines.some(line => /^\d+[\.)]\s+/.test(line))

    // 检查是否为代码
    const isCode = lines.some(line =>
        line.startsWith('```') ||
        line.includes('function') ||
        line.includes('const ') ||
        line.includes('var ') ||
        line.includes('let ')
    )

    // 检查是否为引用
    const isQuote = lines.some(line => line.startsWith('>')) ||
        lines.every(line => line.startsWith('"') && line.endsWith('"'))

    return { isList, isNumberedList, isCode, isQuote }
}

export function formatTextForInsertion(text: string, analysis: FormatAnalysis): string {
    const structure = analyzeTextStructure(text)

    if (structure.isCode) {
        return `<pre><code>${text}</code></pre>`
    }

    if (structure.isQuote) {
        return `<blockquote><p>${text}</p></blockquote>`
    }

    if (structure.isList) {
        if (structure.isNumberedList) {
            const items = text.split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^\d+[\.)]\s+/, ''))
                .map(item => `<li>${item}</li>`)
                .join('')
            return `<ol>${items}</ol>`
        } else {
            const items = text.split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^[-*•]\s+/, ''))
                .map(item => `<li>${item}</li>`)
                .join('')
            return `<ul>${items}</ul>`
        }
    }

    // 普通文本，应用格式分析结果
    return FormatAnalyzer.formatContent(text, analysis)
}
