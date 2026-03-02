# V04-02：Timeline 静态页面生成（基础 UI）

## 任务目标

实现 “静态导出 Timeline 页面” 的渲染器：读取结构化 Timeline 数据，生成可离线打开的 `index.html`（可拆分出 css/js 资源文件）。

## 上下文

v0.4 目标是静态导出，优先保证 `file://` 打开可用，因此：
- 不依赖浏览器 fetch 读取 `events.jsonl`
- 把事件数据嵌入到导出的 HTML（或生成 `<script type="application/json">` 内联数据）

依赖：
- V04-01 的 `readEventsJsonl()` / `toTimelineItems()`

## 产物清单

```
src/export/web/
  ├── timeline-renderer.ts         # 新增：生成 index.html 与资源文件内容
  └── assets/
      ├── viewer.css               # 新增：基础样式（导出时写入）
      └── viewer.js                # 新增：最小交互（可为空壳，供 V04-05 扩展）
tests/
  └── export/web/
      └── timeline-renderer.test.ts
```

## 功能要求

### 1) TimelineRenderer

```ts
import { TimelineItem } from '../../core/events-reader.js';

export interface RenderWebTimelineOptions {
  title: string;
  workspaceName: string;
  generatedAt: string;
  items: TimelineItem[];
  includeAssets: boolean;
}

export interface RenderWebTimelineResult {
  html: string;
  assets: Record<string, string>;
}

export function renderWebTimeline(options: RenderWebTimelineOptions): RenderWebTimelineResult;
```

要求：
- `html` 必须是完整可打开的 HTML 文档
- `includeAssets=true` 时：
  - `assets['assets/viewer.css']`、`assets['assets/viewer.js']` 必须存在
  - html 通过相对路径引用这两个文件
- 事件数据必须以内联方式嵌入（例如：`<script id="__EVENTS__" type="application/json">...</script>`）
- 页面至少包含：
  - 标题（workspaceName + “Timeline”）
  - 事件列表（按时间升序）
  - 每条事件显示：时间、stepId、type、summary
  - 若存在 `workItemId` 显示 badge
  - 若存在 `links` 显示为可点击链接（先生成 href，占位；由 V04-03/V04-04 统一导出策略）
  - 若存在 `data` 显示 “可展开的 JSON 摘要”（可用 `<details>`/`<pre>`）

### 2) HTML 安全

必须对动态内容做 HTML escape（summary/stepId/workItemId 等），避免导出页面被注入。

## 验收标准

1. renderWebTimeline 输出的 html 在 `file://` 打开可用（不需要外部网络）
2. includeAssets=true 时能输出 assets 字典，并正确引用
3. 能展示 `data` 字段（例如 `automation.session` 的统计信息）
4. 单测覆盖：基础渲染、含 links/data 的渲染、escape 行为

