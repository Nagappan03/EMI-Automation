export function isLastDayOfMonth(date = new Date()) {
    const tomorrow = new Date(date);
    tomorrow.setDate(date.getDate() + 1);
    return tomorrow.getDate() === 1;
}