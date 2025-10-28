<script lang="ts" setup>
import { ElMessage } from "element-plus";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as echarts from "echarts";

interface Props {
  chartInstance?: any;
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
}

const props = defineProps<Props>();

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

// 將中文系列名稱轉換為英文
const convertSeriesNameToEnglish = (chineseName: string): string => {
  const nameMap: Record<string, string> = {
    A商品: "Product A",
    B商品: "Product B",
    C商品: "Product C",
    D商品: "Product D",
    E商品: "Product E",
    F商品: "Product F",
    G商品: "Product G",
    H商品: "Product H",
  };

  return nameMap[chineseName] || chineseName;
};

// 導出圖表
const exportChart = (format: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
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
    }
  } catch (error) {
    console.error("導出失敗:", error);
    ElMessage.error("導出失敗，請重試");
  }
};

// 導出為圖片 (PNG/JPG)
const exportAsImage = (type: "png" | "jpeg", filename: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
    return;
  }

  try {
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
        pixelRatio: 3, // 提高清晰度
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

      ElMessage.success(`已導出為 ${type.toUpperCase()} 格式`);
    }, 1000);
  } catch (error) {
    console.log("導出圖片失敗:", error);
    ElMessage.error("導出圖片失敗，請重試");
  }
};

// 導出為 SVG
const exportAsSVG = (filename: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
    return;
  }

  try {
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
        pixelRatio: 3, // 提高清晰度
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

      ElMessage.success("已導出為 SVG 格式");
    }, 1000);
  } catch (error) {
    console.error("SVG 導出失敗:", error);
    ElMessage.error("SVG 導出失敗，請重試");
  }
};

// 導出為 PDF
const exportAsPDF = (filename: string) => {
  if (!props.chartInstance) {
    ElMessage.error("圖表未初始化");
    return;
  }

  try {
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

    // 創建臨時容器來生成乾淨的圖表（增加尺寸避免元素遮擋）
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

    // 等待渲染完成後生成圖片
    setTimeout(() => {
      const url = tempChart.getDataURL({
        type: "png",
        pixelRatio: 3, // 提高清晰度
        backgroundColor:
          props.colorTheme?.[
            props.currentTheme as keyof typeof props.colorTheme
          ]?.backgroundColor,
      });

      // 創建一個臨時圖片來獲取尺寸
      const img = new Image();
      img.onload = () => {
        // 計算 PDF 頁面尺寸 (A4: 210mm x 297mm)
        const pdfWidth = 210;
        const pdfHeight = 297;
        const imgWidth = img.width;
        const imgHeight = img.height;

        // 計算適合 A4 頁面的圖片尺寸（保持比例）
        let finalWidth = pdfWidth - 20; // 減少邊距，為更大圖表留空間
        let finalHeight = (imgHeight * finalWidth) / imgWidth;

        if (finalHeight > pdfHeight - 40) {
          // 減少頁尾空間
          finalHeight = pdfHeight - 40;
          finalWidth = (imgWidth * finalHeight) / imgHeight;
        }

        // 創建 PDF
        const pdf = new jsPDF({
          orientation: finalWidth > finalHeight ? "landscape" : "portrait",
          unit: "mm",
          format: "a4",
        });

        // 第一頁：添加圖表（傳入當前顯示的數據筆數）
        addChartToPDF(pdf, url, finalWidth, finalHeight, currentDisplayLength);

        // 如果有數據且系列數據存在，添加數據表格頁面
        if (props.chartData && props.seriesData) {
          addDataTableToPDF(pdf, startIndex, endIndex);
        }

        pdf.save(`${filename}.pdf`);
        ElMessage.success("PDF 導出完成！");

        // 清理臨時圖表
        tempChart.dispose();
        document.body.removeChild(tempContainer);
      };

      img.onerror = () => {
        ElMessage.error("圖表圖片生成失敗");
        tempChart.dispose();
        document.body.removeChild(tempContainer);
      };

      img.src = url;
    }, 1000);
  } catch (error) {
    console.error("PDF 導出失敗:", error);
    ElMessage.error("PDF 導出失敗，請重試");
  }
};

// 添加圖表到 PDF 第一頁
const addChartToPDF = (
  pdf: jsPDF,
  imageUrl: string,
  width: number,
  height: number,
  currentDisplayLength: number
) => {
  // 添加標題 - 使用英文避免字符問題
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `${props.currentType?.toUpperCase()} Multi-Series Data Analysis`,
    10,
    20
  );

  // 添加副標題 - 使用英文
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Chart Type: ${props.currentType?.toUpperCase()}`, 10, 28);

  // 添加數據統計資訊 - 使用英文
  if (props.chartData && props.seriesData) {
    const enabledSeries = props.seriesData.filter((series) => series.enabled);
    const englishSeriesNames = enabledSeries.map((s) =>
      convertSeriesNameToEnglish(s.name)
    );
    pdf.text(`Series: ${englishSeriesNames.join(", ")}`, 10, 40);
    pdf.text(`Total Records: ${currentDisplayLength}`, 10, 46); // 顯示當前顯示的數據筆數
  }

  // 居中添加圖表
  const xOffset = (pdf.internal.pageSize.getWidth() - width) / 2;
  const yOffset = 50; // 減少上邊距，為更大圖表留空間

  pdf.addImage(imageUrl, "PNG", xOffset, yOffset, width, height);

  // 添加頁尾資訊 - 使用英文
  pdf.setFontSize(10);
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

// 添加數據表格到 PDF
const addDataTableToPDF = (
  pdf: jsPDF,
  startIndex: number,
  endIndex: number
) => {
  if (!props.chartData || !props.seriesData) return;

  // 獲取已啟用的系列
  const enabledSeries = props.seriesData.filter((series) => series.enabled);

  if (enabledSeries.length === 0) {
    ElMessage.warning("沒有啟用的系列數據可導出");
    return;
  }

  // 準備表格數據 - 只使用當前顯示範圍的數據
  const tableHeaders = [
    "Series",
    ...enabledSeries.map((series) => convertSeriesNameToEnglish(series.name)),
  ];
  const allData: string[][] = [];

  // 處理當前顯示範圍的數據
  for (let i = startIndex; i < endIndex; i++) {
    const row = [props.chartData.categories[i]];
    enabledSeries.forEach((series) => {
      const value = props.chartData!.series[series.name]?.[i] || 0;
      row.push(value.toString());
    });
    allData.push(row as string[]);
  }

  // 分頁處理：每頁 20 筆數據
  const rowsPerPage = 20;
  const totalPages = Math.ceil(allData.length / rowsPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    // 數據表格從第二頁開始，所以第一頁數據表格需要添加新頁面
    if (pageIndex === 0) {
      pdf.addPage(); // 添加第二頁用於數據表格
    } else {
      pdf.addPage(); // 添加後續頁面
    }

    // 計算當前頁的數據範圍
    const pageStartIndex = pageIndex * rowsPerPage;
    const pageEndIndex = Math.min(pageStartIndex + rowsPerPage, allData.length);
    const pageData = allData.slice(pageStartIndex, pageEndIndex);

    // 添加頁面標題 - 使用英文
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");

    // 添加頁面資訊 - 使用英文
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    // 添加表格
    const currentPageNumber = pageIndex + 2; // 計算當前頁碼（圖表佔第1頁）
    autoTable(pdf, {
      head: [tableHeaders],
      body: pageData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "center",
      },
      headStyles: {
        fillColor: "#8b8686",
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: "#f8f9fa",
      },
      margin: { top: 35, left: 10, right: 10 },
      didDrawPage: () => {
        // 添加頁碼（右下角）
        pdf.setFontSize(10);
        pdf.text(
          `Page ${currentPageNumber}`,
          pdf.internal.pageSize.getWidth() - 20,
          pdf.internal.pageSize.getHeight() - 10
        );
      },
    });
  }
};
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
