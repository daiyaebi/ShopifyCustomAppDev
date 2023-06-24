"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArchitectureSet = exports.getArchitectureName = exports.getArchitecture = exports.builtinModules = void 0;
const tslib_1 = require("tslib");
const module_1 = tslib_1.__importDefault(require("module"));
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
function builtinModules() {
    // @ts-expect-error
    return new Set(module_1.default.builtinModules || Object.keys(process.binding(`natives`)));
}
exports.builtinModules = builtinModules;
function getLibc() {
    var _a, _b, _c, _d;
    // It seems that Node randomly crashes with no output under some circumstances when running a getReport() on Windows.
    // Since Windows has no libc anyway, shortcut this path.
    if (process.platform === `win32`)
        return null;
    const report = (_b = (_a = process.report) === null || _a === void 0 ? void 0 : _a.getReport()) !== null && _b !== void 0 ? _b : {};
    const sharedObjects = (_c = report.sharedObjects) !== null && _c !== void 0 ? _c : [];
    // Matches the first group if libc, second group if musl
    const libcRegExp = /\/(?:(ld-linux-|[^/]+-linux-gnu\/)|(libc.musl-|ld-musl-))/;
    return (_d = miscUtils.mapAndFind(sharedObjects, entry => {
        const match = entry.match(libcRegExp);
        if (!match)
            return miscUtils.mapAndFind.skip;
        if (match[1])
            return `glibc`;
        if (match[2])
            return `musl`;
        throw new Error(`Assertion failed: Expected the libc variant to have been detected`);
    })) !== null && _d !== void 0 ? _d : null;
}
let architecture;
let architectureSet;
function getArchitecture() {
    return architecture = architecture !== null && architecture !== void 0 ? architecture : {
        os: process.platform,
        cpu: process.arch,
        libc: getLibc(),
    };
}
exports.getArchitecture = getArchitecture;
function getArchitectureName(architecture = getArchitecture()) {
    if (architecture.libc) {
        return `${architecture.os}-${architecture.cpu}-${architecture.libc}`;
    }
    else {
        return `${architecture.os}-${architecture.cpu}`;
    }
}
exports.getArchitectureName = getArchitectureName;
function getArchitectureSet() {
    const architecture = getArchitecture();
    return architectureSet = architectureSet !== null && architectureSet !== void 0 ? architectureSet : {
        os: [architecture.os],
        cpu: [architecture.cpu],
        libc: architecture.libc ? [architecture.libc] : [],
    };
}
exports.getArchitectureSet = getArchitectureSet;
