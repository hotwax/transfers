import actions from "./actions"
import getters from "./getters"
import mutations from "./mutations"
import { Module } from "vuex"
import OrderState from "./OrderState"
import RootState from "@/store/RootState"

const orderModule: Module<OrderState, RootState> = {
  namespaced: true,
  state: {
    orders: [],
    ordersCount: 0,
    query: {
      orderName: "",
      productStoreId: "",
      originFacilityId: "",
      destinationFacilityId: "",
      orderStatusId: "",
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      sort: 'orderDate desc',
      statusFlowId: ""
    },
    current: {},
    orderReceipts: []
  },
  getters,
  actions,
  mutations,
}

export default orderModule;