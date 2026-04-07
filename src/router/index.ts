import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import Tabs from "@/views/Tabs.vue"
import { commonUtil, translate } from "@common";
import { useAuth } from "@/composables/useAuth";
import OrderDetail from "@/views/OrderDetail.vue";
import CreateOrder from "@/views/CreateOrder.vue";
import BulkUpload from "@/views/BulkUpload.vue";
import { useUserStore } from "@/store/user";
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}

const authGuard = async (to: any, from: any, next: any) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    next('/login')
  }
  next()
};

const loginGuard = (to: any, from: any, next: any) => {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated.value && !to.query?.token && !to.query?.oms) {
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
        path: "discrepancies",
        name: "Discrepancies",
        component: () => import("@/views/Discrepancies.vue"),
        meta: {
          permissionId: "APP_TFNR_DISCREPANCY_REPORT"
        }
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
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_TFNR_BULK_UPLOAD"
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
    component: () => import("@/views/Login.vue"),
    beforeEnter: loginGuard
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from) => {
  const userStore = useUserStore()
  if (to.meta.permissionId && !userStore.hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "tabs/settings";
    else commonUtil.showToast(translate('You do not have permission to access this page'), { position: 'top' });
    return {
      path: redirectToPath,
    }
  }
})

export default router
