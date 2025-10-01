export default interface UserState {
  token: string;
  current: object | null;
  instanceUrl: string;
  permissions: any;
  pwaState: any;
  omsRedirectionUrl: string
}