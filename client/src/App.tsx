import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import Teams from "./pages/Teams";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import Archive from "./pages/Archive";
import Glossary from "./pages/Glossary";
import FreeAgents from "./pages/FreeAgents";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/teams" component={Teams} />
        <Route path="/teams/:team" component={Teams} />
        <Route path="/players" component={Players} />
        <Route path="/players/:name" component={PlayerDetail} />
        <Route path="/fa" component={FreeAgents} />
        <Route path="/archive" component={Archive} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
