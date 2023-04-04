import { workerData, parentPort } from "worker_threads";
import { parseTs } from "../parse/index.js";
import { getFunc } from "../util/index.js";
const _parentPort = parentPort;
// 获取参数
const { filePath, hookMap, analysisIdentifierTarget, baseLine = 0, } = workerData;
if (!hookMap.size) {
    _parentPort.postMessage(null);
}
// 1. 转译 TS 文件
const { AST } = parseTs(filePath);
// 2. getSingleworkerReport
const hookQueue = await getFunc(hookMap);
// 3. AST 分析在插件函数中，拿到报告等待整合
const report = getSingleworkerReport(hookQueue, {
    AST,
    baseLine,
    filePath,
    analysisIdentifierTarget,
});
_parentPort.postMessage(report);
// 插件调用队列
function callHook(hookQueue, workInfo, index, reportSingleworker) {
    if (hookQueue.length == 0)
        return reportSingleworker;
    const ch = hookQueue[index];
    const res = ch.pluginFunc(workInfo);
    const { queueIntercept, queueReportReuslt } = res;
    reportSingleworker[ch.pluginName] = queueReportReuslt;
    if (queueIntercept && index < hookQueue.length - 1) {
        return callHook(hookQueue, workInfo, index + 1, reportSingleworker);
    }
    else {
        return reportSingleworker;
    }
}
function getSingleworkerReport(hookQueue, workInfo) {
    const reportSingleworker = {};
    callHook(hookQueue, workInfo, 0, reportSingleworker);
    return reportSingleworker;
}
