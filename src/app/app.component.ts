import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

import { smartGraphRegistry } from './lib/registry';
import { entityColorStore } from './lib/store/entityColorStore';
import { seedDefaultSchemas } from './lib/folders/seed';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MainLayoutComponent, NgxSpinnerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'angular-notes';
  private spinner = inject(NgxSpinnerService);

  ngOnInit() {
    // Show loading spinner immediately
    this.spinner.show();

    // Initialize entity color CSS variables
    entityColorStore.initialize();

    // Track async init tasks
    const initTasks: Promise<void>[] = [];

    // Seed default folder/network schemas
    initTasks.push(
      seedDefaultSchemas()
        .then(() => console.log('[AppComponent] Schema seeding complete'))
        .catch(err => console.error('[AppComponent] Schema seeding failed:', err))
    );

    // Initialize smart graph registry
    console.log('[AppComponent] Initializing smartGraphRegistry...');
    initTasks.push(
      smartGraphRegistry.init()
        .then(() => console.log('[AppComponent] SmartGraphRegistry initialized'))
        .catch(err => console.error('[AppComponent] SmartGraphRegistry init failed:', err))
    );

    // Hide spinner when all init tasks complete (or after minimum display time)
    const minDisplayTime = new Promise<void>(resolve => setTimeout(resolve, 800)); // Minimum 800ms

    Promise.all([...initTasks, minDisplayTime])
      .finally(() => {
        this.spinner.hide();
        console.log('[AppComponent] Loading complete, spinner hidden');
      });
  }
}
