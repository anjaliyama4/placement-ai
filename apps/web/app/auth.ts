const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

export type AuthUser = {
  id: number;
  student_id: number | null;
  email: string;
  full_name: string | null;
  role: string;
};

export type AuthResponse = {
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export async function registerUser(data: {
  email: string;
  password: string;
  full_name: string;
  college?: string;
  degree?: string;
  graduation_year?: number;
  cgpa?: number;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Registration failed");
  }

  return result;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Login failed");
  }

  return result;
}

export function saveAuth(response: AuthResponse) {
  localStorage.setItem("placement_ai_token", response.access_token);
  localStorage.setItem(
    "placement_ai_user",
    JSON.stringify(response.user)
  );
}

export function getAuthToken(): string | null {
  return localStorage.getItem("placement_ai_token");
}

export function getAuthUser(): AuthUser | null {
  const value = localStorage.getItem("placement_ai_user");

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logoutUser();
    window.location.href = "/";
  }

  return response;
}

export function logoutUser() {
  localStorage.removeItem("placement_ai_token");
  localStorage.removeItem("placement_ai_user");
}



