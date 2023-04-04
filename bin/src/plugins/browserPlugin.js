"use strict";
// import { CodeAnalysisCore } from "../codeAnalysis/index.js";
// import {
//   HookCallback,
//   AfterParseHookArgType,
//   PluginFuncType,
// } from "../../type/index.js";
// import tsCompiler from "typescript";
// import { checkPropertyAccess } from "../parse/index.js";
// type pluginFunc = (
//   config: AfterParseHookArgType,
//   context: CodeAnalysisCore,
//   mapName: string
// ) => boolean;
// const identifierCheck = (analysisContext: any) => {
//   const mapName = "browserIdentifierPlugin";
//   // 在分析实例上下文挂载副作用
//   Reflect.set(analysisContext["pluginStoreList"], mapName, {});
//   const isBrowserIdentifierCheck: HookCallback<AfterParseHookArgType> = (
//     config
//   ) => {
//     const res = pluginFunc(config, analysisContext, mapName);
//     return res;
//   };
//   return {
//     mapName: mapName,
//     pluginCallbackFunction: isBrowserIdentifierCheck,
//     hookType: "afterParseHook",
//   };
// };
// const pluginFunc: pluginFunc = (
//   { AST, baseLine, filePath, typeChecking },
//   context,
//   mapName
// ): boolean => {
//   const browserApiTarget = context.browserApiTarget;
//   if (browserApiTarget.length == 0) return false;
//   function walk(node: tsCompiler.Node) {
//     tsCompiler.forEachChild(node, walk);
//     if (!AST) return;
//     const line =
//       AST.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;
//     if (
//       tsCompiler.isIdentifier(node) &&
//       node.escapedText &&
//       browserApiTarget.includes(node.escapedText)
//     ) {
//       if (!node.parent) return;
//       // 命中Browser Api Item Name
//       const symbol = typeChecking.getSymbolAtLocation(node);
//       if (!symbol) return false;
//       if (!symbol.declarations) return false;
//       if (
//         symbol.declarations.length > 1 ||
//         (symbol.declarations.length == 1 &&
//           symbol.declarations[0].pos > AST.end)
//       ) {
//         const { depth, apiName } = checkPropertyAccess(node); // 获取基础分析节点信息
//         const _parent = node.parent as any;
//         const _parentName = _parent.name;
//         if (
//           !(
//             depth > 0 &&
//             _parentName &&
//             _parentName.pos == node.pos &&
//             _parentName.end == node.end
//           )
//         ) {
//           const storePos = context["pluginStoreList"][mapName];
//           if (!storePos[apiName]) {
//             Reflect.set(storePos, apiName, {
//               callNum: 1,
//               callFiles: {},
//             });
//             Reflect.set(storePos[apiName].callFiles, filePath, {
//               lines: [line],
//             });
//           } else {
//             Reflect.set(
//               storePos[apiName],
//               "callNum",
//               storePos[apiName]["callNum"] + 1
//             );
//             if (!Object.keys(storePos[apiName].callFiles).includes(filePath)) {
//               Reflect.set(storePos[apiName].callFiles, filePath, {
//                 lines: [line],
//               });
//             } else {
//               storePos[apiName].callFiles[filePath].lines.push(line);
//             }
//           }
//         }
//       }
//     }
//   }
//   walk(AST as tsCompiler.Node);
//   return false;
// };
// export default identifierCheck;
