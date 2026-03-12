import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import store from "@/store"
import Tabs from "@/views/Tabs.vue"
import { DxpLogin, translate, useAuthStore } from "@hotwax/dxp-components";
import { loader } from '@/user-utils';
import OrderDetail from "@/views/OrderDetail.vue";
import CreateOrder from "@/views/CreateOrder.vue";
import BulkUpload from "@/views/BulkUpload.vue";
import { hasPermission } from "@/authorization";
import { showToast } from "@/utils";

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

const checkPermission = (to: any, from: any, next: any) => {
  if (hasPermission(to.meta.permissionId)) {
    next()
  } else {
    showToast(translate("You do not have permission to view this page"))
  }
}

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
        path: "discrepancies",
        name: "Discrepancies",
        component: () => import("@/views/Discrepancies.vue"),
        meta: {
          permissionId: "APP_DISCREPANCY_REPORT"
        },
        beforeEnter: checkPermission
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
    path: "/bulk-upload",
    name: "BulkUpload",
    component: BulkUpload,
    beforeEnter: [authGuard, checkPermission],
    meta: {
      permissionId: "APP_BULK_UPLOAD"
    }
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