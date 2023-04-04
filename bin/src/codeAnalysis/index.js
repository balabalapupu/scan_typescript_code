import chalk from "chalk";
import path from "path";
import { scanFilesForEntirys } from "../file/index.js";
import piscina from "piscina";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { parseVueBeforeworker, } from "../parse/index.js";
import defaultPlugin from "../plugins/defaultPlugin.js";
// import browserPlugin from "../plugins/browserPlugin.js";
import workIdentifierPlugin from "../plugins/workIdentifierPlugin.js";
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
    browserApiTarget;
    hookFuncionQueue;
    importItemMap;
    diagnosisInfos;
    hookIdentifierMap;
    hookImportMap;
    workReport;
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
        // 内置插件
        this.hookFuncionQueue = [defaultPlugin, workIdentifierPlugin]; // 先用这个顶一下 hook，可以改成tapable
        this.importItemMap = {};
        this.diagnosisInfos = []; // 诊断日志信息
        // this.hookNameMap = new Set();
        this.hookIdentifierMap = new Map();
        this.hookImportMap = new Map();
        this.workReport = {};
    }
    // 注册插件
    installPlugins = (plugins) => {
        if (plugins.length == 0)
            return;
        plugins.forEach((item) => {
            const res = item();
            if (res.hookType == "afterParseHook" &&
                !this.hookIdentifierMap.has(res.mapName)) {
                this.hookIdentifierMap.set(res.mapName, res.mapPath);
            }
            if (res.hookType == "afterAnalysisHook" &&
                !this.hookImportMap.has(res.mapName)) {
                this.hookImportMap.set(res.mapName, res.mapPath);
            }
        });
    };
    analysis = async () => {
        // 注册插件
        this.installPlugins(this.hookFuncionQueue);
        console.log(chalk.green("文件扫描开始"));
        await this.scanCodeFormConfig(this.scanSourceConfig, "vue");
        await this.scanCodeFormConfig(this.scanSourceConfig, "ts");
        console.log("done!");
    };
    scanCodeFormConfig = async (config, PluginContextType) => {
        // 拿到所有需要扫描的文件路径，可能有多个scanSource
        const entrys = scanFilesForEntirys(config, PluginContextType);
        await Promise.all(entrys.map((item) => {
            return this.parseCodeAndReportPromise(item, PluginContextType);
        }));
    };
    parseCodeAndReportPromise = async (config, type) => {
        const parseFiles = config.parse || [];
        if (!parseFiles.length)
            return;
        const reportForCheckIdentifier = this.workReport;
        console.log(parseFiles, "---parseFiles---");
        const res = (await Promise.all(parseFiles.map((item) => {
            return new Promise(async (resolve, reject) => {
                let filePath = item, baseLine = 0;
                if (type == "vue") {
                    const { filePathVue, baseLineVue } = parseVueBeforeworker(filePath);
                    filePath = filePathVue;
                    baseLine = baseLineVue;
                }
                // 分析单独的字面量
                let res = {};
                if (this.analysisIdentifierTarget.length) {
                    const identifierAnalysis = (await this.runPluginworker({
                        filePath,
                        type,
                        baseLine,
                        hookMap: this.hookIdentifierMap,
                        analysisIdentifierTarget: this.analysisIdentifierTarget,
                    }, "../worker/identifierworker.js"));
                    res = { ...identifierAnalysis };
                }
                console.log("wodaole?");
                // 分析 导入关系
                if (this.analysisImportsTarget) {
                    const importAnalysis = (await this.runPluginworker({
                        filePath,
                        type,
                        config,
                        baseLine,
                        hookMap: this.hookImportMap,
                        analysisImportsTarget: this.analysisImportsTarget,
                    }, "../worker/importdeclarationworker.js"));
                    console.log("haishiyouwenti");
                    res = { ...res, ...importAnalysis };
                }
                resolve(res);
            });
        })));
        this.convertworkReturnToReport(reportForCheckIdentifier, res);
    };
    // 报告处理函数
    convertworkReturnToReport(reportForCheckIdentifier, config) {
        config.forEach((res) => {
            const pluginNameList = Object.keys(res);
            pluginNameList.forEach((pluginName) => {
                if (reportForCheckIdentifier[pluginName]) {
                    const pluginCheckedList = Object.keys(res[pluginName]);
                    pluginCheckedList.forEach((pluginChecked) => {
                        if (reportForCheckIdentifier[pluginName][pluginChecked]) {
                            const { callNum, callFiles } = reportForCheckIdentifier[pluginName][pluginChecked];
                            const { callNum: currentCallNum, callFiles: currentCallFiles } = res[pluginName][pluginChecked];
                            reportForCheckIdentifier[pluginName][pluginChecked] = {
                                callNum: callNum + currentCallNum,
                                callFiles: {
                                    ...callFiles,
                                    ...currentCallFiles,
                                },
                            };
                        }
                        else {
                            reportForCheckIdentifier[pluginName][pluginChecked] =
                                res[pluginName][pluginChecked];
                        }
                    });
                }
                else {
                    reportForCheckIdentifier[pluginName] = res[pluginName];
                }
            });
        });
    }
    runPluginworker = (workerData, filePath) => {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, filePath), {
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
    // 记录诊断日志
    addDiagnosisInfo = (info) => {
        this.diagnosisInfos.push(info);
    };
}
