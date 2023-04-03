import {
  AfterAnalysisHookArgType,
  HookCallback,
  PluginFuncType,
} from "../../type";

const defaultPlugin: PluginFuncType<AfterAnalysisHookArgType> = (
  analysisContext
) => {
  const mapName = "variableDeclarationCheckMap";
  // 在分析实例上下文挂载副作用
  Reflect.set(analysisContext["pluginStoreList"], mapName, {});

  const isApiCheck: HookCallback<AfterAnalysisHookArgType> = ({
    context,
    apiName,
    matchImportItem,
    filePath,
    projectName,
    line,
  }) => {
    try {
      const storePos = context["pluginStoreList"][mapName];
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
        Reflect.set(
          storePos[apiName],
          "callNum",
          storePos[apiName]["callNum"] + 1
        );
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

      return true; // true: 命中规则, 终止执行后序插件
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
    pluginCallbackFunction: isApiCheck,
    hookType: "afterAnalysisHook",
  };
};

export default defaultPlugin;
