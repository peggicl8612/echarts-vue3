<script lang="ts" setup>
import { ref, watchEffect } from "vue";
import { ElMessage } from "element-plus";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as echarts from "echarts";
import "@/assets/fonts/NotoSansTC.js";

interface Props {
  chartInstance?: any;
  chartInitialized?: boolean;
  currentType?: string;
  currentTheme?: string;
  colorTheme?: {
    light: {
      colors: string[];
      backgroundColor: string;
      textColor: string;
    };
    dark: {
      colors: string[];
      backgroundColor: string;
      textColor: string;
    };
  };
  chartData?: {
    categories: string[];
    series: Record<string, number[]>;
  };
  seriesData?: Array<{
    name: string;
    enabled: boolean;
    color: string;
  }>;
  currentReportType?: string;
}

const props = defineProps<Props>();

// 匯出狀態鎖定
const isExporting = ref(false);

// 定義 emit 事件
const emit = defineEmits<{
  exportFormat: [data: { format: string; filename: string }];
}>();

// 導出格式選項
const exportFormats = [
  { type: "png", label: "PNG" },
  { type: "jpg", label: "JPG" },
  { type: "svg", label: "SVG" },
  { type: "pdf", label: "PDF" },
];

// 導出圖表
const exportChart = (format: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
    return;
  }

  // 檢查是否正在匯出
  if (isExporting.value) {
    ElMessage.warning("正在匯出中，請稍後再試");
    return;
  }

  try {
    const chartTitle = `${props.currentType?.toUpperCase()}_chart_${new Date().getTime()}`;

    switch (format) {
      case "png":
        exportAsImage("png" as const, chartTitle);
        break;
      case "jpg":
        exportAsImage("jpeg" as const, chartTitle);
        break;
      case "svg":
        exportAsSVG(chartTitle);
        break;
      case "pdf":
        exportAsPDF(chartTitle);
        break;
      default:
        ElMessage.error("不支持的導出格式");
        isExporting.value = false;
    }
  } catch (error) {
    console.error("導出失敗:", error);
    ElMessage.error("導出失敗，請重試");
    isExporting.value = false;
  }
};

// 導出為圖片 (PNG/JPG)
const exportAsImage = (type: "png" | "jpeg", filename: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
    return;
  }

  if (isExporting.value) return;

  try {
    isExporting.value = true;
    // 獲取當前 dataZoom 的狀態來確定顯示範圍
    const dataZoomState = props.chartInstance
      .getModel()
      .getComponent("dataZoom", 0);
    let currentDataRange = { start: 0, end: 100 };

    if (dataZoomState) {
      const dataZoomOption = dataZoomState.option;
      currentDataRange = {
        start: dataZoomOption.start || 0,
        end: dataZoomOption.end || 100,
      };
    }

    // 計算當前顯示的數據範圍
    const totalLength = props.chartData?.categories.length || 0;
    const startIndex = Math.floor((currentDataRange.start / 100) * totalLength);
    const endIndex = Math.floor((currentDataRange.end / 100) * totalLength);

    // 創建臨時容器來生成乾淨的圖表
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.top = "-9999px";
    tempContainer.style.left = "-9999px";
    tempContainer.style.width = "1200px"; // 增加寬度
    tempContainer.style.height = "900px"; // 增加高度
    document.body.appendChild(tempContainer);

    // 使用 echarts 初始化臨時圖表實例
    const tempChart = echarts.init(tempContainer, props.currentTheme);

    // 獲取當前圖表配置
    const currentOption = props.chartInstance.getOption();

    // 創建乾淨的配置，移除工具列和滑軌，並根據當前顯示範圍調整數據
    const cleanOption = {
      ...currentOption,
      toolbox: { show: false }, // 隱藏工具列
      dataZoom: undefined, // 完全移除 dataZoom
      grid: {
        ...currentOption.grid,
        bottom: 80, // 增加底部邊距，為標記點留更多空間
        top: 130, // 增加頂部邊距
        left: 80, // 增加左邊距
        right: 80, // 增加右邊距
      },
      // 根據當前顯示範圍調整 xAxis 數據
      xAxis: {
        ...currentOption.xAxis,
        data: props.chartData?.categories.slice(startIndex, endIndex) || [],
      },
      // 根據當前顯示範圍調整 series 數據
      series:
        currentOption.series?.map((series: any) => ({
          ...series,
          data: series.data?.slice(startIndex, endIndex) || [],
        })) || [],
    };

    tempChart.setOption(cleanOption, { notMerge: true });

    // 等待渲染完成後導出
    setTimeout(() => {
      const url = tempChart.getDataURL({
        type: type,
        pixelRatio: 1.5,
        backgroundColor:
          props.colorTheme?.[
            props.currentTheme as keyof typeof props.colorTheme
          ]?.backgroundColor,
      });

      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${type === "jpeg" ? "jpg" : type}`;
      link.click();

      // 清理
      tempChart.dispose();
      document.body.removeChild(tempContainer);
      isExporting.value = false;
      ElMessage.success(`已導出為 ${type.toUpperCase()} 格式`);
    }, 1000);
  } catch (error) {
    console.log("導出圖片失敗:", error);
    ElMessage.error("導出圖片失敗，請重試");
    isExporting.value = false;
  }
};

// 導出為 SVG
const exportAsSVG = (filename: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
    return;
  }

  if (isExporting.value) return;

  try {
    isExporting.value = true;
    // 獲取當前 dataZoom 的狀態來確定顯示範圍
    const dataZoomState = props.chartInstance
      .getModel()
      .getComponent("dataZoom", 0);
    let currentDataRange = { start: 0, end: 100 };

    if (dataZoomState) {
      const dataZoomOption = dataZoomState.option;
      currentDataRange = {
        start: dataZoomOption.start || 0,
        end: dataZoomOption.end || 100,
      };
    }

    // 計算當前顯示的數據範圍
    const totalLength = props.chartData?.categories.length || 0;
    const startIndex = Math.floor((currentDataRange.start / 100) * totalLength);
    const endIndex = Math.floor((currentDataRange.end / 100) * totalLength);

    // 創建臨時容器來生成乾淨的圖表
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.top = "-9999px";
    tempContainer.style.left = "-9999px";
    tempContainer.style.width = "1200px"; // 增加寬度
    tempContainer.style.height = "900px"; // 增加高度
    document.body.appendChild(tempContainer);

    // 使用 echarts 初始化臨時圖表實例
    const tempChart = echarts.init(tempContainer, props.currentTheme, {
      renderer: "canvas",
    });

    // 獲取當前圖表配置
    const currentOption = props.chartInstance.getOption();

    // 創建乾淨的配置，移除工具列和滑軌，並根據當前顯示範圍調整數據
    const cleanOption = {
      ...currentOption,
      toolbox: { show: false }, // 隱藏工具列
      dataZoom: undefined, // 完全移除 dataZoom
      grid: {
        ...currentOption.grid,
        bottom: 80, // 增加底部邊距，為標記點留更多空間
        top: 130, // 增加頂部邊距
        left: 80, // 增加左邊距
        right: 80, // 增加右邊距
      },
      // 根據當前顯示範圍調整 xAxis 數據
      xAxis: {
        ...currentOption.xAxis,
        data: props.chartData?.categories.slice(startIndex, endIndex) || [],
      },
      // 根據當前顯示範圍調整 series 數據
      series:
        currentOption.series?.map((series: any) => ({
          ...series,
          data: series.data?.slice(startIndex, endIndex) || [],
        })) || [],
    };

    tempChart.setOption(cleanOption, { notMerge: true });

    // 等待渲染完成後導出
    setTimeout(() => {
      const canvasUrl = tempChart.getDataURL({
        type: "png",
        pixelRatio: 1.5, // 提高清晰度
        backgroundColor:
          props.colorTheme?.[
            props.currentTheme as keyof typeof props.colorTheme
          ]?.backgroundColor,
      });

      const svgContent = `
      <svg width="100%" height="100%" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
        <image href="${canvasUrl}" width="1200" height="900" />
      </svg>
      `;
      const blob = new Blob([svgContent], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.svg`;
      link.click();

      // 清理
      URL.revokeObjectURL(url);
      tempChart.dispose();
      document.body.removeChild(tempContainer);
      isExporting.value = false;
      ElMessage.success("已導出為 SVG 格式");
    }, 1000);
  } catch (error) {
    console.error("SVG 導出失敗:", error);
    ElMessage.error("SVG 導出失敗，請重試");
    isExporting.value = false;
  }
};

// 優化後的 exportAsPDF 函數 - 批次匯出 + 圖片壓縮 + 延遲釋放
const exportAsPDF = async (filename: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
    return;
  }

  try {
    isExporting.value = true;
    ElMessage.info("正在生成 PDF，請稍候...");

    // 獲取當前 dataZoom 的狀態來確定顯示範圍
    const dataZoomState = props.chartInstance
      .getModel()
      .getComponent("dataZoom", 0);
    let currentDataRange = { start: 0, end: 100 };

    if (dataZoomState) {
      const dataZoomOption = dataZoomState.option;
      currentDataRange = {
        start: dataZoomOption.start || 0,
        end: dataZoomOption.end || 100,
      };
    }

    // 計算當前顯示的數據範圍
    const totalLength = props.chartData?.categories.length || 0;
    const startIndex = Math.floor((currentDataRange.start / 100) * totalLength);
    const endIndex = Math.floor((currentDataRange.end / 100) * totalLength);
    const currentDisplayLength = endIndex - startIndex;

    // 計算總頁數（每頁 32 筆數據）
    const totalData = Math.min(10000, totalLength);
    const rowsPerPage = 32;
    const totalTablePages = Math.ceil(totalData / rowsPerPage);
    const BATCH_SIZE = 50; // 每批處理 50 頁

    // 使用 pdf-lib 進行批次匯出和合併
    const { PDFDocument } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();

    // 生成圖表頁面（第一頁）
    console.time("PDF 圖表頁面生成");
    const chartPage = await generateChartPage(currentDisplayLength);
    console.timeEnd("PDF 圖表頁面生成");
    const chartPdfBytes = chartPage.output("arraybuffer");
    const chartPdfDoc = await PDFDocument.load(chartPdfBytes as ArrayBuffer);
    const chartPages = await mergedPdf.copyPages(
      chartPdfDoc,
      chartPdfDoc.getPageIndices()
    );
    chartPages.forEach((page) => mergedPdf.addPage(page));

    // 批次處理數據表格頁面
    if (props.chartData && props.seriesData && totalTablePages > 0) {
      for (
        let batchStart = 0;
        batchStart < totalTablePages;
        batchStart += BATCH_SIZE
      ) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalTablePages);

        // 生成當前批次的 PDF
        const batchPdf = await generateBatchTablePages(
          batchStart,
          batchEnd,
          rowsPerPage
        );
        const pdfBytes = batchPdf.output("arraybuffer");

        // 載入到 pdf-lib 準備合併
        const pdfDoc = await PDFDocument.load(pdfBytes as ArrayBuffer);
        const copiedPages = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));

        // 清理並延遲，讓瀏覽器 GC 回收記憶體
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 50)); // 額外延遲 50ms
      }
    }

    // 儲存合併後的 PDF
    const finalPdfBytes = await mergedPdf.save();
    const blob = new Blob([new Uint8Array(finalPdfBytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    isExporting.value = false;
    ElMessage.success("PDF 匯出完成！");
    console.log(
      "PDF 檔案大小：",
      (finalPdfBytes.length / 1024).toFixed(2),
      "KB"
    );
  } catch (error) {
    console.error("PDF 匯出失敗:", error);
    ElMessage.error("PDF 匯出失敗，請重試");
  }
};

// 添加圖表到 PDF 第一頁
const addChartToPDF = (
  pdf: jsPDF,
  imageUrl: string,
  width: number,
  height: number,
  currentDisplayLength: number,
  imageFormat: "PNG" | "JPEG" = "JPEG"
) => {
  // 添加標題 - 使用英文，使用默認字體
  pdf.setFontSize(20);
  pdf.setFont("NotoSansTC");
  pdf.setFont("bold");
  pdf.text(
    `${props.currentType?.toUpperCase()} Multi-Series Data Analysis`,
    10,
    20
  );

  // 添加副標題 - 使用英文，使用默認字體
  pdf.setFontSize(12);
  pdf.setFont("NotoSansTC");
  pdf.setFont("bold");
  pdf.text(`Chart Type: ${props.currentType?.toUpperCase()}`, 10, 28);

  // 添加報表類型資訊 - 使用英文避免亂碼
  const reportTypeEnglish =
    props.currentReportType === "daily"
      ? "Daily"
      : props.currentReportType === "monthly"
      ? "Monthly"
      : props.currentReportType === "yearly"
      ? "Yearly"
      : "Daily";

  pdf.setFontSize(10);
  pdf.setFont("NotoSansTC");
  pdf.setFont("bold");
  pdf.text(`Report Type: ${reportTypeEnglish}`, 10, 36);

  // 添加數據統計資訊 - 使用英文，使用默認字體
  if (props.chartData && props.seriesData) {
    const enabledSeries = props.seriesData.filter((series) => series.enabled);

    pdf.setFont("NotoSansTC");
    pdf.text(
      `Series: ${enabledSeries.map((series) => series.name).join(", ")}`,
      9,
      44
    );
    pdf.text(`Total Records: ${currentDisplayLength}`, 9, 50); // 顯示當前顯示的數據筆數
  }

  // 計算圖表位置，確保不會超出頁面
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const yOffset = 56; // 圖表開始位置
  const footerSpace = 10; // 頁尾空間

  // 確保圖表高度不超過可用空間
  const maxAvailableHeight = pageHeight - yOffset - footerSpace;
  const actualHeight = Math.min(height, maxAvailableHeight);
  const actualWidth =
    actualHeight === height ? width : (width * actualHeight) / height;

  // 居中添加圖表
  const xOffset = (pageWidth - actualWidth) / 2;

  pdf.addImage(
    imageUrl,
    imageFormat,
    xOffset,
    yOffset,
    actualWidth,
    actualHeight
  );

  // 添加頁尾資訊 - 使用英文，使用默認字體
  pdf.setFontSize(10);
  pdf.setFont("NotoSansTC");
  pdf.setFont("bold");
  const now = new Date();
  const timeString = now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // 使用24小時制
  });
  pdf.text(
    `Generated: ${timeString}`,
    10,
    pdf.internal.pageSize.getHeight() - 10
  );

  // 添加頁碼
  pdf.text(
    `Page 1`,
    pdf.internal.pageSize.getWidth() - 20,
    pdf.internal.pageSize.getHeight() - 10
  );
};

// 生成圖表頁面（第一頁）
const generateChartPage = async (currentDisplayLength: number) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 生成壓縮後的圖表圖片
  console.time("圖片生成");
  const chartImage = await generateChartImage();
  console.timeEnd("圖片生成");

  // 計算適合 A4 頁面的圖片尺寸（保持比例）
  const pdfWidth = 210; // A4 寬度
  const pdfHeight = 297; // A4 高度

  // 計算實際可用空間
  // yOffset: 56mm（圖表開始位置，考慮標題等資訊）
  // 頁尾空間: 10mm（頁尾在底部 10mm）
  const yOffset = 56;
  const footerSpace = 10;
  const availableHeight = pdfHeight - yOffset - footerSpace; // 231mm

  const imgWidth = chartImage.width;
  const imgHeight = chartImage.height;

  // 計算圖表寬度（留邊距）
  const horizontalMargin = 20;
  let finalWidth = pdfWidth - horizontalMargin;
  let finalHeight = (imgHeight * finalWidth) / imgWidth;

  // 確保圖表高度不超過實際可用高度
  if (finalHeight > availableHeight) {
    finalHeight = availableHeight;
    finalWidth = (imgWidth * finalHeight) / imgHeight;
  }

  // 添加到 PDF（使用 JPEG 格式）
  addChartToPDF(
    pdf,
    chartImage.url,
    finalWidth,
    finalHeight,
    currentDisplayLength,
    "JPEG"
  );

  return pdf;
};

// 生成壓縮後的圖表圖片
const generateChartImage = async () => {
  const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
  // 獲取當前 dataZoom 的狀態來確定顯示範圍
  const dataZoomState = props.chartInstance
    ?.getModel()
    .getComponent("dataZoom", 0);
  let currentDataRange = { start: 0, end: 100 };

  if (dataZoomState) {
    const dataZoomOption = dataZoomState.option;
    currentDataRange = {
      start: dataZoomOption.start || 0,
      end: dataZoomOption.end || 100,
    };
  }

  // 計算當前顯示的數據範圍
  const totalLength = props.chartData?.categories.length || 0;
  const startIndex = Math.floor((currentDataRange.start / 100) * totalLength);
  const endIndex = Math.floor((currentDataRange.end / 100) * totalLength);

  // 創建臨時容器來生成乾淨的圖表
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.top = "-9999px";
  tempContainer.style.left = "-9999px";
  tempContainer.style.width = "1200px";
  tempContainer.style.height = "900px";
  document.body.appendChild(tempContainer);

  // 使用 echarts 初始化臨時圖表實例
  const tempChart = echarts.init(tempContainer, props.currentTheme);

  // 獲取當前圖表配置
  const currentOption = props.chartInstance?.getOption();

  // 創建乾淨的配置，移除工具列和滑軌，並根據當前顯示範圍調整數據
  const cleanOption = {
    ...currentOption,
    toolbox: { show: false },
    dataZoom: undefined,
    grid: {
      ...currentOption?.grid,
      bottom: 80,
      top: 130,
      left: 80,
      right: 80,
    },
    xAxis: {
      ...currentOption?.xAxis,
      data: props.chartData?.categories.slice(startIndex, endIndex) || [],
    },
    series:
      currentOption?.series?.map((series: any) => ({
        ...series,
        data: series.data?.slice(startIndex, endIndex) || [],
      })) || [],
  };

  tempChart.setOption(cleanOption, { notMerge: true });

  // 等待渲染完成
  await new Promise((r) => setTimeout(r, 500));

  //  使用 JPEG + 降低 pixelRatio（優化記憶體和檔案大小）
  //  getDataURL 不支援 quality 參數，JPEG 品質由瀏覽器控制
  const backgroundColor =
    props.colorTheme?.[props.currentTheme as keyof typeof props.colorTheme]
      ?.backgroundColor || "#ffffff";

  const url = tempChart.getDataURL({
    type: "jpeg",
    pixelRatio: 1.5, // 從 3 降到 1.5，減少檔案大小和記憶體使用
    backgroundColor,
  });

  const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
  console.log("記憶體用量：", (memoryAfter - memoryBefore) / 1024, "KB");

  // 立即清理，讓瀏覽器 GC 回收記憶體
  tempChart.dispose();
  document.body.removeChild(tempContainer);
  await new Promise((r) => requestAnimationFrame(r)); // 讓 GC 回收

  // 獲取圖片尺寸
  return new Promise<{ url: string; width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ url, width: img.width, height: img.height });
      img.onerror = reject;
      img.src = url;
    }
  );
};

// 批次生成數據表格頁面
const generateBatchTablePages = async (
  startPage: number,
  endPage: number,
  rowsPerPage: number
) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (!props.chartData || !props.seriesData) return pdf;

  // 獲取已啟用的系列
  const enabledSeries = props.seriesData.filter((series) => series.enabled);

  if (enabledSeries.length === 0) return pdf;

  // 準備表格數據
  const tableHeaders = ["系列", ...enabledSeries.map((series) => series.name)];
  const totalData = Math.min(10000, props.chartData.categories.length);
  const allData: string[][] = [];

  // 計算當前批次需要處理的數據範圍
  const batchStartIndex = startPage * rowsPerPage;
  const batchEndIndex = Math.min(endPage * rowsPerPage, totalData);

  // 處理當前批次的數據
  for (let i = batchStartIndex; i < batchEndIndex; i++) {
    const row = [props.chartData.categories[i]];
    enabledSeries.forEach((series) => {
      const rawValue = props.chartData!.series[series.name]?.[i] || 0;
      let value: number;
      if (typeof rawValue === "object" && rawValue !== null) {
        const objValue = rawValue as any;
        value = objValue.value || objValue.sales || 0;
      } else if (typeof rawValue === "number") {
        value = rawValue;
      } else {
        value = Number(rawValue) || 0;
      }
      row.push(value.toString());
    });
    allData.push(row as string[]);
  }

  // 生成當前批次的頁面
  const batchTotalPages = Math.ceil(allData.length / rowsPerPage);

  for (let pageIndex = 0; pageIndex < batchTotalPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    // 計算當前頁的數據範圍
    const pageStartIndex = pageIndex * rowsPerPage;
    const pageEndIndex = Math.min(pageStartIndex + rowsPerPage, allData.length);
    const pageData = allData.slice(pageStartIndex, pageEndIndex);

    // 添加頁面標題
    pdf.setFontSize(16);
    pdf.setFont("NotoSansTC", "normal");
    pdf.text("數據表格", 20, 30);

    // 計算實際頁碼（圖表佔第1頁，所以數據表格從第2頁開始）
    // startPage 是批次頁面索引（0, 1, 2...），pageIndex 是批次內頁面索引（0, 1, 2...）
    // 實際頁碼 = 圖表頁(1) + 批次開始頁面數 + 批次內頁面索引
    const actualPageNumber = 2 + startPage + pageIndex;

    // 添加表格
    autoTable(pdf, {
      head: [tableHeaders],
      body: pageData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "center",
        font: "helvetica",
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: "#8b8686",
        fontStyle: "bold",
        textColor: [255, 255, 255],
        fontSize: 12,
        font: "NotoSansTC",
      },
      alternateRowStyles: {
        fillColor: "#f8f9fa",
      },
      margin: { top: 35, left: 10, right: 10 },
      didDrawPage: () => {
        // 添加頁碼（右下角）
        pdf.setFontSize(10);
        pdf.text(
          `Page ${actualPageNumber}`,
          pdf.internal.pageSize.getWidth() - 20,
          pdf.internal.pageSize.getHeight() - 10
        );
      },
    });
  }

  return pdf;
};
// 監聽圖表初始化狀態
watchEffect(() => {
  if (props.chartInitialized && props.chartInstance) {
  }
});
</script>

<template>
  <div class="export-container">
    <div class="export-section-wrapper">
      <div class="section-title">導出格式</div>
      <div class="export-section">
        <button
          v-for="format in exportFormats"
          :key="format.type"
          @click="exportChart(format.type)"
          class="export-btn"
          :title="`導出為${format.label}`"
        >
          {{ format.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.export-container {
  .export-section-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;

    .section-title {
      font-size: 14px;
      font-weight: 600;
    }
    .export-section {
      display: flex;
      flex-direction: row;
      gap: 10px;
    }

    .export-btn {
      background: #8b8686;
      margin-top: 10px;
      width: 80px;
      color: white;
      font-size: 14px;
      padding: 4px 8px;
      transition: all 0.3s ease;
      border-radius: 4px;

      &:hover {
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}
</style>
