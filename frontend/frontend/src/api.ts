import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// Small in-memory GET cache to avoid duplicate list requests during navigation.
const getCache = new Map<string, { expires: number; data: unknown }>();
const GET_CACHE_TTL_MS = 15_000;
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.method?.toLowerCase() === "get") {
    const key = `${config.baseURL ?? ""}${config.url ?? ""}?${new URLSearchParams(config.params ?? {}).toString()}|${token ?? "anonymous"}`;
    const cached = getCache.get(key);
    if (cached && cached.expires > Date.now()) {
      config.adapter = async (cfg) => ({ data: cached.data, status: 200, statusText: "OK (cached)", headers: new AxiosHeaders(), config: cfg });
    } else {
      (config as InternalAxiosRequestConfig & { __cacheKey?: string }).__cacheKey = key;
    }
  }
  return config;
});
api.interceptors.response.use((response) => {
  if (response.config.method && response.config.method.toLowerCase() !== "get") getCache.clear();
  const key = (response.config as InternalAxiosRequestConfig & { __cacheKey?: string }).__cacheKey;
  if (key && response.status >= 200 && response.status < 300) getCache.set(key, { data: response.data, expires: Date.now() + GET_CACHE_TTL_MS });
  return response;
}, (error: AxiosError<{ detail?: unknown; message?: string }>) => {
  const status = error.response?.status;
  const data = error.response?.data;
  const detail = data?.detail;
  let message = "Something went wrong. Please try again.";
  if (!error.response) message = "Cannot connect to the server. Check your connection and try again.";
  else if (status === 401) message = "Your session has expired or your credentials are invalid. Please log in again.";
  else if (status === 403) message = "You do not have permission to perform this action.";
  else if (status === 404) message = "The requested item was not found. Check your selection and try again.";
  else if (status === 422) message = "Some submitted information is invalid. Check the fields and try again.";
  else if (status >= 500) message = "The server encountered an error. Please try again later.";
  if (typeof detail === "string" && detail.trim()) message = detail;
  else if (Array.isArray(detail)) message = detail.map((item: any) => item?.msg ?? "Invalid input").join("; ");
  else if (typeof data?.message === "string" && data.message.trim()) message = data.message;
  error.message = message;
  if (status === 401 && localStorage.getItem("token")) {
    localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("user_id");
    if (window.location.pathname !== "/login") window.location.replace("/login");
  }
  return Promise.reject(error);
});
export function invalidateApiCache() { getCache.clear(); }
export default api;
