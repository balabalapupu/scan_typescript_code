import { CodeAnalysisCore } from "../codeAnalysis/index.js";
import {
  HookCallback,
  AfterParseHookArgType,
  PluginFuncType,
} from "../../type/index.js";
import tsCompiler from "typescript";
import { checkPropertyAccess } from "../parse/index.js";

type pluginFunc = (
  config: AfterParseHookArgType,
  context: CodeAnalysisCore,
  mapName: string
) => boolean;

const identifierCheck: PluginFuncType<AfterParseHookArgType> = (
  analysisContext
) => {
  const mapName = "IdentifierCheckPlugin";
  // 在分析实例上下文挂载副作用
  Reflect.set(analysisContext["pluginStoreList"], mapName, {});
  const isApiCheck: HookCallback<AfterParseHookArgType> = (config) => {
    const res = pluginFunc(config, analysisContext, mapName);
    return res;
  };

  return {
    mapName: mapName,
    pluginCallbackFunction: isApiCheck,
    hookType: "afterParseHook",
  };
};

const pluginFunc: pluginFunc = (
  { AST, baseLine, filePath },
  context,
  mapName
): boolean => {
  const targetIndetifier = context.analysisIdentifierTarget;
  if (targetIndetifier.length == 0) return false;
  function walk(node: tsCompiler.Node) {
    tsCompiler.forEachChild(node, walk);
    if (!AST) return;
    const line =
      AST.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;

    if (
      tsCompiler.isIdentifier(node) &&
      node.escapedText &&
      targetIndetifier.includes(node.escapedText)
    ) {
      if (!node.parent) return;
      const { apiName } = checkPropertyAccess(node); // 获取基础分析节点信息

      const storePos = context["pluginStoreList"][mapName];
      if (!storePos[apiName]) {
        Reflect.set(storePos, apiName, {
          callNum: 1,
          callFiles: {},
        });

        Reflect.set(storePos[apiName].callFiles, filePath, {
          lines: [line],
        });
      } else {
        Reflect.set(
          storePos[apiName],
          "callNum",
          storePos[apiName]["callNum"] + 1
        );

        if (!Object.keys(storePos[apiName].callFiles).includes(filePath)) {
          Reflect.set(storePos[apiName].callFiles, filePath, {
            lines: [line],
          });
        } else {
          storePos[apiName].callFiles[filePath].lines.push(line);
        }
      }
    }
  }
  walk(AST as tsCompiler.Node);
  return false;
};

export default identifierCheck;
