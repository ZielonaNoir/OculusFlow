---
description: React 与 Next.js 性能优化与最佳实践指南，供 AI 在维护、生成或重构 React/Next.js 代码时参考。
---

# React Best Practices Skill

## 何时使用

在以下场景中，请优先阅读 `react-best-practices.md` 并按其中规范执行：

- 维护、生成或重构 React/Next.js 代码
- 优化性能（消除瀑布、减小 bundle、减少重渲染等）
- 编写 Server Actions、API Routes、RSC 相关逻辑
- 处理客户端数据获取、状态管理、事件监听

## 文档结构

`react-best-practices.md` 包含 8 大类 40+ 条规则，按影响程度从 CRITICAL 到 LOW 排序：

1. Eliminating Waterfalls — CRITICAL
2. Bundle Size Optimization — CRITICAL
3. Server-Side Performance — HIGH
4. Client-Side Data Fetching — MEDIUM-HIGH
5. Re-render Optimization — MEDIUM
6. Rendering Performance — MEDIUM
7. JavaScript Performance — LOW-MEDIUM
8. Advanced Patterns — LOW

每条规则都有错误示例、正确示例和影响说明。
