import axios from 'axios';
import { env } from '../env';

export const getApiBaseUrl = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;
  }
  return `${env.VITE_API_BASE_URL}/api/v1`;
};

// Separate axios instance without interceptors to prevent infinite refresh loops
export const refreshClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Send HttpOnly refresh cookie
  timeout: 10000,
});
