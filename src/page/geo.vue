<script lang="ts" setup>
import * as echarts from "echarts";
import { onMounted, onBeforeUnmount, ref } from "vue";
import taiwanMap from "@/assets/taiwan-geo.json";
echarts.registerMap("taiwan", taiwanMap as any);

const chartRef = ref(null);
let chartInstance: echarts.ECharts | null = null;

// 台灣六都經緯度數據
const taiwanSixCities = [
  { name: "台北市", value: [121.5654, 25.033, 100], symbolSize: 25 },
  { name: "新北市", value: [121.4658, 25.0169, 120], symbolSize: 22 },
  { name: "桃園市", value: [121.301, 24.9936, 90], symbolSize: 20 },
  { name: "台中市", value: [120.6736, 24.1477, 110], symbolSize: 23 },
  { name: "台南市", value: [120.213, 22.9999, 85], symbolSize: 18 },
  { name: "高雄市", value: [120.3014, 22.6273, 95], symbolSize: 19 },
];

// 六都間連線數據（可選）
const cityConnections = [
  { from: "台北市", to: "新北市", value: 50 },
  { from: "台北市", to: "桃園市", value: 40 },
  { from: "新北市", to: "桃園市", value: 35 },
  { from: "桃園市", to: "台中市", value: 60 },
  { from: "台中市", to: "台南市", value: 45 },
  { from: "台南市", to: "高雄市", value: 30 },
];

// 初始化圖表
const initChart = () => {
  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(chartRef.value);

  const option = {
    backgroundColor: "#0a0a0a",
    title: {
      text: "台灣六都地圖視覺化",
      left: 20,
      top: 20,
      textStyle: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
      },
    },
    legend: {
      show: true,
      top: 60,
      left: 20,
      orient: "vertical",
      textStyle: {
        color: "#fff",
        fontSize: 12,
      },
      data: [
        { name: "台北市", itemStyle: { color: "#ff6b6b" } },
        { name: "新北市", itemStyle: { color: "#4ecdc4" } },
        { name: "桃園市", itemStyle: { color: "#45b7d1" } },
        { name: "台中市", itemStyle: { color: "#96ceb4" } },
        { name: "台南市", itemStyle: { color: "#feca57" } },
        { name: "高雄市", itemStyle: { color: "#ff9ff3" } },
      ],
    },
    tooltip: {
      trigger: "item",
      formatter: function (params: any) {
        if (params.seriesType === "scatter") {
          return `${params.data.name}<br/>經度: ${params.data.value[0]}<br/>緯度: ${params.data.value[1]}<br/>數值: ${params.data.value[2]}`;
        } else if (params.seriesType === "lines") {
          return `連線: ${params.data.from} → ${params.data.to}<br/>強度: ${params.data.value}`;
        } else if (params.seriesType === "map") {
          return `${params.name}`;
        }
        return "";
      },
    },
    geo: {
      map: "taiwan", // 需要台灣地圖數據
      roam: true,
      scaleLimit: {
        min: 0.8,
        max: 5,
      },
      center: [120.5, 23.5], // 台灣中心點
      zoom: 1.2,
      itemStyle: {
        areaColor: "#1e3a8a",
        borderColor: "#3b82f6",
        borderWidth: 1.5,
      },
      emphasis: {
        itemStyle: {
          areaColor: "#3b82f6",
          borderColor: "#60a5fa",
        },
      },
      label: {
        show: true,
        fontSize: 10,
        color: "#fff",
        formatter: function (params: any) {
          // 只顯示六都的標籤
          const sixCities = [
            "台北市",
            "新北市",
            "桃園市",
            "台中市",
            "台南市",
            "高雄市",
          ];
          return sixCities.includes(params.name) ? params.name : "";
        },
      },
    },
    series: [
      // 地圖系列 - 顯示台灣輪廓
      {
        type: "map",
        map: "taiwan",
        geoIndex: 0,
        itemStyle: {
          areaColor: function (params: any) {
            // 六都使用不同顏色
            const sixCities = [
              "台北市",
              "新北市",
              "桃園市",
              "台中市",
              "台南市",
              "高雄市",
            ];
            if (sixCities.includes(params.name)) {
              const colors = {
                台北市: "#ff6b6b",
                新北市: "#4ecdc4",
                桃園市: "#45b7d1",
                台中市: "#96ceb4",
                台南市: "#feca57",
                高雄市: "#ff9ff3",
              };
              return colors[params.name as keyof typeof colors] || "#1e3a8a";
            }
            return "rgba(30, 58, 138, 0.3)";
          },
          borderColor: "#3b82f6",
          borderWidth: 2,
        },
        emphasis: {
          itemStyle: {
            areaColor: "rgba(59, 130, 246, 0.6)",
            borderColor: "#60a5fa",
            borderWidth: 2,
          },
        },
        label: {
          show: true,
          fontSize: 10,
          color: "#fff",
          fontWeight: "bold",
        },
        zlevel: 0,
      },
      // 六都散點圖
      {
        type: "scatter",
        coordinateSystem: "geo",
        data: taiwanSixCities,
        symbolSize: function (val: any) {
          return val.symbolSize || 20;
        },
        itemStyle: {
          color: "#ff6b6b",
          shadowBlur: 15,
          shadowColor: "#ff6b6b",
        },
        emphasis: {
          itemStyle: {
            color: "#ff4757",
            shadowBlur: 25,
            shadowColor: "#ff4757",
          },
        },
        label: {
          show: true,
          position: "right",
          formatter: "{b}",
          fontSize: 12,
          color: "#fff",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: [4, 8],
          borderRadius: 4,
        },
      },
      // 漣漪效果
      {
        type: "effectScatter",
        coordinateSystem: "geo",
        data: taiwanSixCities,
        symbolSize: function (val: any) {
          return (val.symbolSize || 20) * 0.8;
        },
        showEffectOn: "render",
        rippleEffect: {
          brushType: "stroke",
          scale: 3,
          period: 3,
        },
        itemStyle: {
          color: "#00d2ff",
          shadowBlur: 10,
          shadowColor: "#00d2ff",
        },
        zlevel: 1,
      },
      // 城市間連線
      {
        type: "lines",
        coordinateSystem: "geo",
        data: cityConnections.map((item) => {
          const fromCity = taiwanSixCities.find(
            (city) => city.name === item.from
          );
          const toCity = taiwanSixCities.find((city) => city.name === item.to);
          return {
            coords: [
              fromCity ? fromCity.value.slice(0, 2) : [0, 0],
              toCity ? toCity.value.slice(0, 2) : [0, 0],
            ],
            value: item.value,
            from: item.from,
            to: item.to,
          };
        }),
        lineStyle: {
          color: "#00d2ff",
          width: 2,
          opacity: 0.7,
          curveness: 0.2,
        },
        effect: {
          show: true,
          period: 2,
          trailLength: 0.1,
          color: "#00d2ff",
          symbolSize: 3,
        },
        emphasis: {
          lineStyle: {
            opacity: 1,
            width: 3,
          },
        },
      },
    ],
  };

  chartInstance.setOption(option);
};

// 窗口大小調整
const handleResize = () => {
  chartInstance?.resize();
};

onMounted(() => {
  initChart();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  chartInstance?.dispose();
});
</script>

<template>
  <div class="geo-container">
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/scss/mixins.scss" as *;

.geo-container {
  margin: auto;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  overflow: hidden;

  .chart {
    width: 100%;
    height: 100%;
  }

  // 裝飾性背景效果
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 20% 80%,
        rgba(255, 107, 107, 0.1) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        rgba(0, 210, 255, 0.1) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 40% 40%,
        rgba(59, 130, 246, 0.05) 0%,
        transparent 50%
      );
    pointer-events: none;
    z-index: 0;
  }

  .chart {
    position: relative;
    z-index: 1;
  }
}
</style>
