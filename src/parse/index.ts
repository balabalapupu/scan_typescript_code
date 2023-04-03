import tsCompiler from "typescript";
import {
  CheckPropertyAccessType,
  CODEFILETYPE,
  CommonTsCompilerNode,
} from "../../type";
import { parseVue } from "./parseVue.js";

export type ParseTsReturnType = {
  AST: tsCompiler.SourceFile | undefined;
  typeChecking: tsCompiler.TypeChecker;
  baseLine?: number;
};
export type ParseFilesForASTType = (
  filePath: string,
  parseType: CODEFILETYPE
) => ParseTsReturnType;

export type ParseTsType = (
  fileName: string
) => ReturnType<ParseFilesForASTType>;

export type CheckPropertyAccess = (
  node: tsCompiler.Identifier | CommonTsCompilerNode,
  index?: number,
  apiName?: string
) => CheckPropertyAccessType;

export const parseFilesForAST: ParseFilesForASTType = (filePath, parseType) => {
  if (parseType == "ts") {
    return parseTs(filePath);
  } else {
    return parseVue(filePath);
  }
};

export const parseTs: ParseTsType = (fileName) => {
  // 创建 Program 编译上下文，是 TS 代码分析的基础
  const program = tsCompiler.createProgram([fileName], {});
  //   通过 Program 获取代码文件对应的 SourceFile 对象，也就是 AST
  const AST = program.getSourceFile(fileName);
  //   用于通过 program 获取 Checker 控制器，该控制器用来类型检查、语义检查等；
  const typeChecking = program.getTypeChecker();
  return { AST, typeChecking };
};

export const checkPropertyAccess: CheckPropertyAccess = (
  node: tsCompiler.Identifier | CommonTsCompilerNode,
  index = 0,
  apiName = ""
) => {
  const _node = node as CommonTsCompilerNode;
  if (index > 0) {
    apiName = apiName + "." + _node.name?.escapedText;
  } else {
    apiName = apiName + _node.escapedText;
  }

  if (tsCompiler.isPropertyAccessExpression(_node.parent)) {
    if (_node.parent.expression && _node.parent.expression.kind == 108) {
      return {
        baseNode: _node,
        depth: index,
        apiName: "this." + apiName,
      };
    }
    index++;
    return checkPropertyAccess(_node.parent, index, apiName);
  } else {
    return {
      baseNode: _node,
      depth: index,
      apiName: apiName,
    };
  }
};

export * from "./parseVue.js";
