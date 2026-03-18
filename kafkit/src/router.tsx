import { createHashRouter } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { WelcomePage } from "./pages/Welcome/WelcomePage";
import { DebugPage } from "./pages/Debug/DebugPage";
import { ConnectionListPage } from "./pages/Connection/ConnectionListPage";
import { ConnectionFormPage } from "./pages/Connection/ConnectionFormPage";
import { TopicListPage } from "./pages/Topics/TopicListPage";
import { TopicDetailPage } from "./pages/Topics/TopicDetailPage";
import { ConsumerPage } from "./pages/Consumer/ConsumerPage";
import { ProducerPage } from "./pages/Producer/ProducerPage";
import { GroupListPage } from "./pages/Groups/GroupListPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <WelcomePage />,
  },
  {
    path: "/debug",
    element: <DebugPage />,
  },
  {
    path: "/main",
    element: <MainLayout />,
    children: [
      { path: "connections", element: <ConnectionListPage /> },
      { path: "connections/new", element: <ConnectionFormPage /> },
      { path: "connections/:id/edit", element: <ConnectionFormPage /> },
      { path: "topics", element: <TopicListPage /> },
      { path: "topics/:topic", element: <TopicDetailPage /> },
      { path: "topics/:topic/consume", element: <ConsumerPage /> },
      { path: "topics/:topic/produce", element: <ProducerPage /> },
      { path: "groups", element: <GroupListPage /> },
    ],
  },
]);
