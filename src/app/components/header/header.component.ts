import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    LucideAngularModule,
    X,
    Undo,
    Redo,
    MoreHorizontal,
    PanelRight,
    Moon,
    Sidebar
} from 'lucide-angular';
import { EditorService } from '../../services/editor.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent {
    readonly X = X;
    readonly Undo = Undo;
    readonly Redo = Redo;
    readonly More = MoreHorizontal;
    readonly PanelRight = PanelRight;
    readonly Moon = Moon; // For theme toggle shown in image
    readonly Sidebar = Sidebar; // For sidebar toggle

    constructor(private editorService: EditorService) { }

    undo() {
        this.editorService.undo();
    }

    redo() {
        this.editorService.redo();
    }
}
