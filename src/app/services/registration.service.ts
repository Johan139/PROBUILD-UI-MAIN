import { Injectable } from '@angular/core';
import {environment} from "../../environments/environment";
import {HttpClient} from "@angular/common/http";
import {RegistrationForm} from "../models/auth";

const BASE_URL = `${environment.BACKEND_URL}/register`;
const BASE_URL_ACCOUNT = `${environment.BACKEND_URL}/account`

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  constructor(private httpClient:HttpClient) { }

  register(request: RegistrationForm){
    this.httpClient.post( BASE_URL, request)

  }

  getCountries(){
    return this.httpClient.get(BASE_URL_ACCOUNT+'/countries')
      
  }
}
