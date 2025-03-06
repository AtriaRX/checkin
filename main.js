// import dotenv from 'dotenv';
// import crypto from 'crypto';
// import fetch from 'node-fetch';

// dotenv.config();

// // 添加调试日志
// console.log('[启动] 环境变量检测:', {
//   GLADOS: !!process.env.GLADOS,
//   DINGTALK_WEBHOOK: !!process.env.DINGTALK_WEBHOOK,
//   DINGTALK_SECRET: !!process.env.DINGTALK_SECRET
// });

const glados = async (cookie) => {
  try {
    const headers = {
      cookie,
      referer: 'https://glados.rocks/console/checkin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    };

    const [checkin, status] = await Promise.all([
      fetch('https://glados.rocks/api/user/checkin', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ token: "glados.one" }),
      }).then(r => r.json()),

      fetch('https://glados.rocks/api/user/status', {
        method: 'GET',
        headers,
      }).then(r => r.json())
    ]);

    return [
      checkin.code === 0 ? '✅ 签到成功' : '⚠️ 重复签到',
      `📅 剩余天数: ${Number(status.data.leftDays)} 天`,
      `🆔 账户标识: ${cookie.match(/koa:sess=([^;]+)/)?.[1].slice(0, 8)}...`
    ];
  } catch (error) {
    return [
      '❌ 签到失败',
      `错误信息: ${error.message}`,
      `🆔 账户标识: ${cookie.slice(0, 15)}...`
    ];
  }
};

const generateDingSign = (secret) => {
  const timestamp = Date.now();
  const sign = crypto.createHmac('sha256', secret)
    .update(`${timestamp}\n${secret}`)
    .digest('base64');
  return { timestamp, sign };
};

const notify = async (contents) => {
  const webhook = process.env.DINGTALK_WEBHOOK;
  const secret = process.env.DINGTALK_SECRET;

  if (!webhook || !secret) {
    console.log('🔔 跳过通知：未配置钉钉参数');
    return;
  }

  try {
    const { timestamp, sign } = generateDingSign(secret);
    const url = new URL(webhook);
    url.searchParams.append('timestamp', timestamp);
    url.searchParams.append('sign', sign);

    const message = {
      msgtype: "markdown",
      markdown: {
        title: "GLaDOS 签到报告",
        text: [
          `### 自动签到结果 ${new Date().toLocaleString()}`,
          ...contents.map((item, index) =>
            `---\n**账户 ${index + 1}**\n${item.join('\n')}`
          )
        ].join('\n\n')
      }
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();

    if (result.errcode !== 0) {
      console.error('钉钉API错误:', result.errmsg);
    }
  } catch (error) {
    console.error('通知异常:', error.message);
  }
};

const main = async () => {
  // console.log('[阶段1] 开始执行');
  const accounts = [
    process.env.GLADOS,
    process.env.GLADOS2
  ].filter(Boolean);

  if (accounts.length === 0) {
    console.log('⚠️ 未配置有效账户');
    return;
  }

  const results = await Promise.all(
    accounts.map(cookie => glados(cookie))
  );

  await notify(results);
  console.log('🎉 任务执行完成');
};

main()
  .then(() => console.log('✅ 所有流程完成'))
  .catch(err => console.error('‼️ 全局错误:', err));