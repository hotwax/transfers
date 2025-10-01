import { apiClient } from '@/adapter';
import store from '@/store';

const fetchProducts = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "searchProducts", 
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: query,
    cache: true
  });
}

export const ProductService = {
  fetchProducts
}