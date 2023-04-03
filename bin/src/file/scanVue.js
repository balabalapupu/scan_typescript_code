import glob from "glob";
import path from "path";
import fs from "fs";
const scanFileVue = (scanPath) => {
    const entryFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.vue`));
    return entryFiles;
};
const getCode = (fileName) => {
    try {
        const code = fs.readFileSync(fileName, "utf-8");
        return code;
    }
    catch (e) {
        throw e;
    }
};
export { scanFileVue, getCode };
