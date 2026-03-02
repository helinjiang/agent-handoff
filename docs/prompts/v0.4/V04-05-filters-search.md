# V04-05：过滤与搜索（Timeline Viewer）

## 任务目标

为导出的静态 Timeline Viewer 增加过滤与搜索能力，便于在大体量事件中快速定位：
- 按 stepId / type / workItemId 过滤
- 关键字全文搜索（匹配 summary 与 JSON data）
- 支持 URL 参数保留筛选状态（可选）

## 上下文

约束：
- 不引入前端构建链
- 导出时生成 `assets/viewer.js`，在浏览器端对内联的 events JSON 做过滤渲染

依赖：
- V04-02 的 `assets/viewer.js` 引用与内联 `__EVENTS__` 数据

## 产物清单

```
src/export/web/assets/
  ├── viewer.js            # 实现过滤与搜索
  └── viewer.css           # 增加筛选 UI 的样式
tests/
  └── export/web/
      └── viewer-assets.test.ts   # 可选：只测生成内容包含关键 DOM hook
```

## 功能要求

### 1) UI 结构（在 index.html 中预留）

要求 V04-02 渲染出的 HTML 中包含这些 hook（id/class 可自行定，但需稳定）：
- 搜索输入框
- step/type/workItemId 下拉或多选控件
- “清空筛选”按钮
- 事件列表容器

### 2) 前端过滤逻辑（viewer.js）

行为：
- 从 `__EVENTS__` JSON 读取 events
- 构建可选项：
  - stepId 集合
  - type 集合
  - workItemId 集合
- 应用过滤与关键字搜索，渲染结果列表
- 搜索匹配规则：
  - summary（字符串包含，大小写不敏感）
  - data（JSON stringify 后包含，大小写不敏感）

### 3) URL 参数（可选）

支持：
- `?q=...&step=...&type=...&workItem=...`

加载页面时从 query 还原筛选状态，筛选变更时更新 URL（history.replaceState）。

## 验收标准

1. 打开导出的 index.html 可进行过滤与搜索
2. 不依赖网络与构建工具
3. 对含 `automation.session` 的事件，搜索能命中其 data 字段

