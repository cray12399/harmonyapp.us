export interface Account {
  _id: string;
  username: string;
  status: number;
}

export interface UserSummary extends Account {
  email: string;
  isVerified: boolean;
  createdAt?: string;
}

export interface Conversation {
  _id: string;
  type: 0 | 1;
  name: string | null;
  members: Array<Account | null>;
  createdBy: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: string;
  senderUsername: string | null;
  content: string;
  isRemoved: boolean;
  createdAt: string;
}

export interface MessageReport {
  _id: string;
  message: {
    _id: string;
    content: string;
    isRemoved: boolean;
    createdAt: string;
    sender: Account | null;
    conversation: { _id: string; name: string | null; type: number } | null;
  } | null;
  reportedBy: Account | null;
  reason: string;
  status: 'pending' | 'kept' | 'deleted';
  createdAt: string;
  reviewedAt?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = localStorage.getItem('token');
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.replace('/login');
    }
    throw new ApiError(
      typeof data.error === 'string' ? data.error : 'Request failed',
      response.status,
    );
  }
  return data as T;
}
