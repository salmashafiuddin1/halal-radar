import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "@/pages/Landing";
import Results from "@/pages/Results";
import History from "@/pages/History";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteNav />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
        <Footer />
        <Toaster position="top-center" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;
