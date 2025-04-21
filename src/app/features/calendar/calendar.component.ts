import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './calendar.model';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FullCalendarModule } from '@fullcalendar/angular';
import { AddEventDialogComponent } from './add-event-dialog.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FullCalendarModule
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  calendarOptions: CalendarOptions;
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  events: CalendarEvent[] = [];

  constructor(
    private calendarService: CalendarService,
    private dialog: MatDialog
  ) {
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek'
      },
      events: [],
      eventClick: this.handleEventClick.bind(this),
      editable: true
    };
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.calendarService.getEvents().subscribe({
      next: (events: CalendarEvent[]) => {
        this.events = events;
        this.calendarOptions.events = events.map(event => ({
          id: event.id,
          title: event.title,
          start: event.startDate,
          end: event.endDate,
          description: event.description
        })) as EventInput[];
        this.successMessage = 'Events loaded successfully';
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching events:', error);
        this.errorMessage = 'Failed to load events. Please try again.';
        this.isLoading = false;
      }
    });
  }

  handleEventClick(info: any): void {
    alert(`Event: ${info.event.title}\nDescription: ${info.event.extendedProps.description}`);
  }

  openAddEventDialog(): void {
    const dialogRef = this.dialog.open(AddEventDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.calendarService.addEvent(result).subscribe({
          next: (newEvent: CalendarEvent) => {
            this.events.push(newEvent);
            //this.calendarOptions.events = [...this.calendarOptions.events, {
            //  id: newEvent.id,
            //  title: newEvent.title,
            //  start: newEvent.startDate,
            //  end: newEvent.endDate,
            //  description: newEvent.description
            //}] as EventInput[];
            this.successMessage = 'Event added successfully';
          },
          error: (error) => {
            console.error('Error adding event:', error);
            this.errorMessage = 'Failed to add event. Please try again.';
          }
        });
      }
    });
  }
}