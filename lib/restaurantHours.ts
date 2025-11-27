/**
 * Check if a restaurant is currently open based on working hours
 */
export function isRestaurantOpen(
    opensAt: string | null,
    closesAt: string | null,
    isOpen24_7: boolean = false
): boolean {
    // If restaurant is 24/7, always open
    if (isOpen24_7) return true;

    // If no hours set, assume closed
    if (!opensAt || !closesAt) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    // Parse opening time (format: "HH:MM:SS" or "HH:MM")
    const [openHour, openMin] = opensAt.split(":").map(Number);
    const openingTime = openHour * 60 + openMin;

    // Parse closing time
    const [closeHour, closeMin] = closesAt.split(":").map(Number);
    const closingTime = closeHour * 60 + closeMin;

    // Handle cases where closing time is after midnight (e.g., opens 20:00, closes 02:00)
    if (closingTime < openingTime) {
        // Restaurant is open past midnight
        return currentTime >= openingTime || currentTime < closingTime;
    } else {
        // Normal case: opens and closes on same day
        return currentTime >= openingTime && currentTime < closingTime;
    }
}

/**
 * Format time for display (e.g., "09:00" -> "9:00 AM")
 */
export function formatTime(time: string | null): string {
    if (!time) return "N/A";

    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

/**
 * Get status text for restaurant
 */
export function getRestaurantStatus(
    opensAt: string | null,
    closesAt: string | null,
    isOpen24_7: boolean = false
): { isOpen: boolean; statusText: string; statusColor: string } {
    if (isOpen24_7) {
        return {
            isOpen: true,
            statusText: "Open 24/7",
            statusColor: "text-green-400",
        };
    }

    const isOpen = isRestaurantOpen(opensAt, closesAt, isOpen24_7);

    if (!opensAt || !closesAt) {
        return {
            isOpen: false,
            statusText: "Hours not set",
            statusColor: "text-gray-400",
        };
    }

    if (isOpen) {
        return {
            isOpen: true,
            statusText: `Open until ${formatTime(closesAt)}`,
            statusColor: "text-green-400",
        };
    } else {
        return {
            isOpen: false,
            statusText: `Opens at ${formatTime(opensAt)}`,
            statusColor: "text-red-400",
        };
    }
}
