import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

let refreshing = null;

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config || {};
    const status = err.response?.status;
    if (status === 401 && !cfg._retry && !/\/auth\/(login|refresh|logout)/.test(cfg.url || "")) {
      cfg._retry = true;
      refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
      try {
        await refreshing;
        return api(cfg);
      } catch {
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    const code = err.response?.data?.detail?.code;
    if (status === 403 && (code === "expired" || code === "blocked")) {
      window.dispatchEvent(new Event("auth:access"));
    }
    return Promise.reject(err);
  }
);

export function errMsg(e, fallback = "Algo deu errado. Tente novamente.") {
  const d = e?.response?.data?.detail;
  if (!d) return fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  if (d.message) return d.message;
  if (d.msg) return d.msg;
  return String(d);
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
