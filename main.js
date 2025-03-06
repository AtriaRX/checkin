const glados = async (cookie, notifyToken) => {
  try {
    const headers = {
      'cookie': cookie,
      'referer': 'https://glados.rocks/console/checkin',
      'user-agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
    }
  
    const [checkin, status] = await Promise.all([
      fetch('https://glados.rocks/api/user/checkin', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: '{"token":"glados.one"}',
      }).then(r => r.json()),
    
      fetch('https://glados.rocks/api/user/status', {
        method: 'GET',
        headers,
      }).then(r => r.json())
    ])

    return [
      'Checkin OK',
      `${checkin.message}`,
      `Left Days ${Number(status.data.leftDays)}`,
      `Account: ${cookie.slice(0, 15)}...`  // 添加账户标识
    ]
  } catch (error) {
    return [
      'Checkin Error',
      `${error}`,
      `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`,
      `Account: ${cookie.slice(0, 15)}...`
    ]
  }
}

const main = async () => {
  // 并行执行所有账户签到
  const results = await Promise.all([
    glados(process.env.GLADOS, process.env.NOTIFY),
    glados(process.env.GLADOS2, process.env.NOTIFY2)
  ])
  console.log('通知内容:', results) // 确认有有效数据

  // 发送合并通知（如需分开通知可单独调用notify）
  await notify(results.flat())
  console.log('通知函数已执行')
}

// 新增：钉钉签名生成函数
const generateDingSign = (secret) => {
  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  const crypto = require('crypto');
  const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
  return { timestamp, sign };
};

// 修改后的通知函数
const notify = async (contents) => {
  console.log('当前环境变量:', {
    DINGTALK_WEBHOOK: !!process.env.DINGTALK_WEBHOOK,
    DINGTALK_SECRET: !!process.env.DINGTALK_SECRET
  })

  // 在发送请求前打印
  console.log('钉钉请求URL:', url)
  console.log('请求Payload:', message)
  const webhook = process.env.DINGTALK_WEBHOOK;
  const secret = process.env.DINGTALK_SECRET;

  if (!webhook || !contents) return;

  try {
    // 生成签名参数
    const { timestamp, sign } = generateDingSign(secret);
    const url = `${webhook}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;

    // 构造钉钉消息体
    const message = {
      msgtype: "markdown",
      markdown: {
        title: "签到结果通知",
        text: `### GitHub签到结果\n${contents.join('\n\n')}`
      },
      at: {
        isAtAll: false  // 如需@特定人，设置atMobiles: ["手机号"]
      }
    };

    // 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  
    const result = await response.json();
    if (result.errcode !== 0) {
      console.error('钉钉通知失败:', result.errmsg);
    }
  } catch (error) {
    console.error('通知异常:', error);
  }
};
