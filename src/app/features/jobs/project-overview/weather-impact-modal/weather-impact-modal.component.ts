import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JobUser } from '../../job-assignment/job-assignment.model';
import { LucideAngularModule, AlertCircle, X, Bell, Plus, ChevronRight, Send } from 'lucide-angular';

@Component({
  selector: 'app-weather-impact-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './weather-impact-modal.component.html',
  styleUrls: ['./weather-impact-modal.component.scss']
})
export class WeatherImpactModalComponent implements OnInit, OnChanges {
  @Input() forecast: any[] = [];
  @Input() affectedTasks: string[] = [];
  @Input() assignedTeamMembers: JobUser[] = [];
  @Input() currentCompletionDate: Date | null = null;
  @Input() estimatedCompletionDate: Date | null = null;
  @Input() totalDelayDays: number = 0;

  @Output() close = new EventEmitter<void>();
  @Output() adjustTimeline = new EventEmitter<void>();

  // Lucide Icons
  AlertCircle = AlertCircle;
  X = X;
  Bell = Bell;
  Plus = Plus;
  ChevronRight = ChevronRight;
  Send = Send;

  membersToNotify: any[] = [];
  isAddingMember: boolean = false;
  searchControl = new FormControl('');
  filteredAvailableMembers: any[] = [];

  ngOnInit(): void {
    this.initializeNotifications();

    this.searchControl.valueChanges.subscribe(val => {
        this.filterMembers(val || '');
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
      if (changes['assignedTeamMembers'] || changes['affectedTasks']) {
          this.initializeNotifications();
      }
  }

  initializeNotifications(): void {
      if (!this.assignedTeamMembers) return;

      // Smart recommendation logic:
      // If affected tasks contain trade keywords, try to find matching roles
      const tradeKeywords = this.affectedTasks.map(t => this.getTradeFromTask(t));

      this.membersToNotify = this.assignedTeamMembers.filter(m => {
          const role = (m.jobRole || '').toLowerCase();
          // Always notify Site Supervisors or PMs
          if (role.includes('supervisor') || role.includes('manager') || role.includes('project')) return true;

          // Notify trade leads if their trade is affected
          return tradeKeywords.some(keyword => role.includes(keyword));
      });

      // Filter available members initially
      this.filterMembers('');
  }

  private getTradeFromTask(taskName: string): string {
      const lower = taskName.toLowerCase();
      if (lower.includes('concrete')) return 'concrete';
      if (lower.includes('frame') || lower.includes('framing')) return 'carpenter';
      if (lower.includes('plumb')) return 'plumb';
      if (lower.includes('electric')) return 'electric';
      if (lower.includes('roof')) return 'roof';
      return 'general';
  }

  toggleAddMember(): void {
      this.isAddingMember = !this.isAddingMember;
      if (this.isAddingMember) {
          this.filterMembers(this.searchControl.value || '');
      }
  }

  filterMembers(searchTerm: string): void {
      const term = searchTerm.toLowerCase();
      const currentIds = new Set(this.membersToNotify.map(m => m.id));

      this.filteredAvailableMembers = this.assignedTeamMembers.filter(m => {
          if (currentIds.has(m.id)) return false; // Already selected

          const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
          const role = (m.jobRole || '').toLowerCase();

          return fullName.includes(term) || role.includes(term);
      });
  }

  addMember(member: any): void {
      this.membersToNotify.push(member);
      this.filterMembers(this.searchControl.value || '');
  }

  removeMember(member: any): void {
      this.membersToNotify = this.membersToNotify.filter(m => m.id !== member.id);
      this.filterMembers(this.searchControl.value || '');
  }

  onClose(): void {
      this.close.emit();
  }

  onAdjust(): void {
      this.adjustTimeline.emit();
  }
}
