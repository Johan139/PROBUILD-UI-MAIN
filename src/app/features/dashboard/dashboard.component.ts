import {Component, OnInit} from '@angular/core';
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatIconModule } from "@angular/material/icon";
import { MatListItem, MatNavList } from "@angular/material/list";
import {NgIf} from "@angular/common";
import {NewUserDashboardComponent} from "./new-user-dashboard/new-user-dashboard.component";
import {ProjectsService} from "../../services/projects.service";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgIf,
    NewUserDashboardComponent,
    MatIconModule,
    MatSidenavModule,
    MatListItem,
    MatNavList
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit{
    nrProjects: number = 0;

    constructor(private projectService: ProjectsService) {
    }

    ngOnInit() {
      this.nrProjects = this.projectService.getNrProjects();
    }

}
