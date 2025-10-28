<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

// 圖表類型展示
const chartTypes = [
  {
    title: "折線圖",
    icon: "mdi-chart-line",
    description: "展示數據趨勢變化，支援平滑曲線、區域填充等效果",
    path: "/chart",
    chartType: "line",
  },
  {
    title: "長條圖",
    icon: "mdi-chart-bar",
    description: "直觀比較不同類別的數據大小",
    path: "/chart",
    chartType: "bar",
  },
  {
    title: "圓餅圖",
    icon: "mdi-chart-pie",
    description: "展示數據佔比與分佈情況",
    path: "/chart",
    chartType: "pie",
  },
  {
    title: "進階功能",
    icon: "mdi-lightning-bolt",
    description: "資料縮放、標記點、標記線等互動功能",
    path: "/chart2",
  },
];

// 掌握的功能列表
const features = [
  {
    icon: "mdi-palette",
    title: "多樣化圖表",
    desc: "折線圖、長條圖、圓餅圖等多種圖表類型",
  },
  {
    icon: "mdi-refresh",
    title: "動態更新",
    desc: "即時更新圖表資料，流暢的動畫效果",
  },
  {
    icon: "mdi-toolbox",
    title: "工具箱",
    desc: "圖片下載、資料檢視、區域縮放等實用工具",
  },
  {
    icon: "mdi-responsive",
    title: "響應式設計",
    desc: "完美適配各種螢幕尺寸的裝置",
  },
  {
    icon: "mdi-map-marker",
    title: "資料標記",
    desc: "標記點顯示最大值、最小值，標記線顯示平均值",
  },
  {
    icon: "mdi-magnify",
    title: "資料縮放",
    desc: "支援滑桿與內建縮放，輕鬆探索大量資料",
  },
];

const navigateToChart = (path: string, chartType?: string) => {
  if (chartType) {
    router.push({ path, query: { type: chartType } });
  } else {
    router.push(path);
  }
};
</script>

<template>
  <div class="home-outer">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">ECharts Demo</h1>

        <div class="hero-buttons">
          <button class="btn-primary" @click="navigateToChart('/chart')">
            查看圖表展示
          </button>
          <button class="btn-secondary" @click="navigateToChart('/chart2')">
            進階範例
          </button>
        </div>
      </div>
    </section>

    <!-- 圖表類型展示 -->
    <section class="charts-section">
      <h2 class="section-title">圖表類型</h2>
      <div class="charts-grid">
        <div
          v-for="(chart, index) in chartTypes"
          :key="index"
          class="chart-card"
          @click="navigateToChart(chart.path, chart.chartType)"
        >
          <div class="chart-icon-wrapper">
            <i class="mdi chart-icon" :class="chart.icon"></i>
          </div>
          <h3 class="chart-title">{{ chart.title }}</h3>
          <p class="chart-description">{{ chart.description }}</p>
        </div>
      </div>
    </section>

    <!-- 功能特色 -->
    <section class="features-section">
      <h2 class="section-title">功能特色</h2>
      <div class="features-grid">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-card"
        >
          <div class="feature-icon">
            <i class="mdi" :class="feature.icon"></i>
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-desc">{{ feature.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 學習成果統計 -->
    <section class="stats-section">
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-number">3+</div>
          <div class="stat-label">圖表類型</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">10+</div>
          <div class="stat-label">功能特色</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">100%</div>
          <div class="stat-label">響應式設計</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "@/assets/scss/mixins.scss" as *;

.home-outer {
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, #ebeae5 0%, #a9a38b 100%);
}

.hero-section {
  padding: 120px 24px 80px;
  text-align: center;

  @include md-width {
    padding: 80px 24px 60px;
  }

  @include sm-width {
    padding: 60px 16px 40px;
  }
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 24px;
  line-height: 1.2;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);

  @include lg-width {
    font-size: 3rem;
  }

  @include md-width {
    font-size: 2.5rem;
  }

  @include sm-width {
    font-size: 2rem;
  }
}

.hero-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  padding: 14px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

  @include sm-width {
    padding: 12px 24px;
    font-size: 1rem;
  }
}

.btn-primary {
  background: white;
  color: #b4ac8b;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;

  &:hover {
    background: white;
    transform: translateY(-2px);
  }
}

/* Charts Section */
.charts-section,
.features-section {
  padding: 80px 24px;
  background: #f7fafc;

  @include md-width {
    padding: 60px 24px;
  }

  @include sm-width {
    padding: 40px 16px;
  }
}

.features-section {
  background: white;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 60px;
  color: #2d3748;

  @include md-width {
    font-size: 2rem;
    margin-bottom: 40px;
  }

  @include sm-width {
    font-size: 1.75rem;
    margin-bottom: 30px;
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;

  @include md-width {
    gap: 24px;
    grid-template-columns: 1fr;
  }

  @include sm-width {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @include xs-width {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(100px);

    .chart-arrow {
      transform: translateX(5px);
    }
  }

  @include sm-width {
    padding: 32px 24px;
  }
}

.chart-icon-wrapper {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  .chart-icon {
    font-size: 4rem;
    color: #a5b0c2;

    @include sm-width {
      font-size: 3rem;
    }
  }
}

.chart-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: #2d3748;

  @include sm-width {
    font-size: 1.25rem;
  }
}

.chart-description {
  font-size: 1rem;
  color: #718096;
  line-height: 1.6;
  margin-bottom: 20px;

  @include sm-width {
    font-size: 0.9rem;
  }
}

.chart-arrow {
  font-size: 1.5rem;
  font-weight: bold;
  transition: transform 0.3s ease;
}

/* Features Section */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;

  @include md-width {
    gap: 24px;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  @include sm-width {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.feature-card {
  padding: 32px 24px;
  text-align: center;
  background: #f7fafc;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: #edf2f7;
    transform: scale(1.03);
  }

  @include sm-width {
    padding: 24px 20px;
  }
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  color: #a5b0c2;
  @include sm-width {
    font-size: 2.5rem;
  }
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: #2d3748;

  @include sm-width {
    font-size: 1.1rem;
  }
}

.feature-desc {
  font-size: 0.95rem;
  color: #718096;
  line-height: 1.6;

  @include sm-width {
    font-size: 0.9rem;
  }
}

/* Stats Section */
.stats-section {
  padding: 80px 24px;
  background: linear-gradient(135deg, #ebeae5 0%, #a9a38b 100%);
  color: white;

  @include md-width {
    padding: 60px 24px;
  }

  @include sm-width {
    padding: 40px 16px;
  }
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 48px;
  max-width: 1000px;
  margin: 0 auto;

  @include md-width {
    gap: 32px;
  }

  @include sm-width {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 12px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);

  @include md-width {
    font-size: 3rem;
  }

  @include sm-width {
    font-size: 2.5rem;
  }
}

.stat-label {
  font-size: 1.25rem;
  opacity: 0.95;
  font-weight: 500;

  @include sm-width {
    font-size: 1.1rem;
  }
}
</style>
