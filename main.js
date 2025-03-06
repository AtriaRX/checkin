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

  // 发送合并通知（如需分开通知可单独调用notify）
  await notify(results.flat())
}

// 修改后的通用通知函数
const notify = async (contents) => {
  const tokens = [process.env.NOTIFY, process.env.NOTIFY2].filter(Boolean)
  if (!tokens.length || !contents) return

  await Promise.all(tokens.map(token => 
    fetch(`https://www.pushplus.plus/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        title: 'GLaDOS Checkin Report',
        content: contents.join('<br>'),
        template: 'markdown',
      }),
    })
  ))
}
