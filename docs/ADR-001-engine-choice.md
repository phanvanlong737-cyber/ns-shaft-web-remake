# ADR-001：Canvas与独立规则核心

状态：已采纳。

采用原生JavaScript ES Modules、Canvas 2D、Vite、Vitest和Playwright。规则是依据固定参考提交独立实现，不复制其主循环或资源。Phaser会增加引擎物理与单向碰撞的拟合工作，本首版没有需要其场景或物理系统的功能，因此不采用。

核心无DOM、音频、存储依赖；DOM负责UI；Canvas负责游戏表现；配置使用逻辑像素/秒。只创建实际使用模块，不预建Modern或通用实体框架。
