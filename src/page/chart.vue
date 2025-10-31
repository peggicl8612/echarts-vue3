<script setup lang="ts">
import * as echarts from "echarts";
import { ElMessage } from "element-plus";
import { ref, watch, reactive, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const chartRef = ref(null);
let chartInstance: echarts.ECharts | null = null;

// 圖表類型
const chartTypes = ["line", "bar", "pie"];
const currentType = ref(chartTypes["0"]);

// 主題列表
/* const themes = [
  { name: "light", label: "淺色主題", color: "#ebeae5" },
  { name: "dark", label: "深色主題", color: "#2d3748" },
]; */

//const currentTheme = ref("light");

// 多系列數據配置

// 圖表數據
const chartData = reactive({
  categories: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
  values: [5, 20, 36, 10, 10, 20, 30, 40, 45, 50],
});

// 初始化
const initChart = () => {
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, "light");
  }
  renderChart();
};

// 根據 currentType 渲染圖表
const renderChart = () => {
  const option: echarts.EChartsOption = {
    title: {
      text: `${currentType.value} Chart`,
      left: "center",
      top: currentType.value === "pie" ? 40 : 20,
    },
    tooltip: {
      trigger: currentType.value === "pie" ? "item" : "axis",
      ...(currentType.value !== "pie" && {
        axisPointer: {
          type: "shadow",
        },
      }),
    },
    legend: {},
    // 網格配置
    grid: {
      top: 100,
      right: 60,
      bottom: 80,
      left: 60,
      // 避免座標及文字跑版
      containLabel: true,
    },
    // 工具箱
    toolbox: {
      show: true,
      feature: {
        saveAsImage: {
          show: true,
          title: "下載圖片",
          pixelRatio: 2,
        },
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
          },
        }),
      },
    },
  };

  // 添加資料縮放（適合大量數據）
  if (currentType.value === "line" || currentType.value === "bar") {
    option.dataZoom = [
      {
        show: true,
        type: "slider",
        start: 0,
        end: 100,
      },
      {
        type: "inside",
        start: 0,
        end: 100,
      },
    ];
  }

  if (currentType.value === "line" || currentType.value === "bar") {
    option.xAxis = {
      type: "category",
      data: chartData.categories,
    };
    option.yAxis = {
      type: "value",
    };
    option.series = [
      {
        type: currentType.value,
        data: chartData.values,
        smooth: true,

        // 標記點（最大值、最小值）
        markPoint: {
          data: [
            { type: "max", name: "最大值" },
            { type: "min", name: "最小值" },
          ],
        },
        // 標記線（平均值）
        markLine: {
          data: [{ type: "average", name: "平均值" }],
        },
      },
    ];
  } else if (currentType.value === "pie") {
    option.series = [
      {
        name: "分佈",
        type: "pie",

        radius: "60%",
        data: chartData.categories.map((category, index) => ({
          name: category,
          value: chartData.values[index],
        })),
      },
    ];
  }
  chartInstance?.setOption(option);
};

// 點擊事件
const handleClick = (type: string) => {
  currentType.value = type;
  initChart();
  ElMessage.success(`已切換為${type}圖表`);
};

watch(currentType, () => {
  renderChart();
});

// 窗口 resize 時重新調整圖表大小
const handleResize = () => {
  chartInstance?.resize();
};

// 初始化
onMounted(() => {
  // 從 URL query 參數讀取圖表類型
  const queryType = route.query.type as string;
  if (queryType && chartTypes.includes(queryType)) {
    currentType.value = queryType;
  }
  initChart();
  window.addEventListener("resize", handleResize);
});

// 銷毀圖例
onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  chartInstance?.dispose();
});
</script>

<template>
  <div class="outer">
    <div class="chart-type-wrapper">
      <button
        v-for="type in chartTypes"
        :key="type"
        @click="handleClick(type)"
        class="chart-type-btn"
      >
        {{ type }}
      </button>
    </div>

    <div
      ref="chartRef"
      class="chart-container"
      style="width: 100vw; height: 80vh"
    ></div>
  </div>
</template>

<style scoped lang="scss">
@use "@/assets/scss/mixins.scss" as *;

.outer {
  padding: 60px 112px;
  height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

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

  .chart-container {
    width: 100%;
    display: flex;
    justify-content: center;
  }
}
</style>
