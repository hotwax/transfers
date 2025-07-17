import {api,apiClient, hasError} from "@/adapter"
import logger from "@/logger";
import store from '@/store';

const findOrder = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "/solr-query",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
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

const fetchOrderItem = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  let orderItem = {};

  try {
    const resp = await apiClient({
      url: "performFind",
      method: "get",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
      params : {
        "entityName": "OrderHeaderItemAndShipGroup",
        "inputFields": {
          "orderId": payload.orderId,
          "orderTypeId": "TRANSFER_ORDER",
          "productId": payload.productId
        },
        "fieldList": ["orderId", "orderName", "externalId", "orderTypeId", "statusId", "orderDate", "facilityId", "orderFacilityId", "productStoreId", "carrierPartyId", "shipmentMethodTypeId", "oiStatusId", "orderItemSeqId", "quantity", "productId", "shipGroupSeqId", "oisgFacilityId", "statusFlowId"],
        "viewSize": 1,
        "distinct": "Y",
        "noConditionFind": "Y"
      }
    })

    if(!hasError(resp) && resp?.data.docs?.length) {
      orderItem = resp.data.docs[0]
    } else {
      throw resp?.data
    }
  } catch(error: any) {
    logger.error(error)
  }

  return orderItem;
}

const fetchOrderItemStats = async (orderItemsList: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  const orderItems = orderItemsList;
  const shippedQtyRequests = [], receivedQtyRequests = [];
  const orderItemStats = {} as any;

  while(orderItems.length) {
    const batch = orderItems.splice(0,100);
    const orderIds = [] as any, orderItemSeqIds = [] as any, productIds = [] as any;

    batch.map((itemMap: any) => {
      const itemInfo = itemMap.split("_");
      orderIds.push(itemInfo[0])
      orderItemSeqIds.push(itemInfo[1])
      productIds.push(itemInfo[2])
    })

    const shippedQtyParams = {
      inputFields: {
        orderId: orderIds,
        orderId_op: "in",
        orderItemSeqId: orderItemSeqIds,
        orderItemSeqId_op: "in"
      },
      viewSize: 250,
      entityName: 'ShippedItemQuantitySum',
      fieldList: ['orderId', 'orderItemSeqId', 'shippedQuantity']
    }

    const receivedQtyParams = {
      inputFields: {
        orderId: orderIds,
        orderId_op: "in",
        orderItemSeqId: orderItemSeqIds,
        orderItemSeqId_op: "in"
      },
      viewSize: 250,
      entityName: 'ReceivedItemQuantitySum',
      fieldList: ['orderId', 'orderItemSeqId', 'totalQuantityAccepted']
    }
    shippedQtyRequests.push(shippedQtyParams)
    receivedQtyRequests.push(receivedQtyParams)
  }

  const shippedItemQtyResps = await Promise.allSettled(shippedQtyRequests.map((params) => apiClient({
    url: 'performFind',
    method: 'POST',
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: params
  })))

  const receivedItemQtyResps = await Promise.allSettled(receivedQtyRequests.map((params) => apiClient({
    url: 'performFind',
    method: 'POST',
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: params
  })))

  shippedItemQtyResps.map((response: any) => {
    if(response.status === "fulfilled" && !hasError(response.value) && response.value.data?.docs?.length) {
      response.value.data.docs.map((doc: any) => {
        orderItemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { shippedQty: doc.shippedQuantity }
      })
    }
  })

  receivedItemQtyResps.map((response: any) => {
    if(response.status === "fulfilled" && !hasError(response.value) && response.value.data?.docs?.length) {
      response.value.data.docs.map((doc: any) => {
        if(orderItemStats[`${doc.orderId}_${doc.orderItemSeqId}`]) {
          orderItemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { ...orderItemStats[`${doc.orderId}_${doc.orderItemSeqId}`], receivedQty: doc.totalQuantityAccepted }
        } else {
          orderItemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { receivedQty: doc.totalQuantityAccepted }
        }
      })
    }
  })

  return orderItemStats
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
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/updateOrderItem",
    method: "post",
    data: payload
  });
}

const changeOrderItemStatus = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/changeOrderItemStatus",
    method: "post",
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
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/orderDataSetup",
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
    data: payload.orderId
  })
}

const cancelOrder = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/cancelSalesOrder",
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  })
}

export const OrderService = {
  addOrderItem,
  approveOrder,
  cancelOrder,
  changeOrderItemStatus,
  createOrder,
  fetchOrderItem,
  fetchOrderItemStats,
  fetchOrderStatusHistory,
  fetchShipmentStatuses,
  fetchShipments,
  fetchShipmentItems,
  fetchShipmentTrackingDetails,
  fetchTransferOrderDetail,
  fetchShippedTransferShipments,
  findOrder,
  updateOrderItem,
  updateOrderItemShipGroup,
  updateOrderStatus
}