import { GetterTree } from "vuex"
import RootState from "@/store/RootState"
import OrderState from "./OrderState";

const getters: GetterTree <OrderState, RootState> = {
  getOrders (state) {
    return state.list
  },
  isScrollable: (state) => {
    return state.list.orders.length > 0 && state.list.orders.length < state.list.orderCount
  },
  getQuery(state) {
    return state.query;
  },
  getProductStoreOptions(state) {
    return state.productStoreOptions;
  },
  getOriginFacilityOptions(state) {
    return state.originFacilityOptions;
  },
  getDestinationFacilityOptions(state) {
    return state.destinationFacilityOptions;
  },
  getOrderStatuses(state) {
    return state.orderStatuses;
  },
  getCarrierOptions(state) {
    return state.carrierOptions;
  },
  getShipmentMethodOptions(state) {
    return state.shipmentMethodOptions;
  },
  getCurrent(state) {
    return state.current;
  },
}
export default getters;