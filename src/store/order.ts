import { defineStore } from "pinia";
import { api, commonUtil } from "@common";
import { logger } from "@common";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util";
import { useUserStore } from "@/store/user";

interface OrderQueryState {
  orderName: string;
  productStoreId: string;
  originFacilityId: string;
  destinationFacilityId: string;
  orderStatusId: string;
  carrierPartyId: string;
  shipmentMethodTypeId: string;
  sort: string;
  statusFlowId: string;
}

interface OrderState {
  orders: any[];
  ordersCount: number;
  query: OrderQueryState;
  current: any;
  orderReceipts: any[];
  isFetching: boolean;
}

export const useOrderStore = defineStore("order", {
  state: (): OrderState => ({
    orders: [],
    ordersCount: 0,
    query: {
      orderName: "",
      productStoreId: "",
      originFacilityId: "",
      destinationFacilityId: "",
      orderStatusId: "",
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      sort: "orderDate desc",
      statusFlowId: ""
    },
    current: {},
    orderReceipts: [],
    isFetching: false
  }),
  getters: {
    getOrders: (state) => state.orders,
    isScrollable: (state) => state.orders?.length > 0 && state.orders?.length < state.ordersCount,
    getQuery: (state) => state.query,
    getCurrent: (state) => state.current,
    getOrderReceipts: (state) => state.orderReceipts
  },
  actions: {
    async fetchOrderStatusHistory(params: any): Promise<any> {
      const userStore = useUserStore();
      return api({
        url: `oms/orders/${params.orderId}/status`,
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

      if(!params.pageIndex || params.pageIndex == 0) this.isFetching = true

      const payload = {
        orderByField: this.query.sort,
        pageSize: params.pageSize,
        pageIndex: params.pageIndex,
        fieldsToSelect: "orderId,orderName,facilityId,orderFacilityId,orderStatusId,orderStatusDesc,orderDate,orderExternalId"
      } as any;

      Object.entries(this.query).forEach(([fieldName, fieldValue]) => {
        if (fieldValue != null && fieldValue !== "" && fieldName !== "sort") {
          payload[fieldName] = fieldValue;
        }
      });

      try {
        resp = await api({ url: "oms/transferOrders", method: "GET", params: payload });
        if (!commonUtil.hasError(resp)) {
          const orders = resp.data.orders
          ordersList = payload.pageIndex > 0 ? this.orders.concat(orders) : orders;
          ordersCount = resp.data.ordersCount;
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error(error);
      }

      this.updateOrdersList({ orders: ordersList, ordersCount });

      if(!params.pageIndex || params.pageIndex == 0) this.isFetching = false
      return resp;
    },
    async updateAppliedFilters({ value, filterName }: { value: any; filterName: string }) {
      (this.query as Record<string, any>)[filterName] = value;
      await this.findTransferOrders({ pageSize: import.meta.env.VITE_VIEW_SIZE, pageIndex: 0 });
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
