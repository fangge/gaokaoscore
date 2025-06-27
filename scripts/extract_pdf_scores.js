const fs = require("fs");
const path = require("path");
const PDFParser = require("pdf2json");

const pdfFiles = [
  { file: "8.音乐表演(声乐)方向总分分数段统计表（含本、专科层次加分）.pdf", category: "音乐表演(声乐)" },
  { file: "10.舞蹈类总分分数段统计表（含本、专科层次加分）.pdf", category: "舞蹈类" },
  { file: "16.书法类总分分数段统计表（含本、专科层次加分）.pdf", category: "书法类" }
];

const dataDir = path.join(__dirname, "../data");
const jsonPath = path.join(dataDir, "score_distributions.json");

function extractScoreData(text) {
  // 支持中文空格、制表符、多个空格等分隔符，自动跳过非数据行
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const scoreData = [];
  for (const line of lines) {
    // 允许分数、人数、累计之间有任意空白字符（含中文空格、制表符）
    const match = line.match(/^(\d{2,4})[ \u3000\t]+(\d+)[ \u3000\t]+(\d+)$/);
    if (match) {
      scoreData.push({
        score: parseInt(match[1], 10),
        count: parseInt(match[2], 10),
        cumulative: parseInt(match[3], 10)
      });
    }
  }
  if (scoreData.length === 0) {
    console.warn("未能自动识别数据行，请检查PDF文本内容：", lines.slice(0, 20));
  }
  return scoreData;
}

function parsePDF(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", err => reject(err.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
      const text = pdfParser.getRawTextContent();
      console.log('text: ', text);
      resolve(text);
    });
    pdfParser.loadPDF(filePath);
  });
}

(async () => {
  let distributions = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  for (const { file, category } of pdfFiles) {
    const pdfPath = path.join(dataDir, file);
    const text = await parsePDF(pdfPath);
    const scoreData = extractScoreData(text);
    if (scoreData.length > 0) {
      distributions.push({ category, scoreData });
      console.log(`已提取: ${category}, 共${scoreData.length}条`);
    } else {
      console.warn(`未能提取: ${category}`);
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(distributions, null, 2), "utf8");
  console.log("已补充score_distributions.json");
})();