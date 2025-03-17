import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {LoginForm} from "../models/auth";

const BASE_URL = `${environment.BACKEND_URL}/Account/login`;

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  userType:string = '';
  userId: string = ''
  userFirstName: string = '';

  constructor(private httpClient: HttpClient) { }

  login(request: LoginForm) {
    return this.httpClient.post(BASE_URL, request)
  }
  setUserType(userType: string) {
    this.userType = userType;
  }
  setUserId(userId: string) {
    this.userId = userId;
  }
  setFirstName(firstName: string){
    this.userFirstName = firstName;
  }

  getUserType() {
    return this.userType;
  }
  getUserId() {
    return this.userId;
  }
  getFirstName(){
    return this.userFirstName;
  }

}
