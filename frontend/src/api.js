const RAW_API = import.meta.env.VITE_API_URL;
// Safety: backend routes live under /api, so add it if it was forgotten in VITE_API_URL.
const API = RAW_API ? (/\/api\/?$/.test(RAW_API) ? RAW_API : `${RAW_API.replace(/\/+$/, "")}/api`) : RAW_API;

export async function api(path, options = {}) {
if (!API) {
throw new Error("VITE_API_URL is not configured.");
}

const isForm = options.body instanceof FormData;

const response = await fetch(`${API.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`, {
credentials: "include",
...options,
headers: {
...(isForm ? {} : { "Content-Type": "application/json" }),
...options.headers
}
});

let data = {};
try { data = await response.json(); } catch {}

if (!response.ok) {
throw new Error(data.message || `Request failed (${response.status})`);
}

return data;
}
