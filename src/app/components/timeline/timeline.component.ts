import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  TemplateRef,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  format,
  addDays,
  differenceInCalendarDays,
  isValid,
  parse,
} from 'date-fns';

export interface TimelineTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  dependencies?: string | null;
  resource?: string;
  color?: string;
  isCritical?: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'delayed';
  cost?: number;
  deleted?: boolean;
  accepted?: boolean;
  task?: string; // For subtask compatibility
  days?: number;
  startDate?: string;
  endDate?: string;
  hasWeatherWarning?: boolean;
  weatherWarningMessage?: string;
  weatherIconUrl?: string;
}

export interface TimelineGroup {
  id?: string;
  title: string;
  subtasks: TimelineTask[];
  startDate?: Date;
  endDate?: Date;
  progress?: number;
  scheduleStatus?: 'on-track' | 'behind' | 'ahead';
  hasWeatherWarning?: boolean;
  weatherWarningMessage?: string;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
})
export class TimelineComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit
{
  @Input() taskGroups: TimelineGroup[] = [];
  @Input() isProjectOwner: boolean = false;
  @Input() canViewGroupTimeline: boolean = true;
  @Output() onGroupClick = new EventEmitter<TimelineGroup>();
  @Output() onGroupDoubleClick = new EventEmitter<TimelineGroup>();
  @Output() onGroupMove = new EventEmitter<{
    groupId: string;
    newStartDate: Date;
    newEndDate: Date;
  }>();
  @Output() onEditGroup = new EventEmitter<TimelineGroup>();

  @ViewChild('timelineRef', { static: false })
  timelineRef!: ElementRef<HTMLDivElement>;
  @ViewChild('panzoomContainer', { static: false })
  panzoomContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('headerRef', { static: false })
  headerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('headerContent', { static: false })
  headerContent!: ElementRef<HTMLDivElement>;
  @ViewChild('groupDetailModal', { static: true })
  groupDetailModal!: TemplateRef<any>;

  viewStartDate: Date = new Date();
  visibleStartDate: Date = new Date();
  visibleEndDate: Date = new Date();
  contentWidth: number = 0;
  zoomLevel: number = 1;
  readonly minZoom: number = 0.25;
  readonly maxZoom: number = 2.5;
  panOffsetX: number = 0;
  isPanningTimeline: boolean = false;

  private readonly PIXELS_PER_WEEK = 300;
  private readonly ZOOM_STEP = 0.15;
  private timelineMinDate: Date = new Date();
  private timelineMaxDate: Date = new Date();
  private panStartX: number = 0;
  private panStartOffsetX: number = 0;

  draggingGroup: string | null = null;
  dragStartDate: Date | null = null;
  isDragging: boolean = false;
  dragStartPos: { x: number; y: number } | null = null;
  weeklyDates: { start: Date; days: Date[] }[] = [];
  timelineHeight: number = 400;
  selectedGroup: TimelineGroup | null = null;
  modalRef: MatDialogRef<any> | null = null;
  endDate: Date = new Date();
  private ghostElement: HTMLElement | null = null;
  private navigationInterval: any;
  private clickTimeout: ReturnType<typeof setTimeout> | null = null;
  private suppressClickOnce: boolean = false;

  private weeksToShow: number = 12;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: (e: MouseEvent) => void;

  constructor(
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.processTaskGroups();
    this.initializeTimelineRange();
    this.generateWeeklyDates();
    this.calculateTimelineHeight();
    this.setupGlobalListeners();
    this.getEndDate();
  }

  ngAfterViewInit() {
    this.initPanzoom();
  }

  ngOnDestroy() {
    this.cleanupGlobalListeners();
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
    if (this.modalRef) {
      this.modalRef.close();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['taskGroups']) {
      this.processTaskGroups();
      this.initializeTimelineRange();
      this.generateWeeklyDates();
      this.calculateTimelineHeight();
    }
  }

  private processTaskGroups(): void {
    if (!this.taskGroups) {
      return;
    }
    this.taskGroups.forEach((group) => {
      if (group.subtasks && group.subtasks.length > 0) {
        const completedCount = group.subtasks.filter(
          (s) => s.status && s.status.toLowerCase() === 'completed',
        ).length;
        group.progress = Math.round(
          (completedCount / group.subtasks.length) * 100,
        );
      } else {
        group.progress = 0;
      }
    });
  }

  private initializeTimelineRange() {
    if (!this.taskGroups || this.taskGroups.length === 0) {
      this.viewStartDate = new Date();
      this.viewStartDate.setDate(
        this.viewStartDate.getDate() - this.viewStartDate.getDay(),
      );
      this.weeksToShow = 12;
      this.contentWidth = this.weeksToShow * this.PIXELS_PER_WEEK;
      this.timelineMinDate = new Date(this.viewStartDate);
      this.timelineMaxDate = this.getEndDate();
      return;
    }

    // Collect all relevant dates
    let dates: number[] = [];
    this.taskGroups.forEach((g) => {
      if (g.startDate) dates.push(new Date(g.startDate).getTime());
      if (g.endDate) dates.push(new Date(g.endDate).getTime());

      g.subtasks.forEach((t) => {
        const start = this.getSafeDate(t.start, t.startDate);
        const end = this.getSafeDate(t.end, t.endDate);
        if (start) dates.push(start.getTime());
        if (end) dates.push(end.getTime());
      });
    });

    dates = dates.filter((d) => !isNaN(d));

    if (dates.length === 0) {
      this.viewStartDate = new Date();
      this.viewStartDate.setDate(
        this.viewStartDate.getDate() - this.viewStartDate.getDay(),
      );
      this.weeksToShow = 12;
      this.contentWidth = this.weeksToShow * this.PIXELS_PER_WEEK;
      this.timelineMinDate = new Date(this.viewStartDate);
      this.timelineMaxDate = this.getEndDate();
      return;
    }

    const minTimestamp = Math.min(...dates);
    const maxTimestamp = Math.max(...dates);

    // Start 2 weeks before the earliest date
    const minDate = new Date(minTimestamp);
    // Align to Sunday
    minDate.setDate(minDate.getDate() - minDate.getDay());
    // Go back 2 weeks buffer
    minDate.setDate(minDate.getDate() - 14);

    this.viewStartDate = minDate;

    // End 2 weeks after the latest date
    const maxDate = new Date(maxTimestamp);

    // Calculate total duration in days
    const diffTime = maxDate.getTime() - minDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Convert to weeks, adding a buffer at the end
    // + 14 days buffer at the end
    const weeksNeeded = Math.ceil((diffDays + 14) / 7);

    // Ensure at least 12 weeks are shown, or the calculated amount
    this.weeksToShow = Math.max(12, weeksNeeded);

    // Calculate content width
    this.contentWidth = this.weeksToShow * this.PIXELS_PER_WEEK;

    this.timelineMinDate = new Date(this.viewStartDate);
    this.timelineMaxDate = this.getEndDate();
    this.panOffsetX = 0;
    this.zoomLevel = 1;

    // Initialise visible dates
    this.visibleStartDate = new Date(this.viewStartDate);
    this.visibleEndDate = new Date(this.viewStartDate);
    this.visibleEndDate.setDate(this.visibleEndDate.getDate() + 14); // Initial view assumption
  }

  private calculateTimelineHeight() {
    this.timelineHeight = Math.max(200, this.taskGroups.length * 60 + 40);
  }

  private setupGlobalListeners() {
    this.mouseMoveListener = (e: MouseEvent) => this.handleDragOver(e);
    this.mouseUpListener = (e: MouseEvent) => this.handleDragEnd(e);

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
  }

  private cleanupGlobalListeners() {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
    }
  }

  private generateWeeklyDates() {
    this.weeklyDates = [];

    for (let week = 0; week < this.weeksToShow; week++) {
      const weekStart = new Date(this.viewStartDate);
      weekStart.setDate(weekStart.getDate() + week * 7);

      const days: Date[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + day);
        days.push(date);
      }

      this.weeklyDates.push({
        start: weekStart,
        days: days,
      });
    }
  }

  navigateTimeline(days: number) {
    const dayWidth = this.getDayWidth();
    const requestedOffset = this.panOffsetX - days * dayWidth;
    this.panOffsetX = this.clampPanOffsetX(requestedOffset);
    this.updateVisibleDates(
      this.panOffsetX,
      this.zoomLevel,
      this.getViewportWidth(),
    );
  }

  startTimelineNavigation(direction: number) {
    this.navigateTimeline(direction); // Initial call
    this.navigationInterval = setInterval(() => {
      this.navigateTimeline(direction);
    }, 100);
  }

  stopTimelineNavigation() {
    clearInterval(this.navigationInterval);
  }

  private initPanzoom() {
    this.panOffsetX = this.clampPanOffsetX(0);
    this.updateVisibleDates(
      this.panOffsetX,
      this.zoomLevel,
      this.getViewportWidth(),
    );
  }

  get renderedContentWidth(): number {
    return this.contentWidth * this.zoomLevel;
  }

  get contentTransform(): string {
    return `translateX(${this.panOffsetX}px)`;
  }

  handleTimelinePanStart(event: MouseEvent): void {
    if (event.button !== 0 || !this.timelineRef?.nativeElement) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('.task-group-bar')) {
      return;
    }

    this.isPanningTimeline = true;
    this.panStartX = event.clientX;
    this.panStartOffsetX = this.panOffsetX;
  }

  handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    if (event.deltaY > 0) {
      this.zoomOut();
    } else {
      this.zoomIn();
    }
  }

  zoomIn(): void {
    this.setZoom(this.zoomLevel + this.ZOOM_STEP);
  }

  zoomOut(): void {
    this.setZoom(this.zoomLevel - this.ZOOM_STEP);
  }

  resetZoom(): void {
    this.setZoom(1);
  }

  private setZoom(requestedZoom: number): void {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, requestedZoom));
    if (newZoom === this.zoomLevel) {
      return;
    }

    const viewportWidth = this.getViewportWidth();
    const oldDayWidth = this.getDayWidth();
    const centerDay = (-this.panOffsetX + viewportWidth / 2) / oldDayWidth;

    this.zoomLevel = newZoom;

    const newDayWidth = this.getDayWidth();
    const centeredOffset = -(centerDay * newDayWidth - viewportWidth / 2);
    this.panOffsetX = this.clampPanOffsetX(centeredOffset);

    this.updateVisibleDates(this.panOffsetX, this.zoomLevel, viewportWidth);
  }

  public getScheduleStatus(
    group: TimelineGroup,
  ): 'on-track' | 'behind' | 'ahead' {
    if (!group.startDate || !group.endDate) {
      return 'on-track';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groupStartDate = new Date(group.startDate);
    groupStartDate.setHours(0, 0, 0, 0);

    const groupEndDate = new Date(group.endDate);
    groupEndDate.setHours(0, 0, 0, 0);

    const progress = group.progress || 0;

    if (progress === 100) {
      return 'on-track';
    }

    if (today > groupEndDate && progress < 100) {
      return 'behind';
    }

    if (today < groupStartDate) {
      return 'on-track';
    }

    const totalDuration = differenceInCalendarDays(
      groupEndDate,
      groupStartDate,
    );
    const elapsedDuration = differenceInCalendarDays(today, groupStartDate);

    if (totalDuration <= 0) {
      return today > groupEndDate ? 'behind' : 'on-track';
    }

    const expectedProgress = Math.min(
      100,
      (elapsedDuration / totalDuration) * 100,
    );

    if (progress < expectedProgress) {
      return 'behind';
    }

    return 'on-track';
  }

  openGroupModal(group: TimelineGroup) {
    this.selectedGroup = {
      ...group,
      scheduleStatus: this.getScheduleStatus(group),
    };
    this.modalRef = this.dialog.open(this.groupDetailModal, {
      width: '600px',
      maxHeight: '80vh',
      disableClose: false,
      data: { group: this.selectedGroup },
    });
  }

  closeGroupModal() {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
    this.selectedGroup = null;
  }

  editGroup(group: TimelineGroup) {
    this.onEditGroup.emit(group);
    this.closeGroupModal();
  }

  viewGroupTimeline(group: TimelineGroup) {
    if (!this.canViewGroupTimeline) {
      return;
    }

    this.closeGroupModal();
    this.onGroupDoubleClick.emit(group);
  }

  handleDragStart(e: MouseEvent, group: TimelineGroup) {
    if (!this.isProjectOwner) {
      return;
    }
    // Prevent drag for right-click
    if (e.button === 2) {
      return;
    }

    this.dragStartPos = { x: e.clientX, y: e.clientY };
    this.draggingGroup = group.title;

    if (group && group.startDate) {
      this.dragStartDate = new Date(group.startDate);
    }

    // Don't create ghost element immediately, wait for drag threshold
  }

  handleDragOver(e: MouseEvent) {
    if (this.isPanningTimeline) {
      e.preventDefault();
      const deltaX = e.clientX - this.panStartX;
      this.panOffsetX = this.clampPanOffsetX(this.panStartOffsetX + deltaX);
      this.updateVisibleDates(
        this.panOffsetX,
        this.zoomLevel,
        this.getViewportWidth(),
      );
      return;
    }

    if (!this.dragStartPos || !this.draggingGroup) {
      return;
    }

    const dx = e.clientX - this.dragStartPos.x;
    const dy = e.clientY - this.dragStartPos.y;

    if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > 5) {
      this.isDragging = true;
      this.createGhostElement();
    }

    if (this.isDragging) {
      e.preventDefault();
      this.updateGhostPosition(e.clientX);
    }
  }

  handleDragEnd(e: MouseEvent) {
    if (this.isPanningTimeline) {
      this.isPanningTimeline = false;
      return;
    }

    const wasDragging = this.isDragging;
    const group = this.taskGroups.find((g) => g.title === this.draggingGroup);

    if (this.isDragging) {
      if (
        !this.draggingGroup ||
        !this.dragStartDate ||
        !this.timelineRef?.nativeElement ||
        !this.dragStartPos
      ) {
        this.resetDrag();
        return;
      }

      // const rect = this.timelineRef.nativeElement.getBoundingClientRect();
      // const timelineWidth = rect.width; // Viewport width
      // We need content width now
      const totalDays = this.weeksToShow * 7;

      // Calculate day width based on zoomed content width
      const dayWidth = this.getDayWidth();

      const dragDelta = e.clientX - this.dragStartPos.x;
      const daysDelta = Math.round(dragDelta / dayWidth);

      if (group && group.startDate && group.endDate && daysDelta !== 0) {
        const groupDuration = differenceInCalendarDays(
          group.endDate,
          group.startDate,
        );

        const minAllowedDelta = differenceInCalendarDays(
          this.timelineMinDate,
          this.dragStartDate,
        );
        const maxAllowedDelta = differenceInCalendarDays(
          addDays(this.timelineMaxDate, -groupDuration),
          this.dragStartDate,
        );
        const clampedDaysDelta = Math.max(
          minAllowedDelta,
          Math.min(daysDelta, maxAllowedDelta),
        );

        const newStartDate = addDays(this.dragStartDate, clampedDaysDelta);
        const newEndDate = addDays(newStartDate, groupDuration);

        if (clampedDaysDelta !== 0) {
          this.onGroupMove.emit({
            groupId: group.id || group.title,
            newStartDate,
            newEndDate,
          });
        }
      }
    } else if (group) {
      // Click handling is managed by click/double-click events on the bar
    }

    if (wasDragging) {
      this.suppressClickOnce = true;
    }

    this.resetDrag();
  }

  handleGroupClickEvent(group: TimelineGroup) {
    if (this.suppressClickOnce) {
      this.suppressClickOnce = false;
      return;
    }

    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }

    this.clickTimeout = setTimeout(() => {
      this.onGroupClick.emit(group);
      this.openGroupModal(group);
      this.clickTimeout = null;
    }, 250);
  }

  handleGroupDoubleClickEvent(group: TimelineGroup, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }

    this.onGroupDoubleClick.emit(group);
  }

  private createGhostElement() {
    if (!this.draggingGroup || !this.timelineRef) return;

    const originalEl = this.timelineRef.nativeElement.querySelector(
      `[data-group="${this.draggingGroup}"]`,
    ) as HTMLElement;
    if (!originalEl) return;

    this.ghostElement = originalEl.cloneNode(true) as HTMLElement;
    this.ghostElement.classList.add('group-ghost');

    const rect = originalEl.getBoundingClientRect();
    this.ghostElement.style.width = `${rect.width}px`;
    this.ghostElement.style.height = `${rect.height}px`;
    this.ghostElement.style.top = `${rect.top}px`;
    this.ghostElement.style.left = `${rect.left}px`;

    document.body.appendChild(this.ghostElement);
    originalEl.classList.add('dragging-source');
  }

  private updateGhostPosition(currentX: number) {
    if (!this.ghostElement || !this.dragStartPos) return;

    const dragDelta = currentX - this.dragStartPos.x;
    this.ghostElement.style.transform = `translateX(${dragDelta}px)`;
  }

  private resetDrag() {
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    if (this.draggingGroup) {
      const originalEl = document.querySelector(
        `[data-group="${this.draggingGroup}"]`,
      ) as HTMLElement;
      if (originalEl) {
        originalEl.classList.remove('dragging-source');
        originalEl.style.transform = '';
      }
    }

    this.draggingGroup = null;
    this.dragStartDate = null;
    this.isDragging = false;
    this.dragStartPos = null;
  }

  getGroupStyle(group: TimelineGroup, index: number): any {
    if (!group.startDate || !group.endDate) return {};

    const totalDays = this.weeksToShow * 7;
    const startDiff = differenceInCalendarDays(
      group.startDate,
      this.viewStartDate,
    );
    const duration =
      differenceInCalendarDays(group.endDate, group.startDate) + 1;

    const left = `${(startDiff / totalDays) * 100}%`;
    const width = `${Math.min((duration / totalDays) * 100, 95)}%`;
    const top = `${index * 60 + 10}px`;

    return {
      left,
      width,
      top,
    };
  }

  getGroupTooltip(group: TimelineGroup): string {
    const duration =
      group.startDate && group.endDate
        ? differenceInCalendarDays(group.endDate, group.startDate) + 1
        : 0;
    return `${group.title}\n${group.subtasks.length} subtasks\n${duration} days\nProgress: ${group.progress || 0}%`;
  }

  isGroupCritical(group: TimelineGroup): boolean {
    return group.subtasks.some((task) => task.isCritical);
  }

  getTodayPosition(): string {
    const totalDays = this.weeksToShow * 7;
    const daysSinceStart = differenceInCalendarDays(
      new Date(),
      this.viewStartDate,
    );
    const position = (daysSinceStart / totalDays) * 100;
    return `${Math.max(0, Math.min(position, 100))}%`;
  }

  getEndDate(): Date {
    const endDate = new Date(this.viewStartDate);
    endDate.setDate(endDate.getDate() + this.weeksToShow * 7 - 1);
    return endDate;
  }

  private getViewportWidth(): number {
    return this.timelineRef?.nativeElement?.clientWidth ?? 1;
  }

  private getDayWidth(): number {
    const totalDays = Math.max(1, this.weeksToShow * 7);
    return this.renderedContentWidth / totalDays;
  }

  private getMinPanOffsetX(viewportWidth: number): number {
    return Math.min(0, viewportWidth - this.renderedContentWidth);
  }

  private clampPanOffsetX(offset: number): number {
    const viewportWidth = this.getViewportWidth();
    const minOffset = this.getMinPanOffsetX(viewportWidth);
    return Math.max(minOffset, Math.min(0, offset));
  }

  isCurrentWeek(weekStart: Date): boolean {
    const today = new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return today >= weekStart && today <= weekEnd;
  }

  isWeekend(date: Date): boolean {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  formatDate(
    date: Date | string | null | undefined,
    formatStr: string,
  ): string {
    if (!date) return '';

    const parsedDate = this.parseMultipleFormats(date);
    return parsedDate ? format(parsedDate, formatStr) : '';
  }

  private parseMultipleFormats(
    dateInput: Date | string | null | undefined,
  ): Date | null {
    if (!dateInput) return null;

    if (dateInput instanceof Date) {
      return isValid(dateInput) ? dateInput : null;
    }

    if (typeof dateInput !== 'string') return null;

    const dateStr = dateInput.trim();
    if (!dateStr) return null;

    // Define the formats to try in order of preference
    const formats = [
      'dd/MM/yyyy', // 20/12/2025
      'dd-MM-yyyy', // 20-12-2025
      'MM/dd/yyyy', // 12/20/2025
      'MM-dd-yyyy', // 12-20-2025
      'yyyy-MM-dd', // 2025-12-20
      'yyyy/MM/dd', // 2025/12/20
      'dd/MM/yy', // 20/12/25
      'dd-MM-yy', // 20-12-25
      'MM/dd/yy', // 12/20/25
      'MM-dd-yy', // 12-20-25
    ];

    for (const formatPattern of formats) {
      try {
        const parsedDate = parse(dateStr, formatPattern, new Date());
        if (isValid(parsedDate)) {
          return parsedDate;
        }
      } catch (e) {
        // Continue to next format
      }
    }

    // Fallback to native Date parsing
    try {
      const nativeDate = new Date(dateStr);
      if (isValid(nativeDate)) {
        return nativeDate;
      }
    } catch (e) {
      // Ignore
    }

    return null;
  }

  getDuration(task: TimelineTask): number {
    if (!task.start || !task.end) return 0;
    return differenceInCalendarDays(task.end, task.start) + 1;
  }

  public getSafeDate(
    date: Date | undefined,
    dateString: string | undefined,
  ): Date {
    if (date && !isNaN(date.getTime())) {
      return date;
    }
    if (dateString) {
      const parsedDate = this.parseMultipleFormats(dateString);
      if (parsedDate) {
        return parsedDate;
      }
    }
    return new Date(); // Return today's date as a fallback
  }

  public getGroupStatus(group: TimelineGroup): string {
    if (!group.subtasks || group.subtasks.length === 0) {
      return 'pending';
    }

    if (group.subtasks.some((t) => t.status === 'delayed')) {
      return 'delayed';
    }

    if ((group.progress ?? 0) === 100) {
      return 'completed';
    }

    if ((group.progress ?? 0) === 0) {
      return 'pending';
    }

    return 'in_progress';
  }

  private updateVisibleDates(x: number, scale: number, viewportWidth: number) {
    const totalDays = this.weeksToShow * 7;
    const dayWidth = this.renderedContentWidth / totalDays;

    // x is negative as we pan right
    const startOffsetPixels = -x;
    const daysStartOffset = startOffsetPixels / dayWidth;

    const visibleDays = viewportWidth / dayWidth;

    const newStartDate = new Date(this.viewStartDate);
    newStartDate.setDate(newStartDate.getDate() + Math.floor(daysStartOffset));

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + Math.ceil(visibleDays));

    this.visibleStartDate = newStartDate;
    this.visibleEndDate = newEndDate;
    this.cdr.detectChanges();
  }
}
