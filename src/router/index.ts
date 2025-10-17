import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: "/",
            name: "Home",
            component: () => import("../page/home.vue")
        },
        {
            path: "/chart",
            name: "Chart",
            component: () => import("../page/chart.vue")
        },
        {
            path: "/chart2",
            name: "Chart2",
            component: () => import("../page/my-echarts.vue")
        }
    ]
})

export default router;