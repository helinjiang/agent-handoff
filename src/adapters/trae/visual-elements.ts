import { VisualElement } from './types';

export const TRAE_VISUAL_ELEMENTS = {
  newTaskButton: {
    id: 'newTaskButton',
    imageTemplate: 'new-task-btn.png',
    description: '新建任务按钮 (+)',
    role: 'button',
  },
  chatInputArea: {
    id: 'chatInputArea',
    imageTemplate: 'chat-input-empty.png',
    description: '聊天输入框',
    role: 'input',
  },
  submitButton: {
    id: 'submitButton',
    imageTemplate: 'submit-btn.png',
    description: '提交按钮',
    role: 'button',
  },
  taskCompleteIndicator: {
    id: 'taskCompleteIndicator',
    imageTemplate: 'task-done.png',
    description: '任务完成图标',
    role: 'indicator',
  },
  traeLogo: {
    id: 'traeLogo',
    imageTemplate: 'trae-logo.png',
    description: 'TRAE Logo (用于确认窗口)',
    role: 'indicator',
  },
} as const satisfies Record<string, VisualElement>;

export type VisualElementKey = keyof typeof TRAE_VISUAL_ELEMENTS;

