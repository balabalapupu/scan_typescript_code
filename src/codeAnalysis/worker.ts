import { workerData, parentPort } from "worker_threads";
import tsCompiler from "typescript";
const _parentPort = parentPort as unknown as MessagePort;

const { filePath, parseType, context } = workerData;

// 创建 Program 编译上下文，是 TS 代码分析的基础
const program = tsCompiler.createProgram([filePath], {});
//   通过 Program 获取代码文件对应的 SourceFile 对象，也就是 AST
const AST = program.getSourceFile(filePath);
//   用于通过 program 获取 Checker 控制器，该控制器用来类型检查、语义检查等；
const typeChecking = program.getTypeChecker();
//   用于通过 program 获取 Checker 控制器，该控制器用来类型检查、语义检查等；

const numberOfElements = 100;
const sharedBuffer = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT * numberOfElements
);
const arr = new Int32Array(sharedBuffer);

_parentPort.postMessage({ a: 1 });
