import { scanFileTs } from "./scanTs.js";
import path from "path";
import fs from "fs";
import { CODEFILETYPE } from "../constant/index.js";
import { scanFileVue } from "./scanVue.js";
export const scanFilesForEntirys = (config, type) => {
    const entrys = [];
    config.forEach((item) => {
        const entryObj = {
            name: item.name,
        };
        const parse = [], show = [], scanPath = item.path;
        scanPath.forEach((_item) => {
            let tempEntry = [];
            if (type === CODEFILETYPE.TS) {
                tempEntry = scanFileTs(_item);
            }
            else if (type === CODEFILETYPE.VUE) {
                tempEntry = scanFileVue(_item);
            }
            parse.push(...tempEntry);
            show.push(...tempEntry);
        });
        Reflect.set(entryObj, "parse", parse);
        Reflect.set(entryObj, "show", show);
        entrys.push(entryObj);
    });
    return entrys;
};
export function writeTsFile(content, fileName) {
    try {
        fs.writeFileSync(path.join(process.cwd(), `${fileName}.ts`), content, "utf8");
    }
    catch (e) {
        throw e;
    }
}
// 创建目录
export const mkDir = (dirName) => {
    try {
        fs.mkdirSync(path.join(process.cwd(), `/${dirName}`));
    }
    catch (e) {
        throw e;
    }
};
// 删除指定目录及目录下所有文件
export const rmDir = (dirName) => {
    try {
        const dirPath = path.join(process.cwd(), `./${dirName}`);
        if (fs.existsSync(dirPath)) {
            // 判断给定的路径是否存在
            const files = fs.readdirSync(dirPath); // 返回文件和子目录的数组
            files.forEach(function (file) {
                var curPath = path.join(dirPath, file);
                if (fs.statSync(curPath).isDirectory()) {
                    // 如果是文件夹，则继续
                    rmDir(curPath);
                }
                else {
                    fs.unlinkSync(curPath); // 如果是文件，则删除
                }
            });
            fs.rmdirSync(dirPath); // 清除文件夹
        }
    }
    catch (e) {
        throw e;
    }
};
export * from "./scanTs.js";
export * from "./scanVue.js";
