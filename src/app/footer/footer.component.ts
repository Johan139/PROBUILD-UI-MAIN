import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon'; // ✅ this is the key

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [MatIconModule], // ✅ now mat-icon is recognized
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}