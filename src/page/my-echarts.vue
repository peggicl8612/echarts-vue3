<script setup lang="ts">
import * as echarts from "echarts";
import { ElMessage } from "element-plus";
import {
  ref,
  watch,
  reactive,
  onMounted,
  onBeforeUnmount,
  computed,
} from "vue";
import ExcelUploader from "../components/ExcelUploader.vue";
import ExportFormat from "@/components/ExportFormat.vue";
import ToggleReportType from "@/components/ToggleReportType.vue";

const chartRef = ref(null);
const chartInstance = ref<any>(null);

// 圖表類型
const chartTypes = ["line", "bar"];
const currentType = ref(chartTypes["0"]);

// 主題列表
const themes = [
  { name: "light", label: "淺色主題", color: "#ebeae5" },
  { name: "dark", label: "深色主題", color: "#2d3748" },
];

const currentTheme = ref("light");

// 報表類型
const currentReportType = ref("daily");
const aggregatedChartData = ref(null);

// 處理報表類型變更
const handleReportTypeChanged = (data: {
  reportType: string;
  aggregatedData: any;
}) => {
  console.log("報表類型變更:", data);
  currentReportType.value = data.reportType;
  aggregatedChartData.value = data.aggregatedData;
  console.log("更新後的聚合數據:", aggregatedChartData.value);
};

// 多系列數據配置
interface SeriesData {
  name: string;
  enabled: boolean;
  color: string;
}

// 生成三年時間序列日期（2022-01-01 到 2024-12-31）
const generateThreeYearDateCategories = () => {
  const categories: string[] = [];
  const startDate = new Date("2022-01-01");
  const endDate = new Date("2024-12-31");

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    categories.push(`${year}-${month}-${day}`);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return categories;
};

// 生成模擬銷售數據（帶有年度趨勢、季節性和波動）
const generateSalesData = (
  baseSales: number,
  dailyIndex: number,
  variance: number = 20
) => {
  // 年度趨勢（三年內緩慢增長）
  const yearProgress = dailyIndex / (365 * 3); // 0 到 1
  const yearlyTrend = yearProgress * 30; // 三年增長約30單位

  // 季節性波動（使用正弦波模擬）
  const seasonalFactor = Math.sin((dailyIndex / 365) * 2 * Math.PI) * 15;

  // 週期性波動（每週末略低）
  const dayOfWeek = dailyIndex % 7;
  const weeklyFactor = dayOfWeek >= 5 ? -5 : 0; // 週末略降

  // 隨機波動
  const randomVariance = (Math.random() - 0.5) * variance;

  const value = Math.max(
    0,
    Math.round(
      baseSales + yearlyTrend + seasonalFactor + weeklyFactor + randomVariance
    )
  );
  return value;
};

// 生成模擬銷售額數據（基於價格和銷量）
const generateRevenueData = (price: number, salesData: number[]) => {
  return salesData.map((sales) => Math.round(sales * price));
};

// Mars eSIM 產品預設資料（用於初始化和重置）
// 每個銷售方案作為系列，時間軸作為分類
// 只保留日本相關方案
const productPrices: Record<string, number> = {
  日本5G吃到飽: 299,
  日本4G計日型: 149,
};

// 基礎銷量設定（每個產品的平均日銷量）- 只保留日本方案
const baseSales: Record<string, number> = {
  日本5G吃到飽: 85,
  日本4G計日型: 62,
};

const dateCategories = generateThreeYearDateCategories();
const totalDays = dateCategories.length; // 1095 天（三年）

// 生成每個產品的銷量和銷售額數據
const generateSeriesData = () => {
  const series: Record<string, any[]> = {};
  Object.keys(productPrices).forEach((productName) => {
    const baseSale = baseSales[productName];
    const price = productPrices[productName];
    if (baseSale === undefined || price === undefined) return;

    // 為每一天生成銷售數據
    const fullSalesData: number[] = [];
    for (let i = 0; i < totalDays; i++) {
      const sales = generateSalesData(baseSale, i, 20);
      fullSalesData.push(sales);
    }

    const revenueData = generateRevenueData(price, fullSalesData);

    // 合併銷量和銷售額為單一系列，每個數據點包含兩個值
    series[productName] = fullSalesData.map((sales, index) => ({
      value: sales, // 主要顯示值（銷量）
      sales: sales, // 銷量
      revenue: revenueData[index], // 銷售額
      price: price, // 價格
    }));
  });
  return series;
};

const defaultChartData = {
  categories: dateCategories,
  series: generateSeriesData(),
};

// 初始化系列數據 - 每個產品為單一系列（包含銷量和銷售額）
const initialSeriesData: SeriesData[] = [];
Object.keys(productPrices).forEach((productName, index) => {
  const colors = ["#5470c6", "#91cc75"]; // 只使用兩個顏色對應兩個日本方案
  const colorIdx = index % colors.length;
  const color = colors[colorIdx] || "#5470c6";
  // 每個產品為單一系列
  initialSeriesData.push({
    name: productName,
    enabled: true,
    color: color,
  });
});

const seriesData = reactive<SeriesData[]>(initialSeriesData);

// 標記是否為測試數據
const isTestDataMode = ref(false);

// 匯入的檔案名稱
const importedFileName = ref("");

// 圖表數據 - 使用預設資料的深拷貝
const chartData = reactive({
  categories: [...defaultChartData.categories],
  series: JSON.parse(JSON.stringify(defaultChartData.series)),
});

// 計算當前使用的圖表數據
const currentChartData = computed(() => {
  return aggregatedChartData.value || chartData;
});

// 監聽圖表數據變化，重新渲染圖表
watch(
  currentChartData,
  () => {
    if (chartInstance.value) {
      renderChart();
    }
  },
  { deep: true }
);

// Excel 上傳組件的 ref
const excelUploaderRef = ref<InstanceType<typeof ExcelUploader> | null>(null);

// 處理從 ExcelUploader 組件傳來的資料
const handleDataImported = (data: {
  categories: string[];
  series: Record<string, number[]>;
  seriesNames: string[];
  fileName?: string;
}) => {
  // 判斷是否為測試數據（檢查系列名稱或數據量）
  const testDataSeriesNames = ["電子產品", "服飾", "食品", "運動"];
  const hasTestSeries = data.seriesNames.some((name) =>
    testDataSeriesNames.includes(name)
  );
  const hasLargeDataset = data.categories.length > 10000;
  isTestDataMode.value = hasTestSeries || hasLargeDataset;

  // 記錄匯入的檔案名稱
  if (data.fileName) {
    importedFileName.value = data.fileName.replace(/\.[^/.]+$/, ""); // 移除副檔名
  } else {
    importedFileName.value = "";
  }

  // 更新圖表資料
  chartData.categories = [...data.categories];

  // 清空舊的系列資料
  Object.keys(chartData.series).forEach((key) => {
    delete chartData.series[key as keyof typeof chartData.series];
  });

  // 添加新的系列資料
  Object.entries(data.series).forEach(([key, values]) => {
    (chartData.series as any)[key] = [...values];
  });

  // 更新系列配置（ex：顏色）
  const colors = [
    "#5470c6",
    "#91cc75",
    "#fac858",
    "#ee6666",
    "#73c0de",
    "#3ba272",
    "#fc8452",
    "#9a60b4",
  ];
  seriesData.length = 0;

  data.seriesNames.forEach((seriesName, index) => {
    seriesData.push({
      name: seriesName,
      enabled: true,
      color: colors[index % colors.length] || "#5470c6",
    });
  });

  // 更新顏色主題配置
  const newColors = seriesData.map((series) => series.color);
  colorTheme.light.colors = newColors;
  colorTheme.dark.colors = newColors;

  // 清空聚合後的數據
  aggregatedChartData.value = null;
  // 重置報表類型為日報表
  currentReportType.value = "daily";
  // 重新渲染圖表
  renderChart();
};

// 顏色主題配置 - 針對 Mars eSIM 電商產品優化
const colorTheme = {
  light: {
    colors: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272"],
    backgroundColor: "#ffffff",
    textColor: "#000000",
  },
  dark: {
    colors: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272"],
    backgroundColor: "#2d3748",
    textColor: "#ffffff",
  },
};

// 初始化
const initChart = () => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
  }
  chartInstance.value = echarts.init(chartRef.value, currentTheme.value);

  renderChart();
};

// 根據 currentType 渲染圖表
const renderChart = () => {
  const themeConfig = colorTheme[currentTheme.value as keyof typeof colorTheme];

  // 獲取啟用的系列
  const enabledSeries = seriesData.filter((series) => series.enabled);

  const option: echarts.EChartsOption = {
    title: {
      text: importedFileName.value
        ? `${importedFileName.value} - ${currentType.value?.toUpperCase()} 圖表`
        : isTestDataMode.value
        ? `各產品近三年銷售率 - ${currentType.value?.toUpperCase()} 圖表`
        : `Mars eSIM 產品分析 - ${currentType.value?.toUpperCase()} 圖表`,
      left: "center",
      textStyle: {
        color: themeConfig.textColor,
        fontSize: 18,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: currentType.value === "bar" ? "item" : "axis",
      className: "custom-tooltip",
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          const date = params[0].axisValue;
          // 格式化日期顯示（包含年份）
          const dateObj = new Date(date);
          const formattedDate = `${dateObj.getFullYear()}/${String(
            dateObj.getMonth() + 1
          ).padStart(2, "0")}/${String(dateObj.getDate()).padStart(2, "0")}`;
          let tooltip = `<div class="tooltip-date">${formattedDate}</div>`;
          params.forEach((param: any) => {
            // 從原始數據中獲取完整對象（使用dataIndex）
            const seriesName = param.seriesName;
            const dataIndex = param.dataIndex;

            // 獲取當前顯示的值（優先從param.data獲取，然後param.value）
            let currentValue = param.value;
            if (param.data !== undefined) {
              if (
                typeof param.data === "object" &&
                param.data.value !== undefined
              ) {
                currentValue = param.data.value;
              } else if (typeof param.data === "number") {
                currentValue = param.data;
              }
            }

            // 嘗試從原始數據獲取完整對象
            let dataItem: any = null;
            const seriesData =
              currentChartData.value.series[
                seriesName as keyof typeof currentChartData.value.series
              ];

            if (
              seriesData &&
              Array.isArray(seriesData) &&
              dataIndex < seriesData.length
            ) {
              const rawItem = seriesData[dataIndex];
              // 如果原始數據是對象且包含sales和revenue
              if (
                rawItem &&
                typeof rawItem === "object" &&
                rawItem.sales !== undefined &&
                rawItem.revenue !== undefined
              ) {
                dataItem = rawItem;
              }
            }

            // 如果沒有獲取到完整對象，使用當前值構建
            if (!dataItem && currentValue !== undefined) {
              // 從productPrices獲取價格
              const price = productPrices[seriesName] || 0;

              if (price > 0) {
                // 構建數據對象
                dataItem = {
                  value: currentValue,
                  sales: currentValue, // 圖表顯示的是銷量
                  revenue: Math.round(currentValue * price),
                  price: price,
                };
              }
            }

            if (
              dataItem &&
              typeof dataItem === "object" &&
              dataItem.sales !== undefined &&
              dataItem.revenue !== undefined
            ) {
              // 新的合併數據格式
              tooltip += `<div class="tooltip-item">
                    <div class="tooltip-header">
                      <span class="tooltip-color" style="background: ${
                        param.color
                      }"></span>
                      <span class="tooltip-series-name">${seriesName}</span>
                    </div>
                    <div class="tooltip-content">
                      <div class="tooltip-data">銷量: <span class="tooltip-value">${
                        dataItem.sales
                      } </span></div>
                      <div class="tooltip-data">銷售額: <span class="tooltip-value">NT$ ${dataItem.revenue.toLocaleString()}</span></div>
                    </div>
                  </div>`;
            } else {
              // 舊格式（向後兼容）
              const value = param.value;
              let formattedValue = value;
              if (
                param.seriesName.includes("銷售額") ||
                param.seriesName.includes("NT$")
              ) {
                formattedValue = `NT$ ${value.toLocaleString()}`;
              } else if (param.seriesName.includes("銷量")) {
                formattedValue = `${value}  `;
              }
              tooltip += `<div class="tooltip-item">
                    <div class="tooltip-header">
                      <span class="tooltip-color" style="background: ${param.color}"></span>
                      <span class="tooltip-series-name">${param.seriesName}:</span>
                      <span class="tooltip-value">${formattedValue}</span>
                    </div>
                  </div>`;
            }
          });
          return tooltip;
        }
        return "";
      },
      axisPointer: {
        type: "cross",
        crossStyle: {
          color: "#999",
        },
      },
    },
    legend: {
      data: enabledSeries.map((series) => series.name),
      top: 50,
      type: "scroll",
      orient: "horizontal",
      textStyle: {
        color: themeConfig.textColor,
        fontSize: 11,
      },
      itemWidth: 14,
      itemHeight: 14,
      itemGap: 10,
      // 圖例互動配置
      selected: enabledSeries.reduce((acc, series) => {
        acc[series.name] = series.enabled;
        return acc;
      }, {} as Record<string, boolean>),
    },
    color: themeConfig.colors,
    backgroundColor: themeConfig.backgroundColor,
    grid: {
      top: 150,
      right: 60,
      bottom: 60,
      left: 60,
      containLabel: true,
    },
    // 工具箱
    toolbox: {
      show: true,
      feature: {
        dataView: {
          show: true,
          title: "資料檢視",
          readOnly: false,
        },
        restore: {
          show: true,
          title: "還原",
        },
        dataZoom: {
          show: true,
          title: {
            zoom: "區域縮放",
            back: "還原縮放",
          },
          xAxisIndex: 0,
        },
      },
    },
  };

  option.xAxis = {
    type: "category",
    data: currentChartData.value.categories,
    axisLine: {
      lineStyle: {
        color: themeConfig.textColor,
      },
    },
    axisLabel: {
      rotate: -45,
      interval: Math.floor(currentChartData.value.categories.length / 10), // 自動調整顯示間隔
      fontSize: 11,
      color: themeConfig.textColor,
      margin: 15,
      formatter: (value: string) => {
        // 格式化日期顯示為 YYYY/MM/DD（包含年份）
        const date = new Date(value);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}/${month}/${day}`;
      },
    },
  };
  option.yAxis = {
    type: "value",
    axisLine: {
      lineStyle: {
        color: themeConfig.textColor,
      },
    },
    axisLabel: {
      formatter: (value: number) => {
        // 根據啟用的系列判斷格式化
        if (
          enabledSeries.some(
            (s) => s.name.includes("銷售額") || s.name.includes("NT$")
          )
        ) {
          // 如果有銷售額系列，Y軸顯示金額格式
          if (enabledSeries.every((s) => s.name.includes("銷售額"))) {
            return `NT$ ${(value / 10000).toFixed(1)}萬`;
          }
          // 如果同時有銷量和銷售額，使用數值格式
          return value.toLocaleString();
        }
        return value.toString();
      },
      color: themeConfig.textColor,
    },
    splitLine: {
      lineStyle: {
        color: currentTheme.value === "dark" ? "#333" : "#eee",
      },
    },
  };
  option.series = enabledSeries.map((series) => ({
    name: series.name,
    type: currentType.value as "line" | "bar",
    data:
      currentChartData.value.series[
        series.name as keyof typeof currentChartData.value.series
      ]?.map((item: any) => {
        // 如果是新的合併數據格式，保留完整對象，但使用value作為圖表顯示值
        if (item && typeof item === "object" && item.value !== undefined) {
          // ECharts支持這樣的格式：返回數值用於繪圖，完整對象存儲在數據中
          return {
            value: item.value,
            sales: item.sales,
            revenue: item.revenue,
          };
        }
        return item;
      }) || [],
    smooth: currentType.value === "line",
    itemStyle: {
      color: series.color,
    },
    // 隱藏線圖上的小圓點標記點
    symbol: "none",
    // 只顯示最大值和最小值標記點
    markPoint: {
      data: [
        { type: "max", name: "最大值" },
        { type: "min", name: "最小值" },
      ],
      itemStyle: {
        color: series.color,
      },
      label: {
        color: "#fff",
        fontSize: 10,
      },
    },
  }));
  // 使用 notMerge: true 來完全替換配置，而不是合併
  chartInstance.value?.setOption(option, { notMerge: true });
};

// 點擊事件
const handleClick = (type: string) => {
  currentType.value = type;
  
  initChart();
  ElMessage.success(`已切換為${type}圖表`);
};

// 切換主題
const handleThemeChange = (theme: string) => {
  currentTheme.value = theme;
  initChart();
  ElMessage.success(`已切換為${theme}主題`);
};

// 切換系列 - 因為使用 v-model，checkbox 會自動切換 enabled 狀態
const toggleSeries = () => {
  renderChart();
};

// 計算是否全選
const isAllSelected = computed(() => {
  return seriesData.every((series) => series.enabled);
});

// 切換全選
const toggleSelectAll = () => {
  const newState = !isAllSelected.value;
  seriesData.forEach((series) => {
    series.enabled = newState;
  });
  renderChart();
};

watch(currentType, () => {
  renderChart();
});

// 窗口 resize 時重新調整圖表大小
const handleResize = () => {
  chartInstance.value?.resize();
};

// 初始化
onMounted(() => {
  initChart();
  window.addEventListener("resize", handleResize);
});

// 銷毀圖例
onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  chartInstance.value?.dispose();
});
</script>

<template>
  <div class="outer" :class="{ 'dark-mode': currentTheme === 'dark' }">
    <!-- 控制面板 -->
    <div class="control-panel">
      <!-- 圖表類型選擇 -->
      <div class="control-section">
        <div class="section-title">圖表類型</div>
        <div class="chart-type-wrapper">
          <button
            v-for="type in chartTypes"
            :key="type"
            @click="handleClick(type)"
            :class="['chart-type-btn', { active: currentType === type }]"
          >
            {{ type.toUpperCase() }}
          </button>
        </div>

        <!-- 主題切換 -->
        <div class="control-section">
          <div class="section-title">顏色主題</div>
          <div class="theme-wrapper">
            <button
              v-for="theme in themes"
              :key="theme.name"
              @click="handleThemeChange(theme.name)"
              :class="['theme-btn', { active: currentTheme === theme.name }]"
            >
              {{ theme.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 系列選擇器 -->
      <div class="control-section">
        <div class="section-title">系列選擇器</div>
        <div class="series-selector">
          <!-- 全選 checkbox -->
          <label class="series-checkbox select-all">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
            <span class="checkbox-label">
              <span class="all-select-text">全選</span>
            </span>
          </label>

          <!-- 分隔線 -->
          <div class="divider"></div>

          <!-- 各系列 checkbox -->
          <label
            v-for="series in seriesData"
            :key="series.name"
            class="series-checkbox"
          >
            <input
              type="checkbox"
              v-model="series.enabled"
              @change="toggleSeries"
            />
            <span class="checkbox-label">
              <span
                class="color-indicator"
                :style="{ backgroundColor: series.color }"
              ></span>
              {{ series.name }}
            </span>
          </label>
        </div>
      </div>

      <!-- 檔案匯入操作 -->
      <div class="control-section">
        <ExcelUploader
          ref="excelUploaderRef"
          :default-data="defaultChartData"
          @data-imported="handleDataImported"
        />
      </div>

      <!-- 報表類型切換區 -->
      <div class="control-section">
        <ToggleReportType
          v-model="currentReportType"
          :chart-data="chartData"
          @report-type-changed="handleReportTypeChanged"
        />
      </div>

      <!-- 導出功能區 -->
      <div class="control-section">
        <ExportFormat
          :chart-instance="chartInstance"
          :current-type="currentType"
          :current-theme="currentTheme"
          :color-theme="colorTheme"
          :chart-data="currentChartData"
          :series-data="seriesData"
          :current-report-type="currentReportType"
        />
      </div>
    </div>

    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<style scoped lang="scss">
@use "@/assets/scss/mixins.scss" as *;

.outer {
  margin: auto;
  padding: 60px 112px;
  height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  align-items: center;
  flex-direction: column;
  transition: background-color 0.3s ease, color 0.3s ease;

  &.dark-mode {
    background-color: #1e1e1e;
    color: #fff;
  }

  @include xl-width {
    max-width: 1440px;
    padding: 60px 112px;
  }
  @include lg-width {
    max-width: 1200px;
    padding: 48px 96px;
  }

  @include md-width {
    max-width: 992px;
    padding: 24px 48px;
  }
  @include sm-width {
    max-width: 768px;
    padding: 16px 24px;
  }
  @include xs-width {
    max-width: 480px;
    padding: 16px 24px;
  }

  .control-panel {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    margin-bottom: 20px;

    .dark-mode & {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .control-section {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .section-title {
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .select-all-btn {
        font-size: 12px;
        padding: 4px 8px;
        background: transparent;
        border: 1px solid currentColor;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
        white-space: nowrap;

        &:hover {
          background: rgba(84, 112, 198, 0.1);
        }
      }
    }
  }

  .chart-type-wrapper,
  .theme-wrapper {
    display: flex;
    gap: 8px;
  }

  .chart-type-btn,
  .theme-btn {
    padding: 8px 16px;
    border: 1px solid #eee;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
    flex: 1;
    min-width: fit-content;
    font-size: 14px;

    &:hover {
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(84, 112, 198, 0.3);
    }

    &.active {
      color: white;
      box-shadow: 0 4px 12px rgba(84, 112, 198, 0.4);
    }
  }

  .series-selector {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      margin: 4px 0;

      .dark-mode & {
        background: rgba(255, 255, 255, 0.2);
      }
    }

    .series-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(84, 112, 198, 0.1);
      }

      &.select-all {
        font-weight: 600;
        background: rgba(84, 112, 198, 0.05);

        .dark-mode & {
          background: rgba(73, 146, 255, 0.1);
        }

        &:hover {
          background: rgba(84, 112, 198, 0.15);

          .dark-mode & {
            background: rgba(73, 146, 255, 0.2);
          }
        }

        .all-select-text {
          font-weight: 600;
          color: #fff;
        }
      }

      input[type="checkbox"] {
        margin-right: 8px;
        cursor: pointer;
        width: 16px;
        height: 16px;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;

        .color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
      }
    }
  }

  .chart-container {
    width: 100%;
    height: 600px;
    min-height: 500px;

    @include lg-width {
      height: 500px;
    }

    @include md-width {
      height: 450px;
    }

    @include sm-width {
      height: 400px;
    }
  }
}

.export-wrapper {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @include md-width {
    grid-template-columns: repeat(4, 1fr);
  }

  .export-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    background: #333;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 12px;

    .dark-mode & {
      background: #222;
    }

    &:hover {
      transform: translateY(-2px);
      background: #1e1e1e;
    }

    &:active {
      transform: translateY(0) scale(0.98);
    }

    .export-text {
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
  }
}

/* 自定義 tooltip 樣式 */
:deep(.custom-tooltip) {
  background-color: #ffffff !important;
  border: 1px solid #ccc !important;
  border-radius: 4px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  padding: 12px 16px !important;
}

:deep(.custom-tooltip .tooltip-date) {
  margin-bottom: 10px;
  font-weight: bold;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

:deep(.custom-tooltip .tooltip-item) {
  margin: 8px 0;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

:deep(.custom-tooltip .tooltip-header) {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

:deep(.custom-tooltip .tooltip-color) {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  margin-right: 8px;
}

:deep(.custom-tooltip .tooltip-series-name) {
  font-weight: 600;
  color: #333;
  font-size: 13px;
  margin-right: 8px;
}

:deep(.custom-tooltip .tooltip-content) {
  margin-left: 20px;
  line-height: 1.8;
}

:deep(.custom-tooltip .tooltip-data) {
  color: #666;
  font-size: 12px;
}

:deep(.custom-tooltip .tooltip-value) {
  font-weight: bold;
  color: #333;
  font-size: 13px;
}
</style>
