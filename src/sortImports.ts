import { Position, Range, TextDocument, TextEdit } from 'vscode';
import parseImports from './parseImportNodes';
import processImports from './processImports';
import writeImports from './writeImports';

export default function sortImports(document: TextDocument) {
    let { groups, importRange } = parseImports(document);
    groups = processImports(groups);
    let sortedImportText = writeImports(groups);

    return [
        TextEdit.delete(importRange),
        TextEdit.insert(new Position(0, 0), sortedImportText)
    ];
}
