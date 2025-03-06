# Checkin

GitHub Actions 实现 [GLaDOS][glados] 自动签到

([GLaDOS][glados] 可用邀请码: `BLLQN-VOHDV-AJLB0-7D0JH`, 双方都有奖励天数)

## 使用说明

1. Fork 这个仓库

1. 登录 [GLaDOS][glados] 获取 Cookie

1. 添加 Cookie 到 Secret `GLADOS` (可支持多cookie，分别设置为不同变量，再在 main.js 添加函数)

1. 启用 Actions, 每天北京时间 09:00 自动签到

1. 如需推送通知, 可用[钉钉机器人][dingtalk-robots], 添加 Token 到 Secret `DINGTALK_SECRET`、`DINGTALK_WEBHOOK`

[glados]: https://github.com/glados-network/GLaDOS
[dingtalk-robots]: https://open.dingtalk.com/document/robots/customize-robot-security-settings
