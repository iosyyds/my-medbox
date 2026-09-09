/**
 * 智谱 GLM-4V 多模态 AI 药品识别模块
 * API Key 已内置，所有设备打开直接可用；用户也可在设置中自定义 Key
 */

const AI_CONFIG_KEY = 'medbox_ai_config_v1';

// 内置默认 API Key（Base64 编码，运行时解码）
const DEFAULT_KEY_B64 = 'MDRhMGNiZjI1ZTM3NDZjYzk2MTExZWUxY2I0NWM4NmMuRjdGYVFSUHM3d1J3N2JTTg==';

function getDefaultKey() {
  try {
    return atob(DEFAULT_KEY_B64);
  } catch {
    return '';
  }
}

// 获取 AI 配置
export function getAIConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { apiKey: getDefaultKey(), enabled: true, isDefault: true };
    const cfg = JSON.parse(raw);
    // 兼容旧格式
    const key = cfg.apiKey || getDefaultKey();
    const enabled = cfg.enabled !== undefined ? cfg.enabled : true;
    return { apiKey: key, enabled, isDefault: !cfg.apiKey };
  } catch {
    return { apiKey: getDefaultKey(), enabled: true, isDefault: true };
  }
}

// 保存 AI 配置
export function saveAIConfig(config) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify({ apiKey: config.apiKey, enabled: config.enabled }));
}

// 检查 AI 是否可用
export function isAIEnabled() {
  const cfg = getAIConfig();
  return cfg.enabled && cfg.apiKey && cfg.apiKey.trim().length > 0;
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
  "expireDate": "保质期/有效期至，格式为YYYY-MM-DD（如图片中有生产日期和有效期，推算出有效期至；没有则留空）",
  "tags": ["标签1", "标签2"],
  "note": "其他补充信息（没有则留空）"
}

注意：
1. 只提取图片中真实存在的信息，不要编造
2. 如果图片模糊或无法识别，name 字段填"无法识别"，其他字段留空
3. 药品名称尽量用通用名
4. expireDate 必须是 YYYY-MM-DD 格式，如果图片中只有生产日期和有效期（如"有效期24个月"），请推算出有效期至的日期
5. 严格输出 JSON，不要有 markdown 代码块标记`;
}

// 解析 AI 返回的 JSON
function parseAIResponse(text) {
  try {
    let jsonStr = text.trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
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

/**
 * 用智谱 GLM-4V 识别药品图片
 * @param {string} imageDataUrl - 图片的 data URL
 * @param {function} onProgress - 进度回调
 * @returns {Promise<object>} 识别结果
 */
export async function recognizeMedicineWithAI(imageDataUrl, onProgress) {
  const config = getAIConfig();
  if (!config.enabled || !config.apiKey) {
    throw new Error('AI 未配置，请在设置中填写 API Key');
  }

  // 解析 data URL
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('图片格式无效');
  const mimeType = match[1];
  const base64 = match[2];

  if (onProgress) onProgress('正在连接智谱 AI…');

  const dataUrl = `data:${mimeType};base64,${base64}`;
  const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
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
    let errMsg = `智谱 API 错误 (${response.status})`;
    if (response.status === 401) errMsg += '：API Key 无效或已过期，请检查';
    else if (response.status === 429) errMsg += '：请求过于频繁，请稍后再试';
    else if (response.status === 400) errMsg += '：请求参数错误';
    else errMsg += `：${errText.substring(0, 100)}`;
    throw new Error(errMsg);
  }

  if (onProgress) onProgress('智谱 AI 识别中…');

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('智谱返回为空，请重试');

  if (onProgress) onProgress('正在解析识别结果…');

  const parsed = parseAIResponse(text);
  if (!parsed) throw new Error('识别结果解析失败，请重试');
  return parsed;
}

// 获取 API Key 申请链接
export function getAISignupUrl() {
  return 'https://open.bigmodel.cn/usercenter/apikeys';
}
