// ================== 新增模块：dingtalk.js ==================
const crypto = require('crypto');

const generateSign = (secret) => {
  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  const sign = crypto.createHmac('sha256', secret)
                    .update(stringToSign)
                    .digest('base64');
  return { timestamp, sign };
};

export const notifyToDingTalk = async (title, contents, config) => {
  const { webhook, secret } = config;

  try {
    // 1. 生成签名URL
    const { timestamp, sign } = generateSign(secret);
    const url = `${webhook}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;

    // 2. 构造Markdown消息
    const message = {
      msgtype: "markdown",
      markdown: {
        title: `${title} - ${new Date().toLocaleDateString()}`,
        text: [
          `### ${title}`,
          ...contents.map(line => `- ${line}`),
          `**执行环境**: GitHub Actions`,
          `[查看日志](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`
        ].join('\n\n')
      }
    };

    // 3. 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  
    // 4. 处理响应
    const result = await response.json();
    if (result.errcode !== 0) {
      throw new Error(`钉钉API错误: ${result.errmsg}`);
    }
    return true;
  } catch (error) {
    console.error(`钉钉通知失败: ${error.message}`);
    return false;
  }
};
