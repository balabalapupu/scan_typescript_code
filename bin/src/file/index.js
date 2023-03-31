import { scanFileTs } from "./scanTs.js";
import { CODEFILETYPE } from "../constant/index.js";
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
            parse.push(...tempEntry);
            show.push(...tempEntry);
        });
        Reflect.set(entryObj, "parse", parse);
        Reflect.set(entryObj, "show", show);
        entrys.push(entryObj);
    });
    return entrys;
};
export * from "./scanTs.js";
