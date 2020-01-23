import { Range } from 'vscode';

export interface NamedImport {
    importName: string;
    alias?: string;
}

export type DestructedImport = NamedImport;

export interface TypescriptImport {
    path: string;
    range: Range;
    default?: string;
    namedImports?: DestructedImport[];
    namespace?: string;
}

export interface TypescriptImportGroup {
    imports: TypescriptImport[];
    range: Range;
}
