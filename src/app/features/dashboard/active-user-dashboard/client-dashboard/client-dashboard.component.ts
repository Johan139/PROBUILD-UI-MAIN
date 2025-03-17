import { Component } from '@angular/core';
import {MatCardModule} from "@angular/material/card";
import {MatDivider} from "@angular/material/divider";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [MatCardModule, MatDivider, MatButton],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent {

}
