# AgentHandoff 典型使用流程（USAGE_FLOWS）

本文件描述 AgentHandoff 在真实场景中的推荐协作模式：

- A：秘书（需求澄清）
- B：技术负责人（规划与验收）
- C：实现者（编码）
- D：测试者（验证）

整个流程是一个**线性步骤链（Step Pipeline）**，但支持多轮循环与动态扩展。

---

## 一、入口：用户需求（brief）

用户首先提供：

- 我要做什么
- 技术栈或限制条件
- 成功标准
- 非目标

A 负责：
- 澄清需求
- 补充约束
- 输出结构化的 brief.md 与 decisions.md

---

## 二、B 生成第一版 workflow.yaml

B 根据 brief 与 decisions：

- 规划工作项（x / y / z）
- 将工作项展开为步骤链：
  - x-implement
  - x-test
  - x-accept
  - y-implement
  - y-test
  - y-accept
  - …

workflow.yaml 是当前执行队列的"快照"，可在执行过程中调整。

---

## 三、执行循环（以 x 为例）

1️⃣ C 执行 x-implement  
- 更新 output.md  
- 追加 step.done 事件  

2️⃣ D 执行 x-test  
- 输出验证结果  
- 若失败 → issue.raised  

3️⃣ B 执行 x-accept  
- 若通过 → accept.passed  
- 若不通过 → 插入 x-fix 步骤  

然后进入 y。

---

## 四、动态修改 workflow

B 可以：

- 插入修复步骤
- 调整后续顺序
- 追加新的工作项
- 提前结束流程

但始终保持线性步骤链。不引入 DAG。

---

## 五、流程结束

当所有步骤完成：

- B 生成总结（summary.md）
- state.json 标记 done
- events.jsonl 形成完整时间线

---

## 六、产物驱动原则

- 所有协作通过产物共享
- 不依赖对话上下文
- 所有关键决策必须落盘
