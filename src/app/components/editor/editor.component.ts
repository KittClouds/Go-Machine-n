import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, EnvironmentInjector, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Crepe } from '@milkdown/crepe';
import "@milkdown/crepe/theme/common/style.css";
// import "@milkdown/crepe/theme/frame.css";
// We don't import the light theme CSS because we are in dark mode and will rely on overrides/default
import { configureAngularToolbar, angularToolbarPlugin } from './plugins/toolbar';
import { configureAngularBlockHandle, angularBlockHandlePlugin } from './plugins/block-handle';
import { gfm } from '@milkdown/kit/preset/gfm';
import {
    textColorAttr, textColorSchema, setTextColorCommand,
    fontFamilyMark, setFontFamilyCommand,
    fontSizeMark, setFontSizeCommand,
    underlineAttr, underlineSchema, setUnderlineCommand
} from './plugins/marks';
import { textAlignPlugin, setTextAlignCommand, indentPlugin, indentCommand, outdentCommand } from './plugins/nodes';
import { history, undoCommand, redoCommand } from '@milkdown/kit/plugin/history';
import { commandsCtx } from '@milkdown/kit/core';
import { EditorService } from '../../services/editor.service';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.css']
})
export class EditorComponent implements AfterViewInit, OnDestroy {
    @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;
    private crepe?: Crepe;

    constructor(
        private injector: EnvironmentInjector,
        private appRef: ApplicationRef,
        private editorService: EditorService
    ) { }

    async ngAfterViewInit() {
        if (!this.editorContainer) return;

        this.crepe = new Crepe({
            root: this.editorContainer.nativeElement,
            defaultValue: '# Hello, Crepe!\nStart writing...',
            features: {
                [Crepe.Feature.Toolbar]: false, // We will use our custom toolbar
                [Crepe.Feature.BlockEdit]: false, // We will use our custom block handle
            }
        });

        // Configure for dark mode explicitly if needed, but usually just CSS vars.
        // The previous design system is Zinc, we might need to patch Crepe variables.

        // Configure Angular Toolbar & Block Handle
        this.crepe.editor
            .use(gfm) // Enable GFM (Task Lists, etc.)
            .use(history) // Enable History (Undo/Redo)
            .config(configureAngularToolbar(this.injector, this.appRef))
            .use(angularToolbarPlugin)
            .config(configureAngularBlockHandle(this.injector, this.appRef))
            .use(angularBlockHandlePlugin)
            // Register Custom Marks & Nodes
            .use(textColorAttr)
            .use(textColorSchema)
            .use(setTextColorCommand)
            .use(underlineAttr)
            .use(underlineSchema)
            .use(setUnderlineCommand)
            .use(fontFamilyMark)
            .use(setFontFamilyCommand)
            .use(fontSizeMark)
            .use(setFontSizeCommand)
            .config(textAlignPlugin)
            .use(setTextAlignCommand)
            .config(indentPlugin)
            .use(indentCommand)
            .use(outdentCommand);

        await this.crepe.create();
        this.editorService.registerEditor(this.crepe);

        this.crepe.on((listener) => {
            listener.updated((ctx, doc, prevDoc) => {
                if (prevDoc && !doc.eq(prevDoc)) {
                    const json = doc.toJSON();
                    const markdown = this.crepe?.getMarkdown() ?? '';
                    this.editorService.updateContent({ json, markdown });
                }
            });
        });
    }

    ngOnDestroy() {
        this.crepe?.destroy();
    }

    undo() {
        try {
            this.crepe?.editor.ctx.get(commandsCtx).call(undoCommand.key);
        } catch (e) {
            console.error('Undo failed', e);
        }
    }

    redo() {
        try {
            this.crepe?.editor.ctx.get(commandsCtx).call(redoCommand.key);
        } catch (e) {
            console.error('Redo failed', e);
        }
    }
}
