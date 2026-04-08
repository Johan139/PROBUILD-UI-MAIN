export interface TourStep {
  id: string;
  targetSelector: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  route?: string; // Expected route for this step
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'; // Preferred tooltip position
  actionRequired?: boolean; // If true, user must interact with the element to proceed (optional)
  waitForElement?: boolean; // Wait for element to appear in DOM
}

export const NEW_PROJECT_TOUR: TourStep[] = [
  {
    id: 'dashboard-create-btn',
    targetSelector: '.quick-action-btn.btn-primary', // "Create New Project" button on Dashboard
    title: 'Start a New Project',
    content: 'Click here to begin creating your first project. You can also use the "New Project" link in the sidebar.',
    route: '/dashboard',
    position: 'bottom',
    actionRequired: true // Wait for user to click
  },
  {
    id: 'new-project-standard-analysis',
    targetSelector: 'app-project-blueprint-viewer', // Blueprint Viewer Component
    title: 'Upload Blueprints',
    content: 'Start by uploading your project blueprints here. You can drag & drop files or click "Choose File".',
    route: '/new-project',
    position: 'right',
    waitForElement: true
  },
  {
    id: 'new-project-details-form',
    targetSelector: '.standard-analysis-container mat-expansion-panel:first-child', // Project Details Panel
    title: 'Project Details',
    content: 'Fill in the mandatory project details such as Project Name, Start Date, and Address. The Budget Level helps tailor the AI analysis.',
    route: '/new-project',
    position: 'left'
  },
  {
    id: 'new-project-user-context',
    targetSelector: '.standard-analysis-container mat-expansion-panel:last-child', // User Context Panel
    title: 'Add Context',
    content: 'Optional: Upload a context file or type specific instructions (e.g., "Use PVC instead of wood") to guide the AI analysis.',
    route: '/new-project',
    position: 'left'
  },
  {
    id: 'new-project-start-btn',
    targetSelector: '.standard-analysis-container button.btn-primary', // Start Analysis Button
    title: 'Start Analysis',
    content: 'Once you are ready, click here to begin the AI analysis. The process takes a few minutes, and you can navigate away while it runs.',
    route: '/new-project',
    position: 'top'
  }
];
