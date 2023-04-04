import chalk from "chalk";
import {
  ConfigTypeType,
  DiagnosisInfosType,
  EntryType,
  ImportItemMap,
  ImportItemsTargetType,
  ImportItemType,
  ScanSourceType,
  ReportDataType,
} from "../../type";
import path from "path";
import { CODEFILETYPE } from "../constant/index.js";
import { scanFilesForEntirys } from "../file/index.js";
import piscina from "piscina";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

import {
  ParseFilesForASTType,
  ParseTsReturnType,
  parseVueBeforeworker,
} from "../parse/index.js";
import tsCompiler from "typescript";

import defaultPlugin from "../plugins/defaultPlugin.js";
// import browserPlugin from "../plugins/browserPlugin.js";

import workIdentifierPlugin from "../plugins/workIdentifierPlugin.js";

const runSerice = (workerData: any) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "./worker.js"), {
      workerData: workerData,
    });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code: number) => {
      if (code !== 0)
        reject(new Error(`Worker Thread stopped with exit code ${code}`));
    });
  });
};

type CODEFILETYPE = "ts" | "vue";
type runAnalysisPluginsConfigType = {
  tsCompiler: typeof import("typescript");
  baseNode: tsCompiler.Node;
  depth: number;
  apiName: string;
  matchImportItem: ImportItemsTargetType;
  filePath: string;
  projectName: string;
  line: number;
};
type analysisIdentifierForASTConfigType = {
  importItems: ImportItemType;
  AST: tsCompiler.SourceFile | undefined;
  checker: tsCompiler.TypeChecker;
  showPath: string;
  projectName: string;
  baseLine: number;
};

type analysisImportDeclarationForASTConfigType = {
  AST: ParseTsReturnType["AST"];
  filePath: string;
  baseLine?: number;
};

type analysisImportsTargetFuncArgType = {
  AST: ParseTsReturnType["AST"];
  typeChecking: tsCompiler.TypeChecker;
  baseLine: number;
  filePath: string;
  config: EntryType;
};

type hookQueue = any[];

const pool = new piscina();

export namespace CodeAnalysisCore {
  export type diagnosisInfos = DiagnosisInfosType[];

  export type importItemMap = ImportItemMap;

  export type analysisIdentifierTarget = string[];

  export type browserApiTarget = string[];

  export type hookIdentifierMap = Map<string, string>;

  export type hookImportMap = Map<string, string>;

  export type runAnalysisPlugins = (
    config: runAnalysisPluginsConfigType
  ) => void;

  export type installPlugins = (config: any[]) => void;

  export type analysis = () => void;

  export type workReport = ReportDataType;

  export type scanCodeFormConfig<T> = (
    config: ConfigTypeType["scanSource"],
    type: T
  ) => void;

  export type parseCodeAndReport<T> = (config: EntryType, type: T) => void;

  export type analysisIdentifierForAST = (
    config: analysisIdentifierForASTConfigType
  ) => void;

  export type analysisImportDeclarationForAST = (
    config: analysisImportDeclarationForASTConfigType
  ) => ImportItemType;

  export type addDiagnosisInfo = (info: DiagnosisInfosType) => void;

  export type AnalysisImportsTargetFuncType = (
    config: analysisImportsTargetFuncArgType
  ) => ReportDataType;
}

type CallHook = () => void;

export class CodeAnalysisCore {
  private scanSourceConfig: ScanSourceType[];
  private analysisImportsTarget: string;
  public analysisIdentifierTarget: CodeAnalysisCore.analysisIdentifierTarget;
  public browserApiTarget: CodeAnalysisCore.browserApiTarget;
  public hookFuncionQueue: hookQueue;
  public importItemMap: CodeAnalysisCore.importItemMap;
  public diagnosisInfos: CodeAnalysisCore.diagnosisInfos;
  public hookIdentifierMap: CodeAnalysisCore.hookIdentifierMap;
  public hookImportMap: CodeAnalysisCore.hookImportMap;
  public workReport: CodeAnalysisCore.workReport;

  constructor(options: ConfigTypeType) {
    // 扫描路径配置
    this.scanSourceConfig = options.scanSource;
    // import 生命查找配置
    this.analysisImportsTarget = options.analysisImportsTarget;
    // 目标标识符配置
    this.analysisIdentifierTarget =
      options.analysisIdentifierTarget || ([] as string[]);
    // 浏览器 api
    this.browserApiTarget = options.browserApiTarget || ([] as string[]);
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
  installPlugins: CodeAnalysisCore.installPlugins = (plugins) => {
    if (plugins.length == 0) return;
    plugins.forEach((item) => {
      const res = item();
      if (
        res.hookType == "afterParseHook" &&
        !this.hookIdentifierMap.has(res.mapName)
      ) {
        this.hookIdentifierMap.set(res.mapName, res.mapPath);
      }
      if (
        res.hookType == "afterAnalysisHook" &&
        !this.hookImportMap.has(res.mapName)
      ) {
        this.hookImportMap.set(res.mapName, res.mapPath);
      }
    });
  };

  public analysis: CodeAnalysisCore.analysis = async () => {
    // 注册插件
    this.installPlugins(this.hookFuncionQueue);

    console.log(chalk.green("文件扫描开始"));
    await this.scanCodeFormConfig(this.scanSourceConfig, "vue");
    await this.scanCodeFormConfig(this.scanSourceConfig, "ts");
    console.log("done!");
  };

  private scanCodeFormConfig: CodeAnalysisCore.scanCodeFormConfig<CODEFILETYPE> =
    async (config, PluginContextType) => {
      // 拿到所有需要扫描的文件路径，可能有多个scanSource
      const entrys = scanFilesForEntirys(config, PluginContextType);
      await Promise.all(
        entrys.map((item) => {
          return this.parseCodeAndReportPromise(item, PluginContextType);
        })
      );
    };

  parseCodeAndReportPromise: CodeAnalysisCore.parseCodeAndReport<CODEFILETYPE> =
    async (config, type) => {
      const parseFiles = config.parse || [];
      if (!parseFiles.length) return;
      const reportForCheckIdentifier: ReportDataType = this.workReport;
      console.log(parseFiles, "---parseFiles---");
      const res = (await Promise.all(
        parseFiles.map((item) => {
          return new Promise(async (resolve, reject) => {
            let filePath = item,
              baseLine = 0;
            if (type == "vue") {
              const { filePathVue, baseLineVue } =
                parseVueBeforeworker(filePath);
              filePath = filePathVue;
              baseLine = baseLineVue;
            }
            // 分析单独的字面量
            let res = {};
            if (this.analysisIdentifierTarget.length) {
              const identifierAnalysis = (await this.runPluginworker(
                {
                  filePath,
                  type,
                  baseLine,
                  hookMap: this.hookIdentifierMap,
                  analysisIdentifierTarget: this.analysisIdentifierTarget,
                },
                "../worker/identifierworker.js"
              )) as unknown as ReportDataType;
              res = { ...identifierAnalysis };
            }
            console.log("wodaole?");
            // 分析 导入关系
            if (this.analysisImportsTarget) {
              const importAnalysis = (await this.runPluginworker(
                {
                  filePath,
                  type,
                  config,
                  baseLine,
                  hookMap: this.hookImportMap,
                  analysisImportsTarget: this.analysisImportsTarget,
                },
                "../worker/importdeclarationworker.js"
              )) as unknown as ReportDataType;
              console.log("haishiyouwenti");
              res = { ...res, ...importAnalysis };
            }
            resolve(res);
          });
        })
      )) as unknown as ReportDataType[];
      this.convertworkReturnToReport(reportForCheckIdentifier, res);
    };

  // 报告处理函数
  private convertworkReturnToReport(
    reportForCheckIdentifier: ReportDataType,
    config: ReportDataType[]
  ) {
    config.forEach((res) => {
      const pluginNameList = Object.keys(res);
      pluginNameList.forEach((pluginName) => {
        if (reportForCheckIdentifier[pluginName]) {
          const pluginCheckedList = Object.keys(res[pluginName]);
          pluginCheckedList.forEach((pluginChecked) => {
            if (reportForCheckIdentifier[pluginName][pluginChecked]) {
              const { callNum, callFiles } =
                reportForCheckIdentifier[pluginName][pluginChecked];
              const { callNum: currentCallNum, callFiles: currentCallFiles } =
                res[pluginName][pluginChecked];
              reportForCheckIdentifier[pluginName][pluginChecked] = {
                callNum: callNum + currentCallNum,
                callFiles: {
                  ...callFiles,
                  ...currentCallFiles,
                },
              };
            } else {
              reportForCheckIdentifier[pluginName][pluginChecked] =
                res[pluginName][pluginChecked];
            }
          });
        } else {
          reportForCheckIdentifier[pluginName] = res[pluginName];
        }
      });
    });
  }

  runPluginworker = (
    workerData: any,
    filePath: string
  ): Promise<ReturnType<ParseFilesForASTType>> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, filePath), {
        workerData: workerData,
      });
      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code: number) => {
        if (code !== 0)
          reject(new Error(`Worker Thread stopped with exit code ${code}`));
      });
    });
  };

  // 记录诊断日志
  public addDiagnosisInfo: CodeAnalysisCore.addDiagnosisInfo = (info) => {
    this.diagnosisInfos.push(info);
  };
}
