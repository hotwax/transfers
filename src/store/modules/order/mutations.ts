import { MutationTree } from "vuex"
import OrderState from "./OrderState"
import * as types from "./mutation-types"

const mutations: MutationTree <OrderState> = {
  [types.ORDER_LIST_UPDATED] (state, payload) {
    state.list.orders = payload.orders
    state.list.orderCount = payload.orderCount
    state.list.itemCount = payload.itemCount
  },
  [types.ORDER_FILTERS_UPDATED] (state, payload) {
    state.query[payload.filterName] = payload.value
  },
  [types.ORDER_PRODUCT_STORE_OPTIONS_UPDATED] (state, payload) {
    state.productStoreOptions = payload
  },
  [types.ORDER_ORIGIN_FACILITY_OPTIONS_UPDATED] (state, payload) {
    state.originFacilityOptions = payload
  },
  [types.ORDER_DESTINATION_FACILITY_OPTIONS_UPDATED] (state, payload) {
    state.destinationFacilityOptions = payload
  },
  [types.ORDER_STATUS_OPTIONS_UPDATED] (state, payload) {
    state.orderStatuses = payload
  },
  [types.ORDER_CARRIERS_OPTIONS_UPDATED] (state, payload) {
    state.carrierOptions = payload
  },
  [types.ORDER_SHIPMENT_METHODS_OPTIONS_UPDATED] (state, payload) {
    state.shipmentMethodOptions = payload
  },
  [types.ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload
  },
  [types.ORDER_CLEARED] (state) {
    state.list = {
      orders: [],
      orderCount: 0,
      itemCount: 0
    }
    state.query = {
      queryString: "",
      productStore: "",
      originFacility: "",
      destinationFacility: "",
      status: "",
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      sort: 'orderDate desc',
      groupBy: "orderId"
    }
    state.productStoreOptions = []
    state.originFacilityOptions = []
    state.destinationFacilityOptions = []
    state.orderStatuses = []
    state.carrierOptions = []
    state.shipmentMethodOptions = []
    state.current = {}
  },
}
export default mutations;