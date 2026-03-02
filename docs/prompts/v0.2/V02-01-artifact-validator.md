# V02-01：产物校验

## 任务目标

实现 output.md 产物结构校验，确保每个步骤的输出包含必要的区块。

## 上下文

根据 `docs/TECH_SPEC.md` 和 AGENTS.md 的规范，每个 output.md 应包含以下区块：

- **产物更新** - 记录写入/修改了哪些文件
- **关键决策** - 记录做了哪些关键选择
- **风险与待确认** - 记录不确定点、需要人确认的问题
- **下一步交接** - 记录下一 Step 要做什么

参考示例：
- `examples/workspaces/demo-login/steps/01-a-clarify/output.md`

## 产物清单

```
src/
└── core/
    └── artifact-validator.ts   # 产物校验逻辑
tests/
└── core/
    └── artifact-validator.test.ts
```

## 功能要求

### artifact-validator.ts

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'missing_section' | 'empty_section' | 'invalid_format';
  section: string;
  message: string;
}

export interface ValidationWarning {
  type: 'short_content' | 'missing_detail';
  section: string;
  message: string;
}

export const REQUIRED_SECTIONS = [
  '产物更新',
  '关键决策',
  '风险与待确认',
  '下一步交接',
] as const;

export function validateArtifact(content: string): ValidationResult;

export function validateArtifactFile(filePath: string): Promise<ValidationResult>;

export function validateWorkspaceArtifacts(workspacePath: string): Promise<WorkspaceValidationResult>;

export interface WorkspaceValidationResult {
  valid: boolean;
  stepResults: Map<string, ValidationResult>;
}
```

## 实现要点

1. **区块检测**
   - 使用正则表达式检测区块标题（如 `## 产物更新`）
   - 支持二级标题（`##`）和三级标题（`###`）
   - 区块内容为空时报告错误

2. **内容校验**
   - 检查区块是否有实际内容（非仅标题）
   - 内容过短时给出警告（如少于 10 字符）

3. **批量校验**
   - 遍历 workspace 所有步骤的 output.md
   - 返回每个步骤的校验结果

## 校验规则

### 必须存在的区块

| 区块 | 检测模式 | 错误级别 |
|------|----------|----------|
| 产物更新 | `## 产物更新` 或 `### 产物更新` | Error |
| 关键决策 | `## 关键决策` 或 `### 关键决策` | Error |
| 风险与待确认 | `## 风险与待确认` 或 `### 风险与待确认` | Error |
| 下一步交接 | `## 下一步交接` 或 `### 下一步交接` | Error |

### 内容校验

| 规则 | 条件 | 级别 |
|------|------|------|
| 空区块 | 区块存在但无内容 | Error |
| 内容过短 | 区块内容少于 10 字符 | Warning |

## 输出示例

### 校验通过

```
✅ steps/01-a-clarify/output.md - Valid
✅ steps/02-b-plan/output.md - Valid
✅ steps/03-login-implement/output.md - Valid
✅ steps/04-login-test/output.md - Valid
✅ steps/05-login-accept/output.md - Valid
✅ steps/06-b-summary/output.md - Valid

All artifacts validated successfully.
```

### 校验失败

```
✅ steps/01-a-clarify/output.md - Valid
❌ steps/02-b-plan/output.md - Invalid
   - Missing section: 关键决策
   - Empty section: 下一步交接
✅ steps/03-login-implement/output.md - Valid

Validation failed with 2 error(s).
```

## CLI 集成

在 `src/cli/commands/validate.ts` 中集成：

```typescript
import { Command } from 'commander';

export const validateCommand = new Command('validate')
  .description('校验 workspace 产物结构')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('--strict', '严格模式（将警告视为错误）')
  .action(async (workspace: string, options: { strict: boolean }) => {
    // 实现逻辑
  });
```

## 验收标准

1. 能正确识别 output.md 中的必要区块
2. 空区块或缺失区块报告错误
3. 内容过短给出警告
4. 能批量校验整个 workspace
5. 单元测试覆盖各种场景

## 测试用例

```typescript
import { describe, it, expect } from 'vitest';
import { validateArtifact, REQUIRED_SECTIONS } from '../../../src/core/artifact-validator';

describe('artifact-validator', () => {
  const validContent = `
# Output

## 产物更新
- 更新了文件 A
- 创建了文件 B

## 关键决策
- 选择方案 X

## 风险与待确认
- 需要确认 API 设计

## 下一步交接
- 交给下一步实现
`;

  it('should pass valid artifact', () => {
    const result = validateArtifact(validContent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when section missing', () => {
    const content = `
# Output
## 产物更新
- 更新了文件
`;
    const result = validateArtifact(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.section === '关键决策')).toBe(true);
  });

  it('should fail when section empty', () => {
    const content = `
# Output
## 产物更新
## 关键决策
## 风险与待确认
## 下一步交接
`;
    const result = validateArtifact(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.type === 'empty_section')).toBe(true);
  });

  it('should warn when content too short', () => {
    const content = `
# Output
## 产物更新
ok
## 关键决策
ok
## 风险与待确认
ok
## 下一步交接
ok
`;
    const result = validateArtifact(content);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
```

## 执行指令

请按照上述要求实现产物校验功能，并集成到 CLI 的 validate 命令中。
