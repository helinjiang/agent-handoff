# AgentRelay v0.1 MVP 任务清单

本文档汇总 v0.1 MVP 的所有任务，每个任务对应一个独立的 Prompt 文件。

## 任务依赖关系

```
MVP-01 项目初始化
    ↓
MVP-02 Core 模型定义 ← MVP-03 Workspace 读取 ← MVP-04 状态机
    ↓                       ↓                     ↓
MVP-05 CLI + init      MVP-06 status         MVP-07 Prompt + next
    ↓                       ↓                     ↓
    └───────────────────────┴─────────────────────┘
                            ↓
                      MVP-08 发布准备
```

## 任务列表

| 序号 | 任务 | 产物 | 预计时间 |
|------|------|------|----------|
| [MVP-01](./MVP-01-project-init.md) | 项目初始化 | package.json, tsconfig.json, vitest.config.ts | 15min |
| [MVP-02](./MVP-02-core-models.md) | Core 模型定义 | src/core/models/*.ts | 20min |
| [MVP-03](./MVP-03-workspace.md) | Workspace 读取 | src/core/workspace.ts, workflow-parser.ts | 30min |
| [MVP-04](./MVP-04-state-machine.md) | 状态机 | src/core/state-machine.ts | 20min |
| [MVP-05](./MVP-05-cli-init.md) | CLI 框架 + init 命令 | src/cli/index.ts, commands/init.ts | 30min |
| [MVP-06](./MVP-06-cli-status.md) | status 命令 | src/cli/commands/status.ts | 20min |
| [MVP-07](./MVP-07-cli-next.md) | Prompt 生成 + next 命令 | src/core/prompt-generator.ts, commands/next.ts | 30min |
| [MVP-08](./MVP-08-release.md) | 发布准备 | README.md, CHANGELOG.md | 15min |

## 执行顺序

### 阶段一：基础设施

1. **MVP-01** - 项目初始化
   - 创建项目骨架
   - 配置构建、测试工具链

### 阶段二：核心模块（可并行）

2. **MVP-02** - Core 模型定义
3. **MVP-03** - Workspace 读取
4. **MVP-04** - 状态机

### 阶段三：CLI 命令（依赖阶段二）

5. **MVP-05** - CLI 框架 + init 命令
6. **MVP-06** - status 命令
7. **MVP-07** - Prompt 生成 + next 命令

### 阶段四：发布

8. **MVP-08** - 发布准备

## 验收标准

每个任务完成后，应满足：

1. 产物文件已创建
2. 单元测试通过
3. `pnpm build` 成功
4. `pnpm typecheck` 无错误

## 最终验收

v0.1 MVP 完成标准：

```bash
# 1. 全局安装
npm link

# 2. 测试 demo-login
agent-relay status examples/workspaces/demo-login
# 输出: Status: done

# 3. 创建新 workspace
agent-relay init test-project
agent-relay status test-project
agent-relay next test-project

# 4. 清理
rm -rf test-project
npm unlink -g agent-relay
```

## 参考文档

- [项目愿景](../vision.md)
- [技术方案](../TECH_SPEC.md)
- [产物协议](../protocol.md)
- [路线图](../roadmap.md)
