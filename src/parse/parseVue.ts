import vueCompiler from "@vue/compiler-dom";
import path from "path";
import md5 from "js-md5";
import tsCompiler from "typescript";
import { VUETEMPTSDIR } from "../constant/index.js";

import { getCode, writeTsFile } from "../file/index.js";
import { ParseTsType } from "./index.js";

// 解析vue文件中的ts script片段，解析获取ast，checker
const parseVue: ParseTsType = (fileName) => {
  // 获取vue代码
  const vueCode = getCode(fileName);
  // 解析vue代码
  const result = vueCompiler.parse(vueCode);
  const children = result.children as any[];
  // 获取script片段
  let tsCode = "";
  let baseLine = 0;
  children.forEach((element) => {
    if (element.tag && element.tag == "script") {
      const _children = element.children;
      tsCode = _children[0]?.content;
      baseLine = element.loc.start.line - 1;
    }
  });

  const ts_hash_name = md5(fileName);
  // 将ts片段写入临时目录下的ts文件中
  writeTsFile(tsCode, `${VUETEMPTSDIR}/${ts_hash_name}`);
  const vue_temp_ts_name = path.join(
    process.cwd(),
    `${VUETEMPTSDIR}/${ts_hash_name}.ts`
  );
  // 将ts代码转化为AST 三件套
  const program = tsCompiler.createProgram([vue_temp_ts_name], {});
  const AST = program.getSourceFile(vue_temp_ts_name);
  const typeChecking = program.getTypeChecker();

  return { AST, typeChecking, baseLine };
};

const parseVueBeforeworker = (fileName: string) => {
  // 获取vue代码
  const vueCode = getCode(fileName);
  // 解析vue代码
  const result = vueCompiler.parse(vueCode);
  const children = result.children as any[];
  // 获取script片段
  let tsCode = "";
  let baseLine = 0;
  children.forEach((element) => {
    if (element.tag && element.tag == "script") {
      const _children = element.children;
      tsCode = _children[0]?.content;
      baseLine = element.loc.start.line - 1;
    }
  });

  const ts_hash_name = md5(fileName);
  // 将ts片段写入临时目录下的ts文件中
  writeTsFile(tsCode, `${VUETEMPTSDIR}/${ts_hash_name}`);
  const vue_temp_ts_name = path.join(
    process.cwd(),
    `${VUETEMPTSDIR}/${ts_hash_name}.ts`
  );
  return { filePathVue: vue_temp_ts_name, baseLineVue: baseLine };
};

export { parseVue, parseVueBeforeworker };
