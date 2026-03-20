# Frontier Response Network Demo Script

- Status: Demo rehearsal draft
- Target length: 90 seconds
- Audience: Hackathon judges

## 1. 录制前检查表

1. `Requester` 和 `Responder` 两个钱包都切到 `Sui Testnet`
2. 两个钱包都有足够的 testnet `SUI`
3. `apps/web/.env.local` 指向当前 testnet package 和 registry
4. 右侧钱包面板能看到：
   - 完整钱包地址
   - `SUI` 余额
   - package id / registry id
5. 详情页能打开 explorer 链接
6. 顶部没有 `Chain read unavailable` banner
7. `Pilot Console` 能看到最近活动流，作为收尾镜头备用

## 2. 90 秒讲解脚本

### 0 - 15 秒

“这是 Frontier Response Network，一个给 EVE Frontier 玩家用的链上救援派单网络。请求人发 SOS 时，奖励会先锁进 Sui 合约里。”

画面停留：

1. `Dispatch Console`
2. 右侧钱包面板里的 package id / registry id / 余额

### 15 - 35 秒

“现在我用 Requester 钱包发布一笔燃料救援请求。这里会先检查网络是不是 testnet，余额够不够 bounty 和 gas，再进入钱包签名。”

画面停留：

1. `Post SOS`
2. `Publish preflight`
3. 创建成功后跳转到详情页

### 35 - 55 秒

“请求创建后，详情页会直接展示 request id 和最新交易 digest，所以评委可以马上点进 explorer 验证。”

画面停留：

1. `Request Detail`
2. `Request ID`
3. `Latest transaction digest`
4. `Open digest`

### 55 - 75 秒

“接下来我切到 Responder 钱包接单，并把状态推进到 Awaiting confirmation。每一步都有新的链上 digest，页面会同步更新。”

画面停留：

1. 切换浏览器 profile
2. 接单
3. `Mark in progress`
4. `Mark awaiting confirmation`

### 75 - 90 秒

“最后切回 Requester 确认完成。这里能看到 escrow 从 locked 变成 released，收款方变成 responder，奖励完成放款。然后我切到 Pilot Console，最近活动流会保留这次结算 proof。”

画面停留：

1. `Confirm completion`
2. `Escrow and payout posture`
3. `Recipient`
4. `Released`
5. 最后一次 digest
6. `Pilot Console` 最近活动流

## 3. 重录回退点

1. 如果发布失败，回到 `Post SOS`，先检查余额和网络提示
2. 如果 responder 接单失败，回到 `Request Board` 重新进入详情页
3. 如果链上读失败，点顶部 `Retry chain read`
4. 如果 explorer 没打开，先复制 digest 再手动粘贴到浏览器
