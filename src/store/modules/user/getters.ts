import { GetterTree } from "vuex"
import UserState from "./UserState"
import RootState from "@/store/RootState"

const getters: GetterTree <UserState, RootState> = {
  isAuthenticated(state) {
    return !!state.token;
  },
  isUserAuthenticated(state) {
    return state.token && state.current
  },
  getUserToken(state) {
    return state.token
  },
  getUserProfile(state) {
    return state.current
  },
  getInstanceUrl(state) {
    return state.instanceUrl;
  },
  getBaseUrl(state) {
    const baseURL = state.instanceUrl;
    return baseURL.startsWith("http") ? `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
  },
  getUserPermissions (state) {
    return state.permissions;
  },
  getPwaState (state) {
    return state.pwaState;
  },
  getOmsBaseUrl (state) {
    const url = state.omsRedirectionUrl
    return url.startsWith('http') ? url.includes('/api') ? url : `${url}/api/` : `https://${url}.hotwax.io/api/`;
  },
}
export default getters;