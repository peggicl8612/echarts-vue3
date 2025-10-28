<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { jsPDF } from "jspdf";
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
  if (!props.chartInstance) return;

  try {
    // 創建臨時容器
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.top = "-9999px";
    tempContainer.style.left = "-9999px";
    tempContainer.style.width = "800px";
    tempContainer.style.height = "600px";
    document.body.appendChild(tempContainer);

    // 使用 echarts 初始化臨時圖表實例
    const tempChart = echarts.init(tempContainer, props.currentTheme);

    const currentOption = props.chartInstance.getOption();

    const cleanOption = {
      ...currentOption,
      toolbox: { show: false },
      dataZoom: { show: false },
    };

    tempChart.setOption(cleanOption, { notMerge: true });

    // 等待渲染完成後導出
    setTimeout(() => {
      const url = tempChart.getDataURL({
        type: type,
        pixelRatio: 2, // 提高清晰度
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
  if (!props.chartInstance) return;

  try {
    // 創建臨時容器來渲染 SVG
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.top = "-9999px";
    tempContainer.style.left = "-9999px";
    tempContainer.style.width = "800px";
    tempContainer.style.height = "600px";
    document.body.appendChild(tempContainer);

    // 使用 SVG 渲染器創建臨時圖表實例
    const tempChart = echarts.init(tempContainer, props.currentTheme, {
      renderer: "canvas",
    });

    // 獲取當前圖表的配置並應用到臨時圖表
    const currentOption = props.chartInstance.getOption();

    const cleanOption = {
      ...currentOption,
      toolbox: { show: false },
      dataZoom: { show: false },
    };

    tempChart.setOption(cleanOption, { notMerge: true });

    // 等待渲染完成後導出
    setTimeout(() => {
      const canvasUrl = tempChart.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor:
          props.colorTheme?.[
            props.currentTheme as keyof typeof props.colorTheme
          ]?.backgroundColor,
      });
      const svgContent = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <image href="${canvasUrl}" width="800" height="600" />
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
  if (!props.chartInstance) return;

  const url = props.chartInstance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor:
      props.colorTheme?.[props.currentTheme as keyof typeof props.colorTheme]
        ?.backgroundColor,
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
    let finalWidth = pdfWidth - 20; // 留 10mm 邊距
    let finalHeight = (imgHeight * finalWidth) / imgWidth;

    if (finalHeight > pdfHeight - 20) {
      finalHeight = pdfHeight - 20;
      finalWidth = (imgWidth * finalHeight) / imgHeight;
    }

    // 創建 PDF
    const pdf = new jsPDF({
      orientation: finalWidth > finalHeight ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    // 添加標題
    pdf.setFontSize(16);
    pdf.text(`${props.currentType?.toUpperCase()} Chart`, 10, 10);

    // 居中添加圖表
    const xOffset = (pdf.internal.pageSize.getWidth() - finalWidth) / 2;
    const yOffset = 20;

    pdf.addImage(url, "PNG", xOffset, yOffset, finalWidth, finalHeight);

    // 添加頁尾資訊
    pdf.setFontSize(10);
    pdf.text(
      `Generated on ${new Date().toLocaleString()}`,
      10,
      pdf.internal.pageSize.getHeight() - 10
    );

    pdf.save(`${filename}.pdf`);
    ElMessage.success("已導出為 PDF 格式");
  };

  img.src = url;
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
