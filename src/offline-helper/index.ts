import { Capacitor } from "@capacitor/core";
import emitter from "@/event-bus";

const getNetwork = () => {
  const network = Capacitor.Plugins?.Network;
  if (!network) throw new Error("Capacitor Network plugin is unavailable.");
  return network;
}

const register = async () => {
  const Network = getNetwork();
  let networkStatus = await Network.getStatus();
  Network.addListener("networkStatusChange", (status: any) => {
    networkStatus = status;
    if (status.connected) {
        emitter.emit("online");
    } else {
        emitter.emit("offline");
    }
  });
  return networkStatus;
}

const getNetworkStatus = async () => {
  const Network = getNetwork();
  const networkStatus = await Network.getStatus();
  return networkStatus;
}

const OfflineHelper = {
  register,
  getNetworkStatus
}

export default OfflineHelper;
