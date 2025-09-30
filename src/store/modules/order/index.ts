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
    orderItemsList: [],
    query: {
      orderName: "",
      productStoreId: "",
      facilityId: "",
      orderFacilityId: "",
      orderStatusId: "",
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      sort: 'orderDate desc',
      groupBy: "ORDER_ID"
    },
    current: {},
    orderReceipts: []
  },
  getters,
  actions,
  mutations,
}

export default orderModule;