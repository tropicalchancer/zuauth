import { useZupassAuth } from './zupassAuth';

export default function AuthComponent() {
  const { user, login, logout, isLoading, error } = useZupassAuth();

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <div className="text-red-500">
          {error}
        </div>
      )}

      {isLoading ? (
        <div>Loading...</div>
      ) : user ? (
        <div className="flex flex-col items-center gap-4">
          <div>
            {user.email && <div>Email: {user.email}</div>}
            {user.ticket_id && <div>Ticket ID: {user.ticket_id}</div>}
          </div>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Login with Zupass
        </button>
      )}
    </div>
  );
} 