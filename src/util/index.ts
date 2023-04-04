// 获取插件函数
export async function getFunc(
  hookInfoMap: Map<string, string>
): Promise<any[]> {
  const afterHookFunc: any[] = [];
  hookInfoMap.forEach((value: string, key: any) => {
    afterHookFunc.push({
      value,
      key,
    });
  });
  return await Promise.all(
    afterHookFunc.map((item) => {
      return new Promise(async (resolve, reject) => {
        const fileDetail = await import(item.value);
        const fileFunc = fileDetail.default().pluginCallbackFunction;
        resolve({
          pluginName: item.key,
          pluginFunc: fileFunc,
        });
      });
    })
  );
}
