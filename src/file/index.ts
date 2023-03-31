import { EntryType, ScanSourceType } from "../../type/index.js";
import { scanFileTs } from "./scanTs.js";
import { CODEFILETYPE } from "../constant/index.js";
type CODEFILETYPE = "ts" | "vue";
//扫描代码

export type scanFilesForEntries<T> = (
  config: ScanSourceType[],
  type: T
) => EntryType[];

export const scanFilesForEntirys: scanFilesForEntries<CODEFILETYPE> = (
  config,
  type
) => {
  const entrys: EntryType[] = [];
  config.forEach((item) => {
    const entryObj = {
      name: item.name,
    };
    const parse: string[] = [],
      show: string[] = [],
      scanPath = item.path;

    scanPath.forEach((_item) => {
      let tempEntry: string[] = [];
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
