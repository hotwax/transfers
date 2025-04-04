import { api, hasError } from '@/adapter';
import logger from '@/logger';

const fetchShipmentMethodTypeDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchStatusDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchStoreCarrierAndMethods = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const getInventoryAvailableByFacility = async (query: any): Promise <any> => {
  return api({
    url: "service/getInventoryAvailableByFacility",
    method: "post",
    data: query
  });
}

const fetchCarriers = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchFacilityAddresses = async (params: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchSampleProducts = async (params: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchStoreGlobalIdentifier = async (store: any): Promise<any> => {
  if(!store.productStoreId) return "SKU";
  let globalIdentifier = "SKU";

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params : {
        "entityName": "ProductStore",
        "inputFields": {
          productStoreId: store.productStoreId
        },
        "fieldList": ["productStoreId", "productIdentifierEnumId"],
        "viewSize": 1,
        "distinct": "Y",
        "noConditionFind": "Y"
      }
    })

    if(!hasError(resp) && resp?.data.docs?.length) {
      globalIdentifier = resp.data.docs[0]?.productIdentifierEnumId
    } else {
      throw resp?.data
    }
  } catch(error: any) {
    logger.error(error)
  }

  return globalIdentifier;
}

export const UtilService = {
  fetchCarriers,
  fetchFacilityAddresses,
  fetchStoreGlobalIdentifier,
  fetchSampleProducts,
  fetchShipmentMethodTypeDesc,
  fetchStatusDesc,
  fetchStoreCarrierAndMethods,
  getInventoryAvailableByFacility
}