import { GetterTree } from "vuex"
import RootState from "@/store/RootState"
import OrderState from "./OrderState";

const getters: GetterTree <OrderState, RootState> = {
  getOrders (state) {
    return state.list
  },
  getItemsByGroupId: (state) => (orderId: string) => {
    return state.orderItemsList[orderId] || []
  },
  isScrollable: (state) => {
    return state.list.orders?.length > 0 && state.list.orders?.length < state.list.ordersCount
  },
  getQuery(state) {
    return state.query;
  },
  getCurrent(state) {
    return state.current;
  },
}
export default getters;