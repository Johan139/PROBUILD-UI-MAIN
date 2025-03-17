import {Component, OnInit} from '@angular/core';
import {MatCardModule} from "@angular/material/card";
import {MatGridListModule} from "@angular/material/grid-list";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {NgForOf, NgIf} from "@angular/common";
import { MatSelectModule} from "@angular/material/select";
import {MatInputModule} from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import {MatButton} from "@angular/material/button";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoaderComponent } from '../../loader/loader.component';

const BASE_URL = environment.BACKEND_URL;

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [
    MatCardModule,
    MatGridListModule,
    MatGridListModule,
    ReactiveFormsModule,
    NgForOf,
    MatSelectModule,
    NgIf,
    MatInputModule,
    MatFormFieldModule,
    MatButton,
    LoaderComponent
],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss'
})
export class RegistrationComponent implements OnInit{
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  // Options for dropdowns
  constructionTypes = [
    {value:'RESIDENTIAL', display:'Residential (Single-Family, Multi-Family)'},
    {value:'COMMERCIAL',display:'Commercial (Retail, Office)'},
    {value:'INDUSTRIAL',display:'Industrial (Factories, Warehouses)'},
    {value:'INFRASTRUCTURE',display:'Infrastructure (Highways, Bridges)'},
    {value:'RENOVATION',display:'Renovation/Remodeling'}
  ];

  subscriptionPackages = [
    {value:'BASIC', display:'Basic'},
    {value:'PREMIUM', display:'Premium'},
    {value:'ENTERPRISE', display:'Enterprise'}];

  trades = [
    {value:'ELECTRICIAN', display:'Electrician'},
    {value:'PLUMBER', display:'Plumber'},
    {value:'CARPENTER', display:'Carpenter'},
    {value:'BRICK_LAYER', display:'Bricklayer'},
    {value:'HVAC', display:'HVAC Specialist'},
    {value:'PAINTER', display:'Painter'},
    {value:'ROOFER', display:'Roofer'},
    {value:'FRAMER', display:'Framer'},
    {value:'DRYWALL', display:'Drywall Installer'},
    {value:'FLOORING', display:'Flooring Specialist'},
    {value:'TILER', display:'Tiler'},
    {value:'WELDER', display:'Welder'},
    {value:'MASON', display:'Mason'},
    {value:'GLAZIER', display:'Glazier'},
    {value:'LANDSCAPER', display:'Landscaper'},
    {value:'GENERAL', display:'General Laborer'},
    {value:'WASTE', display:'Waste Management Services'},
    {value:'', display:'Other'}
  ]; //search for other column will be LIKE OTHER %
  supplierTypes = [
    {value:'BUILDING_MATERIAL', display:'Building Materials (Concrete, Lumber, Steel)'},
    {value:'TOOLS_EQUIPMENT', display:'Tools and Equipment Supplier'},
    {value:'HEAVY_MACHINERY', display:'Heavy Machinery Rental'},
    {value:'SAFETY_EQUIPMENT', display:'Safety Equipment Supplier'},
    {value:'PLUMBING', display:'Plumbing Supplies'},
    {value:'HVAC', display:'HVAC Supplies and Services'},
    {value:'ELECTRICAL', display:'Electrical Supplies'},
    {value:'ROOFING', display:'Roofing Materials'},
    {value:'INSULATION_MATERIAL', display:'Insulation Materials'},
    {value:'FLOORING_MATERIAL', display:'Flooring Materials'},
    {value:'ARCHITECT', display:'Architectural Services'},
    {value:'ENGINEER', display:'Engineering Services'},
    {value:'WASTE', display:'Waste Management Services'},
    {value:'SCAFFOLDING', display:'Scaffolding Rental'},
    {value:'' , display:'Other'}
  ];

  supplierProducts = [
    {value:'LUMBER', display:'Lumber (Softwood, Hardwood, Pressure-Treated)'},
    {value:'STEEL', display:'Steel (Structural, Rebar)'},
    {value:'ROOFING_MATERIAL', display:'Roofing Materials (Asphalt Shingles, Metal Roofing)'},
    {value:'INSULATION_MATERIAL', display:'Insulation Materials (Fiberglass, Spray Foam)'},
    {value:'ELECTRICAL', display:'Electrical Supplies (Wires, Switchgear)'},
    {value:'PLUMBING', display:'Plumbing Equipment (Pipes, Fittings)'},
    {value:'HVAC_EQUIPMENT', display:'HVAC Equipment (Ducts, Units)'},
    {value:'PAINT_FINISHES', display:'Paint and Finishes'},
    {value:'ALTERNATIVE', display:'Sustainable Materials (Solar Panels, Low VOC Paint)'},
    {value:'', display:'Other'}
  ];
  deliveryAreas = [
    {value:'LOCAL', display:'Local'},
    {value:'REGIONAL', display:'Regional'},
    {value:'NATIONAL', display:'National'}
  ];
  countries = [
    { value: 'RSA', display: 'South Africa', phonePattern: /^(\+27|0)[6-8][0-9]{8}$/ },
    { value: 'USA', display: 'United States of America', phonePattern: /^(\+1|1)?[2-9][0-9]{9}$/ }
  ];
  preferenceOptions = [
    {value:'SHORT', display:'Short-term Projects (1-3 months)'},
    {value:'LONG', display:'Long-term Projects (6+ months)'},
    {value:'CONTRACT', display:'Contract-based'},
    {value:'DEMAND', display:'On-demand basis (Per Task/Hour)'}
  ];
  leadTimeDelivery = [
    {value:'SAME_DAY', display:'Same Day'},
    {value:'3_DAYS', display:'1-3 Days'},
    {value:'1_WEEK', display:'1 Week'},
    {value:'1_WEEK+', display:'More than 1 Week'}
  ];
  availabilityOptions = [
    {value:'IMMEDIATE', display:'Available Immediately'},
    {value:'2_WEEKS', display:'Within 1-2 Weeks'},
    {value:'1_MONTH', display:'Within 1 Month'},
    {value:'PROJECT_BASIS', display:'By Project Basis'}
  ];
  employeeNumber = ['1-10', '11-50', '51-100', '100+'];
  operationalYears = ['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'];
  certificationOptions = [
    {value:'FULLY_LICENSED', display:'Licensed and Certified'},
    {value:'LICENSED', display:'Licensed (No Certification)'},
    {value:'CERTIFIED', display:'Certification (No License)'},
    {value:'NON_LICENSED', display:'Unlicensed/Uncertified'}
  ]
  userTypes = [
    {value:null, display:null},
    {value:'PERSONAL_USE', display:'Client(Personal)'},
    {value:'BUILDER', display:'Builder'},
    {value:'CONSTRUCTION', display:'Construction Services'},
    {value:'SUPPLIER', display:'Supplier Services'},
    {value:'FOREMAN', display:'Foreman'},
    {value:'PROJECT_OWNER', display:'Contractor/Project Owner'}
  ];

  registrationForm: FormGroup;
  user:string = "";
  certified = false;
  isLoading: boolean = false;

  constructor(private formBuilder: FormBuilder, private httpClient: HttpClient, private router: Router) {
    this.registrationForm = this.formBuilder.group({});
  }

  ngOnInit() {
    this.registrationForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{10,}$/)
        ]
      ],
      companyName: [''],
      companyRegNo: [''],
      vatNo: [''],
      userType: ['PERSONAL_USE', Validators.required],
    
      constructionType: (''), 
      country: ['', Validators.required],
      state: ['', Validators.required],
      city: ['', Validators.required],
    
      nrEmployees: (''), 
      yearsOfOperation: (''), 
      certificationStatus: (''), 
      certificationDocumentPath: (''), 
      availability:(''),
    
      subscriptionPackage: ['', Validators.required],
      projectPreferences: (''),
    
      trade: (''), 
      productsOffered:(''), 
      supplierType:(''),
    
      deliveryArea: (''), 
      deliveryTime: (''), 
      userName:('')
    });
    
    this.user = 'PERSONAL_USE';
    
    // Update phone number validation based on country selection
    this.registrationForm.get('country')?.valueChanges.subscribe(countryCode => {
      this.updatePhoneNumberValidator(countryCode);
    });
    
  }
  updatePhoneNumberValidator(countryCode: string) {
    const phoneNumberControl = this.registrationForm.get('phoneNumber');
    const selectedCountry = this.countries.find(country => country.value === countryCode);
    if (selectedCountry && phoneNumberControl) {
      phoneNumberControl.setValidators([
        Validators.required,
        Validators.pattern(selectedCountry.phonePattern)
      ]);
      phoneNumberControl.updateValueAndValidity();
    }
  }

  userType(userSelected: any){
    this.user = userSelected.value
  }

  certificationChange(selectedOption:any) {
    if(selectedOption === "FULLY_LICENSED")
      this.certified = true;
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading = true;
      console.log(this.registrationForm.value);
  
      this.httpClient.post(`${BASE_URL}/Account/register`, JSON.stringify(this.registrationForm.value), {headers:{'Content-Type': 'application/json'}})
        .pipe(
          catchError((error) => {
            if (error.status === 400) {
              if(error.error[0].code == 'DuplicateUserName'){
                this.alertMessage = 'You are already Registered, please proceed to Login';
                this.routeURL = '';
              }else{
                this.alertMessage = 'Data is Malformed please check all input fields if there are valid.';
                this.routeURL = '';
              }
            } else if (error.status === 500) {
              this.isLoading = false;
              this.alertMessage = 'Oops something went wrong, please try again later.';
              this.routeURL = '';
            } else {
              this.isLoading = false;
              this.alertMessage = 'An unexpected error occurred. Contact support support@probuildai.com';
              this.routeURL = '';
            }
            this.isLoading = false;
            this.showAlert = true;
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.isLoading = false;
          if (res) {
            this.alertMessage = 'Registration successful, please wait for account activation you shall be advised shortly';
            this.showAlert = true;
            this.routeURL = 'login';
          }
        });
    } else {
      this.alertMessage = 'Please fill in all required fields or check for all fields are correct.';
      this.showAlert = true;
    }
  }
  closeAlert(): void {
    if(this.routeURL != ''){
      this.router.navigateByUrl('login');
    }
    this.showAlert = false;
  }
}