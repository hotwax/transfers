import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import * as types from "./mutation-types"
import OrderState from "./OrderState"
import { hasError } from "@/adapter";
import logger from "@/logger"
import { OrderService } from "@/services/OrderService";
import store from "@/store"

const actions: ActionTree<OrderState, RootState> = {
  async findTransferOrders({ commit, state }, params) {
    let resp, ordersList, ordersCount = 0;
    const productIds = [] as any;

    // Build payload
    const payload = {
      orderByField: state.query.sort,
      pageSize: params.pageSize,
      pageIndex: params.pageIndex,
      ...(params.groupByConfig?.selectFields?.length && {
        fieldsToSelect: params.groupByConfig.selectFields.join(',')
      })
    } as any

    // include only non-empty filters from state.query (exclude groupBy and sort)
    Object.entries(state.query).forEach(([fieldName, fieldValue]) => {
      if(fieldValue != null && fieldValue !== '' && fieldName !== 'groupBy' && fieldName !== 'sort') {
        payload[fieldName] = fieldValue
      }
    })

    try {
      resp = await OrderService.findTransferOrders(payload)
      console.log("🚀 ~ resp:", resp.data)
      if(!hasError(resp)) {
        // groupBy cases: ORDER_ID / DESTINATION / ORIGIN → single field
        // DESTINATION_PRODUCT / ORIGIN_PRODUCT → multiple fields joined with '-'
        const groupFields = params.groupByConfig?.groupingFields

        const orders = resp.data.orders.map((order: any) => {
          if(order.productId) productIds.push(order.productId)
          return {
            ...order,
            // We are using this field in ion-accordion to identify the expanded accordion
            groupValue: groupFields?.map((field: any) => order[field]).join('-')
          }
        })

        if(productIds.length) {
          await this.dispatch('product/fetchProducts', { productIds })
        }

        ordersList = (state.orders).concat(orders)
        ordersCount = resp.data.ordersCount
      } else {
        throw resp.data;
      }
    } catch(error) {
      logger.error(error)
    }
    commit(types.ORDER_LIST_UPDATED, { orders: ordersList, ordersCount });
    return resp;
  },

  // Fetch transfer order items, group them by orderId, accumulate quantities, and update state
  async findTransferOrderItems({ commit, state }, { groupValue, groupByConfig}) {
    // Filter out already fetched orderIds to avoid duplicate calls
    const productIds: any = new Set()
    const groupedItems: any = [];
    let resp, pageIndex = 0
    const pageSize = 100

    try {
      // Build API payload from grouping fields
      const values = groupValue.split(groupByConfig?.groupValueSeparator)
      const payload: any = {}
      groupByConfig?.groupingFields.forEach((field: string, key: number) => payload[field] = values[key])
      // Fetch items in batches until last page
      do {
        payload.pageSize = pageSize
        payload.pageIndex = pageIndex
        resp = await OrderService.findTransferOrderItems(payload)
        console.log("🚀 ~ resp:", resp.data)

        if(!hasError(resp) && resp?.data?.transferOrderItems?.length) {
          // If grouping by ORDER_ID → no grouping
          if(groupByConfig?.id === "ORDER_ID") {
            resp.data.transferOrderItems.forEach((item: any) => {
              if(item.productId) productIds.add(item.productId)
              groupedItems.push({
                ...item,
                shippedQty: item.shippedQuantity || 0,
                receivedQty: item.receivedQuantity || 0,
              })
            })
          } else {
            // Group items by orderId & accumulate quantities
            resp.data.transferOrderItems.forEach((item: any) => {
              if(item.productId) productIds.add(item.productId)
              const key = item.orderId
              if(!groupedItems[key]) {
                groupedItems[key] = {
                  ...item,
                  shippedQty: item.shippedQuantity || 0,
                  receivedQty: item.receivedQuantity || 0,
                  quantity: item.quantity || 0
                }
              } else {
                groupedItems[key].quantity += item.quantity || 0
                groupedItems[key].shippedQty += item.shippedQuantity || 0
                groupedItems[key].receivedQty += item.receivedQuantity || 0
              }
            })
          }
          pageIndex++
        } else {
          throw resp.data
        }
      } while (resp?.data?.transferOrderItems?.length >= pageSize)

      const items = Object.values(groupedItems)

      // Fetch product details in batches (to avoid payload limit)
      const productIdArray = [...productIds]
      const batchSize = 250, productIdBatches = []
      while (productIdArray.length) {
        productIdBatches.push(productIdArray.splice(0, batchSize))
      }
      await Promise.allSettled(productIdBatches.map((productIds) => this.dispatch('product/fetchProducts', { productIds })))

      commit(types.ORDER_ITEMS_LIST_UPDATED, { groupValue, items })
      return resp
    } catch (error) {
      logger.error(error)
      commit(types.ORDER_ITEMS_LIST_UPDATED, { groupValue, items: [] })
      return resp
    }
  },

  async updateAppliedFilters({ commit, dispatch }, { value, filterName, groupByConfig }) {
    commit(types.ORDER_FILTERS_UPDATED, { value, filterName })
    await dispatch("findTransferOrders", { pageSize: process.env.VUE_APP_VIEW_SIZE, pageIndex: 0, groupByConfig })
  },
  
  async fetchOrderDetails({ commit }, orderId) {
    let orderDetail = {} as any;
    let orderResp, shipmentResp;
    try {
      // Fetch main transfer order details
      orderResp = await OrderService.fetchTransferOrderDetail(orderId);
      if (!hasError(orderResp)) {
        orderDetail = orderResp.data.order || {};
        orderDetail={
          ...orderDetail,
          shipGroupSeqId: orderDetail.items[0]?.shipGroupSeqId,
        };

        const shipmentReceiptResp = await OrderService.fetchOrderReceipts({ orderId });
        if (!hasError(shipmentReceiptResp) && shipmentReceiptResp.data.length) {
          orderDetail.receipts = shipmentReceiptResp.data.reduce((groups: any, receipt: any) => {
            if (!receipt?.datetimeReceived) return groups;
            const key = receipt.datetimeReceived;
            (groups[key] ||= []).push(receipt);
            return groups;
          }, {});
        }

        // Fetch additional shipment data
        shipmentResp = await OrderService.fetchShippedTransferShipments({ orderId, shipmentStatusId: "SHIPMENT_SHIPPED" });
        if (!hasError(shipmentResp)) {
          const shipmentData = shipmentResp.data || {};
          // Merge order and shipment data fields into orderDetail
          orderDetail = {
            ...orderDetail,
            shipments: shipmentData.shipments || [],
          };
        }
        // Add shippedQty and receivedQty to each item
        if (orderDetail.items && Array.isArray(orderDetail.items)) {
          orderDetail.items = orderDetail.items.map((item: any) => ({
            ...item,
            shippedQty: item.totalIssuedQuantity,
            receivedQty: item.totalReceivedQuantity,
          }));
        }
        const [facilityAddresses] = await Promise.allSettled([store.dispatch("util/fetchFacilityAddresses", [orderDetail.facilityId, orderDetail.orderFacilityId]), store.dispatch("util/fetchStoreCarrierAndMethods", orderDetail.productStoreId)])

        if(facilityAddresses.status === "fulfilled" && facilityAddresses.value?.length) {
          facilityAddresses.value.map((address: any) => {
            if(address.facilityId === orderDetail.facilityId) {
              orderDetail["originFacility"] = address
            } else {
              orderDetail["destinationFacility"] = address
            }
          })
        }

        const productIds = [...new Set(orderDetail.items.map((item:any) => item.productId))];
        const batchSize = 250;
        const productIdBatches = [];
        while(productIds.length) {
          productIdBatches.push(productIds.splice(0, batchSize))
        }
          await Promise.allSettled([productIdBatches.map(async (productIds) => await this.dispatch('product/fetchProducts', { productIds }))])
          commit(types.ORDER_CURRENT_UPDATED, orderDetail);
      } else {
        throw orderResp.data;
      }
    }catch(err:any){
      logger.error("error", err);
      return Promise.reject(new Error(err));
    }
  },

  async fetchOrderShipments ({ commit, state }, orderId) {
    let shipments = [];

    try {
      const resp = await OrderService.fetchShipments({
        "entityName": "Shipment",
        "inputFields": {
          "primaryOrderId": orderId,
          "statusId": "SHIPMENT_CANCELLED",
          "statusId_op": "notEqual"
        },
        "fieldList": ["shipmentId", "shipmentTypeId", "statusId", "carrierPartyId", "shipmentMethodTypeId"],
        "viewSize": 200,
        "distinct": "Y"
      })

      if(!hasError(resp)) {
        shipments = resp.data.docs

        const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId)
        const [shipmentItems, shipmentRoutes, shipmentStatuses] = await Promise.allSettled([OrderService.fetchShipmentItems(shipmentIds), OrderService.fetchShipmentTrackingDetails(shipmentIds), OrderService.fetchShipmentStatuses(shipmentIds)]) as any;

        const productIds = [...new Set(shipmentItems.value.map((item:any) => item.productId))];
        const batchSize = 250;
        const productIdBatches = [];
        while(productIds.length) {
          productIdBatches.push(productIds.splice(0, batchSize))
        }
        Promise.allSettled([productIdBatches.map(async (productIds) => await this.dispatch('product/fetchProducts', { productIds }))])

        shipments.map((shipment: any) => {
          const items = [] as any;
          if(shipmentItems.status === "fulfilled" && shipmentItems.value?.length) {
            shipmentItems.value.map((item: any) => {
              if(item.shipmentId === shipment.shipmentId) items.push(item);
            })
          }
          shipment["items"] = items;

          if(shipmentRoutes.status === "fulfilled" && shipmentRoutes.value?.length) {
            const trackingInfo = shipmentRoutes.value.find((shipmentRoute: any) => shipmentRoute.shipmentId === shipment.shipmentId);
            if(trackingInfo) {
              shipment["trackingCode"] = trackingInfo?.trackingIdNumber
            }
          }

          if(shipmentStatuses.status === "fulfilled" && shipmentStatuses.value[shipment.shipmentId]) {
            shipment["shippedDate"] = shipmentStatuses.value[shipment.shipmentId]
          }
        })
      } else {
        throw resp.data;
      }
    } catch(error: any) {
      logger.error(error);
    }
    commit(types.ORDER_CURRENT_UPDATED, {...state.current, shipments});
  },
  
  async updateCurrent ({ commit }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, payload);
  },

  async updateOrdersList ({ commit }, payload) {
    commit(types.ORDER_LIST_UPDATED, payload);
  },

  async clearOrderState ({ commit }) {
    commit(types.ORDER_CLEARED)
  },

  async fetchOrderReceipts({ commit }, orderId: string){
    const pageSize = Number(process.env.VUE_APP_VIEW_SIZE) ;
    const payload={ 
      orderId: orderId,
      orderByField: "-datetimeReceived",
      pageSize
    }
    let resp ;

    try{
      resp = await OrderService.fetchOrderReceipts(payload);
      if (!hasError(resp)) {
        commit(types.ORDER_RECEIPTS,resp.data);
      }else{
        throw resp.data;
      }
    }catch(error:any){
      commit(types.ORDER_RECEIPTS, [] );
      logger.error("error", error);
      return Promise.reject(error);
    }
    return resp;
  }
}

export default actions;