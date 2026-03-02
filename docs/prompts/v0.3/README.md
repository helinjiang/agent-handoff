# AgentHandoff v0.3 任务清单

本文档汇总 v0.3 的所有任务，每个任务对应一个独立的 Prompt 文件。

## 版本目标

实现基于视觉的 TRAE 自动化执行（可选功能），支持自动输入 prompt、操作录制、错误恢复与降级。

## 任务依赖关系

```
V03-01 TRAE Adapter 基础架构
    │
    ├──→ V03-02 TRAE 界面元素识别
    │         │
    │         └──→ V03-03 自动输入 prompt
    │                   │
    ├──→ V03-04 操作日志记录 ←────┘
    │         │
    └──→ V03-05 错误恢复与降级 ←────┘
```

## 任务列表

| 序号 | 任务 | 产物 | 优先级 |
|------|------|------|--------|
| [V03-01](./V03-01-trae-adapter.md) | TRAE Adapter 基础架构 | src/adapters/trae/ | P0 |
| [V03-02](./V03-02-trae-ui-elements.md) | TRAE 界面元素识别 | src/adapters/trae/ui-elements.ts | P0 |
| [V03-03](./V03-03-trae-auto-input.md) | 自动输入 prompt | src/adapters/trae/auto-input.ts | P0 |
| [V03-04](./V03-04-operation-logger.md) | 操作日志记录 | src/adapters/trae/operation-logger.ts | P1 |
| [V03-05](./V03-05-error-recovery.md) | 错误恢复与降级 | src/adapters/trae/error-recovery.ts | P1 |

## 执行顺序

### 阶段一：基础架构（P0）

1. **V03-01** - TRAE Adapter 基础架构
   - 创建 adapters 目录结构
   - 定义 Adapter 接口
   - 实现 TRAE Adapter 基类

2. **V03-02** - TRAE 界面元素识别
   - 使用 Puppeteer 连接 TRAE
   - 识别关键 UI 元素（新建任务、输入框、提交按钮）
   - 实现元素定位策略

3. **V03-03** - 自动输入 prompt
   - 实现自动输入流程
   - 支持任务创建与提交
   - 集成到 next 命令

### 阶段二：增强功能（P1）

4. **V03-04** - 操作日志记录
   - 记录操作序列
   - 支持截图保存
   - 生成操作报告

5. **V03-05** - 错误恢复与降级
   - 实现错误检测
   - 支持重试机制
   - 降级到辅助模式

## 技术选型

### Nut.js (Desktop Automation)

鉴于 TRAE 是桌面 IDE，直接使用 Puppeteer 需要开启远程调试端口（用户体验不佳）。因此 v0.3 采用 **Nut.js** 进行桌面自动化。

原因：
- **无侵入性** - 不需要以特定参数启动 TRAE
- **跨平台** - 支持 macOS, Windows, Linux
- **视觉驱动** - 基于图像匹配定位元素，符合"视觉自动化"目标
- **原生模拟** - 模拟真实的键盘鼠标硬件事件

### 依赖库

```bash
pnpm add @nut-tree/nut-js
pnpm add @nut-tree/template-matcher # 图像匹配插件
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 分辨率/主题差异 | 图像匹配失效 | 提供多套模板图；优先使用快捷键操作 |
| 权限拦截 | 无法控制鼠标键盘 | 首次运行引导用户授予"辅助功能"权限 |
| 窗口焦点丢失 | 操作发送到错误窗口 | 操作前强制激活 TRAE 窗口 |

## 参考文档

- [技术方案](../../TECH_SPEC.md)
- [路线图](../../roadmap.md)
- [v0.2 任务清单](../v0.2/README.md)
- [Puppeteer 文档](https://pptr.dev/)
