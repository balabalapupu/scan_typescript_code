#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
const program = new Command();

program.version(
  `版本号： ${chalk.green("0.0.1")}`,
  "-v, --version",
  "查看版本号"
);

program.parse(process.argv);

console.log(chalk.blue("Hello world!======"));
