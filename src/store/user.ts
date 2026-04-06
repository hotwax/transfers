import { defineStore } from "pinia";
import { api, client, hasError } from "@/adapter";
import { showToast } from "@/utils";
import logger from "@/logger";
import emitter from "@/event-bus";
import { Settings } from "luxon";
import { translate, useAuthStore, useUserStore as useDxpUserStore, useProductIdentificationStore } from "@hotwax/dxp-components";
import { logout, resetConfig, updateInstanceUrl, updateToken } from "@/adapter";
import { getServerPermissionsFromRules, prepareAppPermissions, resetPermissions, setPermissions } from "@/authorization";
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";

interface UserPwaState {
  updateExists: boolean;
  registration: any;
}

interface UserOmsRedirectionInfo {
  url: string;
  token: string;
}

interface UserState {
  token: string;
  current: any;
  instanceUrl: string;
  permissions: any[];
  pwaState: UserPwaState;
  omsRedirectionInfo: UserOmsRedirectionInfo;
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    token: "",
    current: null,
    instanceUrl: "",
    permissions: [],
    pwaState: {
      updateExists: false,
      registration: null
    },
    omsRedirectionInfo: {
      url: "",
      token: ""
    }
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isUserAuthenticated: (state) => !!(state.token && state.current),
    getUserToken: (state) => state.token,
    getUserProfile: (state) => state.current,
    getInstanceUrl: (state) => state.instanceUrl,
    getBaseUrl: (state) => {
      const baseURL = state.instanceUrl;
      return baseURL.startsWith("http") ? `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
    },
    getUserPermissions: (state) => state.permissions,
    getPwaState: (state) => state.pwaState,
    getOmsBaseUrl: (state) => {
      const url = state.omsRedirectionInfo.url;
      return url.startsWith("http") ? url.includes("/api") ? url : `${url}/api/` : `https://${url}.hotwax.io/api/`;
    },
    getOmsRedirectionInfo: (state) => state.omsRedirectionInfo
  },
  actions: {
    async login(payload: any) {
      try {
        const { token, oms, omsRedirectionUrl } = payload;
        this.setUserInstanceUrl(oms);

        const permissionId = process.env.VUE_APP_PERMISSION_ID;
        const serverPermissionsFromRules = getServerPermissionsFromRules();
        if (permissionId) serverPermissionsFromRules.push(permissionId);

        const permissionPayload = {
          permissionIds: [...new Set(serverPermissionsFromRules)]
        };
        const permissionsBaseUrl = omsRedirectionUrl.startsWith("http") ? omsRedirectionUrl.includes("/api") ? omsRedirectionUrl : `${omsRedirectionUrl}/api/` : `https://${omsRedirectionUrl}.hotwax.io/api/`;
        let serverPermissions = [] as any;
        if (permissionPayload.permissionIds.length > 0) {
          const viewSize = 200;
          const resp = await client({
            url: "getPermissions",
            method: "post",
            baseURL: permissionsBaseUrl,
            data: {
              viewIndex: 0,
              viewSize,
              permissionIds: permissionPayload.permissionIds
            },
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json"
            }
          });

          if (resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
            serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
            const total = resp.data.count;
            const remainingPermissions = total - serverPermissions.length;
            if (remainingPermissions > 0) {
              const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + (remainingPermissions % viewSize !== 0 ? 1 : 0);
              const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => client({
                url: "getPermissions",
                method: "post",
                baseURL: permissionsBaseUrl,
                data: {
                  viewIndex: index + 1,
                  viewSize,
                  permissionIds: permissionPayload.permissionIds
                },
                headers: {
                  Authorization: "Bearer " + token,
                  "Content-Type": "application/json"
                }
              })));
              serverPermissions = responses.reduce((permissions: any, response: any) => {
                if (response.status === 200 && !hasError(response) && response.data?.docs) {
                  permissions.push(...response.data.docs.map((permission: any) => permission.permissionId));
                }
                return permissions;
              }, serverPermissions);
            }
          }
        }
        const appPermissions = prepareAppPermissions(serverPermissions);

        if (permissionId) {
          const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId);
          if (!hasPermission) {
            const permissionError = "You do not have permission to access the app.";
            showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        const userProfileResp = await client({
          url: "admin/user/profile",
          method: "get",
          baseURL: this.getBaseUrl,
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
          }
        });
        if (hasError(userProfileResp)) {
          return Promise.reject("Error getting user profile: " + JSON.stringify(userProfileResp.data));
        }
        const userProfile = userProfileResp.data;

        if (userProfile.timeZone) {
          Settings.defaultZone = userProfile.timeZone;
        }

        const dxpUserStore = useDxpUserStore();
        const productStores = await dxpUserStore.getEComStores();
        dxpUserStore.eComStores = productStores;
        await dxpUserStore.getEComStorePreference("SELECTED_BRAND", userProfile.userId);
        const preferredStore: any = dxpUserStore.getCurrentEComStore;

        if (omsRedirectionUrl && token) {
          this.setOmsRedirectionInfo({ url: omsRedirectionUrl, token });
        }

        updateToken(token);
        const utilStore = useUtilStore();
        await Promise.all([
          useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId).catch((error) => logger.error(error)),
          utilStore.fetchFacilitiesByCurrentStore(preferredStore.productStoreId).catch((error) => logger.error(error))
        ]);

        setPermissions(appPermissions);
        this.token = token;
        this.current = userProfile;
        this.permissions = appPermissions;
        emitter.emit("dismissLoader");
      } catch (error: any) {
        emitter.emit("dismissLoader");
        showToast(translate(error));
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async logout(payload: any) {
      let redirectionUrl = "";

      if (!payload?.isUserUnauthorised) {
        emitter.emit("presentLoader", { message: "Logging out" });
        let resp;

        try {
          resp = await logout();
          resp = JSON.parse(resp.startsWith("//") ? resp.replace("//", "") : resp);
        } catch (error) {
          logger.error("Error parsing data", error);
        }

        if (resp?.logoutAuthType === "SAML2SSO") {
          redirectionUrl = resp.logoutUrl;
        }
      }

      const authStore = useAuthStore();
      const dxpUserStore = useDxpUserStore();

      this.$patch({
        token: "",
        current: null,
        permissions: [],
        omsRedirectionInfo: {
          url: "",
          token: ""
        }
      });

      await useOrderStore().clearOrderState();
      await useProductStore().clearProductState();
      await useUtilStore().clearUtilState();
      resetConfig();
      resetPermissions();

      authStore.$reset();
      dxpUserStore.$reset();

      if (redirectionUrl) {
        window.location.href = redirectionUrl;
      }

      emitter.emit("dismissLoader");
      return redirectionUrl;
    },
    setOmsRedirectionInfo(payload: { url: string; token: string }) {
      this.omsRedirectionInfo = payload;
    },
    async setUserTimeZone(timeZoneId: string) {
      const current = this.current ? { ...this.current } : null;
      if (!current) return;

      try {
        await api({
          url: "admin/user/profile",
          method: "POST",
          data: { userId: current.userId, timeZone: timeZoneId }
        });
        current.timeZone = timeZoneId;
        this.current = current;
        Settings.defaultZone = current.timeZone;
        showToast(translate("Time zone updated successfully"));
      } catch (error) {
        logger.error(error);
        showToast(translate("Failed to update time zone"));
      }
    },
    setUserInstanceUrl(payload: string) {
      this.instanceUrl = payload;
      updateInstanceUrl(payload);
    },
    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration;
      this.pwaState.updateExists = payload.updateExists;
    }
  },
  persist: true
});
