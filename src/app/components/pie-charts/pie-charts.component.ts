import {
  Component,
  Input,
  ElementRef,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-pie-charts',
  standalone: true,
  template: '<div #chartContainer></div>',
  styleUrls: ['./pie-charts.component.scss'],
})
export class PieChartsComponent implements OnInit, AfterViewInit {
  @Input() data: any[] = [];
  @Input() width: number = 100;

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  constructor() {}

  ngOnInit(): void {
    // Input properties can be initialized here if needed.
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  createChart(): void {
    if (!this.chartContainer?.nativeElement) {
      console.error('Chart container not found!');
      return;
    }

    const container = this.chartContainer.nativeElement;
    const height = Math.min(500, this.width / 2);
    const outerRadius = height / 2 - 10;
    const innerRadius = outerRadius * 0.75;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', [-this.width / 2, -height / 2, this.width, height]);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const pie = d3
      .pie()
      .sort(null)
      .value((d: any) => d['apples']);

    const path = svg
      .datum(this.data)
      .selectAll('path')
      .data(pie)
      .join('path')
      .attr('fill', (d, i) => color(i.toString()))
      .attr('d', arc as any);
  }
}
