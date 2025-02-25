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

export const UtilService = {
  fetchCarriers,
  fetchFacilityAddresses,
  fetchShipmentMethodTypeDesc,
  fetchStatusDesc,
  fetchStoreCarrierAndMethods,
  getInventoryAvailableByFacility
}