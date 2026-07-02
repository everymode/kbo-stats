import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[6px] border border-border bg-card p-8 text-center shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[6px] bg-destructive/10">
            <AlertCircle className="h-9 w-9 text-destructive" />
          </div>
        </div>

        <h1 className="mb-2 font-serif text-5xl font-black text-foreground">404</h1>

        <h2 className="mb-4 font-serif text-xl font-black text-foreground">
          페이지를 찾을 수 없습니다
        </h2>

        <p className="mb-8 leading-relaxed text-muted-foreground">
          요청하신 기록 페이지가 존재하지 않습니다.
          <br />
          이동되었거나 삭제되었을 수 있습니다.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={handleGoHome}
            className="rounded-[4px] bg-primary px-6 py-2.5 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="mr-2 h-4 w-4" />
            기록실 홈으로
          </Button>
        </div>
      </div>
    </div>
  );
}
