import {
  HookFunctionType,
  ImportItemsTargetType,
  PluginFunctionType,
} from "../../type";
import tsCompiler from "typescript";

const methodPlugin: PluginFunctionType = (analysisContext) => {
  const mapName = "methodMap";
  // 在分析实例上下文挂载副作用
  Reflect.set(analysisContext, mapName, {});

  const isMethodCheck: HookFunctionType = ({
    context,
    tsCompiler,
    node,
    apiName,
    matchImportItem,
    filePath,
    projectName,
    line,
  }) => {
    try {
      if (node.parent && tsCompiler.isCallExpression(node.parent)) {
        // 存在于函数调用表达式中
        if (
          node.parent.expression.pos == node.pos &&
          node.parent.expression.end == node.end
        ) {
          // 命中函数名method检测
          if (!context["pluginStoreList"][mapName][apiName]) {
            Reflect.set(context["pluginStoreList"][mapName], apiName, {
              callName: 1,
              callOrigin: matchImportItem.origin,
              callFiles: {},
            });

            Reflect.set(
              context["pluginStoreList"][mapName][apiName].callFiles,
              filePath,
              {
                projectName: projectName,
                lines: [line],
              }
            );
          } else {
            context["pluginStoreList"].mapName.apiName.callNum++;
            if (
              !Object.keys(
                context["pluginStoreList"][mapName][apiName].callFiles
              ).includes(filePath)
            ) {
              Reflect.set(
                context["pluginStoreList"][mapName][apiName].callFiles,
                filePath,
                {
                  projectName: projectName,
                  lines: [line],
                }
              );
              //   context[mapName][apiName].callFiles[filePath].httpRepo = httpRepo;
            } else {
              context["pluginStoreList"][mapName][apiName].callFiles[
                filePath
              ].lines.push(line);
            }
          }
          return true; // true: 命中规则, 终止执行后序插件
        }
      }
      return false; // false: 未命中检测逻辑, 继续执行后序插件
    } catch (e: any) {
      const info = {
        projectName: projectName,
        matchImportItem: matchImportItem,
        apiName: apiName,
        // httpRepo: httpRepo + filePath.split("&")[1] + "#L" + line,
        file: filePath.split("&")[1],
        line: line,
        stack: e.stack,
      };
      context.addDiagnosisInfo(info);
      return false; // false: 插件执行报错, 继续执行后序插件
    }
  };

  // 返回分析Node节点的函数
  return {
    mapName: mapName,
    pluginCallbackFunction: isMethodCheck,
    pluginCallbackFunctionAfterHook: null,
  };
};

export default methodPlugin;
