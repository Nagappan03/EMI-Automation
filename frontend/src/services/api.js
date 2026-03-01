export async function fetchSystemSummary() {
    const res = await fetch("/api/system-summary");

    if (!res.ok) {
        throw new Error("Failed to fetch system summary");
    }

    return res.json();
}

export async function fetchRuns() {
    const res = await fetch("/api/runs");

    if (!res.ok) {
        throw new Error("Failed to fetch runs");
    }

    return res.json();
}

export async function fetchSystemDetails() {
    const res = await fetch("/api/system-details");

    if (!res.ok) {
        throw new Error("Failed to fetch system details");
    }

    return res.json();
}