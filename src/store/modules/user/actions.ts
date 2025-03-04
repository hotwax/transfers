import { UserService } from "@/services/UserService"
import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import UserState from "./UserState"
import * as types from "./mutation-types"
import { showToast } from "@/utils"
import logger from "@/logger"
import emitter from "@/event-bus"
import { Settings } from "luxon"
import { translate, useAuthStore, useUserStore, useProductIdentificationStore } from '@hotwax/dxp-components'
import { logout, resetConfig, updateInstanceUrl, updateToken } from '@/adapter'
import { getServerPermissionsFromRules, prepareAppPermissions, resetPermissions, setPermissions } from "@/authorization"

const actions: ActionTree<UserState, RootState> = {

  /**
  * Login user and return token
  */
  async login ({ commit, dispatch }, payload) {
    try {
      const { token, oms } = payload;
      dispatch("setUserInstanceUrl", oms);
      
      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions: Array<string> = await UserService.getUserPermissions({
        permissionIds: [...new Set(serverPermissionsFromRules)]
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);


      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId );
        // If there are any errors or permission check fails do not allow user to login
        if (!hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          logger.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);

      if (userProfile.timeZone) {
        Settings.defaultZone = userProfile.timeZone;
      }

      const ecomStores = await useUserStore().getEComStores()
      useUserStore().eComStores = ecomStores
      await useUserStore().getEComStorePreference("SELECTED_BRAND")
      const preferredStore: any = useUserStore().getCurrentEComStore

      await useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId)
        .catch((error) => logger.error(error));
      
      setPermissions(appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      updateToken(token)
      emitter.emit("dismissLoader")
    } catch (err: any) {
      emitter.emit("dismissLoader")
      showToast(translate(err));
      logger.error("error", err);
      return Promise.reject(new Error(err))
    }
  },

  /**
   * Logout user
   */
  async logout ({ commit }, payload) {
    // store the url on which we need to redirect the user after logout api completes in case of SSO enabled
    let redirectionUrl = ''

    // Calling the logout api to flag the user as logged out, only when user is authorised
    // if the user is already unauthorised then not calling the logout api as it returns 401 again that results in a loop, thus there is no need to call logout api if the user is unauthorised
    if(!payload?.isUserUnauthorised) {
      emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })
      let resp;

      // wrapping the parsing logic in try catch as in some case the logout api makes redirection, and then we are unable to parse the resp and thus the logout process halts
      try {
        resp = await logout();

        // Added logic to remove the `//` from the resp as in case of get request we are having the extra characters and in case of post we are having 403
        resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp)
      } catch(err) {
        logger.error('Error parsing data', err)
      }

      if(resp?.logoutAuthType == 'SAML2SSO') {
        redirectionUrl = resp.logoutUrl
      }
    }

    const authStore = useAuthStore()
    const userStore = useUserStore()
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    await this.dispatch("order/clearOrderState")
    await this.dispatch("product/clearProductState")
    await this.dispatch("util/clearUtilState")
    resetConfig();
    resetPermissions();

    // reset plugin state on logout
    authStore.$reset()
    userStore.$reset()

    // If we get any url in logout api resp then we will redirect the user to the url
    if(redirectionUrl) {
      window.location.href = redirectionUrl
    }

    emitter.emit('dismissLoader')
    return redirectionUrl;
  },


  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, timeZoneId) {
    const current: any = state.current;
    current.userTimeZone = timeZoneId;
    commit(types.USER_INFO_UPDATED, current);
    Settings.defaultZone = current.userTimeZone;
  },

  // Set User Instance Url
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
    updateInstanceUrl(payload)
  },

  updatePwaState({commit}, payload) {
    commit(types.USER_PWA_STATE_UPDATED, payload);
  }
}

export default actions;