import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, PanelRightClose, PanelRight } from 'lucide-angular';
import { RightSidebarService } from '../../lib/services/right-sidebar.service';

@Component({
    selector: 'app-right-sidebar',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
        <aside
            class="h-full border-l border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
            [class.w-80]="service.isOpen()"
            [class.w-0]="service.isClosed()">
            
            <!-- Header -->
            <div class="h-10 flex items-center justify-between px-3 border-b border-teal-900 bg-gradient-to-l from-slate-900 to-slate-800 text-slate-200 shrink-0 shadow-sm">
                <span class="text-sm font-semibold text-slate-200" *ngIf="service.isOpen()">Details</span>
            </div>

            <!-- Content (Blank) -->
            <div class="flex-1 overflow-hidden p-4">
                <!-- Content goes here -->
            </div>
        </aside>
    `
})
export class RightSidebarComponent {
    service = inject(RightSidebarService);
    readonly PanelRightClose = PanelRightClose;
    readonly PanelRight = PanelRight;
}
