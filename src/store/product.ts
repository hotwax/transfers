import { defineStore } from "pinia";
import { apiClient, hasError } from "@/adapter";
import logger from "@/logger";
import { useUserStore } from "@/store/user";

interface ProductState {
  cached: Record<string, any>;
}

export const useProductStore = defineStore("product", {
  state: (): ProductState => ({
    cached: {}
  }),
  getters: {
    getProduct: (state) => (productId: string) => state.cached[productId] ? state.cached[productId] : {}
  },
  actions: {
    async searchProducts(query: any): Promise<any> {
      const userStore = useUserStore();
      return apiClient({
        url: "searchProducts",
        method: "post",
        baseURL: userStore.getOmsBaseUrl,
        headers: {
          Authorization: "Bearer " + userStore.token,
          "Content-Type": "application/json"
        },
        data: query,
        cache: true
      });
    },
    async fetchProducts({ productIds }: { productIds: string[] }) {
      const cachedProductIds = Object.keys(this.cached);
      let viewSize = 0;
      const productIdFilter = productIds.reduce((filter: string, productId: string) => {
        if (cachedProductIds.includes(productId)) {
          return filter;
        }

        if (filter !== "") filter += " OR ";
        viewSize++;
        return filter + productId;
      }, "");

      if (productIdFilter === "") return;

      let resp;
      try {
        resp = await this.searchProducts({
          filters: [`productId: (${productIdFilter})`],
          viewSize
        });

        if (resp.status === 200 && resp.data?.response && !hasError(resp)) {
          this.addProductToCachedMultiple({ products: resp.data.response.docs });
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error("Failed to fetch products information", error);
      }

      return resp;
    },
    addProductToCached(payload: any) {
      this.cached[payload.productId] = payload;
    },
    addProductToCachedMultiple(payload: { products?: any[] }) {
      payload.products?.forEach((product) => {
        this.cached[product.productId] = product;
      });
    },
    clearProductState() {
      this.$reset();
    }
  },
  persist: {
    paths: ["cached"]
  }
});
