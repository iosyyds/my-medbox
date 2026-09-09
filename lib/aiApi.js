/**
 * 多模态 AI 药品识别模块
 * 支持 Google Gemini 和 智谱 GLM-4V
 * API Key 由用户在设置中输入，保存在 localStorage
 */

const AI_CONFIG_KEY = 'medbox_ai_config_v1';

// 获取 AI 配置
export function getAIConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { provider: '', apiKey: '', enabled: false };
    return JSON.parse(raw);
  } catch {
    return { provider: '', apiKey: '', enabled: false };
  }
}

// 保存 AI 配置
export function saveAIConfig(config) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

// 检查 AI 是否可用
export function isAIEnabled() {
  const cfg = getAIConfig();
  return cfg.enabled && cfg.provider && cfg.apiKey;
}

// 构建提示词
function buildPrompt() {
  return `你是一个专业的药品识别助手。请仔细识别这张药品图片中的所有文字信息，然后提取以下字段并以严格的 JSON 格式返回（不要输出任何其他文字，只输出 JSON）：

{
  "name": "药品通用名或商品名（必填，尽量准确）",
  "type": "药品类型（如：OTC/处方药/中成药/西药/保健品/外用药/眼药水/喷剂等）",
  "effect": "主要功效/适应症（简洁概括，不超过50字）",
  "usage": "用法用量（简洁概括）",
  "taboo": "禁忌/注意事项（简洁概括，没有则留空）",
  "factory": "生产厂家（没有则留空）",
  "tags": ["标签1", "标签2"],
  "note": "其他补充信息（没有则留空）"
}

注意：
1. 只提取图片中真实存在的信息，不要编造
2. 如果图片模糊或无法识别，name 字段填"无法识别"，其他字段留空
3. 药品名称尽量用通用名
4. 严格输出 JSON，不要有 markdown 代码块标记`;
}

// 解析 AI 返回的 JSON
function parseAIResponse(text) {
  try {
    // 尝试直接解析
    let jsonStr = text.trim();
    // 移除可能的 markdown 代码块
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
    // 找到第一个 { 和最后一个 }
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start >= 0 && end > start) {
      jsonStr = jsonStr.substring(start, end + 1);
    }
    const data = JSON.parse(jsonStr);
    return data;
  } catch (e) {
    console.error('AI 响应解析失败:', e, text);
    return null;
  }
}

// 调用 Google Gemini
async function callGemini(apiKey, imageBase64, mimeType, onProgress) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  if (onProgress) onProgress('正在连接 Gemini...');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: buildPrompt() },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API 错误 (${response.status}): ${errText.substring(0, 200)}`);
  }

  if (onProgress) onProgress('正在解析识别结果...');

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Gemini 返回为空');
  
  const parsed = parseAIResponse(text);
  if (!parsed) throw new Error('识别结果解析失败，请重试');
  return parsed;
}

// 调用智谱 GLM-4V
async function callZhipu(apiKey, imageBase64, mimeType, onProgress) {
  const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  
  if (onProgress) onProgress('正在连接智谱 AI...');
  
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'glm-4v-flash',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: buildPrompt() },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }],
      temperature: 0.1,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`智谱 API 错误 (${response.status}): ${errText.substring(0, 200)}`);
  }

  if (onProgress) onProgress('正在解析识别结果...');

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('智谱返回为空');
  
  const parsed = parseAIResponse(text);
  if (!parsed) throw new Error('识别结果解析失败，请重试');
  return parsed;
}

/**
 * 用 AI 识别药品图片
 * @param {string} imageDataUrl - 图片的 data URL
 * @param {function} onProgress - 进度回调
 * @returns {Promise<object>} 识别结果
 */
export async function recognizeMedicineWithAI(imageDataUrl, onProgress) {
  const config = getAIConfig();
  if (!config.enabled || !config.provider || !config.apiKey) {
    throw new Error('AI 未配置，请在设置中填写 API Key');
  }

  // 解析 data URL
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('图片格式无效');
  const mimeType = match[1];
  const base64 = match[2];

  if (config.provider === 'gemini') {
    return callGemini(config.apiKey, base64, mimeType, onProgress);
  } else if (config.provider === 'zhipu') {
    return callZhipu(config.apiKey, base64, mimeType, onProgress);
  } else {
    throw new Error('不支持的 AI 服务商');
  }
}

// 获取服务商显示名称
export function getProviderName(provider) {
  const map = {
    gemini: 'Google Gemini',
    zhipu: '智谱 GLM-4V'
  };
  return map[provider] || provider;
}

// 获取 API Key 申请链接
export function getProviderSignupUrl(provider) {
  const map = {
    gemini: 'https://aistudio.google.com/app/apikey',
    zhipu: 'https://open.bigmodel.cn/usercenter/apikeys'
  };
  return map[provider] || '';
}
