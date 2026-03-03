# Data Dashboard

一個以 React + TypeScript 打造的互動式資料視覺化儀表板，支援 CSV 與 Excel 檔案上傳，並提供表格篩選、欄位分析、相關性矩陣等功能。

## 功能特色

- **資料上傳**：支援 `.csv` 與 `.xlsx` / `.xls` 檔案
- **資料表格**：排序、欄位顯示控制、多條件篩選（數值範圍 / 類別勾選）
- **欄位分析**：直方圖、箱型圖、長條圖，支援 Group By 分組比較
- **相關性分析**：Pearson 相關係數熱力圖 + 互動式散布圖
- **圖表下載**：單張圖表匯出為 PNG

## 技術棧

| 分類 | 套件 |
|------|------|
| 框架 | React 19、TypeScript 5.9 |
| 建構工具 | Vite 7 |
| 樣式 | Tailwind CSS v4 |
| 圖表 | Recharts 3 |
| 資料解析 | papaparse（CSV）、xlsx（Excel） |
| 圖表匯出 | html-to-image |

## 安裝與啟動

### 前置需求

- [Node.js](https://nodejs.org/) v18 以上
- npm（隨 Node.js 附帶）

### 安裝步驟

```bash
# 1. 複製專案
git clone <repository-url>
cd data-dashboard

# 2. 安裝相依套件
npm install

# 3. 啟動開發伺服器
npm run dev
```

開發伺服器預設在 [http://localhost:5173](http://localhost:5173) 執行。

### 其他指令

```bash
# 型別檢查 + 建置正式版本
npm run build

# 預覽正式建置結果
npm run preview

# 執行 ESLint 檢查
npm run lint
```

## 專案結構

```
src/
├── App.tsx                    # 主要版面與狀態管理
├── components/
│   ├── DataTable/             # 資料表格（排序、篩選、欄位控制）
│   ├── Analysis/              # 欄位分析面板與圖表元件
│   └── Charts/                # 相關性矩陣與散布圖
├── hooks/
│   └── useClickOutside.ts
└── utils/
    ├── dataUtils.ts           # 資料型別轉換工具
    ├── statsFormatters.ts     # 統計量格式化
    ├── correlationUtils.ts    # Pearson 相關係數計算
    ├── groupUtils.ts          # 分組資料處理
    └── downloadAsPng.ts       # PNG 匯出
```

## 使用方式

1. 點擊上傳區域或拖曳 CSV / Excel 檔案
2. 在資料表格中透過欄位標頭的篩選按鈕設定條件
3. 切換至「欄位分析」查看各欄位的統計圖表，可選擇 Group By 欄位進行分組
4. 切換至「相關性」查看數值欄位間的相關係數，點擊色格可在散布圖中檢視
