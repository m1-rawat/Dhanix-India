import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/20">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardContent className="pt-6 flex flex-col items-center text-center">
          <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-full">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground mb-2">
            Page Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
