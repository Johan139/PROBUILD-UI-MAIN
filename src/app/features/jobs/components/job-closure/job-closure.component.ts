import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, FolderCheck } from 'lucide-angular';

@Component({
  selector: 'app-job-closure',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="closure-container">
      <div class="closure-card">
        <div class="icon-wrapper">
          <lucide-angular [img]="FolderCheck" class="icon"></lucide-angular>
        </div>
        <h2>Project Closure</h2>
        <p>This project has been completed and archived.</p>
        <!-- TODO: Add closure details here -->
      </div>
    </div>
  `,
  styles: [`
    .closure-container {
      padding: 2rem;
      display: flex;
      justify-content: center;
    }
    .closure-card {
      background-color: var(--gray-900);
      border: 1px solid var(--gray-800);
      border-radius: 0.5rem;
      padding: 3rem;
      text-align: center;
      max-width: 500px;
    }
    .icon-wrapper {
      width: 4rem; height: 4rem;
      background-color: rgba(34, 197, 94, 0.2); // green
      border-radius: 9999px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
      color: var(--color-success);
    }
    h2 { color: var(--white); margin: 0 0 0.5rem; }
    p { color: var(--gray-400); }
  `]
})
export class JobClosureComponent {
  @Input() projectDetails: any;
  FolderCheck = FolderCheck;
}
