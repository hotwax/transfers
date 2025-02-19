import {api, hasError} from "@/adapter"
import logger from "@/logger";

const findOrder = async (payload: any): Promise<any> => {
  return api({
    url: "/solr-query",
    method: "post",
    data: payload
  });
}

const createOrder = async (payload: any): Promise<any> => {
  return api({
    url: "service/createSalesOrder",
    method: "post",
    data: payload
  });
}

const fetchOrderHeader = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchOrderItems = async (orderId: string): Promise<any> => {
  let viewIndex = 0;
  let orderItems = [] as any, resp;

  try {
    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params : {
          "entityName": "OrderItemAndProduct",
          "inputFields": {
            "orderId": orderId,
          },
          "fieldList": ["orderId", "orderItemSeqId", "statusId", "shipGroupSeqId", "productId", "productName", "internalName", "quantity"],
          "viewIndex": viewIndex,
          "viewSize": 250,  // maximum records we could have
          "distinct": "Y",
          "noConditionFind": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.count) {
        orderItems = orderItems.concat(resp.data.docs)
        viewIndex++;
      } else {
        throw resp.data;
      }
    }
    while (resp.data.docs.length >= 250);
  } catch (error) {
    logger.error(error);
  }
  return orderItems
}

const fetchOrderItemStats = async (orderItemsList: any): Promise<any> => {
  const orderItems = orderItemsList;
  const shippedQtyRequests = [], receivedQtyRequests = [];
  const orderitemStats = {} as any;

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
      viewSize: 250, // maximum view size
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
      viewSize: 250, // maximum view size
      entityName: 'ReceivedItemQuantitySum',
      fieldList: ['orderId', 'orderItemSeqId', 'receivedQuantity']
    }
    shippedQtyRequests.push(shippedQtyParams)
    receivedQtyRequests.push(receivedQtyParams)
  }

  const shippedItemQtyResps = await Promise.allSettled(shippedQtyRequests.map((params) => api({
    url: 'performFind',
    method: 'POST',
    data: params
  })))

  const receivedItemQtyResps = await Promise.allSettled(receivedQtyRequests.map((params) => api({
    url: 'performFind',
    method: 'POST',
    data: params
  })))

  shippedItemQtyResps.map((response: any) => {
    if(response.status === "fulfilled" && !hasError(response.value) && response.value.data?.docs?.length) {
      response.value.data.docs.map((doc: any) => {
        orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { shippedQty: doc.shippedQuantity }
      })
    }
  })

  receivedItemQtyResps.map((response: any) => {
    if(response.status === "fulfilled" && !hasError(response.value) && response.value.data?.docs?.length) {
      response.value.data.docs.map((doc: any) => {
        if(orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`]) {
          orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { ...orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`], receivedQty: doc.receivedQuantity }
        } else {
          orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { receivedQty: doc.receivedQuantity }
        }
      })
    }
  })

  return orderitemStats
}

const fetchFacilityAddresses = async (facilityIds: any): Promise<any> => {
  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params : {
        inputFields: {
          contactMechPurposeTypeId: "PRIMARY_LOCATION",
          contactMechTypeId: "POSTAL_ADDRESS",
          facilityId: facilityIds,
          facilityId_op: "in"
        },
        entityName: "FacilityContactDetailByPurpose",
        orderBy: 'fromDate DESC',
        filterByDate: 'Y',
        fieldList: ['address1', 'address2', 'city', 'countryGeoName', 'postalCode', 'stateGeoName', 'facilityId', 'facilityName'],
        viewSize: 2
      }
    }) as any;

    if(!hasError(resp) && resp.data.count) {
      return resp.data.docs
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error(error);
  }
  return []
}

const fetchShipments = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchOrderStatusHistory = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchShipmentItems = async (shipmentIds: any): Promise<any> => {
  let viewIndex = 0;
  let shipmentItems = [] as any, resp;

  try {
    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params: {
          "entityName": "ShipmentItem",
          inputFields : {
            shipmentId: shipmentIds,
            shipmentId_op: "in"
          },
          "fieldList": ["shipmentId", "shipmentItemSeqId", "productId", "quantity", "createdStamp"],
          "viewIndex": viewIndex,
          "viewSize": 250,
          "distinct": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.count) {
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
  let shipmentRouteSegs = [] as any;

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
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

    if (!hasError(resp) && resp.data.count) {
      shipmentRouteSegs = resp.data.docs
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error(error);
  }
  return shipmentRouteSegs
}

const updateOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: "service/changeOrderItemStatus",
    method: "post",
    data: payload
  });
}

const updateOrderStatus = async (payload: any): Promise<any> => {
  return api({
    url: "service/changeOrderStatus",
    method: "post",
    data: payload
  });
}

export const OrderService = {
  createOrder,
  fetchFacilityAddresses,
  fetchOrderHeader,
  fetchOrderItems,
  fetchOrderItemStats,
  fetchOrderStatusHistory,
  fetchShipments,
  fetchShipmentItems,
  fetchShipmentTrackingDetails,
  findOrder,
  updateOrderItem,
  updateOrderStatus
}