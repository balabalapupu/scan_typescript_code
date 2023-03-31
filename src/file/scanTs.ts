import glob from "glob";
import path from "path";

export function scanFileTs(scanPath: string): string[] {
  const tsFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.ts`));
  const tsxFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.tsx`));
  return tsFiles.concat(tsxFiles);
}
