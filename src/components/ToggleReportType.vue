<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { ElMessage } from "element-plus";
interface Props {
  chartData?: {
    categories: string[];
    series: Record<
      string,
      (number | { value: number; sales: number; revenue: number; price: any })[]
    >;
  };
  modelValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "daily",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  reportTypeChanged: [data: { reportType: string; aggregatedData: any }];
}>();

const reportTypes = [
  {
    name: "daily",
    label: "日報表",
    default: true,
  },

  {
    name: "monthly",
    label: "月報表",
  },

  {
    name: "yearly",
    label: "年報表",
  },
];

const currentReportType = ref(props.modelValue);

// 滑軌控制狀態
const dailyRange = ref({ start: 0, end: 1095 }); // 日報表範圍
const monthlyRange = ref({ start: 0, end: 36 }); // 月報表範圍

// 強制重建滑軌
const rangeKey = ref(0);

// 外部 v-model 改變（父層切回 daily 等）
watch(
  () => props.modelValue,
  async (val) => {
    if (!val || !props.chartData?.categories?.length) return;

    currentReportType.value = val;

    if (val === "daily") {
      dailyRange.value = {
        start: 0,
        end: props.chartData.categories.length - 1,
      };
    } else if (val === "monthly") {
      const monthCount = new Set(
        props.chartData.categories.map((d) => {
          const dt = new Date(d);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
        })
      ).size;
      monthlyRange.value = { start: 0, end: monthCount - 1 };
    }

    rangeKey.value++; // 強制重建滑軌
    await nextTick(); // 等 DOM 更新再送資料
    const aggregated = aggregateData(props.chartData, val);
    emit("reportTypeChanged", { reportType: val, aggregatedData: aggregated });
  }
);

// 資料源改變（上傳/清除/測試）
watch(
  () => props.chartData?.categories,
  async (cats) => {
    if (!cats?.length) return;

    dailyRange.value = { start: 0, end: cats.length - 1 };

    const monthCount = new Set(
      cats.map((d) => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })
    ).size;
    monthlyRange.value = { start: 0, end: monthCount - 1 };

    rangeKey.value++;
    await nextTick();
    const aggregated = aggregateData(props.chartData, currentReportType.value);
    emit("reportTypeChanged", {
      reportType: currentReportType.value,
      aggregatedData: aggregated,
    });
  }
);

// 數據聚合函數
const aggregateData = (data: any, reportType: string) => {
  if (!data || !data.categories || !data.series) return data;

  const categories = [...data.categories];
  const series = { ...data.series };

  switch (reportType) {
    case "daily":
      return aggregateDataDaily(categories, series);
    case "monthly":
      return aggregateDataMonthly(categories, series);
    case "yearly":
      return aggregateDataYearly(categories, series);
    default:
      return data;
  }
};

// 日報聚合：end + 1 作為 slice 的結束索引
const aggregateDataDaily = (
  categories: string[],
  series: Record<string, any[]>
) => {
  const dailyData = {
    categories: [] as string[],
    series: {} as Record<string, any[]>,
  };
  const names = Object.keys(series);
  names.forEach((n) => (dailyData.series[n] = []));

  const startIndex = dailyRange.value.start;
  const endIndex = Math.min(dailyRange.value.end + 1, categories.length); // 重要：end+1
  dailyData.categories = categories.slice(startIndex, endIndex);
  names.forEach((n) => {
    const s = series[n];
    if (s) dailyData.series[n] = s.slice(startIndex, endIndex);
  });
  return dailyData;
};

// 月報表聚合 - 支援滑軌調整範圍
const aggregateDataMonthly = (
  categories: string[],
  series: Record<
    string,
    (number | { value: number; sales: number; revenue: number; price: any })[]
  >
) => {
  const monthlyData: {
    categories: string[];
    series: Record<
      string,
      (number | { value: number; sales: number; revenue: number; price: any })[]
    >;
  } = {
    categories: [],
    series: {},
  };

  const seriesNames = Object.keys(series);
  seriesNames.forEach((name) => {
    monthlyData.series[name] = [];
  });

  // 按實際月份聚合數據
  const monthGroups: { [key: string]: number[] } = {};

  categories.forEach((dateStr, index) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const monthKey = `${year}-${month.toString().padStart(2, "0")}`;

    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = [];
    }
    monthGroups[monthKey].push(index);
  });

  // 獲取所有月份並排序（使用更穩健的排序方法）
  const allMonths = Object.keys(monthGroups).sort((a, b) => {
    // 按年份和月份排序
    const partsA = a.split("-").map(Number);
    const partsB = b.split("-").map(Number);
    const yearA = partsA[0] || 0;
    const monthA = partsA[1] || 0;
    const yearB = partsB[0] || 0;
    const monthB = partsB[1] || 0;
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    return monthA - monthB;
  });

  // 使用滑軌範圍選擇月份（end + 1 作為 slice 的結束索引）
  const startMonthIndex = monthlyRange.value.start;
  const endMonthIndex = Math.min(monthlyRange.value.end + 1, allMonths.length);
  const selectedMonths = allMonths.slice(startMonthIndex, endMonthIndex);

  selectedMonths.forEach((monthKey) => {
    const indices = monthGroups[monthKey];
    if (!indices) return;

    // 格式化月份標籤
    const [year, month] = monthKey.split("-");
    const monthLabel = `${year}/${month}`;
    monthlyData.categories.push(monthLabel);

    seriesNames.forEach((name) => {
      const seriesData = series[name];
      if (!seriesData) return;

      const monthData = indices
        .map((idx) => seriesData[idx])
        .filter((val) => val !== undefined);

      // 處理對象數據結構
      if (
        monthData.length > 0 &&
        typeof monthData[0] === "object" &&
        monthData[0].value !== undefined
      ) {
        const avgValue =
          monthData.reduce(
            (sum: number, item: any) =>
              sum + (typeof item === "object" ? item.value || 0 : item),
            0
          ) / monthData.length;
        const avgSales =
          monthData.reduce(
            (sum: number, item: any) =>
              sum + (typeof item === "object" ? item.sales || 0 : 0),
            0
          ) / monthData.length;
        const avgRevenue =
          monthData.reduce(
            (sum: number, item: any) =>
              sum + (typeof item === "object" ? item.revenue || 0 : 0),
            0
          ) / monthData.length;
        const price = monthData[0].price || 0;

        monthlyData.series[name]?.push({
          value: Math.round(avgValue),
          sales: Math.round(avgSales),
          revenue: Math.round(avgRevenue),
          price: price,
        });
      } else {
        // 處理數值數據結構（向後兼容）
        const total = monthData.reduce(
          (sum: number, value) => sum + (typeof value === "number" ? value : 0),
          0
        );
        monthlyData.series[name]?.push(Math.round(total));
      }
    });
  });

  return monthlyData;
};

// 年報表聚合 - 顯示2022、2023、2024整年度資料
const aggregateDataYearly = (
  categories: string[],
  series: Record<
    string,
    (number | { value: number; sales: number; revenue: number; price: any })[]
  >
) => {
  const yearlyData: {
    categories: string[];
    series: Record<
      string,
      (number | { value: number; sales: number; revenue: number; price: any })[]
    >;
  } = {
    categories: [],
    series: {},
  };

  const seriesNames = Object.keys(series);
  seriesNames.forEach((name) => {
    yearlyData.series[name] = [];
  });

  // 按實際年份聚合數據
  const yearGroups: { [key: string]: number[] } = {};

  categories.forEach((dateStr, index) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const yearKey = year.toString();

    if (!yearGroups[yearKey]) {
      yearGroups[yearKey] = [];
    }
    yearGroups[yearKey].push(index);
  });

  // 動態獲取所有年份並排序
  const allYears = Object.keys(yearGroups).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  // 顯示所有年份的資料
  allYears.forEach((year) => {
    const indices = yearGroups[year];
    if (!indices || indices.length === 0) return;

    yearlyData.categories.push(year);

    seriesNames.forEach((name) => {
      const seriesData = series[name];
      if (!seriesData) return;

      const yearData = indices
        .map((idx) => seriesData[idx])
        .filter((val) => val !== undefined);

      // 處理對象數據結構
      if (
        yearData.length > 0 &&
        typeof yearData[0] === "object" &&
        yearData[0].value !== undefined
      ) {
        const avgValue =
          yearData.reduce(
            (sum: number, item: any) =>
              sum + (typeof item === "object" ? item.value || 0 : item),
            0
          ) / yearData.length;
        const avgSales =
          yearData.reduce(
            (sum: number, item: any) =>
              sum + (typeof item === "object" ? item.sales || 0 : 0),
            0
          ) / yearData.length;
        const avgRevenue =
          yearData.reduce(
            (sum: number, item: any) =>
              sum + (typeof item === "object" ? item.revenue || 0 : 0),
            0
          ) / yearData.length;
        const price = yearData[0].price || 0;

        yearlyData.series[name]?.push({
          value: Math.round(avgValue),
          sales: Math.round(avgSales),
          revenue: Math.round(avgRevenue),
          price: price,
        });
      } else {
        // 處理數值數據結構（向後兼容）
        const total = yearData.reduce(
          (sum: number, value) => sum + (typeof value === "number" ? value : 0),
          0
        );
        yearlyData.series[name]?.push(Math.round(total));
      }
    });
  });

  return yearlyData;
};

// 報表類型切換函數
const switchReportType = (reportType: string) => {
  console.log("切換報表類型:", reportType);
  console.log("原始數據:", props.chartData);

  currentReportType.value = reportType;
  emit("update:modelValue", reportType);

  const reportTypeLabel = reportTypes.find((r) => r.name === reportType)?.label;
  ElMessage.success(`已切換為${reportTypeLabel}`);

  // 發送聚合後的數據
  const aggregatedData = aggregateData(props.chartData, reportType);
  console.log("聚合後的數據:", aggregatedData);

  emit("reportTypeChanged", {
    reportType,
    aggregatedData: aggregatedData,
  });
};

// 同步父層 v-model
watch(
  () => props.modelValue,
  (val) => {
    // 如果沒有值，則不進行任何操作
    if (!val) return;
    currentReportType.value = val;

    // 重置對應時間滑軌
    if (val === "daily" && props.chartData?.categories?.length) {
      dailyRange.value = { start: 0, end: props.chartData.categories.length };
    } else if (val === "monthly" && props.chartData?.categories?.length) {
      const monthCount = new Set(
        props.chartData.categories.map((dailyRange) => {
          const date = new Date(dailyRange);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
        })
      ).size;
      monthlyRange.value = { start: 0, end: monthCount };
    }

    // 依最新報表型態回傳聚合資料，讓父層立刻渲染正確畫面
    if (props.chartData) {
      const aggregatedData = aggregateData(props.chartData, val);
      emit("reportTypeChanged", { reportType: val, aggregatedData });
    }
  }
);
</script>

<template>
  <div class="toggle-report-type">
    <div class="section-title">報表類型</div>
    <div class="button-group">
      <button
        v-for="reportType in reportTypes"
        :key="reportType.name"
        @click="switchReportType(reportType.name)"
        :class="[
          'report-btn',
          { active: currentReportType === reportType.name },
        ]"
        :title="`切換為${reportType.label}`"
      >
        {{ reportType.label }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.toggle-report-type {
  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #fff;
  }

  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .report-btn {
    flex: 1;
    background: #8b8686;
    color: white;
    border: 1px solid #ddd;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 12px;
    text-align: center;

    &:hover {
      background: #e9ecef;
      border-color: #adb5bd;
      transform: translateY(-1px);
    }

    &.active {
      background: #646161;
      color: white;
    }

    &:active {
      transform: translateY(0);
    }
  }

  .range-control {
    margin-top: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
    flex: 1;

    .range-label {
      font-size: 12px;
      font-weight: 600;
      color: #495057;
      margin-bottom: 8px;
    }

    /* 單行雙把手滑軌 */
    .dual-slider {
      position: relative;
      height: 28px; /* 容器高度 */
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .dual-slider .range {
      position: absolute;
      left: -9px; /* 讓把手可超出左右半個把手寬，視覺貼齊邊緣 */
      top: 50%;
      transform: translateY(-50%);
      width: calc(100% + 18px);
      appearance: none;
      background: transparent;
      pointer-events: none; /* 軌道不吃事件，只有把手可拖 */
      height: 0; /* 由 track 高度決定視覺高度 */
      margin: 0;
    }

    .dual-slider .range::-webkit-slider-thumb {
      pointer-events: auto;
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid #535151;
      cursor: pointer;
    }
    .dual-slider .range::-moz-range-thumb {
      pointer-events: auto;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid #535151;
      cursor: pointer;
    }

    .dual-slider .start {
      z-index: 1;
    }
    .dual-slider .end {
      z-index: 1;
    }

    .dual-slider .range-fill {
      position: absolute;
      height: 10px;
      border-radius: 6px;
      background: #8b8686;
      pointer-events: none;
      top: 50%;
      transform: translateY(-50%);
    }

    .range-info {
      font-size: 11px;
      color: #6c757d;
      text-align: center;
    }
  }
}

// 深色主題支援
.dark-theme {
  .toggle-report-type {
    .section-title {
      color: #fff;
    }

    .report-btn {
      background: #444;
      border-color: #666;
      color: #fff;

      &:hover {
        background: #555;
        border-color: #777;
      }
    }
  }
}
</style>
