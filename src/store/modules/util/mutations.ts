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
  [types.UTIL_FACILITIES_BY_PRODUCT_STORE_UPDATED] (state, payload) {
    state.facilities = payload
  },
  [types.UTIL_FACILITY_ADDRESSES_UPDATED] (state, payload) {
    state.facilityAddresses = payload
  },
  [types.UTIL_SAMPLE_PRODUCTS_UPDATED] (state, payload) {
    state.sampleProducts = payload
  },
  [types.UTIL_CLEARED] (state) {
    state.statusDesc = {}
    state.shipmentMethodTypeDesc = {}
    state.shipmentMethodsByCarrier = {}
    state.carrierDesc = {}
    state.facilityAddresses = {}
    state.sampleProducts = []
  },
}
export default mutations;