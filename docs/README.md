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

### 📝 [CHANGELOG.md](./CHANGELOG.md) - 功能迭代记录

**功能迭代记录 (Changelog)**

包含以下内容：

- 详细的版本更新历史
- 功能新增和改进记录
- 技术改进和问题修复
- 文档更新和部署优化
- 未来计划和贡献指南

**版本历史**：

- v2.3.0 - 迭代功能增强
- v2.2.0 - 智能文本处理重构
- v2.1.0 - 大纲生成优化
- v2.0.0 - 初始版本发布

### 📊 [SUMMARY.md](./SUMMARY.md) - 项目总结

**项目总结文档 (Project Summary)**

包含以下内容：

- 项目概述和文档结构
- 四个核心功能详细说明
- 技术架构和部署优化
- 功能迭代记录和版本历史
- 实施计划和预期效果

### 📖 [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) - 文档更新指南

**文档更新指南 (Documentation Guide)**

包含以下内容：

- 文档更新流程和规范
- 版本号管理规则
- 提交规范和检查清单
- 团队协作和审查流程
- 工具推荐和最佳实践

**更新要求**：

- 功能开发完成后必须更新文档
- 使用规范的版本号和分类标签
- 遵循统一的格式和结构

## 快速开始

### 1. 了解产品需求

阅读 [PRD.md](./PRD.md) 了解产品升级的详细需求和功能规格。

### 2. 理解技术实现

阅读 [TDD.md](./TDD.md) 了解技术架构和实现方案。

### 3. 查看功能迭代

阅读 [CHANGELOG.md](./CHANGELOG.md) 了解功能迭代历史和版本更新。

### 4. 部署配置

阅读 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) 了解Vercel部署配置和无状态函数设计。

### 5. 项目总结

阅读 [SUMMARY.md](./SUMMARY.md) 了解项目整体情况和实施状态。

### 6. 开发实施

根据技术设计文档进行功能开发和集成。

### 7. 文档维护

阅读 [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) 了解文档更新流程和规范。

## 文档更新

- **版本**: v2.7.0
- **创建日期**: 2025年9月17日
- **最后更新**: 2025年9月17日
- **更新内容**: 添加撤销/重做功能支持，包括键盘快捷键和工具栏按钮

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
