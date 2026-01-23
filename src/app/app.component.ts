import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component';
import { EditorComponent } from './components/editor/editor.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, MainLayoutComponent, EditorComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
    title = 'angular-notes';
}
