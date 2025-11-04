<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import * as XLSX from "xlsx";

// 定義 props
interface Props {
  defaultData?: {
    categories: string[];
    series: Record<string, any>;
  };
}

const props = withDefaults(defineProps<Props>(), {
  defaultData: () => ({
    categories: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    series: {
      A商品: [120, 200, 150, 220, 180, 200, 190, 230, 210, 240],
      B商品: [80, 150, 120, 180, 140, 200, 160, 190, 170, 210],
      C商品: [90, 160, 130, 190, 150, 210, 170, 200, 180, 220],
      D商品: [100, 180, 140, 210, 170, 230, 190, 220, 200, 240],
    },
  }),
});

// 定義 emit 事件
const emit = defineEmits<{
  dataImported: [
    data: {
      categories: string[];
      series: Record<string, number[]>;
      seriesNames: string[];
      fileName?: string;
    }
  ];
}>();

// 檔案上傳相關
const fileInput = ref<HTMLInputElement | null>(null);
const uploadedFile = ref<string>("");

// 處理 Excel 檔案上傳
const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // 檢查檔案類型
  const fileType = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(fileType || "")) {
    ElMessage.error("請上傳 Excel 檔案 (.xlsx, .xls) 或 CSV 檔案");
    return;
  }

  uploadedFile.value = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });

      // 讀取第一個工作表
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        ElMessage.error("Excel 檔案中沒有找到工作表");
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        ElMessage.error("無法讀取工作表內容");
        return;
      }

      // 轉換為 JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][];

      // 處理 Excel 邏輯
      processExcelData(jsonData);

      ElMessage.success(`成功匯入：${file.name}`);
    } catch (error) {
      console.log("Excel 解析錯誤", error);
      ElMessage.error("Excel 檔案解析失敗，請檢查格式");
    }
  };

  reader.onerror = () => {
    ElMessage.error("檔案讀取失敗");
  };

  reader.readAsArrayBuffer(file);
};

// 處理 Excel 資料並轉換為圖表格式
const processExcelData = (data: any[][]) => {
  if (data.length < 2) {
    ElMessage.warning("Excel 資料不足，至少需要標題列和一列資料");
    return;
  }

  // 第一列是標題
  const headers = data[0];
  if (!headers || headers.length < 2) {
    ElMessage.error("Excel 格式錯誤：需要至少兩欄（類別 + 至少一個系列）");
    return;
  }

  // 系列名稱（例如：["A商品", "B商品", "C商品"]）
  const seriesHeaders = headers.slice(1);

  // 提取類別名稱（第一欄的資料）
  const categories: string[] = [];
  const seriesDataMap: Record<string, number[]> = {};

  // 初始化系列資料結構
  seriesHeaders.forEach((header) => {
    if (header) {
      seriesDataMap[String(header)] = [];
    }
  });

  // 從第二列開始讀取資料
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // 第一個是類別名稱
    const category = String(row[0] || `類別${i}`);
    categories.push(category);

    // 後續欄位是各系列的數值
    seriesHeaders.forEach((header, index) => {
      if (header) {
        const key = String(header);
        const value = Number(row[index + 1]) || 0;
        if (seriesDataMap[key]) {
          seriesDataMap[key].push(value);
        }
      }
    });
  }

  // 發送資料給父組件
  emit("dataImported", {
    categories,
    series: seriesDataMap,
    seriesNames: Object.keys(seriesDataMap),
    fileName: uploadedFile.value,
  });

  ElMessage.success(
    `已匯入 ${categories.length} 個類別，${seriesHeaders.length} 個系列`
  );
};

// 觸發檔案選擇
const triggerFileUpload = () => {
  fileInput.value?.click();
};

// 清除上傳的檔案並重置為預設資料
const clearUploadedFile = () => {
  console.log("開始清除檔案..."); // 添加調試日誌

  uploadedFile.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }

  // 確保使用深拷貝來避免引用問題
  const defaultCategories = [...props.defaultData.categories];
  const defaultSeries = JSON.parse(JSON.stringify(props.defaultData.series));
  const defaultSeriesNames = Object.keys(defaultSeries);

  // 發送預設資料給父組件
  emit("dataImported", {
    categories: defaultCategories,
    series: defaultSeries,
    seriesNames: defaultSeriesNames,
  });

  ElMessage.success("已重置為預設資料");
};

const loadTestData = async () => {
  try {
    ElMessage.info("正在載入測試數據...");

    // 重置上傳檔案 UI 狀態
    uploadedFile.value = "";
    if (fileInput.value) {
      fileInput.value.value = "";
    }

    // 讀取既有測試資料
    const response = await fetch("/data/testData_10.json");
    if (!response.ok) throw new Error("無法載入測試數據");
    const testData = await response.json();

    // 使用原始資歷的 categories 和 series
    const categories: string[] = testData.categories || [];
    const series: Record<string, number[]> = testData.series || {};
    const seriesNames: string[] =
      testData.seriesNames || Object.keys(testData.series) || {};

    seriesNames.forEach((name: string) => {
      const orig: number[] = series[name] || [];
      if (orig.length !== categories.length) {
        if (orig.length < categories.length) {
          const lastVal = orig.length > 0 ? orig[orig.length - 1] : 0;
          while (orig.length < categories.length) {
            orig.push(lastVal as number);
          }
        } else {
          series[name] = orig.slice(0, categories.length);
        }
      }
    });

    // 發送資料給父組件
    emit("dataImported", {
      categories,
      series,
      seriesNames,
    });

    const startDate = categories.length > 0 ? categories[0] : "";
    const endDate =
      categories.length > 0 ? categories[categories.length - 1] : "";

    ElMessage.success(
      `已載入測試數據，日期範圍 ${startDate} ~ ${endDate} (${categories.length} 筆）`
    );
  } catch (error) {
    console.error("載入測試數據失敗:", error);
    ElMessage.error("載入測試數據失敗，請檢查檔案是否存在");
  }
};

// 下載範例 Excel 檔案
const downloadExampleExcel = () => {
  // 建立工作簿
  const workbook = XLSX.utils.book_new();

  // 建立範例資料頁面（使用日期格式）
  const exampleCategories = [
    "2022/01/01",
    "2022/01/02",
    "2022/01/03",
    "2022/01/04",
    "2022/01/05",
    "2022/01/06",
    "2022/01/07",
    "2022/01/08",
    "2022/01/09",
    "2022/01/10",
  ];
  const exampleSeries = {
    產品A: [120, 200, 150, 220, 180, 200, 190, 230, 210, 240],
    產品B: [80, 150, 120, 180, 140, 200, 160, 190, 170, 210],
    產品C: [90, 160, 130, 190, 150, 210, 170, 200, 180, 220],
  };

  const seriesNames = Object.keys(exampleSeries);
  const exampleData: any[][] = [];

  exampleData.push(["系列", ...seriesNames]);

  exampleCategories.forEach((category, index) => {
    const row: any[] = [category];
    seriesNames.forEach((seriesName) => {
      row.push(
        exampleSeries[seriesName as keyof typeof exampleSeries][index] || 0
      );
    });
    exampleData.push(row);
  });

  // 建立工作表
  const worksheet = XLSX.utils.aoa_to_sheet(exampleData);

  XLSX.utils.book_append_sheet(workbook, worksheet, "範例資料");

  // 下載檔案
  XLSX.writeFile(workbook, "範例數據.xlsx");

  ElMessage.success("範例檔案已下載");
};

// 暴露清除方法給父組件使用
defineExpose({
  clearUploadedFile,
});
</script>

<template>
  <div class="excel-uploader">
    <div class="upload-title">
      <div class="section-title">檔案匯入</div>
      <div class="upload-hint">支援 .xlsx .xls .csv 格式</div>
    </div>
    <div class="file-upload-section">
      <div class="example-test-section">
        <button
          class="download-example-btn"
          @click="downloadExampleExcel"
          title="下載範例檔案"
        >
          範例
        </button>

        <button
          class="load-test-data-btn"
          @click="loadTestData"
          title="載入一萬筆測試數據"
        >
          測試
        </button>
      </div>
      <!-- 隱藏的檔案輸入 -->
      <input
        type="file"
        ref="fileInput"
        accept=".xlsx, .xls, .csv"
        @change="handleFileUpload"
        style="display: none"
      />

      <!-- 上傳按鈕或檔案資訊 -->
      <div class="upload-container">
        <button
          v-if="!uploadedFile"
          class="upload-btn"
          @click="triggerFileUpload"
        >
          上傳檔案
        </button>

        <div v-else class="file-info">
          <div class="file-name">{{ uploadedFile }}</div>
          <button
            class="clear-file-btn"
            @click="clearUploadedFile"
            title="清除檔案"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.excel-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .upload-title {
    .section-title {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .upload-hint {
      font-size: 14px;
      color: #ddd;
      margin-top: 4px;
    }
  }

  .file-upload-section {
    display: flex;
    width: 100%;
    flex-direction: column;

    .example-test-section {
      display: flex;
      flex-direction: row;
      gap: 12px;
      margin-bottom: 12px;
      .download-example-btn,
      .load-test-data-btn {
        flex: 1;
        padding: 10px 20px;
        background: #8b8686;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        font-size: 14px;

        &:hover {
          transform: translateY(-2px);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    .load-test-data-btn {
      background: #8b8686;

      &:hover {
        background: #7a7575;
        box-shadow: 0 6px 20px rgba(139, 134, 134, 0.4);
      }
    }

    .upload-container {
      width: 100%;
    }

    .upload-btn {
      width: 100%;
      padding: 10px 20px;
      background: #8b8686;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      font-size: 14px;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(84, 112, 198, 0.1);
      border: 1px solid rgba(84, 112, 198, 0.3);
      border-radius: 4px;

      .file-name {
        flex: 1;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #667eea;
        font-weight: 500;
      }

      .clear-file-btn {
        padding: 4px 8px;
        background: rgba(255, 0, 0, 0.1);
        border: 1px solid rgba(255, 0, 0, 0.3);
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
        color: #e74c3c;
        position: relative;
        z-index: 10; // 確保按鈕在最上層

        &:hover {
          background: rgba(255, 0, 0, 0.2);
          border-color: rgba(255, 0, 0, 0.5);
          transform: scale(1.05); // 添加視覺反饋
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
}

// 深色模式支援
:deep(.dark-mode) .excel-uploader {
  .upload-hint {
    color: rgba(255, 255, 255, 0.5);
  }

  .file-info {
    background: rgba(84, 112, 198, 0.2);
    border-color: rgba(84, 112, 198, 0.4);

    .file-name {
      color: #a0aef7;
    }
  }
}
</style>
