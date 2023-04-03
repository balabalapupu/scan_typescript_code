import tsCompiler from "typescript";
import { checkPropertyAccess } from "../parse/index.js";
const identifierCheck = (analysisContext) => {
    const mapName = "browserIdentifierPlugin";
    // 在分析实例上下文挂载副作用
    Reflect.set(analysisContext["pluginStoreList"], mapName, {});
    const isBrowserIdentifierCheck = (config) => {
        const res = pluginFunc(config, analysisContext, mapName);
        return res;
    };
    return {
        mapName: mapName,
        pluginCallbackFunction: isBrowserIdentifierCheck,
        hookType: "afterParseHook",
    };
};
const pluginFunc = ({ AST, baseLine, filePath, typeChecking }, context, mapName) => {
    const browserApiTarget = context.browserApiTarget;
    if (browserApiTarget.length == 0)
        return false;
    function walk(node) {
        tsCompiler.forEachChild(node, walk);
        if (!AST)
            return;
        const line = AST.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;
        if (tsCompiler.isIdentifier(node) &&
            node.escapedText &&
            browserApiTarget.includes(node.escapedText)) {
            if (!node.parent)
                return;
            // 命中Browser Api Item Name
            const symbol = typeChecking.getSymbolAtLocation(node);
            if (!symbol)
                return false;
            if (!symbol.declarations)
                return false;
            if (symbol.declarations.length > 1 ||
                (symbol.declarations.length == 1 &&
                    symbol.declarations[0].pos > AST.end)) {
                const { depth, apiName } = checkPropertyAccess(node); // 获取基础分析节点信息
                const _parent = node.parent;
                const _parentName = _parent.name;
                if (!(depth > 0 &&
                    _parentName &&
                    _parentName.pos == node.pos &&
                    _parentName.end == node.end)) {
                    const storePos = context["pluginStoreList"][mapName];
                    if (!storePos[apiName]) {
                        Reflect.set(storePos, apiName, {
                            callNum: 1,
                            callFiles: {},
                        });
                        Reflect.set(storePos[apiName].callFiles, filePath, {
                            lines: [line],
                        });
                    }
                    else {
                        Reflect.set(storePos[apiName], "callNum", storePos[apiName]["callNum"] + 1);
                        if (!Object.keys(storePos[apiName].callFiles).includes(filePath)) {
                            Reflect.set(storePos[apiName].callFiles, filePath, {
                                lines: [line],
                            });
                        }
                        else {
                            storePos[apiName].callFiles[filePath].lines.push(line);
                        }
                    }
                }
            }
        }
    }
    walk(AST);
    return false;
};
export default identifierCheck;
