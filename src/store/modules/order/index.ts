import actions from "./actions"
import getters from "./getters"
import mutations from "./mutations"
import { Module } from "vuex"
import OrderState from "./OrderState"
import RootState from "@/store/RootState"

const orderModule: Module<OrderState, RootState> = {
  namespaced: true,
  state: {
    list: {
      orders: [],
      orderCount: 0,
      itemCount: 0
    },
    query: {
      queryString: "",
      productStore: "",
      originFacility: "",
      destinationFacility: "",
      status: "",
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      sort: 'orderDate desc',
      groupBy: "orderId"
    },
    productStoreOptions: [],
    originFacilityOptions: [],
    destinationFacilityOptions: [],
    orderStatuses: [],
    carrierOptions: [],
    shipmentMethodOptions: [],
    current: {}
  },
  getters,
  actions,
  mutations,
}

export default orderModule;