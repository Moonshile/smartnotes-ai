# SmartNotes.ai 技术设计文档 (TDD)

## 文档信息

- **版本**: v1.0
- **创建日期**: 2025年9月
- **产品名称**: SmartNotes.ai
- **升级版本**: v2.0
- **技术栈**: Next.js 14, TypeScript, Tiptap, OpenAI API

## 1. 系统架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Editor Component  │  Chat Sidebar  │  New Feature Panels   │
│  - Tiptap Editor   │  - AI Chat     │  - Outline Generator  │
│  - Toolbar         │  - Suggestions │  - Text Optimizer     │
│  - Slash Commands  │  - Insert Btn  │  - Research Panel     │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
├─────────────────────────────────────────────────────────────┤
│  /api/chat        │  /api/ai        │  /api/ai/suggest     │
│  - Streaming      │  - Slash Cmds   │  - Text Comments     │
│  - Context Aware  │  - Text Ops     │  - AI Suggestions    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    New API Endpoints                        │
├─────────────────────────────────────────────────────────────┤
│  /api/outline     │  /api/optimize  │  /api/research       │
│  - Title Analysis │  - Text Improve │  - Content Search    │
│  - Structure Gen  │  - Style Adjust │  - Source Citation   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      External Services                      │
├─────────────────────────────────────────────────────────────┤
│  OpenAI API       │  Web Search     │  Knowledge Base      │
│  - GPT-4o-mini    │  - Bing/Google  │  - Wikipedia         │
│  - Text Processing│  - News APIs    │  - Academic DBs      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈升级

- **前端**: Next.js 14 + TypeScript + Tiptap
- **状态管理**: Zustand (保持现有)
- **样式**: Tailwind CSS (保持现有)
- **AI集成**: OpenAI API + 新增搜索API
- **部署平台**: Vercel (无状态函数限制)
- **新增依赖**:
  - `@tiptap/extension-placeholder` (已存在)
  - `axios` (HTTP客户端)
  - `cheerio` (HTML解析)
  - `date-fns` (日期处理)

## 2. 核心功能技术设计

### 2.1 智能大纲生成功能

#### 2.1.1 组件设计

```typescript
// components/OutlineGenerator.tsx
interface OutlineGeneratorProps {
  onInsert: (content: string) => void
  onClose: () => void
}

interface OutlineResult {
  title: string
  outline: OutlineItem[]
  introduction: string
}

interface OutlineItem {
  level: number
  title: string
  description: string
  children?: OutlineItem[]
}
```

#### 2.1.2 API设计

```typescript
// app/api/outline/route.ts
export const runtime = 'edge'

type OutlineRequest = {
  title: string
  type?: 'article' | 'report' | 'essay' | 'blog'
  length?: 'short' | 'medium' | 'long'
}

type OutlineResponse = {
  outline: OutlineItem[]
  introduction: string
  suggestions: string[]
}
```

#### 2.1.3 实现逻辑

1. **标题分析**: 使用GPT-4o-mini分析标题，确定文章类型和主题
2. **大纲生成**: 基于标题和类型生成层次化大纲
3. **开头生成**: 根据大纲生成文章开头段落
4. **格式转换**: 将结果转换为HTML格式插入编辑器

#### 2.1.4 提示词设计

```typescript
const outlinePrompt = `
你是一个专业的写作助手。请根据给定的标题生成文章大纲和开头。

标题: {title}
文章类型: {type}
长度: {length}

请生成:
1. 3-5级层次化大纲，每个章节包含标题和简要描述
2. 200-300字的文章开头段落
3. 写作建议

输出格式为JSON:
{
  "outline": [
    {
      "level": 1,
      "title": "章节标题",
      "description": "章节描述",
      "children": [...]
    }
  ],
  "introduction": "开头段落",
  "suggestions": ["建议1", "建议2"]
}
`
```

### 2.2 文本内容优化功能

#### 2.2.1 组件设计

```typescript
// components/TextOptimizer.tsx
interface TextOptimizerProps {
  selectedText: string
  onOptimize: (optimizedText: string) => void
  onClose: () => void
}

interface OptimizationOptions {
  style: 'formal' | 'casual' | 'academic' | 'creative'
  length: 'shorter' | 'same' | 'longer'
  focus: 'clarity' | 'conciseness' | 'engagement' | 'professionalism'
}
```

#### 2.2.2 API设计

```typescript
// app/api/optimize/route.ts
export const runtime = 'edge'

type OptimizeRequest = {
  text: string
  options: OptimizationOptions
  context?: string
}

type OptimizeResponse = {
  optimizedText: string
  changes: TextChange[]
  suggestions: string[]
}

interface TextChange {
  type: 'addition' | 'deletion' | 'modification'
  original: string
  modified: string
  reason: string
}
```

#### 2.2.3 实现逻辑

1. **文本分析**: 分析选中文本的结构、语气、风格
2. **优化策略**: 根据用户选项确定优化方向
3. **内容优化**: 使用GPT-4o-mini进行文本优化
4. **变更追踪**: 记录具体的修改内容
5. **结果展示**: 提供优化前后的对比

### 2.3 相关资料检索功能

#### 2.3.1 组件设计

```typescript
// components/ResearchPanel.tsx
interface ResearchPanelProps {
  selectedText: string
  onInsert: (content: string) => void
  onClose: () => void
}

interface ResearchResult {
  id: string
  title: string
  summary: string
  source: string
  url: string
  relevance: number
  credibility: 'high' | 'medium' | 'low'
}
```

#### 2.3.2 API设计

```typescript
// app/api/research/route.ts
export const runtime = 'edge'

type ResearchRequest = {
  text: string
  maxResults?: number
  sources?: ('web' | 'wikipedia' | 'academic')[]
}

type ResearchResponse = {
  results: ResearchResult[]
  query: string
  suggestions: string[]
}
```

#### 2.3.3 实现逻辑

1. **查询生成**: 从选中文本提取关键词，生成搜索查询
2. **多源检索**: 并行搜索多个数据源
3. **结果处理**: 解析和清理搜索结果
4. **相关性排序**: 使用AI评估结果相关性
5. **可信度评估**: 评估信息来源的可信度

#### 2.3.4 搜索策略

```typescript
const searchStrategies = {
  web: {
    api: 'Bing Search API',
    maxResults: 10,
    filters: ['site:edu', 'site:org', 'site:gov']
  },
  wikipedia: {
    api: 'Wikipedia API',
    maxResults: 5,
    language: 'zh'
  },
  academic: {
    api: 'Google Scholar API',
    maxResults: 5,
    yearRange: '2020-2025'
  }
}
```

### 2.4 智能文本插入功能

#### 2.4.1 组件设计

```typescript
// components/SmartInserter.tsx
interface SmartInserterProps {
  content: string
  onInsert: (formattedContent: string) => void
  onClose: () => void
}

interface FormatAnalysis {
  headingStyle: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  paragraphStyle: 'normal' | 'quote' | 'code'
  listStyle: 'bullet' | 'numbered' | 'none'
  emphasisStyle: 'bold' | 'italic' | 'underline'
}
```

#### 2.4.2 格式分析算法

```typescript
// utils/formatAnalyzer.ts
class FormatAnalyzer {
  analyzeDocument(html: string): FormatAnalysis {
    // 分析文档的格式特征
    const headingLevels = this.extractHeadingLevels(html)
    const paragraphStyles = this.extractParagraphStyles(html)
    const listStyles = this.extractListStyles(html)
    const emphasisStyles = this.extractEmphasisStyles(html)

    return {
      headingStyle: this.determineHeadingStyle(headingLevels),
      paragraphStyle: this.determineParagraphStyle(paragraphStyles),
      listStyle: this.determineListStyle(listStyles),
      emphasisStyle: this.determineEmphasisStyle(emphasisStyles)
    }
  }

  formatContent(content: string, analysis: FormatAnalysis): string {
    // 根据分析结果格式化内容
    return this.applyFormatting(content, analysis)
  }
}
```

#### 2.4.3 实现逻辑

1. **格式分析**: 分析当前文档的格式特征
2. **内容解析**: 解析要插入的内容结构
3. **格式匹配**: 将内容格式化为匹配的样式
4. **智能插入**: 在合适的位置插入格式化内容

## 3. Vercel部署考虑

### 3.1 无状态函数限制

由于Vercel只支持无状态函数，所有新功能必须遵循以下原则：

#### 3.1.1 无状态设计

- 所有API路由都是无状态的
- 不依赖服务器端内存存储
- 不维护会话状态
- 每次请求都是独立的

#### 3.1.2 数据存储策略

```typescript
// 所有数据存储都在客户端
interface ClientStorage {
  // 现有存储
  'doc-html': string
  'user-name': string
  'room': string

  // 新增存储 - 全部使用localStorage
  'outline-history': OutlineHistory[]
  'optimization-history': OptimizationHistory[]
  'research-cache': ResearchCache[]
  'format-preferences': FormatPreferences
}
```

#### 3.1.3 API设计原则

```typescript
// 所有API都是纯函数
export async function POST(req: Request) {
  // 1. 解析请求参数
  const body = await req.json()

  // 2. 调用外部API (OpenAI, 搜索等)
  const result = await callExternalAPI(body)

  // 3. 返回结果 (无状态)
  return Response.json(result)
}
```

### 3.2 缓存策略调整

由于无法使用服务器端缓存，采用以下策略：

#### 3.2.1 客户端缓存

```typescript
// utils/clientCache.ts
class ClientCache {
  private static cache = new Map<string, { data: any; expires: number }>()

  static set(key: string, data: any, ttl: number = 300000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  static get(key: string) {
    const item = this.cache.get(key)
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    return item.data
  }
}
```

#### 3.2.2 本地存储缓存

```typescript
// utils/localStorageCache.ts
export const localStorageCache = {
  set: (key: string, data: any, ttl: number = 300000) => {
    const item = {
      data,
      expires: Date.now() + ttl
    }
    localStorage.setItem(key, JSON.stringify(item))
  },

  get: (key: string) => {
    const item = localStorage.getItem(key)
    if (!item) return null

    const parsed = JSON.parse(item)
    if (Date.now() > parsed.expires) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  }
}
```

### 3.3 搜索API集成

由于Vercel限制，搜索功能采用以下方案：

#### 3.3.1 客户端搜索

```typescript
// 使用客户端搜索API
const searchStrategies = {
  web: {
    api: 'Bing Search API (客户端调用)',
    maxResults: 10,
    cors: '需要代理或CORS配置'
  },
  wikipedia: {
    api: 'Wikipedia API (直接调用)',
    maxResults: 5,
    cors: '支持CORS'
  }
}
```

#### 3.3.2 代理API设计

```typescript
// app/api/research/route.ts
export const runtime = 'edge'

export async function POST(req: Request) {
  const { text, sources } = await req.json()

  // 并行调用多个搜索源
  const searchPromises = sources.map(source =>
    searchSource(source, text)
  )

  const results = await Promise.allSettled(searchPromises)

  return Response.json({
    results: results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .flat()
  })
}
```

## 4. 数据库设计

### 4.1 本地存储扩展

```typescript
// types/storage.ts
interface SmartNotesStorage {
  // 现有存储
  'doc-html': string
  'user-name': string
  'room': string

  // 新增存储
  'outline-history': OutlineHistory[]
  'optimization-history': OptimizationHistory[]
  'research-cache': ResearchCache[]
  'format-preferences': FormatPreferences
}

interface OutlineHistory {
  id: string
  title: string
  outline: OutlineItem[]
  createdAt: Date
}

interface OptimizationHistory {
  id: string
  originalText: string
  optimizedText: string
  options: OptimizationOptions
  createdAt: Date
}

interface ResearchCache {
  id: string
  query: string
  results: ResearchResult[]
  createdAt: Date
  expiresAt: Date
}
```

## 4. 状态管理设计

### 4.1 Zustand Store扩展

```typescript
// stores/smartNotesStore.ts
interface SmartNotesState {
  // 现有状态
  doc: string
  messages: Message[]

  // 新增状态
  outlineGenerator: {
    isOpen: boolean
    isLoading: boolean
    result: OutlineResult | null
  }

  textOptimizer: {
    isOpen: boolean
    isLoading: boolean
    selectedText: string
    result: OptimizeResponse | null
  }

  researchPanel: {
    isOpen: boolean
    isLoading: boolean
    selectedText: string
    results: ResearchResult[]
  }

  smartInserter: {
    isOpen: boolean
    content: string
    formatAnalysis: FormatAnalysis | null
  }
}

const useSmartNotesStore = create<SmartNotesState>((set, get) => ({
  // 现有状态和方法
  doc: '',
  messages: [],

  // 新增状态和方法
  outlineGenerator: {
    isOpen: false,
    isLoading: false,
    result: null
  },

  // 新增方法
  openOutlineGenerator: () => set(state => ({
    outlineGenerator: { ...state.outlineGenerator, isOpen: true }
  })),

  generateOutline: async (title: string) => {
    set(state => ({
      outlineGenerator: { ...state.outlineGenerator, isLoading: true }
    }))

    try {
      const response = await fetch('/api/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })

      const result = await response.json()

      set(state => ({
        outlineGenerator: {
          ...state.outlineGenerator,
          isLoading: false,
          result
        }
      }))
    } catch (error) {
      set(state => ({
        outlineGenerator: { ...state.outlineGenerator, isLoading: false }
      }))
    }
  }
}))
```

## 5. 组件架构设计

### 5.1 组件层次结构

```
App
├── Layout
│   ├── Header
│   └── Main
│       ├── Editor
│       │   ├── Toolbar
│       │   │   ├── OutlineButton
│       │   │   ├── OptimizeButton
│       │   │   └── ResearchButton
│       │   ├── EditorContent
│       │   └── ContextMenu
│       ├── ChatSidebar
│       └── FeaturePanels
│           ├── OutlineGenerator
│           ├── TextOptimizer
│           ├── ResearchPanel
│           └── SmartInserter
```

### 5.2 组件通信

```typescript
// 组件间通信模式
interface ComponentCommunication {
  // 事件驱动
  events: {
    'text-selected': (text: string) => void
    'optimize-requested': (text: string) => void
    'research-requested': (text: string) => void
    'insert-requested': (content: string) => void
  }

  // 状态共享
  sharedState: {
    selectedText: string
    currentFormat: FormatAnalysis
    userPreferences: UserPreferences
  }

  // 方法调用
  methods: {
    insertText: (content: string) => void
    formatText: (content: string) => string
    analyzeFormat: (html: string) => FormatAnalysis
  }
}
```

## 6. API设计规范

### 6.1 统一响应格式

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    requestId: string
    timestamp: number
    processingTime: number
  }
}
```

### 6.2 错误处理

```typescript
// utils/errorHandler.ts
class ApiErrorHandler {
  static handle(error: Error): ApiResponse<never> {
    if (error instanceof OpenAIError) {
      return {
        success: false,
        error: {
          code: 'OPENAI_ERROR',
          message: 'AI服务暂时不可用',
          details: error.message
        }
      }
    }

    if (error instanceof NetworkError) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: '网络连接失败',
          details: error.message
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: '未知错误',
        details: error.message
      }
    }
  }
}
```

### 6.3 请求限流

```typescript
// utils/rateLimiter.ts
class RateLimiter {
  private static limits = {
    '/api/outline': { requests: 10, window: 60000 }, // 1分钟10次
    '/api/optimize': { requests: 20, window: 60000 }, // 1分钟20次
    '/api/research': { requests: 15, window: 60000 }, // 1分钟15次
  }

  static async checkLimit(endpoint: string): Promise<boolean> {
    // 实现限流逻辑
  }
}
```

## 7. 性能优化策略

### 7.1 前端优化

```typescript
// 组件懒加载
const OutlineGenerator = lazy(() => import('./OutlineGenerator'))
const TextOptimizer = lazy(() => import('./TextOptimizer'))
const ResearchPanel = lazy(() => import('./ResearchPanel'))

// 防抖处理
const debouncedOptimize = useMemo(
  () => debounce(optimizeText, 300),
  []
)

// 缓存策略
const useApiCache = (key: string, fetcher: () => Promise<any>) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cached = localStorage.getItem(key)
    if (cached) {
      setData(JSON.parse(cached))
    } else {
      setLoading(true)
      fetcher().then(result => {
        setData(result)
        localStorage.setItem(key, JSON.stringify(result))
        setLoading(false)
      })
    }
  }, [key, fetcher])

  return { data, loading }
}
```

### 7.2 后端优化

```typescript
// API响应缓存
const cache = new Map()

export async function POST(req: Request) {
  const body = await req.json()
  const cacheKey = JSON.stringify(body)

  if (cache.has(cacheKey)) {
    return Response.json(cache.get(cacheKey))
  }

  const result = await processRequest(body)
  cache.set(cacheKey, result)

  // 设置缓存过期时间
  setTimeout(() => cache.delete(cacheKey), 300000) // 5分钟

  return Response.json(result)
}
```

## 8. 安全考虑

### 8.1 输入验证

```typescript
// utils/validators.ts
export const validateOutlineRequest = (data: any): OutlineRequest => {
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('标题是必需的')
  }

  if (data.title.length > 200) {
    throw new Error('标题长度不能超过200字符')
  }

  return {
    title: data.title.trim(),
    type: data.type || 'article',
    length: data.length || 'medium'
  }
}
```

### 8.2 内容过滤

```typescript
// utils/contentFilter.ts
export const sanitizeContent = (content: string): string => {
  // 移除潜在的恶意内容
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}
```

## 9. 测试策略

### 9.1 单元测试

```typescript
// __tests__/outlineGenerator.test.ts
describe('OutlineGenerator', () => {
  it('should generate outline for given title', async () => {
    const title = '人工智能的发展趋势'
    const result = await generateOutline(title)

    expect(result.outline).toBeDefined()
    expect(result.outline.length).toBeGreaterThan(0)
    expect(result.introduction).toBeDefined()
  })
})
```

### 9.2 集成测试

```typescript
// __tests__/api/outline.test.ts
describe('/api/outline', () => {
  it('should return outline for valid request', async () => {
    const response = await fetch('/api/outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '测试标题' })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.outline).toBeDefined()
  })
})
```

## 10. 部署配置

### 10.1 环境变量

```bash
# .env.local
OPENAI_API_KEY=sk-...
BING_SEARCH_API_KEY=...
WIKIPEDIA_API_URL=https://en.wikipedia.org/api/rest_v1
GOOGLE_SCHOLAR_API_KEY=...
```

### 10.2 Vercel部署配置

```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "edge"
    }
  },
  "env": {
    "OPENAI_API_KEY": "@openai_api_key",
    "BING_SEARCH_API_KEY": "@bing_search_api_key"
  }
}
```

### 10.3 部署脚本

```bash
#!/bin/bash
# deploy.sh

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Running tests..."
npm run test

echo "Deploying to Vercel..."
vercel --prod

echo "Deployment complete!"
```

## 11. 监控和日志

### 11.1 性能监控

```typescript
// utils/monitoring.ts
export const trackPerformance = (operation: string, duration: number) => {
  console.log(`Performance: ${operation} took ${duration}ms`)

  // 发送到监控服务
  if (duration > 5000) {
    console.warn(`Slow operation: ${operation}`)
  }
}
```

### 11.2 错误日志

```typescript
// utils/logger.ts
export const logger = {
  error: (message: string, error: Error) => {
    console.error(`[ERROR] ${message}`, error)
    // 发送到错误追踪服务
  },

  info: (message: string) => {
    console.log(`[INFO] ${message}`)
  }
}
```

## 12. 总结

本技术设计文档详细规划了SmartNotes.ai v2.0的四个核心功能的技术实现方案。通过模块化设计、性能优化、安全考虑和完整的测试策略，确保新功能能够稳定、高效地集成到现有系统中，为用户提供更好的智能写作体验。

关键设计原则：

1. **模块化**: 每个功能独立开发，便于维护和扩展
2. **性能优先**: 通过缓存、懒加载等技术优化用户体验
3. **安全可靠**: 输入验证、内容过滤、错误处理确保系统稳定
4. **用户友好**: 直观的界面设计和流畅的交互体验
5. **可扩展性**: 为未来功能扩展预留接口和架构空间
