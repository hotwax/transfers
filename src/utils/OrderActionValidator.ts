export type OrderHeaderActionId = 'APPROVE' | 'CANCEL';
export type OrderItemActionId = 'EDIT' | 'REMOVE' | 'FULFILL' | 'RECEIVE' | 'CLOSE_FULFILLMENT' | 'APPROVE' | 'CANCEL';

export interface ActionValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface OrderHeaderAction {
  id: OrderHeaderActionId;
  label: string;
  color?: string;
  validation: ActionValidationResult;
  handler: 'updateOrderStatus' | 'changeOrderStatus';
  statusId: string;
}

export interface OrderItemAction {
  id: OrderItemActionId;
  label: string;
  color?: string;
  validation: ActionValidationResult;
}

export const OrderActionValidator = {
  /**
   * VALIDATION MODE: Validates a specific header action.
   */
  validateHeaderAction(order: any, actionId: OrderHeaderActionId): ActionValidationResult {
    switch (actionId) {
      case 'APPROVE':
        if (order.statusId !== 'ORDER_CREATED') {
          return { allowed: false, reason: 'Order must be in Created status to be approved.' };
        }
        return { allowed: true };

      case 'CANCEL':
        if (order.statusId === 'ORDER_CREATED') return { allowed: true };
        if (order.statusId !== 'ORDER_APPROVED') {
          return { allowed: false, reason: 'Only Created or Approved orders can be cancelled.' };
        }
        if (order.statusFlowId === 'TO_Receive_Only') {
          const hasReceipts = order.items?.some((item: any) => (item.receivedQty || 0) > 0);
          if (hasReceipts) return { allowed: false, reason: 'Cannot cancel order once items have been received.' };
        } else {
          // Fulfill Flows: Block if any inventory has been impacted (issued, packed, or shipped)
          const hasInventoryImpact = order.shipments?.some((shipment: any) => 
            shipment.shipmentTypeId === 'OUT_TRANSFER' && ['SHIPMENT_PACKED', 'SHIPMENT_SHIPPED'].includes(shipment.statusId)
          ) || order.items?.some((item: any) => (item.totalIssuedQuantity || 0) > 0);

          if (hasInventoryImpact) {
            return { allowed: false, reason: 'Cannot cancel order once inventory has been impacted (packed or shipped).' };
          }
        }
        return { allowed: true };

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
   * DISCOVERY MODE: Returns all available header actions.
   */
  getHeaderActions(order: any): OrderHeaderAction[] {
    const actions: OrderHeaderAction[] = [];
    if (order.statusId === 'ORDER_CREATED') {
      actions.push({
        id: 'APPROVE',
        label: 'Approve',
        validation: this.validateHeaderAction(order, 'APPROVE'),
        handler: 'updateOrderStatus',
        statusId: 'ORDER_APPROVED'
      });
    }
    if (['ORDER_CREATED', 'ORDER_APPROVED'].includes(order.statusId)) {
      actions.push({
        id: 'CANCEL',
        label: 'Cancel',
        color: 'danger',
        validation: this.validateHeaderAction(order, 'CANCEL'),
        handler: 'changeOrderStatus',
        statusId: 'ORDER_CANCELLED'
      });
    }
    return actions.filter(action => action.validation.allowed);
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

  // Legacy/Helper methods (can be removed later if not used directly)
  canAddItems(order: any): ActionValidationResult {
    if (order.statusId !== 'ORDER_CREATED') {
      return { allowed: false, reason: 'Items can only be added while the order is in Created status.' };
    }
    return { allowed: true };
  }
};
