# MVP-01：项目初始化

## 任务目标

初始化 AgentHandoff TypeScript 项目，配置构建、测试、lint 工具链。

## 上下文

- 项目名称：agent-handoff
- 包管理器：pnpm
- 语言：TypeScript
- 测试框架：Vitest
- 构建工具：tsup
- CLI 框架：commander

## 产物清单

```
agent-handoff/
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── vitest.config.ts       # 测试配置
├── tsup.config.ts         # 构建配置
├── .gitignore             # Git 忽略规则
├── src/
│   └── index.ts           # CLI 入口（空实现）
└── tests/
    └── index.test.ts      # 示例测试
```

## package.json 要求

```json
{
  "name": "agent-handoff",
  "version": "0.1.0",
  "description": "轻量级多 Agent 协作接力工具",
  "type": "module",
  "bin": {
    "agent-handoff": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "yaml": "^2.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

## tsconfig.json 要求

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## tsup.config.ts 要求

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

## vitest.config.ts 要求

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

## src/index.ts 要求

```typescript
#!/usr/bin/env node

console.log('agent-handoff v0.1.0');
```

## 验收标准

1. `pnpm install` 成功
2. `pnpm build` 成功，生成 `dist/index.js`
3. `pnpm test` 成功运行
4. `node dist/index.js` 输出 `agent-handoff v0.1.0`
5. `pnpm typecheck` 无错误

## 执行指令

请按照上述要求创建项目文件，确保所有配置正确无误。
