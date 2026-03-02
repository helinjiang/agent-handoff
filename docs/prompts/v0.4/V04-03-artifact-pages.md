# V04-03：Artifact 页面生成与链接

## 任务目标

实现 “产物查看” 能力：将 workspace 中被 events.jsonl 引用的 links（文件路径）导出为可离线查看的 HTML 页面，并在 Timeline 中链接到这些页面。

## 上下文

静态导出在浏览器里无法稳定读取本地原文件（`file://` + fetch 常被限制），因此产物查看采用：
- 导出期生成 HTML 页面（而不是运行时读取文件）
- Timeline 的 links 指向导出目录内的 artifact 页面

## 产物清单

```
src/export/web/
  ├── artifact-renderer.ts           # 新增：生成单个 artifact 页
  └── artifact-indexer.ts            # 新增：把 workspace links 映射为导出路径
tests/
  └── export/web/
      ├── artifact-renderer.test.ts
      └── artifact-indexer.test.ts
```

## 功能要求

### 1) artifact-indexer：links → 导出路径

```ts
export interface ArtifactLinkMapping {
  original: string;
  outputHtmlPath: string;
  title: string;
}

export function buildArtifactLinkMap(links: string[]): ArtifactLinkMapping[];
```

要求：
- `links` 是 events.jsonl 中的相对路径（相对于 workspace 根目录）
- `outputHtmlPath` 必须是导出目录内的相对路径，例如：
  - `artifacts/steps-01-analyze-output.md.html`
- 映射规则必须确定性（同一 link 多次出现应生成相同 outputHtmlPath）
- `title` 用于页面标题（可用原始 link）

### 2) artifact-renderer：生成 artifact 页面

```ts
export interface RenderArtifactOptions {
  title: string;
  originalPath: string;
  content: string;
}

export function renderArtifactPage(options: RenderArtifactOptions): string;
```

页面内容至少包含：
- 标题（title）
- 原始路径展示（originalPath）
- 内容区域：以 `<pre>` 或 `<code>` 形式展示，并进行 HTML escape

### 3) 缺失文件策略

导出期若某个 link 指向的文件不存在：
- 仍生成页面，但内容显示“文件不存在/无法读取”的提示（同样需要 escape）

## 验收标准

1. buildArtifactLinkMap 输出路径确定且不会产生路径穿越风险（不允许 `../` 逃逸）
2. renderArtifactPage 对任意输入内容都能安全渲染（escape 生效）
3. 单测覆盖：路径映射稳定性、escape、缺失文件提示

