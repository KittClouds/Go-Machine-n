import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    LucideAngularModule,
    Globe,
    Volume2,
    Check,
    ChevronRight,
    GitGraph,
    Database
} from 'lucide-angular';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.css']
})
export class FooterComponent {
    readonly Globe = Globe;
    readonly Volume2 = Volume2;
    readonly Check = Check;
    readonly ChevronRight = ChevronRight;
    readonly GitGraph = GitGraph; // Using GitGraph as a proxy for the 'Hub box' or network
    readonly Database = Database;
}
