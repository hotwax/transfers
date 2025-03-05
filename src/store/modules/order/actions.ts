import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import * as types from "./mutation-types"
import OrderState from "./OrderState"
import { prepareOrderQuery } from "@/utils/solrHelper";
import { hasError } from "@/adapter";
import logger from "@/logger"
import { OrderService } from "@/services/OrderService";
import store from "@/store"

const actions: ActionTree<OrderState, RootState> = {
  async findOrders({ commit, state }, params) {
    let resp, orderCount, itemCount;
    let cachedOrders = JSON.parse(JSON.stringify(state.list.orders));
    const shipmentMethodTypeIds: Array<string> = []

    const query = prepareOrderQuery({ ...(state.query), ...params })
    try {
      resp = await OrderService.findOrder(query)
      if (!hasError(resp) && resp.data?.grouped[state.query.groupBy]?.groups?.length) {
        let productIds: any = new Set();
        const orderItemsList = [] as any;
        const orders = resp.data.grouped[state.query.groupBy]?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0];

          order.orderId = orderItem.orderId
          order.customer = {
            name: orderItem.customerPartyName,
            emailId: orderItem.customerEmailId,
            phoneNumber: orderItem.customerPhoneNumber
          },
          order.orderName = orderItem.orderName
          order.orderDate = orderItem.orderDate
          order.orderStatusId = orderItem.orderStatusId
          order.orderStatusDesc = orderItem.orderStatusDesc
          order.originFacilityId = orderItem.facilityId
          order.originFacilityName = orderItem.facilityName
          order.destinationFacilityId = orderItem.orderFacilityId
          order.destinationFacilityName = orderItem.orderFacilityName

          order.shipmentMethodTypeId && shipmentMethodTypeIds.push(orderItem.shipmentMethodTypeId)

          if(state.query.groupBy === "originFacilityProductId" || state.query.groupBy === "destinationFacilityProductId") {
            order.productId = orderItem.productId
          }

          order.doclist.docs.map((item: any) => {
            orderItemsList.push(`${item.orderId}_${item.orderItemSeqId}`)
            if(item.productId) productIds.add(item.productId)
          })

          return order
        })

        orderCount = resp.data.grouped[state.query.groupBy]?.ngroups;
        itemCount = resp.data.grouped[state.query.groupBy]?.matches;

        productIds = [...productIds]

        // Added check as we are fetching the facets only on first request call and do not fetch facets information on infinite scroll
        if(params?.fetchFacets) {
          const originFacilities = resp.data.facets?.facilityNameFacet?.buckets.map((bucket: any) => bucket.val)
          const destinationFacilities = resp.data.facets?.orderFacilityNameFacet?.buckets.map((bucket: any) => bucket.val)
          const productStores = resp.data.facets?.productStoreIdFacet?.buckets.map((bucket: any) => bucket.val)
          const carriers = resp.data.facets?.carrierPartyIdFacet?.buckets.map((bucket: any) => bucket.val)
          const shipmentMethodTypeIds = resp.data.facets?.shipmentMethodTypeIdFacet?.buckets.map((bucket: any) => bucket.val)
          const statuses = resp.data.facets?.orderStatusDescFacet?.buckets.map((bucket: any) => bucket.val)

          commit(types.ORDER_PRODUCT_STORE_OPTIONS_UPDATED, productStores);
          commit(types.ORDER_ORIGIN_FACILITY_OPTIONS_UPDATED, originFacilities);
          commit(types.ORDER_DESTINATION_FACILITY_OPTIONS_UPDATED, destinationFacilities);
          commit(types.ORDER_CARRIERS_OPTIONS_UPDATED, carriers);
          commit(types.ORDER_SHIPMENT_METHODS_OPTIONS_UPDATED, shipmentMethodTypeIds);
          commit(types.ORDER_STATUS_OPTIONS_UPDATED, statuses);
        }


        const orderItemStats = await OrderService.fetchOrderItemStats(orderItemsList);
        orders.map((order: any) => {
          let totalOrdered = 0, totalShipped = 0, totalReceived = 0;
          order.doclist.docs.map((item: any) => {
            if(orderItemStats[`${item.orderId}_${item.orderItemSeqId}`]) {
              item["shippedQty"] = orderItemStats[`${item.orderId}_${item.orderItemSeqId}`].shippedQty
              item["receivedQty"] = orderItemStats[`${item.orderId}_${item.orderItemSeqId}`].receivedQty
            }
            if(item.quantity) totalOrdered = totalOrdered + item.quantity            
            if(item.shippedQty) totalShipped = totalShipped + item.shippedQty            
            if(item.receivedQty) totalReceived = totalReceived + item.receivedQty            
          })

          order["totalOrdered"] = totalOrdered
          order["totalShipped"] = totalShipped
          order["totalReceived"] = totalReceived
        })

        if (query.json.params.start && query.json.params.start > 0) cachedOrders = cachedOrders.concat(orders)
        else cachedOrders = orders
        await this.dispatch("util/fetchShipmentMethodTypeDesc")
        const batchSize = 250;
        const productIdBatches = [];
        while(productIds.length) {
          productIdBatches.push(productIds.splice(0, batchSize))
        }
        await Promise.allSettled([productIdBatches.map(async (productIds) => await this.dispatch('product/fetchProducts', { productIds }))])
      } else {
        throw resp.data;
      }
    } catch(error) {
      logger.error(error)
      // If the filters are changed, we are on first index and if we got some error clear the orders
      if(params?.isFilterUpdated && (!params?.viewIndex || params.viewIndex == 0)) {
        cachedOrders = []
        orderCount = 0
        itemCount = 0
      }
    }
    commit(types.ORDER_LIST_UPDATED, { orders: cachedOrders, orderCount, itemCount });
    return resp;
  },
  
  async updateAppliedFilters({ commit, dispatch }, payload) {
    commit(types.ORDER_FILTERS_UPDATED, payload)
    await dispatch("findOrders", { isFilterUpdated: true })
  },
  
  async fetchOrderDetails({ commit }, orderId) {
    let orderDetail = {} as any;

    const orderItems = await OrderService.fetchOrderItems(orderId);
    if(!orderItems.length) {
      commit(types.ORDER_CURRENT_UPDATED, {});
      return;
    }

    orderDetail = {
      orderId: orderItems[0].orderId,
      orderName: orderItems[0].orderName,
      orderDate: orderItems[0].orderDate,
      facilityId: orderItems[0].oisgFacilityId,
      orderFacilityId: orderItems[0].orderFacilityId,
      productStoreId: orderItems[0].productStoreId,
      carrierPartyId: orderItems[0].carrierPartyId,
      shipmentMethodTypeId: orderItems[0].shipmentMethodTypeId,
      shipGroupSeqId: orderItems[0].shipGroupSeqId,
      statusId: orderItems[0].statusId,
      statusFlowId: orderItems[0].statusFlowId,
      items: orderItems
    }

    const [facilityAddresses] = await Promise.allSettled([store.dispatch("util/fetchFacilityAddresses", [orderDetail.facilityId, orderDetail.orderFacilityId]), store.dispatch("util/fetchStoreCarrierAndMethods", orderDetail.productStoreId)])

    const orderItemsList = orderItems.map((item: any) => `${item.orderId}_${item.orderItemSeqId}`);
    const orderItemStats = await OrderService.fetchOrderItemStats(orderItemsList);

    orderDetail.items.map((item: any) => {
      item.facilityId = item.oisgFacilityId
      if(orderItemStats[`${item.orderId}_${item.orderItemSeqId}`]) {
        item["shippedQty"] = orderItemStats[`${item.orderId}_${item.orderItemSeqId}`].shippedQty
        item["receivedQty"] = orderItemStats[`${item.orderId}_${item.orderItemSeqId}`].receivedQty
      }
    })

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
  }
}

export default actions;