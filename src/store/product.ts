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
        const filters = { "productId": { value: `(${productIdFilter})` } };
        const products = [] as any[];
        let viewIndex = 0;
        let total = 0;

        do {
          resp = await useSolrSearch().searchProducts({
            filters,
            viewSize,
            viewIndex,
            // Stable pagination puts the current PRODUCT-id after the legacy
            // PRODUCT-id-PRODUCT-id key, so it wins when cached by product ID.
            sort: "docType-identifier desc"
          });
          if(!Array.isArray(resp.products) || !resp.products.length) {
            throw resp;
          }

          products.push(...resp.products);
          total = resp.total;
          viewIndex++;
        } while(products.length < total);

        this.addProductToCachedMultiple({ products });
        resp = { ...resp, products };
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
