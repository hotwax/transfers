import { api } from '@/adapter';

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

const fetchProductsAverageCost = async (productIds: any, facilityId: any): Promise<any> => {
  if(!productIds.length) return []
  const requests = [], productIdList = productIds, productAverageCostDetail = {} as any;

  while(productIdList.length) {
    const productIds = productIdList.splice(0, 100)
    const params = {
      inputFields: {
        facilityId,
        productId: productIds,
        productId_op: "in",
        productAverageCostTypeId: "WEIGHTED_AVG_COST"
      },
      viewSize: 250, // maximum view size
      entityName: 'ProductAverageCost',
      filterByDate: "Y",
      orderBy: "fromDate DESC",
      fieldList: ["productId", "averageCost"]
    }
    requests.push(params)
  }

  const productAverageCostResps = await Promise.allSettled(requests.map((params) => api({
    url: 'performFind',
    method: 'POST',
    data: params
  })))

  const hasFailedResponse = productAverageCostResps.some((response: any) => response.status !== "fulfilled")
  if(hasFailedResponse) return {};

  productAverageCostResps.map((response: any) => {
    if(response.value.data?.docs?.length) {
      response.value.data.docs.map((item: any) => {
        if(!productAverageCostDetail[item.productId]) productAverageCostDetail[item.productId] = item.averageCost
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