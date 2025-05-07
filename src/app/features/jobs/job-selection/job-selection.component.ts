import { Component, OnInit, ChangeDetectorRef, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { NgForOf, NgIf, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../../services/jobs.service';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileSizePipe } from '../../Documents/filesize.pipe';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Quote } from '../../quote/quote.model';
import { QuoteDataService } from '../../quote/quote-data.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-job-selection',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatListModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FileSizePipe
  ],
  templateUrl: './job-selection.component.html',
  styleUrls: ['./job-selection.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class JobSelectionComponent implements OnInit {
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('billOfMaterialsDialog') billOfMaterialsDialog!: TemplateRef<any>;

  jobs: any[] = [];
  selectedJob: any = null;
  subtaskGroups: { title: string; subtasks: any[] }[] = [];
  selectedSubtasks: any[] = [];
  selectedTableTitle: string | null = null;
  isLoading: boolean = false;
  selectedGroupTitle: string | null = null;
  errorMessage: string = '';
  jobListFull: any[] = [];
  jobList: any[] = [];
  documents: any[] = [];
  documentsError: string | null = null;
  isDocumentsLoading: boolean = false;
  isBomLoading: boolean = false;
  bomError: string | null = null;
  processingResults: any[] = [];
  showAlert: boolean = false;
  alertMessage: string = '';

  private dummyJobs = [
    {
      Id: '1',
      ProjectName: 'Residential Build A',
      FoundationSubtask: JSON.stringify([
        { task: 'Concrete Pouring', cost: 5000, days: 5 },
        { task: 'Footing Installation', cost: 3000, days: 3 },
      ]),
      WallInsulationSubtask: JSON.stringify([
        { task: 'Fiberglass Insulation', cost: 2000, days: 2 },
      ]),
      WallStructureSubtask: JSON.stringify([
        { task: 'Wood Framing', cost: 4000, days: 4 },
      ]),
      ElectricalSupplyNeedsSubtask: JSON.stringify([
        { task: 'Wiring Installation', cost: 2500, days: 3 },
      ]),
      RoofInsulationSubtask: JSON.stringify([
        { task: 'Spray Foam Insulation', cost: 1800, days: 2 },
      ]),
      RoofStructureSubtask: JSON.stringify([
        { task: 'Truss Installation', cost: 3500, days: 4 },
      ]),
      FinishesSubtask: JSON.stringify([
        { task: 'Drywall Installation', cost: 2200, days: 3 },
        { task: 'Painting', cost: 1500, days: 2 },
      ]),
    },
    {
      Id: '2',
      ProjectName: 'Commercial Complex B',
      FoundationSubtask: JSON.stringify([
        { task: 'Slab Foundation', cost: 8000, days: 6 },
      ]),
      WallInsulationSubtask: JSON.stringify([
        { task: 'Batt Insulation', cost: 2500, days: 3 },
      ]),
      WallStructureSubtask: JSON.stringify([
        { task: 'Steel Framing', cost: 6000, days: 5 },
      ]),
      ElectricalSupplyNeedsSubtask: JSON.stringify([
        { task: 'Commercial Wiring', cost: 4000, days: 4 },
      ]),
      RoofInsulationSubtask: JSON.stringify([
        { task: 'Rigid Board Insulation', cost: 2000, days: 2 },
      ]),
      RoofStructureSubtask: JSON.stringify([
        { task: 'Flat Roof Installation', cost: 5000, days: 5 },
      ]),
      FinishesSubtask: JSON.stringify([
        { task: 'Acoustic Ceiling', cost: 3000, days: 3 },
      ]),
    },
  ];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private jobService: JobsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private quoteDataService: QuoteDataService
  ) {}

  ngOnInit(): void {
    this.fetchJobs();
    this.fetchUserJobs();
  }

  fetchJobs(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.jobs = this.dummyJobs;
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 500);
  }

  fetchUserJobs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.jobService.getAllJobsByUserId(userId).subscribe(
        (response) => {
          this.jobListFull = response || [];
          this.jobList = this.jobListFull;
          if (this.jobListFull.length > 0) {
            this.selectJobFromTable(this.jobListFull[0]);
          } else {
            this.errorMessage = 'No jobs found for this user.';
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error fetching jobs:', error);
          this.errorMessage = 'Failed to load jobs. Please try again.';
          this.isLoading = false;
          this.jobListFull = [];
          this.jobList = [];
          this.cdr.detectChanges();
        }
      );
    } else {
      console.error('User ID is not available in local storage.');
      this.errorMessage = 'User not logged in.';
      this.isLoading = false;
      this.jobListFull = [];
      this.jobList = [];
      this.cdr.detectChanges();
    }
  }

  selectJobFromTable(job: any): void {
    this.isLoading = true;
    this.selectedJob = null;
    this.subtaskGroups = [];
    this.selectedSubtasks = [];
    this.selectedTableTitle = null;
    this.errorMessage = '';

    this.jobService.getJobSubtasks(job.id).subscribe({
      next: (data) => {
        const grouped = this.groupSubtasksByTitle(data);
        this.subtaskGroups = grouped.map(group => ({
          ...group,
          subtasks: group.subtasks.map(subtask => ({
            ...subtask,
            selected: false,
          })),
        }));
        this.selectedJob = {
          Id: job.id,
          ProjectName: job.projectName,
          jobType: job.jobType,
          desiredStartDate: job.desiredStartDate,
          address: job.address,
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching subtasks:', err);
        this.errorMessage = 'Failed to load subtasks for the selected job.';
        this.selectedJob = {
          Id: job.id,
          ProjectName: job.projectName,
          jobType: job.jobType,
          desiredStartDate: job.desiredStartDate,
          address: job.address,
        };
        this.subtaskGroups = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  groupSubtasksByTitle(subtasks: any[]): { title: string; subtasks: any[] }[] {
    const groupedMap = new Map<string, any[]>();
    for (const st of subtasks) {
      const group = groupedMap.get(st.groupTitle) || [];
      const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0];
      };
      group.push({
        id: st.id,
        task: st.task ?? st.taskName,
        days: st.days,
        startDate: formatDate(st.startDate),
        endDate: formatDate(st.endDate),
        status: st.status ?? 'Pending',
        cost: st.cost ?? 0,
        deleted: st.deleted ?? false,
        selected: false,
      });
      groupedMap.set(st.groupTitle, group);
    }
    return Array.from(groupedMap.entries()).map(([title, subtasks]) => ({
      title,
      subtasks,
    }));
  }

  fetchSubtasksForJob(job: any): void {
    this.subtaskGroups = [
      { title: 'Foundation Subtasks', subtasks: JSON.parse(job.FoundationSubtask || '[]') },
      { title: 'Wall Insulation Subtasks', subtasks: JSON.parse(job.WallInsulationSubtask || '[]') },
      { title: 'Wall Structure Subtasks', subtasks: JSON.parse(job.WallStructureSubtask || '[]') },
      { title: 'Electrical Supply Needs Subtasks', subtasks: JSON.parse(job.ElectricalSupplyNeedsSubtask || '[]') },
      { title: 'Roof Insulation Subtasks', subtasks: JSON.parse(job.RoofInsulationSubtask || '[]') },
      { title: 'Roofing Subtasks', subtasks: JSON.parse(job.RoofStructureSubtask || '[]') },
      { title: 'Finishes Subtasks', subtasks: JSON.parse(job.FinishesSubtask || '[]') },
    ].map((group) => ({
      ...group,
      subtasks: group.subtasks.map((subtask: any) => ({
        ...subtask,
        selected: false,
      })),
    }));
  }

  toggleSubtaskSelection(subtask: any, tableTitle: string): void {
    // If first selection or still selecting within the same group
    if (!this.selectedGroupTitle || this.selectedGroupTitle === tableTitle) {
      this.selectedGroupTitle = tableTitle;
  
      if (subtask.selected) {
        this.selectedSubtasks.push({ ...subtask });
      } else {
        this.selectedSubtasks = this.selectedSubtasks.filter(
          s => s.id !== subtask.id || s.task !== subtask.task
        );
      }
    } else {
      // Different group selected — clear all others
      this.subtaskGroups.forEach(group => {
        group.subtasks.forEach(s => (s.selected = false));
      });
  
      // Reset selection with new subtask and group title
      this.selectedGroupTitle = tableTitle;
      subtask.selected = true;
      this.selectedSubtasks = [{ ...subtask }];
    }
  
    this.cdr.detectChanges();
  }

  createQuoteForSubtask(subtask: any): void {
    const quoteItems = [{
      description: subtask.task,
      quantity: subtask.days || 1,
      unitPrice: 0,
      total: 0,
    }];

    this.createQuote(quoteItems);
  }

  createQuoteForSelectedSubtasks(): void {
    if (this.subtaskGroups.length === 0) {
      this.showAlert = true;
      this.alertMessage = 'Please select at least one subtask to quote.';
      this.cdr.detectChanges();
      return;
    }

    const quoteItems = this.selectedSubtasks.map((subtask) => ({
      description: subtask.task,
      quantity: subtask.days || 1,
      unitPrice: subtask.cost || 0, // Include cost if available, else 0
      total: (subtask.days || 1) * (subtask.cost || 0),
    }));

    this.createQuote(quoteItems);
  }

  private createQuote(quoteItems: any[]): void {
    const newQuote: Quote = {
      id: uuidv4(),
      header: 'Quote',
      number: `QUO-${Math.floor(Math.random() * 10000)}`,
      from: 'Your Company Name',
      toTitle: 'To',
      to: this.selectedJob.ProjectName || 'Client Name',
      shipToTitle: 'Ship To',
      shipTo: this.selectedJob.address || 'Client Address',
      date: new Date().toISOString().split('T')[0],
      paymentTerms: 'Due on receipt',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      poNumber: '',
      itemHeader: 'Item',
      quantityHeader: 'Quantity',
      unitCostHeader: 'Rate',
      amountHeader: 'Amount',
      amountPaid: 0,
      extraCostValue: 0,
      taxValue: 0,
      discountValue: 0,
      flatTotalValue: 0,
      notesTitle: 'Notes',
      notes: '',
      termsTitle: 'Terms',
      terms: '',
      rows: quoteItems,
      total: 0,
      createdDate: new Date(),
      createdBy: localStorage.getItem('userId') || 'unknown',
      createdID: uuidv4(),
      extraCosts: [],
    };

    this.quoteDataService.setQuote(newQuote);
    this.router.navigate(['/quote']);
  }

  fetchDocuments(): void {
    this.isDocumentsLoading = true;
    this.documentsError = null;
    const jobId = this.selectedJob.Id;
    this.jobService.getJobDocuments(jobId).subscribe({
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

  openDocumentsDialog(): void {
    if (!this.selectedJob) {
      this.errorMessage = 'Please select a job first.';
      return;
    }
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

  closeDocumentsDialog(): void {
    this.dialog.closeAll();
  }

  viewDocument(document: any): void {
    this.jobService.downloadJobDocument(document.id).subscribe({
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
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      default: return 'application/octet-stream';
    }
  }

  openBillOfMaterialsDialog(): void {
    if (!this.selectedJob) {
      this.errorMessage = 'Please select a job first.';
      return;
    }
    this.isBomLoading = true;
    this.bomError = null;
    this.processingResults = [];
    this.jobService.GetBillOfMaterials(this.selectedJob.Id).subscribe({
      next: (status: any) => {
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
          this.isBomLoading = false;
          this.dialog.open(this.billOfMaterialsDialog, { width: '1800px', maxHeight: '90vh', panelClass: 'bill-of-materials-dialog' });
        } else {
          this.bomError = status.message || 'No bill of materials available.';
          this.isBomLoading = false;
          this.dialog.open(this.billOfMaterialsDialog, { width: '1800px', maxHeight: '90vh', panelClass: 'bill-of-materials-dialog' });
        }
      },
      error: (error) => {
        this.bomError = error.error?.error || 'Failed to load bill of materials.';
        this.isBomLoading = false;
        this.dialog.open(this.billOfMaterialsDialog, { width: '1800px', maxHeight: '90vh', panelClass: 'bill-of-materials-dialog' });
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
      } else if (line.includes('|') && currentSection) {
        if (!inTable) {
          inTable = true;
          currentSection.type = 'table';
          currentSection.content = [];
          tableHeaders = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          currentSection.headers = tableHeaders;
        } else if (line.includes('---')) {
          continue;
        } else {
          const row = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          tableContent.push(row);
        }
      } else if (line.startsWith('-') && currentSection) {
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
      } else if (currentSection)
        {if (inTable) {
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
    if (currentSection) {
      if (inTable) {
        currentSection.content = tableContent;
      }
      sections.push(currentSection);
    }
    return { sections };
  }

  closeBillOfMaterialsDialog(): void {
    this.dialog.closeAll();
  }

  closeAlert(): void {
    this.showAlert = false;
    this.cdr.detectChanges();
  }
}