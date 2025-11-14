import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { OrderService } from '@/services/OrderService';
import { UtilService } from '@/services/UtilService';
import { showToast } from '@/utils';
import { hasError } from "@/adapter";
import { translate } from "@hotwax/dxp-components";
import logger from '@/logger';

/**
 * Sequential product addition queue for order items to prevent API deadlocks.
 * 
 * Process:
 * 1. Products are added to queue via addProductToQueue()
 * 2. Queue processes items sequentially (one API call at a time)
 * 3. pendingProductIds tracks products being added for UI feedback
 * 4. Prevents duplicate additions and API conflicts
 * 
 * States:
 * - addQueue: Items waiting to be processed
 * - pendingProductIds: Products currently being added (for UI)
 * - isProcessing: Whether queue is actively processing items
 */

export function useOrderQueue() {
  const store = useStore();
  
  const addQueue = ref([]) as any;
  const isProcessing = ref(false);
  const pendingProductIds = ref(new Set());
  let pendingItemsToast: any = null;      
  
  const currentOrder = computed(() => store.getters['order/getCurrent']);

  // Helper function to check if product is in order
  const isProductInOrder = (productId: string) => {
    return currentOrder.value?.items?.some((item: any) => item.productId === productId);
  };

  // Helper function to check if product is being processed
  const isProductBeingProcessed = (productId: string) => {
    return pendingProductIds.value.has(productId) || isProductInOrder(productId);
  };

  // Show pending items toast when bulk scanning
  const showPendingItemsToast = async () => {
    if (!pendingItemsToast) {
      pendingItemsToast = await showToast(translate('Adding items to the order'), { manualDismiss: true });
      await pendingItemsToast.present();
    }
  };

  // Hide pending items toast
  const hidePendingItemsToast = () => {
    if (pendingItemsToast) {
      pendingItemsToast.dismiss();
      pendingItemsToast = null;
    }
  };
  
  /**
   * Adds product to queue for sequential processing.
   * Validates input, checks for duplicates, and triggers processing.
   */
  const addProductToQueue = (itemToAdd: any) => {
    const { product } = itemToAdd;
    
    if (!product?.productId || !itemToAdd.orderId) {
      logger.error('Missing product data or orderId');
      return;
    }
    
    // Skip if already in order or being processed
    if (isProductBeingProcessed(product.productId)) {
      return;
    }
    
    pendingProductIds.value.add(product.productId);
    addQueue.value.push(itemToAdd);
    // Show toast only when pending items are 2 or more
    if (pendingProductIds.value.size >= 2) showPendingItemsToast();
    processQueue();
  };

  /**
   * Processes product queue sequentially to prevent API deadlocks.
   * Handles one item at a time, continues on failures.
   */
  const processQueue = async () => {
    if (isProcessing.value || addQueue.value.length === 0) return;
    
    isProcessing.value = true;
    
    while (addQueue.value.length > 0) {
      const itemToAdd = addQueue.value[0];
      await processSingleProduct(itemToAdd);
      addQueue.value.shift();
    }
    
    isProcessing.value = false;
    hidePendingItemsToast();
  };
  
  /**
   * Processes single product addition with error handling.
   * Fetches cost, calls API, updates store, and handles UI feedback.
   */
  const processSingleProduct = async (itemToAdd: any) => {
    const { product, orderId, facilityId, onSuccess, onError } = itemToAdd;
    
    try {
      // Fetch product average cost
      const productAverageCostDetail = await UtilService.fetchProductsAverageCost([product.productId], facilityId);
      
      const newProduct = {
        orderId: orderId,
        productId: product.productId,
        shipGroupSeqId: "00001",
        quantity: 1,
        idType: "SKU",
        idValue: product.sku,
        unitPrice: productAverageCostDetail[product.productId] || 0.00,
        unitListPrice: 0
      };

      const resp = await OrderService.addOrderItem(newProduct);

      if (!hasError(resp)) {
        // Create the complete item without mutating newProduct
        const newItem = {
          ...newProduct,
          statusId: "ITEM_CREATED",
          orderItemSeqId: resp.data?.orderItemSeqId
        };

        const updatedOrder = {
          ...currentOrder.value,
          items: [...currentOrder.value.items, newItem]
        }

        await store.dispatch("order/updateCurrent", updatedOrder);
        // Emit event after successful addition
        onSuccess?.();
      } else {
        throw resp.data;
      }
    } catch (err) {
      onError?.(product, err);
      showToast(translate("Failed to add product to order"));
      logger.error('Failed to add product to order:', err);
    } finally {
      pendingProductIds.value.delete(product.productId);
    }
  };

  const clearQueue = () => {
    addQueue.value = [];
    pendingProductIds.value.clear();
    hidePendingItemsToast();
  };

  return {
    addProductToQueue,
    clearQueue,
    pendingProductIds,
    isProductInOrder
  };
}