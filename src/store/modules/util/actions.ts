import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'
import { useUserStore } from '@hotwax/dxp-components'

const actions: ActionTree<UtilState, RootState> = {
  async fetchShipmentMethodTypeDesc({ commit, state }) {
    if(Object.keys(state.shipmentMethodTypeDesc)?.length) return;
    
    const shipmentMethodTypeDesc = {} as any;
    try {
      const payload = {
        shipmentMethodTypeId_op: "in",
        fieldsToSelect: ["shipmentMethodTypeId", "description"],
        pageSize: 200,
      }

      const resp = await UtilService.fetchShipmentMethodTypeDesc(payload);
      if(!hasError(resp)) {
        resp.data.map((shipmentMethodInformation: any) => {
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

  async fetchStatusDesc({ commit, state }) {
    let statusDesc = JSON.parse(JSON.stringify(state.statusDesc))
    if(Object.keys(statusDesc)?.length) return;

    try {
      const payload = {
        "statusTypeId": ["ORDER_STATUS", "ORDER_ITEM_STATUS", "SHIPMENT_STATUS", "PURCH_SHIP_STATUS"],
        "statusTypeId_op": "in",
        // "fieldList": ["statusId", "description"],
        "entityName": "StatusItem",
        "pageSize": 200
      }

      const resp = await UtilService.fetchStatusDesc(payload);

      if(!hasError(resp)) {
        statusDesc = {}
        resp.data.map((statusItem: any) => {
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

  async fetchStoreCarrierAndMethods({ commit }, productStoreId) {
    let shipmentMethodsByCarrier = {};

    try {
      const payload = {
        customParametersMap: {
          productStoreId,
          "roleTypeId": "CARRIER",
          "shipmentMethodTypeId": "STOREPICKUP",
          "shipmentMethodTypeId_op": "equals",
          "shipmentMethodTypeId_not": "Y",
          pageIndex: 0,
          pageSize: 100
        },
        dataDocumentId: "ProductStoreShipmentMethod",
        filterByDate: true
      }

      const resp = await UtilService.fetchStoreCarrierAndMethods(payload);

      if(!hasError(resp)) {
        const storeCarrierAndMethods = resp.data.entityValueList;
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
        "roleTypeId": "CARRIER",
        "fieldsToSelect": ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
        "distinct": "Y",
        "pageSize": 20
      });

      if (!hasError(resp)) {
        resp.data.map((carrier: any) => {
          carrierDesc[carrier.partyId] = carrier.groupName || [carrier.firstName, carrier.lastName].filter(Boolean).join(" ") || carrier.partyId;
        })
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
    }
    commit(types.UTIL_CARRIER_DESC_UPDATED, carrierDesc)
  },

  async fetchFacilityAddresses ({ commit, state }, facilityIds) {
    const facilityAddresses = state.facilityAddresses ? JSON.parse(JSON.stringify(state.facilityAddresses)) : {}
    const addresses = [] as any;
    const remainingFacilityIds = [] as any;

    facilityIds.map((facilityId: string) => {
      facilityAddresses[facilityId] ? addresses.push(facilityAddresses[facilityId]) : remainingFacilityIds.push(facilityId)
    })

    if(!remainingFacilityIds?.length) return addresses;

    try {
      const responses = await Promise.allSettled(
        remainingFacilityIds.map((facilityId: any) => UtilService.fetchFacilityAddresses({
          contactMechPurposeTypeId: "PRIMARY_LOCATION",
          contactMechTypeId: "POSTAL_ADDRESS",
          facilityId,
        }))
      );

      const hasFailedResponse = responses.some((response: any) => response.status === 'rejected')
      if (hasFailedResponse) {
        throw responses
      }

      responses.map((response: any) => {
        if (response.value.data?.facilityContactMechs?.length) {
          response.value.data.facilityContactMechs.map((facilityAddress: any) => {
            facilityAddresses[facilityAddress.facilityId] = facilityAddress;
            addresses.push(facilityAddress)
          })
        }
      })
    } catch (error) {
      logger.error(error);
    }
    commit(types.UTIL_FACILITY_ADDRESSES_UPDATED, facilityAddresses)
    return addresses
  },

  async fetchSampleProducts ({ commit, state }) {
    let products = state.sampleProducts ? JSON.parse(JSON.stringify(state.sampleProducts)) : []
    if(products.length) return;

    try {
      const resp = await UtilService.fetchSampleProducts({
        internalName_op: "empty",
        internalName_not: "Y",
        fieldsToSelect: ["internalName", "productId"],
        pageSize: 10
      }) as any;
  
      if(!hasError(resp) && resp.data?.length) {
        const currentEComStore = useUserStore()?.getCurrentEComStore as any;
        let fieldName = currentEComStore?.productIdentifierEnumId || "SKU";
        if(fieldName === "SHOPIFY_BARCODE") fieldName = "UPCA"

        products = resp.data
        products = products.map((product: any) => ({
          [fieldName] : product.internalName,
          quantity : 2
        }))
      } else {
        throw resp.data;
      }
    } catch (error) {
      logger.error(error);
    }
    commit(types.UTIL_SAMPLE_PRODUCTS_UPDATED, products)
  },

  async clearUtilState ({ commit }) {
    commit(types.UTIL_CLEARED)
  }
}

export default actions;