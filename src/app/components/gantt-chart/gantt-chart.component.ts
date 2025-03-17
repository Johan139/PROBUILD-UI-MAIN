import { Component, AfterViewInit, Input, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-gantt-chart',
  standalone: true,
  template: `<div #ganttChart style="width: 100%; height: 500px;"></div>`,
})
export class GanttChartComponent implements AfterViewInit {
  @ViewChild('ganttChart', { static: true }) ganttChart!: ElementRef;
  @Input() tasks: any[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: any) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadGoogleCharts();
    }
  }

  private loadGoogleCharts(): void {
    // Load the Google Charts library
    (window as any).google.charts.load('current', { packages: ['gantt'] });
    (window as any).google.charts.setOnLoadCallback(() => this.drawChart());
  }

  private drawChart(): void {
    const data = new (window as any).google.visualization.DataTable();

    // Define the columns
    data.addColumn('string', 'Task ID');
    data.addColumn('string', 'Task Name');
    data.addColumn('string', 'Resource');
    data.addColumn('date', 'Start Date');
    data.addColumn('date', 'End Date');
    data.addColumn('number', 'Duration');
    data.addColumn('number', 'Percent Complete');
    data.addColumn('string', 'Dependencies');

    // Populate the rows with task data
    const rows = this.tasks.map((task) => [
      task.id || '',
      task.name,
      task.resource || null,
      task.start,
      task.end,
      null, // Duration (calculated automatically if not provided)
      task.progress || 0,
      task.dependencies || null,
    ]);
    data.addRows(rows);

    // Create the Gantt chart
    const chart = new (window as any).google.visualization.Gantt(this.ganttChart.nativeElement);

    // Define the chart options
    const options = {
      height: 400,
      backgroundColor: {
        fill: '#FFF'
      },
      gantt: {
        criticalPathEnabled: true,
        criticalPathStyle: {
          stroke: '#FBD008',
          strokeWidth: 2,
        },
      },
    };

    // Draw the chart
    chart.draw(data, options);
  }
}
