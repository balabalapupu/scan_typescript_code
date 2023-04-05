import tsCompiler from "typescript";
import { CodeAnalysisCore } from "../src/codeAnalysis";
import { ParseTsReturnType } from "../src/parse";
export type Compute<A> = A extends () => unknown ? A : { [K in keyof A]: A[K] };
export type Merge<O1 extends object, O2 extends object> = Compute<
  O1 & Omit<O2, keyof O1>
>; // 合并两个
export type AppendToObject<T, U extends string, V> = {
  [K in keyof T | U]: K extends keyof T ? T[K] : V;
};
export type SetOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export type PickValue<T extends object, U extends keyof T> = T[U];
// export type NonNullable<T> = T extends null | undefined ? never : T;

export type ConfigTypeType = Merge<
  Record<"scanSource", ScanSourceType[]>,
  analysisModalType
>;
export type ScanSourceType = {
  name: string;
  path: string[];
  packageFile?: string;
};

export type analysisModalType = {
  analysisImportsTarget: string;
  analysisIdentifierTarget?: string[];
  analysisPlugins?: any[];
  browserApiTarget?: string[];
};

export type PromiseCallback = (config: unknown) => void;

// name: 项目名称，parse: 扫描文件开始的路径，show: 扫描文件路径
export type EntryType = Merge<
  Record<"name", string>,
  Partial<Record<"parse" | "show", string[]>>
>;

export type ASTTempType = {
  name: string;
  origin: tsCompiler.__String | null | string | undefined;
  symbolPos: number;
  symbolEnd: number;
  identifierPos: number;
  identifierEnd: number;
  line: number;
};

export type ASTTemTypeCheckType = ASTTempType | null;

export type ImportItemsTargetType = Pick<
  ASTTempType,
  "origin" | "symbolPos" | "symbolEnd" | "identifierEnd" | "identifierPos"
>;

export type ImportItemType = {
  [propName: string]: ImportItemsTargetType;
};

export type ImportItemMap = {
  [propName: string]: {
    callOrigin?: ASTTempType["origin"];
    callFiles: string[];
  };
};

export type CheckPropertyAccessType = {
  baseNode: tsCompiler.Node;
  depth: number;
  apiName: string;
};

export type CommonTsCompilerNode = tsCompiler.Node & {
  escapedText: string;
  name: {
    escapedText: string;
  };
  parent: CommonTsCompilerNode;
};

export type CallFilesType = {
  [propName: string]: Merge<
    Record<"projectName", string>,
    Record<"lines", number[]>
  >;
};

export type PluginContextType = {
  [propName: string]: {
    [propName: string]: {
      callNum: number;
      callOrigin?: unknown;
      callFiles: CallFilesType;
    };
  };
};

export type CODEFILETYPE = "ts" | "vue";

export type DiagnosisInfosType = {
  projectName: string;
  matchImportItem?: ImportItemsTargetType;
  apiName?: string;
  file: string;
  line?: number;
  stack: any;
};

export type HookCallback<T extends HookList> = (config: T) => boolean;

export type PluginFuncReturnType<T extends HookList> = {
  mapName: string;
  hookType: string;
  pluginCallbackFunction: HookCallback<T>;
};
export type PluginFuncType<T extends HookList> = () => PluginFuncReturnType<T>;

export type AfterParseHookArgType = {
  AST: ParseTsReturnType["AST"];
  typeChecking: tsCompiler.TypeChecker;
  baseLine: number;
  filePath: string;
};

export type workPluginFuncArg = {
  AST: ParseTsReturnType["AST"];
  typeChecking?: tsCompiler.TypeChecker;
  baseLine: number;
  filePath: string;
  originFilePath?: string;
  analysisIdentifierTarget: string[];
};

// ------------
export type workPluginContextType = {
  queueIntercept: boolean;
  queueReportReuslt: {
    [propName: string]: {
      callNum: number;
      callOrigin?: unknown;
      callFiles: CallFilesType;
    };
  };
};

export type ReportDataType = {
  [propName: string]: workPluginContextType["queueReportReuslt"];
};

export type HookList = AfterParseHookArgType | AfterAnalysisHookArgType;

export type AfterAnalysisHookArgType = {
  context: CodeAnalysisCore;
  tsCompiler: typeof import("typescript");
  node: tsCompiler.Node;
  matchImportItem: ImportItemsTargetType;
} & Record<"apiName" | "filePath" | "projectName", string> &
  Record<"depth" | "line", number>;
