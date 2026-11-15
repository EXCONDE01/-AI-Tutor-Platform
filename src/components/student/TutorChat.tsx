"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, X, Image as ImageIcon, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
}

export function TutorChat({ classId, initialSessionId }: { classId?: string; initialSessionId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const uploadFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      if (sessionId) {
        formData.append("sessionId", sessionId);
      }

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress({ fileName: file.name, progress: Math.round((e.loaded / e.total) * 100) });
        }
      });

      xhr.addEventListener("load", () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.url);
          } catch {
            reject(new Error("Invalid upload response"));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      });

      xhr.addEventListener("error", () => {
        setUploadProgress(null);
        reject(new Error("Network error during upload"));
      });

      xhr.open("POST", "/api/chat/upload");
      xhr.send(formData);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size client-side
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("File type not allowed. Allowed: JPEG, PNG, GIF, WebP, PDF");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setError(null);
    try {
      const url = await uploadFile(file);
      // After upload, send the message with the image
      await sendMessageWithImages([url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const sendMessageWithImages = async (images: string[]) => {
    if (!input.trim() && images.length === 0) return;
    if (isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
      images,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          sessionId: sessionId ?? undefined,
          images,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to send message" }));
        throw new Error(errorData.error || "Failed to send message");
      }

      // Get session ID from header if new session
      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let assistantMessageId = crypto.randomUUID();

      // Add placeholder assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: fullResponse } : msg
            )
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      // Remove the last user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    await sendMessageWithImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Tutor
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {error && (
          <div className="mb-4 p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="icon" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {uploadProgress && (
          <div className="mb-4 p-3 rounded bg-primary/10 border border-primary/20 text-primary text-sm">
            <div className="flex items-center justify-between mb-1">
              <span>{uploadProgress.fileName}</span>
              <span>{uploadProgress.progress}%</span>
            </div>
            <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Start a conversation with your AI tutor</p>
                <p className="text-xs mt-1">Ask questions, get explanations, or practice problems</p>
                <p className="text-xs mt-2">Attach images or PDFs for multimodal help</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted rounded-bl-none"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {msg.role === "assistant" && (
                      <Bot className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                    )}
                    {msg.role === "user" && (
                      <User className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                    )}
                    <div className={cn("prose prose-sm max-w-none", msg.role === "user" && "text-primary-foreground")}>
                      {msg.images && msg.images.length > 0 && (
                        <div className="mb-2 grid grid-cols-2 gap-2 max-w-xs">
                          {msg.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                              <img
                                src={img}
                                alt={`Uploaded image ${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                  <div className={cn("text-xs mt-1 opacity-60 text-right", msg.role === "user" && "text-primary-foreground/70")}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="max-w-[80%] bg-muted rounded-2xl px-4 py-2 rounded-bl-none">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="mt-4 flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="chat-file-upload"
            disabled={isLoading}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={triggerFileUpload}
            disabled={isLoading}
            aria-label="Attach file"
            className="shrink-0"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your tutor a question..."
            disabled={isLoading}
            className="flex-1"
            aria-label="Chat input"
          />
          <Button onClick={sendMessage} disabled={!input.trim() && !uploadProgress || isLoading} size="icon">
            <Send className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span className="sr-only">Send message</span>
          </Button>
        </div>

        <label htmlFor="chat-file-upload" className="text-xs text-muted-foreground text-center mt-1 block">
          Click attach button or drag & drop images/PDFs (max 5MB)
        </label>

        {sessionId && (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Session: {sessionId.slice(0, 8)}...
          </p>
        )}
      </CardContent>
    </Card>
  );
}