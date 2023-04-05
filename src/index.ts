#!/usr/bin/env node
import chalk from "chalk";
import ora from "ora";
import path from "path";
import moment from "moment";
import fs from "fs";
import table from "table";
import { ConfigTypeType, PromiseCallback, ReportDataType } from "../type";

import { CodeAnalysisCore } from "./codeAnalysis/index.js";
import { VUETEMPTSDIR } from "./constant/index.js";
import { mkDir, rmDir } from "./file/index.js";
type ReportType = {
  pluginAnalysis: ReportDataType;
  analysisTime: string;
  mapNames: string[];
};

export function codeAnalysis(config: ConfigTypeType) {
  const spinner = ora(chalk.green("项目启动啦：")).start();
  console.log(chalk.green("======="));
  // 如果temp目录已经存在，则先删除目录
  rmDir(VUETEMPTSDIR);
  // 如果需要扫描vue文件，创建temp目录
  mkDir(VUETEMPTSDIR);
  const res = new Promise(
    async (resolve, reject) =>
      await codeAnalysisCallback(resolve, reject, config)
  );
  spinner.succeed("======");
  return res;
}

async function codeAnalysisCallback(
  resolve: PromiseCallback,
  reject: PromiseCallback,
  config: ConfigTypeType
) {
  try {
    const startTime = new Date().getTime();
    const coderTask = new CodeAnalysisCore(config);

    await coderTask.analysis();

    const report = handleReport(coderTask, startTime);

    // 输出
    reportOutput(report);

    rmDir(VUETEMPTSDIR);
    resolve({
      report: report,
    });
  } catch (error) {
    reject(error);
  }
}

function handleReport(
  coderTask: CodeAnalysisCore,
  startTime: number
): ReportType {
  const mapNames = [
    ...coderTask.hookIdentifierMap.keys(),
    ...coderTask.hookImportMap.keys(),
  ];

  const endTime = new Date().getTime();
  const time = moment(Date.now()).format("YYYY.MM.DD HH:mm:ss");
  const report: ReportType = {
    pluginAnalysis: coderTask.workReport,
    analysisTime: time,
    mapNames: mapNames,
  };
  console.log("\n|-项目耗时:", chalk.green(endTime - startTime));
  return report;
}

function reportOutput(report: ReportType) {
  console.log("|-生成时间:", chalk.green(report.analysisTime));
  const _table: any[] = [["模块名称", "字段", "", ""]];

  Reflect.ownKeys(report["pluginAnalysis"]).forEach((item) => {
    if (typeof item == "string") {
      _table.push([chalk.green(item), "", "", ""]);

      Reflect.ownKeys(report["pluginAnalysis"][item]).forEach((_item) => {
        const detail = _item as string;

        const res = report["pluginAnalysis"][item][detail] as {
          [propName: string]: any;
        };
        const _title =
          res["callNum"] > 1 ? chalk.red(detail) : chalk.green(detail);
        _table.push(["", _title, "", ""]);
        _table.push(["", "", "调用次数", chalk.green(res["callNum"])]);
        Reflect.ownKeys(res["callFiles"]).forEach((__detail) => {
          _table.push(["", "", "文件路径", chalk.green(__detail)]);

          _table.push([
            "",
            "",
            "行数",
            chalk.green(res["callFiles"][__detail].lines.join("、")),
          ]);
        });
      });
    }
  });

  const config = {
    // Predefined styles of table
    border: table.getBorderCharacters("ramac"),
    columns: {
      1: {
        width: 40,
      },
      3: {
        width: 40,
      },
    },
  };

  let x = table.table(_table, config);
  console.log(x);
}

// 测试
async function test() {
  const configPath = path.join(process.cwd(), "./analysis.config.js");
  const isConfig = fs.existsSync(configPath);
  if (!isConfig) return;
  let config = await import(configPath);
  const res = await codeAnalysis(config.default);
}

test();
