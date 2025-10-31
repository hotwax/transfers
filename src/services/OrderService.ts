import {api,apiClient, hasError} from "@/adapter"
import logger from "@/logger";
import store from '@/store';

const findTransferOrders = async (payload: any): Promise<any> => {
  return api({
    url: 'oms/transferOrders/grouped',
    method: "GET",
    params: payload
  });
}

const findTransferOrderItems = async (payload: any): Promise<any> => {
  return api({
    url: `oms/transferOrders/items`,
    method: "GET",
    params: payload
  });
}

const createOrder = async (payload: any): Promise<any> => {
 
  return api({
    url: 'oms/transferOrders',
    method: "post",
    data: payload
  });
}

const fetchTransferOrderDetail = async (orderId: string): Promise<any> => {
  return api({
    url: `/oms/transferOrders/${orderId}`,
    method: "get",
  });
};
const fetchShippedTransferShipments = async (params: any): Promise<any> => {

  return api({
    url: "poorti/transferShipments",
    method: "get",
    params
  });
}

const fetchShipments = async (params: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return await apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  })
}

const fetchOrderStatusHistory = async (params: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return await apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  })
}

const fetchShipmentItems = async (shipmentIds: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  let viewIndex = 0;
  let shipmentItems = [] as any, resp;

  try {
    do {
      resp = await apiClient({
        url: "performFind",
        method: "get",
        baseURL,
        headers: {
          "Authorization": "Bearer " + omstoken,
          "Content-Type": "application/json"
        },
        params: {
          "entityName": "ShipmentItemDetail",
          inputFields : {
            shipmentId: shipmentIds,
            shipmentId_op: "in"
          },
          "fieldList": ["shipmentId", "shipmentItemSeqId", "productId", "quantity", "orderItemSeqId"],
          "viewIndex": viewIndex,
          "viewSize": 250,
          "distinct": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.docs?.length) {
        shipmentItems = shipmentItems.concat(resp.data.docs)
        viewIndex++;
      } else {
        throw resp.data;
      }
    }
    while (resp.data.docs.length >= 250);
  } catch (error) {
    logger.error(error);
  }
  return shipmentItems
}

const fetchShipmentTrackingDetails = async (shipmentIds: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  let shipmentRouteSegs = [] as any;

  try {
    const resp = await apiClient({
      url: "performFind",
      method: "get",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
      params: {
        "entityName": "ShipmentAndRouteSegment",
        inputFields : {
          shipmentId: shipmentIds,
          shipmentId_op: "in",
          carrierServiceStatusId: "SHRSCS_VOIDED",
          carrierServiceStatusId_op: "notEqual"
        },
        "fieldList": ["shipmentId", "trackingIdNumber"],
        "viewSize": 250,
        "distinct": "Y"
      }
    }) as any;

    if (!hasError(resp) && resp.data.docs?.length) {
      shipmentRouteSegs = resp.data.docs
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error(error);
  }
  return shipmentRouteSegs
}

const fetchShipmentStatuses = async (shipmentIds: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  const statuses = {} as any;

  try {
    const resp = await apiClient({
      url: "performFind",
      method: "get",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
      params: {
        "entityName": "ShipmentStatus",
        inputFields : {
          shipmentId: shipmentIds,
          shipmentId_op: "in",
          statusId: ["SHIPMENT_SHIPPED", "PURCH_SHIP_SHIPPED"]
        },
        "fieldList": ["shipmentId", "statusId", "statusDate"],
        "viewSize": 250,
        "distinct": "Y"
      }
    }) as any;

    if (!hasError(resp) && resp.data.docs?.length) {
      resp.data.docs.map((status: any) => {
        statuses[status.shipmentId] = status.statusDate
      })
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error(error);
  }
  return statuses
}

const updateOrderItem = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "oms/transferOrders/orderItem",
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateOrderStatus = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/changeOrderStatus",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateOrderItemShipGroup = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/updateShipmentCarrierAndMethod`, //should handle the update of OISG, SRG, SPRG if needed
    method: "PUT",
    data: payload
  })
}

const addOrderItem = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "oms/transferOrders/orderItem",
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  })
}

const approveOrder = async (payload: any): Promise<any> => { 
  return api({
    url: `oms/transferOrders/${payload.orderId}/approve`,
    method: "post",
  })
}

const approveWarehouseFulfillOrder = async (payload: any): Promise<any> => { 
  return api({
    url: `oms/transferOrders/${payload.orderId}/approveWhFulfill`,
    method: "post",
  })
}

const cancelOrder = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: `oms/transferOrders/${payload.orderId}/cancel`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  })
}
const fetchOrderReceipts = async (params :any): Promise<any> => {
  return api({
    url: `poorti/transferOrders/${params.orderId}/receipts`,
    method: "GET",
    params: params
  });
}

export const OrderService = {
  addOrderItem,
  approveOrder,
  approveWarehouseFulfillOrder,
  cancelOrder,
  createOrder,
  fetchOrderStatusHistory,
  fetchShipmentStatuses,
  fetchShipments,
  fetchShipmentItems,
  fetchShipmentTrackingDetails,
  fetchTransferOrderDetail,
  fetchShippedTransferShipments,
  findTransferOrders,
  findTransferOrderItems,
  updateOrderItem,
  updateOrderItemShipGroup,
  updateOrderStatus,
  fetchOrderReceipts
}