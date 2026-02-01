const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function getNextMonthYear(month, year) {
    const index = MONTHS.indexOf(month);

    if (index === -1) {
        throw new Error(`Invalid month: ${month}`);
    }

    if (index === 11) {
        return { month: "Jan", year: String(Number(year) + 1) };
    }

    return { month: MONTHS[index + 1], year };
}