import chalk from "chalk";
import path from "path";
import { scanFilesForEntirys } from "../file/index.js";
import processLog from "single-line-log";
import piscina from "piscina";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { checkPropertyAccess, parseFilesForAST, } from "../parse/index.js";
import tsCompiler from "typescript";
import identifierCheck from "../plugins/IdetifierPlugin.js";
import defaultPlugin from "../plugins/defaultPlugin.js";
import methodPlugin from "../plugins/methodPlugin.js";
import typePlugin from "../plugins/typePlugin.js";
import browserPlugin from "../plugins/browserPlugin.js";
const runSerice = (workerData) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "./worker.js"), {
            workerData: workerData,
        });
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", (code) => {
            if (code !== 0)
                reject(new Error(`Worker Thread stopped with exit code ${code}`));
        });
    });
};
const pool = new piscina();
export class CodeAnalysisCore {
    scanSourceConfig;
    analysisImportsTarget;
    analysisIdentifierTarget;
    afterParseHookQueue;
    afterAnalysisHookQueue;
    hookFuncionQueue;
    importItemMap;
    diagnosisInfos;
    pluginStoreList;
    analysisPlugins;
    hookNameMap;
    browserApiTarget;
    constructor(options) {
        // 扫描路径配置
        this.scanSourceConfig = options.scanSource;
        // import 生命查找配置
        this.analysisImportsTarget = options.analysisImportsTarget;
        // 目标标识符配置
        this.analysisIdentifierTarget =
            options.analysisIdentifierTarget || [];
        // 浏览器 api
        this.browserApiTarget = options.browserApiTarget || [];
        // 自定义插件
        this.analysisPlugins = options.analysisPlugins || [];
        // 内置插件
        this.hookFuncionQueue = [
            browserPlugin,
            identifierCheck,
            methodPlugin,
            typePlugin,
            defaultPlugin,
        ]; // 先用这个顶一下 hook，可以改成tapable
        this.afterParseHookQueue = [];
        this.afterAnalysisHookQueue = [];
        this.importItemMap = {};
        this.diagnosisInfos = []; // 诊断日志信息
        this.pluginStoreList = {};
        this.hookNameMap = new Set();
    }
    callHook(hookQueue, config, index) {
        if (hookQueue.length == 0)
            return;
        const ch = hookQueue[index];
        this.hookNameMap.add(ch.mapName);
        const res = ch.pluginCallbackFunction(config);
        if (!res && index < hookQueue.length - 1) {
            this.callHook(hookQueue, config, index + 1);
        }
        else {
            return false;
        }
    }
    runAnalysisPlugins = ({ tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, line, }) => {
        this.callHook(this.afterAnalysisHookQueue, {
            context: this,
            tsCompiler,
            node: baseNode,
            depth,
            apiName,
            matchImportItem,
            filePath,
            projectName,
            line,
        }, 0);
    };
    // 注册插件
    installPlugins = (plugins) => {
        if (plugins.length > 0) {
            plugins.forEach((item) => {
                const res = item(this);
                if (res.hookType == "afterParseHook") {
                    this.afterParseHookQueue.push(res);
                }
                else if ((res.hookType = "afterAnalysisHook")) {
                    this.afterAnalysisHookQueue.push(res);
                }
            });
        }
    };
    analysis = () => {
        // 注册插件
        this.installPlugins(this.hookFuncionQueue);
        console.log(chalk.green("文件扫描开始"));
        this.scanCodeFormConfig(this.scanSourceConfig, "vue");
        this.scanCodeFormConfig(this.scanSourceConfig, "ts");
        console.log("done!");
    };
    scanCodeFormConfig = (config, PluginContextType) => {
        // 拿到所有需要扫描的文件路径，可能有多个scanSource
        const entrys = scanFilesForEntirys(config, PluginContextType);
        entrys.forEach((item) => {
            // 从入口开始扫描文件
            this.parseCodeAndReport(item, PluginContextType);
        });
        return;
    };
    // parseCodeAndReportPromise: CodeAnalysisCore.parseCodeAndReport<CODEFILETYPE> =
    //   async (config, type) => {
    //     const parseFiles = config.parse || [];
    //     if (!parseFiles.length) return;
    //     await Promise.all(
    //       parseFiles.map(async (item, index) => {
    //         const filePath = parseFiles[index];
    //         const res = await this.runPluginworker({
    //           filePath,
    //           type,
    //         });
    //       })
    //     );
    //   };
    runPluginworker = (workerData) => {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, "./worker.js"), {
                workerData: workerData,
            });
            worker.on("message", resolve);
            worker.on("error", reject);
            worker.on("exit", (code) => {
                if (code !== 0)
                    reject(new Error(`Worker Thread stopped with exit code ${code}`));
            });
        });
    };
    parseCodeAndReport = async (config, type) => {
        const parseFiles = config.parse || [];
        if (!parseFiles.length)
            return;
        console.log("\n|-文件类型:", chalk.green(type));
        console.log("|-分析进度:");
        // 根据当前文件夹下的依赖在做遍历
        parseFiles.forEach(async (_item, _index) => {
            const filePath = parseFiles[_index];
            processLog.stdout(`|--${chalk.green(`${_index + 1}/${parseFiles.length}      ${filePath}`)}`);
            try {
                // 1、 生成 AST
                const { AST, typeChecking, baseLine = 0, } = parseFilesForAST(_item, type);
                this.callHook(this.afterParseHookQueue, {
                    AST,
                    typeChecking,
                    baseLine,
                    filePath,
                }, 0);
                // 查找 ImportDeclaration
                if (this.analysisImportsTarget) {
                    this.analysisImportsTargetFunc({
                        AST,
                        typeChecking,
                        baseLine,
                        filePath,
                        config,
                    });
                }
            }
            catch (error) {
                const info = {
                    projectName: config.name,
                    file: parseFiles[_index],
                    stack: error.stack,
                };
                this.addDiagnosisInfo(info);
            }
        });
    };
    analysisImportsTargetFunc = ({ AST, baseLine, typeChecking, filePath, config }) => {
        // 2、 查找文件内 Import
        const importItems = this.analysisImportDeclarationForAST({
            AST,
            filePath,
            baseLine,
        });
        // 3、查找 Import 对应的 使用位置
        if (Object.keys(importItems).length == 0)
            return;
        this.analysisIdentifierForAST({
            importItems,
            AST,
            checker: typeChecking,
            showPath: filePath,
            projectName: config.name,
            baseLine: 0,
        });
    };
    // 这次遍历就是分析啦 identifer
    analysisIdentifierForAST = ({ importItems, AST, checker, showPath, projectName, baseLine = 0 }) => {
        const ImportItemNames = Object.keys(importItems);
        const _thiz = this;
        // 遍历AST
        function walk(node) {
            tsCompiler.forEachChild(node, walk);
            if (!AST)
                return;
            const line = AST.getLineAndCharacterOfPosition(node.getStart()).line +
                baseLine +
                1;
            // 如果当前节点是命中的标识符，需要排除各种同名干扰（pos,end）
            if (tsCompiler.isIdentifier(node) &&
                node.escapedText &&
                ImportItemNames.length > 0 &&
                ImportItemNames.includes(node.escapedText)) {
                // 过滤掉不相干的 Identifier 节点后选中的真正节点
                const matchImportItem = importItems[node.escapedText];
                if (node.pos != matchImportItem.identifierPos &&
                    node.end != matchImportItem.identifierEnd) {
                    // 排除 Import 语句中同名节点干扰后
                    // AST 节点对应的 Symbol 对象
                    const symbol = checker.getSymbolAtLocation(node);
                    if (symbol &&
                        symbol.declarations &&
                        symbol.declarations.length > 0) {
                        // 存在上下文声明，相同空间的 声明的 symbol 和 对应的表达式的pos、end是 一样的
                        const nodeSymbol = symbol.declarations[0];
                        if (matchImportItem.symbolPos == nodeSymbol.pos &&
                            matchImportItem.symbolEnd == nodeSymbol.end) {
                            if (!node.parent)
                                return;
                            const { baseNode, depth, apiName } = checkPropertyAccess(node); // 获取基础分析节点信息
                            _thiz.runAnalysisPlugins({
                                tsCompiler,
                                baseNode,
                                depth,
                                apiName,
                                matchImportItem,
                                filePath: showPath,
                                projectName,
                                line,
                            });
                        }
                    }
                }
            }
        }
        walk(AST);
    };
    // 查找需要分析的 import
    analysisImportDeclarationForAST = ({ AST, filePath, baseLine = 0 }) => {
        const importItems = {};
        const _thiz = this;
        // 遍历 AST 用的
        function handleAST(node) {
            if (!AST)
                return;
            tsCompiler.forEachChild(node, handleAST);
            // 获取节点行
            const line = AST.getLineAndCharacterOfPosition(node.getStart()).line +
                baseLine +
                1;
            // 判断是否是 ImportDeclaration
            if (!tsCompiler.isImportDeclaration(node))
                return;
            if (!Reflect.has(node, "moduleSpecifier"))
                return;
            const moduleSpecifier = node.moduleSpecifier;
            if (moduleSpecifier.text !== _thiz.analysisImportsTarget)
                return; // 当前 AST 节点字面量就是要查找的字面量
            if (!node.importClause)
                return; // import 格式有问题
            // 全局引入
            if (tsCompiler.isImportClause(node.importClause) &&
                node.importClause.name) {
                const temp = {
                    name: node.importClause.name?.escapedText,
                    origin: null,
                    symbolPos: node.importClause.pos,
                    symbolEnd: node.importClause.end,
                    identifierPos: node.importClause.name?.pos,
                    identifierEnd: node.importClause.name?.end,
                    line: line,
                };
                _thiz.dealImports(importItems, temp, filePath);
            }
            else if (tsCompiler.isImportClause(node.importClause) &&
                node.importClause.namedBindings) {
                // 局部引入 namedBindings 这玩意有两种情况
                if (tsCompiler.isNamedImports(node.importClause.namedBindings)) {
                    // 至少得有一个值
                    if (node.importClause.namedBindings?.elements?.length > 0) {
                        const tempArr = node.importClause.namedBindings.elements;
                        tempArr.forEach((element) => {
                            if (tsCompiler.isImportSpecifier(element)) {
                                let temp = {
                                    name: element.name?.escapedText,
                                    origin: element.propertyName?.escapedText,
                                    symbolPos: element.pos,
                                    symbolEnd: element.end,
                                    identifierPos: element.name?.pos,
                                    identifierEnd: element.name?.end,
                                    line: line,
                                };
                                _thiz.dealImports(importItems, temp, filePath);
                            }
                        });
                    }
                }
                else if (tsCompiler.isNamespaceImport(node.importClause.namedBindings) &&
                    node.importClause.namedBindings.name) {
                    // 全局 as 引入
                    const temp = {
                        name: node.importClause.namedBindings.name.escapedText,
                        origin: "*",
                        symbolPos: node.importClause.namedBindings.pos,
                        symbolEnd: node.importClause.namedBindings.end,
                        identifierPos: node.importClause.namedBindings.name.pos,
                        identifierEnd: node.importClause.namedBindings.name.end,
                        line: line,
                    };
                    _thiz.dealImports(importItems, temp, filePath);
                }
            }
        }
        handleAST(AST);
        return importItems;
    };
    // 处理imports相关map
    dealImports(importItems, temp, filePath) {
        Reflect.set(importItems, temp["name"], {
            origin: temp["origin"],
            symbolPos: temp["symbolPos"],
            symbolEnd: temp["symbolEnd"],
            identifierPos: temp["identifierPos"],
            identifierEnd: temp["identifierEnd"],
        });
        if (!this.importItemMap[temp.name]) {
            Reflect.set(this.importItemMap, temp["name"], {
                callOrigin: temp["origin"],
                callFiles: [filePath],
            });
        }
        else {
            this.importItemMap[temp.name].callFiles.push(filePath);
        }
    }
    // 记录诊断日志
    addDiagnosisInfo = (info) => {
        this.diagnosisInfos.push(info);
    };
}
