# Frontier Response Network Development Guide

- Status: Build Handbook v0.1
- Date: 2026-03-18
- Audience: Codex / Builder / Frontend / Smart Contract
- Related PRD: `docs/frontier-response-network-prd.md`
- Active execution plan: `docs/frontier-response-network-7-day-execution-plan.md`

如果当前目标是冲刺提交和收口 demo，优先执行：

`docs/frontier-response-network-7-day-execution-plan.md`

## 1. 这份文档是干什么的

这不是产品介绍，而是一份给 Codex 直接执行的开发手册。

目标很明确：

1. 在空仓库里先把项目骨架搭起来。
2. 优先完成一个能跑通的 `SOS Rescue` MVP。
3. 用最少的链上逻辑完成最关键的“锁奖励 -> 接单 -> 确认完成 -> 自动结算”闭环。
4. 为后续扩展到 `Escort` 和 `Recovery` 预留结构，但比赛阶段不分散资源。

## 2. 不要偏离的核心原则

### 2.1 只做一个主故事

比赛 MVP 只打透这条链路：

`玩家 A 发布 SOS -> 玩家 B 接单 -> 玩家 B 标记完成 -> 玩家 A 确认 -> 奖励自动放款`

如果这一条没跑通，不要转去做：

- 花哨首页
- 地图大系统
- AI 派单
- 复杂声誉系统
- 聊天
- 多人编队逻辑

### 2.2 先把产品做成，再把链上做深

优先顺序固定如下：

1. `产品结构`
2. `前端状态流`
3. `假数据流程`
4. `最小合约`
5. `钱包和链上联调`
6. `Stillness / demo polish`

### 2.3 MVP 宁可人工确认，也不要伪自动化

MVP 阶段用请求人确认完成，胜过做一个不稳定的自动验证系统。

### 2.4 不做后端依赖

MVP 默认：

- 没有自建服务端
- 没有数据库
- 没有消息系统

所有关键数据优先来自：

1. 前端本地 mock
2. 链上对象和事件

只有在演示明显需要时，才增加轻量聚合脚本。

## 3. 最终交付标准

在“先完成项目”的语境下，`完成` 的标准不是代码量，而是以下结果：

1. 有一个可运行的前端 dApp。
2. 支持连接 `EVE Vault` 或兼容的 Sui 钱包。
3. 支持创建 `SOS Rescue` 工单。
4. 支持浏览工单、接单、推进状态。
5. 工单奖励在链上锁定。
6. 请求人确认完成后，奖励自动放款。
7. 页面能展示至少一笔完整工单的历史结果。
8. 有一条 `90` 秒左右的 demo 流程可录制。

## 4. 推荐技术方案

为了让空仓库尽快进入可开发状态，推荐直接采用下面这套：

### 4.1 Monorepo

当前仓库优先使用 `npm workspaces`，同时保留 `pnpm-workspace.yaml`，方便后续切回 `pnpm` 而不改结构。

推荐目录：

```text
.
├─ apps/
│  └─ web/
├─ packages/
│  ├─ shared/
│  └─ ui/
├─ contracts/
│  └─ response-network/
├─ docs/
└─ scripts/
```

### 4.2 前端

- `React`
- `TypeScript`
- `Vite`
- `react-router-dom`
- `@tanstack/react-query`
- `@mysten/dapp-kit` 或官方当前推荐的 Sui dApp kit
- `@mysten/sui`
- 轻量状态管理可选 `zustand`

说明：

- 如果官方 EVE Frontier 文档里 `@evefrontier/dapp-kit` 仍可用，优先采用官方推荐方案。
- 如果接入成本高于预期，先用标准 Sui 钱包连接能力把链路打通。

### 4.3 智能合约

- `Sui Move`
- 合约只保留最小 escrow 和工单状态能力

### 4.4 样式

- 使用普通 CSS Modules 或 `tailwindcss` 二选一
- 比赛期优先选团队最熟悉的方案
- 如果没有现成偏好，建议 `tailwindcss`

### 4.5 测试

- 前端：`vitest` + `@testing-library/react`
- 合约：Move 单元测试

### 4.6 当前已测约束清单

当前 Move 测试已经覆盖以下关键约束，适合在 demo 前复查：

1. 完整 happy path：发布 -> 接单 -> 进行中 -> 待确认 -> 完成放款
2. 取消 happy path：请求人在开放态取消并收到退款
3. 请求人不能接自己的单
4. 非请求人不能取消开放中的单
5. 重复接单失败
6. 非 responder 不能推进状态
7. 零奖励请求失败
8. 过期或无效 deadline 失败

前端最小 smoke checklist 建议固定为：

1. 连接 `Requester` 钱包并确认余额可见
2. 发布一笔真实 testnet 请求并记录 request id / digest
3. 切换 `Responder` 钱包接单并推进到 `Awaiting confirmation`
4. 切回 `Requester` 钱包确认完成
5. 在详情页确认能看到 escrow 状态、收款方、最新 digest、explorer 跳转
6. 人为断开 RPC 或篡改 package id，确认顶部会出现 `Chain read unavailable` fallback banner
7. 打开 `Pilot Console`，确认最近活动流里能看到最新 settlement proof

当前仓库已经补上的前端收口项包括：

1. `Request Detail` 交易活动流，覆盖 publish / status change / settlement proof
2. `Pilot Console` 最近活动流，方便录屏时快速展示当前钱包参与过的链上轨迹
3. 链上读取持久化快照缓存，RPC 短时抖动时仍能保留最近可读状态
4. 路由懒加载和手动 chunk 拆分，减轻首屏载荷
5. `npm run test:smoke` 前端烟测，锁住发单、状态推进、详情页和退化 banner 的核心行为

## 5. 仓库结构建议

### 5.1 `apps/web`

承载外部 dApp。

推荐结构：

```text
apps/web/src/
├─ app/
├─ pages/
├─ components/
├─ features/
│  ├─ auth/
│  ├─ requests/
│  ├─ assignments/
│  ├─ escrow/
│  └─ profile/
├─ lib/
│  ├─ sui/
│  ├─ wallet/
│  ├─ query/
│  └─ utils/
├─ adapters/
│  ├─ mock/
│  └─ chain/
├─ hooks/
├─ styles/
└─ types/
```

### 5.2 `packages/shared`

放跨端共享的数据模型和常量。

例如：

- `RequestStatus`
- `JobType`
- `HazardLevel`
- 表单 schema
- mock seeds

### 5.3 `packages/ui`

可选。

如果组件复用很少，可以不单独拆包，直接留在 `apps/web/src/components`。

### 5.4 `contracts/response-network`

放 Move package。

建议内容：

```text
contracts/response-network/
├─ Move.toml
├─ sources/
│  └─ response_network.move
└─ tests/
   └─ response_network_tests.move
```

### 5.5 `scripts`

只放辅助脚本，例如：

- 导出 mock 数据
- 生成 demo 数据
- 从链上抓取事件做本地 JSON 快照

## 6. 数据模型先定死

Codex 不要一边写页面一边改领域模型。

先用统一模型，再做页面。

### 6.1 `JobType`

```ts
type JobType = "rescue" | "escort" | "recovery";
```

### 6.2 `RequestStatus`

```ts
type RequestStatus =
  | "draft"
  | "open"
  | "accepted"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "expired"
  | "disputed";
```

### 6.3 `ServiceRequest`

前端和合约都围绕这个概念工作：

```ts
type ServiceRequest = {
  id: string;
  jobType: JobType;
  requester: string;
  responder?: string;
  startSystem: string;
  targetSystem?: string;
  hazardLevel: "low" | "medium" | "high";
  title: string;
  description: string;
  rewardMist: string;
  deadlineMs: number;
  status: RequestStatus;
  createdAtMs: number;
  updatedAtMs: number;
};
```

### 6.4 `EscrowRecord`

```ts
type EscrowRecord = {
  requestId: string;
  depositor: string;
  amountMist: string;
  tokenType: string;
  state: "locked" | "released" | "refunded";
  txDigest?: string;
};
```

### 6.5 `ProfileStats`

```ts
type ProfileStats = {
  wallet: string;
  jobsPosted: number;
  jobsCompleted: number;
  jobsCancelled: number;
  jobsFailed: number;
};
```

## 7. 页面范围必须克制

MVP 页面只保留这些：

### 7.1 `/`

Landing。

包含：

- 产品一句话
- 当前开放工单数
- `Post SOS`
- `Browse Requests`
- 三步流程图

### 7.2 `/requests`

工单列表页。

包含：

- 类型筛选
- 奖励排序
- 风险筛选
- 工单卡片

### 7.3 `/requests/new`

创建工单页。

MVP 只允许创建 `rescue` 工单。

字段：

- 当前位置
- 是否需要燃料
- 是否需要返航护送
- 风险等级
- 截止时间
- 赏金
- 描述

### 7.4 `/requests/:id`

工单详情页。

根据角色显示不同操作：

- 请求人：取消、确认完成
- 服务者：接单、开始执行、标记已完成
- 旁观者：查看详情

### 7.5 `/me`

我的页面。

包含：

- 我发布的工单
- 我接的工单
- 我的累计收入
- 我的完成数

## 8. 合约范围必须极小

不要一开始就做通用任务市场协议。

只做比赛 MVP 需要的最少函数。

### 8.1 需要的能力

1. 创建请求并锁定奖励
2. 接单
3. 更新状态
4. 请求人确认完成
5. 完成后放款
6. 未接单时取消并退款

### 8.2 推荐函数

```text
create_request
accept_request
mark_in_progress
mark_awaiting_confirmation
confirm_completion
cancel_open_request
expire_open_request
```

### 8.3 推荐事件

```text
RequestCreated
RequestAccepted
RequestStatusUpdated
RequestCompleted
RequestCancelled
EscrowReleased
EscrowRefunded
```

### 8.4 不要做的东西

- 不要做多接单者分账
- 不要做复杂仲裁
- 不要做自动 SLA 罚没
- 不要做链上 reputational scoring
- 不要做可升级的过度框架

## 9. 前端必须先抽象 Adapter

这是最重要的工程决策之一。

前端不要在各个页面里直接散落调用钱包和链上 SDK，而是先定义一个 `ResponseNetworkAdapter` 接口。

## 9.1 Adapter 接口建议

```ts
interface ResponseNetworkAdapter {
  listOpenRequests(): Promise<ServiceRequest[]>;
  getRequest(id: string): Promise<ServiceRequest | null>;
  createRescueRequest(input: CreateRescueRequestInput): Promise<TxResult>;
  acceptRequest(id: string): Promise<TxResult>;
  markInProgress(id: string): Promise<TxResult>;
  markAwaitingConfirmation(id: string): Promise<TxResult>;
  confirmCompletion(id: string): Promise<TxResult>;
  cancelOpenRequest(id: string): Promise<TxResult>;
  getMyDashboard(address: string): Promise<MyDashboardData>;
}
```

### 9.2 必须有两个实现

1. `MockResponseNetworkAdapter`
2. `ChainResponseNetworkAdapter`

好处：

- 第一周可以不等合约就把产品做出来
- 后面只替换 adapter，不推翻页面

## 10. 开发顺序

开发顺序必须按阶段推进，不要跳阶段。

### Phase 0: 基础脚手架

### 目标

让仓库从空目录变成可启动、可开发、可预览的项目。

### 任务

1. 初始化 workspace
2. 创建 `apps/web`
3. 创建 `contracts/response-network`
4. 创建 `packages/shared`
5. 配置 TypeScript、lint、format
6. 配置基础路由

### 完成定义

- `npm install` 可成功
- `npm run dev` 可启动
- 页面能正常打开
- 目录结构稳定

### Phase 1: 先做纯前端假数据 MVP

### 目标

不依赖链上，先把完整用户流程跑通。

### 任务

1. 定义共享 types
2. 实现 mock seed 数据
3. 实现 `MockResponseNetworkAdapter`
4. 完成以下页面：
   - 首页
   - 工单列表
   - 创建工单
   - 工单详情
   - 我的页面
5. 完成以下交互：
   - 发布工单
   - 接单
   - 状态推进
   - 完成确认
   - 模拟结算

### 完成定义

- 不连钱包也能本地演示完整流程
- 从创建到完成确认可在浏览器内跑通
- 所有状态切换都能在 UI 中正确反映

### 这是最重要的验收问题

`如果今天不做链上，这个产品是否已经看起来像一个真的服务市场？`

如果答案是否定的，不要进入下一阶段。

### Phase 2: 钱包接入和角色判断

### 目标

让产品从“假流程”变成“带真实钱包身份的产品”。

### 任务

1. 接入钱包连接按钮
2. 建立当前地址上下文
3. 在页面里根据地址判断角色
4. 隐藏未授权动作
5. 在 mock adapter 下也按真实地址做权限判断

### 完成定义

- 可连接钱包
- 不同钱包看到的按钮不同
- 请求人和响应者视角都正确

### Phase 3: 合约 MVP

### 目标

完成最小链上工单和 escrow。

### 任务

1. 初始化 Move package
2. 定义请求对象
3. 定义 escrow 结构
4. 实现最小状态机
5. 发出关键事件
6. 补 Move tests

### 优先顺序

1. `create_request`
2. `accept_request`
3. `confirm_completion`
4. `cancel_open_request`
5. 再补中间状态更新

### 完成定义

- 能在本地或目标网络部署
- 关键路径测试通过
- 至少一条完整工单状态路径可以通过测试

### Phase 4: 前端联调链上 Adapter

### 目标

把 UI 的真实数据源从 mock 切到链上。

### 任务

1. 实现 `ChainResponseNetworkAdapter`
2. 把创建工单接到真实交易
3. 把接单接到真实交易
4. 把完成确认接到真实交易
5. 读取链上对象和事件更新列表
6. 在页面中展示 digest / 成功状态

### 完成定义

- 至少一条完整工单从创建到放款走在真实链上
- UI 能看到真实状态变化
- digest 可展示和追踪

### Phase 5: 演示优化

### 目标

把“能跑”变成“能拿出来演”。

### 任务

1. 减少页面噪音
2. 优化主流程文案
3. 增加空状态和错误提示
4. 补 demo 数据
5. 设计双钱包演示脚本
6. 导出用于 README 的截图

### 完成定义

- 第一次看的人 `30` 秒能懂
- 一次完整演示 `3` 分钟内能结束
- 就算链慢，也有明确反馈

## 11. 每个阶段的具体待办

为了让 Codex 更像工程执行者而不是 brainstormer，每个阶段再细化成 checklist。

### 11.1 Phase 0 checklist

- 新建根目录 `package.json`
- 新建 workspace 配置
- 新建 `apps/web/package.json`
- 新建 `packages/shared/package.json`
- 初始化 `tsconfig` 体系
- 加入 `.gitignore`
- 为 `web` 配置 `dev`, `build`, `lint`, `test`

### 11.2 Phase 1 checklist

- 定义 `ServiceRequest` 类型
- 设计 6 到 8 条 mock requests
- 完成 `RequestCard`
- 完成 `RequestFilters`
- 完成 `CreateRescueForm`
- 完成 `StatusTimeline`
- 完成 `MyDashboard`
- 完成 mock 状态迁移函数

### 11.3 Phase 2 checklist

- 接入钱包 provider
- 做 `ConnectWalletButton`
- 做 `CurrentAddressBadge`
- 根据地址控制 CTA
- 未连接时显示 explain text

### 11.4 Phase 3 checklist

- 写 Move module
- 写状态机约束
- 写事件
- 写 create / accept / complete / cancel 测试

### 11.5 Phase 4 checklist

- 定义链上对象到前端模型的 mapper
- 实现事件查询
- 实现交易提交封装
- 实现交易错误提示
- 处理 pending 态和刷新逻辑

### 11.6 Phase 5 checklist

- 补首页三步图
- 优化按钮文案
- 增加成功页 toast
- 加入 demo seed 或 demo script
- 写 README 的 quickstart

## 12. 关键组件清单

Codex 实现时优先做以下组件：

### 12.1 `RequestCard`

用于列表页。

必须展示：

- 标题
- 类型
- 风险等级
- 奖励
- 状态
- 距离或位置摘要

### 12.2 `RequestStatusTimeline`

用于详情页。

必须能一眼看出：

- 当前在哪一阶段
- 下一步是谁操作

### 12.3 `CreateRescueForm`

必须支持：

- 表单校验
- 赏金输入
- 截止时间输入
- 文案预览

### 12.4 `RoleAwareActions`

这是详情页核心。

它根据当前角色渲染：

- 接单按钮
- 标记开始
- 标记完成
- 确认完成
- 取消工单

### 12.5 `WalletGuard`

统一处理：

- 未连接
- 链不对
- 没权限

## 13. 文案策略

这类项目很容易写得像任务平台，失去 EVE Frontier 语境。

页面文案要带游戏世界感，但不要过头。

### 13.1 推荐文案方向

- `Signal for Rescue`
- `Responder Needed`
- `Reward Locked`
- `Awaiting Pilot Confirmation`
- `Escort Contract`

### 13.2 不推荐

- 过于 Web2 的客服平台措辞
- 过于中二的世界观废话

## 14. 设计要求

UI 不要做成企业后台。

目标气质：

- 太空生存
- 紧急响应
- 有真实风险
- 比较克制

推荐视觉关键词：

- `distress signal`
- `flight console`
- `hazard panel`
- `mission terminal`

页面必须让人有“这是游戏服务网络”的感觉，而不是 Jira。

## 15. 合约设计注意事项

### 15.1 访问控制

- 只有请求人可取消 `Open` 工单
- 只有响应者可推进执行状态
- 只有请求人可确认完成

### 15.2 状态约束

- `Open` 才能接单
- `Accepted` 才能进入 `In Progress`
- `Awaiting Confirmation` 才能完成放款

### 15.3 资金安全

- 所有金额使用最小单位
- 所有放款和退款逻辑都要受状态约束
- 明确防止重复放款

### 15.4 事件优先

前端依赖事件做列表和历史更新，所以事件设计要稳定、字段齐全。

## 16. 测试要求

### 16.1 前端至少测这些

1. 创建工单表单校验
2. 列表筛选
3. 角色权限按钮
4. 状态流转文案

### 16.2 合约至少测这些

1. 创建工单时成功锁资金
2. 非法接单失败
3. 非法状态推进失败
4. 请求人确认完成后成功放款
5. 取消成功退款

### 16.3 联调至少测这些

1. 交易 pending 态
2. 交易成功后的 UI 刷新
3. 交易失败后的错误提示

## 17. Demo 录制准备

演示必须使用两个身份：

1. `Requester`
2. `Responder`

推荐脚本：

1. 展示开放工单列表
2. 用请求人发布一单 `Fuel Rescue`
3. 展示奖励被锁定
4. 切到响应者接单
5. 响应者推进到已完成
6. 切回请求人确认完成
7. 展示自动结算结果和历史记录

必须录到的画面：

- 钱包连接
- 工单出现
- 状态变化
- 交易成功反馈
- 收款结果

## 18. 如果遇到阻塞，怎么降级

### 18.1 如果链上对象建模太慢

先用最简单单对象模型，不做通用索引结构。

### 18.2 如果事件读取难度高

优先保证详情页和当前用户历史可读，再优化列表聚合。

### 18.3 如果 Stillness 接不顺

先在支持的钱包和目标网络跑通链路，保留 digest 和录屏，之后再补 Stillness。

### 18.4 如果 UI 时间不够

舍弃：

- 动画
- 图表
- Recovery 页面
- Escort 页面

保留：

- 首页
- 创建工单
- 工单详情
- 接单和结算

## 19. Codex 执行顺序

如果 Codex 要从现在开始直接动手，建议按下面顺序一轮轮做：

1. 初始化 monorepo
2. 起一个最小 React 应用
3. 写共享 types
4. 写 mock adapter
5. 完成所有 MVP 页面
6. 把 mock 流程打通
7. 再开 Move 合约
8. 再把 adapter 切到链上
9. 最后补 README、截图和 demo

不要在第 `1` 步就去碰：

- 地图集成
- 复杂 EVE API
- reputation 系统
- 多 token 支持

## 20. Done 定义

只有同时满足以下条件，项目才算“先完成”：

1. 本地可运行
2. 有完整的 `SOS Rescue` 流程
3. 有链上锁奖励和放款
4. 有两个钱包的角色切换
5. 有一条可录制的演示脚本
6. 有 README 指导别人复现

## 21. 参考资料

Codex 实现前后可参考这些官方资料：

- EVE Frontier Builder Docs: <https://docs.evefrontier.com/>
- Connecting from an External Browser: <https://docs.evefrontier.com/dapps/connecting-from-an-external-browser>
- dApps Quick Start: <https://docs.evefrontier.com/dapps/dapps-quick-start>
- Interfacing with the EVE Frontier World: <https://docs.evefrontier.com/tools/interfacing-with-the-eve-frontier-world>

## 22. 最后的执行提醒

这个项目真正的难点不是写一个页面，也不是写一个 Move module。

真正的难点是：

`克制住做平台化和做大而全的冲动，只把一条真实玩家服务链路做得完整、可信、好演示。`

Codex 只要把这件事守住，项目就会往正确方向走。
