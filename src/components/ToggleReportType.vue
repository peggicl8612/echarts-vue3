<script setup lang="ts">
import { ref } from "vue";
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

// 日報表聚合 - 支援滑軌調整範圍
const aggregateDataDaily = (
  categories: string[],
  series: Record<
    string,
    (number | { value: number; sales: number; revenue: number; price: any })[]
  >
) => {
  const dailyData: {
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
    dailyData.series[name] = [];
  });

  // 使用滑軌範圍
  const startIndex = dailyRange.value.start;
  const endIndex = Math.min(dailyRange.value.end, categories.length);

  dailyData.categories = categories.slice(startIndex, endIndex);

  seriesNames.forEach((name) => {
    const seriesData = series[name];
    if (seriesData) {
      dailyData.series[name] = seriesData.slice(startIndex, endIndex);
    }
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

  // 獲取所有月份並排序
  const allMonths = Object.keys(monthGroups).sort();

  // 使用滑軌範圍選擇月份
  const startMonthIndex = monthlyRange.value.start;
  const endMonthIndex = Math.min(monthlyRange.value.end, allMonths.length);
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

  // 顯示2022、2023、2024年的資料
  const years = ["2022", "2023", "2024"];

  years.forEach((year) => {
    const indices = yearGroups[year];
    if (!indices) return;

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

// 滑軌控制函數
const updateDailyRange = (start: number, end: number) => {
  dailyRange.value = { start, end };
  if (currentReportType.value === "daily" && props.chartData) {
    const aggregatedData = aggregateData(props.chartData, "daily");
    emit("reportTypeChanged", {
      reportType: "daily",
      aggregatedData,
    });
  }
};

const updateMonthlyRange = (start: number, end: number) => {
  monthlyRange.value = { start, end };
  if (currentReportType.value === "monthly" && props.chartData) {
    const aggregatedData = aggregateData(props.chartData, "monthly");
    emit("reportTypeChanged", {
      reportType: "monthly",
      aggregatedData,
    });
  }
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

    <!-- 滑軌控制 -->
    <div v-if="currentReportType === 'daily'" class="range-control">
      <div class="range-label">日報表範圍</div>
      <div class="range-slider">
        <input
          type="range"
          :min="0"
          :max="props.chartData?.categories.length || 1000"
          v-model="dailyRange.start"
          @input="updateDailyRange(dailyRange.start, dailyRange.end)"
          class="slider"
        />
        <input
          type="range"
          :min="dailyRange.start + 1"
          :max="props.chartData?.categories.length || 1000"
          v-model="dailyRange.end"
          @input="updateDailyRange(dailyRange.start, dailyRange.end)"
          class="slider"
        />
      </div>
    </div>

    <div v-if="currentReportType === 'monthly'" class="range-control">
      <div class="range-label">月報表範圍</div>
      <div class="range-slider">
        <input
          type="range"
          :min="0"
          :max="36"
          v-model="monthlyRange.start"
          @input="updateMonthlyRange(monthlyRange.start, monthlyRange.end)"
          class="slider"
        />
        <input
          type="range"
          :min="monthlyRange.start + 1"
          :max="36"
          v-model="monthlyRange.end"
          @input="updateMonthlyRange(monthlyRange.start, monthlyRange.end)"
          class="slider"
        />
      </div>
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
    background: #8b8686;
    color: white;
    border: 1px solid #ddd;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 12px;
    min-width: 60px;
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
    width: 100%;
    max-width: 175px;

    .range-label {
      font-size: 12px;
      font-weight: 600;
      color: #495057;
      margin-bottom: 8px;
    }

    .range-slider {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;

      .slider {
        height: 6px;
        border-radius: 3px;
        background: #ddd;
        outline: none;
        -webkit-appearance: none;
        appearance: none;

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
        }
      }
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
