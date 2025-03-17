import { Component, Inject, PLATFORM_ID } from '@angular/core';
import {FormGroup, ReactiveFormsModule} from "@angular/forms";
import {Router} from "@angular/router";
import {MatFormField} from "@angular/material/form-field";
import { MatSelectModule} from "@angular/material/select";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatCardModule} from "@angular/material/card";
import {MatDivider} from "@angular/material/divider";
import {NgIf, NgFor, CommonModule, isPlatformBrowser} from "@angular/common";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import { environment } from '../../../environments/environment';
import {provideNativeDateAdapter} from '@angular/material/core';

import { LoaderComponent } from '../../loader/loader.component';
import { GanttChartComponent } from '../../components/gantt-chart/gantt-chart.component';
import { PieChartsComponent } from '../../components/pie-charts/pie-charts.component';
import { SortedBarChartComponent } from '../../components/sorted-bar-chart/sorted-bar-chart.component';


const BASE_URL = environment.BACKEND_URL;
@Component({
  selector: 'app-job-quote',
  standalone: true,
  imports: [
    CommonModule,
    MatFormField,
    MatSelectModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDivider,
    PieChartsComponent,
    GanttChartComponent,
    SortedBarChartComponent,
    NgIf,
    NgFor,
    MatInput,
    MatButton,
    LoaderComponent
  ],
  providers:[provideNativeDateAdapter()],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent {
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  jobCardForm:FormGroup;
  isLoading: boolean = false;
  pageSize = 10;
  currentPage = 1;
  isBrowser: boolean;
  chartData
  chartData1
  taskData
  jobList

  constructor(@Inject(PLATFORM_ID) private platformId: Object,
              private router: Router) {
    this.jobCardForm = new FormGroup({})
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.loadData()
  }

  loadData(): void{
    this.chartData = [
      { completed: 10, notstarted: 20 },
      { completed: 20, notstarted: 30 },
      { completed: 30, notstarted: 40 },
    ];
  
    this.chartData1 = [
      { activity: 'Foundation', frequency: 0.25 },
      { activity: 'Framing', frequency: 0.20 },
      { activity: 'Electrical', frequency: 0.15 },
      { activity: 'Plumbing', frequency: 0.10 },
      { activity: 'Finishing', frequency: 0.30 },
    ];
  
    this.taskData = [
      { id: '1', name: 'Roof Structure', start: new Date(2024, 9, 23), end: new Date(2024, 10, 30), progress: 88, dependencies: null, },
      { id: '2', name: 'Wall Insulation', start: new Date(2024, 9, 24), end: new Date(2024, 9, 30), progress: 100, dependencies: null, },
      { id: '3', name: 'Wall Structure', start: new Date(2024, 6, 20), end: new Date(2024, 9, 11), progress: 98, dependencies:  null, },
      { id: '4', name: 'Roof Insulation', start: new Date(2024, 11, 1), end: new Date(2024, 11, 17), progress: 89, dependencies: null, },
      { id: '5', name: 'Foundation', start: new Date(2024, 5, 22), end: new Date(2024, 6, 26), progress: 100, dependencies: null, },
      { id: '6', name: 'Finishes', start: new Date(2025, 0, 10), end: new Date(2025, 1, 10), progress: 13, dependencies: null, },
      { id: '7', name: 'Electrical Supply Needs', start: new Date(2024, 9, 5), end: new Date(2024, 9, 26), progress: 90, dependencies: null, },
    ];
    

    
    this.jobList = [
      {projectName: "Pike Extension Office Park 1", jobType: "COMPLEX", status: "60%", desiredStartDate: '2024-05-16'},
      {projectName: "Melinda Holmes Home", jobType: "HOUSE", status: "30%", desiredStartDate: '2024-11-22'},
      {projectName: "Grey Stone Etstat", jobType: "ESTATE", status: "17%", desiredStartDate: '2024-08-06'},
      {projectName: "Pike Extension Office Park 2", jobType: "COMPLEX", status: "55%", desiredStartDate: '2024-05-14'},
      {projectName: "Hazelnut Estate", jobType: "ESTATE", status: "10%", desiredStartDate: '2024-11-10'},
      {projectName: "Purple Wood Mall", jobType: "COMPLEX", status: "60%", desiredStartDate: '2024-05-16'},
      {projectName: "Grand Arcade Mall, West Extension", jobType: "COMPLEX", status: "42%", desiredStartDate: '2024-04-15'},
      {projectName: "Allan Smithee Office Park", jobType: "COMPLEX", status: "65%", desiredStartDate: '2024-05-02'},
      {projectName: "Lean Brookes Mall", jobType: "COMPLEX", status: "64%", desiredStartDate: '2024-08-03'},
      {projectName: "Utility King Mall", jobType: "ESTART", status: "63%", desiredStartDate: '2024-05-16'},
      {projectName: "Harry King Home", jobType: "HOUSE", status: "78%", desiredStartDate: '2024-06-11'},
      {projectName: "Turk Mint Office Park", jobType: "COMPLEX", status: "40%", desiredStartDate: '2024-07-19'},
      {projectName: "June Bugg Estate", jobType: "ESTATE", status: "13%", desiredStartDate: '2024-09-23'},
      {projectName: "Jameson York Office Park", jobType: "COMPLEX", status: "34%", desiredStartDate: '2024-08-02'},
      {projectName: "Henry Smith Home", jobType: "HOUSE", status: "42%", desiredStartDate: '2024-05-16'},
      {projectName: "James Andrews Home", jobType: "HOUSE", status: "36%", desiredStartDate: '2024-11-24'},
      {projectName: "Susan Smith Home", jobType: "HOUSE", status: "73%", desiredStartDate: '2024-07-11'}
    ]
  }

  sortByFrequency() {
    this.chartData1 = [...this.chartData1].sort((a, b) => b.frequency - a.frequency);
  }

  sortByLetter() {
    this.chartData1 = [...this.chartData1].sort((a, b) => a.activity.localeCompare(b.activity));
  }

}
