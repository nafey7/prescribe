import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { paths } from "../router/paths";

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || error.data?.toString?.() || `Error ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Something went wrong.";
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const message = errorMessage(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600" role="alert">
          {message}
        </p>
        <Link
          to={paths.root}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
