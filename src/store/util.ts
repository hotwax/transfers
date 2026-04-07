import { defineStore } from "pinia";
import { api, commonUtil, cookieHelper } from "@common";
import { logger } from "@common";
import { useProductStore } from "@/store/productStore"

interface UtilState {
  statusDesc: Record<string, string>;
  shipmentMethodTypeDesc: Record<string, string>;
  dataManagerStatusDesc: Record<string, string>;
  shipmentMethodsByCarrier: Record<string, any[]>;
  carrierDesc: Record<string, string>;
  sampleProducts: any[];
}

export const useUtilStore = defineStore("util", {
  state: (): UtilState => ({
    statusDesc: {},
    shipmentMethodTypeDesc: {},
    dataManagerStatusDesc: {},
    shipmentMethodsByCarrier: {},
    carrierDesc: {},
    sampleProducts: []
  }),
  getters: {
    getShipmentMethodDesc: (state) => (shipmentMethodId: string) => state.shipmentMethodTypeDesc[shipmentMethodId] ? state.shipmentMethodTypeDesc[shipmentMethodId] : shipmentMethodId,
    getShipmentMethods: (state) => state.shipmentMethodTypeDesc,
    getStatusDesc: (state) => (statusId: string) => state.statusDesc[statusId] ? state.statusDesc[statusId] : statusId,
    getShipmentMethodsByCarrier: (state) => state.shipmentMethodsByCarrier,
    getCarrierDesc: (state) => (partyId: string) => state.carrierDesc[partyId] ? state.carrierDesc[partyId] : partyId,
    getCarriers: (state) => state.carrierDesc,
    getSampleProducts: (state) => state.sampleProducts,
    getDataManagerStatusDesc: (state) => (statusId: string) => state.dataManagerStatusDesc[statusId] ? state.dataManagerStatusDesc[statusId] : statusId
  },
  actions: {
    async getInventoryAvailableByFacility(query: any): Promise<any> {
      return api({
        url: "/poorti/getInventoryAvailableByFacility",
        method: "get",
        params: query
      });
    },
    async getDataManagerLogs(payload: any): Promise<any> {
      return api({
        url: "/admin/dataManager/details",
        method: "GET",
        params: payload
      });
    },
    async downloadLogDataManagerFile(payload: any): Promise<any> {
      const oms = cookieHelper().get("oms");
      const baseURL = oms ? (oms.startsWith("http") ? (oms.endsWith("/") ? oms : `${oms}/`) : `https://${oms}.hotwax.io/`) : "";
      return api({
        url: "apps/Oms/DataManager/DataManagerConfig/DataManagerConfigView/downloadContent",
        method: "GET",
        baseURL,
        params: payload
      });
    },
    async cancelDataManagerFileProcessing(payload: any): Promise<any> {
      return api({
        url: `/admin/dataManager/logs/${payload.logId}`,
        method: "PUT",
        data: payload
      });
    },
    async fetchProductsAverageCost(productIds: any, facilityId: any): Promise<any> {
      if (!productIds.length) return [];
      const requests = [];
      const productIdList = [...productIds];
      const productAverageCostDetail = {} as any;

      while (productIdList.length) {
        const ids = productIdList.splice(0, 100);
        requests.push({
          customParametersMap: {
            facilityId,
            productId: ids,
            productId_op: "in",
            orderByField: "-fromDate",
            pageIndex: 0,
            pageSize: 100
          },
          dataDocumentId: "ProductWeightedAverageCost",
          filterByDate: true
        });
      }

      const responses = await Promise.allSettled(requests.map((data) => api({
        url: "/oms/dataDocumentView",
        method: "POST",
        data
      })));

      if (responses.some((response: any) => response.status !== "fulfilled")) return {};

      responses.forEach((response: any) => {
        if (response.value.data?.entityValueList?.length) {
          response.value.data.entityValueList.forEach((item: any) => {
            if (!productAverageCostDetail[item.productId]) productAverageCostDetail[item.productId] = item.averageCost;
          });
        }
      });

      return productAverageCostDetail;
    },
    async fetchShipmentMethodTypeDesc() {
      if (Object.keys(this.shipmentMethodTypeDesc).length) return;

      const shipmentMethodTypeDesc = {} as Record<string, string>;
      try {
        const resp = await api({
          url: "/oms/shippingGateways/shipmentMethodTypes",
          method: "GET",
          params: {
          shipmentMethodTypeId_op: "in",
          fieldsToSelect: ["shipmentMethodTypeId", "description"],
          pageSize: 200
          }
        });

        if (!commonUtil.hasError(resp)) {
          resp.data.forEach((shipmentMethodInformation: any) => {
            shipmentMethodTypeDesc[shipmentMethodInformation.shipmentMethodTypeId] = shipmentMethodInformation.description;
          });
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error("Error fetching shipment description", error);
      }

      this.shipmentMethodTypeDesc = shipmentMethodTypeDesc;
      return shipmentMethodTypeDesc;
    },
    async fetchDataManagerStatusDesc() {
      if (Object.keys(this.dataManagerStatusDesc).length) return;

      const dataManagerStatusDesc = {} as Record<string, string>;
      try {
        const resp = await api({ url: "/oms/statuses", method: "GET", params: { statusTypeId: "DataManagerLog", pageSize: 100 } });

        resp.data.forEach((dataManagerStatusInformation: any) => {
          dataManagerStatusDesc[dataManagerStatusInformation.statusId] = dataManagerStatusInformation.description;
        });
      } catch (error) {
        logger.error("Error fetching data manager status description", error);
      }

      this.dataManagerStatusDesc = dataManagerStatusDesc;
      return dataManagerStatusDesc;
    },
    async fetchStatusDesc() {
      if (Object.keys(this.statusDesc).length) return this.statusDesc;

      const statusDesc = {} as Record<string, string>;
      try {
        const resp = await api({
          url: "/oms/statuses",
          method: "GET",
          params: {
            statusTypeId: ["ORDER_STATUS", "ORDER_ITEM_STATUS", "SHIPMENT_STATUS", "PURCH_SHIP_STATUS"],
            statusTypeId_op: "in",
            entityName: "StatusItem",
            pageSize: 200
          }
        });

        if (!commonUtil.hasError(resp)) {
          resp.data.forEach((statusItem: any) => {
            statusDesc[statusItem.statusId] = statusItem.description;
          });

          this.statusDesc = statusDesc;
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error("Error fetching status description", error);
      }

      return statusDesc;
    },
    async fetchStoreCarrierAndMethods(productStoreId: string) {
      let shipmentMethodsByCarrier = {} as Record<string, any[]>;

      try {
        const resp = await api({
          url: "/oms/dataDocumentView",
          method: "post",
          data: {
          customParametersMap: {
            productStoreId,
            roleTypeId: "CARRIER",
            shipmentMethodTypeId: "STOREPICKUP",
            shipmentMethodTypeId_op: "equals",
            shipmentMethodTypeId_not: "Y",
            pageIndex: 0,
            pageSize: 100
          },
          dataDocumentId: "ProductStoreShipmentMethod",
          filterByDate: true
          }
        });

        if (!commonUtil.hasError(resp)) {
          shipmentMethodsByCarrier = resp.data.entityValueList.reduce((result: Record<string, any[]>, storeCarrierAndMethod: any) => {
            const { partyId, shipmentMethodTypeId, description } = storeCarrierAndMethod;

            if (!result[partyId]) result[partyId] = [];
            result[partyId].push({ shipmentMethodTypeId, description });
            return result;
          }, {});
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error("Error fetching status description", error);
      }

      this.shipmentMethodsByCarrier = shipmentMethodsByCarrier;
    },
    async fetchCarriersDetail() {
      if (Object.keys(this.carrierDesc).length) return;

      const carrierDesc = {} as Record<string, string>;
      try {
        const resp = await api({
          url: "/oms/shippingGateways/carrierParties",
          method: "get",
          params: {
            roleTypeId: "CARRIER",
            fieldsToSelect: ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
            distinct: "Y",
            pageSize: 20
          }
        });

        if (!commonUtil.hasError(resp)) {
          resp.data.forEach((carrier: any) => {
            carrierDesc[carrier.partyId] = carrier.groupName || [carrier.firstName, carrier.lastName].filter(Boolean).join(" ") || carrier.partyId;
          });
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error("error", error);
      }

      this.carrierDesc = carrierDesc;
    },
    async fetchSampleProducts() {
      let products = this.sampleProducts ? JSON.parse(JSON.stringify(this.sampleProducts)) : [];
      if (products.length) return;

      try {
        const resp = await api({
          url: "/oms/products",
          method: "get",
          params: {
            internalName_op: "empty",
            internalName_not: "Y",
            fieldsToSelect: ["internalName", "productId"],
            pageSize: 10
          }
        }) as any;

        if (!commonUtil.hasError(resp) && resp.data?.length) {
          const currentProductStore = useProductStore().getCurrentEComStore as any;
          let fieldName = currentProductStore?.productIdentifierEnumId || "SKU";
          if (fieldName === "SHOPIFY_BARCODE") fieldName = "UPCA";

          products = resp.data.map((product: any) => ({
            [fieldName]: product.internalName,
            quantity: 2
          }));
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error(error);
      }

      this.sampleProducts = products;
    },
    clearUtilState() {
      this.$reset();
    }
  },
  persist: {
    paths: [
      "carrierDesc",
      "statusDesc",
      "shipmentMethodTypeDesc",
      "sampleProducts",
      "dataManagerStatusDesc"
    ]
  }
});
