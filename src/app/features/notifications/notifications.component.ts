import {Component, OnInit} from '@angular/core';
import {MatFormField, MatFormFieldModule} from "@angular/material/form-field";
import {MatCard} from "@angular/material/card";
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatInput} from "@angular/material/input";
import {NgIf} from "@angular/common";
import {MatButton} from "@angular/material/button";
import {NotificationsService} from "../../services/notifications.service";

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatCard,
    FormsModule,
    MatInput,
    NgIf,
    ReactiveFormsModule,
    MatButton
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements  OnInit{
  broadcastForm: FormGroup;

  constructor(private formBuilder: FormBuilder,
              private notificationService: NotificationsService) {
    this.broadcastForm = this.formBuilder.group({
      message: ['', Validators.required],
    })
  }

  ngOnInit() {
   //messageHistory = this.notificationService.getAllMessages()
  }

  broadcastMessage() {
    //this.notificationService.sendBroadcast(broadcastForm.value)
  }


}
