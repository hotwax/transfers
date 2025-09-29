import { MutationTree } from "vuex"
import OrderState from "./OrderState"
import * as types from "./mutation-types"

const mutations: MutationTree <OrderState> = {
  [types.ORDER_LIST_UPDATED] (state, payload) {
    state.orders = payload.orders
    state.ordersCount = payload.ordersCount
  },
  [types.ORDER_ITEMS_LIST_UPDATED] (state, payload) {
    state.orderItemsList[payload.groupValue] = payload.items
  },
  [types.ORDER_FILTERS_UPDATED] (state, payload) {
    state.query[payload.filterName] = payload.value
  },
  [types.ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload
  },
  [types.ORDER_CLEARED] (state) {
    state.orders = []
    state.ordersCount = 0
    state.orderReceipts = []
    state.query = {
      orderName: "",
      productStoreId: "",
      facilityId: "",
      orderFacilityId: "",
      orderStatusId: "",
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      sort: 'orderDate desc',
      groupBy: "ORDER_ID"
    }
    state.current = {}
  },
  [types.ORDER_RECEIPTS]( state , payload ){
    state.orderReceipts = payload;
  }
}
export default mutations;