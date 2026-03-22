# Frontier Response Network Demo Recording Guide

- Status: Ready for recording
- Recommended length: `90` to `120` seconds
- Audience: Hackathon judges
- Hosted demo URL: `https://eve-frontier-frn-web-orcw.vercel.app/`
- Network: `Sui Testnet`

## 1. Demo goal

这支视频要让评委在最短时间里理解 4 件事：

1. 这是一个链上救援派单产品，不是静态原型
2. 请求创建时，奖励会先锁进合约
3. 救援状态由不同角色推进，并且每一步都有链上 proof
4. 最终必须由 `Requester` 确认，资金才会释放给 `Responder`

## 2. 建议录制规格

### 2.1 推荐设备和工具

1. 使用 `CleanShot`、`OBS` 或系统录屏
2. 分辨率建议 `1440p` 或 `1080p`
3. 浏览器建议用两个独立 `Profile` 或两个不同浏览器窗口
4. 系统缩放建议 `100%`，浏览器缩放建议 `90%` 到 `100%`

### 2.2 推荐录制布局

1. `Requester` 钱包放在浏览器窗口 A
2. `Responder` 钱包放在浏览器窗口 B
3. 两个窗口都提前打开同一个线上站
4. 如果要减少切换时间，可以让两个窗口都停在同一条请求详情页

## 3. 录制前准备

### 3.1 钱包准备

1. 准备两个不同的钱包地址
2. 两个钱包都切到 `Sui Testnet`
3. 两个钱包都有足够 testnet `SUI`
4. `Requester` 钱包余额要覆盖 bounty 和 gas

### 3.2 页面准备

1. 打开线上地址 `https://eve-frontier-frn-web-orcw.vercel.app/`
2. 确认右侧钱包面板能看到：
   - 完整钱包地址
   - `SUI balance`
   - `Package ID`
   - `Registry ID`
3. 确认顶部没有 `Chain read unavailable`
4. 如果页面刚切换过钱包，等待几秒让状态自动刷新

### 3.3 不要拿旧单子录

建议每次录制都新建一条全新的请求，不要复用之前卡过或演示过的旧请求。这样最稳。

## 4. 录制流程总览

推荐按这个链路录：

1. 展示产品首页或 dashboard
2. 用 `Requester` 发布新 SOS
3. 展示新请求的 `Request ID` 和 `Latest transaction digest`
4. 切到 `Responder` 接单
5. `Responder` 标记 `In progress`
6. `Responder` 标记 `Awaiting confirmation`
7. 切回 `Requester` 做 `Confirm completion`
8. 展示 `Released`、收款地址和活动流 proof

## 5. 逐镜头录制脚本

## 5.1 开场镜头，0 到 15 秒

### 画面

1. 打开 dashboard 首页
2. 镜头停在中间主内容区和右侧钱包面板
3. 让 `Package ID`、`Registry ID`、余额都能被看到

### 口播

“这是 Frontier Response Network，一个部署在 Sui Testnet 上的链上救援派单网络。请求发起后，奖励会先锁进合约，后续状态推进和结算都可验证。”

### 这一段要让评委看到

1. 不是本地 demo，而是在线站点
2. 页面上能直接看到链上 runtime 信息

## 5.2 发布请求，15 到 35 秒

### 画面

1. 点击 `Post SOS`
2. 停在 `Publish preflight`
3. 填写或保留一组稳定参数
4. 点击提交并完成 `Requester` 钱包签名

### 建议表单参数

1. `Current system`: `Nomad's Wake`
2. `Hazard level`: `high`
3. `Reward`: `0.5` 或 `1`
4. `Deadline`: `6`
5. `Distress details`: 保持默认文案即可
6. 勾选 `Fuel delivery required`
7. 勾选 `Escort home required`

### 口播

“现在我用 Requester 钱包发布一笔救援请求。这里会先检查 testnet 网络、钱包余额和 gas，然后再进入钱包签名。”

### 这一段要让评委看到

1. 发布前检查不是假 UI
2. 真正会调起钱包签名

## 5.3 展示创建成功后的 proof，35 到 50 秒

### 画面

创建成功后会自动跳到详情页。停在这里 5 到 10 秒。

重点给镜头：

1. `Request ID`
2. `Latest transaction digest`
3. `Open digest`
4. `Escrow and payout posture`

### 口播

“请求创建完成后，详情页会直接展示 request id 和最新交易 digest。评委可以直接点 explorer，验证这条请求已经上链。”

### 操作建议

1. 点一次 `Open digest`
2. 如果 explorer 打开稳定，就让评委看到浏览器新标签页
3. 如果 explorer 有偶发问题，就复制 digest，不要在录制时停太久

## 5.4 切到 Responder 接单，50 到 70 秒

### 画面

1. 切到浏览器窗口 B
2. 使用 `Responder` 钱包打开同一条请求详情页
3. 点击 `Accept request`
4. 钱包签名
5. 等页面状态刷新
6. 点击 `Mark in progress`
7. 钱包签名
8. 点击 `Mark awaiting confirmation`
9. 钱包签名

### 口播

“接下来我切到 Responder 钱包接单，并推进状态。每一步都会生成新的链上 digest，页面会自动同步最新状态。”

### 这一段要让评委看到

1. 角色切换是真实的钱包角色切换
2. 不是单一账户模拟整套流程
3. 状态从 `Open` 走到 `Awaiting confirmation`

## 5.5 切回 Requester 完成结算，70 到 95 秒

### 画面

1. 切回浏览器窗口 A
2. 确认当前钱包就是最初创建这条请求的 `Requester`
3. 等详情页出现 `Confirm completion`
4. 点击 `Confirm completion`
5. 钱包签名
6. 停在结算结果区域

重点给镜头：

1. `Escrow state`
2. `Recipient`
3. `Released`
4. 最后一次 `Latest transaction digest`

### 口播

“最后必须由 Requester 确认完成，资金才会释放。现在可以看到 escrow 从 locked 变成 released，收款地址也变成 responder。”

### 这一段要让评委看到

1. 不是 responder 自己就能结算
2. 资金释放有明确的角色约束

## 5.6 收尾镜头，95 到 120 秒

### 画面

1. 进入 `Pilot Console`
2. 展示最近活动流
3. 如果时间足够，再切回 `Request Board`

### 口播

“除了详情页 proof，Pilot Console 也会保留与当前钱包相关的最新活动流，方便追踪完整结算历史。”

## 6. 一版可直接照念的中文口播稿

“这是 Frontier Response Network，一个部署在 Sui Testnet 上的链上救援派单网络。请求人发布 SOS 时，奖励会先锁进合约。现在我用 Requester 钱包创建一笔燃料救援请求，系统会先检查网络、余额和 gas，然后进入钱包签名。创建成功后，详情页会直接展示 request id 和最新交易 digest，评委可以马上验证链上 proof。接下来我切到 Responder 钱包接单，并把状态推进到 in progress 和 awaiting confirmation。最后切回 Requester 钱包确认完成，这时 escrow 会从 locked 变成 released，收款地址变成 responder。这样整个请求创建、状态推进和结算释放，都会在页面里留下可验证的链上证据。” 

## 7. 录制中的关键注意事项

### 7.1 `Awaiting confirmation` 时为什么看不到完成按钮

如果页面已经到 `Awaiting confirmation`，但动作区没有 `Confirm completion`，通常只有两种原因：

1. 当前连接的钱包不是这条请求的 `Requester`
2. 页面还没刷新到最新链上状态

正确处理方式：

1. 切回最初发起这条请求的钱包
2. 等几秒或切换一下页面再回到详情页
3. 确认角色面板显示的是 `Requester controls`

### 7.2 `Responder` 接单时出现 `Request not found`

如果你刚创建完请求，马上在另一个窗口打开，偶发会遇到索引延迟。

处理方式：

1. 不要立刻切换，等 `3` 到 `5` 秒
2. 回到 `Request Board` 再点进去一次
3. 或者在详情页刷新一次

建议录制时每个链上动作后留 `2` 到 `4` 秒空挡，不要连续猛点。

### 7.3 `SUI` 余额和状态没有立即刷新

当前页面已经做了自动轮询，但链上读取不是毫秒级的。

建议：

1. 每个动作签名完成后等几秒
2. 切回原页面时等一下再继续口播
3. 如果录制时发现刚好还没刷到，不要紧张，重新停顿 2 秒即可

### 7.4 Explorer 链接偶发不可用

如果外部 explorer 页面偶尔打不开，不要在镜头里卡太久。

回退方式：

1. 直接展示页面里的 `digest`
2. 点击 `Copy digest`
3. 继续往下录

评委核心看的是你有可验证 proof，不一定非得现场完整跳 explorer。

## 8. 最稳的录制顺序

如果你只想“一次过”，建议用下面这条最稳脚本：

1. 打开 dashboard
2. 展示钱包面板里的 `Package ID` 和 `Registry ID`
3. 新建一条 `0.5 SUI` 的请求
4. 展示 `Request ID` 和 `Latest transaction digest`
5. 切到 `Responder` 接单
6. `Mark in progress`
7. `Mark awaiting confirmation`
8. 切回 `Requester`
9. `Confirm completion`
10. 展示 `Released` 和 `Recipient`
11. 收尾切到 `Pilot Console`

## 9. 录制失败时的重录回退点

1. 如果发布失败，回到 `Post SOS`，先检查 `Sui Testnet` 和余额提示
2. 如果 responder 接单失败，回 `Request Board` 再重新打开详情页
3. 如果动作区空白，先检查当前钱包是不是对应角色
4. 如果 `Confirm completion` 不出现，切回最初发单的钱包
5. 如果 explorer 没打开，不要硬等，直接展示 digest
6. 如果状态刷新慢，等待几秒或刷新当前页

## 10. 录完后的检查清单

1. 视频里至少出现一次 `Package ID`
2. 视频里至少出现一次 `Registry ID`
3. 视频里至少出现一次 `Request ID`
4. 视频里至少出现两次以上 `transaction digest`
5. 视频里能看出 `Requester` 和 `Responder` 是两个不同钱包
6. 视频结尾能看到 `Released`
7. 视频里不要出现明显的报错弹窗和长时间空白等待

## 11. 建议提交版本

建议最终保留一版 `90` 到 `120` 秒的视频，节奏如下：

1. `0` 到 `15` 秒讲产品和链上定位
2. `15` 到 `35` 秒创建请求
3. `35` 到 `70` 秒展示链上 proof 和 responder 推进状态
4. `70` 到 `95` 秒 requester 完成确认结算
5. `95` 到 `120` 秒收尾展示活动流
