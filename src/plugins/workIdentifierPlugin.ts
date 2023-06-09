import { workPluginContextType, workPluginFuncArg } from "../../type/index.js";
import path from "path";
import tsCompiler from "typescript";
import { checkPropertyAccess } from "../parse/index.js";

import { fileURLToPath } from "url";
import {
  workCallbackFunc,
  workOutsideHookFunc,
} from "../worker/identifierworker.js";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export type IdentifierPluginFuncType<T extends object> = (
  config: T,
  analysisDetail: workPluginContextType["queueReportReuslt"]
) => workPluginContextType;

const identifierCheck: workOutsideHookFunc = () => {
  const mapName = "IdentifierCheckPlugin";
  const analysisDetail: workPluginContextType["queueReportReuslt"] = {};
  // 在分析实例上下文挂载副作用
  const isApiCheck: workCallbackFunc = (config) => {
    try {
      const res = pluginFunc(config, analysisDetail);
      return res;
    } catch (e: any) {
      return {
        queueIntercept: true,
        queueReportReuslt: analysisDetail,
      };
    }
  };

  return {
    mapName: mapName,
    mapPath: path.join(__dirname, "./workIdentifierPlugin.js"),
    pluginCallbackFunction: isApiCheck,
    hookType: "afterParseHook",
  };
};

const pluginFunc: IdentifierPluginFuncType<workPluginFuncArg> = (
  { AST, baseLine, filePath, analysisIdentifierTarget, originFilePath },
  analysisDetail
) => {
  const targetIndetifier = analysisIdentifierTarget;
  if (targetIndetifier.length == 0)
    return {
      queueIntercept: true,
      queueReportReuslt: analysisDetail,
    };
  function dfs(node: tsCompiler.Node) {
    tsCompiler.forEachChild(node, dfs);
    if (!AST) return analysisDetail;
    const line =
      AST.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;

    if (
      tsCompiler.isIdentifier(node) &&
      node.escapedText &&
      targetIndetifier.includes(node.escapedText)
    ) {
      if (
        !node.parent ||
        tsCompiler.isTypeReferenceNode(node.parent) ||
        tsCompiler.isImportSpecifier(node.parent) ||
        Reflect.has(node, "moduleSpecifier")
      ) {
        return {
          queueIntercept: true,
          queueReportReuslt: analysisDetail,
        };
      }

      const { apiName } = checkPropertyAccess(node); // 获取基础分析节点信息

      const _filePath =
        originFilePath !== "" ? (originFilePath as string) : filePath;

      const storePos: any = analysisDetail;
      if (!storePos[apiName]) {
        Reflect.set(storePos, apiName, {
          callNum: 1,
          callFiles: {},
        });

        Reflect.set(storePos[apiName].callFiles, _filePath, {
          lines: [line],
        });
      } else {
        Reflect.set(
          storePos[apiName],
          "callNum",
          storePos[apiName]["callNum"] + 1
        );

        if (!Object.keys(storePos[apiName].callFiles).includes(_filePath)) {
          Reflect.set(storePos[apiName].callFiles, _filePath, {
            lines: [line],
          });
        } else {
          storePos[apiName].callFiles[_filePath].lines.push(line);
        }
      }
    }
  }
  dfs(AST as tsCompiler.Node);
  return {
    queueIntercept: true,
    queueReportReuslt: analysisDetail,
  };
};

export default identifierCheck;
