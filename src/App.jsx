import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import { TOOL_SCHEMAS } from "./constants";
import { formatTime } from "./utils/formatter";

const MODEL_ID = "cohere/north-mini-code:free";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const PROVIDER_NAME = "Chatbot Key";

const getApiKey = () => import.meta.env.VITE_OPENROUTER_API_KEY || "";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI assistant. I can manage your todos and control your stopwatch. Try asking me to 'add a todo to buy milk' or 'start the stopwatch'!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [todos, setTodos] = useState([
    { id: 1, text: "Explore OpenRouter API capabilities", completed: false },
  ]);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const messagesEndRef = useRef(null);
  const stopwatchIntervalRef = useRef(null);

  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(stopwatchIntervalRef.current);
    }
    return () => clearInterval(stopwatchIntervalRef.current);
  }, [isStopwatchRunning]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const executeLocalTool = (name, args) => {
    switch (name) {
      case "add_todo": {
        const newId = Date.now();
        setTodos((prev) => [
          ...prev,
          { id: newId, text: args.text, completed: false },
        ]);
        return JSON.stringify({
          success: true,
          id: newId,
          message: `Added todo: "${args.text}"`,
        });
      }
      case "list_todos": {
        let currentTodos = [];
        setTodos((prev) => {
          currentTodos = prev;
          return prev;
        });
        return JSON.stringify({ todos: currentTodos });
      }
      case "complete_todo": {
        setTodos((prev) =>
          prev.map((t) =>
            // t.id === Number(args.id) ? { ...t, completed: true } : t,
            String(t.id) === String(args.id) ? { ...t, completed: true } : t,
          ),
        );
        return JSON.stringify({
          success: true,
          message: `Todo ID ${args.id} marked complete.`,
        });
      }
      case "start_stopwatch": {
        setIsStopwatchRunning(true);
        return JSON.stringify({ success: true, message: "Stopwatch started." });
      }
      case "stop_stopwatch": {
        setIsStopwatchRunning(false);
        let finalTime = 0;
        setStopwatchTime((prev) => {
          finalTime = prev;
          return prev;
        });
        return JSON.stringify({
          success: true,
          message: `Stopwatch stopped at ${formatTime(finalTime)}.`,
        });
      }
      case "get_stopwatch_time": {
        let currentTime = 0;
        setStopwatchTime((prev) => {
          currentTime = prev;
          return prev;
        });
        return JSON.stringify({
          current_time: formatTime(currentTime),
          running: isStopwatchRunning,
        });
      }
      default:
        return JSON.stringify({ error: `Tool ${name} not found.` });
    }
  };

  const fetchChatCompletion = async (
    messagesPayload,
    retries = 2,
    delay = 1500,
  ) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error(
        "Missing API Key. Please configure your VITE_OPENROUTER_API_KEY variable in your .env file.",
      );
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-OpenRouter-Title": `${PROVIDER_NAME}`,
        "X-Title": "Local Tool React Bot",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: messagesPayload,
        tools: TOOL_SCHEMAS,
      }),
    });

    if (response.status === 429) {
      if (retries > 0) {
        await new Promise((res) => setTimeout(res, delay));
        return fetchChatCompletion(messagesPayload, retries - 1, delay * 2);
      }
      throw new Error(
        "Rate limit hit (429). OpenRouter free tier is limited to 20 requests per minute or 50 queries a day.",
      );
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        errData?.error?.message || `Server Error: HTTP ${response.status}`,
      );
    }

    const data = await response.json();
    return data;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    try {
      let currentMessagesPayload = [...updatedMessages];
      let keepLooping = true;
      let loopCount = 0;
      const MAX_LOOPS = 4;

      while (keepLooping && loopCount < MAX_LOOPS) {
        loopCount++;
        const data = await fetchChatCompletion(currentMessagesPayload);
        const choice = data.choices?.[0];
        const assistantMessage = choice?.message;

        if (!assistantMessage) {
          throw new Error(
            "Invalid structure returned from the inference node.",
          );
        }

        const nativeResponseObject = {
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls || null,
        };

        currentMessagesPayload.push(nativeResponseObject);
        setMessages([...currentMessagesPayload]);

        if (
          assistantMessage.tool_calls &&
          assistantMessage.tool_calls.length > 0
        ) {
          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

            const toolResultString = executeLocalTool(toolName, toolArgs);

            currentMessagesPayload.push({
              role: "tool",
              name: toolName,
              tool_call_id: toolCall.id,
              content: toolResultString,
            });
          }
          setMessages([...currentMessagesPayload]);
        } else {
          keepLooping = false;
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        todos={todos}
        stopwatchTime={stopwatchTime}
        isStopwatchRunning={isStopwatchRunning}
        setIsStopwatchRunning={setIsStopwatchRunning}
        setStopwatchTime={setStopwatchTime}
        executeLocalTool={executeLocalTool}
      />
      <main className="chat-area">
        <header className="chat-header">
          <h1>Agentic Local Assistant</h1>
          <span className="model-tag">{MODEL_ID}</span>
        </header>

        {error && (
          <div className="error-banner">
            <strong>Execution Interrupted:</strong> {error}
          </div>
        )}

        <div className="messages-container">
          {messages.map((msg, index) => {
            if (msg.role === "tool") {
              return (
                <div key={index} className="message system-tool">
                  <div className="tag">Tool Engine Logs [{msg.name}]:</div>
                  <code>{msg.content}</code>
                </div>
              );
            }
            return (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                <div className="avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="message-bubble">
                  <p>
                    {msg.content || "Executing active tracking workflows..."}
                  </p>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="message-wrapper assistant loading">
              <div className="avatar">🤖</div>
              <div className="message-bubble loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask to run timers, add todos, or talk..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
