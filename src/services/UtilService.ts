import { api, apiClient } from '@/adapter';
import store from '@/store';

const fetchShipmentMethodTypeDesc = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query
  });
}

const fetchStatusDesc = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query
  });
}

const fetchStoreCarrierAndMethods = async (query: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "post",
    params: query
  });
}

const getInventoryAvailableByFacility = async (query: any): Promise<any> => {

  return api({
    url: "/poorti/getInventoryAvailableByFacility",
    method: "get",
    params: query
  });
}

const fetchCarriers = async (query: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/carrierParties`,
    method: "get",
    params: query
  });
}

const fetchFacilityAddresses = async (params: any): Promise<any> => {
  return api({
    url: `/oms/facilityContactMechs`,
    method: "get",
    params
  })
}

const fetchSampleProducts = async (params: any): Promise<any> => {
  return api({
    url: `/oms/products`,
    method: "get",
    params
  })
}

const fetchProductsAverageCost = async (productIds: any, facilityId: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  if(!productIds.length) return []
  const requests = [], productIdList = productIds, productAverageCostDetail = {} as any;

  while(productIdList.length) {
    const productIds = productIdList.splice(0, 100)
    const params = {
      customParametersMap: {
        facilityId,
        productId: productIds,
        productId_op: "in",
        orderByField: "-fromDate",
        pageIndex: 0,
        pageSize: 100 //There should be more than one active record per product
      },
      dataDocumentId: "ProductWeightedAverageCost",
      filterByDate: true
    }
    requests.push(params)
  }

  const productAverageCostResps = await Promise.allSettled(requests.map((params) => apiClient({
    url: `/oms/dataDocumentView`,
    method: 'POST',
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: params
  })))

  const hasFailedResponse = productAverageCostResps.some((response: any) => response.status !== "fulfilled")
  if(hasFailedResponse) return {};

  productAverageCostResps.map((response: any) => {
    if (response.value.data?.entityValueList?.length) {
      response.value.data.entityValueList.map((item: any) => {
        if (!productAverageCostDetail[item.productId]) productAverageCostDetail[item.productId] = item.averageCost
      })
    }
  })

  return productAverageCostDetail;
}


export const UtilService = {
  fetchCarriers,
  fetchFacilityAddresses,
  fetchProductsAverageCost,
  fetchSampleProducts,
  fetchShipmentMethodTypeDesc,
  fetchStatusDesc,
  fetchStoreCarrierAndMethods,
  getInventoryAvailableByFacility
}