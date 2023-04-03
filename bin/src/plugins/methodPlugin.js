const methodPlugin = (analysisContext) => {
    const mapName = "callExpressionCheckPlugin";
    // 在分析实例上下文挂载副作用
    Reflect.set(analysisContext["pluginStoreList"], mapName, {});
    const isMethodCheck = ({ context, tsCompiler, node, apiName, matchImportItem, filePath, projectName, line, }) => {
        try {
            if (node.parent && tsCompiler.isCallExpression(node.parent)) {
                // 存在于函数调用表达式中
                if (node.parent.expression.pos == node.pos &&
                    node.parent.expression.end == node.end) {
                    const storePos = context["pluginStoreList"][mapName];
                    // 命中函数名method检测
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
                    }
                    else {
                        Reflect.set(storePos[apiName], "callNum", storePos[apiName]["callNum"] + 1);
                        if (!Object.keys(storePos[apiName].callFiles).includes(filePath)) {
                            Reflect.set(storePos[apiName].callFiles, filePath, {
                                projectName: projectName,
                                lines: [line],
                            });
                        }
                        else {
                            storePos[apiName].callFiles[filePath].lines.push(line);
                        }
                    }
                    return true; // true: 命中规则, 终止执行后序插件
                }
                return false;
            }
            return false; // false: 未命中检测逻辑, 继续执行后序插件
        }
        catch (e) {
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
        hookType: "afterAnalysisHook",
    };
};
export default methodPlugin;
