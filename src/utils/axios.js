import axios from 'axios';
import { toast } from 'react-hot-toast';

const instance = axios.create({
    baseURL: 'https://nexthire-backend-ereo.onrender.com/api/v1',
    timeout: 10000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        
        if (error.code === 'ERR_NETWORK') {
            toast.error('Network error. Please check your connection.');
        } else if (error.code === 'ECONNABORTED') {
            toast.error('Request timeout. Please try again.');
        } else if (error.response?.status === 401) {
            // Clear token and redirect to login
            localStorage.removeItem('token');
            // Only redirect if we're not already on the login page
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
                toast.error('Session expired. Please login again.');
            }
        } else if (error.response?.status === 403) {
            toast.error('Access denied. You do not have permission to perform this action.');
        } else if (error.response?.status === 404) {
            toast.error('Resource not found.');
        } else if (error.response?.status >= 500) {
            toast.error('Server error. Please try again later.');
        } else {
            const errorMessage = error.response?.data?.message || 'An error occurred';
            toast.error(errorMessage);
        }
        return Promise.reject(error);
    }
);

export default instance; 