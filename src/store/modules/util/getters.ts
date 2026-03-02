import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getShipmentMethodDesc: (state) => (shipmentMethodId: string) => {
    return state.shipmentMethodTypeDesc[shipmentMethodId] ? state.shipmentMethodTypeDesc[shipmentMethodId] : shipmentMethodId
  },
  getShipmentMethods (state) {
    return state.shipmentMethodTypeDesc
  },
  getStatusDesc: (state) => (statusId: string) => {
    return state.statusDesc[statusId] ? state.statusDesc[statusId] : statusId
  },
  getShipmentMethodsByCarrier (state) {
    return state.shipmentMethodsByCarrier
  },
  getCarrierDesc: (state) => (partyId: string) => {
    return state.carrierDesc[partyId] ? state.carrierDesc[partyId] : partyId
  },
  getCarriers (state) {
    return state.carrierDesc
  },
  getSampleProducts (state) {
    return state.sampleProducts
  },
  getFacilitiesByProductStore (state) {
    return state.facilities
  }
}
export default getters;