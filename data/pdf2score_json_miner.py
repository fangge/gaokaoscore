import os
import json
from pdfminer.high_level import extract_text

PDF_DIR = "/Users/fangyang/Mrfangge/project/gaokaoscore/data/"
JSON_PATH = os.path.join(PDF_DIR, "score_distributions.json")

def extract_category_from_filename(filename):
    name = filename.split(".", 1)[-1]
    name = name.replace("总分分数段统计表（含本、专科层次加分）.pdf", "")
    name = name.replace("分数段统计表（含本、专科层次加分）.pdf", "")
    name = name.replace("方向", "")
    name = name.replace("表(导)演", "表(导)演类")
    name = name.replace("播音与主持", "播音与主持类")
    name = name.replace("美术与设计", "美术与设计类")
    name = name.replace("音乐教育", "音乐教育类")
    name = name.replace("高考音乐表演", "音乐表演类")
    name = name.replace("书法", "书法类")
    name = name.replace("普通类（历史）", "普通类(历史)")
    name = name.replace("普通类（物理）", "普通类(物理)")
    name = name.replace("体育", "体育类")
    return name.strip()

def extract_score_data_from_pdf(pdf_path):
    text = extract_text(pdf_path)
    lines = text.split("\n")
    score_data = []
    for line in lines:
        # 假设每行格式为：分数 人数 累计
        parts = line.strip().split()
        if len(parts) == 3:
            try:
                score = int(parts[0])
                count = int(parts[1])
                cumulative = int(parts[2])
                score_data.append({"score": score, "count": count, "cumulative": cumulative})
            except Exception:
                continue
    return score_data

def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    existing_categories = set(item["category"] for item in data)
    pdf_files = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]
    new_items = []
    for pdf in pdf_files:
        category = extract_category_from_filename(pdf)
        if category in existing_categories:
            continue
        pdf_path = os.path.join(PDF_DIR, pdf)
        score_data = extract_score_data_from_pdf(pdf_path)
        if score_data:
            new_items.append({"category": category, "scoreData": score_data})
    if new_items:
        data.extend(new_items)
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"已补充{len(new_items)}个科目到score_distributions.json")
    else:
        print("没有发现需要补充的科目")

if __name__ == "__main__":
    main()