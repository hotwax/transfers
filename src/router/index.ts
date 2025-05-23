import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import store from "@/store"
import Tabs from "@/views/Tabs.vue"
import { DxpLogin, useAuthStore } from "@hotwax/dxp-components";
import { loader } from '@/user-utils';
import OrderDetail from "@/views/OrderDetail.vue";
import CreateOrder from "@/views/CreateOrder.vue";

const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !store.getters['user/isAuthenticated']) {
    await loader.present('Authenticating')
    // TODO use authenticate() when support is there
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    loader.dismiss()
  }
  next()
};

const loginGuard = (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !to.query?.token && !to.query?.oms) {
    next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/tabs/transfers"
  },
  {
    path: "/tabs",
    component: Tabs,
    children: [
      {
        path: "",
        redirect: "/tabs/transfers"
      },
      {
        path: "transfers",
        name: "Transfers",
        component: () => import("@/views/Transfers.vue")
      },
      {
        path: "settings",
        name: "Settings",
        component: () => import("@/views/Settings.vue")
      }
    ],
    beforeEnter: authGuard
  },
  {
    path: "/create-order",
    name: "CreateOrder",
    component: CreateOrder,
    beforeEnter: authGuard
  },
  {
    path: "/order-detail/:orderId",
    name: "OrderDetail",
    component: OrderDetail,
    props: true,
    beforeEnter: authGuard
  },
  {
    path: "/login",
    name: "Login",
    component: DxpLogin,
    beforeEnter: loginGuard
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router