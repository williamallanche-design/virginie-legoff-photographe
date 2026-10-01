// Point d'entrée des scripts PHP. En production : /api/… sur le même domaine (O2switch).
// En local : NEXT_PUBLIC_API_BASE=http://localhost:8000/api avec `npm run php`.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(route: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${route}`, {
      credentials: "include",
      ...rest,
      method: rest.method ?? (json !== undefined ? "POST" : "GET"),
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError("Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Une erreur est survenue. Réessayez dans un instant.", res.status);
  return data as T;
}
