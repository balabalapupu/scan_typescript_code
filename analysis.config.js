module.exports = {
  scanSource: [
    {
      // 必须，待扫描源码的配置信息
      name: "Code-Demo", // 必填，项目名称
      path: ["src"], // 必填，需要扫描的文件路径（基准路径为配置文件所在路径）
      packageFile: "package.json", // 可选，package.json 文件路径配置，用于收集依赖的版本信息
      format: null, // 可选, 文件路径格式化函数,默认为null,一般不需要配置
    },
  ],
  analysisImportsTarget: "111", // 必须，要分析的目标依赖名
  analysisIdentifierTarget: ["wocao"],
  analysisPlugins: [], // 可选，自定义分析插件，默认为空数组，一般不需要配置
};
