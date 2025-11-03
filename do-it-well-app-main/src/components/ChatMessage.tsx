import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  confidence?: number;
}

export const ChatMessage = ({ role, content, confidence }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        isUser ? "bg-primary/10 ml-auto max-w-[80%]" : "bg-muted mr-auto max-w-[85%]"
      )}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        {confidence !== undefined && (
          <p className="text-xs text-muted-foreground">
            Confidence: {(confidence * 100).toFixed(0)}%
          </p>
        )}
      </div>
    </div>
  );
};