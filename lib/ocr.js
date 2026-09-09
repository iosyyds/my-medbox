// OCR文字识别工具 - 使用Tesseract.js纯前端识别
// 动态加载CDN，不影响初始加载速度

let tesseractWorker = null;
let isLoading = false;
let loadPromise = null;

// 动态加载Tesseract.js
function loadTesseract() {
  if (tesseractWorker) return Promise.resolve(tesseractWorker);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.Tesseract) {
      initWorker(window.Tesseract).then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => {
      if (window.Tesseract) {
        initWorker(window.Tesseract).then(resolve).catch(reject);
      } else {
        reject(new Error('Tesseract.js加载失败'));
      }
    };
    script.onerror = () => reject(new Error('Tesseract.js脚本加载失败'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

async function initWorker(Tesseract) {
  if (tesseractWorker) return tesseractWorker;
  isLoading = true;
  try {
    tesseractWorker = await Tesseract.createWorker('chi_sim+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // console.log('OCR进度:', Math.round(m.progress * 100) + '%');
        }
      },
    });
    return tesseractWorker;
  } catch (err) {
    isLoading = false;
    loadPromise = null;
    throw err;
  }
}

/**
 * 识别图片中的文字
 * @param {string} imageData - base64图片数据或图片URL
 * @param {function} onProgress - 进度回调 (progress 0-1, status)
 * @returns {Promise<string>} 识别出的文字
 */
export async function recognizeText(imageData, onProgress) {
  try {
    if (onProgress) onProgress(0.1, '加载识别引擎');
    const worker = await loadTesseract();

    if (onProgress) onProgress(0.3, '正在识别文字');

    await worker.setParameters({
      tessedit_char_whitelist:
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz阿啊爱安按奥八把白百半帮包保报北被本比边便别不才参草层茶差长常场厂车成城吃冲抽出除处传窗春此从村打大带当到道得的等低地第点电店定东动都斗度短对多儿发法反方放分风封夫服福父复腹改干感刚高告哥格个各给根更工公功共古骨故顾关观官管光广归国过还孩海好合何和河喝黑很红后候护花化画坏还换黄回会活火或机及级极即几己计记技际季既家加价假间简见建健件将交角脚教叫接节结解姐金今尽近进经惊精景净就九酒旧局句具绝决开看可克刻客课肯空口快宽况来蓝老乐了雷类冷里理力立连脸练凉两亮了料林临零六龙楼路录旅乱绿论罗落妈马吗买卖满慢忙毛么没每美门们梦米面苗民明名命模末莫母目拿哪那乃奶南难脑内能你年念鸟您牛农努女暖欧怕牌派盘旁配朋片漂平评破七期其奇骑起气汽千前钱强悄桥切亲轻清情请秋求球区取去全确群然让人忍日容肉如入三散色森杀沙山伤商上少绍社射申身深神生声胜失十时实识史世市事是适室收手首书叔树双水睡说司丝死四寺似苏素速算虽随岁孙所他她它台太谈汤堂套特疼题体天条铁听亭庭同头图土团推外完玩晚万王往望危微为位未文问我握无五午武物西吸希息习喜系细下先现线相香想向项象消小晓校些鞋写心新信星行形性姓休修需许续选学雪血寻训呀牙亚烟言颜眼演验样要也业一衣医依宜已以乙意因阴音银引应英营影硬用优由油有又右于余鱼愉与雨语元原园圆远院愿月云杂在再咱早怎造则泽增扎展张掌招找照这着真正证知之支只直指制质中钟种重周洲主住注祝专转庄装状追准着子自总走组最左作做坐',
    });

    const { data } = await worker.recognize(imageData);
    if (onProgress) onProgress(1, '识别完成');
    return data.text || '';
  } catch (err) {
    console.error('OCR识别失败:', err);
    throw new Error('文字识别失败：' + err.message);
  }
}

/**
 * 预处理图片，增强文字识别效果
 * @param {string} imageData - base64图片
 * @returns {Promise<string>} 处理后的base64图片
 */
export function preprocessImage(imageData) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const scale = Math.max(1, 1200 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.3 + 128));
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {
        // 跨域图片可能无法处理，直接用原图
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageData;
  });
}

/**
 * 拍照识别药品完整流程
 * 1. 预处理图片
 * 2. OCR识别文字
 * 3. 匹配药品知识库
 * @param {string} imageData - base64图片
 * @param {function} onProgress - 进度回调
 * @returns {Promise<{text: string, medicine: object|null}>}
 */
export async function recognizeMedicine(imageData, onProgress) {
  if (onProgress) onProgress(0.05, '图片预处理');
  let processedImage = imageData;
  try {
    processedImage = await preprocessImage(imageData);
  } catch (e) {
    // 预处理失败，用原图
  }

  if (onProgress) onProgress(0.2, '加载识别引擎');
  const text = await recognizeText(processedImage, (p, s) => {
    if (onProgress) onProgress(0.2 + p * 0.6, s);
  });

  if (onProgress) onProgress(0.85, '匹配药品信息');
  const { matchMedicineFromText } = await import('./medicineDB');
  const medicine = matchMedicineFromText(text);

  if (onProgress) onProgress(1, '识别完成');

  return { text, medicine };
}

// 释放worker资源
export async function terminateOCR() {
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate();
    } catch (e) {}
    tesseractWorker = null;
    loadPromise = null;
  }
}
