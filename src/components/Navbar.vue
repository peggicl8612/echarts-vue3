<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

// 根據當前路由設定初始的 activeIndex
const getIndexByPath = (path: string): string => {
  switch (path) {
    case "/":
      return "1";
    case "/chart":
      return "2";
    case "/chart2":
      return "3";
    case "/geo":
      return "4";
    default:
      return "1";
  }
};

// 使用 computed 確保 activeIndex 始終與路由同步，避免閃爍
const activeIndex = computed(() => getIndexByPath(route.path));

// const activeIndex = ref(route.name || route.path);

const handleSelect = (index: string) => {
  switch (index) {
    case "1":
      router.push("/");
      break;
    case "2":
      router.push("/chart");
      break;
    case "3":
      router.push("/chart2");
      break;
    case "4":
      router.push("/geo");
      break;
  }
};
</script>

<template>
  <div class="navbar-outer">
    <el-container style="width: 100%">
      <el-main class="navbar-main">
        <el-menu
          mode="horizontal"
          :default-active="activeIndex"
          class="menu"
          @select="handleSelect"
        >
          <el-menu-item index="1">Home</el-menu-item>
          <el-menu-item index="2">echarts1</el-menu-item>
          <el-menu-item index="3">echarts2</el-menu-item>
          <el-menu-item index="4">geo</el-menu-item>
        </el-menu>

        <div class="user"></div>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped lang="scss">
.navbar-outer {
  display: flex;
  width: 100vw;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;

  .navbar-main {
    padding: 0;
    margin: 0;
    width: 100%;

    .menu {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: row;
      width: 100%;
      gap: 20px;
      background: #726e6e;

      .el-menu-item {
        color: #000;
        font-size: 24px;
        font-weight: 400;
        line-height: 2.5;
      }
    }
  }
}
</style>

<style>
.el-menu--horizontal {
  width: 100% !important;
  border-bottom: none !important;
}

.el-menu--horizontal > .el-menu-item.is-active {
  border-bottom: #ebeae5 2px solid !important;
  color: #ebeae5 !important;
}

.el-menu-item:hover,
.el-menu-item:focus {
  background: none !important;
  border-bottom: #ebeae5 2px solid !important;
  color: #000 !important;
}
</style>
