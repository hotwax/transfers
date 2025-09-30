import { GetterTree } from "vuex"
import RootState from "@/store/RootState"
import OrderState from "./OrderState";

const getters: GetterTree <OrderState, RootState> = {
  getOrders (state) {
    return state.orders
  },
  getItemsByGroupId: (state) => (orderId: string) => {
    return state.orderItemsList[orderId] || []
  },
  isScrollable: (state) => {
    return state.orders?.length > 0 && state.orders?.length < state.ordersCount
  },
  getQuery(state) {
    return state.query;
  },
  getCurrent(state) {
    return state.current;
  },
  getOrderReceipts(state){
    return state.orderReceipts;
  }
}
export default getters;