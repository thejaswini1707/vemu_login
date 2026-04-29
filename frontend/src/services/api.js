const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || 'Invalid server response' };
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Backend not reachable. Start backend on port 5000.');
    }

    throw error;
  }
}

function params(query = {}) {
  const search = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });

  const text = search.toString();
  return text ? `?${text}` : '';
}

export const authAPI = {
  login(role, username, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, username, password })
    });
  },

  changePassword(payload) {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export const usersAPI = {
  list(query = {}) {
    return apiRequest(`/users${params(query)}`);
  },

  stats() {
    return apiRequest('/users/stats/summary');
  },

  create(payload) {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateStatus(id, status, actor) {
    return apiRequest(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, actor })
    });
  },

  resetPassword(id, newPassword, actor) {
    return apiRequest(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword, actor })
    });
  },

  remove(id, actor) {
    const query = params({
      actorId: actor?.id,
      actorName: actor?.username,
      actorRole: actor?.role
    });

    return apiRequest(`/users/${id}${query}`, {
      method: 'DELETE'
    });
  }
};

export const attendanceAPI = {
  list(query = {}) {
    return apiRequest(`/attendance${params(query)}`);
  },

  summary(query = {}) {
    return apiRequest(`/attendance/summary${params(query)}`);
  },

  mark(payload) {
    return apiRequest('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export const announcementsAPI = {
  list(query = {}) {
    return apiRequest(`/announcements${params(query)}`);
  },

  create(payload) {
    return apiRequest('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  remove(id, actor) {
    const query = params({
      actorName: actor?.username,
      actorRole: actor?.role
    });

    return apiRequest(`/announcements/${id}${query}`, {
      method: 'DELETE'
    });
  }
};

export const auditAPI = {
  list(limit = 100) {
    return apiRequest(`/audit?limit=${limit}`);
  }
};