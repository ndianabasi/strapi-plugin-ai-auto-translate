import { Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";
import Settings from "./Settings"

const App = () => {
  return (
    <Routes>
      <Route index element={<Settings />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export default App