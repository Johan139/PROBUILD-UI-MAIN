import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs'; // Add this
import { ProfileComponent } from './profile.component';
import { ProfileService } from './profile.service';

@NgModule({
  declarations: [ProfileComponent],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTabsModule
  ],
  providers: [ProfileService],
  bootstrap: [/* Your root component */]
})
export class AppModule {}
export interface Profile {
  id: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  userType: string | null;
  companyName: string | null;
  companyRegNo: string | null;
  vatNo: string | null;
  constructionType: string | null;
  nrEmployees: string | null;
  yearsOfOperation: string | null;
  certificationStatus: string | null;
  certificationDocumentPath: string | null;
  availability: string | null;
  trade: string | null;
  supplierType: string | null;
  productsOffered: string | null;
  projectPreferences: string | null;
  deliveryArea: string | null;
  deliveryTime: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  subscriptionPackage: string | null;
  isVerified: boolean;
}