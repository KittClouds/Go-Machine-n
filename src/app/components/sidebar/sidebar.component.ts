import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    LucideAngularModule,
    Folder,
    Search,
    Settings,
    User,
    Network,
    FilePlus,
    FolderPlus,
    Clock,
    BookOpen,
    MoreHorizontal,
    ChevronRight,
    ChevronDown,
    Hash
} from 'lucide-angular';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
    readonly Folder = Folder;
    readonly Search = Search;
    readonly Settings = Settings;
    readonly User = User;
    readonly Network = Network;
    readonly FilePlus = FilePlus;
    readonly FolderPlus = FolderPlus;
    readonly Clock = Clock;
    readonly BookOpen = BookOpen;
    readonly More = MoreHorizontal;
    readonly ChevronRight = ChevronRight;
    readonly ChevronDown = ChevronDown;
    readonly Hash = Hash;
}
