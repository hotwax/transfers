import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import * as types from "./mutation-types"
import OrderState from "./OrderState"
import { showToast } from "@/utils"
import { translate } from "@hotwax/dxp-components"
import { prepareOrderQuery } from "@/utils/solrHelper";
import { hasError } from "@/adapter";
import logger from "@/logger"
import { OrderService } from "@/services/OrderService";
import store from "@/store"

const actions: ActionTree<OrderState, RootState> = {
  async findOrders({ commit, state }, params) {
    let resp, orderCount, itemCount;
    let stateOrders = JSON.parse(JSON.stringify(state.list.orders));
    const shipmentMethodTypeIds: Array<string> = []

    const query = prepareOrderQuery({ ...(state.query), ...params })
    try {
      resp = await OrderService.findOrder(query)
      if (!hasError(resp) && resp.data?.grouped[state.query.groupBy]?.groups?.length) {
        const orders = resp.data.grouped[state.query.groupBy]?.groups.map((order: any) => {
          order.orderId = order.doclist.docs[0].orderId
          order.customer = {
            name: order.doclist.docs[0].customerPartyName,
            emailId: order.doclist.docs[0].customerEmailId,
            phoneNumber: order.doclist.docs[0].customerPhoneNumber
          },
          order.orderName = order.doclist.docs[0].orderName
          order.orderDate = order.doclist.docs[0].orderDate
          order.orderStatusId = order.doclist.docs[0].orderStatusId
          order.orderStatusDesc = order.doclist.docs[0].orderStatusDesc
          order.originFacilityId = order.doclist.docs[0].facilityId
          order.originFacilityName = order.doclist.docs[0].facilityName
          order.destinationFacilityId = order.doclist.docs[0].orderFacilityId
          order.destinationFacilityName = order.doclist.docs[0].orderFacilityName

          order.doclist.docs[0].shipmentMethodTypeId && shipmentMethodTypeIds.push(order.doclist.docs[0].shipmentMethodTypeId)
          return order
        })

        orderCount = resp.data.grouped[state.query.groupBy]?.ngroups;
        itemCount = resp.data.grouped[state.query.groupBy]?.matches;

        const status = new Set();
        let productIds: any = new Set();
        const orderItems = [] as any;

        orders.map((order: any) => {
          status.add(order.orderStatusId)
          order.doclist.docs.map((item: any) => {
            status.add(item.orderItemStatusId)
            orderItems.push(item)
            if(item.productId) productIds.add(item.productId)
          })
        })
        productIds = [...productIds]

        // Added check as we are fetching the facets only on first request call and do not fetch facets information on infinite scroll
        if(params?.fetchFacets) {
          const originFacilities = resp.data.facets?.facilityNameFacet?.buckets.map((bucket: any) => bucket.val)
          const destinationFacilities = resp.data.facets?.orderFacilityNameFacet?.buckets.map((bucket: any) => bucket.val)
          const productStores = resp.data.facets?.productStoreIdFacet?.buckets.map((bucket: any) => bucket.val)
          const carriers = resp.data.facets?.carrierPartyIdFacet?.buckets.map((bucket: any) => bucket.val)
          const shipmentMethodTypeIds = resp.data.facets?.shipmentMethodTypeIdFacet?.buckets.map((bucket: any) => bucket.val)
          const statuses = resp.data.facets?.orderStatusDescFacet?.buckets.map((bucket: any) => bucket.val)

        //   commit(types.ORDERLOOKUP_CHANNEL_OPTIONS_UPDATED, channels);
          commit(types.ORDER_PRODUCT_STORE_OPTIONS_UPDATED, productStores);
          commit(types.ORDER_ORIGIN_FACILITY_OPTIONS_UPDATED, originFacilities);
          commit(types.ORDER_DESTINATION_FACILITY_OPTIONS_UPDATED, destinationFacilities);
          commit(types.ORDER_CARRIERS_OPTIONS_UPDATED, carriers);
          commit(types.ORDER_SHIPMENT_METHODS_OPTIONS_UPDATED, shipmentMethodTypeIds);
          commit(types.ORDER_STATUS_OPTIONS_UPDATED, statuses);
        }

        if (query.json.params.start && query.json.params.start > 0) stateOrders = stateOrders.concat(orders)
        else stateOrders = orders
        await this.dispatch("product/fetchProducts", { productIds })
        await this.dispatch("util/fetchShipmentMethodTypeDesc", shipmentMethodTypeIds)
      } else {
        showToast(translate("Failed to fetch orders"));
        throw resp.data;
      }
    } catch(error) {
      logger.error(error)
      // If the filters are changed, we are on first index and if we got some error clear the orders
      if(params?.isFilterUpdated && (!params?.viewIndex || params.viewIndex == 0)) {
        stateOrders = []
        orderCount = 0
        itemCount = 0
      }
    }
    commit(types.ORDER_LIST_UPDATED, { orders: stateOrders, orderCount, itemCount });
    return resp;
  },
  
  async updateAppliedFilters({ commit, dispatch }, payload) {
    commit(types.ORDER_FILTERS_UPDATED, payload)
    const resp = await dispatch("findOrders", { isFilterUpdated: true })
    return resp;
  },
  
  async fetchOrderDetails({ commit, dispatch }, orderId) {
    let orderDetail = {} as any;
    
    let resp;
    try {
      const params = {
        "entityName": "OrderHeaderAndShipGroups",
        "inputFields": {
          "orderId": orderId,
        },
        "fieldList": ["orderId", "orderName", "externalId", "orderTypeId", "statusId", "orderDate", "shipGroupSeqId", "facilityId", "orderFacilityId", "productStoreId", "carrierPartyId", "shipmentMethodTypeId"],
        "viewSize": 1,
        "distinct": "Y"
      }
      
      resp = await OrderService.fetchOrderHeader(params);
      if(!hasError(resp)) {
        orderDetail = resp.data.docs[0]
        const [orderItems,, facilityAddresses] = await Promise.allSettled([OrderService.fetchOrderItems(orderId), this.dispatch('util/fetchStatusDesc', [orderDetail.statusId]), OrderService.fetchFacilityAddresses([orderDetail.facilityId, orderDetail.orderFacilityId]), store.dispatch("util/fetchStoreCarrierAndMethods", orderDetail.productStoreId)])

        if(orderItems.status === "fulfilled") orderDetail["items"] = orderItems.value
        if(facilityAddresses.status === "fulfilled" && facilityAddresses.value?.length) {
          facilityAddresses.value.map((address: any) => {
            if(address.facilityId === orderDetail.facilityId) {
              orderDetail["originFacility"] = address
            } else {
              orderDetail["destinationFacility"] = address
            }
          })
        }

        const statusIds = orderDetail?.items.map((item: any) => item.statusId)
        await this.dispatch('util/fetchStatusDesc', statusIds)

        const productIds = [...new Set(orderDetail.items.map((item:any) => item.productId))];
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
      logger.error(error);
    }   
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
        const [shipmentItems, shipmentRoutes] = await Promise.allSettled([OrderService.fetchShipmentItems(shipmentIds), OrderService.fetchShipmentTrackingDetails(shipmentIds)]) as any;

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
  }
}

export default actions;