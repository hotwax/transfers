import actions from "./actions"
import getters from "./getters"
import mutations from "./mutations"
import { Module } from "vuex"
import UserState from "./UserState"
import RootState from "@/store/RootState"

const userModule: Module<UserState, RootState> = {
  namespaced: true,
  state: {
    token: "",
    current: null,
    instanceUrl: "",
    permissions: [],
    pwaState: {
      updateExists: false,
      registration: null,
    }
  },
  getters,
  actions,
  mutations,
}

export default userModule;