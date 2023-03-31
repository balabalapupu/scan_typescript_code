import chalk from "chalk";
import { scanFilesForEntirys } from "../file/index.js";
import { checkPropertyAccess, parseFilesForAST, } from "../parse/index.js";
import tsCompiler from "typescript";
import defaultPlugin from "../plugins/defaultPlugin.js";
import methodPlugin from "../plugins/methodPlugin.js";
export class CodeAnalysisCore {
    scanSourceConfig;
    analysisTarget;
    importItemMap;
    pluginsQueue;
    diagnosisInfos;
    pluginStoreList;
    constructor(options) {
        this.scanSourceConfig = options.scanSource;
        this.analysisTarget = options.analysisTarget;
        this.importItemMap = {};
        this.pluginsQueue = [];
        this.diagnosisInfos = []; // 诊断日志信息
        this.pluginStoreList = {};
    }
    runAnalysisPlugins = ({ tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, line, }) => {
        if (this.pluginsQueue.length > 0) {
            for (let i = 0; i < this.pluginsQueue.length; i++) {
                const pluginCallbackFunction = this.pluginsQueue[i].pluginCallbackFunction;
                if (pluginCallbackFunction &&
                    pluginCallbackFunction({
                        context: this,
                        tsCompiler,
                        node: baseNode,
                        depth,
                        apiName,
                        matchImportItem,
                        filePath,
                        projectName,
                        line,
                    })) {
                    break;
                }
            }
        }
    };
    // 注册插件
    installPlugins = () => {
        this.pluginsQueue.push(methodPlugin(this));
        this.pluginsQueue.push(defaultPlugin(this));
    };
    analysis = () => {
        // 注册插件
        this.installPlugins();
        this.scanCode(this.scanSourceConfig, "ts");
    };
    scanCode = (config, PluginContextType) => {
        // 拿到所有需要扫描的文件路径，可能有多个scanSource
        const entrys = scanFilesForEntirys(config, PluginContextType);
        console.log(chalk.green("文件扫描开始："));
        console.log(entrys, "---entrys---");
        entrys.forEach((item) => {
            // 从入口开始扫描文件
            this.parseCodeAndReport(item, PluginContextType);
        });
        return;
    };
    parseCodeAndReport = (config, type) => {
        const parseFiles = config.parse || [];
        if (!parseFiles.length)
            return;
        // 根据当前文件夹下的依赖在做遍历
        parseFiles.forEach((_item, _index) => {
            const filePath = config.name + "&" + parseFiles[_index];
            // 1、 生成 AST
            const { AST, typeChecking } = parseFilesForAST(_item, type);
            // 2、 查找文件内 Import
            const importItems = this.analysisImportDeclarationForAST({
                AST,
                filePath,
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
            if (moduleSpecifier.text !== _thiz.analysisTarget)
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
