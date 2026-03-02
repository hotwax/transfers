import { apiClient } from '@/adapter';
import store from '@/store';

const fetchProducts = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getBaseUrl'];
  const userToken = store.getters['user/getUserToken'];

  return apiClient({
    url: "inventory-cycle-count/runSolrQuery", 
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + userToken,
      "Content-Type": "application/json"
    },
    data: query,
    cache: true
  });
}

const fetchBarcodeIdentificationDesc = async (params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getOmsBaseUrl'];

  return apiClient({
    url: `/oms/goodIdentificationTypes`,
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

export const ProductService = {
  fetchProducts,
  fetchBarcodeIdentificationDesc
}