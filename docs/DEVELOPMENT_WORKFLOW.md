# 开发工作流程指南

## 📋 必须遵循的流程

### 每次代码修改后必须执行

1. **更新所有相关文档** ✅
   - 更新CHANGELOG.md：在版本历史开头添加新版本记录
   - 更新SUMMARY.md：在功能迭代记录中添加新版本
   - 更新docs/README.md：更新版本号、日期和内容描述
   - 详细记录功能特性、用户体验、技术实现
   - 使用规范的版本号格式：v0.x.x

2. **提交代码和文档** ✅
   - 将代码变更和文档更新合并到同一个提交
   - 使用规范的commit message格式
   - 包含功能描述、技术细节和文档更新说明
   - 示例：`feat: 添加流式响应功能并更新文档`

3. **推送代码** ✅
   - 推送到GitHub远程仓库
   - 触发Vercel自动部署

4. **打Git Tag** ✅
   - 使用版本号格式：v0.x.x
   - 添加tag描述信息
   - 推送到远程仓库

### 📝 文档更新模板

#### CHANGELOG.md 新版本记录模板

```markdown
### vX.X.X - 功能名称 (YYYY-MM-DD)

#### 🎯 核心功能
- **功能1**: 详细描述
- **功能2**: 详细描述

#### 🎨 用户体验
- **改进1**: 详细描述
- **改进2**: 详细描述

#### 🔧 技术实现
- 技术细节1
- 技术细节2
```

#### SUMMARY.md 功能迭代记录模板

```markdown
### vX.X.X - 功能名称 (YYYY-MM-DD)

#### 🎯 核心功能
- **功能1**: 详细描述
- **功能2**: 详细描述

#### 🎨 用户体验
- **改进1**: 详细描述
- **改进2**: 详细描述

#### 🔧 技术实现
- 技术细节1
- 技术细节2
```

#### docs/README.md 版本信息更新

```markdown
- **版本**: vX.X.X
- **创建日期**: YYYY年MM月DD日
- **最后更新**: YYYY年MM月DD日
- **更新内容**: 简洁的功能描述
```

### ⚠️ 重要提醒

- **每次修改后立即更新文档**，不要等到最后
- **版本号递增**：主版本.次版本.修订版本
- **日期格式统一**：2025-09-17
- **内容保持一致**：CHANGELOG、SUMMARY、README内容要同步
- **详细记录**：功能特性、用户体验、技术实现都要记录
- **合并提交**：代码变更和文档更新必须在同一个提交中

### 📝 提交消息格式规范

#### 基本格式

```text
<type>: <description>

<optional body>

<optional footer>
```

#### 类型说明

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

#### 示例

```bash
# 功能开发 + 文档更新
feat: 添加流式响应功能并更新文档

- 实现Server-Sent Events流式响应
- 解决长文本处理超时问题
- 更新CHANGELOG.md记录v0.2.10
- 更新SUMMARY.md功能迭代记录
- 更新docs/README.md版本信息

# 问题修复 + 文档更新
fix: 修复大纲生成placeholder残留问题并更新文档

- 修复大纲生成后placeholder文本残留
- 确保内容替换完整
- 更新CHANGELOG.md记录v0.2.9
- 更新相关文档
```

### 🔄 完整工作流程

1. 开发功能
2. 测试功能
3. **更新所有相关文档** (CHANGELOG.md, SUMMARY.md, docs/README.md)
4. **提交代码和文档** (合并到同一个提交)
5. 推送代码
6. **打Git Tag**
7. **推送Tag到远程**

### 🏷️ Git Tag 操作指南

#### 创建Tag

```bash
# 创建带注释的tag
git tag -a v0.x.x -m "版本描述信息"

# 示例
git tag -a v0.2.8 -m "修复大纲生成标题删除问题，优化用户体验"
```

#### 推送Tag

```bash
# 推送单个tag
git push origin v0.x.x

# 推送所有tag
git push origin --tags

# 示例
git push origin v0.2.8
```

#### 查看Tag

```bash
# 查看所有tag
git tag

# 查看tag详情
git show v0.x.x
```

#### 版本号规则

- **格式**: v0.x.x
- **主版本号**: 0 (预发布版本)
- **次版本号**: 功能更新、重大改进
- **修订号**: 问题修复、小改进

#### Tag命名规范

- 使用语义化版本号
- 包含简短的功能描述
- 遵循项目命名约定

### 📚 相关文档

- [CHANGELOG.md](./CHANGELOG.md) - 详细版本历史
- [SUMMARY.md](./SUMMARY.md) - 功能迭代总结
- [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) - 文档规范
- [README.md](./README.md) - 文档目录

---

**记住：文档更新是开发流程的重要组成部分，不是可选项！** 📝✨
