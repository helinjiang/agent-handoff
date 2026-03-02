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

### Puppeteer

选择 Puppeteer 作为自动化框架，原因：
- 官方维护，稳定可靠
- 支持 Chrome DevTools Protocol
- 丰富的 API
- 支持 headless 和有头模式
- 活跃的社区

### 安装依赖

```bash
pnpm add puppeteer
pnpm add -D @types/puppeteer
```

## 安全与权限

v0.3 自动化功能涉及敏感操作，需要特别注意：

1. **默认关闭** - 自动化功能默认禁用，需要显式启用
2. **权限提示** - 首次使用时提示用户授权
3. **操作审计** - 所有操作记录到日志
4. **降级机制** - 失败时自动降级到辅助模式

## CLI 集成

### 新增选项

```bash
# 启用自动化模式
agent-handoff next --auto

# 自动化模式 + 截图
agent-handoff next --auto --screenshot

# 禁用自动化（显式使用辅助模式）
agent-handoff next --no-auto
```

### 配置文件

`.agenthandoffrc`:
```json
{
  "automation": {
    "enabled": false,
    "provider": "puppeteer",
    "screenshot": false,
    "timeout": 30000,
    "retries": 3
  }
}
```

## 验收标准

每个任务完成后，应满足：

1. 产物文件已创建
2. 单元测试通过
3. `pnpm build` 成功
4. `pnpm typecheck` 无错误

## 最终验收

v0.3 完成标准：

```bash
# 1. 自动化模式
agent-handoff next examples/workspaces/demo-login --auto
# 输出: ✅ Prompt submitted automatically
#       📸 Screenshot saved: screenshots/2026-03-02/step-03.png

# 2. 降级测试
agent-handoff next --auto --simulate-error
# 输出: ⚠️  Automation failed: Element not found
#       📋 Falling back to assisted mode
#       Prompt: ...

# 3. 操作日志
cat examples/workspaces/demo-login/operations.jsonl
# 显示操作记录
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| TRAE 界面变化 | 元素定位失效 | 使用多种定位策略，提供降级机制 |
| 权限问题 | 自动化无法启动 | 提前检测权限，提供友好提示 |
| 性能影响 | 启动慢 | 按需加载 Puppeteer，支持连接已有实例 |
| 并发问题 | 多任务冲突 | 实现操作队列，支持串行执行 |

## 参考文档

- [技术方案](../../TECH_SPEC.md)
- [路线图](../../roadmap.md)
- [v0.2 任务清单](../v0.2/README.md)
- [Puppeteer 文档](https://pptr.dev/)
