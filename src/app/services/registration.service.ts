import { Injectable } from '@angular/core';
import {environment} from "../../environments/environment";
import {HttpClient} from "@angular/common/http";
import {RegistrationForm} from "../models/auth";
import { Observable } from 'rxjs';

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

getCountries(): Observable<any[]> {
  return this.httpClient.get<any[]>(`${BASE_URL_ACCOUNT}/countries`);
}

getAllStates(): Observable<any[]> {
  return this.httpClient.get<any[]>(`${BASE_URL_ACCOUNT}/states`);
}
}
