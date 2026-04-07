import { defineStore } from "pinia";
import { api, commonUtil, useSolrSearch } from "@common";
import { logger } from "@common";

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
        resp = await useSolrSearch().searchProducts({
          filters: { "productId": { value: `(${productIdFilter})` } },
          viewSize
        });

        if (resp.products.length) {
          this.addProductToCachedMultiple({ products: resp.products });
        } else {
          throw resp;
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
