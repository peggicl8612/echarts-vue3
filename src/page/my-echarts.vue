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

const chartRef = ref(null);
const chartInstance = ref<any>(null);

// 圖表類型
const chartTypes = ["line", "bar", "pie"];
const currentType = ref(chartTypes["0"]);

// 主題列表
const themes = [
  { name: "light", label: "淺色主題", color: "#ebeae5" },
  { name: "dark", label: "深色主題", color: "#2d3748" },
];

const currentTheme = ref("light");

// 多系列數據配置
interface SeriesData {
  name: string;
  enabled: boolean;
  color: string;
}

// 預設資料（用於初始化和重置）
const defaultChartData = {
  categories: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],

  series: {
    A商品: [120, 200, 150, 220, 180, 200, 190, 230, 210, 240],
    B商品: [80, 150, 120, 180, 140, 200, 160, 190, 170, 210],
    C商品: [90, 160, 130, 190, 150, 210, 170, 200, 180, 220],
    D商品: [100, 180, 140, 210, 170, 230, 190, 220, 200, 240],
  },
};

const seriesData = reactive<SeriesData[]>([
  { name: "A商品", enabled: true, color: "#5470c6" },
  { name: "B商品", enabled: true, color: "#91cc75" },
  { name: "C商品", enabled: true, color: "#fac858" },
  { name: "D商品", enabled: true, color: "#ee6666" },
]);

// 圖表數據 - 使用預設資料的深拷貝
const chartData = reactive({
  categories: [...defaultChartData.categories],
  series: JSON.parse(JSON.stringify(defaultChartData.series)),
});

// Excel 上傳組件的 ref
const excelUploaderRef = ref<InstanceType<typeof ExcelUploader> | null>(null);

// 處理從 ExcelUploader 組件傳來的資料
const handleDataImported = (data: {
  categories: string[];
  series: Record<string, number[]>;
  seriesNames: string[];
}) => {
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

  // 重新渲染圖表
  renderChart();
};

// 顏色主題配置
const colorTheme = {
  light: {
    colors: ["#5470c6", "#91cc75", "#fac858", "#ee6666"],
    backgroundColor: "#ffffff",
    textColor: "#000000",
  },
  dark: {
    colors: ["#5470c6", "#91cc75", "#fac858", "#ee6666"],
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
      text: `${currentType.value?.toUpperCase()} 多系列數據分析`,
      left: "center",
      textStyle: { color: themeConfig.textColor },
    },
    tooltip: {
      trigger: currentType.value === "pie" ? "item" : "axis",
      ...(currentType.value !== "pie" && {
        axisPointer: {
          type: "cross",
          crossStyle: {
            color: "#999",
          },
        },
      }),
    },
    legend: {
      data: enabledSeries.map((series) => series.name),
      top: 50,
      textStyle: {
        color: themeConfig.textColor,
      },
      // 圖例互動配置
      selected: enabledSeries.reduce((acc, series) => {
        acc[series.name] = series.enabled;
        return acc;
      }, {} as Record<string, boolean>),
    },
    color: themeConfig.colors,
    backgroundColor: themeConfig.backgroundColor,
    // 網格配置 - 為工具箱留出空間
    grid: {
      top: 130,
      right: 60,
      bottom: 80,
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
        ...(currentType.value !== "pie" && {
          dataZoom: {
            show: true,
            title: {
              zoom: "區域縮放",
              back: "還原縮放",
            },
            xAxisIndex: 0,
          },
        }),
      },
    },
  };

  // 添加資料縮放（適合大量數據）
  if (currentType.value === "line" || currentType.value === "bar") {
    // 檢查是否為測試數據（數據量大於1000筆）
    const isTestData = chartData.categories.length > 1000;

    option.dataZoom = [
      {
        type: "slider",
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: isTestData ? 2 : 100, // 測試數據預設只顯示2%，其他數據顯示100%
        bottom: 10,
        height: 20,
        handleStyle: {
          color: "#4a90e2",
        },
        textStyle: {
          color: themeConfig.textColor,
        },
        borderColor: themeConfig.textColor,
        fillerColor: "rgba(74, 144, 226, 0.2)",
        backgroundColor: currentTheme.value === "dark" ? "#333" : "#f0f0f0",
      },
    ];
  }

  if (currentType.value === "line" || currentType.value === "bar") {
    option.xAxis = {
      type: "category",
      data: chartData.categories,
      axisLine: {
        lineStyle: {
          color: themeConfig.textColor,
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
      splitLine: {
        lineStyle: {
          color: currentTheme.value === "dark" ? "333" : "eee",
        },
      },
    };
    option.series = enabledSeries.map((series) => ({
      name: series.name,
      type: currentType.value as "line" | "bar",
      data: chartData.series[series.name as keyof typeof chartData.series],
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
  } else if (currentType.value === "pie") {
    // 動態計算每個系列的半徑範圍
    const totalSeries = enabledSeries.length;
    const maxRadius = 60; // 最大半徑百分比
    const minRadius = 0; // 最小半徑百分比
    const gap = 1.5; // 每個圓環之間的間隙
    const availableSpace = maxRadius - minRadius;
    const ringWidth = (availableSpace - gap * (totalSeries - 1)) / totalSeries;

    option.series = enabledSeries.map((series, index) => {
      const innerRadius = minRadius + index * (ringWidth + gap);
      const outerRadius = innerRadius + ringWidth;

      return {
        name: series.name,
        type: "pie",
        radius: [`${innerRadius}%`, `${outerRadius}%`],
        center: ["50%", "55%"],
        data: chartData.categories.map((category, idx) => ({
          name: category,
          value:
            chartData.series[series.name as keyof typeof chartData.series][idx],
        })),
        itemStyle: {
          color: series.color,
        },
        label: {
          show: index === enabledSeries.length - 1,
          color: themeConfig.textColor,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      };
    });
  }
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

      <!-- 導出功能區 -->
      <div class="control-section">
        <ExportFormat
          :chart-instance="chartInstance"
          :current-type="currentType"
          :current-theme="currentTheme"
          :color-theme="colorTheme"
          :chart-data="chartData"
          :series-data="seriesData"
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
</style>
