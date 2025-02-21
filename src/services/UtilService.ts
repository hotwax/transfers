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

const fetchFacilityContactDetails = async (facilityIds: Array<string>): Promise<any> => {
  let resp;
  const addresses = {} as any;

  try {
    resp = await api({
      url: "performFind",
      method: "get",
      params : {
        entityName: "FacilityContactDetailByPurpose",
        inputFields: {
          contactMechPurposeTypeId: "PRIMARY_LOCATION",
          contactMechTypeId: "POSTAL_ADDRESS",
          facilityId: facilityIds,
          facilityId_op: "in"
        },
        fieldList: ["address1", "address2", "city", "countryGeoName", "postalCode", "stateGeoName", "toName", "facilityId", "facilityName"],
        filterByDate: 'Y',
        orderBy: 'fromDate DESC'
      }
    }) as any;

    if (!hasError(resp)) {
      resp.data.docs.map((doc: any) => {
        addresses[doc.facilityId] = doc
      })
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error(error);
  }
  return addresses;
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


export const UtilService = {
  fetchCarriers,
  fetchFacilityContactDetails,
  fetchShipmentMethodTypeDesc,
  fetchStatusDesc,
  fetchStoreCarrierAndMethods,
  getInventoryAvailableByFacility
}