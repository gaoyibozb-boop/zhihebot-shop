INSERT OR IGNORE INTO products (id,name,category,tag,subtitle,price,sold,stock,delivery,tone,detail,sort_order,created_at,updated_at) VALUES
('chatgpt-plus-ph','ChatGPT Plus 月卡｜菲律宾官方正规卡充（同步官方售后）','ChatGPT','本周爆款','充值到自己账号',118,604,5,'自动发货','blue','自助充值卡密，兑换后订阅一个月 Plus。购买前请确认账号状态与商品适用范围。',1,datetime('now'),datetime('now')),
('chatgpt-plus-ios','ChatGPT Plus 月卡｜iOS 官方正规充值〖质保30天〗〖秒冲〗〖卡密可囤三天〗','ChatGPT','iOS充值','充值到自己账号',132,4955,20,'自动发货','blue','iOS 场景的 ChatGPT Plus 月卡充值方案。',2,datetime('now'),datetime('now')),
('chatgpt-pro-5x','ChatGPT Pro 5X｜1个月｜iOS 官方正规充值〖秒冲〗〖质保30天〗','ChatGPT','iOS充值','5X-100刀款 · 充值自己账号',650,417,5,'自动发货','violet','高频用户的 Pro 5X 月度方案。',3,datetime('now'),datetime('now')),
('chatgpt-pro-20x','ChatGPT Pro 20X 月卡｜官方卡充｜1个月｜支持续费｜正规充值','ChatGPT','推理强','20X-200刀款 · 充值自己账号',1100,564,5,'自动发货','violet','重度连续任务的 Pro 20X 方案。',4,datetime('now'),datetime('now')),
('chatgpt-pro-20x-ios','ChatGPT Pro 20X｜1个月｜iOS 官方正规充值〖秒冲〗〖质保30天〗','ChatGPT','iOS充值','20X-200刀款 · 充值自己账号',1190,135,5,'自动发货','violet','iOS 场景的 Pro 20X 充值方案。',5,datetime('now'),datetime('now')),
('claude-pro','Claude Pro 月卡｜IOS 官方正规充值〖秒冲〗〖质保30天〗','Claude','Claude','充值到自己账号',136,812,5,'自动发货','amber','适合长文本、写作、翻译和复杂分析的 Claude Pro 月卡。',6,datetime('now'),datetime('now')),
('grok-super','Grok Super 月卡｜IOS 官方正规充值〖质保订阅〗','Grok','Grok','充值到自己账号',260,284,5,'自动发货','silver','Grok Super 月卡。',7,datetime('now'),datetime('now')),
('gemini-pro','Gemini Pro 12个月成品〖质保首登丨官方订阅〗美区20-24年高权重账号','Gemini','Gemini设计向','成品号',35,189,5,'自动发货','green','Gemini Pro 长周期成品账号方案。',8,datetime('now'),datetime('now')),
('binance-followers','币安广场刷粉业务','Binance','人工核单','刷粉业务',400,6,5,'人工核单发货','gold','平台增长类人工服务，具体处理范围以订单沟通为准。',9,datetime('now'),datetime('now')),
('api-basic','AI API / 中转服务','API / 中转','API','接口服务 · 按量使用',0,0,0,'人工核单','cyan','开发者 API / 中转服务入口，模型、额度和计费以实际配置为准。',10,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO site_settings (key,value_json,updated_at) VALUES
('site','{"siteName":"智核商店","siteSubtitle":"AI 服务精选商城","announcementEnabled":true,"announcementText":"主营各种 AI 工具充值、会员与数字服务","popupEnabled":true,"popupTitle":"智核商店公告","popupContent":"下单前请仔细阅读商品说明、库存、交付方式和售后规则。付款后请保存订单号与查单信息。","popupNotice":"本站不会要求你提供第三方平台密码、支付密码、验证码、Cookie、Session、Token 或钱包私钥。","popupButtonText":"开始选购","footerDescription":"AI 会员、数字产品、卡密与开发者服务的一站式商城。","telegramUrl":"https://t.me/","qqUrl":""}',datetime('now')),
('payments','{"alipay1":{"enabled":true,"qrUrl":"","pureCode":"","buttonText":"打开支付宝立即支付"},"alipay2":{"enabled":false,"qrUrl":"","link":"","buttonText":"支付宝2支付"},"wechat":{"enabled":true,"qrUrl":"","buttonText":"请打开微信扫一扫支付"},"usdt":{"enabled":false,"network":"TRC20","address":"","qrUrl":""}}',datetime('now'));
