import { api, commonUtil, cookieHelper, i18n, logger, translate } from "@common";
import { defineStore } from "pinia"
import { DateTime, Settings } from "luxon"
import { useAuth } from "@common/composables/useAuth";
import { useProductStore } from "@/store/productStore";
import { useProductStore as useProduct } from "@/store/product";
import { useOrderStore } from "@/store/order";
import { useUtilStore } from "@/store/util";

interface UserState {
  permissions: any[]
  current: any
  pwaState: {
    updateExists: boolean
    registration: any
  }
  timeZones: any[]
  oms: any
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    permissions: [],
    current: {},
    pwaState: {
      updateExists: false,
      registration: null
    },
    timeZones: [],
    oms: ""
  }),
  getters: {
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.current.timeZone,
    getUserPermissions(state: UserState) {
      return state.permissions
    },
    getUserProfile(state: UserState) {
      return state.current
    },
    getPwaState(state: UserState) {
      return state.pwaState
    },
    hasPermission: (state: UserState) => (permissionId: string): boolean => {
      const permissions = state.permissions;

      if (!permissionId) {
        return true;
      }

      // Handle OR/AND logic in permission string
      if (permissionId.includes(' OR ')) {
        const parts = permissionId.split(' OR ');
        return parts.some(part => useUserStore().hasPermission(part.trim()));
      }

      if (permissionId.includes(' AND ')) {
        const parts = permissionId.split(' AND ');
        return parts.every(part => useUserStore().hasPermission(part.trim()));
      }

      return permissions.includes(permissionId);
    }
  },
  actions: {
    updateUserInfo(payload: any) {
      this.current = { ...this.current, ...payload }
    },
    setPermissionsState(payload: any) {
      this.permissions = payload
    },
    setPwaState(payload: any) {
      this.pwaState.registration = payload.registration
      this.pwaState.updateExists = payload.updateExists
    },
    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration;
      this.pwaState.updateExists = payload.updateExists;
    },
    async fetchUserProfile() {
      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
        }) as any;
        this.current = userProfileResp.data
        useAuth().updateUserId(this.current.userId)

        if (this.current.timeZone) {
          Settings.defaultZone = this.current.timeZone;
        }

        this.oms = cookieHelper().get("oms") || '';
      } catch (error: any) {
        commonUtil.showToast(translate("Failed to fetch user profile information"));
        console.error("error", error);
        useAuth().clearAuth();
        return Promise.reject(new Error(error));
      }
    },
    async fetchPermissions() {
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID
      const serverPermissions = [] as string[]
      const viewSize = 50
      let viewIndex = 0

      try {
        let resp
        do {
          resp = await api({
            url: commonUtil.isMoqui() ? "admin/user/permissions" : "getPermissions",
            method: "get",
            baseURL: commonUtil.getOmsURL(),
            params: { viewIndex, viewSize }
          }) as any

          if (resp.status === 200 && resp.data.docs?.length && !commonUtil.hasError(resp)) {
            serverPermissions.push(...resp.data.docs.map((permission: any) => permission.permissionId))
            viewIndex++
          } else {
            resp = null
          }
        } while (resp)

        if(permissionId) {
          const hasPermission = serverPermissions.includes(permissionId)
          if(!hasPermission) {
            const permissionError = "You do not have permission to access the app."
            await commonUtil.showToast(translate(permissionError))
            logger.error("error", permissionError)
            return Promise.reject(new Error(permissionError))
          }
        }

        this.permissions = serverPermissions
      } catch (error: any) {
        return Promise.reject(error)
      }
    },

    async setUserTimeZone(tzId: string) {
      try {
        await api({
          url: "admin/user/profile",
          method: "POST",
          data: { userId: this.current.userId, timeZone: tzId },
        });
        this.updateUserInfo({ userTimeZone: tzId })
        this.current.timeZone = tzId
      } catch (error: any) {
        console.error("Failed to set user time zone", error);
        commonUtil.showToast(translate("Failed to set user time zone"));
      }
    },
    async getAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if (this.timeZones.length) {
        return;
      }

      try {
        const resp = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          cache: true
        }) as any;
        if (resp.status === 200 && !commonUtil.hasError(resp)) {
          this.timeZones = resp.data.timeZones.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
        }
      } catch (err) {
        console.error('Error', err)
      }
    },
    async postLogin() {
      try {
        const productStore = useProductStore();
        await this.fetchUserProfile();
        await this.fetchPermissions();
        await productStore.fetchAllProductStores();
        await productStore.fetchProductStorePreference();
        await productStore.fetchProductStoreFacilities(productStore.getCurrentProductStore.productStoreId);
        await productStore.fetchProductStoreSettings(productStore.getCurrentProductStore.productStoreId);
      } catch (error: any) {
        return Promise.reject(error);
      }
    },
    async postLogout() {
      useOrderStore().$reset();
      useProduct().$reset();
      useProductStore().$reset();
      this.$reset();
      useUtilStore().$reset();
    }
  },
  persist: true
})
