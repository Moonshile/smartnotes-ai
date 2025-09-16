import { ClientCache, localStorageCache } from '../utils/clientCache'

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
}

// @ts-ignore
global.localStorage = mockLocalStorage

describe('ClientCache', () => {
    beforeEach(() => {
        ClientCache.clear()
        jest.clearAllMocks()
    })

    describe('set and get', () => {
        it('should store and retrieve data', () => {
            const key = 'test-key'
            const data = { message: 'test data' }

            ClientCache.set(key, data)
            const retrieved = ClientCache.get(key)

            expect(retrieved).toEqual(data)
        })

        it('should return null for non-existent key', () => {
            const retrieved = ClientCache.get('non-existent')
            expect(retrieved).toBeNull()
        })
    })

    describe('has', () => {
        it('should return true for existing key', () => {
            const key = 'test-key'
            const data = { message: 'test data' }

            ClientCache.set(key, data)
            expect(ClientCache.has(key)).toBe(true)
        })

        it('should return false for non-existent key', () => {
            expect(ClientCache.has('non-existent')).toBe(false)
        })
    })

    describe('delete', () => {
        it('should delete existing key', () => {
            const key = 'test-key'
            const data = { message: 'test data' }

            ClientCache.set(key, data)
            expect(ClientCache.has(key)).toBe(true)

            ClientCache.delete(key)
            expect(ClientCache.has(key)).toBe(false)
        })
    })

    describe('clear', () => {
        it('should clear all data', () => {
            ClientCache.set('key1', 'data1')
            ClientCache.set('key2', 'data2')

            expect(ClientCache.size()).toBe(2)

            ClientCache.clear()
            expect(ClientCache.size()).toBe(0)
        })
    })
})

describe('localStorageCache', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('basic functionality', () => {
        it('should handle localStorage operations', () => {
            const key = 'test-key-1'
            const data = { message: 'test data' }

            // Test set operation
            localStorageCache.set(key, data)

            // Test get operation with mock data
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                data,
                expires: Date.now() + 300000
            }))

            const retrieved = localStorageCache.get(key)
            expect(retrieved).toEqual(data)
        })

        it('should return null when localStorage is empty', () => {
            mockLocalStorage.getItem.mockReturnValue(null)

            const retrieved = localStorageCache.get('test-key-2')
            expect(retrieved).toBeNull()
        })
    })
})