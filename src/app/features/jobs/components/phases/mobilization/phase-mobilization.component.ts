import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../../../authentication/auth.service';
import { BidsService } from '../../../../../services/bids.service';
import { JobsService } from '../../../../../services/jobs.service';
import { TeamManagementService } from '../../../../../services/team-management.service';
import { TimelineService } from '../../../services/timeline.service';
import { JobAssignment, JobUser } from '../../../job-assignment/job-assignment.model';
import { JobAssignmentService } from '../../../job-assignment/job-assignment.service';
import { BomService } from '../../../services/bom.service';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  rate?: string;
  experience?: string;
  certifications?: string;
  currentProject?: string;
  lane: 'office' | 'field';
  available: boolean;
  fromScopeReview?: boolean;
}

type AssignmentConflictAction = 'keep-both' | 'move-from-other' | null;

interface PendingInvite {
  name: string;
  email: string;
  role: string;
}

interface TradePackage {
  id: number;
  jobId: number;
  trade: string;
  category: string;
  scopeOfWork: string;
  csiCode: string;
  estimatedManHours: number | null;
  estimatedDuration?: string;
  startDate?: string | Date | null;
  bidDeadline?: string | Date | null;
  budget: number;
  laborBudget: number;
  materialBudget: number;
  totalBudget: number;
  laborType?: string;
  status: string;
  postedToMarketplace: boolean;
  isInHouse: boolean;
  awardedBidId?: number | null;
  linkedTradePackageId?: number | null;
  isInactive?: boolean;
  isHidden?: boolean;
}

interface VendorPartner {
  id: string;
  category: string;
  company: string;
  contact: string;
  value: number;
  status: 'confirmed' | 'pending';
  lead: string;
  isInHouse: boolean;
}

interface TradeBid {
  id: number;
  tradePackageId: number;
  companyName: string;
  contact: string;
  phone: string;
  email: string;
  amount: number;
  status: string;
}

@Component({
  selector: 'app-phase-mobilization',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule, PhaseNavigationHeaderComponent],
  templateUrl: './phase-mobilization.component.html',
  styleUrl: './phase-mobilization.component.scss',
})
export class PhaseMobilizationComponent implements OnInit, OnChanges {
  @Input() projectDetails: any;
  @Input() assignedTeamMembers: JobUser[] = [];
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() goLive = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();
  @Output() startDateSaved = new EventEmitter<string>();

  startDate = '';
  private hydratedStartDateForJobId: number | null = null;
  private suppressStartDatePersist = false;
  showInviteForm = false;
  inviteName = '';
  inviteEmail = '';
  inviteRole = '';
  teamSearch = '';
  showOnlyAvailable = false;
  selectedTeamMember: TeamMember | null = null;
  conflictMember: TeamMember | null = null;
  conflictRemovalJobIds = new Set<number>();
  isLoadingTradeData = false;
  tradeDataLoadFailed = false;
  goLiveDialogOpen = false;
  isLoadingTeamData = false;
  private assignmentJobsByUserId = new Map<string, JobAssignment[]>();

  teamMembers: TeamMember[] = [];
  private orgTeamMembers: TeamMember[] = [];
  private scopeTeamMembers: TeamMember[] = [];
  private invitedTeamMembers: TeamMember[] = [];

  assignedMembers = new Set<string>([]);
  pendingInvites: PendingInvite[] = [];

  tradePackages: TradePackage[] = [];
  bidsByPackageId: Record<number, TradeBid[]> = {};
  awardedBidByPackageId: Record<number, number> = {};

  expandedTradeIds = new Set<number>();

  constructor(
    private readonly authService: AuthService,
    private readonly teamManagementService: TeamManagementService,
    private readonly jobAssignmentService: JobAssignmentService,
    private readonly jobsService: JobsService,
    private readonly timelineService: TimelineService,
    private readonly bomService: BomService,
    private readonly bidsService: BidsService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.hydrateStartDateFromProjectDetails();
    this.loadAssignmentSnapshot();
    this.loadOrganizationTeamMembers();
    this.hydrateTeamFromScopeReview();
    this.loadMobilizationTradeData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assignedTeamMembers']) {
      this.hydrateTeamFromScopeReview();
    }

    if (changes['projectDetails']) {
      this.hydrateStartDateFromProjectDetails();
      const previousJobId = this.resolveJobIdFromDetails(changes['projectDetails'].previousValue);
      const currentJobId = this.resolveJobIdFromDetails(changes['projectDetails'].currentValue);
      if (previousJobId !== currentJobId) {
        this.loadAssignmentSnapshot();
        this.loadMobilizationTradeData();
      }
      this.rebuildTeamMembers();
    }
  }

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize;
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '';
    }

    return Math.round(numeric * 0.0929).toLocaleString();
  }

  get officeTeam(): TeamMember[] {
    return this.filterTeamByLane('office');
  }

  get fieldTeam(): TeamMember[] {
    return this.filterTeamByLane('field');
  }

  get assignedOfficeCount(): number {
    return this.officeTeam.filter((m) => this.assignedMembers.has(m.id)).length;
  }

  get assignedFieldCount(): number {
    return this.fieldTeam.filter((m) => this.assignedMembers.has(m.id)).length;
  }

  get assignedMembersCount(): number {
    return this.assignedMembers.size;
  }

  get carriedOverAssignedCount(): number {
    return this.teamMembers.filter((member) => member.fromScopeReview && this.assignedMembers.has(member.id)).length;
  }

  get assignedTradeCount(): number {
    return this.subcontractorTrades.filter((trade) => !!this.getTradeContact(trade)).length;
  }

  get isStartDateSet(): boolean {
    return !!this.startDate && !this.isPlaceholderStartDate(this.startDate);
  }

  get shouldShowScheduledDate(): boolean {
    return !!this.startDate && !this.isPlaceholderStartDate(this.startDate);
  }

  get hasAssignedMembers(): boolean {
    return this.assignedMembers.size > 0;
  }

  get hasTradePartnersReady(): boolean {
    return this.subcontractorTrades.some((trade) => !!this.getTradeContact(trade));
  }

  get availableCount(): number {
    return this.teamMembers.filter((member) => member.available).length;
  }

  get canGoLive(): boolean {
    return this.isStartDateSet && this.hasAssignedMembers;
  }

  get goLiveProjectName(): string {
    return String(this.projectDetails?.projectName || '').trim() || 'Hernandez Residence';
  }

  get goLiveAssignedSubcontractorsCount(): number {
    return this.subcontractorTrades.filter((trade) => this.getTradeMobilizationStatus(trade) === 'confirmed').length;
  }

  get goLiveVendorSupplierCount(): number {
    const vendors = this.vendorPartners.filter((partner) => partner.status === 'confirmed').length;
    const suppliers = this.supplierPartners.filter((partner) => partner.status === 'confirmed').length;
    return vendors + suppliers;
  }

  get readinessPercent(): number {
    const score =
      Number(this.isStartDateSet) +
      Number(this.assignedOfficeCount > 0) +
      Number(this.assignedFieldCount > 0) +
      Number(this.hasTradePartnersReady);

    return (score / 4) * 100;
  }

  openGoLiveDialog(): void {
    if (!this.canGoLive) {
      return;
    }

    this.goLiveDialogOpen = true;
  }

  closeGoLiveDialog(): void {
    this.goLiveDialogOpen = false;
  }

  confirmGoLive(): void {
    this.goLiveDialogOpen = false;
    this.goLive.emit();
  }

  toggleMemberAssignment(memberId: string): void {
    const member = this.teamMembers.find((m) => m.id === memberId);
    if (!member) {
      return;
    }

    const isAssigned = this.assignedMembers.has(memberId);
    const jobId = this.resolvedJobId();

    if (!jobId || this.isEphemeralMember(member)) {
      this.setMemberAssigned(memberId, !isAssigned);
      return;
    }

    const link = {
      userId: member.id,
      jobId,
      jobRole: member.role || 'Team Member',
    };

    if (isAssigned) {
      this.jobAssignmentService.deleteUserAssignment(link).subscribe({
        next: () => this.setMemberAssigned(memberId, false),
        error: () => {
          this.snackBar.open('Failed to remove team member assignment.', 'Close', {
            duration: 3000,
          });
        },
      });
      return;
    }

    this.jobAssignmentService.createJobAssignment(link).subscribe({
      next: () => this.setMemberAssigned(memberId, true),
      error: () => {
        this.snackBar.open('Failed to assign team member to this project.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  openTeamMemberDetail(member: TeamMember): void {
    this.selectedTeamMember = member;
  }

  closeTeamMemberDetail(): void {
    this.selectedTeamMember = null;
  }

  assignSelectedTeamMember(): void {
    if (!this.selectedTeamMember) return;

    const currentJobId = this.resolvedJobId();
    const hasOtherAssignments =
      this.assignmentsForOtherJobs(this.selectedTeamMember.id, currentJobId).length > 0;

    if (!this.assignedMembers.has(this.selectedTeamMember.id)) {
      if (hasOtherAssignments) {
        this.conflictMember = this.selectedTeamMember;
        this.initializeConflictRemovalSelection();
        return;
      }

      this.toggleMemberAssignment(this.selectedTeamMember.id);
    }
    this.closeTeamMemberDetail();
  }

  removeSelectedTeamMember(): void {
    if (!this.selectedTeamMember) return;
    if (this.assignedMembers.has(this.selectedTeamMember.id)) {
      this.toggleMemberAssignment(this.selectedTeamMember.id);
    }
    this.closeTeamMemberDetail();
  }

  sendInvite(): void {
    if (!this.inviteName.trim() || !this.inviteEmail.trim() || !this.inviteRole.trim()) {
      return;
    }

    const newId = `invite-${Date.now()}`;
    this.invitedTeamMembers = [
      ...this.invitedTeamMembers,
      {
        id: newId,
        name: this.inviteName.trim(),
        role: this.inviteRole.trim(),
        phone: 'Pending',
        email: this.inviteEmail.trim(),
        lane: this.inferLane(this.inviteRole),
        available: true,
      },
    ];
    this.rebuildTeamMembers();

    this.assignedMembers = new Set([...this.assignedMembers, newId]);

    this.pendingInvites = [
      ...this.pendingInvites,
      {
        name: this.inviteName.trim(),
        email: this.inviteEmail.trim(),
        role: this.inviteRole.trim(),
      },
    ];

    this.inviteName = '';
    this.inviteEmail = '';
    this.inviteRole = '';
    this.showInviteForm = false;
  }

  removeInvite(index: number): void {
    this.pendingInvites = this.pendingInvites.filter((_, idx) => idx !== index);
  }

  toggleTradeExpanded(tradeId: number): void {
    const next = new Set(this.expandedTradeIds);
    if (next.has(tradeId)) {
      next.delete(tradeId);
    } else {
      next.add(tradeId);
    }
    this.expandedTradeIds = next;
  }

  getMemberInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  private hydrateTeamFromScopeReview(): void {
    if (!Array.isArray(this.assignedTeamMembers) || this.assignedTeamMembers.length === 0) {
      this.scopeTeamMembers = [];
      this.assignedMembers = new Set<string>();
      this.rebuildTeamMembers();
      return;
    }

    this.scopeTeamMembers = this.assignedTeamMembers.map((member) => {
      const first = String(member.firstName || '').trim();
      const last = String(member.lastName || '').trim();
      const fullName = `${first} ${last}`.trim() || member.email || 'Team Member';
      const role = String(member.jobRole || member.userType || 'Team Member').trim();

      return {
        id: String(member.id || member.email || fullName).trim(),
        name: fullName,
        role,
        phone: String(member.phoneNumber || 'No phone listed').trim(),
        email: String(member.email || '').trim(),
        rate: undefined,
        experience: undefined,
        certifications: undefined,
        currentProject: 'None',
        lane: this.inferLane(role),
        available: true,
        fromScopeReview: true,
      };
    });

    this.assignedMembers = new Set(this.scopeTeamMembers.map((member) => member.id));
    this.rebuildTeamMembers();
  }

  private loadOrganizationTeamMembers(): void {
    const currentUser = this.authService.currentUserSubject.value;
    const userId = currentUser?.isTeamMember ? currentUser?.inviterId : currentUser?.id;
    if (!userId) {
      this.orgTeamMembers = [];
      this.rebuildTeamMembers();
      return;
    }

    this.isLoadingTeamData = true;

    this.teamManagementService
      .getTeamMembers(String(userId))
      .pipe(catchError(() => of([])))
      .subscribe((members: any[]) => {
    this.orgTeamMembers = (Array.isArray(members) ? members : []).map((member: any) => {
          const first = String(member.firstName || '').trim();
          const last = String(member.lastName || '').trim();
          const fullName = `${first} ${last}`.trim() || member.email || 'Team Member';
          const role = this.formatRoleLabel(
            String(member.jobRole || member.role || member.userType || 'Team Member').trim(),
          );
          const status = String(member.status || '').toLowerCase();
          const isAvailable = status !== 'deactivated' && status !== 'deleted';

          return {
            id: String(member.id || member.email || fullName).trim(),
            name: fullName,
            role,
            phone: String(member.phoneNumber || 'No phone listed').trim(),
            email: String(member.email || '').trim(),
            currentProject: String(member.currentProject || member.assignedProject || 'None').trim(),
            lane: this.inferLane(role),
            available: isAvailable,
          } as TeamMember;
        });

        this.isLoadingTeamData = false;
        this.rebuildTeamMembers();
      });
  }

  private rebuildTeamMembers(): void {
    const merged = new Map<string, TeamMember>();

    [...this.orgTeamMembers, ...this.scopeTeamMembers, ...this.invitedTeamMembers].forEach((member) => {
      const key = String(member.id || member.email || member.name).trim().toLowerCase();
      if (!key) {
        return;
      }

      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, member);
        return;
      }

      merged.set(key, {
        ...existing,
        ...member,
        fromScopeReview: existing.fromScopeReview || member.fromScopeReview,
      });
    });

    const currentJobId = this.resolvedJobId();

    this.teamMembers = Array.from(merged.values()).map((member) => {
      const otherAssignments = this.assignmentsForOtherJobs(member.id, currentJobId);
      const existingCurrentProject = String(member.currentProject || '').trim();
      const inferredCurrentProject =
        otherAssignments[0]?.projectName ||
        (otherAssignments[0]?.id ? `Job #${otherAssignments[0].id}` : 'None');

      return {
        ...member,
        role: this.formatRoleLabel(member.role),
        currentProject:
          otherAssignments.length > 0
            ? inferredCurrentProject
            : existingCurrentProject || 'None',
        available: member.available && otherAssignments.length === 0,
      };
    });
  }

  private loadAssignmentSnapshot(): void {
    this.jobAssignmentService
      .getJobAssignment()
      .pipe(catchError(() => of([])))
      .subscribe((assignments: JobAssignment[]) => {
        const map = new Map<string, JobAssignment[]>();

        (Array.isArray(assignments) ? assignments : []).forEach((job) => {
          (job.jobUser || []).forEach((user) => {
            const key = String(user.id || '').trim().toLowerCase();
            if (!key) {
              return;
            }
            if (!map.has(key)) {
              map.set(key, []);
            }
            map.get(key)!.push(job);
          });
        });

        this.assignmentJobsByUserId = map;
        this.rebuildTeamMembers();
      });
  }

  private assignmentsForOtherJobs(memberId: string, currentJobId: number | null): JobAssignment[] {
    const key = String(memberId || '').trim().toLowerCase();
    const jobs = this.assignmentJobsByUserId.get(key) || [];
    return jobs.filter((job) => Number(job.id || 0) !== Number(currentJobId || 0));
  }

  keepMemberOnBothProjects(): void {
    this.resolveAssignmentConflict('keep-both');
  }

  moveMemberToThisProjectOnly(): void {
    this.resolveAssignmentConflict('move-from-other');
  }

  cancelAssignmentConflict(): void {
    this.conflictMember = null;
    this.conflictRemovalJobIds = new Set<number>();
  }

  onStartDateChanged(value: string): void {
    this.startDate = value;
    if (this.suppressStartDatePersist) {
      return;
    }

    const jobId = this.resolvedJobId();
    if (!jobId || !value) {
      return;
    }

    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      this.snackBar.open('Invalid start date.', 'Close', { duration: 3000 });
      return;
    }

    const isoDate = parsedDate.toISOString();

    this.jobsService.getSpecificJob(jobId).subscribe({
      next: (job) => {
        if (!job) {
          this.snackBar.open('Failed to load project before saving date.', 'Close', { duration: 3000 });
          return;
        }

        const payload = {
          ...job,
          desiredStartDate: isoDate,
          DesiredStartDate: isoDate,
        };

        this.jobsService.updateJob(payload, jobId).subscribe({
          next: () => {
            this.projectDetails = {
              ...(this.projectDetails || {}),
              desiredStartDate: isoDate,
              DesiredStartDate: isoDate,
              date: isoDate,
            };

            const senderId = this.authService.getUserId() || '';
            this.timelineService
              .shiftTimelineToStartDate(parsedDate, jobId, senderId)
              .subscribe({
                next: () => {
                  this.startDateSaved.emit(isoDate);
                },
                error: () => {
                  this.startDateSaved.emit(isoDate);
                  this.snackBar.open(
                    'Start date saved, but timeline tasks could not be shifted.',
                    'Close',
                    { duration: 4500 },
                  );
                },
              });
          },
          error: () => {
            this.snackBar.open('Failed to save start date.', 'Close', { duration: 3000 });
          },
        });
      },
      error: () => {
        this.snackBar.open('Failed to load project before saving date.', 'Close', { duration: 3000 });
      },
    });
  }

  conflictAssignments(): JobAssignment[] {
    if (!this.conflictMember) {
      return [];
    }

    return this.assignmentsForOtherJobs(this.conflictMember.id, this.resolvedJobId());
  }

  isConflictRemovalSelected(jobId: number): boolean {
    return this.conflictRemovalJobIds.has(Number(jobId));
  }

  toggleConflictRemovalJob(jobId: number): void {
    const normalized = Number(jobId);
    const next = new Set(this.conflictRemovalJobIds);
    if (next.has(normalized)) {
      next.delete(normalized);
    } else {
      next.add(normalized);
    }
    this.conflictRemovalJobIds = next;
  }

  selectAllConflictJobs(): void {
    this.conflictRemovalJobIds = new Set(this.conflictAssignments().map((job) => Number(job.id || 0)));
  }

  clearConflictJobs(): void {
    this.conflictRemovalJobIds = new Set<number>();
  }

  private resolveAssignmentConflict(action: AssignmentConflictAction): void {
    const member = this.conflictMember;
    if (!member || !action) {
      this.conflictMember = null;
      return;
    }

    const jobId = this.resolvedJobId();
    if (!jobId) {
      this.conflictMember = null;
      return;
    }

    const addLink = {
      userId: member.id,
      jobId,
      jobRole: member.role || 'Team Member',
    };

    if (action === 'keep-both') {
      this.jobAssignmentService.createJobAssignment(addLink).subscribe({
        next: () => {
          this.setMemberAssigned(member.id, true);
          this.loadAssignmentSnapshot();
          this.conflictMember = null;
          this.closeTeamMemberDetail();
        },
        error: () => {
          this.snackBar.open('Failed to assign team member to this project.', 'Close', {
            duration: 3000,
          });
        },
      });
      return;
    }

    const currentJobId = this.resolvedJobId();
    const otherJobs = this.assignmentsForOtherJobs(member.id, currentJobId);
    if (otherJobs.length === 0) {
      this.conflictMember = null;
      this.toggleMemberAssignment(member.id);
      return;
    }

    const selectedRemovalJobIds = [...this.conflictRemovalJobIds].filter((id) =>
      otherJobs.some((job) => Number(job.id) === Number(id)),
    );

    if (selectedRemovalJobIds.length === 0) {
      this.snackBar.open('Select at least one project to remove this member from.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const deleteRequests = selectedRemovalJobIds.map((jobIdToRemove) =>
      this.jobAssignmentService.deleteUserAssignment({
        userId: member.id,
        jobId: Number(jobIdToRemove),
        jobRole: member.role || 'Team Member',
      }),
    );

    forkJoin(deleteRequests).subscribe({
      next: () => {
        this.jobAssignmentService.createJobAssignment(addLink).subscribe({
          next: () => {
            this.setMemberAssigned(member.id, true);
            this.loadAssignmentSnapshot();
            this.conflictMember = null;
            this.conflictRemovalJobIds = new Set<number>();
            this.closeTeamMemberDetail();
          },
          error: () => {
            this.snackBar.open('Failed to assign team member to this project.', 'Close', {
              duration: 3000,
            });
          },
        });
      },
      error: () => {
        this.snackBar.open('Failed to remove team member from the other project.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  private initializeConflictRemovalSelection(): void {
    this.conflictRemovalJobIds = new Set(this.conflictAssignments().map((job) => Number(job.id || 0)));
  }

  private formatRoleLabel(rawRole: string): string {
    const value = String(rawRole || '').trim();
    if (!value) {
      return 'Team Member';
    }

    return value
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private setMemberAssigned(memberId: string, shouldAssign: boolean): void {
    const next = new Set(this.assignedMembers);
    if (shouldAssign) {
      next.add(memberId);
    } else {
      next.delete(memberId);
    }
    this.assignedMembers = next;
  }

  private isEphemeralMember(member: TeamMember): boolean {
    return String(member.id || '').startsWith('invite-');
  }

  private inferLane(role: string): 'office' | 'field' {
    const normalized = String(role || '').toLowerCase();
    if (
      normalized.includes('superintendent') ||
      normalized.includes('foreman') ||
      normalized.includes('field') ||
      normalized.includes('site') ||
      normalized.includes('crew')
    ) {
      return 'field';
    }

    return 'office';
  }

  private filterTeamByLane(lane: 'office' | 'field'): TeamMember[] {
    const search = this.teamSearch.trim().toLowerCase();
    return this.teamMembers.filter((member) => {
      if (member.lane !== lane) {
        return false;
      }

      if (this.showOnlyAvailable && !member.available) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = `${member.name} ${member.role} ${member.phone}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  get subcontractorTrades(): TradePackage[] {
    const subcontractors = this.tradePackages.filter((pkg) => {
      const category = String(pkg.category || '').toLowerCase();
      return category !== 'vendor' && category !== 'supplier';
    });

    const deduped = new Map<string, TradePackage>();
    const tradeScore = (pkg: TradePackage): number => {
      const status = String(pkg.status || '').trim().toLowerCase();
      const linkedId = Number(pkg.linkedTradePackageId || 0);
      return (linkedId > 0 ? 3 : 0) + (status === 'in house' ? 2 : 0) + (status !== 'n/a' ? 1 : 0);
    };

    subcontractors.forEach((pkg) => {
      const category = String(pkg.category || '').trim().toLowerCase();
      const trade = String(pkg.trade || '').trim().toLowerCase();
      const csi = String(pkg.csiCode || '').trim().toLowerCase();
      const key = `${category}|${trade}|${csi}`;

      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, pkg);
        return;
      }

      if (tradeScore(pkg) > tradeScore(existing)) {
        deduped.set(key, pkg);
      }
    });

    return Array.from(deduped.values());
  }

  get vendorPartners(): VendorPartner[] {
    return this.buildPartnersByCategory('vendor');
  }

  get supplierPartners(): VendorPartner[] {
    return this.buildPartnersByCategory('supplier');
  }

  getTradeMobilizationStatus(trade: TradePackage): 'confirmed' | 'pending' {
    return this.getTradeContact(trade) ? 'confirmed' : 'pending';
  }

  tradeDurationLabel(trade: TradePackage): string {
    return String(trade.estimatedDuration || '').trim() || 'TBD';
  }

  getTradeContact(trade: TradePackage): {
    company: string;
    contact: string;
    phone: string;
    email: string;
    amount: number;
    manHours: number | null;
  } | null {
    if (trade.isInHouse) {
      return {
        company: 'In-House Team',
        contact: 'Internal Crew Coordinator',
        phone: '--',
        email: '--',
        amount: this.itemBudget(trade),
        manHours: trade.estimatedManHours,
      };
    }

    const awardedBidId = Number(this.awardedBidByPackageId[trade.id] || trade.awardedBidId || 0);
    if (!awardedBidId) {
      return null;
    }

    const awardedBid = this.bidsForTrade(trade).find((bid) => bid.id === awardedBidId);
    if (!awardedBid) {
      return null;
    }

    return {
      company: awardedBid.companyName || 'Awarded subcontractor',
      contact: awardedBid.contact || 'N/A',
      phone: awardedBid.phone || 'N/A',
      email: awardedBid.email || 'N/A',
      amount: Number(awardedBid.amount || this.itemBudget(trade)),
      manHours: trade.estimatedManHours,
    };
  }

  private loadMobilizationTradeData(): void {
    const jobId = this.resolvedJobId();
    if (!jobId) {
      this.tradePackages = [];
      this.bidsByPackageId = {};
      this.awardedBidByPackageId = {};
      this.tradeDataLoadFailed = false;
      return;
    }

    this.isLoadingTradeData = true;
    this.tradeDataLoadFailed = false;

    forkJoin({
      packages: this.bomService.getTradePackages(String(jobId)).pipe(catchError(() => of([]))),
      bids: this.bidsService.getBidsForJob(String(jobId)).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ packages, bids }) => {
        this.tradePackages = (Array.isArray(packages) ? packages : []).map((pkg: any) => ({
          id: Number(pkg.id || 0),
          jobId: Number(pkg.jobId || jobId),
          trade: String(pkg.trade || pkg.tradeName || '').trim(),
          category: String(pkg.category || 'trade').toLowerCase(),
          scopeOfWork: String(pkg.scopeOfWork || '').trim(),
          csiCode: String(pkg.csiCode || '').trim(),
          estimatedManHours:
            pkg.estimatedManHours === null || pkg.estimatedManHours === undefined
              ? null
              : Number(pkg.estimatedManHours),
          estimatedDuration: String(pkg.estimatedDuration || '').trim(),
          startDate: pkg.startDate || null,
          bidDeadline: pkg.bidDeadline || null,
          budget: Number(pkg.budget || 0),
          laborBudget: Number(pkg.laborBudget || 0),
          materialBudget: Number(pkg.materialBudget || 0),
          totalBudget: Number(pkg.totalBudget || pkg.budget || 0),
          laborType: String(pkg.laborType || '').trim(),
          status: String(pkg.status || '').trim(),
          postedToMarketplace: !!pkg.postedToMarketplace,
          isInHouse: !!pkg.isInHouse,
          awardedBidId: Number(pkg.awardedBidId || 0) || null,
          linkedTradePackageId: Number(pkg.linkedTradePackageId || 0) || null,
          isInactive: !!pkg.isInactive,
          isHidden: !!pkg.isHidden,
        }));

        this.awardedBidByPackageId = this.tradePackages.reduce(
          (acc, pkg) => {
            const awardedBidId = Number(pkg.awardedBidId || 0);
            if (awardedBidId > 0) {
              acc[pkg.id] = awardedBidId;
            }
            return acc;
          },
          {} as Record<number, number>,
        );

        this.bidsByPackageId = {};
        (Array.isArray(bids) ? bids : []).forEach((bid: any) => {
          const packageId = Number(bid.tradePackageId || 0);
          if (!packageId) {
            return;
          }

          if (!this.bidsByPackageId[packageId]) {
            this.bidsByPackageId[packageId] = [];
          }

          this.bidsByPackageId[packageId].push({
            id: Number(bid.id || 0),
            tradePackageId: packageId,
            companyName: String(bid.companyName || '').trim(),
            contact: String(bid.contact || '').trim(),
            phone: String(bid.phone || '').trim(),
            email: String(bid.email || '').trim(),
            amount: Number(bid.amount || 0),
            status: String(bid.status || '').trim(),
          });

          if (String(bid.status || '').trim().toLowerCase() === 'awarded' && Number(bid.id || 0) > 0) {
            this.awardedBidByPackageId[packageId] = Number(bid.id);
          }
        });

        this.isLoadingTradeData = false;
      },
      error: () => {
        this.tradePackages = [];
        this.bidsByPackageId = {};
        this.awardedBidByPackageId = {};
        this.isLoadingTradeData = false;
        this.tradeDataLoadFailed = true;
      },
    });
  }

  private resolvedJobId(): number | null {
    return this.resolveJobIdFromDetails(this.projectDetails);
  }

  private resolveJobIdFromDetails(details: any): number | null {
    const raw = details?.jobId ?? details?.id ?? details?.projectId ?? null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private hydrateStartDateFromProjectDetails(): void {
    const jobId = this.resolvedJobId();
    const rawDate =
      this.projectDetails?.desiredStartDate ??
      this.projectDetails?.DesiredStartDate ??
      this.projectDetails?.date ??
      null;

    if (!rawDate) {
      return;
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const normalized = `${yyyy}-${mm}-${dd}`;
    const safeDate = this.isPlaceholderStartDate(normalized) ? '' : normalized;

    const isDifferentJob = this.hydratedStartDateForJobId !== jobId;
    if (isDifferentJob || !this.startDate) {
      this.suppressStartDatePersist = true;
      this.startDate = safeDate;
      this.suppressStartDatePersist = false;
      this.hydratedStartDateForJobId = jobId;
    }
  }

  private isPlaceholderStartDate(value: string): boolean {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    return (
      parsed.getUTCFullYear() === 2001 &&
      parsed.getUTCMonth() === 0 &&
      parsed.getUTCDate() === 1
    );
  }

  private bidsForTrade(trade: TradePackage): TradeBid[] {
    return this.bidsByPackageId[trade.id] || [];
  }

  private buildPartnersByCategory(category: 'vendor' | 'supplier'): VendorPartner[] {
    return this.tradePackages
      .filter((pkg) => String(pkg.category || '').toLowerCase() === category)
      .map((pkg) => {
        const contact = this.getTradeContact(pkg);
        return {
          id: `${category}-${pkg.id}`,
          category: pkg.trade || 'Untitled package',
          company: contact?.company || 'No awarded partner yet',
          contact: contact?.contact || 'Awaiting award',
          value: this.itemBudget(pkg),
          status: contact ? 'confirmed' : 'pending',
          lead: this.tradeDurationLabel(pkg),
          isInHouse: !!pkg.isInHouse,
        };
      });
  }

  private itemBudget(trade: TradePackage): number {
    if (Number(trade.totalBudget || 0) > 0) {
      return Number(trade.totalBudget || 0);
    }

    if (Number(trade.budget || 0) > 0) {
      return Number(trade.budget || 0);
    }

    return Number(trade.laborBudget || 0) + Number(trade.materialBudget || 0);
  }
}
