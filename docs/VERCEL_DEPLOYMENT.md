# SmartNotes.ai Vercel部署指南

## 概述

本文档详细说明如何将SmartNotes.ai v2.0部署到Vercel平台，包括无状态函数的设计原则和部署配置。

## Vercel部署优势

### 1. 零配置部署

- 自动检测Next.js项目
- 自动构建和部署
- 支持Edge Runtime
- 全球CDN分发

### 2. 无状态函数支持

- 所有API路由都是无状态函数
- 自动扩缩容
- 按需计费
- 冷启动优化

### 3. 性能优化

- Edge Runtime提供更快的响应
- 全球边缘节点
- 自动HTTPS
- 图片优化

## 无状态设计原则

### 1. API设计

```typescript
// ✅ 正确的无状态API设计
export async function POST(req: Request) {
  // 1. 解析请求参数
  const body = await req.json()

  // 2. 调用外部API
  const result = await callExternalAPI(body)

  // 3. 返回结果
  return Response.json(result)
}

// ❌ 错误的有状态设计
let cache = new Map() // 不能在API路由中维护状态
export async function POST(req: Request) {
  // 这种设计在Vercel中不可行
}
```

### 2. 数据存储策略

```typescript
// 所有数据存储都在客户端
interface ClientStorage {
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
```

### 3. 缓存实现

```typescript
// 客户端内存缓存
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

// localStorage缓存
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

## 部署配置

### 1. vercel.json配置

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "edge"
    }
  },
  "env": {
    "OPENAI_API_KEY": "@openai_api_key",
    "BING_SEARCH_API_KEY": "@bing_search_api_key",
    "WIKIPEDIA_API_URL": "https://en.wikipedia.org/api/rest_v1"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

### 2. 环境变量设置

```bash
# 在Vercel Dashboard中设置以下环境变量
OPENAI_API_KEY=sk-...
BING_SEARCH_API_KEY=...
WIKIPEDIA_API_URL=https://en.wikipedia.org/api/rest_v1
GOOGLE_SCHOLAR_API_KEY=...
```

### 3. package.json脚本

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "deploy": "vercel --prod"
  }
}
```

## 新功能API设计

### 1. 大纲生成API

```typescript
// app/api/outline/route.ts
export const runtime = 'edge'

type OutlineRequest = {
  title: string
  type?: 'article' | 'report' | 'essay' | 'blog'
  length?: 'short' | 'medium' | 'long'
}

export async function POST(req: Request) {
  try {
    const { title, type = 'article', length = 'medium' }: OutlineRequest = await req.json()

    // 验证输入
    if (!title || title.length > 200) {
      return Response.json({ error: 'Invalid title' }, { status: 400 })
    }

    // 调用OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的写作助手...'
          },
          {
            role: 'user',
            content: `请为标题"${title}"生成文章大纲...`
          }
        ],
        temperature: 0.2
      })
    })

    const data = await response.json()
    return Response.json({
      success: true,
      data: data.choices[0].message.content
    })

  } catch (error) {
    return Response.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

### 2. 文本优化API

```typescript
// app/api/optimize/route.ts
export const runtime = 'edge'

type OptimizeRequest = {
  text: string
  options: {
    style: 'formal' | 'casual' | 'academic' | 'creative'
    length: 'shorter' | 'same' | 'longer'
    focus: 'clarity' | 'conciseness' | 'engagement' | 'professionalism'
  }
}

export async function POST(req: Request) {
  try {
    const { text, options }: OptimizeRequest = await req.json()

    // 验证输入
    if (!text || text.length > 10000) {
      return Response.json({ error: 'Invalid text' }, { status: 400 })
    }

    // 调用OpenAI API进行文本优化
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的文本优化助手。请根据以下要求优化文本：风格=${options.style}, 长度=${options.length}, 重点=${options.focus}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.2
      })
    })

    const data = await response.json()
    return Response.json({
      success: true,
      data: data.choices[0].message.content
    })

  } catch (error) {
    return Response.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

### 3. 资料检索API

```typescript
// app/api/research/route.ts
export const runtime = 'edge'

type ResearchRequest = {
  text: string
  sources?: ('web' | 'wikipedia' | 'academic')[]
  maxResults?: number
}

export async function POST(req: Request) {
  try {
    const { text, sources = ['wikipedia'], maxResults = 5 }: ResearchRequest = await req.json()

    // 验证输入
    if (!text || text.length > 1000) {
      return Response.json({ error: 'Invalid text' }, { status: 400 })
    }

    // 并行搜索多个源
    const searchPromises = sources.map(source => searchSource(source, text, maxResults))
    const results = await Promise.allSettled(searchPromises)

    const successfulResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .flat()

    return Response.json({
      success: true,
      data: successfulResults
    })

  } catch (error) {
    return Response.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function searchSource(source: string, text: string, maxResults: number) {
  switch (source) {
    case 'wikipedia':
      return await searchWikipedia(text, maxResults)
    case 'web':
      return await searchWeb(text, maxResults)
    default:
      return []
  }
}
```

## 部署步骤

### 1. 自动部署（推荐）

项目已配置GitHub集成，每次推送到main分支会自动触发Vercel构建和部署：

```bash
# 提交更改
git add .
git commit -m "feat: 新功能描述"
git push origin main

# Vercel会自动检测到推送并开始构建部署
# 无需手动操作，等待几分钟即可看到部署结果
# 部署完成后会收到邮件通知
```

**优势：**
- 零配置，推送即部署
- 自动构建和测试
- 支持预览环境
- 自动HTTPS和CDN

### 2. 手动部署

如果需要手动部署，可以使用Vercel CLI：

```bash
# 安装Vercel CLI
npm install -g vercel

# 登录Vercel
vercel login

# 开发环境部署
vercel

# 生产环境部署
vercel --prod
```

### 3. 项目结构

```bash
# 确保项目结构正确
smartnotes-ai/
├── app/
│   ├── api/
│   │   ├── outline/
│   │   ├── text-process/
│   │   └── research/
│   └── ...
├── components/
├── docs/
└── vercel.json
```

### 4. 环境变量设置

在Vercel Dashboard中设置以下环境变量：

- `OPENAI_API_KEY` - OpenAI API密钥
- `BING_SEARCH_API_KEY` - Bing搜索API密钥（可选）
- `WIKIPEDIA_API_URL` - Wikipedia API地址

## 性能优化

### 1. Edge Runtime优化

```typescript
// 使用Edge Runtime提高性能
export const runtime = 'edge'

// 优化函数大小
export const config = {
  maxDuration: 30, // 30秒超时
}
```

### 2. 客户端缓存

```typescript
// 实现智能缓存策略
const useApiCache = (key: string, fetcher: () => Promise<any>, ttl = 300000) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cached = localStorageCache.get(key)
    if (cached) {
      setData(cached)
    } else {
      setLoading(true)
      fetcher().then(result => {
        setData(result)
        localStorageCache.set(key, result, ttl)
        setLoading(false)
      })
    }
  }, [key, fetcher, ttl])

  return { data, loading }
}
```

### 3. 错误处理

```typescript
// 统一的错误处理
export const handleApiError = (error: Error) => {
  console.error('API Error:', error)

  if (error.message.includes('rate limit')) {
    return { error: '请求过于频繁，请稍后再试' }
  }

  if (error.message.includes('network')) {
    return { error: '网络连接失败，请检查网络' }
  }

  return { error: '服务暂时不可用，请稍后再试' }
}
```

## 监控和调试

### 1. Vercel Analytics

```typescript
// 启用Vercel Analytics
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. 错误监控

```typescript
// 客户端错误监控
export const logError = (error: Error, context: string) => {
  console.error(`[${context}]`, error)

  // 发送到错误监控服务
  if (typeof window !== 'undefined') {
    // 可以集成Sentry等错误监控服务
  }
}
```

## 总结

通过遵循Vercel的无状态函数设计原则，SmartNotes.ai v2.0可以完美部署到Vercel平台，享受零配置部署、全球CDN分发和自动扩缩容的优势。所有新功能都设计为无状态，确保在Vercel上的稳定运行。
