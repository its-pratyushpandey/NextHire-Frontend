// Authentication utility functions

export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
};

export const clearAuth = () => {
    localStorage.removeItem('token');
};

export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('token', token);
    }
};

export const getAxiosConfig = () => ({
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
    }
});
