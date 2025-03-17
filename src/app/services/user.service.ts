import { Injectable } from '@angular/core';
import {environment} from "../../environments/environment";
import {HttpClient} from "@angular/common/http";

const BASE_URL = `${environment.BACKEND_URL}/`;

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private httpClient : HttpClient) {

  }

  getUserQuotes(){

  }

  getUserBids(){

  }
  getUserProjects(userId: any){

  }

}
