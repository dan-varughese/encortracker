import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { AUTH_REQUIRED_EVENT, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthSession = {
  authenticated: boolean;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  isLoginOpen: boolean;
  promptLogin: () => void;
  requireAuth: () => boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<AuthSession>({
    queryKey: ["/api/auth/session"],
  });

  useEffect(() => {
    function openLogin() {
      setIsLoginOpen(true);
    }

    window.addEventListener(AUTH_REQUIRED_EVENT, openLogin);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, openLogin);
  }, []);

  const promptLogin = useCallback(() => {
    setIsLoginOpen(true);
  }, []);

  const requireAuth = useCallback(() => {
    if (data?.authenticated) {
      return true;
    }

    setIsLoginOpen(true);
    toast({
      title: "Editing is locked",
      description: "Enter the editor password to make changes.",
    });
    return false;
  }, [data?.authenticated, toast]);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
    setPassword("");
    toast({
      title: "Editing locked",
      description: "You can still browse the tracker in read-only mode.",
    });
  }, [toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/auth/login", { password });
      await refetch();
      setIsLoginOpen(false);
      setPassword("");
      toast({
        title: "Editing unlocked",
        description: "You can now update progress and log scores.",
      });
    } catch {
      toast({
        title: "Login failed",
        description: "That password didn't match. Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(data?.authenticated),
      isCheckingAuth: isLoading,
      isLoginOpen,
      promptLogin,
      requireAuth,
      logout,
    }),
    [data?.authenticated, isLoading, isLoginOpen, logout, promptLogin, requireAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unlock editing</DialogTitle>
            <DialogDescription>
              Read-only browsing is always available. Enter the password to make changes.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="editor-password">Password</Label>
              <Input
                id="editor-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!password || isSubmitting}>
              {isSubmitting ? "Unlocking..." : "Unlock edits"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
