import { Position, Range, TextDocument } from 'vscode';
import { DestructedImport, TypescriptImport, TypescriptImportGroup } from './TypescriptImport';



const name = `((?!\\d)(?:(?!\\s)[$\\w\\u0080-\\uFFFF]|\\\\u[\\da-fA-F]{4}|\\\\u\\{[\\da-fA-F]+\\})+)`;
const ws = `[\\s\\n\\r]`;

const namespaceToken = `\\*\\s+as\\s+(${name})`;
const blankLineToken = `(?:\\h*\\n){2,}`
const defaultImportToken = name;
const destructingImportToken = `(${name})(\\s+as\\s+(${name}))?`;
const destructingImport = `{(${ws}*${destructingImportToken}(,${ws}*${destructingImportToken})*${ws}*)}`;
const defaultAndDestructingImport = `${defaultImportToken}${ws}*,${ws}*${destructingImport}`;
const combinedImportTypes = `(${namespaceToken}|${defaultImportToken}|${destructingImport}|${defaultAndDestructingImport})`;
const importRegexString = `^import\\s+(${combinedImportTypes}\\s+from\\s+)?['"]([@\\w\\\\/\.-]+)['"];?\\r?\\n?`;

// Group 5 || Group 18 - default import
// Group 3 - namespace import
// Group 6 || Group 19 - destructing import group; requires further tokenizing
// Group 31 - file path or package
const importRegex = new RegExp(importRegexString, 'gm');
const blankLineRegex = new RegExp(blankLineToken, 'gm');

// Group 1 - importName
// Group 4 - alias
const destructingImportTokenRegex = new RegExp(destructingImportToken);

export default function parseImportNodes(document: TextDocument) {
    let match;
    let source = document.getText();
    let imports: TypescriptImport[] = [];
    importRegex.lastIndex = 0;

    while (match = importRegex.exec(source)) {
        imports.push({
            path: match[31],
            default: match[5] || match[18],
            namedImports: parseDestructiveImports(match[6] || match[19]),
            namespace: match[3],
            range: new Range(
                document.positionAt(match.index),
                document.positionAt(importRegex.lastIndex)
            ),
        });
    }


    const importStart = imports[0].range.start;
    const importEnd = imports[imports.length - 1].range.end;
    const importRange = new Range(importStart, importEnd);

    const importSource = document.getText(importRange);


    let groups: TypescriptImportGroup[] = [{
        range: new Range(
            new Position(0, 0),
            new Position(1, 0)
        ),
        imports: [],
    }, {
        range: new Range(
            importEnd,
            importEnd.translate(1)
        ),
        imports: [],
    }];

    blankLineRegex.lastIndex = 0;

    while (match = blankLineRegex.exec(importSource)) {
        let startPos = document.positionAt(match.index)
        startPos = startPos.translate(1, -startPos.character);
        const endPos = document.positionAt(blankLineRegex.lastIndex);
        groups.push({
            range: new Range(startPos, endPos),
            imports: [],
        });
    }

    groups.sort((a, b) => a.range.start.isBefore(b.range.start) ? -1 : 1);
    groups.forEach((group) => {
        group.imports = imports.filter((imprt) => imprt.range.end.isBefore(group.range.end));
        imports = imports.filter((imprt) => group.imports.indexOf(imprt) < 0);
    });

    groups = groups.filter((group) => !!group.imports.length);
    return { groups, importRange };
}

function parseDestructiveImports(destructiveImports: string): DestructedImport[] {
    if (!destructiveImports) {
        return null;
    }

    return destructiveImports
        .split(',')
        .map(destructiveImport => {
            let match = destructingImportTokenRegex.exec(destructiveImport);
            return {
                importName: match[1],
                alias: match[4],
            };
        });
}
