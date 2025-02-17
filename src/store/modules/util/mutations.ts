import { MutationTree } from 'vuex'
import UtilState from './UtilState'
import * as types from './mutation-types'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_SHIPMENT_METHODS_UPDATED] (state, payload) {
    state.shipmentMethodTypeDesc = payload
  },
  [types.UTIL_STATUS_UPDATED] (state, payload) {
    state.statusDesc = payload
  },
  [types.UTIL_SHPMNT_MTHD_BY_CARRIER_UPDATED] (state, payload) {
    state.shipmentMethodsByCarrier = payload
  },
  [types.UTIL_CARRIER_DESC_UPDATED] (state, payload) {
    state.carrierDesc = payload
  },
}
export default mutations;