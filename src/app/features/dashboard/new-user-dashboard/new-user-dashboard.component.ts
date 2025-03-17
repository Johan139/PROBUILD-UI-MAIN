import {Component, OnInit} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {RouterLink} from "@angular/router";
import {NgIf, NgOptimizedImage} from "@angular/common";
import {LoginService} from "../../../services/login.service";

@Component({
  selector: 'app-new-user-dashboard',
  standalone: true,
  imports: [
    MatButton,
    RouterLink,
    NgOptimizedImage,
    NgIf
  ],
  templateUrl: './new-user-dashboard.component.html',
  styleUrl: './new-user-dashboard.component.scss'
})
export class NewUserDashboardComponent implements OnInit{

    userType: string = '';
    isSubContractor= false;

    constructor(private userService: LoginService) {
    }
    ngOnInit (){
      this.userType = this.userService.getUserType();
      console.log(this.userType)
      console.log(this.isSubContractor)
      this.isSubContractor = this.userType === 'BUILDER' || this.userType ==='CONSTRUCTION' ? true :false;
      console.log(this.isSubContractor)
    }
}
