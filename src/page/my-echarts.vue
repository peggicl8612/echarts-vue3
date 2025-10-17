<script lang="ts" setup>
import * as echarts from "echarts";
import { ref, onMounted, onBeforeUnmount } from "vue";

const chartsRef = ref(null);
let chartInstance: echarts.ECharts | null = null;

onMounted(() => {
  // 初始化圖表
  chartInstance = echarts.init(chartsRef.value);

  // 設置配置與資料
  const option = {
    title: { text: "ECharts demo" },
    tooltip: {},
    xAxis: { data: ["A", "B", "C", "D", "E"] },
    yAxis: {},
    series: [{ type: "bar", data: [5, 20, 36, 10, 10] }],
  };
  chartInstance.setOption(option);
});

// 窗口 resize 時重新調整圖表大小
window.addEventListener("resize", () => {
  chartInstance?.resize();
});

onBeforeUnmount(() => {
  chartInstance?.dispose();
});
</script>
<template>
  <div ref="chartsRef" class="my-echarts-container"></div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  background: #fff;
}

.my-echarts-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: calc(100vh - 60px);
}
</style>
