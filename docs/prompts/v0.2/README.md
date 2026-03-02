# AgentHandoff v0.2 任务清单

本文档汇总 v0.2 的所有任务，每个任务对应一个独立的 Prompt 文件。

## 进展

- ✅ V02-01～V02-05 已完成（实现 + 单测通过）

## 任务依赖关系

```
V02-01 产物校验 ─────────────────────────────┐
    ↓                                         │
V02-02 剪贴板集成                             │
    ↓                                         │
V02-03 events.jsonl 写入 ←───────────────────┤
    ↓                                         │
V02-04 配置文件支持                           │
    ↓                                         │
V02-05 advance 命令 ──────────────────────────┘
```

## 任务列表

| 序号 | 任务 | 产物 | 优先级 | 状态 |
|------|------|------|--------|------|
| [V02-01](./V02-01-artifact-validator.md) | 产物校验 | src/core/artifact-validator.ts | P0 | ✅ |
| [V02-02](./V02-02-clipboard.md) | 剪贴板集成 | src/core/clipboard.ts | P0 | ✅ |
| [V02-03](./V02-03-events-writer.md) | events.jsonl 写入 | src/core/events-writer.ts | P0 | ✅ |
| [V02-04](./V02-04-config-file.md) | 配置文件支持 | src/core/config.ts | P1 | ✅ |
| [V02-05](./V02-05-advance-command.md) | advance 命令 | src/cli/commands/advance.ts | P1 | ✅ |

## 执行顺序

### 阶段一：核心功能（P0）

1. **V02-01** - 产物校验
   - 校验 output.md 结构完整性
   - 检查必要区块是否存在

2. **V02-02** - 剪贴板集成
   - 自动复制 prompt 到剪贴板
   - 跨平台兼容

3. **V02-03** - events.jsonl 写入
   - 实现 step.started/step.done 事件写入
   - 集成到 next 命令

### 阶段二：增强功能（P1）

4. **V02-04** - 配置文件支持
   - 支持 `.agenthandoffrc` 配置
   - 配置优先级处理

5. **V02-05** - advance 命令
   - 手动推进状态
   - 触发事件写入

## 验收标准

每个任务完成后，应满足：

1. 产物文件已创建
2. 单元测试通过
3. `pnpm build` 成功
4. `pnpm typecheck` 无错误

## 最终验收

v0.2 完成标准：

```bash
# 1. 产物校验
agent-handoff validate examples/workspaces/demo-login
# 输出: ✅ All artifacts validated

# 2. 剪贴板集成
agent-handoff next examples/workspaces/demo-login --copy
# 输出: ✅ Prompt copied to clipboard

# 3. events.jsonl 写入
agent-handoff advance examples/workspaces/demo-login --event step.done
# events.jsonl 新增事件记录

# 4. 配置文件
cat .agenthandoffrc
# 显示配置内容
```

## 参考文档

- [技术方案](../TECH_SPEC.md)
- [路线图](../roadmap.md)
- [v0.1 MVP 任务清单](../prompts/mvp/README.md)
