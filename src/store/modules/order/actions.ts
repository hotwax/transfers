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

    // Build payload
    const payload = {
      orderByField: state.query.sort,
      pageSize: params.pageSize,
      pageIndex: params.pageIndex,
      fieldsToSelect: ["orderId", "orderName", "facilityId", "orderFacilityId", "orderStatusId", "orderStatusDesc", "orderDate", "orderExternalId"]
    } as any

    // include only non-empty filters from state.query (exclude sort)
    Object.entries(state.query).forEach(([fieldName, fieldValue]) => {
      if(fieldValue != null && fieldValue !== '' && fieldName !== 'sort') {
        payload[fieldName] = fieldValue
      }
    })

    try {
      if(!params.pageIndex || params.pageIndex == 0) commit(types.ORDER_IS_FETCHING_UPDATED, true)
      resp = await OrderService.findTransferOrders(payload)
      if(!hasError(resp)) {
        const orders = resp.data.orders
        ordersList = payload.pageIndex > 0 ? (state.orders).concat(orders) : orders
        ordersCount = resp.data.ordersCount
      } else {
        throw resp.data;
      }
    } catch(error) {
      logger.error(error)
    }
    commit(types.ORDER_LIST_UPDATED, { orders: ordersList, ordersCount });
    if(!params.pageIndex || params.pageIndex == 0) commit(types.ORDER_IS_FETCHING_UPDATED, false)
    return resp;
  },

  async updateAppliedFilters({ commit, dispatch }, { value, filterName }) {
    commit(types.ORDER_FILTERS_UPDATED, { value, filterName })
    await dispatch("findTransferOrders", { pageSize: process.env.VUE_APP_VIEW_SIZE, pageIndex: 0 })
  },
  
  async fetchOrderDetails({ commit, state }, orderId) {
    let orderDetail = {} as any;
    let orderResp, shipmentResp;
    try {
      commit(types.ORDER_CURRENT_UPDATED, { ...state.current, isFetching: true, loadedItems: 0, totalItems: 0 });
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

        const uniqueProductIds = [...new Set(orderDetail.items.map((item:any) => item.productId))];
        const totalProducts = uniqueProductIds.length;
        commit(types.ORDER_CURRENT_UPDATED, { ...orderDetail, isFetching: true, loadedItems: 0, totalItems: totalProducts });

        const productIds = [...uniqueProductIds];
        const batchSize = 250;
        const productIdBatches = [];
        while(productIds.length) {
          productIdBatches.push(productIds.splice(0, batchSize))
        }
        
        let loadedProducts = 0;
        await Promise.allSettled(productIdBatches.map(async (batchIds) => {
          await this.dispatch('product/fetchProducts', { productIds: batchIds });
          loadedProducts += batchIds.length;
          commit(types.ORDER_CURRENT_UPDATED, { ...orderDetail, isFetching: true, loadedItems: loadedProducts, totalItems: totalProducts });
        }));
          
        commit(types.ORDER_CURRENT_UPDATED, { ...orderDetail, isFetching: false });
      } else {
        throw orderResp.data;
      }
    }catch(err:any){
      commit(types.ORDER_CURRENT_UPDATED, { ...state.current, isFetching: false });
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
