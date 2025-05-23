import crypto from 'crypto';
import fetch from 'node-fetch';

const glados = async (cookie) => {
  if (!cookie?.includes('koa:sess=')) {
    return ['❌ Cookie格式错误', '缺少koa:sess字段'];
  }

  try {
    const headers = {
      cookie,
      referer: 'https://glados.rocks/console/checkin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...'
    };

    // 顺序执行关键请求
    const checkinRes = await fetch('https://glados.rocks/api/user/checkin', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ token: "glados.one" }),
    });
    const checkinData = await checkinRes.json();
  
    // 添加请求间隔
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusRes = await fetch('https://glados.rocks/api/user/status', {
      method: 'GET',
      headers
    });
    const status = await statusRes.json();

    // 深度数据校验
    if (!status?.data || typeof status.data.leftDays === 'undefined') {
      console.error('异常数据:', JSON.stringify(status, null, 2));
      throw new Error('API返回结构异常，建议检查Cookie有效性');
    }

    return [
      checkinData.code === 0 ? '✅ 签到成功' : '🔄 重复签到',
      `📆 剩余天数: ${Number(status.data.leftDays).toFixed(1)}天`,
      `🔐 账户ID: ${cookie.match(/koa:sess=([^;]+)/)[1].slice(0, 8)}***`
    ];
  
  } catch (error) {
    console.error('完整错误日志:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return [
      '❌ 执行失败',
      `错误类型: ${error.name}`,
      `详情: ${error.message}`,
      `🆔 账户标识: ${cookie.slice(0, 15)}***`
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
          `### 自动签到结果 ${new Date().toLocaleString('zh-CN')}`,
          ...contents.map((item, index) =>
            `---\n**账户 ${index + 1}**\n${item.join('\n')}`
          )
        ].join('\n\n')
      }
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000, // 增加超时控制
      body: JSON.stringify(message)
    });

    const result = await response.json();
    if (result.errcode !== 0) {
      console.error('钉钉API错误:', result);
    }
  } catch (error) {
    console.error('通知异常:', error.message);
    if (error.response) {
      console.error('响应详情:', await error.response.text());
    }
  }
};

const main = async () => {

  // 动态获取所有账户 (支持 GLADOS_1, GLADOS_2 格式)
  const accounts = Object.entries(process.env)
    .filter(([key]) => key.startsWith('GLADOS'))
    .map(([, value]) => value);

  if (accounts.length === 0) {
    throw new Error('未配置 GLADOS 开头的账户变量');
  }

  console.log(`🏃 开始处理 ${accounts.length} 个账户`);
  const results = await Promise.all(accounts.map(glados));
  await notify(results);
};

main()
  .then(() => console.log('✅ 所有流程完成'))
  .catch(err => {
    console.error('‼️ 全局错误:', err.message);
    process.exit(1); // 确保 Action 标记为失败
  });
