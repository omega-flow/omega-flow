import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { WorkflowListPage, WorkflowEditorPage } from "./pages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <WorkflowListPage />,
      },
      {
        path: "workflows/:workflowId",
        element: <WorkflowEditorPage />,
      },
    ],
  },
]);
