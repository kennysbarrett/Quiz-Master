import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('quizmaster_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('quizmaster_token');
      localStorage.removeItem('quizmaster_user');
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const downloadBlob = async (url, filename) => {
  const response = await API.get(url, { responseType: 'blob', timeout: 30000 });
  const blobUrl = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

// System
export const healthCheck = () => axios.get(`${API_ORIGIN}/health`, { timeout: 5000 });

// Auth
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Quiz
export const getQuizzes = () => API.get('/quizzes');
export const getQuizDetails = (id) => API.get(`/quizzes/${id}`);
export const createQuiz = (data) => API.post('/quizzes', data);
export const updateQuiz = (id, data) => API.put(`/quizzes/${id}`, data);
export const deleteQuiz = (id) => API.delete(`/quizzes/${id}`);
export const startQuiz = (id) => API.post(`/quizzes/${id}/start`);
export const saveAnswer = (attemptId, data) => API.patch(`/quizzes/attempt/${attemptId}/save`, data);

// Questions
export const getQuestionsByQuiz = (quizId) => API.get(`/questions/quiz/${quizId}`);
export const createQuestion = (data) => API.post('/questions', data);
export const updateQuestion = (id, data) => API.put(`/questions/${id}`, data);
export const deleteQuestion = (id) => API.delete(`/questions/${id}`);

// Results
export const submitQuiz = (attemptId, data) => API.post(`/results/submit/${attemptId}`, data);
export const getMyResults = () => API.get('/results/my');
export const getLeaderboard = (quizId) => API.get(`/results/leaderboard/${quizId}`);
export const getAllResults = () => API.get('/results/all');
export const getAnalytics = () => API.get('/results/analytics');
export const exportResultsExcel = () => downloadBlob('/results/export/excel', `quiz-master-results-${Date.now()}.xlsx`);
export const exportResultsPdf = () => downloadBlob('/results/export/pdf', `quiz-master-results-${Date.now()}.pdf`);

export default API;
