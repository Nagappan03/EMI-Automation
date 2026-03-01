import { Routes, Route } from "react-router-dom";
import Layout from "./layouts/layout";
import Dashboard from "./pages/Dashboard";
import Runs from "./pages/Runs";
import System from "./pages/System";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="/system" element={<System />} />
      </Routes>
    </Layout>
  );
}

export default App;