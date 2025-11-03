import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Send, LogOut, AlertCircle } from "lucide-react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { EmergencyAlert } from "@/components/EmergencyAlert";
import { ChatMessage } from "@/components/ChatMessage";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: number;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [emergencySymptoms, setEmergencySymptoms] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createSession = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        triage_level: "low",
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create session",
      });
      return null;
    }

    return data.id;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession();
        if (!currentSessionId) {
          throw new Error("Failed to create session");
        }
        setSessionId(currentSessionId);
      }

      // Save user message
      await supabase.from("messages").insert({
        session_id: currentSessionId,
        role: "user",
        content: userMessage.content,
      });

      // Call diagnosis function
      const { data, error } = await supabase.functions.invoke("medical-diagnosis", {
        body: {
          sessionId: currentSessionId,
          message: userMessage.content,
          conversationHistory: messages,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        confidence: data.confidence,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Check for emergency symptoms
      if (data.redFlag && data.emergencySymptoms) {
        setEmergencySymptoms(data.emergencySymptoms);
      }

      // Save assistant message
      await supabase.from("messages").insert({
        session_id: currentSessionId,
        role: "assistant",
        content: data.response,
        model_version: data.modelVersion,
        confidence: data.confidence,
      });

      // Update session triage level if provided
      if (data.triageLevel) {
        await supabase
          .from("sessions")
          .update({
            triage_level: data.triageLevel,
            is_flagged: data.redFlag || false,
          })
          .eq("id", currentSessionId);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold">Medical Diagnosis Assistant</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Disclaimer */}
        <MedicalDisclaimer />

        {/* Emergency Alert */}
        {emergencySymptoms.length > 0 && (
          <EmergencyAlert symptoms={emergencySymptoms} />
        )}

        {/* Chat Messages */}
        <Card className="p-4 space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Welcome to your medical consultation</p>
              <p className="text-sm mt-2">
                Describe your symptoms below and I'll help assess them.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              confidence={message.confidence}
            />
          ))}
          {loading && (
            <div className="flex gap-2 items-center text-muted-foreground">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          )}
          <div ref={messagesEndRef} />
        </Card>

        {/* Input Area */}
        <Card className="p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your symptoms in detail..."
              className="min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-full px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Chat;