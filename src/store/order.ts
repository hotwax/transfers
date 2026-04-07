import { defineStore } from "pinia";
import { api, commonUtil, cookieHelper } from "@common";
import { logger } from "@common";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util";
import { useUserStore } from "@/store/user";

interface OrderQueryState {
  orderName: string;
  productStoreId: string;
  facilityId: string;
  orderFacilityId: string;
  orderStatusId: string;
  carrierPartyId: string;
  shipmentMethodTypeId: string;
  sort: string;
  groupBy: string;
  statusFlowId: string;
}

interface OrderState {
  orders: any[];
  ordersCount: number;
  orderItemsList: Record<string, any[]>;
  query: OrderQueryState;
  current: any;
  orderReceipts: any[];
}

export const useOrderStore = defineStore("order", {
  state: (): OrderState => ({
    orders: [],
    ordersCount: 0,
    orderItemsList: {},
    query: {
      orderName: "",
      productStoreId: "",
      facilityId: "",
      orderFacilityId: "",
      orderStatusId: "",
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      sort: "orderDate desc",
      groupBy: "ORDER_ID",
      statusFlowId: ""
    },
    current: {},
    orderReceipts: []
  }),
  getters: {
    getOrders: (state) => state.orders,
    getItemsByGroupId: (state) => (orderId: string) => state.orderItemsList[orderId] || [],
    isScrollable: (state) => state.orders?.length > 0 && state.orders?.length < state.ordersCount,
    getQuery: (state) => state.query,
    getCurrent: (state) => state.current,
    getOrderReceipts: (state) => state.orderReceipts
  },
  actions: {
    async fetchOrderStatusHistory(params: any): Promise<any> {
      const userStore = useUserStore();
      return api({
        url: "performFind",
        method: "get",
        params
      });
    },
    async updateOrderItem(payload: any): Promise<any> {
      const userStore = useUserStore();
      return api({
        url: "oms/transferOrders/orderItem",
        method: "PUT",
        data: payload
      });
    },
    async cancelOrderItem(orderId: string, orderItemSeqId: string, cancelOrder: boolean): Promise<any> {
      return api({
        url: `oms/transferOrders/${orderId}/items/${orderItemSeqId}/status`,
        method: "put",
        data: { statusId: "ITEM_CANCELLED", checkCancelCompleteOrder: cancelOrder }
      });
    },
    async updateOrderItemShipGroup(payload: any): Promise<any> {
      return api({
        url: "/poorti/updateShipmentCarrierAndMethod",
        method: "PUT",
        data: payload
      });
    },
    async addOrderItem(payload: any): Promise<any> {
      const userStore = useUserStore();
      return api({
        url: "oms/transferOrders/orderItem",
        method: "POST",
        data: payload
      });
    },
    async createOrder(payload: any): Promise<any> {
      return api({ url: "oms/transferOrders", method: "post", data: payload });
    },
    async approveOrder(payload: any): Promise<any> {
      return api({ url: `oms/transferOrders/${payload.orderId}/approve`, method: "post" });
    },
    async approveWarehouseFulfillOrder(payload: any): Promise<any> {
      return api({ url: `oms/transferOrders/${payload.orderId}/approveWhFulfill`, method: "POST" });
    },
    async cancelOrder(payload: any): Promise<any> {
      const userStore = useUserStore();
      return api({
        url: `oms/transferOrders/${payload.orderId}/cancel`,
        method: "POST"
      });
    },
    async createTransferOrderShipment(payload: any): Promise<any> {
      return api({ url: "poorti/transferShipments", method: "post", data: payload });
    },
    async shipTransferOrderShipment(payload: any): Promise<any> {
      return api({ url: `poorti/transferShipments/${payload.shipmentId}/ship`, method: "post", data: payload });
    },
    async receiveTransferOrder(payload: any): Promise<any> {
      return api({ url: `poorti/transferOrders/${payload.orderId}/receipts`, method: "post", data: payload });
    },
    async closeFulfillment(payload: any): Promise<any> {
      return api({ url: `poorti/transferOrders/${payload.orderId}/closeFulfillment`, method: "POST", data: payload });
    },
    async uploadTransferOrders(payload: any): Promise<any> {
      return api({ url: "admin/uploadDataManagerFile", method: "post", ...payload });
    },
    async fetchDiscrepancies(payload: any): Promise<any> {
      return api({ url: "poorti/transferOrders/discrepancies", method: "GET", params: payload });
    },
    async fetchMisShippedItems(payload: any): Promise<any> {
      return api({ url: "poorti/transferOrders/misShippedItems", method: "GET", params: payload });
    },
    async findTransferOrders(params: any) {
      let resp;
      let ordersList = [] as any[];
      let ordersCount = 0;
      const productIds = [] as string[];
      const product = useProduct();
      const oms = cookieHelper().get("oms");
      const baseURL = oms ? (oms.startsWith?.("http") ? (oms.endsWith("/") ? oms : `${oms}/`) : `https://${oms}.hotwax.io/`) : "";

      const payload = {
        orderByField: this.query.sort,
        pageSize: params.pageSize,
        pageIndex: params.pageIndex,
        ...(params.groupByConfig?.selectFields?.length && {
          fieldsToSelect: params.groupByConfig.selectFields.join(",")
        })
      } as any;

      Object.entries(this.query).forEach(([fieldName, fieldValue]) => {
        if (fieldValue != null && fieldValue !== "" && fieldName !== "groupBy" && fieldName !== "sort") {
          payload[fieldName] = fieldValue;
        }
      });

      try {
        resp = await api({ url: "oms/transferOrders/grouped", method: "GET", params: payload });
        if (!commonUtil.hasError(resp)) {
          const groupFields = params.groupByConfig?.groupingFields;
          const orders = resp.data.orders.map((order: any) => {
            if (order.productId) productIds.push(order.productId);
            return {
              ...order,
              groupValue: groupFields?.map((field: any) => order[field]).join("-")
            };
          });

          if (productIds.length) {
            await product.fetchProducts({ productIds });
          }

          ordersList = payload.pageIndex > 0 ? this.orders.concat(orders) : orders;
          ordersCount = resp.data.ordersCount;
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error(error);
      }

      this.updateOrdersList({ orders: ordersList, ordersCount });
      return resp;
    },
    async findTransferOrderItems({ groupValue, groupByConfig }: { groupValue: string; groupByConfig: any }) {
      const productIds = new Set<string>();
      const groupedItems: any = [];
      let resp;
      let pageIndex = 0;
      const pageSize = 100;
      const product = useProduct();

      try {
        const values = groupValue.split(groupByConfig?.groupValueSeparator);
        const payload: any = {};
        groupByConfig?.groupingFields.forEach((field: string, key: number) => {
          payload[field] = values[key];
        });

        do {
          payload.pageSize = pageSize;
          payload.pageIndex = pageIndex;
          resp = await api({ url: "oms/transferOrders/items", method: "GET", params: payload });

          if (!commonUtil.hasError(resp) && resp.data.response?.docs?.length) {
            if (groupByConfig?.id === "ORDER_ID") {
              resp.data.transferOrderItems.forEach((item: any) => {
                if (item.productId) productIds.add(item.productId);
                groupedItems.push({
                  ...item,
                  shippedQty: item.shippedQuantity || 0,
                  receivedQty: item.receivedQuantity || 0
                });
              });
            } else {
              resp.data.transferOrderItems.forEach((item: any) => {
                if (item.productId) productIds.add(item.productId);
                const key = item.orderId;
                if (!groupedItems[key]) {
                  groupedItems[key] = {
                    ...item,
                    shippedQty: item.shippedQuantity || 0,
                    receivedQty: item.receivedQuantity || 0,
                    quantity: item.quantity || 0
                  };
                } else {
                  groupedItems[key].quantity += item.quantity || 0;
                  groupedItems[key].shippedQty += item.shippedQuantity || 0;
                  groupedItems[key].receivedQty += item.receivedQuantity || 0;
                }
              });
            }
            pageIndex++;
          } else {
            throw resp.data;
          }
        } while (resp?.data?.transferOrderItems?.length >= pageSize);

        const items = Object.values(groupedItems);
        const productIdArray = [...productIds];
        const batchSize = 250;
        const productIdBatches = [] as string[][];
        while (productIdArray.length) {
          productIdBatches.push(productIdArray.splice(0, batchSize));
        }
        await Promise.allSettled(productIdBatches.map((batch) => product.fetchProducts({ productIds: batch })));

        this.orderItemsList[groupValue] = items as any[];
        return resp;
      } catch (error) {
        logger.error(error);
        this.orderItemsList[groupValue] = [];
        return resp;
      }
    },
    async updateAppliedFilters({ value, filterName, groupByConfig }: { value: any; filterName: string; groupByConfig: any }) {
      (this.query as Record<string, any>)[filterName] = value;
      await this.findTransferOrders({ pageSize: import.meta.env.VITE_VIEW_SIZE, pageIndex: 0, groupByConfig });
    },
    async fetchOrderDetails(orderId: string) {
      let orderDetail = {} as any;
      let orderResp;
      try {
        this.current = { ...this.current, isFetching: true, loadedItems: 0, totalItems: 0 };
        orderResp = await api({ url: `/oms/transferOrders/${orderId}`, method: "get" });

        if (!commonUtil.hasError(orderResp)) {
          orderDetail = orderResp.data.order || {};
          orderDetail = {
            ...orderDetail,
            shipGroupSeqId: orderDetail.items[0]?.shipGroupSeqId
          };

          const shipmentReceiptResp = await api({ url: `poorti/transferOrders/${orderId}/receipts`, method: "GET", params: { orderId } });
          if (!commonUtil.hasError(shipmentReceiptResp) && shipmentReceiptResp.data.length) {
            orderDetail.receipts = shipmentReceiptResp.data.reduce((groups: any, receipt: any) => {
              if (!receipt?.datetimeReceived) return groups;
              const key = receipt.datetimeReceived;
              (groups[key] ||= []).push(receipt);
              return groups;
            }, {});
          }

          const shipmentResp = await api({ url: "poorti/transferShipments", method: "get", params: { orderId, shipmentStatusId: "SHIPMENT_SHIPPED" } });
          if (!commonUtil.hasError(shipmentResp)) {
            orderDetail = {
              ...orderDetail,
              shipments: shipmentResp.data?.shipments || []
            };
          }

          if (orderDetail.items && Array.isArray(orderDetail.items)) {
            orderDetail.items = orderDetail.items.map((item: any) => ({
              ...item,
              shippedQty: item.totalIssuedQuantity,
              receivedQty: item.totalReceivedQuantity
            }));
          }

          const utilStore = useUtilStore();
          const product = useProduct();
          const productStore = useProductStore();
          const [facilityAddresses] = await Promise.allSettled([
            productStore.fetchFacilityAddresses([orderDetail.facilityId, orderDetail.orderFacilityId]),
            utilStore.fetchStoreCarrierAndMethods(orderDetail.productStoreId)
          ]);

          if (facilityAddresses.status === "fulfilled" && facilityAddresses.value?.length) {
            facilityAddresses.value.forEach((address: any) => {
              if (address.facilityId === orderDetail.facilityId) {
                orderDetail.originFacility = address;
              } else {
                orderDetail.destinationFacility = address;
              }
            });
          }

          const uniqueProductIds = [...new Set(orderDetail.items.map((item: any) => item.productId))] as string[];
          const totalProducts = uniqueProductIds.length;
          this.current = { ...orderDetail, isFetching: true, loadedItems: 0, totalItems: totalProducts };

          const productIds = [...uniqueProductIds];
          const batchSize = 250;
          const productIdBatches = [] as string[][];
          while (productIds.length) {
            productIdBatches.push(productIds.splice(0, batchSize));
          }

          let loadedProducts = 0;
          await Promise.allSettled(productIdBatches.map(async (batchIds) => {
            await product.fetchProducts({ productIds: batchIds });
            loadedProducts += batchIds.length;
            this.current = { ...orderDetail, isFetching: true, loadedItems: loadedProducts, totalItems: totalProducts };
          }));

          this.current = { ...orderDetail, isFetching: false };
        } else {
          throw orderResp.data;
        }
      } catch (error: any) {
        this.current = { ...this.current, isFetching: false };
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async fetchOrderShipments(orderId: string) {
      let shipments = [] as any[];

      try {
        const userStore = useUserStore();
        const resp = await api({
          url: "performFind",
          method: "get",
          params: {
          entityName: "Shipment",
          inputFields: {
            primaryOrderId: orderId,
            statusId: "SHIPMENT_CANCELLED",
            statusId_op: "notEqual"
          },
          fieldList: ["shipmentId", "shipmentTypeId", "statusId", "carrierPartyId", "shipmentMethodTypeId"],
          viewSize: 200,
          distinct: "Y"
          }
        });

        if (!commonUtil.hasError(resp)) {
          shipments = resp.data.docs;
          const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId);
          const [shipmentItems, shipmentRoutes, shipmentStatuses] = await Promise.allSettled([
            (async () => {
              let viewIndex = 0;
              let items = [] as any[];
              let shipmentResp;
              try {
                do {
                  shipmentResp = await api({
                    url: "performFind",
                    method: "get",
                    params: {
                      entityName: "ShipmentItemDetail",
                      inputFields: { shipmentId: shipmentIds, shipmentId_op: "in" },
                      fieldList: ["shipmentId", "shipmentItemSeqId", "productId", "quantity", "orderItemSeqId"],
                      viewIndex,
                      viewSize: 250,
                      distinct: "Y"
                    }
                  }) as any;
                  if (!commonUtil.hasError(shipmentResp) && shipmentResp.data.docs?.length) {
                    items = items.concat(shipmentResp.data.docs);
                    viewIndex++;
                  } else {
                    throw shipmentResp.data;
                  }
                } while (shipmentResp.data.docs.length >= 250);
              } catch (error) {
                logger.error(error);
              }
              return items;
            })(),
            (async () => {
              try {
                const trackingResp = await api({
                  url: "performFind",
                  method: "get",
                  params: {
                    entityName: "ShipmentAndRouteSegment",
                    inputFields: {
                      shipmentId: shipmentIds,
                      shipmentId_op: "in",
                      carrierServiceStatusId: "SHRSCS_VOIDED",
                      carrierServiceStatusId_op: "notEqual"
                    },
                    fieldList: ["shipmentId", "trackingIdNumber"],
                    viewSize: 250,
                    distinct: "Y"
                  }
                }) as any;
                if (!commonUtil.hasError(trackingResp) && trackingResp.data.docs?.length) return trackingResp.data.docs;
                throw trackingResp.data;
              } catch (error) {
                logger.error(error);
                return [];
              }
            })(),
            (async () => {
              const statuses = {} as any;
              try {
                const statusesResp = await api({
                  url: "performFind",
                  method: "get",
                  params: {
                    entityName: "ShipmentStatus",
                    inputFields: {
                      shipmentId: shipmentIds,
                      shipmentId_op: "in",
                      statusId: ["SHIPMENT_SHIPPED", "PURCH_SHIP_SHIPPED"]
                    },
                    fieldList: ["shipmentId", "statusId", "statusDate"],
                    viewSize: 250,
                    distinct: "Y"
                  }
                }) as any;
                if (!commonUtil.hasError(statusesResp) && statusesResp.data.docs?.length) {
                  statusesResp.data.docs.forEach((status: any) => {
                    statuses[status.shipmentId] = status.statusDate;
                  });
                } else {
                  throw statusesResp.data;
                }
              } catch (error) {
                logger.error(error);
              }
              return statuses;
            })()
          ]) as any;

          const productIds = [...new Set(shipmentItems.value.map((item: any) => item.productId))] as string[];
          const batchSize = 250;
          const productIdBatches = [] as string[][];
          while (productIds.length) {
            productIdBatches.push(productIds.splice(0, batchSize));
          }
          const product = useProduct();
          Promise.allSettled(productIdBatches.map((batch) => product.fetchProducts({ productIds: batch })));

          shipments.forEach((shipment: any) => {
            const items = [] as any[];
            if (shipmentItems.status === "fulfilled" && shipmentItems.value?.length) {
              shipmentItems.value.forEach((item: any) => {
                if (item.shipmentId === shipment.shipmentId) items.push(item);
              });
            }
            shipment.items = items;

            if (shipmentRoutes.status === "fulfilled" && shipmentRoutes.value?.length) {
              const trackingInfo = shipmentRoutes.value.find((shipmentRoute: any) => shipmentRoute.shipmentId === shipment.shipmentId);
              if (trackingInfo) shipment.trackingCode = trackingInfo?.trackingIdNumber;
            }

            if (shipmentStatuses.status === "fulfilled" && shipmentStatuses.value[shipment.shipmentId]) {
              shipment.shippedDate = shipmentStatuses.value[shipment.shipmentId];
            }
          });
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error(error);
      }

      this.current = { ...this.current, shipments };
    },
    updateCurrent(payload: any) {
      this.current = payload;
    },
    updateOrdersList(payload: { orders: any[]; ordersCount: number }) {
      this.orders = payload.orders;
      this.ordersCount = payload.ordersCount;
    },
    clearOrderState() {
      this.$reset();
    },
    async fetchOrderReceipts(orderId: string) {
      const payload = {
        orderId,
        orderByField: "-datetimeReceived",
        pageSize: Number(import.meta.env.VITE_VIEW_SIZE)
      };
      let resp;

      try {
        resp = await api({ url: `poorti/transferOrders/${payload.orderId}/receipts`, method: "GET", params: payload });
        if (!commonUtil.hasError(resp)) {
          this.orderReceipts = resp.data;
        } else {
          throw resp.data;
        }
      } catch (error: any) {
        this.orderReceipts = [];
        logger.error("error", error);
        return Promise.reject(error);
      }

      return resp;
    }
  }
});
