import path from "path";
import tsCompiler from "typescript";
import { checkPropertyAccess } from "../parse/index.js";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const identifierCheck = () => {
    const mapName = "IdentifierCheckPlugin";
    const analysisDetail = {};
    // 在分析实例上下文挂载副作用
    const isApiCheck = (config) => {
        try {
            const res = pluginFunc(config, analysisDetail);
            return res;
        }
        catch (e) {
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
const pluginFunc = ({ AST, baseLine, filePath, analysisIdentifierTarget }, analysisDetail) => {
    const targetIndetifier = analysisIdentifierTarget;
    if (targetIndetifier.length == 0)
        return {
            queueIntercept: true,
            queueReportReuslt: analysisDetail,
        };
    function walk(node) {
        tsCompiler.forEachChild(node, walk);
        if (!AST)
            return analysisDetail;
        const line = AST.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;
        if (tsCompiler.isIdentifier(node) &&
            node.escapedText &&
            targetIndetifier.includes(node.escapedText)) {
            if (!node.parent)
                return {
                    queueIntercept: true,
                    queueReportReuslt: analysisDetail,
                };
            const { apiName } = checkPropertyAccess(node); // 获取基础分析节点信息
            const storePos = analysisDetail;
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
    walk(AST);
    return {
        queueIntercept: true,
        queueReportReuslt: analysisDetail,
    };
};
export default identifierCheck;
