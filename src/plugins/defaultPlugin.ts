import { workPluginContextType } from "../../type/index.js";
import path from "path";
import tsCompiler from "typescript";
import { fileURLToPath } from "url";
import {
  PluginFuncArg,
  workCallbackFunc,
  workOutsideHookFunc,
} from "../worker/importdeclarationworker.js";
import { checkPropertyAccess } from "../parse/index.js";

export type IdentifierPluginFuncType<T extends object> = (
  config: T,
  analysisDetail: workPluginContextType["queueReportReuslt"]
) => workPluginContextType;

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const defaultPlugin: workOutsideHookFunc = () => {
  const mapName = "defaultCheckPlugin";
  const analysisDetail: workPluginContextType["queueReportReuslt"] = {};
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

  // 返回分析Node节点的函数
  return {
    mapName: mapName,
    pluginCallbackFunction: isApiCheck,
    hookType: "afterAnalysisHook",
    mapPath: path.join(__dirname, "./defaultPlugin.js"),
  };
};

const pluginFunc: IdentifierPluginFuncType<PluginFuncArg> = (
  config,
  analysisDetail
) => {
  const { importItems, AST, typeChecking, projectName, baseLine, filePath } =
    config;

  const ImportItemNames = Object.keys(importItems);
  // 遍历AST
  function walk(node: tsCompiler.Node) {
    tsCompiler.forEachChild(node, walk);

    if (!AST) return;

    const line =
      AST.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;

    // 如果当前节点是命中的标识符，需要排除各种同名干扰（pos,end）
    if (
      tsCompiler.isIdentifier(node) &&
      node.escapedText &&
      ImportItemNames.length > 0 &&
      ImportItemNames.includes(node.escapedText)
    ) {
      // 过滤掉不相干的 Identifier 节点后选中的真正节点
      const matchImportItem = importItems[node.escapedText];
      if (
        node.pos != matchImportItem.identifierPos &&
        node.end != matchImportItem.identifierEnd
      ) {
        // 排除 Import 语句中同名节点干扰后
        // AST 节点对应的 Symbol 对象
        const symbol = typeChecking.getSymbolAtLocation(node);
        if (symbol && symbol.declarations && symbol.declarations.length > 0) {
          // 存在上下文声明，相同空间的 声明的 symbol 和 对应的表达式的pos、end是 一样的
          const nodeSymbol = symbol.declarations[0];
          if (
            matchImportItem.symbolPos == nodeSymbol.pos &&
            matchImportItem.symbolEnd == nodeSymbol.end
          ) {
            if (!node.parent) return;
            const { baseNode, depth, apiName } = checkPropertyAccess(node); // 获取基础分析节点信息
            storeApi(
              analysisDetail,
              {
                apiName,
                matchImportItem,
                filePath,
                projectName,
                line,
              },
              baseNode
            );
          }
        }
      }
    }
  }
  walk(AST as tsCompiler.Node);

  return {
    queueIntercept: true,
    queueReportReuslt: analysisDetail,
  };
};

function storeApi(analysisDetail: any, config: any, node: tsCompiler.Node) {
  const { apiName, matchImportItem, filePath, projectName, line } = config;
  const storePos: workPluginContextType["queueReportReuslt"] = analysisDetail;

  if (node.parent && tsCompiler.isTypeReferenceNode(node.parent)) {
    storeDefault(
      storePos,
      `type:${apiName}`,
      matchImportItem,
      filePath,
      projectName,
      line
    );
  } else if (
    node.parent &&
    tsCompiler.isCallExpression(node.parent) &&
    node.parent.expression.pos == node.pos &&
    node.parent.expression.end == node.end
  ) {
    storeDefault(
      storePos,
      `method:${apiName}`,
      matchImportItem,
      filePath,
      projectName,
      line
    );
  } else {
    storeDefault(
      storePos,
      `${apiName}`,
      matchImportItem,
      filePath,
      projectName,
      line
    );
  }
}

function storeDefault(
  storePos: workPluginContextType["queueReportReuslt"],
  apiName: string,
  matchImportItem: any,
  filePath: string,
  projectName: string,
  line: number
) {
  if (!storePos[apiName]) {
    Reflect.set(storePos, apiName, {
      callNum: 1,
      callOrigin: matchImportItem.origin,
      callFiles: {},
    });
    Reflect.set(storePos[apiName].callFiles, filePath, {
      projectName: projectName,
      lines: [line],
    });
  } else {
    Reflect.set(storePos[apiName], "callNum", storePos[apiName]["callNum"] + 1);
    if (!Object.keys(storePos[apiName].callFiles).includes(filePath)) {
      Reflect.set(storePos[apiName].callFiles, filePath, {
        projectName: projectName,
        lines: [line],
      });
      //   context[mapName][apiName].callFiles[filePath].httpRepo = httpRepo;
    } else {
      storePos[apiName].callFiles[filePath].lines.push(line);
    }
  }
}

export default defaultPlugin;
