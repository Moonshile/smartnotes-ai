# SmartNotes.ai 文档目录

本目录包含SmartNotes.ai产品升级的完整文档。

## 文档结构

### 📋 [PRD.md](./PRD.md) - 产品需求文档

**产品需求文档 (Product Requirements Document)**

包含以下内容：

- 产品概述和升级目标
- 四个核心功能的详细需求规格
- 用户体验设计
- 技术约束和成功指标
- 风险评估和实施计划

**核心功能**：

1. 智能大纲生成 - 根据标题生成文章大纲和开头
2. 文本内容优化 - 选中文本后提供优化建议
3. 相关资料检索 - 选中文本后检索相关资料
4. 智能文本插入 - 格式感知的文本插入功能

### 🔧 [TDD.md](./TDD.md) - 技术设计文档

**技术设计文档 (Technical Design Document)**

包含以下内容：

- 系统架构设计
- 核心功能技术实现方案
- 数据库设计和状态管理
- API设计和组件架构
- 性能优化和安全考虑
- 测试策略和部署配置

**技术栈**：

- 前端：Next.js 14 + TypeScript + Tiptap
- 后端：Next.js API Routes + Edge Runtime
- AI：OpenAI GPT-4o-mini
- 搜索：Bing Search API + Wikipedia API
- 状态管理：Zustand
- 样式：Tailwind CSS

### 🚀 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Vercel部署指南

**Vercel部署指南 (Vercel Deployment Guide)**

包含以下内容：

- Vercel部署优势和配置
- 无状态函数设计原则
- 新功能API实现示例
- 性能优化和错误处理
- 部署步骤和监控调试

**部署特点**：

- 零配置部署
- 无状态函数设计
- Edge Runtime优化
- 客户端缓存策略

## 快速开始

### 1. 了解产品需求

阅读 [PRD.md](./PRD.md) 了解产品升级的详细需求和功能规格。

### 2. 理解技术实现

阅读 [TDD.md](./TDD.md) 了解技术架构和实现方案。

### 3. 部署配置

阅读 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) 了解Vercel部署配置和无状态函数设计。

### 4. 开发实施

根据技术设计文档进行功能开发和集成。

## 文档更新

- **版本**: v1.0
- **创建日期**: 2024年12月
- **最后更新**: 2024年12月

## 相关链接

- [项目根目录](../README.md) - 项目基础文档
- [GitHub仓库](https://github.com/your-username/smartnotes-ai) - 源代码仓库
- [在线演示](https://smartnotes-ai.vercel.app) - 在线演示地址

## 贡献指南

如需更新文档，请：

1. 确保文档内容准确完整
2. 保持格式一致性
3. 更新版本号和日期
4. 提交Pull Request

## 联系方式

如有问题或建议，请联系：

- 产品经理：<product@smartnotes.ai>
- 技术负责人：<tech@smartnotes.ai>
