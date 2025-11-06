import { Component, OnInit, Inject, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SubTasks } from'../../../models/sub-tasks';
import { ActivatedRoute, Router } from "@angular/router";
import { NgForOf, NgIf, isPlatformBrowser } from "@angular/common";
import { MatButton } from "@angular/material/button";
import { MatCard } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { GanttChartComponent } from '../../../components/gantt-chart/gantt-chart.component';
import { SubtasksState } from '../../../state/subtasks.state';
import { Store } from '../../../store/store.service';
import { WeatherService } from '../../../services/weather.service';
import { JobsService } from '../../../services/jobs.service';
import { BiddingService } from '../../../services/bidding.service';
import { LoaderComponent } from '../../../loader/loader.component';
import { FormsModule } from '@angular/forms';
import { InitiateBiddingDialogComponent } from '../initiate-bidding-dialog/initiate-bidding-dialog.component';

@Component({
    selector: 'app-jobs',
    standalone: true,
    imports: [
        FormsModule,
        NgIf,
        NgForOf,
        MatButton,
        LoaderComponent,
        GanttChartComponent,
        MatCard,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './job-edit.component.html',
    styleUrl: './job-edit.component.scss'
})
export class JobEditComponent implements OnInit{
  taskData: any;
  subtasks: SubTasks = new SubTasks();
  calculatedSubtasks: { task: string; days: number; startDate: string; endDate: string }[] = [];
  projectDetails: any;RoofStructure
  startDateDisplay: any;
  initialStartDate:any;
  subTasksObtained: any;
  calculatedTables: { title: string; subtasks: any[] }[] = [];
  calculatedChainedTables: { title: string; startDate: Date; endDate: Date ; subtasks: any[] }[] = [];

  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  isLoading: boolean = false;
  isBrowser: boolean;
  weatherData: any;

  constructor(private route: ActivatedRoute,
              private jobsService: JobsService,
              private weatherService: WeatherService,
              private biddingService: BiddingService,
              public store: Store<SubtasksState>,
              private router: Router,
              public dialog: MatDialog,
              @Inject(PLATFORM_ID) private platformId: Object
            ) {
              this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.projectDetails = params;
      this.startDateDisplay = new Date(this.projectDetails.date).toISOString().split('T')[0];
    });
    this.initialStartDate = this.projectDetails.date;

    const state = this.store.getState();
    if (!state.subtaskGroups) {
      this.store.setState({
        subtaskGroups: [
          { title: 'Default Group', subtasks: [] }
        ]
      });
    }

    this.fetchWeather();

    this.createTables();

    if (this.calculatedTables && state.subtaskGroups) {
      const updatedSubtaskGroups = this.calculatedTables.map((group) => {
        const updatedSubtasks = group.subtasks.map((existingSubtask) => {
          const matchingSubtask = this.calculatedTables.find(
            (obtainedSubtask) =>
              obtainedSubtask.title === group.title &&
              obtainedSubtask.subtasks === group.subtasks
          );
          return matchingSubtask
            ? { ...existingSubtask, ...matchingSubtask }
            : existingSubtask;
        });

        return {
          ...group,
          subtasks: updatedSubtasks,
        };
      });
      this.store.setState({
        subtaskGroups: updatedSubtaskGroups,
      });
    }
  }
  createTables(): void {
    const tables = [
      { title: 'Foundation Subtasks' , type: 'foundation',status: 'NEW' , subtasks: this.subtasks.foundationSubtasks },
      { title: 'WallInsulation Subtasks', type: 'wallInsulation', status: 'NEW', subtasks: this.subtasks.wallInsulationSubtasks },
      { title: 'WallStructure Subtasks', type: 'wallStructure', status: 'NEW', subtasks: this.subtasks.wallSubtasks },
      { title: 'Electrical & Plumbing Supply Needs Subtasks', type: 'electricalSupplyNeeds', status: 'NEW', subtasks: this.subtasks.electricalSubtasks },
      { title: 'RoofInsulation Subtasks', type: 'roofInsulation', status: 'NEW', subtasks: this.subtasks.roofInsulationSubtasks },
      { title: 'Roofing Subtasks', type: 'roofType', status: 'NEW', subtasks: this.subtasks.roofStructureSubtasks },
      { title: 'Finishes Subtasks', type: 'finishes', status: 'NEW', subtasks: this.subtasks.finishesSubtasks },
    ];
    let currentStartDate = new Date(this.initialStartDate);

    this.calculatedChainedTables = tables.map(table => {
      const chainedSubtasks = this.chainSubtaskDates(table.subtasks, currentStartDate);
      const AgggregatedstartDate = chainedSubtasks[0].startDate;
      const AggregatedendDate = chainedSubtasks[chainedSubtasks.length - 1].endDate;
      const lastSubtaskEndDate = new Date(AggregatedendDate);
      currentStartDate = new Date(lastSubtaskEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);

      return {
          title: table.title,
          startDate: new Date(AgggregatedstartDate),
          endDate: new Date(AggregatedendDate),
          subtasks: chainedSubtasks
      };
  });

    console.log(this.calculatedChainedTables);

    this.taskData = [
      { id: '1',name: 'RoofStructure', start:  this.calculatedChainedTables[5].startDate, end: this.calculatedChainedTables[5].endDate, progress: 0, dependencies: null, },
      { id: '2',name: 'WallInsulation', start: this.calculatedChainedTables[1].startDate, end: this.calculatedChainedTables[1].endDate, progress: 0, dependencies: null,},
      { id: '3',name: 'WallStructure', start: this.calculatedChainedTables[2].startDate, end: this.calculatedChainedTables[2].endDate, progress: 0, dependencies: null, },
      { id: '4',name: 'RoofInsulation', start: this.calculatedChainedTables[4].startDate, end: this.calculatedChainedTables[4].endDate, progress: 0, dependencies: null, },
      { id: '5',name: 'Foundation', start: this.calculatedChainedTables[0].startDate, end: this.calculatedChainedTables[0].endDate, progress: 0, dependencies: null, },
      { id: '6',name: 'Finishes', start: this.calculatedChainedTables[6].startDate, end: this.calculatedChainedTables[6].endDate,progress: 0, dependencies: null, },
      { id: '7',name: 'ElectricalSupplyNeeds', start: this.calculatedChainedTables[3].startDate, end:this.calculatedChainedTables[3].endDate, progress: 0, dependencies: null,}
    ];
    this.calculatedTables = tables.map(table => {
      const calculatedSubtasks = this.calculateSubtaskDates(table.subtasks, currentStartDate);
      const lastSubtaskEndDate = new Date(calculatedSubtasks[calculatedSubtasks.length - 1].endDate);
      currentStartDate = new Date(lastSubtaskEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);

      return {
        title: table.title,
        subtasks: calculatedSubtasks
      };
    });
  }
  calculateSubtaskDates(subtasks: any[], startDate: Date): any[] {
    let currentDate = new Date(startDate);

    return subtasks.map(subtask => {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(startDate.getDate() + subtask.days - 1);

      currentDate.setDate(endDate.getDate() + 1);

      return {
        ...subtask,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    });
  }

  calculateDates(subtasks: any[]): any[] {
    let currentDate = new Date(this.initialStartDate);

    return subtasks.map(subtask => {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(startDate.getDate() + subtask.days - 1);

      currentDate.setDate(endDate.getDate() + 1);

      return {
        ...subtask,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    });
  }

  chainSubtaskDates(subtasks: any[], initialStartDate: Date): any[] {
    let currentDate = new Date(initialStartDate);

    return subtasks.map(subtask => {
        const subtaskStartDate = new Date(currentDate);
        const subtaskEndDate = new Date(currentDate);
        subtaskEndDate.setDate(subtaskStartDate.getDate() + subtask.days - 1);
        currentDate.setDate(subtaskEndDate.getDate() + 1);

        return {
            ...subtask,
            startDate: subtaskStartDate,
            endDate: subtaskEndDate
        };
    });
}

  deleteSubtask(table: any, index: number): void {
    // Update the state directly to ensure consistency
    const updatedState = this.store.getState().subtaskGroups.map(group => {
      if (group.title === table.title) {
        return {
          ...group,
          subtasks: group.subtasks.filter((_, i) => i !== index)
        };
      }
      return group;
    });

    // Update the state
    this.store.setState({ subtaskGroups: updatedState });

    // Optionally, reassign the updated subtasks back to the table for local consistency
    table.subtasks = updatedState.find(group => group.title === table.title)?.subtasks || [];
  }

  addSubtask(table: any): void {
    const newSubtask = {
      task: '',
      days: 0,
      startDate: '',
      endDate: ''
    };

    table.subtasks.push(newSubtask);
    const updatedState = this.store.getState().subtaskGroups.map(group => {
      if (group.title === table.title) {
        return { ...group, subtasks: [...table.subtasks] };
      }
      return group;
    });

    this.store.setState({ subtaskGroups: updatedState });
  }

  updateSubtaskDates(table: any, index: number): void {
    const subtask = table.subtasks[index];
    if (subtask.days && subtask.startDate) {
      const startDate = new Date(subtask.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + subtask.days - 1);
      subtask.endDate = endDate.toISOString().split('T')[0];
      for (let i = index + 1; i < table.subtasks.length; i++) {
        const nextSubtask = table.subtasks[i];
        const nextStartDate = new Date(endDate);
        nextStartDate.setDate(nextStartDate.getDate() + 1);
        nextSubtask.startDate = nextStartDate.toISOString().split('T')[0];

        const nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + nextSubtask.days - 1);
        nextSubtask.endDate = nextEndDate.toISOString().split('T')[0];
        endDate.setDate(nextEndDate.getDate());
      }
    }
  }

  fetchWeather(): void {
    const location = this.projectDetails.address;
    const date = this.startDateDisplay;

    this.weatherService.getFutureWeather(location, date).subscribe({
      next: (data) => {
        this.weatherData = data;
        console.log(this.weatherData)
        console.log('Weather Condition:', this.weatherData?.forecast?.forecastday[0]?.day?.condition?.text);
      },
      error: (err) => {
        this.weatherData = "No Weather Data as Data should be more the two weeks from now";
        console.error('Error:', err);
      },
    });
  }

  private prepareProjectData(status: string): any {
    const formattedDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const dataInput = this.store.getState().subtaskGroups;

    return {
      Id: this.projectDetails.jobId,
      ProjectName: this.projectDetails.projectName,
      JobType: this.projectDetails.jobType,
      Stories: Number(this.projectDetails.stories),
      Status: status,
      Qty: Number(this.projectDetails.quantity),
      BuildingSize: Number(this.projectDetails.buildingSize),
      DesiredStartDate: formattedDate,
      WallStructure: this.projectDetails.wallStructure,
      WallStructureSubtask: JSON.stringify(dataInput[2].subtasks),
      WallStructureStatus: "NEW",
      WallInsulation: this.projectDetails.wallInsulation,
      WallInsulationSubtask: JSON.stringify(dataInput[1].subtasks),
      WallInsulationStatus: "NEW",
      RoofStructure: this.projectDetails.roofStructure,
      RoofStructureSubtask: JSON.stringify(dataInput[5].subtasks),
      RoofStructureStatus: "NEW",
      RoofInsulation: this.projectDetails.roofInsulation,
      RoofInsulationSubtask: JSON.stringify(dataInput[4].subtasks),
      RoofInsulationStatus: "NEW",
      ElectricalSupplyNeeds: this.projectDetails.electricalSupply,
      ElectricalSupplyNeedsSubtask: JSON.stringify(dataInput[3].subtasks),
      ElectricalStatus: "NEW",
      Finishes: this.projectDetails.finishes,
      FinishesSubtask: JSON.stringify(dataInput[6].subtasks),
      FinishesStatus: "NEW",
      Foundation: this.projectDetails.foundation,
      FoundationSubtask: JSON.stringify(dataInput[0].subtasks),
      FoundationStatus: "NEW",
      BlueprintPath: this.projectDetails.blueprintPath,
      OperatingArea: "GreenField",
      Address: this.projectDetails.address,
      UserId: localStorage.getItem("userId")
    };
  }

  publish() {
   const dialogRef = this.dialog.open(InitiateBiddingDialogComponent, {
     width: '400px',
     data: { requiredTrades: '', biddingType: 'PUBLIC' }
   });

   dialogRef.afterClosed().subscribe(result => {
     if (result) {
       const projectData = this.prepareProjectData("BIDDING");
       this.isLoading = true;
       this.biddingService.startBidding(this.projectDetails.jobId, result.biddingType, result.requiredTrades.split(',').map((s: string) => s.trim())).subscribe({
         next: () => {
           this.jobsService.updateJob(projectData, this.projectDetails.jobId).subscribe({
             next: () => {
               this.isLoading = false;
               this.showAlert = true;
               this.alertMessage = "Job is now in BIDDING status.";
             },
             error: err => {
               this.isLoading = false;
               this.showAlert = true;
               this.alertMessage = 'An unexpected error occurred while updating the job. Contact support';
               console.error('Error:', err);
             }
           });
         },
         error: err => {
           this.isLoading = false;
           this.showAlert = true;
           this.alertMessage = 'An unexpected error occurred while starting the bidding process. Contact support';
           console.error('Error:', err);
         }
       });
     }
   });
 }

  closeAlert(): void {
    if (this.routeURL) {
      this.router.navigateByUrl(this.routeURL);
    }
    this.showAlert = false;
  }

  saveOnly(){
    const updatedSubtaskGroups = this.store.getState().subtaskGroups.map(group => ({
      ...group,
      subtasks: group.subtasks.map(subtask => ({
        ...subtask,
      }))
    }));

    this.store.setState({ subtaskGroups: updatedSubtaskGroups });

    const dataInput = this.store.getState().subtaskGroups
    console.log('Tasks in store for Saved:', dataInput[0]);
    console.log('UserId :: ', localStorage.getItem("userId"))
    const projectData = this.prepareProjectData("DRAFT");

    this.isLoading = true;
    this.jobsService.updateJob(projectData, this.projectDetails.jobId).subscribe({
      next: response => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = "SavedS Job Successfully"
      },
      error: err => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = 'An unexpected error occurred. Contact support';
        console.error('Error:', err);
      }
    });
  }

  discard() {
    const updatedSubtaskGroups = this.store.getState().subtaskGroups.map(group => ({
      ...group,
      subtasks: group.subtasks.map(subtask => ({
        ...subtask,
      }))
    }));

    this.store.setState({ subtaskGroups: updatedSubtaskGroups });
    console.log('UserId :: ', localStorage.getItem("userId"))
    const projectData = this.prepareProjectData("DISCARD");

    this.isLoading = true;
    this.jobsService.updateJob(projectData, this.projectDetails.jobId).subscribe({
      next: response => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = "Discarded Job Successfully"
      },
      error: err => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = 'An unexpected error occurred. Contact support';
        console.error('Error:', err);
      }
    });
  }
}
