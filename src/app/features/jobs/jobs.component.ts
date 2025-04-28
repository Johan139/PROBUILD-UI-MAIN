import { Component, OnInit, Inject, PLATFORM_ID, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { SubTasks } from './../../models/sub-tasks';
import { ActivatedRoute, Router } from "@angular/router";
import { NgForOf, NgIf, isPlatformBrowser } from "@angular/common";
import { MatButton } from "@angular/material/button";
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { GanttChartComponent } from '../../components/gantt-chart/gantt-chart.component';
import { SubtasksState } from '../../state/subtasks.state';
import { Store } from '../../store/store.service';
import { WeatherService } from '../../services/weather.service';
import { JobsService } from '../../services/jobs.service';
import { LoaderComponent } from '../../loader/loader.component';
import { FormGroup, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { FileSizePipe } from '../Documents/filesize.pipe';
import { interval, Subscription, timeout } from 'rxjs';
import { DeleteDialogComponent } from './job-edit/delete-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmationDialogComponent } from './job-quote/confirmation-dialog.component';
const BASE_URL = environment.BACKEND_URL;
@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgForOf,
    MatButton,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatDivider,
    MatTooltipModule,
    LoaderComponent,
    GanttChartComponent,
    MatDialogModule,
    MatListModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule, // ✅ ADDED HERE
    MatInputModule,     // ✅ ADDED HERE
    FileSizePipe
  ],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy {
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('billOfMaterialsDialog') billOfMaterialsDialog!: TemplateRef<any>;
  @ViewChild('noteDialog') noteDialog!: TemplateRef<any>;

  taskData: any;
  subtasks: SubTasks = new SubTasks();
  calculatedSubtasks: { task: string; days: number; startDate: string; endDate: string }[] = [];
  projectDetails: any;
  startDateDisplay: any;
  initialStartDate: any;
  subTasksObtained: any;
  noteText: string = '';
  calculatedTables: { title: string; subtasks: any[] }[] = [];
  calculatedChainedTables: { title: string; startDate: Date; endDate: Date; subtasks: any[] }[] = [];
  documents: any[] = [];
  documentsError: string | null = null;
  alertMessage: string = '';
  isDialogOpened: boolean = false;
  isBomLoading: boolean = false;
  isBomProcessing: boolean = false;
  bomError: string | null = null;
  bom: any = null;
  processingResults: any[] = [];
  showAlert: boolean = false;
  routeURL: string = '';
  isLoading: boolean = false;
  isDocumentsLoading: boolean = false;
  isBrowser: boolean;
  weatherData: any;
  IsAIProcessed: boolean = false;
  currentNoteTarget: any = null;
  noteDialogRef: any;
  progress: number = 0;
  isUploading: boolean = false;
  uploadedFilesCount: number = 0;
  uploadedFileNames: string[] = [];
  uploadedFileUrls: string[] = [];
  jobCardForm: FormGroup;
  sessionId: string = '';
  private hubConnection!: HubConnection;

  private pollingSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private jobsService: JobsService,
    private weatherService: WeatherService,
    public store: Store<SubtasksState>,
    private router: Router,
    private dialog: MatDialog,
    private httpClient: HttpClient,

    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  get isDialogOpen(): boolean {
    return this.dialog.openDialogs.length > 0;
  }
sq
  ngOnInit() {
 this.sessionId = uuidv4();
   this.hubConnection = new HubConnectionBuilder()
   .withUrl('https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/progressHub')
      .configureLogging(LogLevel.Debug)
      .build();

    this.hubConnection.on('ReceiveProgress', (progress: number) => {
      const cappedProgress = Math.min(100, progress);
      this.progress = Math.min(100, 50 + Math.round((cappedProgress * 50) / 100));
      console.log(`Server-to-Azure Progress: ${this.progress}% (Raw SignalR: ${cappedProgress}%)`);
    });

    this.hubConnection.on('UploadComplete', (fileCount: number) => {
      this.isUploading = false;
      this.resetFileInput();
      console.log(`Server-to-Azure upload complete. Total ${this.uploadedFilesCount} file(s) uploaded.`);
      console.log('Current uploadedFileUrls:', this.uploadedFileUrls);
    });

    this.hubConnection
      .start()
      .then(() => console.log('SignalR connection established successfully'))
      .catch(err => console.error('SignalR Connection Error:', err));

    console.log(this.hubConnection.connectionId);

    this.route.queryParams.subscribe(params => {
      this.projectDetails = params;
      this.startDateDisplay = new Date(this.projectDetails.date).toISOString().split('T')[0];
    });

    this.jobsService.getJobSubtasks(this.projectDetails.jobId).subscribe({
      next: (data) => {
        const grouped = this.groupSubtasksByTitle(data);
        this.store.setState({ subtaskGroups: grouped });

        const mainTasks = this.extractMainTasksFromGroups(grouped);
        console.log(mainTasks);
        this.taskData = mainTasks;
        console.log('🟢 Final Gantt taskData:', this.taskData);
        this.createTables();
      },
      error: (err) => {
        if (err.status === 404) {
          // fallback to AI-parsed data
          this.jobsService.GetBillOfMaterials(this.projectDetails.jobId).subscribe({
            next: (results) => {
              const markdown = results[0]?.fullResponse;
              const parsedGroups = this.parseMarkdownToSubtasks(markdown);
              console.log(parsedGroups)
              const parsedMainTasks = this.parseMarkdownToMainTasks(markdown); // 👈 Here
          
              this.store.setState({ subtaskGroups: parsedGroups });
              this.taskData = parsedMainTasks; // 👈 This populates your Gantt chart
              this.createTables(); // You can call this too if you still want subtables
            }
          });
        } else {
          console.error('Error loading subtasks:', err);
          this.store.setState({ subtaskGroups: [] });
        }
      }
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

  extractMainTasksFromGroups(groups: { title: string, subtasks: any[] }[]): any[] {
    return groups.map((group, index) => {
      const subtasks = group.subtasks;
      if (!subtasks || subtasks.length === 0) return null;
  
      const start = new Date(subtasks[0].startDate);
      const end = new Date(subtasks[subtasks.length - 1].endDate);
  
      return {
        id: (index + 1).toString(),
        name: group.title,
        start,
        end,
        progress: 0,
        dependencies: null
      };
    }).filter(Boolean);
  }

  parseMarkdownToMainTasks(report: string): any[] {
    const lines = report.split('\n');
    const mainTasks: any[] = [];
  
    const parseDate = (line: string): string => {
      const match = line.match(/(\w+ \d{1,2}, \d{4})/);
      if (!match) return '';
      const parsed = new Date(match[1]);
      return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
    };
  
    const parseDuration = (line: string): number => {
      const match = line.match(/(\d+)\s*(day|week|month)/i);
      if (!match) return 0;
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      switch (unit) {
        case 'day': return value;
        case 'week': return value * 7;
        case 'month': return value * 30;
        default: return value;
      }
    };
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
  
      // Match headings like "# 1. Title" or "## # 2. Title"
      if (/^#+\s?#?\s?\d+[\.\)]?/.test(line)) {
        const title = line.replace(/^#+\s?#?\s?\d+[\.\)]?\s*/, '').trim();
        let start = '', end = '', days = 0;
  
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim().toLowerCase();
          if (nextLine.includes('duration')) {
            days = parseDuration(lines[j]);
          } else if (nextLine.includes('start')) {
            start = parseDate(lines[j]);
          } else if (nextLine.includes('end')) {
            end = parseDate(lines[j]);
            break; // assume last line for the task section
          }
        }
  
        if (start && end) {
          mainTasks.push({
            id: (mainTasks.length + 1).toString(),
            name: title,
            start: new Date(start),
            end: new Date(end),
            progress: 0,
            dependencies: null
          });
        }
      }
    }
  
    console.log('✅ Parsed main tasks for Gantt:', mainTasks);
    return mainTasks;
  }
  
  parseMarkdownToSubtasks(report: string): { title: string; subtasks: any[] }[] {
    const lines = report.split('\n');
    const subtasksGroups: { title: string; subtasks: any[] }[] = [];
  
    let currentGroup = '';
    let currentTasks: any[] = [];
  
    const parseDate = (text: string): string => {
      const match = text.match(/(\w+ \d{1,2}, \d{4})/);
      if (!match) return '';
      const parsed = new Date(match[1]);
      return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
    };
  
    const parseDuration = (text: string): number => {
      const match = text.match(/(\d+)\s*(day|week|month)/i);
      if (!match) return 0;
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      switch (unit) {
        case 'day': return value;
        case 'week': return value * 7;
        case 'month': return value * 30;
        default: return value;
      }
    };
  
    const isSubtaskHeader = (line: string) =>
      line.startsWith('**') && line.endsWith('**') &&
      !line.toLowerCase().includes('duration') &&
      !line.toLowerCase().includes('start') &&
      !line.toLowerCase().includes('end');
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
  
      // Detect group title
      if (line.startsWith('#')) {
        if (currentGroup && currentTasks.length > 0) {
          subtasksGroups.push({ title: currentGroup, subtasks: currentTasks });
        }
        currentGroup = line.replace(/^#+/, '').trim();
        currentTasks = [];
      }
  
      if (isSubtaskHeader(line)) {
        const task = line.replace(/\*\*/g, '').trim();
        let days = 0;
        let start = '', end = '';
  
        for (let j = i + 1; j < lines.length; j++) {
          const lookahead = lines[j].trim().toLowerCase();
          if (lookahead.includes('duration')) {
            days = parseDuration(lines[j]);
          } else if (lookahead.includes('start')) {
            start = parseDate(lines[j]);
          } else if (lookahead.includes('end')) {
            end = parseDate(lines[j]);
            break; // assume end date is last entry for this task
          }
        }
  
        if (start && end) {
          currentTasks.push({
            task,
            days,
            startDate: start,
            endDate: end,
            status: 'Pending',
            cost: 0,
            deleted: false
          });
        } else {
          console.warn(`Skipping invalid subtask "${task}" with missing date.`);
        }
      }
    }
  
    if (currentGroup && currentTasks.length > 0) {
      subtasksGroups.push({ title: currentGroup, subtasks: currentTasks });
    }
  
    return subtasksGroups;
  }
 
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) {
      console.error('No files selected');
      return;
    }

    const newFileNames = Array.from(input.files).map(file => file.name);
    this.uploadedFileNames = [...this.uploadedFileNames, ...newFileNames];

    const formData = new FormData();
    Array.from(input.files).forEach(file => {
      formData.append('Blueprint', file);
    });
    formData.append('Title', this.jobCardForm.get('Title')?.value || 'test');
    formData.append('Description', this.jobCardForm.get('Description')?.value || 'tester');
    formData.append('connectionId', this.hubConnection.connectionId || '');
    formData.append('sessionId', this.sessionId);

    this.progress = 0;
    this.isUploading = true;
    console.log('Starting file upload. Connection ID:', this.hubConnection.connectionId);

    this.httpClient
      .post<any>(BASE_URL + '/Jobs/UploadNoteImage', formData, {
        reportProgress: true,
        observe: 'events',
        headers: new HttpHeaders({ Accept: 'application/json' }),
      })
      .pipe(timeout(300000))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress = Math.round((50 * event.loaded) / event.total);
            console.log(`Client-to-API Progress: ${this.progress}% (Loaded: ${event.loaded}, Total: ${event.total})`);
          } else if (event.type === HttpEventType.Response) {
            console.log('Upload response:', event.body);
            const newFilesCount = newFileNames.length;
            this.uploadedFilesCount += newFilesCount;
            if (event.body?.fileUrls) {
              this.uploadedFileUrls = [...this.uploadedFileUrls, ...event.body.fileUrls];
              console.log('Updated uploadedFileUrls after upload:', this.uploadedFileUrls);
            } else {
              console.error('No fileUrls returned in response:', event.body);
            }
            this.resetFileInput();
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.progress = 0;
          this.isUploading = false;
          this.uploadedFileNames = this.uploadedFileNames.filter(name => !newFileNames.includes(name));
          this.resetFileInput();
        },
        complete: () => console.log('Client-to-API upload complete'),
      });
  }
  resetFileInput(): void {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      console.log('File input reset');
    }
  }
  private groupSubtasksByTitle(subtasks: any[]): { title: string; subtasks: any[] }[] {
    const groupedMap = new Map<string, any[]>();
  
    for (const st of subtasks) {
      const group = groupedMap.get(st.groupTitle) || [];
  
      const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0]; // format as yyyy-MM-dd
      };
  
      group.push({
        id: st.id, // ✅ lowercase 'id' (JS-native) instead of 'Id'
        task: st.task ?? st.taskName,
        days: st.days,
        startDate: formatDate(st.startDate),
        endDate: formatDate(st.endDate),
        status: st.status ?? 'Pending',
        cost: st.cost ?? 0,
        deleted: st.deleted ?? false
      });
  
      groupedMap.set(st.groupTitle, group);
    }
  
    return Array.from(groupedMap.entries()).map(([title, subtasks]) => ({
      title,
      subtasks
    }));
  }
  
  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }
  openNoteDialog(subtask: any): void {
    this.currentNoteTarget = subtask;
  
    this.noteDialogRef = this.dialog.open(this.noteDialog, {
      width: '250vw',
      height: '60vh',
      panelClass: 'subtask-note-dialog',
      data: {
        note: subtask?.note || '',  // ✅ supply a default value
        jobId: this.projectDetails?.jobId,
        subtaskId: subtask?.id,
        createdByUserId: localStorage.getItem('userId'),
        sessionId: this.sessionId
      }
    });
  }
  saveNoteDialog(): void {

    const userId: string | null = localStorage.getItem('userId');

    const formData = new FormData();
    formData.append("JobId", this.projectDetails.jobId);
    formData.append("UserIds", this.projectDetails.userId)
    formData.append("JobSubtaskId", this.currentNoteTarget.id);
    formData.append("NoteText", this.noteText);
    formData.append("CreatedByUserId", localStorage.getItem("userId") || "");
    formData.append("SessionId", this.sessionId);

    this.httpClient
    .post(BASE_URL + '/Jobs/SaveSubtaskNote', formData)
    .subscribe({
      next: () => {
        this.noteDialogRef.close();
      },
      error: (err) => {
        console.error('Failed to save subtask note:', err);
      }
    });
    this.jobCardForm.reset();
    this.uploadedFilesCount = 0;
    this.uploadedFileNames = [];
    this.uploadedFileUrls = [];
    this.noteText = '';
    this.noteDialogRef.close();
  }
  closeNoteDialog(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        console.log('Cancel clicked. uploadedFileUrls before deletion:', this.uploadedFileUrls);
        this.deleteTemporaryFiles();
        this.jobCardForm.reset();
        this.uploadedFilesCount = 0;
        this.uploadedFileNames = [];
        this.uploadedFileUrls = [];
        this.sessionId = uuidv4();
        this.noteDialogRef.close();
      }
    });
  }
deleteTemporaryFiles(): void {
 console.log('Deleting temporary files. uploadedFileUrls:', this.uploadedFileUrls);
 if (this.uploadedFileUrls.length === 0) {
   console.log('No temporary files to delete.');
   return;
 }

 this.httpClient.post(`${BASE_URL}/Jobs/DeleteTemporaryFiles`, {
   blobUrls: this.uploadedFileUrls,
 }).subscribe({
   next: () => {
     console.log('Temporary files deleted successfully');
     this.uploadedFileUrls = [];
     this.uploadedFilesCount = 0;
     this.uploadedFileNames = [];
   },
   error: (error) => {
     console.error('Error deleting temporary files:', error);
     this.uploadedFileUrls = [];
     this.uploadedFilesCount = 0;
     this.uploadedFileNames = [];
   },
 });
}
  openBillOfMaterialsDialog(): void {
    this.isBomLoading = true;
    this.isBomProcessing = false;
    this.bomError = null;
    this.bom = null;
    this.isDialogOpened = true;

    this.jobsService.GetBillOfMaterials(`${this.projectDetails.jobId}`).subscribe({
      next: (status: any) => {
        this.isBomProcessing = !status.isProcessingComplete;

        if (status.length > 0) {
          this.processingResults = status.map(doc => ({
            id: doc.id,
            jobId: doc.jobId,
            documentId: doc.DocumentId,
            bomJson: "",
            materialsEstimateJson: doc.materialsEstimateJson,
            fullResponse: doc.fullResponse,
            createdAt: doc.createdAt,
            parsedReport: this.parseReport(doc.fullResponse)
          }));
          this.IsAIProcessed = true;
          this.isBomLoading = false;
          this.dialog.open(this.billOfMaterialsDialog, { width: '20000px', maxHeight: '100vh', maxWidth: '150vw' });
        } else {
          this.bomError = status.message;
          this.IsAIProcessed = false;
          this.isBomLoading = false;
          this.dialog.open(this.billOfMaterialsDialog, { width: '20000px', maxHeight: '100h', maxWidth: '150vw'  });
        }
      },
      error: (error) => {
        this.bomError = error.error?.error || 'Failed to check AI processing status.';
        this.isBomLoading = false;
        this.dialog.open(this.billOfMaterialsDialog, { width: '1400px', maxHeight: '80vh' });
      }
    });
  }

  parseReport(fullResponse: string): any {
    const lines = fullResponse.split('\n').filter(line => line.trim());
    const sections: any[] = [];
    let currentSection: any = null;
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableContent: any[] = [];

    for (const line of lines) {
      // Detect section headers (##)
      if (line.startsWith('##')) {
        if (currentSection) {
          if (inTable) {
            currentSection.content = tableContent;
            inTable = false;
            tableHeaders = [];
            tableContent = [];
          }
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace('##', '').trim(),
          type: 'text',
          content: []
        };
      }
      // Detect table start (|)
      else if (line.includes('|') && currentSection) {
        if (!inTable) {
          inTable = true;
          currentSection.type = 'table';
          currentSection.content = [];
          // Parse headers
          tableHeaders = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          currentSection.headers = tableHeaders;
        } else if (line.includes('---')) {
          // Skip separator line
          continue;
        } else {
          // Parse table row
          const row = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          tableContent.push(row);
        }
      }
      // Detect list items (-)
      else if (line.startsWith('-') && currentSection) {
        if (inTable) {
          currentSection.content = tableContent;
          inTable = false;
          tableHeaders = [];
          tableContent = [];
          sections.push(currentSection);
          currentSection = {
            title: currentSection.title + ' (List)',
            type: 'list',
            content: []
          };
        } else if (currentSection.type !== 'list') {
          currentSection.type = 'list';
          currentSection.content = [];
        }
        currentSection.content.push(line.replace('-', '').trim());
      }
      // Regular text
      else if (currentSection) {
        if (inTable) {
          currentSection.content = tableContent;
          inTable = false;
          tableHeaders = [];
          tableContent = [];
          sections.push(currentSection);
          currentSection = {
            title: currentSection.title + ' (Text)',
            type: 'text',
            content: []
          };
        }
        currentSection.content.push(line.trim());
      }
    }

    // Push the last section
    if (currentSection) {
      if (inTable) {
        currentSection.content = tableContent;
      }
      sections.push(currentSection);
    }

    return { sections };
  }

  closeBillOfMaterialsDialog(): void {
    this.isDialogOpened = false;
    this.dialog.closeAll();
  }

  fetchDocuments(): void {
    this.isDocumentsLoading = true;
    this.documentsError = null;
    const jobId = this.projectDetails.jobId;
    this.jobsService.getJobDocuments(jobId).subscribe({
      next: (docs: any[]) => {
        this.documents = docs.map(doc => ({
          id: doc.id,
          name: doc.fileName,
          type: this.getFileType(doc.fileName),
          size: doc.size
        }));
        this.isDocumentsLoading = false;
      },
      error: (err) => {
        console.error('Error fetching documents:', err);
        this.documentsError = 'Failed to load documents.';
        this.isDocumentsLoading = false;
      }
    });
  }

  openDocumentsDialog() {
    const activeElement = document.activeElement as HTMLElement;
    this.fetchDocuments();
    const dialogRef = this.dialog.open(this.documentsDialog, {
      width: '500px',
      maxHeight: '80vh',
      autoFocus: true
    });
    dialogRef.afterClosed().subscribe(() => {
      if (activeElement) {
        activeElement.focus();
      }
    });
  }

  closeDocumentsDialog() {
    this.dialog.closeAll();
  }

  viewDocument(document: any) {
    this.jobsService.downloadJobDocument(document.id).subscribe({
      next: (response: Blob) => {
        const blob = new Blob([response], { type: document.type });
        const url = window.URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');
        if (!newTab) {
          this.alertMessage = 'Failed to open document. Please allow pop-ups for this site.';
          this.showAlert = true;
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        console.error('Error viewing document:', err);
        this.alertMessage = 'Failed to view document.';
        this.showAlert = true;
      }
    });
  }

  getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  fetchWeather(): void {
    const location = this.projectDetails.address;
    const date = this.startDateDisplay;
    this.weatherService.getFutureWeather(location, date).subscribe({
      next: (data) => {
        this.weatherData = data;
        console.log(this.weatherData);
        console.log('Weather Condition:', this.weatherData?.forecast?.forecastday[0]?.day?.condition?.text);
      },
      error: (err) => {
        this.weatherData = "No Weather Data as Data should be more than two weeks from now";
        console.error('Error:', err);
      },
    });
  }

  createTables(): void {
    const stateGroups = this.store.getState().subtaskGroups;
  
    const tables = [
      'Foundation Subtasks',
      'WallInsulation Subtasks',
      'WallStructure Subtasks',
      'Electrical & Plumbing Supply Needs Subtasks',
      'RoofInsulation Subtasks',
      'Roofing Subtasks',
      'Finishes Subtasks'
    ].map(title => ({
      title,
      subtasks: stateGroups.find(g => g.title === title)?.subtasks || []
    }));
  
    let currentStartDate = new Date(this.initialStartDate);
  
    this.calculatedChainedTables = tables.map(table => {
      const chainedSubtasks = this.chainSubtaskDates(table.subtasks, currentStartDate);
      const startDate = chainedSubtasks[0]?.startDate;
      const endDate = chainedSubtasks[chainedSubtasks.length - 1]?.endDate;
      const lastSubtaskEndDate = new Date(endDate);
      currentStartDate = new Date(lastSubtaskEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);
  
      return {
        title: table.title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        subtasks: chainedSubtasks
      };
    });
  
    // this.taskData = this.calculatedChainedTables.map((table, index) => ({
    //   id: (index + 1).toString(),
    //   name: table.title,
    //   start: table.startDate,
    //   end: table.endDate,
    //   progress: 0,
    //   dependencies: null
    // }));
  
    this.calculatedTables = tables.map(table => {
      const calculatedSubtasks = this.calculateSubtaskDates(table.subtasks, currentStartDate);
      const lastSubtaskEndDate = new Date(calculatedSubtasks[calculatedSubtasks.length - 1]?.endDate);
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


  updateSubtaskStatus(subtask: any) {
    if (!subtask.status) {
      subtask.status = 'Pending';
    }
  }
  
  addSubtask(table: any): void {
    const newSubtask = {
      task: '',
      days: 0,
      startDate: '',
      endDate: '',
      status: 'Pending' // Set it here, or call the method below
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

  closeAlert(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (this.routeURL) {
      this.router.navigateByUrl(this.routeURL);
    }
    this.showAlert = false;
    setTimeout(() => {
      if (activeElement) {
        activeElement.focus();
      } else {
        const firstActionButton = document.querySelector('.action-buttons button') as HTMLElement;
        if (firstActionButton) {
          firstActionButton.focus();
        }
      }
    }, 0);
  }

  publish() { 
    const updatedSubtaskGroups = this.store.getState().subtaskGroups.map(group => ({
      ...group,
      subtasks: group.subtasks.map(subtask => ({
        ...subtask,
      }))
    }));
  
    this.store.setState({ subtaskGroups: updatedSubtaskGroups });

    const dataInput = this.store.getState().subtaskGroups;
    console.log('Tasks in store for Published:', dataInput[0]);
    console.log('UserId :: ', localStorage.getItem("userId"));
    const projectData = this.prepareProjectData("PUBLISHED");

    this.isLoading = true;
    this.jobsService.updateJob(projectData, this.projectDetails.jobId).subscribe({
      next: response => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = "Published Job Successfully";
      },
      error: err => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = 'An unexpected error occurred. Contact support';
        console.error('Error:', err);
      }
    });
  }
  getVisibleSubtasks(table: any): any[] {
    return table.subtasks?.filter(s => !s.deleted) || [];
  }
  saveOnly() {
    const updatedSubtaskGroups = this.store.getState().subtaskGroups.map(group => ({
      ...group,
      subtasks: group.subtasks.map(({ id, task, days, startDate, endDate, cost, status, deleted }) => ({
        id, // 🟡 Required for update vs insert
        task,
        days,
        startDate,
        endDate,
        cost,
        status,
        groupTitle: group.title,
        deleted
      }))
    }));
  
    this.store.setState({ subtaskGroups: updatedSubtaskGroups });
  
    const jobData = this.prepareProjectData("DRAFT");
    const subtaskList = updatedSubtaskGroups.flatMap(group =>
      group.subtasks.map(subtask => ({
        ...subtask,
        groupTitle: group.title,
        jobId: this.projectDetails.jobId,
        deleted: subtask.deleted ?? false // ✅ default false if undefined
      }))
    );
  
    console.log('Job Data:', jobData);
    console.log('Subtasks:', subtaskList);
  
    this.isLoading = true;
  
    // First save job
    this.jobsService.updateJob(jobData, this.projectDetails.jobId).subscribe({
      next: response => {
        // Then save subtasks
        this.jobsService.saveSubtasks(subtaskList).subscribe({
          next: () => {
            this.isLoading = false;
            this.showAlert = true;
            this.alertMessage = "Saved Job Successfully";
          },
          error: err => {
            this.isLoading = false;
            this.showAlert = true;
            this.alertMessage = "Job saved, but subtasks failed.";
            console.error(err);
          }
        });
      },
      error: err => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = 'An unexpected error occurred while saving the job.';
        console.error('Job save error:', err);
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
    console.log('UserId :: ', localStorage.getItem("userId"));
    const projectData = this.prepareProjectData("DISCARD");

    this.isLoading = true;
    this.jobsService.updateJob(projectData, this.projectDetails.jobId).subscribe({
      next: response => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = "Discarded Job Successfully";
      },
      error: err => {
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = 'An unexpected error occurred. Contact support';
        console.error('Error:', err);
      }
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
      Id: this.projectDetails.jobId || 0, // Ensure valid ID
      ProjectName: this.projectDetails.projectName || "", // Required
      JobType: this.projectDetails.jobType || "", // Required
      Qty: Number(this.projectDetails.quantity) || 1, // Required
      DesiredStartDate: formattedDate(
          this.projectDetails.desiredStartDate 
              ? new Date(this.projectDetails.desiredStartDate) 
              : new Date()
      ), // Required, ISO format
      WallStructure: this.projectDetails.wallStructure || "", // Required
      WallStructureSubtask: JSON.stringify(dataInput[2]?.subtasks || []),
      WallInsulation: this.projectDetails.wallInsulation || "", // Required
      WallInsulationSubtask: JSON.stringify(dataInput[1]?.subtasks || []),
      RoofStructure: this.projectDetails.roofStructure || "", // Required
      RoofStructureSubtask: JSON.stringify(dataInput[5]?.subtasks || []),
      RoofTypeSubtask: "", // Missing in original; provide default
      RoofInsulation: this.projectDetails.roofInsulation || "",
      RoofInsulationSubtask: JSON.stringify(dataInput[4]?.subtasks || []),
      Foundation: this.projectDetails.foundation || "",
      FoundationSubtask: JSON.stringify(dataInput[0]?.subtasks || []),
      Finishes: this.projectDetails.finishes || "",
      FinishesSubtask: JSON.stringify(dataInput[6]?.subtasks || []),
      ElectricalSupplyNeeds: this.projectDetails.electricalSupply || "",
      ElectricalSupplyNeedsSubtask: JSON.stringify(dataInput[3]?.subtasks || []),
      Stories: Number(this.projectDetails.stories) || 0,
      BuildingSize: Number(this.projectDetails.buildingSize) || 0,
      Status: status || "DRAFT",
      OperatingArea: "GreenField",
      Address: this.projectDetails.address || "",
      UserId: localStorage.getItem("userId"), // Required
      Blueprint: this.projectDetails.blueprintPath || ""
      // Exclude navigation properties: User, Bids, Documents
  };
  }

  deleteSubtask(table: any, index: number): void {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      disableClose: true,
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Mark subtask as deleted in the table object
        table.subtasks[index].deleted = true;
  
        // 🟡 Also reflect it in the store
        const updatedState = this.store.getState().subtaskGroups.map(group => {
          if (group.title === table.title) {
            return {
              ...group,
              subtasks: [...table.subtasks]  // include the marked-deleted one
            };
          }
          return group;
        });
  
        this.store.setState({ subtaskGroups: updatedState });
      }
    });
  }
}