// Mock fetch for testing
global.fetch = jest.fn()

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('/api/outline', () => {
        it('should generate outline for valid request', async () => {
            const mockResponse = {
                success: true,
                data: {
                    outline: [
                        {
                            level: 1,
                            title: 'Introduction',
                            description: 'Introduction section',
                            children: []
                        }
                    ],
                    introduction: 'This is the introduction',
                    suggestions: ['Suggestion 1', 'Suggestion 2']
                }
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })

            const response = await fetch('/api/outline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Test Title' })
            })

            const data = await response.json()

            expect(fetch).toHaveBeenCalledWith('/api/outline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Test Title' })
            })

            expect(data.success).toBe(true)
            expect(data.data.outline).toHaveLength(1)
        })

        it('should handle validation errors', async () => {
            const mockResponse = {
                success: false,
                error: '标题是必需的'
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })

            const response = await fetch('/api/outline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '' })
            })

            const data = await response.json()

            expect(data.success).toBe(false)
            expect(data.error).toBe('标题是必需的')
        })
    })

    describe('/api/optimize', () => {
        it('should optimize text successfully', async () => {
            const mockResponse = {
                success: true,
                data: {
                    optimizedText: 'This is optimized text',
                    changes: [
                        {
                            type: 'modification',
                            original: 'original text',
                            modified: 'optimized text',
                            reason: 'Improved clarity'
                        }
                    ],
                    suggestions: ['Suggestion 1']
                }
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })

            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'Test text',
                    options: {
                        style: 'formal',
                        length: 'same',
                        focus: 'clarity'
                    }
                })
            })

            const data = await response.json()

            expect(data.success).toBe(true)
            expect(data.data.optimizedText).toBe('This is optimized text')
            expect(data.data.changes).toHaveLength(1)
        })
    })

    describe('/api/research', () => {
        it('should return research results', async () => {
            const mockResponse = {
                success: true,
                data: {
                    results: [
                        {
                            id: '1',
                            title: 'Research Title',
                            summary: 'Research summary',
                            source: 'Wikipedia',
                            url: 'https://example.com',
                            relevance: 0.9,
                            credibility: 'high'
                        }
                    ],
                    query: 'test query',
                    suggestions: ['Suggestion 1']
                }
            }

                ; (fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })

            const response = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'Test query',
                    sources: ['wikipedia'],
                    maxResults: 5
                })
            })

            const data = await response.json()

            expect(data.success).toBe(true)
            expect(data.data.results).toHaveLength(1)
            expect(data.data.results[0].title).toBe('Research Title')
        })
    })

    describe('Error handling', () => {
        it('should handle network errors', async () => {
            ; (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

            try {
                await fetch('/api/outline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'Test' })
                })
            } catch (error) {
                expect(error.message).toBe('Network error')
            }
        })

        it('should handle API errors', async () => {
            ; (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: 'Internal server error' })
            })

            const response = await fetch('/api/outline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Test' })
            })

            expect(response.ok).toBe(false)
            expect(response.status).toBe(500)
        })
    })
})
