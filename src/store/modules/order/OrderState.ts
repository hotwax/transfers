export default interface OrderState {
  list: {
    orders: any[],
    orderCount: number,
    itemCount: number
  };
  query: any;
  productStoreOptions: any;
  originFacilityOptions: any;
  destinationFacilityOptions: any;
  orderStatuses: any;
  carrierOptions: any;
  shipmentMethodOptions: any;
  current: any;
}