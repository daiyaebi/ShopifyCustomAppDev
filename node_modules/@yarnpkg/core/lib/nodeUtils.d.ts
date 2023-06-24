export declare function builtinModules(): Set<string>;
export declare type Architecture = {
    os: string;
    cpu: string;
    libc: string | null;
};
export declare type ArchitectureSet = {
    os: Array<string> | null;
    cpu: Array<string> | null;
    libc: Array<string> | null;
};
export declare function getArchitecture(): Architecture;
export declare function getArchitectureName(architecture?: Architecture): string;
export declare function getArchitectureSet(): ArchitectureSet;
