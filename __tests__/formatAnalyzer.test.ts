import { FormatAnalyzer, analyzeTextStructure, formatTextForInsertion } from '../utils/formatAnalyzer'

// Mock DOM environment
const mockDocument = {
    createElement: (tag: string) => ({
        innerHTML: '',
        querySelectorAll: () => [],
        tagName: tag.toUpperCase()
    })
}

// @ts-ignore
global.document = mockDocument

describe('FormatAnalyzer', () => {
    describe('analyzeDocument', () => {
        it('should analyze document format correctly', () => {
            const html = `
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
        <p>This is a paragraph</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
        <strong>Bold text</strong>
      `

            const analysis = FormatAnalyzer.analyzeDocument(html)

            expect(analysis.headingStyle).toBe('h2')
            expect(analysis.paragraphStyle).toBe('normal')
            expect(analysis.listStyle).toBe('bullet')
            expect(analysis.emphasisStyle).toBe('bold')
        })

        it('should handle empty document', () => {
            const analysis = FormatAnalyzer.analyzeDocument('')

            expect(analysis.headingStyle).toBe('h2')
            expect(analysis.paragraphStyle).toBe('normal')
            expect(analysis.listStyle).toBe('none')
            expect(analysis.emphasisStyle).toBe('bold')
        })
    })

    describe('formatContent', () => {
        it('should format content according to analysis', () => {
            const analysis = {
                headingStyle: 'h2' as const,
                paragraphStyle: 'normal' as const,
                listStyle: 'bullet' as const,
                emphasisStyle: 'bold' as const,
                spacing: 'normal' as const
            }

            const content = 'Test content'
            const formatted = FormatAnalyzer.formatContent(content, analysis)

            expect(formatted).toContain('<p>')
            expect(formatted).toContain('<strong>')
        })
    })
})

describe('analyzeTextStructure', () => {
    it('should detect list structure', () => {
        const text = `- Item 1
- Item 2
- Item 3`

        const structure = analyzeTextStructure(text)

        expect(structure.isList).toBe(true)
        expect(structure.isNumberedList).toBe(false)
    })

    it('should detect numbered list structure', () => {
        const text = `1. First item
2. Second item
3. Third item`

        const structure = analyzeTextStructure(text)

        expect(structure.isList).toBe(true)
        expect(structure.isNumberedList).toBe(true)
    })

    it('should detect code structure', () => {
        const text = `
      function test() {
        return 'hello'
      }
    `

        const structure = analyzeTextStructure(text)

        expect(structure.isCode).toBe(true)
    })

    it('should detect quote structure', () => {
        const text = `> This is a quote
> with multiple lines`

        const structure = analyzeTextStructure(text)

        expect(structure.isQuote).toBe(true)
    })
})

describe('formatTextForInsertion', () => {
    it('should format list correctly', () => {
        const text = `- Item 1
- Item 2`

        const analysis = {
            headingStyle: 'h2' as const,
            paragraphStyle: 'normal' as const,
            listStyle: 'bullet' as const,
            emphasisStyle: 'bold' as const,
            spacing: 'normal' as const
        }

        const formatted = formatTextForInsertion(text, analysis)

        expect(formatted).toContain('<ul>')
        expect(formatted).toContain('<li>')
    })

    it('should format code correctly', () => {
        const text = `
      function test() {
        return 'hello'
      }
    `

        const analysis = {
            headingStyle: 'h2' as const,
            paragraphStyle: 'normal' as const,
            listStyle: 'bullet' as const,
            emphasisStyle: 'bold' as const,
            spacing: 'normal' as const
        }

        const formatted = formatTextForInsertion(text, analysis)

        expect(formatted).toContain('<pre>')
        expect(formatted).toContain('<code>')
    })
})
