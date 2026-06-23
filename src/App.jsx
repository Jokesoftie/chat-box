import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// ============================================================================
// CONFIGURATION & TOOL SCHEMAS (OpenRouter & Gemma 4)
// ============================================================================
const MODEL_ID = "meta-llama/llama-3.3-70b-instruct:free";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const PROVIDER_NAME = "Chatbot Key";

// const TOOL_SCHEMAS = [
//   {
//     type: "function",
//     function: {
//       name: "add_todo",
//       description: "Add a new item to the user's todo list.",
//       parameters: {
//         type: "object",
//         properties: {
//           text: { type: "string", description: "The task description." },
//         },
//         required: ["text"],
//       },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "list_todos",
//       description: "Retrieve all current items in the todo list.",
//       parameters: { type: "object", properties: {} },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "complete_todo",
//       description: "Mark a specific todo item as completed using its ID.",
//       parameters: {
//         type: "object",
//         properties: {
//           id: {
//             type: "number",
//             description: "The numeric ID of the todo item.",
//           },
//         },
//         required: ["id"],
//       },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "start_stopwatch",
//       description: "Start the application stopwatch timer.",
//       parameters: { type: "object", properties: {} },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "stop_stopwatch",
//       description: "Stop/pause the application stopwatch timer.",
//       parameters: { type: "object", properties: {} },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "get_stopwatch_time",
//       description: "Get the current elapsed time of the stopwatch.",
//       parameters: { type: "object", properties: {} },
//     },
//   },
// ];

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
  // Local Tool State: Todos
  const [todos, setTodos] = useState([
    { id: 1, text: "Explore OpenRouter API capabilities", completed: false },
  ]);
  // Local Tool State: Stopwatch
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const messagesEndRef = useRef(null);
  const stopwatchIntervalRef = useRef(null);

  // --- EFFECT: Stopwatch Timer Loop ---
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

  // --- EFFECT: Auto-scroll Chat ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- FORMATTER: Stopwatch UI Display ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // ============================================================================
  // LOCAL TOOLS EXECUTION ENGINE (Synchronous State Intermediaries)
  // ============================================================================
  // Using functional updates or references where state updates are vital inside loops
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
          message: `Added todo: "${args.text}"`,
          id: newId,
        });
      }
      case "list_todos": {
        // Fallback reading mapping to keep tool stream pure
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
            t.id === Number(args.id) ? { ...t, completed: true } : t,
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

  // ============================================================================
  // API REQUEST WITH RETRIES & BACKOFF (Mitigates 429 Rate Limits)
  // ============================================================================
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
        messages: [
          {
            role: "user",
            content: "What is the meaning of life?",
          },
        ],
        // messages: messagesPayload,

        // tools: TOOL_SCHEMAS,
        // tool_choice: "auto",
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

    console.log(response.json());

    return await response.json();
  };

  // ============================================================================
  // THE AGENTIC TOOL CALING LOOP
  // ============================================================================
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
      const MAX_LOOPS = 4; // Safety breaking cap

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

        // Standardize structure for OpenAI/OpenRouter system responses
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
          // Process all concurrent tool execution requests sent by the model
          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

            // Execute tool against local state
            const toolResultString = executeLocalTool(toolName, toolArgs);

            // Append Tool Response structure to conversation logs
            currentMessagesPayload.push({
              role: "tool",
              name: toolName,
              tool_call_id: toolCall.id,
              content: toolResultString,
            });
          }
          setMessages([...currentMessagesPayload]);
          // Continue while loop to allow assistant to interpret results
        } else {
          keepLooping = false; // Exit when conversational response returns with no further tool requirements
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
      {/* RIGHT PANEL: Chat Application Interface */}
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
