// baseurl.js
import axios from "axios";

export const api = axios.create({
  baseURL: "https://premove-backend-14.onrender.com/api/",
  // baseURL: "http://192.168.0.155:5000/api/",
});
