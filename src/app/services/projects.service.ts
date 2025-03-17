import { Injectable } from '@angular/core';
import {environment} from "../../environments/environment";
import {HttpClient} from "@angular/common/http";
import {UserService} from "./user.service";
import { Observable } from 'rxjs';

const BASE_URL=`${environment.BACKEND_URL}/Projects`;
@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  [x: string]: any;
  contractor:any;
  nrProjectsTotal: number = 0;
  nrProjectsUser: number = 0;
  projectName: string = "";

  constructor(private httpClient: HttpClient, private userService: UserService) { }

  getProjects() {
    return this.httpClient.get(BASE_URL);
  }
  getProjectById(projectId:string){
    return this.httpClient.get(BASE_URL + '/'+ projectId);
  }
  createNewProject(projectData: any): Observable<any> {
    return this.httpClient.post<any>(BASE_URL, projectData,{headers:{'Content-Type': 'application/json'}});
  }

  editExistingProject(update:any) {
    this.httpClient.put(BASE_URL, update)
  }

  setContractor(contractorId: string) {
    this.contractor = contractorId;
  }
  getContractor() {
    return this.userService.getUserProjects(this.contractor);
  }
  setProjectName(projectName: string) {
    this.projectName  =  projectName
  }
  getProjectName() {
      return this.projectName;
  }

  getNrProjects(): number {
    return this.nrProjectsTotal;
  }
}
