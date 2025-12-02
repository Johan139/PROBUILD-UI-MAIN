import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filesize', standalone: true })
export class FileSizePipe implements PipeTransform {
  transform(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let formattedSize = size;

    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }

    return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
  }
}
