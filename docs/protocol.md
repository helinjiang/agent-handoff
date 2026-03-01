# 产物协议（Artifact Protocol）

AgentRelay 通过"产物驱动"的方式进行阶段协作。

## 核心产物

-   brief.md ------ 初始需求描述
-   plan.A.md ------ A 阶段输出的规划
-   handoff.B.md ------ 交接给 B 的结构化说明
-   result.B.md ------ B 的实现总结
-   verify.C.md ------ C 的验证计划
-   report.C.md ------ C 的验证结果
-   state.json ------ 当前工作流状态

## 设计原则

-   人类可读
-   机器可检测
-   阶段流转仅依赖产物
-   存储方式可替换（文件 / 数据库 / API）
