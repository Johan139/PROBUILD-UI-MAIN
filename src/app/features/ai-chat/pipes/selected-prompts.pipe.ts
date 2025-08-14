import { Pipe, PipeTransform } from '@angular/core';
import { Prompt } from '../models/ai-chat.models';

@Pipe({
  name: 'selectedPrompts',
  standalone: true
})
export class SelectedPromptsPipe implements PipeTransform {
  transform(prompts: Prompt[] | null, selectedPromptKeys: string[] | null): Prompt[] {
    if (!prompts || !selectedPromptKeys) {
      return [];
    }
    return prompts.filter(p => selectedPromptKeys.includes(p.promptKey));
  }
}
