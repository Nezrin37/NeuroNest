import axios from 'axios';
import { API_BASE_URL } from '../config/env';

const API_URL = `${API_BASE_URL}/api/chat`;

// Helper to get token
const getAuthHeaders = () => {
    const token = localStorage.getItem('neuronest_token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

const chatAPI = {
    // 1. Get Conversations
    getConversations: async () => {
        const response = await axios.get(`${API_URL}/`, getAuthHeaders());
        return response.data;
    },

    // 2. Start Conversation
    startConversation: async (targetUserId) => {
        const response = await axios.post(`${API_URL}/`, { target_user_id: targetUserId }, getAuthHeaders());
        return response.data;
    },

    // 3. Get Messages
    getMessages: async (conversationId) => {
        const response = await axios.get(`${API_URL}/${conversationId}/messages`, getAuthHeaders());
        return response.data;
    },

    // 4. Send Message (HTTP)
    sendMessage: async (conversationId, content, type = 'text') => {
        const response = await axios.post(`${API_URL}/${conversationId}/messages`, { content, type }, getAuthHeaders());
        return response.data;
    },

    // 5. Upload File
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const headers = getAuthHeaders().headers;
        // Don't set Content-Type manually for FormData, let browser/axios handle boundary
        
        const response = await axios.post(`${API_URL}/upload`, formData, { headers });
        return response.data; // { url: "..." }
    },

    // 6. Mark as Read
    markAsRead: async (conversationId) => {
        const response = await axios.patch(`${API_URL}/${conversationId}/read`, {}, getAuthHeaders());
        return response.data;
    }
};

export default chatAPI;
