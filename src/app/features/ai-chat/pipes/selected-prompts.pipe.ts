import { Pipe, PipeTransform } from '@angular/core';
import { Prompt } from '../models/ai-chat.models';

@Pipe({
  name: 'selectedPrompts',
  standalone: true
})
export class SelectedPromptsPipe implements PipeTransform {
  transform(prompts: Prompt[] | null, selectedPromptIds: number[] | null): Prompt[] {
    if (!prompts || !selectedPromptIds) {
      return [];
    }
    return prompts.filter(p => selectedPromptIds.includes(p.id));
  }
}
