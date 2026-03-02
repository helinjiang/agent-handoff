import fs from 'fs/promises';
import path from 'path';
import { loadWorkspace } from './workspace.js';

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

export type RequiredSection = (typeof REQUIRED_SECTIONS)[number];

export interface WorkspaceValidationResult {
  valid: boolean;
  stepResults: Map<string, ValidationResult>;
  totalSteps: number;
  validSteps: number;
  errorCount: number;
  warningCount: number;
}

const MIN_CONTENT_LENGTH = 10;

export function validateArtifact(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const section of REQUIRED_SECTIONS) {
    const sectionResult = findSection(content, section);

    if (!sectionResult.found) {
      errors.push({
        type: 'missing_section',
        section,
        message: `缺少必要区块: ${section}`,
      });
    } else if (!sectionResult.hasContent) {
      errors.push({
        type: 'empty_section',
        section,
        message: `区块内容为空: ${section}`,
      });
    } else if (sectionResult.contentLength < MIN_CONTENT_LENGTH) {
      warnings.push({
        type: 'short_content',
        section,
        message: `区块内容过短 (${sectionResult.contentLength} 字符): ${section}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

interface SectionResult {
  found: boolean;
  hasContent: boolean;
  contentLength: number;
}

function findSection(content: string, sectionName: string): SectionResult {
  const patterns = [
    new RegExp(`^##\\s+${escapeRegex(sectionName)}[^\\n]*$`, 'm'),
    new RegExp(`^###\\s+${escapeRegex(sectionName)}[^\\n]*$`, 'm'),
  ];

  let matchIndex = -1;
  let matchLength = 0;

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      matchIndex = match.index;
      matchLength = match[0].length;
      break;
    }
  }

  if (matchIndex === -1) {
    return { found: false, hasContent: false, contentLength: 0 };
  }

  const contentStart = matchIndex + matchLength;
  const remainingContent = content.slice(contentStart);

  const nextSectionMatch = remainingContent.match(/^#{1,3}\s+/m);
  const sectionContent = nextSectionMatch
    ? remainingContent.slice(0, nextSectionMatch.index)
    : remainingContent;

  const trimmedContent = sectionContent.trim();

  return {
    found: true,
    hasContent: trimmedContent.length > 0,
    contentLength: trimmedContent.length,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function validateArtifactFile(
  filePath: string
): Promise<ValidationResult> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return validateArtifact(content);
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          type: 'invalid_format',
          section: '',
          message: `无法读取文件: ${filePath}`,
        },
      ],
      warnings: [],
    };
  }
}

export async function validateWorkspaceArtifacts(
  workspacePath: string
): Promise<WorkspaceValidationResult> {
  const workspace = await loadWorkspace(workspacePath);
  const stepResults = new Map<string, ValidationResult>();
  let validSteps = 0;
  let errorCount = 0;
  let warningCount = 0;

  if (!workspace.workflow) {
    return {
      valid: false,
      stepResults,
      totalSteps: 0,
      validSteps: 0,
      errorCount: 1,
      warningCount: 0,
    };
  }

  for (const step of workspace.workflow.steps) {
    const outputPath = path.join(workspace.path, step.output);
    const result = await validateArtifactFile(outputPath);
    stepResults.set(step.id, result);

    if (result.valid) {
      validSteps++;
    }
    errorCount += result.errors.length;
    warningCount += result.warnings.length;
  }

  return {
    valid: errorCount === 0,
    stepResults,
    totalSteps: workspace.workflow.steps.length,
    validSteps,
    errorCount,
    warningCount,
  };
}
