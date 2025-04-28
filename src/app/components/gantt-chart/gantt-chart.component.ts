import { Component, Input, ElementRef, ViewChild, Inject, PLATFORM_ID, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-gantt-chart',
  standalone: true,
  template: `<div #ganttChart style="width: 100%; height: 500px;"></div>`
})
export class GanttChartComponent implements AfterViewInit, OnChanges {
  @ViewChild('ganttChart', { static: true }) ganttChart!: ElementRef;
  @Input() tasks: any[] = [];

  private isBrowser: boolean;
  private isChartReady: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      (window as any).google.charts.load('current', { packages: ['gantt'] });
      (window as any).google.charts.setOnLoadCallback(() => {
        this.isChartReady = true;
        this.drawChart(); // In case tasks are already set
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks'] && this.isChartReady) {
      this.drawChart();
    }
  }

  private drawChart(): void {
    if (!this.tasks || this.tasks.length === 0) {
      console.warn('⚠️ No task data available for Gantt chart.');
      return;
    }
  
    const data = new (window as any).google.visualization.DataTable();
    data.addColumn('string', 'Task ID');
    data.addColumn('string', 'Task Name');
    data.addColumn('string', 'Resource');
    data.addColumn('date', 'Start Date');
    data.addColumn('date', 'End Date');
    data.addColumn('number', 'Duration');
    data.addColumn('number', 'Percent Complete');
    data.addColumn('string', 'Dependencies');
  
    const rows = this.tasks.map(task => [
      task.id || '',
      task.name || '',
      task.resource || null,
      new Date(task.start),
      new Date(task.end),
      null,
      task.progress ?? 0,
      task.dependencies ?? null
    ]);
    data.addRows(rows);
  
    const chart = new (window as any).google.visualization.Gantt(this.ganttChart.nativeElement);
  
    // 🛠️ Dynamic width (200px per task as a base, or minimum 1000px)
    const baseWidth = this.tasks.length * 400; // scale based on task count
    const chartWidth = Math.min(Math.max(800, baseWidth), 1200); // min 800, max 1200
    this.ganttChart.nativeElement.style.width = `${chartWidth}px`;
    this.ganttChart.nativeElement.style.width = `${chartWidth}px`;
  
    const options = {
      height: (this.tasks.length * 42) + 80,
      width: chartWidth,
      backgroundColor: '#ffffff',
      gantt: {
        trackHeight: 36,
        labelStyle: {
          fontSize: 13,
          color: '#3f51b5'
        },
        barHeight: 30,
        barCornerRadius: 4,
        criticalPathEnabled: true,
        criticalPathStyle: {
          stroke: '#FBD008',
          strokeWidth: 2,
        },
      }
    };
  
    chart.draw(data, options);
  }
  
}
