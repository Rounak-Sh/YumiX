import { useState, useEffect } from "react";

export default function InactivityWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const handleWarning = (event) => {
      setTimeLeft(event.detail.timeLeft);
      setShowWarning(true);
    };

    const handleClearWarning = () => {
      setShowWarning(false);
      setTimeLeft(0);
    };

    window.addEventListener("inactivityWarning", handleWarning);
    window.addEventListener("clearInactivityWarning", handleClearWarning);

    return () => {
      window.removeEventListener("inactivityWarning", handleWarning);
      window.removeEventListener("clearInactivityWarning", handleClearWarning);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border-2 border-yellow-500 p-4 rounded-lg shadow-lg">
      <div className="flex flex-col gap-2">
        <p className="text-yellow-700 font-semibold">Session Timeout Warning</p>
        <p className="text-yellow-600">
          You will be logged out in {Math.floor(timeLeft / 60)}:
          {String(timeLeft % 60).padStart(2, "0")} minutes due to inactivity.
        </p>
        <p className="text-yellow-600 text-sm">
          Move your mouse or press any key to stay logged in.
        </p>
      </div>
    </div>
  );
}
