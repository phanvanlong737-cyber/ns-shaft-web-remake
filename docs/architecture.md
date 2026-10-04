# 架构与数据流

## 模块

src/core：配置、随机数、玩家、平台、生成、连续碰撞、Game与FixedLoop。纯JavaScript，无DOM/存储/音频依赖。Game唯一持有世界；平台类型以实际行为分支表达，不创建单用途继承体系。

src/data：规则之外的存档与素材manifest。src/ui：DOM界面与一次安装的输入监听器；AbortController可清理监听，不在重开中重装。src/rendering：Canvas矢量绘制、表现粒子、Web Audio合成。src/main.js：薄协调层。

## 一帧

浏览器输入→FixedLoop固定1/120秒→Game.update→一次性事件→音画；Game.snapshot→HUD/界面。渲染使用前后位置插值。UI只读快照，Renderer只读实体。帧耗时上限0.1秒避免长暂停补算；失焦后明确暂停，返回不补时间。

物理更新顺序：快照前帧→滚动平台→横向输入/离开→平台计时→承载跟随或重力/碰撞→危险/死亡→回收与生成。单向碰撞使用相对穿越时刻和当时横向重叠，避免高速穿透和滚动造成重复落地。

事件有start、land(platformType)、hurt、heal、spring、fake_crack、fake_break、floor、challenge_complete、game_over。每帧drainEvents消费后清空，不保留无限事件历史。

## 边界

音乐、粒子、屏幕震动不回写规则。表现可使用非确定性随机数，核心只使用独立seed。存档只包含schemaVersion、settings、bestFloor、nickname、leaderboard；故障时内存继续。Top 10同分按时间升序，本局runKey防重复。

生成器验证上一平台有效站立边缘到目标平台的普通脱离可达范围，不求解整局安全路径。无敌时间与生成保底属于明确体验修正。用户难度反馈后，放宽候选跳距，避免过强的中心连锁帮助；见difficulty-research.md。

## 开发测试入口

仅Vite DEV并且URL带?test=1时提供__TEST__场景控制；生产构建折叠删除。浏览器自动化使用此入口测试事件/结算，不据此声称人工通关。build-smoke在仿Pages子路径检查生产包不含该入口。
