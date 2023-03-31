#!/usr/bin/env node
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs";
import { CodeAnalysisCoreType, ConfigTypeType, PromiseCallback } from "../type";

import { CodeAnalysisCore } from "./codeAnalysis/index.js";

export function codeAnalysis(config: ConfigTypeType) {
  const spinner = ora(chalk.green("项目启动啦：")).start();
  console.log(chalk.green("======="));
  const res = new Promise((resolve, reject) =>
    codeAnalysisCallback(resolve, reject, config)
  );
  spinner.succeed("项目完成");
  return res;
}

function codeAnalysisCallback(
  resolve: PromiseCallback,
  reject: PromiseCallback,
  config: ConfigTypeType
) {
  try {
    const coderTask = new CodeAnalysisCore(config);
    coderTask.analysis();

    //各种插件的名称
    const mapNames = coderTask.pluginsQueue.map((item) => item["mapName"]);
    console.log(mapNames);

    const report = {
      importItemMap: coderTask.importItemMap,
      // versionMap: coderTask.versionMap,
      // parseErrorInfos: coderTask.parseErrorInfos,
      // scoreMap: coderTask.scoreMap,
      // reportTitle: config.reportTitle || REPORTTITLE,
      // analysisTime: moment(Date.now()).format(TIMEFORMAT),
      mapNames: mapNames,
    } as { [propName: string]: unknown };

    if (mapNames.length > 0) {
      mapNames.forEach((item) => {
        report[item] = coderTask["pluginStoreList"][item];
      });
    }
    console.log(report, "---report---");
    resolve({
      report: report,
    });
  } catch (error) {
    reject(error);
  }
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
