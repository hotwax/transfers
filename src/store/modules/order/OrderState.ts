export default interface OrderState {
  list: {
    orders: any[],
    ordersCount: number,
  };
  orderItemsList: any;
  query: any;
  current: any;
}