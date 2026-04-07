import { defineStore } from 'pinia'
import { api, commonUtil, logger, translate, useSolrSearch } from '@common'
import { useUserStore } from '@/store/user'
const defaultProductStoreSettings = JSON.parse(import.meta.env.VITE_DEFAULT_PRODUCT_STORE_SETTINGS as string || '{}')

export const useProductStore = defineStore('productStore', {
  state: () => ({
    currentEComStore: {
      facilities: [] as any[]
    } as any,
    settings: {
      productIdentifier: {
        productIdentificationPref: {
          primaryId: '',
          secondaryId: ''
        },
        productIdentificationOptions: [] as any[],
        sampleProducts: [],
        currentSampleProduct: null
      },
      barcodeIdentifier: {
        barcodeIdentifierOptions: [] as any[],
      }
    } as any,
    facilities: [] as any[],
    productStores: [] as any[],
    facilityAddresses: {} as any,
  }),

  getters: {
    getCurrentEComStore: (state) => state.currentEComStore,
    getAllFacilities: (state) => state.facilities,
    getProductStoreFacilities: (state) => state.currentEComStore.facilities || [],
    getAllProductStores: (state) => state.productStores,
    getSettings: (state) => state.settings,
    getProductIdentificationPref: (state) => state.settings.productIdentifier.productIdentificationPref,
    getBarcodeIdentifierPref: (state) => state.settings.barcodeIdentifier.barcodeIdentifierPref,
    getProductIdentificationOptions: (state) => state.settings.productIdentifier.productIdentificationOptions,
    getCurrentSampleProduct: (state) => state.settings.productIdentifier.currentSampleProduct,
  },

  actions: {
    async setCurrentEComStore(store: any) {
      this.currentEComStore = store
      await this.fetchEComStoreDependencies(store.productStoreId)
    },
    async fetchAllFacilities() {
      let facilities = []
      try {
        const payload = {
          parentTypeId: "VIRTUAL_FACILITY",
          parentTypeId_op: "equals",
          parentTypeId_not: "Y",
          facilityTypeId: "VIRTUAL_FACILITY",
          facilityTypeId_op: "equals",
          facilityTypeId_not: "Y",
          pageSize: 250
        }

        const resp = await api({
          url: "/oms/facilities",
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          facilities = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch facilities", err)
      }
      this.facilities = facilities
    },
    async getFacilityDetails(payload: any): Promise<any> {
      return api({
        url: `/oms/facilities/${payload.facilityId}`,
        method: "GET",
        params: payload
      });
    },

    async fetchProductStoreFacilities(productStoreId: string) {
      let facilities = [] as any[];

      try {
        const resp = await api({
          url: `/oms/productStores/${productStoreId}/facilities`,
          method: "get",
          params: {
            productStoreId,
            facilityTypeId: "VIRTUAL_FACILITY",
            facilityTypeId_op: "equals",
            facilityTypeId_not: "Y",
            parentFacilityTypeId: "VIRTUAL_FACILITY",
            parentFacilityTypeId_op: "equals",
            parentFacilityTypeId_not: "Y",
            fieldsToSelect: ["facilityId", "facilityName"],
            pageSize: 200
          }
        });

        if (!commonUtil.hasError(resp)) {
          facilities = resp.data;
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error(error);
      }

      this.currentEComStore.facilities = facilities;
    },
    async fetchProductStoreDetails(payload: any): Promise<any> {
      return api({
        url: `/oms/productStores/${payload.productStoreId}`,
        method: "GET"
      });
    },
    async fetchFacilityAddresses(facilityIds: string[]) {
      const facilityAddresses = this.facilityAddresses ? JSON.parse(JSON.stringify(this.facilityAddresses)) : {};
      const addresses = [] as any[];
      const remainingFacilityIds = [] as string[];

      facilityIds.forEach((facilityId) => {
        facilityAddresses[facilityId] ? addresses.push(facilityAddresses[facilityId]) : remainingFacilityIds.push(facilityId);
      });

      if (!remainingFacilityIds.length) return addresses;

      try {
        const responses = await Promise.allSettled(
          remainingFacilityIds.map((facilityId) => api({
            url: "/oms/facilityContactMechs",
            method: "get",
            params: {
              contactMechPurposeTypeId: "PRIMARY_LOCATION",
              contactMechTypeId: "POSTAL_ADDRESS",
              facilityId
            }
          }))
        );

        if (responses.some((response: any) => response.status === "rejected")) {
          throw responses;
        }

        responses.forEach((response: any) => {
          if ((response.value as any).data?.facilityContactMechs?.length) {
            (response.value as any).data.facilityContactMechs.forEach((facilityAddress: any) => {
              facilityAddresses[facilityAddress.facilityId] = facilityAddress;
              addresses.push(facilityAddress);
            });
          }
        });
      } catch (error) {
        logger.error(error);
      }

      this.facilityAddresses = facilityAddresses;
      return addresses;
    },

    async fetchAllProductStores() {
      let stores = []
      try {
        const payload = {
          fieldsToSelect: ["productStoreId", "storeName"],
          pageSize: 250
        }

        const resp = await api({
          url: `/oms/productStores`,
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          stores = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch product stores", err)
      }
      this.productStores = stores
    },
    async fetchProductStorePreference() {
      const userStore = useUserStore();
      try {
        const preferredStoreResp = await api({
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: userStore.current.userId,
            preferenceKey: "SELECTED_BRAND"
          },
        }) as any;
        const preferredStoreId = preferredStoreResp.data?.[0]?.preferenceValue
        if (preferredStoreId) {
          const store = this.productStores?.find((store: any) => store.productStoreId === preferredStoreId);
          store && this.setCurrentEComStore(store)
        }
      } catch (err) {
        logger.error('Favourite product store not found', err)
      }
    },
    async fetchEComStoreDependencies(productStoreId: string) {
      await useProductStore().fetchProductStoreSettings(productStoreId)
        .catch((error) => logger.error(error))
    },

    async setEComStorePreference(payload: any) {
      const userStore = useUserStore();
      try {
        await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: userStore.current.userId,
            preferenceKey: 'SELECTED_BRAND',
            preferenceValue: payload.productStoreId,
          }
        });
      } catch (error) {
        console.error('error', error)
      }
      this.currentEComStore = payload;
    },
    async fetchProductStoreSettings(productStoreId: string) {
      const productStoreSettings = {} as any

      if (productStoreId) {
        const payload = {
          productStoreId,
          settingTypeEnumId: Object.keys(defaultProductStoreSettings),
          settingTypeEnumId_op: "in",
          pageIndex: 0,
          pageSize: 50
        }
        try {
          const resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: {
              dataDocumentId: "ProductStoreSetting",
              customParametersMap: payload
            }
          }) as any

          resp?.data?.entityValueList?.forEach((productSetting: any) => {
            productStoreSettings[productSetting.settingTypeEnumId] = productSetting.settingValue
          })
        } catch (error) {
          logger.error("Failed to fetch settings", error)
        }
      }

      Object.entries(defaultProductStoreSettings).forEach(([settingTypeEnumId, setting]: any) => {
        const { stateKey, value } = setting;
        const settingValue = productStoreSettings[settingTypeEnumId];
        let finalValue;
        try {
          finalValue = settingValue ? JSON.parse(settingValue) : value;
        } catch (e) {
          finalValue = settingValue; // fallback to raw value
        }

        const keys = stateKey.split('.');
        let current = this.settings;

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];

          if (i === keys.length - 1) {
            current[key] = finalValue;
          } else {
            // ensure object exists at each level
            if (!current[key] || typeof current[key] !== 'object') {
              current[key] = {};
            }
            current = current[key];
          }
        }
      })
    },

    async setProductStoreSetting(productStoreId: string, settingTypeEnumId: string, settingValue: any) {
      try {
        const payloadSettingValue = typeof settingValue === 'object' ? JSON.stringify(settingValue) : settingValue;
        const resp = await api({
          url: `admin/productStores/${productStoreId}/settings`,
          method: 'POST',
          data: {
            productStoreId,
            settingTypeEnumId,
            settingValue: payloadSettingValue
          }
        })
        if (!commonUtil.hasError(resp)) {
          const defaultSetting = defaultProductStoreSettings[settingTypeEnumId]
          const { stateKey } = defaultSetting
          const keys = stateKey.split('.');
          let current = this.settings;

          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (i === keys.length - 1) {
              current[key] = settingValue;
            } else {
              // ensure object exists at each level
              if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
              }
              current = current[key];
            }
          }
          commonUtil.showToast(translate('Product Store setting updated successfully.'))
        } else {
          throw resp
        }
      } catch (err) {
        commonUtil.showToast(translate('Failed to update Product Store setting.'))
        logger.error(err)
      }
    },

    async prepareProductIdentifierOptions() {
      //static identifications 
      const productIdentificationOptions = [
        { goodIdentificationTypeId: "productId", description: "Product ID" },
        { goodIdentificationTypeId: "groupId", description: "Group ID" },
        { goodIdentificationTypeId: "groupName", description: "Group Name" },
        { goodIdentificationTypeId: "internalName", description: "Internal Name" },
        { goodIdentificationTypeId: "parentProductName", description: "Parent Product Name" },
        { goodIdentificationTypeId: "primaryProductCategoryName", description: "Primary Product Category Name" },
        { goodIdentificationTypeId: "title", description: "Title" }
      ]
      //good identification types
      let fetchedGoodIdentificationOptions = []
      try {
        const resp: any = await api({
          url: "oms/goodIdentificationTypes",
          method: "get",
          params: {
            parentTypeId: "HC_GOOD_ID_TYPE",
            pageSize: 50
          }
        });

        fetchedGoodIdentificationOptions = resp.data
      } catch (error) {
        console.error('Failed to fetch good identification types', error)
      }

      // Merge the arrays and remove duplicates
      this.settings.productIdentifier.productIdentificationOptions = Array.from(new Set([...productIdentificationOptions, ...fetchedGoodIdentificationOptions])).sort();
      this.settings.barcodeIdentifier.barcodeIdentifierOptions = fetchedGoodIdentificationOptions
    },

    async fetchProducts() {
      try {
        const resp = await useSolrSearch().searchProducts({
          viewSize: 10
        })

        if (resp.products.length) {
          this.settings.productIdentifier.sampleProducts = resp.products;
          this.shuffleProduct()
        } else {
          throw resp
        }
      } catch (error: any) {
        console.error(error)
      }
    },
    shuffleProduct() {
      if (this.settings.productIdentifier.sampleProducts.length) {
        const randomIndex = Math.floor(Math.random() * this.settings.productIdentifier.sampleProducts.length)
        this.settings.productIdentifier.currentSampleProduct = this.settings.productIdentifier.sampleProducts[randomIndex]
      } else {
        this.settings.productIdentifier.currentSampleProduct = null
      }
    },
  },
  persist: true
})
