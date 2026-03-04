import axios from "./axios";

export const getMyProfile = async () => {
    const response = await axios.get("/profile/me");
    return response.data;
};

export const updateMyProfile = async (data) => {
    const response = await axios.put("/profile/me", data);
    return response.data;
};

export const getMyNotifications = async (unreadOnly = false) => {
    const response = await axios.get(`/profile/notifications${unreadOnly ? '?unread_only=true' : ''}`);
    return response.data;
};

export const markNotificationRead = async (id) => {
    const response = await axios.patch(`/profile/notifications/${id}/read`);
    return response.data;
};
export const getClinicalSummary = async () => {
    const response = await axios.get("/profile/clinical-summary");
    return response.data;
};
