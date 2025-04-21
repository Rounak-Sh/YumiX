import useNetworkStatus from "@/hooks/useNetworkStatus";

export default function NetworkStatus() {
  const { isOnline, message: networkMessage } = useNetworkStatus();

  if (!networkMessage) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ease-out ${
        isOnline ? "bg-green-500" : "bg-red-500"
      }`}>
      <div className="text-white px-4 py-2 text-sm font-medium">
        {networkMessage}
      </div>
    </div>
  );
}
