import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({ baseURL: API });

export const searchCards = async (q) => (await http.get(`/cards/search`, { params: { q } })).data;
export const getCardDetail = async (id) => (await http.get(`/cards/${id}`)).data;

export const listCollection = async () => (await http.get(`/collection`)).data;
export const addCollection = async (item) => (await http.post(`/collection`, item)).data;
export const updateCollection = async (id, patch) => (await http.patch(`/collection/${id}`, patch)).data;
export const deleteCollection = async (id) => (await http.delete(`/collection/${id}`)).data;

export const listWishlist = async () => (await http.get(`/wishlist`)).data;
export const addWishlist = async (item) => (await http.post(`/wishlist`, item)).data;
export const deleteWishlist = async (id) => (await http.delete(`/wishlist/${id}`)).data;

export const dashboardStats = async () => (await http.get(`/dashboard/stats`)).data;

export const uploadPhoto = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const r = await http.post(`/uploads/photo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
};

export const photoUrl = (path) => `${API}/uploads/photo/${path}`;

export const currency = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
};
