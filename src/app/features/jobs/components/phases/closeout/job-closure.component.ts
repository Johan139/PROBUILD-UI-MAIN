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
        <p>Final handover package is complete and ready for archive.</p>

        <div class="closure-grid">
          <article>
            <span class="label">Closeout Package</span>
            <strong>100%</strong>
          </article>
          <article>
            <span class="label">Signoffs</span>
            <strong>Owner · PM · Finance</strong>
          </article>
          <article>
            <span class="label">Retention</span>
            <strong>Released</strong>
          </article>
          <article>
            <span class="label">Archive State</span>
            <strong class="archive-pill">Ready</strong>
          </article>
        </div>
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
      max-width: 680px;
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
    p { color: var(--gray-400); margin-bottom: 1rem; }

    .closure-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      text-align: left;

      article {
        border: 1px solid var(--gray-800);
        border-radius: 0.5rem;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--gray-400);
      margin-bottom: 0.25rem;
    }

    strong {
      color: var(--white);
      font-size: 0.92rem;
    }

    .archive-pill {
      color: var(--color-success);
    }
  `]
})
export class JobClosureComponent {
  @Input() projectDetails: any;
  FolderCheck = FolderCheck;
}
