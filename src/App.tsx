import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BoardsOverview from "./pages/BoardsOverview";
import NotFound from "./pages/NotFound";
import { ActivityProvider } from "./hooks/useActivity";
import { KanbanBoard } from "./components/kanban/KanbanBoard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <ActivityProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<BoardsOverview />} />
            <Route path="/boards/:boardId" element={<KanbanBoard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ActivityProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
