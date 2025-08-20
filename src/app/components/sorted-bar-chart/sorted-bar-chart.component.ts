import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-sorted-bar-chart',
  standalone: true,
  template: `<div #chartContainer></div>`,
  styleUrls: ['./sorted-bar-chart.component.scss'],
})
export class SortedBarChartComponent implements OnInit, OnChanges {
  @Input() data: { activity: string; frequency: number }[] = [];
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  private svg: any;
  private x: any;
  private y: any;
  private xAxis: any;
  private gx: any;
  private gy: any;
  private bar: any;

  width = 640;
  height = 400;
  margin = { top: 20, right: 0, bottom: 30, left: 40 };

  ngOnInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data.length) {
      this.updateChart();
    }
  }

  private createChart() {
    const { width, height, margin } = this;

    // Create scales
    this.x = d3
      .scaleBand()
      .domain(this.data.map((d) => d.activity))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    this.y = d3
      .scaleLinear()
      .domain([0, d3.max(this.data, (d) => d.frequency) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    this.xAxis = d3.axisBottom(this.x).tickSizeOuter(0);

    // Create SVG
    this.svg = d3
      .select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', `max-width: ${width}px; height: auto; font: 10px sans-serif; overflow: visible;`);

    // Create bars
    this.bar = this.svg
      .append('g')
      .attr('fill', 'rgb(251, 208, 8)')
      .selectAll('rect')
      .data(this.data)
      .join('rect')
      .style('mix-blend-mode', 'multiply')
      .attr('x', (d) => this.x(d.activity))
      .attr('y', (d) => this.y(d.frequency))
      .attr('height', (d) => this.y(0) - this.y(d.frequency))
      .attr('width', this.x.bandwidth());

    // Create X-axis
    this.gx = this.svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(this.xAxis);

    // Create Y-axis
    this.gy = this.svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(this.y)
          .tickFormat((y) => (Number(y) * 100).toFixed())
      )
      .call((g) => g.select('.domain').remove());
  }

  private updateChart() {
    const t = this.svg.transition().duration(750);

    // Update scales
    this.x.domain(this.data.map((d) => d.activity));

    // Update bars
    this.bar
      .data(this.data, (d: any) => d.activity)
      .order()
      .transition(t)
      .delay((d, i) => i * 20)
      .attr('x', (d: any) => this.x(d.activity));

    // Update X-axis
    this.gx.transition(t).call(this.xAxis).selectAll('.tick').delay((d, i) => i * 20);
  }
}
