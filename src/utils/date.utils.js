const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function getNextMonthYear(month, year) {
    let index;

    // Support both:
    // - "Aug"
    // - 8
    if (typeof month === "number") {
        index = month - 1;
    } else {
        index = MONTHS.indexOf(month);
    }

    if (index < 0 || index > 11) {
        throw new Error(`Invalid month: ${month}`);
    }

    if (index === 11) {
        return {
            month: "Jan",
            year: String(Number(year) + 1)
        };
    }

    return {
        month: MONTHS[index + 1],
        year: String(year)
    };
}

export function normalizeStatementMonth(month) {
    if (typeof month === "number") {
        if (month < 1 || month > 12) {
            throw new Error(`[DATE] Invalid statement month: ${month}`);
        }

        return month;
    }

    if (typeof month !== "string") {
        throw new Error(`[DATE] Invalid statement month: ${month}`);
    }

    const index = MONTHS.indexOf(
        month.charAt(0).toUpperCase() +
        month.slice(1, 3).toLowerCase()
    );

    if (index === -1) {
        throw new Error(`[DATE] Invalid statement month: ${month}`);
    }

    return index + 1;
}