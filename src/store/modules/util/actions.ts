import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'

const actions: ActionTree<UtilState, RootState> = {
  async fetchShipmentMethodTypeDesc({ commit, state }) {
    if(Object.keys(state.shipmentMethodTypeDesc)?.length) return;
    
    const shipmentMethodTypeDesc = {} as any;
    try {
      const payload = {
        "fieldList": ["shipmentMethodTypeId", "description"],
        "entityName": "ShipmentMethodType",
        "viewSize": 200
      }

      const resp = await UtilService.fetchShipmentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        resp.data.docs.map((shipmentMethodInformation: any) => {
          shipmentMethodTypeDesc[shipmentMethodInformation.shipmentMethodTypeId] = shipmentMethodInformation.description
        })

      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching shipment description', err)
    }

    commit(types.UTIL_SHIPMENT_METHODS_UPDATED, shipmentMethodTypeDesc)
    return shipmentMethodTypeDesc;
  },

  async fetchStatusDesc({ commit, state }, statusIds) {
    let statusDesc = JSON.parse(JSON.stringify(state.statusDesc))
    if(Object.keys(statusDesc)?.length) return;

    try {
      const payload = {
        "inputFields": {
          "statusTypeId": ["ORDER_STATUS", "ORDER_ITEM_STATUS"],
          "statusTypeId_op": "in"
        },
        "fieldList": ["statusId", "description"],
        "entityName": "StatusItem",
        "viewSize": 200
      }

      const resp = await UtilService.fetchStatusDesc(payload);

      if(!hasError(resp)) {
        statusDesc = {}
        resp.data.docs.map((statusItem: any) => {
          statusDesc[statusItem.statusId] = statusItem.description
        })

        commit(types.UTIL_STATUS_UPDATED, statusDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching status description', err)
    }

    return statusDesc;
  },

  async fetchStoreCarrierAndMethods({ commit, state }, productStoreId) {
    let shipmentMethodsByCarrier = {};

    try {
      const payload = {
        "inputFields": {
          productStoreId,
          "roleTypeId": "CARRIER",
          "shipmentMethodTypeId": "STOREPICKUP",
          "shipmentMethodTypeId_op": "notEqual"
        },
        "fieldList": ["description", "partyId", "shipmentMethodTypeId"],
        "noConditionFind": "Y",
        "entityName": "ProductStoreShipmentMethView",
        "filterByDate": "Y",
        "distinct": "Y"
      }

      const resp = await UtilService.fetchStoreCarrierAndMethods(payload);

      if(!hasError(resp)) {
        const storeCarrierAndMethods = resp.data.docs;
        shipmentMethodsByCarrier = storeCarrierAndMethods.reduce((shipmentMethodsByCarrier: any, storeCarrierAndMethod: any) => {
          const { partyId, shipmentMethodTypeId, description } = storeCarrierAndMethod;

          if(!shipmentMethodsByCarrier[partyId]) shipmentMethodsByCarrier[partyId] = []
          shipmentMethodsByCarrier[partyId].push({ shipmentMethodTypeId, description })

          return shipmentMethodsByCarrier
        }, {})
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching status description', err)
    }
    commit(types.UTIL_SHPMNT_MTHD_BY_CARRIER_UPDATED, shipmentMethodsByCarrier)
  },

  async fetchCarriersDetail ({ commit, state }) {
    if(Object.keys(state.carrierDesc)?.length) return;
    const carrierDesc = {} as any;

    try {
      const resp = await UtilService.fetchCarriers({
        "entityName": "PartyRoleAndPartyDetail",
        "inputFields": {
          "roleTypeId": "CARRIER"
        },
        "fieldList": ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
        "distinct": "Y",
        "noConditionFind": "Y"
      });

      if (!hasError(resp)) {
        resp.data.docs.map((carrier: any) => {
          carrierDesc[carrier.partyId] = carrier.partyTypeId === "PERSON" ? `${carrier.firstName} ${carrier.lastName}` : carrier.groupName
        })
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
    }
    commit(types.UTIL_CARRIER_DESC_UPDATED, carrierDesc)
  },

  async clearUtilState ({ commit }) {
    commit(types.UTIL_CLEARED)
  }
}

export default actions;