import { workerData, parentPort } from "worker_threads";
import tsCompiler from "typescript";
import { checkPropertyAccess, parseTs } from "../parse/index.js";
import {
  ASTTemTypeCheckType,
  ImportItemType,
  ReportDataType,
  workPluginContextType,
} from "../../type/index.js";
import { CodeAnalysisCore } from "../codeAnalysis/index.js";
import { getFunc } from "../util/index.js";
const _parentPort = parentPort as unknown as MessagePort;

export type PluginFuncArg = {
  importItems: ReturnType<CodeAnalysisCore.analysisImportDeclarationForAST>;
  AST: tsCompiler.SourceFile | undefined;
  typeChecking: tsCompiler.TypeChecker;
  filePath: string;
  projectName: string;
  baseLine: number;
};
type FuncList = {
  pluginName: string;
  pluginFunc: workCallbackFunc;
};

export type workOutsideHookFunc = () => workInsideHookType;

export type workInsideHookType = {
  mapName: string;
  hookType: string;
  mapPath: string;
  pluginCallbackFunction: workCallbackFunc;
};

export type workCallbackFunc = (config: PluginFuncArg) => workPluginContextType;

const importItemMap: CodeAnalysisCore.importItemMap = {};
const { filePath, hookMap, analysisImportsTarget, baseLine, config } =
  workerData;
const reportSingleworker: ReportDataType = {};

// 查找需要分析的 import
const analysisImportDeclarationForAST: CodeAnalysisCore.analysisImportDeclarationForAST =
  ({ AST, filePath, baseLine = 0 }) => {
    const importItems: ImportItemType = {};
    // 遍历 AST 用的
    function handleAST(node: tsCompiler.Node) {
      if (!AST) return;

      tsCompiler.forEachChild(node, handleAST);

      // 获取节点行
      const line =
        AST.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;

      // 判断是否是 ImportDeclaration
      if (!tsCompiler.isImportDeclaration(node)) return;

      if (!Reflect.has(node, "moduleSpecifier")) return;

      const moduleSpecifier =
        node.moduleSpecifier as tsCompiler.LiteralExpression;

      if (moduleSpecifier.text !== analysisImportsTarget) return; // 当前 AST 节点字面量就是要查找的字面量

      if (!node.importClause) return; // import 格式有问题

      // 全局引入
      if (
        tsCompiler.isImportClause(node.importClause) &&
        node.importClause.name
      ) {
        const temp: ASTTemTypeCheckType = {
          name: node.importClause.name?.escapedText as string,
          origin: null,
          symbolPos: node.importClause.pos,
          symbolEnd: node.importClause.end,
          identifierPos: node.importClause.name?.pos,
          identifierEnd: node.importClause.name?.end,
          line: line,
        };

        dealImports(importItems, temp, filePath);
      } else if (
        tsCompiler.isImportClause(node.importClause) &&
        node.importClause.namedBindings
      ) {
        // 局部引入 namedBindings 这玩意有两种情况
        if (tsCompiler.isNamedImports(node.importClause.namedBindings)) {
          // 至少得有一个值
          if (node.importClause.namedBindings?.elements?.length > 0) {
            const tempArr = node.importClause.namedBindings.elements;
            tempArr.forEach((element) => {
              if (tsCompiler.isImportSpecifier(element)) {
                let temp: ASTTemTypeCheckType = {
                  name: element.name?.escapedText as string,
                  origin: element.propertyName?.escapedText,
                  symbolPos: element.pos,
                  symbolEnd: element.end,
                  identifierPos: element.name?.pos,
                  identifierEnd: element.name?.end,
                  line: line,
                };
                dealImports(importItems, temp, filePath);
              }
            });
          }
        } else if (
          tsCompiler.isNamespaceImport(node.importClause.namedBindings) &&
          node.importClause.namedBindings.name
        ) {
          // 全局 as 引入
          const temp: ASTTemTypeCheckType = {
            name: node.importClause.namedBindings.name.escapedText as string,
            origin: "*",
            symbolPos: node.importClause.namedBindings.pos,
            symbolEnd: node.importClause.namedBindings.end,
            identifierPos: node.importClause.namedBindings.name.pos,
            identifierEnd: node.importClause.namedBindings.name.end,
            line: line,
          };
          dealImports(importItems, temp, filePath);
        }
      }
    }
    handleAST(AST as tsCompiler.Node);

    return importItems;
  };

const analysisImportsTargetFunc: CodeAnalysisCore.AnalysisImportsTargetFuncType =
  ({ AST, baseLine, typeChecking, filePath, config }) => {
    // 2、 查找文件内 Import
    const importItems = analysisImportDeclarationForAST({
      AST,
      filePath,
      baseLine,
    });
    // 3、查找 Import 对应的 使用位置
    if (Object.keys(importItems).length == 0) return {};
    const report: ReportDataType = getSingleworkerReport(hookQueue, {
      importItems,
      AST,
      typeChecking,
      projectName: config.name,
      baseLine,
      filePath,
    });
    return report;
  };

// 处理imports相关map
function dealImports(
  importItems: ImportItemType,
  temp: NonNullable<ASTTemTypeCheckType>,
  filePath: string
): void {
  Reflect.set(importItems, temp["name"], {
    origin: temp["origin"],
    symbolPos: temp["symbolPos"],
    symbolEnd: temp["symbolEnd"],
    identifierPos: temp["identifierPos"],
    identifierEnd: temp["identifierEnd"],
  });

  if (!importItemMap[temp.name]) {
    Reflect.set(importItemMap, temp["name"], {
      callOrigin: temp["origin"],
      callFiles: [filePath],
    });
  } else {
    importItemMap[temp.name].callFiles.push(filePath);
  }
}

function getSingleworkerReport(
  hookQueue: FuncList[],
  workInfo: PluginFuncArg
): ReportDataType {
  const reportSingleworker: ReportDataType = {};
  callHook(hookQueue, workInfo, 0, reportSingleworker);

  return reportSingleworker;
}

console.log(1, "---1---");

function callHook(
  hookQueue: FuncList[],
  workInfo: PluginFuncArg,
  index: number,
  reportSingleworker: ReportDataType
): ReportDataType {
  if (hookQueue.length == 0) return reportSingleworker;
  const ch = hookQueue[index];
  const res = ch.pluginFunc(workInfo);
  const { queueIntercept, queueReportReuslt } = res;
  reportSingleworker[ch.pluginName] = queueReportReuslt;
  if (queueIntercept && index < hookQueue.length - 1) {
    return callHook(hookQueue, workInfo, index + 1, reportSingleworker);
  } else {
    return reportSingleworker;
  }
}

// 获取参数
if (!hookMap.size) {
  _parentPort.postMessage(null);
}
// 1. 转译 TS 文件
const { AST, typeChecking } = parseTs(filePath);

// 2. 获取插件函数
const hookQueue: FuncList[] = await getFunc(hookMap);
// 通过 AST 查找 import 及对应使用
const report: ReportDataType = analysisImportsTargetFunc({
  AST,
  typeChecking,
  baseLine,
  filePath,
  config,
});

_parentPort.postMessage(report);

// 插件调用队列
