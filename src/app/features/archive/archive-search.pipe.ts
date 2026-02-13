import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'archiveSearch',
  standalone: true,
})
export class ArchiveSearchPipe implements PipeTransform {
  transform(items: any[], search: string): any[] {
    if (!items || !search) {
      return items;
    }

    const term = search.toLowerCase();

    return items.filter((item) =>
      Object.values(item).join(' ').toLowerCase().includes(term),
    );
  }
}
