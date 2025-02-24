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

const fetchOrderItems = async (orderId: string): Promise<any> => {
  let viewIndex = 0;
  let orderItems = [] as any, resp;

  try {
    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params : {
          "entityName": "OrderHeaderItemAndShipGroup",
          "inputFields": {
            "orderId": orderId,
            "orderTypeId": "TRANSFER_ORDER"
          },
          "fieldList": ["orderId", "orderName", "externalId", "orderTypeId", "statusId", "orderDate", "facilityId", "orderFacilityId", "productStoreId", "carrierPartyId", "shipmentMethodTypeId", "oiStatusId", "orderItemSeqId", "quantity", "productId", "shipGroupSeqId", "oisgFacilityId"],
          "viewIndex": viewIndex,
          "viewSize": 250,
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
          orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { ...orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`], receivedQty: doc.totalQuantityAccepted }
        } else {
          orderitemStats[`${doc.orderId}_${doc.orderItemSeqId}`] = { receivedQty: doc.totalQuantityAccepted }
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
          "fieldList": ["shipmentId", "shipmentItemSeqId", "productId", "quantity", "orderItemSeqId"],
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

const fetchShipmentStatuses = async (shipmentIds: any): Promise<any> => {
  const statuses = {} as any;

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
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

    if (!hasError(resp) && resp.data.count) {
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
  return api({
    url: "service/updateOrderItem",
    method: "post",
    data: payload
  });
}

const changeOrderItemStatus = async (payload: any): Promise<any> => {
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

const updateOrderItemShipGroup = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateOrderItemShipGroup",
    method: "POST",
    data: payload
  })
}

const addOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: "service/orderDataSetup",
    method: "POST",
    data: payload
  })
}

export const OrderService = {
  addOrderItem,
  changeOrderItemStatus,
  createOrder,
  fetchFacilityAddresses,
  fetchOrderItems,
  fetchOrderItemStats,
  fetchOrderStatusHistory,
  fetchShipmentStatuses,
  fetchShipments,
  fetchShipmentItems,
  fetchShipmentTrackingDetails,
  findOrder,
  updateOrderItem,
  updateOrderItemShipGroup,
  updateOrderStatus
}