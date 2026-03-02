import { describe, expect, it } from 'vitest';
import { TRAE_VISUAL_ELEMENTS } from '../../../src/adapters/trae/visual-elements';

describe('TRAE_VISUAL_ELEMENTS', () => {
  it('should include required keys', () => {
    expect(TRAE_VISUAL_ELEMENTS.newTaskButton.id).toBe('newTaskButton');
    expect(TRAE_VISUAL_ELEMENTS.chatInputArea.id).toBe('chatInputArea');
    expect(TRAE_VISUAL_ELEMENTS.submitButton.id).toBe('submitButton');
    expect(TRAE_VISUAL_ELEMENTS.taskCompleteIndicator.id).toBe('taskCompleteIndicator');
    expect(TRAE_VISUAL_ELEMENTS.traeLogo.id).toBe('traeLogo');
  });
});

