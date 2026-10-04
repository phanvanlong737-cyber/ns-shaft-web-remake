# 来源与许可

## 本项目

独立实现的JavaScript、CSS、原创SVG和程序合成音频按根目录MIT LICENSE发布。参考原游戏的玩法不意味着拥有原作品牌或素材。本项目不是4399或NAGI-P官方产品。

## 行为参考

iPel/NS-SHAFT：https://github.com/iPel/NS-SHAFT ，固定提交03a2b16660d328516fa8ff80d0428a56a1396f46。仓库为Apache-2.0。只分析玩法、参数和工程思路，没有复制main.js、sns.js或bg.png/icon.png/led.png；规则与音画独立实现。参考许可证保留于licenses/iPel-Apache-2.0.txt。

4399原页面与其提供的Flash文件作为难度研究参考，见difficulty-research.md。原SWF、脚本和素材只在本地Git忽略目录作静态分析，不在项目仓库、dist、演示图中重新分发；未导出原作图像或声音。

## 工程依赖

- Vite：MIT，https://github.com/vitejs/vite
- Vitest：MIT，https://github.com/vitest-dev/vitest
- Playwright：Apache-2.0，https://github.com/microsoft/playwright
- 这些依赖用于开发/测试/构建，不作为游戏运行时服务。锁文件固定实际版本，完整依赖元数据可由tools/license-inventory.mjs复现。
- JPEXS为本地静态分析工具，没有打包入项目或依赖；参考https://github.com/jindrapetrik/jpexs-decompiler。

## 素材

public/assets全部原创SVG，源文件与运行时为同一文件。没有外部字体、采样音频或借用Flash图片；不依赖收费API。完整清单见assets-license.csv。
