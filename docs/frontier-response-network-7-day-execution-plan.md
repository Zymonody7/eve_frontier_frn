# Frontier Response Network 7-Day Execution Plan

- Status: Active shipping plan
- Date: 2026-03-18
- Audience: Codex / Builder / Demo owner
- Scope: Hackathon submission and demo finalization
- Related docs:
  - `docs/frontier-response-network-prd.md`
  - `docs/frontier-response-network-dev-guide.md`

## 1. 这份文档只解决一个问题

接下来 7 天到底做什么，谁做，改哪些文件，跑哪些命令，做到什么程度才算完成。

如果后续只保留一份执行文档，就保留这份。

## 2. 当前基线

### 2.1 已完成

1. 前端已从 mock 身份切到真实钱包连接。
2. `Response Network` Move 合约已实现最小状态机和 escrow。
3. 合约已成功发布到 `Sui Testnet`。
4. 前端已切到链上模式。
5. `npm run typecheck` 通过。
6. `npm run build` 通过。
7. `sui move test` 通过。

### 2.2 当前链上部署信息

| Item | Value |
| --- | --- |
| Network | `testnet` |
| Package ID | `0x49fa5c1a7bc586d9a733b5eea5fc264d4f40fa1e7463925ee6f5c14448eeaa99` |
| Registry ID | `0x46dbf80c58d61fae8bb68bd3e9d12ae6b61e3c150f9b8043bfbe91e70f4693c4` |
| Publish Digest | `97PxiKcJ7kdLtNK3vaVoBEqRyocMWyFEoP5YbHmJeCWw` |
| Deployment record | `contracts/response-network/deployments/testnet.json` |

### 2.3 当前最主要风险

1. 链上读取失败时，前端会静默退回本地镜像，评委看不出来。
2. 页面虽然能跑，但“链上证明感”还不够强。
3. 发单前缺余额和网络前置校验，demo 现场容易翻车。
4. 合约测试还主要覆盖 happy path，负向约束不足。
5. 提交材料还没有收口。

## 3. 7 天内不允许偏离的范围

### 3.1 只打透一个故事

只围绕这条主线：

`Requester 发布 SOS -> Responder 接单 -> Responder 推进状态 -> Requester 确认 -> 奖励放款`

### 3.2 明确不做

这 7 天不要新增下面这些方向：

1. 新工单类型大扩展
2. 聊天系统
3. 地图系统重构
4. 声誉算法复杂化
5. 后端服务
6. 指数级增加页面数量

### 3.3 每天的收口动作固定

每天结束前必须执行：

```bash
npm run typecheck
npm run build
cd contracts/response-network && sui move test
```

## 4. 角色分工

### 4.1 Codex 负责

1. 所有代码修改
2. 所有样式修复
3. 合约测试补充
4. README 和 docs 落盘
5. demo 文案和提交流程整理

### 4.2 你负责

1. 准备两个 `Sui Testnet` 钱包
2. 准备 testnet `SUI`
3. 录屏
4. 最终上传视频和提交材料

### 4.3 需要你提前准备的实物

1. `Requester` 钱包
2. `Responder` 钱包
3. 两个浏览器 profile，或者两个浏览器
4. 录屏工具：`QuickTime` 或 `OBS`

## 5. Day 1: 补链上证明感

### 5.1 目标

让评委一眼看出：

1. 这是链上合约，不是本地假状态
2. 每一步都有可验证的交易凭证
3. 当前页面连的是哪条链、哪个 package、哪个 registry

### 5.2 Codex 任务

1. 在右侧钱包面板增加：
   - 完整 `packageId`
   - 完整 `registryId`
   - `copy` 按钮
   - testnet explorer 链接
2. 在工单详情页增加：
   - `requestId`
   - 最近一次交易 `digest`
   - `copy digest`
   - `open in explorer`
3. 在成功交易反馈里，把纯文本 receipt 改成更明确的链上成功提示。

### 5.3 预计改动文件

1. `apps/web/src/components/WalletPanel.tsx`
2. `apps/web/src/pages/RequestDetailPage.tsx`
3. `apps/web/src/features/requests/requestUtils.ts`
4. `apps/web/src/styles/index.css`

### 5.4 验收标准

1. 发单成功后能看到本次交易 digest。
2. 接单、确认完成后也能看到对应 digest。
3. 可以从页面直接跳转到 explorer。
4. 评委不需要打开源码就能知道 package 和 registry 是什么。

## 6. Day 2: 补钱包、余额、网络前置校验

### 6.1 目标

避免 demo 现场出现：

1. 钱包连上了但网络不对
2. 没 gas
3. bounty 不够
4. 点击发布后才知道失败

### 6.2 Codex 任务

1. 在钱包面板显示：
   - 当前账户完整地址
   - 当前网络
   - `SUI` 余额
2. 在发单页面增加前置校验：
   - 当前网络必须为 `testnet`
   - 余额大于 bounty 且留出 gas
   - deadline 不能为 0 或负数
3. 把错误提示改成人话：
   - `Insufficient SUI for bounty and gas`
   - `Switch wallet network to Sui Testnet`

### 6.3 预计改动文件

1. `apps/web/src/components/WalletPanel.tsx`
2. `apps/web/src/pages/NewRequestPage.tsx`
3. `apps/web/src/features/wallet/useWalletSession.ts`
4. `apps/web/src/features/wallet/networkConfig.ts`
5. 需要时新增 `apps/web/src/features/wallet/useWalletBalance.ts`

### 6.4 验收标准

1. 用户在发单前就能知道自己能不能发。
2. 网络不对时，页面明确提示切到 `Sui Testnet`。
3. 余额不足时，不进入钱包签名后才失败。

## 7. Day 3: 修复链上读取的静默降级

### 7.1 目标

页面必须明确告诉用户自己看到的是：

1. 链上真实数据
2. 还是本地镜像回退

不能继续“悄悄 fallback”。

### 7.2 Codex 任务

1. 为链上读取失败设计一个全局退化状态。
2. 页面顶部显示 degraded banner：
   - `Chain read unavailable`
   - `Showing local mirror fallback`
3. 加一个 `Retry chain read` 按钮。
4. 保留 fallback，但必须显式可见。

### 7.3 预计改动文件

1. `apps/web/src/features/requests/chainAdapter.ts`
2. `apps/web/src/features/requests/AdapterContext.tsx`
3. `apps/web/src/components/AppShell.tsx`
4. `apps/web/src/styles/index.css`

### 7.4 验收标准

1. 人为让链上读失败时，用户能看到 fallback 提示。
2. 重新恢复网络后可以手动重试。
3. 不再只在 console 里 `warn`。

## 8. Day 4: 把详情页做成可讲故事的结算页

### 8.1 目标

`Request Detail` 要成为 demo 的核心页面，而不是只有几个按钮。

### 8.2 Codex 任务

1. 在结算区补全以下信息：
   - 锁定金额
   - 当前 escrow 状态
   - 接收方
   - 是否退款
   - 最后一次链上交易 digest
2. 强化状态流转文案：
   - `Open`
   - `Accepted`
   - `In progress`
   - `Awaiting confirmation`
   - `Completed`
   - `Cancelled`
3. 让 `Requester` 和 `Responder` 的视角更明确。

### 8.3 预计改动文件

1. `apps/web/src/pages/RequestDetailPage.tsx`
2. `apps/web/src/components/RequestTimeline.tsx`
3. `apps/web/src/features/requests/chainReadModel.ts`
4. `apps/web/src/styles/index.css`

### 8.4 验收标准

1. 只看详情页就能讲完整个故事。
2. 评委能理解钱什么时候锁，什么时候放。
3. 完成和取消两条结算路径都能看明白。

## 9. Day 5: 补合约负向测试和前端 smoke test

### 9.1 目标

把最容易被问倒的“边界条件”补上。

### 9.2 Codex 任务

1. Move 测试新增至少以下场景：
   - 请求人不能接自己的单
   - 非请求人不能取消
   - 重复接单失败
   - 非 responder 不能推进状态
   - 零奖励失败
   - 过期 deadline 失败
2. 前端补一轮最小 smoke checklist：
   - 发单成功
   - 接单成功
   - 状态推进成功
   - 完成后能看到结算结果

### 9.3 预计改动文件

1. `contracts/response-network/sources/response_network.move`
2. 如果需要可拆分测试文件到 `contracts/response-network/tests/`
3. `docs/frontier-response-network-dev-guide.md`

### 9.4 验收标准

1. `sui move test` 通过且测试数量明显增加。
2. 关键非法操作都被覆盖。
3. 开发手册中有一段“已测约束清单”。

## 10. Day 6: Demo 彩排与录制准备

### 10.1 目标

让录屏过程变成机械动作，不靠现场发挥。

### 10.2 你要准备

1. `Requester` 钱包
2. `Responder` 钱包
3. 两个钱包都有 testnet `SUI`
4. 两个浏览器 profile

### 10.3 Codex 任务

1. 整理一版 90 秒 demo 脚本。
2. 整理一版录制前检查表。
3. 明确每一步该停在哪个页面。
4. 指定推荐录制顺序：
   - 连钱包
   - 发单
   - 工单出现
   - 切 responder 接单
   - responder 推进状态
   - requester 确认完成
   - 展示结算结果

### 10.4 建议录到的画面

1. 钱包连接
2. 工单创建成功
3. 状态变化
4. digest 或 explorer
5. 完成后结算结果
6. `Pilot Console` 中的历史记录

### 10.5 验收标准

1. 可以在 90 秒内稳定演完。
2. 任何一步失败时，都知道退回到哪里重录。
3. 台词不依赖解释太多背景。

## 11. Day 7: 收口提交材料

### 11.1 目标

把项目从“能演示”变成“能提交”。

### 11.2 Codex 任务

1. 补根目录 `README.md`
2. README 里必须回答：
   - 这是做什么的
   - 为什么有用
   - 技术结构
   - 如何运行
   - testnet 部署信息
   - demo 视频位置
   - 已知限制
3. 输出一页架构图
4. 输出一页状态流转图
5. 整理截图素材

### 11.3 你要完成

1. 录制最终视频
2. 上传 demo
3. 提交比赛表单

### 11.4 验收标准

1. 仓库首页可独立阅读。
2. 评委不问问题也能明白项目价值。
3. 提交页面要求的内容都有对应材料。

## 12. 每天的执行模板

每天按下面节奏推进：

### 上午

1. 只做当天目标，不分心。
2. 先修风险最高的点。
3. 先完成核心链路，再补视觉。

### 下午

1. 补齐空状态、错误态、边界态。
2. 做一次完整自测。

### 晚上收口

1. 跑固定命令：

```bash
npm run typecheck
npm run build
cd contracts/response-network && sui move test
```

2. 记录当天完成项。
3. 更新这份文档里的状态。

## 13. 每天必须更新的状态格式

执行人每天结束时，把下面内容补到本文件末尾或新建日报：

```text
Day X
- Done:
- Blocked:
- Next:
- Commands passed:
```

## 14. 最终提交前的总检查

### 14.1 代码

1. 前端能本地启动
2. 前端能连钱包
3. 发单、接单、确认完成至少跑通一次
4. `typecheck` 通过
5. `build` 通过
6. `sui move test` 通过

### 14.2 链上

1. package id 已记录
2. registry id 已记录
3. publish digest 已记录
4. 至少有一笔真实工单链上记录

### 14.3 demo

1. 两个钱包准备好
2. 钱包网络正确
3. 钱包有足够 testnet `SUI`
4. 录屏脚本排练过至少 2 次
5. 视频长度控制在 90 秒左右

### 14.4 文档

1. README 完整
2. 架构图存在
3. 状态流转图存在
4. 部署信息可查

## 15. 当前建议的真实推进顺序

如果只允许按一个顺序做，就按这个顺序：

1. Day 1: 链上证明感
2. Day 2: 钱包和余额前置校验
3. Day 3: 链上退化显式化
4. Day 4: 详情页结算信息
5. Day 5: Move 负向测试
6. Day 6: demo 彩排
7. Day 7: README 和提交材料

不要倒过来做。

## 16. 这 7 天完成后的判断标准

如果 7 天后我们能同时满足下面 6 条，就算本轮成功：

1. 评委能在 30 秒内看懂产品。
2. demo 能稳定跑完。
3. 页面能明确证明链上执行过。
4. 失败态不会让人误判成“假 demo”。
5. 合约关键约束有测试。
6. 仓库和提交材料完整。

## 17. 最新状态

### Day 5

- Done:
  - Move 负向测试补齐到 `8` 条，总覆盖 happy path、取消路径、重复接单、权限限制、零奖励、过期 deadline。
  - 前端 `smoke suite` 已接入，覆盖 `AppShell`、`NewRequestPage`、`RequestDetailPage`、`MePage`。
  - `Request Detail` 交易活动流和结算状态已能完整讲通 publish -> accept -> progress -> awaiting -> complete。
- Blocked:
  - 无代码阻塞。
- Next:
  - 录最终视频，补最终 demo URL。
- Commands passed:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:smoke`
  - `cd contracts/response-network && sui move test`

### Day 6

- Done:
  - `Pilot Console` 增加最近活动流，可直接展示最新 settlement proof。
  - `Request Board` 增加 latest proof digest，评委不进详情页也能看到最近链上凭证。
  - 链上模式页面增加自动轮询，双浏览器演示时更容易同步最新状态。
  - 浏览器级彩排已完成：确认首页、`Request Board`、`Post SOS`、`My Console` 路由渲染正常。
- Blocked:
  - 真实双钱包录屏仍需要你本地完成最终彩排。
- Next:
  - 使用两个 testnet 钱包按 demo script 录一条 90 秒成片。
- Commands passed:
  - `npm run test:smoke`
  - 浏览器实机检查：`http://127.0.0.1:4175/`

### Day 7

- Done:
  - 根目录 `README.md` 已补齐运行方式、架构图、状态流、testnet 部署信息、限制项。
  - `docs/frontier-response-network-dev-guide.md` 已补已测约束、smoke checklist、最近新增能力说明。
  - `docs/frontier-response-network-demo-script.md` 已补录屏检查表和 `Pilot Console` 收尾镜头。
- Blocked:
  - 最终 hosted demo URL 仍待补充。
- Next:
  - 上传视频并完成比赛表单提交。
- Commands passed:
  - 见 Day 5 固定命令清单
