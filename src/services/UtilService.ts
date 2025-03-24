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

export const UtilService = {
  fetchCarriers,
  fetchFacilityAddresses,
  fetchSampleProducts,
  fetchShipmentMethodTypeDesc,
  fetchStatusDesc,
  fetchStoreCarrierAndMethods,
  getInventoryAvailableByFacility
}