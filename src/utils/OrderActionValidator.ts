export type OrderItemActionId = 'EDIT' | 'REMOVE' | 'FULFILL' | 'RECEIVE' | 'CLOSE_FULFILLMENT' | 'APPROVE' | 'CANCEL';
export type OrderFooterActionId = 'ADD_ITEMS' | 'CANCEL' | 'CLOSE_FULFILLMENT' | 'BULK_RECEIVE' | 'APPROVE';

export interface ActionValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface OrderItemAction {
  id: OrderItemActionId;
  label: string;
  color?: string;
  validation: ActionValidationResult;
}

export interface OrderFooterAction {
  id: OrderFooterActionId;
  label: string;
  color?: string;
  icon?: string;
  validation: ActionValidationResult;
}

export const OrderActionValidator = {
  /**
   * VALIDATION MODE: Validates a specific footer action.
   */
  validateFooterAction(order: any, actionId: OrderFooterActionId, selectedItemSeqIds: Set<string>, hasVisibleItems: boolean): ActionValidationResult {
    switch (actionId) {
      case 'ADD_ITEMS':
        if (order.statusId !== 'ORDER_CREATED') {
          return { allowed: false, reason: 'Items can only be added while the order is in Created status.' };
        }
        return { allowed: true };

      case 'CANCEL': {
        if (order.statusId === 'ORDER_CREATED') return { allowed: true };
        if (order.statusId !== 'ORDER_APPROVED') {
          return { allowed: false, reason: 'Only Created or Approved orders can be cancelled.' };
        }
        // Receipts always block cancellation, regardless of flow
        const hasReceipts = order.items?.some((item: any) => (item.receivedQty || 0) > 0);
        if (hasReceipts) return { allowed: false, reason: 'Cannot cancel order once items have been received.' };

        // Fulfillment impact only blocks cancellation for non-receive-only flows
        if (order.statusFlowId !== 'TO_Receive_Only') {
          const hasInventoryImpact = order.shipments?.some((shipment: any) =>
            shipment.shipmentTypeId === 'OUT_TRANSFER' && ['SHIPMENT_PACKED', 'SHIPMENT_SHIPPED'].includes(shipment.statusId)
          ) || order.items?.some((item: any) => (item.totalIssuedQuantity || 0) > 0);

          if (hasInventoryImpact) {
            return { allowed: false, reason: 'Cannot cancel order once inventory has been impacted (packed or shipped).' };
          }
        }
        return { allowed: true };
      }

      case 'CLOSE_FULFILLMENT': {
        // Only applicable to non-receive-only flows
        if (order.statusFlowId === 'TO_Receive_Only') {
          return { allowed: false, reason: 'Close Fulfillment is not applicable for Receive Only orders.' };
        }
        if (order.statusId !== 'ORDER_APPROVED') {
          return { allowed: false, reason: 'Order must be Approved to close fulfillment.' };
        }
        // Only available once cancellation is blocked (i.e., inventory has been impacted)
        const hasInventoryImpact = order.shipments?.some((shipment: any) =>
          shipment.shipmentTypeId === 'OUT_TRANSFER' && ['SHIPMENT_PACKED', 'SHIPMENT_SHIPPED'].includes(shipment.statusId)
        ) || order.items?.some((item: any) => (item.totalIssuedQuantity || 0) > 0 || (item.receivedQty || 0) > 0);
        if (!hasInventoryImpact) {
          return { allowed: false, reason: 'Close Fulfillment is only available after inventory has been impacted.' };
        }

        // Only available if there are items pending fulfillment
        const hasPendingFulfillmentItems = (order.items || []).some((item: any) => this.isItemPendingFulfillment(order, item));
        if (!hasPendingFulfillmentItems) {
          return { allowed: false, reason: 'No items are currently pending fulfillment.' };
        }

        return { allowed: true };
      }

      case 'BULK_RECEIVE': {
        if (order.statusId !== 'ORDER_APPROVED') return { allowed: false, reason: 'Order must be Approved.' };
        if (!hasVisibleItems) {
          return { allowed: false, reason: 'No items are visible.' };
        }
        
        // If items are selected, validate based on that selection
        if (selectedItemSeqIds.size > 0) {
          const selectedItems = (order.items || []).filter((item: any) => selectedItemSeqIds.has(item.orderItemSeqId));
          const allPendingFulfillment = selectedItems.length > 0 && selectedItems.every((item: any) => this.isItemPendingFulfillment(order, item));
          
          if (allPendingFulfillment) {
            return { allowed: false, reason: 'All selected items are pending fulfillment and cannot be received.' };
          }
          return { allowed: true };
        }

        // If no items are selected, enable if ANY item is eligible for receiving
        const hasReceivableItems = (order.items || []).some((item: any) => this.validateItemAction(order, item, 'RECEIVE').allowed);
        if (!hasReceivableItems) {
          return { allowed: false, reason: 'No items are currently eligible for receiving.' };
        }

        return { allowed: true };
      }

      default:
        return { allowed: false, reason: 'Unknown action.' };
    }
  },

  /**
   * VALIDATION MODE: Validates a specific item action.
   */
  validateItemAction(order: any, item: any, actionId: OrderItemActionId): ActionValidationResult {
    switch (actionId) {
      case 'EDIT':
      case 'REMOVE':
        if (order.statusId !== 'ORDER_CREATED') {
          return { allowed: false, reason: 'Items can only be modified while the order is in Created status.' };
        }
        return { allowed: true };

      case 'FULFILL':
        if (order.statusId !== 'ORDER_APPROVED') {
          return { allowed: false, reason: 'Order must be Approved to fulfill items.' };
        }
        if (!['ITEM_APPROVED', 'ITEM_PENDING_FULFILL'].includes(item.statusId)) {
          return { allowed: false, reason: 'Item status does not allow fulfillment.' };
        }
        return { allowed: true };

      case 'RECEIVE':
        if (order.statusId !== 'ORDER_APPROVED') {
          return { allowed: false, reason: 'Order must be Approved to receive items.' };
        }
        if (!['ITEM_PENDING_FULFILL', 'ITEM_PENDING_RECEIPT'].includes(item.statusId)) {
          return { allowed: false, reason: 'Item status does not allow receiving.' };
        }
        return { allowed: true };

      case 'CLOSE_FULFILLMENT':
        // Close fulfillment is effectively checking if the item is currently in fulfillment phase
        return this.validateItemAction(order, item, 'FULFILL');

      case 'APPROVE':
        if (item.statusId !== 'ITEM_CREATED') {
          return { allowed: false, reason: 'Item must be in Created status to be approved.' };
        }
        return { allowed: true };

      case 'CANCEL':
        if (item.statusId !== 'ITEM_CREATED') {
          return { allowed: false, reason: 'Only newly added items can be cancelled from the item level.' };
        }
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Unknown action.' };
    }
  },

  /**
   * DISCOVERY MODE: Returns all available footer actions.
   */
  getFooterActions(order: any, selectedItemSeqIds: Set<string>, hasVisibleItems: boolean): OrderFooterAction[] {
    const actions: OrderFooterAction[] = [];
    
    // Always add these actions, they will be enabled/disabled via validation
    actions.push({
      id: 'ADD_ITEMS',
      label: 'Add items',
      icon: 'shirtOutline',
      validation: this.validateFooterAction(order, 'ADD_ITEMS', selectedItemSeqIds, hasVisibleItems)
    });

    actions.push({
      id: 'CANCEL',
      label: 'Cancel',
      color: 'danger',
      icon: 'closeCircleOutline',
      validation: this.validateFooterAction(order, 'CANCEL', selectedItemSeqIds, hasVisibleItems)
    });

    const flow = order.statusFlowId;

    if (flow !== 'TO_Receive_Only') {
      actions.push({
        id: 'CLOSE_FULFILLMENT',
        label: 'Close Fulfillment',
        color: 'warning',
        icon: 'warningOutline',
        validation: this.validateFooterAction(order, 'CLOSE_FULFILLMENT', selectedItemSeqIds, hasVisibleItems)
      });
    }

    if (flow === 'TO_Receive_Only' || flow === 'TO_Fulfill_And_Receive') {
      actions.push({
        id: 'BULK_RECEIVE',
        label: 'Bulk Receive',
        icon: 'checkmarkDoneOutline',
        validation: this.validateFooterAction(order, 'BULK_RECEIVE', selectedItemSeqIds, hasVisibleItems)
      });
    }

    if (order.statusId === 'ORDER_CREATED') {
      actions.push({
        id: 'APPROVE',
        label: 'Approve',
        validation: { allowed: true }
      });
    }

    return actions;
  },

  /**
   * CATEGORY HELPERS: Centralized logic for determining if an item belongs to a specific status queue.
   */
  isItemPendingFulfillment(order: any, item: any): boolean {
    const flow = order?.statusFlowId;
    const statuses = ['ITEM_PENDING_FULFILL'];
    
    // In fulfillment-focused flows, approved items await fulfillment
    if (flow === 'TO_Fulfill_Only' || flow === 'TO_Fulfill_And_Receive') {
      statuses.push('ITEM_APPROVED');
    }
    return statuses.includes(item?.statusId);
  },

  isItemPendingReceipt(order: any, item: any): boolean {
    const flow = order?.statusFlowId;
    const statuses = ['ITEM_PENDING_RECEIPT'];
    
    // In receive-only flows, approved items await receipt directly
    if (flow === 'TO_Receive_Only') {
      statuses.push('ITEM_APPROVED');
    }
    return statuses.includes(item?.statusId);
  },

  /**
   * DISCOVERY MODE: Returns ONLY available item actions.
   */
  getItemActions(order: any, item: any): OrderItemAction[] {
    const actions: OrderItemAction[] = [];

    // Edit/Remove only in Created
    if (order.statusId === 'ORDER_CREATED') {
      actions.push({ id: 'EDIT', label: 'Edit ordered qty', validation: this.validateItemAction(order, item, 'EDIT') });
      actions.push({ id: 'REMOVE', label: 'Remove item', color: 'danger', validation: this.validateItemAction(order, item, 'REMOVE') });
    }

    // Fulfill/Receive/Close in Approved (typically)
    if (order.statusId === 'ORDER_APPROVED') {
      actions.push({ id: 'FULFILL', label: 'Fulfill', validation: this.validateItemAction(order, item, 'FULFILL') });
      actions.push({ id: 'RECEIVE', label: 'Receive', validation: this.validateItemAction(order, item, 'RECEIVE') });
      actions.push({ id: 'CLOSE_FULFILLMENT', label: 'Close fulfillment', color: 'danger', validation: this.validateItemAction(order, item, 'CLOSE_FULFILLMENT') });
      actions.push({ id: 'APPROVE', label: 'Approve', validation: this.validateItemAction(order, item, 'APPROVE') });
      actions.push({ id: 'CANCEL', label: 'Cancel', color: 'danger', validation: this.validateItemAction(order, item, 'CANCEL') });
    }

    return actions.filter(action => action.validation.allowed);
  },

  /**
   * BULK HELPER: Returns items that are valid for either FULFILL or RECEIVE.
   */
  getBulkSelectableItems(order: any): any[] {
    return (order?.items || []).filter((item: any) => 
      this.isItemSelectable(order, item)
    );
  },

  /**
   * ITEM HELPER: Determines if an item can be selected for bulk actions.
   */
  isItemSelectable(order: any, item: any): boolean {
    return this.validateItemAction(order, item, 'FULFILL').allowed || 
           this.validateItemAction(order, item, 'RECEIVE').allowed ||
           this.validateItemAction(order, item, 'APPROVE').allowed ||
           this.validateItemAction(order, item, 'CANCEL').allowed;
  }
};
