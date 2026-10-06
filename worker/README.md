# 智核商店：GitHub Pages + Cloudflare Workers + D1 + R2

## 目标架构
- 前台：GitHub Pages，域名 zhihebot.shop
- 后端 API：Cloudflare Workers，域名 api.zhihebot.shop
- 数据库：Cloudflare D1
- 图片：Cloudflare R2
- 站长后台：https://zhihebot.shop/admin/

## 1. 创建 D1
安装 Wrangler：
`npm install -g wrangler`

登录 Cloudflare：
`wrangler login`

创建数据库：
`wrangler d1 create zhihebot`

把返回的 database_id 填入 worker/wrangler.toml 的 database_id。

初始化表：
`wrangler d1 execute zhihebot --remote --file=worker/schema.sql`

写入初始商品和默认支付设置：
`wrangler d1 execute zhihebot --remote --file=worker/seed.sql`

## 2. 创建 R2
`wrangler r2 bucket create zhihebot-assets`

worker/wrangler.toml 已经配置好 R2 binding 名称为 ASSETS。

## 3. 配置管理员密码
在项目的 worker 目录执行：
`wrangler secret put ADMIN_PASSWORD`
输入你的站长后台密码。

再执行：
`wrangler secret put ADMIN_SECRET`
输入一串随机长密码，建议至少 32 个字符。

## 4. 部署 Worker
从仓库根目录执行：
`cd worker`
`wrangler deploy`

部署后，在 Cloudflare 控制台给这个 Worker 添加 Custom Domain：
`api.zhihebot.shop`

不要把 ADMIN_PASSWORD 或 ADMIN_SECRET 写进 GitHub 文件。

## 5. DNS
把 zhihebot.shop 继续指向你当前的 GitHub Pages。
在 Cloudflare DNS 中让 api.zhihebot.shop 指向刚部署的 Worker Custom Domain。

## 6. 后台
打开：
https://zhihebot.shop/admin/

登录后可以管理：
- 仪表盘
- 商品
- 订单
- 支付设置
- 网站设置

## 7. 支付设置
支付宝1：
- 上传支付宝二维码到 R2
- 粘贴你已经解码好的支付宝纯净码
- 系统根据纯净码生成支付宝唤起链接
- 前台显示“打开支付宝立即支付”按钮
- 同时保留二维码作为备用

微信支付：
- 上传微信收款二维码到 R2
- 前台直接展示二维码
- 提示用户打开微信扫一扫

支付宝2 和 USDT 目前也预留了独立配置位。

## 8. 后续迁移到香港服务器
以后可以保持前台不变，只把：
api.zhihebot.shop
从 Cloudflare Worker 切换到香港服务器上的 Nginx/Node API。

D1 数据可以导出后迁移到 PostgreSQL/MySQL/SQLite；R2 图片也可以迁移到服务器对象目录。
